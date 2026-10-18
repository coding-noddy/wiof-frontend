/**
 * Delete orphaned Storage images
 * ==============================
 * Finds images in the content folders that NO Firestore document refers to
 * any more (left behind by replaced images, deleted posts, abandoned
 * uploads) and deletes them, after backing each one up locally.
 *
 * A file counts as in use if its file name appears in ANY string value of
 * ANY document in ANY collection (including subcollections), as-is or
 * URL-encoded. That covers fields holding a name (news.mediaLink,
 * blog.imageName, course.image, ...) and full download URLs (inline blog
 * images, team profile photos). It errs towards keeping files: a stray
 * mention anywhere keeps an image.
 *
 * Never touched: user avatars, anything outside FOLDERS, and anything
 * uploaded in the last 7 days (an admin may be mid-edit; --min-age-days N
 * changes the window).
 *
 * Images of content that still exists but isn't shown publicly (e.g. news
 * older than the home page's newest 30) are NOT orphans: their documents
 * still use them. Remove such content with its own tooling (e.g.
 * scripts/cleanup-old-news.js), which takes the images with it.
 *
 * Usage (dry run unless --apply):
 *   node scripts/delete-orphan-images.js --target staging
 *   node scripts/delete-orphan-images.js --target staging --apply
 *   node scripts/delete-orphan-images.js --target prod --restore scripts/backups/orphan-images-<...>
 * Keys: --staging-key (default scripts/service-account.json),
 *       --prod-key    (default scripts/service-account.prod.json).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');
const { getStorage } = functionsRequire('firebase-admin/storage');

const FOLDERS = [
  'news-images/',
  'blog-images/',
  'course-in-focus-images/',
  'ngo-in-focus-images/',
  'environment-calendar/',
  'about-us/'
];
const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json', option: '--staging-key' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json', option: '--prod-key' }
};

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes('--apply');
// compress-storage-images.js rewrites files, which resets their upload time;
// pass --min-age-days 0 after it when no admin is mid-edit.
const MIN_AGE_MS = Number(option('--min-age-days') ?? 7) * 24 * 60 * 60 * 1000;
const target = PROJECTS[option('--target')];
if (!target) {
  console.error('Usage: node scripts/delete-orphan-images.js --target staging|prod [--apply] [--restore <backupDir>]');
  process.exit(1);
}

function init() {
  const keyPath = path.resolve(option(target.option) || path.join(__dirname, target.key));
  if (!fs.existsSync(keyPath)) {
    console.error(`ERROR: service account key not found at ${keyPath}`);
    process.exit(1);
  }
  const key = require(keyPath);
  if (key.project_id !== target.id) {
    console.error(`ERROR: key is for "${key.project_id}", expected "${target.id}". Refusing to continue.`);
    process.exit(1);
  }
  const app = initializeApp({ credential: cert(key), storageBucket: `${target.id}.appspot.com` });
  return { db: getFirestore(app), bucket: getStorage(app).bucket() };
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

/** Every string value in the database, joined into one searchable text. */
async function collectStrings(db) {
  const parts = [];
  let docs = 0;
  const walk = (value) => {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object' && !(value instanceof Date) && typeof value.toDate !== 'function') {
      Object.values(value).forEach(walk);
    }
  };
  const visit = async (collections) => {
    for (const col of collections) {
      const snap = await col.get();
      for (const doc of snap.docs) {
        docs++;
        walk(doc.data());
        await visit(await doc.ref.listCollections());
      }
    }
  };
  await visit(await db.listCollections());
  return { text: parts.join('\n'), docs };
}

function isReferenced(text, name) {
  const base = name.split('/').pop();
  if (!base) return true;
  return [base, encodeURIComponent(base), encodeURIComponent(name)].some((needle) => text.includes(needle));
}

async function findAndDelete({ db, bucket }) {
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to delete)'} — ${target.id}\n`);
  const { text, docs } = await collectStrings(db);
  console.log(`Scanned ${docs} documents for references.\n`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups', `orphan-images-${target.id}-${stamp}`);
  const manifest = [];
  let kept = 0, keptBytes = 0, orphans = 0, orphanBytes = 0, recent = 0;

  for (const prefix of FOLDERS) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      if (file.name.endsWith('/')) continue;
      const size = Number(file.metadata.size);
      if (Date.now() - new Date(file.metadata.timeCreated).getTime() < MIN_AGE_MS) {
        recent++;
        continue;
      }
      if (isReferenced(text, file.name)) {
        kept++;
        keptBytes += size;
        continue;
      }
      orphans++;
      orphanBytes += size;
      console.log(`  orphan  ${file.name.padEnd(72)} ${kb(size).padStart(9)}`);
      if (APPLY) {
        try {
          const [data] = await file.download();
          const backupPath = path.join(backupDir, file.name);
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
          fs.writeFileSync(backupPath, data);
          manifest.push({ name: file.name, contentType: file.metadata.contentType, cacheControl: file.metadata.cacheControl || null, metadata: file.metadata.metadata || {} });
          // Written before each delete, so a run that stops part-way can still be restored.
          fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({ project: target.id, files: manifest }, null, 2));
          await file.delete();
        } catch (e) {
          console.error(`  FAILED ${file.name}: ${e.message}`);
        }
      }
    }
  }
  console.log(`\nIn use: ${kept} files (${kb(keptBytes)}). Orphaned: ${orphans} files (${kb(orphanBytes)}). Skipped as recent: ${recent} (younger than ${MIN_AGE_MS / 86400000} days).`);
  if (APPLY && manifest.length) {
    console.log(`Deleted ${manifest.length}. Backups in ${backupDir}`);
    console.log(`Undo: node scripts/delete-orphan-images.js --target ${option('--target')} --restore "${backupDir}"`);
  }
}

async function restore({ bucket }, backupDir) {
  const { project, files } = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  if (project !== target.id) {
    console.error(`ERROR: backup is for "${project}", not "${target.id}".`);
    process.exit(1);
  }
  for (const f of files) {
    await bucket.file(f.name).save(fs.readFileSync(path.join(backupDir, f.name)), {
      resumable: false,
      metadata: { contentType: f.contentType, cacheControl: f.cacheControl || undefined, metadata: f.metadata }
    });
    console.log(`  restored ${f.name}`);
  }
  console.log(`\nRestored ${files.length} files in ${target.id}.`);
}

(async () => {
  const ctx = init();
  const restoreDir = option('--restore');
  if (restoreDir) await restore(ctx, path.resolve(restoreDir));
  else await findAndDelete(ctx);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
