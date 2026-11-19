# Planet Passport v1: server-awarded stamps — implementation proposal

**Status:** proposal, awaiting approval (2026-11-19). Nothing in this document is built yet.
**Governs:** docs/roadmap/WIOF_Planet_Passport_Production_Implementation_Contract_v1.md. Design: docs/PLANET_PASSPORT_DESIGN.md.
**Branch:** `feat/planet-passport-design`, staging only. No prod deploy without explicit approval.

## 1. Objective and user value

Make every Passport stamp a **permanent record that the server decides**, with its real date. Issue the Passport itself when a member completes their first steps (Earthrise). Today stamps are worked out in the browser on every page load: they have no dates, and they vanish after a reset.

## 2. Decisions this proposal builds on (user, 2026-11-19)

| # | Decision |
|---|---|
| D1 | Four families: travel, milestone (corners = count), streak, contributor (design §3a) |
| D2 | **Resets keep stamps** by default; an optional **"Also clear my Passport"** checkbox clears them |
| D3 | Existing members: **rebuild real dates** from history where provable; otherwise **"Earned before launch"** |
| D4 | **Ladder brake:** at most **one new different action per day** counts towards milestone badges |
| D5 | **The Passport is issued with Earthrise** (all 5 first steps). Before that, a "waiting" cover shows the steps |
| D6 | Contributors without an account claim through a one-time link (later workstream) |

D7 (2026-11-19): **a contributor claim link issues the Passport straight away**: the one exception to D5. It is built with contributor badges, not in v1.

## 3. Scope

