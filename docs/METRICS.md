# WIOF Metric Definitions

**Status:** draft for approval (Phase 2 step 2, 2026-11-04). Written from the code as it is on `feat/phase2-step2-metrics`.
**Why this exists:** Planet Passport milestones will be built on these numbers, so each one needs a written definition: its source, formula, unit, time basis, whether a reset clears it, and how far it can be trusted (Foundation Hardening Plan v4 §16).

## How a number is made

```
browser event ──► firestore.rules ──► onActivityLogCreated ──► user_metrics/{uid}
                  (exact shape,        (content exists,          (counts accepted
                   count-once IDs)      thresholds; verdict)       events only)
```

- **Raw events** live in `activity_log`, one document per event. Each one gets a `validation` verdict, `accepted` or `rejected` with a reason. Rejected events are kept as evidence and never counted.
- **Metrics** live in `user_metrics/{uid}`. They're derived data: `scripts/recompute-user-metrics.js` can rebuild them from the raw events at any time, with the same code the server uses.
- **Take Action** has its own source of truth: `user_actions` and `user_action_completions`, with strict rules of their own.

### Trust levels

| Level | Meaning |
|---|---|
| **Verified** | Computed by the server from data the browser can't choose. |
| **Checked** | The browser reports it happened. The server checks that it's possible: the content exists, the thresholds are met, and the event isn't a repeat. |
| **Self-reported** | The user says they did it. Rules stop repeats and impossible values, but nothing confirms the act itself. |

A Passport milestone must state the trust level of the metric it uses. Self-reported milestones are fine for everyday actions ("start simple", Roadmap §10), but they must not be presented as verified.

### Time basis

- **Timestamps** are server time (`request.time`), never the browser's clock.
- **Calendar days** are the user's local day (`YYYY-MM-DD` in their browser's time zone). The server rejects a day more than one day away from its own date, so a browser can shift an event into a neighbouring day but no further.

## Metrics

### Content

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `blogsRead` | My Journey "Blogs Opened" | Distinct blogs with an accepted `blog_read`. A read under the blog's slug and one under its document ID count as one blog. | blogs · lifetime | Checked: the blog exists. |
| `qualityReads` (new) | My Journey "Quality Reads" | Distinct blogs with an accepted `blog_read_complete`. **Quality read:** scrolled past 75% of the article **and** stayed at least 60% of its estimated reading time (word count ÷ 200 words a minute). The server recomputes the reading time from the stored blog and allows 10% slack for word-count differences. | blogs · lifetime | Checked |
| `lastBlogReadDate` | "Last read" date | Latest accepted `blog_read` timestamp. | timestamp | Checked |
| `videosWatched` | not shown | Distinct videos with an accepted `video_view` (video page opened). The video ID must be a valid YouTube ID; WIOF has no video catalogue to check it against. | videos · lifetime | Checked (format only) |
| `videosCompleted` | My Journey "**Videos Watched**" | Distinct videos with an accepted `video_watch_complete`: the player reported at least 75% of the video's length reached. | videos · lifetime | Checked (format only) |
| `pollsVoted` | "Polls Voted" | Distinct polls with an accepted `poll_vote`. The poll must exist. | polls · lifetime | Checked |

### Reflection

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `lastEqScore`, `lastEqDate` | "EQ Score" + date | Score of the latest accepted `eq_completion`. **The server scores it** (`submitEqAssessment`) from the 24 answers (1–5): each dimension (attention, clarity, reparation) is the sum of its 8 answers (8–40), and the score is the sum of the three. | points, 24–120 · latest | **Verified** |
| EQ history / trend | My Journey EQ list | Every accepted `eq_completion`, newest first (up to 50). | — | **Verified** |

### Action (Take Action)

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `totalActionsCompleted` | "Actions Taken" | Sum of `completionCount` over the user's `user_actions`. DAILY actions count at most once per local day; repeatable actions every time. | completions · lifetime | Self-reported |
| `uniqueActionsCompleted` | home panel | Number of distinct actions completed at least once. | actions · lifetime | Self-reported |
| `actionsByElement` | element progress | Completions per element (air, water, earth, energy, spirit), from each action's elements when it was completed. An action with two elements counts toward both. | completions per element | Self-reported |
| `lastActionAt` | — | Latest completion time. | timestamp | Self-reported |
| Action streak | flame badge on a DAILY card | Consecutive local days, ending today or yesterday, with a completion of that action (`user_action_completions`). Computed when the card loads, not stored. | days | Self-reported |

### Visits (on the user profile, `users/{uid}`)

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `daysVisited` | — | Signed-in local days with a visit (`recordUserVisit`). | days · lifetime | **Verified** (server clock; the browser supplies only its time zone) |
| `currentStreak` | "N-day streak" | Consecutive local days with a visit. A missed day resets it to 1. | days | **Verified** |
| `longestStreak` | "Best: N-day streak" | Highest `currentStreak` ever reached. | days | **Verified** |
| `loginCount` | — | Sign-ins (`recordLoginMetrics`). | sign-ins · lifetime | **Verified** |
| Active day | — | A local day with a `daily_visit` event (at most one per user per day, by its document ID). | day | Checked |

## Resets

"Clear My Engagement Data" (`resetEngagementData`) deletes the user's `activity_log` and saved content, and zeroes the visit counters and every `user_metrics` field.

**Open question:** it zeroes the Take Action counters in `user_metrics` but keeps `user_actions`, so "Actions Taken" shows 0 while each action card still shows its completions. The next recompute then brings the counters back from `user_actions`. Options:
- also clear `user_actions` (a full reset);
- keep the action counters (a reset clears reading/watching only).

Recommendation: keep the action counters. Clearing them is what users would least expect from a button about engagement data, and it stops the recompute from undoing the reset.

## Changing a definition

1. Update this document.
2. Change `functions/activity-validation.js` and/or `functions/user-metrics.js` and their tests. Bump `VALIDATOR_VERSION` if a check changed.
3. Dry-run the recompute on staging, review the changes, then apply. Do the same on prod with approval.
