/**
 * Planet Passport (design experiment, docs/PLANET_PASSPORT_DESIGN.md): the
 * stamps a member has earned, worked out from their server-trusted
 * `user_metrics` and profile, never from the browser's own counts. Pure
 * functions, so the rules can be tested and later run on the server.
 */
import type { EngagementMetrics } from '../services/activity.service';
import type { UserProfile } from '../services/user-profile.service';
import { elementsExplored, ElementSlug, JOURNEY_ELEMENTS } from './Journey';

export type StampShape = 'circle' | 'rect' | 'oval' | 'hex';

export interface Stamp {
  id: string;
  /** One or two short lines, e.g. ["River", "Guardian"]. */
  title: string[];
  /** Small caps line, e.g. "WATER" or "JOURNEY". */
  caption: string;
  element: ElementSlug | null;
  shape: StampShape;
  ink: string;
  /** -10…10 degrees, the same for a stamp every time. */
  rotation: number;
  earned: boolean;
  progress: number;
  target: number;
  /** What to do to earn it: "Read 5 Water stories". */
  hint: string;
  /** "stories", "actions": the unit of progress. */
  unit: string;
}

export interface PassportInput {
  metrics: EngagementMetrics | null;
  profile: Pick<UserProfile, 'longestStreak'> | null;
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

const GUARDIAN: Record<ElementSlug, string[]> = {
  air: ['Clean Air', 'Guardian'],
  energy: ['Power', 'Saver'],
  water: ['River', 'Guardian'],
  earth: ['Earth', 'Protector'],
  spirit: ['Mindful', 'Living']
};

interface Rule {
  id: string;
  /** Ink of a journey stamp (element stamps use their element's ink). */
  ink?: string;
  title: string[];
  caption: string;
  element: ElementSlug | null;
  shape: StampShape;
  target: number;
  unit: string;
  hint: string;
  progress: (input: PassportInput) => number;
}

const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);

/** The journey stamps, earned anywhere on WIOF. */
const JOURNEY_RULES: Rule[] = [
  { id: 'first-step', ink: PASSPORT_INK.water, title: ['First', 'Step'], caption: 'JOURNEY', element: null, shape: 'circle', target: 1, unit: 'action', hint: 'Complete your first action', progress: (i) => n(i.metrics?.totalActionsCompleted) },
  { id: 'knowledge-explorer', ink: PASSPORT_INK.air, title: ['Knowledge', 'Explorer'], caption: 'JOURNEY', element: null, shape: 'rect', target: 10, unit: 'stories', hint: 'Read 10 stories to the end', progress: (i) => n(i.metrics?.qualityReads) },
  { id: 'streak-7', ink: PASSPORT_INK.energy, title: ['7-Day', 'Streak'], caption: 'JOURNEY', element: null, shape: 'oval', target: 7, unit: 'days', hint: 'Visit 7 days in a row', progress: (i) => n(i.profile?.longestStreak) },
  { id: 'one-family', ink: PASSPORT_INK.earth, title: ['One', 'Family'], caption: 'JOURNEY', element: null, shape: 'hex', target: 5, unit: 'elements', hint: 'Explore all five elements', progress: (i) => elementsExplored(i.metrics).length },
  { id: 'inner-weather', ink: PASSPORT_INK.spirit, title: ['Inner', 'Weather'], caption: 'EQ', element: null, shape: 'circle', target: 1, unit: 'reflection', hint: 'Take the EQ reflection', progress: (i) => (i.metrics?.lastEqScore != null ? 1 : 0) },
  { id: 'your-voice', ink: PASSPORT_INK.journey, title: ['Your', 'Voice'], caption: 'POLLS', element: null, shape: 'rect', target: 1, unit: 'vote', hint: 'Vote in a poll', progress: (i) => n(i.metrics?.pollsVoted) },
  { id: 'good-watch', ink: PASSPORT_INK.air, title: ['Good', 'Watch'], caption: 'VIDEOS', element: null, shape: 'oval', target: 3, unit: 'videos', hint: 'Watch 3 videos to the end', progress: (i) => n(i.metrics?.videosCompleted) },
  { id: 'streak-30', ink: PASSPORT_INK.spirit, title: ['30-Day', 'Streak'], caption: 'JOURNEY', element: null, shape: 'hex', target: 30, unit: 'days', hint: 'Visit 30 days in a row', progress: (i) => n(i.profile?.longestStreak) }
];

/** Three stamps per element: arriving, reading, acting. */
function elementRules(slug: ElementSlug, name: string): Rule[] {
  const reads = (i: PassportInput) => n(i.metrics?.qualityReadsByElement?.[slug]);
  const acts = (i: PassportInput) => n(i.metrics?.actionsByElement?.[slug]);
  const caption = name.toUpperCase();
  return [
    { id: `${slug}-arrival`, title: ['Arrived'], caption, element: slug, shape: 'circle', target: 1, unit: 'visit', hint: `Read a ${name} story or take a ${name} action`, progress: (i) => Math.min(1, reads(i) + acts(i)) },
    { id: `${slug}-explorer`, title: [name, 'Explorer'], caption, element: slug, shape: 'rect', target: 5, unit: 'stories', hint: `Read 5 ${name} stories`, progress: reads },
    { id: `${slug}-guardian`, title: GUARDIAN[slug], caption, element: slug, shape: 'hex', target: 5, unit: 'actions', hint: `Complete 5 ${name} actions`, progress: acts }
  ];
}

const RULES: Rule[] = [...JOURNEY_RULES, ...JOURNEY_ELEMENTS.flatMap((e) => elementRules(e.slug, e.name))];

/** A small stable hash, for the stamp's tilt and the member number. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function passportStamps(input: PassportInput): Stamp[] {
  return RULES.map((r) => {
    const progress = Math.min(r.target, Math.max(0, Math.floor(r.progress(input))));
    return {
      id: r.id,
      title: r.title,
      caption: r.caption,
      element: r.element,
      shape: r.shape,
      ink: r.ink || PASSPORT_INK[r.element || 'journey'],
      rotation: (hash(r.id) % 21) - 10,
      earned: progress >= r.target,
      progress,
      target: r.target,
      hint: r.hint,
      unit: r.unit
    };
  });
}

export function journeyStamps(stamps: Stamp[]): Stamp[] {
  return stamps.filter((s) => !s.element);
}

export function elementStamps(stamps: Stamp[], slug: ElementSlug): Stamp[] {
  return stamps.filter((s) => s.element === slug);
}

/** The unearned stamps closest to being earned (by share done, then fewest steps left). */
export function nextStamps(stamps: Stamp[], count = 3): Stamp[] {
  return stamps
    .filter((s) => !s.earned)
    .sort((a, b) => b.progress / b.target - a.progress / a.target || (a.target - a.progress) - (b.target - b.progress))
    .slice(0, count);
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
