# Blog Sharing — Architecture & Flow

## Overview

When a user shares a blog link on social media (WhatsApp, Twitter, LinkedIn, etc.), the platform's crawler fetches the URL to generate a rich link preview (image + title + description). Since WIOF is an Angular SPA, all pages serve the same `index.html` — meaning crawlers would always see the default WIOF image.

**Solution:** A Firebase Cloud Function intercepts crawler requests and serves dynamic Open Graph meta tags with the blog's actual image, title, and description.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER SHARES BLOG LINK                         │
│         https://wiof.web.app/element/air/blog/my-blog-slug          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Firebase Hosting (CDN)                            │
│                                                                      │
│  firebase.json rewrite rule:                                         │
│  /element/*/blog/** → Cloud Function "socialMetaTags"                │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Cloud Function: socialMetaTags                      │
│                                                                      │
│  1. Check User-Agent header                                          │
│     ┌──────────────────────┐    ┌───────────────────────────┐       │
│     │ Is it a crawler?     │    │ Known crawlers:           │       │
│     │ (WhatsApp, Twitter,  │────│ - facebookexternalhit     │       │
│     │  LinkedIn, etc.)     │    │ - Twitterbot              │       │
│     └──────────┬───────────┘    │ - WhatsApp                │       │
│                │                 │ - LinkedInBot             │       │
│       YES      │      NO        │ - Slackbot, Discordbot   │       │
│                │                 └───────────────────────────┘       │
│                ▼                                                      │
│     ┌─── CRAWLER PATH ───┐      ┌─── REAL USER PATH ───┐           │
│     │                     │      │                       │           │
│     │  2. Extract slug    │      │  Redirect to SPA     │           │
│     │     from URL        │      │  (normal Angular)    │           │
│     │                     │      │                       │           │
│     │  3. Query Firestore │      └───────────────────────┘           │
│     │     by slug         │                                          │
│     │                     │                                          │
│     │  4. Get image URL   │                                          │
│     │     from Storage    │                                          │
│     │                     │                                          │
│     │  5. Return HTML     │                                          │
│     │     with OG tags    │                                          │
│     └─────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CRAWLER RECEIVES HTML:                              │
│                                                                      │
│  <meta property="og:title" content="How to Reduce Carbon..." />     │
│  <meta property="og:description" content="In this blog..." />       │
│  <meta property="og:image" content="https://storage.../image.jpg"/> │
│  <meta property="og:url" content="https://wiof.web.app/..." />     │
│                                                                      │
│  → Generates RICH LINK PREVIEW with blog image + title              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
wiof-frontend/
├── functions/
│   ├── index.js          ← Cloud Function logic
│   └── package.json      ← Function dependencies
├── firebase.json         ← Hosting rewrite rules
└── src/
    └── app/
        ├── components/blog-card/   ← Share button on card
        └── pages/blog-post/        ← Share button on detail page
```

---

## Sequence: User Shares on WhatsApp

```
User                WhatsApp            Firebase CDN         Cloud Function        Firestore         Storage
 │                      │                    │                     │                  │                │
 │──── Shares link ────▶│                    │                     │                  │                │
 │                      │                    │                     │                  │                │
 │                      │─── GET /blog/slug─▶│                     │                  │                │
 │                      │                    │──── Route to fn ───▶│                  │                │
 │                      │                    │                     │                  │                │
 │                      │                    │                     │─── Get blog ────▶│                │
 │                      │                    │                     │◀── Blog data ────│                │
 │                      │                    │                     │                  │                │
 │                      │                    │                     │─── Get image URL─────────────────▶│
 │                      │                    │                     │◀── Signed URL ───────────────────│
 │                      │                    │                     │                  │                │
 │                      │                    │◀── HTML + OG tags ──│                  │                │
 │                      │◀── Rich preview ───│                     │                  │                │
 │                      │                    │                     │                  │                │
 │◀── Shows preview ────│                    │                     │                  │                │
 │    (Blog image +     │                    │                     │                  │                │
 │     title + desc)    │                    │                     │                  │                │
```

---

## Sequence: Real User Clicks Shared Link

```
User                Browser             Firebase CDN         Cloud Function         Angular SPA
 │                      │                    │                     │                     │
 │──── Clicks link ────▶│                    │                     │                     │
 │                      │─── GET /blog/slug─▶│                     │                     │
 │                      │                    │──── Route to fn ───▶│                     │
 │                      │                    │                     │                     │
 │                      │                    │                     │── Not a crawler     │
 │                      │                    │                     │   → Redirect 302 ──▶│
 │                      │                    │                     │                     │
 │                      │◀───────────────────│◀────────────────────│                     │
 │                      │                    │                     │                     │
 │                      │─── GET /blog/slug─▶│ (serves index.html) │                     │
 │                      │◀── index.html ─────│                     │                     │
 │                      │                    │                     │                     │
 │◀── Angular app ──────│ (renders blog post page normally)        │                     │
```

---

## Deployment

```bash
# Install function dependencies
cd functions && npm install && cd ..

# Deploy function
firebase deploy --only functions --project wiof-staging

# Deploy hosting (includes rewrite rules)
npm run deploy:staging:quick

# Or deploy everything at once
firebase deploy --project wiof-staging
```

---

## Key Files

| File | Purpose |
|------|---------|
| `functions/index.js` | Cloud Function — serves OG meta tags to crawlers |
| `firebase.json` | Rewrite rule routing blog URLs to the function |
| `src/app/components/blog-card/` | Share button on blog cards (Web Share API) |
| `src/app/pages/blog-post/` | Share button on blog detail page |
| `src/app/models/Blog.ts` | Blog model with `slug` field + `generateSlug()` |
| `src/app/services/blog.service.ts` | `getBlogBySlug()` for slug-based lookups |
| `scripts/migrate-blog-slugs.js` | One-time migration to add slugs to existing blogs |

---

## Supported Platforms

The function detects these crawler user agents:
- Facebook / Messenger (`facebookexternalhit`, `Facebot`)
- Twitter / X (`Twitterbot`)
- WhatsApp
- LinkedIn (`LinkedInBot`)
- Slack (`Slackbot`)
- Discord (`Discordbot`)
- Telegram (`TelegramBot`)
- Google (`Googlebot`) — improves SEO
- Bing (`bingbot`)
- Apple (`Applebot`) — iMessage link previews
