# Development log

## Product idea — Contextual learning nudge (2026-10-25)

- Logged the idea to gently prompt a learner when they leave an active supported lesson before meeting today's goal.
- The proposed reminder shows the goal, today's progress, and what's left; it can show progress toward a longer-term target only when the user has defined a measurable target. Actions are Continue, Snooze, and Dismiss.
- Privacy/UX guardrails: opt-in, brief grace period, per-session limit, detect leaving the tracked lesson without storing the destination URL or general browsing history, and use a Chrome notification rather than injecting into other sites.
- Added it to Step 14 for implementation and validation. It is a planned idea, not an implemented feature.

Record one entry per completed checkpoint or meaningful fix. This is a human-written project history, not a dump of runtime logs or user activity.

Implementation progress and GitHub publishing are separate. An entry means the described files/work exist; it does not mean they have been committed, pushed, deployed, or published.

## 2026-10-20 — Steps 00–01: Specification and build roadmap

**Status:** Documentation prepared. No application implementation yet. Commit/push not recorded.

### Changes

- Created PRD.md covering multiple streaks, Continue actions, tracking, rewards, reminders, privacy, and release criteria.
- Created ARCHITECTURE.md covering the extension, Supabase backend, data model, validation, and deployment.
- Added BUILD_PLAN.md with numbered implementation and publishing checkpoints.
- Added README.md as the project entry point and this development log.

### Decisions

- Baseline: Chrome Manifest V3, WXT, React, TypeScript, and Supabase.
- Resume locations remain local in V1; authoritative completion and XP records live on the server.
- Browser-tracked activity is explicitly distinguished from platform-verified activity.
- Implementation proceeds in reviewable checkpoints so the owner can commit/push each update.

### Checks

- Reviewed the documentation for matching scope, data responsibilities, and verification claims.
- No application tests were run; there is no application code yet.

### Open items

- First supported learning website and qualifying activity.
- GitHub remote, repository visibility, and license.
- Product name and final visual identity.
- Development/production service configuration before backend deployment.

### Next

Step 02: repository housekeeping and extension scaffold.

Suggested documentation commit: `docs: establish product specification and build roadmap`

---

## 2026-10-20 — Step 02: Chrome extension scaffold

**Status:** Implemented and checked. Not committed or pushed by the assistant.

### Changes

- Preserved the existing Git repository and its GitHub remote.
- Added WXT, React, TypeScript, strict compiler settings, and exact dependency versions with package-lock.json.
- Added a Manifest V3 background worker, React popup, and a dashboard opened from the popup.
- Added temporary PNG icons with editable SVG source and minimal shared styling.
- Added .gitignore and a credential-free .env.example.
- Documented local installation, development, build, packaging, and browser checking in README.md.
- Added a repeatable Playwright smoke script using an isolated Chromium profile.

### Checks

- `npm run typecheck` passed.
- `npm run build` passed; `npm run zip` rebuilt successfully and produced the extension ZIP.
- `npm run test:smoke` passed in headless Chrome for Testing 151 via Playwright.
- Checked MV3 manifest, all packaged icons, absence of requested permissions, background worker startup, popup rendering, keyboard navigation to dashboard, dashboard reload, narrow-layout overflow, and absence of page errors.
- Visually inspected the popup and dashboard screenshots.
- The browser check loads the popup as an extension page; toolbar pinning and the native popup container remain manual installation checks.

### Decisions and limitations

- No website access or storage permissions are requested until the corresponding feature is implemented.
- Goal management, tracking, authentication, and rewards remain future checkpoints.
- Supabase is not configured and no user activity is collected.
- Validation browser files, profiles, screenshots, generated output, and dependencies stay outside Git through ignore rules.
- Temporary icon PNGs were generated from public/icon/source.svg. They are committed assets; regeneration is not required to build.

### Next

Step 03: design foundation and Today interface.

Suggested commit: `chore: scaffold Chrome extension with WXT and React`

---

## 2026-10-20 — Step 03: Today interface and design foundation

**Status:** Implemented and checked. Not committed or pushed by the assistant.

### Changes

- Replaced the scaffold landing screens with a sage-green Today interface and compact popup.
- Shared goal cards show sample lessons, progress, streak lengths, and Continue/Done actions.
- Added daily completion summary, example weekly activity, and a milestone preview.
- Added hash-based navigation for Today, History, Rewards, Connections, and Settings; future-feature sections explain their current availability.
- Added selectable sample, empty, and loading previews.
- Continue actions open a native demo dialog, with keyboard dismissal and focus restoration.
- Added shared color styles, focus indicators, reduced-motion support, responsive layouts, and DESIGN.md.
- Updated the README and build checklist.

