/**
 * STAGING ONLY end-to-end test for measurement (8.9.0): what the site
 * actually sends to Google Analytics (captured from the browser's own GA4
 * requests), the suggestion_click events saved for a signed-in member, and
 * Admin → Analytics. Sign-in as the staging non-admin and admin test
 * accounts; deletes the click events it creates. See tests/e2e/README.md.
 *
 *   npm run e2e:analytics
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');

const USER_EMAIL = requireEnv('WIOF_E2E_USER_EMAIL');
const USER_PASSWORD = requireEnv('WIOF_E2E_USER_PASSWORD');
const ADMIN_EMAIL = requireEnv('WIOF_E2E_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('WIOF_E2E_ADMIN_PASSWORD');

const functionsRequire = createRequire(path.resolve(__dirname, '../../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getAuth } = functionsRequire('firebase-admin/auth');
const { getFirestore } = functionsRequire('firebase-admin/firestore');
const key = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../scripts/service-account.json'), 'utf8'));
if (key.project_id !== 'wiof-staging') {
  console.error(`scripts/service-account.json is for ${key.project_id}, not wiof-staging. Refusing to run.`);
  process.exit(2);
}
initializeApp({ credential: cert(key), projectId: 'wiof-staging' });
const db = getFirestore();

// A story with Explore next suggestions on staging (Kalpasar -> Rainwater Harvesting).
const STORY = { path: '/element/water/blog/kalpasar-project-indias-moonshot-water-vision', title: 'Kalpasar Project: India’s Moonshot Water Vision' };
const SITE = 'World Is One Family';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

/** Every GA4 event the page sends: one per line of a batched request body, plus the URL's own. */
function captureGa(page) {
  const hits = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!/google-analytics\.com\/g\/collect/.test(url)) return;
    const shared = Object.fromEntries(new URL(url).searchParams);
    const lines = (req.postData() || '').split('\n').filter(Boolean);
    if (!lines.length) hits.push(shared);
    lines.forEach((line) => hits.push({ ...shared, ...Object.fromEntries(new URLSearchParams(line)) }));
  });
  return hits;
}
const events = (hits, name) => hits.filter((h) => h.en === name);

async function newPage(browser, errors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('wiof_onboarding_seen', 'true');
    localStorage.setItem('privacyConsentAccepted', 'true');
  });
  return page;
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('input[name=email]');
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const sel of ['input[name=email]', 'input[name=password]']) await page.$eval(sel, (el) => { el.value = ''; });
    await page.type('input[name=email]', email);
    await page.type('input[name=password]', password);
    await page.click('.login-submit-btn');
    if (await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 15000 }).then(() => true, () => false)) return;
  }
  throw new Error('sign-in failed');
}

/** Navigates inside the app (as a link click would), so it's a page change, not a reload. */
const navigate = (page, url) => page.evaluate((u) => {
  // Angular's router follows history changes: push, then notify, as a link click would.
  history.pushState({}, '', u);
  window.dispatchEvent(new PopStateEvent('popstate'));
}, url);

