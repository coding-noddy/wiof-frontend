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

**The scene around the book:** the book lies on the site's own illustration, faded into the Ivory page. It follows where you are: the home illustration on the covers and journey pages, each element's hero illustration (`assets/banners/{element}-hero.webp`) on its page, cross-fading as you turn. Each image loads only when first needed. On wide screens (1240px+) a few loose, faded "desk" stamps sit either side ("Planet Earth", "Drop by drop", "Small actions", "Five elements"): decoration only, never a stamp anyone earned. The cover carries the WIOF logo in white, pressed into the leather.

**Stamps** are SVG: four shapes (circle, rectangle, oval, hexagon; for the real Passport the shapes carry meaning, see §3a), a double frame, the caption in small caps (on an arc for round stamps), the title in Aleo, and a date. Earned stamps are inked: a slight tilt (fixed per stamp), an ink-grain filter, multiply blending, and a short "thunk" as they land when the page opens. Inks vary like real passport stamps but stay near the brand: water teal, air sky blue, energy amber, earth olive brown, spirit muted violet.

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

> The v1 catalogue above is the experiment. The structure for the real Passport is §3a: the stamps get regrouped into three families, and the shapes get a meaning.

## 3a. Stamp families (agreed 2026-11-19)

Three families, each with its own look, so a member can tell at a glance what a stamp stands for.

### Travel stamps: where you've been

Oval or rectangle, dated, like the entry stamps in a real passport. They live on the element pages and the journey visa pages.

| Stamp | Earned when | Source |
|---|---|---|
| Arrived ({element}) | first visit to the element's page | **new** `element_visit` event, once per element: `{uid}_element_visit_{slug}` |
| {Element} Explorer | 5 stories of the element read to the end | `qualityReadsByElement` |
| Knowledge Explorer, Good Watch, Your Voice, Inner Weather | as in §3 | as in §3 |

A page visit is easy to fake, which is acceptable for the most basic stamp. The event is still validated on the server like the others (`functions/activity-validation.js`).

### Milestone badges: what you've done

**The rule: the number of corners is the number the milestone counts.** A triangle always means "3 of something", a square "4", a pentagon "5", a hexagon "6". Each shape has **several badges** (variants), one per kind of accomplishment. The ladder stops at the hexagon, because more corners can't be told apart at stamp size.

| Shape | Number | Example badges |
|---|---|---|
| ● Circle | — | **Welcome**: all 5 first steps done (choose elements, read a story, watch a video, EQ, first action). All 5 are required; dismissing the checklist does not earn it. |
| ▲ Triangle | 3 | 3 different actions · actions in 3 elements · one action kept up 3 weeks |
| ■ Square | 4 | 4 different actions · actions in 4 elements · one action kept up 4 weeks |
| ⬟ Pentagon | 5 | 5 different actions · **One Family** (actions in all 5 elements) · {Element} Guardian (5 actions in one element) · one action kept up 5 weeks |
| ⬢ Hexagon | 6 | 6 different actions · **Honeycomb** (one action kept up on 6 different weeks) |

### Names (proposed 2026-11-19)

Nature and sustainability words that are general, not tied to one element. Where possible, each name carries its number or shape, as Honeycomb does.

**Milestone badges**

| Shape | Badge | Earned when | Why the name |
|---|---|---|---|
| ● | **Earthrise** | all 5 first steps | the first photo of the whole Earth: the start of seeing it as one home |
| ▲ | **Three Seeds** | 3 different actions | small things planted that will grow |
| ▲ | **Delta** | actions in 3 elements | a river delta is a triangle (Δ) where streams spread out |
| ▲ | **Taking Root** | one action kept up 3 weeks | a habit starting to hold |
| ■ | **Four Winds** | 4 different actions | trying things from every direction |
| ■ | **Compass** | actions in 4 elements | four points: finding your way around the planet |
| ■ | **Full Moon** | one action kept up 4 weeks | about four weeks is one moon cycle |
| ⬟ | **Five Petals** | 5 different actions | many flowers have five petals, each one different |
| ⬟ | **One Family** | actions in all 5 elements | the five elements together: World Is One Family |
| ⬟ | **{Element} Guardian** | 5 actions in one element | see the element names below |
| ⬟ | **Evergreen** | one action kept up 5 weeks | it stays green through the season |
| ⬢ | **Snowflake** | 6 different actions | six-sided, and no two the same |
| ⬢ | **Honeycomb** | one action kept up 6 weeks | six-sided cells, built steadily, week by week |

