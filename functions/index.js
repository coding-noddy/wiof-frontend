/**
 * WIOF Cloud Functions
 * ====================
 * Serves dynamic Open Graph meta tags for social media crawlers.
 * When WhatsApp/Twitter/Facebook/LinkedIn crawl a blog URL, they get
 * the blog's actual title, description, and hero image instead of
 * the default WIOF meta tags.
 */

// firebase-functions v5+ points the default export at the v2 API, which
// doesn't have .region().https.onCall/.firestore.document() — every trigger
// in this file uses that v1-style API, so import it explicitly to keep them
// working after the upgrade (see functions/package.json).
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { BLOG_SUMMARIES, buildBlogSummary } = require('./blog-summary');
const { EQ_DAILY_LIMIT, VALIDATOR_VERSION, eqCalendarDay, eqSlotIds, scoreEqResponses, validateActivityEvent } = require('./activity-validation');
const { elementOfBlog, makeContentLookups, recomputeUserMetrics } = require('./user-metrics');
const { rebuildRelatedContent } = require('./related-content');

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// List of known social media / search crawler user agents
const CRAWLER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'Googlebot',
  'bingbot',
  'Applebot'
];

/**
 * Check if request is from a social media crawler
 */
function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_AGENTS.some(agent => userAgent.includes(agent));
}

// Default share image for this project's own hosting site — never another
// project's (production must not point crawlers at the staging site).
const FALLBACK_IMAGE_URL = `https://${process.env.GCLOUD_PROJECT || 'wiof-production'}.web.app/assets/banners/home_banner.jpg`;

/**
 * Get the download URL for a blog image from Firebase Storage
 * Uses the public download URL format (requires Storage rules to allow public read)
 */
async function getImageUrl(imageName) {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(`blog-images/${imageName}`);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return FALLBACK_IMAGE_URL;
    }

    // Use the public Firebase Storage URL format (no signed URL needed)
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(`blog-images/${imageName}`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  } catch (e) {
    console.error('Image URL error:', e.message);
    return FALLBACK_IMAGE_URL;
  }
}

/**
 * Look up blog by slug or ID
 */
async function getBlog(blogParam) {
  // Try slug first
  const slugQuery = await db.collection('Blogs')
    .where('slug', '==', blogParam)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return slugQuery.docs[0].data();
  }

  // Fallback: try as document ID
  const docRef = await db.collection('Blogs').doc(blogParam).get();
  if (docRef.exists) {
    return docRef.data();
  }

  return null;
}

const { metaHtml, conversationMeta } = require('./social-meta');

/** A story's preview (escaped: see social-meta.js). */
function generateMetaHtml(blog, imageUrl, originalUrl) {
  return metaHtml({ title: blog.title, description: blog.shortDescription, author: blog.author, imageUrl, url: originalUrl });
}

/**
 * Main Cloud Function — handles blog URL requests from crawlers
 * 
 * Region strategy:
 * firebase-tools sets GCLOUD_PROJECT to the active project id at deploy time,
 * so we pick the region per-project: asia-south1 for staging (matches its
 * Firestore location), us-central1 (default) for production.
 */
const REGION = process.env.GCLOUD_PROJECT === 'wiof-staging' ? 'asia-south1' : 'us-central1';

// socialMetaTags is the exception: firebase.json's Hosting rewrite is shared
// by both projects and names a single function region, so this one function
// lives in the same region everywhere. Keep in sync with firebase.json.
const SOCIAL_META_TAGS_REGION = 'us-central1';

// App Check on every callable. Off until ENFORCE_APP_CHECK=true is set for the
// project (functions/.env.<projectId>): turn it on only after the App Check
// console shows real traffic arriving with valid tokens, or every visitor
// whose browser can't get a token (old cached page, blocked reCAPTCHA) loses
// polls, sign-up and sign-in sync.
const APP_CHECK = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' };

/**
 * Structured error logging for Cloud Functions — Foundation Hardening Plan
 * v4 §11 ("operational analytics": function failures, failed writes, auth
 * errors). Firebase already ships uncaught exceptions to Cloud Logging, but
 * a consistent JSON shape makes them actually findable there: Cloud Console
 * → Logging → filter `jsonPayload.fn="<functionName>"`, or `severity>=ERROR`
 * scoped to this project, to see every failure across every function in one
 * place instead of hunting through unstructured stack traces one at a time.
 */
function logFunctionError(functionName, uid, error) {
  // Defaults to enabled — only an explicit "false" in functions/.env turns
  // it off, so a missing/misconfigured .env doesn't silently go dark.
  if (process.env.LOGGING_ENABLED === 'false') {
    return;
  }
  console.error(JSON.stringify({
    fn: functionName,
    uid: uid || null,
    message: error && error.message,
    stack: error && error.stack
  }));
}

