# Streak Maintaining App

A planned Chrome extension for daily learning goals, automatic activity tracking on supported websites, saved Continue links, milestone points, and optional reminders.

**Current stage:** Step 07 — GeeksforGeeks free-article integration discovery complete. The existing extension still has local goals, bookmarks and prototype rewards; live reading tracking is Step 08.

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

The next implementation checkpoint is **02 — Repository housekeeping and extension scaffold**.

Repository visibility and license are still undecided. No license is granted by this planning document.

## Try the streak prototype

Reload the extension, open the dashboard, select **Explore design demo**, then use **Streak scenario**. Seven fictional completions give a seven-day streak and 245 prototype XP. A missed day resets the current streak to zero; the restart scenario shows one day and 270 XP. These controls never mark a saved goal complete.

## First integration

[GeeksforGeeks discovery](INTEGRATION_GEEKSFORGEEKS.md) records inspected public pages, the proposed reading-time/coverage rule, and compatibility limitations. This checkpoint updates documentation; reloading Chrome will not show a new tracker yet. Next: Step 08 — implement the GeeksforGeeks article adapter.
