"""CDP Dialog, Banner, and Interactive Approval Facade.

Decomposed modularly:
- Approval & Banner Actions: integrations.antigravity.cdp_approval_actions
- Question Response Actions: integrations.antigravity.cdp_question_actions
"""

from integrations.antigravity.cdp_approval_actions import (
    dispatch_forward_approval,
    dispatch_inspect_active_banners,
    dispatch_inspect_active_popup,
)
from integrations.antigravity.cdp_question_actions import (
    dispatch_answer_question,
)

__all__ = [
    "dispatch_inspect_active_popup",
    "dispatch_inspect_active_banners",
    "dispatch_forward_approval",
    "dispatch_answer_question",
]