/**
 * Wraps a callable handler with the structured logging above. An
 * HttpsError the handler throws on purpose (unauthenticated,
 * permission-denied, etc.) passes straight through unchanged — those are
 * expected outcomes, not operational failures. Anything else is an
 * unexpected failure: logged once here with full detail, then replaced
 * with a generic client-facing message so internals never leak out.
 */
function withErrorLogging(functionName, handler) {
  return async (data, context) => {
    try {
      return await handler(data, context);
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      logFunctionError(functionName, context && context.auth && context.auth.uid, error);
      throw new functions.https.HttpsError('internal', 'Something went wrong. Please try again.');
    }
  };
}

/**
 * Same idea for Firestore trigger handlers, which can't report failure to
 * any caller — logs with the same structured shape, then swallows (a
 * trigger returning a rejected promise just gets silently retried/dropped
 * by the platform with a much less useful log entry otherwise).
 */
function withTriggerErrorLogging(functionName, handler) {
  return async (snap, context) => {
    try {
      return await handler(snap, context);
    } catch (error) {
      logFunctionError(functionName, null, error);
      return null;
    }
  };
}

/**
 * User profile system-managed fields
 * ===================================
 * loginCount, lastLogin, daysVisited, currentStreak, longestStreak and
 * savedBlogsCount are engagement counters, not user preferences — a client
 * that could set them directly could forge its own streak/login history.
 * These four functions are the only path that may write them; firestore.rules
 * denies `create` on `users/{uid}` entirely and excludes these fields from
 * the allowed `update` key set, so the Admin SDK writes below (which bypass
 * rules) are the only way any of these fields change.
 */

/** Mirrors user-profile.service.ts's toCalendarDay() — kept in sync manually since this runs in a separate Node runtime. */
function toCalendarDay(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

/** Mirrors user-profile.service.ts's diffCalendarDays(). */
function diffCalendarDays(today, lastDay) {
  const todayDate = new Date(today + 'T00:00:00Z');
  const lastDate = new Date(lastDay + 'T00:00:00Z');
  return Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Creates the caller's own `users/{uid}` profile document from their verified
 * ID token claims (not client-supplied data) if it doesn't already exist.
 * Idempotent: a second call for an existing profile is a safe no-op.
 */
exports.createUserProfile = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('createUserProfile', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const uid = context.auth.uid;
    const token = context.auth.token || {};
    const userRef = db.collection('users').doc(uid);

    const existing = await userRef.get();
    if (existing.exists) {
      return { created: false };
    }

    await userRef.set({
      uid,
      displayName: String(token.name || '').substring(0, 100),
      email: token.email || '',
      photoURL: token.picture || '',
      role: 'public',
      joinedDate: admin.firestore.FieldValue.serverTimestamp(),
      preferredElements: [],
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      loginCount: 1,
      daysVisited: 1,
      currentStreak: 1,
      longestStreak: 1,
      savedBlogsCount: 0
    });

    return { created: true };
  }));

/**
 * Increments loginCount and refreshes lastLogin for a returning user signing
 * in. No-ops (throws not-found) if the profile doesn't exist yet — callers
 * are expected to have already confirmed it does via createUserProfile.
 */
exports.recordLoginMetrics = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('recordLoginMetrics', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    await db.collection('users').doc(context.auth.uid).update({
      loginCount: admin.firestore.FieldValue.increment(1),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true };
  }));

/**
 * Records a visit with the same streak semantics user-profile.service.ts's
 * recordVisit() used to apply client-side: same calendar day -> lastLogin
 * only; consecutive day -> extend streak; gap -> reset to 1. Calendar-day
 * boundaries use the caller-supplied IANA timezone (their browser's local
 * zone) since the server has no other way to know it — a caller nudging
 * this by a few hours can only shift which day a visit counts toward, not
 * forge arbitrary counter values, which is the actual property being
 * protected here.
 */
exports.recordUserVisit = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('recordUserVisit', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const timezone = (data && data.timezone) ? String(data.timezone) : 'UTC';
    const userRef = db.collection('users').doc(context.auth.uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        return;
      }

      const profile = snap.data();
      const now = new Date();
      const lastLoginDate = profile.lastLogin && profile.lastLogin.toDate
        ? profile.lastLogin.toDate()
        : new Date(profile.lastLogin || 0);

      const today = toCalendarDay(now, timezone);
      const lastDay = toCalendarDay(lastLoginDate, timezone);

      const update = { lastLogin: admin.firestore.FieldValue.serverTimestamp() };

      if (today !== lastDay) {
        const daysDiff = diffCalendarDays(today, lastDay);
        // Computed as a plain number (not FieldValue.increment) because
        // longestStreak needs the actual resulting value to compare against —
        // safe here since we already hold `profile` from this same transaction's
        // read, so there's no lost-update race to guard against.
        const newStreak = daysDiff === 1 ? (profile.currentStreak || 0) + 1 : 1;
        update.daysVisited = admin.firestore.FieldValue.increment(1);
        update.currentStreak = newStreak;
        update.longestStreak = Math.max(profile.longestStreak || 0, newStreak);
      }

      tx.update(userRef, update);
    });

    return { ok: true };
  }));

