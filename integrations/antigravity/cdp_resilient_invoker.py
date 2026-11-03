"""Resilient CDP Invoker with autonomous target rediscovery and transparent retry.

Intercepts socket terminations, remote resets (WinError 10054), connection timeouts,
and stale target 404s. Automatically evicts dead targets, forces a CDP target rescan,
and replays the action transparently on the fresh target.
"""

import asyncio
import logging
from typing import Callable, Any, Dict, Optional
import websockets

logger = logging.getLogger("integrations.antigravity.cdp_resilient_invoker")


async def execute_with_cdp_recovery(
    action_fn: Callable[..., Any],
    target_url: str,
    *args,
    action_name: str = "CDP Action",
    max_retries: int = 1,
    **kwargs,
) -> Any:
    """
    Execute a CDP action with autonomous target recovery and transparent retry.

    1. Attempts to run action_fn(target_url, *args, **kwargs).
    2. If a network/socket error occurs (ConnectionResetError, OSError, TimeoutError, WebSocketException):
       - Marks target_url as unresponsive on the adapter.
       - Triggers an immediate forced CDP rediscovery across candidate ports.
       - If a fresh target URL is discovered, replays action_fn(new_target_url, *args, **kwargs).
    3. If recovery succeeds, returns the result seamlessly without throwing to user.
    """
    try:
        return await action_fn(target_url, *args, **kwargs)
    except (ConnectionResetError, OSError, asyncio.TimeoutError, websockets.WebSocketException) as err:
        err_type = type(err).__name__
        logger.warning(
            "[%s] Failed with %s: %s on target %s. Initiating autonomous recovery...",
            action_name,
            err_type,
            err,
            target_url,
        )

        from integrations.antigravity.adapter import antigravity_adapter

        # 1. Mark dead target as unresponsive and clear scan cooldown
        antigravity_adapter.mark_target_unresponsive(target_url, error_message=str(err))

        # 2. Force immediate rediscovery across candidate ports
        try:
            antigravity_adapter.discover_cdp(force=True)
            new_target = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url

            if new_target and new_target != target_url and max_retries > 0:
                logger.info(
                    "[%s] Autonomous self-heal successful! Replaying action on fresh target: %s",
                    action_name,
                    new_target,
                )
                await asyncio.sleep(0.25)
                # Transparent replay on fresh target
                return await action_fn(new_target, *args, **kwargs)
        except Exception as retry_err:
            logger.error("[%s] Self-heal replay failed: %s", action_name, retry_err)

        # If recovery was not possible (IDE shut down or no fresh target), return structured failure
        return {"success": False, "error": f"{action_name} failed ({err_type}): {err}"}
    except Exception as exc:
        logger.error("[%s] Unexpected exception: %s", action_name, exc, exc_info=True)
        return {"success": False, "error": str(exc)}