**Element Guardians (pentagon, 5 actions in the element)**

| Element | Badge |
|---|---|
| Air | **Clean Air Guardian** |
| Energy | **Sun Keeper** (was Power Saver: the name is now about the source, not only saving) |
| Water | **River Guardian** |
| Earth | **Earth Protector** |
| Spirit | **Mindful Living** |

**Travel stamps: Arrival per element**

| Element | Stamp |
|---|---|
| Air | **First Breath** |
| Energy | **First Spark** |
| Water | **First Drop** |
| Earth | **First Footprint** (a gentle one) |
| Spirit | **First Light** |

The Explorer stamps keep "{Element} Explorer". The journey travel stamps (Knowledge Explorer, Good Watch, Your Voice, Inner Weather) keep their names.

**Streak stamps (rosette)**

| Stamp | Earned when |
|---|---|
| **Seven Sunrises** | visited 7 days in a row |
| **Thirty Dawns** | visited 30 days in a row |

- "Different actions" counts distinct action IDs, so repeating one DAILY action doesn't climb the ladder.
- "Kept up N weeks" counts **different weeks** (IST, like `impactByMonth`), not consecutive ones: no streak pressure.
- Each badge says what it means ("Six weeks with one action"). There are no "Level 3" labels and no totals.
- New kinds of variant (for example "tried it again" follow-ups) are added to the pick-list later (§5).

### Streak stamps: appreciation

A scalloped seal (rosette), kept separate from the ladder. These stamps thank the member for coming back. They never warn about breaking a streak or count down.

| Stamp | Earned when |
|---|---|
| 7-Day Streak | visited 7 days in a row (`longestStreak`) |
| 30-Day Streak | visited 30 days in a row |

Their wording is appreciation ("Seven days in a row. Thank you for coming back."). There are no reminders and no "don't lose your streak".

### Contributor badges: what you've given (agreed 2026-11-19)

A fourth family, for people who contribute to WIOF itself. These badges are **granted by an admin**, not earned from counts, because contributions mostly happen off the site.

**Look:** an embossed **wax seal**, like the official seal on a document. They live on their own booklet page, **"Endorsements"**: real passports have an endorsements page too.

| Contributor | Badge | Why the name |
|---|---|---|
| Writers of stories and blogs | **Storyteller** | stories are how WIOF's ideas travel |
| Coffee Conversations guests | **Fireside Voice** | a warm conversation shared with others |
| ClimatEnlighten workshop hosts and facilitators | **Lantern Bearer** | carrying light so others can see: Enlighten |
| Volunteers (events, campaigns, community work) | **Many Hands** | "many hands make light work" |
| Donors and supporters (once giving exists) | **Rainmaker** | brings what helps everything grow |
| Advocates (bring others, speak up for a cause) | **Pollinator** | carries an idea from flower to flower |
| Partner organisations (e.g. EcoFlyp) | **Kindred Roots** | roots growing together under the same soil |
| The WIOF team | **Heartwood** | the strong core at the centre of the tree |

