# Planet Passport: design (experiment)

**Status:** design experiment on `feat/planet-passport-design`, staging only. Not for prod until (1) prod has a few weeks of real use data, (2) the open decisions below are made, and (3) it passes full testing. Prod meanwhile gets only small patches from master.

**Preview:** `/passport` on staging (signed in). `/passport?demo=1` shows the same booklet with sample stamps, for design review.

## 1. The idea

A passport the member pages through, not a dashboard. It turns what a member has really done on WIOF into something they keep: stamps in a booklet, the way a traveller collects entry stamps. It follows the roadmap's gamification rule: **meaningful, not addictive**. Stamps recognise contribution and consistency; there are no points, ranks or leaderboards.

Why a booklet:

- **It's a keepsake, not a scoreboard.** Turning pages is slow on purpose: "drop by drop", in line with the calm home (8.11.0).
- **Empty stamp outlines invite, they don't nag.** An unearned stamp is a faint dashed outline with one line about how to earn it.
- **It's shareable.** A stamped page, like the impact card (8.17.0), is something people want to show.

## 2. The booklet

Two pages side by side on screens 900px and wider, one page at a time on phones. Turn by tapping a page (the right page goes forward, the left back), swiping, the ← → keys or the buttons below. A real 3D page turn (CSS `rotateY` around the spine); with "reduce motion" on, pages switch instantly.

| Page | What it shows |
|---|---|
| Cover | Teal leather, gold foil: "World Is One Family", a globe circled by the five elements, "Planet Passport", the e-passport chip mark |
| Inside cover | The "request" note, as in a real passport: *"World Is One Family requests all whom it may concern to let the bearer pass freely through every forest, river and city…"*, and the trust line: every stamp is earned on our side, never bought or guessed |
| 1. Holder | Photo (or initial), name, "Nationality: Planet Earth", member since, home elements, passport number, stamps earned, a signature line and two machine-readable lines (`P<EARTH<<NAME<<<…`) |
| 2–3. Journey visas | 8 stamps earned anywhere on WIOF |
| 4–8. One page per element | Air, Energy, Water, Earth, Spirit: 3 stamps each, a faint element watermark, "Explore {element} →" |
| 9. Declaration | "Goods carried": the member's estimated impact (the same totals as My Journey) |
| 10. Next stamps | The 3 unearned stamps closest to being earned, with progress |
| 11. Travel notes | "Drop by drop, the ocean fills." (later: the member's own notes or reflections) |
| Back cover | Teal leather, small emblem, worldisonefamily.com |

**Stamps** are SVG: four shapes (circle, rectangle, oval, hexagon), a double frame, the caption in small caps (on an arc for round stamps), the title in Aleo, and a date. Earned stamps are inked: a slight tilt (fixed per stamp), an ink-grain filter, multiply blending, and a short "thunk" as they land when the page opens. Inks vary like real passport stamps but stay near the brand: water teal, air sky blue, energy amber, earth olive brown, spirit muted violet.

## 3. The stamps (v1 catalogue, 23)

Every rule reads **only server-trusted counts** (`user_metrics`, docs/METRICS.md) and the profile's `longestStreak`. Nothing comes from the browser's own counting.

**Journey (8)**

| Stamp | Earned when | Source |
|---|---|---|
| First Step | 1 action completed | `totalActionsCompleted` |
| Knowledge Explorer | 10 stories read to the end | `qualityReads` |
| 7-Day Streak | visited 7 days in a row | `longestStreak` |
| One Family | explored all five elements | `qualityReadsByElement` + `actionsByElement` |
| Inner Weather | took the EQ reflection | `lastEqScore` (server-scored, 8.2.0) |
| Your Voice | voted in a poll | `pollsVoted` |
| Good Watch | 3 videos watched to the end | `videosCompleted` |
| 30-Day Streak | visited 30 days in a row | `longestStreak` |

**Per element (3 × 5)**

| Stamp | Earned when |
|---|---|
| Arrived | first story read or first action in the element |
| {Element} Explorer | 5 stories of the element read to the end |
| Guardian (River Guardian, Clean Air Guardian, Power Saver, Earth Protector, Mindful Living) | 5 actions of the element completed |

The rules are pure functions in `src/app/models/Passport.ts`, unit-tested, so the same rules can move to the server unchanged.

## 4. Before it ships (Phase 3 work)

1. **Stamps written by the server, with a date.** In this experiment stamps are worked out in the browser from trusted counts, and the date shows "EARNED" (the preview shows today). For real: a function evaluates the rules when `user_metrics` changes and writes `passport_stamps/{uid}_{stampId}` once, with `earnedAt` (rules: read own, no client writes). That gives each stamp its real date and makes it permanent.
2. **Resets.** Recommended: a reset clears stamps along with engagement data (so a stamp always means the counts behind it), but never lets a member earn the same stamp twice for free. Same idea as the poll vote guards (8.16.0).
3. **Self-reported actions.** Action stamps come from "Mark as Done" (self-reported, docs/PHASE2_PLAN.md G5). That's fine for everyday actions; the Passport should say so on the inside cover or holder page.
4. **Impact stamps** (for example "1,000 L of water saved") only after the admins review the impact recipes. Until then, impact stays in the Declaration page.
5. **Topic stamps** ("5 ocean stories") depend on the topics decision (docs/TOPICS_AND_TAGS.md).
6. **Real use data first:** set the targets (5, 10, 30…) from what prod members actually do, so the first stamps come early and the later ones mean something.
7. **Accessibility:** every stamp has a text label (earned / not yet, hint, progress); the page buttons and keys work without a mouse. To check: a screen-reader pass of the whole booklet.
8. **Where it lives:** a "Planet Passport" link on My Journey and in the avatar menu; maybe the holder page as the share image.

## 5. Ideas to try next

- **Share a page:** a stamped page as a 1080×1080 image (reuse `util/impact-share-image.ts`).
- **A new-stamp moment:** the next time the member opens the Passport after earning one, it opens on that page and the stamp lands.
- **Seasonal stamps** from the Environment Calendar (for example World Water Day: read or act on that day).
- **Travel notes** written by the member (a reflection per month), private by default.
- **Cover colour by home element.**
