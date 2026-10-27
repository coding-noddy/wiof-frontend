# WIOF Frontend — TODO List

> Track planned features, improvements, and technical debt here.
> Format: **[Priority]** Description — *context / notes*
> Finished work is recorded in CHANGELOG.md and the git history, not here.

---

## 🔴 WIOF Fixes (Next Sprint)

### Bugs / Open Questions
- Arent the public user activities recorded for admin users, do we need to let them use different public account for their general application use purpose?? what do you suggest, let admin  users use public account also or better they create separate account for that purpose.

### Admin Dashboard
- **[LOW]** Registered users list — option to block/disable a user (the list itself is done; blocking was deferred)

### Pending Improvements
- **[MED]** Environment Calendar — remove external padding, make calendar dates area bigger
- **[LOW]** AQI temperature — values come directly from monitoring stations via WAQI API (correct as reported)
- **[LOW]** Admin Manage Polls — add optional "view voter emails" detail view for guest votes (not needed now)

### Responsiveness & Mobile
- **[HIGH]** Widget responsiveness — ensure all 5 widgets display properly on mobile (proper padding, no overflow)
- **[HIGH]** Card width and gaps should be consistent in responsive mode across all pages

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

## 🔒 Security (Deferred)

- **[MED]** Turn on Firebase App Check (reCAPTCHA) — *deferred 2026-10-24; enable when there's spam/abuse, unusual Firestore usage spikes, or traffic big enough to attract bots*
  - Already wired in the code (v6.2.0) and switched off: needs a reCAPTCHA site key in `appCheckSiteKey` (environment files) and `ENFORCE_APP_CHECK=true` in `functions/.env.<project>`, plus Firestore/Storage enforcement in the App Check console.
  - Protects against scripts using the public Firebase config directly: spam feedback, poll-vote stuffing, flooding `subscribe`/callables, and bulk reads that run up the bill. Firestore rules stay the real data protection.
  - Cost: 10k reCAPTCHA checks/month free, then $8 flat up to 100k, then $0.001 per check. At 10k visitors/day with the default 1-hour token that's ~$200+/month, more than Firestore itself, so use a longer token TTL (1–7 days) to stay near the $8 tier.
  - Rollout: staging first → prod in monitor-only mode (watch the App Check metrics for legitimate requests that would fail) → enforce.

---

## 🟡 Design Polish (Next Up)

- **[HIGH]** AQI Widget — internal tab switcher and ion-toolbar buttons need modern treatment
- **[MED]** Take Action Content — fixed heights, iframe cards, hover font-size jump

---

## 🟢 Future Features

- **[MED]** Blog image gallery/carousel inside blog posts
  - Inline images in the blog body are done (editor uploads them to Storage); a gallery/carousel block is the remaining idea

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

- **[MED]** AI-powered "Did You Know?" facts for all element widgets
  - Each element widget (Air, Earth, Fire, Spirit) gets a verified fact strip
  - Single Firestore collection per element, managed from admin panel
  - AI suggests facts → admin verifies → publishes with source URL

- **[LOW]** "Load more" pagination for Blogs & Videos list pages
  - Current: both list pages load and render everything in one go. Blogs: one query per element
    on the small `blog_summaries` docs (since v6.3.0, with stored cover URLs, so no per-card
    Storage lookups). Videos: full playlist via `getAllPlaylistVideos()` (pages through YouTube
    50 at a time, capped at 500). Fine at current sizes (Oct 2026 playlists: Air 11, Water 11,
    Earth 20, Energy 7, Spirit 8 videos).
  - Trigger: revisit once any element passes ~50–100 blogs or videos
  - Approach: keep loading the full list into memory (so the client-side search still covers
    everything), but render the first ~24 and reveal more with a "Load more" button.
    Unrendered cards don't load their image.
  - Not needed: real Firestore cursor paging (`limit` + `startAfter`) only matters in the
    thousands, and it would push search server-side (Firestore has no text search → Algolia etc.)
  - Reference: `src/app/pages/blogs/blogs.page.ts`, `src/app/pages/videos/videos.page.ts`,
    `src/app/services/youtube-video.service.ts`

- **[LOW]** Embed WRIS map inline (iframe) on water-item click
  - Check if indiawris.gov.in allows iframe embedding (X-Frame-Options)
  - If allowed: clicking a tile opens the map inline with close/expand button

---

## 📋 Known Limitations (Acceptable)

- API keys are in client bundle — standard for frontend-only apps without backend
  - USDA key has built-in rate limiting
  - Open-Meteo needs no key
  - Firebase keys are protected by Security Rules
- Food pH category dropdown lacks full keyboard navigation (arrow keys, Escape)
  - Acceptable for V1, can add @angular/cdk overlay later
- 292 food pH items remain "Approximate" — no bulk Indian food pH database exists
  - All pass category validation, honestly labeled in UI
