# Phase 2 Plan: Journey & Engagement Foundations

**Status:** approved 2026-11-04 with the recommended defaults (section 6). Step 1 shipped in 8.1.0, step 2 in 8.2.0 (prod metrics recomputed 2026-11-04), step 3 in 8.3.0, step 4 (connected content) in 8.4.0 and 8.4.1, step 5 (journey experience) in 8.5.0, step 6 (Today on WIOF) in 8.6.0. Steps 1–3 are the Planet Passport foundation; next is step 7 (rule-based "Next for you").
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
- **Explore next** (`components/explore-next`, `services/related-content.service.ts`), on blog and video pages, in the Take Action details and in the calendar popup. Two groups by intent: "Keep reading" (3 stories/videos) and "Take action on this" (2 actions); in an action's details "Learn more" comes first, then "More actions like this". Each group: own links, then reverse links, then similar content, then the element fallback (same-sub-category stories first, the rest a per-page pick by a stable hash of page and item, so pages vary but don't change on reload). Empty groups are left out. The calendar popup shows linked items only. Deleted or inactive targets drop out.
- **Similar content** (`functions/related-content.js`): keyword relevance, chosen over meaning-based embeddings for now (decided 2026-11-05; embeddings can replace the scorer later without changing the page). TF-IDF over each story's title and topic (weight 3), short description (2) and first 600 words (1), and each action's title, tags and categories (3), short description (2), description and steps (1); stopwords dropped, simple stemming, a small WIOF thesaurus mapping same-meaning words to one concept, a small bonus for a shared element, and a minimum score of 0.08 so weak matches aren't shown. Results in `related_auto/{type}_{id}` (`{blogs, actions}` of `{id, score}`, best first), rebuilt in full by `onBlogWritten` and `onActionWritten` (tens of items, writes only changed lists) and by `scripts/rebuild-related-content.js --project staging|prod [--apply]`. Videos aren't in the corpus yet (no doc of their own); they get links, reverse links and the element fallback.
- **Admin:** a Related Content card in the blog, Take Action and calendar forms (`components/related-content-editor`): search stories and actions by title, add a video by YouTube link (checked and titled through the YouTube API), reorder, remove. The rules are unchanged: these collections are already admin-write only.
- **Action links:** `/element/{element}/take-action?action={id}` opens that action's details.
- **Tests:** unit tests for the link clean-up, grouping, merge, seeded order and YouTube-link parsing; function tests for the summary keys and the matcher (terms, thesaurus, best match, threshold, rebuild writes only changes); rules tests for `related_auto`; a staging E2E (admin picker → blog, video, action, similar-content, fallback and calendar views).
- **Design (8.4.1):** on blog and video pages the block is its own section, tinted with the element's colour, headed by what the page is about ("Because you read about Veganism", from the story's topic). The action group is "Your next step" and reuses `TakeActionCardComponent`, so the reader can mark an action done right under the story with the same completion and sign-in logic as the Take Action page. Stories and videos use the element pages' own `app-blog-card` / `app-video-card`; on phones they're a sideways-swiping row (CSS scroll-snap). The action details modal dropped its Explore next block (product call, 2026-11-05: the modal is for deciding to do the action, and browsing actions is the Take Action page's job) and shows one "The story behind this" line instead (`RelatedContentService.storyBehind`: own link, reverse link or best similar story; no element fallback, so nothing when there's no real match). The calendar popup keeps its compact linked-items list. The element fallback is two bounded queries (same topic; newest 12 via the `blog_summaries` category + publishDate index). Browser E2E: `tests/e2e` (`npm run e2e:smoke`, `npm run e2e:explore`; staging only, credentials from the environment).

## 9. Step 5 as built

Decisions (recommended defaults, 2026-11-05):

- **Welcome after sign-in** (`components/journey-welcome`): shown once, on the home page, to a signed-in user with no `onboarding.welcomeDoneAt` and no preferred elements (someone who picked elements in Settings already told us). Two steps: choose elements (saved to `preferredElements`, so G7's preferences finally have a source), then where to start (the story list or the actions for the first chosen element, or the EQ check). Skipping or closing also records `welcomeDoneAt`, so it never nags. It closes if the user navigates away without choosing, and comes back on home. The guest welcome now shows to guests only.
- **First steps** (`components/first-steps`, `models/Journey.ts`): five steps, each ticked by a trusted metric (`docs/METRICS.md` "Journey"). The next undone step is highlighted. Hidden for good with Hide (`onboarding.checklistDismissedAt`, on the profile so it follows the account) or once all five are done. Not time-limited: it only ever has five items and hides itself.
- **My Journey story**: one sentence from the trusted counts and the join date, plus the five elements marked explored (a quality read or a completed action there). Needs the new server metric `qualityReadsByElement`: `onActivityLogCreated` adds the blog's element on each accepted quality read; the recompute rebuilds it (replacing the whole map, so stale keys can't survive); the engagement reset removes it.
- **Rules**: `users.onboarding` may hold only `welcomeDoneAt` and `checklistDismissedAt`, each set once to `request.time` and never changed or removed; `preferredElements` must be up to five of the five elements, checked only when it changes so legacy values never block an edit.
- **Tests**: unit tests for the journey rules, the welcome and the first steps; function tests for the per-element count and its report; rules tests for `onboarding` and `preferredElements`; staging E2E `npm run e2e:journey` (welcome on desktop and phone, saved profile, first steps on home and My Journey, Hide, Skip; restores the test user).
- Fixed on the way: the home panel's "Pick up where you left off" always linked under Earth.

## 10. Step 6 as built

- **The fact** (decided 2026-11-05, replacing decision 5 for now): each occasion's existing description is the fact and its "Show more" link the source; all 133 staging occasions have both. A separate team-written, sourced fact can replace it later without changing the page.
- **Where** (`components/today-on-wiof`, `models/TodayOnWiof.ts`): a card on the home page under the journey panel, not a pop-up, so it never stacks with the welcomes and needs no "once a day" timer: it is simply there each day. "Not today" hides it until tomorrow (`localStorage`, per device; a per-viewer convenience, not account state). Shown to guests and signed-in users. A quiet "See the full calendar" link at the foot of the card scrolls to the Environment Calendar further down the page, focuses its heading and briefly highlights today in the agenda, hinting that the whole calendar is there.
- **What goes with it**: one story or video and one action, from the occasion's own Related Content links first, then the server's keyword matches (`related_auto/occasion_{id}`). No element fallback: with no real match the card shows just the fact.
- **Matching occasions** (`functions/related-content.js`): occasions join the corpus as queries only. Document frequency is computed over stories and actions only, so story and action matches are unchanged (tested). Because occasion texts are a sentence or two, chance overlaps score higher, so occasions use a stricter bar: boilerplate words are removed, the score must reach 0.10, and at least two terms must be shared. On staging this keeps e.g. Vegetarian Day → the Veganism story, Food Day → the surplus-food actions, Yoga Day → gentle yoga, Bee Day → the honey bee story, and drops e.g. Run Day → "Stop Unnecessary Running Water". Weaker keyword matches remain possible; an admin's links on the occasion always win.
- **Kept current** by the new `onEnvcalWritten` trigger, and by `scripts/rebuild-related-content.js`.
- **Tests**: function tests (occasions matched, never suggested, no effect on other matches, stricter bar, two shared terms); unit tests for the card and its helpers; staging E2E `npm run e2e:today` (fact and source, the trigger, admin links first, the action link, See the full calendar, Not today, phone).
