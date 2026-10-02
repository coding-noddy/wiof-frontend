/**
 * One-time script: backfill user_metrics via the Admin SDK directly
 * =================================================================
 *
 * backfill-user-metrics.js already exists but calls the backfillUserMetrics
 * *callable* Cloud Function, which requires signing in as an existing admin
 * with email/password — this project's admin accounts are Google-Sign-In
 * only (no password set), so that script can't actually be run here.
 *
 * This script does the exact same aggregation (mirrors functions/index.js's
 * backfillUserMetrics logic) but runs it directly against Firestore with
 * the Admin SDK (service account key), bypassing both the callable wrapper
 * and its admin-auth check entirely — same pattern as the seed-take-action
 * scripts. Specifically needed right now because onUserActionWritten was
 * only just deployed: every Take Action completion recorded before today
 * never incremented user_metrics.totalActionsCompleted, so the home page's
 * "Protect through action" tile and My Journey's streak/action counts read
 * 0 for users who had actually completed actions already.
 *
 * Uses merge:true (the callable version's original set() would have wiped
 * out any field it doesn't itself compute, e.g. totalActionsCompleted, on
 * every run — fixed in functions/index.js too, this script matches it).
 *
 * Usage:
 *   node scripts/backfill-user-metrics-admin.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error('ERROR: scripts/service-account.json not found.');
  process.exit(1);
}

const serviceAccount = require(keyPath);
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
console.log(`Target project: ${serviceAccount.project_id}\n`);

function isNewer(a, b) {
  if (!a) return false;
  if (!b) return true;
  return a.toMillis() > b.toMillis();
}

async function main() {
  console.log('Reading activity_log and user_actions...');
  const [activitySnapshot, actionsSnapshot] = await Promise.all([
    db.collection('activity_log').get(),
    db.collection('user_actions').get()
  ]);
  console.log(`  activity_log: ${activitySnapshot.size} docs`);
  console.log(`  user_actions: ${actionsSnapshot.size} docs\n`);

  const perUser = new Map();
  const getUser = (uid) => {
    if (!perUser.has(uid)) {
      perUser.set(uid, {
        blogsRead: new Set(),
        videosWatched: new Set(),
        videosCompleted: 0,
        pollsVoted: 0,
        lastEqScore: null,
        lastEqDate: null,
        lastBlogReadDate: null,
        totalActionsCompleted: 0,
        uniqueActionsCompleted: 0,
        actionsByElement: {},
        lastActionAt: null
      });
    }
    return perUser.get(uid);
  };

  activitySnapshot.forEach((doc) => {
    const entry = doc.data();
    const uid = entry.userId;
    if (!uid) return;
    const u = getUser(uid);

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

  actionsSnapshot.forEach((doc) => {
    const entry = doc.data();
    const uid = entry.userId;
    const completionCount = entry.completionCount || 0;
    if (!uid || completionCount <= 0) return;
    const u = getUser(uid);
    u.totalActionsCompleted += completionCount;
    u.uniqueActionsCompleted += 1;
    if (isNewer(entry.lastCompletedAt, u.lastActionAt)) {
      u.lastActionAt = entry.lastCompletedAt;
    }
    const elements = Array.isArray(entry.elementIdsSnapshot) ? entry.elementIdsSnapshot : [];
    elements.forEach((element) => {
      if (typeof element === 'string' && element) {
        u.actionsByElement[element] = (u.actionsByElement[element] || 0) + completionCount;
      }
    });
  });

  const uids = Array.from(perUser.keys());
  console.log(`Writing user_metrics for ${uids.length} users...`);

  let batch = db.batch();
  let opCount = 0;
  for (const uid of uids) {
    const u = perUser.get(uid);
    batch.set(
      db.collection('user_metrics').doc(uid),
      {
        blogsRead: u.blogsRead.size,
        videosWatched: u.videosWatched.size,
        videosCompleted: u.videosCompleted,
        pollsVoted: u.pollsVoted,
        lastEqScore: u.lastEqScore,
        lastEqDate: u.lastEqDate,
        lastBlogReadDate: u.lastBlogReadDate,
        totalActionsCompleted: u.totalActionsCompleted,
        uniqueActionsCompleted: u.uniqueActionsCompleted,
        actionsByElement: u.actionsByElement,
        lastActionAt: u.lastActionAt,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
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

  console.log(`\nDone. Users processed: ${uids.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
