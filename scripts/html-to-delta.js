#!/usr/bin/env node
/**
 * scripts/html-to-delta.js
 *
 * Usage:
 *   npm install jsdom quill
 *   node scripts/html-to-delta.js input.json output.json
 *
 *   # optional Firestore writeback
 *   npm install jsdom quill firebase-admin
 *   node scripts/html-to-delta.js input.json output.json --update --serviceAccount=./serviceAccountKey.json --collection=Blogs
 *
 * input.json should be an array of blog objects (Firestore export or simplified):
 * [ { id: '...', title: '...', content: '<p>...</p>' }, ... ]
 *
 * output.json will be the same array with `contentDelta` added for each item.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { JSDOM } = require('jsdom');

// Quill requires `document` to exist when imported, so initialize jsdom first.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };

let Quill;
let admin;
let firebaseApp;
let firestoreClient;
let authClient;

const firebaseEmail = process.env.FIREBASE_EMAIL;
const firebasePassword = process.env.FIREBASE_PASSWORD;

try {
  Quill = require('quill');
} catch (e) {
  console.error('Quill load failed:', e.stack || e.message || e);
  process.exit(1);
}

const argv = process.argv.slice(2);
let inputPath = null;
let outputPath = 'out-with-delta.json';
const extraArgs = [];
for (const arg of argv) {
  if (arg.startsWith('--')) {
    extraArgs.push(arg);
  } else if (!inputPath) {
    inputPath = arg;
  } else if (!outputPath || outputPath === 'out-with-delta.json') {
    outputPath = arg;
  }
}
const firestoreUpdate = extraArgs.some((arg) => arg === '--update');
const useAll = extraArgs.some((arg) => arg === '--all');
const useFirestore = firestoreUpdate || useAll;
let firestoreCollection = 'Blogs';
let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let useEmailAuth = !!firebaseEmail;

extraArgs.forEach((arg) => {
  if (arg.startsWith('--collection=')) {
    firestoreCollection = arg.split('=')[1];
  }
  if (arg.startsWith('--serviceAccount=')) {
    serviceAccountPath = arg.split('=')[1];
  }
});

if (!inputPath && !useAll) {
  console.error('Usage: node scripts/html-to-delta.js input.json [output.json] [--update] [--collection=Blogs] [--serviceAccount=path] [--all]');
  process.exit(1);
}

if (useFirestore) {
  if (useEmailAuth) {
    try {
      const { initializeApp } = require('firebase/app');
      const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
      const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');
      firebaseApp = { initializeApp, getAuth, signInWithEmailAndPassword, getFirestore, collection, doc, setDoc, getDocs };
    } catch (e) {
      console.error('Please install firebase in this project (npm install firebase)');
      process.exit(1);
    }
  } else {
    try {
      admin = require('firebase-admin');
    } catch (e) {
      console.error('Please install firebase-admin in this project (npm install firebase-admin)');
      process.exit(1);
    }
  }
}

let inputJson = [];
let absoluteInput = null;
if (!useAll) {
  absoluteInput = path.resolve(inputPath);
  if (!fs.existsSync(absoluteInput)) {
    console.error('Input file not found:', absoluteInput);
    process.exit(1);
  }
  inputJson = JSON.parse(fs.readFileSync(absoluteInput, 'utf8'));
}

// Create a quill instance attached to a DOM element
const container = document.createElement('div');
document.body.appendChild(container);

const quill = new Quill(container, {
  modules: { toolbar: false, clipboard: true },
  theme: 'snow'
});

function convertHtmlToDelta(html) {
  // Dangerously paste HTML into Quill's clipboard and read out the delta
  quill.clipboard.dangerouslyPasteHTML(html || '');
  const delta = quill.getContents();
  // clear editor
  quill.setContents([{ insert: '\n' }]);
  return JSON.parse(JSON.stringify(delta));
}

async function main() {
  if (useAll) {
    if (!useFirestore) {
      console.error('The --all option requires Firestore access. Use --update or set FIREBASE_EMAIL and install firebase.');
      process.exit(1);
    }
    if (useEmailAuth) {
      await initFirebaseAuth();
    } else {
      initFirestore();
    }
    inputJson = await fetchAllDocs();
  }

  const output = inputJson.map((item) => {
    const html = item.content || item.contentHtml || '';
    try {
      const delta = convertHtmlToDelta(html);
      return Object.assign({}, item, { contentDelta: delta });
    } catch (e) {
      console.error('Conversion failed for item id=', item.id || '<no-id>', e.message);
      return Object.assign({}, item, { contentDelta: null, _conversionError: e.message });
    }
  });

  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(output, null, 2));
  console.log('Wrote', path.resolve(outputPath));

  if (firestoreUpdate) {
    if (!useAll && useEmailAuth) {
      await initFirebaseAuth();
    }
    await updateFirestoreDocs(output);
    console.log('Firestore update completed');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

if (firestoreUpdate) {
  if (useEmailAuth) {
    initFirebaseAuth()
      .then(() => updateFirestoreDocs(output))
      .then(() => {
        console.log('Firestore update completed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Firestore update failed:', err);
        process.exit(1);
      });
  } else {
    initFirestore();
    updateFirestoreDocs(output)
      .then(() => {
        console.log('Firestore update completed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Firestore update failed:', err);
        process.exit(1);
      });
  }
}

function initFirestore() {
  if (!serviceAccountPath) {
    console.error('Firestore update enabled but no service account path provided. Use --serviceAccount=path or set GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }

  const serviceAccountAbsolute = path.resolve(serviceAccountPath);
  if (!fs.existsSync(serviceAccountAbsolute)) {
    console.error('Service account file not found:', serviceAccountAbsolute);
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountAbsolute);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function initFirebaseAuth() {
  if (!firebaseEmail) {
    console.error('FIREBASE_EMAIL is required for email/password auth.');
    process.exit(1);
  }

  if (!firebasePassword) {
    process.env.FIREBASE_PASSWORD = await promptPassword('Firebase password: ');
  }

  const config = loadFirebaseConfig();
  const { initializeApp, getAuth, signInWithEmailAndPassword, getFirestore } = firebaseApp;
  const app = initializeApp(config);
  authClient = getAuth(app);
  await signInWithEmailAndPassword(authClient, firebaseEmail, process.env.FIREBASE_PASSWORD);
  firestoreClient = getFirestore(app);
}

function loadFirebaseConfig() {
  const envPath = path.resolve(__dirname, '../src/environments/environment.ts');
  if (!fs.existsSync(envPath)) {
    console.error('Could not find src/environments/environment.ts to load Firebase config.');
    process.exit(1);
  }
  const envText = fs.readFileSync(envPath, 'utf8');
  const configMatch = envText.match(/firebaseConfig:\s*{([\s\S]*?)}/m);
  if (!configMatch) {
    console.error('Could not parse firebaseConfig from environment.ts');
    process.exit(1);
  }
  const configText = '{' + configMatch[1] + '}';
  const normalized = configText
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/\/\n/g, '')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*$/m, '');
  try {
    return JSON.parse(normalized);
  } catch (e) {
    console.error('Failed to parse Firebase config from environment.ts:', e.message);
    process.exit(1);
  }
}

function promptPassword(promptText) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
    rl.question(promptText, (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function fetchAllDocs() {
  if (useEmailAuth) {
    const { collection, getDocs } = firebaseApp;
    const q = collection(firestoreClient, firestoreCollection);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  const db = admin.firestore();
  const snapshot = await db.collection(firestoreCollection).get();
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function updateFirestoreDocs(items) {
  if (useEmailAuth) {
    const { collection, doc, setDoc } = firebaseApp;
    for (const item of items) {
      const id = item.id || item.blogId || item.docId;
      if (!id) {
        console.warn('Skipping item with no id:', item);
        continue;
      }
      const docRef = doc(collection(firestoreClient, firestoreCollection), id);
      const payload = { contentDelta: item.contentDelta };
      await setDoc(docRef, payload, { merge: true });
      console.log('Updated', firestoreCollection, id);
    }
  } else {
    const db = admin.firestore();
    for (const item of items) {
      const id = item.id || item.blogId || item.docId;
      if (!id) {
        console.warn('Skipping item with no id:', item);
        continue;
      }
      const docRef = db.collection(firestoreCollection).doc(id);
      const payload = { contentDelta: item.contentDelta };
      await docRef.set(payload, { merge: true });
      console.log('Updated', firestoreCollection, id);
    }
  }
}
