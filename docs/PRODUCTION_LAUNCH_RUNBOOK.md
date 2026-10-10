# Production Launch Runbook (one-time)

Production (`wiof-production`) was last deployed at **v2.0.2-prod on 2026-08-12**. Since then, 28 commits have added sign-in and the engagement layer, the `admins` model, 12 new Cloud Functions, the hardened Firestore/Storage rules, composite indexes, hero videos, Take Action, search, site feedback (footer form, admin Feedback page, My Feedback) and a separate Home category for Coffee Conversations. None of that backend has ever been deployed to production. Today production runs only `socialMetaTags`, the 2026-08 hosting build, and the old rules. Production has no public sign-in yet; the only accounts are admins using email/password, and the old rules treat *any* signed-in account as allowed to write content. After this launch, the public can sign in with Google, so admin rights must come from the `admins` collection instead.

This runbook is the one-time sequence to get production onto the current release. Data steps use [`scripts/prod-launch.js`](../scripts/prod-launch.js). Every step of that script that writes is a **dry run unless you pass `--apply`**, so run each step once without it and read the output first.

---

## Launch day: one command

Once Phase 0 is done (key saved, Console settings in place, everything committed, managed export taken), pick a **low-traffic time** and run:

```powershell
.\launch-production.ps1 -AdminEmails "admin1@example.com,admin2@example.com"
```

[`launch-production.ps1`](../launch-production.ps1) runs Phases 1–3 in 15 steps, in order, and stops at the first failure:

1. Local checks: the key is for wiof-production, the git tree is clean, you're on `master` in sync with `origin/master`, the Firebase CLI has access, and no `release-<version>` branch or `v<version>-prod` tag exists yet. You then confirm the branch and commit being deployed. It also warns if the launch curtain's instant-show window (`OPTIMISTIC_UNTIL`) has already passed.
2. **Prerequisites**, checked by API: Google and email sign-in are enabled, and the non-redirect custom domain is authorized. Then you confirm the OAuth consent screen by hand.
3. Rules tests.
4. Preflight.
5. Backup of the data.
6. **Snapshot of the deployed configuration**, the rollback kit (see **Rollback**).
7. Seed admins.
8. Content: it shows the dry run and asks you to confirm.
9. **Home Coffee Conversation** migration: it shows the dry run and asks you to confirm.
10. **Launch ceremony on** (`prod-launch.js launch-ceremony --on --apply`). This runs before the deploy, so the new site's first visitors get the curtain; the old app ignores the setting. Pass `-SkipLaunchCeremony` to leave it off.
11. **Deploy**: `deploy.ps1` asks you to type `yes`. It deploys functions and indexes, then rules, then Hosting (see Phase 2). Answer yes to the Storage IAM prompt.
12. Poll backfill.
13. Wait for indexes.
14. Verify. It also reports whether the launch ceremony is on.
15. Smoke test.

Everything is logged to `scripts/backups/launch-<timestamp>.log`. After fixing a failure, resume with `-StartAt <step>` (`checks`, `prerequisites`, `tests`, `preflight`, `backup`, `snapshot`, `admins`, `content`, `homecoffee`, `ceremony`, `deploy`, `polls`, `indexes`, `verify`, `smoke`). The script prints the exact resume command when it stops. **Still manual afterwards:** the Phase 3 browser check, adding admins who had no production account before launch, and the **After launch** section.

The phases below are the same steps, broken out for reference or for running one at a time.

---

## Phase 0: Prerequisites (do these before launch day)

### Code
- [ ] Commit everything, merge into **`master`** and push. Production deploys **only from `master`**, the remote's default branch. The launch script refuses any other branch, and refuses if local `master` differs from `origin/master`. (`main` also exists, but it's 79 commits behind and isn't used.) `deploy.ps1` builds from the **working tree**: without `-SkipBranch` it creates and checks out `release-<package.json version>` and tags `v<version>-prod`.
- [ ] Decide the launch version in `package.json` (the footer shows it). It must not already have a `release-<version>` branch or `v<version>-prod` tag. `deploy.ps1` would switch to that **existing** branch and ship its old code, so the launch script refuses. The launch version is **`6.0.0`** (set 2026-10-11). It's free: no `release-6.0.0` branch or `v6.0.0-prod` tag exists; the latest staging tag is `v5.6.3-staging`.
- [ ] `git checkout master && git pull` before running the script. `deploy.ps1` branches `release-<version>` from the current commit.
- [ ] `npm run test:rules` passes. This needs Java 21; the deploy scripts run it automatically.

