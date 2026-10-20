# 15 — Known Limitations & Capability Boundaries

**Document ID:** CW-DOC-015  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Operational Limitations & Security Boundaries  

---

## 1. Truthful Capability Boundaries

AgentWatch prioritizes **truthful reporting over fabricated functionality**. This document details intentional design boundaries and known environmental limitations.

---

## 2. Intentional Security Boundaries

### Boundary 1: Native Desktop IDE Permission Dialogs
- **Limitation:** AgentWatch **cannot** and **will not** approve native Antigravity permission popups remotely.
- **Rationale:** Native permission dialogs (e.g. running arbitrary unsandboxed shell scripts or modifying root filesystem configurations) represent the fundamental security perimeter of the user's workstation. Allowing unauthenticated or remote one-tap approvals would enable privilege escalation.
- **Behavior:** The capability registry marks `remote_permission_bypass` as `requires_native_ide`, and the remote click handler actively blocks clicks targeting permission verbs.

### Boundary 2: Tailscale Funnel Disabled by Policy
- **Limitation:** AgentWatch cannot be accessed over the open, unauthenticated public internet.
- **Rationale:** Exposing an AI coding agent with file-editing and code-execution abilities to the public internet invites unauthorized access, credential theft, and prompt-injection exploits.
- **Behavior:** Remote access requires the client device to be an authorized node in your private Tailscale Tailnet.

---

## 3. Environmental & Runtime Limitations

### Boundary 3: Antigravity Remote Debugging Port Requirement
- **Limitation:** Live visual DOM viewport mirroring and remote scroll synchronization require Antigravity to be started with `--remote-debugging-port=9000` (or `9222`).
- **Behavior when port is closed:**
  - The viewport renders an informative diagnostic message explaining how to add the flag.
  - All other features—including dynamic interaction questions, prompt submissions, session tracking, and historical event streams—remain operational.

### Boundary 4: Concurrency & Virtualized DOM
- **Limitation:** Antigravity virtualizes large message histories in the DOM (only visible messages are rendered).
- **Behavior:** To see older messages in the mobile viewport, the user must scroll in the viewport, which triggers debounced scroll synchronization (`/remote-scroll`) to command the desktop IDE to render earlier message nodes into the DOM.
