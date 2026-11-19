#!/usr/bin/env node
/**
 * Sync the Planet Passport catalogue (Passport v1)
 * ================================================
 *
 * Copies the display fields of functions/passport-catalogue.js (the single
 * source of the stamp definitions) into passport_stamp_defs/{stampId}, so
 * the app can show stamps not yet earned. The rules the server awards by
 * stay in the code; this collection is display data only.
 *
 * DRY RUN BY DEFAULT: lists the stamps that would be added or changed.
 * --apply writes them. A stamp in Firestore that is no longer in the code is
 * reported, never deleted (retire stamps in the code instead). Safe to re-run.
 *
 * Usage:
 *   node scripts/sync-passport-catalogue.js --project staging            # dry run
 *   node scripts/sync-passport-catalogue.js --project staging --apply
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');
const { CATALOGUE, CATALOGUE_VERSION, validateCatalogue } = require('../functions/passport-catalogue');

const args = process.argv.slice(2);
const target = args[args.indexOf('--project') + 1];
const apply = args.includes('--apply');
const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json' }
};
if (!args.includes('--project') || !PROJECTS[target]) {
  console.error('Usage: node scripts/sync-passport-catalogue.js --project staging|prod [--apply]');
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

/** The fields the app shows (no award logic beyond the rule's type/target/element, for progress hints). */
function displayDoc(s) {
  return {
    id: s.id, version: s.version, status: s.status, family: s.family, order: s.order,
    title: s.title, caption: s.caption, meaning: s.meaning, hint: s.hint, unit: s.unit,
    element: s.element, shape: s.shape, ink: s.ink,
    rule: { type: s.rule.type, target: s.rule.target, ...(s.rule.element ? { element: s.rule.element } : {}) },
    catalogueVersion: CATALOGUE_VERSION
  };
}

async function main() {
  const problems = validateCatalogue(CATALOGUE);
  if (problems.length) {
    console.error('The catalogue is not valid:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  initializeApp({ credential: cert(key) });
  const db = getFirestore();
  console.log(`Project: ${key.project_id}   Mode: ${apply ? 'APPLY (writes)' : 'dry run (no writes)'}   Catalogue v${CATALOGUE_VERSION}, ${CATALOGUE.length} stamps\n`);

  const stored = new Map((await db.collection('passport_stamp_defs').get()).docs.map((d) => [d.id, d.data()]));
  const strip = (d) => { const { syncedAt, ...rest } = d || {}; return JSON.stringify(rest); };
  const added = [];
  const changed = [];
  for (const s of CATALOGUE) {
    const doc = displayDoc(s);
    if (!stored.has(s.id)) added.push(s.id);
    else if (strip(stored.get(s.id)) !== JSON.stringify(doc)) changed.push(s.id);
  }
  const orphans = [...stored.keys()].filter((id) => !CATALOGUE.some((s) => s.id === id));

  console.log(`New:       ${added.length}${added.length ? '  ' + added.join(', ') : ''}`);
  console.log(`Changed:   ${changed.length}${changed.length ? '  ' + changed.join(', ') : ''}`);
  console.log(`Unchanged: ${CATALOGUE.length - added.length - changed.length}`);
  if (orphans.length) console.log(`In Firestore but not in the code (left alone): ${orphans.join(', ')}`);

  if (!apply) {
    console.log('\nDry run only: nothing was written. Re-run with --apply to write.');
    return;
  }
  const batch = db.batch();
  for (const s of CATALOGUE.filter((x) => added.includes(x.id) || changed.includes(x.id))) {
    batch.set(db.collection('passport_stamp_defs').doc(s.id), { ...displayDoc(s), syncedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`\nApplied: ${added.length + changed.length} written.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
