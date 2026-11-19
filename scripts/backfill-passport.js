#!/usr/bin/env node
/**
 * Backfill Planet Passport stamps for existing members (Passport v1, D3)
 * =====================================================================
 *
 * For each member, replays their accepted history (functions/passport-replay.js)
 * and records the stamps they have already earned, dated at the event that
 * earned each one. Where history can't prove a date (streaks; Earthrise when
 * the elements' choice date is unknown) the stamp is dateKnown: false and the
 * booklet says "Earned before launch". Issues the Passport (passport_holders)
 * for members who have Earthrise.
 *
 * Run AFTER `recompute-user-metrics.js --apply` (the ladder and element
 * visits must be current) and BEFORE switching site_settings/passport.awardsEnabled on.
 *
 * DRY RUN BY DEFAULT. --apply writes. Never changes or removes an existing
 * stamp (create only), so re-running is safe: a second run adds nothing.
 * Every record it writes carries source "backfill:{runId}"; --undo {runId}
 * removes exactly those (dry run unless --apply).
 *
 * Usage:
 *   node scripts/backfill-passport.js --project staging                  # dry run
 *   node scripts/backfill-passport.js --project staging --apply
 *   node scripts/backfill-passport.js --project staging --undo 2026-11-19T10-00-00Z [--apply]
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = functionsRequire('firebase-admin/firestore');
const { CATALOGUE, CATALOGUE_VERSION, RULES_VERSION } = require('../functions/passport-catalogue');
const { ISSUING_STAMP, stampDocId, stampRecord } = require('../functions/passport');
const { replayEarnedDates } = require('../functions/passport-replay');
const { createOnce } = require('../functions/passport-awards');
const { makeContentLookups } = require('../functions/user-metrics');

const args = process.argv.slice(2);
const target = args[args.indexOf('--project') + 1];
const apply = args.includes('--apply');
const undoRun = args.includes('--undo') ? args[args.indexOf('--undo') + 1] : null;
const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json' }
};
if (!args.includes('--project') || !PROJECTS[target] || (args.includes('--undo') && !undoRun)) {
  console.error('Usage: node scripts/backfill-passport.js --project staging|prod [--apply] [--undo RUN_ID]');
  process.exit(1);
}
const keyPath = path.resolve(__dirname, PROJECTS[target].key);
if (!fs.existsSync(keyPath)) {
  console.error(`ERROR: scripts/${PROJECTS[target].key} not found.`);
  process.exit(1);
}
const key = require(keyPath);
if (key.project_id !== PROJECTS[target].id) {
  console.error(`ERROR: ${PROJECTS[target].key} is for ${key.project_id}, not ${PROJECTS[target].id}.`);
  process.exit(1);
}

initializeApp({ credential: cert(key) });
const db = getFirestore();
const short = (uid) => `${uid.slice(0, 8)}…`;

async function undo(runId) {
  const source = `backfill:${runId}`;
  const [stamps, holders] = await Promise.all([
    db.collection('passport_stamps').where('source', '==', source).get(),
    db.collection('passport_holders').where('source', '==', source).get()
  ]);
  console.log(`Run ${runId}: ${stamps.size} stamps and ${holders.size} holder records to remove.`);
  if (!apply) {
    console.log('\nDry run only: nothing was removed. Re-run with --apply to remove.');
    return;
  }
  const docs = [...stamps.docs, ...holders.docs];
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`\nRemoved ${docs.length} records.`);
}

async function backfill() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const source = `backfill:${runId}`;
  const [activitySnap, usersSnap, metricsSnap, stampsSnap, holdersSnap] = await Promise.all([
    db.collection('activity_log').get(),
    db.collection('users').get(),
    db.collection('user_metrics').get(),
    db.collection('passport_stamps').get(),
    db.collection('passport_holders').get()
  ]);
  const eventsByUser = new Map();
  activitySnap.docs.forEach((d) => {
    const uid = d.get('userId');
    if (!uid) return;
    if (!eventsByUser.has(uid)) eventsByUser.set(uid, []);
    eventsByUser.get(uid).push({ id: d.id, data: d.data() });
  });
  const profiles = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));
  const existing = new Set(stampsSnap.docs.map((d) => d.id));
  const holders = new Set(holdersSnap.docs.map((d) => d.id));
  const { getBlog } = makeContentLookups(db, { cache: true });
  const byId = new Map(CATALOGUE.map((s) => [s.id, s]));

  const plan = [];
  for (const metricsDoc of metricsSnap.docs) {
    const uid = metricsDoc.id;
    const earned = await replayEarnedDates(eventsByUser.get(uid) || [], profiles.get(uid) || {}, metricsDoc.data(), getBlog);
    const stamps = [...earned].filter(([stampId]) => !existing.has(stampDocId(uid, stampId)));
    const issue = earned.has(ISSUING_STAMP) && !holders.has(uid);
    if (stamps.length || issue) plan.push({ uid, stamps, issue, earthrise: earned.get(ISSUING_STAMP) });
  }

  const perStamp = {};
  plan.forEach((p) => p.stamps.forEach(([id]) => { perStamp[id] = (perStamp[id] || 0) + 1; }));
  const total = plan.reduce((n, p) => n + p.stamps.length, 0);
  const undated = plan.reduce((n, p) => n + p.stamps.filter(([, s]) => !s.dateKnown).length, 0);
  console.log(`Project: ${key.project_id}   Mode: ${apply ? 'APPLY (writes)' : 'dry run (no writes)'}   Run: ${runId}\n`);
  console.log(`Members read:          ${metricsSnap.size}`);
  console.log(`Members with new stamps: ${plan.length}`);
  console.log(`Stamps to add:         ${total} (${undated} "Earned before launch")`);
  console.log(`Passports to issue:    ${plan.filter((p) => p.issue).length}`);
  console.log('By stamp:', perStamp);
  for (const p of plan.slice(0, 50)) {
    const list = p.stamps.map(([id, s]) => `${id}@${s.dateKnown ? new Date(s.earnedAtMs).toISOString().slice(0, 10) : 'before-launch'}`).join(', ');
    console.log(`  ${short(p.uid)}  ${list}${p.issue ? '  [Passport issued]' : ''}`);
  }
  if (plan.length > 50) console.log(`  …and ${plan.length - 50} more`);

  if (!apply) {
    console.log('\nDry run only: nothing was written. Re-run with --apply to write.');
    return;
  }
  let written = 0;
  for (const p of plan) {
    for (const [stampId, s] of p.stamps) {
      const award = { stampId, defVersion: byId.get(stampId).version, ruleVersion: RULES_VERSION, evidence: s.evidence };
      const earnedAt = s.dateKnown ? Timestamp.fromMillis(s.earnedAtMs) : FieldValue.serverTimestamp();
      if (await createOnce(db.collection('passport_stamps').doc(stampDocId(p.uid, stampId)), stampRecord(p.uid, award, { earnedAt, dateKnown: s.dateKnown, source }))) written++;
    }
    if (p.issue) {
      const e = p.earthrise;
      await createOnce(db.collection('passport_holders').doc(p.uid), {
        userId: p.uid,
        issuedAt: e && e.dateKnown ? Timestamp.fromMillis(e.earnedAtMs) : FieldValue.serverTimestamp(),
        dateKnown: !!(e && e.dateKnown),
        catalogueVersion: CATALOGUE_VERSION,
        source
      });
    }
  }
  console.log(`\nApplied: ${written} stamps written. To undo this run: --undo ${runId}`);
}

(undoRun ? undo(undoRun) : backfill()).catch((error) => {
  console.error(error);
  process.exit(1);
});
