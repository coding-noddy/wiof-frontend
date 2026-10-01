/**
 * A user's participation record for one action (`user_actions/{userActionId}`).
 * Flat top-level collection with a `userId` field, matching every other
 * per-user collection in this app (`activity_log`, `user_metrics`,
 * `user_saved_content`) — not a `users/{uid}/...` subcollection, which has
 * no precedent in this codebase.
 *
 * Doc ID is deterministic: `${userId}_${actionId}` for the user's current
 * state on that action. There is no `NOT_STARTED` status — the absence of a
 * doc for a given userId+actionId means the user has never engaged with it,
 * the same way a missing `activity_log` entry means "never done."
 *
 * A `DAILY` repeat completion additionally writes a separate, period-keyed
 * dedup guard doc (`${userId}_${actionId}_${calendarDay}`) in the same
 * collection, reusing activity_log's daily_visit dedup trick — see
 * UserActionService for details. That guard doc shares this shape loosely
 * (it carries `userId`/`actionId`/`calendarDay`) but is never read back as
 * "the" user_actions record for an action; only the `${userId}_${actionId}`
 * doc is.
 */
export interface UserAction {
  id: string;
  userId: string;
  actionId: string;
  status: 'IN_PROGRESS' | 'COMPLETE';

  startedAt: any;
  completedAt: any;
  completionCount: number;
  lastCompletedAt: any;
  completionMethod: 'SELF_REPORTED';

  // Snapshot of the action's taxonomy at the time of this record, so an
  // admin editing the action later doesn't retroactively change history.
  elementIdsSnapshot: string[];
  actionVersion: number;

  createdAt: any;
  updatedAt: any;
}
