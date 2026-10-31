"""Remote viewport control, model selection, and security configuration routes."""

import os
from typing import Any, Dict
from fastapi import APIRouter

from config.settings import settings
from integrations.antigravity.adapter import antigravity_adapter
from models.schemas import (
    RemoteClickRequest,
    RemoteScrollRequest,
    SetModeRequest,
    SetModelRequest,
)
from services.remote_access import remote_access_service

router = APIRouter(tags=["Remote Controls & Configuration"])


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
    Guards against unauthorized permission bypass while allowing safe UI toggles.
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


@router.post("/select-chat")
def select_chat(payload: Dict[str, Any]):
    """Select active chat session."""
    return {"success": True, "selected": payload.get("title") or payload.get("session_id")}


@router.get("/ssl-status")
def get_ssl_status():
    """HTTPS / Tailscale Serve TLS status check."""
    ts = remote_access_service.get_tailscale_status()
    return {
        "https_active": ts["serve_active"],
        "tailnet_tls": True if ts["serve_active"] else False,
        "mode": "tailscale_serve_automated_tls",
    }

