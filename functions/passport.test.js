/**
 * Unit tests for the Planet Passport catalogue and evaluator
 * (passport-catalogue.js, passport.js). No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CATALOGUE, MILESTONE_SHAPE, validateCatalogue } = require('./passport-catalogue');
const {
  emptyLadder, evaluate, firstStepsDone, istDay, istWeek, ladderAfter, newAwards, progressFor, stampDocId, stampRecord
} = require('./passport');

const byId = (id) => CATALOGUE.find((s) => s.id === id);
const earnedIds = (state) => evaluate(state).filter((r) => r.earned).map((r) => r.id);

/** Replays completions through ladderAfter, the way the trigger does. */
function ladderOf(completions) {
  return completions.reduce((ladder, c) => ladderAfter(ladder, c), emptyLadder());
}
const at = (iso) => new Date(iso);

describe('passport catalogue', () => {
  it('is valid', () => {
    assert.deepEqual(validateCatalogue(CATALOGUE), []);
  });

  it('has the agreed families and names', () => {
    const families = new Set(CATALOGUE.map((s) => s.family));
    assert.deepEqual([...families].sort(), ['milestone', 'streak', 'travel']);
    for (const id of ['earthrise', 'three-seeds', 'delta', 'taking-root', 'four-winds', 'compass', 'full-moon', 'five-petals',
      'one-family', 'evergreen', 'snowflake', 'honeycomb', 'energy-guardian', 'water-arrival', 'seven-sunrises', 'thirty-dawns']) {
      assert.ok(byId(id), `missing ${id}`);
    }
    assert.deepEqual(byId('energy-guardian').title, ['Sun', 'Keeper']);
    assert.deepEqual(byId('water-arrival').title, ['First', 'Drop']);
  });

  it('every milestone polygon has as many corners as it counts', () => {
    for (const s of CATALOGUE.filter((x) => x.family === 'milestone' && x.rule.type !== 'first_steps')) {
      assert.equal(s.shape, MILESTONE_SHAPE[s.rule.target], s.id);
    }
    assert.equal(byId('earthrise').shape, 'circle');
  });

  it('rejects a mismatched shape, an unreachable target, a duplicate and an unknown rule', () => {
    const good = byId('three-seeds');
    const problems = validateCatalogue([
      { ...good, id: 'a-square-three', shape: 'square' },
      { ...good, id: 'six-elements', shape: 'hexagon', rule: { type: 'elements_acted', target: 6 } },
      { ...good, id: 'dup' }, { ...good, id: 'dup' },
      { ...good, id: 'magic', rule: { type: 'magic', target: 3 } },
      { ...byId('water-guardian'), id: 'no-element', element: null, rule: { type: 'element_action_days', target: 5 } }
    ]);
    assert.ok(problems.some((p) => p.startsWith('a-square-three') && p.includes('triangle')));
    assert.ok(problems.some((p) => p.startsWith('six-elements') && p.includes("can't be reached")));
    assert.ok(problems.some((p) => p.includes('duplicate')));
    assert.ok(problems.some((p) => p.startsWith('magic') && p.includes('unknown rule')));
    assert.ok(problems.some((p) => p.startsWith('no-element') && p.includes('needs an element')));
  });
});

describe('IST days and weeks', () => {
  it('uses the IST date, not UTC', () => {
    assert.equal(istDay(at('2026-11-19T20:00:00Z')), '2026-11-20'); // 01:30 IST
    assert.equal(istDay(at('2026-11-19T18:00:00Z')), '2026-11-19'); // 23:30 IST
  });

  it('gives ISO weeks across the year boundary', () => {
    assert.equal(istWeek(at('2026-01-01T06:00:00Z')), '2026-W01'); // a Thursday
    assert.equal(istWeek(at('2027-01-01T06:00:00Z')), '2026-W53'); // a Friday, still ISO 2026
    assert.equal(istWeek(at('2026-11-16T06:00:00Z')), '2026-W47'); // Monday
    assert.equal(istWeek(at('2026-11-22T06:00:00Z')), '2026-W47'); // Sunday, same week
    assert.ok('2026-W53' < '2027-W01');
  });
});

