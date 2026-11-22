/**
 * STAGING ONLY end-to-end test of the Planet Passport milestone ladder
 * through the REAL action trigger (onUserActionWritten → user_metrics.ladder
 * → awardPassportOnMetrics), plus the Settings "Also clear my Planet
 * Passport" checkbox clicked in the browser.
 *
 * Completions over several days and weeks can't be made by a browser (the
 * rules pin lastCompletedAt to the server's clock), so the test writes
 * user_actions with past dates through the Admin SDK, one completion at a
 * time and in time order, exactly as the trigger would see a member acting
 * over six weeks. Everything after that write is the deployed server code.
 *
 * Creates a TEMPORARY staging account and deletes it, with all it wrote.
 * Needs site_settings/passport.awardsEnabled = true on staging.
 *
 *   npm run e2e:passport-ladder
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { BASE, API_KEY, CHROME, OUT, puppeteer } = require('./e2e-config');

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
    await sleep(1000);
  }
  return null;
}

async function callable(name, idToken, data = {}) {
  const res = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` }, body: JSON.stringify({ data })
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`${name} failed: ${JSON.stringify(body.error || body)}`);
  return body.result;
}

async function idTokenFor(email, password) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await res.json();
  if (!body.idToken) throw new Error('sign-in failed');
  return body.idToken;
}

/** One real-action catalogue entry per wanted element (single-element actions preferred). */
async function pickActions(elements) {
  const snap = await db.collection('actions').get();
  const actions = snap.docs.map((d) => ({ id: d.id, elementIds: d.get('elementIds') || [], isActive: d.get('isActive') !== false, repeatType: d.get('repeatType') }));
  return elements.map((element) => {
    const candidates = actions.filter((a) => a.isActive && a.elementIds[0] === element && a.repeatType !== 'ONCE');
    const one = candidates.find((a) => a.elementIds.length === 1) || candidates[0];
    if (!one) throw new Error(`no repeatable ${element} action on staging`);
    return one;
  });
}

