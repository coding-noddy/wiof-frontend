/**
 * Planet Passport v1 (docs/PLANET_PASSPORT_V1_PROPOSAL.md): the booklet's
 * stamps, built from the catalogue (passport_stamp_defs, synced from
 * functions/passport-catalogue.js) and the member's earned records
 * (passport_stamps, written only by the server).
 *
 * Whether a stamp is earned, and when, comes only from the server's
 * record. The progress shown on a stamp not yet earned ("2 of 5") is a hint
 * worked out here from the member's trusted user_metrics, with the same
 * rules as functions/passport.js progressFor; it never awards anything.
 */
import type { EngagementMetrics } from '../services/activity.service';
import type { UserProfile } from '../services/user-profile.service';
import { ElementSlug, JOURNEY_ELEMENTS, preferredElements } from './Journey';

export type StampFamily = 'milestone' | 'travel' | 'streak' | 'challenge';
export type StampShape = 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'oval' | 'rect' | 'rosette';

/** passport_stamp_defs/{id}: display data and the rule's type/target for the hint. */
export interface StampDef {
  id: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  family: StampFamily;
  order: number;
  title: string[];
  /** The name in sentences ("Honeycomb"); older synced docs may not have it (then the title lines joined). */
  name?: string;
  caption: string;
  meaning: string;
  hint: string;
  unit: string;
  element: ElementSlug | null;
  shape: StampShape;
  ink: string;
  rule: { type: string; target: number; element?: string; actionId?: string };
  /** Challenges: India-time days, inclusive. */
  window?: { start: string; end: string };
  /** Challenges: the Environment Calendar occasion it belongs to, if any. */
  calendarId?: string;
  everPublished?: boolean;
}

/** passport_stamps/{uid}_{stampId}, as the app reads it. */
export interface StampRecord {
  stampId: string;
  earnedAt: Date | null;
  /** false: history couldn't prove the date ("Earned before launch"). */
  dateKnown: boolean;
  /** "trigger" (earned just now), or "backfill:{runId}" (recorded at launch from history). */
  source?: string;
  /** Why: the rule, its target and the count that earned it, as the server recorded them. */
  evidence?: StampEvidence;
  /** The badge's version when it was earned. */
  defVersion?: number;
}

export interface StampEvidence {
  rule: string;
  target: number;
  value: number;
  window?: { start: string; end: string };
}

/**
 * The new-badge moment (design §6a): the stamps to celebrate now. None
 * until the Passport is issued (D5): the issuing moment then shows Earthrise
 * with whatever was kept meanwhile. Stamps recorded from history at launch
 * (the backfill) are never "new"; they're simply in the booklet.
 */
export function newBadges(records: StampRecord[], seenAt: Date | null, issued: boolean): StampRecord[] {
  if (!issued) return [];
  return records
    .filter((r) => r.earnedAt && !(r.source || '').startsWith('backfill:') && (!seenAt || r.earnedAt > seenAt))
    .sort((a, b) => a.earnedAt!.getTime() - b.earnedAt!.getTime());
}

/** The stamps a new-badge moment shows: earned, new (newBadges), not already shown; oldest first. */
export function momentStamps(defs: StampDef[], records: StampRecord[], input: PassportInput, seenAt: Date | null, issued: boolean, alreadyShown: Set<string> = new Set()): Stamp[] {
  const fresh = newBadges(records, seenAt, issued).filter((r) => !alreadyShown.has(r.stampId));
  const built = new Map(buildStamps(defs, records, input).filter((s) => s.earned).map((s) => [s.id, s]));
  const stamps = fresh.map((r) => built.get(r.stampId)).filter((s): s is Stamp => !!s);
  // The issuing moment opens on Earthrise, then what was kept meanwhile.
  return [...stamps.filter((s) => s.id === 'earthrise'), ...stamps.filter((s) => s.id !== 'earthrise')];
}

