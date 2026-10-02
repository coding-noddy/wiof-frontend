# WIOF Take Action — Production V2 New 16 Actions

## Purpose

This document contains the **16 genuinely new Take Action catalogue records** that should be added to the existing WIOF Firestore catalogue.

The existing 24 overlapping actions must **not** be recreated or modified by this seed.

The records below follow the conventions already used by the production seed script:
- Stable kebab-case `id`
- Lowercase element IDs
- Lowercase-hyphenated categories
- `PERSONAL`, `NATURE`, or `COMMUNITY` action types
- `DAILY`, `REPEATABLE`, or `OCCASIONAL` repeat types
- `*-outline` Ionicons
- Action-specific descriptions and instructions
- Real evidence sources for externally supported actions
- WIOF as the source only for WIOF-curated practices

> **Seed-script defaults:** `tags: []`, `completionType: SELF_REPORTED`, `media: null`, the standard accessibility note, and `isActive: true` are applied by the existing seed script and are therefore not repeated per action.

> **Display order:** These 16 actions use display orders **26–41**, continuing after the existing production catalogue.

---

## 26. Wash Clothes With Cold Water

**id:** `wash-clothes-with-cold-water`

**Short description:** Wash one suitable load of clothes using the cold-water setting.

**Description:** For clothes that can safely be washed cold, choose the cold-water setting instead of a hot-water cycle.

**Instructions**
1. Check the garment care instructions and choose a load that is suitable for cold washing.
2. Select the cold-water setting and run the load normally.

**Element IDs:** `energy`, `earth`

**Categories:** `energy-saving`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `water-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `ENERGY STAR`
- Source title: `Clothes Washers`
- Source URL: `https://www.energystar.gov/products/clothes_washers`
- Rationale: ENERGY STAR identifies cold-water washing as a way to reduce the energy used for washing clothes. WIOF does not claim a fixed individual energy-saving amount.
- Reviewed: `2026-10-01`

**Safety notes**
- Follow garment-care instructions.
- Some fabrics, stains, or hygiene requirements may call for a different wash temperature.

**isFeatured:** `false`

**displayOrder:** `26`

---

## 27. Air-Dry Your Clothes

**id:** `air-dry-your-clothes`

**Short description:** Air-dry one suitable load of clothes instead of using a powered dryer.

**Description:** When practical and appropriate, hang or lay a suitable load of clothes to dry naturally instead of using a powered dryer.

**Instructions**
1. Check that the clothes are suitable for air-drying.
2. Hang or lay them in a clean, safe location and allow them to dry naturally.

**Element IDs:** `energy`, `earth`

**Categories:** `energy-saving`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `sunny-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `ENERGY STAR`
- Source title: `Clothes Washers`
- Source URL: `https://www.energystar.gov/products/clothes_washers`
- Rationale: ENERGY STAR identifies air-drying clothes as an alternative to using a powered dryer. WIOF does not claim a fixed individual energy-saving amount.
- Reviewed: `2026-10-01`

**Safety notes**
- Use a stable drying location.
- Do not block exits, walkways, heaters, or safety equipment.

**isFeatured:** `false`

**displayOrder:** `27`

---

## 28. Fix a Water Leak

**id:** `fix-a-water-leak`

**Short description:** Identify a household water leak and arrange or complete an appropriate repair.

**Description:** Address an accessible leaking tap, toilet, pipe, shower, or other household water fixture by making a safe repair or arranging for the appropriate person to repair it.

**Instructions**
1. Check accessible household fixtures for a leak.
2. If the repair is simple and safe for you, fix it; otherwise report or arrange it with maintenance, a landlord, building team, or plumber.

**Element IDs:** `water`, `earth`

**Categories:** `water-conservation`

**Action type:** `PERSONAL`

**Repeat type:** `OCCASIONAL`

**Difficulty:** `EASY`

**Estimated duration:** 15 minutes

**Icon:** `water-outline`

