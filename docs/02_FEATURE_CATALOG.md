# 02 — Feature Catalog & Verification Matrix

| Feature | Subsystem | Verification Level | Verification Evidence |
|---|---|---|---|
| **FastAPI Backend Liveness** | API | Live Verified | `GET /health` returns 200 OK |
| **Backend Readiness Check** | Health / DB | Live Verified | `GET /ready` checks MongoDB ping, CDP status, Tailscale status |
| **MongoDB Event Ingestion** | Repositories | Live Verified | Pytest integration tests insert & query documents |
| **Stable Event Deduplication** | Repositories | Live Verified | Unique index on `source_event_id` ignores duplicate deliveries |
| **Recursive Secret Redaction** | Security | Live Verified | Redacts tokens/keys in nested objects and arrays |
| **Antigravity Env Ingestion** | Adapter | Live Verified | Successfully parses `ANTIGRAVITY_SOURCE_METADATA` |
| **Tailscale Serve Inspection** | Remote Access | Live Verified | Verified Tailscale status and Serve proxying |
| **Tailscale Funnel Block** | Remote Access | Live Verified | Verified Funnel is disabled |
| **Privacy Scanner** | Tooling | Live Verified | `scripts/check_privacy.py` passes with 0 leaks |
| **Mobile Web Dashboard** | Frontend | Live Verified | Static assets served from `/static` and `/` |
