"""System capability evaluation service."""

from typing import List
from models.schemas import CapabilityItem, CapabilityStatus
from integrations.antigravity.adapter import antigravity_adapter


def evaluate_system_capabilities() -> List[CapabilityItem]:
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
            status=CapabilityStatus.AVAILABLE
            if cdp_connected
            else CapabilityStatus.TEMPORARILY_DISCONNECTED,
            verified=cdp_connected,
            description="Submit a prompt or follow-up instruction to active session.",
            reason=None
            if cdp_connected
            else "Antigravity CDP debugging port not connected (start with --remote-debugging-port=9000)",
        ),
        CapabilityItem(
            name="stop_execution",
            category="conversation",
            status=CapabilityStatus.AVAILABLE
            if cdp_connected
            else CapabilityStatus.TEMPORARILY_DISCONNECTED,
            verified=cdp_connected,
            requires_confirmation=True,
            description="Request stopping currently running agent generation.",
            reason=None
            if cdp_connected
            else "Requires active CDP connection to dispatch stop signal",
        ),
        CapabilityItem(
            name="start_new_chat",
            category="conversation",
            status=CapabilityStatus.AVAILABLE
            if cdp_connected
            else CapabilityStatus.TEMPORARILY_DISCONNECTED,
            verified=cdp_connected,
            description="Start a clean new Antigravity chat session.",
            reason=None
            if cdp_connected
            else "Requires active CDP connection to trigger new conversation",
        ),
        CapabilityItem(
            name="mode_switching",
            category="conversation",
            status=CapabilityStatus.AVAILABLE
            if cdp_connected
            else CapabilityStatus.TEMPORARILY_DISCONNECTED,
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

