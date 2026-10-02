/**
 * One-time correction: remove generically-tacked-on 'earth' tags
 * =================================================================
 *
 * Taxonomy review (Take Action Phase 1 hardening, item 4) found that Earth
 * appeared on ~37 of 41 actions — vastly overrepresented compared to Air
 * (~9), Energy (~12), and Water (~11). Most of that came from 'earth'
 * being added generically to every action regardless of fit, rather than
 * because the action is actually about land/soil/waste (where Earth
 * legitimately belongs — e.g. composting, planting, litter, reuse).
 *
 * These 16 actions are ones where another element is clearly the real
 * fit and 'earth' was the generic add:
 *   - Energy-saving actions (lights/fans/unplug/natural light/laundry):
 *     about energy use, not land.
 *   - Water-conservation actions (tap/shower/running water/leak): about
 *     water use, not land.
 *   - Mobility actions (walk/transit/rideshare/errands/bike): about
 *     emissions (air/energy), not land.
 *   - Gentle yoga: an indoor mindfulness practice, unlike its closest
 *     siblings (10 Minutes of Silence, No-Scroll Break, Gratitude), which
 *     are correctly spirit-only.
 *
 * Deliberately NOT touched: waste/reuse/food/planting/cleanup actions,
 * where Earth is a genuine fit (land, soil, physical materials), and
 * nature-connection actions (Spend 10 Minutes With Nature, Take a Quiet
 * Walk) where being outdoors/grounded is the actual point.
 *
 * Usage:
 *   node scripts/fix-earth-overtagging.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error('ERROR: scripts/service-account.json not found.');
  process.exit(1);
}

const serviceAccount = require(keyPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log(`Target project: ${serviceAccount.project_id}\n`);

const CORRECTIONS = [
  { id: 'switch-off-unused-lights', elementIds: ['energy'] },
  { id: 'switch-off-unused-fans-or-ac', elementIds: ['energy', 'air'] },
  { id: 'unplug-an-unused-device', elementIds: ['energy'] },
  { id: 'choose-natural-light', elementIds: ['energy'] },
  { id: 'turn-off-the-tap-while-brushing', elementIds: ['water'] },
  { id: 'take-a-shorter-shower', elementIds: ['water', 'energy'] },
  { id: 'stop-unnecessary-running-water', elementIds: ['water'] },
  { id: 'walk-a-short-trip', elementIds: ['air', 'energy'] },
  { id: 'use-public-transportation', elementIds: ['air', 'energy'] },
  { id: 'share-a-ride', elementIds: ['air', 'energy', 'spirit'] },
  { id: 'combine-errands', elementIds: ['air', 'energy'] },
  { id: 'wash-clothes-with-cold-water', elementIds: ['energy'] },
  { id: 'air-dry-your-clothes', elementIds: ['energy'] },
  { id: 'fix-a-water-leak', elementIds: ['water'] },
  { id: 'bike-a-short-trip', elementIds: ['air', 'energy'] },
  { id: 'try-10-minutes-of-gentle-yoga', elementIds: ['spirit'] }
];

async function main() {
  console.log(`Applying ${CORRECTIONS.length} elementIds corrections...`);
  const succeeded = [];
  const failed = [];

  for (const { id, elementIds } of CORRECTIONS) {
    try {
      const ref = db.collection('actions').doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new Error('document does not exist');
      }
      const before = snap.data().elementIds || [];
      await ref.update({
        elementIds,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'taxonomy-correction-remove-generic-earth'
      });
      console.log(`  + ${id}: [${before.join(', ')}] -> [${elementIds.join(', ')}]`);
      succeeded.push(id);
    } catch (e) {
      console.error(`  x ${id}: ${e.message}`);
      failed.push({ id, message: e.message });
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Attempted:  ${CORRECTIONS.length}`);
  console.log(`Successful: ${succeeded.length}`);
  console.log(`Failed:     ${failed.length}`);
  if (failed.length > 0) {
    console.log(`Failed action IDs: ${failed.map((f) => f.id).join(', ')}`);
    process.exit(1);
  }

  console.log('\nDone. All corrections applied successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
