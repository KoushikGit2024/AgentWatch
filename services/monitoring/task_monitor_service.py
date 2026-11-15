"""Service to monitor background tasks running in Antigravity brain sessions."""

import glob
import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

try:
    import psutil
except ImportError:
    psutil = None

from services.monitoring.task_proto_helper import parse_task_details_blob

logger = logging.getLogger(__name__)


class TaskMonitorService:
    """Discovers and monitors background tasks using SQLite, OS processes, and log files."""

    def __init__(self):
        self._base_path = Path.home() / ".gemini" / "antigravity"

    def get_system_generated_dir(self, session_dir: Optional[Path] = None) -> Optional[Path]:
        """Resolve the active `.system_generated` root directory."""
        if session_dir and session_dir.exists():
            sgd = session_dir / ".system_generated"
            if sgd.exists():
                return sgd

        from services.chat.conversation_service import conversation_service

        tp = conversation_service.get_latest_transcript_path()
        if tp and tp.exists():
            sgd = tp.parent.parent.parent / ".system_generated"
            if sgd.exists():
                return sgd

        return None

    def get_tasks_dir(self, session_dir: Optional[Path] = None) -> Optional[Path]:
        """Resolve the active `.system_generated/tasks` directory."""
        sgd = self.get_system_generated_dir(session_dir)
        if sgd:
            td = sgd / "tasks"
            if td.exists():
                return td
        return None

    def _get_active_conversation_db(self, conversation_id: Optional[str] = None) -> Optional[Path]:
        """Find the SQLite DB for the requested or most recent conversation."""
        conv_dir = self._base_path / "conversations"
        if not conv_dir.exists():
            return None

        if conversation_id:
            target = conv_dir / f"{conversation_id}.db"
            if target.exists():
                return target

        dbs = list(conv_dir.glob("*.db"))
        if not dbs:
            return None
        dbs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        return dbs[0]

    def _collect_finished_task_indices(self, conv_id: str) -> Set[str]:
        """Gather completed task indices from .system_generated/messages and transcript logs."""
        finished: Set[str] = set()

        # 1. Inspect completion message files
        msg_dir = self._base_path / "brain" / conv_id / ".system_generated" / "messages"
        if msg_dir.exists():
            for f in msg_dir.glob("*.json"):
                if f.name == "read.json":
                    continue
                try:
                    with open(f, "r", encoding="utf-8") as mf:
                        data = json.load(mf)
                        sender = str(data.get("sender", ""))
                        if "/task-" in sender:
                            finished.add(sender.split("/task-")[-1].strip())
                except Exception:
                    pass

        # 2. Inspect transcript for manage_task kill actions
        trans_file = (
            self._base_path / "brain" / conv_id / ".system_generated" / "logs" / "transcript.jsonl"
        )
        if trans_file.exists():
            try:
                with open(trans_file, "r", encoding="utf-8") as tf:
                    for line in tf:
                        if "manage_task" in line and "kill" in line:
                            try:
                                entry = json.loads(line)
                                for tc in entry.get("tool_calls", []):
                                    if tc.get("name") == "manage_task":
                                        args = tc.get("args", {})
                                        if "kill" in str(args.get("Action", "")).lower():
                                            t_id = str(args.get("TaskId", ""))
                                            if "/task-" in t_id:
                                                clean_tid = (
                                                    t_id.split("/task-")[-1]
                                                    .replace('"', "")
                                                    .strip()
                                                )
                                                finished.add(clean_tid)
                            except Exception:
                                pass
            except Exception:
                pass

        return finished

    def _get_running_os_processes(self) -> List[Dict[str, Any]]:
        """Collect current OS running processes with command lines and creation times."""
        procs: List[Dict[str, Any]] = []
        for p in psutil.process_iter(["pid", "name", "cmdline", "create_time"]):
            try:
                cmd_line = " ".join(p.info["cmdline"] or [])
                procs.append(
                    {
                        "pid": p.info["pid"],
                        "name": p.info["name"],
                        "cmd": cmd_line,
                        "create_time": p.info["create_time"],
                    }
                )
            except Exception:
                pass
        return procs

    def _normalize_command_signature(self, cmd: str) -> str:
        """Create a signature key to deduplicate restarted/superseded daemons."""
        tokens = [
            t.lower().replace("\\", "/")
            for t in cmd.split()
            if not t.startswith("-") and len(t) > 2
        ]
        # Match server target (e.g. uvicorn main:app 8000 or npm run dev)
        key_parts = [t for t in tokens if not t.endswith("python.exe") and not t.endswith("python")]
        return " ".join(key_parts[:4]) if key_parts else cmd.strip().lower()

    def get_active_tasks(self, conversation_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Discover actively running background tasks directly from SQLite steps table
        and verify process liveness using psutil.
        """
        db_path = self._get_active_conversation_db(conversation_id)
        if not db_path or not db_path.exists():
            return []

        conv_id = db_path.stem
        finished_steps = self._collect_finished_task_indices(conv_id)
        os_procs = self._get_running_os_processes()

        active_tasks: List[Dict[str, Any]] = []
        seen_daemon_signatures: Set[str] = set()

        try:
            conn = sqlite3.connect(str(db_path), timeout=2.0)
            cur = conn.cursor()
            # Antigravity status 2 (running daemon) or 6 (active background execution step)
            cur.execute(
                "SELECT idx, status, task_details FROM steps "
                "WHERE status IN (2, 6) AND task_details IS NOT NULL "
                "ORDER BY idx DESC"
            )
            rows = cur.fetchall()
            conn.close()
        except Exception as exc:
            logger.warning("Failed to query tasks from SQLite %s: %s", db_path, exc)
            return []

        for row in rows:
            idx, st, blob = row[0], row[1], row[2]
            step_str = str(idx)

            if step_str in finished_steps:
                continue

            parsed = parse_task_details_blob(blob)
            if not parsed or not parsed.get("command"):
                continue

            raw_cmd = parsed["command"]
            summary = parsed.get("summary") or raw_cmd
            log_uri = parsed.get("log_uri") or ""
            task_id = parsed.get("task_id") or f"task-{idx}"

            # Deduplicate daemon commands (e.g. repeated server starts keep only the newest)
            sig = self._normalize_command_signature(raw_cmd)
            if sig in seen_daemon_signatures:
                continue

            # Check process liveness
            cmd_tokens = [
                tok.replace('"', "").replace("'", "")
                for tok in raw_cmd.replace("\\", "/").split()
                if len(tok) > 3 and not tok.startswith("-")
            ]

            is_alive = False
            matched_pid: Optional[int] = None
            proc_created_at: float = 0.0

            for proc in os_procs:
                pcmd = proc["cmd"].replace("\\", "/")
                if cmd_tokens and any(tok in pcmd for tok in cmd_tokens[:3]):
                    is_alive = True
                    matched_pid = proc["pid"]
                    proc_created_at = proc.get("create_time") or 0.0
                    break

            if is_alive:
                seen_daemon_signatures.add(sig)

                log_clean_path = log_uri.replace("file:///", "")
                log_mtime = 0.0
                if log_clean_path and os.path.exists(log_clean_path):
                    try:
                        log_mtime = os.path.getmtime(log_clean_path)
                    except Exception:
                        pass

                start_timestamp = proc_created_at if proc_created_at > 0 else log_mtime

                active_tasks.append(
                    {
                        "index": len(active_tasks),
                        "step_index": idx,
                        "task_id": task_id,
                        "tooltip_id": f"task-{idx}",
                        "id": f"task-{idx}",
                        "command": summary,
                        "raw_command": raw_cmd,
                        "is_running": True,
                        "is_daemon": parsed.get("is_daemon", False),
                        "pid": matched_pid,
                        "status": "running",
                        "log_uri": log_uri,
                        "started_at": (
                            datetime.fromtimestamp(start_timestamp, tz=timezone.utc).isoformat()
                            if start_timestamp
                            else None
                        ),
                    }
                )

        return active_tasks

    def list_tasks(
        self,
        session_dir: Optional[Path] = None,
        limit: int = 20,
        active_only: bool = False,
        conversation_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List background task summaries. If active_only=True, returns live active tasks."""
        if active_only:
            return self.get_active_tasks(conversation_id=conversation_id)

        tasks_dir = self.get_tasks_dir(session_dir)
        if not tasks_dir or not tasks_dir.exists():
            return []

        task_logs = list(tasks_dir.glob("task-*.log"))
        task_logs.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        results: List[Dict[str, Any]] = []
        for log_path in task_logs[:limit]:
            stat = log_path.stat()
            task_id = log_path.stem
            is_active = (stat.st_mtime > (datetime.now().timestamp() - 60)) and stat.st_size == 0
            results.append(
                {
                    "task_id": task_id,
                    "size_bytes": stat.st_size,
                    "modified_at": datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.utc
                    ).isoformat(),
                    "status": "running" if is_active else "completed",
                    "filename": log_path.name,
                }
            )
        return results

    def get_task_log(
        self,
        task_id: str,
        tail_bytes: int = 50_000,
        session_dir: Optional[Path] = None,
    ) -> Optional[Dict[str, Any]]:
        """Read recent log contents for a specific task or execution step."""
        clean_id = task_id.replace("task-", "").replace("step-", "").strip()

        sgd = self.get_system_generated_dir(session_dir)
        tasks_dir = sgd / "tasks" if sgd else None
        candidates = []
        if tasks_dir and tasks_dir.exists():
            candidates.append(tasks_dir / f"task-{clean_id}.log")
            candidates.append(tasks_dir / f"{clean_id}.log")

        if sgd and sgd.exists():
            steps_dir = sgd / "steps"
            if steps_dir.exists():
                candidates.append(steps_dir / clean_id / "output.txt")

        log_file = next((p for p in candidates if p.exists() and p.is_file()), None)

        if (
            not log_file
            and tasks_dir
            and tasks_dir.exists()
            and clean_id in ("latest", "recent", "0", "")
        ):
            recent_logs = sorted(
                tasks_dir.glob("task-*.log"), key=lambda p: p.stat().st_mtime, reverse=True
            )
            if recent_logs:
                log_file = recent_logs[0]

        if not log_file or not log_file.exists():
            return None

        try:
            size = log_file.stat().st_size
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                if size > tail_bytes:
                    f.seek(size - tail_bytes)
                content = f.read()

            return {
                "task_id": task_id,
                "filename": log_file.name,
                "total_bytes": size,
                "content": content,
            }
        except Exception as e:
            logger.debug("Failed to read task log %s: %s", log_file, e)
            return None

    def kill_task_process(self, pid: int) -> Dict[str, Any]:
        """
        Safely terminate a background process tree by OS PID.
        Returns a dictionary indicating success, terminated PIDs, or errors.
        """
        if not psutil:
            return {"success": False, "error": "psutil not available"}

        try:
            target_proc = psutil.Process(pid)
            children = target_proc.children(recursive=True)

            # Terminate child sub-processes first (e.g. reloaders, subprocesses)
            killed_pids = []
            for child in children:
                try:
                    child.kill()
                    killed_pids.append(child.pid)
                except Exception:
                    pass

            target_proc.kill()
            killed_pids.append(pid)

            return {
                "success": True,
                "pid": pid,
                "killed_pids": killed_pids,
                "message": f"Successfully terminated process tree for PID {pid}",
            }
        except psutil.NoSuchProcess:
            return {"success": True, "pid": pid, "message": "Process already terminated"}
        except Exception as exc:
            logger.warning("Failed to kill process PID %s: %s", pid, exc)
            return {"success": False, "pid": pid, "error": str(exc)}


task_monitor_service = TaskMonitorService()
