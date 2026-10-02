# Production Launch Runbook (one-time)

Production (`wiof-production`) was last deployed at **v2.0.2-prod on 2026-08-12**. Since then, 28 commits have added sign-in and the engagement layer, the `admins` model, 12 new Cloud Functions, the hardened Firestore/Storage rules, composite indexes, hero videos, Take Action and search. None of that backend has ever been deployed to production. Today production runs only `socialMetaTags`, the 2026-08 hosting build, and the old rules. Production has no public sign-in yet; the only accounts are admins using email/password, and the old rules treat *any* signed-in account as allowed to write content. After this launch, the public can sign in with Google, so admin rights must come from the `admins` collection instead.

This runbook is the one-time sequence to get production onto the current release. Data steps use [`scripts/prod-launch.js`](../scripts/prod-launch.js). Every step of that script that writes is a **dry run unless you pass `--apply`**, so run each step once without it and read the output first.

---

## Phase 0: Prerequisites (do these before launch day)

### Code
- [ ] Commit everything and merge the release branch the way you normally do. `deploy.ps1` builds from the **working tree**: without `-SkipBranch` it creates and checks out `release-<package.json version>` and tags `v<version>-prod`.
- [ ] Decide the launch version and bump `package.json` if you want one (the footer shows it).
- [ ] `npm run test:rules` passes. This needs Java 21; the deploy scripts run it automatically.

### Credentials
- [ ] Production service account key: Firebase Console → **wiof-production** → Project settings → Service accounts → *Generate new private key* → save as `scripts/service-account.prod.json`. It is gitignored. Never commit it.
- [ ] Staging key at `scripts/service-account.json` (already present). The content step copies from staging.
- [ ] `firebase login` uses an account with Owner/Editor access on wiof-production.

### Firebase Console / Google Cloud (wiof-production)
- [ ] **Authentication → Sign-in method → Google: enable** and set the support email.
- [ ] Keep **Email/Password** enabled (existing admin accounts use it).
- [ ] **Authentication → Settings → Authorized domains** include `worldisonefamily.com`, `www.worldisonefamily.com` (if used), `wiof-production.web.app` and `wiof-production.firebaseapp.com`.
- [ ] **Google Cloud → APIs & Services → OAuth consent screen**: app name *World Is One Family*, support email, authorized domain `worldisonefamily.com`. Set **Publishing status: In production**. While it's "Testing", only listed test users can sign in with Google.
- [ ] If the YouTube API key in `environment.prod.ts` has HTTP-referrer restrictions, they must include the production domains.
- [ ] Project is on the **Blaze** plan. It already runs `socialMetaTags`, so it should be.

---

## Phase 1: Prepare data (old site stays live; safe to do hours or days ahead)

The old production app never reads `admins`, `actions`, `hero_videos` or `poll_results`, so writing them now changes nothing for current visitors.

```bash
node scripts/prod-launch.js preflight
```
This is read-only: collection counts, auth users (with providers), existing admins, and warnings. Note which emails should be admins.

```bash
node scripts/prod-launch.js backup
```
This writes every top-level collection to `scripts/backups/prod-<timestamp>/` (gitignored). For a restorable managed export, also run the `gcloud firestore export …` command the script prints.

```bash
node scripts/prod-launch.js seed-admins --email admin1@…,admin2@…
node scripts/prod-launch.js seed-admins --email admin1@…,admin2@… --apply
```
**This is critical.** Today the only production accounts are the admins' email/password logins, so "signed in" has meant "admin". The new rules require an `admins/{uid}` doc instead, for both Firestore content and Storage uploads, because public Google sign-in will create ordinary accounts. Seed every admin who already has a production account now. If an admin only has a Google account and has never signed in to production, they get handled in Phase 3. On staging, the admins are `nmaulavi5@gmail.com` and `sri.shiv@gmail.com`.

