/**
 * Planet Passport v1 catalogue (docs/PLANET_PASSPORT_DESIGN.md §3a,
 * docs/PLANET_PASSPORT_V1_PROPOSAL.md). The single source of the stamp
 * definitions: the award trigger evaluates these rules, and
 * scripts/sync-passport-catalogue.js copies the display fields into
 * passport_stamp_defs for the app.
 *
 * Changing a rule or target of a published stamp: bump that stamp's
 * `version` (earned records keep the version they were earned under).
 * Retiring a stamp: set status 'retired', never delete it.
 */

/** Bumped when the meaning of a rule type changes (passport.js). */
const RULES_VERSION = 1;
/** Bumped whenever this file changes. */
const CATALOGUE_VERSION = 3; // 2: "an Air/Energy/Earth action"; 3: display names ("Honeycomb", not "Honey comb")

const ELEMENTS = [
  { slug: 'air', name: 'Air' },
  { slug: 'energy', name: 'Energy' },
  { slug: 'water', name: 'Water' },
  { slug: 'earth', name: 'Earth' },
  { slug: 'spirit', name: 'Spirit' }
];

const INK = {
  air: '#3E7CA6',
  energy: '#B06A12',
  water: '#1A7A7F',
  earth: '#6B5A2E',
  spirit: '#7A4E7E',
  journey: '#145C5F'
};

/** The rule types the evaluator knows (passport.js progressFor). */
const RULE_TYPES = new Set([
  'first_steps', 'element_visit', 'stories_read', 'videos_finished', 'polls_voted', 'eq_taken',
  'different_actions', 'elements_acted', 'element_action_days', 'action_weeks', 'visit_streak'
]);

/** Rules whose element is required. stories_read takes an optional one. */
const ELEMENT_RULES = new Set(['element_visit', 'element_action_days']);

/** Milestones: the number of corners is the number the milestone counts. */
const MILESTONE_SHAPE = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon' };

const FAMILY_SHAPES = {
  milestone: new Set(['circle', 'triangle', 'square', 'pentagon', 'hexagon']),
  travel: new Set(['oval', 'rect']),
  streak: new Set(['rosette'])
};

/** Highest target a rule can reach (undefined: no limit). */
const MAX_TARGET = { first_steps: 5, element_visit: 1, eq_taken: 1, elements_acted: ELEMENTS.length };

const GUARDIAN = {
  air: ['Clean Air', 'Guardian'],
  energy: ['Sun', 'Keeper'],
  water: ['River', 'Guardian'],
  earth: ['Earth', 'Protector'],
  spirit: ['Mindful', 'Living']
};

const ARRIVAL = {
  air: ['First', 'Breath'],
  energy: ['First', 'Spark'],
  water: ['First', 'Drop'],
  earth: ['First', 'Footprint'],
  spirit: ['First', 'Light']
};

/** Names that are one word, split over two lines on the stamp. */
const ONE_WORD_NAMES = { earthrise: 'Earthrise', evergreen: 'Evergreen', snowflake: 'Snowflake', honeycomb: 'Honeycomb' };

function def(fields) {
  return {
    version: 1, status: 'active', element: null, ...fields,
    // The badge's name in sentences ("You earned Honeycomb"); the title is how it's laid out on the stamp.
    name: fields.name || ONE_WORD_NAMES[fields.id] || fields.title.join(' '),
    ink: fields.ink || INK[fields.element || 'journey']
  };
}

const LADDER = [
  { target: 3, actions: ['three-seeds', ['Three', 'Seeds'], 'Small things planted that will grow.'],
    elements: ['delta', ['Delta'], 'Like a river delta, your care is spreading out.'],
    weeks: ['taking-root', ['Taking', 'Root'], 'One action, three weeks: a habit starting to hold.'] },
  { target: 4, actions: ['four-winds', ['Four', 'Winds'], 'Trying things from every direction.'],
    elements: ['compass', ['Compass'], 'Four points: finding your way around the planet.'],
    weeks: ['full-moon', ['Full', 'Moon'], 'One action through a whole moon cycle.'] },
  { target: 5, actions: ['five-petals', ['Five', 'Petals'], 'Five different actions, like the five petals of a flower.'],
    elements: ['one-family', ['One', 'Family'], 'All five elements. One family.'],
    weeks: ['evergreen', ['Ever', 'green'], 'One action, five weeks: it stays green.'] },
  { target: 6, actions: ['snowflake', ['Snow', 'flake'], 'Six different actions, and no two the same.'],
    weeks: ['honeycomb', ['Honey', 'comb'], 'One action on six different weeks, built cell by cell.'] }
];