### Checks

- TypeScript passed; production build and ZIP packaging passed.
- Browser smoke checks passed for worker startup, popup height under 600px, three sample goals, keyboard navigation, dialog Escape/focus restoration, all five navigation destinations, empty/loading states, reduced motion, reload, and overflow at 1200px, 768px, and 360px.
- Checked a long goal title for wrapping and confirmed no page errors.
- Inspected desktop, narrow-layout, and popup screenshots.
- Measured key color contrast pairs; darkened secondary text after finding insufficient contrast on the milestone background. The corrected pair measures 4.95:1. This is not a full accessibility audit.
- The initial sandbox build could not replace the OneDrive output directory (EPERM); rebuilding with approved access succeeded.

### Decisions and limitations

- All goals, courses, weekly activity, milestones, and XP remain clearly labeled examples.
- Continue opens an explanation; real lesson resume, goal creation, persistence, and tracking belong to later steps.
- The display wordmark `Streak / daily` is provisional, not a finalized product name.
- No new dependencies, permissions, or cloud services were added.

### Next

Step 04: multiple goals and persistent local storage.

Suggested commit: `feat: add Today interface and shared design styles`

---

## Entry template

Copy this template above this section when recording the next update:

```markdown
## YYYY-MM-DD — Step NN: Short title

**Status:** Complete / partial / blocked. State publishing separately if known.

### Changes
- What was implemented and why.

### Checks
- Exact check performed and actual result.
- Anything not checked and the reason.

### Decisions and limitations
- Relevant behavior, tradeoff, or unresolved dependency.

### Next
Step NN: next concrete outcome.

Suggested commit: `type: concise description`
```

## Step 04 — Multiple goals and persistent local storage — 2026-10-20

- Added create/edit/archive/restore/delete flows with native forms and a confirmation dialog for permanent deletion.
- Added schema 1 in chrome.storage.local, validated background-worker mutations, serialized writes, and live popup/dashboard refresh. Unknown or damaged schemas block writes without clearing saved data. Step 03 had no stored data to migrate.
- Today now defaults to saved goals; the sample design is opt-in and separate. Goals explicitly remain Not connected; there is no activity completion or reward claim.
- Added only the storage permission. No new dependencies or website permissions.
- Checks passed: TypeScript, production build/ZIP, browser creation of three goals, edits and popup synchronization, archive/restore, cancelled and confirmed deletion, invalid worker input, browser close/relaunch with unchanged stored data, unknown-schema write rejection, navigation, demo states, reduced motion, narrow layouts, and no page errors. Visually inspected the 360px layout.
- Local data can still be lost through uninstalling, clearing extension/profile data, or losing the profile. Device owners can modify local data; no local record is trusted as verified XP.
- Suggested commit: `feat: add persistent goal management`
- Commit/push: left to the user; not performed or verified.
- Next: Step 05 — Continue buttons and saved activity locations.

## Step 05 — Saved locations, Continue, and Ponytail cleanup — 2026-10-20

- Added optional lesson URL/title and explicit site approval to goal creation/editing. Blank URLs remove bookmarks. Continue is available in popup/dashboard and opens a new tab or focuses an exact URL match and its window.
- Added schema 2 with a lossless schema-1 migration. Sanitizes query/fragment data and rejects credentials, non-HTTPS schemes, obvious local/IP destinations, custom ports, and origin mismatches. Validates again when reading saved data before opening it.
- Added the tabs permission for user-triggered tab matching. No browsing history is persisted or uploaded, and no website host permission is requested.
- Scope: manual path-based bookmarks only. Missing pages and expired logins are handled by the website; the UI explains editing the link or signing in. Provider activity IDs, query-dependent URLs, automatic checkpoint capture, and playback recovery await approved adapters. Continue never grants progress or XP.
- Ponytail cleanup: moved single-use demo data into Today.tsx, removed src/demo.ts, removed unused compact branches from demo GoalList/DaySummary and their unused styles. Retained the working demo and shared saved-goal controls. Added no dependencies.
- Checks passed: TypeScript, production ZIP, the existing goal lifecycle/popup synchronization suite, demo states/navigation, responsive layouts, bookmark approval/sanitization, unsafe destination rejection, tab reuse and reopening after closure, full browser restart persistence, schema-1 migration and unknown-schema preservation. Fixture pages exercised a moved/sign-in destination without needing external accounts. Visually inspected popup and narrow dashboard screenshots.
- Suggested commit: `feat: add saved activity locations and Continue actions`
- Commit/push: not performed; left to the user.
- Next: Step 06 — Local streak rules and prototype rewards.

