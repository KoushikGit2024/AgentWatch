"""API routes for monitoring Antigravity inter-agent and system messages."""

from fastapi import APIRouter, Query
from services.message_sync_service import message_sync_service

router = APIRouter(prefix="/api/v1/messages", tags=["Agent Messages"])


@router.get("")
def list_messages(limit: int = Query(30, ge=1, le=100)):
    """List inter-agent IPC messages and task completion notifications."""
    msgs = message_sync_service.list_messages(limit=limit)
    return {"messages": msgs, "total": len(msgs)}