function buildCatalogue() {
  const stamps = [];
  let order = 0;
  const add = (fields) => stamps.push(def({ ...fields, order: ++order }));

  // Milestones.
  add({ id: 'earthrise', family: 'milestone', shape: 'circle', title: ['Earth', 'rise'], caption: 'WELCOME',
    meaning: 'Your first steps on WIOF: the start of seeing the planet as one home.',
    hint: 'Complete your 5 first steps', unit: 'steps', rule: { type: 'first_steps', target: 5 } });
  for (const level of LADDER) {
    const shape = MILESTONE_SHAPE[level.target];
    const n = level.target;
    if (level.actions) {
      const [id, title, meaning] = level.actions;
      add({ id, family: 'milestone', shape, title, caption: 'MILESTONE', meaning, unit: 'actions',
        hint: `Do ${n} different actions, on ${n} different days`, rule: { type: 'different_actions', target: n } });
    }
    if (level.elements) {
      const [id, title, meaning] = level.elements;
      add({ id, family: 'milestone', shape, title, caption: 'MILESTONE', meaning, unit: 'elements',
        hint: n === 5 ? 'Take actions in all 5 elements, on different days' : `Take actions in ${n} elements, on different days`,
        rule: { type: 'elements_acted', target: n } });
    }
    if (level.weeks) {
      const [id, title, meaning] = level.weeks;
      add({ id, family: 'milestone', shape, title, caption: 'MILESTONE', meaning, unit: 'weeks',
        hint: `Keep one action going in ${n} different weeks`, rule: { type: 'action_weeks', target: n } });
    }
  }
  for (const { slug, name } of ELEMENTS) {
    add({ id: `${slug}-guardian`, family: 'milestone', shape: 'pentagon', element: slug, title: GUARDIAN[slug],
      caption: name.toUpperCase(), meaning: `${name} actions on five different days.`, unit: 'days',
      hint: `Take ${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name} action on 5 different days`, rule: { type: 'element_action_days', element: slug, target: 5 } });
  }

  // Travel.
  for (const { slug, name } of ELEMENTS) {
    add({ id: `${slug}-arrival`, family: 'travel', shape: 'oval', element: slug, title: ARRIVAL[slug],
      caption: name.toUpperCase(), meaning: `You arrived in ${name}.`, unit: 'visit',
      hint: `Visit the ${name} page`, rule: { type: 'element_visit', element: slug, target: 1 } });
    add({ id: `${slug}-explorer`, family: 'travel', shape: 'rect', element: slug, title: [name, 'Explorer'],
      caption: name.toUpperCase(), meaning: `Five ${name} stories, read to the end.`, unit: 'stories',
      hint: `Read 5 ${name} stories`, rule: { type: 'stories_read', element: slug, target: 5 } });
  }
  add({ id: 'knowledge-explorer', family: 'travel', shape: 'rect', ink: INK.air, title: ['Knowledge', 'Explorer'], caption: 'JOURNEY',
    meaning: 'Ten stories read to the end.', unit: 'stories', hint: 'Read 10 stories to the end', rule: { type: 'stories_read', target: 10 } });
  add({ id: 'good-watch', family: 'travel', shape: 'oval', ink: INK.air, title: ['Good', 'Watch'], caption: 'VIDEOS',
    meaning: 'Three videos watched to the end.', unit: 'videos', hint: 'Watch 3 videos to the end', rule: { type: 'videos_finished', target: 3 } });
  add({ id: 'your-voice', family: 'travel', shape: 'rect', title: ['Your', 'Voice'], caption: 'POLLS',
    meaning: 'You had your say in a poll.', unit: 'vote', hint: 'Vote in a poll', rule: { type: 'polls_voted', target: 1 } });
  add({ id: 'inner-weather', family: 'travel', shape: 'oval', ink: INK.spirit, title: ['Inner', 'Weather'], caption: 'EQ',
    meaning: 'You took the EQ reflection.', unit: 'reflection', hint: 'Take the EQ reflection', rule: { type: 'eq_taken', target: 1 } });

  // Streaks: appreciation only.
  add({ id: 'seven-sunrises', family: 'streak', shape: 'rosette', ink: INK.energy, title: ['Seven', 'Sunrises'], caption: 'THANK YOU',
    meaning: 'Seven days in a row. Thank you for coming back.', unit: 'days', hint: 'Visit 7 days in a row', rule: { type: 'visit_streak', target: 7 } });
  add({ id: 'thirty-dawns', family: 'streak', shape: 'rosette', ink: INK.spirit, title: ['Thirty', 'Dawns'], caption: 'THANK YOU',
    meaning: 'Thirty days in a row. Thank you for coming back.', unit: 'days', hint: 'Visit 30 days in a row', rule: { type: 'visit_streak', target: 30 } });

  return stamps;
}

