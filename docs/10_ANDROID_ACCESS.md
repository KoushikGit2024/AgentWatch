# 10 — Android Access Guide

## Step-by-Step Connection from Android Phone

1. Install the official **Tailscale** app from the Google Play Store on your Android phone.
2. Sign in using the same account and join your private tailnet.
3. Verify that your laptop appears in the Tailscale device list.
4. On your laptop, run:
   ```powershell
   .\scripts\remote-status.ps1
   ```
5. Open your mobile browser (Chrome/Firefox) on your phone and navigate to your laptop's private tailnet HTTPS address (e.g., `https://<laptop-tailnet-name>.ts.net`).
6. Enter your `APP_PASSWORD` configured in `.env` to log in and observe your Antigravity agent!
