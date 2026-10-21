"""Antigravity adapter managing CDP discovery and session state observation."""

import httpx
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from config.settings import settings

logger = logging.getLogger("integrations.antigravity.adapter")


class AntigravityAdapter:
    """
    Manages robust discovery, health checks, and lifecycle tracking
    for Antigravity desktop IDE via Chrome DevTools Protocol.
    Includes target validation, reconnection backoff, and diagnostics metrics.
    """

    def __init__(self):
        self.active_cdp_port: Optional[int] = None
        self.active_target_id: Optional[str] = None
        self.active_target_url: Optional[str] = None
        self.active_target_title: Optional[str] = None
        self.last_status: str = "disconnected"
        self.last_successful_observation: Optional[datetime] = None
        self.last_successful_connection: Optional[datetime] = None
        self.reconnect_attempts: int = 0
        self.last_error: Optional[str] = None
        self._last_scan_time: float = 0.0

    def _is_antigravity_target(self, target: Dict[str, Any]) -> bool:
        """Validate that a CDP target belongs to the Antigravity desktop IDE context."""
        url = (target.get("url") or "").lower()
        title = (target.get("title") or "").lower()
        # Strictly verify vscode/electron workbench or Antigravity window markers
        return (
            "workbench" in url
            or "vscode-app" in url
            or "antigravity" in title
            or "workbench.html" in url
        )

    def _target_priority(self, target: Dict[str, Any]) -> int:
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

    def discover_cdp(self, force: bool = False) -> Dict[str, Any]:
        """
        Scan configured ports to locate Antigravity remote debugging interface.
        Detects target replacement, validates target identity, and records observation time.
        """
        now_ts = time.time()
        # Rate-limit scan frequency unless forced
        if not force and (now_ts - self._last_scan_time < 1.0) and self.last_status == "connected":
            return {
                "connected": True,
                "port": self.active_cdp_port,
                "target_id": self.active_target_id,
                "title": self.active_target_title,
                "target_url": self.active_target_url,
                "last_observation": self.last_successful_observation,
            }

        self._last_scan_time = now_ts

        for port in settings.parsed_cdp_ports:
            try:
                resp = httpx.get(f"http://127.0.0.1:{port}/json/list", timeout=0.8)
                if resp.status_code == 200:
                    targets = resp.json()
                    # Priority: Find validated Antigravity Workbench target
                    valid_targets = [
                        t for t in targets
                        if self._is_antigravity_target(t) and t.get("webSocketDebuggerUrl")
                    ]

                    if valid_targets:
                        valid_targets.sort(key=self._target_priority, reverse=True)
                        valid_target = valid_targets[0]
                        target_id = valid_target.get("id")
                        now_dt = datetime.now(timezone.utc)

                        # Detect target replacement/restart
                        if self.active_target_id and self.active_target_id != target_id:
                            logger.info(
                                "Antigravity CDP target replaced from '%s' to '%s'",
                                self.active_target_id,
                                target_id
                            )

                        self.active_cdp_port = port
                        self.active_target_id = target_id
                        self.active_target_title = valid_target.get("title", "Workbench")
                        self.active_target_url = valid_target["webSocketDebuggerUrl"]
                        self.last_status = "connected"
                        self.last_successful_observation = now_dt
                        if not self.last_successful_connection:
                            self.last_successful_connection = now_dt
                        self.reconnect_attempts = 0
                        self.last_error = None

                        return {
                            "connected": True,
                            "port": port,
                            "target_id": self.active_target_id,
                            "title": self.active_target_title,
                            "target_url": self.active_target_url,
                            "last_observation": self.last_successful_observation,
                        }
            except Exception as e:
                self.last_error = str(e)
                continue

        # Target not located or lost
        if self.last_status == "connected":
            logger.warning("Antigravity CDP disconnected on port %s", self.active_cdp_port)

        self.reconnect_attempts += 1
        self.active_cdp_port = None
        self.active_target_id = None
        self.active_target_url = None
        self.active_target_title = None
        self.last_status = "disconnected"

        return {
            "connected": False,
            "port": None,
            "target_id": None,
            "title": None,
            "reconnect_attempts": self.reconnect_attempts,
            "last_error": self.last_error,
            "message": "Antigravity CDP not responding on ports " + settings.cdp_ports,
        }

    async def capture_screenshot(self, quality: int = 65) -> Optional[str]:
        """
        Capture viewport screenshot from active Antigravity target via CDP Page.captureScreenshot.
        Returns base64 JPEG string or cached screenshot.
        """
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return None

        now = time.time()
        cached = getattr(self, "_cached_screenshot", None)
        last_time = getattr(self, "_last_screenshot_time", 0.0)
        if cached and (now - last_time < 1.0):
            return cached

        try:
            import websockets
            import json
            import asyncio
            async with websockets.connect(self.active_target_url, close_timeout=2) as ws:
                await ws.send(json.dumps({
                    "id": 100,
                    "method": "Page.captureScreenshot",
                    "params": {"format": "jpeg", "quality": quality}
                }))
                reply = await asyncio.wait_for(ws.recv(), timeout=2.5)
                res = json.loads(reply)
                data = res.get("result", {}).get("data")
                if data:
                    self._cached_screenshot = data
                    self._last_screenshot_time = now
                    return data
        except Exception as e:
            logger.debug("CDP screenshot capture notice: %s", str(e))
            if cached:
                return cached
        return None

    def get_status(self) -> Dict[str, Any]:
        """Return cached or refreshed status of Antigravity connection."""
        discovery = self.discover_cdp()
        return {
            "status": self.last_status,
            "cdp": discovery,
            "last_successful_observation": self.last_successful_observation,
            "last_successful_connection": self.last_successful_connection,
            "reconnect_attempts": self.reconnect_attempts,
            "last_error": self.last_error,
            "instructions": "Launch Antigravity with '--remote-debugging-port=9000' or run via right-click context menu.",
        }


antigravity_adapter = AntigravityAdapter()
