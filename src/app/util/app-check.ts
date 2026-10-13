import { getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { environment } from 'src/environments/environment';

/**
 * localStorage key for an App Check debug token (registered under App Check →
 * Manage debug tokens). Lets automated tests and local development get valid
 * tokens without reCAPTCHA; an unregistered value just fails App Check.
 */
const DEBUG_TOKEN_KEY = 'wiof_appcheck_debug_token';

/**
 * Turns on Firebase App Check (reCAPTCHA Enterprise, invisible to visitors),
 * so Firestore, Storage and the callable functions can tell requests from
 * this site apart from scripts calling the APIs directly. Must run before the
 * first Firebase request (see the APP_INITIALIZER in AppModule).
 *
 * Does nothing until the environment has an appCheckSiteKey. Enforcement is
 * switched on separately: in the App Check console for Firestore/Storage and
 * with ENFORCE_APP_CHECK for the functions.
 */
export function initWiofAppCheck(): void {
  const siteKey = environment.appCheckSiteKey;
  if (!siteKey) {
    return;
  }
  try {
    const debugToken = localStorage.getItem(DEBUG_TOKEN_KEY);
    if (debugToken || location.hostname === 'localhost') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
    }
  } catch {
    // localStorage unavailable: no debug token
  }
  initializeAppCheck(getApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true
  });
}
