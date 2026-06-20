# WIOF Frontend — Pending Improvements

## Design / UX

### 1. Life Elements Circles
- Current: plain circles with text labels, old-style hover
- Suggestion: modernize as compact pill-buttons or icon-cards with smooth hover animations
- Priority: High (key navigation element between pages)

### 2. Blog & Video Section Titles
- Current: plain centered h2 text
- Suggestion: add decorative element — gradient underline, small icon, or accent line to make section headers feel more designed
- Priority: Medium

### 3. Footer
- Current: old `darkslategray` background, minimal styling
- Suggestion: modernize to match page design language — rounded sections, better typography, social links layout, newsletter CTA
- Priority: High (visible on every page)

### 4. Element Page Banner Subtitles
- Current: static text
- Suggestion: add subtle fade-in animation on load, or make taglines more compelling per element
- Priority: Low

### 5. Widget Internal UI (AQI, pH, Water, Energy, EQ)
- Current: structure is modern but internal content uses old Ionic defaults (plain inputs, basic buttons)
- Suggestion: improve spacing, typography, input styling, and button consistency inside each widget
- Priority: Medium

---

## Technical Cleanup

### 6. Remove Unused Components
- `<app-element-welcome-image>` is no longer used anywhere — remove from `app-common.module.ts` and delete component folder

### 7. Remove Backup Files
- `src/app/components/in-focus-widget/in-focus-widget.component.html.bak`
- `src/app/components/in-focus-widget/in-focus-widget.component.scss.bak`

### 8. Verify Section Nav Registration
- `SectionNavComponent` is declared in `app-common.module.ts` — confirm it's not duplicated in any page module

---

## Completed Work (This Session)
- Home page full redesign (hero, sections, cards, responsiveness)
- Coffee conversation: per-element theming, horizontal layout
- Breaking news: modern card design
- Calendar: image-as-background cells, responsive, modal redesign
- Polls: responsive progress bars
- EQ widget: responsive meter
- Firm in Focus: redesigned with modal, image top-aligned
- Course in Focus: pill metadata, thumbnail
- All element pages: shared layout, banners, section structure
- Blog slider: modern box-free cards
- Video slider: modern cards with play overlay
- Video widget: element-colored header bar
- In Focus widget: feature strip design
- Section nav: pill bar with per-element colors
- Equal-height video+widget rows via CSS flex
- Consistent fonts, colors, shadows, border-radius across all pages
