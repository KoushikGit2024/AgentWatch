import pytest
from fastapi.testclient import TestClient
from main import app
from repositories.interaction_repository import InteractionRepository
from models.schemas import InteractionDocument, InteractionOption, InteractionKind, InteractionStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_interactions():
    repo = InteractionRepository()
    repo.collection.delete_many({"interaction_id": {"$regex": "^test-"}})
    yield
    repo.collection.delete_many({"interaction_id": {"$regex": "^test-"}})

def test_capabilities_endpoint():
    response = client.get("/api/v1/interactions/capabilities")
    assert response.status_code == 200
    caps = {c["name"]: c for c in response.json()}
    assert "answer_choice_question" in caps
    assert caps["answer_choice_question"]["status"] == "available"
    assert "remote_permission_bypass" in caps
    assert caps["remote_permission_bypass"]["status"] == "requires_native_ide"

def test_pending_interactions_flow():
    repo = InteractionRepository()
    test_doc = InteractionDocument(
        interaction_id="test-choice-1",
        session_id="test-session-123",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Select action",
        description="Pick one of the following",
        options=[
            InteractionOption(id="opt1", label="Option 1"),
            InteractionOption(id="opt2", label="Option 2")
        ],
        allow_custom_response=False,
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(test_doc)

    # 1. Fetch pending
    res = client.get("/api/v1/interactions/pending")
    assert res.status_code == 200
    items = res.json()["interactions"]
    assert any(i["interaction_id"] == "test-choice-1" for i in items)

    # 2. Submit valid option
    payload = {
        "selected_option_ids": ["opt1"]
    }
    submit_res = client.post("/api/v1/interactions/test-choice-1/respond", json=payload)
    assert submit_res.status_code == 200
    res_data = submit_res.json()
    assert res_data["status"] == "submitted"

    # 3. Duplicate submission should fail (stale / already resolved)
    dup_res = client.post("/api/v1/interactions/test-choice-1/respond", json=payload)
    assert dup_res.status_code == 409
    assert "already" in dup_res.json()["detail"].lower()

def test_custom_text_rejection_when_disallowed():
    repo = InteractionRepository()
    test_doc = InteractionDocument(
        interaction_id="test-choice-no-other",
        session_id="test-session-123",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Strict Choices",
        options=[InteractionOption(id="a", label="A")],
        allow_custom_response=False,
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(test_doc)

    payload = {
        "custom_response": "Some unauthorized custom text"
    }
    res = client.post("/api/v1/interactions/test-choice-no-other/respond", json=payload)
    assert res.status_code == 400
    assert "custom text responses are not permitted" in res.json()["detail"].lower()

def test_custom_text_accepted_when_allowed():
    repo = InteractionRepository()
    test_doc = InteractionDocument(
        interaction_id="test-choice-with-other",
        session_id="test-session-123",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Flexible Choices",
        options=[InteractionOption(id="a", label="A")],
        allow_custom_response=True,
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(test_doc)

    payload = {
        "custom_response": "User custom input"
    }
    res = client.post("/api/v1/interactions/test-choice-with-other/respond", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "submitted"


def test_send_prompt_validation_and_idempotency():
    # 1. Invalid prompt (empty)
    res_empty = client.post("/send", json={"message": ""})
    assert res_empty.status_code == 422  # validation error

    # 2. Valid prompt
    valid_payload = {
        "message": "Hello Antigravity Agent",
        "idempotency_key": "idemp-test-12345"
    }
    res_valid = client.post("/send", json=valid_payload)
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert "status" in data
    assert data["message_length"] == len("Hello Antigravity Agent")
    assert data["confirmed_execution"] is False  # Truthful status

    # 3. Duplicate prompt with identical idempotency_key returns cached response
    res_dup = client.post("/send", json=valid_payload)
    assert res_dup.status_code == 200
    assert res_dup.json() == data


def test_stop_generation_lifecycle_reporting():
    res = client.post("/stop")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "action_lifecycle" in data
    assert data["confirmed_termination"] is False
