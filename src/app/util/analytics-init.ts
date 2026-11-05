import { getApp } from 'firebase/app';
import { Analytics, initializeAnalytics, setAnalyticsCollectionEnabled, setConsent } from 'firebase/analytics';

/** localStorage key: the visitor's analytics choice, 'granted' or 'denied' (absent: not asked yet). */
export const ANALYTICS_CONSENT_KEY = 'wiof_analytics_consent';

export type AnalyticsConsent = 'granted' | 'denied';

let instance: Analytics | null = null;

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Starts Google Analytics (GA4), opt-in (8.9.0, GDPR): until the visitor
 * accepts, collection is switched off, so nothing at all is sent to Google
 * ("basic" consent mode), and Google's consent signals say denied. WIOF
 * shows no ads, so the ad signals are always denied.
 *
 * The automatic page_view is off too: it fires once, as the app loads, with
 * the placeholder title from index.html; PageTrackingService sends one per
 * navigation instead, with the real title and page group.
 *
 * Must run before AngularFire's compat analytics first touches the SDK
 * (see provideAppInitializer in AppModule): that then reuses this instance.
 */
export function initWiofAnalytics(): void {
  const granted = readAnalyticsConsent() === 'granted';
  try {
    setConsent(consentSettings(granted));
    instance = initializeAnalytics(getApp(), { config: { send_page_view: false } });
    // Before gtag.js has loaded, so not even the first request goes out without consent.
    setAnalyticsCollectionEnabled(instance, granted);
  } catch (err) {
    console.warn('Analytics not started:', err);
  }
}

/** The visitor chose: switch collection and Google's consent signals to match. */
export function applyAnalyticsConsent(granted: boolean): void {
  try {
    setConsent(consentSettings(granted));
    if (instance) setAnalyticsCollectionEnabled(instance, granted);
  } catch (err) {
    console.warn('Analytics consent not applied:', err);
  }
}

function consentSettings(granted: boolean) {
  return {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
  } as const;
}
