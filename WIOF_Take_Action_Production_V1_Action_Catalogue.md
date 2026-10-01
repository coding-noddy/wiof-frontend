# WIOF Take Action --- Production V1 Action Catalogue

## Purpose

This is the production content contract for the initial WIOF Take Action
catalogue. The 25 actions were selected to be realistic for a general
audience, low-friction, safe when followed as written, and aligned with
established sustainability guidance. WIOF-curated actions are explicitly
labeled rather than presented as official recommendations.

## Firestore `actions/{actionId}` object

``` ts
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

**Categories:** `ENERGY_SAVING`, `WATER_CONSERVATION`,
`WASTE_REDUCTION`, `FOOD`, `MOBILITY`, `NATURE`, `MINDFULNESS`,
`COMMUNITY`

**Action types:** `PERSONAL`, `NATURE`, `COMMUNITY`, `EVENT`

**Evidence levels** - `OFFICIAL_SUPPORT`: directly supported by an
authoritative organization. - `WIDELY_ACCEPTED`: supported by
established sustainability principles/credible organizations. -
`WIOF_CURATED`: WIOF-designed action based on established principles;
not presented as an official recommendation.

## V1 catalogue

### 01. Switch Off Unused Lights

**Area:** Energy\
**Short description:** Turn off lights when you leave a space that does
not need them.

**Description:** Turn off lights when you leave a space that does not
need them.

**Instructions** 1. Check whether lights are needed before leaving a
space. 2. If the space is unoccupied and lighting is unnecessary, switch
them off.

**Classification** - Elements: `ENERGY`, `EARTH` - Categories:
`ENERGY_SAVING` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 1 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: EPA includes turning off unnecessary lights as an everyday
energy-saving behavior. - Reviewed: `2026-10-01`

**Safety:** None.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 1`

------------------------------------------------------------------------

### 02. Switch Off Unused Fans or AC

**Area:** Energy\
**Short description:** Turn off cooling equipment when an unoccupied
space no longer needs it.

**Description:** Turn off cooling equipment when an unoccupied space no
longer needs it.

**Instructions** 1. When leaving a room, check whether the fan or AC
needs to remain on. 2. If cooling is unnecessary, switch it off.

**Classification** - Elements: `ENERGY`, `AIR`, `EARTH` - Categories:
`ENERGY_SAVING` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 1 minutes

**Evidence** - Level: `WIDELY_ACCEPTED` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: Reducing unnecessary household energy use is established
energy-efficiency guidance. - Reviewed: `2026-10-01`

**Safety:** Do not switch off cooling if doing so would create a
safety/health issue for a person, animal, or required equipment.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 2`

------------------------------------------------------------------------

### 03. Unplug an Unused Device

**Area:** Energy\
**Short description:** Disconnect one device that is not needed and does
not need to stay powered.

**Description:** Disconnect one device that is not needed and does not
need to stay powered.

**Instructions** 1. Choose a device that is not in use. 2. Confirm it
does not need continuous power, then switch it off and unplug it safely.

**Classification** - Elements: `ENERGY`, `EARTH` - Categories:
`ENERGY_SAVING` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `VERY_EASY` -
Estimated duration: 2 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: EPA guidance includes unplugging electronics when they are
not in use. - Reviewed: `2026-10-01`

**Safety:** Never unplug medical devices, safety equipment,
refrigerators, network equipment, or equipment that must remain powered.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 3`

------------------------------------------------------------------------

### 04. Choose Natural Light

**Area:** Energy\
**Short description:** Use available daylight instead of unnecessary
artificial lighting when practical.

**Description:** Use available daylight instead of unnecessary
artificial lighting when practical.

**Instructions** 1. Notice whether daylight is sufficient. 2. If safe
and practical, keep unnecessary artificial lights off.

**Classification** - Elements: `ENERGY`, `EARTH` - Categories:
`ENERGY_SAVING` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 1 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Five Tips for Living More Sustainably -
URL:
https://www.unep.org/news-and-stories/story/five-tips-living-more-sustainably -
Rationale: UNEP includes making use of natural light as a practical
sustainability behavior. - Reviewed: `2026-10-01`

