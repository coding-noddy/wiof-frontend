/**
 * Connected content (Phase 2 step 4, docs/PHASE2_PLAN.md section C).
 *
 * Admins link a blog, action or calendar occasion to other blogs, videos and
 * actions. The doc stores:
 * - `relatedContent`: the links in the admin's order, each with a title
 *   snapshot (videos are YouTube videos with no doc of their own, so their
 *   title and element live only here);
 * - `relatedKeys`: the same links as flat `type:id` strings, so the other side
 *   can find them with one `array-contains` query. A link therefore works both
 *   ways without editing both items.
 */
export type RelatedType = 'blog' | 'video' | 'action';

export interface RelatedRef {
  type: RelatedType;
  id: string;
  title: string;
  /** Element for the link's URL (videos only; blogs and actions have their own). */
  element?: string;
}

export const MAX_RELATED = 6;

/** One card in an "Explore next" block. */
export interface ExploreItem {
  type: RelatedType;
  id: string;
  title: string;
  image: string | null;
  /** Ionic icon shown when there's no image (actions). */
  icon?: string;
  /** Router link and query params. */
  link: string[];
  queryParams?: Record<string, string>;
  /** Linked by an admin (either direction), or the "more from this element" fallback. */
  reason: 'linked' | 'element';
}

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function relatedKey(ref: { type: RelatedType; id: string }): string {
  return `${ref.type}:${ref.id}`;
}

/** The YouTube video ID in a watch/share/embed URL, or a bare ID; null if none. */
export function youtubeIdFrom(input: string): string | null {
  const value = (input || '').trim();
  if (YOUTUBE_ID.test(value)) return value;
  const match = value.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/);
  return match ? match[1] : null;
}

/**
 * The `relatedContent` and `relatedKeys` fields to store for an edited list:
 * drops duplicates, blanks and links to the item itself, and caps the list.
 */
export function relatedFields(
  refs: RelatedRef[] | null | undefined,
  self?: { type: RelatedType; id: string | null }
): { relatedContent: RelatedRef[]; relatedKeys: string[] } {
  const selfKey = self?.id ? relatedKey(self as { type: RelatedType; id: string }) : null;
  const seen = new Set<string>();
  const relatedContent: RelatedRef[] = [];
  for (const ref of refs || []) {
    if (!ref || !ref.id || !['blog', 'video', 'action'].includes(ref.type)) continue;
    const key = relatedKey(ref);
    if (key === selfKey || seen.has(key)) continue;
    seen.add(key);
    const clean: RelatedRef = { type: ref.type, id: ref.id, title: ref.title || '' };
    if (ref.element) clean.element = ref.element;
    relatedContent.push(clean);
    if (relatedContent.length === MAX_RELATED) break;
  }
  return { relatedContent, relatedKeys: relatedContent.map(relatedKey) };
}

/**
 * The cards to show: admin links first (in order), then the fallback, with
 * duplicates and the current item removed, at most `max`.
 */
export function mergeExploreItems(
  selfKey: string | null,
  linked: ExploreItem[],
  fallback: ExploreItem[],
  max: number
): ExploreItem[] {
  const seen = new Set<string>(selfKey ? [selfKey] : []);
  const result: ExploreItem[] = [];
  for (const item of [...linked, ...fallback]) {
    const key = relatedKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === max) break;
  }
  return result;
}

/** Alternates two lists (a, b, a, b, ...) so a fallback mixes stories and actions. */
export function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

/** FNV-1a: a small, stable string hash. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * `items` in an order that differs per `seed` but is the same on every visit,
 * so each page gets its own selection from the same pool without the cards
 * changing on reload.
 */
export function seededOrder<T>(items: T[], seed: string, keyOf: (item: T) => string): T[] {
  return items
    .map((item) => ({ item, rank: hash(`${seed}|${keyOf(item)}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.item);
}
