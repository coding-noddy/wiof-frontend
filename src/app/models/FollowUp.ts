/**
 * "Did you try it?" (8.15.0): when a member comes back, the home panel asks
 * once, gently, about an action they said they'd try ("I'll try this",
 * IN_PROGRESS) on an earlier day. "Yes, I did" marks it done; "Not yet"
 * hides the question until tomorrow, on this device.
 */
import type { ActionItem } from './ActionItem';
import type { UserAction } from './UserAction';

export const FOLLOW_UP_LATER_KEY = 'wiof_follow_up_later';

const toDate = (t: any): Date | null => (t && typeof t.toDate === 'function' ? t.toDate() : t ? new Date(t) : null);

/** Local start of the day, as the member sees "today". */
function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * The started action to ask about: the most recently started one, started
 * before today and still active in the catalogue, unless the member said
 * "Not yet" to it today (`laterFor` maps an action ID to the day they did).
 */
export function pickFollowUp(
  history: UserAction[],
  actions: ActionItem[],
  now: Date,
  laterFor: Record<string, string>,
  today: string
): ActionItem | null {
  const byId = new Map(actions.filter((a) => a.isActive).map((a) => [a.id, a]));
  const cutoff = startOfDay(now).getTime();
  const started = history
    .filter((h) => h.status === 'IN_PROGRESS' && byId.has(h.actionId) && laterFor[h.actionId] !== today)
    .map((h) => ({ h, at: toDate(h.startedAt)?.getTime() ?? NaN }))
    .filter(({ at }) => Number.isFinite(at) && at < cutoff)
    .sort((a, b) => b.at - a.at);
  return started.length ? byId.get(started[0].h.actionId)! : null;
}
