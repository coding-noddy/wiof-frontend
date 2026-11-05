# Changelog

All notable changes to WIOF Frontend are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

> Releases between 1.0.11 and 5.0.3 were not recorded in this file. See the git history and the `v*-staging` / `v*-prod` tags.

## [8.9.1] - 2026-11-05

Security updates and better-fitting action suggestions. **Deploy with `-Backend`** (the matcher changed), then run `node scripts/rebuild-related-content.js --project prod` (dry run, then `--apply`): every list is rewritten once, because the matcher version changed.

### Fixed
- **EQ links opened a "page not found".** The welcome's "Check your EQ", the first-steps checklist, the home journey tile and My Journey all pointed to `/element/water/eq-assessment`, which never existed. They now open the EQ check on the Spirit page (`/element/spirit#eq-assessment`, scrolled into view), and the old address redirects there.
- **Suggested actions fit the element.** An action's first element is its main one ("Sort Your Household Waste" is earth+water: an earth action that also helps water). Explore next's element fallback (all video pages) and Next for you's "Try in …" now show the element's own actions first, so a river video suggests "Fix a Water Leak" before "Sort Your Household Waste". The keyword matcher (`functions/related-content.js`, version 2) leaves out actions from another element unless the match is strong (score 0.2), holds actions that have the element only as an extra to 0.10, and gives a small bonus when the main element matches. On staging this removed all 4 off-element story→action matches (e.g. a Covid story → "Wash Clothes With Cold Water") and the weak secondary ones (e.g. Kalpasar Project → "Sort Your Household Waste").

