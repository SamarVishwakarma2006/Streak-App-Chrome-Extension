# Development log

Record one entry per completed checkpoint or meaningful fix. This is a human-written project history, not a dump of runtime logs or user activity.

Implementation progress and GitHub publishing are separate. An entry means the described files/work exist; it does not mean they have been committed, pushed, deployed, or published.

## 2026-10-20 — Steps 00–01: Specification and build roadmap

**Status:** Documentation prepared. No application implementation yet. Commit/push not recorded.

### Changes

- Created PRD.md covering multiple streaks, Continue actions, tracking, rewards, reminders, privacy, and release criteria.
- Created ARCHITECTURE.md covering the extension, Supabase backend, data model, validation, and deployment.
- Added BUILD_PLAN.md with numbered implementation and publishing checkpoints.
- Added README.md as the project entry point and this development log.

### Decisions

- Baseline: Chrome Manifest V3, WXT, React, TypeScript, and Supabase.
- Resume locations remain local in V1; authoritative completion and XP records live on the server.
- Browser-tracked activity is explicitly distinguished from platform-verified activity.
- Implementation proceeds in reviewable checkpoints so the owner can commit/push each update.

### Checks

- Reviewed the documentation for matching scope, data responsibilities, and verification claims.
- No application tests were run; there is no application code yet.

### Open items

- First supported learning website and qualifying activity.
- GitHub remote, repository visibility, and license.
- Product name and final visual identity.
- Development/production service configuration before backend deployment.

### Next

Step 02: repository housekeeping and extension scaffold.

Suggested documentation commit: `docs: establish product specification and build roadmap`

---

## 2026-10-20 — Step 02: Chrome extension scaffold

**Status:** Implemented and checked. Not committed or pushed by the assistant.

### Changes

- Preserved the existing Git repository and its GitHub remote.
- Added WXT, React, TypeScript, strict compiler settings, and exact dependency versions with package-lock.json.
- Added a Manifest V3 background worker, React popup, and a dashboard opened from the popup.
- Added temporary PNG icons with editable SVG source and minimal shared styling.
- Added .gitignore and a credential-free .env.example.
- Documented local installation, development, build, packaging, and browser checking in README.md.
- Added a repeatable Playwright smoke script using an isolated Chromium profile.

### Checks

- `npm run typecheck` passed.
- `npm run build` passed; `npm run zip` rebuilt successfully and produced the extension ZIP.
- `npm run test:smoke` passed in headless Chrome for Testing 151 via Playwright.
- Checked MV3 manifest, all packaged icons, absence of requested permissions, background worker startup, popup rendering, keyboard navigation to dashboard, dashboard reload, narrow-layout overflow, and absence of page errors.
- Visually inspected the popup and dashboard screenshots.
- The browser check loads the popup as an extension page; toolbar pinning and the native popup container remain manual installation checks.

### Decisions and limitations

- No website access or storage permissions are requested until the corresponding feature is implemented.
- Goal management, tracking, authentication, and rewards remain future checkpoints.
- Supabase is not configured and no user activity is collected.
- Validation browser files, profiles, screenshots, generated output, and dependencies stay outside Git through ignore rules.
- Temporary icon PNGs were generated from public/icon/source.svg. They are committed assets; regeneration is not required to build.

### Next

Step 03: design foundation and Today interface.

Suggested commit: `chore: scaffold Chrome extension with WXT and React`

---

## 2026-10-20 — Step 03: Today interface and design foundation

**Status:** Implemented and checked. Not committed or pushed by the assistant.

### Changes

- Replaced the scaffold landing screens with a sage-green Today interface and compact popup.
- Shared goal cards show sample lessons, progress, streak lengths, and Continue/Done actions.
- Added daily completion summary, example weekly activity, and a milestone preview.
- Added hash-based navigation for Today, History, Rewards, Connections, and Settings; future-feature sections explain their current availability.
- Added selectable sample, empty, and loading previews.
- Continue actions open a native demo dialog, with keyboard dismissal and focus restoration.
- Added shared color styles, focus indicators, reduced-motion support, responsive layouts, and DESIGN.md.
- Updated the README and build checklist.

### Checks

- TypeScript passed; production build and ZIP packaging passed.
- Browser smoke checks passed for worker startup, popup height under 600px, three sample goals, keyboard navigation, dialog Escape/focus restoration, all five navigation destinations, empty/loading states, reduced motion, reload, and overflow at 1200px, 768px, and 360px.
- Checked a long goal title for wrapping and confirmed no page errors.
- Inspected desktop, narrow-layout, and popup screenshots.
- Measured key color contrast pairs; darkened secondary text after finding insufficient contrast on the milestone background. The corrected pair measures 4.95:1. This is not a full accessibility audit.
- The initial sandbox build could not replace the OneDrive output directory (EPERM); rebuilding with approved access succeeded.

### Decisions and limitations

- All goals, courses, weekly activity, milestones, and XP remain clearly labeled examples.
- Continue opens an explanation; real lesson resume, goal creation, persistence, and tracking belong to later steps.
- The display wordmark `Streak / daily` is provisional, not a finalized product name.
- No new dependencies, permissions, or cloud services were added.

### Next

Step 04: multiple goals and persistent local storage.

Suggested commit: `feat: add Today interface and shared design styles`

---

## Entry template

Copy this template above this section when recording the next update:

```markdown
## YYYY-MM-DD — Step NN: Short title

**Status:** Complete / partial / blocked. State publishing separately if known.

### Changes
- What was implemented and why.

### Checks
- Exact check performed and actual result.
- Anything not checked and the reason.

### Decisions and limitations
- Relevant behavior, tradeoff, or unresolved dependency.

### Next
Step NN: next concrete outcome.

Suggested commit: `type: concise description`
```
