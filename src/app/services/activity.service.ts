import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';
import { RateLimiterService } from './rate-limiter.service';
import { QualityReadEntry, EqHistoryEntry, PollHistoryEntry, VideoWatchHistoryEntry } from '../models/engagement-history';

export interface ActivityLogInput {
  userId: string;
  activityType: 'blog_read' | 'blog_read_complete' | 'video_view' | 'video_watch_complete' | 'poll_vote' | 'eq_completion' | 'widget_usage' | 'daily_visit';
  contentId?: string;
  widgetName?: string;
  score?: number;
  scrollDepth?: number;       // 0-100 percentage for blog_read_complete
  timeSpent?: number;         // seconds for blog_read_complete
  eqDimensions?: {
    attentionScore: number;
    clarityScore: number;
    reparationScore: number;
  };
  selectedOption?: string;    // for poll_vote
  userEmail?: string;         // for poll_vote
}

export interface ActivityLogEntry {
  id?: string;
  userId: string;
  activityType: 'blog_read' | 'blog_read_complete' | 'video_view' | 'video_watch_complete' | 'poll_vote' | 'eq_completion' | 'widget_usage' | 'daily_visit';
  /** Schema version of this entry's shape — see ActivityService.SCHEMA_VERSION.
   *  Lets a future change to the event shape tell old and new entries apart
   *  instead of guessing from which optional fields happen to be present. */
  schemaVersion: number;
  contentId?: string;
  contentTitle?: string;      // human-readable title (poll question, blog title, etc.)
  widgetName?: string;
  score?: number;
  timestamp: any;
  calendarDay: string; // "YYYY-MM-DD"
  scrollDepth?: number;       // 0-100 percentage for blog_read_complete
  timeSpent?: number;         // seconds for blog_read_complete
  eqDimensions?: {
    attentionScore: number;
    clarityScore: number;
    reparationScore: number;
  };
  selectedOption?: string;    // voted option text for poll_vote
  userEmail?: string;         // user's email at vote time for poll_vote
}

export interface EngagementMetrics {
  blogsRead: number;
  videosWatched: number;
  videosCompleted: number;
  pollsVoted: number;
  lastEqScore: number | null;
  lastEqDate: Date | null;
  lastBlogReadDate: Date | null;
}

/**
 * Returns the current calendar day string in "YYYY-MM-DD" format
 * based on the browser's local timezone.
 */
