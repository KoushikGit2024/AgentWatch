# 00 — Project Overview

**Document ID:** CW-DOC-000  
**Version:** 2.0.0  
**Project:** CloudWatchV2  
**Database:** MongoDB Community Server (Local)  
**Backend:** Python 3.12 / FastAPI  
**Networking:** Tailscale Serve (Private Tailnet HTTPS, Funnel Disabled)  

---

## 1. Executive Summary

CloudWatchV2 is an independent, service-oriented system providing local-first observation of Google Antigravity AI coding agents. Designed to replace ad-hoc legacy scripts with a robust architecture, it delivers reliable status tracking, event ingestion, and private mobile observation over Tailscale without compromising native IDE security.

## 2. Core Pillars

1. **Local-First & Zero Paid Hosting**: Runs 100% on the user's laptop using local MongoDB and localhost bindings.
2. **Modular Architecture**: Layered separation of concerns (API, Domain Services, Repositories, Adapters).
3. **Private Encrypted Remote Access**: Strictly leverages Tailscale private mesh networking. Public ingress via Tailscale Funnel or third-party tunnels is strictly prohibited.
4. **Native Safety**: Does not attempt to automatically approve IDE permission prompts or inject arbitrary remote shells.
