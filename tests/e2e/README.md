# Browser end-to-end tests (staging only)

These drive the real staging site (`https://wiof-staging.web.app`) in Chrome. The base URL is fixed in `e2e-config.js`, so they can't be pointed at prod.

| Command | What it checks | Writes data? |
|---|---|---|
| `npm run e2e:smoke` | Public pages on a phone and a desktop viewport: no console errors, no sideways scroll, key content present. | No |
| `npm run e2e:journey` | The welcome after sign-in (desktop and phone), the saved profile, "Your first steps" on home and My Journey, Hide and Skip. | Yes, the non-admin test user's elements and welcome state, restored at the end |
| `npm run e2e:explore` | Explore next: the admin Related Content picker, Explore next on a blog, a video and the calendar popup, similar content on an unlinked story, and "The story behind this" in an action's details. | Yes, a few staging links, restored at the end |

## Setup

1. Chrome installed (set `CHROME_PATH` if it isn't at the default Windows path).
2. `npm i --no-save puppeteer-core` (not a project dependency), or set `PUPPETEER_CORE_PATH`.
3. For `e2e:explore`, the staging **admin test account** in the environment. Never commit these:

   ```powershell
   $env:WIOF_E2E_ADMIN_EMAIL = "<staging admin test email>"
   $env:WIOF_E2E_ADMIN_PASSWORD = "<its password>"
   ```

   For `e2e:journey`, the staging **non-admin test account** (`WIOF_E2E_USER_EMAIL`, `WIOF_E2E_USER_PASSWORD`) and the staging service account key at `scripts/service-account.json` (git-ignored; the test refuses any other project).

Screenshots go to `tests/e2e/output/` (git-ignored; override with `E2E_OUT`).

## Fixtures

`e2e:explore` uses these staging items: the story "How about a Vegetable garden!", the Veganism story, the actions "Care for a Tree or Plant" and "Carry a Reusable Bag", and one calendar occasion in the home agenda this week that has no links yet (picked at run time; the calendar check is skipped if there's none). It expects them to have no Related Content links before it runs, and removes the ones it adds.

Run it after deploying to staging, before opening the PR.
