/**
 * Adds the draft impact recipes (scripts/data/action-impacts.json) to the
 * Take Action catalogue (actions/{id}.impact) as status 'draft', for admins
 * to check and mark reviewed in Admin → Take Action. Matched by action ID,
 * which is the same slug on staging and prod. It never touches a recipe an
 * admin has reviewed, nor a different draft unless --overwrite-drafts.
 * Dry run unless --apply.
 *
 *   node scripts/apply-action-impacts.js --project staging|prod [--apply] [--overwrite-drafts]
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
  console.error('Usage: node scripts/apply-action-impacts.js --project staging|prod [--apply] [--overwrite-drafts]');
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

const FIELDS = ['measure', 'perUnit', 'inputLabel', 'inputUnit', 'inputDefault', 'inputMax', 'resultLabel', 'assumption', 'source'];
const recipe = (r) => {
  const out = { status: 'draft' };
  for (const f of FIELDS) if (r[f] !== undefined) out[f] = r[f];
  return out;
};
const same = (a, b) => FIELDS.every((f) => (a || {})[f] === (b || {})[f]);

(async () => {
  const { impacts } = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'action-impacts.json'), 'utf8'));
  const snap = await db.collection('actions').get();
  const byId = new Map(snap.docs.map((d) => [d.id, d]));
  console.log(`${target} (${projectId}): ${snap.size} actions, ${impacts.length} recipes — ${APPLY ? 'APPLYING' : 'DRY RUN (add --apply)'}\n`);

  const counts = { add: 0, same: 0, reviewed: 0, otherDraft: 0, missing: 0 };
  const writes = [];
  for (const r of impacts) {
    const doc = byId.get(r.id);
    if (!doc) {
      counts.missing++;
      console.log(`NO ACTION  ${r.id}`);
      continue;
    }
    const current = doc.data().impact || null;
    if (current?.status === 'reviewed') {
      counts.reviewed++;
      continue;
    }
    if (current && same(current, r)) {
      counts.same++;
      continue;
    }
    if (current && !OVERWRITE_DRAFTS) {
      counts.otherDraft++;
      console.log(`KEPT DRAFT ${r.id} (differs; --overwrite-drafts to replace)`);
      continue;
    }
    counts.add++;
    writes.push({ ref: doc.ref, impact: recipe(r) });
    console.log(`ADD        ${r.id}: ${r.measure}, ${r.perUnit} per ${r.inputUnit} (default ${r.inputDefault})`);
  }

  if (APPLY && writes.length) {
    const batch = db.batch();
    writes.forEach((w) => batch.update(w.ref, { impact: w.impact }));
    await batch.commit();
  }
  console.log(`\n${APPLY ? 'Added' : 'Would add'} ${counts.add} draft recipes; ${counts.same} already there; ${counts.reviewed} reviewed (untouched); ${counts.otherDraft} other drafts kept; ${counts.missing} with no matching action.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
