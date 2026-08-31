/**
 * One-time script: backfill poll_results for all existing polls
 * =================================================================
 *
 * The onPollVoteCreated Cloud Function only aggregates votes cast after it
 * is deployed. Existing polls with historical votes would show 0 results
 * until their next new vote unless this backfill runs once.
 *
 * Calls the backfillPollResults callable Cloud Function, signed in as an
 * existing admin (the function itself checks the caller's uid against the
 * `admins` collection, so this must be run by an account already seeded
 * there — see the migration runbook).
 *
 * Uses Firebase client auth (email/password), same pattern as
 * migrate-blog-slugs.js. Email is stored in scripts/.env, password is
 * entered at runtime.
 *
 * Usage:
 *   node scripts/backfill-poll-results.js staging
 *   node scripts/backfill-poll-results.js prod
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');
const readline = require('readline');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const email = process.env.FIREBASE_EMAIL;
if (!email) {
  console.error('ERROR: FIREBASE_EMAIL not found in scripts/.env');
  process.exit(1);
}

const target = process.argv[2];
if (!target || !['staging', 'prod'].includes(target)) {
  console.error('Usage: node scripts/backfill-poll-results.js <staging|prod>');
  process.exit(1);
}

const configs = {
  staging: {
    apiKey: "AIzaSyBru9kG2e19cnaeRwnGIp0zT9Op1DOcvWM",
    authDomain: "wiof-staging.firebaseapp.com",
    projectId: "wiof-staging",
    storageBucket: "wiof-staging.appspot.com",
    messagingSenderId: "1062529288860",
    appId: "1:1062529288860:web:d503fcf87348389340fb59"
  },
  prod: {
    apiKey: "AIzaSyAYH1Y5nG3RtKyYqfr0bgDluxAwczAoyRo",
    authDomain: "wiof-production.firebaseapp.com",
    projectId: "wiof-production",
    storageBucket: "wiof-production.appspot.com",
    messagingSenderId: "473258267258",
    appId: "1:473258267258:web:3570a04884ffc96616e1c3"
  }
};

// Must match functions/index.js's REGION logic.
const regions = { staging: 'asia-south1', prod: 'us-central1' };

const firebaseConfig = configs[target];
console.log(`Target: ${target.toUpperCase()} (${firebaseConfig.projectId})\n`);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functionsInstance = getFunctions(app, regions[target]);

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Password for ${email}: `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('Poll Results Backfill');
  console.log('======================\n');

  const password = await askPassword();

  console.log('\nSigning in...');
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Authenticated successfully.\n');
  } catch (e) {
    console.error('Authentication failed:', e.message);
    process.exit(1);
  }

  console.log('Calling backfillPollResults (requires this account to already exist in the `admins` collection)...');
  try {
    const backfill = httpsCallable(functionsInstance, 'backfillPollResults');
    const result = await backfill();
    console.log(`\nDone. Polls backfilled: ${result.data.pollsBackfilled}`);
  } catch (e) {
    console.error('Backfill failed:', e.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
