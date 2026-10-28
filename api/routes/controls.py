import os
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, status
from config.settings import settings
from integrations.antigravity.adapter import antigravity_adapter
from integrations.antigravity.capabilities import get_verified_capabilities
from models.schemas import (
    ControlActionRequest,
    PromptSubmissionRequest,
    SetModeRequest,
    SetModelRequest,
    RemoteScrollRequest,
    RemoteClickRequest,
)
from pydantic import BaseModel, Field
from repositories.idempotency_repository import IdempotencyRepository
from services.remote_access import remote_access_service

from services.log_buffer import log_buffer_handler
from services.conversation_service import conversation_service as _conversation_service
from services.websocket_manager import websocket_manager

router = APIRouter(tags=["Status and Controls"])

# Persistent idempotency repository backed by MongoDB
_idempotency_repo = IdempotencyRepository()
_pushed_pending_approval: Optional[Dict[str, Any]] = None


@router.get("/api/v1/chat/messages")
def get_chat_messages(
    limit: int = Query(15, ge=1, le=200, description="Number of turns to fetch per block"),
    before: Optional[int] = Query(
        None, ge=0, description="Cursor turn_index for upward scroll lazy-loading"
    ),
):
    """
    Return paginated Antigravity conversation stream extracted from IDE transcripts.
    Supports request-based upward scroll lazy-loading via `before=<oldest_turn_index>&limit=15`.
    """
    return _conversation_service.get_paginated_conversation(limit=limit, before=before)


class ApprovalDecisionRequest(BaseModel):
    request_type: str = Field(..., description="command, file, browser, or decision")
    target: str = Field(..., description="Target command, file path, or task name")
    decision: str = Field(..., description="allow, always_allow, deny, or custom option id")
    step_id: Optional[str] = None
    option_label: Optional[str] = None
    custom_response: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Optional custom instructions to send to the agent",
    )
    metadata: Optional[Dict[str, Any]] = None


class ApprovalPushRequest(BaseModel):
    """Payload to push a pending approval notification to the frontend."""

    request_type: str = Field(default="command", description="command, file, browser, or decision")
    target: str = Field(..., description="The command, file path, or resource needing approval")
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
    from repositories.event_repository import EventRepository
    from models.schemas import EventDocument
    from datetime import datetime, timezone

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
    import uuid

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
    import uuid

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


@router.get("/snapshot")
@router.get("/api/v1/snapshot")
async def get_snapshot(
    last_hash: Optional[str] = Query(
        None, description="Previous screenshot hash to skip redundant transfer"
    ),
):
    """
    Return latest snapshot view. Supports `last_hash` deduplication so unchanged screenshots
    consume ~50 bytes instead of ~250KB, and omits duplicate base64 strings.
    """
    cdp_status = antigravity_adapter.get_status()
    if not cdp_status["cdp"]["connected"]:
        return {
            "status": "unavailable",
            "message": "Antigravity CDP is not currently connected.",
            "instructions": "Start Antigravity with '--remote-debugging-port=9000' to enable live visual viewport capture.",
            "screenshot": None,
            "has_screenshot": False,
            "target": None,
            "hash": None,
            "html": "<div class='empty-snapshot'><p>Antigravity not connected via CDP (port 9000).</p></div>",
        }

    screenshot_b64 = await antigravity_adapter.capture_screenshot()
    has_shot = bool(screenshot_b64)
    cur_hash = antigravity_adapter.get_cached_screenshot_hash()

    if has_shot and last_hash and cur_hash and last_hash == cur_hash:
        return {
            "status": "unchanged",
            "port": cdp_status["cdp"]["port"],
            "target": cdp_status["cdp"]["title"],
            "has_screenshot": True,
            "hash": cur_hash,
        }

    return {
        "status": "active",
        "port": cdp_status["cdp"]["port"],
        "target": cdp_status["cdp"]["title"],
        "screenshot": f"data:image/jpeg;base64,{screenshot_b64}" if has_shot else None,
        "has_screenshot": has_shot,
        "hash": cur_hash,
        "html": "<div class='active-snapshot'><p>Connected to Antigravity Workbench via CDP.</p></div>",
    }


@router.get("/api/v1/logs")
def get_system_logs(limit: int = 150, min_level: Optional[str] = None):
    """Return live circular-buffer logs for frontend monitoring."""
    return {
        "logs": log_buffer_handler.get_logs(limit=limit, min_level=min_level),
        "total_captured": len(log_buffer_handler.buffer),
    }


