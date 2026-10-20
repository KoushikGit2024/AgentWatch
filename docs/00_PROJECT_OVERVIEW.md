# 00 — Project Overview

**Document ID:** CW-DOC-000  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Database:** MongoDB Community Server 8.x (Localhost:27017)  
**Backend:** Python 3.12 / FastAPI / Uvicorn (ASGI)  
**Frontend:** Modular Component-Based ES6 Architecture (Native Browser Modules)  
**Networking:** Tailscale Serve (Private Encrypted Tailnet HTTPS, Funnel Strictly Disabled)  

---

## 1. Executive Summary & Purpose

**AgentWatch** is a production-grade, local-first observation, remote interaction, and telemetry platform engineered specifically for **Google Antigravity**—the agentic AI coding environment developed by DeepMind and Google.

When developers work with advanced autonomous coding agents like Antigravity, tasks frequently run for extended durations—analyzing massive codebases, planning multi-file refactors, executing test suites, and proposing iterative changes. Prior to AgentWatch, observing progress or answering agent questions required remaining tied to the physical workstation.

AgentWatch transforms this workflow into a seamless, mobile-first experience. From an Android phone or any authenticated mobile device on your private mesh network, you can:
- Observe live agent thinking processes, execution timelines, and code edits in real time.
- Answer agent questions, single-choice and multiple-choice decision points, and supply custom guidance.
- Submit follow-up prompts, start new conversations, switch agent modes (Fast vs. Planning), and choose AI models.
- Safely monitor native desktop permission dialogs with strict security boundaries that prevent unauthorized remote execution.

AgentWatch replaces fragile, ad-hoc reverse-engineered scripts with an enterprise-grade service-oriented architecture, comprehensive MongoDB event persistence, recursive secret redaction, and an unpolluted, verified code standard.

---

## 2. Core Pillars & Design Philosophy

### Pillar 1: Local-First & Zero Paid Cloud Dependencies
- **100% On-Premise Execution:** AgentWatch runs entirely on your local machine. It does not send code, telemetry, or credentials to third-party monitoring servers, SaaS dashboards, or external cloud databases.
- **Zero Ongoing Cost:** Operates on free local infrastructure: Python 3.12, local MongoDB Community Server, and Tailscale's free tier for personal mesh networking.
- **Strict Local Binding:** The backend binds strictly to `127.0.0.1:8000`. MongoDB binds strictly to `127.0.0.1:27017`. Neither is directly reachable from the public internet.

### Pillar 2: Modular Service-Oriented Architecture (SOA)
- **Separation of Concerns:** Clear architectural layers divide API transport (FastAPI routers), business logic (domain services), database interactions (MongoDB repositories), integration adapters (CDP and Antigravity hooks), and frontend UI modules.
- **Schema-Driven Contracts:** All request, response, and database entities are modeled with strict Pydantic schemas enforcing type safety, character constraints, and validation boundaries.

### Pillar 3: Private, Secure Encrypted Remote Access
- **Private Mesh Networking Only:** Remote mobile access is achieved strictly via **Tailscale Serve**, which provisions end-to-end encrypted TLS certificates over your personal Tailnet.
- **Tailscale Funnel Strictly Disabled:** Public internet ingress is prohibited. If Tailscale Funnel is ever accidentally enabled, the application detects this in automated privacy checks and warns the administrator.
- **Hardened Mobile API:** Session authentication with cryptographically signed cookies (`SameSite=Strict`, `HttpOnly`), rate limiting, request size limits, and CSRF protection protect every state-changing route.

### Pillar 4: Truthful Native Security Boundaries
- **No Fabricated Confirmations:** Sending a prompt or issuing a stop signal returns explicit lifecycle states (`acknowledged`, `dispatched`, `unconfirmed`), never falsely reporting that the IDE has completed execution until confirmed by incoming telemetry.
- **Native IDE Permission Preservation:** AgentWatch **never** attempts to automatically click or bypass native OS/IDE permission dialogs (e.g., executing unsandboxed shell commands or mutating system files). These dialogs are categorized with status `requires_native_ide`, directing the user to confirm them on the physical workstation.

### Pillar 5: Zero Secret Leaks & Privacy by Design
- **Recursive Key and Value Redaction:** Every event payload, log line, diagnostic bundle, and custom text submission is processed through recursive sanitization. API keys, JWT tokens, Bearer tokens, passwords, and private SSH credentials are replaced with `[REDACTED]` before hitting the database or logs.
- **Automated Privacy CI Scanner:** The repository includes `scripts/check_privacy.py`, which validates 68+ files across the repository to ensure zero token or secret leaks.

---

## 3. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                               Android Mobile Device                             |
|  - Authenticated Browser on Private Tailnet (e.g. 100.x.y.z)                    |
|  - Modular ES6 UI: Interaction Cards, Viewport Mirror, Timeline, Prompt Box     |
+---------------------------------------+-----------------------------------------+
                                        |
                  Encrypted Tailscale TLS Tunnel (Port 8000)
                  [Tailscale Funnel STRICTLY DISABLED]
                                        |
