# WIOF Frontend — TODO List

> Track planned features, improvements, and technical debt here.
> Format: **[Priority]** Description — *context / notes*

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
- Element pages (Air, Earth, Fire, Spirit, Water) — full modern UI redesign
- Blog card / Blog slider redesign
- Environment calendar — modal image section + next/prev month
- NGO in-focus description removal
- Home page hero image and tagline cleanup
- Section nav component (sticky pills menu on element pages)