## Step 06 — Local streak rules and prototype rewards — 2026-10-21

- Added a small dependency-free TypeScript ledger for local calendar dates, current/best streaks, missed days, archive/reactivation, and lifetime XP retention after deletion.
- Implemented 25 daily XP and lifetime-per-goal bonuses at 3/7/14/30/100 days. Duplicate dates and provider/activity keys cannot award twice, including across goals and deletion. Callers must supply stable, provider-namespaced activity keys.
- Added rule revisions effective at the next midnight in the old timezone. Uses Intl and actual date boundaries for DST, rejects backdating, and prevents overlapping rewards when zones change. This is prototype logic, not evidence verification.
- Added a read-only Streak scenario selector inside Explore design demo. Uses fixed fictional events, never saved-goal completions. No manual completion message or tracking claim was added.
- Checks passed: test:streaks (all milestones, repeated milestone prevention, duplicate dates/activities, missed day, archive/restore/delete, exact midnight, both DST transitions, rule/timezone changes and JSON roundtrip); TypeScript; production ZIP; browser preview assertions and the existing saved-goal/bookmark/persistence regression suite. Visually inspected the preview screenshot.
- Preserved the uncommitted Step 05 changes. Added no dependencies and kept the new logic in one module with one focused test script.
- Suggested commit: `feat: implement streak calculations and prototype rewards`
- Commit/push: not performed or verified; left to the user.
- Next: Step 07 — choose and investigate the first compatible learning platform.

## Step 07 — GeeksforGeeks free-article discovery — 2026-10-22

- User selected GeeksforGeeks free pages. Defined the first activity as reading public text articles, initially Python/DSA templates, with unsupported content explicitly excluded.
- Inspected Python Variables, Binary Search and the Python Tutorial hub in isolated Chromium: HTTP 200, headings, canonical URLs, nested article containers, visible text and geometry. Used the hub as a negative example because article markup alone does not establish lesson eligibility.
- Wrote INTEGRATION_GEEKSFORGEEKS.md with canonical identity, proposed active-time and distributed dwell thresholds, idle/background rules, local resume data, permissions and Step 08 acceptance checks.
- Reviewed official terms and searched for documented completion APIs. No public article-completion API was identified. Recorded Browser tracked limitations and unresolved distribution permission without claiming platform approval.
- Verification: direct live-page structure inspection and official-source review. No production code changes; application tests/build were not rerun. No article text/HTML was saved in Git.
- Step 05/06 are now included in local commit f00417e. Remote push was not checked. An unrelated untracked file was left untouched.
- Suggested commit: `docs: define GeeksforGeeks reading integration`
- Commit/push: not performed. Next: Step 08 — implement the article adapter and validate the proposed rule.

## Step 08 — GeeksforGeeks live article adapter — 2026-10-22

- Added a Connections panel with goal selection and optional GeeksforGeeks host permission. Bundled gfg.js is registered/injected only after a connection. Disconnect stops observation, unregisters future injection and attempts to remove site access, explaining when Chrome retains the grant.
- Added article recognition, canonical identity, text-range chunks (up to 40 words), local content fingerprint, visible/unoccluded dwell, a 90-second interaction window, and foreground-only sampling. Long gaps and date boundaries add no unobserved time. A shadow-root page panel displays progress and pause/unsupported explanations.
- Added versioned local reading records, stable article-to-goal binding, qualification-date attribution, daily lesson/minute progress, and the existing prototype streak/XP engine. Duplicate articles cannot re-award. Goal target edits use scheduled rule changes; archive/restore updates the run. Continue saves/restores a chunk position without filling reading coverage.
- Worker validates sender origin/frame, host grant, active tab/window, goal state, evidence shape and elapsed bounds. The implementation remains Browser tracked; it is not a security boundary against a device owner.
- Checks passed: TypeScript; production build/ZIP; reading-rule and streak-rule checks; existing goal/bookmark/restart/migration smoke suite with optional-grant denial; a real 60-second synthetic reading qualification with one 25-XP award, repeated-article deduplication, hidden-tab and overlay pause, bottom-skip rejection, Continue restoration without XP, disconnect and extension-page evidence rejection. Test browser pre-grants only the declared optional origin in an isolated copied package; production consent UI is a manual check.
- Live check in an isolated browser: Python Variables recognized with 755 observed words / 19 chunks and approximately 4 seconds of foreground time; tutorial hub rejected. No full live article completion or platform verification claimed. Visually inspected connection and live-page screenshots.
- No dependencies added. Basic partial reload recovery is present; durable worker restart coordination, atomic transactions, duplicate-tab leases and retry queues remain Step 09. Reading records are bounded to 200 articles / 500 chunks, with a visible error at the limit. Publication/access terms remain unresolved as recorded in the integration note.
- Suggested commit: `feat: track GeeksforGeeks reading and local streaks`
- Commit/push: not performed. The pre-existing unrelated untracked file was left untouched.
- Next: Step 09 — tracking recovery, duplicate tabs, and pending events.