/** Where the moment waits for the next page: the Passport itself (it lands in the booklet), sign-in, admin, the EQ check. */
export function momentWaitsOn(url: string): boolean {
  const [path, fragment = ''] = String(url || '').split('#');
  const p = path.split('?')[0];
  return p.startsWith('/passport') || p.startsWith('/login') || p.startsWith('/admin-dashboard') || fragment.startsWith('eq-assessment');
}

export interface Stamp {
  id: string;
  family: StampFamily;
  /** One or two short lines, e.g. ["River", "Guardian"]. */
  title: string[];
  /** The name in sentences: "Honeycomb", "River Guardian". */
  name: string;
  /** Small caps line, e.g. "WATER" or "MILESTONE". */
  caption: string;
  meaning: string;
  element: ElementSlug | null;
  shape: StampShape;
  ink: string;
  /** -10…10 degrees, the same for a stamp every time. */
  rotation: number;
  earned: boolean;
  earnedAt: Date | null;
  dateKnown: boolean;
  progress: number;
  target: number;
  /** What to do to earn it: "Read 5 Water stories". */
  hint: string;
  unit: string;
  /** Challenges: the India-time days it's open. */
  window?: { start: string; end: string };
  /** The badge's rule, current version, and (earned) what the server recorded. */
  rule?: StampDef['rule'];
  version?: number;
  evidence?: StampEvidence;
  earnedVersion?: number;
}

export interface PassportInput {
  metrics: EngagementMetrics | null;
  profile: Pick<UserProfile, 'longestStreak' | 'preferredElements'> | null;
}

/** Ink per element: real passport stamps vary in ink; these stay close to the brand. */
export const PASSPORT_INK: Record<ElementSlug | 'journey', string> = {
  air: '#3E7CA6',
  energy: '#B06A12',
  water: '#1A7A7F',
  earth: '#6B5A2E',
  spirit: '#7A4E7E',
  journey: '#145C5F'
};

const SLUGS = new Set<string>(JOURNEY_ELEMENTS.map((e) => e.slug));
const n = (v: unknown) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);

/** The five first steps done (Journey.ts firstSteps; the server's firstStepsDone). */
export function firstStepsDone(input: PassportInput): number {
  const m: Partial<EngagementMetrics> = input.metrics || {};
  return [
    preferredElements(input.profile).length > 0,
    n(m.qualityReads) > 0,
    n(m.videosCompleted) > 0,
    m.lastEqScore != null,
    n(m.totalActionsCompleted) > 0
  ].filter(Boolean).length;
}

/** A display hint: how far a member is towards a rule (functions/passport.js progressFor). */
export function progressFor(rule: StampDef['rule'], input: PassportInput): number {
  const m: Partial<EngagementMetrics> = input.metrics || {};
  const ladder = m.ladder || { actionDays: 0, elementDays: {}, actionWeeks: {} };
  const acted = Object.entries(m.actionsByElement || {}).filter(([e, c]) => SLUGS.has(e) && n(c) > 0).length;
  switch (rule.type) {
    case 'first_steps': return firstStepsDone(input);
    case 'element_visit': return n((m.elementVisits || {})[rule.element || '']) > 0 ? 1 : 0;
    case 'stories_read': return rule.element ? n((m.qualityReadsByElement || {})[rule.element]) : n(m.qualityReads);
    case 'videos_finished': return n(m.videosCompleted);
    case 'conversations_watched': return n(m.conversationsWatched);
    case 'polls_voted': return n(m.pollsVoted);
    case 'eq_taken': return m.lastEqScore != null ? 1 : 0;
    case 'different_actions': return Math.min(n(m.uniqueActionsCompleted), n(ladder.actionDays));
    case 'elements_acted': return Math.min(acted, n(ladder.actionDays));
    case 'element_action_days': return n((ladder.elementDays || {})[rule.element || '']);
    case 'action_weeks': return Object.values<number>(ladder.actionWeeks || {}).reduce((max: number, c) => Math.max(max, n(c)), 0);
    case 'visit_streak': return n(input.profile?.longestStreak);
    default: return 0;
  }
}

