import { EngagementMetrics } from '../services/activity.service';
import {
  buildStamps, elementStamps, firstStepsDone, journeyStamps, machineLines, memberNumber, milestoneStamps, momentWaitsOn,
  newBadges, nextStamps, progressFor, StampDef, stampDateText
} from './Passport';

const metrics = (over: Partial<EngagementMetrics> = {}): EngagementMetrics => ({
  blogsRead: 0, qualityReads: 0, qualityReadsByElement: {}, videosWatched: 0, videosCompleted: 0, pollsVoted: 0,
  lastEqScore: null, lastEqDate: null, lastBlogReadDate: null, totalActionsCompleted: 0, uniqueActionsCompleted: 0,
  actionsByElement: {}, lastActionAt: null, impactTotals: {}, impactByMonth: {}, ...over
});

let order = 0;
const def = (id: string, family: StampDef['family'], shape: StampDef['shape'], rule: StampDef['rule'], element: StampDef['element'] = null, status: StampDef['status'] = 'active'): StampDef => ({
  id, version: 1, status, family, order: ++order, title: [id], caption: 'X', meaning: `${id} meaning`, hint: `${id} hint`, unit: 'u',
  element, shape, ink: '#145C5F', rule
});

const DEFS: StampDef[] = [
  def('earthrise', 'milestone', 'circle', { type: 'first_steps', target: 5 }),
  def('three-seeds', 'milestone', 'triangle', { type: 'different_actions', target: 3 }),
  def('four-winds', 'milestone', 'square', { type: 'different_actions', target: 4 }),
  def('honeycomb', 'milestone', 'hexagon', { type: 'action_weeks', target: 6 }),
  def('water-guardian', 'milestone', 'pentagon', { type: 'element_action_days', target: 5, element: 'water' }, 'water'),
  def('water-explorer', 'travel', 'rect', { type: 'stories_read', target: 5, element: 'water' }, 'water'),
  def('water-arrival', 'travel', 'oval', { type: 'element_visit', target: 1, element: 'water' }, 'water'),
  def('good-watch', 'travel', 'oval', { type: 'videos_finished', target: 3 }),
  def('seven-sunrises', 'streak', 'rosette', { type: 'visit_streak', target: 7 }),
  def('old-stamp', 'travel', 'rect', { type: 'polls_voted', target: 1 }, null, 'retired'),
  def('draft-stamp', 'travel', 'rect', { type: 'polls_voted', target: 1 }, null, 'draft')
];
const none = { metrics: null, profile: null };

