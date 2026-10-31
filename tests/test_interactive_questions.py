import pytest
from repositories.interaction_repository import InteractionRepository
from services.interaction_sync_helper import sync_question_from_transcript_data
from models.schemas import InteractionStatus, InteractionKind


def test_sync_question_from_transcript_data():
    repo = InteractionRepository()
    session_id = "test-session-fresh-unique-1"
    try:
        repo.collection.delete_many({"session_id": {"$regex": "^test-session-"}})
    except Exception:
        pass

    question_data = {
        "question": "Which database engine would you prefer?",
        "options": ["(Recommended) PostgreSQL", "SQLite", "MySQL"],
        "is_multi_select": False,
        "allow_custom_response": True,
    }

    # Test sync active question
    interaction_id = sync_question_from_transcript_data(
        repo=repo,
        session_id=session_id,
        question_data=question_data,
        is_active=True,
    )

    assert interaction_id is not None
    interaction = repo.get_interaction(interaction_id)
    assert interaction is not None
    assert interaction["kind"] == InteractionKind.SINGLE_CHOICE.value
    assert interaction["status"] == InteractionStatus.PENDING.value
    assert len(interaction["options"]) == 3
    assert interaction["options"][0]["is_recommended"] is True
    assert "PostgreSQL" in interaction["options"][0]["label"]
    assert interaction["options"][1]["is_recommended"] is False
    assert interaction["options"][1]["label"] == "SQLite"

    # Test superseding when no longer active
    sync_question_from_transcript_data(
        repo=repo,
        session_id=session_id,
        question_data=None,
        is_active=False,
    )
    superseded = repo.get_interaction(interaction_id)
    assert superseded["status"] == InteractionStatus.SUPERSEDED.value


def test_sync_multi_question_items():
    repo = InteractionRepository()
    session_id = "test-session-2"

    question_data = {
        "question": "Configure deployment options",
        "questions": [
            {
                "question": "Select target platform",
                "options": [{"label": "Cloud Run", "is_recommended": True}, {"label": "GKE"}],
                "is_multi_select": False,
            },
            {
                "question": "Select caching layer",
                "options": ["Redis", "Memcached"],
                "is_multi_select": False,
            },
        ],
    }

    interaction_id = sync_question_from_transcript_data(
        repo=repo,
        session_id=session_id,
        question_data=question_data,
        is_active=True,
    )

    assert interaction_id is not None
    interaction = repo.get_interaction(interaction_id)
    assert len(interaction["questions"]) == 2
    assert interaction["questions"][0]["question"] == "Select target platform"
    assert interaction["questions"][0]["options"][0]["is_recommended"] is True
    assert interaction["questions"][1]["question"] == "Select caching layer"
