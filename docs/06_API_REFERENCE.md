# 06 — API Reference & Data Contracts

**Document ID:** CW-DOC-006  
**Version:** 2.1.0  
**Project:** AgentWatch  
**Classification:** REST & WebSocket API Specification  

---

## 1. Conversation & Upward Lazy-Loading API

### 1.1 Get Paginated Chat Messages
Returns a cursor-paginated slice of conversation turns extracted from the active Antigravity transcript.

- **Route:** `GET /api/v1/chat/messages`
- **Query Parameters:**
  - `limit` (optional `int`, default `15`, max `200`): Number of turns to fetch in this block.
  - `before` (optional `int`): Turn index cursor (`oldest_index` from the previous response). When omitted, returns the latest `limit` turns. When provided, returns up to `limit` turns immediately preceding `before`.
- **Response (`200 OK`):**
```json
{
  "messages": [
    {
      "id": "turn-12",
      "turn_index": 12,
      "role": "user",
      "text": "Run the database migration",
      "timestamp": "2026-10-23T10:00:00Z"
    }
  ],
  "total": 27,
  "oldest_index": 12,
  "has_more": true
}
```

---

## 2. Command & Tool Approvals API (`/api/v1/approvals`)

### 2.1 Get Pending Approval
Returns any active command or tool approval awaiting user confirmation.

- **Route:** `GET /api/v1/approvals/pending`
- **Response (`200 OK`):**
```json
{
  "has_pending": true,
  "approval": {
    "step_id": "turn-13-item-0",
    "request_type": "command",
    "target": "alembic upgrade head",
    "title": "Command Approval Required",
    "description": "Antigravity is waiting for your permission to execute this terminal command.",
    "command": "alembic upgrade head",
    "cwd": "/workspace/app",
    "options": [
      { "id": "allow", "label": "Allow", "description": "Run this command once" },
      { "id": "always_allow", "label": "Always Allow", "description": "Allow similar commands in this session" },
      { "id": "deny", "label": "Deny", "description": "Reject command or provide custom instructions" }
    ],
    "allow_custom_response": true
  }
}
```

### 2.2 Respond to Approval
Forwards the user's decision (**Allow**, **Always Allow**, **Deny**, or a dynamic IDE popup option) and optional custom instructions (`custom_response`) to Antigravity via CDP.

- **Route:** `POST /api/v1/approvals/respond`
- **Request Body (`ApprovalDecisionRequest`):**
```json
{
  "request_type": "command",
  "target": "alembic upgrade head",
  "decision": "deny",
  "step_id": "turn-13-item-0",
  "option_label": "Deny",
  "custom_response": "Generate the migration script with --autogenerate first before running upgrade."
}
```

---

## 3. Dynamic Agent Questions API (`/api/v1/interactions`)

### 3.1 List Pending Interactions
- **Route:** `GET /api/v1/interactions/pending`
- **Response (`200 OK`):** Returns `{"count": 1, "interactions": [...], "interaction": {...}}`.

### 3.2 Respond to Interaction
- **Route:** `POST /api/v1/interactions/respond` or `POST /api/v1/interactions/{interaction_id}/respond`
- **Request Body:**
```json
{
  "interaction_id": "q-1a2b3c4d5e6f",
  "selected_options": ["opt_1"],
  "custom_response": "Also add unit tests for the new store."
}
```

---

## 4. Viewport Snapshot & Controls API

### 4.1 Get Viewport Snapshot (with Hash Deduplication)
- **Route:** `GET /snapshot` or `GET /api/v1/snapshot`
- **Query Parameters:** `last_hash` (optional `str`): MD5 hash from the previous snapshot frame.
- **Response (`200 OK`):**
  - When screen is unchanged: `{"status": "unchanged", "has_screenshot": true, "hash": "a1b2c3d4e5f60718"}`
  - When screen changed: `{"status": "active", "screenshot": "data:image/jpeg;base64,...", "has_screenshot": true, "hash": "a1b2c3d4e5f60718"}`

### 4.2 Send Prompt, Stop, Mode & Model Switching
- `POST /api/v1/prompt` (or `/send`): Dispatch a prompt with optional file/image attachments.
- `POST /api/v1/stop` (or `/api/v1/controls/stop`): Dispatch emergency stop (`Cancel` button + `Ctrl+D` + `Escape`).
- `POST /api/v1/set-mode` (or `/api/v1/controls/mode`): Switch between `"Fast"` and `"Planning"`.
- `POST /api/v1/set-model` (or `/api/v1/controls/model`): Switch the active AI model in Antigravity IDE.
