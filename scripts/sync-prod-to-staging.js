/**
 * Sync Production Firestore → Staging Firestore
 * ================================================
 * Reads all documents from production and writes them to staging.
 * Uses Firebase client SDK with email/password auth (same as migrate script).
 * 
 * Usage:
 *   node scripts/sync-prod-to-staging.js
 *   node scripts/sync-prod-to-staging.js --collections Blogs,Polls
 *   node scripts/sync-prod-to-staging.js --clear
 * 
 * Requires:
 *   - .env file with FIREBASE_USER_EMAIL
 *   - Password prompted at runtime
 *   - npm install firebase dotenv (in scripts folder)
 */

const { initializeApp: initApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const readline = require('readline');
require('dotenv').config({ path: __dirname + '/.env' });

// Firebase configs
const prodConfig = {
  apiKey: "AIzaSyAYH1Y5nG3RtKyYqfr0bgDluxAwczAoyRo",
  authDomain: "wiof-production.firebaseapp.com",
  projectId: "wiof-production",
  storageBucket: "wiof-production.appspot.com"
};

const stagingConfig = {
  apiKey: "AIzaSyBru9kG2e19cnaeRwnGIp0zT9Op1DOcvWM",
  authDomain: "wiof-staging.firebaseapp.com",
  projectId: "wiof-staging",
  storageBucket: "wiof-staging.appspot.com"
};

// Parse CLI args
const args = process.argv.slice(2);
const clearFirst = args.includes('--clear');
const collectionsArgIdx = args.indexOf('--collections');
const specificCollections = collectionsArgIdx !== -1
  ? args[collectionsArgIdx + 1].split(',').map(c => c.trim())
  : null;

// All known WIOF collections
const ALL_COLLECTIONS = [
  'Blogs',
  'Polls',
  'Poll',
  'News',
  'Envcal',
  'CoffeeConversations',
  'InFocus',
  'NGOinFocus',
  'CourseInFocus',
  'AboutUs',
  'AboutUsProfiles',
  'Subscriptions'
];

function askPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('  Enter password: ', answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getAllDocs(db, collName) {
  const snapshot = await getDocs(collection(db, collName));
  const docs = [];
  snapshot.forEach(d => {
    docs.push({ id: d.id, data: d.data() });
  });
  return docs;
}

async function deleteAllDocs(db, collName) {
  const snapshot = await getDocs(collection(db, collName));
  let count = 0;
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, collName, d.id));
    count++;
  }
  return count;
}

async function writeDocs(db, collName, docs) {
  let written = 0;
  for (const d of docs) {
    await setDoc(doc(db, collName, d.id), d.data);
    written++;
  }
  return written;
}

async function syncCollection(prodDb, stagingDb, collName) {
  process.stdout.write(`  ${collName}: `);

  const docs = await getAllDocs(prodDb, collName);

  if (docs.length === 0) {
    console.log('empty (skipped)');
    return { collection: collName, count: 0, status: 'empty' };
  }

  if (clearFirst) {
    const deleted = await deleteAllDocs(stagingDb, collName);
    if (deleted > 0) {
      process.stdout.write(`cleared ${deleted} → `);
    }
  }

  const written = await writeDocs(stagingDb, collName, docs);
  console.log(`${written} docs synced`);

  return { collection: collName, count: written, status: 'synced' };
}

async function main() {
  const collections = specificCollections || ALL_COLLECTIONS;
  const email = process.env.FIREBASE_EMAIL || process.env.FIREBASE_USER_EMAIL;

  console.log('');
  console.log('======================================================');
  console.log('   WIOF: Sync Production --> Staging (Firestore)');
  console.log('======================================================');
  console.log('');
  console.log(`  Source:      wiof-production`);
  console.log(`  Destination: wiof-staging`);
  console.log(`  Collections: ${collections.join(', ')}`);
  console.log(`  Clear first: ${clearFirst ? 'YES' : 'no'}`);
  console.log(`  User:        ${email}`);
  console.log('');

  const password = await askPassword();
  console.log('');

  // Init both apps
  const prodApp = initApp(prodConfig, 'prod');
  const stagingApp = initApp(stagingConfig, 'staging');

  // Auth to both
  process.stdout.write('  Authenticating to production... ');
  const prodAuth = getAuth(prodApp);
  await signInWithEmailAndPassword(prodAuth, email, password);
  console.log('OK');

  process.stdout.write('  Authenticating to staging... ');
  const stagingAuth = getAuth(stagingApp);
  await signInWithEmailAndPassword(stagingAuth, email, password);
  console.log('OK');
  console.log('');

  const prodDb = getFirestore(prodApp);
  const stagingDb = getFirestore(stagingApp);

  console.log('  Syncing collections:');
  console.log('  ─────────────────────────────────────');

  const results = [];
  for (const collName of collections) {
    try {
      const result = await syncCollection(prodDb, stagingDb, collName);
      results.push(result);
    } catch (err) {
      console.log(`ERROR - ${err.message}`);
      results.push({ collection: collName, count: 0, status: 'error', error: err.message });
    }
  }

  console.log('  ─────────────────────────────────────');
  console.log('');

  const totalDocs = results.reduce((sum, r) => sum + r.count, 0);
  const errors = results.filter(r => r.status === 'error');
  const synced = results.filter(r => r.status === 'synced');

  console.log(`  Total: ${totalDocs} documents synced across ${synced.length} collections`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length} collections failed`);
    errors.forEach(e => console.log(`    - ${e.collection}: ${e.error}`));
  }
  console.log('');
  console.log('  Done!');
  console.log('');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