export function toCalendarDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  /** Bound on the My Journey history-list queries (Quality Reads, EQ/Poll/Video
   *  history) — Foundation Hardening Plan v4 §12.1 ("every new query must have
   *  a bounded result size"). The dashboard tallies themselves come from the
   *  materialized user_metrics summary, not these lists, so this only caps
   *  how many past items are shown, not any count. */
  private static readonly MAX_HISTORY_ITEMS = 50;

  /** Current activity_log entry shape version — stamped on every write (see
   *  ActivityLogEntry.schemaVersion). Bump this and update readers when the
   *  event shape changes in a way old entries won't have. Foundation
   *  Hardening Plan v4 §6.2. */
  private static readonly SCHEMA_VERSION = 1;

  constructor(
    private firestore: AngularFirestore,
    private rateLimiter: RateLimiterService
  ) {}

  /**
   * Writes an activity_log entry at a deterministic ID so a duplicate attempt
   * for the same dedup key is rejected atomically by Firestore itself instead
   * of relying on a racy client-side read-then-write: activity_log's rules
   * allow `create` but deny all `update`, so writing to an ID that already
   * exists is evaluated as an unauthorized update and rejected — caught here
   * and treated as "already recorded," not a failure. This closes the race
   * window a concurrent double-write (double-click, duplicate tab) could hit
   * under the old query-before-write pattern. See Foundation Hardening Plan
   * v4 §7.
   */
  private async writeDedupedEntry(docId: string, logEntry: Omit<ActivityLogEntry, 'id'>): Promise<void> {
    try {
      await this.firestore.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).doc(docId).set(logEntry);
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        return; // already recorded for this dedup key
      }
      throw error;
    }
  }

  /**
   * Logs a user activity with fire-and-forget error handling.
   * Failures are silently swallowed — they never disrupt the user experience.
   * Deduplicates blog_read and video_view: max one per userId + contentId, lifetime.
   */
  async logActivity(entry: ActivityLogInput): Promise<void> {
    try {
      const calendarDay = toCalendarDay(new Date());
      const logEntry: Omit<ActivityLogEntry, 'id'> = {
        userId: entry.userId,
        activityType: entry.activityType,
        schemaVersion: ActivityService.SCHEMA_VERSION,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        calendarDay
      };

      if (entry.contentId !== undefined) {
        (logEntry as any).contentId = entry.contentId;
      }
      if (entry.widgetName !== undefined) {
        (logEntry as any).widgetName = entry.widgetName;
      }
      if (entry.score !== undefined) {
        (logEntry as any).score = entry.score;
      }
      if (entry.scrollDepth !== undefined) {
        (logEntry as any).scrollDepth = entry.scrollDepth;
      }
      if (entry.timeSpent !== undefined) {
        (logEntry as any).timeSpent = entry.timeSpent;
      }
      if (entry.eqDimensions !== undefined) {
        (logEntry as any).eqDimensions = entry.eqDimensions;
      }
      if (entry.selectedOption !== undefined) {
        (logEntry as any).selectedOption = entry.selectedOption;
      }
      if (entry.userEmail !== undefined) {
        (logEntry as any).userEmail = entry.userEmail;
      }

      const isDeduped = entry.activityType === 'blog_read' || entry.activityType === 'video_view';
      if (isDeduped) {
        const docId = `${entry.userId}_${entry.activityType}_${entry.contentId}`;
        await this.writeDedupedEntry(docId, logEntry);
      } else {
        await this.firestore.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
      }
    } catch (error) {
      console.warn('Activity logging failed:', error);
      // Intentionally swallowed — never disrupts user experience
    }
  }

  /**
   * Logs a daily_visit entry for the given user.
   * Deduplicates by userId + activityType + calendarDay — at most one entry per user per day.
   * Failures are silently swallowed — they never disrupt the user experience.
   */
  async logDailyVisit(userId: string): Promise<void> {
    try {
      const calendarDay = toCalendarDay(new Date());
      const logEntry: Omit<ActivityLogEntry, 'id'> = {
        userId,
        activityType: 'daily_visit',
        schemaVersion: ActivityService.SCHEMA_VERSION,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        calendarDay
      };

      await this.writeDedupedEntry(`${userId}_daily_visit_${calendarDay}`, logEntry);
    } catch (error) {
      console.warn('Daily visit logging failed:', error);
    }
  }

  /**
   * Logs a blog_read_complete activity with deduplication.
   * Only one entry per userId+contentId is ever written (lifetime dedup,
   * enforced atomically at the deterministic doc ID — see writeDedupedEntry).
   * Uses RateLimiterService to throttle writes; on throttle, schedules a retry.
   */
  async logBlogReadComplete(userId: string, contentId: string, scrollDepth: number, timeSpent: number, blogTitle?: string): Promise<void> {
    const calendarDay = toCalendarDay(new Date());
    const logEntry: Omit<ActivityLogEntry, 'id'> = {
      userId,
      activityType: 'blog_read_complete',
      schemaVersion: ActivityService.SCHEMA_VERSION,
      contentId,
      contentTitle: blogTitle || contentId,
      scrollDepth,
      timeSpent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;
    const docId = `${userId}_blog_read_complete_${contentId}`;
    const writeFn = () => this.writeDedupedEntry(docId, logEntry);

    if (this.rateLimiter.canWrite(rateLimitKey)) {
      try {
        await writeFn();
      } catch (error) {
        console.warn('Blog read complete logging failed:', error);
      }
    } else {
      this.rateLimiter.scheduleRetry(rateLimitKey, writeFn);
    }
  }

  /**
   * Logs a video_watch_complete activity with deduplication.
   * Only one entry per userId+contentId is ever written (lifetime dedup,
   * enforced atomically at the deterministic doc ID — see writeDedupedEntry).
   * Uses RateLimiterService to throttle writes; on throttle, schedules a retry.
   */
  async logVideoWatchComplete(userId: string, contentId: string, watchPercent: number, videoTitle?: string): Promise<void> {
    const calendarDay = toCalendarDay(new Date());
    const logEntry: Omit<ActivityLogEntry, 'id'> = {
      userId,
      activityType: 'video_watch_complete',
      schemaVersion: ActivityService.SCHEMA_VERSION,
      contentId,
      contentTitle: videoTitle || contentId,
      scrollDepth: Math.floor(watchPercent), // reuse scrollDepth field for watch percentage
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;
    const docId = `${userId}_video_watch_complete_${contentId}`;
    const writeFn = () => this.writeDedupedEntry(docId, logEntry);

    if (this.rateLimiter.canWrite(rateLimitKey)) {
      try {
        await writeFn();
      } catch (error) {
        console.warn('Video watch complete logging failed:', error);
      }
    } else {
      this.rateLimiter.scheduleRetry(rateLimitKey, writeFn);
    }
  }

  /**
   * Logs an EQ assessment completion with dimension breakdowns.
   * Each completion creates a new entry — no deduplication (multiple completions allowed).
   * Uses RateLimiterService to throttle writes; on throttle, schedules a retry.
   */
  async logEqCompletion(
    userId: string,
    overallScore: number,
    dimensions: { attentionScore: number; clarityScore: number; reparationScore: number }
  ): Promise<void> {
    const calendarDay = toCalendarDay(new Date());
    const logEntry: Omit<ActivityLogEntry, 'id'> = {
      userId,
      activityType: 'eq_completion',
      schemaVersion: ActivityService.SCHEMA_VERSION,
      score: overallScore,
      eqDimensions: {
        attentionScore: dimensions.attentionScore,
        clarityScore: dimensions.clarityScore,
        reparationScore: dimensions.reparationScore
      },
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;

    const writeFn = async (): Promise<void> => {
      await this.firestore.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
    };

    if (this.rateLimiter.canWrite(rateLimitKey)) {
      try {
        await writeFn();
      } catch (error) {
        console.warn('EQ completion logging failed:', error);
      }
    } else {
      this.rateLimiter.scheduleRetry(rateLimitKey, writeFn);
    }
  }

  /**
   * Logs a poll_vote activity for an authenticated user. Deduplicated at the
   * deterministic doc ID (max one per userId+contentId, lifetime) — the poll
   * UI's own hasUserVoted check already tries to prevent double-voting, but
   * that check is itself query-based and racy, so this is the actual
   * backstop against a double-click producing two poll_vote entries.
   * Uses RateLimiterService to throttle writes; on throttle, schedules a retry.
   */
  async logPollVote(
    userId: string,
    contentId: string,
    selectedOption: string,
    userEmail: string,
    pollTitle?: string
  ): Promise<void> {
    const calendarDay = toCalendarDay(new Date());
    const logEntry: Omit<ActivityLogEntry, 'id'> = {
      userId,
      activityType: 'poll_vote',
      schemaVersion: ActivityService.SCHEMA_VERSION,
      contentId,
      contentTitle: pollTitle || contentId,
      selectedOption,
      userEmail,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;
    const docId = `${userId}_poll_vote_${contentId}`;
    const writeFn = () => this.writeDedupedEntry(docId, logEntry);

    if (this.rateLimiter.canWrite(rateLimitKey)) {
      try {
        await writeFn();
      } catch (error) {
        console.warn('Poll vote logging failed:', error);
      }
    } else {
      this.rateLimiter.scheduleRetry(rateLimitKey, writeFn);
    }
  }

  /**
   * Checks if a user has already voted on a specific poll.
   * Queries activity_log for a 'poll_vote' entry with matching userId + contentId.
   * Returns the voted status and the selected option if found.
   */
  async hasUserVoted(userId: string, contentId: string): Promise<{ voted: boolean; selectedOption?: string }> {
    try {
      const snapshot = await this.firestore
        .collection(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
          ref
            .where('userId', '==', userId)
            .where('activityType', '==', 'poll_vote')
            .where('contentId', '==', contentId)
            .limit(1)
        )
        .get()
        .toPromise();

      if (snapshot && snapshot.docs.length > 0) {
        const data = snapshot.docs[0].data() as ActivityLogEntry;
        return { voted: true, selectedOption: data.selectedOption };
      }

      return { voted: false };
    } catch (error) {
      console.warn('hasUserVoted check failed:', error);
      return { voted: false };
    }
  }

  /**
   * Returns aggregated engagement metrics for a given user, read from the
   * materialized `user_metrics/{uid}` summary (see onActivityLogCreated /
   * backfillUserMetrics in functions/index.js) instead of scanning the
   * user's entire activity_log on every dashboard load — Foundation
   * Hardening Plan v4 §8/§12.1. Defaults to all-zero/null for a user with no
   * recorded activity yet (the doc won't exist until their first event).
   */
  getActivityCounts(userId: string): Observable<EngagementMetrics> {
    return this.firestore
      .collection(FIREBASE_COLLECTION.USER_METRICS)
      .doc<any>(userId)
      .valueChanges()
      .pipe(
        map(doc => ({
          blogsRead: doc?.blogsRead || 0,
          videosWatched: doc?.videosWatched || 0,
          videosCompleted: doc?.videosCompleted || 0,
          pollsVoted: doc?.pollsVoted || 0,
          lastEqScore: doc?.lastEqScore ?? null,
          lastEqDate: doc?.lastEqDate?.toDate ? doc.lastEqDate.toDate() : null,
          lastBlogReadDate: doc?.lastBlogReadDate?.toDate ? doc.lastBlogReadDate.toDate() : null
        } as EngagementMetrics))
      );
  }

  /**
   * Returns all blog_read_complete entries for a user, ordered by timestamp desc.
   * Resolves blog titles from the Blogs collection where possible.
   */
  getQualityReads(userId: string): Observable<QualityReadEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref
          .where('userId', '==', userId)
          .where('activityType', '==', 'blog_read_complete')
          .orderBy('timestamp', 'desc')
          .limit(ActivityService.MAX_HISTORY_ITEMS)
      )
      .get()
      .pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data() as ActivityLogEntry;
            const timestamp = data.timestamp;
            const completedDate = timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : new Date());
            return {
              contentId: data.contentId || '',
              blogTitle: data.contentTitle || data.contentId || 'Untitled Blog',
              completedDate,
              scrollDepth: data.scrollDepth || 0,
              timeSpent: data.timeSpent || 0
            } as QualityReadEntry;
          });
        })
      );
  }

  /**
   * Returns all eq_completion entries for a user, ordered by timestamp desc.
   */
  getEqHistory(userId: string): Observable<EqHistoryEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref
          .where('userId', '==', userId)
          .where('activityType', '==', 'eq_completion')
          .orderBy('timestamp', 'desc')
          .limit(ActivityService.MAX_HISTORY_ITEMS)
      )
      .get()
      .pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data() as ActivityLogEntry;
            const timestamp = data.timestamp;
            const date = timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : new Date());
            return {
              date,
              overallScore: data.score || 0,
              attentionScore: data.eqDimensions?.attentionScore || 0,
              clarityScore: data.eqDimensions?.clarityScore || 0,
              reparationScore: data.eqDimensions?.reparationScore || 0
            } as EqHistoryEntry;
          });
        })
      );
  }

  /**
   * Returns all poll_vote entries for a user, ordered by timestamp desc.
   */
  getPollHistory(userId: string): Observable<PollHistoryEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref
          .where('userId', '==', userId)
          .where('activityType', '==', 'poll_vote')
          .orderBy('timestamp', 'desc')
          .limit(ActivityService.MAX_HISTORY_ITEMS)
      )
      .get()
      .pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data() as ActivityLogEntry;
            const timestamp = data.timestamp;
            const voteDate = timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : new Date());
            return {
              contentId: data.contentId || '',
              pollTitle: data.contentTitle || data.contentId || 'Poll',
              selectedOption: data.selectedOption || '',
              voteDate
            } as PollHistoryEntry;
          });
        })
      );
  }

  /**
   * Returns all video_watch_complete entries for a user, ordered by timestamp desc.
   * Maps Firestore documents to VideoWatchHistoryEntry instances.
   */
  getVideoWatchHistory(userId: string): Observable<VideoWatchHistoryEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref
          .where('userId', '==', userId)
          .where('activityType', '==', 'video_watch_complete')
          .orderBy('timestamp', 'desc')
          .limit(ActivityService.MAX_HISTORY_ITEMS)
      )
      .get()
      .pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data() as ActivityLogEntry;
            return this.mapToVideoWatchEntry(data);
          });
        })
      );
  }

  /**
   * Pure mapping function: converts an ActivityLogEntry to a VideoWatchHistoryEntry.
   * - videoTitle defaults to contentId when contentTitle is absent, then to 'Untitled Video'
   * - watchPercent defaults to 0 when scrollDepth is absent
   * - completedDate is converted from Firestore Timestamp to JS Date
   */
  mapToVideoWatchEntry(data: ActivityLogEntry): VideoWatchHistoryEntry {
    const timestamp = data.timestamp;
    const completedDate = timestamp?.toDate
      ? timestamp.toDate()
      : (timestamp ? new Date(timestamp) : new Date());

    return {
      contentId: data.contentId || '',
      videoTitle: data.contentTitle || data.contentId || 'Untitled Video',
      watchPercent: data.scrollDepth || 0,
      completedDate
    };
  }
}
