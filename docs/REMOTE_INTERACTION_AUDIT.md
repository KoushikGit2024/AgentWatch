# REMOTE INTERACTION & PERFORMANCE AUDIT — AgentWatch

**Date:** 2026-10-23  
**Project:** AgentWatch  
**Purpose:** Inventory of remote agent interaction capabilities, popup synchronization, upward lazy-loading, and bandwidth/memory optimizations.

---

## 1. Interaction Capability Matrix

| Interaction Category | Capability | Mechanism | Status | Endpoint / Component |
|---|---|---|---|---|
| **Command Approvals** | Live command approval modal & inline card | Transcript (`SafeToAutoRun=False`, `BypassSandbox=True`) + CDP DOM probe | Verified | `GET /api/v1/approvals/pending`, `POST /api/v1/approvals/respond`, `ApprovalModal.jsx`, `ApprovalCard.jsx` |
| **Command Approvals** | Disambiguated Allow / Always Allow / Deny | Scored CDP button matcher + split-dropdown expander | Verified | `dispatch_forward_approval` (`cdp_actions.py`) |
| **Command Approvals** | Deny or Allow with custom instructions | CDP approval click + automatic prompt dispatch | Verified | `ApprovalModal.jsx` & `ApprovalCard.jsx` (`custom_response`) |
| **Agent Questions** | Single-choice, multi-choice & free-text popups | Transcript (`ask_question`, `notify_user`) + CDP QuickInput probe | Verified | `GET /api/v1/interactions/pending`, `InteractionModal.jsx` |
| **Agent Questions** | "Type something else" custom response | Inline toggle + CDP `dispatch_answer_question` | Verified | `POST /api/v1/interactions/respond` |
| **Popup Persistence** | Idle-safe pending state (>7s inactivity fix) | Exempts pending questions & approvals from `is_stale_inactivity` | Verified | `services/conversation_service.py` |
| **History Pagination** | Request-based upward scroll lazy-loading | Cursor pagination (`before=<oldest_index>&limit=15`) + scroll anchoring | Verified | `GET /api/v1/chat/messages`, `ChatStream.jsx`, `useAgentWatch.js` |
| **Performance** | Low-bandwidth & low-memory streaming | GZip compression, LRU diff cache, turn cache, screen-only hash-deduplicated snapshots, `React.memo` | Verified | `main.py`, `diff_helper.py`, `adapter.py`, `ChatTurn.jsx` |
