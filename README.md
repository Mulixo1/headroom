# Headroom

Local macOS menubar + localhost panel for **GPT** and **x (Grok)** remaining usage.

**Headroom** = capacity left.

## One-click install (macOS)

Requirements:

- macOS
- Node.js 20+
- Existing local auth files when you want live percentages:
  - GPT: `~/.codex/auth.json`
  - x: `~/.grok/auth.json`

```bash
git clone <this-repo-url>
cd headroom
node scripts/install.mjs
```

What install does:

1. Checks dependencies (Node / SwiftBar / Homebrew)
2. If SwiftBar is missing, offers optional install via Homebrew
3. Creates user config in `~/Library/Application Support/Headroom/`
4. Writes SwiftBar plugin
5. Installs login autostart (LaunchAgent)
6. Starts local service on `http://127.0.0.1:8787`
7. Opens dashboard

### Installer flags

```bash
node scripts/install.mjs --with-swiftbar      # auto-approve SwiftBar brew install
node scripts/install.mjs --no-swiftbar-prompt # never prompt for SwiftBar
node scripts/install.mjs --no-autostart
node scripts/install.mjs --no-start
node scripts/install.mjs --no-open
```

## Dependency policy

| Piece | Install behavior |
|---|---|
| Headroom service | automatic |
| Login autostart | automatic |
| Headroom SwiftBar plugin | automatic |
| SwiftBar app | detect + optional Homebrew install |
| Homebrew | not auto-installed |

Panel works without SwiftBar. Menubar chips need SwiftBar.

## Daily use

- Menubar: `GPT 52% · x 91%`
- Dropdown actions: Open panel / Refresh / Reset / Close
- Dashboard language: System / English / Turkish
- Menubar labels follow system/selected language

No terminal is needed after setup.

## Uninstall

### Dashboard
Danger zone → **Uninstall completely**

### Terminal
```bash
node scripts/uninstall.mjs
```

Removes LaunchAgent, Headroom menubar plugin, and local Headroom config.  
Does **not** remove GPT/Grok auth files or SwiftBar app.

## Security

- Localhost only (`127.0.0.1`)
- Non-local clients rejected
- Tokens never stored in the git repo
- See [SECURITY.md](./SECURITY.md)

## Commands

```bash
node bin/headroom.mjs start
node bin/headroom.mjs open
node bin/headroom.mjs quota
node bin/headroom.mjs sync-swiftbar
node bin/headroom.mjs service install
node bin/headroom.mjs service status
node bin/headroom.mjs service uninstall
```

## License

MIT
