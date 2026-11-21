/**
 * STAGING ONLY end-to-end test of Admin → Passport, through the deployed
 * functions and rules: savePassportStamp, passportStampStats, the award
 * triggers reading definitions from Firestore, challenges, and the admin page.
 *
 * Uses the staging ADMIN test account (WIOF_E2E_ADMIN_EMAIL / _PASSWORD) and
 * a TEMPORARY member it creates. Every badge, audit entry and record it makes
 * is removed at the end. Needs site_settings/passport.awardsEnabled = true.
 *
 *   npm run e2e:passport-admin
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, API_KEY, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');

const ADMIN_EMAIL = requireEnv('WIOF_E2E_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('WIOF_E2E_ADMIN_PASSWORD');

const functionsRequire = createRequire(path.resolve(__dirname, '../../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getAuth } = functionsRequire('firebase-admin/auth');
const { getFirestore, Timestamp } = functionsRequire('firebase-admin/firestore');

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
    await sleep(1500);
  }
  return null;
}

async function idTokenFor(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await res.json();
  if (!body.idToken) throw new Error(`sign-in failed for ${email}`);
  return body.idToken;
}

/** Calls a callable; returns { result } or { error: { status, message } }. */
async function call(name, idToken, data) {
  const res = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` }, body: JSON.stringify({ data })
  });
  const body = await res.json();
  return body.error ? { error: body.error } : { result: body.result };
}

const ist = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

(async () => {
  const flag = await db.collection('site_settings').doc('passport').get();
  if (!(flag.exists && flag.get('awardsEnabled') === true)) {
    console.error('Awards are off on staging (site_settings/passport.awardsEnabled). Switch them on first.');
    process.exit(2);
  }
  const run = Date.now().toString(36);
  const badgeId = `e2e-leak-${run}`;
  const challengeId = `e2e-water-${run}`;
  const email = `passport-admin-e2e-${run}@example.com`;
  const password = `Pa-${Math.random().toString(36).slice(2)}-2026!`;
  const { uid } = await getAuth().createUser({ email, password, displayName: 'Passport Admin E2E' });
  let browser;
  const counts = new Map();

  async function complete(actionId, elements, when = new Date()) {
    const n = (counts.get(actionId) || 0) + 1;
    counts.set(actionId, n);
    const t = Timestamp.fromDate(when);
    await db.collection('user_actions').doc(`${uid}_${actionId}`).set({
      userId: uid, actionId, status: 'COMPLETE', completionCount: n, lastCompletedAt: t, completedAt: t,
      elementIdsSnapshot: elements, actionVersion: 1, completionMethod: 'SELF_REPORTED', updatedAt: t
    }, { merge: true });
    await waitFor(async () => (await db.collection('activity_log').doc(`${uid}_action_completed_${actionId}_${n}`).get()).exists);
  }
  const stampOf = async (id) => (await db.collection('passport_stamps').doc(`${uid}_${id}`).get()).data();

  try {
    const adminToken = await idTokenFor(ADMIN_EMAIL, ADMIN_PASSWORD);
    const memberToken = await idTokenFor(email, password);
    await call('createUserProfile', memberToken, {});

    const leak = (target) => ({
      id: badgeId, family: 'milestone', name: 'Leak Fixer', title: ['Leak', 'Fixer'], caption: 'WATER',
      meaning: 'You fixed leaks, drop by drop.', hint: `Fix a water leak ${target} times`, unit: 'times', element: 'water',
      rule: { type: 'specific_action', target, actionId: 'fix-a-water-leak' }
    });

    // Permissions.
    const denied = await call('savePassportStamp', memberToken, { action: 'save', id: badgeId, def: leak(3) });
    check('a member cannot create a badge (server refuses)', denied.error && /PERMISSION_DENIED/i.test(denied.error.status), denied.error && denied.error.status);

    // Draft → hidden from members.
    const saved = await call('savePassportStamp', adminToken, { action: 'save', id: badgeId, def: leak(3) });
    check('an admin saves a draft (version 1)', saved.result && saved.result.status === 'draft' && saved.result.version === 1, JSON.stringify(saved.result || saved.error));
    const draft = (await db.collection('passport_stamp_defs').doc(badgeId).get()).data() || {};
    check('the server set the milestone\'s shape from its target (3 → triangle)', draft.shape === 'triangle', draft.shape);
    const bad = await call('savePassportStamp', adminToken, { action: 'save', id: `${badgeId}-x`, def: { ...leak(3), id: `${badgeId}-x`, rule: { type: 'elements_acted', target: 6 }, element: null } });
    check('an impossible milestone is refused with a reason', bad.error && /can't be reached/.test(bad.error.message), bad.error && bad.error.message);

    // Would earn it now.
    const stats = await call('passportStampStats', adminToken, { def: leak(3) });
    check('"would earn it now" returns a count, and earned counts per badge', stats.result && typeof stats.result.wouldEarn === 'number' && typeof stats.result.earned === 'object', JSON.stringify({ wouldEarn: stats.result && stats.result.wouldEarn }));

    // Publish → the member earns it through the live trigger.
    const published = await call('savePassportStamp', adminToken, { action: 'publish', id: badgeId });
    check('publishing makes it active', published.result && published.result.status === 'active');
    await sleep(65000); // the award triggers cache definitions for up to 60 s
    for (let i = 0; i < 3; i++) await complete('fix-a-water-leak', ['water']);
    const earned = await waitFor(() => stampOf(badgeId), 45000);
    check('a member earns the new badge from the live definition, version 1', !!earned && earned.defVersion === 1 && earned.evidence && earned.evidence.rule === 'specific_action', JSON.stringify(earned && earned.evidence));

    // A rule change → version 2; the earned record keeps version 1.
    const harder = await call('savePassportStamp', adminToken, { action: 'save', id: badgeId, def: leak(4) });
    check('changing the target makes version 2 (and a square)', harder.result && harder.result.version === 2 && harder.result.versionBumped
      && (await db.collection('passport_stamp_defs').doc(badgeId).get()).get('shape') === 'square');
    check('the member keeps the badge earned under version 1', (await stampOf(badgeId)).defVersion === 1);

    // Retire, never delete.
    const retired = await call('savePassportStamp', adminToken, { action: 'retire', id: badgeId });
    check('retiring works', retired.result && retired.result.status === 'retired');
    const del = await call('savePassportStamp', adminToken, { action: 'delete', id: badgeId });
    check('a published badge cannot be deleted', del.error && /never deleted/.test(del.error.message), del.error && del.error.message);
    check('retiring removed nobody\'s badge', !!(await stampOf(badgeId)));

    // A challenge open today: one Water action inside the window.
    const today = ist();
    const ch = await call('savePassportStamp', adminToken, { action: 'save', id: challengeId, def: {
      id: challengeId, family: 'challenge', name: 'Water Today', title: ['Water', 'Today'], caption: 'CHALLENGE', shape: 'oval',
      meaning: 'A Water action, today.', hint: 'Do a Water action today', unit: 'actions', element: 'water',
      rule: { type: 'window_actions', target: 1, element: 'water' }, window: { start: today, end: today }
    } });
    await call('savePassportStamp', adminToken, { action: 'publish', id: challengeId });
    check('an admin creates and publishes a challenge open today', ch.result && ch.result.status === 'draft');
    await sleep(65000);
    await complete('take-a-shorter-shower', ['water']);
    const won = await waitFor(() => stampOf(challengeId), 45000);
    const progress = (await db.collection('passport_challenge_progress').doc(`${uid}_${challengeId}`).get()).data();
    check('a Water action inside the window earns the challenge, with progress kept', !!won && won.source === 'challenge' && progress && progress.count === 1, JSON.stringify({ source: won && won.source, count: progress && progress.count }));

    // Audit trail.
    const audit = (await db.collection('passport_stamp_audit').where('stampId', 'in', [badgeId, challengeId]).get()).docs.map((d) => d.data());
    const actions = audit.map((a) => a.action).sort();
    check('every change is in the audit trail, with who and before/after', audit.length >= 6 && audit.every((a) => a.byEmail && 'before' in a && 'after' in a), actions.join(', '));

    // Members see published definitions only.
    const memberRead = await fetch(`https://firestore.googleapis.com/v1/projects/wiof-staging/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'passport_stamp_defs' }] } })
    });
    check('a member cannot list definitions without the published filter (drafts stay private)', memberRead.status === 403, `HTTP ${memberRead.status}`);

    // The admin page.
    browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.evaluateOnNewDocument(() => {
      for (const [k, v] of [['wiof_launch_ribbon_cut', '1'], ['wiof_onboarding_seen', 'true'], ['privacyConsentAccepted', 'true'], ['wiof_analytics_consent', 'denied'], ['subscribed', 'true']]) localStorage.setItem(k, v);
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForSelector('input[name=email]');
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
    await page.type('input[name=email]', ADMIN_EMAIL);
    await page.type('input[name=password]', ADMIN_PASSWORD);
    await page.click('.login-submit-btn');
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 30000 });
    await page.goto(`${BASE}/admin-dashboard/passport`, { waitUntil: 'load', timeout: 90000 });
    const tiles = await page.waitForSelector('.map-tile', { timeout: 30000 }).then(() => page.$$eval('.map-tile', (t) => t.length), () => 0);
    check('the admin badge map lists the badges', tiles >= 33, `${tiles} tiles`);
    await sleep(2000);
    const sentence = await page.$eval('.map-tile .tile-rule', (el) => el.textContent.trim()).catch(() => '');
    check('each badge says when it is earned, in plain words', /Complete all 5 first steps|Do |Read |Take |Visit |Keep /.test(sentence), sentence);
    await page.screenshot({ path: path.join(OUT, 'passport-admin-map.png') });
    await page.click('.map-tile');
    await page.waitForSelector('#badge-form', { timeout: 10000 });
    await sleep(1200);
    const formOk = await page.$eval('#badge-form', (el) => el.textContent.includes('Earned when'));
    check('opening a badge shows the form with its preview and rule', formOk);
    await page.screenshot({ path: path.join(OUT, 'passport-admin-form.png') });
  } catch (error) {
    check('ran to the end', false, error.message);
  } finally {
    if (browser) await browser.close();
    for (const id of [badgeId, challengeId, `${badgeId}-x`]) {
      await db.collection('passport_stamp_defs').doc(id).delete();
      const audit = await db.collection('passport_stamp_audit').where('stampId', '==', id).get();
      for (const d of audit.docs) await d.ref.delete();
    }
    for (const collection of ['passport_stamps', 'passport_challenge_progress', 'activity_log', 'user_actions', 'user_action_completions']) {
      const snap = await db.collection(collection).where('userId', '==', uid).get();
      for (const doc of snap.docs) await doc.ref.delete();
    }
    for (const collection of ['passport_holders', 'user_metrics', 'users']) await db.collection(collection).doc(uid).delete();
    await getAuth().deleteUser(uid).catch(() => {});
    console.log(`\nTest badges, their audit entries, and the temporary member ${email} removed.`);
    console.log(`\n${pass} passed, ${fail} failed. Screenshots in ${OUT}`);
    process.exit(fail ? 1 : 0);
  }
})();
