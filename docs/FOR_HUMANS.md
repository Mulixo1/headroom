# Headroom — Human Install & Use Guide

This guide is for people installing Headroom on their own Mac.

## What you get

- Menu bar remaining usage: `GPT 52% · x 91%`
- Local dashboard: http://127.0.0.1:8787
- Starts again after logout/login

## Before you start

You need:

1. macOS
2. Node.js 20+
3. Terminal access
4. At least one of these auth files for live percentages:
   - GPT: `~/.codex/auth.json`
   - x/Grok: `~/.grok/auth.json`

Check Node:

```bash
node -v
```

If Node is missing, install from https://nodejs.org (LTS 20+).

---

## Step 1 — Install SwiftBar (copy/paste)

Headroom uses SwiftBar for the macOS menu bar.

### Option A (recommended): Homebrew

```bash
brew install --cask swiftbar
open -a SwiftBar
```

If Homebrew is not installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install --cask swiftbar
open -a SwiftBar
```

### Option B: Manual download

1. Open: https://github.com/swiftbar/SwiftBar/releases/latest
2. Download and install `SwiftBar.app`
3. Open SwiftBar once from Applications

Verify SwiftBar is running (menu bar icon/app should be active).

---

## Step 2 — Install Headroom (copy/paste)

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar
```

What this does:

- creates Headroom config
- writes SwiftBar plugin
- enables login autostart
- starts local service
- opens dashboard

Dashboard: http://127.0.0.1:8787

---

## Step 3 — Daily use

No terminal needed after install.

1. Look at menu bar for `GPT ..% · x ..%`
2. Click menu bar for details / refresh / open panel / close
3. Open dashboard anytime: http://127.0.0.1:8787

Dashboard controls:

- language (System / English / Turkish)
- show in bar / show in detail
- SwiftBar dependency helpers
- login autostart
- full uninstall

---

## Uninstall (copy/paste)

```bash
cd ~/path/to/headroom
node scripts/uninstall.mjs
```

Or from dashboard:

Danger zone → **Uninstall completely**

This removes:

- Headroom autostart
- Headroom menu bar plugin
- Headroom local config

This does **not** remove:

- SwiftBar app
- GPT/Grok auth files

---

## Common problems

### Menu bar empty
```bash
open -a SwiftBar
cd ~/path/to/headroom
node bin/headroom.mjs sync-swiftbar
```

### Panel offline
```bash
cd ~/path/to/headroom
node bin/headroom.mjs service install
open http://127.0.0.1:8787
```

### GPT error
- ensure `~/.codex/auth.json` exists
- re-login to Codex/ChatGPT tools if needed

### x/Grok error
- ensure `~/.grok/auth.json` exists
- re-login to Grok tools if needed

---

## Optional useful commands

```bash
node bin/headroom.mjs quota
node bin/headroom.mjs open
node bin/headroom.mjs service status
node bin/headroom.mjs sync-swiftbar
```
