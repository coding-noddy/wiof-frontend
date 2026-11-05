/**
 * STAGING ONLY end-to-end test for "Next for you" (Phase 2 step 7): the
 * rule-based picks in the home journey panel for the staging non-admin
 * test account. Sets its elements and one started action (Admin SDK,
 * staging key only) and restores both at the end.
 *
 * "Because you read …" needs a story read to the end, so on the first run
 * the test user really reads one short Water story (about a minute in the
 * browser, through the normal quality-read checks). That read is kept:
 * reads count once for life, so later runs reuse it.
 * See tests/e2e/README.md.
 *
 *   npm run e2e:next
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');

const USER_EMAIL = requireEnv('WIOF_E2E_USER_EMAIL');
const USER_PASSWORD = requireEnv('WIOF_E2E_USER_PASSWORD');

const functionsRequire = createRequire(path.resolve(__dirname, '../../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getAuth } = functionsRequire('firebase-admin/auth');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');

const keyPath = path.resolve(__dirname, '../../scripts/service-account.json');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
if (key.project_id !== 'wiof-staging') {
  console.error(`scripts/service-account.json is for ${key.project_id}, not wiof-staging. Refusing to run.`);
  process.exit(2);
}
initializeApp({ credential: cert(key), projectId: 'wiof-staging' });
const db = getFirestore();

// A short Water story (about 300 words) whose similar stories are mostly Water.
const READ = { id: '1S5DTeDLg7xpMwYViI9X', slug: 'kalpasar-project-indias-moonshot-water-vision', title: 'Kalpasar Project' };
// A Water action to mark as started (only if the user has no record of it).
const STARTED = { id: 'fix-a-water-leak', title: 'Fix a Water Leak' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

async function newPage(browser, viewport, errors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('privacyConsentAccepted', 'true');
    localStorage.setItem('wiof_analytics_consent', 'denied');
    localStorage.setItem('wiof_today_hidden', new Date().toISOString().slice(0, 10));
  });
  return page;
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('input[name=email]');
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const sel of ['input[name=email]', 'input[name=password]']) await page.$eval(sel, (el) => { el.value = ''; });
    await page.type('input[name=email]', USER_EMAIL);
    await page.type('input[name=password]', USER_PASSWORD);
    await page.click('.login-submit-btn');
    if (await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 15000 }).then(() => true, () => false)) return;
  }
  throw new Error('sign-in failed');
}

const acceptedRead = async (uid) => {
  const snap = await db.collection('activity_log').where('userId', '==', uid).where('activityType', '==', 'blog_read_complete').get();
  return snap.docs.map((d) => d.data()).find((d) => [READ.id, READ.slug].includes(d.contentId) && d.validation?.status === 'accepted');
};

/** Read the story to the end the way a person would: scroll through it, then stay. */
async function readStory(page, uid) {
  await page.goto(`${BASE}/element/water/blog/${READ.slug}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000);
  for (let i = 0; i < 12; i++) {
    await page.evaluate(async () => {
      const el = await document.querySelector('ion-content.blog-content, app-blog-post ion-content, ion-content')?.getScrollElement?.();
      (el || document.scrollingElement).scrollBy(0, 400);
    });
    await sleep(1500);
  }
  await page.evaluate(async () => {
    const el = await document.querySelector('ion-content')?.getScrollElement?.();
    (el || document.scrollingElement).scrollTo(0, 1e6);
  });
  for (let i = 0; i < 30; i++) {
    if (await acceptedRead(uid)) return true;
    await sleep(3000);
  }
  return false;
}

const readPicks = (page) => page.evaluate(() => {
  const s = document.querySelector('app-next-for-you .next');
  if (!s) return null;
  return {
    basis: s.querySelector('.next-basis')?.textContent.replace(/\s+/g, ' ').trim(),
    cards: [...s.querySelectorAll('.next-card')].map((a) => ({
      kind: a.dataset.kind,
      why: a.querySelector('.next-why').textContent.trim(),
      title: a.querySelector('.next-card-title').textContent.trim(),
      href: a.getAttribute('href')
    })),
    actionTile: [...document.querySelectorAll('app-home-journey-panel .journey-card')].find((c) => /action/i.test(c.textContent))?.querySelector('.card-meta')?.textContent.trim()
  };
});

/**
 * 8.11.0: home shows one quiet line ("N ideas picked for you"); the picks
 * open in a modal. Returns the picks, plus whether the home page itself
 * showed them inline (it shouldn't).
 */
async function home(page) {
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => [...document.querySelectorAll('app-home-journey-panel .glance-line')].some((b) => /picked for you/.test(b.textContent)), { timeout: 30000 }).catch(() => {});
  const inline = await page.evaluate(() => !!document.querySelector('app-home-journey-panel > * > app-next-for-you, app-home-journey-panel .journey-panel > app-next-for-you'));
  const line = await page.evaluate(() => [...document.querySelectorAll('app-home-journey-panel .glance-line')].find((b) => /picked for you/.test(b.textContent))?.textContent.replace(/\s+/g, ' ').trim() || null);
  await page.evaluate(() => [...document.querySelectorAll('app-home-journey-panel .glance-line')].find((b) => /picked for you/.test(b.textContent))?.click());
  await page.waitForSelector('ion-modal app-next-for-you .next-card', { timeout: 30000 }).catch(() => {});
  await sleep(1200);
  const picks = await readPicks(page);
  return picks && { ...picks, inline, line };
}

(async () => {
  const uid = (await getAuth().getUserByEmail(USER_EMAIL)).uid;
  const userRef = db.collection('users').doc(uid);
  const original = (await userRef.get()).data() || {};
  const startedRef = db.collection('user_actions').doc(`${uid}_${STARTED.id}`);
  const createdStarted = !(await startedRef.get()).exists;
  if (createdStarted) {
    const now = FieldValue.serverTimestamp();
    await startedRef.set({
      userId: uid, actionId: STARTED.id, status: 'IN_PROGRESS', startedAt: now, completedAt: null, completionCount: 0,
      lastCompletedAt: null, completionMethod: 'SELF_REPORTED', elementIdsSnapshot: ['water'], actionVersion: 1, createdAt: now, updatedAt: now
    });
  }
  const done = (await db.collection('user_actions').where('userId', '==', uid).where('status', '==', 'COMPLETE').get()).docs.map((d) => d.data().actionId);
  await userRef.update({ preferredElements: ['water', 'earth'] });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  try {
    const page = await newPage(browser, { width: 1280, height: 900 }, errors);
    await signIn(page);
    if (!(await acceptedRead(uid))) {
      console.log('      first run: reading the story to the end (about a minute)…');
      check('the test user read a story to the end (accepted by the server)', await readStory(page, uid));
    }

    // 1. Chosen elements: Water and Earth.
    let picks = await home(page);
    const doneTitles = (await Promise.all(done.map((id) => db.doc(`actions/${id}`).get()))).map((d) => d.data()?.title).filter(Boolean);
    console.log(`      ${(picks?.cards || []).map((c) => `[${c.why}] ${c.title}`).join(' | ')}`);
    check('home shows one line ("ideas picked for you"), not the picks themselves', !!picks?.line && !picks.inline, picks?.line);
    check('the line opens "Next for you" in a modal, from the chosen elements', picks?.basis === 'From your elements: Water and Earth · Change', picks?.basis);
    check('up to four picks, stories first', !!picks && picks.cards.length > 0 && picks.cards.length <= 4
      && picks.cards.findIndex((c) => c.kind === 'action') >= picks.cards.filter((c) => c.kind !== 'action').length, picks?.cards.map((c) => c.kind).join(','));
    check('a story similar to the one read, with the reason', picks?.cards.some((c) => c.kind === 'blog' && c.why.startsWith('Because you read “Kalpasar')), picks?.cards.map((c) => c.why).join(' | '));
    check('never the story already read', !picks?.cards.some((c) => (c.href || '').includes(READ.slug)));
    check('the started action comes first among actions: "You started this"', picks?.cards.find((c) => c.kind === 'action')?.why === 'You started this'
      && picks.cards.find((c) => c.kind === 'action').title === STARTED.title, JSON.stringify(picks?.cards.find((c) => c.kind === 'action')));
    check('never a completed action', !picks?.cards.some((c) => doneTitles.includes(c.title)), doneTitles.join(', '));
    check('every pick is under Water or Earth', !!picks?.cards.every((c) => /^\/element\/(water|earth)\//.test(c.href || '')), picks?.cards.map((c) => c.href).join(' '));
    check('the actions tile no longer suggests its own "Next:" action', picks?.actionTile === 'Explore what you can do today', picks?.actionTile);
    await page.screenshot({ path: path.join(OUT, 'next-for-you-desktop.png') });
    const grid = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('ion-modal app-next-for-you .next-card')].map((c) => c.getBoundingClientRect());
      return { cols: new Set(cards.map((r) => Math.round(r.left))).size, n: cards.length };
    });
    check('on a desktop the modal shows the picks two by two', grid.n < 2 || grid.cols === 2, JSON.stringify(grid));

    // 2. An action pick opens its details.
    await page.evaluate(() => document.querySelector('ion-modal app-next-for-you .next-card[data-kind="action"]').click());
    await page.waitForSelector('ion-modal app-take-action-detail', { timeout: 20000 }).catch(() => {});
    await sleep(1200);
    const modal = await page.evaluate(() => document.querySelector('ion-modal .detail-title')?.textContent.trim());
    check('an action pick opens that action\'s details', modal === STARTED.title, modal);

    // 2b. My Journey shows them too, after the summary tiles.
    await page.goto(`${BASE}/my-journey`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('app-next-for-you .next-card', { timeout: 30000 }).catch(() => {});
    const order = await page.evaluate(() => {
      const tiles = document.querySelector('.metrics-section');
      const next = document.querySelector('app-next-for-you .next');
      return { tiles: !!tiles, next: !!next, after: !!(tiles && next && (tiles.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)) };
    });
    check('My Journey shows "Next for you" after the summary tiles', order.after, JSON.stringify(order));

    // 3. No chosen elements: the ones explored (from the completed actions).
    await userRef.update({ preferredElements: [] });
    picks = await home(page);
    check('without chosen elements it uses the explored ones', /^From what you've explored: .+ · Change$/.test(picks?.basis || ''), picks?.basis);

    // 4. Phone.
    await userRef.update({ preferredElements: ['water', 'earth'] });
    const phone = await newPage(browser, { width: 390, height: 844, isMobile: true }, errors);
    await signIn(phone);
    await home(phone);
    await sleep(800);
    const fit = await phone.evaluate(() => {
      const el = document.querySelector('ion-modal app-next-for-you .next');
      const cards = [...document.querySelectorAll('ion-modal app-next-for-you .next-card')].map((c) => Math.round(c.getBoundingClientRect().width));
      return el && { width: Math.round(el.getBoundingClientRect().width), cards, hScroll: document.documentElement.scrollWidth > innerWidth };
    });
    check('on a phone the picks stack in one column, no sideways scroll', !!fit && fit.width <= 390 && !fit.hScroll && new Set(fit.cards).size === 1, JSON.stringify(fit));
    await phone.screenshot({ path: path.join(OUT, 'next-for-you-phone.png') });

    const relevant = errors.filter((e) => !/favicon|ERR_BLOCKED|youtube|ytimg|doubleclick|googleads|Failed to load resource/i.test(e));
    check('no console errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  } finally {
    await userRef.update({ preferredElements: original.preferredElements || [] });
    if (createdStarted) await startedRef.delete();
    check('restored the test user\'s elements and removed the started action', true);
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
