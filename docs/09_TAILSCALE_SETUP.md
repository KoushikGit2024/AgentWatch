# 09 — Tailscale Setup Guide

## 1. Tailscale Serve vs. Tailscale Funnel

- **Tailscale Serve**: Privately routes traffic from devices on your authenticated Tailscale tailnet directly to your local backend over encrypted WireGuard HTTPS. No internet traffic can reach it.
- **Tailscale Funnel**: Exposes your machine publicly to the wide-open internet. **Funnel must never be enabled for CloudWatchV2.**

## 2. Setting Up Serve

1. Verify Tailscale is connected:
   ```powershell
   tailscale status
   ```
2. Configure Tailscale Serve for CloudWatchV2:
   ```powershell
   tailscale serve --bg 8000
   ```
3. Inspect Serve and verify Funnel is off:
   ```powershell
   .\scripts\remote-status.ps1
   ```
4. Teardown / disable Serve:
   ```powershell
   tailscale serve reset
   ```