**How granting works:**
- Admin → Passport → Contributors: pick a member, pick the badge, add a reason (shown to the member) and an optional private note or proof (admins only).
- A server callable checks the admin claim and writes `passport_stamps/{uid}_{badgeId}` with `grantedBy`, `reason` and `earnedAt`. Every grant is logged.
- **Repeat contributions** don't create duplicates. The badge keeps one record with a count line the admin can update, for example "Storyteller · 4 stories".
- **Revocation** is possible for this family only, since a person granted it (for example a mistake). It needs a reason and is logged; the record is marked revoked, not deleted.
- **Consent and privacy:** the member sees a granted badge on their private Passport, and decides per badge whether it shows on their public profile (§6). **Rainmaker is hidden from the public profile by default.** 
- **People without an account** (some guests, partners) get the badge **only after they sign up**, through a **claim link** (decided 2026-11-19):
  - The admin creates a one-time link `/passport/claim/{token}` for a badge and reason. It expires after 30 days.
  - The server stores only a **hash** of the token, the badge, the reason, `createdBy` and the expiry. **No name or email of a non-member is stored.**
  - The admin sends the link themselves (email, WhatsApp). The guest signs up or signs in, and a callable checks the token and writes the badge, which shows the new-badge moment (§6a).
  - The link is single-use and can be cancelled. Using it again does nothing. Every claim is logged.
  - An existing member who opens the link just signs in and gets the badge.
- Contributor badges are **not** milestones: they have no shapes and no corners, and they don't count towards anything.

### What the server needs

All of this is derived on the server from records it already keeps, except the visit event:

- **distinct actions** and **distinct elements acted in**: from the accepted `action_completed` events (each carries its action ID);
- **weeks per action**: from the same events' dates;
- **Welcome**: the five first-step conditions (`Journey.ts firstSteps`), all from trusted metrics, plus `preferredElements`;
- **element visits**: the new `element_visit` event.

In the admin catalogue (§5), **a milestone's shape follows from its target**: pick a target of 3–6 and the shape is set to match. Admins can't save a mismatched pair, or a target the rule can't reach (for example "6 elements").

## 4. Before it ships (Phase 3 work)

1. **Stamps written by the server, with a date.** In this experiment stamps are worked out in the browser from trusted counts, and the date shows "EARNED" (the preview shows today). For real: a function evaluates the rules when `user_metrics` changes and writes `passport_stamps/{uid}_{stampId}` once, with `earnedAt` (rules: read own, no client writes). That gives each stamp its real date and makes it permanent.
2. **Resets (decided 2026-11-19):**
   - **Resets keep stamps by default**; an optional "Also clear my Passport" checkbox clears them.
   - **Existing members** get their real earned dates, rebuilt from history; where a date can't be proved, the stamp says "Earned before launch".
   - **Only one new different action per day** counts towards milestone badges.
   - **The Passport is issued with Earthrise.**
   See docs/PLANET_PASSPORT_V1_PROPOSAL.md.
3. **Self-reported actions.** Action stamps come from "Mark as Done" (self-reported, docs/PHASE2_PLAN.md G5). That's fine for everyday actions; the Passport should say so on the inside cover or holder page.
4. **Impact stamps** (for example "1,000 L of water saved") only after the admins review the impact recipes. Until then, impact stays in the Declaration page.
5. **Topic stamps** ("5 ocean stories") depend on the topics decision (docs/TOPICS_AND_TAGS.md).
6. **Real use data first:** set the targets (5, 10, 30…) from what prod members actually do, so the first stamps come early and the later ones mean something.
7. **Accessibility:** every stamp has a text label (earned / not yet, hint, progress); the page buttons and keys work without a mouse. To check: a screen-reader pass of the whole booklet.
8. **Where it lives:** a "Planet Passport" link on My Journey and in the avatar menu; maybe the holder page as the share image.

## 5. Stamps managed from the admin panel (planned)

Agreed direction (2026-11-06): admins add and change stamps without a release. In the experiment the 23 stamps are code (`models/Passport.ts`); for the real Passport they move to data.