(async () => {
  const uid = (await getAuth().getUserByEmail(USER_EMAIL)).uid;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  try {
    // 1. A guest: titles, one page_view per page, page groups, no screen_view.
    const guest = await newPage(browser, errors);
    const hits = captureGa(guest);
    await guest.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(3000);
    check('the home page\'s browser title is the site name', (await guest.title()) === SITE, await guest.title());
    await navigate(guest, '/take-action');
    await sleep(4000);
    check('Take Action has its own title', (await guest.title()) === `Take Action · ${SITE}`, await guest.title());
    await navigate(guest, STORY.path);
    await guest.waitForFunction((t) => document.title.startsWith(t), { timeout: 20000 }, STORY.title).catch(() => {});
    await sleep(4000);
    check('a story\'s title is the story, its element and the site', (await guest.title()) === `${STORY.title} · Water · ${SITE}`, await guest.title());

    const views = events(hits, 'page_view');
    console.log(`      page_views: ${views.map((v) => `${v['ep.content_group'] || '?'} "${v.dt}"`).join(' | ')}`);
    check('exactly one page_view per page (no automatic duplicate on load)', views.length === 3, `${views.length} page_views`);
    check('each page_view carries its path, real title and page group', views[0]?.dt === SITE && views[0]?.['ep.content_group'] === 'home'
      && views[1]?.dt === `Take Action · ${SITE}` && views[1]?.['ep.content_group'] === 'take_action'
      && views[2]?.dt === `${STORY.title} · Water · ${SITE}` && views[2]?.['ep.content_group'] === 'story' && views[2]?.['ep.element'] === 'water'
      && /\/element\/water\/blog\//.test(views[2]?.dl || ''));
    check('no app-style screen_view events', events(hits, 'screen_view').length === 0);
    check('a guest is marked user_type guest', hits.some((h) => h['up.user_type'] === 'guest'));

    // A click on an Explore next suggestion: select_content with where it was shown.
    await guest.waitForSelector('app-explore-next .explore-next a', { timeout: 30000 }).catch(() => {});
    await guest.evaluate(() => document.querySelector('app-explore-next .explore-next li [href]')?.click());
    // GA batches events: the click goes out with the next request, a few seconds later.
    for (let i = 0; i < 15 && !events(hits, 'select_content').length; i++) await sleep(1000);
    const select = events(hits, 'select_content');
    check('a suggestion click is sent as select_content, via explore_next', select.some((s) => s['ep.via'] === 'explore_next' && s['ep.content_type'] && s['ep.content_id']),
      JSON.stringify(select.map((s) => [s['ep.via'], s['ep.content_type'], s['ep.content_id'], s['epn.position']])));

    // 2. A member: the click is also saved, once a day per suggestion and place.
    const member = await newPage(browser, errors);
    const memberHits = captureGa(member);
    await signIn(member, USER_EMAIL, USER_PASSWORD);
    await member.goto(`${BASE}${STORY.path}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await member.waitForSelector('app-explore-next .explore-next li [href]', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const clicked = await member.evaluate(() => {
      const a = document.querySelector('app-explore-next .explore-next li [href]');
      const href = a?.getAttribute('href');
      a?.click();
      return href;
    });
    await sleep(4000);
    check('a member is marked user_type member', memberHits.some((h) => h['up.user_type'] === 'member'));
    const contentId = (clicked || '').split('?')[0].split('/').pop();
    const saved = await db.collection('activity_log').where('userId', '==', uid).where('activityType', '==', 'suggestion_click').get();
    const mine = saved.docs.filter((d) => d.get('contentId') === contentId && d.get('via') === 'explore_next');
    check('the member\'s click is saved as a suggestion_click event', mine.length === 1, `${clicked} -> ${mine.map((d) => d.id).join(', ')}`);
    let verdict = null;
    for (let i = 0; i < 10 && !verdict && mine[0]; i++) { await sleep(2000); verdict = (await mine[0].ref.get()).get('validation')?.status || null; }
    check('the server accepted the click', verdict === 'accepted', verdict || 'no verdict');

    // 3. Admin → Analytics: refresh, then the sections show today's numbers.
    const admin = await newPage(browser, errors);
    await signIn(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
    await admin.goto(`${BASE}/admin-dashboard/analytics`, { waitUntil: 'networkidle2', timeout: 90000 });
    await admin.waitForSelector('.admin-page-header .btn-secondary', { timeout: 30000 });
    await admin.click('.admin-page-header .btn-secondary');
    await admin.waitForFunction(() => !document.querySelector('.admin-page-header .btn-secondary')?.disabled, { timeout: 120000 });
    await sleep(3000);
    const page = await admin.evaluate(() => ({
      error: document.querySelector('.notice.error')?.textContent.trim() || null,
      sections: [...document.querySelectorAll('.card-title, .section-title')].map((h) => h.textContent.trim()),
      tiles: [...document.querySelectorAll('.summary-card')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
      explore: [...document.querySelectorAll('#suggestions-title ~ table tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ').trim())[0],
      charts: document.querySelectorAll('canvas').length
    }));
    check('Refresh rebuilt the summaries without an error', !page.error, page.error || '');
    check('the page shows the totals, members chart, suggestions, elements, first steps and top content',
      ['Members per day', 'Suggestions: clicks and what they led to', 'By element', 'Most-read stories', 'Most-done actions'].every((t) => page.sections.some((s) => s.startsWith(t))) && page.charts >= 1,
      page.sections.join(' | '));
    check('today\'s Explore next click is counted', /Explore next/.test(page.explore || '') && !/^Explore next \(stories and videos\) 0 /.test(page.explore || ''), page.explore);
    console.log(`      tiles: ${page.tiles.join(' | ')}`);
    await admin.screenshot({ path: path.join(OUT, 'analytics-admin.png'), fullPage: true });

    const relevant = errors.filter((e) => !/favicon|ERR_BLOCKED|youtube|ytimg|doubleclick|googleads/i.test(e));
    check('no page errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  } finally {
    const clicks = await db.collection('activity_log').where('userId', '==', uid).where('activityType', '==', 'suggestion_click').get();
    await Promise.all(clicks.docs.map((d) => d.ref.delete()));
    console.log(`      removed ${clicks.size} test click event(s)`);
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
