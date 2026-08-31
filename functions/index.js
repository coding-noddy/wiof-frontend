/**
 * WIOF Cloud Functions
 * ====================
 * Serves dynamic Open Graph meta tags for social media crawlers.
 * When WhatsApp/Twitter/Facebook/LinkedIn crawl a blog URL, they get
 * the blog's actual title, description, and hero image instead of
 * the default WIOF meta tags.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

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
      return 'https://wiof-staging.web.app/assets/banners/home_banner.jpg';
    }

    // Use the public Firebase Storage URL format (no signed URL needed)
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(`blog-images/${imageName}`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  } catch (e) {
    console.error('Image URL error:', e.message);
    return 'https://wiof-staging.web.app/assets/banners/home_banner.jpg'; // fallback
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

/**
 * Generate HTML with Open Graph meta tags
 */
function generateMetaHtml(blog, imageUrl, originalUrl) {
  const title = blog.title || 'World is One Family';
  const description = blog.shortDescription || 'Inspire through Creativity, Enlighten through Knowledge, Protect through Action';
  const author = blog.author || 'WIOF';
  const siteName = 'World is One Family (WIOF)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} | ${siteName}</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${originalUrl}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="article:author" content="${author}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${originalUrl}">
  <link rel="canonical" href="${originalUrl}">
</head>
<body>
  <p>Redirecting to <a href="${originalUrl}">${title}</a>...</p>
</body>
</html>`;
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

/**
 * User profile system-managed fields
 * ===================================
 * loginCount, lastLogin, daysVisited, currentStreak and savedBlogsCount are
 * engagement counters, not user preferences — a client that could set them
 * directly could forge its own streak/login history. These four functions
 * are the only path that may write them; firestore.rules denies `create` on
 * `users/{uid}` entirely and excludes these fields from the allowed `update`
 * key set, so the Admin SDK writes below (which bypass rules) are the only
 * way any of these fields change.
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
  .https.onCall(async (data, context) => {
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
      savedBlogsCount: 0
    });

    return { created: true };
  });

/**
 * Increments loginCount and refreshes lastLogin for a returning user signing
 * in. No-ops (throws not-found) if the profile doesn't exist yet — callers
 * are expected to have already confirmed it does via createUserProfile.
 */
exports.recordLoginMetrics = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    await db.collection('users').doc(context.auth.uid).update({
      loginCount: admin.firestore.FieldValue.increment(1),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true };
  });

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
  .https.onCall(async (data, context) => {
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
        update.daysVisited = admin.firestore.FieldValue.increment(1);
        update.currentStreak = daysDiff === 1 ? admin.firestore.FieldValue.increment(1) : 1;
      }

      tx.update(userRef, update);
    });

    return { ok: true };
  });

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
 * Also zeroes user_metrics/{uid} directly: onActivityLogCreated only fires
 * on document *create*, never on delete, so without this the materialized
 * dashboard summary would keep showing pre-reset counts indefinitely after
 * the raw activity_log entries behind them are gone.
 */
exports.resetEngagementData = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const uid = context.auth.uid;

    const deletedActivityCount = await deleteAllOwnedBy('activity_log', uid);
    const deletedSavedContentCount = await deleteAllOwnedBy('user_saved_content', uid);

    await db.collection('users').doc(uid).update({
      loginCount: 0,
      daysVisited: 0,
      currentStreak: 0,
      savedBlogsCount: 0,
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('user_metrics').doc(uid).set({
      blogsRead: 0,
      videosWatched: 0,
      videosCompleted: 0,
      pollsVoted: 0,
      lastEqScore: null,
      lastEqDate: null,
      lastBlogReadDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true, deletedActivityCount, deletedSavedContentCount };
  });

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
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
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
  });

/**
 * Maintains `user_metrics/{uid}` — a materialized summary of activity_log,
 * so My Journey's dashboard tallies read one small document instead of
 * scanning a user's entire activity history on every page load (Foundation
 * Hardening Plan v4 §8, §12.1). Derived data only: if it's ever wrong, it is
 * fully recomputable from activity_log via backfillUserMetrics below — raw
 * events remain the source of truth.
 *
 * blogsRead/videosWatched increment safely without a Set/dedup check here
 * because activity_log's own rules make a second blog_read/video_view for
 * the same contentId impossible to create (deterministic ID, update denied)
 * — this trigger fires at most once per unique piece of content.
 */
exports.onActivityLogCreated = functions
  .region(REGION)
  .firestore.document('activity_log/{docId}')
  .onCreate(async (snap) => {
    const entry = snap.data() || {};
    const uid = entry.userId;
    if (!uid) {
      return null;
    }

    const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    switch (entry.activityType) {
      case 'blog_read':
        update.blogsRead = admin.firestore.FieldValue.increment(1);
        update.lastBlogReadDate = entry.timestamp;
        break;
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
        return null; // blog_read_complete, daily_visit, widget_usage don't feed a dashboard tally
    }

    await db.collection('user_metrics').doc(uid).set(update, { merge: true });
    return null;
  });

/**
 * One-time admin-triggered backfill: recomputes user_metrics for every user
 * from the full activity_log history. Needed because onActivityLogCreated
 * only aggregates events created after it was deployed. Unlike the trigger,
 * this dedupes blog_read/video_view by contentId explicitly (via a Set)
 * rather than relying on one-create-per-key, since historical data predates
 * today's deterministic-ID dedup fix and could in rare cases already contain
 * a race-condition duplicate from the old query-before-write pattern.
 * Admin-gated via the `admins` collection, checked with the Admin SDK.
 */
exports.backfillUserMetrics = functions
  .region(REGION)
  .runWith({ timeoutSeconds: 300 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
    }

    const snapshot = await db.collection('activity_log').get();
    const perUser = new Map();

    const isNewer = (a, b) => {
      if (!a) return false;
      if (!b) return true;
      return a.toMillis() > b.toMillis();
    };

    snapshot.forEach((doc) => {
      const entry = doc.data();
      const uid = entry.userId;
      if (!uid) {
        return;
      }
      if (!perUser.has(uid)) {
        perUser.set(uid, {
          blogsRead: new Set(),
          videosWatched: new Set(),
          videosCompleted: 0,
          pollsVoted: 0,
          lastEqScore: null,
          lastEqDate: null,
          lastBlogReadDate: null
        });
      }
      const u = perUser.get(uid);

      switch (entry.activityType) {
        case 'blog_read':
          if (entry.contentId) u.blogsRead.add(entry.contentId);
          if (isNewer(entry.timestamp, u.lastBlogReadDate)) u.lastBlogReadDate = entry.timestamp;
          break;
        case 'video_view':
          if (entry.contentId) u.videosWatched.add(entry.contentId);
          break;
        case 'video_watch_complete':
          u.videosCompleted += 1;
          break;
        case 'poll_vote':
          u.pollsVoted += 1;
          break;
        case 'eq_completion':
          if (isNewer(entry.timestamp, u.lastEqDate)) {
            u.lastEqScore = entry.score !== undefined ? entry.score : null;
            u.lastEqDate = entry.timestamp;
          }
          break;
      }
    });

    const uids = Array.from(perUser.keys());
    let batch = db.batch();
    let opCount = 0;

    for (const uid of uids) {
      const u = perUser.get(uid);
      batch.set(db.collection('user_metrics').doc(uid), {
        blogsRead: u.blogsRead.size,
        videosWatched: u.videosWatched.size,
        videosCompleted: u.videosCompleted,
        pollsVoted: u.pollsVoted,
        lastEqScore: u.lastEqScore,
        lastEqDate: u.lastEqDate,
        lastBlogReadDate: u.lastBlogReadDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      opCount++;
      if (opCount === 450) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
    if (opCount > 0) {
      await batch.commit();
    }

    return { usersProcessed: uids.length };
  });

/**
 * Maintains the public, sanitized `poll_results/{pollQuestionId}` aggregate
 * whenever a new vote is written to `Polls`. Raw `Polls` documents carry
 * email/IP and are admin-only per firestore.rules; this is the only path
 * that writes `poll_results`, and it runs under the Admin SDK, which bypasses
 * security rules — so no client can ever write the aggregate directly.
 */
exports.onPollVoteCreated = functions
  .region(REGION)
  .firestore.document('Polls/{voteId}')
  .onCreate(async (snap) => {
    const vote = snap.data() || {};
    const pollQuestionId = vote.pollQuestionId;
    const option = vote.option;
    if (!pollQuestionId || !option) {
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
  });

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
  .https.onCall(async (data) => {
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

    return { voted: true, option: snapshot.docs[0].data().option || null };
  });

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
  .https.onCall(async (data, context) => {
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
  });

/**
 * Checks whether an email is already subscribed, without exposing the
 * Subscriptions collection to public reads — replaces the old bounded
 * (limit-1) public query, which let a caller enumerate individual known
 * emails one at a time even though it couldn't dump the whole collection.
 */
exports.checkSubscriberExists = functions
  .region(REGION)
  .https.onCall(async (data) => {
    const email = (data && data.email ? String(data.email) : '').trim().toLowerCase();
    if (!email) {
      return { exists: false };
    }

    const snapshot = await db.collection('Subscriptions')
      .where('email', '==', email)
      .limit(1)
      .get();

    return { exists: !snapshot.empty };
  });

exports.socialMetaTags = functions
  .region(REGION)
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
        res.set('Cache-Control', 'public, max-age=600');
        proxyRes.pipe(res);
      }).on('error', () => {
        res.status(500).send('Error loading page');
      });
    } catch (e) {
      res.status(500).send('Error loading page');
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
