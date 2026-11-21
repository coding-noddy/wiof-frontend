/**
 * Unit tests for passport-definitions.js (Admin → Passport).
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CATALOGUE } = require('./passport-catalogue');
const { cleanInput, loadDefinitions, planChange, resetDefinitionsCache } = require('./passport-definitions');

const form = (over = {}) => ({
  id: 'water-week', family: 'milestone', title: ['Water', 'Week'], name: 'Water Week', caption: 'water',
  meaning: 'Water actions on four different days.', hint: 'Take a Water action on 4 different days', unit: 'days',
  element: 'water', rule: { type: 'element_action_days', target: 4, element: 'water' }, ...over
});

describe('cleanInput', () => {
  it('sets a milestone\'s shape from its target, and fills sensible defaults', () => {
    const def = cleanInput(form({ shape: 'hexagon', ink: 'red' }));
    assert.equal(def.shape, 'square');
    assert.equal(def.caption, 'WATER');
    assert.equal(def.ink, '#1A7A7F');
    assert.deepEqual(def.rule, { type: 'element_action_days', target: 4, element: 'water' });
  });

  it('keeps only known fields and trims text', () => {
    const def = cleanInput(form({ name: '  Water   Week  ', status: 'active', version: 99, evil: '<script>' }));
    assert.equal(def.name, 'Water Week');
    assert.equal(def.status, undefined);
    assert.equal(def.version, undefined);
    assert.equal(def.evil, undefined);
  });

  it('keeps a challenge\'s window and calendar link; other families have none', () => {
    const c = cleanInput({ ...form({ family: 'challenge', shape: 'oval', rule: { type: 'window_actions', target: 1, element: 'water' } }), window: { start: '2027-03-22', end: '2027-03-22' }, calendarId: 'world-water-day' });
    assert.deepEqual(c.window, { start: '2027-03-22', end: '2027-03-22' });
    assert.equal(c.calendarId, 'world-water-day');
    assert.equal(cleanInput({ ...form(), window: { start: '2027-03-22', end: '2027-03-22' } }).window, undefined);
  });
});

describe('planChange', () => {
  it('a new badge is saved as a version 1 draft', () => {
    const r = planChange(null, form(), 'save');
    assert.equal(r.ok, true);
    assert.equal(r.def.status, 'draft');
    assert.equal(r.def.version, 1);
  });

  it('refuses an impossible milestone and an unknown rule, with the reason', () => {
    const impossible = planChange(null, form({ rule: { type: 'elements_acted', target: 6 }, element: null }), 'save');
    assert.equal(impossible.ok, false);
    assert.match(impossible.error, /can't be reached/);
    assert.match(planChange(null, form({ rule: { type: 'magic', target: 3 } }), 'save').error, /unknown rule/);
  });

  it('publish, retire and reactivate move between the right states only', () => {
    const draft = planChange(null, form(), 'save').def;
    assert.equal(planChange(draft, null, 'retire').ok, false);
    const active = planChange(draft, null, 'publish').def;
    assert.equal(active.status, 'active');
    assert.equal(active.everPublished, true);
    assert.equal(planChange(active, null, 'publish').ok, false);
    const retired = planChange(active, null, 'retire').def;
    assert.equal(retired.status, 'retired');
    assert.equal(planChange(retired, null, 'reactivate').def.status, 'active');
  });

  it('changing a published badge\'s target makes a new version; wording does not', () => {
    const active = { ...planChange(null, form(), 'save').def, status: 'active', everPublished: true };
    const reworded = planChange(active, form({ meaning: 'Four days with Water.' }), 'save');
    assert.equal(reworded.def.version, 1);
    assert.equal(reworded.versionBumped, false);
    const harder = planChange(active, form({ rule: { type: 'element_action_days', target: 5, element: 'water' } }), 'save');
    assert.equal(harder.def.version, 2);
    assert.equal(harder.def.shape, 'pentagon');
    assert.equal(harder.def.status, 'active');
  });

  it('a draft can change freely without a new version', () => {
    const draft = planChange(null, form(), 'save').def;
    assert.equal(planChange(draft, form({ rule: { type: 'element_action_days', target: 5, element: 'water' } }), 'save').def.version, 1);
  });

  it('a published badge keeps its ID, family and kind of rule', () => {
    const active = { ...planChange(null, form(), 'save').def, status: 'active', everPublished: true };
    assert.match(planChange(active, form({ id: 'other' }), 'save').error, /keeps its ID/);
    assert.match(planChange(active, form({ family: 'travel', shape: 'oval' }), 'save').error, /keeps its family/);
    assert.match(planChange(active, form({ rule: { type: 'different_actions', target: 4 } }), 'save').error, /kind of rule/);
  });

  it('only a never-published draft can be deleted', () => {
    const draft = planChange(null, form(), 'save').def;
    assert.equal(planChange(draft, null, 'delete').deleted, true);
    const active = planChange(draft, null, 'publish').def;
    assert.match(planChange(active, null, 'delete').error, /retired, never deleted/);
    const backToDraftish = { ...planChange(active, null, 'retire').def };
    assert.equal(planChange(backToDraftish, null, 'delete').ok, false);
  });

  it('validates challenges: a window rule, a window, and an action for action rules', () => {
    const challenge = (over) => ({ ...form({ family: 'challenge', shape: 'oval', rule: { type: 'window_actions', target: 2 }, element: null }), window: { start: '2027-03-22', end: '2027-03-22' }, ...over });
    assert.equal(planChange(null, challenge(), 'save').ok, true);
    assert.match(planChange(null, challenge({ window: { start: '2027-03-23', end: '2027-03-22' } }), 'save').error, /window/);
    assert.match(planChange(null, challenge({ rule: { type: 'different_actions', target: 2 } }), 'save').error, /date-window rule/);
    assert.match(planChange(null, challenge({ rule: { type: 'window_specific_action', target: 1 } }), 'save').error, /needs an action/);
    assert.equal(planChange(null, challenge({ rule: { type: 'window_specific_action', target: 1, actionId: 'fix-a-water-leak' } }), 'save').ok, true);
  });

  it('a milestone can count one specific action', () => {
    const r = planChange(null, form({ id: 'leak-fixer', element: 'water', rule: { type: 'specific_action', target: 3, actionId: 'fix-a-water-leak' } }), 'save');
    assert.equal(r.ok, true);
    assert.equal(r.def.shape, 'triangle');
  });
});

describe('loadDefinitions', () => {
  const fakeDb = (docs, fail = false) => ({
    collection: () => ({ where: () => ({ get: async () => { if (fail) throw new Error('offline'); return { docs: docs.map((d) => ({ id: d.id, data: () => d })) }; } }) })
  });
  const quiet = { warn: () => {} };

  it('reads the definitions from Firestore, skipping invalid ones', async () => {
    resetDefinitionsCache();
    const good = { ...CATALOGUE[1] };
    const bad = { ...CATALOGUE[2], id: 'broken', shape: 'hexagon' };
    const defs = await loadDefinitions(fakeDb([good, bad]), { maxAgeMs: 0, log: quiet });
    assert.deepEqual(defs.map((d) => d.id), [good.id]);
  });

  it('falls back to the code catalogue when Firestore is empty or unreadable', async () => {
    resetDefinitionsCache();
    assert.equal((await loadDefinitions(fakeDb([]), { maxAgeMs: 0, log: quiet })).length, CATALOGUE.length);
    resetDefinitionsCache();
    assert.equal((await loadDefinitions(fakeDb([], true), { maxAgeMs: 0, log: quiet })).length, CATALOGUE.length);
  });
});
