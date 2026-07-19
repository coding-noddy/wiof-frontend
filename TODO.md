# WIOF Frontend — TODO List

> Track planned features, improvements, and technical debt here.
> Format: **[Priority]** Description — *context / notes*

---

## 🔴 WIOF Fixes (Next Sprint)

### Admin Dashboard
- **[HIGH]** Refine admin dashboard — modern card-based UI, better navigation, responsive layout
- **[MED]** All admin manage pages — consistent table/card designs, better mobile experience

### Responsiveness & Mobile
- **[HIGH]** Widget responsiveness — ensure all 5 widgets display properly on mobile (proper padding, no overflow)
- **[HIGH]** Card width and gaps should be consistent in responsive mode across all pages
- **[HIGH]** Breaking news — image/video not displayed in mobile mode
- **[HIGH]** Coffee conversation — too much upper/lower spacing on mobile element pages
- **[HIGH]** Course section — image not fully visible on mobile devices

### Design Improvements
- **[HIGH]** Subscribe section — needs modern redesign (currently old side-drawer style)
- **[HIGH]** Privacy policy acceptance strip — redesign to look modern (cookie-consent style bar)
- **[MED]** Blog page design — individual blog post page needs better layout
  - Reference: https://wiof-staging.web.app/element/air/blog/KkeNELNVMtzOPQZ8r1A1
- **[MED]** About us page — card designs should be improved
- **[MED]** Calendar loading — cards jump due to "loading calendar" text. Use skeleton/overlay instead.

### Functional Fixes
- **[HIGH]** Privacy policy year range — should be dynamic: "2020-{currentYear}" not hardcoded
- **[MED]** "Discover More" button — should scroll to element section or coffee conversation on home page
  instead of navigating away
- **[MED]** "About Us" → consider renaming to "Meet Our Team" (more personal, less corporate)
  - "About Us" implies mission/vision. "Meet Our Team" implies people → more engaging for users
  - Business perspective: Users connect with people, not statements. "Meet Our Team" builds trust.
  - Recommendation: Keep "About Us" as the page but rename the nav link to "Our Team" or "Meet the Team"

---

## 🔵 Widget Improvements

### Water Widget
- **[HIGH]** Dynamic Facts System with Admin Panel + AI verification
  - Currently: 5 hardcoded facts with manual citations (World Bank, WHO, NITI Aayog, CGWB)
  - Goal: Move facts into Firestore collection (e.g. `WaterFacts`)
  - Admin panel: Add/edit/publish facts with a `sourceText` + `sourceUrl` field
  - AI enhancement idea: Use an AI API (e.g. OpenAI) to suggest facts, auto-generate citations,
    and flag unverifiable claims before an admin publishes them
  - Same pattern can apply to other element widgets (Air facts, Earth facts, etc.)
  - Reference: `src/app/components/water-widget/water-widget.component.ts` → `waterFacts[]`

- **[MED]** data.gov.in CWC Reservoir Storage integration
  - API key stored in `environment.data_gov_api_key`
  - The specific CWC reservoir dataset (`resource/7210814`) has no active API — only downloadable CSV
  - Action needed: Check data.gov.in periodically for API activation, or find alternate
    dataset with working API endpoint
  - When available: Show "National reservoir storage: X% of capacity" as a live stat card

---

## 🟡 Design Polish (Next Up)

- **[HIGH]** Energy Widget — redesign pump-station result (gas station JPG is very dated),
  modern unit dropdown, better CO₂ output visualization
- **[HIGH]** AQI Widget — internal tab switcher and ion-toolbar buttons need modern treatment
- **[MED]** Take Action Content — fixed heights, iframe cards, hover font-size jump
- **[MED]** Food pH Indicator — input styling, layout consistency with other widgets
- **[LOW]** Subscribe side-panel — polish slide-in drawer, update deprecated floating labels

---

## 🟢 Future Features

- **[MED]** AI-powered "Did You Know?" facts for all element widgets
  - Each element widget (Air, Earth, Fire, Spirit) gets a verified fact strip
  - Single Firestore collection per element, managed from admin panel
  - AI suggests facts → admin verifies → publishes with source URL

- **[LOW]** Embed WRIS map inline (iframe) on water-item click
  - Check if indiawris.gov.in allows iframe embedding (X-Frame-Options)
  - If allowed: clicking a tile opens the map inline with close/expand button

---

## ✅ Completed

- Water Widget full redesign — modern card, category tabs, last-visited badge
- Water Widget live rainfall via Open-Meteo (no API key, free tier)
- Water Widget verified facts with official citations (World Bank, WHO, NITI Aayog, CGWB)
- Energy Widget full redesign — CO₂ calculator with verified factors (CEA, IPCC)
- Energy Widget fact strip with verified citations (PIB, MNRE, IEA, Newsonair)
- Food pH Widget redesign — 543 foods, flip card, category dropdown, random button
- Food pH Widget nutrition data via USDA FoodData Central API
- Food pH Widget data verified against Clemson, USDA PMP, FDA tables (260 items)
- Code review: memory leaks fixed (takeUntil pattern)
- Code review: race condition fixed (switchMap for nutrition requests)
- Code review: dead code removed (selectedUnit, refreshCache)
- Code review: timer typing fixed (ReturnType<typeof setInterval>)
- Code review: aria-live added to dynamic content sections
- Code review: input upper bound added (10,000 kWh max)
- Element pages (Air, Earth, Fire, Spirit, Water) — full modern UI redesign
- Blog card / Blog slider redesign
- Environment calendar — modal image section + next/prev month
- NGO in-focus description removal
- Home page hero image and tagline cleanup
- Section nav component (sticky pills menu on element pages)

## 📋 Known Limitations (Acceptable)

- API keys are in client bundle — standard for frontend-only apps without backend
  - USDA key has built-in rate limiting
  - Open-Meteo needs no key
  - Firebase keys are protected by Security Rules
- Food pH category dropdown lacks full keyboard navigation (arrow keys, Escape)
  - Acceptable for V1, can add @angular/cdk overlay later
- 292 food pH items remain "Approximate" — no bulk Indian food pH database exists
  - All pass category validation, honestly labeled in UI