**Safety:** Use adequate lighting for safe movement, work, reading, or
other tasks.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 4`

------------------------------------------------------------------------

### 05. Turn Off the Tap While Brushing

**Area:** Water\
**Short description:** Keep the tap off while brushing and turn it on
only when needed.

**Description:** Keep the tap off while brushing and turn it on only
when needed.

**Instructions** 1. Turn the tap off while brushing. 2. Turn it back on
only when needed for rinsing.

**Classification** - Elements: `WATER`, `EARTH` - Categories:
`WATER_CONSERVATION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 3 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change: Water - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-water -
Rationale: EPA recommends not letting faucets run unnecessarily. -
Reviewed: `2026-10-01`

**Safety:** None.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 5`

------------------------------------------------------------------------

### 06. Take a Shorter Shower

**Area:** Water\
**Short description:** Reduce shower time when practical and
comfortable.

**Description:** Reduce shower time when practical and comfortable.

**Instructions** 1. Take your normal shower. 2. Aim to finish a little
sooner while maintaining hygiene and comfort.

**Classification** - Elements: `WATER`, `ENERGY`, `EARTH` - Categories:
`WATER_CONSERVATION`, `ENERGY_SAVING` - Action type: `PERSONAL` -
Completion type: `SELF_REPORTED` - Repeat type: `DAILY` - Difficulty:
`EASY` - Estimated duration: 10 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change: Water - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-water -
Rationale: EPA identifies shorter showers as a practical household
water-saving behavior. - Reviewed: `2026-10-01`

**Safety:** Do not reduce necessary hygiene or medical care.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 6`

------------------------------------------------------------------------

### 07. Stop Unnecessary Running Water

**Area:** Water\
**Short description:** Notice one situation where water is running
unnecessarily and stop it.

**Description:** Notice one situation where water is running
unnecessarily and stop it.

**Instructions** 1. Notice a faucet or water source running
unnecessarily. 2. Turn it off when safe and practical.

**Classification** - Elements: `WATER`, `EARTH` - Categories:
`WATER_CONSERVATION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `VERY_EASY` -
Estimated duration: 1 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change: Water - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change-water -
Rationale: EPA recommends avoiding unnecessary running water. -
Reviewed: `2026-10-01`

**Safety:** None.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 7`

------------------------------------------------------------------------

### 08. Care for a Tree or Plant

**Area:** Nature\
**Short description:** Give a tree or plant the care it actually needs.

**Description:** Give a tree or plant the care it actually needs.

**Instructions** 1. Choose a tree or plant you are responsible for or
permitted to care for. 2. Check what it actually needs and provide
appropriate care.

**Classification** - Elements: `EARTH`, `WATER`, `SPIRIT` - Categories:
`NATURE`, `WATER_CONSERVATION` - Action type: `NATURE` - Completion
type: `SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 10 minutes

**Evidence** - Level: `WIDELY_ACCEPTED` - Organization: WIOF - Source:
WIOF curated action based on nature-care principles - URL:
https://worldisonefamily.com/home - Rationale: A practical
nature-positive behavior; wording avoids indiscriminate watering or
planting. - Reviewed: `2026-10-01`

**Safety:** Do not enter restricted property, damage vegetation, or
overwater.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 8`

------------------------------------------------------------------------

### 09. No Litter Today

**Area:** Waste\
**Short description:** Keep your own waste with you until you find an
appropriate disposal option.

**Description:** Keep your own waste with you until you find an
appropriate disposal option.

**Instructions** 1. Keep your waste with you when no suitable bin is
available. 2. Dispose of it through an appropriate waste system when
available.

**Classification** - Elements: `EARTH`, `WATER`, `SPIRIT` - Categories:
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 1 minutes

**Evidence** - Level: `WIDELY_ACCEPTED` - Organization: United Nations
Environment Programme - Source: Zero Waste 101 - URL:
https://www.unep.org/interactives/zero-waste-101/ - Rationale:
Preventing litter and responsible waste management align with zero-waste
principles. - Reviewed: `2026-10-01`

