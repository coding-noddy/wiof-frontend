/**
 * Unit tests for activity-validation.js. No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  EQ_DAILY_LIMIT,
  eqCalendarDay,
  eqSlotIds,
  blogWordCount,
  expectedDocId,
  isPlausibleCalendarDay,
  requiredReadSeconds,
  scoreEqResponses,
  validateActivityEvent
} = require('./activity-validation');

const NOON_UTC = { toMillis: () => Date.parse('2026-11-04T12:00:00Z') };
// 400 words: a quality read needs 400 / 200 * 60 * 0.6 = 72 seconds.
const BLOG = { content: '<p>' + 'word '.repeat(400) + '</p>' };

const lookups = {
  getBlog: async (id) => (id === 'kalpasar' ? BLOG : null),
  pollExists: async (id) => id === 'poll-1',
  actionExists: async (id) => id === 'reuse-container'
};

function event(activityType, fields = {}) {
  return { userId: 'alice', activityType, schemaVersion: 1, timestamp: NOON_UTC, calendarDay: '2026-11-04', ...fields };
}

async function verdict(entry, docId = expectedDocId(entry) || 'auto-id') {
  return validateActivityEvent(docId, entry, lookups);
}

describe('validateActivityEvent', () => {
  it('accepts a read of a blog that exists', async () => {
    assert.deepEqual(await verdict(event('blog_read', { contentId: 'kalpasar' })), { status: 'accepted', reason: null });
  });

  it('rejects a read of a blog that does not exist', async () => {
    assert.equal((await verdict(event('blog_read', { contentId: 'no-such-blog' }))).reason, 'content_not_found');
  });

  it('rejects a count-once event at a random doc ID', async () => {
    assert.equal((await verdict(event('blog_read', { contentId: 'kalpasar' }), 'random')).reason, 'wrong_doc_id');
  });

  it('rejects an unknown event type', async () => {
    assert.equal((await verdict(event('blog_shared'))).reason, 'unknown_type');
  });

  it('rejects an event without a user', async () => {
    assert.equal((await verdict(event('daily_visit', { userId: '' }), 'x')).reason, 'missing_user');
  });

  it('accepts a quality read that meets the scroll and time thresholds', async () => {
    const entry = event('blog_read_complete', { contentId: 'kalpasar', contentTitle: 'K', scrollDepth: 80, timeSpent: 72 });
    assert.equal((await verdict(entry)).status, 'accepted');
  });

  it('allows a quality read slightly under the time (browser word count may differ)', async () => {
    const entry = event('blog_read_complete', { contentId: 'kalpasar', contentTitle: 'K', scrollDepth: 80, timeSpent: 66 });
    assert.equal((await verdict(entry)).status, 'accepted');
  });

  it('rejects a quality read that was clearly too fast', async () => {
    const entry = event('blog_read_complete', { contentId: 'kalpasar', contentTitle: 'K', scrollDepth: 80, timeSpent: 10 });
    assert.equal((await verdict(entry)).reason, 'below_time_threshold');
  });

  it('rejects a quality read without enough scrolling', async () => {
    const entry = event('blog_read_complete', { contentId: 'kalpasar', contentTitle: 'K', scrollDepth: 50, timeSpent: 500 });
    assert.equal((await verdict(entry)).reason, 'below_scroll_threshold');
  });

  it('accepts video events only for a YouTube video ID', async () => {
    assert.equal((await verdict(event('video_view', { contentId: 'GfO-3Oir-qM' }))).status, 'accepted');
    assert.equal((await verdict(event('video_view', { contentId: 'not a video' }))).reason, 'content_not_found');
  });

  it('requires a completed video to be watched to 75%', async () => {
    const done = event('video_watch_complete', { contentId: 'GfO-3Oir-qM', contentTitle: 'V', scrollDepth: 75 });
    const short = event('video_watch_complete', { contentId: 'GfO-3Oir-qM', contentTitle: 'V', scrollDepth: 40 });
    assert.equal((await verdict(done)).status, 'accepted');
    assert.equal((await verdict(short)).reason, 'below_watch_threshold');
  });

  it('checks the poll and the action exist', async () => {
    assert.equal((await verdict(event('poll_vote', { contentId: 'poll-1' }))).status, 'accepted');
    assert.equal((await verdict(event('poll_vote', { contentId: 'poll-x' }))).reason, 'content_not_found');
    assert.equal((await verdict(event('action_completed', { contentId: 'reuse-container' }))).status, 'accepted');
    assert.equal((await verdict(event('action_completed', { contentId: 'made-up' }))).reason, 'content_not_found');
  });

  it('accepts only the known widgets', async () => {
    assert.equal((await verdict(event('widget_usage', { widgetName: 'AQI' }))).status, 'accepted');
    assert.equal((await verdict(event('widget_usage', { widgetName: 'Fake' }))).reason, 'unknown_widget');
  });

  it('saves at most two EQ checks a day, in fixed slots', () => {
    assert.equal(EQ_DAILY_LIMIT, 2);
    assert.deepEqual(eqSlotIds('u1', '2026-11-05'), ['u1_eq_completion_2026-11-05_1', 'u1_eq_completion_2026-11-05_2']);
  });

  it('saves an EQ check under the browser day only if it is plausible', () => {
    const now = new Date('2026-11-05T12:00:00Z');
    assert.equal(eqCalendarDay('2026-11-06', now), '2026-11-06');
    assert.equal(eqCalendarDay('2026-11-04', now), '2026-11-04');
    assert.equal(eqCalendarDay('2026-11-09', now), '2026-11-05');
    assert.equal(eqCalendarDay('nonsense', now), '2026-11-05');
    assert.equal(eqCalendarDay(undefined, now), '2026-11-05');
  });

  it('accepts an EQ score only when it is the sum of valid dimensions', async () => {
    const dims = { attentionScore: 20, clarityScore: 30, reparationScore: 25 };
    assert.equal((await verdict(event('eq_completion', { score: 75, eqDimensions: dims }))).status, 'accepted');
    assert.equal((await verdict(event('eq_completion', { score: 120, eqDimensions: dims }))).reason, 'invalid_score');
    assert.equal((await verdict(event('eq_completion', { score: 50, eqDimensions: { ...dims, attentionScore: -5 } }))).reason, 'invalid_score');
  });

  it('accepts a daily visit at its per-day ID', async () => {
    assert.equal((await verdict(event('daily_visit'), 'alice_daily_visit_2026-11-04')).status, 'accepted');
    assert.equal((await verdict(event('daily_visit'), 'alice_daily_visit_2026-11-05')).reason, 'wrong_doc_id');
  });

  it('rejects a calendar day more than a day away from the server time', async () => {
    assert.equal((await verdict(event('daily_visit', { calendarDay: '2026-11-07' }))).reason, 'implausible_calendar_day');
  });
});

describe('legacy mode (events from before step 1)', () => {
  it('skips the doc ID and calendar-day checks those events predate', async () => {
    const old = { userId: 'alice', activityType: 'blog_read', contentId: 'kalpasar', timestamp: NOON_UTC };
    assert.equal((await validateActivityEvent('random-old-id', old, lookups, { legacy: true })).status, 'accepted');
    assert.equal((await validateActivityEvent('random-old-id', old, lookups)).reason, 'wrong_doc_id');
  });

  it('accepts an old video watch recorded under a title, if it met the threshold', async () => {
    const watched = { userId: 'alice', activityType: 'video_watch_complete', contentId: 'City in Focus', scrollDepth: 93, timestamp: NOON_UTC };
    assert.equal((await validateActivityEvent('x', watched, lookups, { legacy: true })).status, 'accepted');
    assert.equal((await validateActivityEvent('x', { ...watched, scrollDepth: 30 }, lookups, { legacy: true })).reason, 'below_watch_threshold');
    const current = { ...watched, calendarDay: '2026-11-04' };
    assert.equal((await validateActivityEvent(expectedDocId(current), current, lookups)).reason, 'content_not_found');
  });

  it('still checks the content exists', async () => {
    const old = { userId: 'alice', activityType: 'blog_read', contentId: 'deleted-blog', timestamp: NOON_UTC };
    assert.equal((await validateActivityEvent('x', old, lookups, { legacy: true })).reason, 'content_not_found');
  });
});

describe('scoreEqResponses', () => {
  it('sums each block of 8 answers into a dimension, and the three into the score', () => {
    const answers = [...Array(8).fill(1), ...Array(8).fill(3), ...Array(8).fill(5)];
    assert.deepEqual(scoreEqResponses(answers), {
      score: 72, eqDimensions: { attentionScore: 8, clarityScore: 24, reparationScore: 40 }
    });
  });

  it('refuses anything but 24 whole answers from 1 to 5', () => {
    assert.equal(scoreEqResponses(Array(23).fill(3)), null);
    assert.equal(scoreEqResponses([...Array(23).fill(3), 6]), null);
    assert.equal(scoreEqResponses([...Array(23).fill(3), 2.5]), null);
    assert.equal(scoreEqResponses([...Array(23).fill(3), '3']), null);
    assert.equal(scoreEqResponses(undefined), null);
  });
});

describe('isPlausibleCalendarDay', () => {
  it('allows the day either side of the UTC date (browser time zones)', () => {
    assert.ok(isPlausibleCalendarDay('2026-11-03', NOON_UTC));
    assert.ok(isPlausibleCalendarDay('2026-11-04', NOON_UTC));
    assert.ok(isPlausibleCalendarDay('2026-11-05', NOON_UTC));
    assert.ok(!isPlausibleCalendarDay('2026-11-02', NOON_UTC));
    assert.ok(!isPlausibleCalendarDay('04-11-2026', NOON_UTC));
  });
});

describe('blog reading time', () => {
  it('mirrors the browser word count, tags as word boundaries', () => {
    assert.equal(blogWordCount('<p>one</p><p>two</p>'), 2);
    assert.equal(blogWordCount(''), 1000);
  });

  it('needs 60% of the time at 200 words a minute', () => {
    assert.equal(requiredReadSeconds(BLOG), 72);
  });
});
