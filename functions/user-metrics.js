/**
 * Rebuilds user_metrics from the raw history (Phase 2 step 2; definitions in
 * docs/METRICS.md). Only events the server accepts count, and an event that
 * counts once (a blog read, a video, a poll vote) counts once per piece of
 * content however many copies of it exist.
 *
 * Events carry the verdict onActivityLogCreated gave them. Events with no
 * verdict (from before Phase 2 step 1) or one from an older version of the
 * checks are judged again here, in legacy mode (see validateActivityEvent).
 *
 * Shared by the backfillUserMetrics callable and
 * scripts/recompute-user-metrics.js, so both count exactly the same way.
 * Pure apart from the lookups passed in (user-metrics.test.js).
 */
const { VALIDATOR_VERSION, validateActivityEvent } = require('./activity-validation');
const { completionEventId, computeImpact, impactSnapshot } = require('./impact');

/** The user_metrics fields this module owns, in report order. */
const METRIC_FIELDS = [
  'blogsRead', 'qualityReads', 'videosWatched', 'videosCompleted', 'pollsVoted', 'lastEqScore',
  'totalActionsCompleted', 'uniqueActionsCompleted'
];
/** Maps replaced whole by the recompute, compared key by key in the report. */
const MAP_FIELDS = ['qualityReadsByElement', 'impactTotals', 'impactByMonth'];

const ELEMENTS = new Set(['air', 'water', 'earth', 'energy', 'spirit']);

/** A blog's element ('Earth' → 'earth'), or null when it has none we know. */
function elementOfBlog(blog) {
  const element = String((blog && blog.category) || '').trim().toLowerCase();
  return ELEMENTS.has(element) ? element : null;
}

/**
 * Content lookups for validateActivityEvent, backed by Firestore.
 * getBlog accepts a slug or a doc ID (blog URLs use either) and returns the
 * blog with its doc `id` (set last: some blog docs store an `id: null` field),
 * so two URLs for one blog count as one read.
 * cache: memoise per run (recompute); off for the trigger, so a blog
 * published a moment ago is never missed.
 */
function makeContentLookups(db, { cache = false } = {}) {
  const memo = new Map();
  const remember = (key, load) => {
    if (!cache) return load();
    if (!memo.has(key)) memo.set(key, load());
    return memo.get(key);
  };
  return {
    getBlog: (idOrSlug) => remember(`blog:${idOrSlug}`, async () => {
      const bySlug = await db.collection('Blogs').where('slug', '==', String(idOrSlug)).limit(1).get();
      if (!bySlug.empty) {
        return { ...bySlug.docs[0].data(), id: bySlug.docs[0].id };
      }
      const byId = await db.collection('Blogs').doc(String(idOrSlug)).get();
      return byId.exists ? { ...byId.data(), id: byId.id } : null;
    }),
    pollExists: (id) => remember(`poll:${id}`, async () => (await db.collection('Poll').doc(String(id)).get()).exists),
    actionExists: (id) => remember(`action:${id}`, async () => (await db.collection('actions').doc(String(id)).get()).exists),
    getAction: (id) => remember(`actionDoc:${id}`, async () => {
      const snap = await db.collection('actions').doc(String(id)).get();
      return snap.exists ? { ...snap.data(), id: snap.id } : null;
    }),
    // Never cached: an impact report reads the completion it belongs to, which may be seconds old.
    getActivity: async (id) => {
      const snap = await db.collection('activity_log').doc(String(id)).get();
      return snap.exists ? snap.data() : null;
    }
  };
}

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t ? new Date(t).getTime() : 0));
const isNewer = (a, b) => !!a && (!b || toMillis(a) > toMillis(b));

function emptyUser() {
  return {
    blogsRead: new Set(),
    qualityReads: new Set(),
    qualityReadsByElement: {},
    videosWatched: new Set(),
    videosCompleted: new Set(),
    pollsVoted: new Set(),
    lastEqScore: null,
    lastEqDate: null,
    lastBlogReadDate: null,
    totalActionsCompleted: 0,
    uniqueActionsCompleted: 0,
    actionsByElement: {},
    lastActionAt: null,
    // Personal impact (8.14.0): accepted completions, and reported amounts by completion.
    completions: [],
    reported: new Map()
  };
}

/**
 * @param {{id: string, data: object}[]} activityDocs every activity_log doc
 * @param {{id: string, data: object}[]} actionDocs every user_actions doc
 * @param {object} lookups see makeContentLookups
 * @returns {Promise<{ metrics: Map<string, object>, newVerdicts: {id: string, status: string, reason: string|null}[],
 *   rejectedByReason: object }>} metrics: uid -> user_metrics fields;
 *   newVerdicts: new verdicts for unjudged or stale events, written back when applying.
 */