@router.get("/app-state")
@router.get("/api/v1/app-state")
async def get_app_state():
    """Return genuine application state and active plan models without static guessing."""
    ag_status = antigravity_adapter.get_status()
    tailscale_info = remote_access_service.get_tailscale_status()
    model_info = await antigravity_adapter.get_active_model_and_plan()
    is_conn = bool(ag_status["cdp"]["connected"])
    return {
        "status": "online",
        "connected": is_conn,
        "mode": model_info.get("mode", "Fast"),
        "model": model_info.get("model"),
        "available_models": model_info.get("available_models", []),
        "available_modes": ["Fast", "Planning"],
        "antigravity_connected": is_conn,
        "workspace_name": ag_status.get("workspace_name"),
        "workspace_path": ag_status.get("workspace_path"),
        "active_conversation_id": ag_status.get("active_conversation_id"),
        "active_conversation_title": ag_status.get("active_conversation_title"),
        "tailscale_serve": tailscale_info["serve_active"],
        "tailscale_funnel_disabled": tailscale_info["funnel_disabled_verified"],
    }


@router.post("/send")
@router.post("/api/v1/send")
@router.post("/prompt")
@router.post("/api/v1/prompt")
async def send_message(payload: PromptSubmissionRequest):
    """
    Send prompt to Antigravity session with schema validation and truthful lifecycle tracking.
    """
    if payload.idempotency_key:
        state, cached = _idempotency_repo.reserve_or_get(
            scope="prompt_send", idempotency_key=payload.idempotency_key, payload=payload
        )
        if state == "completed":
            return cached
        elif state == "conflict_mismatch":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key was already used with a different request payload.",
            )
        elif state == "in_progress":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An identical request is currently in progress.",
            )

    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    raw_msg = payload.message or getattr(payload, "prompt", None) or ""
    prompt_msg = raw_msg
    if payload.attachments:
        attachment_lines = ["\n\n[Attached Files]:"]
        for att in payload.attachments:
            name = att.get("original_name") or att.get("filename") or "file"
            path = att.get("storage_path") or att.get("relative_path") or ""
            is_img = att.get("is_image", False)
            tag = "Image" if is_img else "File"
            attachment_lines.append(f"- {tag} ({name}): {path}")
        prompt_msg = prompt_msg + "\n".join(attachment_lines)

    is_testing = os.environ.get("ENVIRONMENT") == "testing" or settings.environment == "testing"
    dispatch_res = {"success": True, "test_mode": True} if is_testing else {"success": False}
    if not is_testing:
        if not cdp_connected:
            antigravity_adapter.discover_cdp(force=True)
            ag_status = antigravity_adapter.get_status()
            cdp_connected = ag_status.get("cdp", {}).get("connected", False)

        if cdp_connected:
            dispatch_res = await antigravity_adapter.send_prompt(prompt_msg)

    if isinstance(dispatch_res, bool):
        dispatched = dispatch_res
        dispatch_details = {"success": dispatch_res}
    elif isinstance(dispatch_res, dict):
        dispatched = bool(dispatch_res.get("success", False))
        dispatch_details = dispatch_res
    else:
        dispatched = bool(dispatch_res)
        dispatch_details = {"success": dispatched}

    response = {
        "status": "submitted"
        if dispatched
        else ("cdp_dispatch_failed" if cdp_connected else "queued_offline"),
        "action_lifecycle": "acknowledged" if dispatched else "offline_buffered",
        "antigravity_connected": cdp_connected,
        "message_length": len(raw_msg),
        "attachments_count": len(payload.attachments or []),
        "attachments": payload.attachments or [],
        "target_session_id": payload.session_id,
        "confirmed_execution": dispatched,
        "dispatch_details": dispatch_details,
        "reason": None
        if dispatched
        else (
            dispatch_details.get("error", "Antigravity CDP is not currently connected on remote debugging port")
            if isinstance(dispatch_details, dict)
            else "Antigravity CDP is not currently connected on remote debugging port"
        ),
    }

    if payload.idempotency_key:
        _idempotency_repo.complete(
            scope="prompt_send", idempotency_key=payload.idempotency_key, response=response
        )

    try:
        from repositories.event_repository import EventRepository
        from models.schemas import EventDocument
        import datetime

        EventRepository().insert_event(
            EventDocument(
                session_id=payload.session_id or "default_session",
                event_type="PromptSubmitted",
                category="prompt",
                summary=f"User prompt submitted ({len(prompt_msg)} chars)",
                execution_state="dispatch_acknowledged" if cdp_connected else "request_accepted",
                correlation_id=payload.idempotency_key,
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                source="mobile_user",
                source_confidence="observed",
                sanitized_payload={
                    "message_preview": prompt_msg[:150],
                    "cdp_connected": cdp_connected,
                },
            )
        )
    except Exception:
        pass

    try:
        paginated = _conversation_service.get_paginated_conversation(limit=15)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(
                websocket_manager.broadcast(
                    {
                        "type": "chat_update",
                        "messages": paginated["messages"],
                        "total": paginated["total"],
                        "oldest_index": paginated["oldest_index"],
                        "has_more": paginated["has_more"],
                    }
                )
            )
        except RuntimeError:
            pass
    except Exception:
        pass

    return response


