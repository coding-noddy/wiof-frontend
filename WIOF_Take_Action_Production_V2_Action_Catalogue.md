# WIOF Take Action — Production V1 Action Catalogue (40 Actions)

## Purpose

This is the definitive production content contract for the initial WIOF Take Action catalogue.

**Production baseline: 40 actions.** The catalogue contains 38 core everyday/personal actions and 2 contextual/community actions.

These actions are intended to support Take Action, Element pages, My Journey, action history, future recommendations, challenges, events, achievements, and the Planet Passport.

## Firestore `actions/{actionId}` object

```ts
interface Action {
  title: string;
  shortDescription: string;
  description: string;
  instructions: string[];
  elementIds: string[];
  categories: string[];
  tags: string[];
  actionType: 'PERSONAL' | 'NATURE' | 'COMMUNITY' | 'EVENT';
  completionType: 'SELF_REPORTED' | 'SYSTEM_RECORDED' | 'VERIFIED';
  repeatType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'REPEATABLE' | 'OCCASIONAL' | 'EVENT';
  estimatedDurationMinutes?: number;
  difficulty: 'VERY_EASY' | 'EASY' | 'MODERATE';
  media?: { type: 'IMAGE' | 'VIDEO'; url: string; };
  evidence: {
    level: 'OFFICIAL_SUPPORT' | 'WIDELY_ACCEPTED' | 'WIOF_CURATED';
    sourceOrganization: string;
    sourceTitle: string;
    sourceUrl: string;
    rationale: string;
    reviewedAt: string;
  };
  safetyNotes?: string[];
  accessibilityNotes?: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

## Taxonomy

**Elements:** `EARTH`, `ENERGY`, `AIR`, `WATER`, `SPIRIT`

**Categories:** `ENERGY_SAVING`, `WATER_CONSERVATION`, `WASTE_REDUCTION`, `FOOD`, `MOBILITY`, `NATURE`, `MINDFULNESS`, `COMMUNITY`

**Evidence levels:** `OFFICIAL_SUPPORT` = directly supported by an authoritative organization; `WIDELY_ACCEPTED` = established sustainability guidance; `WIOF_CURATED` = WIOF-designed action, not presented as an official recommendation.

# Production V1 Catalogue

## 01. Switch Off Unused Lights

**Area:** Energy
**Short description:** Switch Off Unused Lights.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 1`

---

## 02. Switch Off Unused Fans or AC

**Area:** Energy
**Short description:** Switch Off Unused Fans or AC.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 2`

---

## 03. Unplug an Unused Device

**Area:** Energy
**Short description:** Unplug an Unused Device.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 3`

---

## 04. Choose Natural Light

**Area:** Energy
**Short description:** Choose Natural Light.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 4`

---

## 05. Wash Clothes With Cold Water

**Area:** Energy
**Short description:** Wash Clothes With Cold Water.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 5`

---

## 06. Air-Dry Your Clothes

**Area:** Energy
**Short description:** Air-Dry Your Clothes.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 6`

---

## 07. Turn Off the Tap While Brushing

**Area:** Water
**Short description:** Turn Off the Tap While Brushing.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 7`

---

## 08. Take a Shorter Shower

**Area:** Water
**Short description:** Take a Shorter Shower.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 8`

---

## 09. Stop Unnecessary Running Water

**Area:** Water
**Short description:** Stop Unnecessary Running Water.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 9`

---

## 10. Fix a Water Leak

**Area:** Water
**Short description:** Fix a Water Leak.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 10`

---

## 11. No Litter Today

**Area:** Waste & Circularity
**Short description:** No Litter Today.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 11`

---

## 12. Sort Your Household Waste

**Area:** Waste & Circularity
**Short description:** Sort Your Household Waste.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 12`

---

## 13. Carry a Reusable Bottle

**Area:** Waste & Circularity
**Short description:** Carry a Reusable Bottle.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 13`

---

## 14. Carry a Reusable Bag

**Area:** Waste & Circularity
**Short description:** Carry a Reusable Bag.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 14`

---

## 15. Give Something a Second Life

**Area:** Waste & Circularity
**Short description:** Give Something a Second Life.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 15`

