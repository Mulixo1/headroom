# Architecture

## Runtime pieces

1. **Local service** (`bin/headroom.mjs start`)
   - localhost API + dashboard on `127.0.0.1:8787`
2. **Providers**
   - GPT: ChatGPT/Codex WHAM usage endpoint via `~/.codex/auth.json`
   - x: Grok credits endpoint via `~/.grok/auth.json`
3. **SwiftBar plugin generator**
   - writes `~/Library/Application Support/SwiftBar/Plugins/headroom-combined.<n>s.sh`
4. **LaunchAgent autostart**
   - `~/Library/LaunchAgents/com.headroom.app.plist`

## Data locations

| Data | Location |
|---|---|
| Headroom config | `~/Library/Application Support/Headroom/config.json` |
| Logs | `~/Library/Application Support/Headroom/logs/` |
| SwiftBar plugin | `~/Library/Application Support/SwiftBar/Plugins/` |
| GPT auth | `~/.codex/auth.json` |
| Grok auth | `~/.grok/auth.json` |

## Security boundaries

- Bind address forced to localhost
- Non-local sockets rejected
- API responses exclude raw provider payloads
- No secrets in repository files

## Legal boundaries

- Code license: MIT (`LICENSE`)
- Copyright holder: Mulixo (`NOTICE`)
- Third-party service names are interoperability references only
- Local credential files remain user-managed outside this repository
