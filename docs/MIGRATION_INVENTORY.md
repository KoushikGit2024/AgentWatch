# MIGRATION INVENTORY — AgentWatchV2 / antigravity_phone_chat -> CloudWatchV2

**Date:** 2026-10-20  
**Project:** CloudWatchV2  
**Target Root:** `D:\All Codes\AllProjects\AgentWatchV2`  
**Primary Database:** Local MongoDB Community Server (`mongodb://127.0.0.1:27017/`, DB: `cloudwatch_v2`)  
**Backend Framework:** Python 3.12 / FastAPI + Uvicorn + PyMongo  
**Remote Networking:** Tailscale Serve (Private tailnet HTTPS proxy, Funnel strictly disabled)  

---

## 1. Inventory Summary

| Field | Purpose |
|---|---|
| **Feature** | Name of existing capability |
| **Current Implementation** | Files and components responsible in legacy repo |
| **Current Behavior** | What it actually does |
| **Dependencies** | Required modules, services, or tools |
| **Migration Destination** | Proposed new service/module location in `src/cloudwatch_v2/` |
| **Acceptance Test** | How preservation will be verified |
| **Status** | Migrated, Verified, or Platform Documented |

---

## 2. Detailed Feature Matrix

| Feature | Current Implementation | Current Behavior | Dependencies | Migration Destination | Acceptance Test | Status |
|---|---|---|---|---|---|---|
| **1. Application Health & Readiness** | `server.js` (`/health`) | Returns server status, CDP state, uptime | Express | `api/routes/health.py`, `services/monitoring_service.py` | `GET /health` returns status, MongoDB state, and Antigravity adapter status with 200/503 | Migrated |
| **2. Mobile Dashboard Layout & UX** | `public/index.html`, `public/css/style.css`, `public/js/app.js` | Dark-mode, glassmorphism mobile view, tabs, responsive controls | Vanilla HTML/CSS/JS | `src/cloudwatch_v2/static/` served via FastAPI | Load `/` in browser, verify layout, styles, and viewport response | Migrated |
| **3. Real-Time Snapshot / State Mirroring** | `server.js` (`/snapshot`, `/app-state`) | Polled/WS view of Antigravity DOM or status | Express, ws, CDP | `api/routes/snapshots.py`, `integrations/antigravity/` | `GET /api/v1/snapshot`, `GET /api/v1/app-state` return current session state | Migrated |
| **4. Event Ingestion & Normalization** | N/A in legacy (added in AgentWatch) | Captures tool invocations, prompts, task transitions | Pydantic | `services/event_ingestion.py`, `integrations/antigravity/event_parser.py` | Ingest valid event via API and verify normalized schema | Migrated |
| **5. MongoDB Document Persistence** | N/A in legacy (legacy had no DB, AgentWatch had SQLite) | Stores agents, sessions, tasks, events, migrations | PyMongo | `repositories/*.py`, `config/database.py` | Insert and query events from local MongoDB collection `events` | Migrated |
| **6. Stable Event Deduplication** | N/A in legacy | Deduplicates by `source_event_id` | MongoDB Unique Compound Index | `repositories/event_repository.py` | Re-insert same `source_event_id`; ensure second insert yields duplicate flag without crashing | Migrated |
| **7. Recursive Secret Redaction** | N/A in legacy | Scans and redacts passwords, tokens, API keys across nested dicts/lists | Regex | `security/redaction.py` | Pass nested payloads with API keys, verify `[REDACTED]` replacement | Migrated |
| **8. Antigravity Environment Adapter** | Context menu launcher / CDP scanner | Reads `ANTIGRAVITY_SOURCE_METADATA`, `ANTIGRAVITY_CONVERSATION_ID` from subprocess environment | Subprocess / OS env | `integrations/antigravity/adapter.py`, `integrations/antigravity/hook_dispatcher.py` | Ingest env dictionary and extract verified metadata | Migrated |
| **9. Agent & Session Tracking** | Legacy had in-memory variables | Tracks active sessions, agent IDs, step index, timestamps | MongoDB `agents`, `sessions`, `tasks` collections | `services/session_service.py`, `repositories/session_repository.py` | Verify active session upserted and retrievable via `GET /api/v1/sessions` | Migrated |
| **10. Tailscale Remote Access** | Legacy used ngrok, cloudflared, pinggy tunnels | Tunnel scripts exposed server globally with password | Tailscale Serve (Tailnet only) | `scripts/remote-status.ps1`, `services/remote_access.py` | Verify Tailscale Serve proxying 127.0.0.1:8000, verify Funnel is disabled | Migrated |
| **11. Access Control & Passcode Security** | `server.js` cookie auth (`APP_PASSWORD`) | Checks cookie on incoming requests, exempts LAN | HTTP Cookies / Tokens | `security/authentication.py`, `api/middleware.py` | Unauthenticated request rejected when `APP_PASSWORD` set; valid token accepted | Migrated |
| **12. Chat History & Session Selection** | `server.js` (`/chat-history`, `/select-chat`) | Queries conversation titles | CDP / MongoDB | `api/routes/sessions.py` | Retrieve session history list via `GET /api/v1/sessions` | Migrated |
| **13. Message Dispatch to Agent** | `server.js` (`/send`, `/stop`) | Sends message or stops generation | CDP / HTTP | `api/routes/controls.py`, `integrations/antigravity/adapter.py` | `POST /api/v1/send` returns accepted status | Migrated |
| **14. Native Permission Dialog Safety** | Legacy simulated clicks (`/remote-click`) | Clicked GUI buttons via CDP | Security constraint | `integrations/antigravity/capabilities.py` | Verify native dialogs remain unbypassed; remote approval disabled per Non-Negotiable Requirement 8 | Migrated |
| **15. Privacy Scanner** | None in legacy | Audits repo for accidental tokens, credentials, or private IPs | Python script | `scripts/check_privacy.py` | Run privacy scanner across all tracked files; must exit code 0 | Migrated |
| **16. System Health Diagnostic** | None in legacy | Automated checks of Python, Node, Tailscale, Mongo, Port | PowerShell | `scripts/doctor.ps1` | Run `doctor.ps1` and verify all health checks report clear status | Migrated |