**In v1**
1. **Catalogue:** the new families and names (design §3a) as one versioned code module, `functions/passport-catalogue.js`. A sync script copies it into `passport_stamp_defs` so the app can show unearned stamps.
2. **Evaluator:** `functions/passport.js`, pure and unit-tested. It takes the trusted state (`user_metrics`, the profile's streak and `preferredElements`) and returns the stamps earned.
3. **Ladder state on `user_metrics`**, kept by the existing triggers:
   - `ladder.actions`: different actions counted under D4;
   - `ladder.elements`: elements reached through those actions;
   - `ladder.elementDays`: days with an action in each element, used by the Guardians so tapping one action 5 times doesn't earn a Guardian;
   - `ladder.maxActionWeeks`: the most different weeks any one action was done in.
   All are derived only from server-written `action_completed` events. Weeks and days are in IST, matching `impactByMonth`.
4. **`element_visit` event** (Arrival stamps): written once per element by the member's browser, at `{uid}_element_visit_{slug}`. The rules check its shape, the validator checks the slug, and the result is counted in `user_metrics.elementVisits`.
5. **Award trigger** on `user_metrics/{uid}` and `users/{uid}` writes:
   - it evaluates the rules and **creates** `passport_stamps/{uid}_{stampId}` for each newly earned stamp, inside a transaction (the record already existing means it does nothing);
   - each record holds `earnedAt` (server time), `stampId`, `defVersion`, `ruleVersion`, `evidence` (the count that crossed the line) and `dateKnown: true`;
   - when Earthrise is earned, it also creates `passport_holders/{uid}` with `issuedAt`. Records only ever get **added**: a lower count later never removes a stamp.
6. **Feature flag** `site_settings/passport.awardsEnabled`, read only by the server and off by default. It also lets the metrics recompute script skip awards (see risk R2).
7. **Backfill script** `scripts/backfill-passport.js --project staging|prod [--apply]`, a dry run by default:
   - it replays each member's accepted events in date order and finds the moment each stamp was first earned (D3);
   - streak stamps get `dateKnown: false` and are shown as "Earned before launch";
   - it is bounded, logs each member's changes, and needs `--apply` to write anything.
8. **Rules:** `passport_stamps` and `passport_holders` can be read only by their owner (and admins), and no client can write them. `passport_stamp_defs` is public read, with no client writes in v1. Plus the `element_visit` shape rule.
9. **Reset:** `resetEngagementData({ includePassport })`. When it's set, the member's `passport_stamps` and holder doc are deleted. Settings gets the checkbox, off by default. By default stamps are kept (D2); with "clear my Take Action progress", the `ladder` state is cleared too.
10. **Booklet on real data:**
    - "earned" and the date come from `passport_stamps`; progress hints come from the live metrics;
    - before the Passport is issued, the page shows a waiting cover with the 5 steps;
    - when it is issued, the cover opens on Earthrise ("Welcome to your Planet Passport");
    - stamps of the new families and shapes are drawn in the new style (polygons, rosette).
11. **Small hardening**, items found in the audit:
    - `recordUserVisit` stores the member's timezone and applies a change only from the next day, so switching timezones can't add a streak day;
    - turned pages are made `inert` for screen readers;
    - `?demo=1` is admin-only.

**Not in v1** (separate workstreams, in this order): the new-badge moment on every page (design §6a) → Admin → Passport (badge map, rule pick-list, challenges, versions; design §5a) → sharing a badge (§6) → contributor badges and claim links → public profile → self-serve account deletion (which must include the Passport records).

## 4. Data model

| Collection / field | Written by | Read by | Notes |
|---|---|---|---|
| `passport_stamp_defs/{stampId}` | sync script (Admin SDK) | everyone | display data: family, title, meaning, element, shape, ink, hint, order, status, version |
| `passport_stamps/{uid}_{stampId}` | award trigger, backfill script | owner, admins | permanent; never updated, only deleted by "clear my Passport" |
| `passport_holders/{uid}` | award trigger, backfill script | owner, admins | `issuedAt`, `catalogueVersion` |
| `user_metrics.ladder`, `.elementVisits` | existing triggers | owner, admins | derived; recompute rebuilds them |
| `activity_log` `element_visit` | member's browser (rules-checked) | owner, admins | a new event type |
| `site_settings/passport` | admins | everyone | `awardsEnabled` |
| `users.visitTimezone` (+ pending) | `recordUserVisit` | owner | streak hardening |

**Migration impact:** new data is only added; nothing existing changes meaning. `functions/user-metrics.js` (the recompute) learns to rebuild `ladder` and `elementVisits` from events. Existing members need the recompute (dry run, then apply) and then the Passport backfill (dry run, then apply).

## 5. Security and privacy

- **Award records:** clients can't write them; only server code and Admin SDK scripts can. Their IDs are fixed (`{uid}_{stampId}`), so a duplicate or retried award is impossible.
- **The trigger trusts only server-derived data:** `user_metrics`, and only the server-written streak fields on the profile. `preferredElements` is set by the member, which is fine because it's only a choice.
- **Awards are honest:** D4 brakes self-reported speed, and the stamp wording says actions are self-reported (design §4.3).
- **Logs** hold only the stamp ID and uid, no personal data. Rejected `element_visit` events are kept as evidence, the same as other events.
- **Privacy:** nothing is public in v1. Stamps are visible only to the member and admins. The privacy policy gets one line ("Planet Passport records which stamps you've earned and when"), and the reset text mentions the Passport checkbox.

## 6. Acceptance criteria

1. A qualifying event creates **exactly one** stamp record with a server `earnedAt`, including under retried or concurrent triggers.
2. No client can create, update or delete `passport_stamps`, `passport_holders` or `passport_stamp_defs` (rules tests).
3. Six different actions in one day count as **1** on the ladder; spread over 6 days they earn Snowflake. One action tapped 5 times in a day doesn't earn a Guardian.
4. The Passport is issued only once all 5 first steps are done. Before that the waiting cover shows the steps, while other stamps are still recorded silently.
5. Reset without the checkbox keeps all stamps; with it, deletes exactly the member's Passport records and nothing else.
6. Backfill dry run on staging lists the expected stamps and dates, `--apply` writes them, and a second run changes nothing.
7. With `awardsEnabled` off, nothing is awarded; the metrics recompute never awards stamps.
8. The booklet shows real dates, "Earned before launch" where the date isn't known, and the new shapes. It works with the keyboard, a screen reader (turned pages are inert) and reduce motion, on phone and desktop.
9. All existing suites still pass: 254 frontend, 79 functions, 200 rules, the production build and the staging e2e suites.

## 7. Test plan

- **Functions unit:**
  - catalogue validation (unique IDs; milestone shape = target; reachable targets);
  - every rule in the evaluator; the ladder brake;
  - weeks per action (IST weeks, the year boundary);
  - replay dates (D3); the never-remove rule;
  - an idempotent award writer (fake transaction).
- **Rules (emulator):**
  - Passport collections: read own; deny other users, guests and every client write;
  - `element_visit` (fixed ID, own uid, known slug, server time);
  - the Settings checkbox doesn't open any new client write.
- **Frontend unit:** the Passport model maps records and definitions into booklet stamps; waiting vs. issued; "Earned before launch".
- **Staging e2e** (new `npm run e2e:passport`, using the staging test user and a temporary account created and deleted by the script):
  - complete the first steps → the Passport is issued;
  - visit Water → First Drop;
  - 3 different actions over a simulated day boundary (backdating isn't possible, so the brake is checked through the day key);
  - reset with and without the checkbox.
- **Manual QA:** phone and desktop screenshots, keyboard-only, a NVDA pass of the booklet, reduce motion.

## 8. Rollout

1. Build on the branch in small commits (catalogue + evaluator → ladder/visit data → rules → trigger + flag → backfill → booklet → reset → hardening).
2. Staging: `deploy:staging -- -Backend` (with the flag off), then `sync-passport-catalogue --apply`, then `recompute-user-metrics` (dry run → apply), then `backfill-passport` (dry run → apply), then turn the flag on, then e2e + manual QA.
3. Review the staging logs, permissions and reset behaviour together.
4. **Prod only after explicit approval and after the existing gate** (real-use data, full testing, design §0 status). Same order as staging; the user runs the prod scripts.

## 9. Rollback

- **Stop awarding at once:** set `site_settings/passport.awardsEnabled = false`. No deploy is needed.
- **UI:** a hosting rollback to the previous release. `/passport` is not linked from the menus in v1.
- **Data:** the records are additive and harmless if left. `backfill-passport --undo --project X` (with a dry run first) deletes only the records written by a given backfill run (each one carries `source: backfill:{runId}`).
- **Functions:** redeploy the previous functions build. The new trigger and fields are ignored by older code.

## 10. Complexity and risks

**Size:** medium-large: about 8 commits; touches functions (2 new modules, 2 triggers changed, 1 trigger added), rules, 2 scripts, and the Passport page, Settings and the reset.

| Risk | Mitigation |
|---|---|
| R1. Stamps awarded from a bug in the evaluator are permanent | flag off by default; staging backfill dry run reviewed by the user; `--undo` by run ID |
| R2. A metrics recompute triggers mass awards with wrong dates | the award trigger skips writes from the recompute (marker field); dates only come from the backfill's replay |
| R3. The ladder state drifts from events | the recompute rebuilds it from events; unit tests share one code path |
| R4. Trigger fan-out cost (every metrics write evaluates ~40 rules) | pure in-memory evaluation, one read of existing stamp IDs per run, cached per invocation |
| R5. The booklet redesign for the new shapes grows | the shapes are SVG paths in the existing stamp component; layout unchanged |
| R6. The streak timezone fix changes streaks for travellers | the change applies from the next day only; never resets a streak |
