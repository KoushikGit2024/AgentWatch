"""Session and Agent management API routes."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from repositories.session_repository import SessionRepository

router = APIRouter(prefix="/api/v1/sessions", tags=["Sessions"])
session_repo = SessionRepository()


@router.get("")
def list_sessions(limit: int = Query(50, ge=1, le=100)):
    """Retrieve list of tracked sessions and conversations."""
    sessions = session_repo.list_sessions(limit=limit)
    return {
        "count": len(sessions),
        "sessions": sessions,
    }


@router.get("/{session_id}")
def get_session(session_id: str):
    """Retrieve details of a single session."""
    session = session_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session