async function computeUserMetrics(activityDocs, actionDocs, lookups) {
  const perUser = new Map();
  const getUser = (uid) => {
    if (!perUser.has(uid)) perUser.set(uid, emptyUser());
    return perUser.get(uid);
  };
  const newVerdicts = [];
  const rejectedByReason = {};

  for (const { id, data } of activityDocs) {
    if (!data || !data.userId) {
      continue;
    }
    let verdict = data.validation;
    if (!verdict || (verdict.validatorVersion || 0) < VALIDATOR_VERSION) {
      verdict = await validateActivityEvent(id, data, lookups, { legacy: true });
      newVerdicts.push({ id, status: verdict.status, reason: verdict.reason });
    }
    if (verdict.status !== 'accepted') {
      rejectedByReason[verdict.reason] = (rejectedByReason[verdict.reason] || 0) + 1;
      continue;
    }

    const u = getUser(data.userId);
    switch (data.activityType) {
      case 'blog_read': {
        const blog = await lookups.getBlog(data.contentId);
        u.blogsRead.add(blog && blog.id ? blog.id : data.contentId);
        if (isNewer(data.timestamp, u.lastBlogReadDate)) u.lastBlogReadDate = data.timestamp;
        break;
      }
      case 'blog_read_complete': {
        const blog = await lookups.getBlog(data.contentId);
        const key = blog && blog.id ? blog.id : data.contentId;
        const element = elementOfBlog(blog);
        if (!u.qualityReads.has(key) && element) {
          u.qualityReadsByElement[element] = (u.qualityReadsByElement[element] || 0) + 1;
        }
        u.qualityReads.add(key);
        break;
      }
      case 'video_view':
        u.videosWatched.add(data.contentId);
        break;
      case 'video_watch_complete':
        u.videosCompleted.add(data.contentId);
        break;
      case 'poll_vote':
        u.pollsVoted.add(data.contentId);
        break;
      case 'action_completed':
        u.completions.push({ id, data });
        break;
      case 'impact_reported':
        u.reported.set(completionEventId(data), data.amount);
        break;
      case 'eq_completion':
        if (isNewer(data.timestamp, u.lastEqDate)) {
          u.lastEqScore = data.score !== undefined ? data.score : null;
          u.lastEqDate = data.timestamp;
        }
        break;
    }
  }

  // Take Action counts come from user_actions (the source of truth for
  // completions; strict rules there), as onUserActionWritten counts them.
  for (const { data } of actionDocs) {
    const completionCount = (data && data.completionCount) || 0;
    if (!data || !data.userId || completionCount <= 0) {
      continue;
    }
    const u = getUser(data.userId);
    u.totalActionsCompleted += completionCount;
    u.uniqueActionsCompleted += 1;
    if (isNewer(data.lastCompletedAt, u.lastActionAt)) u.lastActionAt = data.lastCompletedAt;
    const elements = Array.isArray(data.elementIdsSnapshot) ? data.elementIdsSnapshot : [];
    new Set(elements).forEach((element) => {
      if (typeof element === 'string' && element) {
        u.actionsByElement[element] = (u.actionsByElement[element] || 0) + completionCount;
      }
    });
  }

  // Completions made before 8.14.0 have no snapshot: count them at the
  // action's current recipe and default amount.
  const snapshotFor = async (actionId) => (lookups.getAction ? impactSnapshot(await lookups.getAction(actionId)) : null);
  const impactByUser = new Map();
  for (const [uid, u] of perUser) {
    impactByUser.set(uid, await computeImpact(u.completions, u.reported, snapshotFor));
  }

  const metrics = new Map();
  perUser.forEach((u, uid) => {
    metrics.set(uid, {
      ...impactByUser.get(uid),
      blogsRead: u.blogsRead.size,
      qualityReads: u.qualityReads.size,
      qualityReadsByElement: u.qualityReadsByElement,
      videosWatched: u.videosWatched.size,
      videosCompleted: u.videosCompleted.size,
      pollsVoted: u.pollsVoted.size,
      lastEqScore: u.lastEqScore,
      lastEqDate: u.lastEqDate,
      lastBlogReadDate: u.lastBlogReadDate,
      totalActionsCompleted: u.totalActionsCompleted,
      uniqueActionsCompleted: u.uniqueActionsCompleted,
      actionsByElement: u.actionsByElement,
      lastActionAt: u.lastActionAt
    });
  });
  return { metrics, newVerdicts, rejectedByReason };
}