/**
 * Deletes every document matching `collection.where('userId','==',uid)` in
 * batches of 400, looping until none remain. Safe to call on an already-empty
 * result set (returns 0) — this is what makes the caller idempotent: a retry
 * after a partial failure just deletes whatever's left.
 */
async function deleteAllOwnedBy(collectionName, uid) {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await db.collection(collectionName)
      .where('userId', '==', uid)
      .limit(400)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snapshot.size;
    hasMore = snapshot.size === 400;
  }

  return totalDeleted;
}

/**
 * Deletes a user's activity_log events except action_completed (Take Action
 * progress survives a reset). Reads the user's events once and deletes in
 * batches of 400; safe to retry, like deleteAllOwnedBy.
 */
async function deleteActivityExceptActions(uid) {
  const snapshot = await db.collection('activity_log').where('userId', '==', uid).get();
  const toDelete = snapshot.docs.filter((doc) => doc.get('activityType') !== 'action_completed');
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = db.batch();
    toDelete.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  return toDelete.length;
}

/**
 * "Clear My Engagement Data" — the trusted, idempotent version of what used
 * to be three separate sequential client-side calls (delete activity_log,
 * delete user_saved_content, reset users/{uid} counters), each independently
 * interruptible by a network failure or a closed tab, after which the UI
 * could claim "nothing was changed" when that wasn't always true.
 *
 * This still isn't a single Firestore transaction (deleting a large
 * activity_log history can exceed the 500-write transaction/batch limit,
 * a Firestore constraint no server-side design escapes), but it runs to
 * completion server-side once invoked — not interruptible by the client
 * going away — and is safe to retry: deleting an already-empty result set
 * and re-zeroing already-zero counters are both no-ops, so calling this
 * twice converges to the same clean state.
 *
 * Also zeroes the reading/watching/poll/EQ fields of user_metrics/{uid}
 * directly: onActivityLogCreated only fires on document *create*, never on
 * delete, so without this the dashboard summary would keep showing
 * pre-reset counts after the raw activity_log entries behind them are gone.
 *
 * Take Action progress is kept (docs/METRICS.md "Resets"): user_actions, its
 * action_completed events and the action counters are not touched, so the
 * counters always agree with the action cards and a recompute can't undo
 * the reset.
 */
exports.resetEngagementData = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120, ...APP_CHECK })
  .https.onCall(withErrorLogging('resetEngagementData', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const uid = context.auth.uid;

    const deletedActivityCount = await deleteActivityExceptActions(uid);
    const deletedSavedContentCount = await deleteAllOwnedBy('user_saved_content', uid);

    await db.collection('users').doc(uid).update({
      loginCount: 0,
      daysVisited: 0,
      currentStreak: 0,
      longestStreak: 0,
      savedBlogsCount: 0,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    // merge: keeps the Take Action counters (see above).
    await db.collection('user_metrics').doc(uid).set({
      blogsRead: 0,
      qualityReads: 0,
      videosWatched: 0,
      videosCompleted: 0,
      pollsVoted: 0,
      lastEqScore: null,
      lastEqDate: null,
      lastBlogReadDate: null,
      // delete(), not {}: a merge set would keep the old per-element keys.
      qualityReadsByElement: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { ok: true, deletedActivityCount, deletedSavedContentCount };
  }));

/**
 * One-time admin-triggered migration: moves existing `user_saved_content`
 * documents from their old random auto-generated IDs onto the new
 * deterministic `{userId}_{contentId}` scheme (see SavedContentService.docId
 * in saved-content.service.ts). Safe to run more than once — a doc already
 * on the new ID, or with no userId/contentId, is left alone. Admin-gated via
 * the `admins` collection, checked here with the Admin SDK (which bypasses
 * firestore.rules — this collection has no admin-read rule at all, so this
 * function is the only way to enumerate every user's saved content).
 */
exports.migrateSavedContentIds = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120, ...APP_CHECK })
  .https.onCall(withErrorLogging('migrateSavedContentIds', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
    }

    const snapshot = await db.collection('user_saved_content').get();
    let migrated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = data.userId;
      const contentId = data.contentId;

      if (!userId || !contentId) {
        skipped++;
        continue;
      }

      const newId = `${userId}_${contentId}`;
      if (doc.id === newId) {
        skipped++;
        continue;
      }

      const newRef = db.collection('user_saved_content').doc(newId);
      const newDoc = await newRef.get();
      if (!newDoc.exists) {
        await newRef.set(data);
      }
      await doc.ref.delete();
      migrated++;
    }

    return { migrated, skipped };
  }));

