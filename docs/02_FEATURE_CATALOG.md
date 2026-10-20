# 02 — Comprehensive Feature Catalog

**Document ID:** CW-DOC-002  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Product & Feature Specification  

---

## 1. Feature Index

AgentWatch organizes capabilities into six primary functional domains:
1. **Dynamic Agent Interaction Engine** (Questions, Choices, Custom Input, Validations)
2. **Mobile Viewport Mirroring & Synchronization** (DOM Mirroring, Scroll & Click Sync)
3. **Session & Conversation Management** (Session History, New Chats, Mode Switching)
4. **Agent Telemetry & Event Ingestion** (Deterministic Deduplication, Timeline Tracking)
5. **Private Tailscale Remote Networking** (Encrypted Mesh, Serve Verification, Zero Funnel)
6. **Security, Privacy, and Redaction** (Secret Sanitization, Native Safety Boundaries)

---

## 2. Dynamic Agent Interaction Engine

### Feature 2.1: Single-Choice Question Answering
- **Description:** When an Antigravity agent proposes mutually exclusive options (e.g. "Choose an implementation strategy: Approach A vs. Approach B"), the system renders a responsive card with radio-style option pills.
- **Visuals:** Shows an animated `SINGLE CHOICE` badge, question title, description, and option pills with individual labels and descriptions.
- **Recommended Badges:** If the agent highlights a preferred choice (`is_recommended: true`), the card prominently displays a green "Recommended" tag.
- **Validation:** Enforces that exactly one option is selected prior to submission.
- **Backend Flow:** Submitted via `POST /api/v1/interactions/{id}/respond`. Atomically marks the interaction as `submitted`.

### Feature 2.2: Multiple-Choice Option Selection
- **Description:** For tasks requiring multiple selections (e.g. selecting multiple files to refactor or multiple test suites to run), the card renders checkbox-style toggle pills.
- **Interaction:** Tapping any pill toggles selection independently (`☐` to `☑`).
- **Validation:** Validates that all selected IDs belong to the source option set declared in the interaction schema.

### Feature 2.3: Custom "Other" Response Entry
- **Description:** When the agent allows open-ended guidance alongside structured choices (`allow_custom_response: true`), an input textarea labeled "Other / Custom Text" is displayed.
- **Security Rule:** If `allow_custom_response` is `false`, the client hides the text field, and the backend rejects any arbitrary text payloads with `400 Bad Request`.
- **Sanitization:** All custom text is scanned for API keys, passwords, and tokens, replacing them with `[REDACTED]` prior to storage in MongoDB.

### Feature 2.4: Anti-Double-Submission Protection
- **Client Debounce:** Submit buttons are immediately disabled and display a "Submitting..." indicator upon touch.
- **Idempotency Tracking:** Every submission includes an auto-generated client idempotency key (`resp-{id}-{timestamp}`). Duplicate requests return cached responses.
- **Stale State Handling:** If an interaction was already resolved in another browser tab, subsequent attempts receive a `409 Conflict` ("Interaction is already submitted") with friendly user guidance.

---

## 3. Mobile Viewport Mirroring & Synchronization

### Feature 3.1: Live DOM Viewport Mirroring
- **Description:** Captures the desktop Antigravity Workbench conversation window via Chrome DevTools Protocol (`/snapshot`) and renders it directly on the mobile screen.
- **Dark Mode Overrides:** Injects tailored CSS ensuring high contrast, clean typography, readable code snippets, and consistent dark themes regardless of desktop color schemes.
- **Bandwidth Optimization:** Strips unnecessary desktop UI frames, toolbar buttons, and menus, focusing exclusively on the agent dialogue and code blocks.

### Feature 3.2: Bi-Directional Scroll Synchronization
- **Description:** Scrolling on your phone sends debounced scroll percentage coordinates (`POST /remote-scroll`) to the desktop IDE.
- **Virtualized DOM Handling:** Antigravity virtualizes large message histories. Scrolling on mobile causes the desktop window to scroll, loading older or newer messages into the DOM, which are then reflected back in the mobile snapshot.
- **User Scroll Protection:** When you touch or scroll the mobile screen, auto-refresh scrolling is locked for 3 seconds (`userScrollLockUntil`) so incoming agent updates do not violently jerk your screen while reading.

### Feature 3.3: Interactive Element Toggling (Remote Click)
- **Description:** Tapping thought blocks ("Thinking...", "Thought for 12 seconds", "Worked for 45 seconds") on your mobile screen simulates a click on desktop to expand or collapse reasoning chains.
- **Security Policy:** Remote clicks are strictly constrained. The backend inspects target element text and immediately rejects any attempt to click confirmation buttons like "Allow", "Authorize", or "Grant Permission".

---

## 4. Session & Conversation Management

### Feature 4.1: Multiline Prompt Composer
- **Description:** A dedicated mobile composer at the bottom of the screen supporting multiline instructions, code pasting, and auto-expanding heights.
- **Text Preservation:** If network connectivity drops while tapping Send, the client restores the text into the composer so thoughts are never lost.
- **Send on Enter:** Pressing Enter sends the message; Shift+Enter creates a new line.

### Feature 4.2: Stop Generation Control
- **Description:** A prominent Stop button (⏹) in the top navigation bar allows pausing long-running or misdirected agent executions.
- **Truthful Status:** Clearly communicates `action_lifecycle: dispatched` and `confirmed_termination: false`, avoiding misleading claims that the agent has completely halted until verified in telemetry.

### Feature 4.3: Clean New Conversation
- **Description:** Tapping the New Chat button (➕) dispatches a signal to reset the desktop conversation context, clearing the mobile viewport and preparing for a new task.

### Feature 4.4: Agent Mode & Model Switching
- **Mode Switching:** Easily toggle between **Fast Mode** (quick code generation) and **Planning Mode** (deep reasoning, architectural outlines) via a mobile modal.
- **Model Selection:** Switch between available LLM models (e.g. Gemini 3.1 Pro, Claude Sonnet 4.6, Claude Opus 4.6, GPT-OSS 120B) with live desktop synchronization.

---

## 5. Agent Telemetry & Event Ingestion

### Feature 5.1: Deterministic Deduplication
- **Description:** Ingests raw Antigravity agent telemetry events (`PreToolUse`, `PostToolUse`, `UserPrompt`, `AgentMessage`, `Stop`).
- **Deterministic ID Generation:** If an event lacks an explicit UUID, the backend calculates an SHA-256 hash across `session_id`, `event_type`, `timestamp`, and `raw_payload`. Duplicate events are silently discarded, maintaining a clean audit log.

### Feature 5.2: Historical Timeline Inspection
- **Description:** Retrieve complete conversation histories and tool invocation logs filtered by session UUID.
- **MongoDB Indexing:** Fast query performance supported by compound indexes on `(session_id, timestamp)` and `(event_type, timestamp)`.

---

## 6. Private Tailscale Remote Networking

### Feature 6.1: Tailscale Serve Integration
- **Description:** Routes traffic from your private Tailnet directly to localhost:8000 using automatic, trusted Tailscale TLS certificates.
- **Zero Configuration HTTPS:** Eliminates self-signed certificate warnings on Android Chrome while keeping the entire connection private to your Tailnet devices.

### Feature 6.2: Funnel Invariant Verification
- **Description:** The system continually checks that Tailscale Funnel is disabled (`funnel_disabled_verified: true`). The application will never expose your coding sessions or local files to the public internet.
