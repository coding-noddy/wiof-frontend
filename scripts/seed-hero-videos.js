/**
 * One-time script: seed the hero video slots (`hero_videos` collection)
 * =============================================================================
 *
 * Copies the hero videos that were hardcoded in app.constants.ts
 * (VIDEO_PLAYER_VIDEOS / VIDEO_PLAYER_TITLES) into Firestore, one doc per
 * slot in HERO_VIDEO_SLOTS, so admins can change them from
 * Admin -> Hero Videos instead of editing code.
 *
 * Safe to re-run: a slot that already has a doc is left alone (an admin may
 * have changed it since), unless --force is passed.
 *
 * Uses the Firebase Admin SDK with a service account key — see
 * seed-take-action-samples.js's header comment for the one-time setup
 * (scripts/service-account.json, gitignored). Admin SDK writes bypass
 * firestore.rules, so deploy the hero_videos rule separately for the app
 * itself to read/write these docs.
 *
 * Usage:
 *   node scripts/seed-hero-videos.js            # create missing slots only
 *   node scripts/seed-hero-videos.js --force    # overwrite every slot
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error('ERROR: scripts/service-account.json not found.');
  console.error('Download one from Firebase Console > Project Settings > Service Accounts');
  console.error('> Generate new private key, and save it at that path.');
  process.exit(1);
}

const serviceAccount = require(keyPath);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const force = process.argv.includes('--force');
console.log(`Target project: ${serviceAccount.project_id}${force ? ' (--force)' : ''}\n`);

// Mirrors VIDEO_PLAYER_TITLES / VIDEO_PLAYER_VIDEOS in src/app/app.constants.ts
// as of 2026-10-02, keyed by HERO_VIDEO_SLOTS ids.
const HERO_VIDEOS = {
  air: { title: 'The Current Deadly Killer in the Air', videoId: 'Xs70ewSdEjE' },
  water: { title: 'Water : The most precious resource', videoId: 'RkdIIfArWqo' },
  earth: { title: 'Rediscover our Planet Earth', videoId: 'ghkQoJoipbM' },
  energy: { title: 'The Rise of Solar and Wind Energy', videoId: 'mmyrbKBZ6SU' },
  spirit: { title: 'Handling Depression with Self Love', videoId: 'CEqoCcacR3Y' },
  'our-purpose': { title: 'About WorldIsOneFamily.com', videoId: 'SYWb9hNX-1s' }
};

async function main() {
  let written = 0;
  let skipped = 0;
  for (const [slotId, video] of Object.entries(HERO_VIDEOS)) {
    const ref = db.collection('hero_videos').doc(slotId);
    const existing = await ref.get();
    if (existing.exists && !force) {
      console.log(`  skip   ${slotId} (already set: ${existing.data().videoId})`);
      skipped++;
      continue;
    }
    await ref.set({
      ...video,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed-hero-videos.js'
    });
    console.log(`  write  ${slotId} -> ${video.videoId}`);
    written++;
  }
  console.log(`\nDone: ${written} written, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
