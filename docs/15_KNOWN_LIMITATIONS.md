# 15 — Known Limitations & Platform Truthfulness

1. **Automatic Hook Invocation**: Antigravity IDE loads `.agents/hooks.json` during workspace startup. Writing or modifying hook configuration during an active conversation turn does not trigger subprocesses without an IDE workspace reload.
2. **Permission Dialog Remote Decision**: Antigravity IDE requires direct user approval via its native desktop GUI. CloudWatchV2 does not simulate mouse clicks or inject automated approvals.
3. **CDP Port Requirement**: Viewport snapshot mirroring requires Antigravity to be started with `--remote-debugging-port=9000`. If launched without this flag, CDP snapshot endpoints return clear status messages rather than fabricated activity.
4. **Tailnet Requirement**: Remote observation requires both the laptop and phone to be authenticated members of the same private Tailscale tailnet.
