# Build plan and GitHub checkpoints

This is the implementation sequence for [PRD.md](PRD.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

Each numbered step is one reviewable update, normally one commit and push. If a step becomes too large, split it into smaller working commits and record them under the same step. Do not mark work complete merely because files were created.

## How we will work

1. Start the next unfinished step and explain its intended outcome.
2. Implement that step, including necessary documentation changes.
3. Run checks appropriate to the change and record actual results.
4. Update [DEVLOG.md](DEVLOG.md) and the checklist below.
5. Report what changed, how to try it, checks performed, limitations, and a suggested commit message.
6. Hand the update back to you for your GitHub commit/push. Continue the next checkpoint when you ask.

You control GitHub publishing. These documents do not record a successful push until you confirm one or it is independently verified. A push to GitHub does not publish an extension update to the Chrome Web Store.

## Progress checklist

- [x] 00 — Product and architecture documents
- [x] 01 — Build sequence and development log
- [x] 02 — Repository housekeeping and extension scaffold
- [x] 03 — Design foundation and Today interface
- [x] 04 — Multiple goals and persistent local storage
- [ ] 05 — Continue buttons and saved activity locations
- [ ] 06 — Local streak rules and prototype rewards
- [ ] 07 — First integration discovery
- [ ] 08 — First website adapter and live tracking
- [ ] 09 — Tracking recovery, duplicate tabs, and pending events
- [ ] 10 — Cloud database and access rules
- [ ] 11 — Sign-in and account connection
- [ ] 12 — Server completion validation and authoritative XP
- [ ] 13 — Cloud synchronization and offline recovery
- [ ] 14 — Reminders and notification actions
- [ ] 15 — History, milestones, and interface completion
- [ ] 16 — Export, deletion, and privacy controls
- [ ] 17 — Release validation and operational preparation
- [ ] 18 — Beta package and user feedback
- [ ] 19 — Chrome Web Store submission and launch

## 00 — Product and architecture documents

**Outcome:** A written contract for what the app does and how it will be built.

- Deliverables: PRD.md and ARCHITECTURE.md.
- Check: cross-reference feature scope, evidence labels, persistence, and server responsibilities.
- Suggested commit: `docs: define product requirements and architecture`
- Status: files created; commit/push not recorded.

## 01 — Build sequence and development log

**Outcome:** Work is divided into updates you can log and push.

- Deliverables: BUILD_PLAN.md, DEVLOG.md, and README.md.
- Check: each implementation step has a concrete result and completion check.
- Suggested commit: `docs: add implementation checkpoints and development log`
- Status: files created; commit/push not recorded.
- If step 00 has not been committed, both documentation steps can be your first commit.

## 02 — Repository housekeeping and extension scaffold

**Outcome:** A minimal extension loads in Chrome.

- Inspect Git setup and existing remotes; do not overwrite or publish an existing repository.
- Add .gitignore, a safe .env.example, package scripts, and dependency lockfile.
- Scaffold WXT, React, TypeScript, Manifest V3, popup, dashboard, and background entry points.
- Add temporary packaged icons and installation instructions.
- Keep secrets, dependencies, build output, and local environment files out of Git.
- Check: build/type-check succeeds; load the unpacked extension and open its popup/dashboard.
- Suggested commit: `chore: scaffold Chrome extension with WXT and React`
- Status: implemented and checked on 2026-10-20. TypeScript, production build, ZIP packaging, and isolated Chromium extension smoke check passed. Commit/push not recorded.

## 03 — Design foundation and Today interface

**Outcome:** The app has a coherent visual direction and usable navigation.

- Establish typography, spacing, colors, buttons, focus styles, and reduced-motion behavior.
- Build Today cards, progress indicators, Continue affordances, and dashboard navigation.
- Any example content is visibly demo data.
- Check: popup sizing, keyboard navigation, contrast, and empty/loading states.
- Suggested commit: `feat: add Today interface and shared design styles`
- Status: implemented and checked on 2026-10-20. TypeScript, production packaging, keyboard/dialog navigation, preview states, reduced motion, and responsive browser checks passed. All displayed activity remains demo data. Commit/push not recorded.

## 04 — Multiple goals and persistent local storage

**Outcome:** Users can manage multiple daily goals and retain them after restarting Chrome.

- Add create/edit/archive/delete flows and versioned local storage.
- Require confirmed supported-provider configuration before claiming tracking works.
- Preserve data during extension updates through explicit migrations.
- Check: create three goals, edit/archive them, restart Chrome, and confirm restoration.
- Suggested commit: `feat: add persistent goal management`
- Status: implemented and checked on 2026-10-20. TypeScript, production ZIP, goal lifecycle, popup synchronization, browser restart persistence, invalid-input rejection, unknown-schema preservation, and responsive browser checks passed. Commit/push not recorded.

## 05 — Continue buttons and saved activity locations

**Outcome:** Each goal returns the user to its saved activity.

- Save validated activity IDs, sanitized URLs, title, and supported resume position.
- Open or focus an existing matching tab.
- Handle missing pages, invalid destinations, permissions, and expired website login.
- Site-specific position restoration is completed with the adapter in step 08.
- Check: correct destination, persistence after restart, and rejection of unsafe/unapproved URLs.
- Suggested commit: `feat: add saved activity locations and Continue actions`

## 06 — Local streak rules and prototype rewards

**Outcome:** The prototype calculates daily streaks consistently.

- Implement calendar-day boundaries, missed days, best streak, and the PRD reward schedule.
- Include effective goal changes and timezone transitions.
- Use development fixtures to exercise completion, clearly labeled as prototype data.
- Do not expose a production manual-completion bypass.
- Check: midnight, missed days, DST, duplicate completions, and one-time milestones.
- Suggested commit: `feat: implement streak calculations and prototype rewards`

## 07 — First integration discovery

**Outcome:** We know exactly which website and activity the first adapter can support.

- Select the provider with you; this is the first outstanding product choice.
- Document permitted access, stable activity IDs, observable completion signals, and API availability.
- Record unsupported page/player cases and whether evidence is browser-tracked or platform-verified.
- Produce an integration note with the exact acceptance rule and limitations.
- Check: demonstrate that the proposed signals exist on the real target activity.
- Suggested commit: `docs: define first learning integration and completion rules`
- Dependency: provider selection is required here; it does not block steps 02–06.

## 08 — First website adapter and live tracking

**Outcome:** Real activity updates progress automatically.

- Implement the approved adapter and request site access during connection.
- If the selected integration uses video, measure unique played intervals, exclude seek gaps, and prevent replay inflation.
- Restore supported video position independently of earned coverage.
- Show evidence level, paused/incompatible states, and completion explanation.
- Check: actual supported lesson flow, navigation, partial playback, seeking, and changed activity identity.
- Suggested commit: `feat: track activity on the first supported website`

## 09 — Tracking recovery, duplicate tabs, and pending events

**Outcome:** Interruptions and retries do not lose saved checkpoints or multiply activity.

- Save checkpoints during activity and recover after worker/browser restart.
- Coordinate duplicate tabs and persist stable submission IDs.
- Add the bounded pending queue, backoff, and visible recovery/error states.
- Check: duplicate tabs, abrupt worker termination, browser restart, and disconnected network.
- Suggested commit: `fix: preserve tracking progress across interruptions`

## 10 — Cloud database and access rules

**Outcome:** The backend schema and authorization rules are ready.

- Add migrations, constraints, RLS, and restricted server operations from the architecture.
- Add documented development configuration and server-only secret requirements.
- Configure a development Supabase project once account access is available.
- Check: cross-user access fails; direct client completion/XP writes fail; uniqueness constraints hold.
- Suggested commit: `feat: add database schema and access policies`
- External dependency: Supabase project/access. Source preparation can proceed before deployment.

## 11 — Sign-in and account connection

**Outcome:** Users can sign in and access their own cloud records.

- Implement email code flow, session restoration, sign-out, and account-scoped caches.
- Connect local goal definitions to the account without silently uploading resume URLs.
- Never import local prototype XP as trusted cloud rewards.
- Check: invalid/expired codes, restart, sign-out, account switching, and expired sessions.
- Suggested commit: `feat: add authentication and account-scoped state`

## 12 — Server completion validation and authoritative XP

**Outcome:** The server controls accepted completions and point awards.

- Implement authenticated ingestion, ownership checks, rule validation, date policy, and rate limits.
- Award daily completion and XP atomically with deduplication.
- If discovery confirmed an authorized provider API/webhook, implement independent verification.
- Otherwise retain Browser tracked labeling; never imply independent verification.
- Check: forged user IDs, duplicate/concurrent submissions, invalid evidence, milestone duplicates, and direct reward edits.
- Suggested commit: `feat: validate completions and award XP on the server`

## 13 — Cloud synchronization and offline recovery

**Outcome:** The interface distinguishes local progress, pending submissions, and accepted cloud records.

- Connect the durable queue to ingestion and reconcile server responses.
- Follow server receipt-date rules for browser evidence and the documented provider reconciliation policy.
- Preserve event UUIDs across retries and explain rejected or expired submissions.
- Check: offline-to-online transition, midnight reconnection, conflicting devices, and retry after an interrupted response.
- Suggested commit: `feat: synchronize activity with authoritative cloud progress`

## 14 — Reminders and notification actions

**Outcome:** Users can enable reminders that lead directly back to unfinished work.

- Implement reminder settings, quiet hours, alarms, daily deduplication, and Continue actions.
- Suppress reminders for completed, archived, or disconnected goals.
- Explain closed-browser and sleeping-device limitations.
- Check: permission denial, delayed alarms, quiet hours, restart, and click destination.
- Suggested commit: `feat: add optional streak reminders`

## 15 — History, milestones, and interface completion

**Outcome:** The dashboard communicates real progress clearly.

- Connect calendar/history, best streak, XP, milestones, and website status to actual records.
- Finish empty, loading, error, pending, missed-day, and success states.
- Complete keyboard support, responsive layout, contrast, and reduced motion.
- Check: fresh account, populated account, long goal names, multiple goals, and API failure.
- Suggested commit: `feat: complete progress dashboard and accessible states`

## 16 — Export, deletion, and privacy controls

**Outcome:** Users can control and remove their data.

- Implement account export, local activity deletion, website disconnection, and account deletion.
- Exclude credentials from exports and logs.
- Implement evidence/log cleanup and document actual backup retention.
- Check: export contents, tracking stops after disconnection, repeated deletion requests, and local cleanup.
- Suggested commit: `feat: add privacy controls and account data management`

## 17 — Release validation and operational preparation

**Outcome:** Release acceptance criteria are checked and failures resolved.

- Run the PRD acceptance checks and document results.
- Add repeatable CI checks without embedding secrets.
- Prepare production migrations/configuration, budget alerts, recovery notes, and adapter-disable behavior.
- Verify production authentication/email delivery and supported-site compatibility.
- Check: packaged production build and a clean install/update path.
- Suggested commit: `chore: prepare production configuration and release checks`
- External dependency: production service access and decisions about plans, domain, support, and retention.

## 18 — Beta package and user feedback

**Outcome:** A small group can try a documented release candidate.

- Package the extension and write installation/use instructions and known limitations.
- Prepare an explicit beta feedback checklist and privacy-safe aggregate measurement.
- Resolve actual setup/tracking failures in separately logged fixes.
- Record feedback without identifying users or publishing their activity.
- Check: observe a fresh setup and real completion on the supported site.
- Suggested commit: `docs: prepare beta package instructions and feedback plan`
- Actual beta results require real participants; do not mark them complete from internal testing.

## 19 — Chrome Web Store submission and launch

**Outcome:** A review-ready extension is submitted, then published after approval.

- Prepare final icons, screenshots, listing text, compatibility list, privacy policy, and reviewer instructions.
- Ensure permission and data-use declarations match the implementation.
- Build the release ZIP and create release notes tied to the source commit.
- Submit through the developer account when authorized.
- Record submitted, approved, and published as separate states.
- Check: store installation and first-use flow after publication.
- Suggested commit: `release: prepare first Chrome Web Store release`
- External dependency: developer account, required registration, submission authorization, and store review.

## Commit and push routine

After a checkpoint, review the actual diff and stage only the intended files:

```powershell
git status
git diff
git add <specific-files-for-this-update>
git diff --cached
git commit -m "<suggested-message>"
git push
```

The placeholders must be replaced. This assumes a Git repository, configured remote, and tracked branch already exist. Repository setup and the first upstream push need the actual repository URL and branch; do not guess them.

For the current documentation batch, the intended files are README.md, PRD.md, ARCHITECTURE.md, BUILD_PLAN.md, and DEVLOG.md. Suggested combined message: `docs: establish product specification and build roadmap`.

Keep credentials, .env files, user exports, browser profiles, and raw operational logs out of commits. Keep source, migrations, dependency lockfiles, and human-written development notes in Git.

## Checkpoint handoff format

Every implementation handoff should include:

- Step number and completion state.
- What changed and the user-visible result.
- How to try the update.
- Checks actually run and their results.
- Remaining limitations or external dependencies.
- Suggested commit message and next step.

DEVLOG entries belong in the same commit as the work they describe. Git supplies commit hashes and history; do not add an extra commit merely to record the preceding commit's hash.
