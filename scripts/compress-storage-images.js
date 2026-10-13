/**
 * Compress existing Storage images
 * ================================
 * Admins uploaded full-size originals (often 1–10 MB PNGs) that every visitor
 * downloads in full. New uploads are compressed in the browser now
 * (src/app/util/image-compression.util.ts); this script does the same for the
 * images already in Storage.
 *
 * For each image under the content folders below:
 *   - scaled down to at most 1600px wide and re-encoded as WebP, in place
 *     (same object path), only when that saves at least 20%;
 *   - the object's download token is KEPT, so every saved download URL
 *     (including inline images inside blog posts) keeps working;
 *   - Cache-Control is set to 7 days (it was `private, max-age=0`, so
 *     browsers re-downloaded every image on every visit). Images that aren't
 *     recompressed still get the new Cache-Control.
 * The original of every recompressed image is backed up first to
 * scripts/backups/storage-images-<project>-<timestamp>/ with a manifest.
 * GIF/SVG, user avatars and anything else outside FOLDERS are left alone.
 *
 * Usage (dry run unless --apply):
 *   node scripts/compress-storage-images.js --target staging
 *   node scripts/compress-storage-images.js --target staging --apply
 *   node scripts/compress-storage-images.js --target prod --apply
 *   node scripts/compress-storage-images.js --target prod --restore scripts/backups/storage-images-<...>
 *
 * Keys: --staging-key (default scripts/service-account.json),
 *       --prod-key    (default scripts/service-account.prod.json).
 * Needs `sharp` in scripts/ (npm install --prefix scripts).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const sharp = require('sharp');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getStorage } = functionsRequire('firebase-admin/storage');

const FOLDERS = [
  'news-images/',
  'blog-images/',
  'course-in-focus-images/',
  'ngo-in-focus-images/',
  'environment-calendar/',
  'about-us/'
];
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const MIN_SAVING = 0.2;
const CACHE_CONTROL = 'public, max-age=604800';
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
const target = PROJECTS[option('--target')];
if (!target) {
  console.error('Usage: node scripts/compress-storage-images.js --target staging|prod [--apply] [--restore <backupDir>]');
  process.exit(1);
}

function bucketFor() {
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
  return getStorage(app).bucket();
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function compressAll(bucket) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups', `storage-images-${target.id}-${stamp}`);
  const manifest = [];
  let before = 0;
  let after = 0;
  let recompressed = 0;
  let cacheOnly = 0;
  const failed = [];

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} — ${target.id}\n`);

  const processFile = async (file) => {
    const meta = file.metadata;
    const type = meta.contentType || '';
    if (!type.startsWith('image/') || /gif|svg/.test(type) || file.name.endsWith('/')) {
      return;
    }
    const size = Number(meta.size);
    before += size;

    const [original] = await file.download();
    let output = null;
    try {
      const image = sharp(original, { failOn: 'none' }).rotate();
      const { width } = await image.metadata();
      output = await image
        .resize({ width: Math.min(width || MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      console.warn(`  skip ${file.name}: ${e.message}`);
    }

    const worthIt = output && output.length <= size * (1 - MIN_SAVING);
    const custom = meta.metadata || {};
    if (worthIt) {
      after += output.length;
      recompressed++;
      console.log(`  ${file.name.padEnd(70)} ${kb(size).padStart(9)} -> ${kb(output.length).padStart(8)}`);
      if (APPLY) {
        const backupPath = path.join(backupDir, file.name);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.writeFileSync(backupPath, original);
        manifest.push({ name: file.name, contentType: type, cacheControl: meta.cacheControl || null, size, metadata: custom });
        // Written after every file, so a run that stops part-way can still be restored.
        fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({ project: target.id, files: manifest }, null, 2));
        await file.save(output, {
          resumable: false,
          metadata: {
            contentType: 'image/webp',
            cacheControl: CACHE_CONTROL,
            // Keeps firebaseStorageDownloadTokens, so saved download URLs stay valid.
            metadata: custom
          }
        });
      }
    } else {
      after += size;
      if (meta.cacheControl !== CACHE_CONTROL) {
        cacheOnly++;
        if (APPLY) {
          await file.setMetadata({ cacheControl: CACHE_CONTROL });
        }
      }
    }
  };

  for (const prefix of FOLDERS) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      try {
        await processFile(file);
      } catch (e) {
        // One failing file (network blip, permissions, rate limit) is reported
        // and skipped instead of stopping the whole run.
        failed.push(file.name);
        console.error(`  FAILED ${file.name}: ${e.message}`);
      }
    }
  }

  console.log(`\n${recompressed} recompressed, ${cacheOnly} cache-only updates, ${failed.length} failed.`);
  if (failed.length) {
    console.log('Failed files are unchanged unless listed in the backup manifest; re-running the script retries them.');
  }
  console.log(`Total ${kb(before)} -> ${kb(after)} (${before ? Math.round((1 - after / before) * 100) : 0}% smaller).`);
  if (APPLY && manifest.length) {
    console.log(`Originals backed up to ${backupDir}`);
    console.log(`Undo: node scripts/compress-storage-images.js --target ${option('--target')} --restore "${backupDir}"`);
  }
}

async function restore(bucket, backupDir) {
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
  console.log(`\nRestored ${files.length} originals in ${target.id}.`);
}

(async () => {
  const bucket = bucketFor();
  const restoreDir = option('--restore');
  if (restoreDir) {
    await restore(bucket, path.resolve(restoreDir));
  } else {
    await compressAll(bucket);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
