# Streak Maintaining App — Product Requirements

Version: 1.0  
Date: 2026-10-20  
Status: Implementation baseline; first learning platform remains to be selected.  
Companion document: [ARCHITECTURE.md](ARCHITECTURE.md)

## 1. Purpose

Help people maintain daily learning habits across supported websites. Users can create multiple streaks, resume their work, automatically record qualifying activity, and earn points for consistent effort.

The product starts as a Chrome desktop extension. Its main promise is: **continue your learning, understand what counts, and see your progress recorded automatically.**

## 2. Intended users and problem

The first audience is independent learners who study in Chrome and switch between lessons, videos, or practice activities. They lose their place, forget daily goals, and find manual habit logging inconvenient.

Start with one learning platform and one clearly defined activity. Investigate its completion signals and authorized API access before advertising compatibility. No named platform is promised by this document.

## 3. Product principles

- Returning to an activity takes one click from its streak card.
- Users can see the completion rule before starting and the evidence afterward.
- Access is limited to websites explicitly connected by the user.
- Progress survives normal browser restarts.
- Missed days reset current streaks while preserving learning history and lifetime points.
- Verification labels describe the actual evidence, without claims of being impossible to bypass.
- Tracking failures must be visible and distinguishable from incomplete activity.

## 4. First public release

| Capability | Requirement |
| --- | --- |
| Multiple streaks | Create, edit, archive, and delete independent daily goals. |
| Website integration | One tested integration with a documented compatibility and verification level. |
| Automatic tracking | Record progress while the supported activity is actually taking place. |
| Continue | Open or focus the saved lesson page; restore position where the site supports it. |
| Streak calculation | Count consecutive qualifying calendar days in the configured timezone. |
| Rewards | Award daily XP and milestone bonuses once, using server rules. |
| Notifications | Optional reminders for unfinished goals, with quiet hours and a Continue action. |
| Account | Email code sign-in, cloud progress, and account deletion. |
| Dashboard | Today, history/calendar, current/best streaks, XP, connections, and settings. |
| Data controls | Explain retention; support export, deletion, and website disconnection. |

A local development prototype may precede accounts. The public release uses server records for authoritative completion and XP, even when the evidence is only browser-tracked.

## 5. Main user journeys

### 5.1 First use

1. Install and open a short onboarding screen.
2. Review supported activities and how tracking works.
3. Sign in by email code and confirm the suggested IANA timezone.
4. Connect a supported website, granting access only to that website.
5. Create a goal and see its completion rule and verification label.
6. Open the lesson through Continue and receive visible tracking feedback.

Notification permission is requested when the user enables reminders, after the first goal exists.

### 5.2 Daily learning

1. Open the popup and select Continue on an unfinished streak.
2. Resume the saved page, signing into the learning website if necessary.
3. The integration saves partial progress and reports tracking status.
4. Qualifying activity is submitted for server validation.
5. The UI shows the accepted completion, updated streak, and awarded XP.

### 5.3 Interrupted learning

Save checkpoints during activity, not just when the tab closes. Closing a tab or Chrome does not erase previously saved checkpoints. Abrupt shutdown can lose the latest unsaved seconds; never promise exact restoration after every crash.

On return, Continue opens the saved activity. Opening a saved video position never grants credit for the skipped portion.

### 5.4 Missed day

If a scheduled day has no accepted completion, the current streak is broken. Keep the resume location, best streak, activity history, and lifetime XP. The next qualifying completion begins a new streak at one day.

## 6. Goal and day rules

- V1 supports daily goals only; weekly schedules and rest-day policies come later.
- A streak has a name, provider, activity rule, timezone, reminder setting, and saved resume target.
- A day runs from local midnight to the next local midnight in the configured IANA timezone, including daylight-saving transitions.
- Each streak can qualify at most once per local date.
- Today being unfinished does not break a streak before today's deadline. A missing prior scheduled day does.
- Goal-rule and timezone changes take effect at the next boundary under the existing schedule, with a recorded version. They cannot rewrite past completions or create overlapping eligible dates.
- Archiving stops future tracking and reminders. Reactivation begins a new streak run; historical records remain.
- Removing a streak does not remove previously earned lifetime XP. Warn that its history will be removed from the normal interface.
- V1 does not include streak freezes, paid restoration, or manual backdating.

## 7. Completion and verification

### 7.1 Evidence levels

| Label | Meaning | Limit |
| --- | --- | --- |
| Platform verified | Server independently checks an authorized platform completion record or authenticated webhook. | Proves what that platform records; does not prove attention or mastery. |
| Browser tracked | Extension observes qualifying activity and server applies validation rules. | Resists accidental or casual shortcuts; determined users can fabricate browser evidence. |

