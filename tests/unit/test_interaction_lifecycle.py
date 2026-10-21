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
        status=InteractionStatus.PENDING
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
        status=InteractionStatus.PENDING
    )
    doc2 = InteractionDocument(
        interaction_id="unit-int-new",
        session_id="unit-test-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="New Question",
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(doc1)
    repo.create_interaction(doc2)

    # Supersede older questions excluding unit-int-new
    count = repo.supersede_pending_interactions(session_id="unit-test-session", exclude_id="unit-int-new")
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
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(doc)

    req = SubmitInteractionRequest(
        selected_option_ids=["opt_1"]
    )
    res = await svc.submit_response("unit-int-respond", req)
    assert res["success"] is True
    assert res["status"] == "submitted"

    # Subsequent submission to resolved interaction fails with stale_interaction
    res2 = await svc.submit_response("unit-int-respond", req)
    assert res2["success"] is False
    assert res2["status"] == "stale_interaction"
