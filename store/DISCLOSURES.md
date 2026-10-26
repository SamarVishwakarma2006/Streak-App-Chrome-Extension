# Privacy-practices preparation — owner must review

This is a mapping of current behavior to dashboard disclosures, not a submitted
certification. Review it against the final configured ZIP and policy URL. Current
device-only candidate and future configured account release have different flows.

## Permissions

| Manifest permission | User-facing reason |
| --- | --- |
| storage | Save goals, article checkpoints, local rewards, reminders and optional account/session/outbox state across browser restarts. |
| tabs | Check active/focused reading and locate/focus a matching saved lesson for Continue. Tab metadata is examined for those features; a general history archive is not retained. |
| scripting | Register/inject the bundled article reader after the user connects the supported site. Disconnect unregisters it and blocks further samples. |
| alarms | Retry interrupted submissions/reward recovery and evaluate optional reminder schedules. |
| notifications, optional | Deliver user-enabled daily reminders/contextual nudges with Continue/Snooze actions. |
| https://www.geeksforgeeks.org/*, optional host | Observe relevant supported article content/coverage and restore saved position after explicit site connection. Injection is limited further to supported Python/DSA paths. |
| Configured Supabase project origin, only in configured builds | Authenticate the optional account and submit/read that account's goal definitions, bounded evidence, completion and XP records over HTTPS. No wildcard Supabase host permission is used. |

No `history`, `cookies`, `webRequest`, `downloads` or `<all_urls>` permission is
requested. No remote executable scripts are fetched; the reader and UI ship in
the ZIP. Supabase supplies data responses, not remotely hosted extension code.

## Data handling to disclose and check in the dashboard

| Data category | Actual handling |
| --- | --- |
| Personally identifiable information | Optional account email, and user-entered goal/motivation text if it contains personal details. Goal/motivation text is primarily local; copied goal names can go to the account. |
| Authentication information | The extension's own email-code/session flow. Credentials are local trusted-context state and sent to Auth as needed; never part of exports/diagnostics or feedback requests. |
| Web history / relevant URLs | Supported article URL/path/title and user-approved resume bookmarks; open tab URLs are compared for Continue. Relevant learning history is handled, though general browsing history is not archived. |
| User activity | Foreground/interaction eligibility, bounded dwell/coverage/time and reading position needed for qualification/resume. No arbitrary typed-text logging. |
| Website content | Relevant article DOM text read in memory, chunk sizes and fingerprint; no copied prose stored/uploaded by the app. |
| Other sensitive categories | No intentional collection of health, financial, payment or personal-communication data for these features. Do not request such data through goals or feedback. Reassess if features change. |

Do not select a blanket “no user data” claim merely because default mode is local.
Browser tracked evidence and sanitized paths remain user data; deriving counts or
hashes does not remove the disclosure duty. The final owner must confirm all
dashboard certifications and publish the completed policy before submitting.

Current implementation does not sell data, use it for advertising/credit decisions,
or transmit diagnostic/feedback files automatically. Proposed Limited Use policy
commitment is in PRIVACY_POLICY_DRAFT.md; verify operator practices before certifying.

Sources: [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
[Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use).
