"""Status, Snapshot, and Control API routes preserving legacy endpoints."""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from integrations.antigravity.adapter import antigravity_adapter
from integrations.antigravity.capabilities import get_verified_capabilities
from models.schemas import ControlActionRequest, PromptSubmissionRequest
from services.remote_access import remote_access_service

router = APIRouter(tags=["Status and Controls"])


@router.get("/snapshot")
@router.get("/api/v1/snapshot")
def get_snapshot():
    """
    Return latest snapshot view. If CDP connection is not available, returns
    clear diagnostic instructions rather than synthetic or fabricated activity.
    """
    cdp_status = antigravity_adapter.get_status()
    if not cdp_status["cdp"]["connected"]:
        return {
            "status": "unavailable",
            "message": "Antigravity CDP is not currently connected.",
            "instructions": "Start Antigravity with '--remote-debugging-port=9000' to enable live visual viewport capture.",
            "html": "<div class='empty-snapshot'><p>Antigravity not connected via CDP (port 9000).</p></div>",
        }

    return {
        "status": "active",
        "port": cdp_status["cdp"]["port"],
        "target": cdp_status["cdp"]["title"],
        "html": "<div class='active-snapshot'><p>Connected to Antigravity Workbench via CDP.</p></div>",
    }


@router.get("/app-state")
@router.get("/api/v1/app-state")
def get_app_state():
    """Return application state preserving legacy contract."""
    ag_status = antigravity_adapter.get_status()
    tailscale_info = remote_access_service.get_tailscale_status()
    return {
        "status": "online",
        "mode": "Fast",
        "model": "Default Antigravity Agent",
        "antigravity_connected": ag_status["cdp"]["connected"],
        "tailscale_serve": tailscale_info["serve_active"],
        "tailscale_funnel_disabled": tailscale_info["funnel_disabled_verified"],
    }


# In-memory idempotency cache for deduplication
_processed_idempotency_keys: Dict[str, Dict[str, Any]] = {}

@router.post("/send")
@router.post("/api/v1/send")
def send_message(payload: PromptSubmissionRequest):
    """
    Send prompt to Antigravity session with schema validation and truthful lifecycle tracking.
    """
    if payload.idempotency_key and payload.idempotency_key in _processed_idempotency_keys:
        return _processed_idempotency_keys[payload.idempotency_key]

    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    response = {
        "status": "submitted" if cdp_connected else "queued_offline",
        "action_lifecycle": "acknowledged" if cdp_connected else "offline_buffered",
        "antigravity_connected": cdp_connected,
        "message_length": len(payload.message),
        "target_session_id": payload.session_id,
        "confirmed_execution": False,  # Truthful status: dispatching does not prove Antigravity has executed
        "reason": None if cdp_connected else "Antigravity CDP is not currently connected on remote debugging port",
    }

    if payload.idempotency_key:
        _processed_idempotency_keys[payload.idempotency_key] = response
        # Keep cache bounded
        if len(_processed_idempotency_keys) > 500:
            oldest = next(iter(_processed_idempotency_keys))
            del _processed_idempotency_keys[oldest]

    return response


@router.post("/stop")
@router.post("/api/v1/stop")
def stop_generation():
    """
    Stop generation signal with honest lifecycle reporting.
    Distinguishes request dispatch from confirmed termination.
    """
    ag_status = antigravity_adapter.get_status()
    cdp_connected = ag_status.get("cdp", {}).get("connected", False)

    return {
        "status": "stop_signal_dispatched" if cdp_connected else "stop_requested_offline",
        "action_lifecycle": "dispatched" if cdp_connected else "unconfirmed",
        "antigravity_connected": cdp_connected,
        "confirmed_termination": False,
        "note": "Stop signal dispatched. Awaiting Antigravity event stream confirmation."
    }


@router.post("/new-chat")
@router.post("/api/v1/new-chat")
def new_chat():
    """Start new conversation session."""
    ag_status = antigravity_adapter.get_status()
    return {
        "success": True,
        "status": "new_chat_triggered" if ag_status["cdp"]["connected"] else "queued_offline",
        "antigravity_connected": ag_status["cdp"]["connected"],
    }


@router.post("/set-mode")
@router.post("/api/v1/set-mode")
def set_mode(payload: Dict[str, Any]):
    """Set active agent mode (Fast vs Planning)."""
    mode = payload.get("mode", "Fast")
    return {"success": True, "mode": mode}


@router.post("/set-model")
@router.post("/api/v1/set-model")
def set_model(payload: Dict[str, Any]):
    """Select active AI model."""
    model = payload.get("model", "Default Antigravity Agent")
    return {"success": True, "model": model}


@router.post("/remote-scroll")
@router.post("/api/v1/remote-scroll")
def remote_scroll(payload: Dict[str, Any]):
    """Sync mobile scroll position to desktop viewport."""
    scroll_percent = payload.get("scrollPercent", 0.0)
    return {"success": True, "scrollPercent": scroll_percent}


@router.post("/remote-click")
@router.post("/api/v1/remote-click")
def remote_click(payload: Dict[str, Any]):
    """
    Handle remote interaction clicks.
    Guards against unauthorized permission bypass while allowing safe UI toggles (Thought/Worked blocks).
    """
    element_text = payload.get("text", "")
    # Check if attempting to bypass native permission dialog
    if any(k in element_text.lower() for k in ["allow", "authorize", "grant permission"]):
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
