# 06 — API Reference

## Health & Status

### `GET /health`
Liveness check.
- **Response**: `200 OK`
```json
{"status": "healthy", "service": "CloudWatchV2", "version": "2.0.0"}
```

### `GET /ready`
Readiness check verifying MongoDB, Antigravity CDP, and Tailscale status.
- **Response**: `200 OK` (when MongoDB connected) or `503 Service Unavailable`

---

## Events

### `POST /api/v1/events`
Ingest normalized agent execution event.
- **Body**:
```json
{
  "source_event_id": "conv-uuid:PreToolUse:1",
  "agent_id": "antigravity_agent",
  "session_id": "conv-uuid",
  "event_type": "PreToolUse",
  "raw_payload": {"tool": "run_command", "args": {"cmd": "pytest"}}
}
```
- **Response**: `201 Created`

### `GET /api/v1/events?session_id={id}&limit=50&skip=0`
List paginated events chronologically descending.

---

## Sessions

### `GET /api/v1/sessions`
List tracked conversations.

### `GET /api/v1/sessions/{session_id}`
Retrieve session details.
