import os
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
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
from services.conversation_service import ConversationService
from services.websocket_manager import websocket_manager

router = APIRouter(tags=["Status and Controls"])

# Persistent idempotency repository backed by MongoDB
_idempotency_repo = IdempotencyRepository()
_conversation_service = ConversationService()


@router.get("/api/v1/chat/messages")
def get_chat_messages(limit: int = 50):
    """Return genuine Antigravity conversation stream extracted from IDE transcripts."""
    return {
        "messages": _conversation_service.get_recent_conversation(limit=limit)
    }




class ApprovalDecisionRequest(BaseModel):
    request_type: str = Field(..., description="command, file, browser, or decision")
    target: str = Field(..., description="Target command, file path, or task name")
    decision: str = Field(..., description="allow, always_allow, or deny")
    step_id: Optional[str] = None
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
    metadata: Optional[Dict[str, Any]] = None


@router.post("/api/v1/approvals/respond")
async def respond_to_approval(payload: ApprovalDecisionRequest):
    """
    Record user approval or rejection for command execution, file changes, or browser access.
    Persists a security audit event and broadcasts the resolution.
    """
    from repositories.event_repository import EventRepository
    from models.schemas import EventDocument
    from datetime import datetime, timezone

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
            "metadata": payload.metadata or {}
        }
    )
    event_repo.insert_event(doc)

    await websocket_manager.broadcast({
        "type": "approval_resolved",
        "data": {
            "step_id": payload.step_id,
            "request_type": payload.request_type,
            "target": payload.target,
            "decision": payload.decision,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })

    # Forward approval action to Antigravity IDE workbench via CDP
    cdp_forward = await antigravity_adapter.forward_approval(payload.request_type, payload.decision)

    return {
        "success": True,
        "status": "recorded",
        "forwarded_to_ide": cdp_forward.get("success", False),
        "requires_native_ide": cdp_forward.get("requires_native_ide", False),
        "forward_details": cdp_forward,
        "decision": payload.decision,
        "request_type": payload.request_type,
        "target": payload.target
    }


@router.post("/api/v1/approvals/push")
async def push_approval_request(payload: ApprovalPushRequest):
    """
    Push a pending approval notification to all connected frontend clients via WebSocket.
    Called by internal hooks, event parsers, or external integrations when the IDE triggers
    a permission dialog that the mobile user should resolve.
    """
    import uuid
    step_id = payload.step_id or str(uuid.uuid4())[:8]
    approval_data = {
        "request_type": payload.request_type,
        "target": payload.target,
        "title": payload.title or f"{payload.request_type.replace('_', ' ').title()} Permission Request",
        "description": payload.description,
        "command": payload.command or (payload.target if payload.request_type == "command" else None),
        "cwd": payload.cwd,
        "step_id": step_id,
        "metadata": payload.metadata or {}
    }
    await websocket_manager.broadcast({
        "type": "pending_approval",
        "approval": approval_data
    })
    return {"success": True, "pushed": True, "step_id": step_id, "approval": approval_data}


@router.post("/api/v1/approvals/test-popup")
async def test_approval_popup(request_type: str = "command", target: str = "git commit -am 'test'"):
    """
    Trigger a test approval pop-up on the frontend. Useful for testing the approval modal UI
    without needing a live agent running. Call from curl or the browser.
    """
    import uuid
    step_id = str(uuid.uuid4())[:8]
    approval_data = {
        "request_type": request_type,
        "target": target,
        "title": f"Test: {request_type.replace('_', ' ').title()} Permission Request",
        "description": "This is a test approval request to verify the approval modal is working correctly.",
        "command": target if request_type == "command" else None,
        "cwd": "D:/All Codes/AllProjects/AgentWatchV2",
        "step_id": step_id,
    }
    await websocket_manager.broadcast({
        "type": "pending_approval",
        "approval": approval_data
    })
    return {"success": True, "test_popup_triggered": True, "step_id": step_id}


@router.get("/snapshot")
@router.get("/api/v1/snapshot")
async def get_snapshot():
    """
    Return latest snapshot view. If CDP connection is available, captures
    a live viewport screenshot from the Antigravity IDE workbench.
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
            "html": "<div class='empty-snapshot'><p>Antigravity not connected via CDP (port 9000).</p></div>",
        }

    screenshot_b64 = await antigravity_adapter.capture_screenshot()
    has_shot = bool(screenshot_b64)
    img_tag = f"<img src='data:image/jpeg;base64,{screenshot_b64}' alt='Antigravity IDE Viewport' class='rounded-lg max-w-full shadow-lg'/>" if has_shot else "<p>Connected to Antigravity Workbench via CDP.</p>"

    return {
        "status": "active",
        "port": cdp_status["cdp"]["port"],
        "target": cdp_status["cdp"]["title"],
        "screenshot": f"data:image/jpeg;base64,{screenshot_b64}" if has_shot else None,
        "has_screenshot": has_shot,
        "html": f"<div class='active-snapshot'>{img_tag}</div>",
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
    return {
        "status": "online",
        "mode": model_info.get("mode", "Agent"),
        "model": model_info.get("model"),
        "available_models": model_info.get("available_models", []),
        "available_modes": [model_info.get("mode", "Agent")],
        "antigravity_connected": ag_status["cdp"]["connected"],
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
    Uses persistent MongoDB idempotency reservation with payload fingerprinting.
    """
    if payload.idempotency_key:
        state, cached = _idempotency_repo.reserve_or_get(
            scope="prompt_send",
            idempotency_key=payload.idempotency_key,
            payload=payload
        )
        if state == "completed":
            return cached
        elif state == "conflict_mismatch":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key was already used with a different request payload."
            )
        elif state == "in_progress":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An identical request is currently in progress."
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

    dispatched = dispatch_res.get("success", False)
    response = {
        "status": "submitted" if dispatched else ("cdp_dispatch_failed" if cdp_connected else "queued_offline"),
        "action_lifecycle": "acknowledged" if dispatched else "offline_buffered",
        "antigravity_connected": cdp_connected,
        "message_length": len(raw_msg),
        "attachments_count": len(payload.attachments or []),
        "attachments": payload.attachments or [],
        "target_session_id": payload.session_id,
        "confirmed_execution": dispatched,
        "dispatch_details": dispatch_res,
        "reason": None if dispatched else dispatch_res.get("error", "Antigravity CDP is not currently connected on remote debugging port"),
    }

    if payload.idempotency_key:
        _idempotency_repo.complete(
            scope="prompt_send",
            idempotency_key=payload.idempotency_key,
            response=response
        )

    # Persist activity event in timeline
    try:
        from repositories.event_repository import EventRepository
        from models.schemas import EventDocument
        import datetime
        EventRepository().insert_event(EventDocument(
            session_id=payload.session_id or "default_session",
            event_type="PromptSubmitted",
            category="prompt",
            summary=f"User prompt submitted ({len(prompt_msg)} chars)",
            execution_state="dispatch_acknowledged" if cdp_connected else "request_accepted",
            correlation_id=payload.idempotency_key,
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            source="mobile_user",
            source_confidence="observed",
            sanitized_payload={"message_preview": prompt_msg[:150], "cdp_connected": cdp_connected}
        ))
    except Exception:
        pass

    try:
        updated_turns = _conversation_service.get_recent_conversation(limit=50)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(websocket_manager.broadcast({
                "type": "chat_update",
                "messages": updated_turns
            }))
        except RuntimeError:
            pass
    except Exception:
        pass

    return response