/** The user_metrics change one accepted event makes, or null if it feeds no tally. */
async function metricsUpdateFor(entry) {
  const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  switch (entry.activityType) {
    case 'blog_read':
      update.blogsRead = admin.firestore.FieldValue.increment(1);
      update.lastBlogReadDate = entry.timestamp;
      break;
    case 'blog_read_complete': {
      update.qualityReads = admin.firestore.FieldValue.increment(1);
      // Per element, for My Journey's "elements explored" (docs/METRICS.md).
      // A nested map, as for actionsByElement below: set() with merge reads a
      // dotted key as one literal field name.
      const element = elementOfBlog(await activityLookups.getBlog(entry.contentId));
      if (element) {
        update.qualityReadsByElement = { [element]: admin.firestore.FieldValue.increment(1) };
      }
      break;
    }
    case 'video_view':
      update.videosWatched = admin.firestore.FieldValue.increment(1);
      break;
    case 'video_watch_complete':
      update.videosCompleted = admin.firestore.FieldValue.increment(1);
      break;
    case 'poll_vote':
      update.pollsVoted = admin.firestore.FieldValue.increment(1);
      break;
    case 'eq_completion':
      update.lastEqScore = entry.score !== undefined ? entry.score : null;
      update.lastEqDate = entry.timestamp;
      break;
    default:
      return null; // daily_visit, widget_usage, action_completed don't feed a dashboard tally
  }
  return update;
}

/** Content lookups for validateActivityEvent (activity-validation.js). */
const activityLookups = makeContentLookups(db);

/**
 * Validates each new activity_log event and maintains `user_metrics/{uid}`,
 * a materialized summary of the accepted events, so My Journey's dashboard
 * tallies read one small document instead of scanning a user's entire
 * activity history on every page load (Foundation Hardening Plan v4 §8,
 * §12.1). Derived data only: if it's ever wrong, it is recomputable from
 * activity_log via backfillUserMetrics below; raw events stay the source of
 * truth.
 *
 * Every event gets a `validation` verdict ({status: accepted|rejected,
 * reason, validatorVersion, checkedAt}); only accepted events are counted
 * (Phase 2 step 1, docs/PHASE2_PLAN.md G1/G2). Rejected events are kept as
 * evidence, never deleted. Repeats of a count-once event can't reach this
 * function: firestore.rules pins those events to a deterministic doc ID and
 * denies a second create there.
 *
 * The verdict and the metrics update commit in one transaction that first
 * checks the event has no verdict yet, so a redelivered trigger (Cloud
 * Functions delivers at least once) can never count an event twice.
 */
