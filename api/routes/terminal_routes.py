"""API routes for interactive user-executable terminal sessions."""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.terminal_session_service import terminal_session_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/terminal", tags=["Terminal"])


class CreateSessionRequest(BaseModel):
    shell_type: str = Field(default="powershell", max_length=50)
    cwd: Optional[str] = Field(default=None, max_length=500)


class ExecuteCommandRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=2000)


@router.get("/sessions")
async def list_terminal_sessions():
    """List all open interactive terminal tabs."""
    sessions = terminal_session_service.list_sessions()
    if not sessions:
        # Create a default session automatically so frontend always has a ready tab
        def_session = terminal_session_service.get_or_create_default_session()
        sessions = terminal_session_service.list_sessions()
    return {"success": True, "sessions": sessions}


@router.post("/sessions")
async def create_terminal_session(payload: CreateSessionRequest):
    """Spawn a new interactive terminal shell session tab."""
    session = terminal_session_service.create_session(
        shell_type=payload.shell_type,
        cwd=payload.cwd
    )
    return {
        "success": True,
        "session_id": session.session_id,
        "shell_type": session.shell_type,
        "cwd": session.cwd,
    }


@router.delete("/sessions/{session_id}")
async def close_terminal_session(session_id: str):
    """Close and terminate a terminal tab."""
    closed = terminal_session_service.close_session(session_id)
    return {"success": closed, "session_id": session_id}


@router.post("/sessions/{session_id}/execute")
async def execute_command(session_id: str, payload: ExecuteCommandRequest):
    """Execute a command inside the specified terminal session."""
    session = terminal_session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Terminal session {session_id} not found")

    started = terminal_session_service.execute_command(session_id, payload.command)
    return {
        "success": started,
        "session_id": session_id,
        "command": payload.command,
        "is_running": session.is_running,
    }


@router.post("/sessions/{session_id}/kill")
async def kill_session_process(session_id: str):
    """Terminate the actively running process in this terminal tab."""
    session = terminal_session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Terminal session {session_id} not found")

    killed = terminal_session_service.kill_process(session)
    return {"success": killed, "session_id": session_id}


@router.get("/sessions/{session_id}/output")
async def get_session_output(session_id: str, tail: int = Query(default=300, ge=1, le=1000)):
    """Fetch recent output lines for this terminal session without heavy polling."""
    session = terminal_session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Terminal session {session_id} not found")

    lines = session.get_output(tail_lines=tail)
    return {
        "success": True,
        "session_id": session_id,
        "is_running": session.is_running,
        "exit_code": session.exit_code,
        "lines": lines,
    }