**Safety:** Do not pick up hazardous, sharp, medical, chemical, or
unknown waste.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 9`

------------------------------------------------------------------------

### 10. Sort Your Household Waste

**Area:** Waste\
**Short description:** Separate household waste according to the waste
system available where you live.

**Description:** Separate household waste according to the waste system
available where you live.

**Instructions** 1. Check local waste-separation rules. 2. Separate
streams only where the local system supports them.

**Classification** - Elements: `EARTH`, `WATER` - Categories:
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `EASY` - Estimated
duration: 5 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Zero Waste 101 - URL:
https://www.unep.org/interactives/zero-waste-101/ - Rationale: UNEP
encourages appropriate waste sorting and responsible waste management. -
Reviewed: `2026-10-01`

**Safety:** Follow local rules for batteries, chemicals, medical waste,
electronics, and special waste.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 10`

------------------------------------------------------------------------

### 11. Carry a Reusable Bottle

**Area:** Waste\
**Short description:** Carry a reusable bottle when practical instead of
relying on single-use bottles.

**Description:** Carry a reusable bottle when practical instead of
relying on single-use bottles.

**Instructions** 1. Use a reusable bottle when practical. 2. Clean it
regularly and refill it with safe drinking water.

**Classification** - Elements: `EARTH`, `WATER` - Categories:
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 2 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Five Tips for Living More Sustainably -
URL:
https://www.unep.org/news-and-stories/story/five-tips-living-more-sustainably -
Rationale: UNEP recommends reusable products to reduce unnecessary
consumption and waste. - Reviewed: `2026-10-01`

**Safety:** Use safe drinking water and clean the bottle appropriately.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 11`

------------------------------------------------------------------------

### 12. Carry a Reusable Bag

**Area:** Waste\
**Short description:** Use a reusable shopping or carry bag when
practical.

**Description:** Use a reusable shopping or carry bag when practical.

**Instructions** 1. Keep a reusable bag where you are likely to need it.
2. Use it for a suitable shopping or carrying trip.

**Classification** - Elements: `EARTH` - Categories: `WASTE_REDUCTION` -
Action type: `PERSONAL` - Completion type: `SELF_REPORTED` - Repeat
type: `REPEATABLE` - Difficulty: `VERY_EASY` - Estimated duration: 2
minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Zero Waste 101 - URL:
https://www.unep.org/interactives/zero-waste-101/ - Rationale: UNEP
includes reusable bags and containers among practical waste-reduction
behaviors. - Reviewed: `2026-10-01`

**Safety:** None.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 12`

------------------------------------------------------------------------

### 13. Give Something a Second Life

**Area:** Waste\
**Short description:** Reuse, donate, share, or repurpose something you
no longer need.

**Description:** Reuse, donate, share, or repurpose something you no
longer need.

**Instructions** 1. Choose one usable item you no longer need. 2. Reuse,
donate, share, or repurpose it when practical.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories:
`WASTE_REDUCTION`, `COMMUNITY` - Action type: `COMMUNITY` - Completion
type: `SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 15 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Zero Waste 101 - URL:
https://www.unep.org/interactives/zero-waste-101/ - Rationale: UNEP
promotes reuse and extending product life. - Reviewed: `2026-10-01`

**Safety:** Only donate/share items that are safe and suitable for
continued use.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 13`

------------------------------------------------------------------------

### 14. Repair Before Replacing

**Area:** Waste\
**Short description:** When something is repairable, consider fixing it
before buying a replacement.

**Description:** When something is repairable, consider fixing it before
buying a replacement.

**Instructions** 1. Choose an item that is damaged or not working
properly. 2. Consider a safe repair yourself or use an appropriate
repair service.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories:
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 30 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Five Tips for Living More Sustainably -
URL:
https://www.unep.org/news-and-stories/story/five-tips-living-more-sustainably -
Rationale: UNEP recommends repair and extending product life. -
Reviewed: `2026-10-01`

