/**
 * Migration Script: Generate and save slugs for all existing blogs
 * ================================================================
 * 
 * Uses Firebase client auth (email/password).
 * Email is stored in scripts/.env, password is entered at runtime.
 * 
 * Usage: 
 *   node scripts/migrate-blog-slugs.js staging
 *   node scripts/migrate-blog-slugs.js prod
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const readline = require('readline');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const email = process.env.FIREBASE_EMAIL;
if (!email) {
  console.error('ERROR: FIREBASE_EMAIL not found in scripts/.env');
  process.exit(1);
}

// Get target from command line
const target = process.argv[2];
if (!target || !['staging', 'prod'].includes(target)) {
  console.error('Usage: node scripts/migrate-blog-slugs.js <staging|prod>');
  process.exit(1);
}

// Firebase configs
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

const firebaseConfig = configs[target];
console.log(`Target: ${target.toUpperCase()} (${firebaseConfig.projectId})\n`);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/**
 * Prompt for password securely
 */
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
  console.log('Blog Slug Migration');
  console.log('====================\n');

  // Get password
  const password = await askPassword();

  // Sign in
  console.log('\nSigning in...');
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Authenticated successfully.\n');
  } catch (e) {
    console.error('Authentication failed:', e.message);
    process.exit(1);
  }

  // Read all blogs
  const blogsRef = collection(db, 'Blogs');
  const snapshot = await getDocs(blogsRef);
  console.log(`Found ${snapshot.size} blogs.\n`);

  const slugMap = new Map();
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const id = docSnap.id;

    if (data.slug) {
      console.log(`  [skip] ${data.title} — already has slug: ${data.slug}`);
      skipped++;
      continue;
    }

    let slug = generateSlug(data.title);

    if (slugMap.has(slug)) {
      const count = slugMap.get(slug) + 1;
      slugMap.set(slug, count);
      slug = `${slug}-${count}`;
    } else {
      slugMap.set(slug, 1);
    }

    const blogRef = doc(db, 'Blogs', id);
    await updateDoc(blogRef, { slug: slug });

    console.log(`  [done] ${data.title}`);
    console.log(`         -> ${slug}`);
    updated++;
  }

  console.log(`\n====================`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${snapshot.size}`);
  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
