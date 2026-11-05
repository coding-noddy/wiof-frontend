# Phase 2 release runbook (8.4.0 → 8.8.0, one deploy)

Production runs **v8.3.0-prod**. This release ships Phase 2 steps 4–7 and the 8.8.0 hardening together:
- connected content;
- the journey experience;
- Today on WIOF;
- Next for you;
- the EQ daily limit, occasion facts and the privacy update.

It changes Hosting, Cloud Functions, Firestore rules and indexes, then runs three one-time data scripts.

The scripts are [`scripts/release.js`](../scripts/release.js) (preflight, snapshot, wait-indexes, verify, rollback) and the existing data scripts. Every script that writes is a **dry run unless `--apply`**: run it once without, read the output, then add `--apply`. Rehearse on staging with `--project staging` first. Every command here was run on staging before this release.

**Before you start:** pick a low-traffic time, and allow about 45 minutes. Have the prod key at `scripts/service-account.prod.json`, and be logged in to the Firebase CLI as a prod owner.

## 1. Merge and check out

1. Merge the PR from `feat/phase2-release-hardening` into `master` with **Create a merge commit**.
2. `git checkout master` and `git pull`.
3. Keep `git status` clean apart from the footer version line, which the deploy writes itself.

## 2. Preflight and snapshot (read-only, about 2 minutes)

```powershell
node scripts/release.js preflight --project prod
node scripts/release.js snapshot --project prod
```

**Preflight** should show:
- Last prod tag `v8.3.0-prod`.
- **NEW** functions `onActionWritten` and `onEnvcalWritten`, and no REMOVED functions.
- **NEW** index `blog_summaries(category ASCENDING, publishDate DESCENDING)`.
- No **DRIFT**. If it lists drift, stop and send me the output. Never deploy with `--force`.

**Snapshot** saves exactly what's live to `scripts/backups/prod-release-<time>/`, which is gitignored, along with a `ROLLBACK.md` for that state. **Keep the folder path:** rollback needs it.

Optionally, also take a full data export: Google Cloud Console → Firestore → Import/Export → Export. Phase 2 only adds data, so you're unlikely to need it.

## 3. Deploy (10–15 minutes)

```powershell
npm.cmd run deploy:prod -- -Backend
```

Use `npm.cmd`, not `npm`: PowerShell's `npm` drops `-Backend`. The script asks you to type `yes`, runs the functions and rules tests, then deploys:
1. functions and indexes;
2. rules;
3. Hosting.

It then tags `v8.8.0-prod`. If function discovery times out, set `$env:FUNCTIONS_DISCOVERY_TIMEOUT=60` and run it again.

## 4. Wait for the index (about 5 minutes)

```powershell
node scripts/release.js wait-indexes --project prod
```

Explore next keeps working while the index builds; it just leaves out the "newest stories" fallback until the index is ready.

## 5. Data scripts (dry run, read the output, then `--apply`)

Run them in this order:

```powershell
node scripts/apply-occasion-facts.js --project prod
node scripts/apply-occasion-facts.js --project prod --apply
node scripts/rebuild-related-content.js --project prod
node scripts/rebuild-related-content.js --project prod --apply
node scripts/recompute-user-metrics.js --project prod
node scripts/recompute-user-metrics.js --project prod --apply
```

- **Facts:** adds the 133 draft facts, matched to prod's occasions by date and name. It lists any it couldn't match; send me those.
- **Related content:** builds the story, action and occasion matches. Run it after the facts, because the facts feed the occasion matching.
- **Metrics:** adds the per-element read counts. A second dry run should show 0 changes.

## 6. Verify (read-only, about 1 minute)

```powershell
node scripts/release.js verify --project prod --snapshot scripts/backups/prod-release-<time>
```

Every check should pass:
- a new Hosting version;
- the pages load;
- every function is deployed;
- every index is READY;
- the related-content matches are built, including occasions;
- per-element reads are recomputed.

It also reports how many facts are still drafts.

## 7. Manual check (about 10 minutes)

**Signed out, on phone and desktop:**

1. **Home:** Today on WIOF shows the occasion, "Did you know?", a "Learn more" link and "Hide for today". "See the full calendar" scrolls to the calendar. The guest welcome appears.
2. **A story:** Explore next shows "Because you read about …" with stories and actions.
3. **Take Action:** opens. An action's details open from a link with `?action=`.
4. **EQ check (Spirit):** shows a result and no save note.
5. **Privacy policy:** dated 5 November 2026, with the "Personalised suggestions" section.

**Signed in:**

6. The welcome after sign-in appears once, for an account with no elements chosen. Your first steps, the journey tiles and **Next for you** appear, each pick with its reason.
7. **My Journey:** shows the story sentence and the element chips.
8. Take EQ three times. The second result says that was the last save for today, and the third says it wasn't saved.
9. **Admin → Calendar:** occasions show "Fact: needs review". Opening one shows the fact card.

## Rollback

Stop and roll back if users hit errors you can't fix forward quickly. Hosting alone is usually enough: the old site works with the new rules and functions.

```powershell
# Dry runs first (they print the exact commands), then add --apply
node scripts/release.js rollback --project prod --snapshot scripts/backups/prod-release-<time> --only hosting
node scripts/release.js rollback --project prod --snapshot scripts/backups/prod-release-<time> --only rules
node scripts/release.js rollback --project prod --snapshot scripts/backups/prod-release-<time> --only functions
```

| Part | Time | When to roll it back | What it does |
|---|---|---|---|
| Hosting | ~1 min | anything users see | serves the snapshot's Hosting version again (`firebase hosting:clone`) |
| Rules | ~1 min | only if the new rules are the problem | deploys the rules exactly as they were live |
| Functions | ~10 min | only if a function is the problem | deletes `onActionWritten` and `onEnvcalWritten`, then redeploys `v8.3.0-prod`'s functions from a temporary git worktree |

**Data needs no rollback.** Phase 2 only adds data:
- `related_auto`;
- `user_metrics.qualityReadsByElement`;
- `users.onboarding` and `preferredElements`;
- occasion facts;
- EQ slots in `activity_log`.

The old app ignores all of it. The old rules accept it too, because profile updates check only the fields that change. The new index is harmless to keep.

After any rollback, run `node scripts/release.js preflight --project prod`, then tell me what happened before trying again.

## Notes

- **Staging-only indexes:** staging has two `activity_log` indexes that aren't in `firestore.indexes.json`. Nothing queries them, because the repo's `(userId, activityType, timestamp DESC)` index covers those queries, and prod doesn't have them. They can be deleted from the staging Console at any time. The deploy never deletes them, because it doesn't use `--force`.
- **Draft facts:** admins review them in Admin → Calendar ("Fact: needs review"). Until an occasion's fact is reviewed and has its own source, the card offers that occasion's link as "Learn more", never as "Source".
