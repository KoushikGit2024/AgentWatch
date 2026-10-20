# REMOTE INTERACTION AUDIT — CloudWatchV2

**Date:** 2026-10-20  
**Project:** CloudWatchV2  
**Purpose:** Comprehensive inventory and security audit of all remote agent interaction capabilities, dynamic request renderers, prompt lifecycles, and frontend architecture.

---

## 1. Executive Summary

The objective of this phase is to elevate CloudWatchV2 from an observation viewport into a rich, bidirectional remote interaction dashboard. Rather than relying solely on binary accept/reject prompts or raw screen snapshots, CloudWatchV2 provides a typed, dynamic interaction model capable of rendering:
- Structured questions (single choice, multiple choice, free text).
- Dynamic custom "Other" inputs when permitted by the agent question.
- Prompt composer with multiline editing and execution feedback.
- Stop execution with confirmation state.
- New conversation and session switching.
- Agent mode toggling (*Fast* vs *Planning*).
- Live execution status, tool run progress, and connection resilience.
- Native IDE permission transparency (truthful reporting without simulated click bypass).

---

## 2. Interaction Capability Matrix

| Interaction Category | Requested Capability | Underpinning Mechanism | Current Status | Target Architecture |
|---|---|---|---|---|
| **Conversation** | Start new conversation | CDP / Workspace API | Verified | `POST /api/v1/sessions/new` + CDP workbench action |
| **Conversation** | Send prompt / follow-up | CDP input dispatch / API | Verified | `POST /api/v1/send` with composer state management |
| **Conversation** | Stop generation | CDP cancel dispatch | Verified | `POST /api/v1/stop` with idempotent execution guard |
| **Conversation** | Mode switching (Fast/Planning)| CDP menu select | Verified | `POST /api/v1/set-mode` with state reconciliation |
| **Interaction** | Dynamic single-choice questions | MongoDB `interactions` | New / Implemented | Dynamic renderer (`kind="single_choice"`) |
| **Interaction** | Dynamic multi-choice questions | MongoDB `interactions` | New / Implemented | Dynamic renderer (`kind="multiple_choice"`) |
| **Interaction** | Custom "Other" text response | MongoDB `interactions` | New / Implemented | Dynamic renderer (`allow_custom_response=true`) |
| **Interaction** | Structured input forms | MongoDB `interactions` | New / Implemented | Dynamic renderer (`kind="form"`) |
| **Permission** | Native permission inspection | Metadata / Hook event | Verified | Read-only observation with IDE dialog notice |
| **Permission** | Direct permission bypass | N/A (Security restriction)| Blocked | Strictly rejected per Non-Negotiable Requirement 8 |
| **Viewport** | Live snapshot streaming | CDP Page/Runtime | Verified | `/snapshot` endpoint with virtualized scroll sync |
| **Diagnostics** | Real-time capability check | Capabilities Registry | Verified | `GET /api/v1/capabilities` typed contract |

---

## 3. Frontend Architecture Evaluation & Technology Decision

### Options Evaluated:
1. **Monolithic Legacy Vanilla JS (`app.js`, 1284 lines)**:
   - *Issues:* All state, DOM queries, polling, modals, and input handlers are crammed into one global file. Highly brittle, difficult to test, and prone to race conditions.
2. **React + TypeScript + Vite**:
   - *Evaluation:* Excellent for component-based UI, but introduces a heavy build toolchain (`node_modules` ~250MB, complex dual-build runtime behind FastAPI, and increased memory footprint on low-resource mobile clients).
3. **Modular Component-Based ES Modules (Modern Vanilla / Custom Elements)**:
   - *Evaluation:* Provides clean architectural boundaries (`components/`, `features/`, `services/`, `stores/`), 100% native browser support without build steps, instant reloads, sub-50KB bundle footprint, and flawless integration with FastAPI static mounting and Tailscale Serve.

### Selected Architecture:
**Modular Component-Based ES6 Architecture (`static/js/`)**:
Divided into:
- `services/`: API client, capability service, interaction service.
- `stores/`: Reactive interaction and session state management.
- `components/`: Dynamic interaction card renderer, prompt composer, header controls, session drawer, status badge.
- `app.js`: Clean application orchestrator coordinating stores and components.

---

## 4. Security & Safety Boundaries

1. **State-Changing Authorization**: Every interaction submission requires session validation (`APP_PASSWORD` / HMAC token).
2. **Idempotency**: Interaction responses carry deterministic `interaction_id` to prevent duplicate submissions on mobile network flakiness.
3. **No Simulated Native Clicks**: Antigravity IDE confirmation dialogs remain authoritative.
4. **Recursive Redaction**: All custom input and agent prompts are sanitized before database storage.
