# 01 — System Architecture

**Document ID:** CW-DOC-001  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Technical Architecture Specification  

---

## 1. Architectural Philosophy

AgentWatch is engineered following the principles of **Clean Architecture** and **Layered Separation of Concerns**. The design prioritizes:
1. **Local Autonomy:** Zero dependency on remote cloud infrastructure for monitoring, persistence, or telemetry parsing.
2. **Deterministic Processing:** Invariant handling of events, idempotency across mobile actions, and transactional status transitions in MongoDB.
3. **Graceful Degradation:** The application remains fully functional as a historical telemetry viewer and interaction queue even if Antigravity's live CDP debugging port is temporarily unreachable.
4. **Security Isolation:** Unprivileged remote clients can never execute arbitrary commands or bypass native security dialogs.

---

## 2. Structural Layer Breakdown

The system is partitioned into four primary layers, with dependencies strictly pointing inward:

```
+-----------------------------------------------------------------------------------+
| 1. Transport & Presentation Layer (FastAPI Routers, WebSockets, Modular ES6 UI)   |
|    - Handles HTTP serialization, cookie-based session auth, and input validation  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. Domain & Application Services Layer (InteractionService, RemoteAccessService) |
|    - Contains business rules, capability evaluations, and secret sanitization     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 3. Data Access & Persistence Layer (Repositories, Pydantic Schemas, Mongo Client) |
|    - Enforces schema types, unique compound indexes, and atomic updates           |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. External Infrastructure Adapters (Antigravity CDP, Tailscale CLI Subprocess)   |
|    - Interfaces with Chrome DevTools Protocol and local Tailscale daemon          |
+-----------------------------------------------------------------------------------+
```

### Layer 1: Transport & Presentation
- **FastAPI Endpoints:** Routers partitioned by domain (`auth.py`, `events.py`, `interactions.py`, `controls.py`, `health.py`).
- **Static Assets:** Serves `index.html`, `login.html`, design stylesheets, and modular ES6 scripts directly via Starlette static file mounting.
- **WebSocket Streaming:** Upgrades authenticated browser connections for push-based viewport updates and live event notifications.

### Layer 2: Domain & Business Services
- **`InteractionService`:** Central coordinator for pending agent questions. Validates choice selections against permissible option IDs, checks whether custom text responses are authorized, applies recursive secret redaction, and verifies atomic state transitions.
- **`RemoteAccessService`:** Inspects local networking conditions via the `tailscale status` CLI. Confirms whether Tailscale Serve is active and enforces the invariant that Tailscale Funnel must remain disabled.
- **`Redaction Engine`:** Recursively inspects nested dictionaries and lists, matching sensitive keys (e.g. `api_key`, `token`, `secret`, `password`) and regex patterns (JWT tokens, SSH keys, Bearer headers) to redact them in-place.

### Layer 3: Data Access & Repositories
- **`EventRepository`:** Interacts with the `events` collection. Implements deterministic hash-based deduplication (`source_event_id`), ensuring duplicate telemetry events are safely ignored.
- **`SessionRepository`:** Interacts with the `sessions` collection. Tracks conversation UUIDs, title metadata, agent identifiers, and timestamps.
- **`InteractionRepository`:** Interacts with the `interactions` collection. Maintains pending agent questions, single/multi-choice configurations, and atomic response records.

### Layer 4: Infrastructure & External Adapters
- **`AntigravityAdapter`:** Manages discovery of Antigravity's remote debugging interface. Scans ports `9000` and `9222`, interrogates `/json/list`, matches the workbench target, and manages communication via the Chrome DevTools Protocol.
- **`Database Client`:** Manages MongoDB connection pools with timeouts and automatic index verification on startup.

---

## 3. End-to-End Request & Data Flow

### Flow A: Answering a Dynamic Agent Question

