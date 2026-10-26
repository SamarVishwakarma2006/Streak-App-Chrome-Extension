# Operations and recovery

Prepared on 2026-10-26. No live service, spending limit, alert destination or
production backup has been configured. These procedures are for a project owner
to execute in a future staging/production environment.

## Deploy in order

1. Run the local release gate in RELEASE_CHECKLIST.md.
2. Create a staging Supabase project using the chosen region. Store administrative
   credentials in the owner's secret manager, never in Git or WXT variables.
3. Apply `supabase/migrations/*.sql` once in filename order, recording each applied
   migration. There are five migrations. Do not re-run the create-table migrations
   against an already-migrated database. Use forward migrations for fixes.
4. Inspect owner-only policies and authenticated RPC grants. The `private` schema
   must not be in the exposed API schemas. Test anonymous denial and two test users
   through the actual Data API, not only the SQL editor's privileged session.
5. Enable pg_cron and apply `supabase/retention.sql` as the migration owner. Verify
   both named jobs execute successfully; see `supabase/README.md` for retention.
6. Set up OTP email delivery and test it with authorized accounts. Configure Auth
   abuse/rate limits and gateway controls before inviting users. The local one-minute
   resend timer is a convenience, not server abuse protection.
7. Build with public project values and `STREAK_RELEASE=1`. Inspect the configured
   ZIP, checksum, account flow and owner-only data access in staging, then repeat
   the deployment checks against production before beta/launch.

No server-role key belongs in a Chrome package. SQL RPCs execute narrowly defined
operations with server-derived identity. This version deploys no Edge Functions,
Storage buckets, analytics SDK or payment service.

## GeeksforGeeks outage switch

Migration 5 adds `private.adapter_status`. Only the migration owner and trusted
service role can change it. Run this in the target project's administrative SQL
editor to stop new cloud acceptance:

```sql
update private.adapter_status
set enabled = false
where provider_id = 'geeksforgeeks';
```

New submissions return `PROVIDER_PAUSED`; no event, completion or reward is created.
The extension keeps the immutable submission and schedules another attempt after
five minutes. Existing accepted UUIDs still replay their original receipt without
new XP. The seven-day outbox expiry and server receipt-day policy still apply during
an outage; the switch does not extend either. Already-submitted RPC transactions
may finish before the administrative change commits.

This switch controls **server acceptance**, not code running on device-only
installations. Local Browser tracked prototype progress can continue. Users can
disconnect local tracking in Connections; a broken adapter must fail closed rather
than inventing completion. A remotely deployed arbitrary-script switch is not used.

After fixing the provider issue and testing the actual page, resume with:

```sql
update private.adapter_status
set enabled = true
where provider_id = 'geeksforgeeks';
```

Confirm a saved submission retries with the same UUID and that one accepted daily
completion produces one reward. To pause an individual account connection, the
user can select Disable account connection in Settings.

## Cost and failure monitoring setup

The owner must set a monthly limit and billing contact before using paid services.
Proposed operator review thresholds are 50%, 80% and 100% of that chosen budget;
these are planning thresholds, not configured notifications.

- Track database storage/egress, authentication/email volume and failures, rejected
  submissions, repeated RPC failures, expired outboxes, cleanup-job failures and
  SMTP-provider spend. Use counts and response codes; exclude email codes, access
  tokens, article URLs and evidence from operational logs.
- Enable the Supabase Spend Cap where available and record its exclusions. It does
  not support arbitrary threshold alerts and does not cap every billable item.
  Check the usage/upcoming-invoice views and select a separate approved monitoring
  process for budget notifications. No notification destination is currently set.
  [Supabase cost controls](https://supabase.com/docs/guides/platform/cost-control).
- Set SMTP-provider limits and its billing alerts separately; Supabase controls do
  not control the email provider's bill. Select an alert recipient and verify a test
  alert before launch. Do not assume an alert was configured by adding this document.
- For a runaway adapter, pause server acceptance, inspect aggregate error counts,
  and fix/retest before resuming. The SQL limiter already bounds each account's
  submissions; anonymous/network-level abuse still needs hosted gateway controls.

## Recovery

**Bad extension update:** pause cloud acceptance if qualification is suspect. Keep
the current stored records and pending UUIDs. Ship a forward extension fix using a
higher version; do not ask users to uninstall/reinstall, which can erase device
data. A same-path unpacked fixture verifies profile persistence locally; Web Store
update behavior still needs its release check.

**Bad database migration:** stop new acceptance, take an approved backup/snapshot,
inspect the failed transaction and apply a tested forward migration. Do not drop
tables or reset the live database to recover a UI issue. Transactions and constraints
preserve award consistency; investigate partial external failures before retrying.

**Network or email outage:** device activity remains local. Cloud outbox items keep
their UUID and evidence for retry, expire after seven days and receive credit on
the server receipt date. Explain that policy to affected users; never backdate or
manually add XP through a client-side workaround. Account/export errors preserve
data until an authenticated result can be confirmed.

**Database restore:** restore into an isolated project first, validate schema/RLS,
reward uniqueness and account isolation, and reapply confirmed deletions made after
the backup before reopening access. Record the recovery point and selected backup
expiry; do not assume deleting a live account removes it from older backups. The
actual backup/PITR and provider-log retention are still unselected release gates.

**Provider layout change:** run `npm run test:site`, capture only technical outcome
and supported-page category, pause acceptance if evidence is unreliable, fix the
adapter and repeat deterministic plus live checks. Never lower evidence requirements
silently to make an incompatible page pass.

## Hosted validation record to complete

| Item | Owner / date / result |
| --- | --- |
| Project/region and applied migration list | Not selected |
| Actual API ownership/anonymous denial | Not run |
| Two-connection duplicate/transaction checks | Not run |
| OTP delivery, expiry, resend/rate limits | Not run |
| Operator pause/resume and immutable retry | Not run |
| Export save/open and Auth deletion/session cascade | Not run |
| Cleanup jobs, log retention, backup expiry, restore drill | Not configured |
| Budget, billing contact and tested alert delivery | Not configured |
| Privacy/support URLs and store/reviewer setup | Not selected |

Keep these entries factual and free of secrets. No deployment or paid plan is
authorized by this runbook alone.
