# 14 — Migration Notes from Legacy Architecture

**Document ID:** CW-DOC-014  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** Migration & Architecture Evolution  

---

## 1. Context & Motivation for V2 Rewrite

The original AgentWatch prototype demonstrated the value of observing Antigravity from a phone, but suffered from architectural liabilities:
- **Monolithic Scripting:** Server logic, ad-hoc Express/Flask-style scripts, and reverse-proxy code were coupled into single files without test coverage.
- **Insecure Public Tunnels:** Relied on public tunnel tools (ngrok / Funnel) exposing local ports to the internet.
- **Binary Yes/No Approvals:** Only supported crude accept/reject buttons; could not handle multi-option agent questions, recommended choices, or custom user guidance.
- **Bypassed Native Security:** Attempted to simulate clicks on native permission popups, introducing high security risks.

---

## 2. Key Architectural Upgrades in CloudWatchV2

| Dimension | Legacy V1 Implementation | CloudWatchV2 Architecture |
| :--- | :--- | :--- |
| **Backend Framework** | Node/Flask ad-hoc scripts | Modern Python 3.12 / FastAPI (Asynchronous ASGI) |
| **Data Persistence** | In-memory arrays / JSON files | Local MongoDB Community 8.x with compound indexes |
| **Interaction Model** | Fixed binary buttons (Yes/No) | Dynamic Schema-Driven Cards (Single, Multi, "Other") |
| **Idempotency** | None (double-taps caused duplicate runs)| Client-side token generation + server idempotency cache |
| **Remote Access** | Public ngrok / Funnel tunnels | Private Tailscale Serve (Funnel strictly prohibited) |
| **Frontend Stack** | Monolithic un-modular script | Modular Component-Based ES6 Architecture (`type="module"`) |
| **Native IDE Security** | Attempted automated dialog clicking | Truthful `requires_native_ide` status directing to workstation |
| **Automated Testing** | Zero automated tests | 16 automated tests + automated privacy scanner |
