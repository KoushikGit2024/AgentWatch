# 03 — Installation Guide

## Clean Machine Prerequisites
- Windows 11 64-bit
- Python 3.12+
- MongoDB Community Server 8.0+ running locally as a Windows service
- Tailscale client installed and logged in

## Setup Instructions

1. Open PowerShell in the project directory:
   ```powershell
   cd "D:\All Codes\AllProjects\AgentWatchV2"
   ```
2. Run the automated setup script:
   ```powershell
   .\scripts\setup.ps1
   ```
3. Run the doctor diagnostic script to confirm prerequisites:
   ```powershell
   .\scripts\doctor.ps1
   ```
