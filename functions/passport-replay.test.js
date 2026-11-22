/**
 * Unit tests for passport-replay.js (backfill dates, decision D3).
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { replayEarnedDates } = require('./passport-replay');

const at = (iso) => ({ toMillis: () => Date.parse(iso) });
const ok = { status: 'accepted', reason: null, validatorVersion: 2 };
const ev = (activityType, iso, fields = {}) => ({ id: `${activityType}-${iso}`, data: { userId: 'alice', activityType, timestamp: at(iso), validation: ok, ...fields } });
const getBlog = async (id) => ({ id, category: id.startsWith('w') ? 'Water' : 'Earth' });
const ms = (iso) => Date.parse(iso);

describe('replayEarnedDates', () => {
  it('dates a stamp at the event that crossed its target', async () => {
    const events = [
      ev('video_watch_complete', '2026-10-03T10:00:00Z', { contentId: 'v3' }),
      ev('video_watch_complete', '2026-10-01T10:00:00Z', { contentId: 'v1' }),
      ev('video_watch_complete', '2026-10-02T10:00:00Z', { contentId: 'v2' })
    ];
    const result = await replayEarnedDates(events, {}, { videosCompleted: 3 }, getBlog);
    assert.deepEqual(result.get('good-watch'), {
      earnedAtMs: ms('2026-10-03T10:00:00Z'), dateKnown: true, evidence: { rule: 'videos_finished', target: 3, value: 3 }
    });
  });

  it('dates Samvaad at the third Coffee Conversation video; other videos do not count towards it', async () => {
    const events = [
      ev('video_watch_complete', '2026-10-01T10:00:00Z', { contentId: 'cc1' }),
      ev('video_watch_complete', '2026-10-02T10:00:00Z', { contentId: 'v1' }),
      ev('video_watch_complete', '2026-10-03T10:00:00Z', { contentId: 'cc2' }),
      ev('video_watch_complete', '2026-10-04T10:00:00Z', { contentId: 'cc2' }),
      ev('video_watch_complete', '2026-10-05T10:00:00Z', { contentId: 'cc3' })
    ];
    const isConversationVideo = async (id) => id.startsWith('cc');
    const result = await replayEarnedDates(events, {}, { videosCompleted: 4, conversationsWatched: 3 }, getBlog, undefined, isConversationVideo);
    assert.deepEqual(result.get('samvaad'), {
      earnedAtMs: ms('2026-10-05T10:00:00Z'), dateKnown: true, evidence: { rule: 'conversations_watched', target: 3, value: 3 }
    });
  });

  it('counts a repeated video once, and ignores rejected and unjudged events', async () => {
    const events = [
      ev('video_watch_complete', '2026-10-01T10:00:00Z', { contentId: 'v1' }),
      ev('video_watch_complete', '2026-10-02T10:00:00Z', { contentId: 'v1' }),
      ev('video_watch_complete', '2026-10-03T10:00:00Z', { contentId: 'v2', validation: { status: 'rejected' } }),
      { id: 'old', data: { activityType: 'video_watch_complete', contentId: 'v3', timestamp: at('2026-10-04T10:00:00Z') } }
    ];
    const result = await replayEarnedDates(events, {}, { videosCompleted: 3 }, getBlog);
    // The current metrics say 3, but history proves only 1: the stamp is kept, without a date.
    assert.deepEqual(result.get('good-watch').dateKnown, false);
  });

  it('dates element stamps from per-element reads and visits', async () => {
    const reads = ['w1', 'w2', 'w3', 'w4', 'w5'].map((id, i) => ev('blog_read_complete', `2026-09-0${i + 1}T10:00:00Z`, { contentId: id }));
    const visit = ev('element_visit', '2026-08-30T10:00:00Z', { element: 'water' });
    const result = await replayEarnedDates([...reads, visit], {}, { qualityReads: 5, qualityReadsByElement: { water: 5 }, elementVisits: { water: 1 } }, getBlog);
    assert.equal(result.get('water-explorer').earnedAtMs, ms('2026-09-05T10:00:00Z'));
    assert.equal(result.get('water-arrival').earnedAtMs, ms('2026-08-30T10:00:00Z'));
  });

  it('applies the ladder brake while replaying actions', async () => {
    const done = (id, iso) => ev('action_completed', iso, { contentId: id, elementIds: ['earth'] });
    const events = [done('a', '2026-10-01T06:00:00Z'), done('b', '2026-10-01T06:01:00Z'), done('c', '2026-10-01T06:02:00Z'),
      done('a', '2026-10-02T06:00:00Z'), done('a', '2026-10-05T06:00:00Z')];
    const current = { totalActionsCompleted: 5, uniqueActionsCompleted: 3, actionsByElement: { earth: 5 },
      ladder: { actionDays: 3, elementDays: { earth: 3 }, actionWeeks: { a: 2 } } };
    const result = await replayEarnedDates(events, {}, current, getBlog);
    // Three different actions on day one, but the third day with an action is 5 Oct.
    assert.equal(result.get('three-seeds').earnedAtMs, ms('2026-10-05T06:00:00Z'));
  });

  it('gives streak stamps no date (history keeps only the longest streak)', async () => {
    const result = await replayEarnedDates([], { longestStreak: 9 }, {}, getBlog);
    assert.deepEqual(result.get('seven-sunrises'), { earnedAtMs: null, dateKnown: false, evidence: { rule: 'visit_streak', target: 7, value: 9 } });
    assert.ok(!result.has('thirty-dawns'));
  });

  const steps = [
    ev('blog_read_complete', '2026-10-01T10:00:00Z', { contentId: 'e1' }),
    ev('video_watch_complete', '2026-10-02T10:00:00Z', { contentId: 'v1' }),
    ev('eq_completion', '2026-10-03T10:00:00Z', { score: 70 }),
    ev('action_completed', '2026-10-04T10:00:00Z', { contentId: 'a', elementIds: ['air'] })
  ];
  const stepMetrics = { qualityReads: 1, videosCompleted: 1, lastEqScore: 70, totalActionsCompleted: 1, uniqueActionsCompleted: 1, actionsByElement: { air: 1 } };

  it('dates Earthrise at the later of the last step and choosing elements', async () => {
    const chose = { preferredElements: ['air'], onboarding: { welcomeDoneAt: at('2026-10-06T10:00:00Z') } };
    assert.equal((await replayEarnedDates(steps, chose, stepMetrics, getBlog)).get('earthrise').earnedAtMs, ms('2026-10-06T10:00:00Z'));
    const choseEarly = { preferredElements: ['air'], onboarding: { welcomeDoneAt: at('2026-09-01T10:00:00Z') } };
    assert.equal((await replayEarnedDates(steps, choseEarly, stepMetrics, getBlog)).get('earthrise').earnedAtMs, ms('2026-10-04T10:00:00Z'));
  });

  it('gives Earthrise no date when we do not know when the elements were chosen', async () => {
    const result = await replayEarnedDates(steps, { preferredElements: ['air'] }, stepMetrics, getBlog);
    assert.deepEqual(result.get('earthrise').dateKnown, false);
  });

  it('never returns a stamp the member\'s current state does not earn (for example after a reset)', async () => {
    const events = ['v1', 'v2', 'v3'].map((id, i) => ev('video_watch_complete', `2026-10-0${i + 1}T10:00:00Z`, { contentId: id }));
    const result = await replayEarnedDates(events, {}, { videosCompleted: 0 }, getBlog);
    assert.ok(!result.has('good-watch'));
  });
});
