/**
 * Unit tests for passport-challenges.js.
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { nextProgress, openChallenges, progressKey, recordChallengeEvent } = require('./passport-challenges');

const challenge = (over = {}) => ({
  id: 'water-day-2027', family: 'challenge', status: 'active', version: 1,
  window: { start: '2027-03-22', end: '2027-03-22' }, rule: { type: 'window_actions', target: 2, element: 'water' }, ...over
});
const at = (iso) => new Date(iso);

describe('challenge windows', () => {
  it('is open from the first to the last India-time day of its window', () => {
    const defs = [challenge(), challenge({ id: 'draft', status: 'draft' }), { id: 'x', family: 'milestone', status: 'active' }];
    assert.deepEqual(openChallenges(defs, '2027-03-22').map((c) => c.id), ['water-day-2027']);
    assert.deepEqual(openChallenges(defs, '2027-03-21'), []);
    assert.deepEqual(openChallenges(defs, '2027-03-23'), []);
  });
});

describe('what counts', () => {
  it('window_actions: different actions in the element; a repeat adds nothing', () => {
    const c = challenge();
    assert.equal(progressKey(c, { kind: 'action', id: 'fix-a-leak', elements: ['water'] }), 'fix-a-leak');
    assert.equal(progressKey(c, { kind: 'action', id: 'bike', elements: ['air'] }), null);
    assert.equal(progressKey(c, { kind: 'story', id: 'b1', element: 'water' }), null);
    const one = nextProgress(null, 'fix-a-leak');
    assert.equal(nextProgress(one, 'fix-a-leak').changed, false);
  });

  it('window_stories: each story once, optionally in one element', () => {
    const c = challenge({ rule: { type: 'window_stories', target: 3 } });
    assert.equal(progressKey(c, { kind: 'story', id: 'b1', element: 'earth' }), 'b1');
    assert.equal(progressKey(c, { kind: 'action', id: 'a', elements: [] }), null);
  });

  it('window_specific_action: every completion of that one action counts', () => {
    const c = challenge({ rule: { type: 'window_specific_action', target: 2, actionId: 'fix-a-leak' } });
    assert.equal(progressKey(c, { kind: 'action', id: 'fix-a-leak', completionNumber: 3 }), 'fix-a-leak#3');
    assert.equal(progressKey(c, { kind: 'action', id: 'other', completionNumber: 1 }), null);
  });
});

describe('recordChallengeEvent', () => {
  /** A transaction-capable in-memory Firestore, just enough for this module. */
  function fakeDb() {
    const store = new Map();
    const ref = (col, id) => ({ path: `${col}/${id}` });
    return {
      store,
      collection: (col) => ({ doc: (id) => ref(col, id) }),
      runTransaction: async (fn) => {
        const writes = [];
        const tx = {
          get: async (r) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
          set: (r, v, opts) => writes.push(() => store.set(r.path, opts && opts.merge ? { ...(store.get(r.path) || {}), ...v } : v)),
          create: (r, v) => writes.push(() => { if (store.has(r.path)) throw new Error('ALREADY_EXISTS'); store.set(r.path, v); })
        };
        const result = await fn(tx);
        writes.forEach((w) => w());
        return result;
      }
    };
  }
  const FieldValue = { serverTimestamp: () => 'SERVER_TIME' };
  const defs = [challenge()];

  it('awards the stamp once the target is reached inside the window, exactly once', async () => {
    const db = fakeDb();
    const act = (id, iso, n = 1) => recordChallengeEvent(db, 'alice', { kind: 'action', id, elements: ['water'], completionNumber: n, timestamp: at(iso) }, { defs, FieldValue });
    assert.deepEqual(await act('fix-a-leak', '2027-03-22T04:00:00Z'), []);
    assert.deepEqual(await act('fix-a-leak', '2027-03-22T05:00:00Z', 2), []); // the same action again: no progress
    assert.deepEqual(await act('short-shower', '2027-03-22T06:00:00Z'), ['water-day-2027']);
    assert.deepEqual(await act('rain-barrel', '2027-03-22T07:00:00Z'), []); // already earned
    const stamp = db.store.get('passport_stamps/alice_water-day-2027');
    assert.equal(stamp.source, 'challenge');
    assert.equal(stamp.earnedAt, 'SERVER_TIME');
    assert.deepEqual(stamp.evidence, { rule: 'window_actions', target: 2, value: 2, window: { start: '2027-03-22', end: '2027-03-22' } });
  });

  it('activity outside the window (India time) counts for nothing', async () => {
    const db = fakeDb();
    // 21 Mar 23:00 IST and 23 Mar 00:30 IST.
    await recordChallengeEvent(db, 'alice', { kind: 'action', id: 'a', elements: ['water'], timestamp: at('2027-03-21T17:30:00Z') }, { defs, FieldValue });
    await recordChallengeEvent(db, 'alice', { kind: 'action', id: 'b', elements: ['water'], timestamp: at('2027-03-22T19:00:00Z') }, { defs, FieldValue });
    assert.equal(db.store.size, 0);
  });
});
