# Angular Upgrade Plan — Research & Recommendation

**Status:** research complete, not started · **Date:** 2026-10-29 · **App version at time of writing:** 6.4.1 (Angular 16.2)

This document is the research the team asked for before touching the upgrade: what the current setup is, what has to change, what will break, in what order to do it, how to test it, and how long it should take. All version facts were checked against the official Angular pages and the npm registry on the date above (sources at the end).

---

## 1. Summary

- **Angular 17 is not a useful target on its own.** Angular's official support page says every version from 2 to 19 is out of support. Stopping at 17 would leave WIOF on unsupported software, exactly like today.
- **The realistic target is Angular 21** (supported until June 2027). Angular 22 is the current release, but **AngularFire, the Angular–Firebase library this app depends on, does not support 22 yet**: its newest release (21.0.0, 26 Oct 2026) requires Angular 21.2. Moving 21 → 22 later is one small hop once AngularFire 22 ships.
- **It's very doable with the current setup.** Most of the work is the official `ng update` path, one major version at a time (16 → 17 → 18 → 19 → 20 → 21). Nothing forces a rewrite: AngularFire 21 and Firebase 13 still ship the "compat" API the data layer uses, and NgModules are still fully supported.
- **The real work is concentrated in a few known places:** the blog editor (Quill 1 → 2), 11 Ionic form pages, the build-system switch (2 small breakages found), and Node.js on the dev machine.
- **Estimate:** about **6–9 working days** of implementation, plus two short staging check sessions for an admin (mainly the blog editor). Shipped to prod in two releases to limit risk.

---

## 2. Current setup (inventory)

| Area | Today | Notes |
|---|---|---|
| Angular / CLI / Material / CDK | 16.2 | Out of support since Nov 2024 |
| TypeScript / zone.js / RxJS | 5.1.6 / 0.13 / 7.8 | RxJS 7.8 is fine all the way to Angular 22 |
| Build system | `@angular-devkit/build-angular:browser` (webpack) | The newer esbuild-based `application` builder is the standard from Angular 17+ |
| Ionic | `@ionic/angular` 7.8 | Ionic 7 is out of support; Ionic 8 supports Angular 16+, Ionic 9 needs 18+ |
| AngularFire / Firebase JS SDK | 7.6.1 (compat API) / 9.23.0 | 32 files use `@angular/fire/compat`, 13 use `firebase/compat` directly (mostly `FieldValue` / `Timestamp`), 6 already use the modular SDK (Google sign-in, Cloud Functions, App Check) |
| Rich text editor | `ngx-quill` 23 + `quill` 1.3.7 + `quill-image-resize-module` 3.0.0 | The resize plugin was last published in 2017 and only supports Quill 1 |
| Charts | `ng2-charts` 5 + `chart.js` 4 | 2 files |
| Carousel | `swiper` 10 (web components, `CUSTOM_ELEMENTS_SCHEMA` in 3 modules) | No Angular dependency; can stay |
| App structure | 106 NgModules, 101 components, 0 standalone | NgModules remain supported |
| Templates | 618 `*ngIf` / `*ngFor` / `*ngSwitch` | Deprecated since Angular 20; official automatic converter exists |
| Guards | 2 class-based (`auth.guard.ts`, `public-user.guard.ts`) | Deprecated style, still works; convert to functional guards |
| Unit tests | Karma + Jasmine, 134 passing | Karma still works; Vitest is the new default for *new* projects |
| Linting | `@angular-devkit/build-angular:tslint` | TSLint was retired years ago; `ng lint` doesn't work. Replace with angular-eslint or remove |
| Dev machine Node.js | 20.11.1 | Angular 20/21 need **20.19+**, Angular 22 needs **22.22+ or 24.15+** |
| Cloud Functions | Node 22, firebase-functions 7, firebase-admin 13 | **Not affected**; separate package |

