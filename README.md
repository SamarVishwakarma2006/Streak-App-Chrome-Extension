# Streak Maintaining App

A planned Chrome extension for daily learning goals, automatic activity tracking on supported websites, saved Continue links, milestone points, and optional reminders.

**Current stage:** Step 02 — working Chrome extension scaffold with a popup, dashboard, and background worker. Goal creation, activity tracking, accounts, and rewards are not implemented yet. The extension is not published.

## Project documents

- [PRD.md](PRD.md) — Features, user journeys, completion rules, and release criteria.
- [ARCHITECTURE.md](ARCHITECTURE.md) — Tech stack, extension structure, server responsibilities, and data design.
- [BUILD_PLAN.md](BUILD_PLAN.md) — Numbered implementation steps, checks, and suggested commit messages.
- [DEVLOG.md](DEVLOG.md) — Completed work and decisions.

## Stack

Chrome Manifest V3, WXT, React, TypeScript, and Supabase Auth/Postgres/Edge Functions.

WXT, React, and TypeScript are installed with exact versions and a dependency lockfile. Supabase is planned for the backend checkpoints; no cloud credentials are needed for this scaffold.

## Run locally

Use Node.js 22 or newer (validated with Node 24) and npm. From the project directory:

```powershell
npm ci
npm run typecheck
npm run build
```

If PowerShell blocks npm.ps1, use `npm.cmd` in place of `npm`.

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project's `.output/chrome-mv3` folder, which contains manifest.json.
5. Pin **Streak Maintaining App** from Chrome's extension menu.
6. Click its icon, then **Open dashboard**.

After a source change, build again and use **Reload** on the extension card. Reload any open extension pages too.

For development with WXT's browser runner and automatic rebuilding, use `npm run dev`. Keep that command running while developing. The generated development manifest may include tooling permissions; use `npm run build` for the production package.

## Commands

| Command | Result |
| --- | --- |
| `npm run dev` | Start WXT development mode for Chrome. |
| `npm run typecheck` | Check TypeScript. |
| `npm run build` | Build `.output/chrome-mv3`. |
| `npm run zip` | Build and package a ZIP under `.output`. |
| `npm run test:smoke` | Load the production extension in isolated headless Chromium and check navigation. |

For the repeatable browser smoke check, install the test browser once, then run:

```powershell
npx playwright install chromium --no-shell
npm run build
npm run test:smoke
```

The check creates dedicated profiles and screenshots in ignored `test-results/`. It does not use your personal Chrome profile. If you installed Playwright browsers in a custom directory, set `PLAYWRIGHT_BROWSERS_PATH` to that directory when running the check.

## Configuration and permissions

The scaffold needs no `.env` file, account, website access, or special Chrome permissions. `.env.example` documents the current setup. Never place server secrets in extension configuration: bundled values are visible to users.

Generated folders, test profiles, credentials, and runtime logs are excluded from Git. Commit `package-lock.json` so other checkouts install the same dependency versions. Temporary PNG icons and their SVG source are committed under `public/icon`.

## Verification

Browser tracking can discourage casual skipping but cannot guarantee that activity was not fabricated. Platform verification requires independent evidence from an authorized platform integration. Supported websites will be listed when an integration has been implemented and checked.

## Development workflow

Follow BUILD_PLAN.md one checkpoint at a time. Update DEVLOG.md with each completed checkpoint, review the diff, then commit and push the intended files. GitHub pushes and Chrome Web Store publication are separate operations.

The next implementation checkpoint is **03 — Design foundation and Today interface**.

Repository visibility and license are still undecided. No license is granted by this planning document.
