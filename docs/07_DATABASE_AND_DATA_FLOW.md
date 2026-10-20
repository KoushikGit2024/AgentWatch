# 07 — Database & Data Flow Architecture

**Document ID:** CW-DOC-007  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Database:** MongoDB Community Server 8.x  
**Classification:** Database Architecture Specification  

---

## 1. MongoDB Collections & Schemas

AgentWatch maintains its state within the local database `AgentWatch_v2` partitioned across three core collections:

```
+-------------------------------------------------------------+
|                     MongoDB: AgentWatch_v2                  |
+-------------------------------------------------------------+
|                                                             |
|  1. events                                                  |
|     - Complete immutable telemetry log                      |
|     - PreToolUse, PostToolUse, AgentMessage, Stop events    |
|     - Deterministic hash-based deduplication                |
|                                                             |
|  2. sessions                                                |
|     - Conversation threads and agent context metadata       |
|     - Tracks active modes, timestamps, message counters     |
|                                                             |
|  3. interactions                                            |
|     - Dynamic agent questions and structured decision cards |
|     - Single/multiple choice options and custom responses   |
|     - Atomic state transitions (pending -> submitted)       |
+-------------------------------------------------------------+
```

---

## 2. Collection Schemas & Field Definitions

### 2.1 The `events` Collection
Stores immutable agent lifecycle and tool execution events.

| Field Name | BSON Type | Indexed | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes (PK) | Internal MongoDB document identifier |
| `source_event_id` | String | **Unique** | Deterministic SHA-256 hash or source UUID used for deduplication |
| `session_id` | String | Compound | UUID of the active conversation session |
| `agent_id` | String | No | Identifier of the emitting agent (`antigravity_agent`) |
| `task_id` | String | No | Active agent task identifier (optional) |
| `event_type` | String | Compound | Event class: `PreToolUse`, `PostToolUse`, `AgentMessage`, `Stop` |
| `timestamp` | Date / UTC | Compound | Exact time of event occurrence |
| `source` | String | No | Source integration origin (`antigravity`) |
| `source_confidence`| String | No | Declared confidence level (`DECLARED`, `DERIVED`) |
| `sanitized_payload`| Object | No | Fully redacted metadata payload (secrets removed) |

### 2.2 The `interactions` Collection
Stores dynamic interactive questions and their resolutions.

| Field Name | BSON Type | Indexed | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes (PK) | Internal MongoDB document identifier |
| `interaction_id` | String | **Unique** | Unique identifier for the question instance |
| `session_id` | String | Compound | Conversation session UUID this question belongs to |
| `kind` | String | No | `single_choice`, `multiple_choice`, `free_text`, `form` |
| `title` | String | No | Primary question prompt displayed on mobile |
| `description` | String | No | Contextual guidance or details |
| `options` | Array[Object] | No | Array of `{id, label, description, is_recommended}` |
| `allow_custom_response`| Boolean | No | Whether the user may enter arbitrary "Other" text |
| `status` | String | Compound | Current status: `pending`, `submitted`, `cancelled`, `expired` |
| `submitted_response`| Object | No | Captured user response with redacted custom text |
| `created_at` | Date / UTC | Compound | Timestamp when the question was emitted |
| `resolved_at` | Date / UTC | No | Timestamp when the response was submitted |

---

## 3. Database Indexes Specification

To guarantee sub-millisecond query latency and absolute data integrity, AgentWatch provisions indexes automatically on startup via `config/database.py`:

```python
# 1. Events Deduplication Index
events.create_index([("source_event_id", ASCENDING)], unique=True, name="uniq_source_event_id")

# 2. Events Session Timeline Query Index
events.create_index([("session_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_events_session_time")

# 3. Interactions Unique ID Index
interactions.create_index([("interaction_id", ASCENDING)], unique=True, name="uniq_interaction_id")

# 4. Interactions Status & Polling Index
interactions.create_index([("status", ASCENDING), ("created_at", DESCENDING)], name="idx_interactions_status_time")

# 5. Interactions Session Filter Index
interactions.create_index([("session_id", ASCENDING), ("status", ASCENDING)], name="idx_interactions_session_status")
```

---

## 4. Deterministic Deduplication Logic

When an incoming event is submitted via `POST /api/v1/events/ingest`, the system calculates a deterministic key if `source_event_id` is missing:

$$\text{source\_event\_id} = \text{SHA256}(\text{session\_id} + \text{event\_type} + \text{iso\_timestamp} + \text{raw\_payload\_hash})$$

The document is inserted via `insert_one()`. If a document with that key already exists, MongoDB raises a `DuplicateKeyError`. The repository intercepts this exception, logs a debug notice, and returns `(existing_id, is_duplicate=True)`. Duplicate events are discarded with zero database mutation.