describe('ladder brake (decision D4)', () => {
  const sixInOneMinute = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ actionId: id, elements: ['water'], timestamp: at(`2026-11-19T06:0${i}:00Z`) }));

  it('six different actions in one minute count as one', () => {
    const ladder = ladderOf(sixInOneMinute);
    assert.equal(ladder.actionDays, 1);
    const metrics = { uniqueActionsCompleted: 6, totalActionsCompleted: 6, actionsByElement: { water: 6 }, ladder };
    assert.equal(progressFor(byId('snowflake').rule, { metrics }), 1);
    assert.ok(!earnedIds({ metrics }).includes('three-seeds'));
  });

  it('an action on five later days brings it to six, without losing day one', () => {
    const later = [1, 2, 3, 4, 5].map((d) => ({ actionId: 'a', elements: ['water'], timestamp: at(`2026-11-${19 + d}T06:00:00Z`) }));
    const ladder = ladderOf([...sixInOneMinute, ...later]);
    const metrics = { uniqueActionsCompleted: 6, totalActionsCompleted: 11, actionsByElement: { water: 11 }, ladder };
    const earned = earnedIds({ metrics });
    for (const id of ['three-seeds', 'four-winds', 'five-petals', 'snowflake']) assert.ok(earned.includes(id), id);
  });

  it('days with an action never exceed different actions', () => {
    const daily = [0, 1, 2, 3, 4, 5].map((d) => ({ actionId: 'a', elements: ['earth'], timestamp: at(`2026-11-${10 + d}T06:00:00Z`) }));
    const metrics = { uniqueActionsCompleted: 1, totalActionsCompleted: 6, actionsByElement: { earth: 6 }, ladder: ladderOf(daily) };
    assert.equal(progressFor(byId('snowflake').rule, { metrics }), 1);
  });

  it('elements are braked the same way', () => {
    const quick = ['air', 'water', 'earth'].map((e, i) => ({ actionId: e, elements: [e], timestamp: at(`2026-11-19T06:0${i}:00Z`) }));
    const metrics = { uniqueActionsCompleted: 3, totalActionsCompleted: 3, actionsByElement: { air: 1, water: 1, earth: 1 }, ladder: ladderOf(quick) };
    assert.ok(!earnedIds({ metrics }).includes('delta'));
    const spread = ['air', 'water', 'earth'].map((e, i) => ({ actionId: e, elements: [e], timestamp: at(`2026-11-${19 + i}T06:00:00Z`) }));
    assert.ok(earnedIds({ metrics: { ...metrics, ladder: ladderOf(spread) } }).includes('delta'));
  });

  it('one action tapped five times in a day does not earn a Guardian; five days do', () => {
    const taps = [0, 1, 2, 3, 4].map((i) => ({ actionId: 'leak', elements: ['water'], timestamp: at(`2026-11-19T06:0${i}:00Z`) }));
    const base = { uniqueActionsCompleted: 1, totalActionsCompleted: 5, actionsByElement: { water: 5 } };
    assert.ok(!earnedIds({ metrics: { ...base, ladder: ladderOf(taps) } }).includes('water-guardian'));
    const days = [0, 1, 2, 3, 4].map((d) => ({ actionId: 'leak', elements: ['water'], timestamp: at(`2026-11-${19 + d}T06:00:00Z`) }));
    assert.ok(earnedIds({ metrics: { ...base, ladder: ladderOf(days) } }).includes('water-guardian'));
  });

  it('a redelivered or older completion adds nothing', () => {
    const one = ladderOf([{ actionId: 'a', elements: ['air'], timestamp: at('2026-11-19T06:00:00Z') }]);
    assert.deepEqual(ladderAfter(one, { actionId: 'a', elements: ['air'], timestamp: at('2026-11-19T06:00:00Z') }), one);
    assert.deepEqual(ladderAfter(one, { actionId: 'a', elements: ['air'], timestamp: at('2026-11-10T06:00:00Z') }), one);
  });

  it('ignores unknown elements and bad timestamps, and accepts a partial ladder', () => {
    const l = ladderAfter({ actionDays: 2 }, { actionId: 'x', elements: ['fire'], timestamp: at('2026-11-19T06:00:00Z') });
    assert.equal(l.actionDays, 3);
    assert.deepEqual(l.elementDays, {});
    assert.deepEqual(ladderAfter(null, { actionId: 'x', timestamp: 'not a date' }), emptyLadder());
  });
});

