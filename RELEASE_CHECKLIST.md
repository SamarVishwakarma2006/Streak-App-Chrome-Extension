# Release readiness — Step 17

Current decision: **local release preparation passed on 2026-10-26; public launch is not approved**.
All 18 local gate stages passed for the current candidate, including beta packaging
checks. Store asset generation/dimension/hash checks also passed separately.
The current report is in test-results/release-checks.json;
CI on GitHub and the hosted/manual checks below are still pending.
There is no deployed Supabase project, production SMTP setup, store submission or
verified production backup policy. This file records evidence, not a claim that
all external launch requirements have passed.

## Repeatable local gate

Use Node 24 and a clean checkout:

```powershell
npm ci
npx playwright install chromium
npm run check
```

On this workspace the browser is already installed; set this before the check:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Get-Location) 'test-results\browsers')
```

Linux needs Playwright's system dependencies and `unzip`; CI installs the browser
dependencies. The runner executes tests sequentially because account/config/cloud
checks temporarily rebuild the same output folder. Child processes use empty public
cloud configuration for the device-only package; account tests use fictional
project values. Do not supply live credentials to these tests.

The gate writes `test-results/release-checks.json`, a ZIP in `.output/`, and
`.output/release-sha256.txt`. The report identifies HEAD, whether the worktree was
dirty, each result and its duration. The package check extracts the actual ZIP,
checks its file types, entry points, scoped permissions and secret-shaped strings,
then loads it into a new profile. A second launch changes only the fixture's
manifest version at the same unpacked path and verifies stored goal/schema
persistence. This is a controlled version-change check, not a Web Store update test
or a complete comparison against an old released binary.

The GitHub workflow runs the same command for pull requests and pushes to main.
It needs no account secrets and has read-only repository permission. It uploads
only the check report, checked development ZIP/checksum and allowlisted beta/store draft bundles, with seven-day artifact
retention. Browser profiles, exports and screenshots are not uploaded. The first
remote workflow run is pending until this change is pushed.

## Acceptance evidence

| PRD requirement | Local evidence | Remaining release check |
| --- | --- | --- |
| Three goals survive browser restart | Dashboard/popup smoke checks | Fresh install in normal Chrome |
| Continue returns to the right article without granting skipped coverage | Bookmark and real-adapter fixture checks | Real learner flow on supported pages |
| Skip and duplicate protection | Foreground dwell, hidden/covered tabs, skipped article chunks, duplicate article/request checks | Videos are unsupported; no video-completion claim |
| Official XP cannot be written directly; owner isolation | SQL roles/RLS and ingestion tests | Hosted JWT/Data API checks |
| Concurrent devices cannot duplicate XP | SQL constraints, profile lock, immutable replay tests | Two real database connections; PGlite is single-connection |
| Midnight, DST, rules, missed days | Pure streak engine and SQL ingestion checks | Hosted timezone/account sanity check |
| Offline receipt-date policy | Cloud mocked-service restart/retry checks | Actual offline/network-loss flow against staging |
| Disconnection and maintenance pause | Reader/reminder tests; operator pause and saved retry checks | Hosted operator pause/resume exercise |
| Export/deletion exclude credentials | Whitelisted Blob contents, SQL ownership/rollback, deletion retry checks | Normal Chrome file save/open; hosted Auth session cascades |
| History, rewards, errors, accessibility | Calendar/milestone, long-name, keyboard, narrow/reduced-motion checks | Screen reader and native permission/notification checks |
| Supported provider layout | Fixtures; separate `npm run test:site` live probe | Log probe outcome below; live full completion remains manual |
| Package/install/update | Extracted ZIP and same-profile version-change fixture | Actual Web Store install/update in Step 19 |
| Listing, privacy, verification labels | Browser tracked labels and current limitations documented | Step 19 listing, support URL, privacy URL and reviewer instructions |

Automated download persistence is canceled by the current sandbox browser even for
a plain-page JSON download. The privacy check verifies download initiation, filename
and Blob contents; it reports this limitation instead of claiming successful saving.
Provider/site probes and automated checks use disposable test profiles, never the
user's installed extension or real account.

## Live provider probe

After a successful build, `npm run test:site` opens the real free Python Variables
article, verifies the current adapter can identify its content and accrue a few
seconds of foreground time, then verifies a tutorial directory is rejected. It
does not claim a completed article, reading comprehension or platform verification.
It is intentionally separate from deterministic CI: third-party outages, consent
screens and layout changes must be recorded as such.

Latest probe: **passed basic Python compatibility on 2026-10-26**. The public
Python Variables page was recognized (755 words across 19 local chunks), recorded
more than three seconds of foreground reading, and the tutorial directory was
rejected. Full live completion, DSA pages, native permission UI and real learner
setup still require manual validation. The first sandbox attempt could not resolve
the domain; the same disposable check succeeded with network access outside that
sandbox. No account or cloud completion was involved.

## Production configuration gate

1. Choose a project region, owner, support contact, public privacy/support URLs,
   monthly budget and published backup/log retention. These are unresolved.
2. Follow [OPERATIONS.md](OPERATIONS.md) to apply all five migrations to staging,
   check RLS/grants and activate retention jobs. Test before applying to production.
3. Configure public project values in the ignored `.env` or deployment environment:

   ```text
   WXT_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   WXT_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
   ```

4. Configure email-code delivery. Supabase's default SMTP is limited to project-team
   addresses; production delivery needs custom SMTP. Confirm the email template
   sends the numeric token expected by the extension, and test delivery, expiry and
   rate limits with two authorized test accounts. [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
5. Build the configured candidate:

   ```powershell
   $env:STREAK_RELEASE = '1'
   npm run zip
   npm run test:release
   Remove-Item Env:STREAK_RELEASE
   ```

   `STREAK_RELEASE` is a build gate, not a secret or launch switch. Missing cloud
   configuration, a non-Supabase origin, a secret key or secret-like WXT variable
   fails the build. Only publishable configuration belongs in the extension.
   Passing this gate does not verify that the project exists, SMTP works, or the
   checklist is complete. Development badges remain until beta/release presentation
   is finalized. Never upload a fixture-configured test package to the store.
6. Verify actual hosted ownership, concurrent ingestion, notifications, export,
   deletion, outage recovery and retention. Record date, package checksum, expected
   outcome and result; exclude credentials and user activity from the report.
7. Use Step 18 for a small beta and Step 19 for the store package and submission.
   Preserve the checked artifact/checksum and tie the published version to its
   committed source. Re-run CI after committing so the report identifies a clean SHA.

The release review follows [Supabase's production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
and [Playwright's CI guidance](https://playwright.dev/docs/ci). Local passing checks
are necessary evidence; the unresolved hosted and user-facing checks remain gates.

## Beta handoff

npm run beta re-runs the complete local gate and builds a new .output/beta-VERSION-TIMESTAMP folder. Read BETA_START_HERE.md, BETA_LIMITATIONS.md and BETA_FEEDBACK.md before sharing it. BUILD_INFO.json records the checked revision, dirty status, ZIP hash and cloud mode; it explicitly leaves participant testing and public launch unapproved. The technical diagnostic download remains user-initiated and manual. Real participant observations and native export saving are still required; a generated bundle is not beta feedback.

## Store review preparation

npm run store:prepare creates a checked draft review folder after the local gate, with the ZIP/hash/source metadata, listing/policy/disclosure/reviewer text, icon and three 1280×800 actual-UI screenshots containing labeled sample records. See store/README.md and store/STATUS.json. All store states remain false; public publisher/policy/support setup, hosted/beta/native checks and final release captures remain blockers. No submission or publication is implied by generating these files.