---

## 16. Repair Before Replacing

**Area:** Waste & Circularity
**Short description:** Repair Before Replacing.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `MODERATE`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 16`

---

## 17. Borrow Instead of Buy

**Area:** Waste & Circularity
**Short description:** Borrow Instead of Buy.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 17`

---

## 18. Reuse a Container

**Area:** Waste & Circularity
**Short description:** Reuse a Container.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 18`

---

## 19. Serve Only What You Expect to Eat

**Area:** Food
**Short description:** Serve Only What You Expect to Eat.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 19`

---

## 20. Use a Leftover

**Area:** Food
**Short description:** Use a Leftover.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 20`

---

## 21. Plan Before Buying Food

**Area:** Food
**Short description:** Plan Before Buying Food.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 21`

---

## 22. Share Suitable Surplus Food

**Area:** Food
**Short description:** Share Suitable Surplus Food.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 22`

---

## 23. Try a Plant-Forward Meal

**Area:** Food
**Short description:** Try a Plant-Forward Meal.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 23`

---

## 24. Choose Seasonal Food When Practical

**Area:** Food
**Short description:** Choose Seasonal Food When Practical.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 24`

---

## 25. Walk a Short Trip

**Area:** Mobility
**Short description:** Walk a Short Trip.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 25`

---

## 26. Bike a Short Trip

**Area:** Mobility
**Short description:** Bike a Short Trip.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `MODERATE`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 26`

---

## 27. Use Public Transportation

**Area:** Mobility
**Short description:** Use Public Transportation.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 27`

---

## 28. Share a Ride

**Area:** Mobility
**Short description:** Share a Ride.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 28`

---

## 29. Combine Errands

**Area:** Mobility
**Short description:** Combine Errands.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 29`

---

## 30. Care for a Tree or Plant

**Area:** Nature
**Short description:** Care for a Tree or Plant.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 30`

---

## 31. Spend 10 Minutes With Nature

**Area:** Nature
**Short description:** Spend 10 Minutes With Nature.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 31`

---

## 32. Notice One Living Thing

**Area:** Nature
**Short description:** Notice One Living Thing.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 32`

---

## 33. 10 Minutes of Silence

**Area:** Spirit / Self & Human Connection
**Short description:** 10 Minutes of Silence.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 33`

---

## 34. Take a 10-Minute No-Scroll Break

**Area:** Spirit / Self & Human Connection
**Short description:** Take a 10-Minute No-Scroll Break.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 34`

---

## 35. Have a 10-Minute Phone-Free Conversation

**Area:** Spirit / Self & Human Connection
**Short description:** Have a 10-Minute Phone-Free Conversation.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 35`

---

## 36. Try 10 Minutes of Gentle Yoga

**Area:** Spirit / Self & Human Connection
**Short description:** Try 10 Minutes of Gentle Yoga.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `MODERATE`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 36`

---

## 37. One Minute of Gratitude

**Area:** Spirit / Self & Human Connection
**Short description:** One Minute of Gratitude.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `VERY_EASY`
- Estimated duration: 1 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 37`

---

## 38. Take a Quiet Walk

**Area:** Spirit / Self & Human Connection
**Short description:** Take a Quiet Walk.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `EASY`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIOF_CURATED`
- Organization: WIOF
- Rationale: WIOF-curated practice; no quantified environmental, medical, or psychological impact is claimed.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 38`

---

## 39. Join a Local Cleanup

