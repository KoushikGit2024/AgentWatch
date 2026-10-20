# Frontend Architecture: CloudWatchV2

## 1. Technology Selection & Trade-Offs

For CloudWatchV2, we evaluated multiple architecture approaches for remote mobile interaction:

1. **Framework SPA (React/Vite/Next.js):**
   - *Pros:* Rich ecosystem, component JSX structure.
   - *Cons:* Heavy build pipeline (`node_modules` ~250MB+), client runtime memory overhead on mobile Android browsers, build artifacts required before running FastAPI.
2. **Monolithic Legacy Vanilla JS:**
   - *Pros:* Zero build steps.
   - *Cons:* Tight coupling, global namespace pollution, impossible to scale dynamic interaction cards and capabilities safely.
3. **Modular Component-Based ES6 Architecture (Selected):**
   - *Pros:* Native browser module support (`type="module"`), clean separation of concerns, zero compilation lag, sub-50KB asset payload, full mobile responsiveness, and zero build tool maintenance overhead.
   - *Cons:* Requires modern browser support (standard across Android Chrome, iOS Safari, desktop browsers).

## 2. Component Hierarchy

```
static/
├── index.html                  # Shell layout with dynamic interaction container & viewport
├── css/
│   └── style.css               # Responsive design tokens, interaction cards, badges, mobile grid
└── js/
    ├── app.js                  # Application entry point & coordination lifecycle
    ├── services/
    │   ├── api-client.js       # Centralized fetch wrapper with error handling & auth redirect
    │   └── interaction-service.js # Dynamic interaction & capability API client
    ├── stores/
    │   └── app-store.js        # Centralized pub/sub state store (sessions, capabilities, interactions)
    └── components/
        └── interaction-renderer.js # Dynamic rendering of single-choice, multi-choice, and custom text cards
```

## 3. Data Flow and State Synchronization

- **Capabilities Registry:** On startup, `app.js` polls `/api/v1/interactions/capabilities` to discover available features.
- **Truthful Status Display:** Unavailable or native-only operations (e.g. `remote_permission_bypass`) are explicitly marked as requiring native IDE resolution rather than presenting non-functional buttons.
- **Dynamic Interaction Polling:** `interaction-service.js` polls `/api/v1/interactions/pending` every 3 seconds while active.
- **Card Lifecycle:**
  1. An interaction is received (e.g., choice request).
  2. `InteractionRenderer` constructs responsive HTML pills with single/multi-selection behavior.
  3. If `allow_custom_response` is enabled, an "Other / Custom Text" textarea is rendered.
  4. On submit, duplicate clicks are prevented, and a payload is sent to `/api/v1/interactions/{id}/respond`.
  5. Upon confirmation, the card is cleared and the state transitions to resolved.
