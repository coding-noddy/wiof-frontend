# Admin → Passport: badges and challenges managed by admins — proposal

**Status:** proposal, awaiting approval (2026-11-21). Nothing here is built.
**Builds on:** design §5 and §5a (docs/PLANET_PASSPORT_DESIGN.md), Passport v1 (docs/PLANET_PASSPORT_V1_PROPOSAL.md, built and on staging).
**Governs:** docs/roadmap/WIOF_Planet_Passport_Production_Implementation_Contract_v1.md §6.1, §6.6, §9.

## 1. Objective

Admins can see **which badge is given for which milestone**, and add, change, schedule and retire badges and challenges **without a release**, while the server stays the only one that decides who earns what.

## 2. The architecture change (why this needs approval)

Today the catalogue is **code** (`functions/passport-catalogue.js`), copied into `passport_stamp_defs` for display. This proposal makes **`passport_stamp_defs` the source of truth**:

- The award trigger and the backfill **read the definitions from Firestore** (cached for 60 s per instance), not from code.
- The code catalogue becomes **the seed**: the 33 stamps written once by the sync script (already done on staging), and the fallback if the collection is empty or unreadable.
- **Admins never write definitions directly.** The rules stay `write: false`. Every change goes through an admin-only callable, `savePassportStamp`, which checks the admin (the `admins` collection, as today), validates the definition (`validateCatalogue`, extended), applies the version rules (§4) and writes an audit record. That gives one place to enforce everything the contract asks (§6.6, §9).

## 3. What admins get