- **Catalogue collection** `passport_stamp_defs/{stampId}`: title (1–2 lines), caption, element (or none), shape, ink, rule, target, optional date window, status `draft | active | retired`, order. Public read, admin write (firestore.rules).
- **Admin → Passport page:** list, add, edit, retire; a live preview of the stamp (reuse `app-passport-stamp`) while editing.
- **"Earned when" is a pick-list of trusted counts**, each a named rule the server knows: stories read, stories read in an element, actions done, actions done in an element, videos finished, polls voted, EQ reflection taken, longest visit streak, elements explored. Plus a target. That covers "Read 20 Water stories" with no code.
- **Seasonal stamps:** an optional date window (for example World Water Day from the Environment Calendar): only activity inside the window counts.
- **A new kind of rule** ("joined a workshop", "completed this one action") needs one small code change; after that it's in the pick-list.
- **Guard rails:** stamps already earned stay earned when a stamp is edited (the earned record keeps its title and date); stamps are retired, never deleted; the server decides who earns what (`passport_stamps/{uid}_{stampId}`, written once with `earnedAt`).

### 5a. Admin control of badges and challenges (agreed direction 2026-11-19)

Goal: admins can always see **which badge is given for which milestone**, and they can add, change and retire badges and challenges without a release.

**The badge map (overview).** The first screen of Admin → Passport shows every badge grouped by family: Travel, Milestone (by shape: ● ▲ ■ ⬟ ⬢), Streak, Challenges. Each badge shows its art, its name, a plain-language **"Earned when"** sentence generated from the rule (for example "Complete one action on 6 different weeks"), its status (draft / active / scheduled / retired) and how many members have earned it. Admins can filter by family, element and status.

**The badge form.**
- **Family** (travel / milestone / streak / challenge), which decides the look.
- **Name, meaning line, element** (or none), **ink**.
- **Earned when** is a pick-list of server-known rules plus a target. Admins can't type a formula. Rules:
  - first steps done;
  - element page visited;
  - stories read (all / in one element);
  - videos finished;
  - polls voted;
  - EQ reflection taken;
  - actions done (all / in one element);
  - **different actions done**;
  - **elements acted in**;
  - **one action kept up N weeks**;
  - **a specific action done** (pick from the catalogue);
  - visit streak.
- **Milestones: the shape follows the target** (3 → ▲ … 6 → ⬢). The form refuses targets the rule can't reach, such as 6 elements.
- **Live preview** of the stamp as it will look in the booklet, inked and not yet earned.
- **"Would earn it now":** before publishing, a dry-run count of how many members already meet the rule. Admins know the impact before members see anything.

**Challenges** are badges with a **date window** (optionally linked to an Environment Calendar day, for example World Water Day). Only activity inside the window counts. The challenge can be scheduled ahead of time; it opens and closes by itself, and it stays earned forever after.

**Publishing and versions.**
- Draft → active.
- Editing the **name or art** of an active badge updates it everywhere.
- Editing its **rule or target** creates a **new version**. Members who earned it keep their badge and its date; the new rule applies from then on. The map shows the version history.
- Retire, never delete. Every change is logged: who, when, before and after.

**Limits.** Admins combine the rules in the pick-list freely. A brand-new *kind* of rule (for example "attended a workshop") needs one small code change; after that it's in the pick-list for good. Award decisions are always made by the server, never by the admin page or the browser.

## 6. Sharing and the public profile (proposed 2026-11-19)

The roadmap's rule is **private by default; public only by the member's choice**. Both features come after server-written stamps (§4.1), because a share needs a real `earnedAt` date.

**Step 1: share one badge as an image.** One badge on its own card is the default way to share. A whole page is offered later, if at all.
- The card is 1080×1350 (portrait, good for stories and WhatsApp), and reuses `util/impact-share-image.ts`.
- It shows: the badge large and inked on the passport paper; the badge name and what it means; the date earned; "Planet Passport · World Is One Family"; and an optional first name.
- It doesn't show the member number, the EQ score, or anything unearned.
- It's offered at the new-stamp moment (§7) and from a tapped stamp.
- Why one badge instead of the whole page: a page is crowded at phone size and shows empty outlines too. It also reveals more than one moment. One badge is one clear story ("I kept one action up for six weeks"), and it needs no server and exposes no data.