## Step 09 - Tracking recovery (2026-10-22)

- Fixed hidden duplicate tabs clearing the focused reader's timing baseline. Only the active reader can replace another tab's baseline; worker restart starts a fresh baseline without crediting downtime.
- Added durable local completion events with UUIDs, deterministic daily keys, original timestamps and a 1,000-event ceiling. Saved checkpoints precede award processing; ledger updates and queue removal share one persisted value. Replay checks prevent duplicate XP.
- Added persisted error/retry metadata, exponential backoff capped at five minutes, automatic recovery on wake/requests/one-minute alarms, and a pending recovery message in Connections. Reading and goal rule changes wait for pending awards so local events retain their order.
- Moved new-tab Continue intents to session storage with expiry and content identity checks. Existing-tab restoration checks the content fingerprint. Goal changes and their reading-rule updates use one storage API call.
- Added content-script retry messages with a two-to-thirty-second backoff and fresh interaction requirement. No dependency added; alarms permission supports recovery while Chrome is open.
- Validation: typecheck, production build/ZIP, reading-rule and streak-rule checks passed. The new isolated Chromium recovery check passed duplicate-tab timing, loaded-page offline reading, abrupt worker stop, browser restart, stable pending IDs, replay deduplication and retained errors/backoff. Existing goal/UI/browser smoke check passed. Full reading browser regression also passed genuine 60-second qualification, 25 XP, repeated-article deduplication, hidden/overlay pause, bottom-skip rejection, Continue restoration, disconnect and forged extension-page message rejection.
- Limits: checkpoints acknowledged before interruption survive; the final unacknowledged sample can be lost. Chrome can delay alarms. This is a local prototype award queue, not cloud synchronization or trusted XP. Cloud schema is Step 10; ingestion/sync remain Steps 12-13. Local pending awards are preserved rather than expired under the future cloud queue policy.
- Handoff includes exact PowerShell stage/commit/push commands; user performs GitHub publication. No commit or push performed by the agent. Suggested commit: `fix: preserve tracking progress across interruptions`.


## Step 10 - Local database schema and access rules (2026-10-25)

- User chose local preparation because no Supabase development project exists. No cloud resources were created or modified.
- Added a transactional migration for profiles, streaks, versioned rules, runs, provider connections, activity events, provider credits, daily completions, points and milestones. Added composite ownership links, bounds, timezone checks and uniqueness constraints.
- Enabled RLS on all ten tables and explicitly revoked anonymous/client writes. Authenticated users can only read their own records; server-only operations will manage mutations in later steps. The private timezone function has a fixed search path and restricted execution.
- Added exact-pinned @electric-sql/pglite 0.5.11 as a development dependency because this machine lacks PostgreSQL/Docker. npm run test:database executes the actual migration in isolated PostgreSQL with test-only Supabase roles/Auth shims. No database code is bundled into the extension.
- Added setup/secrets guidance, commented future client configuration, and ignored Supabase temporary files. No credentials were added. Goal soft deletion preserves rewards; account deletion cascades owned records.
- Checks passed: migration; owner-only reads for both users across ten tables; all client insert/update/delete attempts denied; anonymous reads denied; private helper denied; cross-owner foreign keys; duplicate event/activity/day/XP/milestone/open-run rejection; rule/evidence bounds; account deletion isolation; TypeScript; production build. npm reported zero dependency vulnerabilities on installation. Extension output remains 284.71 kB.
- Limitations: actual Supabase JWT/Data API behavior and concurrent transactions need hosted/local-stack validation later. Step 12 still owns completion validation and award calculation; this schema alone does not verify evidence. The extension continues using local prototype state. Next: Step 11 sign-in and account connection.
- Suggested commit: feat: add database schema and access policies. No commit or push performed by the agent; exact PowerShell commands provided in the handoff.


