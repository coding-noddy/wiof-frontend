/**
 * Verify (and optionally finalize) the production Take Action catalogue
 * ===========================================================================
 *
 * The intended final state is exactly 40 active actions:
 *   24 from seed-take-action-v1-catalogue.js (its 25 minus the superseded
 *      `avoid-unnecessary-single-use-items`)
 * + 16 from seed-take-action-v2-new-16.js
 *
 * Read-only by default: reports the state and exits non-zero on any
 * mismatch, so it can gate a deploy. With --deactivate-superseded it first
 * soft-deactivates the superseded action (isActive: false — same mechanism as
 * ActionService.deactivateAction(); never a delete, so user_actions history
 * that references it keeps resolving), then verifies.
 *
 * Uses the Firebase Admin SDK with a service account key (same pattern as
 * the seed scripts). The key decides the target project — pass --key to
 * point at production's key; the script prints which project it hit.
 *
 * Usage:
 *   node scripts/verify-take-action-catalogue.js
 *   node scripts/verify-take-action-catalogue.js --key path/to/prod-key.json
 *   node scripts/verify-take-action-catalogue.js --deactivate-superseded [--key ...]
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const keyArgIndex = args.indexOf('--key');
const keyPath = keyArgIndex >= 0
  ? path.resolve(args[keyArgIndex + 1] || '')
  : path.resolve(__dirname, 'service-account.json');
const deactivateSuperseded = args.includes('--deactivate-superseded');

if (!fs.existsSync(keyPath)) {
  console.error(`ERROR: service account key not found at ${keyPath}`);
  process.exit(1);
}

const serviceAccount = require(keyPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const {
  SUPERSEDED_IDS, V2_NEW_16_IDS, EXPECTED_IDS, EXPECTED_COUNT
} = require('./take-action-catalogue-ids');

const fmt = (list) => (list.length ? `[${list.join(', ')}]` : '[]');

async function deactivate() {
  for (const id of SUPERSEDED_IDS) {
    const ref = db.collection('actions').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ${id}: not present — nothing to deactivate`);
    } else if (snap.data().isActive !== true) {
      console.log(`  ${id}: already inactive`);
    } else {
      await ref.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'verify-take-action-catalogue'
      });
      console.log(`  ${id}: deactivated`);
    }
  }
  console.log('');
}

async function main() {
  console.log(`Take Action catalogue verification — project: ${serviceAccount.project_id}\n`);

  if (new Set(EXPECTED_IDS).size !== EXPECTED_COUNT || EXPECTED_IDS.length !== EXPECTED_COUNT) {
    console.error('ERROR: this script\'s own expected list is not 40 unique IDs — fix the script.');
    process.exit(1);
  }

  if (deactivateSuperseded) {
    console.log('Deactivating superseded actions...');
    await deactivate();
  }

  // The full collection, active or not: Firestore doc IDs are unique by
  // construction, so "duplicates" here means two docs claiming the same
  // action — same title, or an `id` field disagreeing with the doc ID.
  const snapshot = await db.collection('actions').get();
  const docs = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
  const active = docs.filter((d) => d.isActive === true);
  const activeIds = active.map((d) => d.docId);
  const activeIdSet = new Set(activeIds);

  const missing = EXPECTED_IDS.filter((id) => !activeIdSet.has(id));
  const unexpected = activeIds.filter((id) => !EXPECTED_IDS.includes(id)).sort();
  const missingNew16 = V2_NEW_16_IDS.filter((id) => !activeIdSet.has(id));
  const supersededActive = SUPERSEDED_IDS.filter((id) => activeIdSet.has(id));

  const byTitle = new Map();
  active.forEach((d) => {
    const key = String(d.title || '').trim().toLowerCase();
    byTitle.set(key, [...(byTitle.get(key) || []), d.docId]);
  });
  const duplicateTitles = [...byTitle.values()].filter((ids) => ids.length > 1).map((ids) => ids.join(' = '));
  const mismatchedIdFields = docs.filter((d) => d.id && d.id !== d.docId).map((d) => `${d.docId} (id: ${d.id})`);
  const duplicates = [...duplicateTitles, ...mismatchedIdFields];

  const orderCounts = new Map();
  active.forEach((d) => orderCounts.set(d.displayOrder, [...(orderCounts.get(d.displayOrder) || []), d.docId]));
  const badOrder = active.filter((d) => typeof d.displayOrder !== 'number').map((d) => d.docId);
  const duplicateOrders = [...orderCounts.entries()]
    .filter(([order, ids]) => typeof order === 'number' && ids.length > 1)
    .map(([order, ids]) => `${order}: ${ids.join(', ')}`);

  console.log(`Expected active actions: ${EXPECTED_COUNT}`);
  console.log(`Actual active actions:   ${active.length}`);
  console.log(`Missing actions:         ${fmt(missing)}`);
  console.log(`Unexpected active:       ${fmt(unexpected)}`);
  console.log(`Duplicate IDs:           ${fmt(duplicates)}`);
  console.log('');
  console.log(`Missing of the new 16:   ${fmt(missingNew16)}`);
  console.log(`Superseded still active: ${fmt(supersededActive)}`);
  console.log(`displayOrder missing:    ${fmt(badOrder)}`);
  console.log(`displayOrder collisions: ${fmt(duplicateOrders)}`);
  console.log(`Total docs (incl. inactive): ${docs.length}`);

  const ok = active.length === EXPECTED_COUNT
    && missing.length === 0
    && unexpected.length === 0
    && duplicates.length === 0
    && supersededActive.length === 0
    && badOrder.length === 0
    && duplicateOrders.length === 0;

  if (!ok) {
    console.error('\nFAILED: the active catalogue does not match the expected 40 actions.');
    if (supersededActive.length > 0 && !deactivateSuperseded) {
      console.error('Hint: re-run with --deactivate-superseded to soft-deactivate the superseded action.');
    }
    process.exit(1);
  }

  console.log('\nPASSED: exactly 40 expected active actions, no duplicates, display order clean.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
