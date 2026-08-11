# Headroom architecture

## Goals

- Menubar remaining percent only (`GPT 85% · x 98%`)
- Localhost panel for visibility toggles + language
- GPT + x only (plug and play)
- Local-first, no cloud dependency, no proxy auth

## Runtime data

User config directory (not the git tree):

- macOS: `~/Library/Application Support/Headroom/config.json`

Auth files stay provider-native:

- `~/.codex/auth.json`
- `~/.grok/auth.json`

## Provider contract

```ts
type QuotaSnapshot = {
  provider: string;
  accountId: string;
  label: string;
  usedPercent: number | null;
  remainingPercent: number | null;
  resetAt?: string | null;
  plan?: string | null;
  email?: string | null;
  source: string;
  fetchedAt: string;
  error?: string | null;
};
```

Server strips internal `raw` fields before responding.

## Local API

- `GET /api/health`
- `GET /api/providers`
- `GET|PUT /api/settings`
- `GET|POST /api/accounts`
- `PUT|DELETE /api/accounts/:id`
- `GET /api/quota`
- `GET /api/quota/:id`
- `POST /api/swiftbar/sync`
- `POST /api/swiftbar/reset`
- `POST /api/swiftbar/close`

All endpoints require local sockets.

## Menubar

SwiftBar plugin is generated to:

`~/Library/Application Support/SwiftBar/Plugins/headroom-combined.<n>s.sh`
