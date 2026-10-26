# Streak Maintaining App

A planned Chrome extension for daily learning goals, automatic activity tracking on supported websites, saved Continue links, milestone points, and optional reminders.

**Current stage:** Step 14 — Optional daily reminders and contextual learning nudges are implemented. Local reading and reminders work without an account. A configured Supabase development project is still required for real sign-in and cloud records; no hosted deployment has occurred.

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

The next implementation checkpoint is **15 — History, milestones, and interface completion**.

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

The scripting and recovery-alarm permissions are required; GeeksforGeeks host access is optional and requested during connection. The bookmark site-approval checkbox alone does not connect tracking. Disconnect stops the adapter; revoke site access in Chrome settings if Chrome retains a managed grant.

Only supported individual free Python/DSA articles are included. Tutorial hubs, videos, quizzes, practice, paid pages and other templates are unsupported. A page layout change can pause tracking. Local rewards can be edited by the device owner and are never imported as trusted cloud XP.

Checks: `npm.cmd run test:reading`, `npm.cmd run test:reading:browser`, and `npm.cmd run test:smoke` (after a build). Browser checks need the installed Playwright Chromium. The reading browser test runs a real 60-second threshold on synthetic content in an isolated test package; it pre-grants only the declared optional host to avoid automating Chrome's consent dialog. Add `--live` when invoking `node scripts/reading-smoke.mjs --live` for a small public-page compatibility check.

Next checkpoint: **15 — History, milestones, and interface completion**.

## Step 09: interruption recovery

Reload the extension at chrome://extensions after building, then refresh open GeeksforGeeks pages. Open the same supported article in two tabs: only the focused tab contributes time. Close and reopen the browser to continue from saved reading progress. Already loaded articles can track while offline; loading a new article still needs the website.

Local completion events are saved before rewards are applied, with stable UUIDs and daily deduplication keys. Retries preserve the original qualification time. Connections shows pending local rewards and errors. Reading pauses while an award needs recovery. Retries back off up to five minutes and run on extension wake, requests, and a one-minute Chrome alarm. Chrome may delay alarms while asleep or closed.

The local queue is capped at 1,000 events and preserves pending records rather than silently discarding them. Normal operation drains it immediately. This is not the future cloud upload queue: prototype XP will never be uploaded as trusted rewards. A crash can lose the most recent unacknowledged sample; no time is credited for the interruption. Device owners can still edit local records.

Run `npm.cmd run test:recovery` after building for an isolated browser check of duplicate tabs, offline reading, worker termination, browser restart, award replay, and error backoff. Next after recovery: the Step 10 database foundation below.


## Step 10: see the database foundation

Run `npm.cmd run test:database` to apply the migration and check two fictional users against all ten tables in an isolated local PostgreSQL runtime. No account, secrets, Docker, or database server is needed. The script checks owner-only reads, blocked client writes, anonymous denial, duplicate events/days/XP/milestones, ownership links, bounded evidence, and account deletion.

See [the database guide](supabase/README.md) and [initial migration](supabase/migrations/202610250001_initial_schema.sql). This backend preparation adds no extension screen. The PGlite dependency is development-only; production extension output remains 284.71 kB. A hosted Supabase project and Auth/Data API validation remain necessary before cloud features can be used. Step 11 adds sign-in and account connection.


## Step 11: see the account screen

