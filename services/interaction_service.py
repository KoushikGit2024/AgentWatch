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
    QuestionItem,
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
            # Build allowed IDs from top-level options AND nested question sub-options
            allowed_ids = {opt["id"] for opt in interaction.get("options", [])}
            for q in interaction.get("questions", []):
                for sub_opt in q.get("options", []):
                    allowed_ids.add(sub_opt["id"])
            selected = set(payload.selected_option_ids)
            # If custom response permitted and custom text provided, allow with or without selected options
            is_custom = bool(payload.custom_response and payload.custom_response.strip())
            # For multi-question interactions, also allow if questions exist (selection optional per-question)
            has_questions = bool(interaction.get("questions"))
            if not is_custom and not selected and not has_questions:
                if payload.idempotency_key:
                    self.idempotency_repo.fail(scope, payload.idempotency_key, "No option selected")
                return {"success": False, "error": "No option selected", "status": "validation_error"}
            if selected and not selected.issubset(allowed_ids):
                if payload.idempotency_key:
                    self.idempotency_repo.fail(scope, payload.idempotency_key, "Invalid option selection")
                return {"success": False, "error": "Invalid option selection", "status": "validation_error"}
            if kind == InteractionKind.SINGLE_CHOICE.value and len(selected) > 1 and not has_questions:
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
            if payload.idempotency_key:
                self.idempotency_repo.fail(scope, payload.idempotency_key, "Race condition: already resolved")
            return {
                "success": False,
                "error": "Interaction was already resolved by a concurrent request",
                "status": "stale_interaction",
            }

        # Formulate answer text and dispatch to Antigravity IDE if connected
        # Collect labels from top-level options and nested question sub-options
        all_opts = list(interaction.get("options", []))
        for q in interaction.get("questions", []):
            all_opts.extend(q.get("options", []))
        selected_labels = [
            opt["label"] for opt in all_opts
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
        cdp_dispatch = None
        prompt_fallback = None

        if cdp_status.get("connected") and not is_testing:
            # CDP is live: click the option directly in the IDE popup
            try:
                cdp_dispatch = await antigravity_adapter.answer_question(
                    selected_labels=selected_labels,
                    custom_response=payload.custom_response.strip() if payload.custom_response else None,
                    fallback_prompt=prompt_text,
                )
            except Exception as e:
                logger.warning("Failed to dispatch interaction via CDP: %s", str(e))

        # Only attempt text prompt fallback if CDP is completely disconnected and not testing
        if not cdp_status.get("connected") and not is_testing:
            try:
                q_title = interaction.get("title", "your question")
                fallback_message = (
                    f"[Response to: \"{q_title}\"]\n{prompt_text}"
                )
                prompt_fallback = await antigravity_adapter.send_prompt(fallback_message)
                logger.info("Interaction answer dispatched as prompt fallback for '%s'", interaction_id)
            except Exception as e:
                logger.warning("Prompt fallback dispatch failed: %s", str(e))

        res = {
            "success": True,
            "interaction_id": interaction_id,
            "status": "submitted",
            "resolved_at": updated.get("resolved_at") if updated else None,
            "cdp_dispatch": cdp_dispatch,
            "prompt_fallback": prompt_fallback,
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

    async def dismiss_interaction(self, interaction_id: str) -> Dict[str, Any]:
        """Dismiss an interaction without answering, removing it from pending state."""
        interaction = self.repo.get_interaction(interaction_id)
        if not interaction:
            return {"success": False, "status": "not_found", "error": f"Interaction '{interaction_id}' not found"}

        updated = self.repo.resolve_interaction(
            interaction_id,
            response={"action": "dismissed"},
            status=InteractionStatus.DISMISSED
        )

        res = {
            "success": True,
            "interaction_id": interaction_id,
            "status": "dismissed",
            "resolved_at": updated.get("resolved_at") if updated else None
        }

        try:
            from services.websocket_manager import websocket_manager
            await websocket_manager.broadcast({
                "type": "interaction_resolved",
                "interaction_id": interaction_id,
                "data": res
            })
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
        Synchronize active agent questions from transcript or CDP DOM into interaction repository.
        Supports both string and dict options, preserves active questions across idle periods,
        and supersedes concluded questions once answered.
        """
        if not is_active or not question_data:
            self.repo.supersede_pending_interactions(session_id=session_id)
            return None

        q_text = str(question_data.get("question") or question_data.get("title") or "Agent Question").strip()[:250]
        q_desc = str(
            question_data.get("description")
            or "Select an option below or type your own custom instructions to guide the agent."
        ).strip()[:1900]
        q_hash = hashlib.md5(f"{session_id}:{q_text}".encode()).hexdigest()[:12]
        interaction_id = f"q-{q_hash}"

        self.repo.supersede_pending_interactions(session_id=session_id, exclude_id=interaction_id)

        existing = self.repo.get_interaction(interaction_id)
        if existing:
            return interaction_id

        raw_options = question_data.get("options") or []
        options_list: List[InteractionOption] = []
        for i, opt in enumerate(raw_options):
            if isinstance(opt, dict):
                label_str = str(
                    opt.get("label")
                    or opt.get("title")
                    or opt.get("text")
                    or opt.get("value")
                    or f"Option {i + 1}"
                ).strip()[:250]
                desc_val = opt.get("description") or opt.get("detail")
                desc_str = str(desc_val).strip()[:950] if desc_val else None
                is_rec = bool(opt.get("is_recommended") or opt.get("recommended") or "(recommended)" in label_str.lower())
                opt_id = str(opt.get("id") or f"opt_{i + 1}")[:120]
                if label_str:
                    options_list.append(
                        InteractionOption(
                            id=opt_id,
                            label=label_str,
                            description=desc_str,
                            is_recommended=is_rec,
                        )
                    )
            elif opt is not None:
                label_str = str(opt).strip()[:250]
                if label_str:
                    options_list.append(
                        InteractionOption(
                            id=f"opt_{i + 1}",
                            label=label_str,
                            is_recommended=(i == 0 and "(recommended)" in label_str.lower()) or "(recommended)" in label_str.lower(),
                        )
                    )

        # Parse multi-question array if provided
        raw_questions = question_data.get("questions") or []
        questions_list: List[QuestionItem] = []
        for q_idx, q_obj in enumerate(raw_questions):
            if isinstance(q_obj, dict):
                sub_title = str(q_obj.get("question") or f"Question {q_idx + 1}").strip()[:250]
                sub_opts_raw = q_obj.get("options") or []
                sub_opts_list: List[InteractionOption] = []
                for o_idx, o_raw in enumerate(sub_opts_raw):
                    if isinstance(o_raw, dict):
                        lbl = str(o_raw.get("label") or o_raw.get("title") or f"Option {o_idx + 1}").strip()[:250]
                        d_val = o_raw.get("description") or o_raw.get("detail")
                        sub_opts_list.append(InteractionOption(
                            id=str(o_raw.get("id") or f"q{q_idx+1}_opt_{o_idx+1}"),
                            label=lbl,
                            description=str(d_val).strip()[:950] if d_val else None,
                            is_recommended=bool(o_raw.get("is_recommended") or "(recommended)" in lbl.lower())
                        ))
                    elif o_raw is not None:
                        lbl = str(o_raw).strip()[:250]
                        sub_opts_list.append(InteractionOption(
                            id=f"q{q_idx+1}_opt_{o_idx+1}",
                            label=lbl,
                            is_recommended="(recommended)" in lbl.lower()
                        ))
                questions_list.append(QuestionItem(
                    id=f"q_{q_idx + 1}",
                    question=sub_title,
                    is_multi_select=bool(q_obj.get("is_multi_select", False)),
                    options=sub_opts_list
                ))

        if not options_list and not questions_list:
            kind = InteractionKind.FREE_TEXT
        elif question_data.get("is_multi_select"):
            kind = InteractionKind.MULTIPLE_CHOICE
        else:
            kind = InteractionKind.SINGLE_CHOICE

        doc = InteractionDocument(
            interaction_id=interaction_id,
            session_id=session_id,
            kind=kind,
            title=q_text,
            description=q_desc,
            options=options_list,
            questions=questions_list,
            allow_custom_response=True,
            custom_response_label="Type something else / Custom instructions",
            status=InteractionStatus.PENDING,
        )
        self.repo.create_interaction(doc)
        return interaction_id


interaction_service = InteractionService()
