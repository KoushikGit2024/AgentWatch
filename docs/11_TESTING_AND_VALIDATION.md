# 11 — Testing, Verification, and CI Suite

**Document ID:** CW-DOC-011  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** Quality Assurance & Testing Specification  

---

## 1. Test Architecture & Coverage Goals

CloudWatchV2 enforces strict verification standards across all layers:
- **Unit Tests:** Validates secret redaction engines, environment metadata parsers, and input schemas.
- **Integration Tests:** Exercises live FastAPI endpoints against local MongoDB collections using `TestClient`.
- **Interaction Contract Tests:** Exercises single/multi-choice validation, duplicate submission rejection (409 Conflict), custom "Other" text guards, and prompt idempotency.
- **Security & Privacy Audits:** Validates that no credentials, tokens, or private network IPs exist in committed files.

---

## 2. Executing Automated Tests

### 2.1 Running the Pytest Suite
Run the full automated test suite:
```powershell
.\.venv\Scripts\activate
python -m pytest -v
```

### Expected Output (16 / 16 Passing Tests):
```
tests/integration/test_api.py::test_health_endpoint PASSED               [  6%]
tests/integration/test_api.py::test_readiness_endpoint PASSED            [ 12%]
tests/integration/test_api.py::test_legacy_app_state_contract PASSED     [ 18%]
tests/integration/test_api.py::test_event_ingestion_api PASSED           [ 25%]
tests/integration/test_database.py::test_event_insertion_and_deduplication PASSED [ 31%]
tests/integration/test_database.py::test_session_repository PASSED       [ 37%]
tests/integration/test_interactions.py::test_capabilities_endpoint PASSED [ 43%]
tests/integration/test_interactions.py::test_pending_interactions_flow PASSED [ 50%]
tests/integration/test_interactions.py::test_custom_text_rejection_when_disallowed PASSED [ 56%]
tests/integration/test_interactions.py::test_custom_text_accepted_when_allowed PASSED [ 62%]
tests/integration/test_interactions.py::test_send_prompt_validation_and_idempotency PASSED [ 68%]
tests/integration/test_interactions.py::test_stop_generation_lifecycle_reporting PASSED [ 75%]
tests/unit/test_event_parser.py::test_parse_valid_environment_metadata PASSED [ 81%]
tests/unit/test_event_parser.py::test_parse_empty_environment PASSED     [ 87%]
tests/unit/test_redaction.py::test_redact_sensitive_keys PASSED          [ 93%]
tests/unit/test_redaction.py::test_redact_sensitive_values_in_lists PASSED [100%]

======================= 16 passed, 1 warning in 21.18s ========================
```

---

## 3. Running the Privacy & Secret Scanner

Run the privacy verification script:
```powershell
python scripts/check_privacy.py
```
Output:
```
[SCAN] Starting Privacy and Secret Scan across D:\All Codes\AllProjects\AgentWatchV2...
[REPORT] Scanned 68 files.
[PASS] PRIVACY AUDIT PASSED! No credentials, secrets, or private tokens detected.
```
