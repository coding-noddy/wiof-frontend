import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { FIREBASE_COLLECTION } from '../app.constants';

export interface ActivityLogInput {
  userId: string;
  activityType: 'blog_read' | 'video_view' | 'poll_vote' | 'eq_completion' | 'widget_usage';
  contentId?: string;
  widgetName?: string;
  score?: number;
}

export interface ActivityLogEntry {
  id?: string;
  userId: string;
  activityType: 'blog_read' | 'video_view' | 'poll_vote' | 'eq_completion' | 'widget_usage';
  contentId?: string;
  widgetName?: string;
  score?: number;
  timestamp: any;
  calendarDay: string; // "YYYY-MM-DD"
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
 * Only blog_read and video_view are deduplicated (max one per userId + contentId + calendar day).
 */
export function shouldRecordActivity(entry: ActivityLogInput, existingEntries: ActivityLogEntry[]): boolean {
  // Only deduplicate blog_read and video_view
  if (entry.activityType !== 'blog_read' && entry.activityType !== 'video_view') {
    return true;
  }

  const today = toCalendarDay(new Date());
  return !existingEntries.some(
    e => e.contentId === entry.contentId && e.calendarDay === today
  );
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  constructor(private firestore: AngularFirestore) {}

  /**
   * Logs a user activity with fire-and-forget error handling.
   * Failures are silently swallowed — they never disrupt the user experience.
   * Deduplicates blog_read and video_view: max one per userId + contentId + calendar day.
   */
  async logActivity(entry: ActivityLogInput): Promise<void> {
    try {
      // Deduplication check for blog_read and video_view
      if (entry.activityType === 'blog_read' || entry.activityType === 'video_view') {
        const today = toCalendarDay(new Date());

        const existingSnapshot = await this.firestore
          .collection(FIREBASE_COLLECTION.ACTIVITY_LOG, ref =>
            ref
              .where('userId', '==', entry.userId)
              .where('activityType', '==', entry.activityType)
              .where('contentId', '==', entry.contentId)
              .where('calendarDay', '==', today)
              .limit(1)
          )
          .get()
          .toPromise();

        if (existingSnapshot && existingSnapshot.docs.length > 0) {
          // Already recorded today — skip
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

      await this.firestore.collection(FIREBASE_COLLECTION.ACTIVITY_LOG).add(logEntry);
    } catch (error) {
      console.warn('Activity logging failed:', error);
      // Intentionally swallowed — never disrupts user experience
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
  private computeMetrics(entries: ActivityLogEntry[]): EngagementMetrics {
    let blogsRead = 0;
    let videosWatched = 0;
    let pollsVoted = 0;
    let lastEqScore: number | null = null;
    let lastEqDate: Date | null = null;

    for (const entry of entries) {
      switch (entry.activityType) {
        case 'blog_read':
          blogsRead++;
          break;
        case 'video_view':
          videosWatched++;
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
      blogsRead,
      videosWatched,
      pollsVoted,
      lastEqScore,
      lastEqDate
    };
  }
}
