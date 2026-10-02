/**
 * One-time production launch: data preparation + verification
 * ===========================================================================
 *
 * Production was last deployed at v2.0.2-prod (2026-08-12) — before sign-in,
 * the admins collection, the Cloud Functions aggregates, hero videos and the
 * Take Action catalogue existed. This script prepares production's data for
 * the first deploy of all of that, and verifies it afterwards. The full
 * sequence (including Console steps and the deploy itself) is in
 * docs/PRODUCTION_LAUNCH_RUNBOOK.md — follow that, not this file alone.
 *
 * Steps (run in this order; see the runbook for where the deploy goes):
 *   preflight       read-only report of production's current state
 *   backup          dump every top-level Firestore collection to
 *                   scripts/backups/prod-<timestamp>/ (gitignored)
 *   seed-admins     write admins/{uid} for the given emails (--email a,b)
 *   seed-content    copy the reviewed 40-action catalogue and the hero
 *                   video slots from staging into production
 *   backfill-polls  rebuild poll_results from the raw Polls votes
 *                   (run AFTER the functions deploy — see runbook)
 *   verify          read-only post-launch checks; exits 1 on any failure
 *   smoke           live end-to-end Take Action test through the deployed
 *                   rules + functions, with throwaway users (cleaned up)
 *
 * Every step that writes is a dry run unless --apply is passed.
 *
 * Keys (Firebase Console > Project settings > Service accounts > Generate
 * new private key; both paths are gitignored):
 *   --prod-key     default scripts/service-account.prod.json  (must be wiof-production)
 *   --staging-key  default scripts/service-account.json       (must be wiof-staging)
 *
 * firebase-admin is loaded from functions/node_modules, not scripts/: the
 * copy in scripts/ can't load its Auth module on this machine's Node 20.11
 * (jwks-rsa requires the ESM-only jose — ERR_REQUIRE_ESM), and seed-admins,
 * preflight and smoke all need Auth.
 *
 * Usage:
 *   node scripts/prod-launch.js preflight
 *   node scripts/prod-launch.js backup
 *   node scripts/prod-launch.js seed-admins --email you@example.com [--apply]
 *   node scripts/prod-launch.js seed-content [--apply] [--force]
 *   node scripts/prod-launch.js backfill-polls [--apply]
 *   node scripts/prod-launch.js verify
 *   node scripts/prod-launch.js smoke --apply
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = functionsRequire('firebase-admin/firestore');
const { getAuth } = functionsRequire('firebase-admin/auth');

const { EXPECTED_IDS, EXPECTED_COUNT } = require('./take-action-catalogue-ids');

const PROD_PROJECT = 'wiof-production';
const STAGING_PROJECT = 'wiof-staging';
const HERO_VIDEO_SLOTS = ['air', 'water', 'earth', 'energy', 'spirit', 'our-purpose'];
const IMPORT_TAG = 'production-launch-import';

// ── args ────────────────────────────────────────────────────────────────────

const [step, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const option = (name, fallback) => {
  const i = rest.indexOf(name);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback;
};
const APPLY = flag('--apply');
const FORCE = flag('--force');

// ── projects ────────────────────────────────────────────────────────────────

function loadKey(keyPath, expectedProject, label) {
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: ${label} service account key not found at ${resolved}`);
    console.error('Download one from Firebase Console > Project settings > Service accounts > Generate new private key.');
    process.exit(1);
  }
  const key = require(resolved);
  if (key.project_id !== expectedProject) {
    console.error(`ERROR: ${label} key is for "${key.project_id}", expected "${expectedProject}". Refusing to continue.`);
    process.exit(1);
  }
  return key;
}

let prodApp = null;
function prod() {
  if (!prodApp) {
    const key = loadKey(option('--prod-key', path.join(__dirname, 'service-account.prod.json')), PROD_PROJECT, 'production');
    prodApp = initializeApp({ credential: cert(key) }, 'prod');
  }
  return { db: getFirestore(prodApp), auth: getAuth(prodApp) };
}

let stagingApp = null;
function staging() {
  if (!stagingApp) {
    const key = loadKey(option('--staging-key', path.join(__dirname, 'service-account.json')), STAGING_PROJECT, 'staging');
    stagingApp = initializeApp({ credential: cert(key) }, 'staging');
  }
  return { db: getFirestore(stagingApp) };
}

const mode = () => (APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)');
const heading = (title) => console.log(`\n=== ${title} — ${PROD_PROJECT} ===\n`);

async function listAllUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

// ── preflight ───────────────────────────────────────────────────────────────

async function preflight() {
  heading('Preflight (read-only)');
  const { db, auth } = prod();

  const collections = await db.listCollections();
  console.log('Top-level collections:');
  for (const col of collections.sort((a, b) => a.id.localeCompare(b.id))) {
    const count = (await col.count().get()).data().count;
    console.log(`  ${col.id.padEnd(28)} ${count}`);
  }

  const users = await listAllUsers(auth);
  console.log(`\nAuth users: ${users.length}`);
  users.forEach((u) => console.log(`  ${u.email || '(no email)'}  [${u.providerData.map((p) => p.providerId).join(', ') || 'none'}]  uid=${u.uid}`));

  const admins = await db.collection('admins').get();
  console.log(`\nadmins docs: ${admins.size}`);
  admins.docs.forEach((d) => {
    const u = users.find((x) => x.uid === d.id);
    console.log(`  ${d.id}  ${u ? u.email : '(NO matching auth user!)'}`);
  });

  const warnings = [];
  if (admins.size === 0) warnings.push('No admins yet — run seed-admins before deploying, or admins lose access to admin pages and uploads.');
  const actions = await db.collection('actions').count().get();
  if (actions.data().count > 0) warnings.push(`actions already has ${actions.data().count} docs — seed-content will skip existing IDs unless --force.`);
  const pollResults = await db.collection('poll_results').count().get();
  const votes = await db.collection('Polls').count().get();
  if (votes.data().count > 0 && pollResults.data().count === 0) {
    warnings.push(`Polls has ${votes.data().count} votes but poll_results is empty — run backfill-polls right after the functions deploy.`);
  }

  console.log(warnings.length ? `\nNotes:\n${warnings.map((w) => `  - ${w}`).join('\n')}` : '\nNo issues found.');
}

// ── backup ──────────────────────────────────────────────────────────────────

function serialize(value) {
  if (value instanceof Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    if (typeof value.path === 'string' && typeof value.firestore === 'object') return { __ref: value.path };
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

async function backup() {
  heading('Backup (read-only on Firestore, writes local files)');
  const { db } = prod();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, 'backups', `prod-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });

  let total = 0;
  for (const col of await db.listCollections()) {
    const snap = await col.get();
    const docs = snap.docs.map((d) => ({ id: d.id, data: serialize(d.data()) }));
    fs.writeFileSync(path.join(dir, `${col.id}.json`), JSON.stringify(docs, null, 2));
    console.log(`  ${col.id.padEnd(28)} ${docs.length}`);
    total += docs.length;
  }
  console.log(`\n${total} documents written to ${dir}`);
  console.log('Top-level collections only. For a full managed export (subcollections, restorable), also run:');
  console.log(`  gcloud firestore export gs://${PROD_PROJECT}.appspot.com/firestore-backups/${stamp} --project ${PROD_PROJECT}`);
}

// ── seed-admins ─────────────────────────────────────────────────────────────

async function seedAdmins() {
  heading(`Seed admins — ${mode()}`);
  const emails = (option('--email', '') || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    console.error('ERROR: pass --email you@example.com[,other@example.com]');
    process.exit(1);
  }
  const { db, auth } = prod();
  let failed = 0;
  for (const email of emails) {
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (e) {
      console.log(`  x ${email}: no auth account in production yet. Sign in once on the production site (after deploy), then re-run this step.`);
      failed++;
      continue;
    }
    const ref = db.collection('admins').doc(user.uid);
    if ((await ref.get()).exists) {
      console.log(`  = ${email} (${user.uid}) already admin`);
      continue;
    }
    if (APPLY) {
      await ref.set({ role: 'admin', email, grantedAt: FieldValue.serverTimestamp(), grantedBy: 'prod-launch.js' });
    }
    console.log(`  ${APPLY ? '+' : '~'} ${email} (${user.uid})${APPLY ? '' : ' would be added'}`);
  }
  if (failed) process.exit(1);
}

// ── seed-content ────────────────────────────────────────────────────────────

const AUDIT_FIELDS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
const withoutAudit = (data) => Object.fromEntries(Object.entries(data).filter(([k]) => !AUDIT_FIELDS.includes(k)));

async function seedContent() {
  heading(`Seed content from staging — ${mode()}${FORCE ? ' --force' : ''}`);
  const { db: prodDb } = prod();
  const { db: stagingDb } = staging();

  // Take Action: exactly the 40 reviewed, active staging docs. Refuse to
  // copy anything if staging itself isn't in the verified final state.
  const stagingActions = new Map((await stagingDb.collection('actions').get()).docs.map((d) => [d.id, d.data()]));
  const notReady = EXPECTED_IDS.filter((id) => !stagingActions.has(id) || stagingActions.get(id).isActive !== true);
  if (notReady.length) {
    console.error(`ERROR: staging is missing/inactive for: ${notReady.join(', ')}. Fix staging first (npm run verify:take-action).`);
    process.exit(1);
  }

  const prodActions = new Set((await prodDb.collection('actions').get()).docs.map((d) => d.id));
  let written = 0;
  let skipped = 0;
  console.log(`actions (${EXPECTED_COUNT} from staging):`);
  for (const id of EXPECTED_IDS) {
    if (prodActions.has(id) && !FORCE) {
      skipped++;
      console.log(`  skip ${id} (exists in production)`);
      continue;
    }
    if (APPLY) {
      await prodDb.collection('actions').doc(id).set({
        ...withoutAudit(stagingActions.get(id)),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: IMPORT_TAG,
        updatedBy: IMPORT_TAG
      });
    }
    written++;
  }
  console.log(`  ${APPLY ? 'written' : 'would write'}: ${written}, skipped: ${skipped}`);
  const extra = [...prodActions].filter((id) => !EXPECTED_IDS.includes(id));
  if (extra.length) console.log(`  NOTE: production has other actions docs not in the catalogue: ${extra.join(', ')}`);

  // Hero videos: staging is where admins curate these; shown here so a
  // test value on staging doesn't go to production unnoticed.
  console.log('\nhero_videos (from staging):');
  for (const slot of HERO_VIDEO_SLOTS) {
    const src = await stagingDb.collection('hero_videos').doc(slot).get();
    if (!src.exists) {
      console.log(`  skip ${slot} (not set on staging — production will use the built-in default)`);
      continue;
    }
    const dest = prodDb.collection('hero_videos').doc(slot);
    if ((await dest.get()).exists && !FORCE) {
      console.log(`  skip ${slot} (exists in production)`);
      continue;
    }
    const { title, videoId } = src.data();
    if (APPLY) {
      await dest.set({ title, videoId, updatedAt: FieldValue.serverTimestamp(), updatedBy: IMPORT_TAG });
    }
    console.log(`  ${APPLY ? 'write' : 'would write'} ${slot.padEnd(12)} ${videoId}  "${title}"`);
  }
}

// ── backfill-polls ──────────────────────────────────────────────────────────

// Mirrors functions/index.js backfillPollResults: absolute recount from every
// raw vote, so running it after onPollVoteCreated is live is always correct
// (it overwrites, never adds).
async function computePollTotals(db) {
  const totals = {};
  (await db.collection('Polls').get()).forEach((doc) => {
    const { pollQuestionId, option: choice } = doc.data();
    if (!pollQuestionId || !choice) return;
    totals[pollQuestionId] = totals[pollQuestionId] || { totalVotes: 0, optionCounts: {} };
    totals[pollQuestionId].totalVotes += 1;
    totals[pollQuestionId].optionCounts[choice] = (totals[pollQuestionId].optionCounts[choice] || 0) + 1;
  });
  return totals;
}

async function backfillPolls() {
  heading(`Backfill poll_results — ${mode()}`);
  const { db } = prod();
  const totals = await computePollTotals(db);
  const ids = Object.keys(totals);
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    ids.slice(i, i + 400).forEach((id) => batch.set(db.collection('poll_results').doc(id), {
      pollQuestionId: id, ...totals[id], updatedAt: FieldValue.serverTimestamp()
    }));
    if (APPLY) await batch.commit();
  }
  ids.forEach((id) => console.log(`  ${id}: ${totals[id].totalVotes} votes ${JSON.stringify(totals[id].optionCounts)}`));
  console.log(`\n${ids.length} poll(s) ${APPLY ? 'backfilled' : 'would be backfilled'}.`);
}

// ── verify ──────────────────────────────────────────────────────────────────

async function verify() {
  heading('Verify (read-only)');
  const { db, auth } = prod();
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  };

  const admins = await db.collection('admins').get();
  const adminEmails = [];
  for (const d of admins.docs) {
    try { adminEmails.push((await auth.getUser(d.id)).email); } catch (e) { adminEmails.push(`${d.id} (NO AUTH USER)`); }
  }
  check('at least one admin', admins.size > 0, adminEmails.join(', '));
  check('every admin doc has an auth user', !adminEmails.some((e) => /NO AUTH USER/.test(e)));

  const hero = await db.collection('hero_videos').get();
  const heroIds = hero.docs.map((d) => d.id);
  check('hero_videos slots present', HERO_VIDEO_SLOTS.every((s) => heroIds.includes(s)),
    `missing: ${HERO_VIDEO_SLOTS.filter((s) => !heroIds.includes(s)).join(', ') || 'none'} (missing slots fall back to built-in defaults)`);

  const totals = await computePollTotals(db);
  const stored = new Map((await db.collection('poll_results').get()).docs.map((d) => [d.id, d.data()]));
  const mismatched = Object.keys(totals).filter((id) => !stored.has(id) || stored.get(id).totalVotes !== totals[id].totalVotes);
  check('poll_results match raw votes', mismatched.length === 0, mismatched.length ? `mismatched: ${mismatched.join(', ')}` : `${Object.keys(totals).length} polls`);

  console.log('\nTake Action catalogue:');
  const keyPath = path.resolve(option('--prod-key', path.join(__dirname, 'service-account.prod.json')));
  const catalogue = spawnSync(process.execPath, [path.join(__dirname, 'verify-take-action-catalogue.js'), '--key', keyPath], { stdio: 'inherit' });
  check('Take Action catalogue (40 active)', catalogue.status === 0);

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  console.log('Not checkable from here — confirm in the Console: functions deployed (firebase functions:list --project wiof-production), Google sign-in enabled, authorized domains.');
  if (failed) process.exit(1);
}

// ── smoke ───────────────────────────────────────────────────────────────────

async function smoke() {
  heading('Smoke test');
  if (!APPLY) {
    console.log('This creates throwaway users and records in PRODUCTION (all deleted afterwards),');
    console.log('and briefly edits/deactivates one action (restored exactly). Pass --apply to run it.');
    return;
  }
  const { db: adb, auth: aauth } = prod();
  const rootRequire = createRequire(path.join(REPO, 'package.json'));
  const firebase = rootRequire('firebase/compat/app');
  rootRequire('firebase/compat/auth');
  rootRequire('firebase/compat/firestore');

  const envSource = fs.readFileSync(path.join(REPO, 'src', 'environments', 'environment.prod.ts'), 'utf8');
  const apiKey = (envSource.match(/apiKey:\s*"([^"]+)"/) || [])[1];
  const cfg = { apiKey, authDomain: `${PROD_PROJECT}.firebaseapp.com`, projectId: PROD_PROJECT };

  const stamp = Date.now();
  const ALICE = `smoke-alice-${stamp}`;
  const MALLORY = `smoke-mallory-${stamp}`;
  const ADMIN = `smoke-admin-${stamp}`;
  const results = [];
  const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`); };
  const expectOk = async (name, fn) => { try { await fn(); check(name, true); } catch (e) { check(name, false, e.code || e.message); } };
  const expectDenied = async (name, fn) => {
    try { await fn(); check(name, false, 'write was ALLOWED'); } catch (e) { check(name, e.code === 'permission-denied', e.code || e.message); }
  };
  const clientFor = async (uid) => {
    const app = firebase.initializeApp(cfg, uid);
    await app.auth().signInWithCustomToken(await aauth.createCustomToken(uid));
    return app.firestore();
  };
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const calendarDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Same write sequence as UserActionService.completeAction().
  const complete = async (db, uid, action) => {
    let day = null;
    if (action.repeatType === 'DAILY') {
      day = calendarDay(new Date());
      try {
        await db.collection('user_action_completions').doc(`${uid}_${action.id}_${day}`).set({ userId: uid, actionId: action.id, calendarDay: day, createdAt: ts() });
      } catch (e) { if (e.code === 'permission-denied') return 'already-today'; throw e; }
    }
    const ref = db.collection('user_actions').doc(`${uid}_${action.id}`);
    try {
      await ref.set({
        userId: uid, actionId: action.id, status: 'COMPLETE', startedAt: ts(), completedAt: ts(), completionCount: 1,
        lastCompletedAt: ts(), ...(day ? { lastCompletionDay: day } : {}), completionMethod: 'SELF_REPORTED',
        elementIdsSnapshot: action.elementIds || [], actionVersion: action.version || 1, createdAt: ts(), updatedAt: ts()
      });
    } catch (e) {
      if (e.code !== 'permission-denied') throw e;
      await ref.set({
        status: 'COMPLETE', completedAt: ts(), completionCount: firebase.firestore.FieldValue.increment(1),
        lastCompletedAt: ts(), ...(day ? { lastCompletionDay: day } : {}), updatedAt: ts()
      }, { merge: true });
    }
    return 'ok';
  };

  const cleanup = async () => {
    for (const uid of [ALICE, MALLORY, ADMIN]) {
      for (const col of ['user_actions', 'user_action_completions', 'activity_log']) {
        const snap = await adb.collection(col).where('userId', '==', uid).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      }
      await Promise.all(['user_metrics', 'users', 'admins'].map((col) => adb.collection(col).doc(uid).delete()));
      try { await aauth.deleteUser(uid); } catch (e) { /* never created */ }
    }
    console.log('\nCleanup done (test users, their records and metrics deleted).');
  };

  try {
    const all = (await adb.collection('actions').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    const active = all.filter((a) => a.isActive === true);
    const used = [];
    const pick = (pred, label) => {
      const a = active.find((x) => pred(x) && !used.includes(x));
      if (!a) throw new Error(`no active action for: ${label}`);
      used.push(a);
      return a;
    };
    const daily = pick((a) => a.repeatType === 'DAILY', 'DAILY');
    const repeatable = pick((a) => a.repeatType === 'REPEATABLE', 'REPEATABLE');
    const occasional = pick((a) => a.repeatType === 'OCCASIONAL', 'OCCASIONAL');
    const multi = pick((a) => (a.elementIds || []).length > 1, 'multi-element');
    const spirit = pick((a) => (a.elementIds || []).includes('spirit'), 'Spirit');
    const fresh = pick((a) => require('./take-action-catalogue-ids').V2_NEW_16_IDS.includes(a.id), 'new-16');
    const spare = pick(() => true, 'spare');
    const chosen = { daily, repeatable, occasional, multi, spirit, fresh };
    Object.entries(chosen).forEach(([k, a]) => console.log(`  ${k.padEnd(10)} ${a.id} [${a.repeatType}] (${(a.elementIds || []).join(', ')})`));
    console.log('');

    const alice = await clientFor(ALICE);
    const mallory = await clientFor(MALLORY);

    await expectOk('DAILY: first completion', () => complete(alice, ALICE, daily));
    check('DAILY: same-day repeat is a no-op', (await complete(alice, ALICE, daily)) === 'already-today');
    await expectOk('REPEATABLE: first completion', () => complete(alice, ALICE, repeatable));
    await expectOk('REPEATABLE: second completion (+1)', () => complete(alice, ALICE, repeatable));
    await expectOk('OCCASIONAL: completion', () => complete(alice, ALICE, occasional));
    await expectOk('multi-element: completion', () => complete(alice, ALICE, multi));
    await expectOk('Spirit: completion', () => complete(alice, ALICE, spirit));
    await expectOk('new-16 action: completion', () => complete(alice, ALICE, fresh));
    await expectOk('My Journey history query', async () => {
      const s = await alice.collection('user_actions').where('userId', '==', ALICE).orderBy('updatedAt', 'desc').limit(50).get();
      if (s.size !== 6) throw new Error(`expected 6 docs, got ${s.size}`);
    });

    const rRef = (db) => db.collection('user_actions').doc(`${ALICE}_${repeatable.id}`);
    const bump = (count) => ({ status: 'COMPLETE', completedAt: ts(), lastCompletedAt: ts(), updatedAt: ts(), completionCount: count });
    await expectDenied('forge: completionCount 1000', () => rRef(alice).set(bump(1000), { merge: true }));
    await expectDenied('forge: lower completionCount', () => rRef(alice).set(bump(0), { merge: true }));
    await expectDenied('forge: elementIdsSnapshot', () => rRef(alice).set({ elementIdsSnapshot: ['air', 'water', 'earth', 'energy', 'spirit'], updatedAt: ts() }, { merge: true }));
    await expectDenied("other user writes alice's record", () => rRef(mallory).set(bump(firebase.firestore.FieldValue.increment(1)), { merge: true }));
    await expectDenied("other user reads alice's record", () => rRef(mallory).get());
    await expectDenied('client writes own user_metrics', () => alice.collection('user_metrics').doc(ALICE).set({ totalActionsCompleted: 9999 }, { merge: true }));

    const expectedByElement = {};
    [[daily, 1], [repeatable, 2], [occasional, 1], [multi, 1], [spirit, 1], [fresh, 1]].forEach(([a, n]) =>
      new Set(a.elementIds).forEach((e) => { expectedByElement[e] = (expectedByElement[e] || 0) + n; }));
    let m = {};
    for (let i = 0; i < 30 && !(m.totalActionsCompleted >= 7); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      m = (await adb.collection('user_metrics').doc(ALICE).get()).data() || {};
    }
    await new Promise((r) => setTimeout(r, 5000));
    m = (await adb.collection('user_metrics').doc(ALICE).get()).data() || {};
    const sortEntries = (o) => JSON.stringify(Object.entries(o || {}).sort());
    check('user_metrics.totalActionsCompleted == 7 (onUserActionWritten live)', m.totalActionsCompleted === 7, `got ${m.totalActionsCompleted}`);
    check('user_metrics.uniqueActionsCompleted == 6', m.uniqueActionsCompleted === 6, `got ${m.uniqueActionsCompleted}`);
    check('user_metrics.actionsByElement', sortEntries(m.actionsByElement) === sortEntries(expectedByElement), `got ${JSON.stringify(m.actionsByElement)}`);

    await adb.collection('admins').doc(ADMIN).set({ role: 'admin' });
    const adminDb = await clientFor(ADMIN);
    const target = adb.collection('actions').doc(spare.id);
    const before = (await target.get()).data();
    await expectDenied('non-admin edits catalogue', () => alice.collection('actions').doc(spare.id).update({ title: 'hacked' }));
    try {
      await expectOk('admin edit', () => adminDb.collection('actions').doc(spare.id).update({ title: `${before.title} (smoke)`, updatedAt: ts() }));
      await expectOk('admin deactivate', () => adminDb.collection('actions').doc(spare.id).update({ isActive: false, updatedAt: ts() }));
      await expectOk('admin reactivate', () => adminDb.collection('actions').doc(spare.id).update({ isActive: true, updatedAt: ts() }));
    } finally {
      await target.set(before);
      check('catalogue entry restored exactly', JSON.stringify((await target.get()).data()) === JSON.stringify(before));
    }
  } catch (e) {
    check('smoke script ran', false, e.message);
  } finally {
    await cleanup();
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed) process.exit(1);
}

// ── main ────────────────────────────────────────────────────────────────────

const STEPS = {
  preflight,
  backup,
  'seed-admins': seedAdmins,
  'seed-content': seedContent,
  'backfill-polls': backfillPolls,
  verify,
  smoke
};

if (!STEPS[step]) {
  console.error(`Usage: node scripts/prod-launch.js <${Object.keys(STEPS).join('|')}> [--apply] [--force]`);
  console.error('See docs/PRODUCTION_LAUNCH_RUNBOOK.md for the order.');
  process.exit(1);
}

STEPS[step]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
