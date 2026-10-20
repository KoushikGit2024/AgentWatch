# 08 — Security and Privacy Policy

## 1. Zero Public Exposure
- Backend binds strictly to `127.0.0.1:8000`.
- MongoDB binds strictly to `127.0.0.1:27017`.
- Tailscale Funnel is strictly disabled. Public tunnels (ngrok, pinggy, cloudflare) are removed.

## 2. Recursive Secret Redaction
All incoming payloads undergo recursive redaction before persistence. Keys containing `password`, `token`, `secret`, `api_key`, `auth`, `credential`, or values matching Bearer tokens / GitHub PATs are replaced with `[REDACTED]`.

## 3. Privacy Scanner
The automated privacy scanner (`scripts/check_privacy.py`) audits the codebase to ensure zero credentials, private keys, or personal access tokens are committed.
