# Changelog

All notable changes to WIOF Frontend are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
