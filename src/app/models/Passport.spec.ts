import { EngagementMetrics } from '../services/activity.service';
import { elementStamps, journeyStamps, machineLines, memberNumber, nextStamps, passportStamps } from './Passport';

const metrics = (over: Partial<EngagementMetrics> = {}): EngagementMetrics => ({
  blogsRead: 0, qualityReads: 0, qualityReadsByElement: {}, videosWatched: 0, videosCompleted: 0, pollsVoted: 0,
  lastEqScore: null, lastEqDate: null, lastBlogReadDate: null, totalActionsCompleted: 0, uniqueActionsCompleted: 0,
  actionsByElement: {}, lastActionAt: null, impactTotals: {}, impactByMonth: {}, ...over
});

describe('Planet Passport stamps', () => {
  it('has 8 journey stamps and 3 per element, none earned for a new member', () => {
    const stamps = passportStamps({ metrics: metrics(), profile: { longestStreak: 0 } });
    expect(stamps.length).toBe(23);
    expect(journeyStamps(stamps).length).toBe(8);
    expect(elementStamps(stamps, 'water').map((s) => s.id)).toEqual(['water-arrival', 'water-explorer', 'water-guardian']);
    expect(stamps.some((s) => s.earned)).toBeFalse();
  });

  it('earns stamps from the trusted counts only, and caps progress at the target', () => {
    const stamps = passportStamps({
      metrics: metrics({ totalActionsCompleted: 3, qualityReadsByElement: { water: 7 }, actionsByElement: { water: 2 } }),
      profile: { longestStreak: 8 }
    });
    const by = (id: string) => stamps.find((s) => s.id === id)!;
    expect(by('first-step').earned).toBeTrue();
    expect(by('streak-7').earned).toBeTrue();
    expect(by('streak-30').earned).toBeFalse();
    expect(by('water-arrival').earned).toBeTrue();
    expect(by('water-explorer').progress).toBe(5);
    expect(by('water-explorer').earned).toBeTrue();
    expect(by('water-guardian').progress).toBe(2);
    expect(by('air-arrival').earned).toBeFalse();
  });

  it('works with no data at all', () => {
    expect(passportStamps({ metrics: null, profile: null }).every((s) => !s.earned && s.progress === 0)).toBeTrue();
  });

  it('suggests the stamps closest to being earned', () => {
    const stamps = passportStamps({ metrics: metrics({ qualityReads: 9, actionsByElement: { earth: 4 } }), profile: null });
    // 9 of 10 stories, 4 of 5 Earth actions, 1 of 5 elements (Earth arrival is already earned).
    expect(nextStamps(stamps).map((s) => s.id)).toEqual(['knowledge-explorer', 'earth-guardian', 'one-family']);
  });

  it('tilts each stamp the same way every time', () => {
    const a = passportStamps({ metrics: null, profile: null });
    const b = passportStamps({ metrics: null, profile: null });
    expect(a.map((s) => s.rotation)).toEqual(b.map((s) => s.rotation));
    expect(a.every((s) => s.rotation >= -10 && s.rotation <= 10)).toBeTrue();
  });
});

describe('Planet Passport identity', () => {
  it('gives a stable member number', () => {
    expect(memberNumber('abc')).toMatch(/^WIOF-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(memberNumber('abc')).toBe(memberNumber('abc'));
    expect(memberNumber('abc')).not.toBe(memberNumber('abd'));
  });

  it('writes two 44-character machine lines', () => {
    const [l1, l2] = machineLines('Zoë Ann', 'WIOF-ABCD-EFGH', new Date(2026, 10, 6));
    expect(l1.length).toBe(44);
    expect(l2.length).toBe(44);
    expect(l1.startsWith('P<EARTH<<ZOE<ANN<')).toBeTrue();
    expect(l2.startsWith('WIOFABCDEFGH<<EARTH261106')).toBeTrue();
  });
});
