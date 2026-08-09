# WIOF Frontend — TODO List

> Track planned features, improvements, and technical debt here.
> Format: **[Priority]** Description — *context / notes*

---

## 🔴 WIOF Fixes (Next Sprint)

### Admin Dashboard
- **[HIGH]** Refine admin dashboard — modern card-based UI, better navigation, responsive layout
- **[MED]** All admin manage pages — consistent table/card designs, better mobile experience

### Pending Improvements
- **[MED]** Environment Calendar — remove external padding, make calendar dates area bigger
- ~~**[MED]** Polls widget — show results from previous polls, show correct answers~~ ✅ DONE
- **[LOW]** AQI temperature — values come directly from monitoring stations via WAQI API (correct as reported)

### Responsiveness & Mobile
- **[HIGH]** Widget responsiveness — ensure all 5 widgets display properly on mobile (proper padding, no overflow)
- **[HIGH]** Card width and gaps should be consistent in responsive mode across all pages
- ~~**[HIGH]** Breaking news — image/video not displayed in mobile mode~~ ✅ DONE
- ~~**[HIGH]** Coffee conversation — too much upper/lower spacing on mobile element pages~~ ✅ DONE
- ~~**[HIGH]** Course section — image not fully visible on mobile devices~~ ✅ DONE

### Design Improvements
- ~~**[HIGH]** Subscribe section — needs modern redesign (currently old side-drawer style)~~ ✅ DONE
- ~~**[HIGH]** Privacy policy acceptance strip — redesign to look modern (cookie-consent style bar)~~ ✅ DONE
- ~~**[MED]** Blog page design — individual blog post page needs better layout~~ ✅ DONE
- ~~**[MED]** About us page — card designs should be improved~~ ✅ DONE
- ~~**[MED]** Calendar loading — cards jump due to "loading calendar" text. Use skeleton/overlay instead.~~ ✅ DONE

### Functional Fixes
- ~~**[HIGH]** Privacy policy year range — should be dynamic: "2020-{currentYear}" not hardcoded~~ ✅ DONE
- ~~**[MED]** "Discover More" button — should scroll to element section or coffee conversation on home page
  instead of navigating away~~ ✅ DONE
- ~~**[MED]** "About Us" → consider renaming to "Meet Our Team" (more personal, less corporate)~~ ✅ DONE (Header nav updated)

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

- ~~**[HIGH]** Energy Widget — redesign pump-station result (gas station JPG is very dated),
  modern unit dropdown, better CO₂ output visualization~~ ✅ DONE
- **[HIGH]** AQI Widget — internal tab switcher and ion-toolbar buttons need modern treatment
- **[MED]** Take Action Content — fixed heights, iframe cards, hover font-size jump
- ~~**[MED]** Food pH Indicator — input styling, layout consistency with other widgets~~ ✅ DONE
- ~~**[LOW]** Subscribe side-panel — polish slide-in drawer, update deprecated floating labels~~ ✅ DONE

---

## 🟢 Future Features

- ~~**[HIGH]** Blog sharing feature~~ ✅ DONE
  - ~~Add share button on blog cards + blog detail page~~ ✅
  - ~~Generate shareable link with blog hero image as Open Graph preview~~ ✅
  - ~~Use Web Share API on mobile for native share sheet~~ ✅
  - **[IN PROGRESS]** Dynamic Open Graph meta tags for rich link previews
    - Cloud Function deployed to staging ✅
    - Production deploy pending (IAM permission fix needed)
    - Real user page loading fixed (serves index.html instead of redirect loop)

- ~~**[HIGH]** Blog SEO-friendly URLs (slugs)~~ ✅ DONE
  - ~~Store `slug` field in Firestore~~ ✅
  - ~~Admin panel: auto-generate slug from title on save~~ ✅
  - ~~Blog service: `getBlogBySlug(slug)`~~ ✅
  - ~~One-time migration script: backfill slugs for existing blogs~~ ✅
  - ~~Route: slug lookup first, fallback to ID~~ ✅

