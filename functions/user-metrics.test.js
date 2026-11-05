/**
 * Unit tests for user-metrics.js (the recompute). No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeUserMetrics, diffMetrics, elementOfBlog, makeContentLookups } = require('./user-metrics');
const { VALIDATOR_VERSION } = require('./activity-validation');

const at = (iso) => ({ toMillis: () => Date.parse(iso) });
const BLOG = { id: 'blogDocId', slug: 'kalpasar', category: 'Water', content: '<p>' + 'word '.repeat(400) + '</p>' };
const BLOG2 = { id: 'blog2', slug: 'bees', category: 'Earth', content: '<p>' + 'word '.repeat(400) + '</p>' };
const lookups = {
  getBlog: async (id) => (id === 'kalpasar' || id === 'blogDocId' ? BLOG : id === 'bees' ? BLOG2 : null),
  pollExists: async (id) => id === 'poll-1',
  actionExists: async () => true
};
const ev = (id, activityType, fields = {}) => ({
  id, data: { userId: 'alice', activityType, timestamp: at('2026-11-04T12:00:00Z'), ...fields }
});

describe('computeUserMetrics', () => {
  it('counts a blog once, however many old copies and whichever URL (slug or ID)', async () => {
    const { metrics } = await computeUserMetrics([
      ev('a', 'blog_read', { contentId: 'kalpasar' }),
      ev('b', 'blog_read', { contentId: 'kalpasar' }),
      ev('c', 'blog_read', { contentId: 'blogDocId' })
    ], [], lookups);
    assert.equal(metrics.get('alice').blogsRead, 1);
  });

  it('counts quality reads once per blog, only when they met the thresholds', async () => {
    const read = (id, timeSpent) => ev(id, 'blog_read_complete', { contentId: 'kalpasar', contentTitle: 'K', scrollDepth: 90, timeSpent });
    const { metrics } = await computeUserMetrics([read('a', 100), read('b', 100)], [], lookups);
    assert.equal(metrics.get('alice').qualityReads, 1);
    const { metrics: tooFast } = await computeUserMetrics([read('c', 5)], [], lookups);
    assert.equal(tooFast.has('alice'), false);
  });

  it('counts quality reads per element, once per blog', async () => {
    const read = (id, contentId) => ev(id, 'blog_read_complete', { contentId, contentTitle: 'K', scrollDepth: 90, timeSpent: 100 });
    const { metrics } = await computeUserMetrics([read('a', 'kalpasar'), read('b', 'blogDocId'), read('c', 'bees')], [], lookups);
    assert.deepEqual(metrics.get('alice').qualityReadsByElement, { water: 1, earth: 1 });
  });

  it('elementOfBlog reads the category, and ignores ones that are not an element', () => {
    assert.equal(elementOfBlog({ category: ' Earth ' }), 'earth');
    assert.equal(elementOfBlog({ category: 'News' }), null);
    assert.equal(elementOfBlog(null), null);
  });

  it('counts videos and polls once per item', async () => {
    const { metrics } = await computeUserMetrics([
      ev('a', 'video_view', { contentId: 'GfO-3Oir-qM' }),
      ev('b', 'video_view', { contentId: 'GfO-3Oir-qM' }),
      ev('c', 'video_watch_complete', { contentId: 'GfO-3Oir-qM', scrollDepth: 90 }),
      ev('d', 'video_watch_complete', { contentId: 'GfO-3Oir-qM', scrollDepth: 90 }),
      ev('e', 'poll_vote', { contentId: 'poll-1' }),
      ev('f', 'poll_vote', { contentId: 'poll-1' })
    ], [], lookups);
    const m = metrics.get('alice');
    assert.deepEqual([m.videosWatched, m.videosCompleted, m.pollsVoted], [1, 1, 1]);
  });

  it('leaves out rejected events, old and new, and reports why', async () => {
    const { metrics, newVerdicts, rejectedByReason } = await computeUserMetrics([
      ev('a', 'blog_read', { contentId: 'no-such-blog' }),
      ev('b', 'blog_read', { contentId: 'kalpasar', validation: { status: 'rejected', reason: 'wrong_doc_id', validatorVersion: VALIDATOR_VERSION } }),
      ev('c', 'poll_vote', { contentId: 'poll-1' })
    ], [], lookups);
    assert.equal(metrics.get('alice').blogsRead, 0);
    assert.equal(metrics.get('alice').pollsVoted, 1);
    assert.deepEqual(rejectedByReason, { content_not_found: 1, wrong_doc_id: 1 });
    // Only the events without a verdict get a new one.
    assert.deepEqual(newVerdicts.map((v) => [v.id, v.status]), [['a', 'rejected'], ['c', 'accepted']]);
  });

  it('re-judges an event rejected by an older version of the checks', async () => {
    const stale = ev('a', 'video_watch_complete', { contentId: 'City in Focus', scrollDepth: 93,
      validation: { status: 'rejected', reason: 'content_not_found', validatorVersion: 1 } });
    const { metrics, newVerdicts } = await computeUserMetrics([stale], [], lookups);
    assert.equal(metrics.get('alice').videosCompleted, 1);
    assert.deepEqual(newVerdicts.map((v) => v.status), ['accepted']);
  });

  it('keeps the latest accepted EQ score', async () => {
    const dims = (a, c, r) => ({ attentionScore: a, clarityScore: c, reparationScore: r });
    const { metrics } = await computeUserMetrics([
      ev('a', 'eq_completion', { score: 60, eqDimensions: dims(20, 20, 20), timestamp: at('2026-11-01T00:00:00Z') }),
      ev('b', 'eq_completion', { score: 75, eqDimensions: dims(25, 25, 25), timestamp: at('2026-11-03T00:00:00Z') }),
      ev('c', 'eq_completion', { score: 999, eqDimensions: dims(333, 333, 333), timestamp: at('2026-11-04T00:00:00Z') })
    ], [], lookups);
    assert.equal(metrics.get('alice').lastEqScore, 75);
  });

  it('takes action totals from user_actions', async () => {
    const { metrics } = await computeUserMetrics([], [
      { id: 'x', data: { userId: 'alice', completionCount: 3, elementIdsSnapshot: ['water', 'earth'] } },
      { id: 'y', data: { userId: 'alice', completionCount: 1, elementIdsSnapshot: ['water'] } },
      { id: 'z', data: { userId: 'alice', completionCount: 0 } }
    ], lookups);
    const m = metrics.get('alice');
    assert.equal(m.totalActionsCompleted, 4);
    assert.equal(m.uniqueActionsCompleted, 2);
    assert.deepEqual(m.actionsByElement, { water: 4, earth: 3 });
  });
});

describe('diffMetrics', () => {
  it('lists only the fields that change, treating missing counters as 0', () => {
    const stored = new Map([['alice', { blogsRead: 5, pollsVoted: 1, lastEqScore: 75 }]]);
    const computed = new Map([['alice', {
      blogsRead: 3, qualityReads: 0, videosWatched: 0, videosCompleted: 0, pollsVoted: 1, lastEqScore: 75,
      totalActionsCompleted: 0, uniqueActionsCompleted: 0
    }]]);
    assert.deepEqual(diffMetrics(stored, computed), [{ uid: 'alice', changes: { blogsRead: [5, 3] } }]);
  });

  it('reports a changed per-element map, ignoring zero entries and key order', () => {
    const base = { blogsRead: 0, qualityReads: 2, videosWatched: 0, videosCompleted: 0, pollsVoted: 0, lastEqScore: null, totalActionsCompleted: 0, uniqueActionsCompleted: 0 };
    const stored = new Map([['alice', { ...base, qualityReadsByElement: { earth: 1, air: 0 } }]]);
    assert.deepEqual(diffMetrics(stored, new Map([['alice', { ...base, qualityReadsByElement: { earth: 1 } }]])), []);
    assert.deepEqual(diffMetrics(stored, new Map([['alice', { ...base, qualityReadsByElement: { water: 1, earth: 1 } }]])),
      [{ uid: 'alice', changes: { qualityReadsByElement: [{ earth: 1, air: 0 }, { water: 1, earth: 1 }] } }]);
  });

  it('reports nothing for an unchanged user', () => {
    const fields = { blogsRead: 1, qualityReads: 0, videosWatched: 0, videosCompleted: 0, pollsVoted: 0, lastEqScore: null, totalActionsCompleted: 0, uniqueActionsCompleted: 0 };
    assert.deepEqual(diffMetrics(new Map([['alice', fields]]), new Map([['alice', fields]])), []);
  });
});

describe('makeContentLookups', () => {
  // A Blogs collection whose doc stores its own id field as null, as some real ones do.
  const blogDoc = { id: 'realDocId', data: () => ({ id: null, slug: 'kalpasar', content: '' }) };
  const fakeDb = {
    collection: () => ({
      where: (field, op, value) => ({ limit: () => ({ get: async () => (value === 'kalpasar' ? { empty: false, docs: [blogDoc] } : { empty: true, docs: [] }) }) }),
      doc: (id) => ({ get: async () => (id === 'realDocId' ? { exists: true, ...blogDoc } : { exists: false }) })
    })
  };

  it('returns the document ID, never a stored id field, by slug and by ID', async () => {
    const lookups = makeContentLookups(fakeDb);
    assert.equal((await lookups.getBlog('kalpasar')).id, 'realDocId');
    assert.equal((await lookups.getBlog('realDocId')).id, 'realDocId');
    assert.equal(await lookups.getBlog('missing'), null);
  });
});