## Step 11 - Sign-in and account connection (2026-10-25)

- Added a Settings account screen with unconfigured, code-entry, signed-in, error and sign-out states. Configured builds use the official Supabase SDK (2.118.0) for email OTP, persisted sessions, refresh and user verification. Node types 24.10.1 support build configuration checks.
- Kept auth operations in the worker, restricted callers to extension pages, and restricted local storage to trusted extension contexts before persisting tokens. Responses contain only safe user/goal summaries. Codes stay in component memory and are cleared on submission; no credentials or codes are logged by app code.
- Added project/user-scoped account-goal caches. Sign-out clears credentials/caches even when remote revocation fails. Browser-local prototype progress remains explicitly device-scoped. Storage notifications refresh other account views.
- Added an explicit goal-definition copy operation and a second SQL migration. The restricted SECURITY DEFINER RPC derives auth.uid(), validates a bounded batch, locks the profile and creates goals/rules/runs atomically. UUID deduplication makes retry safe. Links, reading history and XP are excluded; cloud goal editing and activity sync remain later work.
- Added build-time public configuration and a single configured project host permission. Unconfigured builds remain local. Build rejects non-project origins and keys without the publishable prefix. Updated setup/migration/email-template instructions.
- Checks passed: TypeScript; both SQL migrations and owner/write/constraint checks; RPC ownership, rollback, repeat-copy deduplication and no XP import; configured mocked browser email-code flow, invalid code, browser restart, expired-session refresh, two-account switching, offline sign-out, token-free replies, explicit copy payload, content-script storage denial and account-message rejection; existing browser goal/UI regression; normal production build and ZIP. Visually inspected the mocked signed-in Settings screen. Final unconfigured build is 288.53 kB and ZIP is 96.35 kB.
- Mocked checks send no real emails and never contact a real Supabase project. Real delivery, hosted JWT/Data API enforcement, SMTP setup, rate controls and concurrent RPC checks remain external validation requirements. The normal output was rebuilt after the isolated configured fixture. Source is ready locally; no live sign-in/deployment is claimed.
- Next: Step 12, server completion validation and authoritative XP. Suggested commit: feat: add authentication and account-scoped state. No commit or push performed; user receives exact Git commands.


## Step 12 - Server completion validation and authoritative XP (2026-10-25)

- Added a third migration with authenticated submit_reading_event, get_streak_summary and set_reading_connection RPCs. Ownership derives from auth.uid(); privileged functions use fixed search paths and explicit execute grants. No service key or new dependency is needed in the extension.
- Validated supported article paths, exact evidence keys, fingerprints, bounded chunk weights/dwell, minimum active time, 80% coverage, selected rule, active run, connection and owner. Client user IDs, dates, XP, verification labels and extra evidence fields are rejected. Accepted evidence remains Browser tracked and can still be fabricated by a device owner.
- Added account/streak row locks, stable accepted-event replay/conflict handling, cross-goal article deduplication, receipt-day completion rules and atomic daily/milestone rewards. Summary derives current/best streak and XP from server records. Server minute targets count qualified articles' accepted time only; Step 13 must distinguish local preview amounts.
- Added private persistent rate limits (60 fresh attempts/minute/account), a 2,000-event daily ceiling and an 86,400-second rolling 24-hour evidence budget. Business rejections retain no payload. Exact accepted replays reuse the original result; clients must never add its XP twice.
- Added npm run test:ingestion. Passed ownership/anonymous/missing-identity checks; malformed and extra evidence; receipt date; UUID replay/conflict; article/day deduplication; lessons/minutes; archive/disconnect; all five milestone bonuses and duplicate milestone protection; missed days; future rule rejection; minute rate/time-budget limits; denied direct reward writes; and forced reward-write failure with complete transaction rollback. Historical fixtures are seeded only by the test owner, with no production clock override.
- Existing database migration/access checks and TypeScript passed. No extension runtime/UI change was made, so browser tests were not repeated for this SQL checkpoint. No commit or push performed.
- Limits: PGlite is single-connection; actual simultaneous-connection and hosted JWT/Data API checks remain necessary. HTTP body size and gateway/IP abuse controls require deployment configuration. No hosted project was modified and no cloud ingestion is wired into the extension yet. Next: Step 13 cloud synchronization/offline recovery.
- Suggested commit: feat: validate completions and award XP on the server. Handoff includes exact PowerShell Git commands.

## Step 13 - Cloud synchronization and offline recovery (2026-10-26)

