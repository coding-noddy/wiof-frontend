import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, Functions } from 'firebase/functions';
import { environment } from 'src/environments/environment';

// Cloud Functions are deployed to asia-south1 for the staging project and the
// default us-central1 elsewhere — must match functions/index.js's REGION logic.
const FUNCTIONS_REGION = environment.firebaseConfig.projectId === 'wiof-staging'
  ? 'asia-south1'
  : 'us-central1';

let functionsInstance: Functions | null = null;

/**
 * Returns a singleton Cloud Functions instance pointed at the region this
 * environment's functions are deployed to. Shared by any service that calls
 * a callable Cloud Function (poll/subscriber existence checks, etc.) so the
 * app/region resolution logic lives in one place.
 */
export function getWiofFunctions(): Functions {
  if (!functionsInstance) {
    const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebaseConfig);
    functionsInstance = getFunctions(app, FUNCTIONS_REGION);
  }
  return functionsInstance;
}