exports.onActivityLogCreated = functions
  .region(REGION)
  .firestore.document('activity_log/{docId}')
  .onCreate(withTriggerErrorLogging('onActivityLogCreated', async (snap) => {
    const entry = snap.data() || {};
    if (entry.validation) {
      return null; // written by the server with its verdict (onUserActionWritten, submitEqAssessment)
    }
    const verdict = await validateActivityEvent(snap.id, entry, activityLookups);
    if (verdict.status === 'rejected') {
      console.warn(JSON.stringify({
        fn: 'onActivityLogCreated', rejected: verdict.reason, docId: snap.id, activityType: entry.activityType || null
      }));
    }
    const update = verdict.status === 'accepted' && entry.userId ? await metricsUpdateFor(entry) : null;

    await db.runTransaction(async (tx) => {
      const current = await tx.get(snap.ref);
      // Gone (engagement reset) or already validated (trigger redelivery).
      if (!current.exists || current.get('validation')) {
        return;
      }
      tx.update(snap.ref, {
        validation: {
          status: verdict.status,
          reason: verdict.reason,
          validatorVersion: VALIDATOR_VERSION,
          checkedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
      if (update) {
        tx.set(db.collection('user_metrics').doc(entry.userId), update, { merge: true });
      }
    });
    return null;
  }));

const KNOWN_ELEMENTS = new Set(['air', 'water', 'earth', 'energy', 'spirit']);

/**
 * Maintains the Take Action counters on `user_metrics/{uid}`
 * (totalActionsCompleted, uniqueActionsCompleted, actionsByElement,
 * lastActionAt) from `user_actions` writes — the client never increments
 * these directly (user_metrics is write:false for clients; see
 * onActivityLogCreated above for why this is the established pattern here).
 *
 * user_actions is an evolving doc (unlike activity_log's write-once events),
 * so this is an onWrite trigger keyed off completionCount rather than an
 * onCreate: a "completion event" is any write where completionCount
 * increased — covers both a first-ever completion (create or IN_PROGRESS ->
 * COMPLETE update) and a repeat completion. Each write credits exactly one
 * completion (firestore.rules only allow completionCount to step by +1).
 *
 * Each completion also gets one immutable, server-written `action_completed`
 * event in activity_log (Phase 2 step 3): the per-completion ledger Planet
 * Passport rules read, alongside reads and watches. Its ID is fixed per
 * completion ({uid}_action_completed_{actionId}_{n}, n = completionCount),
 * and the event and the counters commit in one transaction that does
 * nothing if the event already exists, so a redelivered trigger can't count
 * a completion twice. Clients can't write action_completed (firestore.rules).
 */
exports.onUserActionWritten = functions
  .region(REGION)
  .firestore.document('user_actions/{docId}')
  .onWrite(withTriggerErrorLogging('onUserActionWritten', async (change) => {
    if (!change.after.exists) {
      return null; // no client delete path exists; nothing to reconcile
    }

    const after = change.after.data() || {};
    const before = change.before.exists ? change.before.data() : null;
    const uid = after.userId;
    if (!uid) {
      return null;
    }

    const beforeCount = (before && before.completionCount) || 0;
    const afterCount = after.completionCount || 0;
    if (afterCount <= beforeCount) {
      return null; // not a new completion (e.g. just an IN_PROGRESS start)
    }
    // firestore.rules only let a client write +1 per completion; capping
    // here too means a rules regression (or a hand-edited doc) can never
    // credit more than one completion per write.
    const delta = 1;

    const update = {
      totalActionsCompleted: admin.firestore.FieldValue.increment(delta),
      lastActionAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Unique count only grows on an action's very first completion, not on
    // DAILY repeats of an action already completed before.
    if (beforeCount === 0) {
      update.uniqueActionsCompleted = admin.firestore.FieldValue.increment(1);
    }

    // A nested map, not `actionsByElement.${element}` keys: set() with merge
    // treats a dotted key as one literal field name, not a path (only
    // update() reads dots as paths), and the app reads the nested map.
    const elements = Array.isArray(after.elementIdsSnapshot) ? after.elementIdsSnapshot : [];
    const byElement = {};
    new Set(elements).forEach((element) => {
      if (KNOWN_ELEMENTS.has(element)) {
        byElement[element] = admin.firestore.FieldValue.increment(delta);
      }
    });
    if (Object.keys(byElement).length > 0) {
      update.actionsByElement = byElement;
    }

    const event = {
      userId: uid,
      activityType: 'action_completed',
      schemaVersion: 1,
      contentId: after.actionId,
      completionNumber: afterCount,
      elementIds: [...new Set(elements)].filter((element) => KNOWN_ELEMENTS.has(element)),
      actionVersion: after.actionVersion || 1,
      completionMethod: after.completionMethod || 'SELF_REPORTED',
      // Nothing confirms a self-reported completion; a future verified
      // method (photo, partner check) would set VERIFIED here.
      verificationStatus: 'SELF_REPORTED',
      timestamp: after.lastCompletedAt || admin.firestore.FieldValue.serverTimestamp(),
      validation: {
        status: 'accepted',
        reason: null,
        validatorVersion: VALIDATOR_VERSION,
        checkedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'server'
      }
    };
    // The user's local day is only known for DAILY actions (the day their
    // completion guard claimed); other completions are dated by timestamp.
    if (after.lastCompletionDay) {
      event.calendarDay = after.lastCompletionDay;
    }

    const eventRef = db.collection('activity_log').doc(`${uid}_action_completed_${after.actionId}_${afterCount}`);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(eventRef)).exists) {
        return; // trigger redelivered: this completion is already recorded and counted
      }
      tx.create(eventRef, event);
      tx.set(db.collection('user_metrics').doc(uid), update, { merge: true });
    });
    return null;
  }));

/**
 * Keeps blog_summaries/{blogId} in step with Blogs/{blogId}, so blog lists
 * read a small card doc instead of the whole blog body (see
 * blog-summary.js). The admin editor uploads the cover image before saving
 * the blog, so the image's download token exists by the time this runs.
 */
exports.onBlogWritten = functions
  .region(REGION)
  .firestore.document('Blogs/{blogId}')
  .onWrite(withTriggerErrorLogging('onBlogWritten', async (change, context) => {
    const summaryRef = db.collection(BLOG_SUMMARIES).doc(context.params.blogId);
    if (change.after.exists) {
      await summaryRef.set(await buildBlogSummary(change.after.data() || {}, storage.bucket()));
    } else {
      await summaryRef.delete();
    }
    await rebuildRelatedContent(db, { FieldValue: admin.firestore.FieldValue });
    return null;
  }));

