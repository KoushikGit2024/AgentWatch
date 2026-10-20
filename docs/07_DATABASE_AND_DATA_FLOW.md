# 07 — Database and Data Flow

## 1. Database Engine: Local MongoDB

CloudWatchV2 uses **MongoDB Community Server 8.0+** running locally on `127.0.0.1:27017` with database name `cloudwatch_v2`.

## 2. Collections and Indexes

### `events`
- `_id`: ObjectId
- `source_event_id`: String (Unique index, sparse) — guarantees idempotency
- `agent_id`: String
- `session_id`: String (Compound index with `timestamp`)
- `event_type`: String (Compound index with `timestamp`)
- `timestamp`: UTC DateTime (Descending index for timeline)
- `source`: String ("antigravity", "antigravity_hook")
- `source_confidence`: String ("observed", "declared", "inferred")
- `sanitized_payload`: Document (Secrets recursively redacted)
- `created_at`: UTC DateTime

### `sessions`
- `_id`: ObjectId
- `session_id`: String (Unique index)
- `agent_id`: String
- `title`: String
- `status`: String ("active", "idle", "completed")
- `current_mode`: String ("Fast", "Planning")
- `updated_at`: UTC DateTime (Descending index)

### `agents`
- `_id`: ObjectId
- `agent_id`: String (Unique index)
- `name`: String
- `capabilities`: Array of String
- `last_seen`: UTC DateTime