**Area:** Community / Contextual
**Short description:** Join a Local Cleanup.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `MODERATE`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: true`
- `displayOrder: 39`

---

## 40. Plant a Native Species — Where Appropriate

**Area:** Community / Contextual
**Short description:** Plant a Native Species — Where Appropriate.

**Description:** Complete this specific action in a way that is safe, practical, and appropriate to your circumstances.

**Instructions**
1. Read the action and choose a suitable opportunity to complete it.
2. Follow the action as written.
3. Mark it complete only after the action has actually been completed.

**Classification**
- Completion type: `SELF_REPORTED`
- Difficulty: `MODERATE`
- Estimated duration: 10 minutes

**Evidence**
- Level: `WIDELY_ACCEPTED`
- Organization: WIOF editorial catalogue
- Rationale: Included as a practical, specific behavior in the WIOF catalogue; no fixed quantified impact is claimed for an individual completion.
- Reviewed: `2026-10-01`

**Safety:** Use normal safety judgment. Do not attempt hazardous, specialist, medical, electrical, plumbing, traffic, or environmental activities beyond your ability or authorization.

**Accessibility:** Adapt the action where practical, or choose another action when the activity is inaccessible or unsuitable.

**Initial state**
- `isActive: true`
- `isFeatured: false`
- `displayOrder: 40`

---

# Implementation Rules

1. `actions` is the reusable catalogue definition; do not create a new definition per completion.
2. User completion/history belongs in `user_actions`.
3. `activity_log` remains analytics, not the source of truth for Take Action completion.
4. Admins must be able to create, edit, reorder, feature, and deactivate actions without deployment.
5. Preserve action/version context in user history.
6. Do not create unbounded arrays such as `completedActions[]` on the user document.
7. V1 actions are self-reported unless a future action explicitly supports system recording or verification.
8. Do not imply WIOF independently verified a self-reported completion.
9. Do not calculate CO2, water, energy, waste, or other quantified impact until WIOF establishes a documented methodology, assumptions, geography, baseline, and version.
10. Element pages should consume the same shared catalogue and filter it contextually; do not maintain separate hardcoded action lists.
11. Actions may map to multiple elements.
12. Preserve action/version context when the catalogue wording or classification changes.

# Recommended User Completion Model

```ts
{
  actionId,
  actionVersion,
  status,
  startedAt,
  completedAt,
  completionMethod,
  elementIdsSnapshot,
  createdAt,
  updatedAt
}
```

# Editorial Principles

- **Specific over generic.**
- **Action over advice.**
- **One clear behavior over a broad recommendation.**
- Keep actions practical, safe, accessible, and low-friction.
- Distinguish official evidence from WIOF-curated experiences.
- Do not make unsupported numerical impact claims.
- Do not force dietary, medical, religious, cultural, or accessibility choices.
- Do not add an action merely to increase the count; every action must earn its place.

# Production Count

| Area | Count |
|---|---:|
| Energy | 6 |
| Water | 4 |
| Waste & Circularity | 8 |
| Food | 6 |
| Mobility | 5 |
| Nature | 3 |
| Spirit / Self & Human Connection | 6 |
| Community / Contextual | 2 |
| **Total** | **40** |

## Final 40-action list

1. Switch Off Unused Lights
2. Switch Off Unused Fans or AC
3. Unplug an Unused Device
4. Choose Natural Light
5. Wash Clothes With Cold Water
6. Air-Dry Your Clothes
7. Turn Off the Tap While Brushing
8. Take a Shorter Shower
9. Stop Unnecessary Running Water
10. Fix a Water Leak
11. No Litter Today
12. Sort Your Household Waste
13. Carry a Reusable Bottle
14. Carry a Reusable Bag
15. Give Something a Second Life
16. Repair Before Replacing
17. Borrow Instead of Buy
18. Reuse a Container
19. Serve Only What You Expect to Eat
20. Use a Leftover
21. Plan Before Buying Food
22. Share Suitable Surplus Food
23. Try a Plant-Forward Meal
24. Choose Seasonal Food When Practical
25. Walk a Short Trip
26. Bike a Short Trip
27. Use Public Transportation
28. Share a Ride
29. Combine Errands
30. Care for a Tree or Plant
31. Spend 10 Minutes With Nature
32. Notice One Living Thing
33. 10 Minutes of Silence
34. Take a 10-Minute No-Scroll Break
35. Have a 10-Minute Phone-Free Conversation
36. Try 10 Minutes of Gentle Yoga
37. One Minute of Gratitude
38. Take a Quiet Walk
39. Join a Local Cleanup
40. Plant a Native Species — Where Appropriate