/** A small stable hash, for the stamp's tilt and the member number. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The booklet's stamps: active definitions, plus retired ones the member
 * earned (history is kept), in catalogue order. Drafts never show.
 */
export function buildStamps(defs: StampDef[], records: StampRecord[], input: PassportInput): Stamp[] {
  const byId = new Map(records.map((r) => [r.stampId, r]));
  return defs
    .filter((d) => d.status === 'active' || (d.status === 'retired' && byId.has(d.id)))
    .sort((a, b) => a.order - b.order)
    .map((d) => {
      const record = byId.get(d.id);
      const target = d.rule.target;
      const progress = record ? target : Math.min(target, Math.floor(progressFor(d.rule, input)));
      return {
        id: d.id,
        family: d.family,
        title: d.title,
        name: d.name || d.title.join(' '),
        caption: d.caption,
        meaning: d.meaning,
        element: d.element,
        shape: d.shape,
        ink: d.ink || PASSPORT_INK[d.element || 'journey'],
        rotation: (hash(d.id) % 21) - 10,
        earned: !!record,
        earnedAt: record?.earnedAt || null,
        dateKnown: record ? record.dateKnown : true,
        progress,
        target,
        hint: d.hint,
        unit: d.unit,
        ...(d.window ? { window: d.window } : {}),
        rule: d.rule,
        version: d.version,
        ...(record?.evidence ? { evidence: record.evidence } : {}),
        ...(record?.defVersion ? { earnedVersion: record.defVersion } : {})
      };
    });
}

export interface ChallengeView {
  /** Open now (earned or not), with progress. */
  open: Stamp[];
  /** Opening within 7 days: an outline with "Opens 22 Mar". */
  upcoming: Stamp[];
  /** Closed ones the member earned (closed and not earned: not shown). */
  past: Stamp[];
}

const SHORT_DAY = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return isNaN(d.getTime()) ? day : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/**
 * Challenges as members see them (decided 2026-11-21): open ones with their
 * progress, upcoming ones from 7 days before they open, past ones only if
 * earned. `progress` = challengeId → count (passport_challenge_progress).
 * `today` is the India-time day, like the server's windows.
 */
export function challengeView(stamps: Stamp[], progress: Record<string, number>, today: string): ChallengeView {
  const view: ChallengeView = { open: [], upcoming: [], past: [] };
  for (const s of stamps.filter((x) => x.family === 'challenge' && x.window)) {
    const { start, end } = s.window!;
    if (today < start) {
      const days = daysBetween(today, start);
      if (days <= 7) view.upcoming.push({ ...s, progress: 0, hint: days === 1 ? 'Opens tomorrow' : `Opens ${SHORT_DAY(start)}` });
    } else if (today <= end) {
      view.open.push(s.earned ? s : { ...s, progress: Math.min(s.target, progress[s.id] || 0), hint: `${s.hint} · until ${SHORT_DAY(end)}` });
    } else if (s.earned) {
      view.past.push(s);
    }
  }
  return view;
}

