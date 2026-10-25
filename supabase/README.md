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
