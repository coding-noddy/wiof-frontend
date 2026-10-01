/**
 * One-time script: seed the Production V1 Take Action catalogue (25 actions)
 * =============================================================================
 *
 * Loads the 25-action catalogue from
 * WIOF_Take_Action_Production_V1_Action_Catalogue.md into the `actions`
 * Firestore collection, transformed to match this app's actual schema:
 *   - elementIds lowercased (EARTH -> earth) — every query in this app is
 *     lowercase; seeding uppercase would silently match nothing.
 *   - categories lowercased + hyphenated (ENERGY_SAVING -> energy-saving) to
 *     match this app's existing category-string convention.
 *   - difficulty kept as VERY_EASY/EASY/MODERATE (ActionItem's difficulty
 *     type and the Admin form were extended to match this catalogue).
 *   - repeatType kept as given, including REPEATABLE/OCCASIONAL (the app's
 *     REPEAT_TYPE constant and TakeActionCardComponent were extended to
 *     support these — see app.constants.ts and take-action-card.component.ts).
 *   - evidence / safetyNotes / accessibilityNotes carried over verbatim
 *     (ActionItem, the Admin form, and the card's expandable detail section
 *     were all extended to store and show these).
 *   - "Safety: None." in the source doc maps to an empty safetyNotes array,
 *     not a literal "None" note.
 *
 * Also deactivates (isActive: false, never deleted) the 8 placeholder
 * sample actions seed-take-action-samples.js wrote earlier — two of them
 * (solar-energy-at-home, rain-water-harvesting) actually conflict with this
 * catalogue's own "V1 exclusions" list (too expensive/specialist for a
 * general audience), and the rest are superseded by this real catalogue.
 * History referencing them (if any test completions exist) is preserved.
 *
 * Uses the Firebase Admin SDK with a service account key — see
 * seed-take-action-samples.js's header comment for the one-time setup
 * (scripts/service-account.json, gitignored).
 *
 * Usage:
 *   node scripts/seed-take-action-v1-catalogue.js
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

const ACCESSIBILITY_STANDARD = [
  'Users should adapt or choose another action where mobility, health, safety, access, or local conditions make this action unsuitable.'
];

const EPA_CLIMATE = {
  sourceOrganization: 'U.S. Environmental Protection Agency',
  sourceTitle: 'What You Can Do About Climate Change',
  sourceUrl: 'https://www.epa.gov/climate-change/what-you-can-do-about-climate-change'
};
const EPA_WATER = {
  sourceOrganization: 'U.S. Environmental Protection Agency',
  sourceTitle: 'What You Can Do About Climate Change: Water',
  sourceUrl: 'https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-water'
};
const UNEP_ZERO_WASTE = {
  sourceOrganization: 'United Nations Environment Programme',
  sourceTitle: 'Zero Waste 101',
  sourceUrl: 'https://www.unep.org/interactives/zero-waste-101/'
};
const UNEP_FIVE_TIPS = {
  sourceOrganization: 'United Nations Environment Programme',
  sourceTitle: 'Five Tips for Living More Sustainably',
  sourceUrl: 'https://www.unep.org/news-and-stories/story/five-tips-living-more-sustainably'
};
const UNEP_EVERYDAY_CHOICES = {
  sourceOrganization: 'United Nations Environment Programme',
  sourceTitle: 'Our Everyday Choices Matter',
  sourceUrl: 'https://www.unep.org/interactives/things-you-can-do/'
};
const UNEP_FOOD_WASTE = {
  sourceOrganization: 'United Nations Environment Programme',
  sourceTitle: 'Food Waste',
  sourceUrl: 'https://www.unep.org/'
};
const WIOF_SELF = {
  sourceOrganization: 'WIOF',
  sourceUrl: 'https://worldisonefamily.com/home'
};

function evidence(level, base, sourceTitle, rationale) {
  return {
    level,
    sourceOrganization: base.sourceOrganization,
    sourceTitle: sourceTitle || base.sourceTitle || '',
    sourceUrl: base.sourceUrl,
    rationale,
    reviewedAt: '2026-10-01'
  };
}

const ACTIONS = [
  {
    id: 'switch-off-unused-lights',
    title: 'Switch Off Unused Lights',
    shortDescription: 'Turn off lights when you leave a space that does not need them.',
    description: 'Turn off lights when you leave a space that does not need them.',
    instructions: ['Check whether lights are needed before leaving a space.', 'If the space is unoccupied and lighting is unnecessary, switch them off.'],
    elementIds: ['energy', 'earth'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'bulb-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_CLIMATE, null, 'EPA includes turning off unnecessary lights as an everyday energy-saving behavior.'),
    safetyNotes: [],
    isFeatured: true, displayOrder: 1
  },
  {
    id: 'switch-off-unused-fans-or-ac',
    title: 'Switch Off Unused Fans or AC',
    shortDescription: 'Turn off cooling equipment when an unoccupied space no longer needs it.',
    description: 'Turn off cooling equipment when an unoccupied space no longer needs it.',
    instructions: ['When leaving a room, check whether the fan or AC needs to remain on.', 'If cooling is unnecessary, switch it off.'],
    elementIds: ['energy', 'air', 'earth'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'thermometer-outline',
    evidence: evidence('WIDELY_ACCEPTED', EPA_CLIMATE, null, 'Reducing unnecessary household energy use is established energy-efficiency guidance.'),
    safetyNotes: ['Do not switch off cooling if doing so would create a safety/health issue for a person, animal, or required equipment.'],
    isFeatured: true, displayOrder: 2
  },
  {
    id: 'unplug-an-unused-device',
    title: 'Unplug an Unused Device',
    shortDescription: 'Disconnect one device that is not needed and does not need to stay powered.',
    description: 'Disconnect one device that is not needed and does not need to stay powered.',
    instructions: ['Choose a device that is not in use.', 'Confirm it does not need continuous power, then switch it off and unplug it safely.'],
    elementIds: ['energy', 'earth'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'VERY_EASY', estimatedDurationMinutes: 2,
    iconName: 'flash-off-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_CLIMATE, null, 'EPA guidance includes unplugging electronics when they are not in use.'),
    safetyNotes: ['Never unplug medical devices, safety equipment, refrigerators, network equipment, or equipment that must remain powered.'],
    isFeatured: false, displayOrder: 3
  },
  {
    id: 'choose-natural-light',
    title: 'Choose Natural Light',
    shortDescription: 'Use available daylight instead of unnecessary artificial lighting when practical.',
    description: 'Use available daylight instead of unnecessary artificial lighting when practical.',
    instructions: ['Notice whether daylight is sufficient.', 'If safe and practical, keep unnecessary artificial lights off.'],
    elementIds: ['energy', 'earth'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'sunny-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FIVE_TIPS, null, 'UNEP includes making use of natural light as a practical sustainability behavior.'),
    safetyNotes: ['Use adequate lighting for safe movement, work, reading, or other tasks.'],
    isFeatured: false, displayOrder: 4
  },
  {
    id: 'turn-off-the-tap-while-brushing',
    title: 'Turn Off the Tap While Brushing',
    shortDescription: 'Keep the tap off while brushing and turn it on only when needed.',
    description: 'Keep the tap off while brushing and turn it on only when needed.',
    instructions: ['Turn the tap off while brushing.', 'Turn it back on only when needed for rinsing.'],
    elementIds: ['water', 'earth'],
    categories: ['water-conservation'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 3,
    iconName: 'water-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_WATER, null, 'EPA recommends not letting faucets run unnecessarily.'),
    safetyNotes: [],
    isFeatured: true, displayOrder: 5
  },
  {
    id: 'take-a-shorter-shower',
    title: 'Take a Shorter Shower',
    shortDescription: 'Reduce shower time when practical and comfortable.',
    description: 'Reduce shower time when practical and comfortable.',
    instructions: ['Take your normal shower.', 'Aim to finish a little sooner while maintaining hygiene and comfort.'],
    elementIds: ['water', 'energy', 'earth'],
    categories: ['water-conservation', 'energy-saving'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'timer-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_WATER, null, 'EPA identifies shorter showers as a practical household water-saving behavior.'),
    safetyNotes: ['Do not reduce necessary hygiene or medical care.'],
    isFeatured: false, displayOrder: 6
  },
  {
    id: 'stop-unnecessary-running-water',
    title: 'Stop Unnecessary Running Water',
    shortDescription: 'Notice one situation where water is running unnecessarily and stop it.',
    description: 'Notice one situation where water is running unnecessarily and stop it.',
    instructions: ['Notice a faucet or water source running unnecessarily.', 'Turn it off when safe and practical.'],
    elementIds: ['water', 'earth'],
    categories: ['water-conservation'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'water-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_WATER, null, 'EPA recommends avoiding unnecessary running water.'),
    safetyNotes: [],
    isFeatured: false, displayOrder: 7
  },
  {
    id: 'care-for-a-tree-or-plant',
    title: 'Care for a Tree or Plant',
    shortDescription: 'Give a tree or plant the care it actually needs.',
    description: 'Give a tree or plant the care it actually needs.',
    instructions: ['Choose a tree or plant you are responsible for or permitted to care for.', 'Check what it actually needs and provide appropriate care.'],
    elementIds: ['earth', 'water', 'spirit'],
    categories: ['nature', 'water-conservation'],
    actionType: 'NATURE', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'leaf-outline',
    evidence: evidence('WIDELY_ACCEPTED', WIOF_SELF, 'WIOF curated action based on nature-care principles', 'A practical nature-positive behavior; wording avoids indiscriminate watering or planting.'),
    safetyNotes: ['Do not enter restricted property, damage vegetation, or overwater.'],
    isFeatured: true, displayOrder: 8
  },
  {
    id: 'no-litter-today',
    title: 'No Litter Today',
    shortDescription: 'Keep your own waste with you until you find an appropriate disposal option.',
    description: 'Keep your own waste with you until you find an appropriate disposal option.',
    instructions: ['Keep your waste with you when no suitable bin is available.', 'Dispose of it through an appropriate waste system when available.'],
    elementIds: ['earth', 'water', 'spirit'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'trash-outline',
    evidence: evidence('WIDELY_ACCEPTED', UNEP_ZERO_WASTE, null, 'Preventing litter and responsible waste management align with zero-waste principles.'),
    safetyNotes: ['Do not pick up hazardous, sharp, medical, chemical, or unknown waste.'],
    isFeatured: true, displayOrder: 9
  },
  {
    id: 'sort-your-household-waste',
    title: 'Sort Your Household Waste',
    shortDescription: 'Separate household waste according to the waste system available where you live.',
    description: 'Separate household waste according to the waste system available where you live.',
    instructions: ['Check local waste-separation rules.', 'Separate streams only where the local system supports them.'],
    elementIds: ['earth', 'water'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'EASY', estimatedDurationMinutes: 5,
    iconName: 'file-tray-stacked-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_ZERO_WASTE, null, 'UNEP encourages appropriate waste sorting and responsible waste management.'),
    safetyNotes: ['Follow local rules for batteries, chemicals, medical waste, electronics, and special waste.'],
    isFeatured: true, displayOrder: 10
  },
  {
    id: 'carry-a-reusable-bottle',
    title: 'Carry a Reusable Bottle',
    shortDescription: 'Carry a reusable bottle when practical instead of relying on single-use bottles.',
    description: 'Carry a reusable bottle when practical instead of relying on single-use bottles.',
    instructions: ['Use a reusable bottle when practical.', 'Clean it regularly and refill it with safe drinking water.'],
    elementIds: ['earth', 'water'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 2,
    iconName: 'water-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FIVE_TIPS, null, 'UNEP recommends reusable products to reduce unnecessary consumption and waste.'),
    safetyNotes: ['Use safe drinking water and clean the bottle appropriately.'],
    isFeatured: false, displayOrder: 11
  },
  {
    id: 'carry-a-reusable-bag',
    title: 'Carry a Reusable Bag',
    shortDescription: 'Use a reusable shopping or carry bag when practical.',
    description: 'Use a reusable shopping or carry bag when practical.',
    instructions: ['Keep a reusable bag where you are likely to need it.', 'Use it for a suitable shopping or carrying trip.'],
    elementIds: ['earth'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'VERY_EASY', estimatedDurationMinutes: 2,
    iconName: 'bag-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_ZERO_WASTE, null, 'UNEP includes reusable bags and containers among practical waste-reduction behaviors.'),
    safetyNotes: [],
    isFeatured: false, displayOrder: 12
  },
  {
    id: 'give-something-a-second-life',
    title: 'Give Something a Second Life',
    shortDescription: 'Reuse, donate, share, or repurpose something you no longer need.',
    description: 'Reuse, donate, share, or repurpose something you no longer need.',
    instructions: ['Choose one usable item you no longer need.', 'Reuse, donate, share, or repurpose it when practical.'],
    elementIds: ['earth', 'spirit'],
    categories: ['waste-reduction', 'community'],
    actionType: 'COMMUNITY', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 15,
    iconName: 'gift-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_ZERO_WASTE, null, 'UNEP promotes reuse and extending product life.'),
    safetyNotes: ['Only donate/share items that are safe and suitable for continued use.'],
    isFeatured: true, displayOrder: 13
  },
  {
    id: 'repair-before-replacing',
    title: 'Repair Before Replacing',
    shortDescription: 'When something is repairable, consider fixing it before buying a replacement.',
    description: 'When something is repairable, consider fixing it before buying a replacement.',
    instructions: ['Choose an item that is damaged or not working properly.', 'Consider a safe repair yourself or use an appropriate repair service.'],
    elementIds: ['earth', 'spirit'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 30,
    iconName: 'construct-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FIVE_TIPS, null, 'UNEP recommends repair and extending product life.'),
    safetyNotes: ['Do not attempt electrical, gas, structural, or other hazardous repairs unless appropriately qualified.'],
    isFeatured: false, displayOrder: 14
  },
  {
    id: 'avoid-unnecessary-single-use-items',
    title: 'Avoid Unnecessary Single-Use Items',
    shortDescription: 'Choose a reusable or existing alternative when practical.',
    description: 'Choose a reusable or existing alternative when practical.',
    instructions: ['Notice one unnecessary single-use item.', 'Choose a reusable or existing alternative when practical.'],
    elementIds: ['earth', 'water'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'VERY_EASY', estimatedDurationMinutes: 2,
    iconName: 'ban-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_EVERYDAY_CHOICES, null, 'UNEP encourages reducing unnecessary consumption and choosing reusable options.'),
    safetyNotes: ['Prioritize hygiene, food safety, medical needs, and accessibility.'],
    isFeatured: false, displayOrder: 15
  },
  {
    id: 'serve-only-what-you-expect-to-eat',
    title: 'Serve Only What You Expect to Eat',
    shortDescription: 'Start with a portion you expect to finish and take more later if needed.',
    description: 'Start with a portion you expect to finish and take more later if needed.',
    instructions: ['Think about how much food you are likely to eat.', 'Start with a reasonable portion and take more later if needed.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food', 'waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 2,
    iconName: 'restaurant-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FOOD_WASTE, 'Food Waste', 'UNEP food-waste guidance encourages appropriate portions and avoiding food waste.'),
    safetyNotes: ['This is about reducing waste, not restricting food intake; eat according to your needs.'],
    isFeatured: false, displayOrder: 16
  },
  {
    id: 'use-a-leftover',
    title: 'Use a Leftover',
    shortDescription: 'Use suitable leftover food instead of letting it go to waste.',
    description: 'Use suitable leftover food instead of letting it go to waste.',
    instructions: ['Check whether you have a suitable leftover.', 'If it was stored safely, use it before it becomes waste.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food', 'waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'restaurant-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FOOD_WASTE, 'Food Waste', 'UNEP recommends using leftovers to prevent edible food becoming waste.'),
    safetyNotes: ['Follow local food-safety guidance; do not eat spoiled or unsafe food.'],
    isFeatured: false, displayOrder: 17
  },
  {
    id: 'plan-before-buying-food',
    title: 'Plan Before Buying Food',
    shortDescription: 'Check what you already have and plan what you are likely to use before shopping.',
    description: 'Check what you already have and plan what you are likely to use before shopping.',
    instructions: ['Check what food you already have.', 'Plan upcoming meals and make a practical shopping list.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food', 'waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'clipboard-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FOOD_WASTE, 'Food Waste', 'UNEP recommends planning meals and buying only what is expected to be used.'),
    safetyNotes: [],
    isFeatured: false, displayOrder: 18
  },
  {
    id: 'share-suitable-surplus-food',
    title: 'Share Suitable Surplus Food',
    shortDescription: 'If you have safe, suitable surplus food, share it with someone who can use it.',
    description: 'If you have safe, suitable surplus food, share it with someone who can use it.',
    instructions: ['Identify safe, suitable surplus food.', 'Offer it to someone or an appropriate local sharing option.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food', 'waste-reduction', 'community'],
    actionType: 'COMMUNITY', repeatType: 'OCCASIONAL', difficulty: 'EASY', estimatedDurationMinutes: 15,
    iconName: 'people-outline',
    evidence: evidence('OFFICIAL_SUPPORT', UNEP_FOOD_WASTE, 'Food Waste', 'UNEP identifies sharing suitable surplus food as a way to prevent food waste.'),
    safetyNotes: ['Share only food that is safe and appropriate; follow applicable local food-safety rules.'],
    isFeatured: false, displayOrder: 19
  },
  {
    id: 'walk-a-short-trip',
    title: 'Walk a Short Trip',
    shortDescription: 'For a short journey, walk when it is practical, safe, and accessible.',
    description: 'For a short journey, walk when it is practical, safe, and accessible.',
    instructions: ['Choose a short trip you would normally make by motorized transport.', 'Walk it if the distance, conditions, safety, and accessibility make it suitable.'],
    elementIds: ['air', 'energy', 'earth'],
    categories: ['mobility'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 20,
    iconName: 'walk-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_CLIMATE, null, 'EPA includes walking among transportation choices that can reduce emissions.'),
    safetyNotes: ['Do not walk where conditions are unsafe or inaccessible.'],
    isFeatured: true, displayOrder: 20
  },
  {
    id: 'use-public-transportation',
    title: 'Use Public Transportation',
    shortDescription: 'Choose public transportation for a suitable trip when it is available and practical.',
    description: 'Choose public transportation for a suitable trip when it is available and practical.',
    instructions: ['Choose a suitable upcoming trip.', 'Use public transportation when route, timing, safety, cost, and accessibility work for you.'],
    elementIds: ['air', 'energy', 'earth'],
    categories: ['mobility'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 30,
    iconName: 'bus-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_CLIMATE, null, 'EPA identifies public transportation as a way to reduce transportation-related emissions.'),
    safetyNotes: ['Prioritize personal safety and local travel conditions.'],
    isFeatured: false, displayOrder: 21
  },
  {
    id: 'share-a-ride',
    title: 'Share a Ride',
    shortDescription: 'Share a suitable journey with another person when practical and safe.',
    description: 'Share a suitable journey with another person when practical and safe.',
    instructions: ['Identify a compatible journey with another person.', 'Coordinate and share the ride safely when practical.'],
    elementIds: ['air', 'energy', 'earth', 'spirit'],
    categories: ['mobility', 'community'],
    actionType: 'COMMUNITY', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 30,
    iconName: 'car-outline',
    evidence: evidence('OFFICIAL_SUPPORT', EPA_CLIMATE, null, 'EPA identifies carpooling and shared transportation as ways to reduce transportation emissions.'),
    safetyNotes: ['Only share rides with appropriate people and use safe travel practices.'],
    isFeatured: false, displayOrder: 22
  },
  {
    id: 'combine-errands',
    title: 'Combine Errands',
    shortDescription: 'Combine two or more suitable trips into one journey when practical.',
    description: 'Combine two or more suitable trips into one journey when practical.',
    instructions: ['Look at upcoming errands.', 'Identify compatible stops and combine them into one practical trip.'],
    elementIds: ['air', 'energy', 'earth'],
    categories: ['mobility'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'list-outline',
    evidence: evidence('WIDELY_ACCEPTED', EPA_CLIMATE, null, 'Combining trips can reduce unnecessary travel; WIOF makes no fixed emissions claim.'),
    safetyNotes: ['Do not make a trip unnecessarily complicated or unsafe just to combine errands.'],
    isFeatured: false, displayOrder: 23
  },
  {
    id: 'spend-10-minutes-with-nature',
    title: 'Spend 10 Minutes With Nature',
    shortDescription: 'Spend a few quiet minutes noticing the natural world around you.',
    description: 'Spend a few quiet minutes noticing the natural world around you.',
    instructions: ['Choose a safe place with some natural elements.', 'Spend about 10 minutes there simply observing and being present.'],
    elementIds: ['spirit', 'earth', 'air'],
    categories: ['nature', 'mindfulness'],
    actionType: 'NATURE', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 10,
    iconName: 'leaf-outline',
    evidence: evidence('WIOF_CURATED', WIOF_SELF, 'WIOF curated nature-awareness action', 'A WIOF-created reflective action; no quantified environmental impact is claimed.'),
    safetyNotes: ['Choose a safe, permitted location and remain aware of surroundings.'],
    isFeatured: true, displayOrder: 24
  },
  {
    id: 'notice-one-living-thing',
    title: 'Notice One Living Thing',
    shortDescription: 'Pause and intentionally notice one plant, tree, bird, insect, or other living thing without disturbing it.',
    description: 'Pause and intentionally notice one plant, tree, bird, insect, or other living thing without disturbing it.',
    instructions: ['Choose a safe place where you can observe nature.', 'Notice one living thing without touching, feeding, chasing, or disturbing it.'],
    elementIds: ['spirit', 'earth'],
    categories: ['nature', 'mindfulness'],
    actionType: 'NATURE', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 5,
    iconName: 'eye-outline',
    evidence: evidence('WIOF_CURATED', WIOF_SELF, 'WIOF curated nature-awareness action', 'A WIOF-created awareness action; it does not claim measurable environmental impact.'),
    safetyNotes: ['Do not touch, feed, approach, or disturb wildlife; observe from a safe distance.'],
    isFeatured: false, displayOrder: 25
  }
];

// Finish each record with the shared fields every action carries.
const FULL_ACTIONS = ACTIONS.map((a) => ({
  ...a,
  tags: [],
  completionType: 'SELF_REPORTED',
  media: null,
  accessibilityNotes: ACCESSIBILITY_STANDARD,
  isActive: true
}));

// Superseded by this catalogue — deactivated, not deleted, so any existing
// test completions referencing them still resolve (Section 10/30).
const DEACTIVATE_SAMPLE_IDS = [
  'rethink-your-food',
  'revive-the-soil',
  'solar-energy-at-home',
  'take-public-transport',
  'rain-water-harvesting',
  'care-for-a-tree',
  'daily-meditation'
  // 'switch-off-unused-lights' is intentionally omitted — this catalogue's
  // own version of that action overwrites it directly (same id).
];

async function main() {
  console.log('Take Action — Production V1 Catalogue Seed');
  console.log('============================================\n');

  console.log(`Writing ${FULL_ACTIONS.length} catalogue actions to 'actions'...`);
  let written = 0;
  for (const action of FULL_ACTIONS) {
    const { id, ...data } = action;
    try {
      await db.collection('actions').doc(id).set(
        {
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: 'production-catalogue-v1-import',
          updatedBy: 'production-catalogue-v1-import'
        },
        { merge: true }
      );
      console.log(`  ✓ ${id}`);
      written++;
    } catch (e) {
      console.error(`  ✗ ${id}: ${e.message}`);
    }
  }

  console.log(`\nDeactivating ${DEACTIVATE_SAMPLE_IDS.length} superseded sample actions...`);
  for (const id of DEACTIVATE_SAMPLE_IDS) {
    try {
      await db.collection('actions').doc(id).set(
        { isActive: false, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'production-catalogue-v1-import' },
        { merge: true }
      );
      console.log(`  ✓ deactivated ${id}`);
    } catch (e) {
      console.error(`  ✗ ${id}: ${e.message}`);
    }
  }

  console.log(`\nDone. ${written}/${FULL_ACTIONS.length} catalogue actions written.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
