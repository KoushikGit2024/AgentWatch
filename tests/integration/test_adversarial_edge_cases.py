"""Edge-case, Concurrency, and Adversarial Idempotency Tests."""

import pytest
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from main import app
from repositories.interaction_repository import InteractionRepository
from models.schemas import InteractionDocument, InteractionOption, InteractionKind, InteractionStatus

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_test_data():
    repo = InteractionRepository()
    repo.collection.delete_many({"interaction_id": {"$regex": "^adv-"}})
    from repositories.idempotency_repository import IdempotencyRepository
    idemp_repo = IdempotencyRepository()
    idemp_repo.collection.delete_many({"idempotency_key": {"$regex": "^test-key-"}})
    yield
    repo.collection.delete_many({"interaction_id": {"$regex": "^adv-"}})
    idemp_repo.collection.delete_many({"idempotency_key": {"$regex": "^test-key-"}})


def test_concurrent_idempotent_prompt_submissions():
    """Scenario 1: Two identical requests arrive concurrently with the same idempotency key."""
    key = f"test-key-{uuid.uuid4().hex}"
    payload = {
        "message": "Concurrent Test Message",
        "idempotency_key": key
    }

    results = []

    def send():
        res = client.post("/send", json=payload)
        results.append(res)

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(send) for _ in range(5)]
        for f in futures:
            f.result()

    # At least one succeeded, all returned either 200 or 409 in-progress, none 500
    status_codes = [r.status_code for r in results]
    assert 200 in status_codes
    assert all(code in (200, 409) for code in status_codes)

    # After completion, subsequent retry with same key returns identical 200 payload
    followup = client.post("/send", json=payload)
    assert followup.status_code == 200
    assert followup.json()["message_length"] == len("Concurrent Test Message")


def test_idempotency_key_reuse_with_mismatched_payload():
    """Scenario 2: The same key is reused with a different payload -> must fail with 409 conflict."""
    key = f"test-key-{uuid.uuid4().hex}"
    payload1 = {
        "message": "Initial Message",
        "idempotency_key": key
    }
    payload2 = {
        "message": "TAMPERED Different Message",
        "idempotency_key": key
    }

    res1 = client.post("/send", json=payload1)
    assert res1.status_code == 200

    res2 = client.post("/send", json=payload2)
    assert res2.status_code == 409
    assert "different" in res2.json()["detail"].lower() or "mismatched" in res2.json()["detail"].lower()


