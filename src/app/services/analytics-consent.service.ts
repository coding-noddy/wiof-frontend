import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ANALYTICS_CONSENT_KEY, AnalyticsConsent, applyAnalyticsConsent, readAnalyticsConsent } from '../util/analytics-init';
import { PageTrackingService } from './page-tracking.service';

/**
 * The visitor's Google Analytics choice (8.9.0, opt-in for GDPR): asked
 * once in the consent banner, remembered on this device, changeable any
 * time from "Cookie settings" in the footer. Until they accept, nothing is
 * sent to Google (util/analytics-init.ts).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  readonly choice$ = new BehaviorSubject<AnalyticsConsent | null>(readAnalyticsConsent());
  /** Whether the banner is showing: not asked yet, or reopened from "Cookie settings". */
  readonly bannerOpen$ = new BehaviorSubject<boolean>(readAnalyticsConsent() === null);

  constructor(private pageTracking: PageTrackingService) {}

  choose(choice: AnalyticsConsent): void {
    const was = this.choice$.value;
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
    } catch {
      // Storage unavailable (private mode): applies to this visit only.
    }
    applyAnalyticsConsent(choice === 'granted');
    this.choice$.next(choice);
    this.bannerOpen$.next(false);
    // Accepting on a page: count that page too, now that it may be counted.
    if (choice === 'granted' && was !== 'granted') this.pageTracking.resendCurrent();
  }

  reopen(): void {
    this.bannerOpen$.next(true);
  }
}
