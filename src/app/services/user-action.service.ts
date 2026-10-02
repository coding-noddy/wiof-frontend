import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserAction } from '../models/UserAction';
import { ActionItem } from '../models/ActionItem';
import { FIREBASE_COLLECTION, USER_ACTION_STATUS, REPEAT_TYPE } from '../app.constants';
import { ActivityService, toCalendarDay } from './activity.service';

@Injectable({
  providedIn: 'root'
})
export class UserActionService {
  /** Same bound used for My Journey's other history lists — see
   *  ActivityService.MAX_HISTORY_ITEMS. */
  private static readonly MAX_HISTORY_ITEMS = 50;

  constructor(
    private firestore: AngularFirestore,
    private activityService: ActivityService
  ) {}

  private docId(userId: string, actionId: string): string {
    return `${userId}_${actionId}`;
  }

  /**
   * A user's current state on one action, or null if they've never started
   * or completed it (absence of a doc, same convention as activity_log).
   */
  getUserActionStatus(userId: string, actionId: string): Observable<UserAction | null> {
    return this.firestore
      .doc<UserAction>(`${FIREBASE_COLLECTION.USER_ACTIONS}/${this.docId(userId, actionId)}`)
      .get()
      .pipe(
        map((docSnapshot) => {
          if (!docSnapshot.exists) {
            return null;
          }
          const data = docSnapshot.data() as UserAction;
          data.id = docSnapshot.id;
          return data;
        })
      );
  }

