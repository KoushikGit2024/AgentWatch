"""Unit tests for resilient CDP invoker and self-healing recovery."""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch
import websockets
from integrations.antigravity.cdp_resilient_invoker import execute_with_cdp_recovery
from integrations.antigravity.adapter import AntigravityAdapter


@pytest.mark.anyio
async def test_resilient_invoker_replays_on_connection_reset():
    """Verify that execute_with_cdp_recovery intercepts ConnectionResetError, rescans, and re-executes."""
    mock_action = AsyncMock()
    # First attempt raises ConnectionResetError, second attempt succeeds
    mock_action.side_effect = [
        ConnectionResetError("[WinError 10054] Connection forcibly closed"),
        {"success": True, "replayed": True},
    ]

    adapter = AntigravityAdapter()
    adapter.active_target_url = "ws://127.0.0.1:9000/devtools/page/fresh123"

    with patch("integrations.antigravity.adapter.antigravity_adapter", adapter):
        with patch.object(adapter, "discover_cdp") as mock_discover:
            # When discover_cdp is called, simulate discovering a fresh target URL
            def fake_discover(force=False):
                adapter.active_target_url = "ws://127.0.0.1:9000/devtools/page/fresh456"
                return {"connected": True}

            mock_discover.side_effect = fake_discover

            res = await execute_with_cdp_recovery(
                mock_action,
                "ws://127.0.0.1:9000/devtools/page/dead001",
                "hello world",
                action_name="Test Prompt",
            )

            # Assertions
            assert res.get("success") is True
            assert res.get("replayed") is True
            assert mock_action.call_count == 2
            # Second call was passed the newly discovered target URL
            assert mock_action.call_args_list[1][0][0] == "ws://127.0.0.1:9000/devtools/page/fresh456"
            assert mock_action.call_args_list[1][0][1] == "hello world"


@pytest.mark.anyio
async def test_resilient_invoker_returns_clean_error_when_ide_offline():
    """Verify that if no target can be recovered, a structured error dict is returned instead of crashing."""
    mock_action = AsyncMock()
    mock_action.side_effect = OSError("[WinError 10061] Connection refused")

    adapter = AntigravityAdapter()
    adapter.active_target_url = None
    adapter.active_chat_url = None

    with patch("integrations.antigravity.adapter.antigravity_adapter", adapter):
        with patch.object(adapter, "discover_cdp", return_value={"connected": False}):
            res = await execute_with_cdp_recovery(
                mock_action,
                "ws://127.0.0.1:9000/devtools/page/dead",
                action_name="Offline Test",
            )
            assert res["success"] is False
            assert "Offline Test failed" in res["error"]