- **[HIGH]** Rich blog content — multiple images in blog body
  - Current: Only one hero image per blog
  - Goal: Admin can insert images throughout the blog content (inline with text)
  - Approach: Upgrade Quill editor to support image uploads within content
  - Store additional images in Firebase Storage, embed URLs in blog HTML content
  - Consider: Image gallery/carousel support within blog posts

- **[HIGH]** Home page design refresh
  - Make it more attractive and engaging
  - Better hero section with animation/video background
  - Card layouts with better visual hierarchy
  - Consider: Testimonials, impact counters, featured content carousel

- **[HIGH]** Take Action — Gamification & User Engagement
  - **Concept:** Users take eco-challenges and track their impact
  - **Challenge examples:**
    - Plant 30 trees in a year
    - Water 1 plant every day
    - Turn off fan/light when leaving room
    - Use public transport once a week
    - Reduce single-use plastic for 30 days
  - **Features:**
    - Challenge cards with join button
    - Progress tracker (daily/weekly check-ins)
    - Impact calculator ("You saved X kg CO2, X litres water")
    - Leaderboard (community motivation)
    - Badges/achievements for completing challenges
    - Streak counter (consecutive days)
  - **Technical:**
    - Firebase Auth (users need accounts)
    - Firestore: Challenges, UserProgress, Achievements
    - Push notifications for reminders (FCM)
  - **Mini-games ideas:**
    - Waste sorting game (drag to correct bin)
    - Carbon footprint quiz
    - "Spot the pollution" image game
    - Water conservation trivia
  - **Phases:**
    - Phase 1: Challenge cards + join + daily check-in
    - Phase 2: Impact calculator + badges
    - Phase 3: Leaderboard + games

- ~~**[DONE]** Deployment automation script~~ ✅
  - `npm run deploy:staging` / `npm run deploy:prod`

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
- EQ Widget (Spirit) — TMMS-24 scoring fix, gender selection, progress bar, result cards
- AQI Widget (Air) — auto-search, scorecard, pollutant grid, suspicious data filtering, pastel colors
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
- Subscribe section — modern redesign (glass-morphism bar)
- Privacy policy consent bar — modernized (top bar, glass-morphism)
- Privacy policy year range — dynamic (2020-currentYear)
- Blog post page — redesigned (blurred bg image, better layout)
- About us page — content cards redesign
- Team page — profile cards redesign
- Calendar loading — skeleton overlay
- "Discover More" — scrolls to elements section
- Header nav — updated (About Us + Our Team links)
- Back button — modernized
- Loading skeletons — added across site
- Breaking news — mobile media fix
- Coffee conversation — mobile spacing fix
- Course section — mobile image fix
- Blog sharing — share button on cards + detail page (Web Share API + clipboard fallback)
- Blog slugs — model, service, admin auto-generate, migration script
- Blog listing page — modernized (sticky header, skeleton loading)
- Video listing page — redesigned to match element page cards
- Video detail page — 16:9 responsive player + article layout
- Video card component — redesigned to match element page slider cards
- Firm in Focus — multiple firms, publish/unpublish toggle, delete fix
- Polls — correct answer feature, green highlight, checkmark
- Deployment automation — unified PowerShell script, npm commands, git tagging
- Version tracking — footer auto-reads from package.json, CHANGELOG.md
- OG meta tags Cloud Function — deployed to staging (production pending)
- Prod→Staging sync scripts (Firestore + Storage)
- Old news cleanup script (archive + delete, configurable retention)

## 📋 Known Limitations (Acceptable)

- API keys are in client bundle — standard for frontend-only apps without backend
  - USDA key has built-in rate limiting
  - Open-Meteo needs no key
  - Firebase keys are protected by Security Rules
- Food pH category dropdown lacks full keyboard navigation (arrow keys, Escape)
  - Acceptable for V1, can add @angular/cdk overlay later
- 292 food pH items remain "Approximate" — no bulk Indian food pH database exists
  - All pass category validation, honestly labeled in UI
