"""Session and Conversation management API routes."""

import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status

from services.chat.conversation_history_service import conversation_history_service
from repositories.session_repository import SessionRepository

logger = logging.getLogger("api.routes.sessions")
router = APIRouter(prefix="/api/v1/sessions", tags=["Sessions"])
session_repo = SessionRepository()


class SelectChatRequest(BaseModel):
    conversation_id: str = Field(..., description="Target conversation UUID")


@router.get("/conversations")
def list_conversations(
    q: Optional[str] = Query(None, description="Search query across conversation titles and folders"),
    offset: int = Query(0, ge=0, description="Offset cursor for lazy pagination"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    refresh: bool = Query(False, description="Force refresh cache from disk"),
):
    """
    Retrieve paginated and searchable past Antigravity conversations directly from Gemini Brain stores.
    Supports lazy infinite-scroll with offset and limit.
    """
    return conversation_history_service.list_conversations(
        query=q, offset=offset, limit=limit, force_refresh=refresh
    )


@router.post("/switch-chat")
async def switch_conversation(payload: SelectChatRequest):
    """
    Switch active conversation in AgentWatch and navigate the Antigravity IDE webview via CDP.
    """
    from integrations.antigravity.core.adapter import antigravity_adapter
    from integrations.antigravity.cdp.cdp_session_actions import dispatch_switch_conversation

    cid = payload.conversation_id.strip()
    target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
    if not target_ws:
        antigravity_adapter.discover_cdp()
        target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url

    cdp_result = {"success": False, "note": "CDP not connected"}
    if target_ws:
        cdp_result = await dispatch_switch_conversation(target_ws, cid)

    # Update active adapter state
    antigravity_adapter.active_conversation_id = cid

    return {
        "success": True,
        "conversation_id": cid,
        "cdp_result": cdp_result,
    }


@router.post("/new-chat")
async def new_conversation():
    """
    Trigger New Conversation session in Antigravity IDE via CDP,
    and wipe active chat stream immediately.
    """
    from integrations.antigravity.core.adapter import antigravity_adapter
    from integrations.antigravity.cdp.cdp_session_actions import dispatch_new_conversation
    from services.chat.conversation_service import conversation_service
    from services.networking.websocket_manager import websocket_manager

    target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
    if not target_ws:
        antigravity_adapter.discover_cdp()
        target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url

    if not target_ws:
        raise HTTPException(status_code=503, detail="Antigravity IDE not connected via CDP")

    # Reset active state on adapter & service
    conversation_service.mark_new_chat_pending()
    antigravity_adapter.active_conversation_id = None
    antigravity_adapter.active_conversation_title = "New Conversation"

    # Broadcast wipe to all connected websocket clients immediately
    if websocket_manager.active_connections:
        await websocket_manager.broadcast({
            "type": "chat_update",
            "conversation_id": None,
            "messages": [],
            "total": 0,
            "oldest_index": 0,
            "has_more": False,
        })

    res = await dispatch_new_conversation(target_ws)
    return res


# Backward compatible route for legacy callers
@router.get("/chat-history")
def get_chat_history(limit: int = Query(50, ge=1, le=100)):
    """Retrieve list of past conversations formatted for frontend HistoryDrawer."""
    res = conversation_history_service.list_conversations(limit=limit)
    chats = [
        {"title": c["title"], "session_id": c["conversation_id"], "workspace": c["workspace"]}
        for c in res["conversations"]
    ]
    return {"count": len(chats), "chats": chats}


@router.post("/select-chat")
async def select_chat_legacy(payload: Dict[str, Any]):
    """Switch active conversation target (legacy alias)."""
    cid = payload.get("session_id") or payload.get("title")
    if not cid:
        raise HTTPException(status_code=400, detail="session_id is required")
    from integrations.antigravity.core.adapter import antigravity_adapter
    antigravity_adapter.active_conversation_id = str(cid)
    return {"success": True, "selected": cid}


@router.get("/{session_id}")
def get_session(session_id: str):
    """Retrieve details of a single session."""
    session = session_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session
