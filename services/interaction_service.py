"""Central Interaction and Capability Management Service."""

import logging
import hashlib
import os
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
from repositories.idempotency_repository import IdempotencyRepository
from integrations.antigravity.adapter import antigravity_adapter
from security.redaction import redact_secrets
from datetime import datetime, timezone

logger = logging.getLogger("services.interaction_service")


class InteractionService:
    """Coordinates dynamic interactions and truthful capability discovery."""

    def __init__(
        self,
        interaction_repo: Optional[InteractionRepository] = None,
        session_repo: Optional[SessionRepository] = None,
        idempotency_repo: Optional[IdempotencyRepository] = None,
    ):
        self.repo = interaction_repo if interaction_repo is not None else InteractionRepository()
        self.session_repo = session_repo if session_repo is not None else SessionRepository()
        self.idempotency_repo = idempotency_repo if idempotency_repo is not None else IdempotencyRepository()

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

    async def submit_response(self, interaction_id: str, payload: SubmitInteractionRequest) -> Dict[str, Any]:
        """
        Validate submission against interaction schema, sanitize inputs, and resolve atomically.
        Uses persistent idempotency reservation to prevent race conditions and double answers.
        """
        scope = f"interaction_respond_{interaction_id}"
        if payload.idempotency_key:
            state, cached = self.idempotency_repo.reserve_or_get(
                scope=scope,
                idempotency_key=payload.idempotency_key,
                payload=payload
            )
            if state == "completed":
                return cached
            elif state == "conflict_mismatch":
                return {
                    "success": False,
                    "error": "Idempotency key was already used with a different answer payload",
                    "status": "conflict_mismatch"
                }
            elif state == "in_progress":
                return {
                    "success": False,
                    "error": "An identical response is currently being processed",
                    "status": "in_progress"
                }

        interaction = self.repo.get_interaction(interaction_id)
        if not interaction:
            if payload.idempotency_key:
                self.idempotency_repo.fail(scope, payload.idempotency_key, "Interaction not found")
            return {"success": False, "error": "Interaction not found", "status": "not_found"}

        if interaction.get("status") != InteractionStatus.PENDING.value:
            if payload.idempotency_key:
                self.idempotency_repo.fail(scope, payload.idempotency_key, "Interaction already resolved")
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
                if payload.idempotency_key:
                    self.idempotency_repo.fail(scope, payload.idempotency_key, "No option selected")
                return {"success": False, "error": "No option selected", "status": "validation_error"}
            if not is_custom and not selected.issubset(allowed_ids):
                if payload.idempotency_key:
                    self.idempotency_repo.fail(scope, payload.idempotency_key, "Invalid option selection")
                return {"success": False, "error": "Invalid option selection", "status": "validation_error"}
            if kind == InteractionKind.SINGLE_CHOICE.value and len(selected) > 1:
                if payload.idempotency_key:
                    self.idempotency_repo.fail(scope, payload.idempotency_key, "Single choice allows only one selection")
                return {"success": False, "error": "Single choice allows only one selection", "status": "validation_error"}

        # Validate custom response permission
        if payload.custom_response and not interaction.get("allow_custom_response", False):
            if payload.idempotency_key:
                self.idempotency_repo.fail(scope, payload.idempotency_key, "Forbidden custom response")
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

        if not updated:
            # Atomic compare-and-set lost the race to a concurrent winner
            if payload.idempotency_key:
                self.idempotency_repo.fail(scope, payload.idempotency_key, "Race condition: already resolved")
            return {
                "success": False,
                "error": "Interaction was already resolved by a concurrent request",
                "status": "stale_interaction",
            }

        # Formulate answer text and dispatch to Antigravity IDE if connected
        selected_labels = [
            opt["label"] for opt in interaction.get("options", [])
            if opt["id"] in payload.selected_option_ids
        ]
        parts = []
        if selected_labels:
            parts.append(", ".join(selected_labels))
        if payload.custom_response and payload.custom_response.strip():
            parts.append(payload.custom_response.strip())
        prompt_text = " - ".join(parts) if parts else "Response submitted"

        is_testing = os.environ.get("ENVIRONMENT") == "testing"
        cdp_status = antigravity_adapter.get_status().get("cdp", {})
        if cdp_status.get("connected") and not is_testing:
            try:
                await antigravity_adapter.send_prompt(prompt_text)
            except Exception as e:
                logger.warning("Failed to dispatch interaction prompt to IDE: %s", str(e))

        res = {
            "success": True,
            "interaction_id": interaction_id,
            "status": "submitted",
            "resolved_at": updated.get("resolved_at") if updated else None,
        }

        if payload.idempotency_key:
            self.idempotency_repo.complete(scope, payload.idempotency_key, res)

        try:
            from services.websocket_manager import websocket_manager
            await websocket_manager.broadcast({
                "type": "interaction_resolved",
                "interaction_id": interaction_id,
                "data": res
            })
        except Exception:
            pass

        try:
            from repositories.event_repository import EventRepository
            from models.schemas import EventDocument
            EventRepository().insert_event(EventDocument(
                session_id=interaction.get("session_id", "default_session"),
                event_type="InteractionAnswered",
                category="interaction",
                summary=f"Resolved question: '{interaction.get('title', interaction_id)}'",
                execution_state="execution_observed",
                correlation_id=interaction_id,
                timestamp=datetime.now(timezone.utc),
                source="mobile_user",
                source_confidence="observed",
                sanitized_payload={"selected_options": payload.selected_option_ids, "has_custom": bool(payload.custom_response)}
            ))
        except Exception:
            pass

        return res

    def sync_question_from_transcript(
        self,
        session_id: str,
        question_data: Optional[Dict[str, Any]],
        is_active: bool
    ) -> Optional[str]:
        """
        Synchronize active agent questions from transcript into interaction repository.
        Supersedes older or concluded questions so they never remain pending.
        """
        if not is_active or not question_data:
            self.repo.supersede_pending_interactions(session_id=session_id)
            return None

        q_text = question_data.get("question") or "Agent Question"
        q_hash = hashlib.md5(f"{session_id}:{q_text}".encode()).hexdigest()[:12]
        interaction_id = f"q-{q_hash}"

        self.repo.supersede_pending_interactions(session_id=session_id, exclude_id=interaction_id)

        existing = self.repo.get_interaction(interaction_id)
        if existing:
            return interaction_id

        options_list = [
            InteractionOption(
                id=f"opt_{i+1}",
                label=opt,
                is_recommended=(i == 0 and "(Recommended)" in opt)
            )
            for i, opt in enumerate(question_data.get("options", []))
        ]

        doc = InteractionDocument(
            interaction_id=interaction_id,
            session_id=session_id,
            kind=InteractionKind.MULTIPLE_CHOICE if question_data.get("is_multi_select") else InteractionKind.SINGLE_CHOICE,
            title=q_text,
            description="The agent is awaiting your decision to proceed.",
            options=options_list,
            allow_custom_response=True,
            status=InteractionStatus.PENDING
        )
        self.repo.create_interaction(doc)
        return interaction_id


interaction_service = InteractionService()