**Step 2: one public profile, opt-in.**
- There is one public page, not two: a public Passport (cover, holder page and earned stamps), with an optional journey summary section. It is not a separate public My Journey.
- It is off by default. Settings has a switch, and a per-section choice: stamps, journey summary, impact totals. The EQ score is never public.
- The URL uses a chosen handle (`/p/{handle}`), never the uid. The page is `noindex` by default, with an option to allow search engines.
- The server writes a separate projection, `public_profiles/{handle}`, containing only what the member chose. The `users` and `user_metrics` docs stay private. Turning the profile off deletes the projection at once.
- Once the public page exists, a shared badge card can carry its link, and the link gets a preview (`functions/social-meta.js`).
- Before building: a privacy review, rules tests (other members can read only `public_profiles`), a handle policy (reserved words, changes), and an update to the privacy policy.

## 6a. The new-badge moment (proposed 2026-11-19)

When a member earns a badge (say they mark their 3rd different action done), they get a short celebration, a look at the badge, and a way to it.

**What happens:**
1. The member taps "Done it". The server records the completion, updates `user_metrics` and writes the badge, usually within 1–3 seconds.
2. The app listens to the member's own `passport_stamps`. When a new one appears, a **small modal** opens:
   - the badge **stamps down** in the middle, using the existing "thunk" animation from the booklet;
   - a **gentle burst** of a few seeds and leaves in the badge's ink colour, about one second long. It's not full-screen confetti: the burst should be calm, in line with the rest of WIOF;
   - **"You earned Three Seeds"** and its meaning line ("Three different actions: small things planted that will grow");
   - buttons: **See it in my Passport** (opens the booklet on that page, where the stamp lands again), **Share** (the badge card, §6), and **Close**.
3. **Several badges at once** (the 3rd action can earn both Three Seeds and Delta) appear in **one** modal: "You earned 2 badges", swipe between them. Never two modals in a row.
4. **Earned while away:** a badge granted by an admin, a challenge closing or a slow server shows the same moment **once**, on the next visit.

**Where it appears:** on **whatever page the member is on** when the badge arrives: Take Action, Explore next, the home page's "Did you try it?", the end of a story, My Journey. One listener in the app shell (signed-in members only) shows the moment, so no page has to know about badges. Exceptions:
- **On the Passport page itself**, there's no modal: the booklet turns to the badge's page and the stamp lands there.
- **It waits** while a video plays (it shows when the video is paused or has ended), during the EQ reflection, on sign-in or sign-up, and in the admin pages. It shows on the next normal page.
- **If the member leaves before it shows**, it stays queued (via `passportSeenAt`) and shows on the next visit.

**Rules for the moment:**
- **It never stacks on another overlay.** If the welcome, the consent banner, the subscribe panel or another modal is open, the moment waits its turn. It also never opens during an EQ reflection or a video.
- **Reduce motion:** no burst and no drop. The badge just appears.
- **"Seen" is stored separately from the award record:** a `passportSeenAt` time on the member's profile. Award records stay server-only (no client writes). Anything earned after `passportSeenAt` counts as new.
- **Contributor badges** show the admin's reason: "Storyteller — thank you for your story *River of Glass*".
- **Bigger milestones** (pentagon, hexagon, One Family) get the same moment with one more line, for example "All five elements. One family." Bigger confetti would make it feel like a score.
- Optional: a Settings switch, **"Show badge celebrations"**, on by default. The badge is still earned and shows in the Passport either way.
- Analytics: `badge_moment_shown`, `badge_moment_open_passport`, `badge_moment_share`. Measure usefulness, not pressure.

## 7. Ideas to try next

- **Share a page:** a stamped page as a 1080×1080 image (reuse `util/impact-share-image.ts`). Superseded by §6, where one badge is the default share.
- **A new-stamp moment:** now designed in §6a.
- **Seasonal stamps** from the Environment Calendar (for example World Water Day: read or act on that day).
- **Travel notes** written by the member (a reflection per month), private by default.
- **Cover colour by home element.**