- Added opt-in cloud sync using the existing Supabase SDK and Step 12 RPCs. Newly observed articles bind to an account generation, cloud goal/rule and stable event UUID. Existing article history and prototype XP are never imported. No dependency or migration was added.
- Qualification is durably checkpointed before immutable evidence enters the cloud outbox. Background retries run outside the reading checkpoint queue, preserve IDs/payloads, honor rate delays and expire unconfirmed submissions after seven days with an explanation. Server receipt dates remain authoritative; replay responses never increment local XP. Fresh summaries reflect server records, including activity from other devices.
- Added Cloud records to Today, Settings and the popup, showing cached server streak/XP totals, pending/accepted/rejected/expired status, fetch dates, pause and refresh controls. Cloud minute targets count qualified articles only. Local edits do not change copied cloud goals. Existing local progress remains separately labeled.
- Serialized cloud/auth operations, rejected website callers, verified ownership before networking, and removed queue/cache data on sign-out/account changes. The interface warns before sign-out that unsynced submissions will be discarded. New generations prevent old article bindings from being uploaded by a later session/account.
- Checks passed: TypeScript, production build/ZIP, cloud mocked-service/browser checks (opt-in and real adapter binding, no history import, content-script denial, offline/browser restart, stable retry payloads after lost responses, receipt-date display, fresh totals, expiry, stale rules, duplicate activity, rate delay, pause, sign-out and account isolation), existing account/browser tests, dashboard/goals/bookmark smoke checks, full foreground reading browser regression, recovery, reading rules, SQL ingestion and database access checks. Visually inspected Settings and compact cloud popup screenshots. Final unconfigured build: 298.94 kB; ZIP: 99.68 kB.
- The first browser attempt found no browser at Playwright's default sandbox path; reran successfully using the existing test-results/browsers installation. Generated profiles/screenshots and fixture records remain ignored. Mocked tests send no real email and do not prove hosted JWT/gateway behavior or simultaneous-device transactions. No Supabase project was created or deployed.
- Updated setup, architecture and build-plan docs. Next: Step 14 optional reminders, including the logged contextual nudge. Suggested commit: feat: synchronize activity with authoritative cloud progress. No commit or push performed; user receives explicit staging commands.

## Step 14 - Optional reminders and contextual learning nudges (2026-10-26)

- Added per-goal daily reminder and contextual nudge settings, shared quiet hours, optional motivation and a measurable article milestone. Notification permission is optional and requested only when the user saves an enabled reminder. This works with local tracking without Supabase.
- Added a one-minute alarm, local-day deduplication and persisted delivery reservations. Daily/contextual reminders share one automatic reminder per goal/day. Continue reuses the existing tab/resume helper; Snooze schedules a ten-minute follow-up; close dismisses. Returning to reading clears the notification/snooze. Suppressed completed, archived, disconnected, permission-blocked and expired reminders; fresh cached cloud completion also suppresses delivery.
- A contextual nudge requires 30 seconds of validated foreground samples and at least 60 seconds away, with session/daily caps and stale-session expiry. Only source-tab/session metadata is saved; destination URLs are never inspected or stored. Notification text shows device progress and remaining effort, the user's motivation and optional local article milestone without claiming mastery.
- Kept notification operations in the existing worker queue and isolated failures from saved reading/goal operations. Fixed startup when Chrome omits the notifications API before its optional permission is granted; listeners register when available and after permission changes. API delivery failures are visible in Settings and never trigger an automatic same-day retry loop.
- Checks passed: TypeScript, production build/ZIP, reminder browser checks with captured notification calls (daily deduplication/restart, Continue, snooze/dismiss, overnight quiet hours, delayed expiry, permission denial, delivery failure, archive/disconnect/completion suppression, repeated DST hour, real-reader session binding, tab-switch grace, destination privacy, per-session cap, rejected website callers and narrow layout), existing recovery and dashboard/bookmark smoke checks, and the full reading browser regression (foreground qualification, local 25 XP, duplicate/hidden/skip protection, Continue and disconnect). Visually inspected the narrow reminder form. Production build: 313.00 kB; ZIP: 104.00 kB.
- Automated checks use an isolated copied package with a fixture clock and intercepted native notifications; they do not show OS notifications. Actual Chrome permission UI and OS display remain manual release checks. No new dependency, migration, live account or service was added. Updated PRD, architecture, README and build plan. Next: Step 15 history, milestones and interface completion. Suggested commit: feat: add optional streak reminders. No commit or push performed.

## Step 15 - History, milestones and interface completion (2026-10-26)

