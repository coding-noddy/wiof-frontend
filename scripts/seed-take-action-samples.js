/**
 * One-time script: seed a handful of sample Take Action items
 * =============================================================
 *
 * Writes a small set of sample documents directly into the `actions`
 * Firestore collection so the new Take Action pages (Element teasers, the
 * global Take Action hub, Admin > Manage Take Action) have something real
 * to render while the feature is being verified.
 *
 * This is NOT the curated production catalogue — per the architecture doc's
 * Section 24, that requires a human editorial pass per action (is it
 * actually actionable, is completion unambiguous, etc.) done through the
 * real Admin UI. This script exists only to unblock local/staging testing
 * with real (not lorem-ipsum) content, repurposed from the old static
 * take-action-data.ts catalogue. Safe to re-run — it uses deterministic
 * slug IDs and `merge: true`, so re-running just re-seeds the same docs.
 *
 * Uses the Firebase Admin SDK with a service account key, NOT the
 * email/password client-auth pattern the other scripts/*.js one-offs use —
 * this app's admin accounts sign in via Google OAuth (no password to give a
 * script), and the Admin SDK bypasses Firestore security rules entirely
 * (trusted server-side access), so no `admins/{uid}` check or interactive
 * sign-in is needed at all.
 *
 * Setup (one-time):
 *   1. Firebase Console > Project Settings > Service Accounts >
 *      "Generate new private key" for the target project.
 *   2. Save the downloaded file as scripts/service-account.json
 *      (already gitignored — NEVER commit this file).
 *
 * Usage:
 *   node scripts/seed-take-action-samples.js
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
console.log(`Target project: ${serviceAccount.project_id}\n`);

/**
 * Sample actions, one or two per element plus a couple of multi-element and
 * DAILY examples to exercise those parts of the model. `id` is used as the
 * Firestore doc ID directly (deterministic, so re-running this script is safe).
 */
