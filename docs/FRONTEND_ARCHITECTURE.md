# Frontend Architecture: AgentWatch

## 1. Technology Selection & Rationale

AgentWatch uses a high-performance, low-memory **React 19 + Vite + Tailwind CSS 4** Single-Page Application (SPA) served directly by FastAPI:

1. **Framework SPA (React 19 + Vite):**
   - *Strengths:* Strict component modularity, memoized rendering (`React.memo` on `ChatTurn` and `StreamItem`), CSS `content-visibility: auto` for off-screen turns, and scroll-anchored upward lazy-loading.
   - *Styling Engine:* **Tailwind CSS 4** integrated via `@tailwindcss/vite` provides mobile-first glassmorphism surfaces, safe-area padding (`pb-safe`), and responsive layout tokens.
   - *Build Pipeline:* `npm run build` outputs minified production assets directly into `static/dist/` (`index.html` and hashed `assets/`).

---

## 2. Component Hierarchy & Directory Layout

```
AgentWatch/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatStream.jsx               # Scroll-anchored container + upward lazy-load trigger
│   │   │   │   ├── ChatTurn.jsx                 # Memoized user/agent turn card
│   │   │   │   ├── StreamItem.jsx               # Memoized thought/tool/diff/question step row
│   │   │   │   ├── ApprovalCard.jsx             # Inline Allow / Always Allow / Deny + Custom input
│   │   │   │   ├── DiffViewer.jsx               # Unified red/green code diff viewer
│   │   │   │   ├── PendingInteractionBanner.jsx # Sticky banner for minimized popups
│   │   │   │   └── AttachmentPreview.jsx        # Uploaded image/file chips
│   │   │   ├── modals/
│   │   │   │   ├── ApprovalModal.jsx            # Full-screen command/tool approval + custom instructions
│   │   │   │   ├── InteractionModal.jsx         # Full-screen multi-option question + "Type something else"
│   │   │   │   ├── ModelModal.jsx               # Live IDE model switcher
│   │   │   │   ├── ModeModal.jsx                # Fast / Planning mode switcher
│   │   │   │   └── LightboxModal.jsx            # Zoomable full-screen image/viewport viewer
│   │   │   ├── Navbar.jsx                       # Connection status, Chat/Screen toggle, drawers
│   │   │   ├── PromptComposer.jsx               # Multiline composer with file/clipboard upload
│   │   │   ├── ActivityTimelineDrawer.jsx       # Audited event timeline drawer
│   │   │   ├── SystemLogsDrawer.jsx             # Live backend ring-buffer log viewer
│   │   │   ├── HistoryDrawer.jsx                # Past conversation selector
│   │   │   ├── ReviewChangesModal.jsx           # Git working-tree diff inspector
│   │   │   └── RecoveryCenterModal.jsx          # Idempotency & crash recovery center
│   │   ├── hooks/
│   │   │   └── useAgentWatch.js                 # Central WebSocket + upward pagination + adaptive polling
│   │   ├── services/
│   │   │   ├── api.js                           # Typed REST client with cursor & hash support
│   │   │   ├── websocket.js                     # Auto-reconnecting WebSocket client
│   │   │   └── toastService.js                  # Non-blocking toast notification bus
│   │   ├── App.jsx                              # Root view orchestrator
│   │   ├── main.jsx                             # React 19 root mount
│   │   └── index.css                            # Tailwind CSS + content-visibility rules
│   ├── package.json
│   └── vite.config.js
└── static/dist/                                 # Production bundle mounted by FastAPI
```

---

## 3. Request-Based Upward Scroll Lazy-Loading & Memory Architecture

1. **Initial Window (`limit=15`):** On startup, `useAgentWatch.js` fetches only the latest 15 conversation turns (`GET /api/v1/chat/messages?limit=15`), recording `oldest_index` and `has_more`.
2. **Upward Scroll Trigger:** When the user scrolls within `75px` of the top of `ChatStream.jsx` (or taps *"Scroll up or tap to load earlier messages"*), `loadOlderMessages()` requests `GET /api/v1/chat/messages?limit=15&before=<oldest_index>`.
3. **Scroll Anchoring & Persistent Blocks:**
   - The newly fetched older block is prepended to `chatMessages` and **remains in state** so the user can freely scroll back and forth.
   - `ChatStream.jsx` uses a `useLayoutEffect` scroll-height delta calculation (`el.scrollTop = prevScrollTop + (el.scrollHeight - prevScrollHeight)`) so prepending older messages never causes the viewport to jump.
   - Scrolling to the top of the newly loaded block triggers the next older batch (`before=<new_oldest_index>`) repeatedly until `oldest_index === 0` (`has_more: false`).
4. **Live WebSocket Merge (`mergeTurnsPreservingHistory`):** When real-time `chat_update` frames arrive over WebSocket, `useAgentWatch.js` updates the active recent window at the bottom while preserving all older blocks the user has lazy-loaded at the top.
5. **Screen-Only Snapshot Polling with Hash Deduplication:** `/snapshot` is only polled when the user switches to the **Screen** view (`viewMode === 'screen'` or `lightboxOpen`), passing `?last_hash=<md5>` so unchanged frames return a 50-byte `"unchanged"` status instead of a 250 KB Base64 image.
