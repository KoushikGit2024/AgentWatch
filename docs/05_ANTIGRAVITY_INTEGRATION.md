# 05 — Antigravity Integration Specification

## Supported Integration Mechanisms

1. **Subprocess Environment Ingestion**:
   During active agent turns, the Antigravity desktop IDE injects execution context into subprocess environments:
   - `ANTIGRAVITY_SOURCE_METADATA`: JSON payload containing conversation UUID, monotonic step index, tool name, and arguments.
   - `ANTIGRAVITY_CONVERSATION_ID`: Active conversation UUID.
   - `ANTIGRAVITY_TRAJECTORY_ID`: Execution trajectory UUID.
   
   Running `python -m cloudwatch_v2.integrations.antigravity.hook_dispatcher --from-env` captures and stores these genuine events with `source_confidence="observed"`.

2. **Chrome DevTools Protocol (CDP)**:
   When Antigravity is started with `--remote-debugging-port=9000`, the adapter connects to `http://127.0.0.1:9000/json/list` to inspect target state and mirror the active viewport.

3. **Platform Limitations & Non-Supported Capabilities**:
   - Dynamic workspace hooks (`.agents/hooks.json`) are scanned at IDE startup and not re-evaluated mid-conversation without an IDE reload.
   - Remote approval bypass is disabled to preserve native permission dialogs.