/** Today in India time ('YYYY-MM-DD'), the day challenge windows use. */
export function istToday(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A calendar occasion as a challenge links to it (envcal: month is 0-based, day a string; annual). */
export interface OccasionRef {
  id: string;
  month: number;
  day: string | number;
  occasion: string;
}

const occasionDay = (o: Pick<OccasionRef, 'month' | 'day'>) => `${String(o.month + 1).padStart(2, '0')}-${String(o.day).padStart(2, '0')}`;

/**
 * The calendar occasions a challenge can link to: those falling inside its
 * window (India-time 'YYYY-MM-DD' days; occasions repeat every year, so only
 * month and day are compared; a window over New Year wraps).
 */
export function occasionsInWindow<T extends OccasionRef>(occasions: T[], start: string, end: string): T[] {
  if (!start || !end || end < start) return [];
  const from = start.slice(5);
  const to = end.slice(5);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return occasions
    .filter((o) => {
      const d = occasionDay(o);
      return sameYear ? d >= from && d <= to : d >= from || d <= to;
    })
    .sort((a, b) => occasionDay(a).localeCompare(occasionDay(b)) || a.occasion.localeCompare(b.occasion));
}

/** The published challenge open today and linked to this calendar occasion, if any (Today on WIOF). */
export function challengeForOccasion(defs: StampDef[], occasionId: string | null | undefined, today: string): StampDef | null {
  if (!occasionId) return null;
  return defs.find((d) => d.family === 'challenge' && d.status === 'active' && d.calendarId === occasionId
    && !!d.window && d.window.start <= today && today <= d.window.end) || null;
}

/**
 * At or above this many members awarded at once, Admin asks for the number to
 * be typed back before publishing (a slip would ping that many members).
 */
export const LARGE_AWARD = 50;

export function isLargeAward(count: number | null): boolean {
  return count !== null && count >= LARGE_AWARD;
}

const SHAPE_LEVEL: Partial<Record<StampShape, number>> = { circle: 0, triangle: 3, square: 4, pentagon: 5, hexagon: 6 };

/** Milestones of the given levels (0 = Earthrise, 3 = triangles … 6 = hexagons), not the element Guardians. */
export function milestoneStamps(stamps: Stamp[], levels: number[]): Stamp[] {
  return stamps.filter((s) => s.family === 'milestone' && !s.element && levels.includes(SHAPE_LEVEL[s.shape] ?? -1));
}

/** Travel stamps earned anywhere, then the streak stamps. */
export function journeyStamps(stamps: Stamp[]): Stamp[] {
  return [...stamps.filter((s) => s.family === 'travel' && !s.element), ...stamps.filter((s) => s.family === 'streak')];
}

/** An element's stamps: Arrival, Explorer, then its Guardian. */
export function elementStamps(stamps: Stamp[], slug: ElementSlug): Stamp[] {
  const rank = (s: Stamp) => (s.family === 'travel' ? (s.shape === 'oval' ? 0 : 1) : 2);
  return stamps.filter((s) => s.element === slug && s.family !== 'challenge').sort((a, b) => rank(a) - rank(b));
}

/** The unearned stamps closest to being earned (by share done, then fewest steps left). */
export function nextStamps(stamps: Stamp[], count = 3): Stamp[] {
  return stamps
    .filter((s) => !s.earned && s.family !== 'challenge')
    .sort((a, b) => b.progress / b.target - a.progress / a.target || (a.target - a.progress) - (b.target - b.progress))
    .slice(0, count);
}

/** A rule in the Admin → Passport pick-list (functions/passport-catalogue.js RULE_TYPES). */
export interface RuleOption {
  type: string;
  label: string;
  /** Which families may use it. */
  families: StampFamily[];
  element: 'required' | 'optional' | 'none';
  action: boolean;
  maxTarget?: number;
  unit: string;
}

export const RULE_OPTIONS: RuleOption[] = [
  { type: 'first_steps', label: 'First steps done (of 5)', families: ['milestone'], element: 'none', action: false, maxTarget: 5, unit: 'steps' },
  { type: 'different_actions', label: 'Different actions done (braked: one new day each)', families: ['milestone'], element: 'none', action: false, unit: 'actions' },
  { type: 'elements_acted', label: 'Elements acted in (braked)', families: ['milestone'], element: 'none', action: false, maxTarget: 5, unit: 'elements' },
  { type: 'element_action_days', label: 'Days with an action in one element', families: ['milestone'], element: 'required', action: false, unit: 'days' },
  { type: 'action_weeks', label: 'One action kept up on N different weeks', families: ['milestone'], element: 'none', action: false, unit: 'weeks' },
  { type: 'specific_action', label: 'A specific action done N times', families: ['milestone', 'travel'], element: 'none', action: true, unit: 'times' },
  { type: 'element_visit', label: 'Visited an element\'s page', families: ['travel'], element: 'required', action: false, maxTarget: 1, unit: 'visit' },
  { type: 'stories_read', label: 'Stories read to the end', families: ['travel', 'milestone'], element: 'optional', action: false, unit: 'stories' },
  { type: 'videos_finished', label: 'Videos watched to the end', families: ['travel', 'milestone'], element: 'none', action: false, unit: 'videos' },
  { type: 'conversations_watched', label: 'Coffee Conversations watched to the end', families: ['travel', 'milestone'], element: 'none', action: false, unit: 'conversations' },
  { type: 'polls_voted', label: 'Polls voted in', families: ['travel', 'milestone'], element: 'none', action: false, unit: 'polls' },
  { type: 'eq_taken', label: 'EQ reflection taken', families: ['travel'], element: 'none', action: false, maxTarget: 1, unit: 'reflection' },
  { type: 'visit_streak', label: 'Visit streak (days in a row)', families: ['streak'], element: 'none', action: false, unit: 'days' },
  { type: 'window_actions', label: 'Different actions done in the window', families: ['challenge'], element: 'optional', action: false, unit: 'actions' },
  { type: 'window_stories', label: 'Stories read in the window', families: ['challenge'], element: 'optional', action: false, unit: 'stories' },
  { type: 'window_specific_action', label: 'A specific action done in the window', families: ['challenge'], element: 'none', action: true, unit: 'times' }
];

const ELEMENT_NAMES: Record<string, string> = { air: 'Air', energy: 'Energy', water: 'Water', earth: 'Earth', spirit: 'Spirit' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const longDate = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return isNaN(d.getTime()) ? day : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/**
 * "Earned when" in plain words, from a definition's rule: what the badge map shows admins.
 * actionTitle: the action's title for action rules, if known.
 */
export function earnedWhen(def: Pick<StampDef, 'rule'> & { window?: { start: string; end: string } }, actionTitle?: string): string {
  const r = def.rule || ({} as StampDef['rule']);
  const n = Number(r.target) || 0;
  const el = r.element ? ELEMENT_NAMES[r.element] || r.element : '';
  const action = actionTitle ? `"${actionTitle}"` : r.actionId ? `the action ${r.actionId}` : 'one particular action';
  const inWindow = def.window ? (def.window.start === def.window.end ? ` on ${longDate(def.window.start)}` : ` between ${longDate(def.window.start)} and ${longDate(def.window.end)}`) : '';
  switch (r.type) {
    case 'first_steps': return n >= 5 ? 'Complete all 5 first steps' : `Complete ${n} of the 5 first steps`;
    case 'different_actions': return `Do ${plural(n, 'different action')}, on ${plural(n, 'different day')}`;
    case 'elements_acted': return n >= 5 ? 'Take actions in all 5 elements, on different days' : `Take actions in ${plural(n, 'element')}, on different days`;
    case 'element_action_days': return `Take ${/^[AEIOU]/.test(el) ? 'an' : 'a'} ${el} action on ${plural(n, 'different day')}`;
    case 'action_weeks': return `Keep one action going in ${plural(n, 'different week')}`;
    case 'specific_action': return n === 1 ? `Do ${action}` : `Do ${action} ${n} times`;
    case 'element_visit': return `Visit the ${el} page`;
    case 'stories_read': return `Read ${plural(n, `${el ? el + ' ' : ''}story`, `${el ? el + ' ' : ''}stories`)} to the end`;
    case 'videos_finished': return `Watch ${plural(n, 'video')} to the end`;
    case 'conversations_watched': return `Watch ${plural(n, 'Coffee Conversation')} to the end`;
    case 'polls_voted': return n === 1 ? 'Vote in a poll' : `Vote in ${plural(n, 'poll')}`;
    case 'eq_taken': return 'Take the EQ reflection';
    case 'visit_streak': return `Visit ${n} days in a row`;
    case 'window_actions': return `Do ${plural(n, `different ${el ? el + ' ' : ''}action`)}${inWindow}`;
    case 'window_stories': return `Read ${plural(n, `${el ? el + ' ' : ''}story`, `${el ? el + ' ' : ''}stories`)} to the end${inWindow}`;
    case 'window_specific_action': return `${n === 1 ? `Do ${action}` : `Do ${action} ${n} times`}${inWindow}`;
    default: return 'Unknown rule';
  }
}

/** "fix-a-water-leak" → "Fix a water leak" (an action's ID, readable, when its title isn't loaded). */
export function actionName(id: string): string {
  const t = String(id || '').replace(/[-_]+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'an action';
}

/**
 * Why a member earned a stamp, in the past tense, from what the server recorded
 * (passport_stamps evidence: the rule, its target, and the count that crossed it).
 * Falls back to the badge's current rule for records without evidence.
 */
export function earnedBecause(stamp: Pick<Stamp, 'rule' | 'evidence' | 'window' | 'name' | 'family'>): string {
  const e = stamp.evidence;
  const rule = stamp.rule || ({} as StampDef['rule']);
  const type = e?.rule || rule.type;
  // The badge's threshold (as it was when earned), not the member's count then: a stamp
  // added from history may have been recorded past its target, and "6" on Five Petals
  // contradicts the badge. Reaching more includes reaching the target, so this stays true.
  const n = Number(e?.target) || Number(rule.target) || Number(e?.value) || 0;
  const el = rule.element ? ELEMENT_NAMES[rule.element] || rule.element : '';
  const action = rule.actionId ? `"${actionName(rule.actionId)}"` : 'that action';
  const win = e?.window || stamp.window;
  const during = win ? ` ${win.start === win.end ? `on ${longDate(win.start)}` : `between ${longDate(win.start)} and ${longDate(win.end)}`}, during the ${stamp.name} challenge` : '';
  switch (type) {
    case 'first_steps': return 'You completed all 5 first steps on WIOF.';
    case 'different_actions': return `You did ${plural(n, 'different action')}, on ${plural(n, 'different day')}.`;
    case 'elements_acted': return n >= 5 ? 'You took actions in all 5 elements, on different days.' : `You took actions in ${plural(n, 'element')}, on different days.`;
    case 'element_action_days': return `You took ${el ? el + ' ' : ''}actions on ${plural(n, 'different day')}.`;
    case 'action_weeks': return `You kept one action going in ${plural(n, 'different week')}.`;
    case 'specific_action': return n === 1 ? `You did ${action}.` : `You did ${action} ${n} times.`;
    case 'element_visit': return `You visited the ${el} page.`;
    case 'stories_read': return `You read ${plural(n, `${el ? el + ' ' : ''}story`, `${el ? el + ' ' : ''}stories`)} to the end.`;
    case 'videos_finished': return `You watched ${plural(n, 'video')} to the end.`;
    case 'conversations_watched': return `You watched ${plural(n, 'Coffee Conversation')} to the end.`;
    case 'polls_voted': return n === 1 ? 'You had your say in a poll.' : `You voted in ${plural(n, 'poll')}.`;
    case 'eq_taken': return 'You took the EQ reflection.';
    case 'visit_streak': return `You visited ${n} days in a row.`;
    case 'window_actions': return `You did ${plural(n, `different ${el ? el + ' ' : ''}action`)}${during}.`;
    case 'window_stories': return `You read ${plural(n, `${el ? el + ' ' : ''}story`, `${el ? el + ' ' : ''}stories`)} to the end${during}.`;
    case 'window_specific_action': return `${n === 1 ? `You did ${action}` : `You did ${action} ${n} times`}${during}.`;
    default: return 'You earned it on WIOF.';
  }
}

/**
 * earnedBecause in the first person, for a badge the member shares
 * ("I kept one action going in 6 different weeks.").
 */
export function sharedBecause(stamp: Pick<Stamp, 'rule' | 'evidence' | 'window' | 'name' | 'family'>): string {
  return firstPerson(earnedBecause(stamp));
}

/** "You … your" written to the member, as the member would say it ("I … my"). "Thank you" stays. */
function firstPerson(text: string): string {
  return text
    .replace(/(^|[.!?:]\s+)Your\b/g, '$1My')
    .replace(/(^|[.!?:]\s+)You\b/g, '$1I')
    .replace(/\byour\b/g, 'my');
}

/**
 * The badge's meaning on a shared card: meanings speak to the member ("Your first steps…"), which a
 * viewer would read as meant for them, so they're put in the first person. '' when that only repeats
 * the "why" line above it ("I took the EQ reflection.").
 */
export function sharedMeaning(stamp: Pick<Stamp, 'rule' | 'evidence' | 'window' | 'name' | 'family' | 'meaning'>): string {
  const meaning = firstPerson((stamp.meaning || '').trim());
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(meaning) === norm(sharedBecause(stamp)) ? '' : meaning;
}

/**
 * When the badge's rule has changed since the member earned it (a new version), a quiet line saying so,
 * with what it took then; '' otherwise. Their badge and date stay as they were.
 */
export function earlierVersionNote(stamp: Pick<Stamp, 'earnedVersion' | 'version' | 'evidence' | 'unit'>): string {
  if (!stamp.earnedVersion || !stamp.version || stamp.earnedVersion >= stamp.version) return '';
  const then = stamp.evidence ? `: then it took ${stamp.evidence.target}${stamp.unit ? ' ' + stamp.unit : ''}` : '';
  return `You earned this under an earlier version of the badge${then}. It's still yours.`;
}

/** A stamp to show for a definition as it's being edited (the badge map and the form's live preview). */
export function previewStamp(def: Partial<StampDef> & { rule: StampDef['rule'] }, earned: boolean): Stamp {
  const title = (def.title && def.title.length ? def.title : [def.name || 'New badge']).slice(0, 2);
  return {
    id: def.id || 'preview',
    family: (def.family as StampFamily) || 'travel',
    title,
    name: def.name || title.join(' '),
    caption: def.caption || '',
    meaning: def.meaning || '',
    element: (def.element as ElementSlug) || null,
    shape: (def.shape as StampShape) || 'circle',
    ink: def.ink || PASSPORT_INK[(def.element as ElementSlug) || 'journey'],
    rotation: (hash(def.id || 'preview') % 21) - 10,
    earned,
    earnedAt: earned ? new Date() : null,
    dateKnown: true,
    progress: earned ? def.rule.target : 0,
    target: def.rule.target || 1,
    hint: def.hint || '',
    unit: def.unit || ''
  };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "06 NOV 2026", like a passport stamp. */
export function stampDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** What an earned stamp says in its middle: its date, or "BEFORE LAUNCH" when history can't prove one. */
export function stampDateText(s: Pick<Stamp, 'earned' | 'earnedAt' | 'dateKnown'>): string {
  if (!s.earned) return '';
  if (!s.dateKnown) return 'BEFORE LAUNCH';
  return s.earnedAt ? stampDate(s.earnedAt) : 'EARNED';
}

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "WIOF-7K2M-Q4RX": stable for a member, says nothing about who they are. */
export function memberNumber(uid: string): string {
  const a = hash(uid);
  const b = hash(`${uid}:passport`);
  const pick = (v: number) => {
    let out = '';
    for (let i = 0; i < 4; i++) {
      out += B32[v % 32];
      v = Math.floor(v / 32);
    }
    return out;
  };
  return `WIOF-${pick(a)}-${pick(b)}`;
}

/** The two machine-readable lines at the foot of the identity page, 44 characters each, like a real passport. */
export function machineLines(name: string, memberNo: string, joined: Date | null): [string, string] {
  const clean = (t: string) => t.toUpperCase().normalize('NFD').replace(/[^A-Z ]/g, '').trim().replace(/\s+/g, '<');
  const pad = (t: string) => (t + '<'.repeat(44)).slice(0, 44);
  const d = joined ? `${String(joined.getFullYear()).slice(2)}${String(joined.getMonth() + 1).padStart(2, '0')}${String(joined.getDate()).padStart(2, '0')}` : '<<<<<<';
  return [pad(`P<EARTH<<${clean(name) || 'MEMBER'}`), pad(`${memberNo.replace(/-/g, '')}<<EARTH${d}<<ONE<FAMILY`)];
}
