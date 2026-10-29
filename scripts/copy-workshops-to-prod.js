/**
 * Copy workshops from staging to prod
 * ===================================
 * Copies the `workshops` docs and their posters from wiof-staging to
 * wiof-production, keeping each doc ID, so a workshop set up and checked on
 * staging can go live without re-entering it in Admin → Workshops.
 * Each poster is copied to prod's own Storage with a new download token.
 * Re-running is safe: a workshop that already exists on prod is overwritten
 * with the staging version.
 *
 * Usage (dry run unless --apply):
 *   node scripts/copy-workshops-to-prod.js
 *   node scripts/copy-workshops-to-prod.js --apply
 *   node scripts/copy-workshops-to-prod.js --apply --only <docId>,<docId>
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');
const { getStorage } = functionsRequire('firebase-admin/storage');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyIndex = args.indexOf('--only');
const ONLY = onlyIndex >= 0 ? new Set(args[onlyIndex + 1].split(',')) : null;
const CACHE_CONTROL = 'public, max-age=604800';

function connect(name, keyFile, projectId) {
  const keyPath = path.join(__dirname, keyFile);
  if (!fs.existsSync(keyPath)) {
    console.error(`ERROR: ${keyFile} not found in scripts/.`);
    process.exit(1);
  }
  const key = require(keyPath);
  if (key.project_id !== projectId) {
    console.error(`ERROR: ${keyFile} is for "${key.project_id}", expected "${projectId}". Refusing to continue.`);
    process.exit(1);
  }
  const app = initializeApp({ credential: cert(key), storageBucket: `${projectId}.appspot.com` }, name);
  return { db: getFirestore(app), bucket: getStorage(app).bucket() };
}

(async () => {
  const staging = connect('staging', 'service-account.json', 'wiof-staging');
  const prod = connect('prod', 'service-account.prod.json', 'wiof-production');

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} — staging → wiof-production\n`);
  const snapshot = await staging.db.collection('workshops').get();
  const docs = snapshot.docs.filter((d) => !ONLY || ONLY.has(d.id));
  if (!docs.length) {
    console.log('No workshops to copy.');
    return;
  }

  for (const doc of docs) {
    const w = doc.data();
    const label = `${doc.id}  "${w.title}"  ${w.eventDate} ${w.startTime || ''}-${w.endTime || ''}  ${w.published ? 'published' : 'draft'}`;
    if (!APPLY) {
      console.log(`  would copy ${label}`);
      continue;
    }
    const [poster] = await staging.bucket.file(`workshop-posters/${w.posterName}`).download();
    const [meta] = await staging.bucket.file(`workshop-posters/${w.posterName}`).getMetadata();
    const token = crypto.randomUUID();
    await prod.bucket.file(`workshop-posters/${w.posterName}`).save(poster, {
      resumable: false,
      metadata: {
        contentType: meta.contentType || 'image/webp',
        cacheControl: CACHE_CONTROL,
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    const posterUrl = `https://firebasestorage.googleapis.com/v0/b/${prod.bucket.name}/o/${encodeURIComponent(`workshop-posters/${w.posterName}`)}?alt=media&token=${token}`;
    await prod.db.collection('workshops').doc(doc.id).set({
      ...w,
      posterUrl,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'copy-workshops-to-prod.js'
    });
    console.log(`  copied ${label}  (poster ${Math.round(poster.length / 1024)} KB)`);
  }
  console.log(`\n${docs.length} workshop(s) ${APPLY ? 'copied' : 'to copy'}.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
