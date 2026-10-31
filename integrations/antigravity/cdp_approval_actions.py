"""CDP Approval and Banner Inspection Facade.

Decomposed modularly:
- Popup & Banner Inspection: integrations.antigravity.cdp_popup_inspector
- Forward Approval Execution: integrations.antigravity.cdp_forward_approval
"""

from integrations.antigravity.cdp_popup_inspector import (
    dispatch_inspect_active_popup,
    dispatch_inspect_active_banners,
)
from integrations.antigravity.cdp_forward_approval import (
    dispatch_forward_approval,
)

__all__ = [
    "dispatch_inspect_active_popup",
    "dispatch_inspect_active_banners",
    "dispatch_forward_approval",
]
