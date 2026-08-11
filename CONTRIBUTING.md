# Contributing

## Dev setup

```bash
git clone <repo-url>
cd headroom
node scripts/install.mjs --no-start --no-autostart
node bin/headroom.mjs start
```

## Checks

```bash
npm test
node bin/headroom.mjs quota
node bin/headroom.mjs service status
```

## Guidelines

- No secrets/tokens/personal config in commits
- Keep localhost-only networking
- Keep EN/TR strings in sync for panel and menubar
- New providers only if plug-and-play remains simple
