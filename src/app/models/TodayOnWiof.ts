/**
 * "Today on WIOF" (Phase 2 step 6, docs/PHASE2_PLAN.md section E): today's
 * calendar occasion, one short fact with its source, and one related story
 * and action. For now the fact is the occasion's own description and the
 * source its "Show more" link (decided 2026-11-05: use what the calendar
 * already has; a separate team-written fact can replace it later).
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

/** Whether the reader hid the card today (any other day's value is stale). */
export function hiddenToday(storedDay: string | null, today: string): boolean {
  return storedDay === today;
}
