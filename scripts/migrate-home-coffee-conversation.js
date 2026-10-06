#!/usr/bin/env node
/**
 * Migration: move the home page's Coffee Conversation into the 'Home' category
 * ============================================================================
 *
 * Before the 'Home' category existed, the home page showed the newest Coffee
 * Conversation of ANY category (by interviewDate). This moves that one, or
 * the one given with --id, to category 'Home', so the home page and the
 * element pages are maintained separately from now on.
 *
 * Idempotent: if a 'Home' conversation already exists, it reports it and
 * changes nothing. Dry run unless --apply is passed.
 *
 * Usage:
 *   node scripts/migrate-home-coffee-conversation.js <staging|prod>
 *   node scripts/migrate-home-coffee-conversation.js <staging|prod> --apply
 *   node scripts/migrate-home-coffee-conversation.js <staging|prod> --id <docId> --apply
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 * Loads firebase-admin from functions/node_modules, same as prod-launch.js.
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const HOME_CATEGORY = 'Home';
const COLLECTION = 'CoffeeConversations';
const TARGETS = {
  staging: { project: 'wiof-staging', key: 'service-account.json' },
  prod: { project: 'wiof-production', key: 'service-account.prod.json' }
};

const [target, ...rest] = process.argv.slice(2);
const APPLY = rest.includes('--apply');
const idIndex = rest.indexOf('--id');
const explicitId = idIndex >= 0 ? rest[idIndex + 1] : null;

if (!TARGETS[target]) {
  console.error('Usage: node scripts/migrate-home-coffee-conversation.js <staging|prod> [--id <docId>] [--apply]');
  process.exit(1);
}

const { project, key: keyFile } = TARGETS[target];
const keyPath = path.join(__dirname, keyFile);
if (!fs.existsSync(keyPath)) {
  console.error(`ERROR: service account key not found at ${keyPath}`);
  process.exit(1);
}
const key = require(keyPath);
if (key.project_id !== project) {
  console.error(`ERROR: ${keyFile} is for "${key.project_id}", expected "${project}". Refusing to continue.`);
  process.exit(1);
}

const db = getFirestore(initializeApp({ credential: cert(key) }));
const fmtDate = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '—');

async function main() {
  console.log(`\n=== Home Coffee Conversation — ${project} — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} ===\n`);

  const snap = await db.collection(COLLECTION).get();
  const all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.interviewDate || 0) - (b.interviewDate || 0));

  all.forEach((c) => console.log(`  ${c.id} | ${c.category} | ${fmtDate(c.interviewDate)} | ${c.topic}`));
  console.log('');

  const existingHome = all.filter((c) => c.category === HOME_CATEGORY);
  if (existingHome.length) {
    console.log(`Already done: ${existingHome.length} conversation(s) in '${HOME_CATEGORY}':`);
    existingHome.forEach((c) => console.log(`  ${c.id} | ${c.topic}`));
    return;
  }

  const chosen = explicitId ? all.find((c) => c.id === explicitId) : all[all.length - 1];
  if (!chosen) {
    console.error(explicitId ? `ERROR: no ${COLLECTION} doc with id ${explicitId}` : `ERROR: ${COLLECTION} is empty`);
    process.exit(1);
  }

  console.log(`${explicitId ? 'Selected' : 'Currently on the home page (newest)'}: ${chosen.id}`);
  console.log(`  "${chosen.topic}"`);
  console.log(`  category: ${chosen.category} -> ${HOME_CATEGORY}`);
  console.log(`  It will no longer appear on the ${chosen.category} element page.`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  await db.collection(COLLECTION).doc(chosen.id).update({ category: HOME_CATEGORY });
  const after = await db.collection(COLLECTION).doc(chosen.id).get();
  if (after.get('category') !== HOME_CATEGORY) {
    console.error('ERROR: update did not stick — category is now ' + after.get('category'));
    process.exit(1);
  }
  console.log(`\nDone. To undo: set ${COLLECTION}/${chosen.id} category back to '${chosen.category}' (Admin → Coffee Conversations → edit).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
