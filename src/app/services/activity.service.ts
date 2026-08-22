import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';
import { RateLimiterService } from './rate-limiter.service';
import { QualityReadEntry, EqHistoryEntry, PollHistoryEntry } from '../models/engagement-history';

export interface ActivityLogInput {
  userId: string;
  activityType: 'blog_read' | 'blog_read_complete' | 'video_view' | 'poll_vote' | 'eq_completion' | 'widget_usage';
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
  activityType: 'blog_read' | 'blog_read_complete' | 'video_view' | 'poll_vote' | 'eq_completion' | 'widget_usage';
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
  pollsVoted: number;
  lastEqScore: number | null;
  lastEqDate: Date | null;
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

/**
 * Determines whether an activity should be recorded based on deduplication rules.
 * Only blog_read and video_view are deduplicated (max one per userId + contentId, lifetime).
 */
export function shouldRecordActivity(entry: ActivityLogInput, existingEntries: ActivityLogEntry[]): boolean {
  // Only deduplicate blog_read and video_view
  if (entry.activityType !== 'blog_read' && entry.activityType !== 'video_view') {
    return true;
  }

  return !existingEntries.some(
    e => e.contentId === entry.contentId
  );
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  constructor(
    private firestore: AngularFirestore,
    private rateLimiter: RateLimiterService
  ) {}

  /**
   * Logs a user activity with fire-and-forget error handling.
   * Failures are silently swallowed — they never disrupt the user experience.
   * Deduplicates blog_read and video_view: max one per userId + contentId + calendar day.
   */
  async logActivity(entry: ActivityLogInput): Promise<void> {
    try {
      // Deduplication check for blog_read and video_view
      // Lifetime dedup: max one entry per userId + contentId (regardless of day)
      if (entry.activityType === 'blog_read' || entry.activityType === 'video_view') {
        const existingSnapshot = await this.firestore
          .collection(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
            ref
              .where('userId', '==', entry.userId)
              .where('activityType', '==', entry.activityType)
              .where('contentId', '==', entry.contentId)
              .limit(1)
          )
          .get()
          .toPromise();

        if (existingSnapshot && existingSnapshot.docs.length > 0) {
          // Already recorded for this content — skip
          return;
        }
      }

      const calendarDay = toCalendarDay(new Date());
      const logEntry: Omit<ActivityLogEntry, 'id'> = {
        userId: entry.userId,
        activityType: entry.activityType,
        timestamp: new Date(),
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

      await this.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
    } catch (error) {
      console.warn('Activity logging failed:', error);
      // Intentionally swallowed — never disrupts user experience
    }
  }

  /**
   * Logs a blog_read_complete activity with deduplication.
   * Only one entry per userId+contentId is ever written (lifetime dedup).
   * Uses RateLimiterService to throttle writes; on throttle, schedules a retry.
   * On dedup check failure (query error), skips dedup and allows the write.
   */
  async logBlogReadComplete(userId: string, contentId: string, scrollDepth: number, timeSpent: number, blogTitle?: string): Promise<void> {
    try {
      const existingSnapshot = await this.firestore
        .collection(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
          ref
            .where('userId', '==', userId)
            .where('activityType', '==', 'blog_read_complete')
            .where('contentId', '==', contentId)
            .limit(1)
        )
        .get()
        .toPromise();

      if (existingSnapshot && existingSnapshot.docs.length > 0) {
        // Already recorded for this userId+contentId — skip
        return;
      }
    } catch (error) {
      // Dedup check failed — allow the write (worst case: a duplicate entry)
      console.warn('Blog read complete dedup check failed, allowing write:', error);
    }

    const calendarDay = toCalendarDay(new Date());
    const logEntry: Omit<ActivityLogEntry, 'id'> = {
      userId,
      activityType: 'blog_read_complete',
      contentId,
      contentTitle: blogTitle || contentId,
      scrollDepth,
      timeSpent,
      timestamp: new Date(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;

    const writeFn = async (): Promise<void> => {
      await this.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
    };

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
      score: overallScore,
      eqDimensions: {
        attentionScore: dimensions.attentionScore,
        clarityScore: dimensions.clarityScore,
        reparationScore: dimensions.reparationScore
      },
      timestamp: new Date(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;

    const writeFn = async (): Promise<void> => {
      await this.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
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
   * Logs a poll_vote activity for an authenticated user.
   * No deduplication needed at this level — poll UI prevents double-voting.
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
      contentId,
      contentTitle: pollTitle || contentId,
      selectedOption,
      userEmail,
      timestamp: new Date(),
      calendarDay
    };

    const rateLimitKey = `activity_log_${userId}`;

    const writeFn = async (): Promise<void> => {
      await this.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
    };

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
   * Returns all activity log entries for a given user, ordered by timestamp descending.
   */
  getActivitiesForUser(userId: string): Observable<ActivityLogEntry[]> {
    return this.firestore
      .collection<ActivityLogEntry>(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
        ref.where('userId', '==', userId).orderBy('timestamp', 'desc')
      )
      .snapshotChanges()
      .pipe(
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data() as ActivityLogEntry;
            const id = a.payload.doc.id;
            return { ...data, id };
          })
        )
      );
  }

  /**
   * Returns aggregated engagement metrics for a given user.
   * Computes counts from activity_log entries.
   */
  getActivityCounts(userId: string): Observable<EngagementMetrics> {
    return this.getActivitiesForUser(userId).pipe(
      map(entries => this.computeMetrics(entries))
    );
  }

  /**
   * Pure function to compute engagement metrics from a list of activity entries.
   */
  computeMetrics(entries: ActivityLogEntry[]): EngagementMetrics {
    const uniqueBlogs = new Set<string>();
    const uniqueVideos = new Set<string>();
    let pollsVoted = 0;
    let lastEqScore: number | null = null;
    let lastEqDate: Date | null = null;

    for (const entry of entries) {
      switch (entry.activityType) {
        case 'blog_read':
          if (entry.contentId) {
            uniqueBlogs.add(entry.contentId);
          }
          break;
        case 'video_view':
          if (entry.contentId) {
            uniqueVideos.add(entry.contentId);
          }
          break;
        case 'poll_vote':
          pollsVoted++;
          break;
        case 'eq_completion':
          // Entries are ordered by timestamp desc, so the first eq_completion is the most recent
          if (lastEqScore === null && entry.score !== undefined) {
            lastEqScore = entry.score;
            lastEqDate = entry.timestamp?.toDate ? entry.timestamp.toDate() : (entry.timestamp ? new Date(entry.timestamp) : null);
          }
          break;
      }
    }

    return {
      blogsRead: uniqueBlogs.size,
      videosWatched: uniqueVideos.size,
      pollsVoted,
      lastEqScore,
      lastEqDate
    };
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
}
