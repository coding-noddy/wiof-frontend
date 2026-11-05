/**
 * Read-only report of the topic names in use, to build the shared topic
 * list (docs/TOPICS_AND_TAGS.md): blog sub-categories per element, and the
 * action categories and tags, with counts and near-duplicates.
 *
 *   node scripts/report-topics.js --project staging|prod
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const args = process.argv.slice(2);
const PROJECTS = { staging: ['wiof-staging', 'service-account.json'], prod: ['wiof-production', 'service-account.prod.json'] };
const target = args[args.indexOf('--project') + 1];
if (!PROJECTS[target]) {
  console.error('Usage: node scripts/report-topics.js --project staging|prod');
  process.exit(1);
}
const [projectId, keyFile] = PROJECTS[target];
const key = JSON.parse(fs.readFileSync(path.join(__dirname, keyFile), 'utf8'));
if (key.project_id !== projectId) {
  console.error(`Key is for ${key.project_id}, not ${projectId}. Refusing to run.`);
  process.exit(1);
}
initializeApp({ credential: cert(key), projectId });
const db = getFirestore();

const tidy = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const count = (values) => {
  const m = new Map();
  values.filter((v) => String(v || '').trim()).forEach((v) => m.set(v.trim(), (m.get(v.trim()) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
/** Names that differ only in case, spacing or punctuation. */
const nearDuplicates = (entries) => {
  const groups = new Map();
  entries.forEach(([name]) => groups.set(tidy(name), [...(groups.get(tidy(name)) || []), name]));
  return [...groups.values()].filter((g) => g.length > 1);
};

(async () => {
  console.log(`Topics in use — ${projectId}\n`);
  const blogs = (await db.collection('Blogs').get()).docs.map((d) => d.data());
  const byElement = new Map();
  blogs.forEach((b) => byElement.set(b.category || '(none)', [...(byElement.get(b.category || '(none)') || []), b.subCategory]));
  console.log(`Stories (${blogs.length}): sub-category by element`);
  for (const [element, subs] of [...byElement.entries()].sort()) {
    const entries = count(subs);
    console.log(`  ${element} (${subs.length}): ${entries.map(([n, c]) => `${n} ${c}`).join(' | ') || '(no sub-categories)'}`);
    const missing = subs.filter((s) => !String(s || '').trim()).length;
    if (missing) console.log(`    ${missing} with no sub-category`);
    nearDuplicates(entries).forEach((g) => console.log(`    NEAR-DUPLICATES: ${g.join(' / ')}`));
  }

  const actions = (await db.collection('actions').get()).docs.map((d) => d.data());
  const cats = count(actions.flatMap((a) => a.categories || a.categoryIds || []));
  const tags = count(actions.flatMap((a) => a.tags || []));
  console.log(`\nActions (${actions.length})`);
  console.log(`  categories: ${cats.map(([n, c]) => `${n} ${c}`).join(' | ') || '(none)'}`);
  console.log(`  tags: ${tags.map(([n, c]) => `${n} ${c}`).join(' | ') || '(none)'}`);
  nearDuplicates(tags).forEach((g) => console.log(`    NEAR-DUPLICATES: ${g.join(' / ')}`));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
