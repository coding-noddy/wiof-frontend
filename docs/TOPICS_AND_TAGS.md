# Topics: one shared list for all WIOF content

**Status:** proposal for approval (2026-11-05). Nothing here is built yet.

## Why

Today every content type names its subject differently:

- Stories have a free-text **sub-category**. On staging that gives 23 names for 28 stories. Some are duplicates ("River" / "Rivers"). Some name one story or organisation rather than a subject ("Khalsa aid", "Covid", "Fire").
- Actions have their own **categories** (`waste-reduction`, `mindfulness`, …) and a few **tags**.
- Videos, In Focus, NGOs, courses, calendar occasions and coffee conversations have no topic at all.

So two items about rainwater harvesting can't be connected unless an admin links them by hand, or their words happen to match.

## Proposal

**One controlled list of topics, shared by every content type.** It is admin-managed and works as the tags. This is the standard approach for a content site (a managed taxonomy with synonyms).

- **What a topic has:**
  - a name, such as "Rainwater harvesting";
  - one home element (Water);
  - a short description;
  - synonyms the keyword matcher should treat as the same topic ("rain harvesting", "rooftop harvesting").
- **Where topics are stored:** a `topics` collection, edited in Admin → Topics. Topics can be retired but not deleted, so old links never break.
- **How content uses them:** every content type stores `topicIds` (one to three), picked from the list in its admin form. That covers stories, videos, actions, calendar occasions, In Focus, NGOs, courses and coffee conversations. Free text isn't allowed, which is what stops the list sprawling again.
- **Why not free tags:** they are how the current sprawl happened. If editors need something the list lacks, they ask for a new topic and an admin adds it, usually the same day.
- **Kept separate from topics:**
  - an action's *type* (`daily-habit`, `one-off`), which is a format rather than a subject;
  - a course's level or cost.
  These can become filters later.

### What topics unlock

| Where | Today | With topics |
|---|---|---|
| Explore next | keyword similarity + admin links | items sharing a topic rank first, and the heading reads "More on Rainwater harvesting" |
| Next for you | similar to what you read | also "More on Yoga & mindfulness" from topics you've read about |
| Today on WIOF | keyword match on the occasion's text | an occasion tagged "Rivers & lakes" gets river stories and actions directly |
| Courses (future) | none | "Learn more: a course on Solar energy" under a solar story or action |
| Topic pages (later) | none | `/topic/rainwater-harvesting`: everything on one subject, across all content types |
| Search and analytics | none | which topics people read and act on |

## Draft topic list (32)

Each topic has one home element, and content can carry topics from any element. The "From" column shows what the topic replaces from staging today: story sub-categories in plain text, action categories in `code`. Prod's names may differ: run `node scripts/report-topics.js --project prod` and paste me the output, and I'll map those too.

### Air

| Topic | Covers | From |
|---|---|---|
| Air pollution & AQI | smog, indoor air, AQI | Air Pollution, AQI, Covid (story is about lockdown air, check) |
| Climate change | warming, emissions, CO₂ | Greenhouse impact |
| Wildfires | bush and forest fires | Bush Fires |
| Clean transport | walking, cycling, public transport, EVs | `mobility` |
| Ozone & atmosphere | ozone layer, weather | (none yet) |
| Birds | birds and migration | (none yet) |

### Water

| Topic | Covers | From |
|---|---|---|
| Rivers & lakes | rivers, river rejuvenation, freshwater life | River, Rivers |
| Oceans & coral reefs | seas, reefs, marine life | (none yet) |
| Rainwater harvesting | rooftop and community harvesting | Rainwater Harvesting |
| Saving water at home | taps, showers, leaks | `water-conservation`, Sustainable water systems |
| Wetlands | marshes, mangroves | (none yet) |
| Clean water & sanitation | drinking water, access, hygiene | Food and Education (check) |

### Earth

| Topic | Covers | From |
|---|---|---|
| Plant-based food | vegan and vegetarian eating | Veganism, part of `food` |
| Growing food | kitchen gardens, fruit, vegetables | Vegetable Garden, Growing Fruits, part of `food` |
| Soil | soil health, composting | (tag `soil`) |
| Waste & recycling | reduce, reuse, recycle | `waste-reduction` |
| Plastic pollution | single-use plastic | part of `waste-reduction` |
| Forests & trees | forests, planting, urban trees | part of `nature` |
| Wildlife & biodiversity | endangered species, habitats | part of `nature` |
| Bees & pollinators | bees, butterflies | Honey Bees |
| Mindful consumption | buying less and better, fashion | Minds & Closets with Mindful Spending |
| Animal welfare | pets, rescue, animal care | (none yet) |

### Energy

| Topic | Covers | From |
|---|---|---|
| Solar energy | solar panels, solar cooking | Solar Energy |
| Wind energy | wind power | Wind Energy |
| Hydropower | energy from water | Water Energy |
| Renewable energy | clean energy in general | Sustainable Energy, Fire (check) |
| Saving energy at home | lights, appliances, cooling | `energy-saving` |

### Spirit

| Topic | Covers | From |
|---|---|---|
| Yoga & mindfulness | yoga, meditation, breathing | Yoga, `mindfulness` |
| Sleep & wellbeing | sleep, rest, healthy routines | Healthy sleep and Productive life |
| Mental health | stress, emotions, EQ | (none yet) |
| Self-realisation | purpose, reflection | Self realisation |
| Kindness & community | volunteering, charity, social work | Khalsa aid, Social Work, `community` |

## How it would be built (one release, after approval)

1. The `topics` collection and Admin → Topics, seeded with the approved list.
2. A topic picker (one to three topics) in every admin content form.
3. A migration script: dry run, then `--apply`, staging then prod. It maps today's sub-categories and action categories to topics using a mapping file you review first. Names it can't map are listed for an admin to pick by hand.
4. The matcher counts a shared topic as a strong signal. Explore next and Next for you use topic names in their headings and reasons.
5. Later releases:
   - topic pages;
   - "follow a topic", and personalised suggestions from followed topics;
   - courses tagged with topics.

## Decisions needed

1. Approve, change or extend the 32 topics above.
2. Should topics replace the story sub-category everywhere, or keep sub-category as a display label for now? I recommend replacing it, with the migration mapping old names.
3. Who can add topics: any admin, or only a lead editor? I recommend any admin, plus a weekly look at new ones.
