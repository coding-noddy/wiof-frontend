/**
 * Optimize blogs
 * ==============
 * Two fixes for the blog pages, both safe to re-run:
 *
 * 1. Embedded images out of blog bodies. Some blogs have images pasted into
 *    the editor as base64 `data:image/...` URLs, stored inside the Blogs doc
 *    itself (one staging blog was 801 KB, close to Firestore's 1 MB doc
 *    limit). Each one is scaled to at most 1600px, re-encoded as WebP and
 *    uploaded to blog-images/inline/ with a download token, and the blog's
 *    `content` (and `contentDelta`, if it has the same image) is rewritten to
 *    point at it. The original content/contentDelta of every changed blog is
 *    backed up first to scripts/backups/blog-content-<project>-<timestamp>/.
 *
 * 2. blog_summaries backfill. Writes the card-sized blog_summaries/{blogId}
 *    doc for every blog (see functions/blog-summary.js) and deletes summaries
 *    whose blog no longer exists. The onBlogWritten function keeps them in
 *    sync after that.
 *
 * Usage (dry run unless --apply):
 *   node scripts/optimize-blogs.js --target staging
 *   node scripts/optimize-blogs.js --target staging --apply
 *   node scripts/optimize-blogs.js --target prod --apply
 *   node scripts/optimize-blogs.js --target prod --restore scripts/backups/blog-content-<...>
 *
 * Keys: --staging-key (default scripts/service-account.json),
 *       --prod-key    (default scripts/service-account.prod.json).
 * Needs `sharp` in scripts/ (npm install --prefix scripts).
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');
const sharp = require('sharp');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');
const { getStorage } = functionsRequire('firebase-admin/storage');
const { BLOG_SUMMARIES, buildBlogSummary } = require(path.join(REPO, 'functions', 'blog-summary.js'));

const BLOGS = 'Blogs';
const INLINE_FOLDER = 'blog-images/inline';
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const CACHE_CONTROL = 'public, max-age=604800';
const DATA_URL = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g;
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
  console.error('Usage: node scripts/optimize-blogs.js --target staging|prod [--apply] [--restore <backupDir>]');
  process.exit(1);
}

function connect() {
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

/** Every distinct data: image URL in a blog's content and contentDelta. */
function embeddedImages(blog) {
  const found = new Set();
  (String(blog.content || '').match(DATA_URL) || []).forEach((u) => found.add(u));
  const ops = blog.contentDelta && Array.isArray(blog.contentDelta.ops) ? blog.contentDelta.ops : [];
  ops.forEach((op) => {
    const image = op && op.insert && op.insert.image;
    if (typeof image === 'string' && image.startsWith('data:image/')) found.add(image);
  });
  return [...found];
}