**Evidence**
- Level: `OFFICIAL_SUPPORT`
- Organization: `U.S. Environmental Protection Agency`
- Source title: `WaterSense Home Maintenance`
- Source URL: `https://www.epa.gov/watersense/home-maintenance`
- Rationale: EPA WaterSense recommends checking for and addressing household water leaks. WIOF does not claim a fixed amount of water saved by an individual repair.
- Reviewed: `2026-10-01`

**Safety notes**
- Do not attempt plumbing work that could cause flooding, electrical contact, property damage, or other hazards.
- Use a qualified professional when appropriate.

**isFeatured:** `false`

**displayOrder:** `28`

---

## 29. Borrow Instead of Buy

**id:** `borrow-instead-of-buy`

**Short description:** Borrow one item you need occasionally instead of buying a new one.

**Description:** When you only need an item temporarily or occasionally, check whether you can borrow it rather than purchasing another item.

**Instructions**
1. Identify an item you need for a limited or occasional use.
2. Ask a friend, family member, library, community group, or suitable sharing service if you can borrow one, then return it responsibly.

**Element IDs:** `earth`, `spirit`

**Categories:** `waste-reduction`, `community`

**Action type:** `COMMUNITY`

**Repeat type:** `OCCASIONAL`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `people-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `United Nations Environment Programme`
- Source title: `Circularity`
- Source URL: `https://www.unep.org/circularity`
- Rationale: UNEP describes sharing, reuse, repair, and other circular practices that help retain the value and use of products. WIOF does not claim a fixed environmental impact for an individual borrowing decision.
- Reviewed: `2026-10-01`

**Safety notes**
- Borrow suitable items from trustworthy sources.
- Follow the item's normal safety and usage instructions.

**isFeatured:** `false`

**displayOrder:** `29`

---

## 30. Reuse a Container

**id:** `reuse-a-container`

**Short description:** Reuse one suitable container instead of taking a new disposable container.

**Description:** Give a clean, suitable container another practical use when doing so is safe and appropriate.

**Instructions**
1. Choose a clean, undamaged container that is suitable for the intended use.
2. Reuse it for an appropriate food or household purpose, then clean and store it safely.

**Element IDs:** `earth`, `water`

**Categories:** `waste-reduction`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 5 minutes

**Icon:** `cube-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `United Nations Environment Programme`
- Source title: `Zero Waste 101`
- Source URL: `https://www.unep.org/interactives/zero-waste-101/`
- Rationale: UNEP promotes reuse and reusable alternatives as part of zero-waste practices. WIOF does not claim a fixed waste reduction amount for an individual reuse.
- Reviewed: `2026-10-01`

**Safety notes**
- Use only containers that are suitable for their intended purpose.
- Do not reuse containers that are damaged, contaminated, or unsuitable for food contact.

**isFeatured:** `false`

**displayOrder:** `30`

---

## 31. Try a Plant-Forward Meal

**id:** `try-a-plant-forward-meal`

**Short description:** Choose one meal centered more heavily on plant-based foods.

**Description:** Choose one meal built around vegetables, legumes, grains, fruits, nuts, or other plant-based ingredients without requiring a permanent change to your diet.

**Instructions**
1. Choose a meal that fits your normal dietary needs and preferences.
2. Make plant-based foods a meaningful part of the meal and eat normally.

**Element IDs:** `earth`, `spirit`

**Categories:** `food`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 30 minutes

**Icon:** `restaurant-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `United Nations`
- Source title: `Be a food hero!`
- Source URL: `https://www.un.org/en/actnow/food-hero`
- Rationale: UN ActNow encourages more plant-based meals as part of food-related climate action. WIOF does not prescribe a permanent diet or claim a fixed individual impact.
- Reviewed: `2026-10-01`

**Safety notes**
- Consider allergies, medical needs, nutritional requirements, cultural practices, religious practices, and personal dietary restrictions.

**isFeatured:** `false`

**displayOrder:** `31`

---

## 32. Choose Seasonal Food When Practical

**id:** `choose-seasonal-food-when-practical`

