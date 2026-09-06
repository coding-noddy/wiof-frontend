# Brand Alignment — Status

Source of truth: `WIOF_Plan_v4/ClimatEnlighten - Final Brand Assets.zip`
(Identity, Audience, Messaging, Brand markdown files + logos) and
`WIOF_Plan_v4/ClimatEnlighten-Brand-Usage-Guide.pdf`. Read those before
changing anything here — this file tracks what's been done against them,
not a restatement of the system itself.

## What's done

- **Typography** — `index.html` loads Aleo + Noto Sans (Google Fonts,
  replacing Roboto). `global.scss` applies Noto Sans as the base font and
  Aleo to `h1`–`h6`, `ion-title`, `ion-card-title` — matching the brand rule
  "Aleo for anything meant to be seen, Noto Sans for anything meant to be
  read." Uses the same `!important` pattern the old Roboto rule used, since
  Ionic's own components set their own font-family internally and a
  non-`!important` rule wouldn't reliably win.
- **Design tokens** — `src/theme/variables.scss` now defines `--wiof-brown`,
  `--wiof-teal`, `--wiof-marigold` (each with approved tint/shade steps) and
  `--wiof-ivory`/`--wiof-warm-white`/`--wiof-warm-grey`/`--wiof-ink`, matching
  the brand's exact hex values. New component work should reach for these
  instead of a hand-picked color.
- **Ionic primary/secondary** — remapped from Ionic's default blue to Ocean
  Teal (primary) and Earthy Brown (secondary). Verified zero existing
  template or TS code sets `color="primary"`/`color="secondary"` today, so
  this is a foundation for future components, not a visible change yet.
- **Fire → Energy rename** — decided: "Energy" is the name going forward;
  legacy `'fire'` values are normalized to `'energy'` on read, not migrated.
  Turned out smaller than feared: `element/energy` was already the live
  route (`pages/fire/` was just internal file/class naming residue, not a
  URL), so this was a clean rename, not a migration —
  - `pages/fire/` → `pages/energy/` (all files, classes: `FirePage` →
    `EnergyPage`, `FirePageModule` → `EnergyPageModule`, etc.), CSS classes
    (`.fire` → `.energy`), and every `ELEMENT_SELECT.FIRE`/
    `ELEMENT_VIDEOS_PLAYLIST_ID.FIRE`/etc. constant key.
  - Added `normalizeElementCategory()` in `app.constants.ts` — lowercases a
    stored category value and maps legacy `'fire'` to `'energy'`. This is
    the actual backward-compat mechanism: no data migration, existing
    `'Fire'`-tagged content just normalizes on read.
  - **Found and fixed a live bug along the way**: the admin filter buttons
    for News, Coffee Conversations, In Focus, NGO in Focus, and Course in
    Focus were labeled "🔥 Energy" but filtered by `category === 'fire'`,
    while content is actually saved with category `'Energy'` (confirmed via
    `PAGE_CATEGORY_MAP`, which the add-forms use) — so clicking that filter
    always returned zero results. Now filters by `'energy'` through
    `normalizeElementCategory()`, so it matches both `'Energy'` and any
    legacy `'Fire'`-tagged content. `manage-blog.page.ts`'s per-element
    summary tile had the same mismatch (`summary.fire` bucket never
    incremented for real `'Energy'` content) — fixed the same way. Emoji
    changed from 🔥 to ⚡ throughout (fire/flame imagery doesn't fit the
    brand's rays/illumination language for this element).
  - Verified via full `ng build` + full test suite (no compile errors) — not
    visually verified, same caveat as everything else in this file.

## Deliberately not touched — needs your call, not mine

**Full component re-skin.** The app's actual rendered colors today —
`--ion-color-earth/water/air/energy/spirit` (soft unrelated pastels),
`$home-color` (`#65afde`, a blue, used for the primary CTA gradient on 5
pages), and whatever's hardcoded inline across individual component
SCSS files — are untouched. Plan v4 requires this phase to be
"visually regression-tested" across public/authenticated/admin flows, which
I have no way to do (no browser/screenshot tool in this session). Swapping
colors blindly across a live, already-deployed app without being able to see
the result is exactly the kind of change that should wait for either a
session with visual verification or your own review pass.

**The five-element color scheme.** Decided: icon-based distinction, matching
the brand system (elements are told apart by linework — terrain contours,
waves, wind swirls, rays, concentric circles — not by a unique color each).
Not yet built: still need the actual SVG icon set matching the brand's
pattern (`Final Brand Assets/5-elements-pattern.png` is the exact reference)
and the section treatment for element pages. On the latter: recommended a
thin, bold outline (warm neutral or brand color at low opacity) as the
primary separator over a heavy shadow — the brand explicitly avoids
glossy/dimensional rendering, and its own answer to "how does a card lift
off the page" is the Warm White/Ivory tonal pairing already in the tokens,
not shadow. A soft, warm-tinted shadow (never generic grey) reserved for
hover/interactive states, not resting state, if some lift is still wanted.
Worth flagging: this is a real shift from the site's current glassmorphism
convention, not just a color swap — should be seen rendered before it
spreads past one page.

**Primary-CTA color** (`$home-color` → Marigold). The brand rule is clear
(Marigold = primary CTA, one per page, flat fill not gradient), but the
current button also needs a text-color change for contrast — white text on
Marigold fails accessibility, which this same phase is supposed to gate on.
Small in scope, but exactly the kind of thing I'd want to see rendered
before calling it done, not just calculate contrast ratios blind.

## Suggested next step

Once you're back with time to look at a running app (or in a session with
browser/screenshot access), the CTA color + one element page's re-skin would
be a good first visible test of the token foundation above, before deciding
whether to extend it site-wide.
