/**
 * Unit tests for daily-stats.js. No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { addDays, computeDailyStats, dayRange, istDay } = require('./daily-stats');

const DAY = '2026-11-05';
const at = (iso) => ({ toDate: () => new Date(iso) });
const STORIES = {
  s1: { id: 's1', slug: 'rainwater', title: 'Rainwater Harvesting', element: 'water' },
  s2: { id: 's2', slug: 'yoga', title: 'Yoga', element: 'spirit' }
};
const story = (idOrSlug) => STORIES[idOrSlug] || Object.values(STORIES).find((s) => s.slug === idOrSlug) || null;
const ACTIONS = { leak: { title: 'Fix a Water Leak', elementIds: ['water'] }, plant: { title: 'Plant a Tree', elementIds: ['earth'] } };
const action = (id) => ACTIONS[id] || null;
const ev = (userId, activityType, extra = {}) => ({ userId, activityType, validation: { status: 'accepted' }, ...extra });

const base = (o = {}) => computeDailyStats({ day: DAY, events: [], adminIds: new Set(), users: [], metrics: [], story, action, ...o });

describe('daily stats', () => {
  it('India-time days', () => {
    assert.deepEqual(dayRange(DAY).map((d) => d.toISOString()), ['2026-11-04T18:30:00.000Z', '2026-11-05T18:30:00.000Z']);
    assert.equal(istDay(new Date('2026-11-04T19:00:00Z')), '2026-11-05');
    assert.equal(addDays(DAY, -1), '2026-11-04');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('counts active and engaged people, and leaves out admins and rejected events', () => {
    const s = base({
      adminIds: new Set(['admin']),
      events: [
        ev('u1', 'daily_visit'), ev('u2', 'daily_visit'), ev('u2', 'blog_read', { contentId: 's1' }),
        ev('admin', 'blog_read_complete', { contentId: 's1' }),
        ev('u3', 'blog_read_complete', { contentId: 's1', validation: { status: 'rejected' } })
      ]
    });
    assert.deepEqual([s.users.active, s.users.engaged], [2, 1]);
    // Who was active, for "Coming back" (8.15.0): the team and rejected events left out.
    assert.deepEqual(s.activeMemberIds, ['u1', 'u2']);
    assert.equal(s.totals.qualityReads, 0);
    assert.equal(s.totals.storiesOpened, 1);
  });

  it('per element: reads by the story\'s element, actions by the completion\'s elements', () => {
    const s = base({ events: [
      ev('u1', 'blog_read_complete', { contentId: 'rainwater' }),
      ev('u1', 'action_completed', { contentId: 'leak', elementIds: ['water'] }),
      ev('u2', 'action_completed', { contentId: 'plant' })
    ] });
    assert.deepEqual(s.byElement.water, { qualityReads: 1, actionsCompleted: 1 });
    assert.deepEqual(s.byElement.earth, { qualityReads: 0, actionsCompleted: 1 });
  });

  it('a suggestion click converts when the same person completes it that day (story by ID or slug)', () => {
    const s = base({ events: [
      ev('u1', 'suggestion_click', { via: 'explore_next', contentType: 'blog', contentId: 'rainwater' }),
      ev('u1', 'blog_read_complete', { contentId: 's1' }),
      ev('u2', 'suggestion_click', { via: 'explore_next', contentType: 'blog', contentId: 'yoga' }),
      ev('u3', 'suggestion_click', { via: 'next_for_you', contentType: 'action', contentId: 'leak' }),
      ev('u3', 'action_completed', { contentId: 'leak' }),
      // Someone else completing it doesn't count.
      ev('u4', 'suggestion_click', { via: 'today', contentType: 'action', contentId: 'plant' }),
      ev('u5', 'action_completed', { contentId: 'plant' })
    ] });
    assert.deepEqual(s.suggestions.explore_next, { clicks: 2, converted: 1, users: 2 });
    assert.deepEqual(s.suggestions.next_for_you, { clicks: 1, converted: 1, users: 1 });
    assert.deepEqual(s.suggestions.today, { clicks: 1, converted: 0, users: 1 });
    assert.equal(s.totals.suggestionClicks, 4);
  });

  it('top stories and actions, with titles', () => {
    const s = base({ events: [
      ev('u1', 'blog_read_complete', { contentId: 's1' }), ev('u2', 'blog_read_complete', { contentId: 'rainwater' }),
      ev('u3', 'blog_read_complete', { contentId: 's2' }), ev('u1', 'action_completed', { contentId: 'leak' })
    ] });
    assert.deepEqual(s.topStories, [
      { id: 's1', title: 'Rainwater Harvesting', element: 'water', reads: 2 },
      { id: 's2', title: 'Yoga', element: 'spirit', reads: 1 }
    ]);
    assert.deepEqual(s.topActions, [{ id: 'leak', title: 'Fix a Water Leak', completions: 1 }]);
  });

  it('first steps and new members, without admins', () => {
    const s = base({
      adminIds: new Set(['admin']),
      users: [
        { id: 'u1', preferredElements: ['water'], joinedDate: at('2026-11-05T05:00:00Z') },
        { id: 'u2', preferredElements: [], joinedDate: at('2026-11-01T05:00:00Z') },
        { id: 'admin', preferredElements: ['air'], joinedDate: at('2026-11-05T05:00:00Z') }
      ],
      metrics: [
        { id: 'u1', qualityReads: 2, videosCompleted: 1, lastEqScore: 80, totalActionsCompleted: 3 },
        { id: 'u2', qualityReads: 1 }
      ]
    });
    assert.equal(s.users.new, 1);
    assert.deepEqual(s.firstSteps, { members: 2, choseElements: 1, readStory: 2, watchedVideo: 1, checkedEq: 1, didAction: 1, allFive: 1 });
  });
});