- Replaced History/Rewards placeholders with real device and cloud views: goal/source selectors, a monthly completion calendar, current/best streak, goal XP, archived history and recorded milestone badges. Reused the local ledger and milestone constants. Empty days make no claim about missed work while disconnected; a reset preserves best streak and earned awards.
- Added a bounded cloud history read through the existing trusted worker/auth lock, verified user and owner-only database reads. Server summaries and actual completion/award rows determine cloud displays. Pending events remain on Today. History is online-only, cleared on authentication changes, with stale async responses ignored and explicit loading/error/retry states. No new dependency, permission, migration or hosted service was needed.
- Added best streak to saved goal cards and surfaced reading/cloud errors previously hidden. Simplified repeated local summary calculations. Added accessible table headers/cell descriptions, native labeled controls, text/checkmark status, responsive milestone/stat cards and long-name wrapping. Fixed hidden skip-link visibility in full-page captures; existing reduced-motion rules apply.
- Passed TypeScript, production build/ZIP, new history browser/calendar checks (leap years, month boundaries, fresh/populated/multiple/archived goals, reset, actual awards, narrow layout, keyboard retry and unconfigured cloud), extended mocked cloud checks (accepted calendar rows, owner/month filters, offline error, refresh and sign-out clearing), existing dashboard/popup/bookmark smoke checks, database owner-only reads and writes, and streak engine regressions. Inspected the narrow history screenshot. Final build 322.67 kB; ZIP 106.90 kB.
- The initial history check exposed an ambiguous selector label, corrected with an explicit accessible name. One smoke invocation overlapped the cloud test rebuild and encountered a missing manifest; rerunning after the build passed. Final typecheck/history checks passed after the small accessibility/refactor changes. Browser tests use isolated fictional records. Live Supabase/Data API verification and native screen-reader review remain release checks; separate server reads can briefly differ if a completion arrives during fetching.
- Updated README, architecture and build plan. Next: Step 16 export, deletion and privacy controls. Suggested commit: feat: complete progress dashboard and accessible states. No commit or push performed. The pre-existing unrelated untracked file was left untouched.

## Step 16 - Privacy controls and data management (2026-10-26)

- Added Settings privacy controls for device/account JSON export, typed CLEAR confirmation for local activity cleanup, account-wide GeeksforGeeks disconnection and typed DELETE confirmation for account deletion. Kept the existing SDK, worker queues, native dialogs and Blob downloads; no dependency or permission was added. Export projects named fields and excludes credentials, account caches, pending submissions and unknown storage keys. Exports are not importable backups yet.
- Device cleanup resets reading baselines/ledger, removes article checkpoints/bookmarks and unsynced submissions, clears reminder state/notifications/alarms and resume sessions, unregisters the reader and requests site permission removal. Goal definitions and sign-in remain for activity-only cleanup. Confirmed account deletion additionally removes all local goals and credentials on the requesting browser. Operations run under both worker queues to prevent erased state being restored by concurrent sampling/sync.
- Added migration 4 with fixed-path authenticated export/deletion RPCs. Ownership derives from auth.uid(), with no caller-supplied account ID. Deletion cascades from auth.users in one transaction, matches ingestion lock order, rolls back on failure and supports an unexpired-token retry after a lost response. Offline/unconfirmed deletion preserves local data. Confirmed account/session invalidation clears account caches on other devices' next check, and sync cannot resurrect the removed queue. Independent device-only activity on those devices remains local.
- Added restricted evidence cleanup after 30 days plus SHA-256 evidence comparison so expired raw payloads do not break exact replay/conflict protection. Completion/XP/activity deduplication records remain. Prepared retention.sql daily evidence and 14-day job-log cleanup schedules; activation requires a future hosted project with pg_cron. Documented the actual current state: no hosted backups, PITR, analytics or log service is configured; production backup/provider-log retention is a release requirement.
- Passed TypeScript, production build/ZIP, new SQL privacy checks (owner-only/empty export, denied anonymous/cleanup access, expiry, retained XP, replay/conflict after cleanup, confirmation, full rollback, repeated deletion, stale-JWT ingestion denial and other-user preservation), browser privacy checks (export payload/filename, credential exclusion, cancel/confirmation, activity/bookmark/outbox/session/alarm/script cleanup, idempotency, narrow layout), extended mocked cloud checks (export, global disconnection, website denial, remotely deleted identity, queue non-resurrection, lost deletion response/retry and credential/local-goal cleanup), existing database/ingestion regressions, dashboard/bookmark smoke and full foreground-reading browser regression. Inspected narrow Settings/Privacy output. Final build 332.42 kB; ZIP 109.58 kB.
- Verification details: the initial SQL export surfaced an ambiguous result variable; renamed it and reran successfully. An incomplete cloud fixture initially crashed the test UI and was corrected. This environment cancels native file persistence even for a standalone plain-page JSON download; checked the emitted download and actual Blob contents instead. Normal Chrome save/open remains a manual release check. One combined test initially missed the workspace Playwright browser-path environment variable; reran with the existing browser installation. Tests use disposable fictional accounts; hosted Auth session cascades, parallel database connections, scheduler activation and provider retention remain external validation.
- Updated PRD, architecture, README, Supabase setup and build plan. Next: Step 17 release validation and operational preparation. Suggested commit: feat: add privacy controls and account data management. No commit or push performed; the existing unrelated untracked file was left untouched.