(async () => {
  const flag = await db.collection('site_settings').doc('passport').get();
  if (!(flag.exists && flag.get('awardsEnabled') === true)) {
    console.error('Awards are off on staging (site_settings/passport.awardsEnabled). Switch them on first.');
    process.exit(2);
  }
  const email = `passport-ladder-${Date.now()}@example.com`;
  const password = `Pl-${Math.random().toString(36).slice(2)}-2026!`;
  const { uid } = await getAuth().createUser({ email, password, displayName: 'Passport Ladder E2E' });
  const stampIds = async () => (await db.collection('passport_stamps').where('userId', '==', uid).get()).docs.map((d) => d.get('stampId')).sort();
  const metrics = async () => (await db.collection('user_metrics').doc(uid).get()).data() || {};
  const counts = new Map();
  let browser;

  /** One completion of `action` at `iso`, then wait until the trigger has recorded and counted it. */
  async function complete(action, iso) {
    const n = (counts.get(action.id) || 0) + 1;
    counts.set(action.id, n);
    const when = Timestamp.fromDate(new Date(iso));
    await db.collection('user_actions').doc(`${uid}_${action.id}`).set({
      userId: uid, actionId: action.id, status: 'COMPLETE', completionCount: n, lastCompletedAt: when, completedAt: when,
      elementIdsSnapshot: action.elementIds, actionVersion: 1, completionMethod: 'SELF_REPORTED', updatedAt: when
    }, { merge: true });
    const event = await waitFor(async () => (await db.collection('activity_log').doc(`${uid}_action_completed_${action.id}_${n}`).get()).exists);
    if (!event) throw new Error(`the trigger did not record ${action.id} #${n}`);
    await sleep(1500); // let the award trigger run on that metrics write
  }

  try {
    const token = await idTokenFor(email, password);
    await callable('createUserProfile', token);
    const [air, water, earth] = await pickActions(['air', 'water', 'earth']);
    console.log(`Actions: air=${air.id}, water=${water.id}, earth=${earth.id}`);

    // Day 1 (Tue 1 Sep 2026): three different actions in three minutes, three elements.
    await complete(air, '2026-09-01T04:30:00Z');
    await complete(water, '2026-09-01T04:31:00Z');
    await complete(earth, '2026-09-01T04:32:00Z');
    let m = await metrics();
    check('three actions in one day: one day on the ladder', m.ladder && m.ladder.actionDays === 1, JSON.stringify({ days: m.ladder?.actionDays, unique: m.uniqueActionsCompleted }));
    let have = await stampIds();
    check('the brake: no Three Seeds and no Triveni after one busy minute', !have.includes('three-seeds') && !have.includes('delta'), have.join(', ') || 'none');

    // The same air action on two later days (and weeks).
    await complete(air, '2026-09-08T04:30:00Z');
    have = await stampIds();
    check('two days: still no Three Seeds', !have.includes('three-seeds'), have.join(', ') || 'none');
    await complete(air, '2026-09-15T04:30:00Z');
    const third = await waitFor(async () => { const s = await stampIds(); return s.includes('three-seeds') && s.includes('delta') && s.includes('taking-root') ? s : null; }, 20000);
    check('a third day: Three Seeds, Triveni and Taking Root (3 weeks) are awarded by the server', !!third, (third || (await stampIds())).join(', '));
    check('not Four Winds or Compass (only 3 different actions / 3 elements)', !(await stampIds()).some((s) => s === 'four-winds' || s === 'compass'));

    // Tapping the same action again the same day adds no day.
    await complete(air, '2026-09-15T04:35:00Z');
    m = await metrics();
    check('a second completion on the same day adds no day', m.ladder.actionDays === 3 && m.ladder.actionWeeks[air.id] === 3, JSON.stringify({ days: m.ladder.actionDays, weeks: m.ladder.actionWeeks[air.id] }));

    // Weeks 4, 5, 6 of the air action (not consecutive weeks: 6 Oct skips one).
    await complete(air, '2026-09-22T04:30:00Z');
    await complete(air, '2026-09-29T04:30:00Z');
    await complete(air, '2026-10-13T04:30:00Z');
    const weekly = await waitFor(async () => { const s = await stampIds(); return ['full-moon', 'evergreen', 'honeycomb', 'air-guardian'].every((id) => s.includes(id)) ? s : null; }, 20000);
    check('six different weeks: Full Moon, Evergreen and Honeycomb; six Air days: Clean Air Guardian', !!weekly, (weekly || (await stampIds())).join(', '));
    have = await stampIds();
    check('no Water or Earth Guardian (one day each)', !have.includes('water-guardian') && !have.includes('earth-guardian'));
    check('no Four Winds, Snowflake or One Family (only 3 different actions)', !have.some((s) => ['four-winds', 'snowflake', 'one-family'].includes(s)));
    check('each stamp recorded once', have.length === new Set(have).size, have.join(', '));
    const record = (await db.collection('passport_stamps').doc(`${uid}_honeycomb`).get()).data() || {};
    check('the record carries provenance (rule, target, value, versions, source)', record.evidence?.rule === 'action_weeks' && record.evidence?.value === 6 && record.ruleVersion === 1 && record.source === 'trigger', JSON.stringify(record.evidence));

    // The Settings checkbox, clicked: "Also clear my Planet Passport".
    browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      for (const [k, v] of [['wiof_launch_ribbon_cut', '1'], ['wiof_onboarding_seen', 'true'], ['privacyConsentAccepted', 'true'], ['wiof_analytics_consent', 'denied'], ['subscribed', 'true']]) localStorage.setItem(k, v);
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForSelector('input[name=email]');
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
    await page.type('input[name=email]', email);
    await page.type('input[name=password]', password);
    await page.click('.login-submit-btn');
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 30000 });
    await page.goto(`${BASE}/settings`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForSelector('.reset-data-section ion-button', { timeout: 30000 });
    await sleep(1500);
    await page.click('.reset-data-section ion-button');
    await page.waitForSelector('.reset-modal', { timeout: 10000 });
    const boxes = await page.$$('.reset-modal .reset-option input[type=checkbox]');
    check('the reset dialog offers "Also clear my Planet Passport"', boxes.length === 2 && (await page.$eval('.reset-modal', (el) => el.textContent.includes('Also clear my Planet Passport'))));
    await boxes[1].click();
    const warned = await page.$eval('.reset-modal', (el) => el.textContent.includes('Your earned stamps and their dates will be gone'));
    check('ticking it shows the warning', warned);
    await page.screenshot({ path: path.join(OUT, 'passport-settings-reset.png') });
    await page.type('.reset-input', 'RESET');
    const clickedAt = Date.now();
    await page.click('.reset-delete');
    // Take Action progress was kept (that box wasn't ticked), so the server may re-earn its stamps at once,
    // dated today (docs/METRICS.md "Resets"). Cleared = every old record is gone: whatever is left is new.
    const cleared = await waitFor(async () => {
      const docs = (await db.collection('passport_stamps').where('userId', '==', uid).get()).docs;
      return docs.every((d) => d.get('earnedAt') && d.get('earnedAt').toMillis() > clickedAt) ? docs.map((d) => d.get('stampId')) : null;
    }, 40000);
    check('confirming clears the Passport (anything left is newly re-earned from the kept actions)', !!cleared, `re-earned: ${(cleared || []).join(', ') || 'none'}`);
    check('re-earned stamps never include ones the kept data does not support', !(cleared || []).some((id) => ['earthrise', 'water-arrival', 'good-watch'].includes(id)));
    m = await metrics();
    check('Take Action progress and the ladder are kept (that box was not ticked)', m.totalActionsCompleted === 9 && m.ladder && m.ladder.actionDays === 6, JSON.stringify({ total: m.totalActionsCompleted, days: m.ladder?.actionDays }));
  } catch (error) {
    check('ran to the end', false, error.message);
  } finally {
    if (browser) await browser.close();
    for (const collection of ['passport_stamps', 'activity_log', 'user_actions', 'user_action_completions', 'user_saved_content']) {
      const snap = await db.collection(collection).where('userId', '==', uid).get();
      for (const doc of snap.docs) await doc.ref.delete();
    }
    for (const collection of ['passport_holders', 'user_metrics', 'users']) await db.collection(collection).doc(uid).delete();
    await getAuth().deleteUser(uid).catch(() => {});
    console.log(`\nTemporary account ${email} and its data removed.`);
    console.log(`\n${pass} passed, ${fail} failed.`);
    process.exit(fail ? 1 : 0);
  }
})();
