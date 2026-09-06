import { Injectable } from '@angular/core';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';

/**
 * Thin wrapper around Firebase Analytics (GA4) — the product-analytics half
 * of Foundation Hardening Plan v4 §11. The operational half (function/error
 * failures) already exists in functions/index.js's withErrorLogging; this is
 * the other half: sign-up conversion, returning users, content engagement,
 * completion rates. ScreenTrackingService/UserTrackingService (app.module.ts)
 * already send automatic screen_view/session_start events — these are the
 * product-specific events GA4 has no way to infer on its own.
 *
 * These events measure user actions, not storage outcomes: they fire
 * whenever the corresponding method is called, independent of whether the
 * underlying Firestore write was a fresh write, a dedup no-op, or deferred
 * by the rate limiter. Every call is fire-and-forget and must never throw
 * into a caller — analytics is observability, not a product dependency.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private analytics: AngularFireAnalytics) {}

  private log(eventName: string, params?: { [key: string]: any }): void {
    try {
      this.analytics.logEvent(eventName, params);
    } catch {
      // Analytics must never disrupt the product experience.
    }
  }

  logSignUp(method: string): void {
    this.log('sign_up', { method });
  }

  logLogin(method: string): void {
    this.log('login', { method });
  }

  logContentOpened(contentType: string, contentId: string): void {
    this.log('content_opened', { content_type: contentType, content_id: contentId });
  }

  logContentCompleted(contentType: string, contentId: string): void {
    this.log('content_completed', { content_type: contentType, content_id: contentId });
  }

  logEqCompleted(score: number): void {
    this.log('eq_completed', { score });
  }

  logPollVoted(pollId: string): void {
    this.log('poll_voted', { content_id: pollId });
  }

  logDailyVisit(): void {
    this.log('daily_visit');
  }

  logBookmarkAdded(contentType: string, contentId: string): void {
    this.log('bookmark_added', { content_type: contentType, content_id: contentId });
  }

  logBookmarkRemoved(contentType: string, contentId: string): void {
    this.log('bookmark_removed', { content_type: contentType, content_id: contentId });
  }
}