**Short description:** Choose one locally available seasonal food when it is practical for you.

**Description:** For one purchase or meal, notice what is seasonally available in your area and choose a suitable seasonal option when availability, price, dietary needs, and preferences allow.

**Instructions**
1. Check what foods are locally in season.
2. Choose one suitable seasonal option when it is available and practical for you.

**Element IDs:** `earth`, `spirit`

**Categories:** `food`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `leaf-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `United Nations`
- Source title: `Be a food hero!`
- Source URL: `https://www.un.org/en/actnow/food-hero`
- Rationale: UN ActNow encourages choosing local and seasonal food. WIOF does not claim that every seasonal choice has the same environmental effect in every location.
- Reviewed: `2026-10-01`

**Safety notes**
- Follow normal food-safety practices.
- Dietary, medical, cultural, religious, availability, and affordability needs take priority.

**isFeatured:** `false`

**displayOrder:** `32`

---

## 33. Bike a Short Trip

**id:** `bike-a-short-trip`

**Short description:** Bike one short trip instead of using motorized transport when it is safe and practical.

**Description:** Choose cycling for a nearby destination when the route, traffic, weather, equipment, and your ability make it a suitable option.

**Instructions**
1. Identify a short trip and check that cycling is safe and practical.
2. Complete the trip by bicycle using an appropriate route and normal safety precautions.

**Element IDs:** `air`, `energy`, `earth`

**Categories:** `mobility`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 20 minutes

**Icon:** `bicycle-outline`

**Evidence**
- Level: `OFFICIAL_SUPPORT`
- Organization: `U.S. Environmental Protection Agency`
- Source title: `What You Can Do About Climate Change — Transportation`
- Source URL: `https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-transportation`
- Rationale: EPA identifies walking, biking, public transportation, and carpooling as transportation choices that can reduce emissions. WIOF does not claim a fixed individual emissions reduction.
- Reviewed: `2026-10-01`

**Safety notes**
- Follow local traffic laws and use appropriate safety equipment.
- Do not cycle when route, traffic, weather, equipment, or other conditions are unsafe.

**isFeatured:** `false`

**displayOrder:** `33`

---

## 34. 10 Minutes of Silence

**id:** `10-minutes-of-silence`

**Short description:** Spend 10 quiet minutes without talking or consuming digital content.

**Description:** Take a short intentional period of quiet without scrolling, entertainment, or conversation, simply allowing yourself to be present.

**Instructions**
1. Choose a comfortable, safe place and put aside non-essential digital content and distractions.
2. Spend 10 minutes in quiet, without requiring yourself to achieve or perform anything.

**Element IDs:** `spirit`

**Categories:** `mindfulness`

**Action type:** `PERSONAL`

**Repeat type:** `DAILY`

**Difficulty:** `VERY_EASY`

**Estimated duration:** 10 minutes

**Icon:** `moon-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Spirit Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated reflective practice intended to create a simple opportunity for quiet and presence. It is not presented as an official medical or psychological recommendation.
- Reviewed: `2026-10-01`

**Safety notes:** []

**isFeatured:** `true`

**displayOrder:** `34`

---

## 35. Take a 10-Minute No-Scroll Break

**id:** `take-a-10-minute-no-scroll-break`

**Short description:** Spend 10 minutes away from social feeds and non-essential scrolling.

**Description:** Put aside social media, news feeds, and other non-essential scrolling for 10 minutes and use the time for quiet, observation, conversation, or simply being present.

**Instructions**
1. Put your phone aside or close non-essential apps.
2. Avoid non-essential scrolling for 10 minutes and use the time in a way that feels comfortable and present.

**Element IDs:** `spirit`

**Categories:** `mindfulness`

**Action type:** `PERSONAL`

**Repeat type:** `DAILY`

**Difficulty:** `VERY_EASY`

**Estimated duration:** 10 minutes

**Icon:** `phone-portrait-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Spirit Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated practice intended to create a short break from non-essential digital scrolling. It is not presented as an official medical or psychological recommendation.
- Reviewed: `2026-10-01`

