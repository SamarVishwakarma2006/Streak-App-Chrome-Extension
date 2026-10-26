# Step 10: local database foundation

The migration defines the ten tables in ARCHITECTURE.md, their ownership links,
uniqueness constraints, row-level security (RLS), and explicit role grants.
It is ready for a fresh development Supabase database. No hosted project has
been created or changed; the user requested local preparation only.

## Run and inspect locally

From the repository folder, after `npm ci`:

```powershell
npm.cmd run test:database
```

This starts an isolated in-memory PostgreSQL engine through the pinned PGlite
development dependency, applies the actual migration, seeds two fictional users,
and checks access rules and constraints. It closes the database afterward. No
Docker, Supabase account, keys, or running service is needed. The dependency is
used only by the script and is not imported into the Chrome extension.

Open `migrations/202610250001_initial_schema.sql` to inspect the schema. This step
has no new extension screen: sign-in and backend connections start in Step 11.
The existing extension continues to use local storage.

## Access contract

| Caller | Access |
| --- | --- |
| Anonymous | No access to application tables or private helpers |
| Authenticated user | Read their own rows on all ten tables; no direct writes |
| Trusted server / service_role | Read and write application tables; bypasses RLS |
| Migration owner | Schema administration |

All goal creation, edits, archive/restore and profile changes will use validated
server operations. This preserves rule history and prevents direct manipulation
of effective dates, run boundaries and acceptance state. Step 11 adds the authenticated copy_goal_definitions RPC described below. The private timezone helper uses a fixed empty search path,
qualified catalog references, invoker privileges and restricted execution grants.

Composite foreign keys prevent linking a rule, run, event or reward to another
owner's streak even when using server privileges. Unique constraints cover event
UUID per user, provider activity credit per user, daily completion per streak,
award keys per user, one daily award per completion, one open run per streak,
and milestone awards per streak. The only allowed evidence label is currently
`browser_tracked`; independently verified integrations require a later migration.

The server remains responsible for authenticating the caller, validating evidence,
deriving receipt dates, enforcing effective rules, rate limiting, and calculating
the correct XP and milestone amounts atomically. Constraints alone do not perform
these operations. Step 12 supplies that logic. Never pass a service key to the
extension, and never treat a request-body user ID as authenticated identity.

Goal deletion will be soft deletion (`status = 'deleted'`) so historical points
remain. Deleting an Auth user cascades through their records. Actual account
deletion and export endpoints are Step 16. No resume URLs or provider secrets
are stored in this schema. Ingestion must allowlist the fields in bounded evidence
JSON; the size check does not itself reject sensitive content.

## Apply to a development Supabase project later

1. Create a separate development project and keep its database password private.
2. In its SQL Editor, run the migration file once. It contains a transaction and
   expects a fresh application schema plus Supabase's existing Auth roles/tables.
   Do not run the test script's Auth shim on Supabase.
3. Confirm all ten application tables have RLS enabled. With two real test users,
   repeat own-row reads, cross-user reads and write-denial checks through the Data
   API using their JWTs. PGlite checks SQL semantics but does not test Supabase Auth,
   JWT verification, PostgREST, delivery, or concurrent connections.
4. In future steps, configure the project URL and publishable key for the client.
   Keep any secret/service-role key only in server secrets. `.env.example` documents
   the planned client names; they enable the Step 11 account flow after rebuilding.
