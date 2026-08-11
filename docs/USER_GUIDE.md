# Headroom User Guide

## 1. Install once

```bash
git clone https://github.com/Mulixo1/headroom.git
cd headroom
node scripts/install.mjs
```

If SwiftBar is missing, installer can install it via Homebrew (asks first).

## 2. Use every day

- Menu bar shows remaining percentages
- Click menu bar for details and actions
- Open dashboard: http://127.0.0.1:8787

No terminal needed after first setup.

## 3. Language

Dashboard language selector:

- System (default)
- English
- Turkish

Menubar labels follow system/selected language.

## 4. Visibility controls

For each account (GPT / x):

- **Show in bar**: appears in menu title
- **Show in detail**: appears in dropdown body

## 5. Uninstall

Dashboard → Danger zone → Uninstall completely

or:

```bash
node scripts/uninstall.mjs
```

## 6. What Headroom never does

- Does not upload your tokens
- Does not require Headroom account
- Does not replace ChatGPT/Grok apps
- Does not store secrets in git