**3.1 Badge map (Admin → Passport, first screen)**
- Every badge, grouped by family: Milestones (by shape ● ▲ ■ ⬟ ⬢), Travel, Streak, Challenges (and later Contributor).
- Each badge shows:
  - its live stamp art (the booklet's own component);
  - a plain **"Earned when"** sentence generated from its rule ("Keep one action going in 6 different weeks");
  - its status (draft, active, scheduled, retired), its version, and **how many members have earned it**.
- Filters by family, element and status.

**3.2 Badge form**
- The fields: family, name (1–2 lines), meaning line, caption, element, ink, then **"Earned when"** = a rule from a pick-list plus a target.
- **Milestones: the shape is set from the target** (3 ▲ … 6 ⬢). An impossible target is refused (for example 6 elements).
- **Live preview**, earned and not yet earned.
- **"Would earn it now":** before publishing, the server counts how many members already meet the rule. Only a count is returned, never names.
- Buttons: Save draft, Publish, Retire.

**3.3 Rules in the pick-list**
- Today's 11 rule types: first steps, element visit, stories read (all or one element), videos finished, polls voted, EQ taken, different actions, elements acted in, days in an element, one action N weeks, visit streak.
- **New:** "**a specific action done** N times". Needs one small new counter, `user_metrics.actionCompletions{actionId}`, kept by the existing action trigger and rebuilt by the recompute.

**3.4 Challenges (seasonal badges)**
- A challenge is a badge with a **date window** (optionally linked to an Environment Calendar day) and a **windowed rule**: only activity inside the window counts.
- Windowed counts can't come from all-time totals, so the server keeps a small progress record per member and challenge: `passport_challenge_progress/{uid}_{challengeId}`. It's updated by the existing triggers when an event falls inside an active window. Server-only, like the stamps.
- **First release, three windowed rule types** (they cover the World Water Day kind of challenge):
  - actions done (optionally in one element);
  - stories read (optionally in one element);
  - a specific action done.
- A challenge opens and closes by itself. Once earned, it stays earned.

## 4. Versions and history (contract §6.1, §6.6)

| Change to an active badge | Effect |
|---|---|
| Name, meaning, caption, ink | Edited in place; shows everywhere |
| Rule or target | **New version** (`version + 1`). Earned records keep the version they were earned under; the new rule applies from now on. Nobody loses a badge. |
| Retire | Status `retired`: no new awards; members keep it; it shows only to those who earned it |
| Delete | **Not possible** for anything published. A never-published draft can be deleted |

Every save writes `passport_stamp_audit/{autoId}`: who, when, the action, and the definition before and after. Readable by admins only.

## 5. Data and security

| Collection | Written by | Read by |
|---|---|---|
| `passport_stamp_defs` | `savePassportStamp` (admin, server) | everyone (drafts: admins only, see below) |
| `passport_stamp_audit` | `savePassportStamp` | admins |
| `passport_challenge_progress` | triggers | the owner, admins |
| `user_metrics.actionCompletions` | the action trigger | the owner, admins |

- **Drafts are hidden from members.** Rules: public read only where `status != 'draft'`. The app queries active and retired definitions only.
- A callable that counts "would earn it now" is admin-only and returns a number.
- Members see nothing new about other members.

## 6. Scope and non-goals

**In:**
- the badge map; the badge form with live preview and "would earn it now";
- versioning, retire and the audit trail;
- the specific-action rule;
- challenges with the three windowed rule types;
- the trigger reading definitions from Firestore;
- tests, and a runbook update.

**Not in this release:**
- contributor badges and claim links (the next workstream);
- sharing (built separately);
- the public profile;
- custom art uploads (stamps keep the generated SVG shapes);
- editing a badge's rule *type* after publishing (make a new badge instead).

## 7. Acceptance criteria

1. An admin creates, previews, publishes and retires a badge on staging without a deploy, and the next qualifying member action awards it.
2. A member (or any non-admin) can't create or change a definition, through the rules or the callable (rules tests + callable tests).
3. Changing a rule creates a new version, and earlier records keep theirs. Retiring never removes an earned badge.
4. A milestone with a mismatched shape or an impossible target is refused, server-side.
5. "Would earn it now" matches what the backfill dry run would award for that badge.
6. A challenge counts only activity inside its window, opens and closes by itself, and its badge stays after it closes.
7. Every change appears in the audit trail.
8. Existing behaviour doesn't change: all v1 tests and both staging e2e suites still pass.

## 8. Tests

- **Functions:**
  - `savePassportStamp` validation and versioning;
  - the admin check;
  - evaluator reading Firestore definitions (with the code fallback);
  - windowed progress (inside, outside and on the edge of a window, in IST);
  - the specific-action rule.
- **Rules:** definitions not writable by anyone, drafts hidden from members, audit admin-only, challenge progress owner-only.
- **Staging e2e** (admin test account):
  - create → preview → publish a badge, then a temporary member earns it;
  - change the target → version 2;
  - retire;
  - a challenge with a window starting a minute from now.
- **Manual QA:** the admin page on desktop and tablet, keyboard and screen reader on the form.

## 9. Rollout and rollback

- **Rollout:**
  1. Deploy (the definitions already exist on staging).
  2. The trigger switches to reading Firestore, with the code fallback.
  3. The admin page appears in the admin menu.
  4. Prod only with your approval, after staging QA.
- **Rollback:**
  - Hosting rollback hides the admin page.
  - A functions rollback returns to the code catalogue.
  - Badges changed by mistake: the audit trail has every "before"; a retired badge can be re-activated.

## 10. Size and risks

**Size:** large, about 10 commits: callable + validation + audit, trigger change + fallback, the counter, challenges, the admin page (map + form), tests.

| Risk | Mitigation |
|---|---|
| An admin publishes a badge that awards thousands at once | "Would earn it now" count shown before publishing, plus a confirm step when the count is high |
| A bad definition breaks the trigger | Validated on save, and the trigger skips an invalid definition (logged) instead of failing the rest |
| Cost: the trigger reads the definitions | Cached for 60 s per instance; ~40 small documents |
| Challenge progress write volume | Only for events inside an active window, one small document per member and challenge |

## 11. Decisions needed from you

1. **Approve the architecture change** (definitions in Firestore become the source; admins change them only through the server)?
2. **Who may publish:** every admin, or should publishing need a second "owner" role? I recommend every admin for now; the audit trail shows who did what.
3. **Challenges in this release, or later?** I recommend in this release, with the three windowed rules. Or ship the badge map and form first, and add challenges second.
4. **Should members see an upcoming challenge before it opens** (as an outline, "Opens 22 March")? I recommend yes, from 7 days before.
