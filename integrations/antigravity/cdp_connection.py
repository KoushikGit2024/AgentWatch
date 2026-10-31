"""Resilient fast-fail CDP connection wrapper with auto-health notification."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import websockets

logger = logging.getLogger("integrations.antigravity.cdp_connection")


@asynccontextmanager
async def cdp_connect(
    target_url: str,
    open_timeout: float = 1.5,
    close_timeout: float = 2.5,
    max_size: int = 10 * 1024 * 1024,
) -> AsyncGenerator[websockets.WebSocketClientProtocol, None]:
    """
    Asynchronous context manager wrapping websockets.connect with strict fast-fail timeouts.
    If connection fails or times out, immediately notifies the Antigravity adapter so
    subsequent actions fast-fail without hanging for 30s.
    """
    ws = None
    try:
        ws = await asyncio.wait_for(
            websockets.connect(
                target_url,
                max_size=max_size,
                close_timeout=close_timeout,
                open_timeout=open_timeout,
            ),
            timeout=open_timeout + 0.3,
        )
        yield ws
    except (asyncio.TimeoutError, websockets.InvalidURI, websockets.WebSocketException, OSError) as err:
        logger.warning("CDP connection to %s failed/timed out (%s): %s", target_url, type(err).__name__, err)
        from integrations.antigravity.adapter import antigravity_adapter
        antigravity_adapter.mark_target_unresponsive(target_url, error_message=str(err))
        raise
    finally:
        if ws:
            try:
                await ws.close()
            except Exception:
                pass