**Safety:** Do not attempt electrical, gas, structural, or other
hazardous repairs unless appropriately qualified.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 14`

------------------------------------------------------------------------

### 15. Avoid Unnecessary Single-Use Items

**Area:** Waste\
**Short description:** Choose a reusable or existing alternative when
practical.

**Description:** Choose a reusable or existing alternative when
practical.

**Instructions** 1. Notice one unnecessary single-use item. 2. Choose a
reusable or existing alternative when practical.

**Classification** - Elements: `EARTH`, `WATER` - Categories:
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `VERY_EASY` -
Estimated duration: 2 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Our Everyday Choices Matter - URL:
https://www.unep.org/interactives/things-you-can-do/ - Rationale: UNEP
encourages reducing unnecessary consumption and choosing reusable
options. - Reviewed: `2026-10-01`

**Safety:** Prioritize hygiene, food safety, medical needs, and
accessibility.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 15`

------------------------------------------------------------------------

### 16. Serve Only What You Expect to Eat

**Area:** Food\
**Short description:** Start with a portion you expect to finish and
take more later if needed.

**Description:** Start with a portion you expect to finish and take more
later if needed.

**Instructions** 1. Think about how much food you are likely to eat. 2.
Start with a reasonable portion and take more later if needed.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories: `FOOD`,
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 2 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Food Waste - URL:
https://www.unep.org/ - Rationale: UNEP food-waste guidance encourages
appropriate portions and avoiding food waste. - Reviewed: `2026-10-01`

**Safety:** This is about reducing waste, not restricting food intake;
eat according to your needs.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 16`

------------------------------------------------------------------------

### 17. Use a Leftover

**Area:** Food\
**Short description:** Use suitable leftover food instead of letting it
go to waste.

**Description:** Use suitable leftover food instead of letting it go to
waste.

**Instructions** 1. Check whether you have a suitable leftover. 2. If it
was stored safely, use it before it becomes waste.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories: `FOOD`,
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 10 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Food Waste - URL:
https://www.unep.org/ - Rationale: UNEP recommends using leftovers to
prevent edible food becoming waste. - Reviewed: `2026-10-01`

**Safety:** Follow local food-safety guidance; do not eat spoiled or
unsafe food.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 17`

------------------------------------------------------------------------

### 18. Plan Before Buying Food

**Area:** Food\
**Short description:** Check what you already have and plan what you are
likely to use before shopping.

**Description:** Check what you already have and plan what you are
likely to use before shopping.

**Instructions** 1. Check what food you already have. 2. Plan upcoming
meals and make a practical shopping list.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories: `FOOD`,
`WASTE_REDUCTION` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 10 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Food Waste - URL:
https://www.unep.org/ - Rationale: UNEP recommends planning meals and
buying only what is expected to be used. - Reviewed: `2026-10-01`

**Safety:** None.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 18`

------------------------------------------------------------------------

### 19. Share Suitable Surplus Food

**Area:** Food\
**Short description:** If you have safe, suitable surplus food, share it
with someone who can use it.

**Description:** If you have safe, suitable surplus food, share it with
someone who can use it.

**Instructions** 1. Identify safe, suitable surplus food. 2. Offer it to
someone or an appropriate local sharing option.

**Classification** - Elements: `EARTH`, `SPIRIT` - Categories: `FOOD`,
`WASTE_REDUCTION`, `COMMUNITY` - Action type: `COMMUNITY` - Completion
type: `SELF_REPORTED` - Repeat type: `OCCASIONAL` - Difficulty: `EASY` -
Estimated duration: 15 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: United Nations
Environment Programme - Source: Food Waste - URL:
https://www.unep.org/ - Rationale: UNEP identifies sharing suitable
surplus food as a way to prevent food waste. - Reviewed: `2026-10-01`

**Safety:** Share only food that is safe and appropriate; follow
applicable local food-safety rules.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 19`

------------------------------------------------------------------------

