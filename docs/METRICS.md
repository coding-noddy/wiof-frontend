# WIOF Metric Definitions

**Status:** draft for approval (Phase 2 steps 2–3, 2026-11-04). Written from the code as of 8.3.0.
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
| `qualityReadsByElement` (8.5.0) | My Journey "elements explored" | Quality reads per element (air, water, earth, energy, spirit): each distinct quality-read blog counts once, toward its category's element. Blogs without an element category don't count here (they still count in `qualityReads`). | blogs per element · lifetime | Checked |
| `lastBlogReadDate` | "Last read" date | Latest accepted `blog_read` timestamp. | timestamp | Checked |
| `videosWatched` | not shown | Distinct videos with an accepted `video_view` (video page opened). The video ID must be a valid YouTube ID; WIOF has no video catalogue to check it against. | videos · lifetime | Checked (format only) |
| `videosCompleted` | My Journey "**Videos Watched**" | Distinct videos with an accepted `video_watch_complete`: the player reported at least 75% of the video's length reached. Recorded against the YouTube video ID wherever the video was watched (video page, In Focus, coffee conversation, NGO, hero video), so the same video in two places counts once. Watches recorded before 8.2.0 used a title or topic as the ID and still count, once each. | videos · lifetime | Checked (format only) |
| `pollsVoted` | "Polls Voted" | Distinct polls with an accepted `poll_vote`. The poll must exist. | polls · lifetime | Checked |

### Reflection

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `lastEqScore`, `lastEqDate` | "EQ Score" + date | Score of the latest accepted `eq_completion`. **The server scores it** (`submitEqAssessment`) from the 24 answers (1–5): each dimension (attention, clarity, reparation) is the sum of its 8 answers (8–40), and the score is the sum of the three. | points, 24–120 · latest | **Verified** |
| EQ history / trend | My Journey EQ list | Every accepted `eq_completion`, newest first (up to 50). At most two are saved per user per day (8.8.0): `submitEqAssessment` writes each to a fixed slot `{uid}_eq_completion_{day}_{1|2}`; a third check that day is scored and shown but not saved. Guests' checks are never saved. | — | **Verified** |

### Action (Take Action)

| Metric (field) | Shown as | Formula | Unit · time basis | Trust |
|---|---|---|---|---|
| `totalActionsCompleted` | "Actions Taken" | Sum of `completionCount` over the user's `user_actions`. DAILY actions count at most once per local day; repeatable actions every time. | completions · lifetime | Self-reported |
| `uniqueActionsCompleted` | home panel | Number of distinct actions completed at least once. | actions · lifetime | Self-reported |
| `actionsByElement` | element progress | Completions per element (air, water, earth, energy, spirit), from each action's elements when it was completed. An action with two elements counts toward both. | completions per element | Self-reported |
| `lastActionAt` | — | Latest completion time. | timestamp | Self-reported |
| `impactTotals`, `impactByMonth` | "Your impact" (My Journey) | Estimated savings per measure (water L, electricity kWh, CO₂ kg, plastic items, food kg). Each completion counts its action's recipe (`actions/{id}.impact`, snapshot on the `action_completed` event) at the default amount; an accepted `impact_reported` ("About how much?", one per completion, capped at the recipe's maximum) replaces that amount. Worked out on the server only (`functions/impact.js`). Completions before 8.14.0 count at the current recipe's default (recompute). Conservative estimates, always shown as "about". | estimate · lifetime, and per India-time month | **Self-reported estimate**. A Passport milestone using it must say so. |

### Journey (derived on the page, not stored; `src/app/models/Journey.ts`)

