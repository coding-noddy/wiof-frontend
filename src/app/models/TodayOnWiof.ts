/**
 * "Today on WIOF" (Phase 2 step 6, docs/PHASE2_PLAN.md section E): today's
 * calendar occasion, its description, one short fact ("Did you know?"), and
 * one related story and action.
 *
 * Facts (8.8.0) start as drafts written by the WIOF team and are checked by
 * an admin, who adds the source. A link is only called the fact's "Source"
 * once the fact is reviewed and has its own source; until then the
 * occasion's "Show more" link is offered as "Learn more", so no site is
 * credited with words it didn't write.
 */
import type { EnvDay } from './env-cal-data';

/** localStorage key: the calendar day the card was hidden on ("Hide for today"). */
export const TODAY_HIDDEN_KEY = 'wiof_today_hidden';

/** The occasion to feature today: the first with a fact to show. */
export function todaysOccasion(occasions: EnvDay[] | null | undefined): EnvDay | null {
  return (occasions || []).find((o) => !!(o?.occasion && o.description?.trim())) || null;
}

/** The source link's site name ("navs-online.org"), or null if it isn't a web link. */
export function sourceName(url: string | null | undefined): string | null {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.hostname.replace(/^www\./, '') : null;
  } catch {
    return null;
  }
}

export interface TodaySource {
  label: 'Source' | 'Learn more';
  url: string;
  /** The site's name, e.g. "navs-online.org". */
  site: string;
}

/** The link shown under the fact: its reviewed source, else the occasion's "Show more" link. */
export function occasionSource(occasion: Pick<EnvDay, 'fact' | 'factSource' | 'factStatus' | 'showMoreLink'>): TodaySource | null {
  const reviewed = !!occasion.fact?.trim() && occasion.factStatus === 'reviewed' && sourceName(occasion.factSource);
  const url = reviewed ? occasion.factSource! : occasion.showMoreLink;
  const site = sourceName(url);
  return site ? { label: reviewed ? 'Source' : 'Learn more', url, site } : null;
}

/** The fact fields as the admin form saves them: a fact without a review is a draft. */
export function factFields(fact: string | null | undefined, source: string | null | undefined, reviewed: boolean): Pick<EnvDay, 'fact' | 'factSource' | 'factStatus'> {
  const text = (fact || '').trim();
  return {
    fact: text || null,
    factSource: (source || '').trim() || null,
    factStatus: text ? (reviewed ? 'reviewed' : 'draft') : null
  };
}

/** Whether the reader hid the card today (any other day's value is stale). */
export function hiddenToday(storedDay: string | null, today: string): boolean {
  return storedDay === today;
}
