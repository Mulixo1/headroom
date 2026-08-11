# Headroom

Local macOS menubar + localhost dashboard for remaining AI usage.

Shows remaining capacity for:

- **GPT** (ChatGPT / Codex)
- **x** (Grok)

Example menubar:

```text
GPT 52% · x 91%
```

Local-first:

- no Headroom cloud account
- no proxy auth layer
- no tokens in git
- uses existing local auth files

---

## Choose your guide

| Audience | Guide |
|---|---|
| **Human** | [docs/FOR_HUMANS.md](./docs/FOR_HUMANS.md) |
| **AI agent** | [docs/FOR_AGENTS.md](./docs/FOR_AGENTS.md) |
| Root agent pointer | [AGENTS.md](./AGENTS.md) |

---

## SwiftBar install (copy/paste)

Menubar requires [SwiftBar](https://github.com/swiftbar/SwiftBar).

```bash
brew install --cask swiftbar
open -a SwiftBar
```

If Homebrew is missing:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install --cask swiftbar
open -a SwiftBar
```

Manual download alternative: https://github.com/swiftbar/SwiftBar/releases/latest

---

## Human install (copy/paste)

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar
```

Then open: http://127.0.0.1:8787

No terminal needed after first setup.

---

## AI agent install (non-interactive copy/paste)

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt --no-open
curl -s http://127.0.0.1:8787/api/health
node bin/headroom.mjs service status
node bin/headroom.mjs quota
```

Agents should treat:

- service health success = install success
- quota errors = auth-file issue (separate from install)

Full agent playbook: [docs/FOR_AGENTS.md](./docs/FOR_AGENTS.md)

---

## Requirements

| Need | Why |
|---|---|
| macOS | Menubar + LaunchAgent |
| Node.js 20+ | Headroom service |
| SwiftBar | Menu bar UI host |
| GPT/Grok local auth files | Live percentages |

Auth files:

| Provider | File |
|---|---|
| GPT | `~/.codex/auth.json` |
| x / Grok | `~/.grok/auth.json` |

---

## What installer does

1. Checks Node / SwiftBar / Homebrew
2. Can install SwiftBar via Homebrew (`--with-swiftbar`)
3. Creates config in `~/Library/Application Support/Headroom/`
4. Writes SwiftBar plugin
5. Installs login autostart
6. Starts `http://127.0.0.1:8787`
7. Opens dashboard (unless `--no-open`)

### Flags

```bash
node scripts/install.mjs --with-swiftbar
node scripts/install.mjs --no-swiftbar-prompt
node scripts/install.mjs --no-autostart
node scripts/install.mjs --no-start
node scripts/install.mjs --no-open
```

---

## Daily use

1. Menu bar shows remaining %
2. Click menu bar for details/actions
3. Dashboard controls language, visibility, deps, uninstall

Dashboard: http://127.0.0.1:8787

---

## Uninstall

Human:

```bash
cd headroom
node scripts/uninstall.mjs
```

Or dashboard → Danger zone → Uninstall completely

Removes Headroom autostart/plugin/config.  
Does not remove SwiftBar app or provider auth files.

---

## Dependency policy

| Component | Behavior |
|---|---|
| Headroom service | automatic |
| Login autostart | automatic |
| Headroom plugin | automatic |
| SwiftBar app | detect + optional brew install |
| Homebrew | not auto-installed |

Panel works without SwiftBar. Menubar needs SwiftBar.

---

## Security

- localhost only (`127.0.0.1`)
- non-local clients rejected
- tokens never stored in repo
- see [SECURITY.md](./SECURITY.md)

---

## Troubleshooting

### Menubar empty

```bash
open -a SwiftBar
cd headroom
node bin/headroom.mjs sync-swiftbar
```

### Panel offline after reboot

```bash
cd headroom
node bin/headroom.mjs service install
open http://127.0.0.1:8787
```

### GPT/x quota error

- check auth files exist
- re-login provider tools if expired
- install can still be healthy even if quota fails

---

## Optional CLI

```bash
node bin/headroom.mjs start
node bin/headroom.mjs open
node bin/headroom.mjs quota
node bin/headroom.mjs sync-swiftbar
node bin/headroom.mjs service install
node bin/headroom.mjs service repair
node bin/headroom.mjs service status
node bin/headroom.mjs service uninstall
```

---

## License

MIT
