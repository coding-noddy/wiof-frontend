import { EngagementMetrics } from '../services/activity.service';
import {
  buildStamps, challengeForOccasion, challengeView, occasionsInWindow, earlierVersionNote, earnedBecause, earnedWhen, elementStamps, firstStepsDone, istToday, previewStamp, journeyStamps, machineLines, memberNumber, milestoneStamps, momentStamps, momentWaitsOn,
  isLargeAward, LARGE_AWARD, newBadges, nextStamps, progressFor, StampDef, stampDateText
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

  it('a moment shows only the new earned stamps, never the rest of the catalogue', () => {
    const recs = [
      { stampId: 'earthrise', earnedAt: at('2026-11-19T10:00:00Z'), dateKnown: true, source: 'trigger' },
      { stampId: 'good-watch', earnedAt: at('2026-11-19T09:00:00Z'), dateKnown: true, source: 'trigger' }
    ];
    // The issuing moment opens on Earthrise, then the rest oldest first.
    expect(momentStamps(DEFS, recs, none, null, true).map((s) => s.id)).toEqual(['earthrise', 'good-watch']);
    expect(momentStamps(DEFS, recs, none, null, true, new Set(['good-watch'])).map((s) => s.id)).toEqual(['earthrise']);
    expect(momentStamps(DEFS, recs, none, at('2026-11-19T11:00:00Z'), true)).toEqual([]);
    expect(momentStamps(DEFS, recs, none, null, false)).toEqual([]);
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

describe('Admin → Passport: "Earned when" in plain words', () => {
  const r = (type: string, target: number, extra: Partial<StampDef['rule']> = {}) => ({ rule: { type, target, ...extra } });

  it('reads naturally for every rule the pick-list offers', () => {
    expect(earnedWhen(r('first_steps', 5))).toBe('Complete all 5 first steps');
    expect(earnedWhen(r('different_actions', 3))).toBe('Do 3 different actions, on 3 different days');
    expect(earnedWhen(r('elements_acted', 5))).toBe('Take actions in all 5 elements, on different days');
    expect(earnedWhen(r('element_action_days', 5, { element: 'earth' }))).toBe('Take an Earth action on 5 different days');
    expect(earnedWhen(r('action_weeks', 6))).toBe('Keep one action going in 6 different weeks');
    expect(earnedWhen(r('specific_action', 3, { actionId: 'fix-a-water-leak' }), 'Fix a water leak')).toBe('Do "Fix a water leak" 3 times');
    expect(earnedWhen(r('element_visit', 1, { element: 'water' }))).toBe('Visit the Water page');
    expect(earnedWhen(r('stories_read', 1, { element: 'air' }))).toBe('Read 1 Air story to the end');
    expect(earnedWhen(r('stories_read', 10))).toBe('Read 10 stories to the end');
    expect(earnedWhen(r('polls_voted', 1))).toBe('Vote in a poll');
    expect(earnedWhen(r('visit_streak', 7))).toBe('Visit 7 days in a row');
  });

  it('says when a challenge counts', () => {
    expect(earnedWhen({ ...r('window_actions', 2, { element: 'water' }), window: { start: '2027-03-22', end: '2027-03-22' } }))
      .toBe('Do 2 different Water actions on 22 March 2027');
    expect(earnedWhen({ ...r('window_stories', 3), window: { start: '2027-06-01', end: '2027-06-07' } }))
      .toBe('Read 3 stories to the end between 1 June 2027 and 7 June 2027');
  });

  it('previews a definition being edited, earned and not yet', () => {
    const def = { id: 'rain-keeper', name: 'Rain Keeper', title: ['Rain', 'Keeper'], family: 'travel' as const, shape: 'oval' as const, element: 'water' as const, rule: { type: 'stories_read', target: 5 } };
    expect(previewStamp(def, true).earned).toBeTrue();
    expect(previewStamp(def, false).progress).toBe(0);
    expect(previewStamp(def, true).ink).toBe('#1A7A7F');
    expect(previewStamp({ rule: { type: 'polls_voted', target: 1 } }, false).name).toBe('New badge');
  });

  it('offers the calendar occasions inside a challenge window, also over New Year', () => {
    const o = (id: string, month: number, day: string) => ({ id, month, day, occasion: id });
    const all = [o('water', 2, '22'), o('forest', 2, '21'), o('earth', 3, '22'), o('ny', 0, '1'), o('xmas', 11, '25')];
    expect(occasionsInWindow(all, '2027-03-21', '2027-03-22').map((x) => x.id)).toEqual(['forest', 'water']);
    expect(occasionsInWindow(all, '2027-03-22', '2027-03-22').map((x) => x.id)).toEqual(['water']);
    expect(occasionsInWindow(all, '2027-12-20', '2028-01-05').map((x) => x.id)).toEqual(['ny', 'xmas']);
    expect(occasionsInWindow(all, '2027-03-23', '2027-03-22')).toEqual([]);
  });

  it('finds the live challenge linked to an occasion, only while it is open', () => {
    const c = { id: 'wwd', family: 'challenge', status: 'active', calendarId: 'water', window: { start: '2027-03-22', end: '2027-03-22' } } as StampDef;
    expect(challengeForOccasion([c], 'water', '2027-03-22')?.id).toBe('wwd');
    expect(challengeForOccasion([c], 'water', '2027-03-21')).toBeNull();
    expect(challengeForOccasion([{ ...c, status: 'retired' }], 'water', '2027-03-22')).toBeNull();
    expect(challengeForOccasion([c], undefined, '2027-03-22')).toBeNull();
  });

  it('asks for a typed confirmation only for large awards', () => {
    expect(isLargeAward(null)).toBeFalse();
    expect(isLargeAward(LARGE_AWARD - 1)).toBeFalse();
    expect(isLargeAward(LARGE_AWARD)).toBeTrue();
  });
});

describe('Planet Passport challenges as members see them', () => {
  const ch = (id: string, start: string, end: string): StampDef => ({
    ...def(id, 'challenge', 'oval', { type: 'window_actions', target: 2 }), window: { start, end }, hint: 'Do 2 different actions'
  });
  const defs = [ch('next-week', '2027-03-29', '2027-03-29'), ch('in-3-days', '2027-03-25', '2027-03-25'), ch('open', '2027-03-20', '2027-03-24'),
    ch('closed-earned', '2027-03-01', '2027-03-02'), ch('closed-missed', '2027-03-05', '2027-03-06'), ch('tomorrow', '2027-03-23', '2027-03-23')];
  const records = [{ stampId: 'closed-earned', earnedAt: new Date(2027, 2, 1), dateKnown: true }];

  it('shows open ones with progress, upcoming ones from 7 days before, and past ones only if earned', () => {
    const view = challengeView(buildStamps(defs, records, none), { open: 1 }, '2027-03-22');
    expect(view.open.map((s) => s.id)).toEqual(['open']);
    expect(view.open[0].progress).toBe(1);
    expect(view.open[0].hint).toBe('Do 2 different actions · until 24 Mar');
    expect(view.upcoming.map((s) => `${s.id}: ${s.hint}`)).toEqual(['next-week: Opens 29 Mar', 'in-3-days: Opens 25 Mar', 'tomorrow: Opens tomorrow']);
    expect(view.past.map((s) => s.id)).toEqual(['closed-earned']);
  });

  it('a challenge 8 days away is not shown yet', () => {
    const view = challengeView(buildStamps(defs, [], none), {}, '2027-03-21');
    expect(view.upcoming.map((s) => s.id)).not.toContain('next-week');
  });

  it('challenges never appear on element pages or among next stamps', () => {
    const stamps = buildStamps([...DEFS, { ...ch('w', '2027-03-20', '2027-03-24'), element: 'water' }], [], none);
    expect(elementStamps(stamps, 'water').map((s) => s.id)).not.toContain('w');
    expect(nextStamps(stamps, 99).map((s) => s.id)).not.toContain('w');
  });

  it('istToday is the India-time date', () => {
    expect(istToday(new Date('2027-03-21T19:00:00Z'))).toBe('2027-03-22');
  });
});

describe('Planet Passport: why a stamp was earned', () => {
  const s = (rule: StampDef['rule'], evidence?: any, extra: any = {}) => ({ rule, evidence, name: 'X', family: 'milestone' as const, ...extra });

  it('says why, in the past tense, from what the server recorded', () => {
    expect(earnedBecause(s({ type: 'different_actions', target: 3 }, { rule: 'different_actions', target: 3, value: 3 }))).toBe('You did 3 different actions, on 3 different days.');
    expect(earnedBecause(s({ type: 'element_action_days', target: 5, element: 'water' }, { rule: 'element_action_days', target: 5, value: 5 }))).toBe('You took Water actions on 5 different days.');
    expect(earnedBecause(s({ type: 'action_weeks', target: 6 }, { rule: 'action_weeks', target: 6, value: 6 }))).toBe('You kept one action going in 6 different weeks.');
    expect(earnedBecause(s({ type: 'stories_read', target: 5, element: 'earth' }, { rule: 'stories_read', target: 5, value: 5 }))).toBe('You read 5 Earth stories to the end.');
    expect(earnedBecause(s({ type: 'specific_action', target: 3, actionId: 'fix-a-water-leak' }, { rule: 'specific_action', target: 3, value: 3 }))).toBe('You did "Fix a water leak" 3 times.');
    expect(earnedBecause(s({ type: 'first_steps', target: 5 }, { rule: 'first_steps', target: 5, value: 5 }))).toBe('You completed all 5 first steps on WIOF.');
    expect(earnedBecause(s({ type: 'element_visit', target: 1, element: 'water' }))).toBe('You visited the Water page.');
  });

  it("says the badge's threshold even when the count was past it (6 actions recorded for Five Petals)", () => {
    expect(earnedBecause(s({ type: 'different_actions', target: 5 }, { rule: 'different_actions', target: 5, value: 6 }))).toBe('You did 5 different actions, on 5 different days.');
    expect(earnedBecause(s({ type: 'visit_streak', target: 7 }, { rule: 'visit_streak', target: 7, value: 9 }))).toBe('You visited 7 days in a row.');
  });

  it('uses the target the badge had when it was earned, not a later version', () => {
    expect(earnedBecause(s({ type: 'stories_read', target: 10 }, { rule: 'stories_read', target: 5, value: 5 }))).toBe('You read 5 stories to the end.');
  });

  it('names the challenge and its days', () => {
    const c = s({ type: 'window_actions', target: 2, element: 'water' }, { rule: 'window_actions', target: 2, value: 2, window: { start: '2027-03-22', end: '2027-03-22' } }, { name: 'World Water Day', family: 'challenge' });
    expect(earnedBecause(c)).toBe('You did 2 different Water actions on 22 March 2027, during the World Water Day challenge.');
  });

  it('notes, quietly, a badge earned under an earlier version', () => {
    expect(earlierVersionNote({ earnedVersion: 1, version: 2, evidence: { rule: 'stories_read', target: 5, value: 5 }, unit: 'stories' }))
      .toBe('You earned this under an earlier version of the badge: then it took 5 stories. It\'s still yours.');
    expect(earlierVersionNote({ earnedVersion: 2, version: 2, evidence: undefined, unit: 'stories' })).toBe('');
  });

  it('builds earned stamps with their evidence and versions', () => {
    const [st] = buildStamps([def('good-watch', 'travel', 'oval', { type: 'videos_finished', target: 3 })],
      [{ stampId: 'good-watch', earnedAt: new Date(), dateKnown: true, evidence: { rule: 'videos_finished', target: 3, value: 3 }, defVersion: 1 }], none);
    expect(st.evidence?.value).toBe(3);
    expect(st.earnedVersion).toBe(1);
    expect(st.version).toBe(1);
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
