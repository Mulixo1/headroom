# Headroom

Local macOS menubar + localhost dashboard for remaining AI usage.

Shows how much capacity you still have left for:

- **GPT** (ChatGPT / Codex)
- **x** (Grok)

Example menubar:

```text
GPT 52% · x 91%
```

Headroom is local-first:

- no cloud account for Headroom itself
- no OpenCodex proxy
- no tokens stored in the git repo
- uses your existing local auth files

---

## Why Headroom?

AI tools show limits in different places. Headroom puts remaining capacity in one place:

- macOS menu bar (always visible)
- local dashboard (control panel)
- login autostart (survives reboot/logout)

---

## Requirements

| Need | Why |
|---|---|
| macOS | Menubar + LaunchAgent |
| Node.js 20+ | Runs Headroom service |
| SwiftBar | Renders menubar plugin |
| GPT and/or Grok local login | Live percentages |

Auth files (created by those apps/CLIs, not by Headroom):

| Provider | File |
|---|---|
| GPT | `~/.codex/auth.json` |
| x / Grok | `~/.grok/auth.json` |

---

## One-click install

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs
```

Installer will:

1. Check Node / SwiftBar / Homebrew
2. Offer SwiftBar install if missing (Homebrew cask)
3. Create user config:
   `~/Library/Application Support/Headroom/`
4. Write SwiftBar plugin
5. Install login autostart (LaunchAgent)
6. Start local service: `http://127.0.0.1:8787`
7. Open dashboard

### Installer flags

```bash
node scripts/install.mjs --with-swiftbar       # auto-install SwiftBar via brew
node scripts/install.mjs --no-swiftbar-prompt  # never ask about SwiftBar
node scripts/install.mjs --no-autostart        # skip login autostart
node scripts/install.mjs --no-start            # setup only
node scripts/install.mjs --no-open             # do not open browser
```

---

## Daily use (no terminal)

After install:

1. Look at macOS menu bar for `GPT ..% · x ..%`
2. Click it for details:
   - Remaining / used
   - Reset time
   - Open panel
   - Refresh
   - Reset
   - Close
3. Open dashboard anytime:
   [http://127.0.0.1:8787](http://127.0.0.1:8787)

Dashboard controls:

- language: System / English / Turkish
- show in bar / show in detail
- SwiftBar dependency status
- login autostart
- full uninstall

---

## Uninstall

### From dashboard (recommended)
Danger zone → **Uninstall completely**

### From terminal

```bash
node scripts/uninstall.mjs
```

Removes:

- LaunchAgent autostart
- Headroom SwiftBar plugin
- Headroom local config/logs

Does **not** remove:

- GPT/Grok auth files
- SwiftBar app itself

---

## Dependency policy

| Component | Behavior |
|---|---|
| Headroom service | automatic |
| Login autostart | automatic |
| Headroom menubar plugin | automatic |
| SwiftBar app | detect + optional Homebrew install |
| Homebrew | not auto-installed |

- Panel works without SwiftBar
- Menubar chips require SwiftBar

---

## Security model

- Binds only to `127.0.0.1`
- Rejects non-local clients
- Does not store provider tokens in repo
- Runtime config lives outside git tree
- API responses strip raw provider payloads

Details: [SECURITY.md](./SECURITY.md)

---

## Project structure

```text
bin/headroom.mjs          CLI entry
scripts/install.mjs       one-click setup
scripts/uninstall.mjs     full uninstall
src/panel/                dashboard UI
src/providers/            GPT + x adapters
src/swiftbar/             menubar plugin generator
src/server/               localhost API
src/core/                 paths, service, deps
config.example.json       config shape
docs/                     architecture notes
```

---

## Optional CLI

```bash
node bin/headroom.mjs start
node bin/headroom.mjs open
node bin/headroom.mjs quota
node bin/headroom.mjs sync-swiftbar
node bin/headroom.mjs service install
node bin/headroom.mjs service status
node bin/headroom.mjs service uninstall
```

---

## Troubleshooting

### Menubar empty / no plugin
- Ensure SwiftBar is installed and running
- Dashboard → Dependencies → Write menubar plugin
- or: `node bin/headroom.mjs sync-swiftbar`

### GPT shows error
- Confirm `~/.codex/auth.json` exists
- Re-login to Codex/ChatGPT CLI if expired

### x / Grok shows error
- Confirm `~/.grok/auth.json` exists
- Re-login to Grok CLI if expired

### Panel offline after reboot
- Dashboard → Enable login autostart
- or: `node bin/headroom.mjs service install`

### Port in use
- Default: `127.0.0.1:8787`
- Change only if needed in advanced settings (still localhost-only)

---

## Development

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --no-start --no-autostart
npm test
node bin/headroom.mjs start
```

---

## License

MIT

---

## Disclaimer

Headroom reads local auth files created by other tools and calls official provider endpoints for usage data.  
It does not bypass provider limits, create accounts, or redistribute credentials.
