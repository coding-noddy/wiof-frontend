# Analytics: what WIOF measures, and how to connect Google Analytics

WIOF has two sources of numbers. They answer different questions.

| | Google Analytics (GA4) | Our own (Admin → Analytics) |
|---|---|---|
| **Who** | every visitor, signed in or not | signed-in members, with team (admin) accounts left out |
| **What** | traffic: visitors, page views, which pages, where they came from, devices | what members *do*: read stories to the end, watch videos, do actions, check EQ, use suggestions, first steps |
| **How trustworthy** | sampled and estimated by Google; blocked by some ad blockers | exact, from our checked events (docs/METRICS.md) |
| **Where** | Google Analytics, plus traffic shown inside Admin → Analytics once connected | Admin → Analytics |

## Consent (GDPR)

Google Analytics is **opt-in**. A banner asks on the first visit, on any page. Accept and Decline are the same size. The choice is kept on the device (`wiof_analytics_consent` in localStorage) and can be changed with **Cookie settings** in the footer. Until the visitor accepts, collection is switched off and nothing is sent to Google: `util/analytics-init.ts` uses `setAnalyticsCollectionEnabled(false)` and Google Consent Mode `analytics_storage: denied`. The ad signals are always denied. So GA counts only visitors who accepted. Our own numbers (members, Admin → Analytics) don't depend on the banner: they come from our own checked events.

## What the site sends to Google Analytics (since 8.9.0)

**One `page_view` per page**, sent by `PageTrackingService`. It carries:
- **`page_title`**: the page's real title, e.g. "Rainwater Harvesting & it's Benefits · Water · World Is One Family". Story and video pages wait (up to 2.5 s) for their own title.
- **`page_path`** and **`page_location`**: the address, without the query string.
- **`content_group`**: the kind of page. One of `home`, `element`, `stories`, `story`, `videos`, `video`, `take_action`, `my_journey`, `my_library`, `my_feedback`, `settings`, `about`, `legal`, `login`, `admin`, `not_found`.
- **`element`**: air, water, earth, energy or spirit, where the page belongs to one.

**`select_content`** (GA's recommended event) when someone clicks a suggestion. Parameters:
- `via`: `explore_next`, `story_behind`, `today` or `next_for_you`;
- `content_type`: `blog`, `video` or `action`;
- `content_id`;
- `position` in the list;
- `reason`.

**User property `user_type`**: `guest`, `member` or `admin`, so reports can leave out the team's own visits. Signed-in users also get GA's user ID (their account ID, not their email), so one person on two devices counts once.

**The existing events are unchanged:** `sign_up`, `login`, `content_opened`, `content_completed`, `eq_completed`, `poll_voted`, `daily_visit`, `bookmark_added` and `bookmark_removed`.

Before 8.9.0 every page had the title "World Is One Family", so GA's Pages report showed a single row.

## One-time setup in Google Analytics (per property: staging and prod)

GA Admin is the cog at the bottom left of analytics.google.com. Do the following for each property.

1. **Turn off automatic page views from browser history.** The site now sends its own, and leaving this on would count each page twice.
   - Go to Admin → Data streams → (the web stream) → Enhanced measurement → ⚙.
   - Untick **"Page changes based on browser history events"**.
   - Leave the other enhanced measurements on: scrolls, outbound clicks, site search and video engagement.
2. **Register the custom dimensions** so reports can use them. Go to Admin → Custom definitions → Create custom dimension:

   | Dimension name | Scope | Event parameter / user property |
   |---|---|---|
   | Element | Event | `element` |
   | Suggestion shown in | Event | `via` |
   | Suggestion reason | Event | `reason` |
   | Position | Event | `position` (or make it a custom metric) |
   | User type | User | `user_type` |

   `content_group` needs no setup: it's a built-in GA4 dimension called **Content group**.
3. **Set the time zone to India.** Go to Admin → Property details → Reporting time zone → (GMT+05:30) India. Our daily summaries use India time, so GA's days then match.
4. **Leave the team out of reports.** Either create a comparison or audience with "User type ≠ admin", or set Admin → Data filters → Internal traffic, using your office IP.
5. **Connect GA to Admin → Analytics.** This lets the admin page show visitors, page views and top pages.
   - Go to Admin → Property details and copy the **Property ID** (a number, e.g. `512345678`).
   - Go to Admin → Property access management → **+** → Add users. Add the functions' service account as **Viewer**:
     - staging: `wiof-staging@appspot.gserviceaccount.com`
     - prod: `wiof-production@appspot.gserviceaccount.com`
   - Enable the **Google Analytics Data API** for the Firebase project: Google Cloud Console → APIs & Services → Enable APIs → "Google Analytics Data API". Do this for staging and prod separately.
   - Put the ID in `functions/.env.wiof-staging` / `functions/.env.wiof-production` as `GA4_PROPERTY_ID=512345678`. The ID isn't secret. Send me the two IDs and I'll add them.
   - Deploy the backend, then press **Refresh** on Admin → Analytics.

GA's own **Realtime** and **DebugView** reports show events as they arrive. That's the quickest way to see page views with their titles after the deploy.

## Admin → Analytics (our own numbers)

The page reads one small summary per day (`analytics_daily/{YYYY-MM-DD}`), built by `functions/daily-stats.js`:
- **When it's built:** every 3 hours for today and yesterday (the `buildDailyStats` schedule), and when an admin presses **Refresh**.
- **Past days:** `node scripts/daily-stats.js --project <staging|prod> --days 90` (dry run, then `--apply`).
- **Which days and events count:** days are India time, by each event's server time. Rejected events and admin accounts never count.

| Section | Meaning |
|---|---|
| Active members per day | members who did anything while signed in that day |
| Engaged members | members who read, watched, voted, checked EQ, used a tool, clicked a suggestion or did an action |
| Stories read to the end, videos watched, actions completed, EQ checks | checked events (docs/METRICS.md), summed over the range |
| Suggestions | clicks per place a suggestion is shown, and how many the same member finished (read, watch, action) that day |
| By element | stories read to the end (by the story's element) and actions done (by the action's elements) |
| First steps | where all members are now: chose elements, read, watched, EQ, first action, all five |
| Most-read stories, most-done actions | across the range |
| Visitors, page views, top pages, views by kind of page | from Google Analytics, once connected |
