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
of effective dates, run boundaries and acceptance state. No client mutation RPC
is exposed yet. The private timezone helper uses a fixed empty search path,
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
   the planned client names; they are not consumed by the extension yet.
5. Use new versioned migrations for subsequent changes. Do not rerun the initial
   migration against populated tables or drop tables to work around a conflict.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[function privileges](https://supabase.com/docs/guides/database/functions), and
[PGlite's PostgreSQL runtime](https://pglite.dev/docs/about).
