# Beta feedback checklist

Status: **not started with participants**. This is a blank template, not a set of
results. Use one short session first, then ask the participant to try the product
again after a week if they choose. No automatic measurements are collected.

## Maintainer preparation

- Agree a private feedback channel and explain what will be recorded before
  inviting anyone. Do not publish contact details in the product without approval.
- Start with 3–5 volunteers who already learn from supported free articles. This
  cohort size is a proposed plan, not actual recruitment or a growth forecast.
- Provide the same checked bundle and retain its BUILD_INFO.json/checksum. For
  cloud testing, finish staging/SMTP/privacy checks before inviting users.
- Ask permission to observe setup. Do not request screen recordings, private
  browsing history, access tokens, email codes, screenshots or raw activity exports.
- Explain Browser tracked limits and that this candidate may miss activity.

## One session — participant checklist

Record **pass / fail / not tried**. Short optional comments must omit personal
details, goal names, article titles/URLs and account information.

| Task | Result | Optional sanitized note |
| --- | --- | --- |
| Install the extracted extension without help | Not collected | |
| Create the first goal and understand the daily target | Not collected | |
| Understand and grant/decline website access | Not collected | |
| Recognize a supported article and the progress panel | Not collected | |
| Read a whole article normally and see the daily completion | Not collected | |
| Understand local prototype XP versus cloud records | Not collected | |
| Reopen the browser and use Continue | Not collected | |
| Understand History and earned milestone rewards | Not collected | |
| Optionally configure a reminder or contextual nudge | Not collected | |
| Save and open a technical report, after reviewing it | Not collected | |
| Disconnect tracking and understand data cleanup | Not collected | |

Ask: What was confusing? Did anything interrupt reading? When did you doubt the
progress? Would you use this on your next learning day, and why? Ask for the type
of missing integration or feature, without collecting the participant's history.

## Reporting a failure

Use only the extension version, task category, expected behavior, observed state
(for example, unsupported page / no progress / pending / rejected / notification
not shown), and reproducible steps with generic placeholders. Include browser
major version/OS family only if needed for the issue. No account/email identifiers,
lesson URLs, raw errors containing private data, or copied developer-console logs.

An optional **Export beta diagnostics** file may help. The participant should
review it before sharing; its counts still describe usage. Never substitute
Export device data or Export account data. Do not paste diagnostics into a public
issue by default.

## Manual aggregate tally

Aggregate only voluntarily supplied responses. Do not store participant names,
contact details, stable IDs, exact session times or article information in this
repository. Keep any consent/contact management outside the aggregate report and
remove detailed feedback after resolving/summarizing it under the agreed process.

| Measure | Numerator / denominator | Current result |
| --- | --- | --- |
| Setup to first goal | Participants who created a goal / participants who attempted setup | Not collected |
| First local completion | Participants with an observed real article qualification / participants who attempted reading | Not collected |
| First accepted cloud completion | Participants with an accepted server completion / participants in a configured cloud test | Not collected; cloud setup pending |
| Continue worked | Successful Continue attempts / attempted Continue tasks | Not collected |
| Weekly return (self-reported) | Voluntary respondents reporting use during the next week / week-follow-up respondents | Not collected |
| Tracking failure | Reading attempts with a reported failure / reported reading attempts | Not collected |

Report the denominator and number of follow-up respondents alongside a percentage;
do not label a self-reported follow-up as a verified retention rate. Do not infer
consumer demand from internal tests. With a tiny cohort, prefer counts and comments
over impressive-looking percentages. Skip a metric when participation is too small
to report without identifying someone.

## Fix log and beta exit decision

For each reproducible failure, open a sanitized issue/task, link the regression
check and record its fix in DEVLOG in a separate checkpoint. Re-run the affected
checks and observe the task again. Do not fill in fabricated feedback or repair
activity records to make a beta look successful.

Before store submission: observe a fresh setup and real supported-article
completion, resolve blocking setup/tracking failures, confirm privacy/export and
native permission behavior, and close the hosted gates in RELEASE_CHECKLIST.md.
Current decision: **no participant observations or beta exit decision yet**.
