/**
 * Small client-side text search helpers shared by the list pages' search
 * boxes (Take Action hub, Blogs, Videos). Everything filters data the page
 * has already loaded — no Firestore/YouTube queries involved.
 */

/** Lowercases, treats underscores as spaces (so "energy saving" matches an
 *  `energy_saving` category), and collapses whitespace. */
export function normalizeSearchText(value: string): string {
  return (value || '').toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function searchTerms(query: string): string[] {
  return normalizeSearchText(query).split(' ').filter(Boolean);
}

/** True when every term appears somewhere across the given fields. */
export function matchesAllTerms(terms: string[], fields: (string | null | undefined)[]): boolean {
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  return terms.every((t) => haystack.includes(t));
}

/** Filters items to those matching every term, with title matches first. */
export function searchItems<T>(
  items: T[],
  query: string,
  title: (item: T) => string,
  fields: (item: T) => (string | null | undefined)[]
): T[] {
  const terms = searchTerms(query);
  if (!terms.length) {
    return [];
  }
  const titleHit = (item: T) => matchesAllTerms(terms, [title(item)]);
  return items
    .filter((item) => matchesAllTerms(terms, [title(item), ...fields(item)]))
    .sort((a, b) => Number(titleHit(b)) - Number(titleHit(a)));
}
