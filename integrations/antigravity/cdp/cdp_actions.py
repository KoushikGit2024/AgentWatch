"""CDP Actions for Antigravity IDE Workbench with resilient self-healing.

Decomposed modularly:
- Prompt and Stop Actions: integrations.antigravity.cdp_prompt_actions
- Interaction & Approval Actions: integrations.antigravity.cdp_interaction_actions
- Model & Mode Actions: integrations.antigravity.cdp_model_actions
- Terminal Actions: integrations.antigravity.cdp_terminal_actions
- Autonomous Resilience Invoker: integrations.antigravity.cdp_resilient_invoker
"""

from typing import Any, Dict, List, Optional
from integrations.antigravity.cdp.cdp_resilient_invoker import execute_with_cdp_recovery
from integrations.antigravity.cdp.cdp_interaction_actions import (
    dispatch_answer_question as _dispatch_answer_question_raw,
    dispatch_forward_approval as _dispatch_forward_approval_raw,
    dispatch_inspect_active_banners as _dispatch_inspect_active_banners_raw,
    dispatch_inspect_active_popup as _dispatch_inspect_active_popup_raw,
)
from integrations.antigravity.cdp.cdp_model_actions import (
    dispatch_read_model,
    dispatch_scan_available_models,
    dispatch_switch_mode as _dispatch_switch_mode_raw,
    dispatch_switch_model as _dispatch_switch_model_raw,
)
from integrations.antigravity.cdp.cdp_prompt_actions import (
    dispatch_send_prompt as _dispatch_send_prompt_raw,
    dispatch_stop_generation as _dispatch_stop_generation_raw,
)
from integrations.antigravity.cdp.cdp_terminal_actions import (
    dispatch_get_terminal_tasks,
    dispatch_kill_terminal_task,
    dispatch_toggle_terminal,
)


# Resilient wrappers for actions susceptible to remote webview resets
async def dispatch_send_prompt(target_url: str, message: str) -> Dict[str, Any]:
    return await execute_with_cdp_recovery(
        _dispatch_send_prompt_raw,
        target_url,
        message,
        action_name="Send Prompt",
    )


async def dispatch_stop_generation(target_url: str) -> Dict[str, Any]:
    return await execute_with_cdp_recovery(
        _dispatch_stop_generation_raw,
        target_url,
        action_name="Stop Generation",
    )


async def dispatch_forward_approval(
    target_url: str,
    option_id: Optional[str] = None,
    custom_text: Optional[str] = None,
    action: Optional[str] = None,
) -> Dict[str, Any]:
    return await execute_with_cdp_recovery(
        _dispatch_forward_approval_raw,
        target_url,
        option_id=option_id,
        custom_text=custom_text,
        action=action,
        action_name="Forward Approval",
    )


async def dispatch_answer_question(
    target_url: str,
    selected_labels: Optional[List[str]] = None,
    custom_response: Optional[str] = None,
    fallback_prompt: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    # Allow selected_options alias if passed by caller
    labels = selected_labels if selected_labels is not None else kwargs.get("selected_options", [])
    custom = custom_response if custom_response is not None else kwargs.get("custom_text", None)
    return await execute_with_cdp_recovery(
        _dispatch_answer_question_raw,
        target_url,
        selected_labels=labels,
        custom_response=custom,
        fallback_prompt=fallback_prompt,
        action_name="Answer Question",
    )


async def dispatch_switch_model(target_url: str, target_model: str) -> Dict[str, Any]:
    return await execute_with_cdp_recovery(
        _dispatch_switch_model_raw,
        target_url,
        target_model,
        action_name="Switch Model",
    )


async def dispatch_switch_mode(target_url: str, target_mode: str) -> Dict[str, Any]:
    return await execute_with_cdp_recovery(
        _dispatch_switch_mode_raw,
        target_url,
        target_mode,
        action_name="Switch Mode",
    )


dispatch_inspect_active_popup = _dispatch_inspect_active_popup_raw
dispatch_inspect_active_banners = _dispatch_inspect_active_banners_raw

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