### Credentials
- [ ] Production service account key: Firebase Console → **wiof-production** → Project settings → Service accounts → *Generate new private key* → save as `scripts/service-account.prod.json`. It is gitignored. Never commit it.
- [ ] Staging key at `scripts/service-account.json` (already present). The content step copies from staging.
- [ ] `firebase login` uses an account with Owner/Editor access on wiof-production.

### Firebase Console / Google Cloud (wiof-production)
- [ ] **Authentication → Sign-in method → Google: enable** and set the support email. As of 2026-10-02 this is **not yet enabled** in production; `prod-launch.js prerequisites` fails until it is.
- [ ] Keep **Email/Password** enabled (existing admin accounts use it).
- [ ] **Authentication → Settings → Authorized domains** include `worldisonefamily.com`, `www.worldisonefamily.com` (if used), `wiof-production.web.app` and `wiof-production.firebaseapp.com`.
- [ ] **Google Cloud → APIs & Services → OAuth consent screen**: app name *World Is One Family*, support email, authorized domain `worldisonefamily.com`. Set **Publishing status: In production**. While it's "Testing", only listed test users can sign in with Google.
- [ ] If the YouTube API key in `environment.prod.ts` has HTTP-referrer restrictions, they must include the production domains.
- [ ] Project is on the **Blaze** plan. It already runs `socialMetaTags`, so it should be.
- [ ] Recommended: **Google Cloud → Billing → Budgets & alerts**, add a monthly budget with email alerts. Public sign-in and 13 functions make usage less predictable than before.

### People
- [ ] Tell the admins the launch time. They shouldn't edit content during the deploy (about 15 minutes).
- [ ] Tell the admins how they'll log in afterwards: the **same email/password as today**. They shouldn't start using "Sign in with Google" with the same Gmail address. Firebase merges the two accounts, so admin rights carry over, but the password login may stop working.
- [ ] Decide who watches the site for the first 48 hours (see **After launch**).

### Backup (launch day, before running the script)
- [ ] **Google Cloud Console → Firestore → Import/Export → Export entire database** to `gs://wiof-production.appspot.com/firestore-backups/<date>`. This is the restorable backup. The script's `backup` step writes readable JSON, not a one-click restore. On this machine the `gcloud` CLI is broken (it reports that Python is missing), so use the Console.

---

## Phase 1: Prepare data (old site stays live; safe to do hours or days ahead)

The old production app never reads `admins`, `actions`, `hero_videos` or `poll_results`, so writing them now changes nothing for current visitors.

```bash
node scripts/prod-launch.js prerequisites
```
This is read-only. It checks via API that Google and email sign-in are enabled and that each custom Hosting domain (excluding redirect-only ones like `www`) is an authorized sign-in domain. It exits 1 with the exact Console fix if not.

```bash
node scripts/prod-launch.js preflight
```
This is read-only: collection counts, auth users (with providers), existing admins, and warnings. Note which emails should be admins.

```bash
node scripts/prod-launch.js backup
```
This writes every top-level collection to `scripts/backups/prod-<timestamp>/` (gitignored). For a restorable managed export, also run the `gcloud firestore export …` command the script prints.

```bash
node scripts/prod-launch.js snapshot-config
```
This is read-only. It saves production's configuration **as actually deployed**, not as git says it should be, to `scripts/backups/prod-config-<timestamp>/`:
- Firestore and Storage rules (the live rulesets)
- indexes
- the live Hosting version ID and its config
- the functions list
- auth settings

It also writes a self-contained `rollback/` folder and a `ROLLBACK.md` with the exact commands for that snapshot. A first snapshot was taken on 2026-10-02 (live Hosting version `57ec34a86c70ba1b`), and the launch script takes a fresh one.