/** Problems with a catalogue, as readable strings ([] when valid). */
function validateCatalogue(stamps) {
  const problems = [];
  const ids = new Set();
  const elementSlugs = new Set(ELEMENTS.map((e) => e.slug));
  for (const s of stamps) {
    const where = s && s.id ? s.id : '(no id)';
    if (!s || typeof s.id !== 'string' || !/^[a-z0-9-]{2,40}$/.test(s.id)) problems.push(`${where}: bad id`);
    if (ids.has(s.id)) problems.push(`${where}: duplicate id`);
    ids.add(s.id);
    if (!FAMILY_SHAPES[s.family]) { problems.push(`${where}: unknown family ${s.family}`); continue; }
    if (!FAMILY_SHAPES[s.family].has(s.shape)) problems.push(`${where}: shape ${s.shape} not allowed for ${s.family}`);
    if (!Array.isArray(s.title) || s.title.length < 1 || s.title.length > 2) problems.push(`${where}: title must be 1-2 lines`);
    if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 40) problems.push(`${where}: name is required (up to 40 characters)`);
    if (!s.meaning || !s.hint) problems.push(`${where}: meaning and hint are required`);
    if (!Number.isInteger(s.version) || s.version < 1) problems.push(`${where}: bad version`);
    if (!['draft', 'active', 'retired'].includes(s.status)) problems.push(`${where}: bad status`);
    if (s.element !== null && !elementSlugs.has(s.element)) problems.push(`${where}: unknown element`);
    const rule = s.rule || {};
    if (!RULE_TYPES.has(rule.type)) { problems.push(`${where}: unknown rule ${rule.type}`); continue; }
    if (!Number.isInteger(rule.target) || rule.target < 1) problems.push(`${where}: bad target`);
    if (MAX_TARGET[rule.type] !== undefined && rule.target > MAX_TARGET[rule.type]) problems.push(`${where}: target ${rule.target} can't be reached`);
    if (ELEMENT_RULES.has(rule.type) && !elementSlugs.has(rule.element)) problems.push(`${where}: rule needs an element`);
    if (rule.element !== undefined && rule.element !== s.element) problems.push(`${where}: rule element differs from stamp element`);
    if (s.family === 'milestone') {
      const expected = rule.type === 'first_steps' ? 'circle' : MILESTONE_SHAPE[rule.target];
      if (s.shape !== expected) problems.push(`${where}: a milestone counting ${rule.target} must be a ${expected || 'polygon of 3-6 corners'}`);
    }
  }
  return problems;
}

const CATALOGUE = Object.freeze(buildCatalogue().map((s) => Object.freeze(s)));

module.exports = {
  CATALOGUE, CATALOGUE_VERSION, ELEMENTS, INK, MILESTONE_SHAPE, RULES_VERSION, RULE_TYPES, validateCatalogue
};