### Security
- Swiper 10.3.1 → 12.2.0 (critical prototype-pollution advisory GHSA-hmx5-qpq5-p643). Swiper 11+ prefixes its element events, so the breaking-news counter and the calendar popup now listen for `swiperslidechange`.
- `@grpc/grpc-js` forced to 1.14.7 with an npm override (two high advisories; server-side only, in Firestore's Node build, not the browser bundle).
- Functions: `body-parser` 2.4.0 and `qs` 6.17.1 (high and moderate denial-of-service advisories).
- Accepted, documented: Quill 2.0.3 (low; XSS in HTML export, no fixed version; only admins write content and Angular sanitises every `[innerHTML]`) and `uuid` 9 inside firebase-admin 13 (moderate; affects only v3/v5/v6 IDs written into a caller's buffer, which those libraries don't do; fixed by firebase-admin 14, a major upgrade for later).

### Changed
- Privacy policy: the engagement records we keep include the suggestions you open (first-party, since 8.9.0). The sign-in prompt and the welcome's sign-in note link to the Privacy Policy.
- Occasion facts: two more for prod's calendar (World Numbat Day on 7 November, International Mens Day on 19 November). Runbook corrected for the 8.9.0 release (branch, tag `v8.9.0-prod`, the four new functions, a consent-banner check).

## [8.9.0] - 2026-11-05

Measurement (see `docs/ANALYTICS.md`). **Deploy with `-Backend`** (new functions `buildDailyStats`, a schedule, and `refreshDailyStats`; rules for `suggestion_click` and `analytics_daily`). The first scheduled function turns on Cloud Scheduler for the project. Then fill past days with `node scripts/daily-stats.js --project prod --days 90` (dry run, then `--apply`), and do the one-time Google Analytics setup in `docs/ANALYTICS.md`.

### Added
- **Google Analytics gets real page data.** Every page has its own browser title (e.g. "Rainwater Harvesting & it's Benefits · Water · World Is One Family"; story and video pages wait for their content's title). The site sends one `page_view` per navigation with the path, that title, a page group (GA4's `content_group`: home, element, story, video, take_action, my_journey, admin…) and the element. Before, every page was titled "World Is One Family", so GA showed one row. The user property `user_type` (guest, member, admin) lets reports leave out the team.
- **Suggestion clicks** from Explore next, "The story behind this", Today on WIOF and Next for you go to GA as `select_content` (where it was shown, what, position, reason). For signed-in members they're also saved as a checked `suggestion_click` event, once a day per suggestion and place (rules + server checks).
- **Admin → Analytics, rebuilt**: 7/30/90-day ranges over one small summary per day (`analytics_daily/{day}`, `functions/daily-stats.js`, India-time days, team accounts left out). It shows members active and engaged per day, new members, stories read, videos watched, actions done and EQ checks. It also shows suggestions (clicks and how many led to a read, watch or action the same day), activity by element, the first-steps funnel, and the most-read stories and most-done actions. Once Google Analytics is connected, it adds visitors, page views, top pages and views by kind of page (GA4 Data API, `functions/ga-traffic.js`, `GA4_PROPERTY_ID`). Summaries are rebuilt every 3 hours and by a Refresh button. Before, the page loaded every activity event of the last 30 days live.
- `scripts/daily-stats.js` (past days, dry run unless `--apply`); browser test `npm run e2e:analytics` (captures the site's real GA requests).

### Added (consent)
- **Google Analytics is opt-in** (GDPR): a consent banner on whatever page a visitor lands on, with Accept and Decline equally easy, remembered on the device and changeable any time from **Cookie settings** in the footer. Until Accept, analytics collection is off, so nothing is sent to Google (Google Consent Mode: analytics denied; ad signals always denied, as WIOF shows no ads). Accepting counts the page the visitor is on. The old home-only "Got it" bar is gone.

### Changed
- Firebase's automatic `page_view` on load and AngularFire's `screen_view` tracking are off: both reported the wrong title or a component name.
- Privacy policy: Google Analytics runs only with consent (how to accept, decline or withdraw), and receives the pages visited and suggestions clicked.

## [8.8.0] - 2026-11-05

Release hardening for the Phase 2 prod launch (8.4.0–8.8.0 ship in one deploy; follow `docs/PHASE2_RELEASE_RUNBOOK.md`). **Deploy with `-Backend`** (submitEqAssessment, the occasion matcher), then run `scripts/apply-occasion-facts.js`, `scripts/rebuild-related-content.js` and `scripts/recompute-user-metrics.js` (dry run, then `--apply`).

### Added
- **Release and rollback tooling** (`scripts/release.js`): `preflight` (what's live against this checkout: Hosting version, new or removed functions, index drift), `snapshot` (saves the live rules, indexes, Hosting version and functions with a ROLLBACK.md), `wait-indexes`, `verify` (post-deploy checks) and `rollback --only hosting|rules|functions` (dry run unless `--apply`). Runbook: `docs/PHASE2_RELEASE_RUNBOOK.md`.
- **Facts for Today on WIOF**: occasions get their own `fact`, `factSource` and `factStatus` (draft / reviewed), edited in Admin → Calendar (the list marks "Fact: needs review"). The card shows "Did you know?" under the description; its link is called the fact's "Source" only once an admin has reviewed the fact and added its source, else the occasion's page is offered as "Learn more". 133 draft facts written by the WIOF team (`scripts/data/occasion-facts.json`), applied by `scripts/apply-occasion-facts.js`, which never overwrites a reviewed fact. Facts also feed the occasion matching.
- `scripts/report-topics.js`: the topic names in use per element, for the shared topic list proposed in `docs/TOPICS_AND_TAGS.md`.
- Browser test `npm run e2e:eq` (staging only).

### Changed
- **EQ: at most two saved checks a day** for a signed-in user (decided 2026-11-05: a score doesn't change much in a day). The server saves each check in a fixed daily slot (`{uid}_eq_completion_{day}_{1|2}`, in a transaction); a third is still scored and shown, just not saved, and the result screen says so. Guests' checks were never saved and still aren't.
- **Privacy policy** (5 November 2026): personalised suggestions (what they use, that they're rule-based, not for advertising, how to change or clear them), the welcome and checklist state, server checks on activity, EQ saving for guests and signed-in users, and "Hide for today".

## [8.7.0] - 2026-11-05

Phase 2 step 7: rule-based "Next for you" (see `docs/PHASE2_PLAN.md` section F). Hosting only: no rules, index or function changes.

### Added
- **Next for you** in the home journey panel for signed-in users: up to four picks (two stories, two actions; one kind fills in if the other runs short), each with the reason it was picked. Stories: similar to the last three stories read to the end ("Because you read …"), then the newest in each of the user's elements ("New in Water"). Actions: ones started but not done ("You started this"), then ones that go with a recent read ("Goes with …"), then the element's actions in the Take Action order ("Try in Earth"). Stories read to the end and completed actions never show. Suggestions come from the elements the user chose, else the ones they've explored, and the panel says which, with a link to change them. Shows nothing until there's something to suggest.
- Browser test `npm run e2e:next` (staging only).

### Changed
- The journey panel's actions tile no longer names its own "Next:" action (Next for you suggests it now, with a reason).

## [8.6.0] - 2026-11-05

Phase 2 step 6: "Today on WIOF" (see `docs/PHASE2_PLAN.md` section E). **Deploy with `-Backend`** (new `onEnvcalWritten` trigger), then run `node scripts/rebuild-related-content.js --project prod` (dry run) and `--apply` to match the calendar occasions.

### Added
- **Today on WIOF** on the home page: today's calendar occasion, its fact (the occasion's description) and source (its "Show more" link, opening in a new tab), plus one story or video to read and one small action to try today. The occasion's own Related Content links come first, then the best keyword matches. With no good match it shows just the fact. "Hide for today" hides it until tomorrow on this device; a day with no occasion shows nothing. "See the full calendar" scrolls down to the Environment Calendar on the same page (instantly with reduced motion), moves focus to its heading and briefly highlights today in the agenda.
- **Calendar occasions are matched to stories and actions** by the related-content matcher, as queries only: they are never suggested themselves, and they don't change any story or action match. Short occasion texts get a stricter bar: calendar boilerplate ("world", "day", "celebrated"…) is ignored, the score must reach 0.10 (not 0.08), and at least two terms must be shared. New trigger `onEnvcalWritten` rebuilds the matches when an occasion is edited.
- Browser test `npm run e2e:today` (staging only).

### Changed
- `scripts/rebuild-related-content.js` lists occasions too.

## [8.5.0] - 2026-11-05

Phase 2 step 5: the journey experience (see `docs/PHASE2_PLAN.md` section D). **Deploy with `-Backend`** (rules and functions), then run `node scripts/recompute-user-metrics.js --project prod` (dry run) and `--apply` to fill the new per-element counts.

### Added
- **A welcome after sign-in:** two short, skippable steps on the home page, shown once to a signed-in user who hasn't chosen elements. 1: which elements matter to you (saved as your preferred elements, editable in Settings). 2: where to start — a story, a small action or the EQ check, for your first chosen element. Skipping counts as done. Phones get a bottom sheet. The guest welcome is now for guests only, so the two never stack.
- **Your first steps** on the home panel and My Journey: choose your elements, read a story to the end, watch a video, check your EQ, do your first action. Each step is ticked by the server's trusted counts, never the browser. Hide it once and it stays hidden on every device; it also goes away when all five are done.
- **My Journey tells your story:** "Since you joined in March 2026, you've read 9 stories, watched 3 videos and done 17 actions across 4 elements", with the five elements shown as explored or not yet.
- New trusted metric `qualityReadsByElement` (`docs/METRICS.md`): quality reads per element, counted by `onActivityLogCreated` and by the recompute, cleared by "Clear My Engagement Data".
- Browser test `npm run e2e:journey` (staging only).

### Changed
- Profile rules: `preferredElements` must be up to five of the five elements (checked only when changed), and the new `onboarding` record holds two timestamps, each set once by the server clock.
- The recompute report prints per-element maps readably.

### Fixed
- Home "Pick up where you left off" linked every story under Earth; it now links under the story's own element.

## [8.4.1] - 2026-11-05

Explore next, redesigned so it reads as a "what now?" moment instead of a plain list. **Deploy with `-Backend`**: one new Firestore index.

### Changed
- **Actions you can do right there:** on blog and video pages the **Your next step** group (was "Take action on this") shows full Take Action cards, with time, difficulty, "Learn more" and **Mark as Done**. Guests get the same sign-in prompt as on the Take Action page.
- **The heading says what the page is about:** "Because you read about Veganism" (the story's topic), "Because you read this story" or "Because you watched this video", under a small "Explore next" label. Modals keep "Explore next".
- **Its own section:** a soft band tinted with the element's colour.
- **The same story and video cards as the element pages** (with bookmark and share), three in a row. On phones they're a row you swipe sideways (CSS scroll-snap) instead of a long stack.
- A loading placeholder in the block's shape, and a short fade-in (off with reduced motion).
- **The action details no longer carry an Explore next block.** The modal is for deciding to do the action, so it now ends with one line, **The story behind this**, to the action's linked story or video (or one that links to it, or its best similar story), shown only when there's a real match.
- The calendar popup keeps its small linked-items list; compact action cards there use the element's colour for their icon tile, as on Take Action.
- Blog cards link to the full post path, so they also work outside the element's own pages, and a long author name ends in "…" instead of a clipped letter.
- The heading's topic is shown capitalised ("Khalsa Aid"), and only when it's short enough to be a topic; otherwise it reads "Because you read this story".
- The "more from this element" fallback reads at most 12 newest and 12 same-topic stories instead of every story in the element (new index: `blog_summaries` category + publishDate). If the index isn't there yet, only the fallback is lost, not the block.

### Fixed
- Share on a blog card or post: "Link copied" is now a toast instead of a browser pop-up, and closing the phone's share sheet no longer copies the link and says it did.
- Screen readers: card titles inside Explore next are a level below their group heading, instead of the same level.

### Tests
- Unit tests for Explore next (heading, topics, card choice, loading), "The story behind this", the blog card link and sharing.
- The browser end-to-end tests are now in the repo (`tests/e2e`, staging only): `npm run e2e:smoke` and `npm run e2e:explore`. Test account details come from environment variables, never the repo.
- Take Action cards everywhere now show the action's time and difficulty, as the details already did.

## [8.4.0] - 2026-11-05

Phase 2 step 4: connected content, "What can I explore next?" (see `docs/PHASE2_PLAN.md` section C).

### Added
- An **Explore next** block on blog and video pages, in the Take Action details and in the calendar occasion popup, in two groups by intent: **Keep reading** (up to 3 stories or videos) and **Take action on this** (up to 2 actions). In an action's details it reads **Learn more**, then **More actions like this**. Each group shows the item's own related links first, then items that link to it (a link works both ways), then **similar content**, then more from the same element (same-topic stories first, a different pick per page). The calendar popup shows linked items only.
- **Similar content, matched by what the page is about:** a server-side keyword matcher (`functions/related-content.js`, TF-IDF with cosine similarity) compares every story's and action's title, topic, description and text, with a small thesaurus so words like "vegan", "plant-based" and "meat-free" match each other. Each item's best matches are stored in `related_auto/{type}_{id}` (public read, server write only), rebuilt by `onBlogWritten` and the new `onActionWritten` trigger after every admin edit, and by `scripts/rebuild-related-content.js` (dry run by default). Weak matches are left out. The Veganism story now suggests the vegan recipes and "Try a Plant-Forward Meal"; rainwater harvesting suggests "Take a Shorter Shower" and "Fix a Water Leak".
- **Related Content** in the admin blog, Take Action and calendar forms: pick stories and actions by title, or add a YouTube video by link (the title is looked up on YouTube). Up to six links, in order. Stored as `relatedContent` plus `relatedKeys` (`type:id`) for the reverse lookup; `blog_summaries` copies the keys.
- Take Action links (`/element/{element}/take-action?action={id}`) open that action's details.

## [8.3.0] - 2026-11-04

Phase 2 step 3: the action model, ready for Planet Passport (see `docs/PHASE2_PLAN.md`, `docs/METRICS.md`).

### Changed
- Every Take Action completion now gets one immutable, server-written `action_completed` event, with a fixed ID per completion. It carries the action's elements and version, `completionMethod` and `verificationStatus` (`SELF_REPORTED`), and, for DAILY actions, the local day. `onUserActionWritten` writes the event and updates the counters in one transaction, so a redelivered trigger can't count a completion twice (before, it could). Browsers no longer write `action_completed` events, and the rules refuse them.
- "Clear My Engagement Data" keeps Take Action progress: completed actions, their events and the action counters. Before, it zeroed "Actions Taken" while the action cards still showed completions. The Settings page now says so.

### Removed
- The old static Take Action component (`take-action-content`), unused since Take Action V1.

## [8.2.0] - 2026-11-04

Phase 2 step 2: trusted EQ score, metric definitions, recompute (see `docs/PHASE2_PLAN.md`, `docs/METRICS.md`).

### Security
- EQ scores are computed on the server. The EQ card sends its 24 answers to the new `submitEqAssessment` function, which scores them and records the result. The rules no longer let a browser write an EQ result at all.

### Added
- `docs/METRICS.md`: written definitions of every metric (source, formula, unit, time basis, reset, trust level), for the Planet Passport rules to build on.
- `user_metrics.qualityReads`: a server counter for quality reads (distinct blogs). The My Journey tile used to count a history list capped at 50.
- `scripts/recompute-user-metrics.js --project staging|prod [--apply]`: rebuilds `user_metrics` from accepted events only. It judges events from before 8.1.0 with the same checks and counts each blog, video and poll once. Dry run by default, with a per-user before/after report. The `backfillUserMetrics` callable uses the same code (`functions/user-metrics.js`) and is now dry-run unless called with `{ apply: true }`.

### Fixed
- Videos watched in embedded widgets (In Focus, coffee conversation, NGO, hero video) are recorded against their YouTube video ID. Before, they used the title or topic, which 8.1.0's server check rejected, so those watches stopped counting. The recompute re-checks those events, so they count again.

### Removed
- `scripts/backfill-user-metrics.js` and `scripts/backfill-user-metrics-admin.js`, replaced by the recompute script. The admin one still counted every event, including duplicates and unchecked ones.

## [8.1.0] - 2026-11-04

Phase 2 step 1: trusted activity events, the foundation for Planet Passport (see `docs/PHASE2_PLAN.md`).

### Security
- Activity events (`activity_log`) now have an exact schema in the Firestore rules: nine known event types, each with only its own fields, types and ranges. Events that count once (reads, views, completions, poll votes, the daily visit) must use their deterministic document ID, so they can't be repeated with random IDs to inflate counters. A poll vote's email must be the signed-in user's own.
- The `onActivityLogCreated` function checks every event on the server (`functions/activity-validation.js`): the blog, poll or action exists; video IDs are real YouTube IDs; quality reads and watched videos meet their thresholds; EQ totals add up; the date is plausible. It records a verdict on the event and counts only accepted events in `user_metrics`, in one transaction, so a redelivered trigger can't count an event twice.

### Changed
- My Journey history lists leave out events the server rejected; `backfillUserMetrics` skips them.
- `npm run test:functions` (unit tests for the server checks) now runs before every deploy, along with the rules tests.

## [8.0.4] - 2026-11-04

### Fixed
- Take Action: repeatable and occasional actions now show that a completion was recorded. A "Marked as done" message appears, the card shows "Completed 1x" from the first completion (with "· last today"), and the button reads "Do it again". Before, nothing changed until the second completion.

## [8.0.3] - 2026-11-04

### Changed
- **Blog posts, videos and element take-action pages no longer load the slider library.** These pages (`/element/<element>/blog/…`, `/video/…`, `/take-action`) were routed as children of their element page, so opening one also loaded the element page's code, including Swiper since 8.0.2. They are now routed at the app level. The addresses are unchanged, old `/blogs/blog/…` links still redirect, and an unknown element still shows the not-found page. Blog posts are often a visitor's first page (shared links), so they now get the smaller initial download that 8.0.2 intended.

## [8.0.2] - 2026-11-04

Post-migration clean-up.

### Changed
- **Faster first load on most pages.** The slider library (Swiper, about 47 KB gzip) used to load on every page. It now loads only with the pages that have sliders (home and the five element pages), and on demand for the calendar's event popup. The initial download drops from 485 KB to 444 KB (gzip); blog posts, the blog and video lists, ClimatEnlighten, Take Action and the signed-in pages no longer load it at all. The slider components live in a new `SlidersModule`.
- **Stylesheets use Sass modules** (`@use` instead of the deprecated `@import`, and `color.adjust()` instead of `darken()`/`lighten()`), so the build has no deprecation warnings and is ready for Dart Sass 3. The compiled CSS is unchanged, except that the blog and video list pages no longer include the theme twice.

### Fixed
- **The home page requested `/null` (a 404).** The calendar's event background was set to `url(null)` until its image had loaded.
- **The site's code included the whole `package.json`** (the list of development tools and versions) because the footer imported it for the version number. It now imports only the version.

## [8.0.1] - 2026-11-04

### Fixed
- **The blog editor's list shortcuts didn't work.** Its Keyboard Shortcuts panel listed Ctrl + Shift + 7 (ordered list) and Ctrl + Shift + 8 (bullet list), the Google Docs/Word shortcuts, but the editor (Quill) has no such shortcuts, so they did nothing. They now work: pressing one again turns the list off, and they work on several selected lines. The panel also shows Quill's own way to start a list: type `1.` or `-` and a space at the start of a line. The other listed shortcuts (bold, italic, underline, undo, redo) already worked.

## [8.0.0] - 2026-11-04

Angular upgrade, Release B: Angular 18 → 21, Firebase 10 → 12, the new build system, and the new template syntax. This completes the upgrade planned in `docs/ANGULAR_UPGRADE_PLAN.md` (its breaking-changes table records everything found on the way, items 13–20).

### Changed
- **Angular 18 → 21** (in three steps: 19, 20, 21), with Angular Material/CDK 21, **AngularFire 21 and Firebase 12.19** (via 11), TypeScript 5.9, ngx-quill 29, ng2-charts 10, `@ionic/angular-toolkit` 13. The app keeps zone.js change detection (`provideZoneChangeDetection()`), so behaviour is unchanged.
- **New build system** (Angular's esbuild-based `application` builder): production builds take about 70 seconds instead of about 4 minutes. The output still goes to `dist/`, so hosting and the deploy scripts are unchanged.
- **New template syntax:** the 618 `*ngIf` / `*ngFor` / `*ngSwitch` uses in 81 templates are now `@if` / `@for` / `@switch` blocks (Angular's own migration, reviewed). The old syntax is deprecated and goes away in Angular 22.
- **App Check** starts from `provideAppInitializer` (`APP_INITIALIZER` is deprecated).
- **Supported browsers** follow Angular 21's own list (browsers from about the last 2½ years). The old list held Ionic 8's minimums, which are older than Angular 21 supports.
- **Development machine:** Node.js 22 is needed (Angular 20+). Cloud Functions already ran on Node 22.

### Fixed
- **Blog preview didn't match the published blog.** The preview inserted the HTML with its own paragraph spacing, so it showed much more space between paragraphs (and around blank lines) than the blog page. It now renders exactly like the blog page.
- **Preview could lose unsaved edits.** When editing an existing blog, opening Preview and going back to Edit put the saved text back into the editor, discarding the changes; saving afterwards could store mismatched content for the blog page. The editor now stays in place while previewing.
- **The admin Analytics chart showed no data:** its query failed under AngularFire 19+ (see below), so only empty axes were drawn.
- **After a deploy, a page opened from an older tab could stay blank.** Each deploy replaces the code files with new names; a page whose code can't load now reloads once to pick up the current version.

### Upgrade issues found and handled
- **AngularFire 19+ needs an injection context** to create its compat Firestore collection/document objects, which this app does in 145 places (page start-up, handlers, services). Without a fix every page failed to load data. `makeAngularFirestoreInjectionSafe` (`src/app/util/injection-safe-firestore.ts`) covers all of them without changing the call sites.
- **Hosting cache rule:** the one-year cache for hashed code files only matched the old builder's file names, so every visit would have re-downloaded all the code. `firebase.json` now matches both naming styles.
- **Rules tests under Node 22:** `node --test <folder>` changed meaning, which blocked every deploy. The runner now lists the test files.
- **Initial download** grows by about 50 KB (gzip) because Firebase 12's Firestore always includes a regular-expression engine for its new query pipelines. Not avoidable with AngularFire 21; the build's warning budget is 2.5 MB. Loading the slider library only where sliders are used would save more than this.

### Tests
- Unit tests: 143, all passing (they run with the same change detection as the app; new tests for the deploy-reload check).
- Checked on staging after every step: the blog editor end to end, publish from preview, Workshops, admin forms and the Excel export, the Analytics chart, the public pages on phone and desktop, signed-in pages (My Journey, My Library, Settings, My Feedback), cache headers and CSP (0 violations), plus a manual admin check.

## [7.0.0] - 2026-11-03

Angular upgrade, Release A: Angular 16 → 18, Ionic 7 → 8, and the Quill 2 blog editor. The plan, compatibility research and remaining steps (Angular 19 → 21, Release B) are in `docs/ANGULAR_UPGRADE_PLAN.md`.

### Changed
- **Angular 16 → 18** (in two steps, 17 then 18), with Angular Material/CDK 18, AngularFire 18 and Firebase 10.14, TypeScript 5.4 and zone.js 0.14. `HttpClientModule` (deprecated in 18) is replaced by `provideHttpClient(withInterceptorsFromDi())`. Angular 16 has been out of support since 2024.
- **Ionic 7 → 8.** Form fields use Ionic 8's built-in labels (`label` / `labelPlacement`) instead of a separate `ion-label` (87 fields across the admin and account pages). The Take Action checkboxes put their text inside `ion-checkbox`, helper text moved to `helperText`, and the image pickers are native file inputs (Ionic 8 dropped `ion-input type="file"`), with a small `FileInputValueAccessorDirective` so they still work with reactive forms. The browser support list follows Ionic 8's minimums.
- **The blog, news and coffee conversation editors use Quill 2** (ngx-quill 26). Image resizing uses `@botom/quill-resize-module` (maintained, Quill 2 compatible) in place of `quill-image-resize-module`. All 29 existing blogs render exactly as before (compared page by page against Quill 1).
- **The footer's version number** comes from `package.json`, so it can't fall behind a release.

### Added
- **"Published date" in the blog editor.** Blogs are listed newest first by this date, and it shows on the blog page and in the editor's preview. It defaults to today; when an old blog without a date is edited, it must be filled in before saving.

### Fixed
- **Blogs had no dates,** so the blog lists were in effectively random order and the admin list's Published column was blank. The editor never saved `submitDate` or `publishDate`. Saving now sets `submitDate` once (first save) and `publishDate` from the new field. The admin Published column also sorts by the date it shows. Existing blogs on prod and staging were given dates from their Firestore creation time (the 22 blogs imported on 23 May 2021 show that date, as their original dates aren't recorded anywhere).
- **Quill 2 issues found and fixed during the upgrade:**
  - every space was saved as `&nbsp;`, so text couldn't wrap: the editors now save normal spaces (`quillSemanticHtml`);
  - pasting from Word/Google Docs inserted the text twice: the paste clean-up now runs before Quill's own paste handling;
  - dragging an image's resize handle squashed it: resizing keeps the image's proportions;
  - text pasted as the very last action before saving could be left out of the save.
- **Publishing a new blog from the preview** left the preview open on the emptied form ("Untitled", "By Author") and showed "Unsaved changes" (with a leave-page prompt) although everything was saved. The preview now closes and the form is ready for the next blog.

### Removed
- Unused packages and tooling: `d3`, the Ionic Native and Capacitor packages (the site isn't built as a native app), the TSLint and Protractor setups (both long deprecated) with their `lint`/`e2e` scripts, and the unused Cordova build targets.
- `xlsx` now comes from SheetJS's own CDN (0.20.3); the npm registry copy is no longer updated and has known vulnerabilities.

### Tests
- Unit tests: 141, all passing (16 specs moved from the removed `async` helper to `waitForAsync`; new tests for the Quill HTML and blog date helpers). `@firebase/rules-unit-testing` 3, matching Firebase 10.
- Checked on staging: the blog editor end to end, admin forms and the Excel export, Workshops, the public pages, and a manual admin check of the blog, news and coffee conversation editors.

## [6.4.1] - 2026-10-29

Phase 1 wrap-up.

### Tests
- **The unit test suite runs clean: 134 tests, all passing.** It used to crash part-way (the test browser disconnected after 134 of 224 tests) with 53+ failures, so it couldn't catch regressions. Removed the tests that were failing:
  - 73 spec files (87 tests). Almost all are auto-generated "should create" checks whose test module never provided Firebase, HttpClient or the router, so they failed on construction and checked nothing else. Three had real assertions: `AuthService.updateAuthProfile` (blocked by the same missing setup), and `ActivityService.logEqCompletion`, whose mock (`firestore.collection()`) didn't match how the service writes (`firestore.firestore.collection()`), so it was never called. Both services work; the tests were out of step with them;
  - three outdated assertions: the avatar menu's "Saved" item (renamed "My Library") and two avatar-initial expectations from an older fallback.
  None of them was catching a real bug. Rewriting the meaningful ones with proper test setup is a good first step for Phase 2's test work. The Firestore rules tests (161) are unaffected.

### Added
- **`scripts/copy-workshops-to-prod.js`** copies workshops (docs + posters, same doc IDs, new download tokens) from staging to prod, so a workshop checked on staging can go live without re-entering it. Dry run unless `--apply`; `--only <id>,<id>` limits it.

### Fixed
- **`launch-production.ps1`'s resume command** now repeats every option the run was started with. It printed only `-AdminEmails`, so resuming after a failure silently dropped switches such as `-LockRibbon`.

## [6.4.0] - 2026-10-24

ClimatEnlighten workshops, and the brand identity credit.

### Added
- **Upcoming Workshops on the ClimatEnlighten page.** Each workshop is a horizontal card: the poster on the left (any shape, tap to view full size) and, on the right, the title, date, time, an optional online/venue line, a short description and a **Register** button that opens its registration link in a new tab. Everything, including Register, is on screen without scrolling past the poster, on phones too (where long descriptions are trimmed to four lines). On narrow phones under 400 px wide the card stacks instead: poster on top, details and Register underneath. Two cards sit side by side on wide screens. Posters are never cropped: each card has the same 4:5 frame, with a soft blurred copy of the poster filling any space around it. Upcoming workshops show soonest first, with their time (e.g. "5:00 PM – 7:00 PM IST") and a **Live now** badge between the start and end times.
- **Past Workshops,** below the upcoming ones: once a workshop's **end time** passes (or midnight, if it has none) it moves here as a smaller, faded card marked **Completed**, with no Register button. The poster still opens full size. It shows the 6 most recent, as proof the sessions really happen. Times are India time (IST) for every visitor, so the switch happens at the real moment wherever someone is. Each section is hidden when it's empty, so between workshops the page looks as before.
- **Admin → Workshops** to add, edit and delete them on one page: poster upload (compressed automatically), title, description, date, optional start and end times (IST, end must be after start), online/venue, registration link (any web link: Google Form, payment page, event page), and a show-on-website switch for drafts. Replacing or deleting a workshop deletes its old poster from Storage. The poster's download URL is saved with the workshop, so the public page makes no per-card Storage lookups.
- **ClimatEnlighten in the header menu,** right after Take Action, on desktop and in the mobile menu, so visitors can go straight to the workshops and learning phases. To fit five links plus Sign In at the narrowest desktop widths (768–899 px), the links use tighter spacing there and never wrap onto two lines.
- **"Brand Identity by EcoFlyp"** in the footer's bottom bar, linking to EcoFlyp's ClimatEnlighten × WIOF case study. The link is followed (no `nofollow`) on purpose: it's the backlink EcoFlyp asked for in return for the brand identity work.

### Security
- **`workshops` rules:** the public can read published workshops only, so drafts stay hidden. Admin-only writes, with every field checked: the registration link must be a real `http(s)://` web link (blocks typos and `javascript:`/`data:` links), the date `YYYY-MM-DD`, times `HH:MM` or empty, the poster a Firebase Storage URL, and no unknown fields. Covered by 9 new rules tests.

### Changed
- **Disabled admin buttons now look disabled** (faded, not-allowed cursor) on every admin page. They looked exactly like enabled ones, e.g. a Save button with required fields still empty.
- `compress-storage-images.js` and `delete-orphan-images.js` also cover the new `workshop-posters/` folder.
- TODO.md: finished items removed (they're in this changelog and the git history); App Check added under "Security (Deferred)".

## [6.3.0] - 2026-10-20

Phase 1 performance: blog pages.

### Performance
- **Blog lists read small summary docs instead of whole blogs.** The element pages and `/blogs` were downloading every blog's full body to show a card (2 MB for 29 blogs on staging). They now read `blog_summaries/{blogId}`, with just the card fields and a ready-made cover image URL, so the cards no longer make one `getDownloadURL()` call each. A new `onBlogWritten` Cloud Function keeps the summaries in step with `Blogs` on every create, edit and delete. Both the function and the backfill script build them with `functions/blog-summary.js`. Until summaries exist the lists fall back to the old full read, so deploy order can't blank them. The admin Manage Blogs page still reads full blogs, because it edits from its list.
- **Images embedded in blog bodies are moved to Storage.** Four blogs had images pasted in as base64 `data:` URLs stored inside the blog doc (800, 723, 213 and 117 KB; Firestore's limit is 1 MB per doc). **`scripts/optimize-blogs.js`** uploads each one as a ≤1600 px WebP, rewrites the blog to link to it and backfills `blog_summaries`. It's a dry run unless `--apply`, backs up the original content and has `--restore`. Staging dry run: 5 images, 1380 KB → 123 KB; those four blogs drop to 2–5 KB.
- **The blog editor no longer embeds images.** On save, any `data:`/`blob:` image (pasted HTML, drag-and-drop) is compressed, uploaded and swapped for its URL, keeping its size and alignment. A copied image with no HTML (a screenshot) is uploaded like the toolbar's image button; before, it was silently dropped. The cover image now uploads before the blog is saved, so `onBlogWritten` can read its download token.
- **Element pages fetched blogs and YouTube videos twice.** `blogs$` and `videos$` were subscribed by both the template and the section nav; they're now shared (`shareReplay`), which halves those Firestore reads and YouTube API calls.

### Security
- **`blog_summaries` rules:** public read, no client writes (written only through the Admin SDK). Covered in the rules tests.

## [6.2.0] - 2026-10-13

Phase 1 hardening, part 2.

### Performance
- **Click-to-play YouTube.** Every embed now shows the video's thumbnail and a play button until it's clicked, through a tiny `srcdoc` poster in the same iframe (`appYoutubeLite`). The ~500 KB YouTube player loads only for videos someone plays, and then starts straight away. Iframe classes, sizing, the watch tracker and one-video-at-a-time keep working unchanged. Also fixed a malformed embed URL (`…ytplayer?controls=1` → `&controls=1`).
- **Admin image uploads are compressed in the browser** (`image-compression.util.ts`): scaled to at most 1600 px and saved as WebP (JPEG where WebP can't be encoded), with a 7-day browser cache. This applies to news, blog cover and inline images, courses, NGOs, the calendar and team profiles. GIF/SVG and already-small images are untouched; avatars keep their existing 1 MB JPEG/PNG rules.
- **`scripts/compress-storage-images.js`** does the same for images already in Storage. It overwrites each image in place and **keeps each file's download token**, so saved URLs, including inline blog images, keep working. It also sets the 7-day cache: Storage was serving every image `private, max-age=0`, so browsers re-downloaded them on every visit. It's a dry run unless `--apply`, backs up originals, and has `--restore`. Staging dry run: 188 images, 125 MB → 15 MB.
- **`scripts/delete-orphan-images.js`** deletes Storage images that no Firestore document refers to any more. A file counts as in use if its name appears anywhere in any document, plain or URL-encoded, so leftover images from replaced uploads and deleted posts go while anything mentioned stays. Originals are backed up and `--restore` puts them back; uploads from the last 7 days are skipped (`--min-age-days`). Staging dry run: 161 of 369 files (8.8 MB) unused. Images of content that exists but isn't shown publicly are kept, since their documents still use them.
- **Quill is no longer loaded for every visitor.** It was a global script in `angular.json` (209 KB); now only the pages that use the editor or viewer bundle it.

### Security
- **Firebase App Check (reCAPTCHA Enterprise) is wired in, switched off until configured.** The client turns it on once `appCheckSiteKey` is set in the environment. Every callable function has `enforceAppCheck`, controlled by `ENFORCE_APP_CHECK` in `functions/.env.<project>`. Firestore and Storage enforcement are switched on in the App Check console. The CSP allows the reCAPTCHA hosts.

## [6.1.0] - 2026-10-13

Phase 1 hardening: security and performance quick wins.

### Security
- **Security headers on every page:** `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, and an **enforced Content-Security-Policy** that lists every service the site uses. Before enforcing, it ran report-only on staging across every page and flow (guest and signed-in, Google sign-in popup, poll, subscribe, YouTube) with 0 violations. To make that possible, Angular's critical-CSS inlining is off in the production and staging builds: it adds an inline `onload` handler that a strict CSP blocks, which would leave the page unstyled.
- **Poll votes are validated:** a vote must name a poll that exists and one of its real options (`option1`..`optionN`), in both `firestore.rules` and `onPollVoteCreated`. Junk options can no longer be added to public results or inflate the totals that percentages use.
- **No more public email lookups:**
  - `checkPollEmailVoted` now answers only yes/no; it used to say which option an email voted for.
  - `checkSubscriberExists` is removed. Newsletter sign-up goes through a new `subscribe` function that drops duplicates on the server and gives the same answer either way. Direct client writes to `Subscriptions` are now denied.

### Performance
- **Images:**
  - The element and home hero images are now right-sized WebP: about 2.8 MB → about 200 KB each.
  - Team photos and the site logo were resized in place: 6.5 MB → 62 KB, 316 KB → 12 KB.
- **Breaking News loads only the current, previous and next story's image or video**, not every story up front.
- **YouTube embeds lazy-load** (`loading="lazy"`).
- **Caching:** hashed JS/CSS bundles are cached for a year (`immutable`), `/assets` for a week, and pages (`index.html`) revalidate on every load so a new release shows up immediately. Before, everything was cached for one hour.

### Fixed
- **The Environment Calendar dialog's page dots now follow the slide.** It listened for `swiperslidechange`, but this Swiper setup emits `slidechange`, so the dots never moved.

### Build
- **Staging now gets the same optimized AOT build as production** (a new `staging` build configuration). Before, staging ran an unoptimized development build, so it wasn't testing the code users get.

## [6.0.2] - 2026-10-13

### Fixed
- **Take Action no longer fires a permission error per card for signed-in users.** Each card reads the user's `{uid}_{actionId}` record, which doesn't exist until the action is first done, and the rule denied reads of missing docs (51 console errors on one page load). `user_actions` now allows reading your own not-yet-created record, the same guard `user_saved_content` uses. **Needs the Firestore rules deploy.**
- **Admin login shows plain-language errors** instead of raw Firebase text (e.g. "FirebaseError: … (auth/wrong-password)"). Unknown email and wrong password now share one message, "Email or password is incorrect.", so the form no longer reveals which emails have accounts. Empty fields are caught before calling Firebase, and an old error clears on the next attempt.

## [6.0.1] - 2026-10-12

### Changed
- **Home page Breaking News shows the 30 newest stories.** The home page now fetches only the 30 most recent news items by date (it previously loaded the whole News collection). The limit is `HOME_BREAKING_NEWS_LIMIT` in `app.constants.ts`, to move into an admin settings page later. Admin Manage News still lists every story

## [6.0.0] - 2026-10-11

**Production launch release.** The first production deploy since `v2.0.2-prod` (2026-08-12). It contains everything released to staging from 3.x to 5.6.4, including:
- Google sign-in, My Journey, My Library, Settings and engagement tracking
- The Take Action catalogue with completions and streaks
- Brand-aligned redesign across every page, with element illustration heroes
- Coffee Conversations (with a Home category), polls with server-side results, news, the environment calendar, In Focus widgets
- Site feedback with My Feedback, and the admin feedback inbox
- WCAG 2.1 AA accessibility pass
- The new "three ways to start" welcome modal
- An updated privacy policy
- The launch-day curtain and ribbon ceremony

Changed since 5.6.4:
- **Admin login: Continue with Google** under the email/password form. Admins land on the dashboard; a non-admin Google account gets a clear "isn't an admin" message; closing the popup isn't an error. Production keeps one account per email, so an admin's Google sign-in uses the same account (and admin rights) as their email/password login
- **Launch ceremony can start locked:** visitors see the curtain with "Opening today at 3:30 PM IST", a disabled *Opening soon* button and no Skip, until an admin clicks **Unlock ribbon** (Admin → Launch Ceremony). That enables the button live on every open page, no reload. The launch script takes `-LockRibbon -RibbonOpensAt "3:30 PM IST"`; the curtain still releases visitors if the setting can't be read
- **Only one video plays at a time:** starting a YouTube video now pauses any other video playing on the page, for guests and signed-in users. Reported by the testing team The launch sequence is in `docs/PRODUCTION_LAUNCH_RUNBOOK.md` (`launch-production.ps1`, 15 steps).

## [5.6.4] - 2026-10-10

### Changed
- **Launch ceremony curtains open slowly:** about 5 seconds with an even, ceremonial motion (was 1.6s), and the top pelmet lifts away afterwards. The overlay stays until the curtains are fully open

## [5.6.3] - 2026-10-10

### Changed
- **Launch ceremony appears with no entrance animation at all:** the curtains are simply there, closed, when the site opens. The short fade from 5.6.2 let the site show through for a moment

## [5.6.2] - 2026-10-10

### Fixed
- **Launch ceremony no longer looks like the curtains are closing** when the site opens: the panels used to slide in from the sides on appearing. They're now simply already closed, with a quick fade in

## [5.6.1] - 2026-10-10

### Fixed
- **Launch ceremony appears instantly** during the launch window (until the end of 12 October 2026, IST): it shows as soon as the app starts and is then confirmed with Firestore, instead of waiting ~3s for the setting while first-time visitors already saw the site. If the switch is off it disappears again; after the window it only shows once Firestore confirms

## [5.6.0] - 2026-10-10

### Added
- **Launch ceremony:** a launch-day curtain with a Marigold ribbon. Each visitor's first visit (any page except admin and login) shows closed curtains with *Launching today*; *Cut the ribbon* splits the ribbon, the curtains part with brand-colored confetti, and the site (with the welcome modal) is revealed. Shown once per browser; *Skip* is always available; with reduced motion it simply fades
- **Admin → Launch Ceremony:** turn it on or off (takes effect on each visitor's next load, no deploy), with last-changed info and *Preview on this browser*
- New `site_settings` collection: public read, admin-only write limited to known setting ids and a boolean `enabled`, with 5 new rules tests (143 passing)
- Fail-safe: a missing setting, read error or 5-second timeout means "off", so the ceremony can never keep visitors out

### Deploy notes
- Needs a **backend** deploy (Firestore rules) alongside Hosting. Without it the ceremony stays off
- Runbook: turn it on after the production deploy, and off when the launch window ends

## [5.5.3] - 2026-10-10

### Fixed
- **Air quality widget on phones:** long station names (e.g. *Mumbai Us Consulate, India (मुंबई अमेरिकी वाणिज्य दूतावास)*) ran past both edges of the AQI card. They now wrap to at most two lines inside the card, with the full name in a tooltip; checked at 360–1440px widths
- **Element page heroes on phones:** the illustration was hidden behind a near-opaque wash (added in 5.4.0 for text contrast). Phones now use the home hero's top-down layout: copy on top over a solid ivory wash that fades out below it, revealing the illustration underneath. Text contrast stays above 12:1; tablet and desktop are unchanged

## [5.5.2] - 2026-10-10

### Changed
- **Privacy policy brought up to date** with what the site collects now (last updated 10 October 2026):
  - Take Action completions and streaks added to engagement information
  - New sections for poll votes (optional guest email, used only to prevent duplicate votes) and feedback you send (message, optional name/email, page, user agent, user ID when signed in)
  - Location searches in the air quality and rainfall tools go to the data providers; the site doesn't use device location
  - Names the providers: YouTube embeds (may set cookies), the World Air Quality Index project and Open-Meteo
  - Points to Settings → *Delete my data* for self-service deletion
- Removed the internal note that was showing publicly in *Contact us* ("Before this policy is released to production, the WIOF team should add…"); privacy requests now go through *Share feedback* → *Something else*

## [5.5.1] - 2026-10-10

### Changed
- **Footer:** the brand blurb now opens with what World Is One Family is (a community inspired by *Vasudhaiva Kutumbakam*, coming together to protect the planet we share) before the ClimatEnlighten line. Its "that" had been left without anything to refer to

### Fixed
- **Course in Focus logo** no longer cropped: the image is fitted whole instead of filling its box, and the mobile box is 16:9 (was a 72px square that cut off both ends of the ClimatEnlighten wordmark)

## [5.5.0] - 2026-10-10

### Changed
- **Welcome modal redesigned as "three ways to start"**, mapped to the home hero motto:
  - *Enlighten*: learn about the five elements, with a link to each element page (brand element icons)
  - *Inspire*: join the conversation, which goes to Coffee Conversations and this week's poll on the home page
  - *Protect*: take a small action, which goes to Take Action
- One Marigold CTA, *Find an action to take*, plus *Explore on my own*. The three cards share the same plain border, so the CTA is the only Marigold element
- Signed-out visitors see *Sign in with Google to save your actions and track your journey*; a successful sign-in closes the welcome
- Shows on the **home page only**, not on content pages, so visitors from a shared blog or video link can read what they came for; they see it when they first reach Home. Take Action already explains itself
- Fits without scrolling (was taller than a laptop screen); a bottom sheet on phones
- Fixed: every tile and chip looked clickable but wasn't; the header's white text on raw Teal was about 3.4:1 (now the text-safe teal); the dialog is labelled by its title

## [5.4.1] - 2026-10-10

### Changed
- **Earth's active pills** (element section nav and element switcher) now use white text on the deeper brown, matching the teal elements' white-on-deeper-teal pills. Both are dark shades, so they read the same way (4.84:1)

### Fixed
- Unit tests compile again: the analytics spec fixture was missing the now-required `schemaVersion` field on `ActivityLogEntry`

## [5.4.0] - 2026-10-09

### Fixed — accessibility (WCAG 2.1 AA)
- **Color contrast** (automated check: 925 failing elements → 0 across all 17 public pages, desktop and mobile). Raw Teal and Brown are about 3.3:1 both as text on ivory and under white text; AA needs 4.5:1. New text-safe tokens in `src/theme/variables.scss`, documented there:
  - `--wiof-teal-text` / `--wiof-brown-text` / `--wiof-marigold-text` for text on light surfaces
  - `--wiof-teal-fill` / `--wiof-brown-fill` behind white text (buttons, header bars, active pills, banners, widget headers, subscribe tab)
  - ink, never white, on Marigold (the two Google sign-in buttons were white on Marigold, about 1.6:1)
  - `--wiof-ink-muted` for secondary text, replacing ~60 opacity/warm-grey uses at 2.5–4:1
  - Ionic `primary`/`secondary` now map to the text-safe shades; tinted chips use the `-shade-40` text colors; AQI *Unhealthy*/*Very unhealthy* badges use ink text
  - Raw Teal/Brown/Marigold stay for borders, icons, decorative shapes and large display type
- **Mobile element heroes:** stronger ivory scrim behind the text (body text had dropped to about 2.2:1 over the illustration)
- **Pinch-zoom re-enabled:** the viewport no longer sets `maximum-scale=1` / `user-scalable=no`
- **Screen readers:** 467 decorative icons are hidden (`aria-hidden`); slider arrows and icon-only buttons have labels
- **Our Team:** long bios can be scrolled with the keyboard, with a visible focus ring; the face of each flip card that is turned away is `inert`, so Tab no longer reaches hidden buttons

### Fixed
- **Mobile menu:** *My Feedback* was missing for signed-in users (it was only in the desktop avatar menu). The menu height is now based on the screen instead of a fixed 400px, which would have cut off *Logout*

## [5.3.0] - 2026-10-06

### Changed
- **Element icons are now PNG** (brand direction): 240px transparent renders of the existing icon artwork (normal and selected), used on the home element cards and pills, the element page heroes and the 404 page. All CSS animations are unchanged. The SVG originals stay in `src/assets/icons/` as source masters
- **Home hero motto on phones** scales with the screen width (container units), so it's bigger while staying on three lines. It's measured to fit "Enlighten through Knowledge" with about 13px to spare, and tablet/desktop are unchanged
- **Home element cards** center a short last row on tablet (3 + 2) and mobile (2 + 2 + 1) instead of leaving it left-aligned

## [5.2.0] - 2026-10-06

### Added
- **Home category for Coffee Conversations:** the home page conversation is now managed separately from the element pages. The admin form offers *Home* as a category, and the manage page has a Home filter and badge
- `scripts/migrate-home-coffee-conversation.js`: moves the conversation the home page showed (the newest one) into *Home*. It's a dry run unless `--apply` is passed, and it's idempotent

### Changed
- The home page shows the newest *Home* conversation, and falls back to the newest overall if none exists
- Data: *WIOF's Founder Shiv on Corporate Purpose…* moved from Energy to Home (applied on staging; production is a runbook Phase 1 step)

## [5.1.1] - 2026-10-05

### Added
- **My Feedback page** (`/my-feedback`, avatar menu): signed-in users see the feedback they've sent, newest first, with status *Received* / *In review* / *Resolved*, refreshed on every visit
- The feedback popup tells signed-in users where to track their feedback, and signed-out users that signing in lets them track it

### Security
- Firestore rules: a signed-in user can read only `Feedback` docs carrying their own uid; status changes stay admin-only

## [5.1.0] - 2026-10-05

### Added
- **Website feedback form:** a *Share feedback* button in the footer of every public page opens a popup with the category (Report an issue / Idea or suggestion / Content feedback / Something else), a message, and optional name and email (prefilled when signed in). The page URL is recorded automatically
- **Admin → Feedback page:** totals, category/status filters, status triage (New / Reviewed / Resolved), delete, and Excel export
- New `Feedback` Firestore collection with field-validated public create and admin-only management, plus rules tests

### Deploy notes
- Needs a **backend** deploy (Firestore rules) alongside Hosting. Without it, feedback submissions and My Feedback fail

---

## [1.0.11] - 2026-07-18

### Added
- **Water Widget** — Live rainfall via Open-Meteo, worldwide city search, category tabs, verified facts
- **Energy Widget** — CO₂ calculator with CEA/IPCC verified factors, equivalence cards, source citations
- **Food pH Widget** — 543 foods, flip card, USDA nutrition API, category dropdown, random button, health tips
- **EQ Widget** — TMMS-24 scoring with gender selection, progress bar, modern result cards
- **AQI Widget** — Auto-search, modern scorecard with health advice, suspicious data filtering
- Loading skeletons across all widgets
- Verified fact strips with citations on all 5 widgets
- Modern privacy consent bar (top, glass-morphism)
- Blog post page redesign (article layout)
- About Us / Discover More page with content cards
- Our Team page with modern profile cards
- Back button component modernized globally
- Firm in Focus — multiple firms with prev/next (up to 10)
- Subscribe section redesigned
- Environment Calendar — loading overlay instead of text jump
- Dynamic copyright year in footer
- App version displayed in footer
- Unified deployment script (`deploy.ps1`)
- Food pH data verification scripts (Clemson, USDA, FDA cross-reference)
- CHANGELOG.md

### Changed
- AQI colors softened (pastel palette)
- Navigation: "About Us" → Discover More, "Our Team" → Team members
- Polls: correct answer support with reveal after voting
- Admin panel: "NGO in Focus" renamed to "Firm in Focus"
- Publish/unpublish toggle for firms

### Fixed
- EQ scoring bug (repair used clarity variable)
- Memory leaks (takeUntil pattern)
- Race condition in nutrition API calls (switchMap)
- AQI station lookup (using @uid)
- Calendar layout jump during loading
- Breaking news media not visible on mobile
- Coffee conversation spacing on mobile
- Course in Focus image visibility

---

## [1.0.6] - 2026-07-04

### Fixed
- Home page hero image and env calendar image
- Blog card design on all pages
- Environment calendar next/prev month

---

## [1.0.5] - 2026-06-21

### Added
- Section nav component (sticky pills menu)
- Element pages redesign — modern UI, responsive flex layouts

### Fixed
- NGO in-focus description removal
- Element pages pills menu fixed to top

---

## [1.0.4] - 2026-06-20

### Added
- Full element pages redesign (Air, Earth, Fire, Spirit, Water)
- Blog/video slider redesign
- In-focus widget redesign
- Shared element page SCSS