```bash
node scripts/prod-launch.js seed-admins --email admin1@…,admin2@…
node scripts/prod-launch.js seed-admins --email admin1@…,admin2@… --apply
```
**This is critical.** Today the only production accounts are the admins' email/password logins, so "signed in" has meant "admin". The new rules require an `admins/{uid}` doc instead, for both Firestore content and Storage uploads, because public Google sign-in will create ordinary accounts. Seed every admin who already has a production account now. If an admin only has a Google account and has never signed in to production, they get handled in Phase 3. Production's accounts as of 2026-10-02, all email/password: `nmaulavi5`, `sri.shiv`, `ashleshadighe1106`, `kumawat.krishna87` and `devrajsoni.sustainability` (all `@gmail.com`). Pass the ones who should be admins.

```bash
node scripts/prod-launch.js seed-content
node scripts/prod-launch.js seed-content --apply
```
This copies the **40 reviewed actions** from staging. That's the editorially reviewed catalogue, including the Earth-tag correction. The superseded action is not copied, because production never had it. The step refuses to run unless staging is in the verified 40-action state. It also copies the six **hero video slots** from staging. The dry run prints each video's title, so check that no test video is about to go to production. Docs that already exist in production are skipped unless you pass `--force`.

```bash
node scripts/migrate-home-coffee-conversation.js prod
node scripts/migrate-home-coffee-conversation.js prod --apply
```
This moves the home page's Coffee Conversation into the new **Home** category, so the home page and the element pages are managed separately. The script picks the conversation the home page shows today, the newest by interview date: *WIOF's Founder Shiv on Corporate Purpose…* (`JBAJyPMR7Cmp7HC2D2AN`, currently **Energy**). It's safe to run ahead, because the old app's home page shows the newest conversation of any category, so it keeps showing this one. The only visible change is that it leaves the Energy page. If you skip the step, the new home page falls back to the newest conversation overall, so nothing breaks. Re-running it is a no-op. Done on staging on 2026-10-06.

---

## Phase 2: Deploy (launch window)

