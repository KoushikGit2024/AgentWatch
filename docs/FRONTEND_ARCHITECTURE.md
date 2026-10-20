# Frontend Architecture: AgentWatch

## 1. Technology Selection & Rationale

For AgentWatch, the frontend architecture was upgraded to a professional, responsive **React 19 + Vite + Tailwind CSS** application:

1. **Framework SPA (React 19 + Vite - Selected):**
   - *Strengths:* Robust component modularity, predictable reactive state hooks (`useState`, `useEffect`, `useRef`), declarative UI rendering, and sub-second Hot Module Replacement (HMR).
   - *Styling Engine:* **Tailwind CSS** integrated via `@tailwindcss/vite` provides utility-first, responsive design tokens with zero custom CSS drift.
   - *Build Pipeline:* Fast, lightweight compilation via `npm run build` directly outputs optimized, minified bundles into `static/dist/` (`index.html`, `assets/index-*.js`, `assets/index-*.css`).
   - *FastAPI Integration:* FastAPI serves the production build directly from `static/dist/index.html` at `/` and mounts static asset chunks at `/assets`.

2. **Previous Architectures Discarded:**
   - *Legacy Vanilla JavaScript (`static/js/app.js`)*: Lacked state predictability and broke under complex dynamic question layouts; completely removed.
   - *Ad-hoc Component Bundles*: Removed in favor of standardized JSX components and automated Vite packaging.

---

## 2. Component Hierarchy & Directory Layout

```
AgentWatchV2/
├── frontend/                     # Modern React + Vite application
│   ├── src/
│   │   ├── components/           # Single-responsibility modular components
│   │   │   ├── Header.jsx        # AgentWatch title, status badge, STOP, Refresh, New Chat
│   │   │   ├── SettingsBar.jsx   # Fast/Planning mode selector, model picker, DOM/KB counters
│   │   │   ├── Viewport.jsx      # Sanitized timeline viewport & empty state
│   │   │   ├── InteractionDrawer.jsx # Dynamic single/multi-choice cards & custom response
│   │   │   ├── PromptComposer.jsx    # Message composer with quick action chips
│   │   │   ├── HistoryDrawer.jsx     # Slide-out drawer for past sessions
│   │   │   └── SelectionModal.jsx    # Mode & model picker modal
│   │   ├── App.jsx               # Central state orchestrator with polling & idempotency
│   │   ├── main.jsx              # React 19 root mount with StrictMode
│   │   └── index.css             # Tailwind CSS imports & theme tokens
│   ├── index.html                # Vite template with Inter & JetBrains Mono typography
│   ├── package.json              # Vite, React, and Tailwind CSS dependencies
│   └── vite.config.js            # Build output configuration (../static/dist) & API proxy
├── static/
│   ├── dist/                     # Optimized, minified production assets
│   │   ├── assets/               # Bundled JavaScript and CSS chunks
│   │   └── index.html            # Production dashboard served by FastAPI at '/'
│   └── login.html                # Standalone authentication entrypoint
└── main.py                       # Serves production bundle and API routes
```

---

## 3. Data Flow and State Synchronization

- **Capabilities & State Discovery:** On mount, `App.jsx` polls `/app-state` and `/api/v1/interactions/capabilities` to discover available agent features and live CDP connection status.
- **Truthful Status Display:** Unavailable or native-only operations (e.g. `remote_permission_bypass`) are explicitly marked as requiring native IDE resolution rather than presenting non-functional buttons.
- **Dynamic Interaction Polling:** `App.jsx` polls `/api/v1/interactions/pending` every 3 seconds while active.
- **Card Lifecycle:**
  1. An interaction is received (e.g., choice question from agent).
  2. `InteractionDrawer.jsx` renders option pills with single/multi-selection radio/checkbox badges and recommended labels.
  3. If `allow_custom_response` is enabled, an "Other / Custom Text" input is presented.
  4. On submit, duplicate clicks are prevented, a persistent idempotency key is generated, and a payload is sent to `/api/v1/interactions/{id}/respond`.
  5. Upon confirmation, a green success banner is displayed, and the card dismisses cleanly.
- **Draft Preservation:** If network connectivity fails during prompt submission, the typed message is restored into the composer textarea.
