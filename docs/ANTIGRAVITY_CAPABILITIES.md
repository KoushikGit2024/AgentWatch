# Antigravity Remote Interaction Capability Matrix

This matrix documents the verification status, API contracts, integration mechanisms, and failure behaviors of all user-facing remote controls in **AgentWatch**.

---

## 1. Capability Status Taxonomy

- `verified_live`: Confirmed working against an active desktop Antigravity session.
- `automated_only`: Thoroughly tested through automated end-to-end or integration suites.
- `temporarily_disconnected`: Operates when CDP remote debugging port (e.g. 9000/9222) is open; gracefully degrades when IDE is not running with `--remote-debugging-port`.
- `requires_native_ide`: Intentionally restricted from remote resolution to preserve desktop security boundaries (e.g., executing arbitrary unsandboxed commands).
- `unsupported`: Not supported by current Antigravity interfaces.

---

## 2. Comprehensive Capability Verification Matrix

| User Action / Control | Mobile UI Control | Backend Endpoint & Method | Request Schema | Integration Mechanism | Status | Observable Evidence | Disconnected / Stale / Error Behavior | Security Safeguards |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Send Prompt** | Bottom multiline composer & Send button | `POST /send` / `POST /api/v1/send` | `PromptSubmissionRequest` (`message`, `session_id`, `idempotency_key`) | Antigravity CDP Target Evaluation / Event Ingestion API | `automated_only` / `temporarily_disconnected` | Response payload indicates `status: submitted` with `action_lifecycle: acknowledged` | Buffers with `status: queued_offline`. On connection loss, input text is preserved in composer. | Validated length (1–10,000 chars); idempotency cache prevents duplicate submissions. |
| **Stop Generation** | Header Stop button (⏹) | `POST /stop` / `POST /api/v1/stop` | None | CDP runtime signal dispatch | `automated_only` / `temporarily_disconnected` | Reports `action_lifecycle: dispatched` with `confirmed_termination: false` | Returns `stop_requested_offline` with unconfirmed status. | Non-destructive: Does NOT terminate processes or IDE. Safeguards against accidental taps. |
| **Answer Single Choice** | Radio option pill (○ / ●) | `POST /api/v1/interactions/{id}/respond` | `SubmitInteractionRequest` (`selected_option_ids`) | Dynamic Interaction Engine & MongoDB | `automated_only` | Card transitions to green success checkmark; status transitions to `submitted` | Duplicate submissions rejected with `409 Conflict`. Stale interactions return `stale_interaction`. | Atomic MongoDB transition; selection constrained to declared schema option IDs. |
| **Answer Multiple Choice** | Checkbox option pill (☐ / ☑) | `POST /api/v1/interactions/{id}/respond` | `SubmitInteractionRequest` (`selected_option_ids`) | Dynamic Interaction Engine & MongoDB | `automated_only` | Multi-pills highlighted; submitted atomically | Stale interactions rejected; options validated against declared choice IDs. | Input validated against permitted schema IDs; duplicate tap disabled. |
| **Submit Custom "Other" Text** | "Other / Custom Text" input & Submit button | `POST /api/v1/interactions/{id}/respond` | `SubmitInteractionRequest` (`custom_response`, `idempotency_key`) | Dynamic Interaction Engine & MongoDB | `automated_only` | Success card displayed; response stored in DB | If `allow_custom_response: false`, server strictly rejects with `400 Bad Request`. | Recursive secret redaction applied to text before persistence; max length 5,000 chars. |
| **Start New Chat** | Header New Chat button (➕) | `POST /new-chat` / `POST /api/v1/new-chat` | None | CDP / Antigravity command dispatch | `automated_only` / `temporarily_disconnected` | Snapshot reload triggered; empty state rendered | Returns `queued_offline` if CDP port is not listening. | Re-entrant button debouncing prevents spamming. |
| **Switch Agent Mode** | Mode button ("Fast" / "Planning") | `POST /set-mode` / `POST /api/v1/set-mode` | `{"mode": "Fast" \| "Planning"}` | CDP mode toggle / State sync | `automated_only` / `temporarily_disconnected` | UI badge updates to active mode | Reverts UI badge to previous mode if backend returns an error. | Value restricted to permitted mode enums. |
| **Switch AI Model** | Model selection modal | `POST /set-model` / `POST /api/v1/set-model` | `{"model": string}` | CDP model dropdown sync | `automated_only` / `temporarily_disconnected` | Model name updated in header bar | Reverts label on failure. | Model selection bounded to supported model catalog. |
| **Viewport Mirroring** | Chat viewport container | `GET /snapshot` / `GET /api/v1/snapshot` | None | CDP DOM/CSS serialization | `automated_only` / `temporarily_disconnected` | Live DOM nodes rendered with dark mode theme overrides | Renders informative empty state instructing user to launch with `--remote-debugging-port=9000`. | Redacts sensitive inline tokens; sandboxed CSS injection. |
| **Remote Scroll Sync** | Mobile touch scrolling in chat viewport | `POST /remote-scroll` / `POST /api/v1/remote-scroll` | `{"scrollPercent": float}` | CDP synthetic scroll event | `automated_only` / `temporarily_disconnected` | Desktop viewport scrolls in tandem with mobile | Debounced by 150ms; silent failure on disconnect. | Bounded between 0.0 and 1.0. |
| **Remote Click (Thought/Worked blocks)** | Tapping thought / summary toggle elements | `POST /remote-click` / `POST /api/v1/remote-click` | `{"text": string}` | CDP element click simulation | `automated_only` / `temporarily_disconnected` | Thought block expands/collapses | Dispatched if connected. | **Strict Security Guard:** Explicitly rejects any click containing "allow", "authorize", or "grant permission". |
| **Native Permission Requests** | Informative warning banner | N/A | None | Native IDE Dialog | `requires_native_ide` | UI explicitly displays `requires_native_ide` badge | Mobile interface directs user to local IDE dialog. | Never simulates approval clicks or circumvents native OS/IDE permission popups. |

---

## 3. Truthful Architecture & Security Boundaries

1. **Idempotency Guarantees:** Prompt submissions and interaction responses carry unique `idempotency_key` tokens, preventing duplicate side-effects caused by mobile network retries.
2. **Offline Resilience:** If network connection drops while submitting a prompt, the mobile client restores the text into the composer so no thoughts or inputs are lost.
3. **No Fabricated Confirmations:** HTTP 200 from dispatching `/send` or `/stop` clearly communicates `confirmed_execution: false` until observed in the event stream.
4. **Zero Funnel Policy:** Remote connectivity is exclusively served through authenticated private Tailscale Tailnet (`tailscale serve 8000`). Tailscale Funnel remains strictly disabled.
