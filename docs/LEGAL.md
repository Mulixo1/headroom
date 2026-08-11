# Legal & Licensing Notes

This document explains the licensing and ownership statements used in this repository in plain language.

This is informational documentation for the project, not personalized legal advice.

## 1) Copyright ownership

The software in this repository is copyrighted by:

```text
Copyright (c) 2026 Mulixo
```

That means Mulixo is identified as the copyright holder of the Headroom source code published in this repository.

## 2) What “MIT License” means here

This project uses the MIT License text in [`LICENSE`](../LICENSE).

MIT is a widely used open-source license template. Using MIT does **not** mean:

- a government office certified the project
- a third-party “MIT authority” approved the repo
- ownership transferred away from the copyright holder

It means the copyright holder grants permissions under the MIT terms.

Under MIT, recipients are generally permitted to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to keeping the copyright and permission notice.

The software is provided **“AS IS”**, without warranty.

## 3) Why MIT appears in multiple places

For clarity and tooling compatibility, MIT is declared in:

- `LICENSE` (full legal text)
- `package.json` (`"license": "MIT"`)
- `NOTICE` (short ownership + SPDX marker)
- README license section

This is standard open-source practice.

## 4) What MIT does not cover

MIT licenses the **software code** in this repository. It does not automatically grant rights to:

- third-party trademarks or brand names
- third-party apps (for example SwiftBar)
- third-party accounts/services (for example OpenAI/ChatGPT/Codex or xAI/Grok)
- any credentials stored on a user’s machine

## 5) Third-party services and local credentials

Headroom is a local helper. Depending on configuration, it may read local credential/session files created by other tools (for example `~/.codex/auth.json` or `~/.grok/auth.json`) and call provider endpoints for usage data.

Important boundaries:

- Headroom does not create provider accounts
- Headroom does not sell or redistribute provider credentials
- Users remain responsible for their own accounts, credentials, and provider terms of use
- Provider API availability/behavior can change at any time

## 6) No affiliation statement

Unless explicitly stated, Headroom is independent and not affiliated with, endorsed by, or sponsored by OpenAI, xAI, SwiftBar, Apple, or other third parties whose names may appear in documentation for interoperability purposes.

## 7) Trademark note

Product and company names used in docs are for identification/interoperability only.
No trademark license is granted by this repository except as required to truthfully describe compatibility.

## 8) Warranty and liability

As stated in the MIT License, the software is provided without warranty.
To the maximum extent allowed by applicable law, authors and copyright holders are not liable for damages arising from use of the software.

## 9) Security reports

Please use private GitHub security advisories for vulnerability reports. See [`SECURITY.md`](../SECURITY.md).
