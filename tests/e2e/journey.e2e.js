/**
 * STAGING ONLY end-to-end test for the journey experience (Phase 2 step 5,
 * 8.5.0): the welcome after sign-in, the first-steps checklist, and the
 * My Journey story. Uses the staging non-admin test account; resets its
 * welcome state first (Admin SDK, staging key only) and restores it at the
 * end. See tests/e2e/README.md.
 *
 *   npm run e2e:journey
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');

const USER_EMAIL = requireEnv('WIOF_E2E_USER_EMAIL');
const USER_PASSWORD = requireEnv('WIOF_E2E_USER_PASSWORD');

// firebase-admin is installed for the functions, not at the repo root.
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
  // Note: the guest welcome is NOT pre-dismissed, to check it stays away for signed-in users.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('privacyConsentAccepted', 'true');
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

(async () => {
  const uid = (await getAuth().getUserByEmail(USER_EMAIL)).uid;
  const ref = db.collection('users').doc(uid);
  const original = (await ref.get()).data() || {};
  const restore = {
    preferredElements: original.preferredElements || [],
    onboarding: original.onboarding || FieldValue.delete()
  };
  await ref.update({ preferredElements: [], onboarding: FieldValue.delete() });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  try {
    const page = await newPage(browser, { width: 1280, height: 900 }, errors);
    await signIn(page);
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('.welcome-dialog', { timeout: 30000 }).catch(() => {});
    await sleep(1200);
    const first = await page.evaluate(() => ({
      welcome: document.querySelector('.welcome-dialog')?.innerText.replace(/\s+/g, ' ').trim(),
      guestOverlay: !!document.querySelector('.onboarding-overlay'),
      choices: [...document.querySelectorAll('.element-choice')].map((b) => b.textContent.trim())
    }));
    check('signed-in welcome opens on home, step 1: the five elements', /step 1 of 2/i.test(first.welcome || '') && first.choices.join(',') === 'Air,Energy,Water,Earth,Spirit', first.welcome?.slice(0, 80));
    check('the guest welcome does not stack on top for a signed-in user', !first.guestOverlay);
    await page.screenshot({ path: path.join(OUT, 'journey-welcome-1.png') });

    const choose = (name) => page.evaluate((n) => [...document.querySelectorAll('.element-choice')].find((b) => b.textContent.trim() === n).click(), name);
    await choose('Earth');
    await choose('Water');
    const pressed = await page.$$eval('.element-choice[aria-pressed="true"]', (b) => b.map((x) => x.textContent.trim()));
    check('choosing elements toggles them (aria-pressed)', pressed.join(',') === 'Water,Earth', pressed.join(','));
    await page.click('.primary-cta');
    await sleep(500);
    const starts = await page.$$eval('.start-choice', (b) => b.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    check('step 2 offers a story, an action and the EQ check for the first chosen element (site order: Water)',
      starts.length === 3 && /A story about Water/.test(starts[0]) && /One small action/.test(starts[1]) && /Check your EQ/.test(starts[2]), starts.join(' | '));
    await page.screenshot({ path: path.join(OUT, 'journey-welcome-2.png') });
    await page.evaluate(() => document.querySelectorAll('.start-choice')[1].click());
    await page.waitForFunction(() => location.pathname === '/element/water/take-action', { timeout: 15000 }).catch(() => {});
    check('choosing "One small action" goes to Water\'s actions', (await page.evaluate(() => location.pathname)) === '/element/water/take-action', await page.evaluate(() => location.pathname));

    let saved = {};
    for (let i = 0; i < 10 && !saved.onboarding; i++) { await sleep(500); saved = (await ref.get()).data(); }
    check('the profile saved the elements and when the welcome was done (server time)',
      JSON.stringify(saved.preferredElements) === '["water","earth"]' && !!saved.onboarding?.welcomeDoneAt?.toDate,
      `${JSON.stringify(saved.preferredElements)} ${saved.onboarding?.welcomeDoneAt?.toDate?.().toISOString()}`);

    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('app-home-journey-panel .first-steps', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const home = await page.evaluate(() => ({
      welcome: !!document.querySelector('.welcome-dialog'),
      steps: [...document.querySelectorAll('app-home-journey-panel .first-steps li')].map((li) => `${li.classList.contains('done') ? 'x' : ' '} ${li.querySelector('.step-title').textContent.trim()}`),
      count: document.querySelector('app-home-journey-panel .first-steps-count')?.textContent.trim()
    }));
    check('the welcome does not come back', !home.welcome);
    check('home shows "Your first steps" with "Choose your elements" ticked', home.steps.length === 5 && home.steps[0] === 'x Choose your elements', `${home.count}: ${home.steps.join(' / ')}`);
    await page.evaluate(() => document.querySelector('app-home-journey-panel').scrollIntoView({ block: 'start' }));
    await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'journey-home.png') });

    await page.goto(`${BASE}/my-journey`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('.journey-story', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const journey = await page.evaluate(() => ({
      story: document.querySelector('.journey-story-text')?.textContent.trim(),
      chips: [...document.querySelectorAll('.journey-element')].map((c) => `${c.classList.contains('explored') ? '+' : '-'}${c.textContent.replace(/\(.*\)/, '').trim()}`),
      steps: document.querySelectorAll('app-my-journey .first-steps li, .my-journey-page .first-steps li').length
    }));
    check('My Journey tells the story and shows the five elements', !!journey.story && journey.chips.length === 5, `${journey.story} [${journey.chips.join(' ')}]`);
    check('My Journey shows the first steps too', journey.steps === 5);
    await page.screenshot({ path: path.join(OUT, 'journey-my-journey.png') });

    await page.click('.my-journey-page .first-steps-hide');
    let dismissed = {};
    for (let i = 0; i < 10 && !dismissed.onboarding?.checklistDismissedAt; i++) { await sleep(500); dismissed = (await ref.get()).data(); }
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);
    check('Hide removes the checklist for good (saved on the profile, gone after reload)',
      !!dismissed.onboarding?.checklistDismissedAt && !(await page.$('.my-journey-page .first-steps')));

    // Phone: the welcome is a bottom sheet.
    await ref.update({ preferredElements: [], onboarding: FieldValue.delete() });
    const phone = await newPage(browser, { width: 390, height: 844, isMobile: true }, errors);
    await signIn(phone);
    await phone.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await phone.waitForSelector('.welcome-dialog', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const sheet = await phone.evaluate(() => {
      const d = document.querySelector('.welcome-dialog');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { bottom: Math.round(innerHeight - r.bottom), width: Math.round(r.width), hScroll: document.documentElement.scrollWidth > innerWidth };
    });
    check('on a phone the welcome is a full-width bottom sheet, no sideways scroll', sheet && sheet.bottom === 0 && sheet.width === 390 && !sheet.hScroll, JSON.stringify(sheet));
    await phone.screenshot({ path: path.join(OUT, 'journey-welcome-phone.png') });
    await phone.click('.secondary-link');
    let skipped = {};
    for (let i = 0; i < 10 && !skipped.onboarding; i++) { await sleep(500); skipped = (await ref.get()).data(); }
    check('"Skip for now" saves no elements but marks the welcome done', (skipped.preferredElements || []).length === 0 && !!skipped.onboarding?.welcomeDoneAt);

    const relevant = errors.filter((e) => !/favicon|ERR_BLOCKED|youtube|ytimg|doubleclick|googleads|Failed to load resource/i.test(e));
    check('no console errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  } finally {
    await ref.update(restore);
    check('restored the test user\'s elements and welcome state', true);
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