**Unused or obsolete packages to remove first:** `d3` and `@types/d3` (never imported), `@ionic-native/core|splash-screen|status-bar` (only splash screen / status bar, which do nothing on the web), `@capacitor/core` and `@capacitor/cli` 3.3.3 (unused; if the installable-app plan uses Capacitor, it'll be a current version added fresh).

**Security debt to fold in:** `xlsx` 0.18.5 (the SheetJS npm package is abandoned and has known vulnerabilities; used in 1 admin export file) → move to SheetJS's own distribution (0.20.x) or `exceljs`.

---

## 3. Target and compatibility matrix

Checked 2026-10-29. "Supported until" is Angular's long-term-support end date.

| Angular | Supported until | AngularFire | Firebase SDK | ngx-quill (Quill) | ng2-charts | Node.js (dev) | TypeScript |
|---|---|---|---|---|---|---|---|
| 16 (today) | ended Nov 2024 | 7.6 | 9.23 | 23 (Quill 1) | 5 | 16/18 (20.11 works) | 4.9–5.1 |
| 17 | ended | 17.1 | 10.12+ | 24 (Quill 1) or 25 (Quill 2) | 6 | 18.13+ / 20.9+ | 5.2–5.4 |
| 18 | ended | 18.0 | 10.12+ | **26 (Quill 2 required)** | 7 | 18.19+ / 20.11+ | 5.4–5.5 |
| 19 | ended | 19.2 | 11.8+ | 27 | 8 | 18.19+ / 20.11+ | 5.5–5.8 |
| 20 | 28 Nov 2026 | 20.1 | 11.8+ | 28 | 9 | **20.19+** / 22.12+ | 5.8–5.9 |
| **21 (target)** | **Jun 2027** | **21.0 (needs 21.2+)** | **12.18+** | 29–30 | 10 | 20.19+ / 22.12+ / 24 | 5.9 |
| 22 (later) | Jun 2028 | *not released yet* | — | 31 | 11 | **22.22+** / 24.15+ | 6.0 |

Ionic 8 (8.8.x) covers Angular 16 → 22, so Ionic moves once, early. Angular Material 21 still ships the `indigo-pink.css` prebuilt theme the app uses, so no theme change is needed.

---

## 4. What will break (found in this codebase)

| # | Change | Where | Fix | Forced at |
|---|---|---|---|---|
| 1 | **Quill 2** (ngx-quill 26+ requires it) | Blog editor (`add-blog.page.ts`), blog viewer, 8 files importing Quill; `quill-image-resize-module` is Quill-1-only | Upgrade to Quill 2; replace the resize plugin with `@botom/quill-resize-module` 2.x (Quill 2, maintained); re-test paste cleanup, inline image upload (incl. the v6.3 embedded-image upload), image resize, Delta save/load, preview. Stored blog HTML keeps rendering as it does today (it's shown as HTML); old blogs must still open and re-save cleanly in the editor | Angular 18 |
| 2 | **Ionic 8 removed the legacy form syntax** (`<ion-item><ion-label>` + input) | 11 files: 10 admin add/edit pages (about-us, blog, occasion, coffee-conversation, course, in-focus, news, ngo, poll, take-action) + settings | Move labels onto the control (`label="…" labelPlacement="…"`); check the 105 Ionic form controls for visual changes | Ionic 8 (do early) |
| 3 | **`require('package.json')`** in the footer (version label) | `wiof-footer.component.ts` | `import { version } from '../../../../package.json'` (with `resolveJsonModule`) | esbuild builder |
| 4 | **Build output folder changes** to `dist/<project>/browser` | `angular.json` vs `firebase.json` (`"public": "dist"`) and `deploy.ps1` (cleans `dist`) | Set `outputPath: { "base": "dist", "browser": "" }` so output stays in `dist/`; verify the deploy publishes the full site | esbuild builder |
| 5 | **Standalone becomes the default** for components | All 101 components | `ng update` adds `standalone: false` automatically; no manual work | Angular 19 |
| 6 | `HttpClientModule` deprecated | `app.module.ts` | `ng update` migrates to `provideHttpClient()` | Angular 18 |
| 7 | `*ngIf` / `*ngFor` / `*ngSwitch` deprecated | 618 template uses | `ng generate @angular/core:control-flow`, then review the diff (the converter is good but not perfect; `@for` needs a `track` expression) | Angular 20 (do then) |
| 8 | Builder packages move (`@angular-devkit/build-angular` → `@angular/build`) | `angular.json`, `package.json` | `ng update` migration; keep `inlineCritical: false` (needed for the strict CSP); re-verify **0 CSP violations** on staging | Angular 20 |
| 9 | Class-based guards deprecated | 2 guards | Convert to functional guards (small) | Any time |
| 10 | ng2-charts 6+ needs `provideCharts(withDefaultRegisterables())` | 2 chart files | Add the provider when upgrading ng2-charts | When ng2-charts moves (end) |
| 11 | Node.js on the dev machine | Local toolchain (nvm4w) | Install Node 22 LTS (works for 17–22; Cloud Functions already run Node 22) | Angular 20 |
| 12 | TSLint target | `angular.json` | Remove, or replace with `@angular-eslint` | Any time |

**Not a problem (checked):** NgModules (still supported), Angular Material theme, Swiper web components, RxJS 7.8, the compat Firebase API (still shipped in AngularFire 21 and Firebase 13), Firestore/Storage rules, Cloud Functions, the security headers/CSP (re-verified per step).

---

## 5. The plan, step by step

Each step is one branch, built and tested before the next. After each step: production build, 134 unit tests, 161 rules tests, the Admin → Workshops end-to-end test (17 checks), page render checks (home, element pages, blogs, workshops, header/footer, mobile widths), and a bundle-size note.

| Step | What | Main risk | Staging check |
|---|---|---|---|
| **0. Prepare** | Install Node 22 LTS; remove unused packages (d3, ionic-native, capacitor 3, tslint target); fix the footer `require`; replace `xlsx`; record a baseline (build size, Lighthouse, test counts) | Low | Smoke |
| **1. Ionic 7 → 8** (on Angular 16) | Convert the 11 legacy form pages; review Ionic 8 breaking changes (colour/dark-mode variables, component defaults) | Medium (admin forms look/behave) | Admin forms: add/edit each content type |
| **2. Angular 16 → 17** | `ng update @angular/core@17 @angular/cli@17 @angular/material@17`; AngularFire 17 + Firebase 10; zone.js 0.14; TS 5.4; ngx-quill 24 (still Quill 1) | Low | Smoke |
| **3. Angular 17 → 18 + Quill 2** | `ng update` to 18; AngularFire 18; ngx-quill 26 + Quill 2 + new resize plugin; `provideHttpClient` migration | **Highest** (blog editor) | **Admin: write a blog with pasted text + images, resize an image, edit an old blog, check preview and public post** |
| → **Release A to prod (v7.0)** | Ionic 8 + Angular 18 + Quill 2 live; real users exercise it before the remaining hops | | Full smoke on prod |
| **4. Angular 18 → 19** | `ng update` (adds `standalone: false`); AngularFire 19 + Firebase 11 | Low | Smoke |
| **5. Angular 19 → 20** | `ng update`; switch to the `application` builder; fix output path; control-flow migration (618 uses, reviewed); functional guards | Medium (build/deploy) | **Deploy check: full site served, 0 CSP violations** |
| **6. Angular 20 → 21** | `ng update`; AngularFire 21 + Firebase 12.18; ng2-charts 10; Material 21; TS 5.9 | Low–medium | Smoke + admin spot-check |
| → **Release B to prod (v7.1)** | On a supported Angular (until Jun 2027) | | Full smoke on prod |
| **7. Later: 21 → 22** | When AngularFire 22 is released; TS 6.0, Node 22.22+ | Low | Smoke |

**Why two prod releases:** if something slips through, Release A narrows it to Ionic/Quill/early Angular; Release B to the build switch and later Angular. Each is rolled back the usual way (previous Hosting version).

**Data layer (compat → modular Firebase API):** not required for the upgrade, so it's not in the critical path. Recommendation: **write all new code (Phase 2 / Planet Passport) with the modular API**, and migrate the 32 existing compat files gradually, service by service, once the upgrade is done. That's also the step that unlocks Angular's newer "zoneless" mode later.

---

## 6. Testing safety net (already in place)

- **Unit tests:** 134 passing, suite runs to completion (fixed in 6.4.1).
- **Firestore rules tests:** 161, run automatically before every deploy.
- **End-to-end:** the Admin → Workshops flow (sign in as the staging test admin, add/edit/draft/delete with poster upload, guest view) — 17 checks.
- **Render checks:** headless Chrome scripts for the public pages at desktop and phone widths, including Firestore read counts and console errors.
- **Staging test accounts:** a non-admin and an admin account, so signed-in and admin flows can be tested headless.
- **Gaps to cover during the upgrade:** a scripted blog-editor test (step 3), and a CSP-violation check after the builder switch (step 5).

---

## 7. Effort estimate

| Part | Estimate |
|---|---|
| Step 0 (prepare) | 0.5–1 day |
| Step 1 (Ionic 8 + 11 form pages) | 1–1.5 days |
| Steps 2–3 (Angular 17–18, Quill 2) | 1.5–2.5 days |
| Steps 4–6 (Angular 19–21, builder, control flow) | 2–3 days |
| Release verification (2 releases) | 0.5–1 day |
| **Total** | **≈ 6–9 working days** + 2 admin check sessions (~1 hour each) |

Main uncertainty: the Quill 2 editor behaviour. Everything else follows Angular's automated migrations.

---

## 8. Priority: upgrade first, or Phase 2 / Planet Passport first?

**Recommendation: do the upgrade first, time-boxed to about two weeks, and use that time to design Phase 2 in parallel.**

Reasons:

1. **Everything new we build now would be built twice.** Phase 2 (Today on WIOF, onboarding, a richer My Journey, the action model) and Phase 3 (Planet Passport) add a lot of new screens and new Firestore code. Built on Angular 16 + the compat API, all of it would need converting later — so the longer we wait, the bigger the upgrade gets.
2. **Planet Passport is a data-heavy feature.** It's the right moment to write its data layer once, on the modern Firebase API, instead of adding more compat code we'd have to migrate.
3. **Security and support.** Angular 16 has had no security fixes for two years, and `npm audit` reports critical/high issues. A behaviour-tracking feature collects more personal data; it should sit on a supported stack.
4. **It's tractable now.** The research shows no blocker and no forced rewrite; the work is mostly automated and concentrated in known places.
5. **No product time is lost.** Phase 2 needs design before code anyway: the data model for journeys/actions/stamps, the achievement rules (what earns a stamp, how streaks count, guest vs signed-in), the "Today on WIOF" logic, and the UX flows. That can happen while the upgrade runs; building starts on the new stack the day the upgrade lands.

**When to choose the other way round:** if there's a hard external date for a Phase 2 feature (a launch event, a partner or CSR commitment) inside the next ~3 weeks, ship that feature on the current stack first and upgrade straight after — accepting some conversion work later.

---

## 9. Decisions needed

1. **Target:** Angular 21 now, 22 when AngularFire supports it. *(recommended)*
2. **Priority:** upgrade first with Phase 2 design in parallel. *(recommended)*
3. **Releases:** two prod releases (A after Angular 18 + Quill 2, B after Angular 21). *(recommended)*
4. **Dev machine:** OK to install Node 22 LTS via nvm4w (Node 20.11 stays installed and can be switched back).
5. **Admin time:** someone available for the two ~1-hour editor/forms checks on staging.

---

## Sources (checked 2026-10-29)

- Angular releases and support: https://angular.dev/reference/releases
- Angular version compatibility (Node, TypeScript, RxJS): https://angular.dev/reference/versions
- Angular control-flow migration: https://angular.dev/reference/migrations/control-flow
- AngularFire repository (compat docs, upgrade guides): https://github.com/angular/angularfire
- npm registry metadata for `@angular/fire`, `firebase`, `@ionic/angular`, `ngx-quill`, `quill`, `ng2-charts`, `@angular/material`, `swiper`, `quill-image-resize-module`, `@botom/quill-resize-module` (versions, release dates, peer dependencies, export maps)
