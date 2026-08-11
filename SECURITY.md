# Security Policy

## What Headroom does

Headroom is a **local-only** macOS helper that reads your existing GPT/Grok auth files and shows remaining usage in SwiftBar + a localhost panel.

## Trust boundaries

- Binds **only** to `127.0.0.1`
- Rejects non-local sockets
- Does **not** accept or store API keys in the repo
- Does **not** send tokens to third-party proxies
- Tokens stay in provider-native files:
  - `~/.codex/auth.json`
  - `~/.grok/auth.json`
- Runtime config lives in user config dir (not the git tree):
  - macOS: `~/Library/Application Support/Headroom/`
- API responses strip provider `raw` payloads and never return token values

## Reporting a vulnerability

Please open a private GitHub security advisory. Do not open a public issue with exploit details.

## Hardening notes

- Body size limited
- Host/port sanitized (localhost only)
- Static panel path traversal blocked
- Basic security headers on panel/API responses
