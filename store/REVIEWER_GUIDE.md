# Reviewer guide draft

The current package is a development candidate. **Do not submit while the blockers
in STATUS.json or RELEASE_CHECKLIST.md remain open.** No store account or review
credentials have been configured. Never put a real email code/password/token in Git.

## No-account path

1. Install the submitted ZIP through the normal review tooling and open the popup,
   then dashboard. Create three goals. Confirm browser restart preserves them.
2. Make one goal 1 lesson/day. In Connections choose it, connect GeeksforGeeks and
   grant the optional origin. Declining should preserve goals without tracking.
3. Open the public Python Variables article linked in BETA_START_HERE.md. Read with
   the tab visible and browser focused until the panel qualifies it. Qualification
   is based on distributed coverage and minimum foreground dwell/time, not a button
   that a reviewer can click to grant XP. The current adapter tracks articles only.
4. Inspect Today, History and Rewards. The day's target can complete once; opening
   Continue, revisiting the same article or jumping to its bottom must not award
   skipped coverage or duplicate rewards. A restored position is not completion.
5. Check multiple goals, archive/restore and export/cleanup. Use disposable data
   when confirming CLEAR. The design demo is explicitly sample data and does not
   affect saved goals, rewards or cloud records.
6. Reminders are optional and need notification permission; use a short test time
   outside quiet hours. Contextual nudges require an unfinished tracked session and
   an away grace period. OS/browser delivery constraints are documented.

## Configured account path — must be prepared before submission

The maintainer must provide a supported reviewer sign-in procedure privately in the
developer dashboard and ensure authorized code email delivery works. No universal
review bypass, automatic completion endpoint or shared live secret is implemented.
The current device-only package cannot exercise hosted features.

With a configured staging/review service, use email-code sign-in, copy active device
goal definitions and explicitly enable cloud sync. Start a new article afterwards;
local checkpoints and XP are not imported. Server receipt-date policy, immutable
retries, provider-maintenance pause and seven-day expiry are documented in the
operator/runbook and listing drafts. Actual hosted JWT isolation, concurrent-device
awards, retention jobs and Auth deletion/session cascades must pass before upload.

Use only disposable reviewer data for account deletion (typed DELETE). It removes
the account and local goals/activity on the requesting browser. Do not ask reviewers
to edit storage or lower reading thresholds to speed up a completion.

## Assets and scope

Generated screenshots are labeled sample data from the real UI in an isolated test
profile. Development badges remain; these are draft review assets and must be
recaptured from the final release UI/package. They show no participant results,
external-account success, GeeksforGeeks partnership or verified learning claims.

Public privacy/support URLs, publisher identity and policy details are not yet
set. They must work without requiring sign-in before submission. Store install,
approval, publication and post-publication first-use remain unobserved.