**Safety notes**
- Do not put your phone away when it is needed for safety, accessibility, caregiving, work, or an urgent situation.

**isFeatured:** `false`

**displayOrder:** `35`

---

## 36. Have a 10-Minute Phone-Free Conversation

**id:** `have-a-10-minute-phone-free-conversation`

**Short description:** Have a 10-minute conversation with someone close to you without using your phone.

**Description:** Give another person your attention for a short ordinary conversation while keeping non-essential phone use aside.

**Instructions**
1. Choose someone and a setting where a conversation feels comfortable and appropriate.
2. Put aside the phone or silence non-essential notifications and spend 10 minutes talking without using it.

**Element IDs:** `spirit`

**Categories:** `mindfulness`, `community`

**Action type:** `COMMUNITY`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `chatbubbles-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Human Connection Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated practice focused on intentional human connection and presence. It is not presented as an official medical or psychological recommendation.
- Reviewed: `2026-10-01`

**Safety notes**
- Choose a person and setting that are comfortable and appropriate for you.

**isFeatured:** `true`

**displayOrder:** `36`

---

## 37. Try 10 Minutes of Gentle Yoga

**id:** `try-10-minutes-of-gentle-yoga`

**Short description:** Try about 10 minutes of gentle yoga or movement at a level appropriate for you.

**Description:** Spend about 10 minutes doing gentle yoga or adapted movement with attention to comfortable movement and awareness rather than performance.

**Instructions**
1. Choose a safe space and gentle movements that are appropriate for your ability.
2. Practice for about 10 minutes, adapting or stopping when something does not feel safe or comfortable.

**Element IDs:** `spirit`, `earth`

**Categories:** `mindfulness`

**Action type:** `PERSONAL`

**Repeat type:** `REPEATABLE`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `body-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Spirit Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated gentle movement practice focused on awareness and presence. It is not presented as a medical recommendation or treatment.
- Reviewed: `2026-10-01`

**Safety notes**
- Use gentle movements appropriate to your ability.
- Stop if you experience pain, dizziness, or another concerning symptom, and seek appropriate professional guidance when needed.

**isFeatured:** `false`

**displayOrder:** `37`

---

## 38. One Minute of Gratitude

**id:** `one-minute-of-gratitude`

**Short description:** Spend one minute intentionally noticing something you appreciate.

**Description:** Pause for one minute and intentionally attend to a person, experience, place, opportunity, or simple thing you appreciate.

**Instructions**
1. Pause somewhere comfortable and choose one thing you appreciate.
2. Spend one quiet minute noticing or reflecting on it.

**Element IDs:** `spirit`

**Categories:** `mindfulness`

**Action type:** `PERSONAL`

**Repeat type:** `DAILY`

**Difficulty:** `VERY_EASY`

**Estimated duration:** 1 minute

**Icon:** `heart-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Spirit Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated reflective practice focused on noticing appreciation. It is not presented as an official medical or psychological recommendation.
- Reviewed: `2026-10-01`

**Safety notes:** []

**isFeatured:** `false`

**displayOrder:** `38`

---

## 39. Take a Quiet Walk

**id:** `take-a-quiet-walk`

**Short description:** Take a short walk while putting aside non-essential phone use and noticing your surroundings.

**Description:** Take a short, comfortable walk as an opportunity to slow down, reduce non-essential phone use, and pay attention to your surroundings.

**Instructions**
1. Choose a safe, accessible route and put aside non-essential phone use.
2. Walk at a comfortable pace and notice your surroundings.

**Element IDs:** `spirit`, `earth`, `air`

**Categories:** `mindfulness`, `nature`

**Action type:** `NATURE`

**Repeat type:** `DAILY`

**Difficulty:** `EASY`

**Estimated duration:** 10 minutes

**Icon:** `walk-outline`

**Evidence**
- Level: `WIOF_CURATED`
- Organization: `WIOF`
- Source title: `WIOF Spirit Practice`
- Source URL: `https://worldisonefamily.com/home`
- Rationale: WIOF-curated practice combining gentle movement, attention, and connection with surroundings. It is not presented as an official medical or psychological recommendation.
- Reviewed: `2026-10-01`