Manual completion is outside the first release. If added later, it must have its own label and must not be presented as verified.

Verification level is stored per completion. Server storage alone never upgrades evidence quality. Unsupported pages cannot silently fall back to a weaker rule.

### 7.2 Video rule for a supported video integration

Default proposed rule: play at least 90% of the eligible video's unique timeline at a supported playback speed between 0.5x and 2x. Show this rule in the UI. Each integration may define a stricter rule before release.

- Count only observed continuous playback intervals; seeking grants no credit for the gap.
- Merge overlapping intervals so replayed sections do not inflate coverage.
- Exclude paused, buffering, advertisement, and unsupported playback states.
- For the initial video rule, require the lesson tab to be visible; explain this before tracking starts. Visibility is a tracking policy, not proof of attention.
- Save position separately from coverage.
- Preserve accepted partial coverage when the same unfinished activity is resumed.
- Previously accepted lessons cannot repeatedly earn fresh completion rewards in V1.
- Unknown duration, inaccessible players, and incompatible embeds show an unsupported state.
- Completion is evaluated when the threshold is reached; prior partial viewing days do not receive retroactive streak credit.

V1 must not claim it can prove someone watched attentively or learned the material. A quiz or platform completion record may strengthen an integration where available.

## 8. Rewards

Initial configurable defaults:

| Achievement | XP |
| --- | ---: |
| First accepted completion for a streak's local date | 25 |
| 3 consecutive days | 20 bonus |
| 7 consecutive days | 50 bonus |
| 14 consecutive days | 100 bonus |
| 30 consecutive days | 250 bonus |
| 100 consecutive days | 1,000 bonus |

Milestones are awarded once per streak and milestone across its lifetime, preventing repeated resets from farming bonuses. No additional daily XP is awarded for exceeding the goal. The same provider activity cannot earn completion XP across multiple streaks. Rewards are personal motivation; cash redemption and public competitive rankings are outside V1.

## 9. UI and UX

### Popup

Show today's streak cards, current streak counts, progress, evidence labels, and prominent Continue buttons. Include a direct link to the full dashboard. Prioritize unfinished goals without hiding completed ones.

### Dashboard

Provide Today, history/calendar, rewards, connected websites, and settings. Use readable typography, calm colors, accessible contrast, keyboard navigation, visible focus states, and reduced-motion support. Support narrow popup dimensions and larger browser windows.

### Required states

Empty, tracking, partially complete, pending sync, accepted, rejected, disconnected, unsupported, signed out, permission denied, provider unavailable, and missed-day states must have meaningful text and next actions.

A completion explanation should say, for example, “18 of 20 minutes played; 90% coverage reached,” and display Browser tracked. Avoid “verified” wording for this state.

## 10. Resume history and privacy

- Store only relevant connected activity, not the user's general browsing history.
- Store a sanitized canonical page URL, title, provider/activity ID, position, and progress checkpoint.
- Keep resume URLs and playback position on the device in V1. Cloud cross-device resume is a later feature.
- Allow only HTTPS resume destinations on the connected provider's approved domains. Strip unnecessary tracking parameters and never save authentication tokens in resume URLs.
- Do not collect passwords, screenshots, keystrokes, or arbitrary page contents.
- Export excludes authentication credentials and platform tokens.
- Uninstalling removes local extension data; it does not automatically delete the cloud account.
- Account deletion removes active cloud records and clears local data on the requesting device. Other signed-in devices clear account credentials/caches when an invalid account or session is detected online; their independent device-only activity is not remotely erased. Backup retention must be documented before launch.

Authentication credentials are separate from activity history. An account-based product necessarily handles its own login session and may hold authorized platform tokens on the server.

## 11. Reminders and reliability

- Reminders are opt-in and suppressed for completed, archived, or disconnected goals.
- Support a local reminder time, quiet hours, and at most one automatic reminder per streak per local day in V1, shared by daily and contextual reminders. A user-requested ten-minute snooze may deliver a follow-up; returning to reading cancels it.
- Clicking a reminder opens the relevant saved activity.
- Chrome closure and device sleep can delay or prevent reminders. Never advertise guaranteed delivery in those states.
- Offline browser events are queued locally and shown as pending. On reconnection, browser-tracked completions qualify on the server receipt date, not a user-supplied historical date.
- Platform-verified records may use the platform's independently obtained completion time, subject to a documented seven-day reconciliation window.
- Temporary integration failures must not be presented as proven user inactivity. Provide an explanation and support path; no unverified automatic backfill.

### Contextual learning nudge

When a user opts in and leaves an active supported learning page before meeting today's goal, offer a small, dismissible reminder to return. Name the goal, show today's device progress and the remaining amount, and include the user's optional motivation. An optional article milestone shows qualified articles recorded for that goal on this device; do not infer progress toward mastery or an open-ended aspiration. Actions: Continue and ten-minute Snooze buttons; closing the notification dismisses it.