describe('weeks per action', () => {
  it('counts different weeks, not consecutive ones (no streak pressure)', () => {
    const weeks = ['2026-09-01', '2026-09-20', '2026-10-05', '2026-10-30', '2026-11-10', '2026-11-19']
      .map((d) => ({ actionId: 'bike', elements: ['air'], timestamp: at(`${d}T06:00:00Z`) }));
    const ladder = ladderOf(weeks);
    assert.equal(ladder.actionWeeks.bike, 6);
    const earned = earnedIds({ metrics: { ladder } });
    for (const id of ['taking-root', 'full-moon', 'evergreen', 'honeycomb']) assert.ok(earned.includes(id), id);
  });

  it('twice in one week counts once, and the best action wins', () => {
    const ladder = ladderOf([
      { actionId: 'a', timestamp: at('2026-11-16T06:00:00Z') },
      { actionId: 'a', timestamp: at('2026-11-18T06:00:00Z') },
      { actionId: 'b', timestamp: at('2026-11-02T06:00:00Z') },
      { actionId: 'b', timestamp: at('2026-11-09T06:00:00Z') },
      { actionId: 'b', timestamp: at('2026-11-16T06:00:00Z') }
    ]);
    assert.equal(ladder.actionWeeks.a, 1);
    assert.equal(progressFor(byId('taking-root').rule, { metrics: { ladder } }), 3);
  });
});

describe('Earthrise and the other rules', () => {
  const allSteps = { qualityReads: 1, videosCompleted: 1, lastEqScore: 0, totalActionsCompleted: 1 };

  it('Earthrise needs all five first steps, including choosing elements', () => {
    assert.equal(firstStepsDone(allSteps, { preferredElements: [] }), 4);
    assert.ok(!earnedIds({ metrics: allSteps, profile: { preferredElements: [] } }).includes('earthrise'));
    assert.ok(earnedIds({ metrics: allSteps, profile: { preferredElements: ['water'] } }).includes('earthrise'));
  });

  it('an EQ score of 0 still counts as taken', () => {
    assert.equal(progressFor(byId('inner-weather').rule, { metrics: { lastEqScore: 0 } }), 1);
    assert.equal(progressFor(byId('inner-weather').rule, { metrics: { lastEqScore: null } }), 0);
  });

  it('arrival, explorer, streak and journey travel stamps read their trusted counts', () => {
    const state = {
      metrics: { elementVisits: { water: 1 }, qualityReads: 10, qualityReadsByElement: { earth: 5 }, videosCompleted: 3, pollsVoted: 1 },
      profile: { longestStreak: 7 }
    };
    const earned = earnedIds(state);
    for (const id of ['water-arrival', 'earth-explorer', 'knowledge-explorer', 'good-watch', 'your-voice', 'seven-sunrises']) {
      assert.ok(earned.includes(id), id);
    }
    for (const id of ['air-arrival', 'water-explorer', 'thirty-dawns']) assert.ok(!earned.includes(id), id);
  });

  it('a new member with nothing has no stamps and no errors', () => {
    assert.deepEqual(earnedIds({ metrics: null, profile: null }), []);
    assert.deepEqual(earnedIds({}), []);
  });

  it('ignores junk values', () => {
    const state = { metrics: { qualityReads: 'lots', videosCompleted: -3, pollsVoted: NaN, actionsByElement: { fire: 9 } } };
    assert.deepEqual(earnedIds(state), []);
  });
});

describe('awards', () => {
  const state = { metrics: { pollsVoted: 1, videosCompleted: 3 }, profile: {} };

  it('lists only stamps not yet recorded, with version and evidence', () => {
    const awards = newAwards(state, ['your-voice']);
    assert.deepEqual(awards.map((a) => a.stampId), ['good-watch']);
    assert.deepEqual(awards[0], { stampId: 'good-watch', defVersion: 1, ruleVersion: 1, evidence: { rule: 'videos_finished', target: 3, value: 3 } });
  });

  it('never re-decides a recorded stamp, so a lower count later removes nothing', () => {
    assert.deepEqual(newAwards({ metrics: {} }, ['your-voice', 'good-watch']), []);
  });

  it('skips retired and draft stamps', () => {
    const catalogue = CATALOGUE.map((s) => (s.id === 'good-watch' ? { ...s, status: 'retired' } : s.id === 'your-voice' ? { ...s, status: 'draft' } : s));
    assert.deepEqual(newAwards(state, [], catalogue), []);
  });

  it('builds the record with the given date, provenance and a fixed doc ID', () => {
    const [award] = newAwards(state, ['your-voice']);
    const record = stampRecord('u1', award, { earnedAt: 'SERVER_TIME' });
    assert.deepEqual(record, {
      userId: 'u1', stampId: 'good-watch', defVersion: 1, ruleVersion: 1,
      evidence: { rule: 'videos_finished', target: 3, value: 3 }, earnedAt: 'SERVER_TIME', dateKnown: true, source: 'trigger'
    });
    assert.equal(stampRecord('u1', award, { earnedAt: 'x', dateKnown: false, source: 'backfill:r1' }).dateKnown, false);
    assert.equal(stampDocId('u1', 'good-watch'), 'u1_good-watch');
  });
});