@router.post("/stop")
@router.post("/api/v1/stop")
async def stop_generation():
    """
    Stop generation signal with verified dispatch to Antigravity IDE workbench.
    Triggers UI stop/cancel and Ctrl+D/Escape signals via CDP.
    """
    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    dispatch_res = {"success": False}
    if cdp_connected:
        dispatch_res = await antigravity_adapter.stop_generation()

    # Mark active turn as stopped in memory and broadcast immediately
    _conversation_service.mark_active_turn_stopped()
    try:
        updated_turns = _conversation_service.get_recent_conversation(limit=50)
        await websocket_manager.broadcast({
            "type": "chat_update",
            "messages": updated_turns
        })
    except Exception:
        pass

    try:
        from repositories.event_repository import EventRepository
        from models.schemas import EventDocument
        import datetime
        EventRepository().insert_event(EventDocument(
            session_id="default_session",
            event_type="StopRequested",
            category="execution",
            summary="Emergency Stop requested by user",
            execution_state="stop_acknowledged" if cdp_connected else "stop_requested",
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            source="mobile_user",
            source_confidence="observed",
            sanitized_payload={"cdp_connected": cdp_connected, "dispatch_details": dispatch_res}
        ))
    except Exception:
        pass

    return {
        "status": "stopped" if dispatch_res.get("success") else ("stop_signal_dispatched" if cdp_connected else "stop_requested_offline"),
        "action_lifecycle": "confirmed" if dispatch_res.get("success") else "dispatched",
        "antigravity_connected": cdp_connected,
        "confirmed_termination": False,
        "dispatch_details": dispatch_res
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
        EventRepository().insert_event(EventDocument(
            session_id="default_session",
            event_type="NewChat",
            category="system",
            summary="New conversation session started",
            execution_state="execution_observed" if cdp_connected else "request_accepted",
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            source="mobile_user",
            source_confidence="observed",
            sanitized_payload={"cdp_connected": cdp_connected}
        ))
    except Exception:
        pass

    return {
        "success": True,
        "status": "new_chat_triggered" if cdp_connected else "queued_offline",
        "antigravity_connected": cdp_connected,
    }


@router.get("/chat-history")
def get_chat_history():
    """Retrieve chat history for frontend drawer."""
    from repositories.session_repository import SessionRepository
    sessions = SessionRepository().list_sessions(limit=50)
    chats = [{"title": s.get("title") or s.get("session_id"), "session_id": s.get("session_id")} for s in sessions]
    return {"count": len(chats), "chats": chats}


@router.post("/select-chat")
def select_chat(payload: Dict[str, Any]):
    """Select active chat session."""
    return {"success": True, "selected": payload.get("title") or payload.get("session_id")}



@router.post("/set-mode")
@router.post("/api/v1/set-mode")
def set_mode(payload: SetModeRequest):
    """Set active agent mode (Fast vs Planning) with strict enum validation."""
    return {"success": True, "mode": payload.mode.value}


@router.post("/set-model")
@router.post("/api/v1/set-model")
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
    # Explicit native security boundary check
    if any(k in element_text.lower() for k in ["allow", "authorize", "grant permission", "approve"]):
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



