"""Approval Request and Action Response Route."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from integrations.antigravity.adapter import antigravity_adapter
from models.schemas import EventDocument
from repositories.event_repository import EventRepository
from services.conversation_service import conversation_service as _conversation_service
from services.websocket_manager import websocket_manager

router = APIRouter(tags=["Approvals"])

_pushed_pending_approval: Optional[Dict[str, Any]] = None


class ApprovalDecisionRequest(BaseModel):
    request_type: str = Field(..., description="command, file, browser, or decision")
    target: str = Field(..., description="Target command, file path, or task name")
    decision: str = Field(..., description="allow, always_allow, deny, or custom option id")
    step_id: Optional[str] = None
    option_label: Optional[str] = None
    custom_response: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ApprovalPushRequest(BaseModel):
    request_type: str = "command"
    target: str
    title: Optional[str] = None
    description: Optional[str] = None
    command: Optional[str] = None
    cwd: Optional[str] = None
    step_id: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    allow_custom_response: bool = True
    metadata: Optional[Dict[str, Any]] = None


@router.get("/api/v1/approvals/pending")
def get_pending_approval():
    """Return any active command or tool approval request awaiting user confirmation."""
    global _pushed_pending_approval
    _conversation_service.get_recent_conversation(limit=15)
    transcript_approval = _conversation_service.get_pending_approval()
    active = _pushed_pending_approval or transcript_approval
    return {
        "has_pending": bool(active),
        "approval": active,
    }


@router.post("/api/v1/approvals/respond")
async def respond_to_approval(payload: ApprovalDecisionRequest):
    """
    Record user approval or rejection for command execution, file changes, or browser access.
    Supports Allow, Always Allow, Deny, dynamic popup options, and custom instructions ("Type something else").
    Persists a security audit event, updates transcript state, and forwards via CDP.
    """
    global _pushed_pending_approval

    custom_text = payload.custom_response.strip() if payload.custom_response else None

    _conversation_service.mark_approval_resolved(payload.step_id, payload.decision, payload.target)
    if _pushed_pending_approval and (
        not payload.step_id or _pushed_pending_approval.get("step_id") == payload.step_id
    ):
        _pushed_pending_approval = None

    event_repo = EventRepository()
    doc = EventDocument(
        session_id="active-session",
        event_type=f"permission_{payload.decision}",
        category="security",
        summary=f"User {payload.decision.upper()}: {payload.request_type.title()} Request for {payload.target}",
        timestamp=datetime.now(timezone.utc),
        sanitized_payload={
            "request_type": payload.request_type,
            "target": payload.target,
            "decision": payload.decision,
            "step_id": payload.step_id,
            "has_custom_response": bool(custom_text),
            "metadata": payload.metadata or {},
        },
    )
    event_repo.insert_event(doc)

    await websocket_manager.broadcast(
        {
            "type": "approval_resolved",
            "data": {
                "step_id": payload.step_id,
                "request_type": payload.request_type,
                "target": payload.target,
                "decision": payload.decision,
                "custom_response": custom_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }
    )

    cdp_forward = await antigravity_adapter.forward_approval(
        request_type=payload.request_type,
        decision=payload.decision,
        custom_response=custom_text,
        option_label=payload.option_label,
    )

    try:
        paginated = _conversation_service.get_paginated_conversation(limit=15)
        await websocket_manager.broadcast(
            {
                "type": "chat_update",
                "messages": paginated["messages"],
                "total": paginated["total"],
                "oldest_index": paginated["oldest_index"],
                "has_more": paginated["has_more"],
            }
        )
    except Exception:
        pass

    return {
        "success": True,
        "status": "recorded",
        "forwarded_to_ide": cdp_forward.get("success", False),
        "requires_native_ide": cdp_forward.get("requires_native_ide", False),
        "custom_response_dispatched": cdp_forward.get("custom_response_dispatched", False),
        "forward_details": cdp_forward,
        "decision": payload.decision,
        "request_type": payload.request_type,
        "target": payload.target,
    }


@router.post("/api/v1/approvals/push")
async def push_approval_request(payload: ApprovalPushRequest):
    """
    Push a pending approval notification to all connected frontend clients via WebSocket.
    """
    global _pushed_pending_approval

    step_id = payload.step_id or str(uuid.uuid4())[:8]
    default_options = [
        {"id": "allow", "label": "Allow", "description": "Run this action once"},
        {
            "id": "always_allow",
            "label": "Always Allow",
            "description": "Allow similar actions in this session",
        },
        {
            "id": "deny",
            "label": "Deny",
            "description": "Reject action or provide custom instructions",
        },
    ]
    approval_data = {
        "request_type": payload.request_type,
        "target": payload.target,
        "title": payload.title
        or f"{payload.request_type.replace('_', ' ').title()} Permission Request",
        "description": payload.description,
        "command": payload.command
        or (payload.target if payload.request_type == "command" else None),
        "cwd": payload.cwd,
        "step_id": step_id,
        "options": payload.options or default_options,
        "allow_custom_response": payload.allow_custom_response,
        "metadata": payload.metadata or {},
    }
    _pushed_pending_approval = approval_data
    await websocket_manager.broadcast({"type": "pending_approval", "approval": approval_data})
    return {"success": True, "pushed": True, "step_id": step_id, "approval": approval_data}


@router.post("/api/v1/approvals/test-popup")
async def test_approval_popup(request_type: str = "command", target: str = "git commit -am 'test'"):
    """
    Trigger a test approval pop-up on the frontend.
    """
    global _pushed_pending_approval

    step_id = str(uuid.uuid4())[:8]
    approval_data = {
        "request_type": request_type,
        "target": target,
        "title": f"Test: {request_type.replace('_', ' ').title()} Permission Request",
        "description": "This is a test approval request to verify command options and custom instructions.",
        "command": target if request_type == "command" else None,
        "cwd": "D:/All Codes/AllProjects/AgentWatchV2",
        "step_id": step_id,
        "options": [
            {"id": "allow", "label": "Allow", "description": "Run this command once"},
            {
                "id": "always_allow",
                "label": "Always Allow",
                "description": "Allow similar commands in this session",
            },
            {
                "id": "deny",
                "label": "Deny",
                "description": "Reject command or provide custom instructions",
            },
        ],
        "allow_custom_response": True,
    }
    _pushed_pending_approval = approval_data
    await websocket_manager.broadcast({"type": "pending_approval", "approval": approval_data})
    return {
        "success": True,
        "test_popup_triggered": True,
        "step_id": step_id,
        "approval": approval_data,
    }

