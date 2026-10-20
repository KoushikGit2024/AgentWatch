# 14 — Migration Notes

## Key Architectural Upgrades from AgentWatchV2 (Legacy) to CloudWatchV2

1. **Backend & Language**: Replaced legacy Node.js/Express monolith (`server.js`, 2245 lines) with modular Python 3.12 / FastAPI service architecture.
2. **Persistence**: Replaced absence of persistence with local **MongoDB Community Server 8.0+** using official PyMongo driver, unique compound index deduplication, and atomic session tracking.
3. **Remote Access**: Replaced public third-party tunnels (ngrok, pinggy, cloudflare) with private **Tailscale Serve** mesh networking. Tailscale Funnel is strictly blocked.
4. **Security & Redaction**: Added comprehensive recursive secret and token redaction across all payloads before persistence. Added an automated privacy scanner.
5. **Separation of Concerns**: Isolated API routes, database repositories, Antigravity integration, and authentication into distinct, testable modules.