/**
 * Rebuilds the automatic related content (related_auto, see
 * related-content.js) when an admin adds, edits or deactivates an action, so
 * Explore next keeps matching stories to the current catalogue. Blog edits do
 * the same from onBlogWritten.
 */
exports.onActionWritten = functions
  .region(REGION)
  .firestore.document('actions/{actionId}')
  .onWrite(withTriggerErrorLogging('onActionWritten', async () => {
    await rebuildRelatedContent(db, { FieldValue: admin.firestore.FieldValue });
    return null;
  }));

/** Calendar occasions are matched too (Today on WIOF), so an edit rebuilds the matches. */
exports.onEnvcalWritten = functions
  .region(REGION)
  .firestore.document('Envcal/{occasionId}')
  .onWrite(withTriggerErrorLogging('onEnvcalWritten', async () => {
    await rebuildRelatedContent(db, { FieldValue: admin.firestore.FieldValue });
    return null;
  }));

/**
 * Recomputes user_metrics for every user from the full activity_log +
 * user_actions history (Phase 2 step 2; definitions in docs/METRICS.md),
 * via user-metrics.js — the same code scripts/recompute-user-metrics.js
 * runs. Only accepted events count; events from before step 1 have no
 * verdict yet and are judged with the same server checks.
 *
 * **Dry run by default**: returns what would change (per-user before/after,
 * rejected events by reason) and writes nothing. Pass `{ apply: true }` to
 * write the recomputed metrics and the legacy events' verdicts
 * (`validation.retroactive: true`). Safe to re-run: applying twice
 * converges to the same result.
 * Admin-gated via the `admins` collection, checked with the Admin SDK.
 */
exports.backfillUserMetrics = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: '512MB', ...APP_CHECK })
  .https.onCall(withErrorLogging('backfillUserMetrics', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
    }
    return recomputeUserMetrics(db, { apply: !!(data && data.apply === true), FieldValue: admin.firestore.FieldValue });
  }));

/**
 * Scores an EQ assessment on the server (Phase 2 step 2, docs/PHASE2_PLAN.md
 * G3): the browser sends the 24 answers, never a score, and this writes the
 * eq_completion event itself (firestore.rules no longer let a client create
 * one). onActivityLogCreated then validates and counts it like any other
 * event, so EQ shares the one event pipeline.
 * Returns the score so the result screen can show what was recorded.
 */
exports.submitEqAssessment = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('submitEqAssessment', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const result = scoreEqResponses(data && data.responses);
    if (!result) {
      throw new functions.https.HttpsError('invalid-argument', 'Expected 24 answers from 1 to 5.');
    }
    // The browser's local day (as for every other event), if plausible.
    const calendarDay = eqCalendarDay(data && data.calendarDay);

    // At most EQ_DAILY_LIMIT saved checks a day: each takes the next free
    // fixed-ID slot, in a transaction so two at once can't share one.
    const refs = eqSlotIds(context.auth.uid, calendarDay).map((id) => db.collection('activity_log').doc(id));
    const savedAs = await db.runTransaction(async (tx) => {
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      const free = snaps.findIndex((snap) => !snap.exists);
      if (free < 0) return 0;
      tx.create(refs[free], {
        userId: context.auth.uid,
        activityType: 'eq_completion',
        schemaVersion: 1,
        score: result.score,
        eqDimensions: result.eqDimensions,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        calendarDay
      });
      return free + 1;
    });
    return { ...result, saved: savedAs > 0, remainingToday: savedAs > 0 ? EQ_DAILY_LIMIT - savedAs : 0, dailyLimit: EQ_DAILY_LIMIT };
  }));

/**
 * Maintains the public, sanitized `poll_results/{pollQuestionId}` aggregate
 * whenever a new vote is written to `Polls`. Raw `Polls` documents carry
 * email/IP and are admin-only per firestore.rules; this is the only path
 * that writes `poll_results`, and it runs under the Admin SDK, which bypasses
 * security rules — so no client can ever write the aggregate directly.
 */
/** True when `option` is "option<i>" for one of the poll question's options. */
async function isValidPollOption(pollQuestionId, option) {
  const match = /^option([0-9]{1,2})$/.exec(String(option));
  if (!match) {
    return false;
  }
  const pollDoc = await db.collection('Poll').doc(String(pollQuestionId)).get();
  const options = pollDoc.exists ? pollDoc.get('options') : null;
  const index = parseInt(match[1], 10);
  return Array.isArray(options) && index >= 1 && index <= options.length;
}

