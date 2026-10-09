# Changelog

All notable changes to WIOF Frontend are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

> Releases between 1.0.11 and 5.0.3 were not recorded in this file. See the git history and the `v*-staging` / `v*-prod` tags.

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
