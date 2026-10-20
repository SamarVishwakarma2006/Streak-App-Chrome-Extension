# Streak Maintaining App

A planned Chrome extension for daily learning goals, automatic activity tracking on supported websites, saved Continue links, milestone points, and optional reminders.

**Current stage:** Product specification and implementation planning. The extension is not implemented or published yet.

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
