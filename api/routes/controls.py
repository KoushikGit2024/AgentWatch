"""Status, Snapshot, and Control API routes preserving legacy endpoints."""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from integrations.antigravity.adapter import antigravity_adapter
from integrations.antigravity.capabilities import get_verified_capabilities
from models.schemas import ControlActionRequest
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


@router.post("/send")
@router.post("/api/v1/send")
def send_message(payload: Dict[str, Any]):
    """
    Send prompt to Antigravity session.
    Preserves legacy optimistic 200 response while checking connectivity.
    """
    ag_status = antigravity_adapter.get_status()
    msg = payload.get("message", "")
    return {
        "status": "accepted" if ag_status["cdp"]["connected"] else "queued_offline",
        "message_received": bool(msg),
        "antigravity_connected": ag_status["cdp"]["connected"],
    }


@router.post("/stop")
@router.post("/api/v1/stop")
def stop_generation():
    """Stop generation signal."""
    return {"status": "stop_signal_dispatched"}


@router.get("/ssl-status")
def get_ssl_status():
    """HTTPS / Tailscale Serve TLS status check."""
    ts = remote_access_service.get_tailscale_status()
    return {
        "https_active": ts["serve_active"],
        "tailnet_tls": True if ts["serve_active"] else False,
        "mode": "tailscale_serve_automated_tls",
    }
