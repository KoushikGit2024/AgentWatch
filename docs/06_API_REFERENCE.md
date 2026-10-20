# 06 — API Reference & Data Contracts

**Document ID:** CW-DOC-006  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** REST API Specification  

---

## 1. Authentication & Session Headers

All endpoints except `/health`, `/ready`, and `/api/v1/auth/login` require authentication via a cryptographically signed HTTP cookie (`cw2_auth_session` or configured name). Unauthenticated requests return `401 Unauthorized` or redirect to `/login.html`.

---

## 2. Dynamic Interactions API (`/api/v1/interactions`)

### 2.1 Get Capabilities Registry
Returns the real-time capability registry indicating supported, disconnected, or native-only features.

- **Route:** `GET /api/v1/interactions/capabilities`
- **Response:** `200 OK`
```json
[
  {
    "name": "answer_choice_question",
    "category": "interaction",
    "status": "available",
    "verified": true,
    "description": "Answer single-choice or multi-choice questions requested by agent."
  },
  {
    "name": "send_prompt",
    "category": "conversation",
    "status": "available",
    "verified": true,
    "description": "Submit a prompt or follow-up instruction to active session."
  },
  {
    "name": "remote_permission_bypass",
    "category": "permission",
    "status": "requires_native_ide",
    "verified": false,
    "description": "Resolve native IDE permission popups directly from mobile.",
    "reason": "Native Antigravity permission dialogs require local confirmation in IDE for security."
  }
]
```

### 2.2 List Pending Interactions
Retrieves all dynamic agent interaction requests currently awaiting mobile response.

- **Route:** `GET /api/v1/interactions/pending`
- **Query Parameters:** `session_id` (optional string)
- **Response:** `200 OK`
```json
{
  "count": 1,
  "interactions": [
    {
      "interaction_id": "int-789a",
      "session_id": "sess-456b",
      "kind": "single_choice",
      "title": "Select Database Engine",
      "description": "Choose between MongoDB and PostgreSQL",
      "options": [
        {
          "id": "opt-mongo",
          "label": "MongoDB Community Server",
          "description": "Local document database (Recommended)",
          "is_recommended": true
        },
        {
          "id": "opt-postgres",
          "label": "PostgreSQL",
          "description": "Relational SQL database",
          "is_recommended": false
        }
      ],
      "allow_custom_response": true,
      "custom_response_label": "Other Engine",
      "status": "pending",
      "created_at": "2026-10-20T14:30:00Z"
    }
  ]
]
```

### 2.3 Submit Response to Interaction
Resolves an interaction by submitting selected choices and/or custom text.

- **Route:** `POST /api/v1/interactions/{interaction_id}/respond`
- **Request Body (`SubmitInteractionRequest`):**
```json
{
  "selected_option_ids": ["opt-mongo"],
  "custom_response": null,
  "idempotency_key": "resp-int-789a-1729440000"
}
```
- **Responses:**
  - `200 OK`: `{"success": true, "interaction_id": "int-789a", "status": "submitted"}`
  - `400 Bad Request`: `{"detail": "Custom text responses are not permitted for this question"}`
  - `409 Conflict`: `{"detail": "Interaction is already submitted"}`

---

## 3. Controls & Action Dispatch API

### 3.1 Send Prompt
Dispatches a user instruction to the active Antigravity session with idempotency tracking.

- **Route:** `POST /send` or `POST /api/v1/send`
- **Request Body (`PromptSubmissionRequest`):**
```json
{
  "message": "Refactor the authentication module to support rate limiting.",
  "session_id": "optional-session-uuid",
  "idempotency_key": "prompt-1729440123-abc"
}
```
- **Response:** `200 OK`
```json
{
  "status": "submitted",
  "action_lifecycle": "acknowledged",
  "antigravity_connected": true,
  "message_length": 66,
  "target_session_id": null,
  "confirmed_execution": false
}
```

### 3.2 Stop Generation
Dispatches a halt signal to currently executing agent tasks.

- **Route:** `POST /stop` or `POST /api/v1/stop`
- **Response:** `200 OK`
```json
{
  "status": "stop_signal_dispatched",
  "action_lifecycle": "dispatched",
  "antigravity_connected": true,
  "confirmed_termination": false,
  "note": "Stop signal dispatched. Awaiting Antigravity event stream confirmation."
}
```

### 3.3 Remote Scroll & Remote Click
- **Remote Scroll (`POST /remote-scroll`):**
  - Payload: `{"scrollPercent": 0.85}`
  - Synchronizes mobile touch scroll with desktop viewport.
- **Remote Click (`POST /remote-click`):**
  - Payload: `{"text": "Thought for 12 seconds"}`
  - Expands/collapses UI toggle blocks. Strictly rejects permission keywords.

---

## 4. Diagnostics & Probes

### 4.1 Liveness Probe
- **Route:** `GET /health`
- **Response:** `200 OK`
  ```json
  {"status": "healthy", "service": "CloudWatchV2", "timestamp": "2026-10-20T14:45:00Z"}
  ```

### 4.2 Readiness Probe
- **Route:** `GET /ready`
- **Response:** `200 OK`
  ```json
  {
    "status": "ready",
    "database": "connected",
    "tailscale_funnel_safe": true,
    "antigravity_adapter": "initialized"
  }
  ```
