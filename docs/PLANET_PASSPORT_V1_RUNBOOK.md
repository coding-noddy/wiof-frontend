# Planet Passport v1: runbook

How to release, operate and roll back the server-awarded Passport. Design: docs/PLANET_PASSPORT_DESIGN.md. Proposal and decisions: docs/PLANET_PASSPORT_V1_PROPOSAL.md. Definitions: docs/METRICS.md.

## The parts

| Part | Where |
|---|---|
| Catalogue (33 stamps, the only source) | `functions/passport-catalogue.js` |
| Rules and the ladder brake | `functions/passport.js` |
| Award writer | `functions/passport-awards.js`; triggers `awardPassportOnMetrics` (user_metrics) and `awardPassportOnProfile` (users) |
| Backfill dates | `functions/passport-replay.js`, `scripts/backfill-passport.js` |
| Catalogue display copy | `scripts/sync-passport-catalogue.js` → `passport_stamp_defs` |
| On/off switch | `site_settings/passport` `{ awardsEnabled: true \| false }`. Missing means **off** |
| Records | `passport_stamps/{uid}_{stampId}`, `passport_holders/{uid}`: server-only (firestore.rules) |
| Booklet | `/passport` (sign-in only, not in the menus yet); `?demo=1` for admins; `?stamp={id}` opens on that stamp's page |
| New-badge moment | `components/badge-moment` in the app shell. "Seen" = `users.passportSeenAt` (owner-writable, server clock only). Backfilled stamps never pop up. |

## Release order (staging first; prod only with explicit approval)

Run each script as a dry run first and read the output before `--apply`. On this machine use `npm.cmd`, not `npm`, so `-Backend` reaches the script.

1. Deploy with backend: `npm.cmd run deploy:staging:quick -- -Backend` (prod: `deploy:prod`). Awards stay off, because the switch doesn't exist yet.
2. `node scripts/sync-passport-catalogue.js --project staging` → `--apply`.
3. `node scripts/recompute-user-metrics.js --project staging` → `--apply`. This builds `ladder` and `elementVisits` for existing members. It never awards stamps.
4. `node scripts/backfill-passport.js --project staging` → read the list (stamps per member, dates, "before-launch") → `--apply`. Note the run ID it prints.
5. Switch on: set `site_settings/passport` to `{ awardsEnabled: true }` (an admin, in the Firebase console). The switch takes effect within a minute.
6. Check (see "Checks" below).

On prod the user runs steps 2–5 (Claude can't write to prod).

## Checks after release

- A test account completes a first step → a new `passport_stamps` doc appears within seconds, with `source: trigger`.
- Logs: `awardPassportOn*` lines `{"fn":…,"uid":…,"awarded":[…],"issued":…}`. Errors are logged by `withTriggerErrorLogging` (the trigger never retries; the next write to the member's metrics evaluates again).
- A second run of the backfill dry run lists **0** stamps to add.
- `/passport` for a member without Earthrise shows the waiting cover and steps; for a member with it, the booklet, real dates and "Before launch" where the date isn't known.

## Adding or changing a badge: Admin → Passport

**Dashboard → Planet Passport.** The badge map shows every badge, what earns it, its status, its version and how many members have it. To change a badge:
1. Open it (or **New badge** / **New challenge**), and pick the rule and target.
2. Check the preview and **Who would earn it now?**
3. **Save draft**, then **Publish**.

What the server enforces (`savePassportStamp`):
- the admin check;
- validation (for milestones, the shape follows the target);
- **a new version when a published badge's rule, target or window changes**, while members keep what they earned;
- **retire, never delete** once published;
- an audit record for every change (Recent changes).

The award triggers pick up a change within about a minute. The code catalogue (`functions/passport-catalogue.js`) is now only the seed and the fallback, used if the collection is empty or unreadable.

**Large awards:** publishing, reactivating, or changing the rule of a live badge shows how many members would get it. From 50 (`LARGE_AWARD` in src/app/models/Passport.ts), the admin types that number back to confirm.

**Challenges:**
- A date window (India-time days) and one of three rules: different actions in the window (optionally one element), stories read in the window, or a specific action.
- Members see a challenge from 7 days before it opens, on the booklet's Challenges page and as a banner on Take Action.
- **Calendar day (optional):** link one of the Environment Calendar occasions that fall inside the window. On that day, "Today on WIOF" on the home page shows the challenge.
- Progress is in `passport_challenge_progress`.

## Adding or changing a stamp in code (seed and fallback only)

1. Edit `functions/passport-catalogue.js`:
   - **New stamp:** add it with `version: 1` and a rule type the evaluator knows. A milestone's shape must match its target (3 ▲, 4 ■, 5 ⬟, 6 ⬢).
   - **Changing the rule or target** of a published stamp: bump that stamp's `version`. Members who earned it keep it (and its date).
   - **Removing:** set `status: 'retired'`. Never delete a stamp. Members who earned it keep it.
   - Bump `CATALOGUE_VERSION`.
2. `npm run test:functions`: `validateCatalogue` refuses mismatched shapes, unreachable targets and duplicate IDs.
3. Deploy functions, then `sync-passport-catalogue.js --apply`.
4. Members who already qualify for a **new** stamp get it on their next activity, dated then. To date it from history instead, run the backfill (dry run first).

A new **kind** of rule (for example "joined a workshop") needs code in `progressFor` (functions/passport.js and its display mirror in src/app/models/Passport.ts), plus tests.

## Rollback

| Problem | Do this |
|---|---|
| Wrong stamps being awarded | Switch off: `site_settings/passport.awardsEnabled = false`. No deploy needed. |
| A bad backfill run | `node scripts/backfill-passport.js --project X --undo RUN_ID` (dry run) → add `--apply`. It removes only the records of that run. |
| A bad trigger-awarded stamp | Switch off, fix the rule, and remove the specific records by hand (Firebase console); they carry `source: trigger` and `evidence`. Keep a note in the release log. |
| Booklet broken | Hosting rollback to the previous release (Firebase console → Hosting → release history). `/passport` isn't linked from the menus in v1. |
| Functions broken | Redeploy the previous functions build. Older code ignores the new fields and collections. |

## Reset and deletion (decision D2)

- **"Delete my data"** in Settings keeps stamps by default. *Also clear my Planet Passport* deletes the member's `passport_stamps` and `passport_holders` (`resetEngagementData { includePassport: true }`).
- Element visits are always cleared by a reset. The ladder is cleared with *Also clear my Take Action progress*.
- Stamps backed by progress the member kept can be earned again, dated the day they're re-earned.
- **Account deletion** isn't self-serve yet (see the Phase 2 open items). When it's built, it must delete `passport_stamps` (by `userId`) and `passport_holders/{uid}`.