```bash
node scripts/prod-launch.js seed-content
node scripts/prod-launch.js seed-content --apply
```
This copies the **40 reviewed actions** from staging. That's the editorially reviewed catalogue, including the Earth-tag correction. The superseded action is not copied, because production never had it. The step refuses to run unless staging is in the verified 40-action state. It also copies the six **hero video slots** from staging. The dry run prints each video's title, so check that no test video is about to go to production. Docs that already exist in production are skipped unless you pass `--force`.

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
5. Deploys the **backend**: Firestore rules and indexes, Storage rules, and all 13 Cloud Functions in us-central1.
6. Deploys **Hosting** only after the backend succeeds.
7. Tags `v<version>-prod`.

What to expect:
- **Storage rules prompt.** The new Storage rules read Firestore (`firestore.exists`) to check admins, so the CLI asks to grant the Storage service account a Firestore IAM role. Answer **yes**, or admin uploads will fail.
- **Functions take a while.** The first deploy of 12 new functions can take 5–10 minutes. If the CLI asks to enable an API, accept.
- **Indexes build in the background.** They can take a few minutes after deploy. Until then, My Journey and history queries may error. Check status under Firestore → Indexes.
- **Ship rules and Hosting together, always.** `-Backend` does that. The new app with the old rules breaks completions and admin pages, and the old app with the new rules breaks admin writes and poll display.

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
- [ ] Polls show real results; voting works.
- [ ] Newsletter subscribe works, and a duplicate email is detected.
- [ ] **Sign in with Google** works (popup, then profile created). Sign out works.
- [ ] My Journey loads (metrics, history). Settings page saves.
- [ ] Take Action page: 40 actions, element filter, search, complete an action, it shows in My Journey.
- [ ] Bookmark a blog; it appears in My Library.
- [ ] Share a blog link on WhatsApp: the preview shows the blog's own title and image.
- [ ] Admin: dashboard opens for an admin and **not** for a normal user. Edit a blog, upload an image, edit a Take Action, change a hero video.
- [ ] Search on Blogs / Videos / Take Action.

---

## Rollback

| What | How | Notes |
|---|---|---|
| Hosting | Firebase Console → Hosting → Release history → **Rollback** on the previous release | Instant. |
| Firestore rules | `git show v2.0.2-prod:firestore.rules > firestore.rules` then `firebase deploy --only firestore:rules --project wiof-production` (and `git checkout firestore.rules` afterwards) | **Only together with a Hosting rollback.** The old app needs the old rules, and the new app needs the new ones. |
| Storage rules | Same pattern with `storage.rules` and `--only storage` | Same pairing rule. |
| Cloud Functions | Usually leave them: they're additive and harmless to the old app. To remove one: `firebase functions:delete <name> --region us-central1 --project wiof-production` | |
| Data | Nothing existing is modified. Phase 1/3 only add `admins`, `actions`, `hero_videos` and `poll_results`, which the old app ignores. Restore from `scripts/backups/prod-<timestamp>/` or the gcloud export if ever needed. | |

---

## Known items, not blockers

- **Blog share previews** were broken from #21 (2026-08-29) until 2026-10-02, because the Hosting rewrite to `socialMetaTags` had been dropped. It's restored. `socialMetaTags` is now pinned to `us-central1` in **both** projects, because the rewrite is shared, and that's already live and verified on staging. Production picks it up with this deploy. Check after deploy: `curl -s -A "facebookexternalhit/1.1" https://worldisonefamily.com/element/<element>/blog/<slug> | grep og:` should show the blog's own title and image.
- **Node.js runtime.** Functions moved from Node 20 (decommissioned 2026-10-30) to **Node 22** on 2026-10-02 and are verified on staging. The production deploy updates the existing `socialMetaTags` in place, and the other 12 functions are created on Node 22.
- **Blog-page caching.** `socialMetaTags` serves the app page to normal visitors with `Cache-Control: public, max-age=0, s-maxage=600`. The CDN caches it, and Hosting purges that cache on every deploy, while browsers always revalidate. That way no visitor keeps an old page pointing at hashed files a new deploy removed.
- **App Check** is not configured (deferred; see `docs/PERMISSION_MATRIX.md`).
- `config` and the legacy `admin` collection exist on staging with no rules match. Nothing in the app reads them: the Privacy Policy page's `config` read is commented out.
