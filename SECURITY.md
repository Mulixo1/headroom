# Security Policy

## Scope

Headroom is a local macOS utility that can:

- run a localhost dashboard/API on `127.0.0.1`
- read local provider auth files (if present)
- display remaining usage estimates
- write a SwiftBar plugin and optional LaunchAgent

## Trust boundaries (as implemented)

- Service bind address is localhost (`127.0.0.1`)
- Non-local sockets are rejected by the local server
- Provider tokens are not stored in the git repository
- Runtime config defaults to user config directory:
  - macOS: `~/Library/Application Support/Headroom/`
- Local API responses are designed to avoid returning raw provider token material

## What this project does not claim

- No claim of formal security certification/audit
- No claim that provider endpoints or policies are controlled by Headroom
- No claim that third-party apps/services are endorsed by Headroom

## Reporting a vulnerability

Please open a private GitHub security advisory for this repository.  
Do not open a public issue with exploit details.

## Supported versions

Security fixes are considered for the latest published release on `main`.

## Operational advice

- Keep provider CLIs/apps updated
- Do not commit auth files or machine-local config
- Review LaunchAgent status if Node paths change (`node bin/headroom.mjs service status`)

## Ownership

Copyright (c) 2026 Mulixo. Licensed under MIT. See `LICENSE` and `docs/LEGAL.md`.
