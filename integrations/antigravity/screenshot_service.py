"""CDP Viewport Screenshot Capture Service."""

import asyncio
import hashlib
import json
import logging
import time
from typing import Optional, Tuple

logger = logging.getLogger("integrations.antigravity.screenshot_service")


async def capture_cdp_screenshot(
    target_url: str,
    cached_data: Optional[str] = None,
    cached_hash: Optional[str] = None,
    last_time: float = 0.0,
    quality: int = 60,
    ttl: float = 1.5,
) -> Tuple[Optional[str], Optional[str], float]:
    """
    Capture viewport screenshot from active Antigravity target via CDP Page.captureScreenshot.
    Returns (screenshot_base64, hash, timestamp).
    """
    now = time.time()
    if cached_data and (now - last_time < ttl):
        return cached_data, cached_hash, last_time

    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=2) as ws:
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
                shot_hash = hashlib.md5(data.encode("ascii", errors="ignore")).hexdigest()[:16]
                return data, shot_hash, now
    except Exception as e:
        logger.debug("CDP screenshot capture notice: %s", str(e))
        if cached_data:
            return cached_data, cached_hash, last_time

    return None, cached_hash, last_time

