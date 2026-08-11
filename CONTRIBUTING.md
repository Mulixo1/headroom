# Contributing

## Before you contribute

By submitting a contribution, you confirm that:

1. You have the rights to submit the content
2. Your contribution can be licensed under the MIT License used by this repository
3. You are not submitting secrets, credentials, or private personal data

## Dev setup

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs --no-start --no-autostart
npm test
node bin/headroom.mjs service status
```

## Checks

```bash
npm test
node bin/headroom.mjs help
node bin/headroom.mjs service status
```

## Guidelines

- No secrets/tokens/personal config in commits
- Keep localhost-only networking assumptions
- Keep EN/TR UI strings in sync when changing labels
- Prefer small, reviewable pull requests
- Do not add third-party code unless its license is compatible and documented

## License of contributions

Contributions are accepted under the same MIT terms as the project (`LICENSE`).
