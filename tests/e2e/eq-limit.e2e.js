/**
 * STAGING ONLY end-to-end test for the EQ daily limit (8.8.0): a signed-in
 * user's first two EQ checks of the day are saved, the third is scored and
 * shown but not saved, and the result screen says so. A guest's check is
 * never saved. Clears the staging non-admin test user's EQ slots for today
 * first (Admin SDK, staging key only); the two saved checks stay in its
 * history. See tests/e2e/README.md.
 *
 *   npm run e2e:eq
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
const { getFirestore } = functionsRequire('firebase-admin/firestore');

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

// The browser's local day, as the app stamps it (this machine's time zone).
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

async function newPage(browser, errors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('wiof_onboarding_seen', 'true');
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

/** Answers all 24 questions (attention 5, the rest 3 => 40 + 24 + 24 = 88) and submits. */
async function takeCheck(page, first) {
  if (first) {
    await page.goto(`${BASE}/element/spirit`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('.eq-start-btn', { timeout: 30000 });
    await sleep(2000);
    await page.evaluate(() => { const b = document.querySelector('.eq-start-btn'); b.scrollIntoView({ block: 'center' }); b.click(); });
  } else {
    await page.evaluate(() => [...document.querySelectorAll('app-eq-widget-question-card .eq-actions button')].find((b) => /take again/i.test(b.innerText)).click());
  }
  await page.waitForFunction(() => document.querySelectorAll('app-eq-widget-question-card ion-range').length === 24, { timeout: 20000 });
  await sleep(800);
  await page.evaluate(() => {
    [...document.querySelectorAll('app-eq-widget-question-card ion-range')].forEach((r, i) => {
      const value = i < 8 ? 5 : 3;
      r.value = value;
      r.dispatchEvent(new CustomEvent('ionInput', { detail: { value }, bubbles: true }));
      r.dispatchEvent(new CustomEvent('ionChange', { detail: { value }, bubbles: true }));
    });
  });
  await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('app-eq-widget-question-card button.wiof-primary-btn')].find((b) => /submit|see|result/i.test(b.innerText))?.click());
  await page.waitForSelector('app-eq-widget-question-card .eq-results', { timeout: 20000 });
  // The save note arrives with the server's answer.
  await page.waitForSelector('app-eq-widget-question-card .eq-save-note', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  return page.evaluate(() => ({
    result: !!document.querySelector('app-eq-widget-question-card .result-cards'),
    note: document.querySelector('app-eq-widget-question-card .eq-save-note')?.textContent.replace(/\s+/g, ' ').trim() || null
  }));
}

(async () => {
  const uid = (await getAuth().getUserByEmail(USER_EMAIL)).uid;
  const slotRefs = (day) => [1, 2].map((n) => db.collection('activity_log').doc(`${uid}_eq_completion_${day}_${n}`));
  const slots = async () => (await Promise.all(slotRefs(TODAY).map((r) => r.get()))).filter((s) => s.exists);
  for (const ref of slotRefs(TODAY)) await ref.delete();
  console.log(`Today (${TODAY}): cleared the test user's EQ slots`);

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  try {
    // A guest: shown, never saved.
    const guest = await newPage(browser, errors);
    const g = await takeCheck(guest, true);
    check('a guest gets their result, with no note about saving', g.result && !g.note, g.note || '');
    check('nothing was saved for the guest', (await slots()).length === 0);

    const page = await newPage(browser, errors);
    await signIn(page);
    const first = await takeCheck(page, true);
    check('1st check today: shown and saved, no note (one more left)', first.result && !first.note && (await slots()).length === 1, first.note || '');
    const second = await takeCheck(page, false);
    check('2nd check: saved, and the note says that was the last save for today', second.result && /you can save another tomorrow/.test(second.note || '') && (await slots()).length === 2, second.note);
    const third = await takeCheck(page, false);
    check('3rd check: result still shown, the note says it was not saved', third.result && /already saved 2 EQ checks today/.test(third.note || ''), third.note);
    const saved = await slots();
    check('still only two saved today, both scored by the server (88) and accepted', saved.length === 2 && saved.every((s) => s.get('score') === 88),
      saved.map((s) => `${s.id.split('_').slice(-1)}: ${s.get('score')} ${s.get('validation')?.status || 'pending'}`).join(', '));
    await page.screenshot({ path: path.join(OUT, 'eq-limit.png') });
    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
