import { getApp } from 'firebase/app';
import { initializeAnalytics } from 'firebase/analytics';

/**
 * Starts Google Analytics (GA4) with its automatic page_view turned off.
 * The automatic one fires once, as the app loads, with the placeholder
 * title from index.html; PageTrackingService sends one page_view per
 * navigation instead, with the real title and page group (8.9.0).
 *
 * Must run before AngularFire's compat analytics first touches the SDK
 * (see provideAppInitializer in AppModule): that then reuses this instance.
 * In a browser where analytics can't run, AngularFire skips it anyway.
 */
export function initWiofAnalytics(): void {
  try {
    initializeAnalytics(getApp(), { config: { send_page_view: false } });
  } catch (err) {
    console.warn('Analytics not started:', err);
  }
}
