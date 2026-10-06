# Changelog

All notable changes to WIOF Frontend are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

> Releases between 1.0.11 and 5.0.3 were not recorded in this file. See the git history and the `v*-staging` / `v*-prod` tags.

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
