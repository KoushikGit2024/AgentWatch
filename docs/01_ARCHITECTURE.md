# 01 — Architecture Specification

## 1. Component Boundaries

- **API Layer (`src/cloudwatch_v2/api/`)**: FastAPI HTTP transport, JSON validation, route handling.
- **Service Layer (`src/cloudwatch_v2/services/`)**: Orchestrates business logic, event ingestion pipeline, Tailscale status, session tracking.
- **Integration Layer (`src/cloudwatch_v2/integrations/`)**: Antigravity adapters, CDP discovery, environment metadata parser, CLI hook dispatcher.
- **Repository Layer (`src/cloudwatch_v2/repositories/`)**: PyMongo database queries, atomic upserts, compound index enforcement.
- **Security Layer (`src/cloudwatch_v2/security/`)**: Recursive secret redaction, cookie tokens, auth guard.
- **Frontend Layer (`src/cloudwatch_v2/static/`)**: Responsive HTML5/CSS3/Vanilla JS mobile viewport.

## 2. Ingestion Flow

1. An agent step executes in Antigravity IDE, injecting `ANTIGRAVITY_SOURCE_METADATA` into subprocess environment.
2. `hook_dispatcher --from-env` or an API caller posts to `POST /api/v1/events`.
3. `EventIngestionService` sanitizes parameters recursively with `redact_secrets()`.
4. `EventRepository` inserts into MongoDB `events` collection. If `source_event_id` already exists, it is deduplicated.
5. Parent session and agent tracking collections are updated atomically.
