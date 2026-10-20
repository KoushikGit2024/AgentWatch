# 08 — Security, Privacy, and Redaction

**Document ID:** CW-DOC-008  
**Version:** 2.0.0  
**Project:** CloudWatchV2 (AgentWatch)  
**Classification:** Security Architecture & Privacy Specification  

---

## 1. Threat Model & Security Invariants

CloudWatchV2 operates in a sensitive environment—observing source code edits, terminal outputs, and architectural decisions made by autonomous AI coding agents.

The security architecture is built around four strict invariants:

1. **Zero External Exposure:** The backend binds exclusively to `127.0.0.1:8000`. MongoDB binds strictly to `127.0.0.1:27017`. Public inbound ports are never opened.
2. **Private Encrypted Mesh Only:** Remote access is strictly limited to authenticated devices on your private Tailscale Tailnet. **Tailscale Funnel is strictly disabled.**
3. **No Native Permission Bypasses:** CloudWatchV2 will **never** simulate clicks or submit automated responses to bypass native OS/IDE security dialogs.
4. **Recursive Zero-Leak Redaction:** Secrets, credentials, tokens, and private keys are redacted before persistence, logging, or transmission to mobile clients.

---

## 2. Recursive Secret Redaction Engine

The sanitization engine (`security/redaction.py`) inspects all telemetry payloads, custom user inputs, and diagnostic logs.

### 2.1 Sensitive Key Matching
Any dictionary key containing any of the following terms (case-insensitive) has its value replaced with `"[REDACTED]"`:
- `password`, `secret`, `api_key`, `apikey`, `access_token`, `auth_token`
- `private_key`, `client_secret`, `session_secret`, `bearer`, `credential`

### 2.2 Pattern-Based Regex Scrubbing
For free-form strings, text areas, and terminal outputs, the engine applies regular expression scanners:
- **JWT Tokens:** `r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"`
- **Private SSH / RSA Keys:** `r"-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----"`
- **Generic High-Entropy Keys:** Hexadecimal or base64 token patterns associated with AWS, GitHub, Google, or OpenAI API keys.

---

## 3. Automated Privacy CI Audit Script

To ensure that credentials, developer IP addresses, and private tokens are never accidentally committed to source control, the project includes an automated scanner:

```powershell
python scripts/check_privacy.py
```

### Scan Behavior
- Scans all 68+ files across `api/`, `config/`, `docs/`, `integrations/`, `models/`, `repositories/`, `services/`, `static/`, and `tests/`.
- Validates that no private Tailscale IP addresses (e.g. `100.x.y.z`), actual developer passwords, or live bearer tokens exist in source code or documentation.
- Must achieve a **100% PASS** rate prior to committing or pushing code.