| Shown as | Rule | Trust |
|---|---|---|
| **Elements explored** (My Journey chips, "across N elements") | An element counts once it has at least one quality read (`qualityReadsByElement`) or one completed action (`actionsByElement`). | Checked reads; self-reported actions |
| **Your first steps** (home panel, My Journey) | Choose elements: `preferredElements` not empty. Read a story: `qualityReads` ≥ 1. Watch a video: `videosCompleted` ≥ 1. Check your EQ: `lastEqScore` set. First action: `totalActionsCompleted` ≥ 1. Hidden once all five are done or the user hides it (`users.onboarding.checklistDismissedAt`). | As the metrics above |
| **Journey story** (My Journey) | "Since you joined in {month year}, you've read N stories, watched N videos and done N actions across N elements", from `qualityReads`, `videosCompleted`, `totalActionsCompleted`, elements explored and `users.joinedDate`. Parts that are 0 are left out. | As the metrics above |
| Completion events | (Passport) | One immutable `action_completed` event per completion, written by the server (`onUserActionWritten`) with ID `{uid}_action_completed_{actionId}_{n}`, where n is the completion number. It carries the elements, the action version, `completionMethod` and `verificationStatus` (both `SELF_REPORTED` today), the server timestamp, and, for DAILY actions, the local day. Browsers can't write these. Server-written events exist from 8.3.0; earlier completions have browser-written events (random IDs) and are counted in the totals through `user_actions`. | one per completion | Self-reported |
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

## Daily analytics (Admin → Analytics, 8.9.0)

One `analytics_daily/{YYYY-MM-DD}` summary per India-time day, by each event's server timestamp, built by `functions/daily-stats.js` (every 3 hours for today and yesterday; Refresh; `scripts/daily-stats.js` for past days). Admin accounts and rejected events never count.

| Number | Definition |
|---|---|
| Active members | distinct members with any event that day (a visit counts) |
| Engaged members | distinct members with a read, quality read, video view or completion, poll vote, EQ check, widget use, suggestion click or completed action |
| New members | `users.joinedDate` that day |
| Totals | that day's accepted events by type (quality reads, videos completed, actions completed, EQ checks…) |
| By element | quality reads by the story's element; completed actions by the completion's (or action's) elements |
| Suggestions | `suggestion_click` events per place shown; *converted* when the same member's matching completion (quality read, video completion, action completion) of the same item is the same day |
| First steps | a snapshot of all members: chose elements, read a story, watched a video, checked EQ, did an action, all five |
| Traffic | Google Analytics for the property's day: active users, new users, sessions, page views, top pages, views by page group (everyone, not just members) |

"Clear My Engagement Data" (`resetEngagementData`) deletes the user's reading, watching, poll, EQ, visit and widget events and their saved content. It also zeroes the visit counters and those fields of `user_metrics` (and removes `qualityReadsByElement`).

**Take Action progress is kept** (decided 2026-11-04, 8.3.0): `user_actions`, the `action_completed` events and the action counters stay. A reset therefore never makes "Actions Taken" disagree with the action cards, and a recompute can't undo a reset. The Settings page says so before the user confirms.

## Coming back and together (8.15.0)

| Metric | Where | Formula | Trust |
|---|---|---|---|
| **Came back within a week** | Admin → Analytics | Of the members active (any accepted event) on any of the days 8–14 days ago, the share who were active again in the last 7 days. From `analytics_daily/{day}.activeMemberIds` (team left out). | Server-recorded activity |
| **Came back within a month** | Admin → Analytics | The same with 30-day windows: active 31–60 days ago, back in the last 30. | Server-recorded activity |
| **Together this month** | Take Action (from 20 members); Admin → Analytics (always) | Sum of every member's `impactByMonth[month]` (India time), team left out; `members` = members with any saving that month. One public doc per month, `community_impact/{YYYY-MM}`, rebuilt every 3 hours. Totals only. | Self-reported estimate (as personal impact) |

## Changing a definition

1. Update this document.
2. Change `functions/activity-validation.js` and/or `functions/user-metrics.js` and their tests. Bump `VALIDATOR_VERSION` if a check changed.
3. Dry-run the recompute on staging, review the changes, then apply. Do the same on prod with approval.
