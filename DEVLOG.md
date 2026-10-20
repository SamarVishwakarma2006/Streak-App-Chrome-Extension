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
