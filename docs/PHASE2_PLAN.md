# Phase 2 Plan: Journey & Engagement Foundations

**Status:** approved 2026-11-04 with the recommended defaults (section 6). Step 1 shipped in 8.1.0, step 2 in 8.2.0 (prod metrics recomputed 2026-11-04), step 3 in 8.3.0, step 4 (connected content) in 8.4.0. Steps 1–3 are the Planet Passport foundation; next is step 5 (journey experience).
**Sources:** `WIOF_Plan_v4/WIOF_Future_Enhancements_and_Product_Roadmap_v4.md` (sections 0, 5–10, 14), `WIOF_Plan_v4/WIOF_Foundation_Hardening_Plan_v4.md` (sections 16–18), and the current code on `master` (8.0.2).

## 1. What Phase 2 is for

The roadmap puts **Planet Passport in Phase 3** and **Phase 2 ("Journey & Engagement Foundations")** before it. Phase 2 builds what the Passport will stand on:

> raw event → validated metric → achievement rule → Passport milestone
> *"The achievement layer must not be client-authoritative."* (Hardening Plan §16)

So Phase 2 has two halves:

1. **A trustworthy activity foundation** (mostly invisible): events the server can trust, metrics with written definitions, an action model ready for milestones.
2. **The journey experience** (visible): connected content, onboarding, a better My Journey, "Today on WIOF", simple recommendations.

Explicitly **not** in Phase 2: the Passport page, stamps/badges, levels, impact calculations (kWh, CO2e), social features. Those are Phase 3–4 or later.

## 2. What already exists (built in Phase 1 / Take Action V1)

| Area | What's there | Where |
|---|---|---|
| Activity events | `activity_log`: one doc per event (`blog_read`, `blog_read_complete`, `video_view`, `video_watch_complete`, `poll_vote`, `eq_completion`, `daily_visit`, `widget_usage`, action completions). Write-once, owner-readable. | `activity.service.ts`, `firestore.rules` |
| Metrics | `user_metrics/{uid}`: counters (blogs read, videos, polls, last EQ score, actions by element…). Clients can't write it; Cloud Functions maintain it. | `onActivityLogCreated`, `onUserActionWritten`, `backfillUserMetrics` |
| Engagement | login/visit counters, streaks, engagement reset | `createUserProfile`, `recordLoginMetrics`, `recordUserVisit`, `resetEngagementData` |
| Actions | `actions` catalogue (25 real actions on staging, admin-managed, with evidence/safety notes); `user_actions` per user/action with **strict rules** (status transitions, versions, DAILY dedup via `user_action_completions`) | Take Action V1 |
| My Journey | tiles: Blogs Opened, Quality Reads, Videos Watched, Polls Voted, Actions Taken; EQ score + trend; saved content; action history; per-action streaks | `my-journey.page.ts` |
| Onboarding | guest welcome overlay (4 slides: welcome, five elements, conversation, small action) | `onboarding-overlay` |
| Home | "Continue Your Journey" panel (start with an element, EQ score) | `home-journey-panel` |
| Preferences | `preferredElements` chosen in Settings, **not used anywhere yet** | `settings.page.ts` |
| Connected content | **none**: no related-content links between blogs, videos, actions, events | — |
| Today on WIOF | **none**: the calendar exists, no prompt | `env-calender` |

## 3. Gaps found (why the foundation comes first)

**G1. Activity events are client-authoritative.** The `activity_log` rule only checks `userId` and `timestamp`. A signed-in user can write *any* event type with *any* fields, as often as they like, e.g. 1,000 `blog_read` events from the browser console.
**G2. Metrics count every event blindly.** `onActivityLogCreated` adds +1 per `blog_read` with no de-duplication and no check that the blog exists.
**G3. The EQ score is whatever the browser sends.** `lastEqScore` is copied from the event, so "EQ improved by 11 points" can't be a trusted milestone yet.
**G4. Metrics have no written definitions.** "Quality read", "video completed", "active day", "streak" are defined only implicitly in code. Hardening Plan §16 requires each metric to state source, formula, unit, time basis, and whether it's resettable.
**G5. Actions are self-reported only** (`completionMethod: 'SELF_REPORTED'`). That's fine and intended for everyday actions ("start simple", Roadmap §10), but milestones built on them must say so.
**G6. Nothing connects content** (G-roadmap §5): a blog doesn't know its related video or action.
**G7. Preferences are collected but unused**, so there's nothing to base recommendations on.

