# First integration: GeeksforGeeks free articles

Discovery date: 2026-10-22. User-selected provider: GeeksforGeeks free pages.

## Decision

Build a reading-activity adapter for public, free text articles. Evidence is **Browser tracked**. A qualifying article counts as one lesson; the UI should say “article” for this provider. This is the Step 07 discovery contract, not a shipped connection. Step 08 implements and validates it.

Initial compatibility targets are Python and DSA articles under `https://www.geeksforgeeks.org/python/` and `/dsa/`. Other topics can be added after checking their article templates. A free page is not automatically a supported lesson: tutorial directories, search, category pages, quizzes, practice submissions, account pages, courses, paid content, and embedded videos are excluded. In particular, exclude `/python/python-programming-language-tutorial/`, which is a tutorial hub despite sharing the article template.

## Evidence inspected

An isolated Chromium session opened these public pages without signing in on 2026-10-22. All three returned HTTP 200 with visible text and a same-page canonical URL:

| Page | Heading | Observed structure |
| --- | --- | --- |
| [Python Variables](https://www.geeksforgeeks.org/python/python-variables/) | Python Variables | `.article--viewer_content` and nested `.text`; approximately 716 whitespace-delimited words and 54 h2/h3/p/pre nodes |
| [Binary Search](https://www.geeksforgeeks.org/dsa/binary-search/) | Binary Search | Same containers; approximately 2,712 words and 34 h2/h3/p/pre nodes |
| [Python Tutorial](https://www.geeksforgeeks.org/python/python-programming-language-tutorial/) | Python Tutorial | Same containers; approximately 688 words and 35 nodes; excluded hub control |

These are transient discovery counts, not frozen acceptance values. The inspected nodes have rendered geometry, and `document.visibilityState` reported `visible`. This demonstrates available article/identity/layout signals, not that an end-to-end reader tracker has passed. No article HTML or copied article text is checked into this repository.

No `data-article-id` or `data-post-id` attributes were found in the inspected pages. Do not invent a numeric provider ID. No documented public article-read completion API or webhook was found in the official pages/searches reviewed. This is a limited discovery result, not proof that none exists. Do not use private endpoints, cookies, bookmarks, likes, or a visit as a completion certificate.

## Identity and page recognition

Provider key: `geeksforgeeks`; rule version: `gfg-reading-v1`.

Require an exact HTTPS `www.geeksforgeeks.org` origin, approved path, one article heading and one nonempty `.article--viewer_content .text` body. Avoid generated CSS-module class suffixes. Missing or ambiguous markup means Unsupported, not fallback to the entire page. Explicitly exclude hubs and pages that present lists of lessons rather than a lesson; expand the exclusion fixtures during Step 08.

Use a same-origin `link[rel=canonical]` after validating its path and stripping query/fragment components. Activity key: `geeksforgeeks:` plus that normalized canonical URL. Retain case and encoded path semantics. Never follow an arbitrary external canonical tag. A path is an operational identifier, not guaranteed stable forever: URL moves need explicit alias reconciliation before awarding again. Missing canonical metadata is unsupported in the first adapter.

Use heading text as the local resume title. Continue saves the canonical URL and a content-position anchor/index plus relative offset. Restoring scroll position grants no reading credit.

## Proposed acceptance rule

These thresholds are product choices to validate in Step 08, not GeeksforGeeks completion rules or a claim to prove learning.

1. Extract visible article prose/code only, excluding controls, navigation, recommendations, comments, hidden content and ads. Normalize whitespace, count words as W, and require at least 100 words. Do not persist or upload article text.
2. Split the normalized text into consecutive chunks of at most 100 words. Map chunks to DOM ranges without modifying the article. Coverage is weighted by chunk word count. This avoids giving a huge code block full credit when only its top is visible.
3. Required active time T is `max(60, ceil(W / 200 * 60))` seconds. Require at least T active seconds AND at least 80% covered words. A chunk becomes covered after `max(2, ceil(chunkWords / 200 * 60))` seconds with at least half its rendered range area visible in the viewport. Chunk time is cumulative and capped at its required dwell; revisits do not inflate coverage.
4. Count at most one second per sample, only while the document is visible, its browser window is focused, article content is visible, and a trusted pointer/key/wheel/touch interaction occurred within 90 seconds. Keep only the last interaction timestamp, never keys or input values. A restored or programmatic scroll does not renew the interaction timer. Pause on hidden/unfocused/idle pages or detected blocking overlays. Overlay/occlusion detection remains a Step 08 validation requirement; geometry alone is insufficient.
5. A sample gap over two seconds resets the baseline and adds zero time. Sleep, background throttling, reload and disconnect cannot fill elapsed gaps. Use monotonic elapsed time within a session. Only one focused tab may contribute at a time; duplicate-tab coordination is finalized in Step 09.
6. Emit one completion candidate per previously uncredited canonical article when BOTH thresholds are satisfied. One article can contribute to only one selected goal. Reopening a completed article cannot generate new completion XP. Lesson goals require their configured number of distinct qualifying articles that day. Minute goals require their target eligible reading time AND at least one newly qualifying article that day. Incomplete prior-day time does not backfill a completion; the qualifying event belongs to the day it occurs under the streak's rule.
7. Store a local content fingerprint with chunk dwell, active seconds, resume anchor, and rule version. A changed content fingerprint resets unfinished coverage rather than applying old chunk indexes to new content. Preserve the completed activity identity to prevent re-awards after edits. Cross-session recovery and atomic event submission are Step 09 work.

A fast jump to the bottom exposes only the final chunks; it satisfies neither distributed dwell nor the time threshold. Leaving a tab untouched pauses after the idle window. A determined user can still simulate input or alter browser evidence. Label results Browser tracked, never Platform verified or tamper-proof.

## Access, permissions and data

Request optional access to `https://www.geeksforgeeks.org/*` only when the user connects this provider; inject only on approved article paths. Step 08 will add scripting/optional host configuration. The current bookmark checkbox is not a provider connection or a Chrome host grant. Denial/revocation must stop tracking with a visible explanation.

Read only the article the user opens. No background crawling, auto-solving, account automation, paywall bypass, private API calls, article redistribution, or collection of passwords/form values. Keep URL/title/position locally; any later server submission carries the activity key, bounded coverage/time totals, and rule version, not page HTML.

[GeeksforGeeks Terms of Use](https://www.geeksforgeeks.org/legal/terms-of-use/) restrict automated extraction and unauthorized scripts, while referring to standard browser usage. These terms do not establish approval for this extension. Treat permission to distribute a passive observer as unresolved; resolve with the provider or appropriate review before a public release. This discovery is not legal clearance or a reason to bypass website restrictions.

Browser mechanisms: [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API). Visibility/focus/intersection are activity signals, not proof of attention.

## Step 08 acceptance checklist

- On both inspected articles, identify body, heading and canonical URL; show Browser tracked and the exact thresholds before progress starts.
- Reject the inspected tutorial hub, category/search pages, unsupported topics, missing/changed markup, login/paid screens, quizzes, practice and videos.
- Demonstrate normal reading qualifies; immediate bottom-scroll, hidden tab, idle time and repeated article cannot qualify on their own.
- Verify keyboard reading, long code blocks, zoom/resizing, overlays, navigation, content mutation and duplicate tabs do not invent coverage.
- Verify partial recovery and Continue scroll restoration independently; restore never awards skipped content.
- Validate denied/revoked host access, midnight attribution, lesson/minute goal mapping and one-activity/one-goal deduplication.
- Use local synthetic article fixtures for most regression checks, plus a small live compatibility check. Do not copy third-party articles into tests.

Discovery is complete with the listed limitations. Reading thresholds, overlay handling, optional permissions and resume restoration have not yet been implemented or tested as an adapter. No production UI or manifest changes are included in Step 07.

## Step 08 implementation record (2026-10-22)

Implemented optional-origin connection and runtime script registration for free Python/DSA article pages. The connection chooses one active goal for new articles. The reader maps text to DOM ranges in chunks of **at most 40 words** (within the proposed 100-word upper limit), uses SHA-256 of normalized text locally for content-change detection, and excludes controls/navigation/forms. Smaller chunks keep long code/text sections observable in smaller viewports.

The packaged script reports visible chunks, recent trusted interaction eligibility and bounded metadata. The worker checks top-frame sender origin, current host grant, selected active goal, schema/bounds, active tab and focused window, and caps accepted elapsed time. A baseline is discarded across gaps, focus changes and local date boundaries. Coverage uses geometry plus center hit-testing to reject covering overlays; complex partial/translucent occlusion remains a limitation.

`gfgReading` schema 1 persists partial dwell/seconds, per-date time, qualification date, article/goal binding, resume chunk, and the local prototype ledger. It stores no article prose. Article identity is globally bound to its initial goal; completed articles cannot be re-awarded to another goal. Qualifying articles map to lesson counts, or to minute targets with a new qualifying article on that date. Existing goal target edits schedule a rule revision; archive/restore resets the run using the Step 06 engine. These are local browser records, not accepted cloud completions.

Continue opens/focuses the latest observed article and restores a saved chunk on supported content. Restoration clears the recent-interaction timer and gives no reading credit. Basic partial progress persists across reloads. Worker-restart resume requests, reliable duplicate-tab arbitration, atomic writes/retry queues, and robust crash recovery remain Step 09 work. A local ceiling of 200 article records / 500 chunks per article is explicit; reaching it reports an error rather than deleting data. Privacy/export cleanup arrives in Step 16.

Disconnect clears the selected connection, unregisters future injection and stops current observers/listeners at the next reply. Chrome may retain a managed/required grant; the UI explains removing it in settings. Revoked host access blocks each sample even for an already injected script. Reconnect explicitly re-injects into existing provider tabs.

Validation records and actual remaining limits are in DEVLOG.md. The browser fixture uses synthetic text and an isolated package with the optional origin pre-granted; production permission consent/denial uses Chrome's UI and is still a manual beta acceptance check. Live public-page compatibility confirmed reading signals, not a full live article completion. No video player, quiz or submission adapter is included, and no claim of GeeksforGeeks approval is made.
