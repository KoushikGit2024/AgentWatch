"""Central Interaction and Capability Management Service."""

import logging
from typing import List, Dict, Any, Optional, Tuple
from models.schemas import (
    InteractionDocument,
    InteractionKind,
    InteractionStatus,
    InteractionOption,
    SubmitInteractionRequest,
    CapabilityItem,
    CapabilityStatus,
)
from repositories.interaction_repository import InteractionRepository
from repositories.session_repository import SessionRepository
from integrations.antigravity.adapter import antigravity_adapter
from security.redaction import redact_secrets
from datetime import datetime, timezone

logger = logging.getLogger("services.interaction_service")


class InteractionService:
    """Coordinates dynamic interactions and truthful capability discovery."""

    def __init__(self, interaction_repo: Optional[InteractionRepository] = None, session_repo: Optional[SessionRepository] = None):
        self.repo = interaction_repo if interaction_repo is not None else InteractionRepository()
        self.session_repo = session_repo if session_repo is not None else SessionRepository()
        self._interaction_idempotency_cache: Dict[str, Dict[str, Any]] = {}

    def get_capabilities(self) -> List[CapabilityItem]:
        """
        Evaluate live environment conditions and return truthful capability availability.
        """
        ag_status = antigravity_adapter.get_status()
        cdp_connected = ag_status.get("cdp", {}).get("connected", False)

        return [
            # Conversation Capabilities
            CapabilityItem(
                name="list_sessions",
                category="conversation",
                status=CapabilityStatus.AVAILABLE,
                verified=True,
                description="List tracked Antigravity conversations and metadata.",
            ),
            CapabilityItem(
                name="send_prompt",
                category="conversation",
                status=CapabilityStatus.AVAILABLE if cdp_connected else CapabilityStatus.TEMPORARILY_DISCONNECTED,
                verified=cdp_connected,
                description="Submit a prompt or follow-up instruction to active session.",
                reason=None if cdp_connected else "Antigravity CDP debugging port not connected (start with --remote-debugging-port=9000)",
            ),
            CapabilityItem(
                name="stop_execution",
                category="conversation",
                status=CapabilityStatus.AVAILABLE if cdp_connected else CapabilityStatus.TEMPORARILY_DISCONNECTED,
                verified=cdp_connected,
                requires_confirmation=True,
                description="Request stopping currently running agent generation.",
                reason=None if cdp_connected else "Requires active CDP connection to dispatch stop signal",
            ),
            CapabilityItem(
                name="start_new_chat",
                category="conversation",
                status=CapabilityStatus.AVAILABLE if cdp_connected else CapabilityStatus.TEMPORARILY_DISCONNECTED,
                verified=cdp_connected,
                description="Start a clean new Antigravity chat session.",
                reason=None if cdp_connected else "Requires active CDP connection to trigger new conversation",
            ),
            CapabilityItem(
                name="mode_switching",
                category="conversation",
                status=CapabilityStatus.AVAILABLE if cdp_connected else CapabilityStatus.TEMPORARILY_DISCONNECTED,
                verified=cdp_connected,
                description="Toggle between Fast and Planning modes.",
                reason=None if cdp_connected else "Requires active CDP connection to switch modes",
            ),
            # Dynamic Interaction Capabilities
            CapabilityItem(
                name="answer_choice_question",
                category="interaction",
                status=CapabilityStatus.AVAILABLE,
                verified=True,
                description="Answer single-choice or multi-choice questions requested by agent.",
            ),
            CapabilityItem(
                name="submit_custom_other_response",
                category="interaction",
                status=CapabilityStatus.AVAILABLE,
                verified=True,
                description="Provide custom text response when permitted by question schema.",
            ),
            # Permission Capabilities (Truthful native IDE boundary)
            CapabilityItem(
                name="inspect_permission_request",
                category="permission",
                status=CapabilityStatus.AVAILABLE,
                verified=True,
                description="Inspect pending approval context and tool details in timeline.",
            ),
            CapabilityItem(
                name="remote_permission_bypass",
                category="permission",
                status=CapabilityStatus.REQUIRES_NATIVE_IDE,
                verified=False,
                description="Resolve native IDE permission popups directly from mobile.",
                reason="Native Antigravity permission dialogs require local confirmation in IDE for security.",
            ),
        ]

    def create_interaction(self, doc: InteractionDocument) -> Tuple[Optional[str], bool]:
        """Store pending interaction request with recursive redaction."""
        return self.repo.create_interaction(doc)

    def list_pending(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List active pending interactions for current session."""
        return self.repo.list_pending_interactions(session_id)

    def get_interaction(self, interaction_id: str) -> Optional[Dict[str, Any]]:
        """Get interaction details."""
        return self.repo.get_interaction(interaction_id)

    def submit_response(self, interaction_id: str, payload: SubmitInteractionRequest) -> Dict[str, Any]:
        """
        Validate submission against interaction schema, sanitize inputs, and resolve atomically.
        """
        if payload.idempotency_key and payload.idempotency_key in self._interaction_idempotency_cache:
            return self._interaction_idempotency_cache[payload.idempotency_key]

        interaction = self.repo.get_interaction(interaction_id)
        if not interaction:
            return {"success": False, "error": "Interaction not found", "status": "not_found"}

        if interaction.get("status") != InteractionStatus.PENDING.value:
            return {
                "success": False,
                "error": f"Interaction is already {interaction.get('status')}",
                "status": "stale_interaction",
            }

        # Validate options if choice kind
        kind = interaction.get("kind")
        if kind in (InteractionKind.SINGLE_CHOICE.value, InteractionKind.MULTIPLE_CHOICE.value):
            allowed_ids = {opt["id"] for opt in interaction.get("options", [])}
            selected = set(payload.selected_option_ids)
            # If custom response permitted and "other" selected, allow
            is_custom = bool(payload.custom_response and payload.custom_response.strip())
            if not is_custom and not selected:
                return {"success": False, "error": "No option selected", "status": "validation_error"}
            if not is_custom and not selected.issubset(allowed_ids):
                return {"success": False, "error": "Invalid option selection", "status": "validation_error"}
            if kind == InteractionKind.SINGLE_CHOICE.value and len(selected) > 1:
                return {"success": False, "error": "Single choice allows only one selection", "status": "validation_error"}

        # Validate custom response permission
        if payload.custom_response and not interaction.get("allow_custom_response", False):
            return {"success": False, "error": "Custom text responses are not permitted for this question", "status": "forbidden_custom_response"}

        sanitized_response = {
            "selected_option_ids": payload.selected_option_ids,
            "custom_response": redact_secrets(payload.custom_response) if payload.custom_response else None,
            "form_values": redact_secrets(payload.form_values) if payload.form_values else None,
        }

        updated = self.repo.resolve_interaction(
            interaction_id=interaction_id,
            response=sanitized_response,
            status=InteractionStatus.SUBMITTED
        )

        res = {
            "success": True,
            "interaction_id": interaction_id,
            "status": "submitted",
            "resolved_at": updated.get("resolved_at") if updated else None,
        }

        if payload.idempotency_key:
            self._interaction_idempotency_cache[payload.idempotency_key] = res
            if len(self._interaction_idempotency_cache) > 500:
                oldest = next(iter(self._interaction_idempotency_cache))
                del self._interaction_idempotency_cache[oldest]

        return res


interaction_service = InteractionService()