5. Use new versioned migrations for subsequent changes. Do not rerun the initial
   migration against populated tables or drop tables to work around a conflict.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[function privileges](https://supabase.com/docs/guides/database/functions), and
[PGlite's PostgreSQL runtime](https://pglite.dev/docs/about).


## Step 11: enable email-code sign-in

1. Apply `202610250001_initial_schema.sql` to a fresh development project, then
   `202610250002_account_goals.sql`. If Step 10 is already applied, run only the
   second migration. Never run the test harness Auth shim on a hosted project.
2. Enable email sign-in and configure email delivery in Supabase. Set the relevant
   email templates to include `{{ .Token }}` so the user receives a numeric code.
   Configure production email delivery, rate limits and abuse controls before release.
3. Copy `.env.example` to `.env`. Uncomment and fill `WXT_SUPABASE_URL` with the
   project's `https://PROJECTREF.supabase.co` origin (no trailing slash), and
   `WXT_SUPABASE_PUBLISHABLE_KEY` with its `sb_publishable_...` key. Secret keys and
   legacy service-role keys are rejected by the build configuration. Custom domains
   and self-hosted endpoints are outside this first setup flow.
4. Run `npm.cmd run build`, reload the extension at `chrome://extensions`, and
   refresh the dashboard. The configured build requests access to that project
   origin only. Open Settings, enter an email, send the code, then verify it.
5. Press **Copy goal definitions to my account** to upload active goal names and
   daily targets. Each local goal is copied at most once per account; later local
   edits do not silently overwrite cloud definitions. URLs, activity history and
   prototype XP are excluded. Today still shows browser/device goals; cloud activity
   ingestion and synchronization are Steps 12-13.

Session tokens persist in trusted extension storage; content scripts cannot read
that storage. Only extension pages can invoke account actions, and message replies
never include tokens. The SDK refreshes sessions on account access; it does not rely
on a long-running background timer. Identity is checked against Auth before account
reads/copies. Offline account verification reports an error. Sign-out removes local
credentials and account caches even if remote revocation fails; already issued access
tokens may remain usable until expiry. All browser-local prototype goals remain.

Cloud goal caches use project + user keys. Account switching and sign-out clear old
account caches. Codes stay in component memory only and are cleared after submission.
Cloud operations are serialized with other worker mutations; a slow request can
pause reading samples, which never backfill unobserved time.

The new RPC derives ownership from `auth.uid()`, validates a bounded batch, creates
profile/rule/run records together, and uses a unique per-user local goal ID to make
retries safe. The account limit is 100 goals. Direct table writes remain denied.
No acceptance/reward function is exposed.

Run `npm.cmd run test:account` with Playwright Chromium installed to exercise a
configured extension against mocked Auth/Data API responses. The script builds a
fake-project fixture, copies it into an isolated profile, and restores the normal
build. It checks invalid codes, restart, token refresh, account switching, offline
sign-out, token-free replies and definition-only copies. These are local checks,
not proof of real email delivery, hosted JWT enforcement or production readiness.
Before release, repeat the flow with a real development project and two real users.

Reference: [Supabase email OTP setup](https://supabase.com/docs/guides/auth/auth-email-passwordless).


## Step 12: server completion validation and XP

Apply `202610250003_completion_validation.sql` after the first two migrations.
The extension will call this API through its signed-in Supabase client in Step 13;
this checkpoint adds no manual completion button and does not import prototype XP.
No Edge Function or service-role credential is needed for these authenticated RPCs.
Supabase's Data API verifies the JWT; each function independently derives auth.uid()
and checks ownership before privileged writes.

- `set_reading_connection(p_connected boolean)` records explicit account consent
  for GeeksforGeeks ingestion. A profile (created when copying goals) must exist.
- `get_streak_summary(p_streak_id uuid)` returns current/best streak, completed-today,
  active rule ID/target/unit/timezone, goal/account XP, server time and evidence label.
- `submit_reading_event(p_event_uuid uuid, p_streak_id uuid, p_rule_version_id uuid,
  p_activity_id text, p_evidence jsonb)` accepts a qualifying article candidate.

Activity IDs are paths such as `/python/python-variables/`, never full URLs. Evidence
contains exactly these fields (example only, not a claim of actual reading):

```json
{"schema_version":1,"fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","weights":[40,40,20],"dwell":[12,12,6],"active_seconds":60}
```

The validator checks 1-500 chunks of 1-40 words, at least 100 words, bounded dwell,
80% word-weighted coverage, and at least max(60, ceil(words * 0.3)) active seconds.
It rejects additional fields, screenshots/HTML, client dates, user IDs, XP or
verification labels. Evidence is bounded to 16 KiB after JSON parsing. Configure
an HTTP request-body limit at the deployment boundary too: SQL cannot bound the
bytes consumed before a request reaches PostgreSQL. A forged client can still
fabricate plausible evidence; all accepted records remain **Browser tracked**.

The server uses receipt time after acquiring locks to select the current rule and
local date. It never backdates browser evidence. Accepted qualified articles count
once per user/provider across all goals. Lesson targets count accepted articles;
minute targets sum accepted articles' active seconds on their receipt day. Partial
or unqualified article time is not submitted in this first server contract. Activity
collected earlier and uploaded later is attributed to receipt day; Step 13 must
explain that difference from local preview counts. The server does not accept a
client-supplied completion or XP total.

One account lock coordinates cross-goal activity credit, then a streak lock protects
completion writes. Each successful call stores the event, credit, completion and
awards atomically. An accepted UUID replay returns its original response with
`replayed: true`; changed payloads under that UUID return EVENT_CONFLICT. Never add
xp_awarded repeatedly on retries; use the returned authoritative summary (or fetch
a fresh summary, since a replay's snapshot may be older). Rejections do not claim
activity or create reward rows. New requests after a completed day return
already_complete with zero new XP. Business refusals are returned as codes; rejected
payloads are not retained. Unexpected SQL failures roll back the entire call.

Daily completion earns 25 XP. One-time streak milestones add 20/50/100/250/1000 XP
at 3/7/14/30/100 days. Missing yesterday resets current streak while retaining best
and XP. Runs separate reactivations. Receipt dates cannot move backward or overlap
the previous completion's timezone day. Future rule versions cannot be used early.

Fresh submissions are limited to 60 attempts per account per minute; exact accepted
replays bypass that counter. There is a 2,000-event daily storage ceiling and an
86,400-second aggregate budget across the preceding 24 hours. The rate limiter is
private and persists even for business rejections. Gateway-wide abuse/IP limits,
monitoring and real concurrent-connection verification remain release prerequisites.

Common response codes: INVALID_ID, PROFILE_MISSING, GOAL_UNAVAILABLE, RATE_LIMIT,
GOAL_INACTIVE, DISCONNECTED, STALE_RULE, RUN_MISSING, UNSUPPORTED_ACTIVITY,
INVALID_EVIDENCE, INSUFFICIENT_READING, OVERLAPPING_DAY, ACTIVITY_ALREADY_CREDITED,
DAILY_EVENT_LIMIT, TIME_BUDGET_EXCEEDED and EVENT_CONFLICT. Rate-limit responses
include retry_after_seconds; client synchronization/backoff is Step 13.

Run `npm.cmd run test:ingestion` and `npm.cmd run test:database`. Tests use real SQL
with fictional historical fixtures seeded only by the test database owner. There is
no production clock override. Checks cover cross-user denial, malformed evidence,
receipt-date attribution, retries/conflicts, daily/article deduplication, both target
units, every milestone, missed days, future rules, archive/disconnect, limits and a
forced reward-write failure proving transactional rollback. PGlite is a single
connection; actual simultaneous database connections and hosted JWT enforcement
still require a development Supabase/PostgreSQL instance. No live deployment or
independent provider verification is claimed.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions)
and [PostgreSQL row locks](https://www.postgresql.org/docs/17/explicit-locking.html).

## Step 13: extension synchronization

The extension now calls the Step 12 RPCs through its authenticated SDK session. Apply all three migrations before enabling sync. Sign in, copy device goal definitions, connect a device goal to GeeksforGeeks, and enable cloud sync in Settings. Start a new article afterward; existing reading checkpoints and local XP are excluded.

Requests contain only the event UUID, cloud goal/rule IDs, canonical article path and allowed evidence fields. Responses are reconciled by UUID; totals are freshly fetched with get_streak_summary instead of incrementing local XP from a possibly replayed response. RATE_LIMIT schedules a delayed retry, transient errors preserve the immutable request, and business rejections are shown to the user. The server receipt-date policy still applies to offline submissions.

The local cloud queue is owner/generation-scoped and expires pending records after seven days. Pausing retains pending records. Sign-out warns that it discards unsynced records and clears the cloud cache, while shared device-only history remains. Hosted authentication, actual gateway behavior and concurrent-device behavior still need a development project. `npm.cmd run test:cloud` uses a fake network service; it does not deploy or prove those hosted properties.

## Step 16: export, deletion and retention

Apply migrations 1–4 in filename order. Migration 4 adds export_my_account(), delete_my_account(confirmation text), and private.cleanup_expired_evidence(). The export/deletion RPCs are authenticated and always derive their owner from auth.uid(); callers cannot supply a user ID. The fixed-path definer function deletes that identity and cascades application data in a single transaction. This application uses no Supabase Storage buckets. If Storage is added later, owned objects must be handled before account deletion.

Deletion uses the existing authenticated session plus typed DELETE confirmation. It is safe to retry after losing the response while the original access token is still valid. If that token expires after an unconfirmed deletion, sign-in/support verification may be needed; device cleanup is still available independently. Session/identity rejection on other devices clears their account caches on the next online check. Previously issued JWTs can remain cryptographically valid until expiration; deleted identities cannot recreate profiles or ingest activity because the identity/profile foreign keys and RPC checks prevent it.

Run npm run test:privacy for local SQL and browser privacy checks. SQL checks cover ownership, anonymous access denial, full rollback, repeated deletion, an old JWT, evidence expiry and duplicate replay after cleanup. PGlite mocks Auth's identity table and does not prove the hosted Auth session cascade or concurrent database connections. Verify those against a development project before release.

### Evidence and job-log cleanup deployment

After creating a hosted project, enable pg_cron, apply all migrations, then run retention.sql as the migration owner. It creates/updates named daily jobs at 03:17 and 03:37 UTC: raw evidence older than 30 days and cron execution metadata older than 14 days. Inspect cron.job and cron.job_run_details to confirm successful runs. Run select private.cleanup_expired_evidence(); as an administrator to check cleanup manually. Ordinary clients cannot invoke it. A normal daily schedule means evidence may remain until the first successful run after reaching 30 days; monitor failed jobs rather than advertising a strict automatic deadline.

Cleanup preserves the event UUID, activity identifier, result, completion/XP records and an evidence digest for deduplication. It must not delete these while the account exists or old activities could be rewarded again. The extension records no operational request/evidence logs. Job logs contain static cleanup SQL and job status, not evidence payloads.

### Current backup and provider-log status

As of 2026-10-26 there is no hosted Supabase project, production backup, PITR configuration, external analytics or deployed log sink for this app. Local PGlite checks are disposable in-memory databases; ignored browser-test profiles are test fixtures. Downloads are user-controlled copies and account deletion cannot remove them.

Production backup/PITR retention, hosted Auth/database/API logs and any operator-created dumps are **not configured or verified**. Before launch, record the selected project's actual settings, backup expiry and restore handling, and publish them in the privacy disclosure. Do not claim that deleting one account immediately erases it from existing backups. On restoring a backup, reapply confirmed post-backup deletions before reopening service. Keep any deletion audit process minimal and exclude raw activity or credentials.

References: [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data), [Cron quickstart](https://supabase.com/docs/guides/cron/quickstart), [Database backups](https://supabase.com/docs/guides/platform/backups).