def test_concurrent_interaction_resolution_atomic_winner():
    """Scenario: Two clients answer the same single-choice interaction simultaneously."""
    repo = InteractionRepository()
    interaction_id = f"adv-choice-{uuid.uuid4().hex[:6]}"
    doc = InteractionDocument(
        interaction_id=interaction_id,
        session_id="adv-session",
        kind=InteractionKind.SINGLE_CHOICE,
        title="Concurrent choice",
        options=[
            InteractionOption(id="A", label="Option A"),
            InteractionOption(id="B", label="Option B")
        ],
        allow_custom_response=False,
        status=InteractionStatus.PENDING
    )
    repo.create_interaction(doc)

    responses = []

    def submit_choice(option_id):
        res = client.post(
            f"/api/v1/interactions/{interaction_id}/respond",
            json={"selected_option_ids": [option_id], "idempotency_key": f"test-key-{option_id}-{uuid.uuid4().hex}"}
        )
        responses.append(res)

    t1 = threading.Thread(target=submit_choice, args=("A",))
    t2 = threading.Thread(target=submit_choice, args=("B",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    statuses = [r.status_code for r in responses]
    # Exactly one must win (200 OK), and the second must be rejected (409 Conflict)
    assert 200 in statuses
    assert 409 in statuses


def test_input_validation_empty_and_whitespace_prompts():
    """Whitespace-only prompts must be rejected by normalization."""
    for bad in ["", "   ", "\t\t\n", "   \r\n   "]:
        res = client.post("/send", json={"message": bad})
        assert res.status_code == 422


def test_mode_and_model_strict_validation():
    """Invalid enum modes and blank model names must be rejected."""
    # Invalid mode
    res_bad_mode = client.post("/set-mode", json={"mode": "GodMode"})
    assert res_bad_mode.status_code == 422

    # Valid modes
    assert client.post("/set-mode", json={"mode": "Fast"}).status_code == 200
    assert client.post("/set-mode", json={"mode": "Planning"}).status_code == 200

    # Blank model
    res_bad_model = client.post("/set-model", json={"model": "   "})
    assert res_bad_model.status_code == 422

    # Valid model
    assert client.post("/set-model", json={"model": "Claude Sonnet 4.6 (Thinking)"}).status_code == 200


def test_remote_click_native_permission_protection():
    """Remote click attempting to approve native permission dialogs must be refused."""
    for text in ["Allow access", "Authorize command", "Grant Permission to terminal", "APPROVE"]:
        res = client.post("/remote-click", json={"text": text})
        assert res.status_code == 200
        assert res.json()["success"] is False
        assert res.json()["status"] == "requires_native_ide"


def test_idempotency_recovery_on_interrupted_operation():
    """Crash recovery: key reserved but server/worker restarted while status was in_progress."""
    from repositories.idempotency_repository import IdempotencyRepository
    repo = IdempotencyRepository()
    key = f"test-key-crash-{uuid.uuid4().hex}"
    payload = {"message": "Interrupted message", "idempotency_key": key}

    # Simulate key reserved by a worker that subsequently died
    state, cached = repo.reserve_or_get(
        scope="prompt_send",
        idempotency_key=key,
        payload=payload
    )
    assert state == "reserved"

    # Immediate second request while still in_progress yields 409
    res = client.post("/send", json=payload)
    assert res.status_code == 409
    assert "in progress" in res.json()["detail"].lower()

    # Recovery: if operation failed or crashed, mark failed allows safe retry or reconciliation
    repo.fail("prompt_send", key, "Worker crashed before completion")
    record = repo.collection.find_one({"scope": "prompt_send", "idempotency_key": key})
    assert record["status"] == "failed"
    assert record["error"] == "Worker crashed before completion"


def test_idempotency_scope_isolation():
    """Same idempotency key used across distinct scopes must be completely isolated."""
    from repositories.idempotency_repository import IdempotencyRepository
    repo = IdempotencyRepository()
    shared_key = f"test-key-shared-{uuid.uuid4().hex}"

    # Scope 1: Prompt
    st1, _ = repo.reserve_or_get("prompt_send", shared_key, {"message": "hello"})
    assert st1 == "reserved"
    repo.complete("prompt_send", shared_key, {"status": "prompt_sent"})

    # Scope 2: Interaction with same key name
    st2, _ = repo.reserve_or_get("interaction_respond", shared_key, {"choice": "opt1"})
    assert st2 == "reserved"
    repo.complete("interaction_respond", shared_key, {"status": "interaction_done"})

    # Check both keys exist independently
    rec1 = repo.collection.find_one({"scope": "prompt_send", "idempotency_key": shared_key})
    rec2 = repo.collection.find_one({"scope": "interaction_respond", "idempotency_key": shared_key})
    assert rec1 is not None and rec1["response"]["status"] == "prompt_sent"
    assert rec2 is not None and rec2["response"]["status"] == "interaction_done"


def test_timeline_queries_and_filtering():
    """Verify chronological timeline retrieval, category filtering, and text search."""
    from repositories.event_repository import EventRepository
    from models.schemas import EventDocument
    import datetime

    repo = EventRepository()
    session_id = f"test-sess-{uuid.uuid4().hex[:6]}"

    # Ingest distinct event categories
    repo.insert_event(EventDocument(
        session_id=session_id,
        event_type="PromptSubmitted",
        category="prompt",
        summary="User asked for database refactor",
        timestamp=datetime.datetime.now(datetime.timezone.utc),
        source="mobile_user"
    ))
    repo.insert_event(EventDocument(
        session_id=session_id,
        event_type="StopRequested",
        category="execution",
        summary="Emergency stop trigger",
        timestamp=datetime.datetime.now(datetime.timezone.utc),
        source="mobile_user"
    ))

    # Query all events in session
    res_all = client.get(f"/api/v1/events?session_id={session_id}")
    assert res_all.status_code == 200
    assert len(res_all.json()["events"]) == 2

    # Query with category filter
    res_cat = client.get(f"/api/v1/events?session_id={session_id}&category=prompt")
    assert res_cat.status_code == 200
    assert len(res_cat.json()["events"]) == 1
    assert res_cat.json()["events"][0]["category"] == "prompt"

    # Query with text search
    res_search = client.get(f"/api/v1/events?session_id={session_id}&search=refactor")
    assert res_search.status_code == 200
    assert len(res_search.json()["events"]) == 1
    assert "refactor" in res_search.json()["events"][0]["summary"]


def test_recovery_items_and_manual_reconciliation():
    """Verify Recovery Center detects in-progress interrupted operations and allows audited reconciliation."""
    from repositories.idempotency_repository import IdempotencyRepository
    repo = IdempotencyRepository()
    key = f"test-key-rec-{uuid.uuid4().hex}"

    # Create in-progress operation
    repo.reserve_or_get(
        scope="prompt_send",
        idempotency_key=key,
        payload={"message": "Incomplete task"}
    )

    # 1. Check recovery items endpoint discovers it
    res = client.get("/api/v1/events/recovery-items")
    assert res.status_code == 200
    items = res.json()
    matching = [i for i in items if i["context"].get("idempotency_key") == key]
    assert len(matching) == 1
    assert matching[0]["action_type"] == "reconcile_manual"
    assert matching[0]["is_retry_safe"] is False

    # 2. Mark action as user-reconciled
    rec_res = client.post("/api/v1/events/reconcile-action", json={
        "scope": "prompt_send",
        "idempotency_key": key,
        "resolution_notes": "Verified prompt succeeded in Antigravity editor directly"
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["success"] is True

    # 3. Verify record in database transitioned to user_reconciled
    record = repo.collection.find_one({"scope": "prompt_send", "idempotency_key": key})
    assert record["status"] == "user_reconciled"
    assert record["reported_outcome"] == "user_reconciled"

    # 4. Verify reconciliation audit event was created in timeline
    event = repo._db.events.find_one({"correlation_id": key, "event_type": "RecoveryAction"})
    assert event is not None
    assert event["category"] == "recovery"


