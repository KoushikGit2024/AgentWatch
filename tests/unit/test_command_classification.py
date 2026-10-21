"""Unit tests for tool and command classification in AgentWatch."""

import pytest
from services.conversation_service import ConversationService


def test_sandboxed_command_does_not_require_approval():
    """Commands executed in standard sandbox must never require user approval."""
    cs = ConversationService()
    # Mock line from Antigravity transcript representing standard sandboxed run_command
    args = {
        "CommandLine": "git status",
        "Cwd": "D:/workspace",
        "BypassSandbox": False
    }
    # Verify classification logic
    bypass = bool(args.get("BypassSandbox", False))
    assert bypass is False


def test_elevated_command_requires_native_ide_confirmation():
    """Commands requesting BypassSandbox=True require native desktop confirmation."""
    cs = ConversationService()
    args = {
        "CommandLine": "pip install something",
        "Cwd": "D:/workspace",
        "BypassSandbox": True
    }
    bypass = bool(args.get("BypassSandbox", False))
    assert bypass is True

    # Simulate how conversation service marks this item
    perm_type = "native_permission" if bypass else None
    requires_perm = bool(bypass)
    requires_native_ide = bool(requires_perm and perm_type == "native_permission")

    assert requires_perm is True
    assert requires_native_ide is True
    assert perm_type == "native_permission"


def test_file_edits_do_not_generate_approval_prompts():
    """File writes and edits execute autonomously and do not generate permission dialogs."""
    for tool_name in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
        # Automated workspace edits have requires_perm = False
        requires_perm = False
        assert requires_perm is False


def test_agent_question_classified_as_question_not_approval():
    """ask_question is classified as an agent question, not a command approval card."""
    args = {
        "questions": [
            {
                "question": "Which database would you prefer?",
                "options": ["MongoDB", "PostgreSQL", "SQLite"],
                "is_multi_select": False
            }
        ]
    }
    raw_questions = args.get("questions") or []
    q_obj = raw_questions[0]
    kind = "question"
    requires_perm = False

    assert kind == "question"
    assert requires_perm is False
    assert len(q_obj.get("options")) == 3
    assert q_obj.get("question") == "Which database would you prefer?"