### 20. Walk a Short Trip

**Area:** Mobility\
**Short description:** For a short journey, walk when it is practical,
safe, and accessible.

**Description:** For a short journey, walk when it is practical, safe,
and accessible.

**Instructions** 1. Choose a short trip you would normally make by
motorized transport. 2. Walk it if the distance, conditions, safety, and
accessibility make it suitable.

**Classification** - Elements: `AIR`, `ENERGY`, `EARTH` - Categories:
`MOBILITY` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 20 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: EPA includes walking among transportation choices that can
reduce emissions. - Reviewed: `2026-10-01`

**Safety:** Do not walk where conditions are unsafe or inaccessible.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 20`

------------------------------------------------------------------------

### 21. Use Public Transportation

**Area:** Mobility\
**Short description:** Choose public transportation for a suitable trip
when it is available and practical.

**Description:** Choose public transportation for a suitable trip when
it is available and practical.

**Instructions** 1. Choose a suitable upcoming trip. 2. Use public
transportation when route, timing, safety, cost, and accessibility work
for you.

**Classification** - Elements: `AIR`, `ENERGY`, `EARTH` - Categories:
`MOBILITY` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 30 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: EPA identifies public transportation as a way to reduce
transportation-related emissions. - Reviewed: `2026-10-01`

**Safety:** Prioritize personal safety and local travel conditions.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 21`

------------------------------------------------------------------------

### 22. Share a Ride

**Area:** Mobility\
**Short description:** Share a suitable journey with another person when
practical and safe.

**Description:** Share a suitable journey with another person when
practical and safe.

**Instructions** 1. Identify a compatible journey with another person.
2. Coordinate and share the ride safely when practical.

**Classification** - Elements: `AIR`, `ENERGY`, `EARTH`, `SPIRIT` -
Categories: `MOBILITY`, `COMMUNITY` - Action type: `COMMUNITY` -
Completion type: `SELF_REPORTED` - Repeat type: `REPEATABLE` -
Difficulty: `EASY` - Estimated duration: 30 minutes

**Evidence** - Level: `OFFICIAL_SUPPORT` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: EPA identifies carpooling and shared transportation as ways
to reduce transportation emissions. - Reviewed: `2026-10-01`

**Safety:** Only share rides with appropriate people and use safe travel
practices.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 22`

------------------------------------------------------------------------

### 23. Combine Errands

**Area:** Mobility\
**Short description:** Combine two or more suitable trips into one
journey when practical.

**Description:** Combine two or more suitable trips into one journey
when practical.

**Instructions** 1. Look at upcoming errands. 2. Identify compatible
stops and combine them into one practical trip.

**Classification** - Elements: `AIR`, `ENERGY`, `EARTH` - Categories:
`MOBILITY` - Action type: `PERSONAL` - Completion type:
`SELF_REPORTED` - Repeat type: `REPEATABLE` - Difficulty: `EASY` -
Estimated duration: 10 minutes

**Evidence** - Level: `WIDELY_ACCEPTED` - Organization: U.S.
Environmental Protection Agency - Source: What You Can Do About Climate
Change - URL:
https://www.epa.gov/climate-change/what-you-can-do-about-climate-change -
Rationale: Combining trips can reduce unnecessary travel; WIOF makes no
fixed emissions claim. - Reviewed: `2026-10-01`

**Safety:** Do not make a trip unnecessarily complicated or unsafe just
to combine errands.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 23`

------------------------------------------------------------------------

### 24. Spend 10 Minutes With Nature

**Area:** Nature / Spirit\
**Short description:** Spend a few quiet minutes noticing the natural
world around you.

**Description:** Spend a few quiet minutes noticing the natural world
around you.

**Instructions** 1. Choose a safe place with some natural elements. 2.
Spend about 10 minutes there simply observing and being present.

**Classification** - Elements: `SPIRIT`, `EARTH`, `AIR` - Categories:
`NATURE`, `MINDFULNESS` - Action type: `NATURE` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 10 minutes