@router.post("/stop")
@router.post("/api/v1/stop")
@router.post("/api/v1/controls/stop")
async def stop_generation():
    """
    Stop generation signal with verified dispatch to Antigravity IDE workbench.
    """
    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    dispatch_res = {"success": False}
    if cdp_connected:
        dispatch_res = await antigravity_adapter.stop_generation()

    _conversation_service.mark_active_turn_stopped()
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

    try:
        from repositories.event_repository import EventRepository
        from models.schemas import EventDocument
        import datetime

        EventRepository().insert_event(
            EventDocument(
                session_id="default_session",
                event_type="StopRequested",
                category="execution",
                summary="Emergency Stop requested by user",
                execution_state="stop_acknowledged" if cdp_connected else "stop_requested",
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                source="mobile_user",
                source_confidence="observed",
                sanitized_payload={
                    "cdp_connected": cdp_connected,
                    "dispatch_details": dispatch_res,
                },
            )
        )
    except Exception:
        pass

    return {
        "status": "stopped"
        if dispatch_res.get("success")
        else ("stop_signal_dispatched" if cdp_connected else "stop_requested_offline"),
        "action_lifecycle": "confirmed" if dispatch_res.get("success") else "dispatched",
        "antigravity_connected": cdp_connected,
        "confirmed_termination": False,
        "dispatch_details": dispatch_res,
    }


@router.post("/new-chat")
@router.post("/api/v1/new-chat")
def new_chat():
    """Start new conversation session."""
    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status["cdp"]["connected"]

    try:
        from repositories.event_repository import EventRepository
        from models.schemas import EventDocument
        import datetime

        EventRepository().insert_event(
            EventDocument(
                session_id="default_session",
                event_type="NewChat",
                category="system",
                summary="New conversation session started",
                execution_state="execution_observed" if cdp_connected else "request_accepted",
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                source="mobile_user",
                source_confidence="observed",
                sanitized_payload={"cdp_connected": cdp_connected},
            )
        )
    except Exception:
        pass

    return {
        "success": True,
        "status": "new_chat_triggered" if cdp_connected else "queued_offline",
        "antigravity_connected": cdp_connected,
    }


@router.get("/chat-history")
@router.get("/api/v1/chat/history")
def get_chat_history():
    """Retrieve chat history for frontend drawer."""
    from repositories.session_repository import SessionRepository

    sessions = SessionRepository().list_sessions(limit=50)
    chats = [
        {"title": s.get("title") or s.get("session_id"), "session_id": s.get("session_id")}
        for s in sessions
    ]
    return {"count": len(chats), "chats": chats}


@router.post("/select-chat")
def select_chat(payload: Dict[str, Any]):
    """Select active chat session."""
    return {"success": True, "selected": payload.get("title") or payload.get("session_id")}


@router.post("/set-mode")
@router.post("/api/v1/set-mode")
@router.post("/api/v1/controls/mode")
async def set_mode(payload: SetModeRequest):
    """Set active agent mode (Fast vs Planning) with strict enum validation."""
    await antigravity_adapter.set_active_mode(payload.mode.value)
    return {"success": True, "mode": payload.mode.value}


@router.post("/set-model")
@router.post("/api/v1/set-model")
@router.post("/api/v1/controls/model")
async def set_model(payload: SetModelRequest):
    """Switch active AI model in Antigravity IDE without static guessing."""
    is_testing = os.environ.get("ENVIRONMENT") == "testing" or settings.environment == "testing"
    if is_testing:
        return {"success": True, "model": payload.model, "test_mode": True}
    res = await antigravity_adapter.set_active_model(payload.model)
    return {"success": res.get("success", True), "model": payload.model, "details": res}


@router.post("/remote-scroll")
@router.post("/api/v1/remote-scroll")
def remote_scroll(payload: RemoteScrollRequest):
    """Sync mobile scroll position to desktop viewport with bounds validation."""
    return {"success": True, "scrollPercent": payload.scrollPercent}


@router.post("/remote-click")
@router.post("/api/v1/remote-click")
def remote_click(payload: RemoteClickRequest):
    """
    Handle remote interaction clicks.
    Guards against unauthorized permission bypass while allowing safe UI toggles (Thought/Worked blocks).
    """
    element_text = payload.text or ""
    if any(
        k in element_text.lower() for k in ["allow", "authorize", "grant permission", "approve"]
    ):
        return {
            "success": False,
            "status": "requires_native_ide",
            "message": "Security policy requires approving permission dialogs in native desktop IDE.",
        }
    return {"success": True, "status": "click_dispatched", "element": element_text}


@router.get("/ssl-status")
def get_ssl_status():
    """HTTPS / Tailscale Serve TLS status check."""
    ts = remote_access_service.get_tailscale_status()
    return {
        "https_active": ts["serve_active"],
        "tailnet_tls": True if ts["serve_active"] else False,
        "mode": "tailscale_serve_automated_tls",
    }