exports.onPollVoteCreated = functions
  .region(REGION)
  .firestore.document('Polls/{voteId}')
  .onCreate(withTriggerErrorLogging('onPollVoteCreated', async (snap) => {
    const vote = snap.data() || {};
    const pollQuestionId = vote.pollQuestionId;
    const option = vote.option;
    if (!pollQuestionId || !option) {
      return null;
    }

    // Count only a real option ("option1".."optionN") of a poll that exists.
    // firestore.rules already enforces this on create; re-checked here so a
    // stray vote can never add a junk key or inflate totalVotes (which every
    // percentage is computed from).
    if (!(await isValidPollOption(pollQuestionId, option))) {
      console.warn(JSON.stringify({ fn: 'onPollVoteCreated', skipped: 'invalid option', pollQuestionId, option: String(option).slice(0, 40) }));
      return null;
    }

    const resultsRef = db.collection('poll_results').doc(pollQuestionId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(resultsRef);
      const data = doc.exists ? doc.data() : {};
      const optionCounts = { ...(data.optionCounts || {}) };
      optionCounts[option] = (optionCounts[option] || 0) + 1;
      const totalVotes = (data.totalVotes || 0) + 1;

      tx.set(resultsRef, {
        pollQuestionId,
        totalVotes,
        optionCounts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    return null;
  }));

/**
 * Checks whether a given email has already voted on a poll, without exposing
 * the raw `Polls` collection to public reads. Runs under the Admin SDK so it
 * can read the admin-only `Polls` collection; returns only the yes/no + the
 * option for the one exact email the caller already provided (the same
 * exposure the old public collection read allowed for a single known email —
 * this removes the ability to dump every voter's email/IP, not this).
 */
exports.checkPollEmailVoted = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('checkPollEmailVoted', async (data) => {
    const pollQuestionId = (data && data.pollQuestionId ? String(data.pollQuestionId) : '').trim();
    const email = (data && data.email ? String(data.email) : '').trim().toLowerCase();

    if (!pollQuestionId || !email) {
      return { voted: false };
    }

    const snapshot = await db.collection('Polls')
      .where('pollQuestionId', '==', pollQuestionId)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { voted: false };
    }

    // Yes/no only: returning the option would tell anyone who knows an
    // email address how that person voted.
    return { voted: true };
  }));

/**
 * One-time admin-triggered backfill: recomputes `poll_results` for every
 * existing pollQuestionId from the full `Polls` history. Needed because
 * onPollVoteCreated only aggregates votes cast after it was deployed —
 * without this, polls with existing votes would show 0 results until their
 * next new vote. Admin-gated via the `admins` collection, checked here with
 * the Admin SDK (which bypasses firestore.rules, so this check is the actual
 * authorization boundary for this function).
 */
exports.backfillPollResults = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('backfillPollResults', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
    }

    const votesSnapshot = await db.collection('Polls').get();
    const totals = {};

    votesSnapshot.forEach((doc) => {
      const vote = doc.data();
      const pollQuestionId = vote.pollQuestionId;
      const option = vote.option;
      if (!pollQuestionId || !option) {
        return;
      }
      if (!totals[pollQuestionId]) {
        totals[pollQuestionId] = { totalVotes: 0, optionCounts: {} };
      }
      totals[pollQuestionId].totalVotes += 1;
      totals[pollQuestionId].optionCounts[option] = (totals[pollQuestionId].optionCounts[option] || 0) + 1;
    });

    const pollQuestionIds = Object.keys(totals);
    const batch = db.batch();
    pollQuestionIds.forEach((pollQuestionId) => {
      const ref = db.collection('poll_results').doc(pollQuestionId);
      batch.set(ref, {
        pollQuestionId,
        totalVotes: totals[pollQuestionId].totalVotes,
        optionCounts: totals[pollQuestionId].optionCounts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();

    return { pollsBackfilled: pollQuestionIds.length };
  }));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "d/m/yyyy h:mm" in IST — the format the admin Subscribers page sorts on. */
function subscriptionTimestamp(date = new Date()) {
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${ist.getUTCDate()}/${ist.getUTCMonth() + 1}/${ist.getUTCFullYear()} ${ist.getUTCHours()}:${minutes}`;
}

/**
 * Newsletter sign-up. Replaces the old checkSubscriberExists + client write:
 * that public "is this email subscribed?" lookup let anyone test any email
 * address. Duplicates are now dropped here, and the answer is the same
 * whether or not the email was already on the list.
 */
exports.subscribe = functions
  .region(REGION)
  .runWith(APP_CHECK)
  .https.onCall(withErrorLogging('subscribe', async (data) => {
    const clean = (value, max) => (typeof value === 'string' ? value.trim() : '').substring(0, max);
    const firstName = clean(data && data.firstName, 100);
    const lastName = clean(data && data.lastName, 100);
    const email = clean(data && data.email, 254).toLowerCase();

    if (!firstName || !EMAIL_PATTERN.test(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Enter your name and a valid email address.');
    }

    const existing = await db.collection('Subscriptions')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (existing.empty) {
      await db.collection('Subscriptions').add({
        firstName,
        lastName,
        email,
        datetime: subscriptionTimestamp()
      });
    }

    return { ok: true };
  }));

exports.socialMetaTags = functions
  .region(SOCIAL_META_TAGS_REGION)
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .https.onRequest(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const originalUrl = `https://${req.hostname}${req.originalUrl}`;

  // Only intercept crawler requests — real users get the SPA index.html
  if (!isCrawler(userAgent)) {
    // Serve the Angular SPA index.html so the app boots and handles routing
    try {
      const https = require('https');
      const indexUrl = `https://${req.hostname}/index.html`;
      https.get(indexUrl, (proxyRes) => {
        res.set('Content-Type', 'text/html');
        // Browsers always revalidate (max-age=0) so nobody keeps an index.html
        // pointing at hashed bundles a newer deploy removed; the CDN still
        // caches it (s-maxage), and Hosting purges that cache on every deploy.
        res.set('Cache-Control', 'public, max-age=0, s-maxage=600');
        proxyRes.pipe(res);
      }).on('error', () => {
        res.status(500).send('Error loading page');
      });
    } catch (e) {
      res.status(500).send('Error loading page');
    }
    return;
  }

  // A Coffee Conversation's own page: /conversation/:id (8.12.0).
  const conversationMatch = req.path.match(/^\/conversation\/([A-Za-z0-9_-]{1,128})\/?$/);
  if (conversationMatch) {
    try {
      const snap = await db.collection('CoffeeConversations').doc(conversationMatch[1]).get();
      if (!snap.exists) {
        res.status(404).send('Conversation not found');
        return;
      }
      const html = metaHtml({ ...conversationMeta(snap.data(), FALLBACK_IMAGE_URL), url: originalUrl });
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).send(html);
    } catch (error) {
      console.error('Error serving conversation meta tags:', error);
      res.redirect(originalUrl);
    }
    return;
  }

  // Extract blog param from URL: /element/:element/blog/:blogParam
  const blogMatch = req.path.match(/\/element\/\w+\/blog\/(.+)/);
  if (!blogMatch) {
    // Not a blog URL — serve SPA
    try {
      const https = require('https');
      const indexUrl = `https://${req.hostname}/index.html`;
      https.get(indexUrl, (proxyRes) => {
        res.set('Content-Type', 'text/html');
        proxyRes.pipe(res);
      }).on('error', () => {
        res.status(500).send('Error loading page');
      });
    } catch (e) {
      res.status(500).send('Error loading page');
    }
    return;
  }

  const blogParam = blogMatch[1];

  try {
    const blog = await getBlog(blogParam);
    if (!blog) {
      res.status(404).send('Blog not found');
      return;
    }

    const imageUrl = blog.imageName
      ? await getImageUrl(blog.imageName)
      : `https://${req.hostname}/assets/banners/home_banner.jpg`;

    const html = generateMetaHtml(blog, imageUrl, originalUrl);
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving meta tags:', error);
    res.redirect(originalUrl);
  }
});

