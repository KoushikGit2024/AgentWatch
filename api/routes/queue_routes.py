"""
Queue management routes for AgentWatch.
Supports listing queued messages, queuing follow-up prompts,
and triggering Send Now, Delete, and Edit actions.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from services.queue_service import queue_service

router = APIRouter(prefix="/api/v1/queue", tags=["queue"])


class QueueMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The message content to queue")
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list, description="Optional attached files/images"
    )


class QueuedActionRequest(BaseModel):
    action: str = Field(..., description="Action to perform: 'send_now', 'delete', 'edit'")
    text: Optional[str] = Field(None, description="New text if action is 'edit'")


@router.get("/messages")
async def get_queued_messages():
    """
    Get all queued messages, aggregating IDE workbench native queue and local buffer.
    """
    messages = await queue_service.get_all_queued_messages()
    return {"success": True, "count": len(messages), "messages": messages}


@router.post("/messages")
async def add_queued_message(payload: QueueMessageRequest):
    """
    Queue a message to be sent when the agent finishes working.
    """
    item = queue_service.queue_message(payload.message, payload.attachments)
    return {"success": True, "message": "Message queued successfully", "item": item}


@router.post("/messages/{item_id}/action")
async def perform_queued_action(item_id: str, payload: QueuedActionRequest):
    """
    Execute an action on a specific queued item (send_now, delete, edit).
    """
    res = await queue_service.execute_action(
        item_id=item_id, action=payload.action, new_text=payload.text
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "Failed to execute queued action"),
        )
    return res


@router.delete("/messages/{item_id}")
async def delete_queued_message(item_id: str):
    """
    Convenience DELETE route to remove a queued message.
    """
    res = await queue_service.execute_action(item_id=item_id, action="delete")
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error", "Failed to delete queued message"),
        )
    return res