**Evidence** - Level: `WIOF_CURATED` - Organization: WIOF - Source: WIOF
curated nature-awareness action - URL:
https://worldisonefamily.com/home - Rationale: A WIOF-created reflective
action; no quantified environmental impact is claimed. - Reviewed:
`2026-10-01`

**Safety:** Choose a safe, permitted location and remain aware of
surroundings.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: true` -
`displayOrder: 24`

------------------------------------------------------------------------

### 25. Notice One Living Thing

**Area:** Nature / Spirit\
**Short description:** Pause and intentionally notice one plant, tree,
bird, insect, or other living thing without disturbing it.

**Description:** Pause and intentionally notice one plant, tree, bird,
insect, or other living thing without disturbing it.

**Instructions** 1. Choose a safe place where you can observe nature. 2.
Notice one living thing without touching, feeding, chasing, or
disturbing it.

**Classification** - Elements: `SPIRIT`, `EARTH` - Categories: `NATURE`,
`MINDFULNESS` - Action type: `NATURE` - Completion type:
`SELF_REPORTED` - Repeat type: `DAILY` - Difficulty: `VERY_EASY` -
Estimated duration: 5 minutes

**Evidence** - Level: `WIOF_CURATED` - Organization: WIOF - Source: WIOF
curated nature-awareness action - URL:
https://worldisonefamily.com/home - Rationale: A WIOF-created awareness
action; it does not claim measurable environmental impact. - Reviewed:
`2026-10-01`

**Safety:** Do not touch, feed, approach, or disturb wildlife; observe
from a safe distance.

**Accessibility:** Users should adapt or choose another action where
mobility, health, safety, access, or local conditions make this action
unsuitable.

**Initial state** - `isActive: true` - `isFeatured: false` -
`displayOrder: 25`

------------------------------------------------------------------------

## Implementation rules

1.  `actions` is the reusable catalogue definition; do not create a new
    definition per completion.
2.  User completion/history belongs in `user_actions`.
3.  `activity_log` remains analytics, not the source of truth for
    completion.
4.  Admins must be able to create, edit, reorder, feature, and
    deactivate actions without deployment.
5.  Preserve action/version context in user history.
6.  Do not create unbounded arrays such as `completedActions[]` on the
    user document.
7.  V1 actions are self-reported unless a future action explicitly
    supports system recording/verification.
8.  Do not imply WIOF independently verified a self-reported completion.
9.  Do not calculate CO2, water, energy, waste, or other quantified
    impact until WIOF establishes a documented methodology, assumptions,
    geography, baseline, and version.
10. Element pages should consume the same shared catalogue and filter it
    contextually; do not maintain separate hardcoded action lists.

## User completion model

Recommended `user_actions` record:

``` ts
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

For repeatable actions, use completion/history records rather than
creating duplicate action definitions.

## V1 exclusions

Do not make these universal V1 actions: - Install solar panels - Buy an
electric vehicle - Install rainwater harvesting - Mandatory home
composting - Plant a tree without species/location/care guidance - Pick
up unknown or hazardous litter - Expensive home upgrades -
Specialist-equipment actions - Unsupported numerical impact claims

## Editorial gate for future actions

Before adding an action, confirm: 1. A general user can realistically do
it. 2. It is safe. 3. It is reasonably accessible. 4. There is credible
supporting evidence or it is clearly labeled `WIOF_CURATED`. 5. The
wording does not exaggerate impact. 6. It does not require significant
spending. 7. It does not require specialist knowledge. 8. It does not
conflict with health, cultural, religious, dietary, or accessibility
needs. 9. It does not encourage unsafe environmental intervention. 10.
WIOF can clearly explain why the action belongs in the catalogue.

## Future-ready extensions

The schema leaves room for event actions, challenges, community
campaigns, partner/NGO actions, attendance verification, optional
evidence, recommendations, location-aware actions, achievements, Planet
Passport, and scientifically defensible impact calculations.

**Production baseline: 25 actions.** The catalogue should be expanded
only after reviewing actual user behavior and editorial evidence.
