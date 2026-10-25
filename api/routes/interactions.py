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


@router.post("/test", status_code=status.HTTP_201_CREATED)
async def inject_test_interaction(kind: Optional[str] = "single_choice"):
    """
    Dev/QA endpoint: inject a synthetic agent interaction to test UI popup flow.
    Supported kinds: single_choice | multiple_choice | free_text
    """
    import time, json
    from services.websocket_manager import websocket_manager
    from models.schemas import InteractionKind, InteractionStatus

    ts = int(time.time())
    interaction_id = f"test-{ts}"

    kind_map = {
        "single_choice": InteractionKind.SINGLE_CHOICE,
        "multiple_choice": InteractionKind.MULTIPLE_CHOICE,
        "free_text": InteractionKind.FREE_TEXT,
    }
    chosen_kind = kind_map.get(kind, InteractionKind.SINGLE_CHOICE)

    if chosen_kind == InteractionKind.FREE_TEXT:
        options_list = []
    else:
        from models.schemas import InteractionOption
        options_list = [
            InteractionOption(id="opt_1", label="(Recommended) Use the existing plan", description="Continue with the current approach without changes.", is_recommended=True),
            InteractionOption(id="opt_2", label="Switch to a fresh approach", description="Restart planning with a new strategy."),
            InteractionOption(id="opt_3", label="Pause and ask me later", description="Mark this as deferred until you provide further guidance."),
        ]

    doc = InteractionDocument(
        interaction_id=interaction_id,
        session_id="test_session",
        kind=chosen_kind,
        title="How should I proceed with the current task?",
        description="The agent has reached a decision point and needs your guidance to continue. Please select one of the options below or type custom instructions.",
        options=options_list,
        allow_custom_response=True,
        custom_response_label="Type something else / Custom instructions",
        status=InteractionStatus.PENDING,
    )

    doc_id, is_dup = interaction_service.create_interaction(doc)

    # Use model_dump_json → json.loads to guarantee fully JSON-safe nested objects
    interaction_dict = json.loads(doc.model_dump_json())

    try:
        await websocket_manager.broadcast({
            "type": "interaction_prompt",
            "interaction": interaction_dict
        })
    except Exception:
        pass

    return {
        "status": "injected",
        "interaction_id": interaction_id,
        "kind": kind,
        "broadcast": True,
    }


@router.get("/{interaction_id}")
def get_interaction_details(interaction_id: str):
    """Retrieve details of a specific interaction request."""
    item = interaction_service.get_interaction(interaction_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interaction request not found")
    return item


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_interaction(doc: InteractionDocument):
    """
    Create a new dynamic interaction request (e.g., from agent hook, tool call, or question).
    Broadcasts interaction_prompt WebSocket event immediately on creation.
    """
    from services.websocket_manager import websocket_manager
    import json as _json
    doc_id, is_dup = interaction_service.create_interaction(doc)
    if not is_dup:
        # Push to all connected frontend clients immediately (no polling delay)
        try:
            interaction_dict = _json.loads(doc.model_dump_json())
            await websocket_manager.broadcast({
                "type": "interaction_prompt",
                "interaction": interaction_dict
            })
        except Exception:
            pass
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


@router.post("/{interaction_id}/dismiss")
async def dismiss_interaction(interaction_id: str):
    """
    Dismiss a pending interaction without submitting an answer.
    Marks status as dismissed and broadcasts interaction_resolved.
    """
    res = await interaction_service.dismiss_interaction(interaction_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=res.get("error", "Interaction not found"))
    return res


@router.post("/dismiss")
async def dismiss_interaction_body(payload: Dict[str, Any]):
    """
    Dismiss a pending interaction with interaction_id provided in JSON body.
    """
    interaction_id = payload.get("interaction_id")
    if not interaction_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing interaction_id in request body")
    return await dismiss_interaction(interaction_id)