Trigger from leaving or switching away from the currently tracked learning activity after at least 30 seconds of active reading. Require at least 60 seconds away, cancel on return, and allow at most one contextual nudge in a session (sessions reset after 30 minutes without active reading). Discard away signals older than 15 minutes. Do not classify destination sites as procrastination, read general browsing history, or collect destination URLs. Use an optional Chrome notification rather than injecting into unrelated websites. Both reminder modes obey the shared daily limit and quiet hours.

Daily reminders are eligible for up to 60 minutes after the chosen time in the learning timezone. Snoozes expire 15 minutes after their due time and cannot cross into another learning day. Delivery requires a currently connected active goal with a saved Continue location and notification permission. Suppress when local completion or a same-day cached cloud completion is known; cloud changes may take until the next refresh to become visible. Reserve a delivery before invoking Chrome so worker interruption cannot cause a duplicate; delivery failures can lose a reminder and are shown in Settings. No guaranteed OS display is claimed.

## 12. Out of scope

Mobile apps; Firefox/Safari releases; arbitrary user-defined page scripts; universal website compatibility; continuous browser-history collection; facial/attention monitoring; competitive rankings; monetary rewards; AI coaching; social feeds; paid streak repair; and claims of perfect cheating prevention.

## 13. Delivery stages

1. **Integration discovery:** select the first provider; document permission needs, completion evidence, API availability, and unsupported cases.
2. **Local prototype:** popup, dashboard, multiple streaks, Continue, local persistence, and illustrative XP clearly marked as local prototype data.
3. **Tracking:** implement the first adapter, checkpoints, duplicate-tab handling, and clear compatibility states.
4. **Cloud baseline:** accounts, authenticated ingestion, database policies, day calculations, deduplication, and transactional rewards.
5. **Release preparation:** reminders, exports/deletion, accessibility, integration failure handling, privacy disclosures, and store assets.
6. **Beta and launch:** invite a small cohort on the supported provider, fix observed problems, then submit to the Chrome Web Store.

The public MVP does not require a platform API if unavailable; it must then launch with honest Browser tracked labeling.

## 14. Release acceptance criteria

- Create at least three independent streaks and restore them after restarting Chrome.
- Continue returns to the correct activity and never grants skipped progress.
- A skipped video section and repeated playback cannot inflate unique coverage.
- Duplicate tabs, retried requests, and concurrent devices cannot issue duplicate completion XP.
- Users cannot write official completions, XP, or another user's records directly through the database API.
- Editing local data cannot change authoritative cloud XP; fabricated browser evidence remains a disclosed limitation.
- Midnight, DST, timezone changes, goal edits, and missed days produce the defined results.
- Offline submissions follow the stated receipt-date policy.
- Website disconnection stops tracking and reminders.
- Account export and deletion work and exclude secrets.
- Provider incompatibility and tracking failures are understandable in the interface.
- Store listing accurately describes permissions, data use, supported sites, and verification limits.

## 15. Product validation

Measure setup-to-first-goal conversion, first accepted completion, Continue usage, weekly return usage, and tracking failures. Use aggregate event names and provider identifiers; do not send resume URLs or raw page content to analytics. Initial beta research should establish baselines before setting numerical growth targets.

## 16. Decisions still needed

- First learning provider and qualifying activity: required before implementing its adapter.
- Product name and final visual identity: working name is Streak Maintaining App.
- Repository visibility and license: public source was recommended but not authorized as a final publishing decision.
- Production domain, service plans, email delivery setup, support contact, and backup retention: required before public launch.

## 17. Change control

This file owns product behavior. ARCHITECTURE.md owns implementation structure. Changes to verification promises, stored data, reward rules, or supported platforms must update both documents where relevant before release.

### Step 05 prototype scope

Before integration discovery, users may explicitly approve a site and save a manual HTTPS lesson bookmark. This is separate from a connected provider and carries no tracking claim. The production provider-only Continue rule above applies to automated adapter resume targets. The prototype strips query strings/fragments and does not yet restore playback positions, verify page availability, or support query-dependent lesson identifiers.

## Step 16 delivery note (2026-10-26)

Settings now offers device/account JSON exports, typed confirmation for device activity cleanup and account deletion, and account-wide GeeksforGeeks disconnection. Device cleanup preserves goal definitions and cloud records; confirmed account deletion clears all local goals and activity on the requesting device. Exports omit authentication credentials and queued evidence. Migration 4 and the retention schedule are prepared locally. Hosted deletion/session verification, activated retention jobs, actual production backup/provider-log retention and normal Chrome file saving remain release checks.
