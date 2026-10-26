# Privacy policy draft — Streak Maintaining App

Draft prepared 2026-10-26. **Not a published policy.** Publisher identity, contact,
hosting/service details and actual provider backup/log retention must be completed
and approved before public use. No public policy URL has been deployed.

## Purpose and information handled

The extension supports daily learning goals, article reading qualification, Continue
bookmarks, history/rewards and optional reminders. It handles goal names/targets,
sanitized lesson URLs/titles, relevant article identifiers, reading position,
foreground activity/coverage, local completion records and reminder preferences.
Optional motivation text can appear in an OS notification; choose text you are
comfortable showing there.

Article text is read in memory to form chunks and a content fingerprint. The app
stores bounded coverage/timing/fingerprint data, not a copy of article prose. It
excludes page forms and does not read other websites' passwords, email contents,
screenshots or arbitrary keystrokes. User-entered sign-in email/code are handled
only for the extension's own optional account flow.

With website permission, bundled code runs on supported GeeksforGeeks article paths.
General browsing history is not archived. Continue checks open tab URLs to reuse a
matching saved lesson. Contextual reminders keep source-tab/session metadata, not
the URL of a different destination website. Manual bookmarks can open user-approved
HTTPS lesson links without enabling automatic tracking on those other sites.

## Where data goes

In device-only mode, goals, resume links, reading checkpoints and prototype XP stay
in Chrome extension storage. This is profile storage, not an encrypted vault or a
backup. Someone with control of the browser/device may access or change it.

When an account service is configured and the user signs in, Supabase Auth handles
the sign-in email and numeric verification code. The extension persists its own
session credentials in trusted extension storage. The configured email provider
delivers codes. Provider/operator/region/contact details for a live deployment:
**not selected; complete before publication**.

Cloud sync is separately opt-in. The user may copy active goal definitions and
submit newly started articles' canonical paths and bounded reading evidence to
their account. Saved resume titles/URLs/position and earlier prototype XP are not
imported into cloud records. Server receipt dates determine cloud completion days.
Cloud and device records are therefore different views. No third-party platform
login tokens or GeeksforGeeks passwords are collected.

There is no advertising, data sale, automatic analytics SDK or automatic feedback
upload in this version. Manual diagnostic exports contain version/configuration,
permission flags and counts, excluding names, URLs, account identifiers, evidence
and raw errors. The user decides whether to review/share them. Device/account
exports are private activity files and must not be mistaken for diagnostics.

## Data use and access

Data is used to provide and maintain the learning-streak features described above.
For a configured account, it is processed by the chosen hosting/authentication/email
services for those features. The operator must finalize the service/contact details
and confirm support-access procedures before publication. Support should review
only information the user chooses to share, with access otherwise limited to
necessary security/operational or legally required handling.

Proposed publisher commitment for final confirmation: information obtained through
browser APIs is used in accordance with the Chrome Web Store User Data Policy and
its Limited Use requirements, for the disclosed learning-streak purpose. It is not
used for advertising, resale, credit decisions or unrelated profiling.

## Retention and user controls

Local records remain until the user clears them, removes the extension/profile,
or loses that profile. Disconnecting stops tracking but preserves saved history.
Clear device activity erases article checkpoints, local XP/streaks, bookmarks,
reminders and unsynced cloud submissions; it keeps goal definitions and sign-in.

Sign-out clears account credentials/caches and discards unsynced submissions on
this browser. Cloud records remain until account deletion. Confirmed account
deletion removes active account records and identity and clears local extension
goals/activity/credentials on the requesting browser. Other devices clear invalid
account caches when detected online; independent device-only activity on those
devices and already-downloaded files are not remotely erased.

Unconfirmed cloud submissions expire after seven days. Accepted account completion,
XP and deduplication records remain while the account exists. A prepared daily
cleanup can remove raw reading evidence after 30 days while keeping a digest and
results for duplicate protection. It must be activated and monitored in deployment;
this development project has no hosted scheduler or backups configured.

Actual production backup expiry, provider/API/Auth logs, recovery/deletion handling
and applicable operator retention: **not selected or verified**. These must be
disclosed before launch. Do not promise immediate removal from existing backups.
User-downloaded exports remain under the user's control; import is not supported.

## Contact, changes and publication gate

Publisher/legal identity: **required**. Privacy/support contact: **required**.
Public policy/support URLs: **required**. Effective date: **set on actual publication**.
Keep this policy consistent with the exact package, dashboard declarations and
hosting configuration. This draft must not be presented as a finalized public policy.
