"""Unit tests covering interaction lifecycle, atomic transitions, and superseding."""

import pytest
import uuid
from models.schemas import (
    InteractionDocument,
    InteractionKind,
    InteractionStatus,
    InteractionOption,
    SubmitInteractionRequest,
)
from repositories.interaction_repository import InteractionRepository
from services.interaction_service import InteractionService


@pytest.fixture
def clean_test_interactions():
    repo = InteractionRepository()
    repo.collection.delete_many({"session_id": "unit-test-session"})
    yield repo
    repo.collection.delete_many({"session_id": "unit-test-session"})


def test_interaction_creation_and_pending_listing(clean_test_interactions):
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    doc = InteractionDocument(
        interaction_id="unit-int-1",
        session_id="unit-test-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Test Question",
        options=[
            InteractionOption(id="opt_1", label="First"),
            InteractionOption(id="opt_2", label="Second"),
        ],
        status=InteractionStatus.PENDING,
    )
    doc_id, is_dup = svc.create_interaction(doc)
    assert not is_dup
    assert doc_id is not None

    pending = svc.list_pending(session_id="unit-test-session")
    assert len(pending) == 1
    assert pending[0]["interaction_id"] == "unit-int-1"


def test_supersede_pending_interactions(clean_test_interactions):
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    # Create two questions
    doc1 = InteractionDocument(
        interaction_id="unit-int-old",
        session_id="unit-test-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Old Question",
        status=InteractionStatus.PENDING,
    )
    doc2 = InteractionDocument(
        interaction_id="unit-int-new",
        session_id="unit-test-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="New Question",
        status=InteractionStatus.PENDING,
    )
    repo.create_interaction(doc1)
    repo.create_interaction(doc2)

    # Supersede older questions excluding unit-int-new
    count = repo.supersede_pending_interactions(
        session_id="unit-test-session", exclude_id="unit-int-new"
    )
    assert count >= 1

    pending = svc.list_pending(session_id="unit-test-session")
    assert len(pending) == 1
    assert pending[0]["interaction_id"] == "unit-int-new"

    old_doc = repo.get_interaction("unit-int-old")
    assert old_doc["status"] == InteractionStatus.SUPERSEDED.value


@pytest.mark.anyio
async def test_atomic_response_submission(clean_test_interactions):
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    doc = InteractionDocument(
        interaction_id="unit-int-respond",
        session_id="unit-test-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Respond Question",
        options=[InteractionOption(id="opt_1", label="Choice 1")],
        status=InteractionStatus.PENDING,
    )
    repo.create_interaction(doc)

    req = SubmitInteractionRequest(selected_option_ids=["opt_1"])
    res = await svc.submit_response("unit-int-respond", req)
    assert res["success"] is True
    assert res["status"] == "submitted"

    # Subsequent submission to resolved interaction fails with stale_interaction
    res2 = await svc.submit_response("unit-int-respond", req)
    assert res2["success"] is False
    assert res2["status"] == "stale_interaction"


def test_sync_multi_question_parsing(clean_test_interactions):
    """Verify that ask_question with multiple questions parses all question items cleanly."""
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    payload = {
        "title": "Select workflow configuration",
        "question": "Configure deployment options",
        "description": "Please pick deployment target and testing suite",
        "questions": [
            {
                "question": "Select target environment",
                "is_multi_select": False,
                "options": [
                    {"label": "(Recommended) Staging", "is_recommended": True},
                    {"label": "Production"},
                ],
            },
            {
                "question": "Select test suites to run",
                "is_multi_select": True,
                "options": [{"label": "Unit tests"}, {"label": "Integration tests"}],
            },
        ],
    }

    interaction_id = svc.sync_question_from_transcript(
        session_id="multi-q-test-session", question_data=payload, is_active=True
    )

    assert interaction_id is not None
    interaction = repo.get_interaction(interaction_id)
    assert interaction is not None
    assert len(interaction.get("questions", [])) == 2

    q1 = interaction["questions"][0]
    assert q1["question"] == "Select target environment"
    assert q1["is_multi_select"] is False
    assert len(q1["options"]) == 2
    assert q1["options"][0]["is_recommended"] is True

    q2 = interaction["questions"][1]
    assert q2["question"] == "Select test suites to run"
    assert q2["is_multi_select"] is True
    assert len(q2["options"]) == 2


@pytest.mark.anyio
async def test_dispatch_answer_question_no_options():
    """Verify dispatch_answer_question validates input cleanly without open CDP socket."""
    from integrations.antigravity.cdp_actions import dispatch_answer_question

    res = await dispatch_answer_question(
        target_url="ws://127.0.0.1:9999/devtools/page/test",
        selected_labels=[],
        custom_response=None,
    )
    assert res["success"] is False
    assert "No options or custom response" in res.get("error", "")


def test_browser_permission_schema_and_resolution(clean_test_interactions):
    """Verify browser_permission interaction lifecycle with target domain and options."""
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    doc = InteractionDocument(
        interaction_id="browser-perm-1",
        session_id="unit-test-session",
        kind=InteractionKind.BROWSER_PERMISSION,
        popup_kind="browser_permission",
        title="Browser Permission: example.com",
        target_domain="example.com",
        options=[
            InteractionOption(id="always_allow", label="Always Allow", is_recommended=True),
            InteractionOption(id="allow_this_time", label="Allow this time"),
            InteractionOption(id="deny", label="Deny"),
        ],
        status=InteractionStatus.PENDING,
    )
    doc_id, is_dup = svc.create_interaction(doc)
    assert not is_dup
    assert doc_id is not None

    pending = svc.list_pending(session_id="unit-test-session")
    assert len(pending) == 1
    item = pending[0]
    assert item["popup_kind"] == "browser_permission"
    assert item["target_domain"] == "example.com"
    assert len(item["options"]) == 3


def test_command_approval_schema_with_command_target(clean_test_interactions):
    """Verify command approval interaction schema preserves command string and options."""
    repo = clean_test_interactions
    svc = InteractionService(interaction_repo=repo)

    doc = InteractionDocument(
        interaction_id="cmd-appr-1",
        session_id="unit-test-session",
        kind=InteractionKind.APPROVAL,
        popup_kind="approval",
        title="Allow proposing command requiring approval?",
        command="powershell -Command Write-Host 'test'",
        options=[
            InteractionOption(id="allow_this_time", label="Yes, allow this time"),
            InteractionOption(id="always_allow", label="Yes, and always allow"),
            InteractionOption(id="deny", label="No (tell the agent what to do instead)"),
        ],
        allow_custom_response=True,
        status=InteractionStatus.PENDING,
    )
    doc_id, is_dup = svc.create_interaction(doc)
    assert not is_dup
    assert doc_id is not None

    retrieved = repo.get_interaction("cmd-appr-1")
    assert retrieved is not None
    assert retrieved["command"] == "powershell -Command Write-Host 'test'"
    assert retrieved["allow_custom_response"] is True
