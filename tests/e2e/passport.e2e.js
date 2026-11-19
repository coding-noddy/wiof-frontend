/**
 * STAGING ONLY end-to-end test for Planet Passport v1 (server-awarded stamps).
 *
 * Creates a TEMPORARY staging account (Admin SDK, staging key only) and
 * deletes it, with everything it wrote, at the end. The permanent test
 * accounts are not touched. Needs site_settings/passport.awardsEnabled = true
 * on staging (docs/PLANET_PASSPORT_V1_RUNBOOK.md, step 5).
 *
 * Checks, through the real deployed triggers and rules:
 *  1. before the first steps: /passport shows the waiting cover and steps;
 *  2. a browser visit to /element/water earns First Drop (element_visit
 *     event → user_metrics → award trigger);
 *  3. a trusted-count change (written as the server would) earns its stamp
 *     exactly once, with a server earnedAt, and choosing elements completes
 *     the five first steps: Earthrise, and the Passport is issued;
 *  4. the booklet then opens with the welcome, and the stamps show;
 *  5. the browser can't write a stamp itself;
 *  6. "Delete my data" keeps stamps; with includePassport it removes them.
 *
 *   npm run e2e:passport
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, API_KEY, CHROME, OUT, puppeteer } = require('./e2e-config');

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
const FUNCTIONS = 'https://asia-south1-wiof-staging.cloudfunctions.net';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  - ' + info : ''}`); };

async function waitFor(fn, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(1000);
  }
  return null;
}

async function idTokenFor(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await res.json();
  if (!body.idToken) throw new Error('sign-in failed: ' + JSON.stringify(body.error || body));
  return body.idToken;
}

async function callable(name, idToken, data = {}) {
  const res = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` }, body: JSON.stringify({ data })
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`${name} failed: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

async function newPage(browser, viewport, errors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('wiof_onboarding_seen', 'true');
    localStorage.setItem('privacyConsentAccepted', 'true');
    localStorage.setItem('wiof_analytics_consent', 'denied');
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

async function cleanup(uid) {
  for (const collection of ['passport_stamps', 'activity_log', 'user_saved_content', 'user_actions']) {
    const snap = await db.collection(collection).where('userId', '==', uid).get();
    for (const doc of snap.docs) await doc.ref.delete();
  }
  for (const collection of ['passport_holders', 'user_metrics', 'users']) await db.collection(collection).doc(uid).delete();
  await getAuth().deleteUser(uid).catch(() => {});
}

(async () => {
  const flag = await db.collection('site_settings').doc('passport').get();
  if (!(flag.exists && flag.get('awardsEnabled') === true)) {
    console.error('Awards are off on staging (site_settings/passport.awardsEnabled). Switch them on first.');
    process.exit(2);
  }
  const email = `passport-e2e-${Date.now()}@example.com`;
  const password = `Pp-${Math.random().toString(36).slice(2)}-2026!`;
  const user = await getAuth().createUser({ email, password, displayName: 'Passport E2E' });
  const uid = user.uid;
  const stampsOf = async () => (await db.collection('passport_stamps').where('userId', '==', uid).get()).docs.map((d) => d.data());
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const token = await idTokenFor(email, password);
    await callable('createUserProfile', token);
    check('temporary account and profile created', (await db.collection('users').doc(uid).get()).exists);

    // 1. Waiting cover.
    const page = await newPage(browser, { width: 1366, height: 900 }, errors);
    await signIn(page, email, password);
    await page.goto(`${BASE}/passport`, { waitUntil: 'load', timeout: 90000 });
    const waiting = await page.waitForSelector('.waiting-steps li', { timeout: 30000 }).then(() => true, () => false);
    check('before the first steps, /passport shows the waiting cover and steps', waiting && !(await page.$('.stage')));
    await page.screenshot({ path: path.join(OUT, 'passport-waiting-desktop.png') });

    // 2. A real browser visit earns First Drop.
    await page.goto(`${BASE}/element/water`, { waitUntil: 'load', timeout: 90000 });
    const visit = await waitFor(async () => (await db.collection('activity_log').doc(`${uid}_element_visit_water`).get()).data());
    check('visiting Water writes one element_visit event, accepted by the server', visit && (await waitFor(async () => {
      const v = (await db.collection('activity_log').doc(`${uid}_element_visit_water`).get()).get('validation');
      return v && v.status === 'accepted';
    })));
    const drop = await waitFor(async () => (await stampsOf()).find((s) => s.stampId === 'water-arrival'));
    check('First Drop is awarded by the server, with a server time', !!drop && !!drop.earnedAt && drop.source === 'trigger');

    // 3. Trusted counts (as the server writes them) and choosing elements: Earthrise.
    await db.collection('user_metrics').doc(uid).set({ qualityReads: 1, videosCompleted: 3, lastEqScore: 64, totalActionsCompleted: 1, uniqueActionsCompleted: 1 }, { merge: true });
    const goodWatch = await waitFor(async () => (await stampsOf()).find((s) => s.stampId === 'good-watch'));
    check('three finished videos earn Good Watch', !!goodWatch);
    check('the Passport is not issued before all five first steps', !(await db.collection('passport_holders').doc(uid).get()).exists);
    await db.collection('users').doc(uid).update({ preferredElements: ['water'] });
    const holder = await waitFor(async () => (await db.collection('passport_holders').doc(uid).get()).data());
    const stamps = await stampsOf();
    check('choosing elements completes the first steps: Earthrise and the Passport is issued', !!holder && stamps.some((s) => s.stampId === 'earthrise'));
    check('each stamp is recorded exactly once', stamps.length === new Set(stamps.map((s) => s.stampId)).size, stamps.map((s) => s.stampId).join(', '));

    // A further write that changes nothing relevant adds no duplicates.
    await db.collection('user_metrics').doc(uid).set({ blogsRead: 2 }, { merge: true });
    await sleep(6000);
    check('a retried or unrelated write adds nothing', (await stampsOf()).length === stamps.length);

    // 4. The booklet opens with the welcome.
    await page.goto(`${BASE}/passport`, { waitUntil: 'load', timeout: 90000 });
    const welcome = await page.waitForSelector('.welcome', { timeout: 30000 }).then(() => true, () => false);
    check('the issued Passport shows the welcome once', welcome);
    await page.screenshot({ path: path.join(OUT, 'passport-welcome-desktop.png') });
    if (welcome) await page.click('.welcome-open');
    await sleep(1500);
    const earnedOnPage = await page.$$eval('.face:not([inert]) .stamp.earned', (els) => els.length);
    check('opening it shows earned stamps on the first milestone page', earnedOnPage > 0, `${earnedOnPage} inked`);
    const inertFaces = await page.$$eval('.face[inert]', (els) => els.length);
    check('turned and hidden pages are inert for screen readers', inertFaces > 0, `${inertFaces} inert faces`);
    await page.screenshot({ path: path.join(OUT, 'passport-earthrise-desktop.png') });
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.stage', { timeout: 30000 });
    check('the welcome does not show a second time', !(await page.$('.welcome')));

    const phone = await newPage(browser, { width: 390, height: 844, isMobile: true, hasTouch: true }, errors);
    await signIn(phone, email, password);
    await phone.goto(`${BASE}/passport`, { waitUntil: 'load', timeout: 90000 });
    await phone.waitForSelector('.stage', { timeout: 30000 });
    await sleep(1200);
    await phone.screenshot({ path: path.join(OUT, 'passport-phone.png') });
    check('the booklet renders on a phone', !!(await phone.$('.stage.is-single')));

    // 5. A member can't write a stamp (Firestore REST with the member's own token, as a browser would).
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/wiof-staging/databases/(default)/documents/passport_stamps?documentId=${uid}_snowflake`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: { userId: { stringValue: uid }, stampId: { stringValue: 'snowflake' } } })
    });
    check('a member cannot write a stamp for themselves', res.status === 403, `HTTP ${res.status}`);

    // 6. Resets.
    const token2 = await idTokenFor(email, password);
    await callable('resetEngagementData', token2, { includeActions: false });
    await sleep(4000);
    check('Delete my data keeps the stamps by default', (await stampsOf()).length >= stamps.length);
    const cleared = await callable('resetEngagementData', token2, { includeActions: false, includePassport: true });
    await sleep(4000);
    const after = await stampsOf();
    check('with "Also clear my Planet Passport" the stamps and holder record are removed', after.length === 0 && !(await db.collection('passport_holders').doc(uid).get()).exists, `deleted ${cleared.deletedStampCount}, left ${after.length}`);

    const unexpected = errors.filter((e) => !/favicon|ERR_BLOCKED|Access denied|permission|Failed to load resource/i.test(e));
    check('no unexpected console errors', unexpected.length === 0, unexpected.slice(0, 3).join(' | '));
  } catch (error) {
    check('ran to the end', false, error.message);
  } finally {
    await browser.close();
    await cleanup(uid);
    console.log(`\nTemporary account ${email} and its data removed.`);
    console.log(`\n${pass} passed, ${fail} failed. Screenshots in ${OUT}`);
    process.exit(fail ? 1 : 0);
  }
})();
