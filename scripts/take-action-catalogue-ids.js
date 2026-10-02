/**
 * The final 40-action Take Action catalogue, by doc ID — the single list
 * shared by verify-take-action-catalogue.js and prod-launch.js.
 *
 *   24 from seed-take-action-v1-catalogue.js (its 25 minus the superseded
 *      `avoid-unnecessary-single-use-items`)
 * + 16 from seed-take-action-v2-new-16.js
 */

const SUPERSEDED_IDS = ['avoid-unnecessary-single-use-items'];

const V1_IDS = [
  'switch-off-unused-lights',
  'switch-off-unused-fans-or-ac',
  'unplug-an-unused-device',
  'choose-natural-light',
  'turn-off-the-tap-while-brushing',
  'take-a-shorter-shower',
  'stop-unnecessary-running-water',
  'care-for-a-tree-or-plant',
  'no-litter-today',
  'sort-your-household-waste',
  'carry-a-reusable-bottle',
  'carry-a-reusable-bag',
  'give-something-a-second-life',
  'repair-before-replacing',
  'serve-only-what-you-expect-to-eat',
  'use-a-leftover',
  'plan-before-buying-food',
  'share-suitable-surplus-food',
  'walk-a-short-trip',
  'use-public-transportation',
  'share-a-ride',
  'combine-errands',
  'spend-10-minutes-with-nature',
  'notice-one-living-thing'
];

const V2_NEW_16_IDS = [
  'wash-clothes-with-cold-water',
  'air-dry-your-clothes',
  'fix-a-water-leak',
  'borrow-instead-of-buy',
  'reuse-a-container',
  'try-a-plant-forward-meal',
  'choose-seasonal-food-when-practical',
  'bike-a-short-trip',
  '10-minutes-of-silence',
  'take-a-10-minute-no-scroll-break',
  'have-a-10-minute-phone-free-conversation',
  'try-10-minutes-of-gentle-yoga',
  'one-minute-of-gratitude',
  'take-a-quiet-walk',
  'join-a-local-cleanup',
  'plant-a-native-species-where-appropriate'
];

const EXPECTED_IDS = [...V1_IDS, ...V2_NEW_16_IDS];
const EXPECTED_COUNT = 40;

module.exports = { SUPERSEDED_IDS, V1_IDS, V2_NEW_16_IDS, EXPECTED_IDS, EXPECTED_COUNT };
