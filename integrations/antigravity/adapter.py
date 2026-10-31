"""Antigravity adapter managing CDP discovery, caching, and session state observation."""

import asyncio
import hashlib
import httpx
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from config.settings import settings
from integrations.antigravity.session_tracker import inspect_chat_target, parse_workbench_title

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
        self.active_chat_url: Optional[str] = None
        self.active_conversation_id: Optional[str] = None
        self.active_conversation_title: Optional[str] = None
        self.active_workspace_name: Optional[str] = None
        self.active_workspace_path: Optional[str] = None
        self.last_status: str = "disconnected"
        self.last_successful_observation: Optional[datetime] = None
        self.last_successful_connection: Optional[datetime] = None
        self.reconnect_attempts: int = 0
        self.last_error: Optional[str] = None
        self._last_scan_time: float = 0.0
        self._last_chat_scan_time: float = 0.0
        self._current_mode: str = "Fast"
        self._cached_screenshot: Optional[str] = None
        self._cached_screenshot_hash: Optional[str] = None
        self._last_screenshot_time: float = 0.0
        self._cached_active_model: Optional[str] = None
        self._cached_available_models: List[str] = []
        self._cached_quota_status: str = "normal"
        self._cached_quota_tooltip: Optional[str] = None
        self._last_model_read_time: float = 0.0
        self._last_models_scan_time: float = 0.0

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
                "workspace_name": self.active_workspace_name,
                "workspace_path": self.active_workspace_path,
                "active_conversation_id": self.active_conversation_id,
                "active_conversation_title": self.active_conversation_title,
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
                            self._cached_screenshot = None
                            self._cached_screenshot_hash = None
                            self._cached_active_model = None

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

                        # Extract fallback workspace name from window title
                        parsed_ws, _ = parse_workbench_title(self.active_target_title)
                        if parsed_ws and not self.active_workspace_name:
                            self.active_workspace_name = parsed_ws

                        # Inspect chat iframe if available in targets
                        chat_targets = [
                            t for t in targets
                            if "/c/" in (t.get("url") or "") and t.get("webSocketDebuggerUrl")
                        ]
                        if chat_targets and (now_ts - self._last_chat_scan_time > 1.2 or not self.active_conversation_id):
                            self._last_chat_scan_time = now_ts
                            try:
                                loop = asyncio.get_event_loop()
                                if loop.is_running():
                                    asyncio.create_task(self._async_refresh_chat(chat_targets[0]))
                                else:
                                    loop.run_until_complete(self._async_refresh_chat(chat_targets[0]))
                            except Exception:
                                pass

                        return {
                            "connected": True,
                            "port": port,
                            "target_id": self.active_target_id,
                            "title": self.active_target_title,
                            "target_url": self.active_target_url,
                            "last_observation": self.last_successful_observation,
                            "workspace_name": self.active_workspace_name,
                            "workspace_path": self.active_workspace_path,
                            "active_conversation_id": self.active_conversation_id,
                            "active_conversation_title": self.active_conversation_title,
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
        self.active_chat_url = None
        self.active_conversation_id = None
        self.active_conversation_title = None
        self.active_workspace_name = None
        self.active_workspace_path = None
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

    async def _async_refresh_chat(self, chat_target: Dict[str, Any]):
        """Asynchronously inspect chat webview metadata and update active session."""
        try:
            info = await inspect_chat_target(chat_target)
            if info.get("conversation_id"):
                self.active_conversation_id = info["conversation_id"]
            if info.get("conversation_title"):
                self.active_conversation_title = info["conversation_title"]
            if info.get("workspace_name"):
                self.active_workspace_name = info["workspace_name"]
            if info.get("workspace_path"):
                self.active_workspace_path = info["workspace_path"]
            if info.get("chat_target_url"):
                self.active_chat_url = info["chat_target_url"]
        except Exception as e:
            logger.debug("Chat refresh async error: %s", e)

    async def refresh_active_context(self, force: bool = False) -> Dict[str, Any]:
        """Inspect targets and return real-time workspace and chat state."""
        discovery = self.discover_cdp(force=force)
        # Check active chat directly
        for port in settings.parsed_cdp_ports:
            try:
                resp = httpx.get(f"http://127.0.0.1:{port}/json/list", timeout=0.8)
                if resp.status_code == 200:
                    targets = resp.json()
                    chat_targets = [
                        t for t in targets
                        if "/c/" in (t.get("url") or "") and t.get("webSocketDebuggerUrl")
                    ]
                    if chat_targets:
                        await self._async_refresh_chat(chat_targets[0])
                        break
            except Exception:
                continue

        return {
            **discovery,
            "workspace_name": self.active_workspace_name,
            "workspace_path": self.active_workspace_path,
            "active_conversation_id": self.active_conversation_id,
            "active_conversation_title": self.active_conversation_title,
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

        from integrations.antigravity.screenshot_service import capture_cdp_screenshot

        data, shot_hash, shot_time = await capture_cdp_screenshot(
            target_url=self.active_target_url,
            cached_data=self._cached_screenshot,
            cached_hash=self._cached_screenshot_hash,
            last_time=self._last_screenshot_time,
            quality=quality,
        )
        if data:
            self._cached_screenshot = data
            self._cached_screenshot_hash = shot_hash
            self._last_screenshot_time = shot_time
        return data

    def get_cached_screenshot_hash(self) -> Optional[str]:
        """Return MD5 hash of the latest captured screenshot for bandwidth deduplication."""
        return self._cached_screenshot_hash

    async def get_active_model_and_plan(self) -> Dict[str, Any]:
        """Read the active model name, available model list, and mode dynamically from Antigravity."""
        now = time.time()
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        # Check if we should re-scan available models from IDE dropdown (every 60s or if empty)
        if target_ws and (not self._cached_available_models or (now - self._last_models_scan_time > 60.0)):
            from integrations.antigravity.cdp_actions import dispatch_scan_available_models

            scanned = await dispatch_scan_available_models(target_ws)
            if scanned:
                self._cached_available_models = [
                    item["name"] for item in scanned if not item.get("disabled") and item.get("name")
                ]
                self._last_models_scan_time = now

        if self._cached_active_model and (now - self._last_model_read_time < 30.0):
            return {
                "model": self._cached_active_model,
                "mode": self._current_mode,
                "quota_status": self._cached_quota_status,
                "quota_tooltip": self._cached_quota_tooltip,
                "available_models": self._cached_available_models or [self._cached_active_model],
                "available_modes": ["Fast", "Planning"],
                "cached": True,
            }

        if not target_ws:
            return {
                "model": self._cached_active_model or "Gemini 3.8 Flash (Low)",
                "mode": self._current_mode,
                "quota_status": self._cached_quota_status,
                "quota_tooltip": self._cached_quota_tooltip,
                "available_models": self._cached_available_models or ["Gemini 3.8 Flash (Low)"],
                "available_modes": ["Fast", "Planning"],
                "cached": False,
            }

        from integrations.antigravity.cdp_actions import dispatch_read_model

        result = await dispatch_read_model(target_ws)
        if result.get("model"):
            self._cached_active_model = result["model"]
            self._cached_quota_status = result.get("quota_status", "normal")
            self._cached_quota_tooltip = result.get("quota_tooltip")
            self._last_model_read_time = now

        # Fallback list if IDE didn't return any: ensure active model is at least present
        active = self._cached_active_model or "Gemini 3.8 Flash (Low)"
        models_list = self._cached_available_models if self._cached_available_models else [active]

        return {
            "model": active,
            "mode": self._current_mode,
            "quota_status": self._cached_quota_status,
            "quota_tooltip": self._cached_quota_tooltip,
            "available_models": models_list,
            "available_modes": ["Fast", "Planning"],
            "cached": False,
        }

    async def set_active_model(self, model_name: str) -> bool:
        """Switch active model in Antigravity session."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return False
        from integrations.antigravity.cdp_actions import dispatch_switch_model

        success = await dispatch_switch_model(target_ws, model_name)
        if success:
            self._cached_active_model = model_name
            self._last_model_read_time = time.time()
        return success

    async def set_active_mode(self, mode: str) -> bool:
        """Switch active planning mode (Fast / Planning)."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return False
        from integrations.antigravity.cdp_actions import dispatch_switch_mode

        success = await dispatch_switch_mode(target_ws, mode)
        if success:
            self._current_mode = mode
        return success

    async def send_prompt(self, message: str) -> Dict[str, Any]:
        """Deliver user prompt directly into Antigravity input."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return {"success": False, "error": "Antigravity CDP not connected"}
        from integrations.antigravity.cdp_actions import dispatch_send_prompt

        return await dispatch_send_prompt(target_ws, message)

    async def stop_generation(self) -> Dict[str, Any]:
        """Dispatch stop signal to active Antigravity session."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return {"success": False, "error": "Antigravity CDP not connected"}
        from integrations.antigravity.cdp_actions import dispatch_stop_generation

        return await dispatch_stop_generation(target_ws)

    async def inspect_active_popup(self) -> Dict[str, Any]:
        """Inspect visible popups or decision requests."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return {"has_popup": False}
        from integrations.antigravity.cdp_actions import dispatch_inspect_active_popup

        return await dispatch_inspect_active_popup(target_ws)

    async def respond_to_popup(
        self,
        option_id: Optional[str] = None,
        custom_text: Optional[str] = None,
        action: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Respond to modal decision popup."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url

        if not target_ws:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}
        from integrations.antigravity.cdp_actions import dispatch_forward_approval

        return await dispatch_forward_approval(
            target_ws, option_id=option_id, custom_text=custom_text, action=action
        )

    async def toggle_terminal(self) -> Dict[str, Any]:
        """Toggle integrated terminal / running tasks panel in Antigravity."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}
        from integrations.antigravity.cdp_actions import dispatch_toggle_terminal

        return await dispatch_toggle_terminal(target_ws)

    async def get_terminal_tasks(self) -> Dict[str, Any]:
        """Fetch current terminal tasks from Antigravity IDE workbench via CDP."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            return {
                "success": False,
                "error": "Antigravity CDP not connected on port 9000",
                "tasks": [],
            }
        from integrations.antigravity.cdp_actions import dispatch_get_terminal_tasks

        return await dispatch_get_terminal_tasks(target_ws)

    async def kill_terminal_task(
        self, index: int = 0, tooltip_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Click close button on a specific terminal task row via CDP."""
        target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            self.discover_cdp()
            target_ws = self.active_chat_url or self.active_target_url
        if not target_ws:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}
        from integrations.antigravity.cdp_actions import dispatch_kill_terminal_task

        return await dispatch_kill_terminal_task(
            target_ws, index=index, tooltip_id=tooltip_id
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
            "workspace_name": self.active_workspace_name,
            "workspace_path": self.active_workspace_path,
            "active_conversation_id": self.active_conversation_id,
            "active_conversation_title": self.active_conversation_title,
            "instructions": "Launch Antigravity with '--remote-debugging-port=9000' or run via right-click context menu.",
        }


antigravity_adapter = AntigravityAdapter()
