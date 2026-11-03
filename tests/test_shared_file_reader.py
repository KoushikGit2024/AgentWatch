"""Unit tests for shared file reader resilience."""

import os
import sys
import tempfile
import pytest
from pathlib import Path
from services.shared_file_reader import open_shared_read


def test_shared_read_standard_file():
    """Verify that open_shared_read reads contents cleanly."""
    with tempfile.NamedTemporaryFile("w+", delete=False, encoding="utf-8") as tf:
        tf.write("line 1\nline 2\n")
        tf_path = tf.name

    try:
        with open_shared_read(tf_path) as f:
            lines = f.readlines()
        assert len(lines) == 2
        assert lines[0] == "line 1\n"
        assert lines[1] == "line 2\n"
    finally:
        try:
            os.remove(tf_path)
        except Exception:
            pass


def test_shared_read_nonexistent_file_raises():
    """Verify that opening a nonexistent file raises an IOError / FileNotFoundError cleanly."""
    with pytest.raises(Exception):
        with open_shared_read("C:/nonexistent_path_agentwatch_test_12345.jsonl"):
            pass