// ─── Daily analytics (8.9.0) ─────────────────────────────────────────────
// One analytics_daily/{YYYY-MM-DD} summary per India-time day for Admin →
// Analytics (functions/daily-stats.js), plus the day's Google Analytics
// traffic when GA4_PROPERTY_ID is set (functions/ga-traffic.js).

const { buildDailyStatsDoc, addDays, istDay } = require('./daily-stats');
const { fetchTraffic } = require('./ga-traffic');

const buildDay = (day) => buildDailyStatsDoc(db, day, {
  fetchTraffic,
  Timestamp: admin.firestore.Timestamp,
  FieldValue: admin.firestore.FieldValue
});

/**
 * Every 3 hours: today so far, and yesterday (late events and GA's own
 * processing delay settle within a day). Two small summaries per run.
 */
exports.buildDailyStats = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .pubsub.schedule('every 3 hours')
  .timeZone('Asia/Kolkata')
  .onRun(withTriggerErrorLogging('buildDailyStats', async () => {
    const today = istDay();
    await buildDay(addDays(today, -1));
    await buildDay(today);
    return null;
  }));

/**
 * Admin → Analytics "Refresh": rebuilds today (or `day`), and with `days`
 * (up to 31) that many days back. Admins only.
 */
exports.refreshDailyStats = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300, memory: '512MB', ...APP_CHECK })
  .https.onCall(withErrorLogging('refreshDailyStats', async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
    }
    const last = data && /^\d{4}-\d{2}-\d{2}$/.test(String(data.day || '')) ? data.day : istDay();
    const days = Math.min(Math.max(Number(data && data.days) || 1, 1), 31);
    const built = [];
    for (let i = 0; i < days; i++) {
      const day = addDays(last, -i);
      await buildDay(day);
      built.push(day);
    }
    return { built };
  }));