/**
 * Per-user changes between the stored user_metrics and the recomputed ones:
 * [{ uid, changes: { field: [before, after] } }], only users with a change.
 * A user with stored metrics but no history left keeps their doc untouched
 * (nothing is recomputed for them), so they never appear here.
 */
function diffMetrics(storedByUid, computedByUid) {
  const diffs = [];
  computedByUid.forEach((computed, uid) => {
    const stored = storedByUid.get(uid) || {};
    const changes = {};
    for (const field of METRIC_FIELDS) {
      const before = stored[field] === undefined ? null : stored[field];
      const after = computed[field];
      const same = before === after || ((before || 0) === (after || 0) && field !== 'lastEqScore');
      if (!same) changes[field] = [before, after];
    }
    for (const field of MAP_FIELDS) {
      // Values rounded (sums of decimals differ in the last digits) and nested maps flattened, sorted.
      const flat = (m, prefix = '') => Object.entries(m || {}).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, Math.round(Number(v) * 1000) / 1000]]));
      const nonZero = (m) => JSON.stringify(flat(m).filter(([, n]) => n).sort());
      if (nonZero(stored[field]) !== nonZero(computed[field])) changes[field] = [stored[field] || null, computed[field]];
    }
    if (Object.keys(changes).length > 0) diffs.push({ uid, changes });
  });
  return diffs;
}

/** The `validation` field written onto a legacy event when a recompute is applied. */
function legacyVerdictField(verdict, serverTimestamp) {
  return {
    status: verdict.status,
    reason: verdict.reason,
    validatorVersion: VALIDATOR_VERSION,
    checkedAt: serverTimestamp,
    retroactive: true
  };
}

/**
 * Reads the whole history, recomputes every user's metrics, and (only with
 * apply) writes them plus the legacy events' verdicts. Returns a report
 * either way. FieldValue comes from the caller's own firebase-admin (the
 * functions runtime or a script), since a FieldValue from a different copy
 * of the SDK is rejected by Firestore.
 */
async function recomputeUserMetrics(db, { apply = false, FieldValue }) {
  const [activitySnap, actionsSnap, storedSnap] = await Promise.all([
    db.collection('activity_log').get(),
    db.collection('user_actions').get(),
    db.collection('user_metrics').get()
  ]);
  const toDocs = (snap) => snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  const { metrics, newVerdicts, rejectedByReason } = await computeUserMetrics(
    toDocs(activitySnap), toDocs(actionsSnap), makeContentLookups(db, { cache: true })
  );
  const diffs = diffMetrics(new Map(storedSnap.docs.map((doc) => [doc.id, doc.data()])), metrics);

  const report = {
    applied: apply,
    eventsRead: activitySnap.size,
    usersProcessed: metrics.size,
    usersChanged: diffs.length,
    legacyEventsJudged: newVerdicts.length,
    legacyEventsRejected: newVerdicts.filter((v) => v.status === 'rejected').length,
    rejectedByReason,
    diffs: diffs.slice(0, 100)
  };
  if (!apply) {
    return report;
  }

  let batch = db.batch();
  let ops = 0;
  const flushIfFull = async () => {
    if (++ops === 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };
  for (const [uid, fields] of metrics) {
    // merge: onActivityLogCreated / onUserActionWritten also write this doc.
    // A merge set merges nested maps key by key, so the per-element maps are
    // replaced whole first: a stale key must not survive the recompute.
    const ref = db.collection('user_metrics').doc(uid);
    batch.set(ref, { ...fields, ...Object.fromEntries(MAP_FIELDS.map((f) => [f, FieldValue.delete()])), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await flushIfFull();
    batch.set(ref, Object.fromEntries(MAP_FIELDS.map((f) => [f, fields[f] || {}])), { merge: true });
    await flushIfFull();
  }
  for (const verdict of newVerdicts) {
    batch.update(db.collection('activity_log').doc(verdict.id), {
      validation: legacyVerdictField(verdict, FieldValue.serverTimestamp())
    });
    await flushIfFull();
  }
  if (ops > 0) {
    await batch.commit();
  }
  return report;
}

module.exports = {
  MAP_FIELDS, METRIC_FIELDS, computeUserMetrics, elementOfBlog, diffMetrics, legacyVerdictField, makeContentLookups, recomputeUserMetrics
};
