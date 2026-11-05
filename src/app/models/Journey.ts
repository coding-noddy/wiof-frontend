/**
 * The journey experience (Phase 2 step 5, docs/PHASE2_PLAN.md section D):
 * the welcome after sign-in, the first-steps checklist and the My Journey
 * story. Everything here is derived from the user's profile and their
 * server-trusted `user_metrics` (docs/METRICS.md), never from the browser.
 */
import type { EngagementMetrics } from '../services/activity.service';
import type { UserProfile } from '../services/user-profile.service';

export const JOURNEY_ELEMENTS = [
  { slug: 'air', name: 'Air', icon: 'cloud-outline' },
  { slug: 'energy', name: 'Energy', icon: 'flash-outline' },
  { slug: 'water', name: 'Water', icon: 'water-outline' },
  { slug: 'earth', name: 'Earth', icon: 'leaf-outline' },
  { slug: 'spirit', name: 'Spirit', icon: 'sparkles-outline' }
] as const;

export type ElementSlug = (typeof JOURNEY_ELEMENTS)[number]['slug'];

const SLUGS = new Set<string>(JOURNEY_ELEMENTS.map((e) => e.slug));

/** The EQ check is on the Spirit page, in the section with this id (8.9.1: the old /element/water/eq-assessment never existed). */
export const EQ_ASSESSMENT_LINK = '/element/spirit';
export const EQ_ASSESSMENT_FRAGMENT = 'eq-assessment';

/** The user's chosen elements, cleaned up (known ones, in the site's order). */
export function preferredElements(profile: Pick<UserProfile, 'preferredElements'> | null | undefined): ElementSlug[] {
  const chosen = new Set((profile?.preferredElements || []).map((e) => String(e).toLowerCase()));
  return JOURNEY_ELEMENTS.map((e) => e.slug).filter((slug) => chosen.has(slug));
}

/**
 * Whether to show the welcome after sign-in: not done yet, and no elements
 * chosen (someone who picked elements in Settings already told us).
 */
export function needsWelcome(profile: UserProfile | null | undefined): boolean {
  return !!profile && !profile.onboarding?.welcomeDoneAt && preferredElements(profile).length === 0;
}

export interface FirstStep {
  key: 'elements' | 'read' | 'watch' | 'eq' | 'act';
  title: string;
  hint: string;
  done: boolean;
  link: string;
  fragment?: string;
}

/**
 * The five first steps, each ticked by a trusted metric. Links go to the
 * user's first chosen element where it helps, else Earth.
 */
export function firstSteps(profile: UserProfile | null | undefined, metrics: EngagementMetrics | null | undefined): FirstStep[] {
  const element = preferredElements(profile)[0] || 'earth';
  return [
    { key: 'elements', title: 'Choose your elements', hint: 'So WIOF can suggest what matters to you', done: preferredElements(profile).length > 0, link: '/settings' },
    { key: 'read', title: 'Read a story to the end', hint: 'Scroll through and take your time', done: (metrics?.qualityReads || 0) > 0, link: `/element/${element}/blogs` },
    { key: 'watch', title: 'Watch a video', hint: 'Most of the way through counts', done: (metrics?.videosCompleted || 0) > 0, link: `/element/${element}/videos` },
    { key: 'eq', title: 'Check your EQ', hint: 'About 5 minutes, 24 questions', done: metrics?.lastEqScore != null, link: EQ_ASSESSMENT_LINK, fragment: EQ_ASSESSMENT_FRAGMENT },
    { key: 'act', title: 'Do your first action', hint: 'Something small you can do today', done: (metrics?.totalActionsCompleted || 0) > 0, link: `/element/${element}/take-action` }
  ];
}

/** Whether to show the checklist: not dismissed, and something left to do. */
export function showFirstSteps(profile: UserProfile | null | undefined, steps: FirstStep[]): boolean {
  return !!profile && !profile.onboarding?.checklistDismissedAt && steps.some((s) => !s.done);
}

/** Elements with at least one quality read or one completed action. */
export function elementsExplored(metrics: EngagementMetrics | null | undefined): ElementSlug[] {
  const has = (m: Record<string, number> | undefined, slug: string) => ((m || {})[slug] || 0) > 0;
  return JOURNEY_ELEMENTS.map((e) => e.slug).filter((slug) => has(metrics?.qualityReadsByElement, slug) || has(metrics?.actionsByElement, slug));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "a, b and c" */
function listOf(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * My Journey as a story (Roadmap §8 tone): "Since you joined in March 2026,
 * you've read 9 stories, watched 3 videos and done 17 actions across
 * 4 elements." Null until there's something to tell.
 */
export function journeyStory(profile: UserProfile | null | undefined, metrics: EngagementMetrics | null | undefined): string | null {
  if (!metrics) return null;
  const parts: string[] = [];
  if (metrics.qualityReads > 0) parts.push(`read ${plural(metrics.qualityReads, 'story', 'stories')}`);
  if (metrics.videosCompleted > 0) parts.push(`watched ${plural(metrics.videosCompleted, 'video')}`);
  if (metrics.totalActionsCompleted > 0) parts.push(`done ${plural(metrics.totalActionsCompleted, 'action')}`);
  if (!parts.length) return null;

  const explored = elementsExplored(metrics).length;
  const across = explored > 1 ? ` across ${plural(explored, 'element')}` : explored === 1 ? ' in 1 element' : '';
  const joined = toDate(profile?.joinedDate);
  const since = joined ? `Since you joined in ${joined.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}, you've` : "You've";
  return `${since} ${listOf(parts)}${across}.`;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
