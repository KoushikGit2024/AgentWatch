"""Unit tests for resilient CDP connection wrapper and sentinel."""

import asyncio
import pytest
from unittest.mock import patch, AsyncMock
from integrations.antigravity.cdp_connection import cdp_connect
from integrations.antigravity.adapter import AntigravityAdapter


def test_cdp_connect_fast_fail_timeout():
    """Verify that cdp_connect fast-fails when target socket hangs or is unreachable."""
    async def run_test():
        adapter = AntigravityAdapter()
        with patch("integrations.antigravity.adapter.antigravity_adapter", adapter):
            start_time = asyncio.get_event_loop().time()
            with pytest.raises(Exception):
                # Target an unreachable port with 0.3s timeout
                async with cdp_connect("ws://127.0.0.1:59999/devtools/page/test", open_timeout=0.3):
                    pass
            elapsed = asyncio.get_event_loop().time() - start_time
            # Must fail fast without hanging for 30s
            assert elapsed < 1.5
            assert adapter.last_status == "reconnecting"

    asyncio.run(run_test())


def test_adapter_latency_and_cdp_status():
    """Verify that AntigravityAdapter records latency and exposes cdp details in get_status."""
    adapter = AntigravityAdapter()
    st = adapter.get_status()
    assert "status" in st
    assert "latency_ms" in st
    assert "cdp" in st
