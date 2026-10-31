"""Target discovery, scoring, and priority ranking for Antigravity desktop IDE."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger("integrations.antigravity.target_finder")


def is_antigravity_target(target: Dict[str, Any]) -> bool:
    """Validate that a CDP target belongs to the Antigravity desktop IDE context."""
    url = (target.get("url") or "").lower()
    title = (target.get("title") or "").lower()
    return (
        "workbench" in url
        or "vscode-app" in url
        or "antigravity" in title
        or "workbench.html" in url
    )


def target_priority(target: Dict[str, Any]) -> int:
    """Score target priority so active workspace workbench.html is favored over settings."""
    url = (target.get("url") or "").lower()
    title = (target.get("title") or "").lower()
    if "workbench.html" in url:
        return 100
    if "workbench" in url and "settings" not in title:
        return 80
    if "antigravity" in title and "settings" not in title:
        return 70
    if "workbench" in url:
        return 40
    return 10


def sort_targets_by_priority(targets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter and sort targets descending by relevance to the active Antigravity workbench."""
    valid = [
        t for t in targets
        if is_antigravity_target(t) and t.get("webSocketDebuggerUrl")
    ]
    valid.sort(key=target_priority, reverse=True)
    return valid