**Safety notes**
- Consider traffic, pedestrians, terrain, weather, and local conditions.
- Do not use a phone in a way that distracts you from your surroundings.

**isFeatured:** `false`

**displayOrder:** `39`

---

## 40. Join a Local Cleanup

**id:** `join-a-local-cleanup`

**Short description:** Join a legitimate local cleanup organized by a community group, municipality, NGO, or other appropriate organization.

**Description:** Participate in an organized cleanup where the location, safety guidance, collection process, and waste disposal arrangements are defined by the organizer.

**Instructions**
1. Find a legitimate local cleanup organized by an appropriate community group, municipality, NGO, or similar organization.
2. Follow the organizer's safety guidance and place collected material only in the designated collection or disposal areas.

**Element IDs:** `earth`, `water`, `air`

**Categories:** `community`, `waste-reduction`, `nature`

**Action type:** `COMMUNITY`

**Repeat type:** `OCCASIONAL`

**Difficulty:** `EASY`

**Estimated duration:** 60 minutes

**Icon:** `trash-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `United Nations Environment Programme`
- Source title: `Clean Seas Campaign`
- Source URL: `https://www.unep.org/beatpollution/clean-seas`
- Rationale: UNEP documents community cleanup and citizen participation as part of action addressing pollution. WIOF does not claim a fixed environmental impact for an individual cleanup.
- Reviewed: `2026-10-01`

**Safety notes**
- Do not handle unknown hazardous, sharp, medical, chemical, contaminated, or otherwise dangerous waste.
- Follow the organizer's protective-equipment and safety instructions.

**isFeatured:** `true`

**displayOrder:** `40`

---

## 41. Plant a Native Species — Where Appropriate

**id:** `plant-a-native-species-where-appropriate`

**Short description:** Plant or help establish one locally appropriate native species in a suitable, permitted location.

**Description:** Choose a native species appropriate to the local environment and plant it only where the location, permission, conditions, and aftercare are suitable.

**Instructions**
1. Use reliable local guidance to choose an appropriate native species and confirm permission, site conditions, and planting timing.
2. Plant according to local guidance and plan suitable aftercare.

**Element IDs:** `earth`, `water`, `spirit`

**Categories:** `nature`, `community`

**Action type:** `NATURE`

**Repeat type:** `OCCASIONAL`

**Difficulty:** `EASY`

**Estimated duration:** 30 minutes

**Icon:** `leaf-outline`

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: `U.S. Environmental Protection Agency`
- Source title: `WaterSense Landscaping Tips`
- Source URL: `https://www.epa.gov/watersense/landscaping-tips`
- Rationale: EPA WaterSense recommends regionally appropriate, low-water-using plants and provides guidance relevant to native and locally appropriate landscaping. WIOF does not claim a fixed ecological or water benefit from an individual planting.
- Reviewed: `2026-10-01`

**Safety notes**
- Do not plant on land where you do not have permission.
- Avoid introducing inappropriate or invasive species or disturbing protected habitat.

**isFeatured:** `false`

**displayOrder:** `41`

---

# Seed/Verification Rules

1. Seed **only these 16 new actions** from this document.
2. Do **not** recreate or overwrite the existing 24 production actions.
3. Preserve the exact stable IDs shown above.
4. Preserve the exact `displayOrder` values 26–41.
5. Use the existing seed-script defaults for `tags`, `completionType`, `media`, `accessibilityNotes`, and `isActive`.
6. Do not infer or add quantified environmental impact.
7. Do not present WIOF-curated Spirit practices as official medical, psychological, environmental, or government recommendations.
8. Verify all 16 IDs are unique against the existing `actions` collection before writing.
9. Verify the resulting catalogue has 40 total active actions after the 16 new records are added.
