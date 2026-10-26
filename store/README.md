# Chrome Web Store preparation

Status: **local drafts only**. The extension has not been submitted, approved or
published. See STATUS.json for the unresolved owner/service/review requirements.

## Generate the review folder

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Get-Location) 'test-results\browsers')
npm.cmd run store:prepare
```

This runs the existing gate, prepares the checked beta bundle and creates a new
`.output/store-draft-VERSION-TIMESTAMP` folder with:

- The checked extension ZIP, SHA-256, build/source metadata and beta documents.
- Listing copy, policy/disclosure drafts, reviewer guide, release notes and status.
- A 128×128 PNG icon and three 1280×800 screenshots of the actual extension UI.
- RELEASE_INFO.json with asset dimensions/hashes, sample-data labels and blockers.

Captures use a disposable profile and synthetic records. A small caption labels
the sample data; development badges remain visible. The capture fixture pregrants
only GeeksforGeeks in its isolated copy so the connected state can be shown; the
distributable ZIP retains optional site permission. No real account, personal
history, provider article content or participant result is photographed.

The large icon reuses the current mark at 96px with 16px transparent padding.
`store/icon-128.svg` is the editable large-size source; `public/icon/128.png` is its
rasterized package asset. Toolbar sizes retain their existing optical sizing.
The image checks follow [Chrome's image guidance](https://developer.chrome.com/docs/webstore/images).

## Before any upload

1. Resolve every blocker in STATUS.json and the release checklist. Confirm the
   publisher identity, monitored support contact and public policy/support URLs.
2. Configure/test the actual service and privacy/retention settings. Finalize the
   policy and dashboard declarations against the exact package. Do not certify
   “no data collected” when relevant URLs, article activity or account data is handled.
3. Observe real beta setup/completion and address blocking failures. Confirm native
   permissions, notification delivery and export saving in normal Chrome.
4. Finalize the release UI/branding, commit the source, regenerate the checked
   candidate and recapture package-matched screenshots. Draft images are not a
   substitute for this step; do not conceal development warnings in promotional art.
5. Fill reviewer access instructions privately in the developer dashboard. Never
   commit a live sign-in code, password, token or reviewer account secret.
6. Obtain explicit owner authorization before submitting or publishing. Record
   submitted, approved and published as separate observed states, with actual dates
   and item/version identifiers. Do not change STATUS.json to imply approval merely
   because local checks pass.
7. After publication, install/update from the store and verify first use on the
   supported site. No such observation is claimed by these local drafts.

Sources: [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
[Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use).