const SAMPLE_ACTIONS = [
  {
    id: 'rethink-your-food',
    title: 'Rethink your Food',
    shortDescription: 'Choose plant-based, organic, and natural food over heavily processed or animal-based options.',
    description: 'Invest in plant-based food, organic food, and natural food — and cut back on chemical-based, animal-based, or heavily processed foods that are more acidic in nature.',
    instructions: ['Pick one meal today to make plant-based.', 'Check a label for ultra-processed ingredients before buying.'],
    elementIds: ['earth'],
    categories: ['daily-habit'],
    tags: ['food', 'earth'],
    actionType: 'PERSONAL',
    completionType: 'SELF_REPORTED',
    repeatType: 'ONCE',
    estimatedDurationMinutes: 10,
    difficulty: 'EASY',
    isActive: true,
    isFeatured: true,
    iconName: 'restaurant-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/KbBxSo_jWYY' },
    displayOrder: 10
  },
  {
    id: 'revive-the-soil',
    title: 'Revive the Soil',
    shortDescription: 'Plant trees and use natural fertilizer to keep soil healthy and prevent erosion.',
    description: 'Plant more trees and increase forest cover to strengthen the soil and prevent erosion. Use natural manure or fertilizer to keep the soil rich instead of rendering it barren.',
    instructions: ['Plant or care for one tree or plant this week.', 'Switch one potted plant to natural compost.'],
    elementIds: ['earth'],
    categories: ['energy-saving'],
    tags: ['soil', 'earth'],
    actionType: 'NATURE',
    completionType: 'SELF_REPORTED',
    repeatType: 'ONCE',
    estimatedDurationMinutes: 20,
    difficulty: 'MEDIUM',
    isActive: true,
    isFeatured: false,
    iconName: 'leaf-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/C08FAa-Vlj0' },
    displayOrder: 20
  },
  {
    id: 'switch-off-unused-lights',
    title: 'Switch Off Unused Lights',
    shortDescription: 'Turn off lights whenever you leave a room — the simplest daily energy habit there is.',
    description: 'A simple daily action that helps reduce unnecessary energy consumption at home or work.',
    instructions: ['Identify lights that are not needed.', 'Switch them off when leaving the room.'],
    elementIds: ['energy'],
    categories: ['energy-saving', 'daily-habit'],
    tags: ['energy', 'home', 'daily'],
    actionType: 'PERSONAL',
    completionType: 'SELF_REPORTED',
    repeatType: 'DAILY',
    estimatedDurationMinutes: 1,
    difficulty: 'EASY',
    isActive: true,
    isFeatured: true,
    iconName: 'flash-outline',
    media: null,
    displayOrder: 30
  },
  {
    id: 'solar-energy-at-home',
    title: 'Explore Solar Energy',
    shortDescription: 'Look into solar panels for household energy needs, or even for vehicles.',
    description: 'Solar panels can be used for household energy needs and can also be leveraged for vehicles.',
    instructions: ['Research solar panel options or incentives in your area.'],
    elementIds: ['energy'],
    categories: ['energy-saving'],
    tags: ['energy', 'solar'],
    actionType: 'PERSONAL',
    completionType: 'SELF_REPORTED',
    repeatType: 'ONCE',
    estimatedDurationMinutes: 30,
    difficulty: 'MEDIUM',
    isActive: true,
    isFeatured: false,
    iconName: 'sunny-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/bSbWwn_YCr8' },
    displayOrder: 40
  },
  {
    id: 'take-public-transport',
    title: 'Take Public Transport',
    shortDescription: 'Choose a train or bus over a personal vehicle to cut per-capita pollution.',
    description: 'By taking public transport like a train or a bus, per-capita pollution reduces compared to personal vehicle use.',
    instructions: ['Plan one trip this week using public transport instead of a personal vehicle.'],
    elementIds: ['air'],
    categories: ['daily-habit'],
    tags: ['air', 'transport'],
    actionType: 'PERSONAL',
    completionType: 'SELF_REPORTED',
    repeatType: 'ONCE',
    estimatedDurationMinutes: 15,
    difficulty: 'EASY',
    isActive: true,
    isFeatured: false,
    iconName: 'bus-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/K8D9RXncGZ4' },
    displayOrder: 50
  },
  {
    id: 'rain-water-harvesting',
    title: 'Set Up Rain-Water Harvesting',
    shortDescription: 'Tap rainwater and feed it to the aquifers so groundwater doesn’t deplete.',
    description: 'Tap rainwater in your home or community and feed it to the aquifers so the water table rises and groundwater doesn’t deplete.',
    instructions: ['Look into a rain-water harvesting setup for your home or society.'],
    elementIds: ['water'],
    categories: ['energy-saving'],
    tags: ['water', 'conservation'],
    actionType: 'COMMUNITY',
    completionType: 'SELF_REPORTED',
    repeatType: 'ONCE',
    estimatedDurationMinutes: 45,
    difficulty: 'HARD',
    isActive: true,
    isFeatured: true,
    iconName: 'rainy-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/8uql8jpAiSs' },
    displayOrder: 60
  },
  {
    id: 'care-for-a-tree',
    title: 'Care for a Tree',
    shortDescription: 'Water and tend to a tree near you — good for the soil, the water table, and the air.',
    description: 'Watering and caring for a tree helps the soil hold water, supports groundwater levels, and keeps the air cleaner — a single action that benefits multiple elements at once.',
    instructions: ['Find a tree near your home.', 'Water it and clear debris from its base.'],
    elementIds: ['water', 'earth', 'spirit'],
    categories: ['daily-habit'],
    tags: ['tree', 'community'],
    actionType: 'NATURE',
    completionType: 'SELF_REPORTED',
    repeatType: 'DAILY',
    estimatedDurationMinutes: 10,
    difficulty: 'EASY',
    isActive: true,
    isFeatured: true,
    iconName: 'leaf-outline',
    media: null,
    displayOrder: 70
  },
  {
    id: 'daily-meditation',
    title: 'Meditation',
    shortDescription: 'Bring your mind to the present moment and relieve anxiety with a short daily practice.',
    description: 'Meditation or mindfulness helps bring the mind to the present moment and relieves a lot of anxiety and depression.',
    instructions: ['Sit quietly for 5 minutes.', 'Focus on your breath.'],
    elementIds: ['spirit'],
    categories: ['daily-habit'],
    tags: ['spirit', 'wellbeing'],
    actionType: 'PERSONAL',
    completionType: 'SELF_REPORTED',
    repeatType: 'DAILY',
    estimatedDurationMinutes: 5,
    difficulty: 'EASY',
    isActive: true,
    isFeatured: false,
    iconName: 'moon-outline',
    media: { type: 'YOUTUBE', url: 'https://www.youtube.com/embed/O3Ku-cpdSJM' },
    displayOrder: 80
  }
];

async function main() {
  console.log('Take Action — Sample Seed');
  console.log('==========================\n');

  console.log(`Writing ${SAMPLE_ACTIONS.length} sample actions to the 'actions' collection via the Admin SDK (bypasses Firestore rules)...`);
  let written = 0;
  for (const action of SAMPLE_ACTIONS) {
    const { id, ...data } = action;
    try {
      await db.collection('actions').doc(id).set(
        {
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: 'seed-script',
          updatedBy: 'seed-script'
        },
        { merge: true }
      );
      console.log(`  ✓ ${id}`);
      written++;
    } catch (e) {
      console.error(`  ✗ ${id}: ${e.message}`);
    }
  }

  console.log(`\nDone. ${written}/${SAMPLE_ACTIONS.length} actions written.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
