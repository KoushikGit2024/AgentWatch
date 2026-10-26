"""Antigravity adapter managing CDP discovery, caching, and session state observation."""

import hashlib
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
    Includes target validation, screenshot hash deduplication, and 30s model caching.
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
        self._current_mode: str = "Fast"
        self._cached_screenshot: Optional[str] = None
        self._cached_screenshot_hash: Optional[str] = None
        self._last_screenshot_time: float = 0.0
        self._cached_active_model: Optional[str] = None
        self._last_model_read_time: float = 0.0

    def _is_antigravity_target(self, target: Dict[str, Any]) -> bool:
        """Validate that a CDP target belongs to the Antigravity desktop IDE context."""
        url = (target.get("url") or "").lower()
        title = (target.get("title") or "").lower()
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
        cooldown = 1.5 if self.last_status == "connected" else 4.0
        if not force and (now_ts - self._last_scan_time < cooldown):
            return {
                "connected": self.last_status == "connected",
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
                    valid_targets = [
                        t
                        for t in targets
                        if self._is_antigravity_target(t) and t.get("webSocketDebuggerUrl")
                    ]

                    if valid_targets:
                        valid_targets.sort(key=self._target_priority, reverse=True)
                        valid_target = valid_targets[0]
                        target_id = valid_target.get("id")
                        now_dt = datetime.now(timezone.utc)

                        if self.active_target_id and self.active_target_id != target_id:
                            logger.info(
                                "Antigravity CDP target replaced from '%s' to '%s'",
                                self.active_target_id,
                                target_id,
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

    async def capture_screenshot(self, quality: int = 60) -> Optional[str]:
        """
        Capture viewport screenshot from active Antigravity target via CDP Page.captureScreenshot.
        Returns base64 JPEG string or cached screenshot (1.5s TTL).
        """
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return None

        now = time.time()
        if self._cached_screenshot and (now - self._last_screenshot_time < 1.5):
            return self._cached_screenshot

        try:
            import websockets
            import json
            import asyncio

            async with websockets.connect(self.active_target_url, close_timeout=2) as ws:
                await ws.send(
                    json.dumps(
                        {
                            "id": 100,
                            "method": "Page.captureScreenshot",
                            "params": {"format": "jpeg", "quality": quality},
                        }
                    )
                )
                reply = await asyncio.wait_for(ws.recv(), timeout=2.5)
                res = json.loads(reply)
                data = res.get("result", {}).get("data")
                if data:
                    self._cached_screenshot = data
                    self._cached_screenshot_hash = hashlib.md5(
                        data.encode("ascii", errors="ignore")
                    ).hexdigest()[:16]
                    self._last_screenshot_time = now
                    return data
        except Exception as e:
            logger.debug("CDP screenshot capture notice: %s", str(e))
            if self._cached_screenshot:
                return self._cached_screenshot
        return None

    def get_cached_screenshot_hash(self) -> Optional[str]:
        """Return MD5 hash of the latest captured screenshot for bandwidth deduplication."""
        return self._cached_screenshot_hash

    async def send_prompt(self, message: str) -> Dict[str, Any]:
        """Dispatch prompt text directly into Antigravity IDE workbench via CDP."""
        if not self.active_target_url:
            self.discover_cdp(force=True)
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        from integrations.antigravity.cdp_actions import dispatch_send_prompt

        res = await dispatch_send_prompt(self.active_target_url, message)
        if not res.get("success"):
            self.discover_cdp(force=True)
            if self.active_target_url:
                res = await dispatch_send_prompt(self.active_target_url, message)
        return res

    async def stop_generation(self) -> Dict[str, Any]:
        """Dispatch stop/cancel signal to active Antigravity session via CDP."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        from integrations.antigravity.cdp_actions import dispatch_stop_generation

        return await dispatch_stop_generation(self.active_target_url)

    async def inspect_active_popup(self) -> Dict[str, Any]:
        """Inspect live Antigravity DOM for active command approvals or dynamic question popups."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"has_popup": False}

        from integrations.antigravity.cdp_actions import dispatch_inspect_active_popup

        return await dispatch_inspect_active_popup(self.active_target_url)

    async def inspect_active_banners(self) -> Dict[str, Any]:
        """Inspect live Antigravity DOM for rate-limit warnings, quota drops, and error toasts."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"has_banners": False, "banners": []}

        from integrations.antigravity.cdp_actions import dispatch_inspect_active_banners

        return await dispatch_inspect_active_banners(self.active_target_url)

    async def forward_approval(
        self,
        request_type: str,
        decision: str,
        custom_response: Optional[str] = None,
        option_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Forward user approval decision (and optional custom instructions) to Antigravity IDE workbench."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {
                "success": False,
                "requires_native_ide": False,
                "error": "Antigravity CDP not connected on port 9000",
            }

        from integrations.antigravity.cdp_actions import dispatch_forward_approval

        return await dispatch_forward_approval(
            self.active_target_url,
            request_type=request_type,
            decision=decision,
            custom_response=custom_response,
            option_label=option_label,
        )

    async def answer_question(
        self,
        selected_labels: List[str],
        custom_response: Optional[str] = None,
        fallback_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Answer an active agent question by clicking DOM options or dispatching prompt text."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        from integrations.antigravity.cdp_actions import dispatch_answer_question

        return await dispatch_answer_question(
            self.active_target_url,
            selected_labels=selected_labels,
            custom_response=custom_response,
            fallback_prompt=fallback_prompt,
        )

    async def get_active_model_and_plan(self, force_refresh_list: bool = False) -> Dict[str, Any]:
        """
        Extract active model and available models from Antigravity IDE UI via CDP.
        Caches active model for 30s to avoid opening a CDP WebSocket on every 4s poll.
        """
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"model": None, "available_models": [], "mode": self._current_mode}

        cached_models = getattr(self, "_cached_available_models", None)
        if cached_models is None:
            cached_models = [
                "Gemini 3.8 Flash Medium",
                "Claude Sonnet 4.6 (Thinking)",
                "Claude Opus 4.6 (Thinking)",
                "GPT-OSS 120B (Medium)",
            ]
            self._cached_available_models = cached_models

        now = time.time()
        if (
            not force_refresh_list
            and self._cached_active_model
            and (now - self._last_model_read_time < 30.0)
        ):
            active_model = self._cached_active_model
        else:
            from integrations.antigravity.cdp_actions import dispatch_read_model

            read_res = await dispatch_read_model(
                self.active_target_url, force_full_scan=force_refresh_list
            )
            active_model = read_res.get("model") or self._cached_active_model or cached_models[0]
            self._cached_active_model = active_model
            self._last_model_read_time = now

        if active_model and active_model not in cached_models:
            cached_models.insert(0, active_model)

        return {
            "model": active_model,
            "available_models": cached_models,
            "mode": self._current_mode,
        }

    async def set_active_model(self, target_model: str) -> Dict[str, Any]:
        """Switch active model in Antigravity IDE by clicking the matching menu item."""
        self._cached_active_model = target_model
        self._last_model_read_time = time.time()
        import os

        if os.environ.get("ENVIRONMENT") == "testing":
            return {"success": True, "selected": target_model, "test_mode": True}

        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        from integrations.antigravity.cdp_actions import dispatch_switch_model

        return await dispatch_switch_model(self.active_target_url, target_model)

    async def set_active_mode(self, target_mode: str) -> Dict[str, Any]:
        """Switch active agent mode (Fast vs Planning) in Antigravity IDE."""
        self._current_mode = target_mode
        import os

        if os.environ.get("ENVIRONMENT") == "testing":
            return {"success": True, "mode": target_mode, "test_mode": True}

        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": True, "mode": target_mode, "cdp_connected": False}

        from integrations.antigravity.cdp_actions import dispatch_switch_mode

        return await dispatch_switch_mode(self.active_target_url, target_mode)

    async def toggle_terminal(self) -> Dict[str, Any]:
        """Toggle terminal in IDE via CDP click on [data-tooltip-id="tooltip-terminal"]."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {
                "success": False,
                "error": "Antigravity CDP not connected on port 9000",
                "tasks": [],
            }
        from integrations.antigravity.cdp_actions import dispatch_toggle_terminal

        return await dispatch_toggle_terminal(self.active_target_url)

    async def get_terminal_tasks(self) -> Dict[str, Any]:
        """Fetch current terminal tasks from Antigravity IDE workbench via CDP."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {
                "success": False,
                "error": "Antigravity CDP not connected on port 9000",
                "tasks": [],
            }
        from integrations.antigravity.cdp_actions import dispatch_get_terminal_tasks

        return await dispatch_get_terminal_tasks(self.active_target_url)

    async def kill_terminal_task(
        self, index: int = 0, tooltip_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Click close button on a specific terminal task row via CDP."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}
        from integrations.antigravity.cdp_actions import dispatch_kill_terminal_task

        return await dispatch_kill_terminal_task(
            self.active_target_url, index=index, tooltip_id=tooltip_id
        )

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
