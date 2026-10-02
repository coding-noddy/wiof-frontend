/**
 * One-time script: seed the 16 genuinely new Take Action catalogue entries
 * ===========================================================================
 *
 * Adds the 16 new actions from WIOF_Take_Action_Production_V2+_New_16_Actions.md
 * to the `actions` Firestore collection. These are additive only — the
 * other 24 titles in that round's 40-action list already exist (seeded by
 * seed-take-action-v1-catalogue.js) and are deliberately NOT touched here.
 *
 * Uses the Firebase Admin SDK with a service account key (same pattern as
 * every other seed script in this folder — see
 * seed-take-action-samples.js for the one-time setup).
 *
 * Usage:
 *   node scripts/seed-take-action-v2-new-16.js
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
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
console.log(`Target project: ${serviceAccount.project_id}\n`);

function evidence(level, sourceOrganization, sourceTitle, sourceUrl, rationale) {
  return { level, sourceOrganization, sourceTitle, sourceUrl, rationale, reviewedAt: '2026-10-01' };
}

const NEW_ACTIONS = [
  {
    id: 'wash-clothes-with-cold-water',
    title: 'Wash Clothes With Cold Water',
    shortDescription: 'Wash one suitable load of clothes using the cold-water setting.',
    description: 'For clothes that can safely be washed cold, choose the cold-water setting instead of a hot-water cycle.',
    instructions: ['Check the garment care instructions and choose a load that is suitable for cold washing.', 'Select the cold-water setting and run the load normally.'],
    elementIds: ['energy'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'water-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'ENERGY STAR', 'Clothes Washers', 'https://www.energystar.gov/products/clothes_washers', 'ENERGY STAR identifies cold-water washing as a way to reduce the energy used for washing clothes. WIOF does not claim a fixed individual energy-saving amount.'),
    safetyNotes: ['Follow garment-care instructions.', 'Some fabrics, stains, or hygiene requirements may call for a different wash temperature.'],
    isFeatured: false, displayOrder: 26
  },
  {
    id: 'air-dry-your-clothes',
    title: 'Air-Dry Your Clothes',
    shortDescription: 'Air-dry one suitable load of clothes instead of using a powered dryer.',
    description: 'When practical and appropriate, hang or lay a suitable load of clothes to dry naturally instead of using a powered dryer.',
    instructions: ['Check that the clothes are suitable for air-drying.', 'Hang or lay them in a clean, safe location and allow them to dry naturally.'],
    elementIds: ['energy'],
    categories: ['energy-saving'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'sunny-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'ENERGY STAR', 'Clothes Washers', 'https://www.energystar.gov/products/clothes_washers', 'ENERGY STAR identifies air-drying clothes as an alternative to using a powered dryer. WIOF does not claim a fixed individual energy-saving amount.'),
    safetyNotes: ['Use a stable drying location.', 'Do not block exits, walkways, heaters, or safety equipment.'],
    isFeatured: false, displayOrder: 27
  },
  {
    id: 'fix-a-water-leak',
    title: 'Fix a Water Leak',
    shortDescription: 'Identify a household water leak and arrange or complete an appropriate repair.',
    description: 'Address an accessible leaking tap, toilet, pipe, shower, or other household water fixture by making a safe repair or arranging for the appropriate person to repair it.',
    instructions: ['Check accessible household fixtures for a leak.', 'If the repair is simple and safe for you, fix it; otherwise report or arrange it with maintenance, a landlord, building team, or plumber.'],
    elementIds: ['water'],
    categories: ['water-conservation'],
    actionType: 'PERSONAL', repeatType: 'OCCASIONAL', difficulty: 'EASY', estimatedDurationMinutes: 15,
    iconName: 'water-outline',
    evidence: evidence('OFFICIAL_SUPPORT', 'U.S. Environmental Protection Agency', 'WaterSense Home Maintenance', 'https://www.epa.gov/watersense/home-maintenance', 'EPA WaterSense recommends checking for and addressing household water leaks. WIOF does not claim a fixed amount of water saved by an individual repair.'),
    safetyNotes: ['Do not attempt plumbing work that could cause flooding, electrical contact, property damage, or other hazards.', 'Use a qualified professional when appropriate.'],
    isFeatured: false, displayOrder: 28
  },
  {
    id: 'borrow-instead-of-buy',
    title: 'Borrow Instead of Buy',
    shortDescription: 'Borrow one item you need occasionally instead of buying a new one.',
    description: 'When you only need an item temporarily or occasionally, check whether you can borrow it rather than purchasing another item.',
    instructions: ['Identify an item you need for a limited or occasional use.', 'Ask a friend, family member, library, community group, or suitable sharing service if you can borrow one, then return it responsibly.'],
    elementIds: ['earth', 'spirit'],
    categories: ['waste-reduction', 'community'],
    actionType: 'COMMUNITY', repeatType: 'OCCASIONAL', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'people-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'United Nations Environment Programme', 'Circularity', 'https://www.unep.org/circularity', 'UNEP describes sharing, reuse, repair, and other circular practices that help retain the value and use of products. WIOF does not claim a fixed environmental impact for an individual borrowing decision.'),
    safetyNotes: ['Borrow suitable items from trustworthy sources.', "Follow the item's normal safety and usage instructions."],
    isFeatured: false, displayOrder: 29
  },
  {
    id: 'reuse-a-container',
    title: 'Reuse a Container',
    shortDescription: 'Reuse one suitable container instead of taking a new disposable container.',
    description: 'Give a clean, suitable container another practical use when doing so is safe and appropriate.',
    instructions: ['Choose a clean, undamaged container that is suitable for the intended use.', 'Reuse it for an appropriate food or household purpose, then clean and store it safely.'],
    elementIds: ['earth', 'water'],
    categories: ['waste-reduction'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 5,
    iconName: 'cube-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'United Nations Environment Programme', 'Zero Waste 101', 'https://www.unep.org/interactives/zero-waste-101/', 'UNEP promotes reuse and reusable alternatives as part of zero-waste practices. WIOF does not claim a fixed waste reduction amount for an individual reuse.'),
    safetyNotes: ['Use only containers that are suitable for their intended purpose.', 'Do not reuse containers that are damaged, contaminated, or unsuitable for food contact.'],
    isFeatured: false, displayOrder: 30
  },
  {
    id: 'try-a-plant-forward-meal',
    title: 'Try a Plant-Forward Meal',
    shortDescription: 'Choose one meal centered more heavily on plant-based foods.',
    description: 'Choose one meal built around vegetables, legumes, grains, fruits, nuts, or other plant-based ingredients without requiring a permanent change to your diet.',
    instructions: ['Choose a meal that fits your normal dietary needs and preferences.', 'Make plant-based foods a meaningful part of the meal and eat normally.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 30,
    iconName: 'restaurant-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'United Nations', 'Be a food hero!', 'https://www.un.org/en/actnow/food-hero', 'UN ActNow encourages more plant-based meals as part of food-related climate action. WIOF does not prescribe a permanent diet or claim a fixed individual impact.'),
    safetyNotes: ['Consider allergies, medical needs, nutritional requirements, cultural practices, religious practices, and personal dietary restrictions.'],
    isFeatured: false, displayOrder: 31
  },
  {
    id: 'choose-seasonal-food-when-practical',
    title: 'Choose Seasonal Food When Practical',
    shortDescription: 'Choose one locally available seasonal food when it is practical for you.',
    description: 'For one purchase or meal, notice what is seasonally available in your area and choose a suitable seasonal option when availability, price, dietary needs, and preferences allow.',
    instructions: ['Check what foods are locally in season.', 'Choose one suitable seasonal option when it is available and practical for you.'],
    elementIds: ['earth', 'spirit'],
    categories: ['food'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'leaf-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'United Nations', 'Be a food hero!', 'https://www.un.org/en/actnow/food-hero', 'UN ActNow encourages choosing local and seasonal food. WIOF does not claim that every seasonal choice has the same environmental effect in every location.'),
    safetyNotes: ['Follow normal food-safety practices.', 'Dietary, medical, cultural, religious, availability, and affordability needs take priority.'],
    isFeatured: false, displayOrder: 32
  },
  {
    id: 'bike-a-short-trip',
    title: 'Bike a Short Trip',
    shortDescription: 'Bike one short trip instead of using motorized transport when it is safe and practical.',
    description: 'Choose cycling for a nearby destination when the route, traffic, weather, equipment, and your ability make it a suitable option.',
    instructions: ['Identify a short trip and check that cycling is safe and practical.', 'Complete the trip by bicycle using an appropriate route and normal safety precautions.'],
    elementIds: ['air', 'energy'],
    categories: ['mobility'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 20,
    iconName: 'bicycle-outline',
    evidence: evidence('OFFICIAL_SUPPORT', 'U.S. Environmental Protection Agency', 'What You Can Do About Climate Change — Transportation', 'https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-transportation', 'EPA identifies walking, biking, public transportation, and carpooling as transportation choices that can reduce emissions. WIOF does not claim a fixed individual emissions reduction.'),
    safetyNotes: ['Follow local traffic laws and use appropriate safety equipment.', 'Do not cycle when route, traffic, weather, equipment, or other conditions are unsafe.'],
    isFeatured: false, displayOrder: 33
  },
  {
    id: '10-minutes-of-silence',
    title: '10 Minutes of Silence',
    shortDescription: 'Spend 10 quiet minutes without talking or consuming digital content.',
    description: 'Take a short intentional period of quiet without scrolling, entertainment, or conversation, simply allowing yourself to be present.',
    instructions: ['Choose a comfortable, safe place and put aside non-essential digital content and distractions.', 'Spend 10 minutes in quiet, without requiring yourself to achieve or perform anything.'],
    elementIds: ['spirit'],
    categories: ['mindfulness'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 10,
    iconName: 'moon-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Spirit Practice', 'https://worldisonefamily.com/home', 'WIOF-curated reflective practice intended to create a simple opportunity for quiet and presence. It is not presented as an official medical or psychological recommendation.'),
    safetyNotes: [],
    isFeatured: true, displayOrder: 34
  },
  {
    id: 'take-a-10-minute-no-scroll-break',
    title: 'Take a 10-Minute No-Scroll Break',
    shortDescription: 'Spend 10 minutes away from social feeds and non-essential scrolling.',
    description: 'Put aside social media, news feeds, and other non-essential scrolling for 10 minutes and use the time for quiet, observation, conversation, or simply being present.',
    instructions: ['Put your phone aside or close non-essential apps.', 'Avoid non-essential scrolling for 10 minutes and use the time in a way that feels comfortable and present.'],
    elementIds: ['spirit'],
    categories: ['mindfulness'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 10,
    iconName: 'phone-portrait-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Spirit Practice', 'https://worldisonefamily.com/home', 'WIOF-curated practice intended to create a short break from non-essential digital scrolling. It is not presented as an official medical or psychological recommendation.'),
    safetyNotes: ['Do not put your phone away when it is needed for safety, accessibility, caregiving, work, or an urgent situation.'],
    isFeatured: false, displayOrder: 35
  },
  {
    id: 'have-a-10-minute-phone-free-conversation',
    title: 'Have a 10-Minute Phone-Free Conversation',
    shortDescription: 'Have a 10-minute conversation with someone close to you without using your phone.',
    description: 'Give another person your attention for a short ordinary conversation while keeping non-essential phone use aside.',
    instructions: ['Choose someone and a setting where a conversation feels comfortable and appropriate.', 'Put aside the phone or silence non-essential notifications and spend 10 minutes talking without using it.'],
    elementIds: ['spirit'],
    categories: ['mindfulness', 'community'],
    actionType: 'COMMUNITY', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'chatbubbles-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Human Connection Practice', 'https://worldisonefamily.com/home', 'WIOF-curated practice focused on intentional human connection and presence. It is not presented as an official medical or psychological recommendation.'),
    safetyNotes: ['Choose a person and setting that are comfortable and appropriate for you.'],
    isFeatured: true, displayOrder: 36
  },
  {
    id: 'try-10-minutes-of-gentle-yoga',
    title: 'Try 10 Minutes of Gentle Yoga',
    shortDescription: 'Try about 10 minutes of gentle yoga or movement at a level appropriate for you.',
    description: 'Spend about 10 minutes doing gentle yoga or adapted movement with attention to comfortable movement and awareness rather than performance.',
    instructions: ['Choose a safe space and gentle movements that are appropriate for your ability.', 'Practice for about 10 minutes, adapting or stopping when something does not feel safe or comfortable.'],
    elementIds: ['spirit'],
    categories: ['mindfulness'],
    actionType: 'PERSONAL', repeatType: 'REPEATABLE', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'body-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Spirit Practice', 'https://worldisonefamily.com/home', 'WIOF-curated gentle movement practice focused on awareness and presence. It is not presented as a medical recommendation or treatment.'),
    safetyNotes: ['Use gentle movements appropriate to your ability.', 'Stop if you experience pain, dizziness, or another concerning symptom, and seek appropriate professional guidance when needed.'],
    isFeatured: false, displayOrder: 37
  },
  {
    id: 'one-minute-of-gratitude',
    title: 'One Minute of Gratitude',
    shortDescription: 'Spend one minute intentionally noticing something you appreciate.',
    description: 'Pause for one minute and intentionally attend to a person, experience, place, opportunity, or simple thing you appreciate.',
    instructions: ['Pause somewhere comfortable and choose one thing you appreciate.', 'Spend one quiet minute noticing or reflecting on it.'],
    elementIds: ['spirit'],
    categories: ['mindfulness'],
    actionType: 'PERSONAL', repeatType: 'DAILY', difficulty: 'VERY_EASY', estimatedDurationMinutes: 1,
    iconName: 'heart-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Spirit Practice', 'https://worldisonefamily.com/home', 'WIOF-curated reflective practice focused on noticing appreciation. It is not presented as an official medical or psychological recommendation.'),
    safetyNotes: [],
    isFeatured: false, displayOrder: 38
  },
  {
    id: 'take-a-quiet-walk',
    title: 'Take a Quiet Walk',
    shortDescription: 'Take a short walk while putting aside non-essential phone use and noticing your surroundings.',
    description: 'Take a short, comfortable walk as an opportunity to slow down, reduce non-essential phone use, and pay attention to your surroundings.',
    instructions: ['Choose a safe, accessible route and put aside non-essential phone use.', 'Walk at a comfortable pace and notice your surroundings.'],
    elementIds: ['spirit', 'earth', 'air'],
    categories: ['mindfulness', 'nature'],
    actionType: 'NATURE', repeatType: 'DAILY', difficulty: 'EASY', estimatedDurationMinutes: 10,
    iconName: 'walk-outline',
    evidence: evidence('WIOF_CURATED', 'WIOF', 'WIOF Spirit Practice', 'https://worldisonefamily.com/home', 'WIOF-curated practice combining gentle movement, attention, and connection with surroundings. It is not presented as an official medical or psychological recommendation.'),
    safetyNotes: ['Consider traffic, pedestrians, terrain, weather, and local conditions.', 'Do not use a phone in a way that distracts you from your surroundings.'],
    isFeatured: false, displayOrder: 39
  },
  {
    id: 'join-a-local-cleanup',
    title: 'Join a Local Cleanup',
    shortDescription: 'Join a legitimate local cleanup organized by a community group, municipality, NGO, or other appropriate organization.',
    description: "Participate in an organized cleanup where the location, safety guidance, collection process, and waste disposal arrangements are defined by the organizer.",
    instructions: ['Find a legitimate local cleanup organized by an appropriate community group, municipality, NGO, or similar organization.', "Follow the organizer's safety guidance and place collected material only in the designated collection or disposal areas."],
    elementIds: ['earth', 'water', 'air'],
    categories: ['community', 'waste-reduction', 'nature'],
    actionType: 'COMMUNITY', repeatType: 'OCCASIONAL', difficulty: 'EASY', estimatedDurationMinutes: 60,
    iconName: 'trash-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'United Nations Environment Programme', 'Clean Seas Campaign', 'https://www.unep.org/beatpollution/clean-seas', 'UNEP documents community cleanup and citizen participation as part of action addressing pollution. WIOF does not claim a fixed environmental impact for an individual cleanup.'),
    safetyNotes: ['Do not handle unknown hazardous, sharp, medical, chemical, contaminated, or otherwise dangerous waste.', "Follow the organizer's protective-equipment and safety instructions."],
    isFeatured: true, displayOrder: 40
  },
  {
    id: 'plant-a-native-species-where-appropriate',
    title: 'Plant a Native Species — Where Appropriate',
    shortDescription: 'Plant or help establish one locally appropriate native species in a suitable, permitted location.',
    description: 'Choose a native species appropriate to the local environment and plant it only where the location, permission, conditions, and aftercare are suitable.',
    instructions: ['Use reliable local guidance to choose an appropriate native species and confirm permission, site conditions, and planting timing.', 'Plant according to local guidance and plan suitable aftercare.'],
    elementIds: ['earth', 'water', 'spirit'],
    categories: ['nature', 'community'],
    actionType: 'NATURE', repeatType: 'OCCASIONAL', difficulty: 'EASY', estimatedDurationMinutes: 30,
    iconName: 'leaf-outline',
    evidence: evidence('WIDELY_ACCEPTED', 'U.S. Environmental Protection Agency', 'WaterSense Landscaping Tips', 'https://www.epa.gov/watersense/landscaping-tips', 'EPA WaterSense recommends regionally appropriate, low-water-using plants and provides guidance relevant to native and locally appropriate landscaping. WIOF does not claim a fixed ecological or water benefit from an individual planting.'),
    safetyNotes: ['Do not plant on land where you do not have permission.', 'Avoid introducing inappropriate or invasive species or disturbing protected habitat.'],
    isFeatured: false, displayOrder: 41
  }
];

// Finish each record with the shared fields every action carries (matching
// seed-take-action-v1-catalogue.js's own FULL_ACTIONS convention exactly).
const FULL_ACTIONS = NEW_ACTIONS.map((a) => ({
  ...a,
  tags: [],
  completionType: 'SELF_REPORTED',
  media: null,
  accessibilityNotes: ['Users should adapt or choose another action where mobility, health, safety, access, or local conditions make this action unsuitable.'],
  isActive: true
}));

async function main() {
  console.log('Take Action — V2+ New 16 Actions Seed');
  console.log('=======================================\n');

  console.log('Checking for ID collisions against the existing actions collection...');
  const existingSnapshot = await db.collection('actions').get();
  const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
  const collisions = FULL_ACTIONS.filter((a) => existingIds.has(a.id));
  if (collisions.length > 0) {
    console.error(`ERROR: ${collisions.length} ID(s) already exist, aborting: ${collisions.map((a) => a.id).join(', ')}`);
    process.exit(1);
  }
  console.log(`  No collisions. ${existingIds.size} existing actions found.\n`);

  console.log(`Writing ${FULL_ACTIONS.length} new catalogue actions to 'actions'...`);
  const succeeded = [];
  const failed = []; // { id, message }
  for (const action of FULL_ACTIONS) {
    const { id, ...data } = action;
    try {
      await db.collection('actions').doc(id).set({
        ...data,
        version: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: 'production-catalogue-v2-new-16-import',
        updatedBy: 'production-catalogue-v2-new-16-import'
      });
      console.log(`  + ${id}`);
      succeeded.push(id);
    } catch (e) {
      console.error(`  x ${id}: ${e.message}`);
      failed.push({ id, message: e.message });
    }
  }

  const finalSnapshot = await db.collection('actions').where('isActive', '==', true).get();

  console.log('\n--- Summary ---');
  console.log(`Attempted:  ${FULL_ACTIONS.length}`);
  console.log(`Successful: ${succeeded.length}`);
  console.log(`Failed:     ${failed.length}`);
  if (failed.length > 0) {
    console.log(`Failed action IDs: ${failed.map((f) => f.id).join(', ')}`);
    failed.forEach((f) => console.log(`  - ${f.id}: ${f.message}`));
  }
  console.log(`Total active actions in catalogue now: ${finalSnapshot.size}`);

  if (failed.length > 0) {
    // A partial seed is not a success — the caller (CI, or whoever ran
    // this by hand) needs a non-zero exit to actually notice, not just a
    // log line buried above a "Done" that implied everything worked.
    console.error(`\nFAILED: ${failed.length}/${FULL_ACTIONS.length} action(s) did not write.`);
    process.exit(1);
  }

  console.log('\nDone. All actions written successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
