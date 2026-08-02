/**
 * Cleanup Old Breaking News
 * ==========================
 * Archives news older than X days to a local JSON file, then deletes from Firestore.
 * Also deletes associated images from Firebase Storage.
 * 
 * Usage:
 *   node scripts/cleanup-old-news.js                    (both staging + production)
 *   node scripts/cleanup-old-news.js --target staging   (staging only)
 *   node scripts/cleanup-old-news.js --target prod      (production only)
 *   node scripts/cleanup-old-news.js --dry-run          (preview only, no delete)
 * 
 * Config (.env):
 *   NEWS_MAX_AGE_DAYS=365   (delete news older than this many days)
 * 
 * Archives are saved to: scripts/backups/news_backup_<project>_<date>.json
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getStorage, ref, deleteObject } = require('firebase/storage');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: __dirname + '/.env' });

// Firebase configs
const configs = {
  staging: {
    apiKey: "AIzaSyBru9kG2e19cnaeRwnGIp0zT9Op1DOcvWM",
    authDomain: "wiof-staging.firebaseapp.com",
    projectId: "wiof-staging",
    storageBucket: "wiof-staging.appspot.com"
  },
  prod: {
    apiKey: "AIzaSyAYH1Y5nG3RtKyYqfr0bgDluxAwczAoyRo",
    authDomain: "wiof-production.firebaseapp.com",
    projectId: "wiof-production",
    storageBucket: "wiof-production.appspot.com"
  }
};

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const targetArg = targetIdx !== -1 ? args[targetIdx + 1] : null;
const targets = targetArg ? [targetArg] : ['staging', 'prod'];

// Config from .env
const maxAgeDays = parseInt(process.env.NEWS_MAX_AGE_DAYS || '365', 10);
const cutoffDate = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

function askPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('  Enter password: ', answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function ensureBackupDir() {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function formatDate(timestamp) {
  return new Date(timestamp).toISOString().split('T')[0];
}

async function processTarget(target, password) {
  const config = configs[target];
  const projectLabel = target === 'prod' ? 'wiof-production' : 'wiof-staging';

  console.log('');
  console.log(`  --- ${projectLabel} ---`);

  // Init Firebase
  const app = initializeApp(config, `cleanup-${target}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // Authenticate
  const email = process.env.FIREBASE_EMAIL;
  process.stdout.write(`  Authenticating... `);
  await signInWithEmailAndPassword(auth, email, password);
  console.log('OK');

  // Fetch all news
  process.stdout.write(`  Fetching news... `);
  const snapshot = await getDocs(collection(db, 'News'));
  const allNews = [];
  snapshot.forEach(d => {
    allNews.push({ id: d.id, ...d.data() });
  });
  console.log(`${allNews.length} total`);

  // Filter old news
  const oldNews = allNews.filter(n => {
    if (!n.date) return false;
    return n.date < cutoffDate;
  });

  const cutoffStr = formatDate(cutoffDate);
  console.log(`  Old news (before ${cutoffStr}): ${oldNews.length} items`);

  if (oldNews.length === 0) {
    console.log('  Nothing to clean up!');
    return { target, archived: 0, deleted: 0 };
  }

  // Sort by date for readable archive
  oldNews.sort((a, b) => a.date - b.date);

  // Archive to file
  const backupDir = ensureBackupDir();
  const today = new Date().toISOString().split('T')[0];
  const backupFile = path.join(backupDir, `news_backup_${target}_${today}.json`);

  const archiveData = {
    metadata: {
      project: projectLabel,
      exportDate: new Date().toISOString(),
      cutoffDate: new Date(cutoffDate).toISOString(),
      maxAgeDays: maxAgeDays,
      totalArchived: oldNews.length,
      dateRange: {
        oldest: formatDate(oldNews[0].date),
        newest: formatDate(oldNews[oldNews.length - 1].date)
      }
    },
    news: oldNews
  };

  fs.writeFileSync(backupFile, JSON.stringify(archiveData, null, 2), 'utf-8');
  console.log(`  Archived to: ${path.relative(process.cwd(), backupFile)}`);

  if (dryRun) {
    console.log('  [DRY RUN] Would delete:');
    oldNews.forEach(n => {
      console.log(`    - ${n.headline || '(no headline)'} (${formatDate(n.date)})`);
    });
    return { target, archived: oldNews.length, deleted: 0, dryRun: true };
  }

  // Delete from Firestore + Storage
  let deleted = 0;
  let imagesDeleted = 0;

  for (const news of oldNews) {
    // Delete associated image from Storage
    if (news.mediaType === 'image' && news.mediaLink) {
      try {
        const imageRef = ref(storage, `news-images/${news.mediaLink}`);
        await deleteObject(imageRef);
        imagesDeleted++;
      } catch (err) {
        // Image might already be deleted or not exist
        if (!err.message.includes('not-found') && !err.message.includes('object-not-found')) {
          console.log(`    [warn] Could not delete image ${news.mediaLink}: ${err.message}`);
        }
      }
    }

    // Delete document from Firestore
    await deleteDoc(doc(db, 'News', news.id));
    deleted++;
  }

  console.log(`  Deleted: ${deleted} documents, ${imagesDeleted} images`);
  return { target, archived: oldNews.length, deleted, imagesDeleted };
}

async function main() {
  const email = process.env.FIREBASE_EMAIL;

  console.log('');
  console.log('======================================================');
  console.log('   WIOF: Cleanup Old Breaking News');
  console.log('======================================================');
  console.log('');
  console.log(`  Max age:    ${maxAgeDays} days`);
  console.log(`  Cutoff:     ${formatDate(cutoffDate)}`);
  console.log(`  Targets:    ${targets.join(', ')}`);
  console.log(`  Dry run:    ${dryRun ? 'YES (no deletions)' : 'no'}`);
  console.log(`  User:       ${email}`);
  console.log('');

  const password = await askPassword();

  const results = [];
  for (const target of targets) {
    try {
      const result = await processTarget(target, password);
      results.push(result);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ target, error: err.message });
    }
  }

  console.log('');
  console.log('  ─────────────────────────────────────');
  console.log('  Summary:');
  results.forEach(r => {
    if (r.error) {
      console.log(`    ${r.target}: FAILED - ${r.error}`);
    } else if (r.dryRun) {
      console.log(`    ${r.target}: ${r.archived} items would be deleted (dry run)`);
    } else {
      console.log(`    ${r.target}: ${r.deleted} docs + ${r.imagesDeleted || 0} images deleted (archived first)`);
    }
  });
  console.log('');
  console.log('  Done!');
  console.log('');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
