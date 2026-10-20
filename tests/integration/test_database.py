"""Integration tests verifying MongoDB repositories and deduplication."""

import pytest
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
from config.database import init_db_indexes
from repositories.event_repository import EventRepository
from repositories.session_repository import SessionRepository
from models.schemas import EventDocument


@pytest.fixture(scope="module")
def test_db():
    """Create dedicated test database and drop only test database afterwards."""
    test_db_name = f"cloudwatch_v2_test_{uuid.uuid4().hex[:8]}"
    client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=2000)
    db = client[test_db_name]
    init_db_indexes(db)
    yield db
    # Cleanup only our isolated test database
    client.drop_database(test_db_name)
    client.close()


def test_event_insertion_and_deduplication(test_db):
    repo = EventRepository(db=test_db)
    source_id = f"test_event_{uuid.uuid4().hex}"

    event1 = EventDocument(
        source_event_id=source_id,
        agent_id="test_agent",
        session_id="test_session",
        event_type="PreToolUse",
        timestamp=datetime.now(timezone.utc),
        source="antigravity",
        source_confidence="observed",
        sanitized_payload={"arg": "val"},
    )

    doc_id1, is_dup1 = repo.insert_event(event1)
    assert doc_id1 is not None
    assert is_dup1 is False

    # Second insertion with same source_event_id must be detected as duplicate
    doc_id2, is_dup2 = repo.insert_event(event1)
    assert doc_id2 == doc_id1
    assert is_dup2 is True

    # Check query
    events = repo.get_events(session_id="test_session")
    assert len(events) == 1
    assert events[0]["source_event_id"] == source_id


def test_session_repository(test_db):
    repo = SessionRepository(db=test_db)
    session_id = f"session_{uuid.uuid4().hex}"

    doc = repo.upsert_session(session_id=session_id, agent_id="agent_1", title="Test Title", mode="Fast")
    assert doc is not None
    assert doc["session_id"] == session_id
    assert doc["title"] == "Test Title"

    retrieved = repo.get_session(session_id)
    assert retrieved is not None
    assert retrieved["session_id"] == session_id
