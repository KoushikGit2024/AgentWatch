# 11 — Testing and Validation

## Running Tests

Execute the automated test suite:
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Execute the privacy audit:
```powershell
.\.venv\Scripts\python.exe scripts\check_privacy.py
```

## Test Coverage
- **`tests/unit/test_redaction.py`**: Validates recursive redaction across nested objects and lists.
- **`tests/unit/test_event_parser.py`**: Validates extraction of Antigravity subprocess environment variables.
- **`tests/integration/test_database.py`**: Validates MongoDB index creation, event deduplication, and session tracking using an isolated disposable test database.
- **`tests/integration/test_api.py`**: Validates FastAPI endpoints (`/health`, `/ready`, `/app-state`, `/api/v1/events`).
