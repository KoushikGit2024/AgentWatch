# Project Guidelines & Architecture Standards

## File Size Limits (Enforced)

- **Hard Limit**: No single code file (frontend or backend) may exceed **500 lines of code**.
- **Refactoring Threshold**: Once any file reaches **400 lines**, it must immediately be decomposed into smaller, specialized modules.
- **Single Responsibility Principle**:
  - Components should only handle presentation and local UI interactions.
  - Network requests, state synchronization, and business logic belong in dedicated `services/` and custom `hooks/`.
  - Reusable icons, themes, and configuration must reside in `constants/` or design system files.

## Frontend Architecture Standards

All frontend code inside `frontend/src/` must adhere to a strict service-based folder structure:

- `src/services/`: All HTTP API clients, WebSocket managers, authentication utilities, and network logic.
- `src/hooks/`: Custom React hooks encapsulating data polling, real-time subscriptions, and domain state.
- `src/components/`: Modular UI components organized by domain (e.g., `components/chat/`, `components/modals/`, `components/drawers/`).
- `src/constants/`: Pure constants, SVG icons, configuration maps, and enumerations.
- No bulky monolith files: Every component file should be focused, testable, and under 250-400 lines.
- **Icon Policy**: Lucide SVG icons only. Never use emojis in application UI.

## Backend Architecture Standards

- Python files in `services/`, `api/routes/`, `repositories/`, and `integrations/` must remain modular and under 500 lines.
- Long methods, oversized route handlers, or bloated parser functions must be extracted into helper utilities or specialized sub-services.
