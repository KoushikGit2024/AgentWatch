"""API endpoints for dynamic agent interaction requests, choices, and capabilities."""

from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from models.schemas import (
    InteractionDocument,
    SubmitInteractionRequest,
    CapabilityItem,
)
from services.interaction_service import interaction_service

router = APIRouter(prefix="/api/v1/interactions", tags=["Dynamic Interactions"])


@router.get("/capabilities", response_model=List[CapabilityItem])
def get_capabilities():
    """
    Return live capability registry indicating supported, unavailable, or native-only actions.
    """
    return interaction_service.get_capabilities()


@router.get("/pending")
def list_pending_interactions(session_id: Optional[str] = Query(None, description="Filter by session UUID")):
    """
    List active pending interaction requests awaiting user response on mobile.
    """
    pending = interaction_service.list_pending(session_id=session_id)
    return {
        "count": len(pending),
        "interactions": pending,
        "interaction": pending[0] if pending else None,
    }


@router.get("/{interaction_id}")
def get_interaction_details(interaction_id: str):
    """Retrieve details of a specific interaction request."""
    item = interaction_service.get_interaction(interaction_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interaction request not found")
    return item


@router.post("", status_code=status.HTTP_201_CREATED)
def create_interaction(doc: InteractionDocument):
    """
    Create a new dynamic interaction request (e.g., from agent hook, tool call, or question).
    """
    doc_id, is_dup = interaction_service.create_interaction(doc)
    return {
        "status": "duplicate" if is_dup else "created",
        "id": doc_id,
        "interaction_id": doc.interaction_id,
    }


@router.post("/respond")
async def respond_to_interaction_body(payload: Dict[str, Any]):
    """
    Submit answer to a pending interaction with interaction_id provided in body.
    Supports mobile clients and web hooks.
    """
    interaction_id = payload.get("interaction_id")
    if not interaction_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing interaction_id in request body")

    selected_opts = payload.get("selected_options") or payload.get("selected_option_ids") or []
    req = SubmitInteractionRequest(
        selected_option_ids=selected_opts,
        custom_response=payload.get("custom_response"),
        form_values=payload.get("form_values"),
        idempotency_key=payload.get("idempotency_key")
    )
    return await respond_to_interaction(interaction_id, req)


@router.post("/{interaction_id}/respond")
async def respond_to_interaction(interaction_id: str, payload: SubmitInteractionRequest):
    """
    Submit answer to a pending interaction (selected option, custom text, or form values).
    """
    res = await interaction_service.submit_response(interaction_id, payload)
    if not res.get("success"):
        error_code = status.HTTP_400_BAD_REQUEST
        if res.get("status") == "not_found":
            error_code = status.HTTP_404_NOT_FOUND
        elif res.get("status") in ("stale_interaction", "conflict_mismatch", "in_progress"):
            error_code = status.HTTP_409_CONFLICT
        raise HTTPException(status_code=error_code, detail=res.get("error"))
    return res