```
Mobile User                  FastAPI /interactions              InteractionService           InteractionRepo / MongoDB
    |                                 |                                 |                                |
    | 1. Tap Option / Enter "Other"   |                                 |                                |
    +-------------------------------->|                                 |                                |
    | POST /api/v1/interactions/{id}/respond                            |                                |
    | Payload: {selected_option_ids, custom_response, idempotency_key}  |                                |
    |                                 | 2. Forward to Service           |                                |
    |                                 +-------------------------------->|                                |
    |                                 |                                 | 3. Query interaction document  |
    |                                 |                                 +------------------------------->|
    |                                 |                                 |<-------------------------------+
    |                                 |                                 | 4. Validate kind & choices     |
    |                                 |                                 |    Verify "Other" allowed      |
    |                                 |                                 |    Redact sensitive text       |
    |                                 |                                 |                                |
    |                                 |                                 | 5. Atomic Update (PENDING->SUBMITTED)
    |                                 |                                 +------------------------------->|
    |                                 |                                 |<-------------------------------+
    |                                 | 6. Return {status: "submitted"} |    (Returns updated doc)       |
    |                                 |<--------------------------------+                                |
    | 7. HTTP 200 OK                  |                                 |                                |
    |<--------------------------------+                                 |                                |
    | (Card turns green; disappears)  |                                 |                                |
```

### Flow B: Submitting a Prompt with Idempotency

```
Mobile User                   FastAPI /send                   AntigravityAdapter              Antigravity IDE
    |                               |                                 |                              |
    | 1. Submit Prompt Text         |                                 |                              |
    +------------------------------>|                                 |                              |
    | POST /send (with idempotency) | 2. Check Idempotency Cache      |                              |
    |                               |    If seen: return cached resp  |                              |
    |                               |    If new: evaluate connection  |                              |
    |                               +-------------------------------->|                              |
    |                               |                                 | 3. Check CDP connection      |
    |                               |                                 +----------------------------->|
    |                               |                                 |<-----------------------------+
    |                               | 4. Build Truthful Status        |                              |
    |                               |    (status: submitted,          |                              |
    |                               |     confirmed_execution: false) |                              |
    | 5. HTTP 200 Response          |                                 |                              |
    |<------------------------------+                                 |                              |
    | 6. Poll /snapshot to observe  |                                 |                              |
    |    actual agent text response |                                 |                              |
    +------------------------------>|                                 |                              |
```

---

## 4. Concurrency, Race Conditions, and Idempotency

1. **Double-Tap Mitigation (Client-Side):**  
   Whenever a mobile submit or control button is tapped, the client immediately disables the button, dims opacity, and sets visual feedback ("Submitting..."). Re-entrant taps are impossible during request inflight.
2. **Idempotency Keys (Network-Side):**  
   Every prompt and interaction response includes an auto-generated client UUID (`idempotency_key`). The backend maintains a bounded FIFO cache (500 entries) of recent idempotency keys. If network latency causes a mobile retry, the backend returns the cached response rather than duplicating the database mutation or agent prompt.
3. **Atomic MongoDB Transitions (Database-Side):**  
   Interaction state transitions are performed using atomic conditional updates:
   ```python
   self.collection.find_one_and_update(
       {"interaction_id": interaction_id, "status": "pending"},
       {"$set": {"status": "submitted", "submitted_response": sanitized, "resolved_at": datetime.now(timezone.utc)}}
   )
   ```
   If two requests attempt to resolve the same interaction concurrently, exactly one succeeds; the second receives an explicit `409 Conflict` (already submitted) error.

---

## 5. Security & Boundary Architecture

| Zone | Boundary | Communication Mechanism | Security Controls |
| :--- | :--- | :--- | :--- |
| **Mobile Client to Host** | Network Edge | Tailscale WireGuard Mesh (TLS 1.3) | Tailscale auth, session cookie, CSRF tokens |
| **FastAPI to MongoDB** | Host Loopback | Local TCP Socket (`127.0.0.1:27017`) | Loopback binding only; no external network route |
| **FastAPI to Antigravity**| Host Loopback | Chrome DevTools Protocol (`127.0.0.1:9000`) | Target domain allowlisting; command filtering |
| **Native IDE Dialogs** | Desktop Boundary | None (Remote Resolution Blocked) | Status `requires_native_ide`; user directed to desktop |
