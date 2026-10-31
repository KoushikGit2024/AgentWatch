"""CDP Actions for Antigravity IDE Workbench.

Decomposed modularly:
- Prompt and Stop Actions: integrations.antigravity.cdp_prompt_actions
- Interaction & Approval Actions: integrations.antigravity.cdp_interaction_actions
- Model & Mode Actions: integrations.antigravity.cdp_model_actions
- Terminal Actions: integrations.antigravity.cdp_terminal_actions
"""

# Re-export all dispatchers for backward compatibility
from integrations.antigravity.cdp_interaction_actions import (
    dispatch_answer_question,
    dispatch_forward_approval,
    dispatch_inspect_active_banners,
    dispatch_inspect_active_popup,
)
from integrations.antigravity.cdp_model_actions import (
    dispatch_read_model,
    dispatch_scan_available_models,
    dispatch_switch_mode,
    dispatch_switch_model,
)
from integrations.antigravity.cdp_prompt_actions import (
    dispatch_send_prompt,
    dispatch_stop_generation,
)
from integrations.antigravity.cdp_terminal_actions import (
    dispatch_get_terminal_tasks,
    dispatch_kill_terminal_task,
    dispatch_toggle_terminal,
)

__all__ = [
    "dispatch_send_prompt",
    "dispatch_stop_generation",
    "dispatch_inspect_active_popup",
    "dispatch_inspect_active_banners",
    "dispatch_forward_approval",
    "dispatch_answer_question",
    "dispatch_switch_model",
    "dispatch_switch_mode",
    "dispatch_read_model",
    "dispatch_scan_available_models",
    "dispatch_toggle_terminal",
    "dispatch_get_terminal_tasks",
    "dispatch_kill_terminal_task",
]