```powershell
npm run deploy:prod -- -Backend
```
In order, this:
1. Runs the rules tests (via npm's `predeploy:prod`), which must pass.
2. Asks you to type `yes`.
3. Creates the `release-<version>` branch.
4. Builds with `--configuration production`.
5. Deploys **functions and indexes** first: all 13 Cloud Functions in us-central1. This is the slow part, 5–10 minutes. It's safe while the old site is still live, because the old app never calls them.
6. Deploys **Firestore and Storage rules**.
7. Deploys **Hosting** immediately after. Any failure stops the later steps.
8. Tags `v<version>-prod` and pushes the tag.

What to expect:
- **Storage rules prompt.** The new Storage rules read Firestore (`firestore.exists`) to check admins, so the CLI asks to grant the Storage service account a Firestore IAM role. Answer **yes**, or admin uploads will fail.
- **Functions take a while.** The first deploy of 12 new functions can take 5–10 minutes. If the CLI asks to enable an API, accept.
- **Indexes build in the background.** They can take a few minutes after deploy. Until then, My Journey and history queries may error. Check status under Firestore → Indexes.
- **Rules and Hosting ship back to back, always.** `-Backend` does that. Between the rules step and Hosting going live (about a minute), visitors still on the old app can see the poll results and the newsletter duplicate check fail. Admin content editing keeps working, as long as admins are seeded, which happens earlier in the launch.

---

## Phase 3: Immediately after deploy

```bash
node scripts/prod-launch.js backfill-polls --apply
```
Do this **right away**. The new rules make raw `Polls` votes admin-only, and the site now shows results from `poll_results`, which starts empty. Until this runs, every poll shows 0 votes. The backfill is an absolute recount, so running it after `onPollVoteCreated` is live is always correct.

Admins who had no production account in Phase 1 should sign in on production with Google once, then run:
```bash
node scripts/prod-launch.js seed-admins --email them@… --apply
```

```bash
node scripts/prod-launch.js verify
```
This is read-only and exits 1 on any failure. It checks admins (each with a real auth user), hero video slots, that `poll_results` match the raw votes, and that the catalogue has exactly 40 active actions with no duplicates. Then confirm the functions are deployed:
```bash
firebase functions:list --project wiof-production
```

```bash
node scripts/prod-launch.js smoke --apply
```
This is a live end-to-end Take Action test through the deployed rules and functions. It covers DAILY, REPEATABLE, OCCASIONAL, multi-element, Spirit and new-16 completions; forgery and cross-user attempts being blocked; `user_metrics` correctness; and an admin edit, deactivate and reactivate. It uses throwaway users and deletes them and their records afterwards. The one action it touches is restored exactly.

### Manual browser check (on worldisonefamily.com, in a private window)
- [ ] Home, all five element pages, blogs, videos, news, calendar, About load as a **guest**.
- [ ] Home shows the founder Coffee Conversation, and the Energy page shows only the Biogas one. Admin → Coffee Conversations lists the founder interview with a **Home** badge.
- [ ] Polls show real results; voting works.
- [ ] Newsletter subscribe works, and a duplicate email is detected.
- [ ] **Sign in with Google** works (popup, then profile created). Sign out works.
- [ ] My Journey loads (metrics, history). Settings page saves.
- [ ] Take Action page: 40 actions, element filter, search, complete an action, it shows in My Journey.
- [ ] Bookmark a blog; it appears in My Library.
- [ ] Share a blog link on WhatsApp: the preview shows the blog's own title and image.
- [ ] Admin: dashboard opens for an admin and **not** for a normal user. Edit a blog, upload an image, edit a Take Action, change a hero video.
- [ ] Search on Blogs / Videos / Take Action.
- [ ] **Feedback, as a guest:** footer → *Share feedback*, send one. The popup says "Sign in to track its status" and closes with a thank-you toast.
- [ ] **Feedback, signed in:** send one. Name and email are prefilled, and it appears under avatar menu → **My Feedback** as *Received*.
- [ ] **Feedback, admin:** Dashboard → **Feedback** lists both entries. Set the signed-in one to *Resolved*, then check that My Feedback shows *Resolved*. Export Excel downloads a file. Delete the two test entries afterwards.

### Launch ceremony (curtain + ribbon cutting)
The curtain reads `site_settings/launch_ceremony`, which needs the new Firestore rule. The launch script's backend deploy includes it. Without the rule, or with the switch off, the site simply opens normally.
- [ ] The launch script turned it on before the deploy (unless you passed `-SkipLaunchCeremony`; then use Admin → **Launch Ceremony** → **Turn on**). Admin → Launch Ceremony should show **On**.
- [ ] In a private window: closed curtains with the ribbon appear on any page; *Cut the ribbon* splits it, the curtains open with confetti, and the welcome modal is underneath. Reload: it doesn't show again. *Skip* also works.
- [ ] Admins can see it again with **Preview on this browser**.
- Until the end of **12 October 2026 (IST)** the curtain appears instantly and is then confirmed with Firestore; if the switch is off it disappears within a few seconds. After that date it only appears once Firestore confirms it's on (`OPTIMISTIC_UNTIL` in `launch-curtain.component.ts`). If the launch moves, update that date.

---

## After launch

### Same day
- [ ] **Git housekeeping.** `deploy.ps1` left you on `release-<version>`, with the footer version change uncommitted. Commit it, push the branch, and merge it back into `master`. The `v<version>-prod` tag is already pushed.
- [ ] Delete the extra copy of the production key in your Downloads folder. Keep only `scripts/service-account.prod.json`.
- [ ] Add any admins who signed in for the first time after launch (`seed-admins --email … --apply`).

- [ ] **Turn off the launch ceremony** when the launch window ends (Admin → Launch Ceremony → **Turn off**). Its text says "Launching today". No deploy needed; it stops on each visitor's next page load.

### First 48 hours
- [ ] **Function errors:** Google Cloud Console → Logging, filter `severity>=ERROR`, or `jsonPayload.fn="<functionName>"` for one function. See `docs/OPERATIONAL_MONITORING.md`.
- [ ] **Sign-ups:** Firebase Console → Authentication → Users. New Google accounts should appear with a matching `users/{uid}` profile.
- [ ] **Usage and cost:** Firebase Console → Usage and billing (Firestore reads, function invocations).
- [ ] Spot-check that poll results update when someone votes.
- [ ] Share one more blog link and check that the preview shows the blog's own image.

### Rollback decision
Roll back only for **site-wide** breakage: pages not loading, sign-in broken for everyone, or admins locked out with no quick fix. Use the table below, and roll back Hosting and rules **together**. Fix anything smaller forward with a normal deploy.

---

## Rollback

**One command: [`restore-production.ps1`](../restore-production.ps1).**

```powershell
.\restore-production.ps1                     # lists the saved snapshots
.\restore-production.ps1 -Snapshot scripts\backups\prod-config-<timestamp>
```

It restores a snapshot's **Hosting version and Firestore + Storage rules together**, rules first and the site immediately after. Steps:
1. It **snapshots the current state first**, so every restore can itself be undone.
2. It asks you to type `yes`.
3. It verifies the live site serves exactly the snapshot's files, by comparing a fingerprint of every path and content hash. It also checks the rules match.
4. It reports, but doesn't change, any differences in Cloud Functions and Google sign-in. Neither breaks the restored site.

- **Roll back after launch:** restore the snapshot `launch-production.ps1` took at its `snapshot` step (the pre-launch state).
- **Roll forward again:** restore the undo-point snapshot that the rollback printed at the end.

Tested on staging on 2026-10-02: rollback, roll forward and rollback again, each verified. Each snapshot folder also has a `ROLLBACK.md` with the same steps as plain commands, if you'd rather run them by hand. Data is not touched; see the table's **Data** row.

The site keeps all Hosting versions (no retention limit), so old versions stay restorable.

| What | How | Notes |
|---|---|---|
| Hosting | Firebase Console → Hosting → Release history → **Rollback** on the previous release | Instant. |
| Firestore + Storage rules | From the kit: `cd scripts/backups/prod-config-<ts>/rollback` then `firebase deploy --only firestore:rules,storage --project wiof-production`. These are the live rulesets as captured, not git's copy. | **Only together with a Hosting rollback.** The old app needs the old rules, and the new app needs the new ones. |
| Cloud Functions | Usually leave them: they're additive and harmless to the old app. To remove one: `firebase functions:delete <name> --region us-central1 --project wiof-production` | |
| Data | Nothing existing is modified. Phase 1/3 only add `admins`, `actions`, `hero_videos` and `poll_results`, which the old app ignores. Restore from `scripts/backups/prod-<timestamp>/` or the gcloud export if ever needed. | `Feedback` docs that visitors send after launch are kept in Firestore through a rollback. The old app has no feedback screens, so nobody can see them until you roll forward. If the rollback will last a while, run `node scripts/prod-launch.js backup` first so you have a copy. |

---

## Known items, not blockers

- **Blog share previews** were broken from #21 (2026-08-29) until 2026-10-02, because the Hosting rewrite to `socialMetaTags` had been dropped. It's restored. `socialMetaTags` is now pinned to `us-central1` in **both** projects, because the rewrite is shared, and that's already live and verified on staging. Production picks it up with this deploy. Check after deploy: `curl -s -A "facebookexternalhit/1.1" https://worldisonefamily.com/element/<element>/blog/<slug> | grep og:` should show the blog's own title and image.
- **Node.js runtime.** Functions moved from Node 20 (decommissioned 2026-10-30) to **Node 22** on 2026-10-02 and are verified on staging. The production deploy updates the existing `socialMetaTags` in place, and the other 12 functions are created on Node 22.
- **Blog-page caching.** `socialMetaTags` serves the app page to normal visitors with `Cache-Control: public, max-age=0, s-maxage=600`. The CDN caches it, and Hosting purges that cache on every deploy, while browsers always revalidate. That way no visitor keeps an old page pointing at hashed files a new deploy removed.
- **App Check** is not configured (deferred; see `docs/PERMISSION_MATRIX.md`).
- **Site feedback has no rate limit.** Anyone can create `Feedback` docs. The rules validate every field: category, message length 10–2000, `status` forced to `new`, server timestamp, and `userId` only as the sender's own uid. Nothing stops repeated submissions, though. If spam shows up, delete it from Dashboard → Feedback; the long-term fix is App Check (see `docs/SECURITY_FINDINGS_REGISTER.md`). The collection is created by the first submission. It needs no seed data and no new index, because My Feedback filters on `userId` only and sorts in the browser.
- **Indexes:** production's four content-page indexes (In Focus, Course In Focus, NGO In Focus) were created by hand and were missing from `firestore.indexes.json`. They were added on 2026-10-02, in production's exact format, and verified with a staging deploy. Staging still has two hand-made `activity_log` indexes that aren't in the file. The CLI only reports them; it never deletes without `--force`.
- `config` and the legacy `admin` collection exist on staging with no rules match. Nothing in the app reads them: the Privacy Policy page's `config` read is commented out.
