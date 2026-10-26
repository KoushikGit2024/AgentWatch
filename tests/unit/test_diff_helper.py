"""Unit tests for diff_helper diff calculation and formatting."""

import pytest
from services.diff_helper import (
    compute_unified_diff,
    format_lines_badge,
    parse_edit_tool_diff,
)


def test_format_lines_badge():
    assert format_lines_badge(0, 0) == "0 lines"
    assert format_lines_badge(1, 0) == "+1 line"
    assert format_lines_badge(5, 0) == "+5 lines"
    assert format_lines_badge(0, 1) == "-1 line"
    assert format_lines_badge(0, 3) == "-3 lines"
    assert format_lines_badge(2, 4) == "-4 +2 lines"


def test_compute_unified_diff_single_line_change():
    old_content = "def foo():\n    return 1\n"
    new_content = "def foo():\n    return 2\n"
    res = compute_unified_diff(old_content, new_content, filename="test.py")

    assert res["added_count"] == 1
    assert res["removed_count"] == 1
    assert res["is_net_change"] is True
    assert "--- a/test.py" in res["diff_text"]
    assert "-    return 1" in res["diff_text"]
    assert "+    return 2" in res["diff_text"]


def test_compute_unified_diff_pure_addition():
    old_content = "line1\nline2\n"
    new_content = "line1\nline1.5\nline2\n"
    res = compute_unified_diff(old_content, new_content)

    assert res["added_count"] == 1
    assert res["removed_count"] == 0
    assert "+line1.5" in res["diff_text"]


def test_parse_edit_tool_diff_replace_file_content():
    args = {
        "TargetFile": "src/app.py",
        "TargetContent": "const a = 1;\nconst b = 2;\n",
        "ReplacementContent": "const a = 1;\nconst b = 99;\n",
        "StartLine": 10,
        "EndLine": 12,
    }
    target, extra, diff_info = parse_edit_tool_diff("replace_file_content", args)

    assert target == "app.py #L10-12"
    assert extra == "-1 +1 lines"
    assert diff_info["added_count"] == 1
    assert diff_info["removed_count"] == 1
    assert diff_info["file"] == "app.py"


def test_parse_edit_tool_diff_multi_replace():
    args = {
        "TargetFile": "components/Header.jsx",
        "ReplacementChunks": [
            {
                "TargetContent": "title = 'Old'",
                "ReplacementContent": "title = 'New'",
                "StartLine": 5,
                "EndLine": 5,
            },
            {
                "TargetContent": "count = 0",
                "ReplacementContent": "count = 10",
                "StartLine": 20,
                "EndLine": 20,
            },
        ],
    }
    target, extra, diff_info = parse_edit_tool_diff("multi_replace_file_content", args)

    assert "Header.jsx" in target
    assert extra == "-2 +2 lines"
    assert diff_info["chunk_count"] == 2
    assert diff_info["added_count"] == 2
    assert diff_info["removed_count"] == 2


def test_parse_edit_tool_diff_write_to_file_new():
    args = {
        "TargetFile": "non_existent_file_test_xyz.txt",
        "CodeContent": "line1\nline2\nline3\n",
    }
    target, extra, diff_info = parse_edit_tool_diff("write_to_file", args)

    assert target == "non_existent_file_test_xyz.txt"
    assert extra == "+3 lines"
    assert diff_info["is_new_file"] is True
    assert diff_info["added_count"] == 3
    assert diff_info["removed_count"] == 0