## Step 17 - Release validation and operations preparation (2026-10-26)

- Added npm run check, a sequential gate covering TypeScript, build configuration, reading/streak rules, SQL ownership/ingestion, dashboard/reading/recovery/account/cloud/reminder/history/privacy checks, packaging and extracted-ZIP release validation. It records HEAD/dirty state, stage results and durations in an ignored JSON report and stops on failure. Sequential execution avoids races between fixture builds sharing .output.
- Added read-only, credential-free GitHub Actions checks for PRs/main pushes and manual runs. Node 24, npm ci and Playwright Chromium are used. Only the aggregate check report and successful development ZIP/checksum are uploaded, with seven-day artifact retention; profiles/exports/screenshots are excluded. Remote CI has not run before the user pushes this checkpoint.
- Added configured-candidate build guards: STREAK_RELEASE=1 requires public Supabase configuration; invalid origins, secret keys and secret-like WXT variables are rejected. Tests prove the configured host permission is scoped. No deployment or public launch is implied by the build flag. Fixed empty cloud origins being treated differently from missing origins in the shared account/cloud storage keys, exposed by the first combined reminder run.
- Added migration 5's private operator-only adapter switch. New cloud acceptance fails closed with PROVIDER_PAUSED when disabled/missing; existing accepted UUID receipts remain replayable. The outbox retains its original immutable evidence and retries after five minutes, subject to the existing seven-day expiry and receipt-day policy. Device-only prototype tracking is independent. SQL tests verify permission denial, pause/no event/no XP and resumption; browser checks verify maintenance text, preserved payload and accepted retry.
- Added package checks that extract the actual ZIP through native Windows ZIP support or Linux unzip, inspect scoped permissions/CSP/file allowlists/entrypoints and recognizable secret patterns, then run clean-profile install and same-path/profile version-change/schema persistence checks. The popup retains the saved goal. This is a controlled current-code fixture, not a claim of Web Store or full previous-binary update validation. Package SHA-256 is written next to the ZIP.
- Added RELEASE_CHECKLIST.md with the PRD acceptance matrix and unresolved hosted/manual gates, plus OPERATIONS.md with migration/SMTP setup, provider pause/resume SQL, spending/alert preparation, forward-fix recovery, outage policy and restore/deletion handling. Supabase's Spend Cap is not represented as a configurable budget-alert system. No live project, paid plan, alert delivery or production retention setting was created. Updated current README status, architecture, PRD, integration record, environment example, build plan and Supabase guidance.
- Final npm run check passed all 17 stages. The first full gate caught the empty/missing-origin issue; the targeted reminder check and complete gate then passed. Windows Expand-Archive could not load its module in the sandbox; the package check now uses the native .NET ZIP library and passed. Production build 332.62 kB; ZIP 109.64 kB, 14 allowed package files. Export Blob/filename checks pass; file persistence remains canceled by the test environment and normal Chrome saving is still a manual check. Native OS notification/permission UI, actual two-connection/JWT/Auth/SMTP behavior and Web Store install/update remain unverified.
- Ran the real provider probe separately. The restricted sandbox could not resolve the domain; the authorized disposable probe with network access succeeded on Python Variables (755 words, 19 chunks, more than three seconds of foreground activity), rejected the tutorial directory, and left the article incomplete. No signed-in account, full live completion, DSA-wide compatibility or learning verification is claimed.
- Next: Step 18 beta packaging/instructions and real-user feedback, while the hosted release gates remain open. Suggested commit: chore: prepare production configuration and release checks. No commit/push performed. Existing unrelated untracked file left untouched. The current local report intentionally records a dirty working tree; GitHub should produce a clean committed-source report after the user pushes.