G1–G3 don't hurt today (they only affect a user's own counters), but every Passport milestone would inherit them. They must be fixed before Phase 3.

## 4. Proposed workstreams (in order)

### A. Trusted activity events: the foundation (do first)

1. **Event schema in the rules:** a whitelist of event types, each with its exact allowed fields and types (`keys().hasOnly`, as `user_actions` already does). Unknown types and extra fields are rejected.
2. **De-duplication by design:** events that should count once get deterministic document IDs, the pattern `user_action_completions` already uses (e.g. `{uid}_blog_read_complete_{blogId}`), so repeats are impossible rather than filtered later. Repeatable events (visits, views) are limited per day.
3. **Server validation in the trigger:** the function checks that the referenced content exists and is published, marks each event `accepted` / `rejected` (with a reason), and **counts only accepted events**. Raw events stay as evidence (Hardening Plan rule 12).
4. **EQ scored on the server:** a callable function receives the answers and computes the score; the browser no longer sends a score.
5. **Metric definitions document** (`docs/METRICS.md`): every metric Phase 3 may use, written down per §16.
6. **Recompute, don't trust old counters:** extend `backfillUserMetrics` to rebuild `user_metrics` from accepted events only (dry run first, staging, then prod with your approval).
7. **Rules tests** for every event type (accepted and rejected cases).

### B. Action model, ready for milestones

- Add the fields the Passport rules will need, without changing the user flow: `measurementMethod`, `verificationStatus` on completions (all `SELF_REPORTED` now), `relatedContent` links.
- Action completions emit a validated event through workstream A, so actions and reading/watching share one pipeline.
- Phase 10 clean-up of the old static Take Action code (deferred since V1).

### C. Connected content ("What can I explore next?")

- An admin field on blogs, videos, events and actions: **related items** (pick from existing content).
- A "Explore next" block on blog, video and action pages, and in the calendar event popup.
- Falls back to "more from this element" when nothing is linked, so it works before editors tag everything.

### D. Journey experience

- **After first Google sign-in:** optional short onboarding: choose elements/interests (finally used: G7), optionally start EQ or a first action. Skippable.
- **First-week progression** on My Journey and the home panel: explore a topic → first story → first video → try EQ → first action. Driven by trusted metrics from A. Never mandatory.
- **My Journey as a story**: "You've explored 4 elements, completed 17 actions, read 9 stories…" (the Roadmap §8 tone), using the same data.

### E. "Today on WIOF"

- A small, dismissible prompt from today's calendar event: event → one short fact → one related story/video → optional action.
- Shown at most once per day, snoozable, accessible; only for events with a verified fact.

### F. Early recommendation primitives (rule-based, no ML)

- "Next for you": unread related content + not-yet-done actions in the user's preferred elements.
- Guests get element-based suggestions from the current page only (no persistent profile, Roadmap §2).

## 5. Suggested sequence and size

| Step | Content | Visible to users? | Rough size |
|---|---|---|---|
| 1 | A1–A3, A7: event schema, de-dup, server validation, tests | No | 3–4 days |
| 2 | A4–A6: server EQ scoring, METRICS.md, recompute metrics | Small (EQ flow) | 2–3 days |
| 3 | B: action model fields + shared pipeline | No | 1–2 days |
| 4 | C: connected content (admin field + "Explore next") | Yes | 3–4 days |
| 5 | D: sign-in onboarding, first-week progression, My Journey story | Yes | 4–5 days |
| 6 | E: Today on WIOF | Yes | 2–3 days |
| 7 | F: rule-based "Next for you" | Yes | 2 days |

