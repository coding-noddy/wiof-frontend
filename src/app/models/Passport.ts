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

export type StampFamily = 'milestone' | 'travel' | 'streak';
export type StampShape = 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'oval' | 'rect' | 'rosette';

/** passport_stamp_defs/{id}: display data and the rule's type/target for the hint. */
export interface StampDef {
  id: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  family: StampFamily;
  order: number;
  title: string[];
  caption: string;
  meaning: string;
  hint: string;
  unit: string;
  element: ElementSlug | null;
  shape: StampShape;
  ink: string;
  rule: { type: string; target: number; element?: string };
}

/** passport_stamps/{uid}_{stampId}, as the app reads it. */
export interface StampRecord {
  stampId: string;
  earnedAt: Date | null;
  /** false: history couldn't prove the date ("Earned before launch"). */
  dateKnown: boolean;
  /** "trigger" (earned just now), or "backfill:{runId}" (recorded at launch from history). */
  source?: string;
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
        unit: d.unit
      };
    });
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
  return stamps.filter((s) => s.element === slug).sort((a, b) => rank(a) - rank(b));
}

/** The unearned stamps closest to being earned (by share done, then fewest steps left). */
export function nextStamps(stamps: Stamp[], count = 3): Stamp[] {
  return stamps
    .filter((s) => !s.earned)
    .sort((a, b) => b.progress / b.target - a.progress / a.target || (a.target - a.progress) - (b.target - b.progress))
    .slice(0, count);
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