Build/reload the extension and open **Settings**. Without configuration it displays
“Cloud setup is needed”; existing local tracking still works. Follow
[the Step 11 setup guide](supabase/README.md#step-11-enable-email-code-sign-in) to
apply the account migration, configure public project values, and enable email codes.
Configured builds support sign-in, session restoration, sign-out and an explicit
**Copy goal definitions to my account** button. No links or prototype XP are uploaded.

Run `npm.cmd run test:account` for isolated mocked sign-in checks and
`npm.cmd run test:database` for migration/RLS/RPC checks. Real email delivery and
hosted account validation still require a development Supabase project. Next is Step 12.


## Step 12: see server validation

Run `npm.cmd run test:ingestion` to exercise ownership checks, invalid evidence,
retries, duplicate rewards, lesson/minute targets, every milestone, missed days and
transaction rollback in a local PostgreSQL runtime. Run `npm.cmd run test:database`
for schema/access checks. No cloud account is needed for either check.

See [the Step 12 backend contract](supabase/README.md#step-12-server-completion-validation-and-xp).
This step changes backend behavior only; there is no new extension screen. Actual
cloud ingestion, pending/synced UI and offline reconciliation come in Step 13.
Browser-tracked evidence can still be forged by a device owner; server-controlled
awards do not make it independently verified.

## Step 14: try reminders and learning nudges

1. Build/reload the extension, create a goal, and connect it to GeeksforGeeks. Open a supported article once to save its Continue location.
2. In **Settings → Remember what you’re working toward**, select the goal. Enable a daily time, a contextual nudge, or both. Optionally add your motivation and an article-count milestone.
3. Set quiet hours and press **Save reminders**. Chrome requests the optional notification permission only when enabling a reminder. No Supabase account is needed.
4. For a daily reminder, choose a time a minute or two ahead in the displayed learning timezone, leave the goal unfinished and stop actively reading. Chrome may deliver up to an hour late; older reminders are skipped.
5. For a nudge, actively read for at least 30 seconds without completing the daily goal, then switch tabs or navigate away and leave Chrome focused. Wait at least a minute (the one-minute alarm can add another minute). Returning promptly cancels the nudge. Destination URLs are not inspected or stored.
6. Choose **Continue**, **Snooze 10 minutes**, or close the notification to dismiss it. Returning to reading cancels a pending snooze. Only one automatic reminder per goal/day is allowed across both modes; explicit snooze follow-ups are the exception.

Reminders skip completed, archived, disconnected or permission-blocked goals. Only the currently connected GeeksforGeeks goal is eligible, and settings remain device-only. Quiet hours, stale-session limits and delayed-alarm expiry reduce interruptions. Article milestones count qualified local articles, not mastery. Chrome closure, sleeping devices and OS settings can prevent or delay notifications.

Run `npm.cmd run test:reminders` after building. The isolated browser package captures delivery calls instead of showing OS notifications. It checks timing, DST, restart/deduplication, actions, permission denial, completion suppression, real reader session binding, tab switching and destination privacy. Screenshots are saved to `test-results/reminders.png` and `test-results/reminders-narrow.png`. The real Chrome permission prompt and your operating system's presentation still require a manual check.

## Step 13: see cloud synchronization

1. Build/reload the extension and open **Settings**. The account and cloud controls are visible without configuration; device-only tracking continues to work.
2. For real cloud use, follow [the Supabase setup guide](supabase/README.md), apply all three migrations, configure the public project values, rebuild/reload, and sign in.
3. Create a device goal, connect it to GeeksforGeeks in **Connections**, then use **Copy goal definitions to my account** in Settings.
4. Press **Enable cloud sync**, then start a supported article you have not already opened with the tracker. Existing article checkpoints and prototype XP are not imported.
5. After qualification, **Cloud records** in Today, Settings, and the popup shows pending/accepted status and cached server streak/XP totals. Use **Sync and refresh** to fetch current records from other devices.

The server receives a canonical article path and bounded reading evidence; resume URLs, titles and scroll position remain local. Browser evidence is still forgeable. Cloud minute targets count qualified articles only, so totals may differ from the local prototype. Local edits do not change copied cloud targets.

Retries use the same UUID and evidence after interruptions. Automatic retries run after qualification, on worker wake and on the one-minute recovery alarm (Chrome may delay alarms). Offline activity qualifies on the server receipt day, not the day it was read. Pending submissions expire after seven days with a visible explanation. Pause retains queued submissions; sign-out explicitly discards unsynced cloud submissions. Starting sync again uses a new account generation after sign-out, preventing old local history from being imported.

Run `npm.cmd run test:cloud` for an isolated mocked cloud flow, including browser restart, interrupted responses, receipt-day display, stale rules, cross-device duplicates, expiry, pause and account isolation. The check creates `test-results/cloud.png` and `test-results/cloud-popup.png` with fictional records; no real emails or account activity are sent. Browser checks require Playwright Chromium. On this workspace, use `$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Get-Location) 'test-results\browsers')` before running them.
