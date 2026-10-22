# Streak Maintaining App

A planned Chrome extension for daily learning goals, automatic activity tracking on supported websites, saved Continue links, milestone points, and optional reminders.

**Current stage:** Step 08 — GeeksforGeeks free-article reading adapter, local progress, Continue restoration, and prototype streak/XP updates. No cloud account or server-verified rewards yet. The extension is not published.

## Project documents

- [PRD.md](PRD.md) — Features, user journeys, completion rules, and release criteria.
- [ARCHITECTURE.md](ARCHITECTURE.md) — Tech stack, extension structure, server responsibilities, and data design.
- [BUILD_PLAN.md](BUILD_PLAN.md) — Numbered implementation steps, checks, and suggested commit messages.
- [DEVLOG.md](DEVLOG.md) — Completed work and decisions.

## Planned stack

Chrome Manifest V3, WXT, React, TypeScript, and Supabase Auth/Postgres/Edge Functions.

## Verification

Browser tracking can discourage casual skipping but cannot guarantee that activity was not fabricated. Platform verification requires independent evidence from an authorized platform integration. Supported websites will be listed when an integration has been implemented and checked.

## Development workflow

Follow BUILD_PLAN.md one checkpoint at a time. Update DEVLOG.md with each completed checkpoint, review the diff, then commit and push the intended files. GitHub pushes and Chrome Web Store publication are separate operations.

The next implementation checkpoint is **09 — Tracking recovery, duplicate tabs, and pending events**.

Repository visibility and license are still undecided. No license is granted by this planning document.

## Try the streak prototype

Reload the extension, open the dashboard, select **Explore design demo**, then use **Streak scenario**. Seven fictional completions give a seven-day streak and 245 prototype XP. A missed day resets the current streak to zero; the restart scenario shows one day and 270 XP. These controls never mark a saved goal complete.

## First integration

[GeeksforGeeks discovery](INTEGRATION_GEEKSFORGEEKS.md) records inspected public pages, the proposed reading-time/coverage rule, and compatibility limitations. Step 08 now implements the local article tracker described below.

## Try GeeksforGeeks tracking

1. Run `npm.cmd run build` and reload the extension at `chrome://extensions` (then refresh its dashboard).
2. Create a daily goal. For a quick first try, choose **1 Lesson**; this provider counts qualifying articles as lessons.
3. Open **Connections**, choose the goal, press **Connect GeeksforGeeks**, and accept Chrome's site-access request.
4. Open [Python Variables](https://www.geeksforgeeks.org/python/python-variables/) or [Binary Search](https://www.geeksforgeeks.org/dsa/binary-search/). An article panel shows active time and coverage.
5. Read normally, keeping the tab focused. Interact within each 90-second window and spend time across the article. The required active time is at least 60 seconds, scaled by article length; at least 80% of text chunks need dwell time. Scrolling to the bottom alone does not count.
6. After qualification, the selected goal gets local daily progress. Once its target is met, the card shows its streak and local prototype XP. Continue returns to the latest observed article and its saved position.

The scripting permission is required; GeeksforGeeks host access is optional and requested during connection. The bookmark site-approval checkbox alone does not connect tracking. Disconnect stops the adapter; revoke site access in Chrome settings if Chrome retains a managed grant.

Only supported individual free Python/DSA articles are included. Tutorial hubs, videos, quizzes, practice, paid pages and other templates are unsupported. A page layout change can pause tracking. Local rewards can be edited by the device owner and are never imported as trusted cloud XP.

Checks: `npm.cmd run test:reading`, `npm.cmd run test:reading:browser`, and `npm.cmd run test:smoke` (after a build). Browser checks need the installed Playwright Chromium. The reading browser test runs a real 60-second threshold on synthetic content in an isolated test package; it pre-grants only the declared optional host to avoid automating Chrome's consent dialog. Add `--live` when invoking `node scripts/reading-smoke.mjs --live` for a small public-page compatibility check.

Next checkpoint: **09 — Tracking recovery, duplicate tabs, and pending events**.