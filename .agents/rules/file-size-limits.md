# File Size Limits & Modular Architecture

## Rule: 500-Line File Size Limit
1. **Strict File Limit**: No source file in this repository may exceed **500 lines of code**.
2. **Proactive Decomposition**: When a file approaches 400 lines, split it into modular subcomponents, custom hooks, or service layers.
3. **Frontend Organization**:
   - `services/`: API clients, WebSocket connection handlers, auth header helpers.
   - `hooks/`: Domain hooks managing state and polling.
   - `components/`: Granular UI components grouped by feature (e.g. `chat/`, `modals/`).
   - `constants/`: Icons and static configuration.
4. **Icons**: Lucide SVGs only. No emojis.
