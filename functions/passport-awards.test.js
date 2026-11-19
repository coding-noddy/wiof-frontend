/**
 * Unit tests for passport-awards.js on an in-memory Firestore fake.
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { awardStamps, shouldEvaluateMetricsWrite, shouldEvaluateProfileWrite } = require('./passport-awards');

/** Just enough of Firestore: doc get/create, and where('field', '==', value).get(). */
function fakeDb(seed = {}) {
  const data = new Map(Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs))]));
  const col = (name) => {
    if (!data.has(name)) data.set(name, new Map());
    return data.get(name);
  };
  const snapOf = (id, value) => ({ id, exists: value !== undefined, data: () => value, get: (f) => (value || {})[f] });
  return {
    data,
    collection: (name) => ({
      doc: (id) => ({
        get: async () => snapOf(id, col(name).get(id)),
        create: async (value) => {
          if (col(name).has(id)) {
            const error = new Error('ALREADY_EXISTS');
            error.code = 6;
            throw error;
          }
          col(name).set(id, value);
        }
      }),
      where: (field, op, value) => ({
        get: async () => ({ docs: [...col(name)].filter(([, v]) => v[field] === value).map(([id, v]) => snapOf(id, v)) })
      })
    })
  };
}

const FieldValue = { serverTimestamp: () => 'SERVER_TIME' };
const allSteps = { qualityReads: 1, videosCompleted: 3, lastEqScore: 60, totalActionsCompleted: 1, pollsVoted: 1 };

describe('awardStamps', () => {
  it('creates one record per newly earned stamp, with the server time and provenance', async () => {
    const db = fakeDb({ user_metrics: { alice: { videosCompleted: 3 } }, users: { alice: { longestStreak: 1 } } });
    const result = await awardStamps(db, 'alice', { FieldValue });
    assert.deepEqual(result, { awarded: ['good-watch'], issued: false });
    const record = db.data.get('passport_stamps').get('alice_good-watch');
    assert.equal(record.earnedAt, 'SERVER_TIME');
    assert.equal(record.userId, 'alice');
    assert.deepEqual(record.evidence, { rule: 'videos_finished', target: 3, value: 3 });
  });

  it('a second run (a retry or a concurrent trigger) creates nothing and keeps the first date', async () => {
    const db = fakeDb({ user_metrics: { alice: { videosCompleted: 3 } }, users: { alice: {} } });
    await awardStamps(db, 'alice', { FieldValue });
    db.data.get('passport_stamps').get('alice_good-watch').earnedAt = 'FIRST';
    const again = await awardStamps(db, 'alice', { FieldValue: { serverTimestamp: () => 'LATER' } });
    assert.deepEqual(again.awarded, []);
    assert.equal(db.data.get('passport_stamps').get('alice_good-watch').earnedAt, 'FIRST');
    assert.equal(db.data.get('passport_stamps').size, 1);
  });

  it('two runs at the same moment still make one record each', async () => {
    const db = fakeDb({ user_metrics: { alice: { videosCompleted: 3, pollsVoted: 1 } }, users: { alice: {} } });
    const [a, b] = await Promise.all([awardStamps(db, 'alice', { FieldValue }), awardStamps(db, 'alice', { FieldValue })]);
    assert.equal(a.awarded.length + b.awarded.length, 2);
    assert.equal(db.data.get('passport_stamps').size, 2);
  });

  it('issues the Passport with Earthrise, once', async () => {
    const db = fakeDb({ user_metrics: { alice: allSteps }, users: { alice: { preferredElements: ['water'] } } });
    const first = await awardStamps(db, 'alice', { FieldValue });
    assert.ok(first.awarded.includes('earthrise'));
    assert.equal(first.issued, true);
    assert.equal(db.data.get('passport_holders').get('alice').issuedAt, 'SERVER_TIME');
    const second = await awardStamps(db, 'alice', { FieldValue });
    assert.equal(second.issued, false);
  });

  it('before Earthrise, other stamps are recorded but the Passport is not issued', async () => {
    const db = fakeDb({ user_metrics: { alice: allSteps }, users: { alice: { preferredElements: [] } } });
    const result = await awardStamps(db, 'alice', { FieldValue });
    assert.ok(result.awarded.includes('good-watch'));
    assert.ok(!result.awarded.includes('earthrise'));
    assert.equal(result.issued, false);
    assert.equal((db.data.get('passport_holders') || new Map()).size, 0);
  });

  it('only reads the member\'s own records, and never awards from another member\'s state', async () => {
    const db = fakeDb({
      user_metrics: { alice: {}, mallory: { videosCompleted: 3 } },
      users: { alice: {}, mallory: {} },
      passport_stamps: { 'mallory_your-voice': { userId: 'mallory', stampId: 'your-voice' } }
    });
    assert.deepEqual((await awardStamps(db, 'alice', { FieldValue })).awarded, []);
    assert.deepEqual((await awardStamps(db, 'mallory', { FieldValue })).awarded, ['good-watch']);
  });

  it('trusts only longestStreak and preferredElements from the profile', async () => {
    const db = fakeDb({ user_metrics: { alice: {} }, users: { alice: { longestStreak: 7, qualityReads: 99, videosCompleted: 99 } } });
    assert.deepEqual((await awardStamps(db, 'alice', { FieldValue })).awarded, ['seven-sunrises']);
  });

  it('does nothing without a uid or with no data', async () => {
    assert.deepEqual(await awardStamps(fakeDb(), '', { FieldValue }), { awarded: [], issued: false });
    assert.deepEqual(await awardStamps(fakeDb(), 'nobody', { FieldValue }), { awarded: [], issued: false });
  });
});

describe('which writes are evaluated', () => {
  it('skips deletes and the metrics recompute\'s own writes', () => {
    assert.equal(shouldEvaluateMetricsWrite({ a: 1 }, { a: 2 }), true);
    assert.equal(shouldEvaluateMetricsWrite(null, { a: 1 }), true);
    assert.equal(shouldEvaluateMetricsWrite({ a: 1 }, null), false);
    assert.equal(shouldEvaluateMetricsWrite({ recomputeRun: 'r:1' }, { recomputeRun: 'r:2' }), false);
    assert.equal(shouldEvaluateMetricsWrite({}, { recomputeRun: 'r:1' }), false);
    // A normal write after a recompute keeps the marker unchanged, so it is evaluated.
    assert.equal(shouldEvaluateMetricsWrite({ recomputeRun: 'r:2', a: 1 }, { recomputeRun: 'r:2', a: 2 }), true);
  });

  it('evaluates a profile write only when the streak or chosen elements change', () => {
    assert.equal(shouldEvaluateProfileWrite({ longestStreak: 3, lastLogin: 1 }, { longestStreak: 3, lastLogin: 2 }), false);
    assert.equal(shouldEvaluateProfileWrite({ longestStreak: 3 }, { longestStreak: 4 }), true);
    assert.equal(shouldEvaluateProfileWrite({ preferredElements: [] }, { preferredElements: ['air'] }), true);
    assert.equal(shouldEvaluateProfileWrite({ longestStreak: 3 }, null), false);
  });
});
