"""Service to monitor background tasks running in Antigravity brain sessions."""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class TaskMonitorService:
    """Discovers and tails background task logs from `.system_generated/tasks/`."""

    def __init__(self):
        pass

    def get_system_generated_dir(self, session_dir: Optional[Path] = None) -> Optional[Path]:
        """Resolve the active `.system_generated` root directory."""
        if session_dir and session_dir.exists():
            sgd = session_dir / ".system_generated"
            if sgd.exists():
                return sgd

        from services.conversation_service import conversation_service
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

    def list_tasks(
        self, session_dir: Optional[Path] = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """List background task summaries sorted by recency."""
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
            results.append({
                "task_id": task_id,
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "status": "running" if is_active else "completed",
                "filename": log_path.name,
            })
        return results

    def get_task_log(
        self, task_id: str, tail_bytes: int = 50_000, session_dir: Optional[Path] = None
    ) -> Optional[Dict[str, Any]]:
        """Read recent log contents for a specific task or execution step."""
        clean_id = task_id.replace("task-", "").replace("step-", "").strip()

        # 1. First check in active tasks directory
        sgd = self.get_system_generated_dir(session_dir)
        tasks_dir = sgd / "tasks" if sgd else None
        candidates = []
        if tasks_dir and tasks_dir.exists():
            candidates.append(tasks_dir / f"task-{clean_id}.log")
            candidates.append(tasks_dir / f"{clean_id}.log")

        # 2. Also check steps directory if clean_id is a step number
        if sgd and sgd.exists():
            steps_dir = sgd / "steps"
            if steps_dir.exists():
                candidates.append(steps_dir / clean_id / "output.txt")

        # Find existing log file
        log_file = next((p for p in candidates if p.exists() and p.is_file()), None)

        # Fallback: if not found directly and task_id might be "latest" or similar, check most recent task
        if not log_file and tasks_dir and tasks_dir.exists() and clean_id in ("latest", "recent", "0", ""):
            recent_logs = sorted(tasks_dir.glob("task-*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
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


task_monitor_service = TaskMonitorService()

