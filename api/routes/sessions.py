"""Session and Agent management API routes."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from repositories.session_repository import SessionRepository

router = APIRouter(prefix="/api/v1/sessions", tags=["Sessions"])
session_repo = SessionRepository()


from pydantic import BaseModel, Field

class SelectChatRequest(BaseModel):
    title: Optional[str] = None
    session_id: Optional[str] = None

@router.get("")
def list_sessions(limit: int = Query(50, ge=1, le=100)):
    """Retrieve list of tracked sessions and conversations."""
    sessions = session_repo.list_sessions(limit=limit)
    return {
        "count": len(sessions),
        "sessions": sessions,
    }


# Legacy and frontend friendly route aliases for conversation history
@router.get("/chat-history")
def get_chat_history(limit: int = Query(50, ge=1, le=100)):
    """Retrieve list of past conversations formatted for frontend HistoryDrawer."""
    sessions = session_repo.list_sessions(limit=limit)
    chats = [{"title": s.get("title") or s.get("session_id"), "session_id": s.get("session_id")} for s in sessions]
    return {"count": len(chats), "chats": chats}


@router.post("/select-chat")
def select_chat(payload: SelectChatRequest):
    """Switch active conversation target."""
    return {"success": True, "selected": payload.title or payload.session_id}


@router.get("/{session_id}")
def get_session(session_id: str):
    """Retrieve details of a single session."""
    session = session_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session
