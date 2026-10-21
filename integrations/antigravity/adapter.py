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

    async def send_prompt(self, message: str) -> Dict[str, Any]:
        """Dispatch prompt text directly into Antigravity IDE workbench via CDP."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        try:
            import websockets
            import json
            import asyncio
            async with websockets.connect(self.active_target_url, close_timeout=3) as ws:
                # 1. Focus the Message input element and clear existing text
                focus_js = """
                (() => {
                    const el = document.querySelector('[aria-label="Message input"]');
                    if (!el) return { found: false };
                    el.focus();
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    return { found: true };
                })()
                """
                await ws.send(json.dumps({
                    "id": 201,
                    "method": "Runtime.evaluate",
                    "params": {"expression": focus_js, "returnByValue": True}
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # 2. Insert text using CDP native Input.insertText
                await ws.send(json.dumps({
                    "id": 202,
                    "method": "Input.insertText",
                    "params": {"text": message}
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # 3. Dispatch Enter key to submit
                await ws.send(json.dumps({
                    "id": 203,
                    "method": "Input.dispatchKeyEvent",
                    "params": {
                        "type": "rawKeyDown",
                        "key": "Enter",
                        "code": "Enter",
                        "windowsVirtualKeyCode": 13,
                        "nativeVirtualKeyCode": 13
                    }
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                await ws.send(json.dumps({
                    "id": 204,
                    "method": "Input.dispatchKeyEvent",
                    "params": {
                        "type": "keyUp",
                        "key": "Enter",
                        "code": "Enter",
                        "windowsVirtualKeyCode": 13,
                        "nativeVirtualKeyCode": 13
                    }
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                return {"success": True, "message_length": len(message)}
        except Exception as exc:
            logger.error("Failed to dispatch prompt via CDP: %s", str(exc))
            return {"success": False, "error": str(exc)}

    async def forward_approval(self, request_type: str, decision: str) -> Dict[str, Any]:
        """Forward user approval decision to Antigravity IDE workbench by clicking dialog button."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        try:
            import websockets
            import json
            import asyncio
            async with websockets.connect(self.active_target_url, close_timeout=3) as ws:
                click_js = f"""
                (() => {{
                    const dec = {json.dumps(decision.lower())};
                    const isAllow = dec.includes('allow') || dec.includes('accept');
                    const btns = Array.from(document.querySelectorAll('button, .monaco-button, [role="button"]'));
                    for (const b of btns) {{
                        const text = (b.innerText || '').toLowerCase();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const title = (b.title || '').toLowerCase();
                        const combined = `${{text}} ${{aria}} ${{title}}`;
                        
                        if (isAllow && (combined.includes('allow') || combined.includes('always allow') || combined.includes('accept') || combined.includes('run'))) {{
                            b.click();
                            return {{ clicked: true, target: text || aria }};
                        }} else if (!isAllow && (combined.includes('deny') || combined.includes('reject') || combined.includes('cancel'))) {{
                            b.click();
                            return {{ clicked: true, target: text || aria }};
                        }}
                    }}
                    return {{ clicked: false }};
                }})()
                """
                await ws.send(json.dumps({
                    "id": 210,
                    "method": "Runtime.evaluate",
                    "params": {"expression": click_js, "returnByValue": True}
                }))
                reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
                res = reply.get("result", {}).get("result", {}).get("value", {})
        except Exception as exc:
            logger.error("Failed to forward approval via CDP: %s", str(exc))
            return {"success": False, "error": str(exc)}

    async def get_active_model_and_plan(self, force_refresh_list: bool = False) -> Dict[str, Any]:
        """
        Extract active model and genuine available models from Antigravity IDE UI via CDP.
        Never statically guesses or hardcodes third-party models.
        """
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"model": None, "available_models": [], "mode": "Agent"}

        now_ts = time.time()
        cached_models = getattr(self, "_cached_available_models", [])
        last_scan = getattr(self, "_last_model_scan", 0.0)

        # Passive read if models are already known and scanned recently
        need_full_scan = force_refresh_list or not cached_models or (now_ts - last_scan > 60.0)

        try:
            import websockets
            import json
            import asyncio
            async with websockets.connect(self.active_target_url, max_size=10*1024*1024, close_timeout=3) as ws:
                if not need_full_scan:
                    # Passive read of active model button without clicking
                    passive_js = r"""
                    (() => {
                        const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                        if (!btn) return null;
                        const aria = btn.getAttribute('aria-label') || '';
                        const m = aria.match(/current:\s*([^,]+)/i);
                        return m ? m[1].trim() : btn.innerText.trim();
                    })()
                    """
                    await ws.send(json.dumps({
                        "id": 220,
                        "method": "Runtime.evaluate",
                        "params": {"expression": passive_js, "returnByValue": True}
                    }))
                    reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
                    cur = reply.get("result", {}).get("result", {}).get("value")
                    return {
                        "model": cur or (cached_models[0] if cached_models else None),
                        "available_models": cached_models,
                        "mode": "Agent"
                    }

                # Full scan: click model button, gather plan options, dismiss with Escape
                full_js = r"""
                (async () => {
                    const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                    if (!btn) return { model: null, available: [] };
                    const aria = btn.getAttribute('aria-label') || '';
                    const m = aria.match(/current:\s*([^,]+)/i);
                    const currentModel = m ? m[1].trim() : btn.innerText.trim();

                    btn.click();
                    await new Promise(r => setTimeout(r, 450));

                    const items = Array.from(document.querySelectorAll('[role="menuitem"]:not(.menubar-menu-button)'));
                    const available = items.map(i => i.innerText.split('\n')[0].trim()).filter(Boolean);

                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                    return { model: currentModel, available: available.length ? available : [currentModel] };
                })()
                """
                await ws.send(json.dumps({
                    "id": 221,
                    "method": "Runtime.evaluate",
                    "params": {"expression": full_js, "awaitPromise": True, "returnByValue": True}
                }))
                reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
                val = reply.get("result", {}).get("result", {}).get("value", {})
                detected_model = val.get("model")
                detected_available = val.get("available") or ([detected_model] if detected_model else [])

                self._cached_available_models = detected_available
                self._last_model_scan = now_ts
                return {
                    "model": detected_model,
                    "available_models": detected_available,
                    "mode": "Agent"
                }
        except Exception as exc:
            logger.warning("CDP model detection failed: %s", str(exc))
            return {
                "model": getattr(self, "_last_detected_model", None),
                "available_models": cached_models,
                "mode": "Agent"
            }

    async def set_active_model(self, target_model: str) -> Dict[str, Any]:
        """Switch active model in Antigravity IDE by clicking the matching menu item."""
        if not self.active_target_url:
            self.discover_cdp()
        if not self.active_target_url:
            return {"success": False, "error": "Antigravity CDP not connected on port 9000"}

        try:
            import websockets
            import json
            import asyncio
            async with websockets.connect(self.active_target_url, max_size=10*1024*1024, close_timeout=3) as ws:
                switch_js = f"""
                (async () => {{
                    const target = {json.dumps(target_model.lower())};
                    const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                    if (!btn) return {{ success: false, error: 'Model button not found' }};
                    btn.click();
                    await new Promise(r => setTimeout(r, 450));

                    const items = Array.from(document.querySelectorAll('[role="menuitem"]:not(.menubar-menu-button)'));
                    const match = items.find(i => i.innerText.toLowerCase().includes(target));
                    if (match) {{
                        match.click();
                        return {{ success: true, selected: match.innerText.split('\\n')[0].trim() }};
                    }}
                    window.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }}));
                    return {{ success: false, error: 'Model option not in current plan' }};
                }})()
                """
                await ws.send(json.dumps({
                    "id": 225,
                    "method": "Runtime.evaluate",
                    "params": {"expression": switch_js, "awaitPromise": True, "returnByValue": True}
                }))
                reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
                val = reply.get("result", {}).get("result", {}).get("value", {})
                return val
        except Exception as exc:
            logger.error("Failed to switch model via CDP: %s", str(exc))
            return {"success": False, "error": str(exc)}

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
