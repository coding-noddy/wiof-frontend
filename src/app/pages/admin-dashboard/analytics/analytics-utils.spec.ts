import { returnRates, DailyStats, dayLabels, istToday, percent, summarise } from './analytics-utils';

const day = (d: string, o: Partial<DailyStats> = {}): DailyStats => ({
  day: d,
  users: { active: 2, engaged: 1, new: 0 },
  totals: { storiesOpened: 0, qualityReads: 1, videosOpened: 0, videosCompleted: 0, actionsCompleted: 2, eqChecks: 0, pollVotes: 0, widgetUses: 0, suggestionClicks: 0 },
  byElement: { water: { qualityReads: 1, actionsCompleted: 1 }, earth: { qualityReads: 0, actionsCompleted: 1 } },
  suggestions: {
    explore_next: { clicks: 4, converted: 1, users: 2 },
    story_behind: { clicks: 0, converted: 0, users: 0 },
    today: { clicks: 1, converted: 1, users: 1 },
    next_for_you: { clicks: 0, converted: 0, users: 0 }
  },
  topStories: [{ id: 's1', title: 'Rainwater', element: 'water', reads: 1 }],
  topActions: [{ id: 'leak', title: 'Fix a Water Leak', completions: 2 }],
  firstSteps: { members: 10, choseElements: 6, readStory: 4, watchedVideo: 2, checkedEq: 3, didAction: 5, allFive: 1 },
  traffic: null,
  ...o
});

describe('Admin analytics summary', () => {
  it('labels the days, oldest first, and dates "today" in India time', () => {
    expect(dayLabels('2026-11-05', 3)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    expect(istToday(new Date('2026-11-04T19:00:00Z'))).toBe('2026-11-05');
  });

  it('percent is a whole number, and null with nothing to divide by', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBeNull();
  });

  it('adds up the range, and leaves gaps for days without a summary', () => {
    const s = summarise([day('2026-11-04'), day('2026-11-05', { users: { active: 4, engaged: 3, new: 2 } })], '2026-11-05', 3);
    expect(s.series.active).toEqual([null, 2, 4]);
    expect(s.daysWithData).toBe(2);
    expect(s.totals).toEqual(jasmine.objectContaining({ newMembers: 2, qualityReads: 2, actionsCompleted: 4, avgActive: 3, visitors: null, pageViews: null }));
  });

  it('suggestions: clicks, how many led to a read or action, and the rate', () => {
    const s = summarise([day('2026-11-04'), day('2026-11-05')], '2026-11-05', 2);
    expect(s.suggestions.find((r) => r.via === 'explore_next')).toEqual(jasmine.objectContaining({ clicks: 8, converted: 2, rate: 25 }));
    expect(s.suggestions.find((r) => r.via === 'next_for_you')!.rate).toBeNull();
  });

  it('per element, first steps from the latest day, and top stories and actions across the range', () => {
    const s = summarise([day('2026-11-04'), day('2026-11-05', { firstSteps: { members: 20, choseElements: 10, readStory: 5, watchedVideo: 0, checkedEq: 0, didAction: 0, allFive: 0 } })], '2026-11-05', 2);
    expect(s.elements.find((e) => e.element === 'water')).toEqual(jasmine.objectContaining({ qualityReads: 2, actionsCompleted: 2 }));
    expect(s.firstSteps![0]).toEqual({ label: 'Chose their elements', count: 10, rate: 50 });
    expect(s.firstStepsMembers).toBe(20);
    expect(s.topStories).toEqual([{ title: 'Rainwater', element: 'water', reads: 2 }]);
    expect(s.topActions).toEqual([{ title: 'Fix a Water Leak', completions: 4 }]);
  });

  it('Google Analytics: visitors and top pages when connected; off or error otherwise', () => {
    const traffic = { users: 50, newUsers: 20, sessions: 70, pageViews: 200, topPages: [{ path: '/home', title: 'WIOF', views: 120, users: 40 }], groups: [{ group: 'home', views: 120 }] };
    const s = summarise([day('2026-11-04', { traffic }), day('2026-11-05', { traffic })], '2026-11-05', 2);
    expect(s.ga).toBe('connected');
    expect(s.totals.visitors).toBe(100);
    expect(s.topPages).toEqual([{ path: '/home', title: 'WIOF', views: 240 }]);
    expect(s.pageGroups).toEqual([{ group: 'home', views: 240 }]);
    expect(summarise([day('2026-11-05')], '2026-11-05', 1).ga).toBe('off');
    expect(summarise([day('2026-11-05', { traffic: { error: 'unavailable' } })], '2026-11-05', 1).ga).toBe('error');
  });
});

describe('returnRates ("Coming back", 8.15.0)', () => {
  const day = (d: string, ids?: string[]) => ({ day: d, activeMemberIds: ids } as any);

  it('counts members active 8–14 days ago who were back in the last 7 days', () => {
    const stats = [day('2026-10-24', ['a', 'b', 'c']), day('2026-10-30', ['d']), day('2026-11-03', ['a']), day('2026-11-06', ['d', 'e'])];
    const [week] = returnRates(stats, '2026-11-06');
    expect([week.base, week.returned, week.rate]).toEqual([4, 2, 50]);
    expect(week.complete).toBeFalse(); // most days have no summary in this sample
  });

  it('is complete only when every day has its member list', () => {
    const all = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
      return day(d, i < 7 ? ['a', 'b'] : i === 10 ? ['a'] : []);
    });
    const [week] = returnRates(all, '2026-11-14');
    expect([week.base, week.returned, week.rate, week.complete]).toEqual([2, 1, 50, true]);
  });
});
