# AGENTS.md

If you are an AI agent asked to install or run this repository, follow:

- [docs/FOR_AGENTS.md](./docs/FOR_AGENTS.md)

Humans should follow:

- [docs/FOR_HUMANS.md](./docs/FOR_HUMANS.md)

## Fast path for agents

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar --no-swiftbar-prompt
curl -s http://127.0.0.1:8787/api/health
node bin/headroom.mjs quota
```

## Fast path for humans

1. Install SwiftBar:

```bash
brew install --cask swiftbar
open -a SwiftBar
```

2. Install Headroom:

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --with-swiftbar
```

3. Open dashboard: http://127.0.0.1:8787
