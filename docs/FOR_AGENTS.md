# Headroom — Agent Install Playbook

This document is for AI coding agents / automation.

Goal: install and run Headroom non-interactively on macOS with minimal user prompts.

## Hard requirements

- OS: macOS (`darwin`)
- Node.js: `>=20`
- Network: needed for first clone and optional brew cask
- Auth files are optional for process start, required for live quota values:
  - `~/.codex/auth.json`
  - `~/.grok/auth.json`

## Non-interactive install (preferred)

Run exactly:

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt --no-open
```

Notes:

- `--with-swiftbar` installs SwiftBar via Homebrew if missing
- `--no-swiftbar-prompt` avoids TTY prompts
- `--no-open` avoids GUI browser pop in headless/agent contexts

If you want browser open for the human user:

```bash
node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt
```

## SwiftBar prerequisite commands (copy/paste)

If you need to install SwiftBar first yourself:

```bash
brew install --cask swiftbar
open -a SwiftBar
```

If brew is missing, do **not** silently install Homebrew unless user explicitly asked.
In that case:

1. report that Homebrew is required for automatic SwiftBar install
2. continue Headroom service install
3. tell user to run the SwiftBar commands above

## Success criteria (verify all)

```bash
# 1) service health
curl -s http://127.0.0.1:8787/api/health

# 2) dependency state
curl -s http://127.0.0.1:8787/api/deps

# 3) quota probe (may error if auth files missing)
node bin/headroom.mjs quota

# 4) autostart status
node bin/headroom.mjs service status

# 5) plugin exists
ls "$HOME/Library/Application Support/SwiftBar/Plugins"/headroom-combined*.sh
```

Expected:

- health: `{"ok":true,"service":"headroom",...}`
- deps.swiftbar.installed: ideally `true`
- service.launchAgentInstalled: `true`
- plugin file present

## Idempotent re-run

Safe to re-run:

```bash
cd headroom
node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt --no-open
node bin/headroom.mjs sync-swiftbar
```

## Uninstall (non-interactive)

```bash
cd headroom
node scripts/uninstall.mjs
```

## Do / Don't

Do:

- use absolute verification with curl/CLI outputs
- keep localhost-only assumptions (`127.0.0.1:8787`)
- preserve user auth files (`~/.codex`, `~/.grok`)

Don't:

- claim live GPT/x percentages without successful `quota` output
- force Homebrew install unless requested
- store tokens in repo files
- bind service to non-localhost interfaces

## Minimal agent checklist

1. clone repo
2. `node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt`
3. verify `/api/health`
4. verify SwiftBar plugin path
5. report dashboard URL: `http://127.0.0.1:8787`
6. if quota fails, report missing/invalid auth files separately from install success


## Autostart repair

If Node version manager paths change (e.g. nvm), repair LaunchAgent:

```bash
node bin/headroom.mjs service repair
node bin/headroom.mjs service status
```


## Background service expectation

Do not keep foreground `node bin/headroom.mjs start` after install.

Verify:

```bash
node bin/headroom.mjs service status
curl -s http://127.0.0.1:8787/api/health
```

Repair/re-enable:

```bash
node bin/headroom.mjs service repair
```
