# 13 — Developer Onboarding & Contributing Guide

**Document ID:** CW-DOC-013  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** Engineering Guidelines  

---

## 1. Development Principles

When contributing to CloudWatchV2, adhere to the following principles:

1. **Modular Architecture Integrity:** Never place business logic directly in API route handlers or UI DOM files. Business logic belongs in `services/`; database access belongs in `repositories/`.
2. **Schema-Driven Development:** When adding or extending endpoints, define explicit Pydantic models in `models/schemas.py` with field validations, min/max lengths, and descriptions.
3. **Strict Native Security:** Never add features that bypass Antigravity's native permission checks or attempt to simulate approval clicks on local OS/IDE dialogs.
4. **Mandatory Secret Scanning:** Run `python scripts/check_privacy.py` before committing any changes. Commits containing real IP addresses, tokens, or passwords will be rejected.

---

## 2. Directory Layout & Module Responsibilities

```
CloudWatchV2/
├── api/                    # Transport layer
│   └── routes/             # FastAPI routers: auth, controls, events, health, interactions
├── config/                 # Pydantic settings & MongoDB connection pooling
├── docs/                   # Exhaustive project documentation
├── integrations/           # External system adapters
│   └── antigravity/        # CDP discovery & Antigravity IDE adapter
├── models/                 # Pydantic models, enums, and database document schemas
├── repositories/           # MongoDB data access layer: event, session, interaction
├── scripts/                # CI verification scripts: check_privacy.py
├── services/               # Core business services: interaction_service, remote_access
├── static/                 # Mobile-first frontend
│   ├── css/style.css       # Design tokens, interaction card styles, responsive grid
│   ├── index.html          # Shell layout & viewport container
│   ├── login.html          # Authentication page
│   └── js/                 # Modular ES6 components
│       ├── app.js          # App orchestrator & event listeners
│       ├── components/     # UI renderers: interaction-renderer.js
│       ├── services/       # Frontend API clients: api-client.js, interaction-service.js
│       └── stores/         # State store: app-store.js
└── tests/                  # Pytest automated test suite
    ├── integration/        # Endpoint and database integration tests
    └── unit/               # Schema, parser, and redaction unit tests
```

---

## 3. Pull Request & Verification Checklist

Before opening a pull request or pushing to `main`:

- [ ] All 16 automated pytest tests pass: `python -m pytest -v`.
- [ ] Privacy scan passes cleanly: `python scripts/check_privacy.py`.
- [ ] No `node_modules` or bulky build tools introduced.
- [ ] Tailscale Funnel remains strictly disabled.
- [ ] Clean commit messages adhering to Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`).
