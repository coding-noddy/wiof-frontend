import { Injectable } from '@angular/core';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';

/**
 * Thin wrapper around Firebase Analytics (GA4) — the product-analytics half
 * of Foundation Hardening Plan v4 §11. The operational half (function/error
 * failures) already exists in functions/index.js's withErrorLogging; this is
 * the other half: sign-up conversion, returning users, content engagement,
 * completion rates. PageTrackingService sends one page_view per navigation
 * (with its title, page group and element) and UserTrackingService sets the
 * GA user ID; these are the product-specific events GA4 has no way to infer
 * on its own.
 *
 * These events measure user actions, not storage outcomes: they fire
 * whenever the corresponding method is called, independent of whether the
 * underlying Firestore write was a fresh write, a dedup no-op, or deferred
 * by the rate limiter. Every call is fire-and-forget and must never throw
 * into a caller — analytics is observability, not a product dependency.
 */
export interface PageViewParams {
  page_title: string;
  page_location: string;
  page_path: string;
  /** PageInfo's group: home, element, story, video, take_action… */
  content_group: string;
  element?: string;
  page_referrer?: string;
}

/** Where a suggestion was shown (also the suggestion_click event's via). */
export type SuggestionVia = 'explore_next' | 'story_behind' | 'today' | 'next_for_you';

export interface SuggestionClick {
  via: SuggestionVia;
  contentType: 'blog' | 'video' | 'action';
  /** The ID a later read, watch or completion records (a story's slug or ID, a video's YouTube ID, an action's ID). */
  contentId: string;
  /** 1-based place in the list it was shown in. */
  position: number;
  /** Why it was suggested (linked, similar, element, or Next for you's rule). */
  reason?: string;
}

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

  /** One per navigation, from PageTrackingService. */
  logPageView(params: PageViewParams): void {
    this.log('page_view', params);
  }

  /**
   * A click on a suggestion (GA4's recommended select_content event), with
   * where it was shown: Explore next, Today on WIOF, Next for you…
   */
  logSuggestionClick(click: SuggestionClick): void {
    this.log('select_content', {
      content_type: click.contentType,
      content_id: click.contentId,
      via: click.via,
      position: click.position,
      reason: click.reason
    });
  }

  /** guest, member or admin, so reports can leave out the team's own visits. */
  setUserType(userType: 'guest' | 'member' | 'admin'): void {
    try {
      this.analytics.setUserProperties({ user_type: userType });
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

  /** "Share my impact" (8.17.0): which period, and whether the share sheet or a download was used. */
  logImpactShared(period: 'month' | 'total', method: 'share' | 'download'): void {
    this.log('impact_shared', { period, method });
  }
}
