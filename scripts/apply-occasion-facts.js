/**
 * Adds the draft "Today on WIOF" facts (scripts/data/occasion-facts.json) to
 * the calendar occasions (Envcal) as factStatus 'draft', for admins to
 * check, source and mark reviewed in Admin → Calendar.
 *
 * Each fact is matched to an occasion on the same day by name (exact after
 * tidying, or mostly the same words), so it works on staging and prod,
 * whose occasion IDs differ. It never touches a fact an admin has
 * reviewed, nor a different draft unless --overwrite-drafts. Dry run unless
 * --apply. Afterwards run scripts/rebuild-related-content.js --apply: facts
 * feed the occasion matching too.
 *
 *   node scripts/apply-occasion-facts.js --project staging|prod [--apply] [--overwrite-drafts]
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes('--apply');
const OVERWRITE_DRAFTS = args.includes('--overwrite-drafts');
const PROJECTS = { staging: ['wiof-staging', 'service-account.json'], prod: ['wiof-production', 'service-account.prod.json'] };
const target = option('--project');
if (!PROJECTS[target]) {
  console.error('Usage: node scripts/apply-occasion-facts.js --project staging|prod [--apply] [--overwrite-drafts]');
  process.exit(1);
}
const [projectId, keyFile] = PROJECTS[target];
const key = JSON.parse(fs.readFileSync(path.resolve(option('--key') || path.join(__dirname, keyFile)), 'utf8'));
if (key.project_id !== projectId) {
  console.error(`Key is for ${key.project_id}, not ${projectId}. Refusing to run.`);
  process.exit(1);
}
initializeApp({ credential: cert(key), projectId });
const db = getFirestore();

const tidy = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['day', 'world', 'international', 'national', 'the', 'of', 'for', 'and', 'a', 'to', 'in', 'uk', 'india']);
const words = (s) => new Set(tidy(s).split(' ').filter((w) => w && !STOP.has(w)));
/** Share of the shorter name's words that the other name has too. */
function overlap(a, b) {
  const wa = words(a);
  const wb = words(b);
  const small = wa.size <= wb.size ? wa : wb;
  const big = small === wa ? wb : wa;
  if (!small.size) return 0;
  return [...small].filter((w) => big.has(w)).length / small.size;
}

(async () => {
  const { facts } = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'occasion-facts.json'), 'utf8'));
  const occasions = (await db.collection('Envcal').get()).docs.map((d) => ({ ...d.data(), ref: d.ref, id: d.id }));
  console.log(`${target} (${projectId}): ${occasions.length} occasions, ${facts.length} facts — ${APPLY ? 'APPLY' : 'DRY RUN (add --apply)'}\n`);

  const used = new Set();
  const counts = { add: 0, same: 0, reviewed: 0, otherDraft: 0, unmatched: 0 };
  const writes = [];
  for (const f of facts) {
    const sameDay = occasions.filter((o) => Number(o.month) === f.month - 1 && Number(o.day) === f.day && !used.has(o.id));
    const match = sameDay.find((o) => tidy(o.occasion) === tidy(f.occasion))
      || sameDay.map((o) => ({ o, score: overlap(o.occasion, f.occasion) })).filter((x) => x.score >= 0.5).sort((a, b) => b.score - a.score)[0]?.o;
    if (!match) {
      counts.unmatched++;
      console.log(`NO MATCH   ${f.month}/${f.day} ${f.occasion}`);
      continue;
    }
    used.add(match.id);
    const current = (match.fact || '').trim();
    if (match.factStatus === 'reviewed') {
      counts.reviewed++;
      continue;
    }
    if (current === f.fact) {
      counts.same++;
      continue;
    }
    if (current && !OVERWRITE_DRAFTS) {
      counts.otherDraft++;
      console.log(`KEPT DRAFT ${f.month}/${f.day} ${match.occasion} (has a different draft; --overwrite-drafts replaces it)`);
      continue;
    }
    counts.add++;
    if (tidy(match.occasion) !== tidy(f.occasion)) console.log(`MATCHED    ${f.month}/${f.day} "${f.occasion}" -> "${match.occasion}"`);
    writes.push({ ref: match.ref, data: { fact: f.fact, factStatus: 'draft', factSource: match.factSource || null } });
  }
  occasions.filter((o) => !used.has(o.id) && !(o.fact || '').trim())
    .forEach((o) => console.log(`NO FACT    ${Number(o.month) + 1}/${o.day} ${o.occasion} (not in occasion-facts.json)`));

  if (APPLY) {
    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      writes.slice(i, i + 400).forEach((w) => batch.update(w.ref, w.data));
      await batch.commit();
    }
  }
  console.log(`\n${APPLY ? 'Added' : 'Would add'} ${counts.add} draft facts; ${counts.same} already there; ${counts.reviewed} reviewed (untouched); ${counts.otherDraft} other drafts kept; ${counts.unmatched} facts with no matching occasion.`);
  if (APPLY && counts.add) console.log('Next: node scripts/rebuild-related-content.js --project ' + target + ' (dry run, then --apply): facts feed the occasion matching.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
