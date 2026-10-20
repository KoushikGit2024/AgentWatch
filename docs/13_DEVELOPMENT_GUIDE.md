# 13 — Development Guide

## Project Layout

```text
CloudWatchV2/
├── README.md
├── pyproject.toml
├── requirements.txt
├── .env.example
├── .gitignore
├── src/cloudwatch_v2/
│   ├── main.py
│   ├── config/ (settings.py, database.py)
│   ├── api/routes/ (health.py, events.py, sessions.py, controls.py, auth.py)
│   ├── services/ (event_ingestion.py, remote_access.py)
│   ├── integrations/antigravity/ (adapter.py, event_parser.py, capabilities.py, hook_dispatcher.py)
│   ├── repositories/ (event_repository.py, session_repository.py)
│   ├── models/ (schemas.py)
│   ├── security/ (redaction.py, authentication.py)
│   └── static/ (HTML, CSS, JS mobile assets)
├── scripts/ (setup.ps1, start.ps1, stop.ps1, doctor.ps1, remote-status.ps1, check_privacy.py)
├── tests/ (unit/, integration/)
└── docs/
```

## Adding an API Endpoint
1. Define Pydantic request/response model in `models/schemas.py`.
2. Add database query to appropriate repository in `repositories/`.
3. Add business logic to service in `services/`.
4. Create route in `api/routes/` and mount in `main.py`.
5. Add test in `tests/integration/`.
