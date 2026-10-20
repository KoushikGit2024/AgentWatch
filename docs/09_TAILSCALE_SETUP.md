# 09 — Tailscale Secure Remote Setup

**Document ID:** CW-DOC-009  
**Version:** 2.0.0  
**Project:** AgentWatch  
**Classification:** Network Infrastructure Guide  

---

## 1. Why Tailscale Serve (and NOT Tailscale Funnel)?

When accessing your desktop development environment from a mobile device, developers frequently make the mistake of using public reverse proxies (e.g. standard ngrok tunnels, public Cloudflare Tunnels, or Tailscale Funnel). 

**Public tunnels introduce severe vulnerabilities:**
- Anyone who discovers or brute-forces the public URL can attempt to access your local agent session.
- Intermediary cloud proxies terminate TLS and inspect traffic.
- Unsandboxed AI agents might be exposed to internet-originating prompt injection attacks.

### The Tailscale Serve Solution
**Tailscale Serve** shares your local application (`127.0.0.1:8000`) **strictly within your personal Tailscale mesh network (Tailnet)**:
- **Private Access Only:** Only devices signed into your authenticated Tailscale account (e.g. your personal Android phone) can route traffic to the workstation.
- **Trusted TLS Certificates:** Tailscale automatically provisions valid, trusted HTTPS certificates for your machine's tailnet domain (e.g. `https://my-laptop.tailnet-xyz.ts.net/`), preventing mobile browser TLS warnings.
- **Zero Port Forwarding:** Requires no router configuration, UPnP, or dynamic DNS.

---

## 2. Setting Up Tailscale Serve

### Step 1: Install Tailscale on Workstation & Phone
1. Install Tailscale on your host PC: [tailscale.com/download](https://tailscale.com/download)
2. Install the Tailscale app on your Android or iOS device from Google Play or App Store.
3. Sign into both devices using the same identity provider (Google, GitHub, Microsoft).

### Step 2: Enable Tailscale Serve on Port 8000
On your workstation, run:
```powershell
tailscale serve --bg 8000
```
This instructs Tailscale to proxy private HTTPS traffic from your tailnet name directly to local port 8000 in the background.

### Step 3: Verify Status & Funnel Invariant
Check the serve configuration:
```powershell
tailscale serve status
```
Verify that:
1. `Serve` is active pointing to `http://127.0.0.1:8000`.
2. `Funnel` is **OFF** (Funnel must never appear in active status).

To verify programmatically within AgentWatch:
```powershell
python -c "from services.remote_access import remote_access_service; print(remote_access_service.get_tailscale_status())"
```
Expected output:
```json
{
  "tailscale_installed": true,
  "serve_active": true,
  "funnel_disabled_verified": true,
  "mode": "tailscale_serve_private"
}
```

---

## 3. Disabling or Resetting Tailscale Serve

To stop serving when work is complete:
```powershell
tailscale serve --reset
```
