"""Antigravity adapter managing CDP discovery and session state observation."""

import httpx
import logging
from typing import Optional, Dict, Any, List
from config.settings import settings

logger = logging.getLogger("integrations.antigravity.adapter")


class AntigravityAdapter:
    """Manages discovery and interaction with Antigravity desktop IDE."""

    def __init__(self):
        self.active_cdp_port: Optional[int] = None
        self.active_target_url: Optional[str] = None
        self.last_status: str = "disconnected"

    def discover_cdp(self) -> Dict[str, Any]:
        """Scan configured ports to locate Antigravity remote debugging interface."""
        for port in settings.parsed_cdp_ports:
            try:
                resp = httpx.get(f"http://127.0.0.1:{port}/json/list", timeout=0.8)
                if resp.status_code == 200:
                    targets = resp.json()
                    # Priority 1: Main workbench
                    workbench = next(
                        (t for t in targets if "workbench" in (t.get("url") or "") or "workbench" in (t.get("title") or "").lower()),
                        None
                    )
                    if workbench and workbench.get("webSocketDebuggerUrl"):
                        self.active_cdp_port = port
                        self.active_target_url = workbench["webSocketDebuggerUrl"]
                        self.last_status = "connected"
                        return {
                            "connected": True,
                            "port": port,
                            "title": workbench.get("title", "Workbench"),
                            "target_url": self.active_target_url,
                        }
                    
                    # Priority 2: Any active target
                    if targets and targets[0].get("webSocketDebuggerUrl"):
                        self.active_cdp_port = port
                        self.active_target_url = targets[0]["webSocketDebuggerUrl"]
                        self.last_status = "connected"
                        return {
                            "connected": True,
                            "port": port,
                            "title": targets[0].get("title", "Target"),
                            "target_url": self.active_target_url,
                        }
            except Exception:
                continue

        self.active_cdp_port = None
        self.active_target_url = None
        self.last_status = "disconnected"
        return {
            "connected": False,
            "port": None,
            "title": None,
            "message": "Antigravity CDP not responding on ports " + settings.cdp_ports,
        }

    def get_status(self) -> Dict[str, Any]:
        """Return cached or refreshed status of Antigravity connection."""
        discovery = self.discover_cdp()
        return {
            "status": self.last_status,
            "cdp": discovery,
            "instructions": "Launch Antigravity with '--remote-debugging-port=9000' or run via right-click context menu.",
        }


antigravity_adapter = AntigravityAdapter()