  /**
   * Current consecutive-day streak for one DAILY action, computed from the
   * user_action_completions guard docs (one per calendar day the user
   * actually completed this specific action — exactly the data a streak
   * needs, already being written for dedup purposes). "Alive through
   * yesterday": if today isn't done yet but yesterday was, the streak still
   * counts (mirrors the calendar-day-diff logic recordUserVisit uses for
   * the existing daily-visit streak) — it only resets to 0 once a full day
   * is skipped entirely.
   */
  getActionStreak(userId: string, actionId: string): Observable<number> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.USER_ACTION_COMPLETIONS, (ref) =>
        ref
          .where('userId', '==', userId)
          .where('actionId', '==', actionId)
          .orderBy('calendarDay', 'desc')
          .limit(400)
      )
      .get()
      .pipe(
        map((querySnapshot) => {
          const days = new Set(querySnapshot.docs.map((doc) => (doc.data() as any).calendarDay as string));
          return this.computeStreak(days);
        })
      );
  }

  private computeStreak(days: Set<string>): number {
    const cursor = new Date();
    if (!days.has(toCalendarDay(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (days.has(toCalendarDay(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /**
   * A user's full action history, newest-first, bounded (Section 28:
   * "paginate history where necessary").
   */
  getUserActionHistory(userId: string): Observable<UserAction[]> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.USER_ACTIONS, (ref) =>
        ref
          .where('userId', '==', userId)
          .orderBy('updatedAt', 'desc')
          .limit(UserActionService.MAX_HISTORY_ITEMS)
      )
      .get()
      .pipe(
        map((querySnapshot) =>
          querySnapshot.docs.map((doc) => {
            const data = doc.data() as UserAction;
            data.id = doc.id;
            return data;
          })
        )
      );
  }

  /**
   * Marks an action IN_PROGRESS. Optional per Section 8 — simple actions can
   * call completeAction() directly without starting first.
   *
   * Always writes the full canonical doc shape and lets firestore.rules sort
   * out whether that's a create (no prior doc) or gets rejected (a doc
   * already exists, since createdAt would otherwise change value on every
   * call) — a permission-denied here just means "already started or
   * completed," treated as a harmless no-op, the same way activity_log's
   * writeDedupedEntry() treats a repeat write.
   */
  async startAction(userId: string, action: ActionItem): Promise<void> {
    const ref = this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USER_ACTIONS)
      .doc(this.docId(userId, action.id));
    const now = firebase.firestore.FieldValue.serverTimestamp();

    try {
      await ref.set({
        userId,
        actionId: action.id,
        status: USER_ACTION_STATUS.IN_PROGRESS,
        startedAt: now,
        completedAt: null,
        completionCount: 0,
        lastCompletedAt: null,
        completionMethod: 'SELF_REPORTED',
        elementIdsSnapshot: action.elementIds || [],
        // Preserves whichever catalogue version was actually live when the
        // user started this action, not a hardcoded 1 — actions seeded or
        // never-edited before ActionItem.version existed fall back to 1,
        // Phase 1's implicit untracked baseline.
        actionVersion: action.version || 1,
        createdAt: now,
        updatedAt: now
      });
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        return; // already has a record for this action — no-op
      }
      throw error;
    }
  }

  /**
   * Marks an action COMPLETE, self-reported (Section 9 — V1 has no
   * verification beyond the user's own say-so). Handles both the one-tap
   * "Take Action -> Mark Complete" flow (no prior doc) and completing an
   * already-started action, and for DAILY actions, dedupes repeat
   * completions to at most once per calendar day.
   *
   * Never the only record of completion for analytics purposes — fires an
   * activity_log event afterward, but user_actions here is the product
   * source of truth (Section 17).
   */
  async completeAction(userId: string, action: ActionItem): Promise<void> {
    if (action.repeatType === REPEAT_TYPE.DAILY) {
      const alreadyCompletedToday = !(await this.tryClaimDailyCompletion(userId, action.id));
      if (alreadyCompletedToday) {
        return;
      }
    }

    await this.writeCompletion(userId, action);
    void this.activityService.logActionCompleted(userId, action.id);
  }

  /**
   * Attempts to claim today's completion slot for a DAILY action via a
   * deterministic, append-only guard doc in user_action_completions —
   * mirrors activity_log's daily_visit dedup exactly (writeDedupedEntry()),
   * just in a separate collection so it can stay fully immutable without
   * interfering with user_actions' own update rule.
   * Returns true if this call claimed the slot (i.e. not a duplicate).
   */
  private async tryClaimDailyCompletion(userId: string, actionId: string): Promise<boolean> {
    const calendarDay = toCalendarDay(new Date());
    const docId = `${userId}_${actionId}_${calendarDay}`;
    try {
      await this.firestore.firestore
        .collection(FIREBASE_COLLECTION.USER_ACTION_COMPLETIONS)
        .doc(docId)
        .set({
          userId,
          actionId,
          calendarDay,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      return true;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        return false; // already completed today
      }
      throw error;
    }
  }

  private async writeCompletion(userId: string, action: ActionItem): Promise<void> {
    const ref = this.firestore.firestore
      .collection(FIREBASE_COLLECTION.USER_ACTIONS)
      .doc(this.docId(userId, action.id));
    const now = firebase.firestore.FieldValue.serverTimestamp();

    try {
      // Happy path for a first-ever interaction with this action (one-tap
      // complete, no prior startAction() call).
      await ref.set({
        userId,
        actionId: action.id,
        status: USER_ACTION_STATUS.COMPLETE,
        startedAt: now,
        completedAt: now,
        completionCount: 1,
        lastCompletedAt: now,
        completionMethod: 'SELF_REPORTED',
        elementIdsSnapshot: action.elementIds || [],
        // Same reasoning as startAction() above — preserves the actual
        // catalogue version completed, falling back to 1 for actions never
        // edited since versioning was added.
        actionVersion: action.version || 1,
        createdAt: now,
        updatedAt: now
      });
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        throw error;
      }
      // A doc already exists (started earlier, or completed before) — only
      // the allowed fields may change on an update.
      await ref.set(
        {
          status: USER_ACTION_STATUS.COMPLETE,
          completedAt: now,
          completionCount: firebase.firestore.FieldValue.increment(1),
          lastCompletedAt: now,
          updatedAt: now
        },
        { merge: true }
      );
    }
  }
}
