#!/usr/bin/env node
/**
 * Rebuild automatic related content (Phase 2 step 4)
 * ===================================================
 *
 * Runs functions/related-content.js, the same code the onBlogWritten and
 * onActionWritten triggers run, over every blog and active action, and
 * stores each item's best matches in related_auto/{type}_{id} for
 * "Explore next". The triggers keep it up to date after an admin edit; this
 * script is for the first build and for checking the matches.
 *
 * DRY RUN BY DEFAULT: prints each item's matches and writes nothing.
 * --apply writes them. Safe to re-run.
 *
 * Usage:
 *   node scripts/rebuild-related-content.js --project staging            # dry run
 *   node scripts/rebuild-related-content.js --project staging --apply
 *   node scripts/rebuild-related-content.js --project prod               # dry run
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

// firebase-admin is installed for the functions, not at the repo root.
const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');
const { rebuildRelatedContent } = require('../functions/related-content');

const args = process.argv.slice(2);
const target = args[args.indexOf('--project') + 1];
const apply = args.includes('--apply');
const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json' }
};
if (!args.includes('--project') || !PROJECTS[target]) {
  console.error('Usage: node scripts/rebuild-related-content.js --project staging|prod [--apply]');
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

async function main() {
  console.log(`Project: ${key.project_id}   Mode: ${apply ? 'APPLY (writes)' : 'dry run (no writes)'}\n`);
  const db = getFirestore();
  const report = await rebuildRelatedContent(db, { apply, FieldValue });

  // Titles, so the matches can be checked by eye.
  const [blogs, actions] = await Promise.all([db.collection('Blogs').get(), db.collection('actions').get()]);
  const title = new Map([
    ...blogs.docs.map((d) => [`blog_${d.id}`, d.get('title')]),
    ...actions.docs.map((d) => [`action_${d.id}`, d.get('title')])
  ]);
  const name = (type, id) => String(title.get(`${type}_${id}`) || id).trim().slice(0, 40);
  for (const [docId, lists] of report.related) {
    const [type, ...rest] = docId.split('_');
    console.log(`${type === 'blog' ? 'STORY ' : 'ACTION'} ${name(type, rest.join('_'))}`);
    console.log(`   stories: ${lists.blogs.map((b) => `${name('blog', b.id)} (${b.score})`).join('; ') || '-'}`);
    console.log(`   actions: ${lists.actions.map((a) => `${name('action', a.id)} (${a.score})`).join('; ') || '-'}`);
  }
  console.log(`\nItems: ${report.items}   Lists to write: ${report.written}   Lists to delete: ${report.deleted}`);
  console.log(apply ? '\nApplied.' : '\nDry run only: nothing was written. Re-run with --apply to write.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
