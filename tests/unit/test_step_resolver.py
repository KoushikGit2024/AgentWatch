"""Unit tests for StepOutputResolver."""

import tempfile
from pathlib import Path
from services.step_resolver import StepOutputResolver


def test_resolver_returns_original_if_no_step():
    resolver = StepOutputResolver()
    text = "Normal command output without truncation."
    assert resolver.resolve_output(text) == text


def test_resolver_resolves_from_step_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        base = Path(tmpdir)
        steps_dir = base / ".system_generated" / "steps" / "42"
        steps_dir.mkdir(parents=True)
        out_file = steps_dir / "output.txt"
        out_file.write_text("Command output:\nFull untruncated result from step 42", encoding="utf-8")

        resolver = StepOutputResolver()
        truncated_msg = f"The tool's output was truncated. file:///{out_file.as_posix()}"
        res = resolver.resolve_output(truncated_msg, session_dir=base)
        assert res == "Full untruncated result from step 42"


def test_resolver_handles_missing_file_gracefully():
    resolver = StepOutputResolver()
    fake_msg = "The tool's output was truncated. file:///C:/non_existent_path/.system_generated/steps/9999/output.txt"
    assert resolver.resolve_output(fake_msg) == fake_msg

