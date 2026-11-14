"""Optimized background terminal execution manager.
Runs user commands asynchronously in workspace root, buffers output ring,
and avoids constant polling overhead by only reading when clients request or stream.
Uses background thread streaming with standard subprocess.Popen for robust cross-platform
and Windows Uvicorn event loop compatibility (eliminating NotImplementedError on Windows selector loops).
Includes persistent working directory tracking for cd / chdir / Set-Location.
"""

import os
import sys
import uuid
import re
import logging
import threading
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from collections import deque

logger = logging.getLogger(__name__)

# Max output lines kept in memory per session tab to guarantee minimal RAM usage
MAX_BUFFER_LINES = 2000

CD_PATTERN = re.compile(r"^(?:cd|chdir|Set-Location)\s*(.*)$", re.IGNORECASE)


class TerminalProcess:
    def __init__(self, session_id: str, shell_type: str, cwd: str):
        self.session_id = session_id
        self.shell_type = shell_type
        self.cwd = cwd
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.buffer = deque(maxlen=MAX_BUFFER_LINES)
        self.process: Optional[subprocess.Popen] = None
        self.current_command: Optional[str] = None
        self.is_running = False
        self.exit_code: Optional[int] = None
        self._reader_thread: Optional[threading.Thread] = None

    def append_line(self, line: str):
        self.buffer.append(line)

    def get_output(self, tail_lines: int = 500) -> List[str]:
        if tail_lines >= len(self.buffer):
            return list(self.buffer)
        return list(self.buffer)[-tail_lines:]


class TerminalSessionService:
    """Manages active user-executable terminal tabs with minimal server resource consumption."""

    def __init__(self, default_cwd: Optional[str] = None):
        self.default_cwd = default_cwd or os.getcwd()
        self.sessions: Dict[str, TerminalProcess] = {}

    def get_or_create_default_session(self) -> TerminalProcess:
        if not self.sessions:
            from services.workspace.workspace_context import workspace_context
            active_ws = workspace_context.get_active_workspace_path()
            return self.create_session("powershell" if sys.platform == "win32" else "bash", cwd=str(active_ws))
        return next(iter(self.sessions.values()))

    def create_session(self, shell_type: str = "powershell", cwd: Optional[str] = None) -> TerminalProcess:
        session_id = f"term-{uuid.uuid4().hex[:8]}"
        if not cwd:
            from services.workspace.workspace_context import workspace_context
            target_cwd = str(workspace_context.get_active_workspace_path())
        else:
            target_cwd = cwd
        if not os.path.exists(target_cwd):
            target_cwd = self.default_cwd or os.getcwd()

        proc = TerminalProcess(session_id, shell_type, target_cwd)
        welcome_banner = (
            f"AgentWatch Terminal [{shell_type.upper()}] (cwd: {target_cwd})\n"
            "Ready for command execution. Type commands below and press Enter.\n"
        )
        proc.append_line(welcome_banner)
        self.sessions[session_id] = proc
        return proc

    def list_sessions(self) -> List[Dict[str, Any]]:
        results = []
        for s in self.sessions.values():
            results.append({
                "session_id": s.session_id,
                "shell_type": s.shell_type,
                "cwd": s.cwd,
                "created_at": s.created_at,
                "is_running": s.is_running,
                "current_command": s.current_command,
                "exit_code": s.exit_code,
            })
        return results

    def get_session(self, session_id: str) -> Optional[TerminalProcess]:
        return self.sessions.get(session_id)

    def close_session(self, session_id: str) -> bool:
        proc = self.sessions.pop(session_id, None)
        if proc:
            self.kill_process(proc)
            return True
        return False

    def kill_process(self, proc: TerminalProcess) -> bool:
        if proc.process and proc.process.poll() is None:
            try:
                pid = proc.process.pid
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/PID", str(pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=3,
                        check=False,
                    )
                else:
                    proc.process.kill()

                proc.is_running = False
                proc.exit_code = -1
                proc.append_line("\n[Process terminated by user]")
                return True
            except Exception as e:
                logger.warning("Error killing process %s: %s", proc.session_id, e)
                try:
                    proc.process.kill()
                    proc.is_running = False
                    return True
                except Exception:
                    pass
        return False

    def _handle_cd_command(self, proc: TerminalProcess, raw_target: str) -> bool:
        """Resolve cd/chdir/Set-Location paths persistently and update proc.cwd."""
        target = raw_target.strip().strip("'\"")

        # cd without arguments -> default to user home or default_cwd
        if not target or target == "~":
            resolved = os.path.expanduser("~")
        elif target == "/":
            resolved = os.path.abspath(os.sep)
        elif target == "-":
            resolved = self.default_cwd
        else:
            resolved = os.path.abspath(os.path.join(proc.cwd, target))

        if os.path.isdir(resolved):
            proc.cwd = resolved
            proc.append_line(f"[Directory changed to: {resolved}]")
            proc.is_running = False
            proc.exit_code = 0
            return True
        else:
            proc.append_line(f"cd: The system cannot find the path specified: '{target}'")
            proc.is_running = False
            proc.exit_code = 1
            return True

    def execute_command(self, session_id: str, command: str) -> bool:
        proc = self.get_session(session_id)
        if not proc:
            return False

        # If previous process still executing, terminate it before running new command
        if proc.is_running and proc.process and proc.process.poll() is None:
            self.kill_process(proc)

        clean_cmd = command.strip()
        if not clean_cmd:
            return True

        proc.current_command = clean_cmd
        proc.is_running = True
        proc.exit_code = None
        proc.append_line(f"\n$ {clean_cmd}")

        # Check for standalone cd / chdir / Set-Location
        cd_match = CD_PATTERN.match(clean_cmd)
        if cd_match:
            return self._handle_cd_command(proc, cd_match.group(1))

        # Choose shell execution command based on OS
        if sys.platform == "win32":
            if proc.shell_type.lower() == "cmd":
                cmd_args = ["cmd.exe", "/c", clean_cmd]
            else:
                cmd_args = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", clean_cmd]
        else:
            shell = "/bin/bash" if os.path.exists("/bin/bash") else "/bin/sh"
            cmd_args = [shell, "-c", clean_cmd]

        try:
            subproc = subprocess.Popen(
                cmd_args,
                cwd=proc.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
            )
            proc.process = subproc

            # Dedicated daemon reader thread - zero busy polling, works with all event loops
            def _stream_reader():
                try:
                    for line in iter(subproc.stdout.readline, ""):
                        if not line:
                            break
                        proc.append_line(line.rstrip("\r\n"))
                    subproc.stdout.close()
                    subproc.wait()
                    proc.exit_code = subproc.returncode
                    proc.is_running = False
                except Exception as err:
                    proc.append_line(f"[Stream Error: {err}]")
                    proc.is_running = False

            proc._reader_thread = threading.Thread(target=_stream_reader, daemon=True)
            proc._reader_thread.start()
            return True
        except Exception as e:
            logger.error("Failed to execute command in %s: %s", session_id, e, exc_info=True)
            proc.append_line(f"[Execution Error: {type(e).__name__} - {e}]")
            proc.is_running = False
            proc.exit_code = 1
            return False


terminal_session_service = TerminalSessionService()