+---------------------------------------v-----------------------------------------+
|                        Local Host / Developer Workstation                       |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                       FastAPI Application (127.0.0.1:8000)                |  |
|  |                                                                           |  |
|  |   [API Layer]                                                             |  |
|  |   ├── /api/v1/auth         (Session login, verification, logout)          |  |
|  |   ├── /api/v1/events       (Deterministic deduplication, ingestion)       |  |
|  |   ├── /api/v1/interactions (Dynamic questions, choice cards, capabilities)|  |
|  |   ├── /api/v1/controls     (Prompt composer, stop, new chat, modes)       |  |
|  |   └── /health & /ready     (Liveness and diagnostic readiness probes)     |  |
|  |                                                                           |  |
|  |   [Domain & Service Layer]                                                |  |
|  |   ├── InteractionService   (Validates choices, handles "Other", limits)   |  |
|  |   ├── RemoteAccessService  (Validates Tailscale Serve & Funnel disabled)  |  |
|  |   └── SecretRedaction      (Recursive scrubbing of keys & regex patterns) |  |
|  |                                                                           |  |
|  |   [Data Layer]                                                            |  |
|  |   ├── SessionRepository    (Tracks conversation sessions & metadata)      |  |
|  |   ├── EventRepository      (Persists audit stream with deduplication)     |  |
|  |   └── InteractionRepository(Atomic state transitions: pending->submitted) |  |
|  +-----------------------+-----------------------------+---------------------+  |
|                          |                             |                        |
|       MongoDB Driver     |                             | Chrome DevTools (CDP)  |
|       (Localhost:27017)  |                             | (Localhost:9000/9222)  |
|                          v                             v                        |
|  +-------------------------------+   +---------------------------------------+  |
|  |  MongoDB Community 8.x        |   |   Google Antigravity IDE Session      |  |
|  |  - DB: AgentWatch_v2          |   |   - Active Coding Agent               |  |
|  |  - Collections: events,       |   |   - Workbench DOM & Chat Window       |  |
|  |    sessions, interactions     |   |   - Terminal Execution Engine         |  |
|  +-------------------------------+   +---------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 4. Key Target Personas & Use Cases

1. **Long-Running Agentic Refactoring:**  
   You start a complex agent goal (e.g. migrating an ORM or implementing 20 unit tests) on your laptop and step away. From your phone, you monitor tool executions, file edits, and console output in real time.
2. **Interactive Clarification & Form Submissions:**  
   When the agent reaches an ambiguous requirement, it raises a question with multiple approaches. Your phone renders an interactive card showing the options with recommended badges and an optional custom response field. You select an option or type specific instructions; the agent immediately resumes without waiting for your return to the desk.
3. **Emergency Stopping & Redirection:**  
   If you observe the agent heading down an unintended rabbit hole or mutating files outside the project scope, you can immediately dispatch a Stop command or start a fresh conversation session from your mobile dashboard.
4. **Offline and Low-Connectivity Resilience:**  
   Whether riding an elevator or transitioning between Wi-Fi and mobile data, the modular client caches input, buffers status checks, and prevents accidental double-submissions via cryptographic idempotency keys.

---

## 5. System Components Summary

| Component | Responsibility | Technology Stack |
| :--- | :--- | :--- |
| **API Server** | HTTP routing, authentication, request validation, CORS, CSRF | Python 3.12, FastAPI, Uvicorn |
| **Database** | Persistent event storage, session metadata, interaction state | MongoDB Community 8.x (`pymongo`) |
| **Frontend Shell** | Mobile-first viewport, dynamic interaction rendering, touch controls | Vanilla ES6 Modules, Modern CSS |
| **Integration Adapter** | CDP discovery, viewport snapshotting, scroll and click synchronization | Chrome DevTools Protocol (`httpx`, `websockets`) |
| **Networking Layer** | Encrypted tunnel, TLS management, authentication verification | Tailscale Serve (Funnel Disabled) |
| **Quality & Security** | Automated integration tests, secret scanning, privacy audits | Pytest, Custom Regex Privacy Auditor |

---

## 6. Document Navigation

To explore specific subsystems in depth, refer to the following companion guides:

- [01 — System Architecture](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/01_ARCHITECTURE.md)
- [02 — Comprehensive Feature Catalog](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/02_FEATURE_CATALOG.md)
- [03 — Installation & Environment Setup](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/03_INSTALLATION.md)
- [04 — Configuration & Environment Variables](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/04_CONFIGURATION.md)
- [05 — Antigravity Integration & CDP Adapter](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/05_ANTIGRAVITY_INTEGRATION.md)
- [06 — API Reference & Data Contracts](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/06_API_REFERENCE.md)
- [07 — Database & Data Flow Architecture](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/07_DATABASE_AND_DATA_FLOW.md)
- [08 — Security, Privacy, and Redaction](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/08_SECURITY_AND_PRIVACY.md)
- [09 — Tailscale Secure Remote Setup](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/09_TAILSCALE_SETUP.md)
- [10 — Android Mobile Usability Guide](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/10_ANDROID_ACCESS.md)
- [11 — Testing, Verification, and CI Suite](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/11_TESTING_AND_VALIDATION.md)
- [12 — Troubleshooting & Diagnostics Runbook](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/12_TROUBLESHOOTING.md)
- [13 — Developer Onboarding & Contributing Guide](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/13_DEVELOPMENT_GUIDE.md)
- [14 — Migration Notes from Legacy Architecture](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/14_MIGRATION_NOTES.md)
- [15 — Known Limitations & Capability Boundaries](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/15_KNOWN_LIMITATIONS.md)
- [Antigravity Capabilities Matrix](file:///d:/All%20Codes/AllProjects/AgentWatchV2/docs/ANTIGRAVITY_CAPABILITIES.md)