Each step ships on its own (staging first, then a prod release), like the Angular upgrade. Steps 1–3 are the actual "foundation for Planet Passport"; 4–7 are the engagement features that give the Passport something to celebrate.

## 6. Decisions (approved 2026-11-04: "go with the recommended, industry-aligned approach")

1. **Order:** foundation first (steps 1–3), then the visible features (4–7).
2. **EQ scoring:** moves to a Cloud Function in step 2. Step 1 already stops impossible scores: the rules and the server both require the total to equal the sum of three 8–40 dimensions.
3. **Metric definitions:** Claude drafts `docs/METRICS.md` from the current code in step 2, for approval.
4. **Related content:** admins tag related items; "more from this element" is the fallback.
5. **Today on WIOF:** facts written by the WIOF team, each with a source link; events without a verified fact show no prompt.
6. **Existing counters:** recompute `user_metrics` from accepted events: dry run, staging, then prod with approval (step 2).

## 7. Step 1 as built

- **Rules** (`firestore.rules`, `isValidActivityEvent`): a whitelist of the nine event types, each with its exact fields, types and ranges. Count-once events must use their deterministic ID (`{uid}_{type}_{contentId}`, or `{uid}_daily_visit_{day}`). A poll vote's email must be the signed-in user's own.
- **Server checks** (`functions/activity-validation.js`): the blog, poll or action exists; video IDs are YouTube IDs; quality reads meet the scroll and time thresholds (recomputed from the blog's length); watched videos reached 75%; EQ totals add up; the calendar day is within a day of the server time.
- **Verdict on every event:** `validation: {status, reason, validatorVersion, checkedAt}`. Only accepted events change `user_metrics`. The verdict and the counter update commit in one transaction that skips events already judged, so a redelivered trigger can't count twice. Rejected events are kept as evidence.
- **Readers:** My Journey history lists leave out rejected events; `backfillUserMetrics` skips them. Events from before step 1 have no verdict and keep counting until the step 2 recompute.
- **Tests:** 19 unit tests for the checks (`npm run test:functions`, now run before every deploy) and the activity_log rules tests rewritten: every type accepted, and extra fields, wrong IDs, spoofed users, forged verdicts, bad scores and ranges rejected.
- **Known limit:** repeatable events (EQ, widget use, action analytics) can still be written many times. They don't inflate any counter (EQ keeps only the latest score; action counts come from `user_actions`), so a per-day cap is left for when a Passport rule needs one.

## 8. Step 4 as built

- **Links:** blogs (`Blogs`), actions and calendar occasions (`Envcal`) carry `relatedContent` (up to six `{type, id, title, element?}`, type story/video/action, in the admin's order) and `relatedKeys` (`type:id`). Videos are YouTube videos with no doc of their own, so a video link keeps its title and element in the ref. `blog_summaries` copies `relatedKeys` (`functions/blog-summary.js`).
- **Both directions:** a page also shows the blogs and active actions whose `relatedKeys` contain it (one `array-contains` query each, on the small `blog_summaries` and `actions` docs). So a video page shows the stories and actions that link to it, without anyone editing the video, and an editor links two items once.
- **Explore next** (`components/explore-next`, `services/related-content.service.ts`): up to four cards, on blog and video pages, in the Take Action details and in the calendar popup. Order: own links, then reverse links, then the fallback: stories and actions of the element, alternating, with same-sub-category stories first and the rest a per-page pick (a stable hash of the page and item) from the 12 newest stories and first 12 actions, so pages vary but don't change on reload (heading "More from {Element}" when nothing is linked). The calendar popup shows linked items only. Deleted or inactive targets drop out.
- **Admin:** a Related Content card in the blog, Take Action and calendar forms (`components/related-content-editor`): search stories and actions by title, add a video by YouTube link (checked and titled through the YouTube API), reorder, remove. The rules are unchanged: these collections are already admin-write only.
- **Action links:** `/element/{element}/take-action?action={id}` opens that action's details.
- **Tests:** unit tests for the link clean-up, merge and YouTube-link parsing; function tests for the summary keys; a staging E2E (admin picker → blog, video, action, fallback and calendar views).
