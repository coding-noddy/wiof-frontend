/**
 * "Next for you" (Phase 2 step 7, docs/PHASE2_PLAN.md section F): a few
 * rule-based suggestions for a signed-in user, each with the reason it was
 * picked. No ML: unread stories and not-yet-done actions in the user's
 * elements, in this order:
 *
 * Stories: similar to what they read last ("Because you read …"), then the
 *   newest in each of their elements ("New in Water").
 * Actions: ones they started but haven't done ("You started this"), then
 *   ones that go with what they read ("Goes with …"), then their elements'
 *   actions in the Take Action order ("Try in Earth").
 *
 * Stories they've read to the end and actions they've completed never show.
 */
import type { EngagementMetrics } from '../services/activity.service';
import type { UserProfile } from '../services/user-profile.service';
import { elementsExplored, ElementSlug, JOURNEY_ELEMENTS, preferredElements } from './Journey';
import { ExploreItem } from './RelatedContent';

export interface NextPick {
  item: ExploreItem;
  /** Why it was picked, shown with it: "Because you read “Veganism”". */
  why: string;
}

export interface NextForYou {
  read: NextPick[];
  act: NextPick[];
  /** The elements the picks came from, shown so the user knows (and can change them). */
  elements: ElementSlug[];
  /** Whether the user chose those elements, or they come from what they explored. */
  basis?: 'chosen' | 'explored';
}

/** A story the user read to the end, with the server's similar content for it. */
export interface RecentRead {
  title: string;
  blogs: ExploreItem[];
  actions: ExploreItem[];
}

export interface NextForYouInput {
  elements: ElementSlug[];
  /** IDs and slugs of the stories read to the end. */
  readIds: Set<string>;
  /** IDs of the actions completed. */
  doneActionIds: Set<string>;
  /** Actions started but not completed, most recent first. */
  started: ExploreItem[];
  /** Most recent first. */
  recentReads: RecentRead[];
  /** Newest stories per element. */
  newestByElement: Partial<Record<ElementSlug, ExploreItem[]>>;
  /** Each element's actions in the Take Action order. */
  actionsByElement: Partial<Record<ElementSlug, ExploreItem[]>>;
}

/** Two of each; if one kind runs short the other fills in, up to four in all. */
export const NEXT_FOR_YOU_LIMITS = { read: 2, act: 2, total: 4 };

/** Recent reads whose similar content is looked at. */
export const NEXT_FOR_YOU_RECENT_READS = 3;

/** The elements to suggest from: the ones chosen, else the ones explored. */
export function nextForYouElements(
  profile: Pick<UserProfile, 'preferredElements'> | null | undefined,
  metrics: EngagementMetrics | null | undefined
): ElementSlug[] {
  const chosen = preferredElements(profile);
  return chosen.length ? chosen : elementsExplored(metrics);
}

export function elementName(slug: string): string {
  return JOURNEY_ELEMENTS.find((e) => e.slug === slug)?.name || slug;
}

/** "Veganism", or a long title cut at a word, about 28 characters, with an ellipsis. */
export function shortTitle(title: string, max = 28): string {
  const t = (title || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  // Cut at the last word break, or keep the whole cut if a word ends right there.
  const space = /[\s,.:;!?–-]/.test(t[max]) ? max : cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,:;–-]+$/, '')}…`;
}

const itemElements = (item: ExploreItem): string[] =>
  item.type === 'action' ? item.action?.elementIds || [] : item.element ? [item.element] : [];

/** Round-robin: the first of each list, then the second of each… */
function roundRobin<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

export function pickNextForYou(input: NextForYouInput, limits = NEXT_FOR_YOU_LIMITS): NextForYou {
  const elements = new Set<string>(input.elements);
  const inElements = (item: ExploreItem) => itemElements(item).some((e) => elements.has(e));
  const unread = (item: ExploreItem) => !input.readIds.has(item.id) && !(item.blog?.slug && input.readIds.has(item.blog.slug));
  const notDone = (item: ExploreItem) => !input.doneActionIds.has(item.id);

  const because = (r: RecentRead) => `Because you read “${shortTitle(r.title)}”`;
  const goesWith = (r: RecentRead) => `Goes with “${shortTitle(r.title)}”`;
  const byElement = (pools: NextForYouInput['newestByElement'], label: string) =>
    roundRobin(input.elements.map((slug) => (pools[slug] || []).map((item) => ({ item, why: `${label} ${elementName(slug)}` }))));

  const stories = [
    ...roundRobin(input.recentReads.map((r) => r.blogs.map((item) => ({ item, why: because(r) })))),
    ...byElement(input.newestByElement, 'New in')
  ].filter((p) => p.item.type !== 'action' && unread(p.item) && inElements(p.item));

  const actions = [
    ...input.started.map((item) => ({ item, why: 'You started this' })),
    ...roundRobin(input.recentReads.map((r) => r.actions.map((item) => ({ item, why: goesWith(r) })))),
    ...byElement(input.actionsByElement, 'Try in')
  ].filter((p) => p.item.type === 'action' && notDone(p.item) && inElements(p.item));

  const read = dedupe(stories);
  const act = dedupe(actions);
  let r = Math.min(limits.read, read.length);
  let a = Math.min(limits.act, act.length);
  r += Math.min(limits.total - r - a, read.length - r);
  a += Math.min(limits.total - r - a, act.length - a);
  return { read: read.slice(0, r), act: act.slice(0, a), elements: input.elements };
}

/** First pick of each item wins, so it keeps its most specific reason. */
function dedupe(picks: NextPick[]): NextPick[] {
  const seen = new Set<string>();
  return picks.filter((p) => {
    const key = `${p.item.type}:${p.item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