/** Uploads one data: URL as a WebP (or as-is if it can't be decoded) and returns its download URL. */
async function uploadDataUrl(bucket, dataUrl, blogId, n) {
  const [, mime, base64] = dataUrl.match(/^data:(image\/[^;]+);base64,([\s\S]*)$/);
  const original = Buffer.from(base64.replace(/\s/g, ''), 'base64');
  let body = original;
  let contentType = mime;
  let ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, '');
  if (!/gif|svg/.test(mime)) {
    try {
      const image = sharp(original, { failOn: 'none' }).rotate();
      const { width } = await image.metadata();
      const webp = await image
        .resize({ width: Math.min(width || MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      if (webp.length < original.length) {
        body = webp;
        contentType = 'image/webp';
        ext = 'webp';
      }
    } catch (e) {
      console.warn(`    could not re-encode image ${n} of ${blogId}, uploading as-is: ${e.message}`);
    }
  }
  const objectPath = `${INLINE_FOLDER}/blog_inline_${blogId}_${n}_${Date.now()}.${ext}`;
  const token = crypto.randomUUID();
  if (APPLY) {
    await bucket.file(objectPath).save(body, {
      resumable: false,
      metadata: { contentType, cacheControl: CACHE_CONTROL, metadata: { firebaseStorageDownloadTokens: token } }
    });
  }
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  return { url, before: original.length, after: body.length };
}

async function moveEmbeddedImages(db, bucket, stamp) {
  const backupDir = path.join(__dirname, 'backups', `blog-content-${target.id}-${stamp}`);
  const manifest = [];
  const failed = [];
  let before = 0;
  let after = 0;
  let images = 0;

  console.log('Step 1: embedded images in blog bodies');
  const snapshot = await db.collection(BLOGS).get();
  for (const doc of snapshot.docs) {
    const blog = doc.data();
    const dataUrls = embeddedImages(blog);
    if (!dataUrls.length) continue;
    try {
      let content = String(blog.content || '');
      const contentDelta = blog.contentDelta ? JSON.parse(JSON.stringify(blog.contentDelta)) : null;
      for (let i = 0; i < dataUrls.length; i++) {
        const { url, before: b, after: a } = await uploadDataUrl(bucket, dataUrls[i], doc.id, i + 1);
        before += b;
        after += a;
        images++;
        content = content.split(dataUrls[i]).join(url);
        (contentDelta && Array.isArray(contentDelta.ops) ? contentDelta.ops : []).forEach((op) => {
          if (op && op.insert && op.insert.image === dataUrls[i]) op.insert.image = url;
        });
        console.log(`  ${doc.id} image ${i + 1}: ${kb(b)} -> ${kb(a)}`);
      }
      console.log(`  ${doc.id} "${String(blog.title || '').slice(0, 50)}": doc ${kb(String(blog.content || '').length)} -> ${kb(content.length)}`);
      if (APPLY) {
        fs.mkdirSync(backupDir, { recursive: true });
        manifest.push({ id: doc.id, content: blog.content || null, contentDelta: blog.contentDelta || null });
        // Written before every update, so a run that stops part-way can still be restored.
        fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({ project: target.id, blogs: manifest }, null, 2));
        await doc.ref.update({ content, contentDelta });
      }
    } catch (e) {
      failed.push(doc.id);
      console.error(`  FAILED ${doc.id}: ${e.message}`);
    }
  }

  console.log(`  ${images} embedded images in ${manifest.length || (APPLY ? 0 : '(dry run)')} blogs, ${kb(before)} -> ${kb(after)}, ${failed.length} failed.`);
  if (APPLY && manifest.length) {
    console.log(`  Original content backed up to ${backupDir}`);
    console.log(`  Undo: node scripts/optimize-blogs.js --target ${option('--target')} --restore "${backupDir}"`);
  }
  return failed.length;
}

async function backfillSummaries(db, bucket) {
  console.log('\nStep 2: blog_summaries');
  // Read again so the summaries reflect step 1's rewritten content.
  const blogs = await db.collection(BLOGS).get();
  const summaries = await db.collection(BLOG_SUMMARIES).get();
  const blogIds = new Set(blogs.docs.map((d) => d.id));
  let withUrl = 0;
  const failed = [];

  for (const doc of blogs.docs) {
    try {
      const summary = await buildBlogSummary(doc.data(), bucket);
      if (summary.imageUrl) withUrl++;
      if (APPLY) await db.collection(BLOG_SUMMARIES).doc(doc.id).set(summary);
    } catch (e) {
      failed.push(doc.id);
      console.error(`  FAILED ${doc.id}: ${e.message}`);
    }
  }
  const stale = summaries.docs.filter((d) => !blogIds.has(d.id));
  if (APPLY) await Promise.all(stale.map((d) => d.ref.delete()));

  console.log(`  ${blogs.size} summaries ${APPLY ? 'written' : 'to write'} (${withUrl} with a cover image URL), ${stale.length} stale ${APPLY ? 'deleted' : 'to delete'}, ${failed.length} failed.`);
  if (withUrl < blogs.size) {
    console.log('  Blogs without a cover URL (missing image or token) fall back to getDownloadURL() on the client.');
  }
  return failed.length;
}

async function restore(db, backupDir) {
  const { project, blogs } = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  if (project !== target.id) {
    console.error(`ERROR: backup is for "${project}", not "${target.id}".`);
    process.exit(1);
  }
  for (const b of blogs) {
    await db.collection(BLOGS).doc(b.id).update({ content: b.content, contentDelta: b.contentDelta });
    console.log(`  restored ${b.id}`);
  }
  console.log(`\nRestored the original content of ${blogs.length} blogs in ${target.id}. The uploaded inline images were left in Storage.`);
}

(async () => {
  const { db, bucket } = connect();
  const restoreDir = option('--restore');
  if (restoreDir) {
    if (!APPLY) {
      console.log(`DRY RUN: would restore blogs from ${restoreDir}. Pass --apply to write.`);
      return;
    }
    await restore(db, path.resolve(restoreDir));
    return;
  }
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'} — ${target.id}\n`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const failures = (await moveEmbeddedImages(db, bucket, stamp)) + (await backfillSummaries(db, bucket));
  if (failures) {
    console.log('\nSome blogs failed; they are unchanged. Re-running the script retries them.');
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