describe('Planet Passport stamps (v1)', () => {
  it('is earned only by a server record, never by the counts alone', () => {
    const input = { metrics: metrics({ videosCompleted: 9 }), profile: null };
    const withoutRecord = buildStamps(DEFS, [], input).find((s) => s.id === 'good-watch')!;
    expect(withoutRecord.earned).toBeFalse();
    expect(withoutRecord.progress).toBe(3);
    const withRecord = buildStamps(DEFS, [{ stampId: 'good-watch', earnedAt: new Date(2026, 10, 6), dateKnown: true }], input).find((s) => s.id === 'good-watch')!;
    expect(withRecord.earned).toBeTrue();
    expect(stampDateText(withRecord)).toBe('06 NOV 2026');
  });

  it('shows "BEFORE LAUNCH" when history could not prove the date', () => {
    const [s] = buildStamps(DEFS, [{ stampId: 'seven-sunrises', earnedAt: new Date(), dateKnown: false }], none).filter((x) => x.id === 'seven-sunrises');
    expect(stampDateText(s)).toBe('BEFORE LAUNCH');
  });

  it('hides drafts, and retired stamps unless the member earned them', () => {
    expect(buildStamps(DEFS, [], none).map((s) => s.id)).not.toContain('old-stamp');
    expect(buildStamps(DEFS, [], none).map((s) => s.id)).not.toContain('draft-stamp');
    const kept = buildStamps(DEFS, [{ stampId: 'old-stamp', earnedAt: new Date(), dateKnown: true }], none);
    expect(kept.find((s) => s.id === 'old-stamp')!.earned).toBeTrue();
  });

  it('groups milestones by corners, journey stamps, and element stamps Arrival → Explorer → Guardian', () => {
    const stamps = buildStamps(DEFS, [], none);
    expect(milestoneStamps(stamps, [0, 3]).map((s) => s.id)).toEqual(['earthrise', 'three-seeds']);
    expect(milestoneStamps(stamps, [6]).map((s) => s.id)).toEqual(['honeycomb']);
    expect(journeyStamps(stamps).map((s) => s.id)).toEqual(['good-watch', 'seven-sunrises']);
    expect(elementStamps(stamps, 'water').map((s) => s.id)).toEqual(['water-arrival', 'water-explorer', 'water-guardian']);
  });

  it('hints progress with the ladder brake, like the server', () => {
    const m = metrics({ uniqueActionsCompleted: 6, ladder: { actionDays: 2, lastActionDay: null, elementDays: { water: 4 }, elementLastDay: {}, actionWeeks: { a: 3, b: 5 }, actionLastWeek: {} } });
    const input = { metrics: m, profile: null };
    expect(progressFor({ type: 'different_actions', target: 3 }, input)).toBe(2);
    expect(progressFor({ type: 'element_action_days', target: 5, element: 'water' }, input)).toBe(4);
    expect(progressFor({ type: 'action_weeks', target: 6 }, input)).toBe(5);
  });

  it('counts the five first steps, with chosen elements cleaned up', () => {
    const m = metrics({ qualityReads: 1, videosCompleted: 1, lastEqScore: 0, totalActionsCompleted: 1 });
    expect(firstStepsDone({ metrics: m, profile: { preferredElements: ['Water'], longestStreak: 0 } as any })).toBe(5);
    expect(firstStepsDone({ metrics: m, profile: { preferredElements: ['fire'], longestStreak: 0 } as any })).toBe(4);
  });

  it('suggests the unearned stamps closest to being earned', () => {
    const stamps = buildStamps(DEFS, [], { metrics: metrics({ videosCompleted: 2, qualityReadsByElement: { water: 2 } }), profile: null });
    expect(nextStamps(stamps, 2).map((s) => s.id)).toEqual(['good-watch', 'water-explorer']);
  });

  it('tilts each stamp the same way every time, within ±10°', () => {
    const a = buildStamps(DEFS, [], none);
    const b = buildStamps(DEFS, [], none);
    expect(a.map((s) => s.rotation)).toEqual(b.map((s) => s.rotation));
    expect(a.every((s) => s.rotation >= -10 && s.rotation <= 10)).toBeTrue();
  });
});

describe('Planet Passport new-badge moment', () => {
  const at = (iso: string) => new Date(iso);
  const records = [
    { stampId: 'good-watch', earnedAt: at('2026-11-19T10:00:00Z'), dateKnown: true, source: 'trigger' },
    { stampId: 'your-voice', earnedAt: at('2026-11-19T12:00:00Z'), dateKnown: true, source: 'trigger' },
    { stampId: 'inner-weather', earnedAt: at('2026-11-01T10:00:00Z'), dateKnown: true, source: 'backfill:2026-11-19T13-44-00-053Z' },
    { stampId: 'pending', earnedAt: null, dateKnown: true, source: 'trigger' }
  ];

  it('celebrates nothing before the Passport is issued', () => {
    expect(newBadges(records, null, false)).toEqual([]);
  });

  it('celebrates stamps earned after the last seen time, oldest first, never the launch backfill or a pending write', () => {
    expect(newBadges(records, null, true).map((r) => r.stampId)).toEqual(['good-watch', 'your-voice']);
    expect(newBadges(records, at('2026-11-19T11:00:00Z'), true).map((r) => r.stampId)).toEqual(['your-voice']);
    expect(newBadges(records, at('2026-11-19T13:00:00Z'), true)).toEqual([]);
  });

  it('waits on the Passport page, sign-in, admin and the EQ check', () => {
    expect(momentWaitsOn('/passport?stamp=x')).toBeTrue();
    expect(momentWaitsOn('/login')).toBeTrue();
    expect(momentWaitsOn('/admin-dashboard/blogs')).toBeTrue();
    expect(momentWaitsOn('/element/spirit#eq-assessment')).toBeTrue();
    expect(momentWaitsOn('/element/water')).toBeFalse();
    expect(momentWaitsOn('/take-action?action=fix-a-leak')).toBeFalse();
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
