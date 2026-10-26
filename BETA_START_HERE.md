# Streak beta — start here

This is a private testing candidate, not a Chrome Web Store release. The default
package works on this browser without an account. Cloud features require a project
prepared by the maintainer; BUILD_INFO.json says whether this package has cloud
configuration. Hosted release checks are still pending.

## Install

1. Use a desktop Chrome profile you are comfortable using for beta testing. Keep
   your normal work separate if you prefer. Mobile browsers are not supported.
2. Save this whole bundle somewhere permanent. Extract `extension.zip` into a
   permanent folder such as `Documents/StreakBeta/extension`. The folder you load
   must directly contain `manifest.json`, `dashboard.html` and `background.js`.
3. Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and
   select that extension folder. Pin the extension from Chrome's toolbar menu.
4. Click the extension and open its dashboard. The development badge is expected.
   No learning website is connected yet; notifications start disabled.

No terminal, Node installation or Supabase account is needed to use the extracted
extension. If a managed/work browser prevents Developer mode, do not bypass its
policy; report that setup is unavailable. Installation does not verify all release
requirements or make the tracking impossible to forge.

## Try one real learning session

1. In **Today**, make a goal with a target of **1 lesson per day**. Use a name of
   your choice; do not include personal details in feedback.
2. In **Connections**, choose that goal, press **Connect GeeksforGeeks**, and allow
   the optional site access. Declining should leave your saved goal intact.
3. Open [Python Variables](https://www.geeksforgeeks.org/python/python-variables/),
   a free individual article. Free Python/DSA articles matching the adapter's
   supported layout are the beta scope. Tutorials/directories, quizzes, exercises,
   paid/login content and videos are not tracked.
4. Read normally with the tab visible and browser focused. The Browser tracked
   panel reports observed coverage and active time. Distributed reading of the
   article is required; jumping straight to the bottom should not complete it.
   A changed/unsupported layout must report an error instead of granting progress.
5. When the panel says **Article qualified**, check **Today**, **History**, and
   **Rewards**. A qualifying new article that meets the day's target gives one
   completed day and 25 local prototype XP. Do not manually edit storage or use
   sample/demo data to complete this test.
6. Close/reopen the article or browser and use **Continue**. It should reopen the
   saved article and restore the reading position where supported. A restored
   position gives no skipped reading credit. Record only pass/fail in feedback.
7. Optionally enable a reminder in **Settings**. Chrome asks for notification
   access only then. Quiet hours, browser/device sleep and operating-system
   notification settings can affect delivery. A contextual nudge needs at least
   30 seconds of unfinished reading and a minute away; it does not inspect the
   destination website. Motivation text is optional and stays local.

Reading signals show browser-observed activity, not proof of attention, learning,
or GeeksforGeeks approval. Local progress can be edited by the device owner.
There are no competitive or cash-value rewards in this beta.

## Cloud testing, only when the maintainer has prepared it

The device-only package cannot sign in. If BUILD_INFO.json says cloudConfigured is
true, first confirm the maintainer has completed the staging setup and given you
the privacy/support information. Sign in with the email code, copy your goal
definitions in Settings, then explicitly enable cloud sync. Start a **new** article
after enabling it. Earlier device history and prototype XP are not imported.

Cloud credit is based on the day the server receives the submission. Offline
submissions retain their ID for retry, expire after seven days and can receive
credit on a later day. Cloud minute targets count qualified articles only. If the
provider is paused for maintenance, the submission stays pending and retries later.
The cloud and local views can therefore differ; record the state, not your email
or article history, in feedback.

## Send feedback by choice

Use `BETA_FEEDBACK.md`. There is no automatic analytics or feedback upload.
The maintainer must agree a private feedback channel before recruiting testers;
no support address has been invented for this package. Never post an account/data
export, console dump, email code, goal name, lesson URL or screenshot of personal
activity in a public issue.

For technical context, choose **Settings → Export beta diagnostics** and review
the JSON before sharing. It contains the app version, permission flags and counts,
not names, links, emails, identifiers or raw evidence. Counts can still describe
your usage, so sharing remains optional. The separate device/account data exports
contain private activity and are not diagnostic reports.

## Update or stop testing

For an unpacked update, close tracked pages, replace files inside the **same**
loaded folder with the new extension files, then press **Reload** on
`chrome://extensions`. Keep the same browser profile and folder path. Do not remove
and reinstall to update: changing extension identity or uninstalling can lose data.
After reloading, check your goals and reconnect only if prompted. Report an update
failure instead of trying to repair storage yourself.

To stop tracking, disconnect in **Connections**. To clear local activity, use
**Settings → Your data → Clear device activity**; type CLEAR only if you intend to
erase local streaks/XP, bookmarks, reminders and unsynced submissions. Definitions
remain. Device/account exports can be saved for your records, but importing them
is not implemented. Uninstalling removes extension data and does not delete a
cloud account. Cloud deletion has a separate typed DELETE confirmation and clears
all extension goals/activity on the requesting browser.

Read `BETA_LIMITATIONS.md` before relying on this candidate for an important habit.

Chrome reference: [Load, pin and reload an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world). Content-script updates also require reopening/reloading the learning page.
