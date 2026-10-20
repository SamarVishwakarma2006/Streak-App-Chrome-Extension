# Design foundation

Step 03 baseline, 2026-10-20. The product name is still provisional; `Streak / daily` is a compact display wordmark for this preview.

## Direction

A quiet learning workspace with sage surfaces, dark green actions, and warm milestone accents. Today is the primary destination. Unfinished goals appear before completed goals, with a clear action and visible progress.

## Shared styles

Source: src/styles/base.css.

| Role | Value |
| --- | --- |
| Main text | #203e35 |
| Secondary text | #5b6861 |
| Primary action | #205841 |
| Page background | #f7f8f4 |
| Card surface | #ffffff |
| Border | #e0e5dc |
| Keyboard focus | #a44517 |
| Main radius | 16px; smaller controls use 8px |
| Typeface | Segoe UI, system-ui, sans-serif; no remote font requests |

Use 4/8px-based spacing, strong headings, and restrained decoration. Goal symbols have a color and a text label; color alone does not communicate status. Sample progress uses native labeled progress elements.

## Surfaces

- Popup: 380px wide, designed to fit within Chrome's 600px popup height at default text size. Daily summary, three sample goals, and dashboard access.
- Dashboard: sidebar navigation, Today content, and secondary progress insights. Navigation wraps and the layout becomes a single column on narrow screens.
- Lesson preview: native modal dialog with a close action, Escape support, and focus restoration.
- Upcoming sections: functional navigation to explanatory empty pages, without implying their future features already work.

## Interaction and accessibility

Use semantic headings, landmarks, labeled inputs, visible focus, and a skip link. Normal text targets at least 4.5:1 contrast. Progress indicators target 3:1 against their tracks. Honor reduced-motion preferences by disabling skeleton animations and transitions.

## Demo boundary

All numbers, courses, history, and milestones in this checkpoint are examples. No providers are connected. Continue opens a demo explanation. Nothing is stored or awarded. The dashboard's Preview state selector exposes sample, empty, and loading states for review.

The first real goal-management implementation must distinguish demo content from user records and must never silently import sample activity or XP.

## Saved goals (Step 04)

Today defaults to real, locally saved goal definitions with New goal, Edit, Archive, Restore, and confirmed Delete actions. Forms use native inputs and dialogs. Cards show the daily target and Not connected status without fabricated progress or XP. The popup lists active goals in a bounded scrolling area. The previous sample dashboard is available through Explore design demo and remains separate from saved data.
