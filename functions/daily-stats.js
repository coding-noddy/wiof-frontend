/**
 * Daily summaries for Admin → Analytics (8.9.0): one small
 * `analytics_daily/{YYYY-MM-DD}` doc per day, so the page reads 30–90 docs
 * instead of every activity event. Built by the buildDailyStats schedule
 * and the admin-only refreshDailyStats callable (functions/index.js), and
 * for past days by scripts/backfill-daily-stats.js.
 *
 * Days are India time (Asia/Kolkata), by each event's server timestamp. The
 * team's own accounts (admins) are left out, and rejected events never
 * count. Definitions: docs/METRICS.md "Daily analytics".
 */

const TIME_ZONE_OFFSET = '+05:30'; // Asia/Kolkata, no daylight saving
const STATS_COLLECTION = 'analytics_daily';
const SUGGESTION_VIAS = ['explore_next', 'story_behind', 'today', 'next_for_you'];
const ELEMENTS = ['air', 'water', 'earth', 'energy', 'spirit'];
const TOP_N = 10;

/** Event types that mean someone did something, not just visited. */
const ENGAGED_TYPES = new Set([
  'blog_read', 'blog_read_complete', 'video_view', 'video_watch_complete', 'poll_vote',
  'eq_completion', 'widget_usage', 'action_completed', 'suggestion_click'
]);

/** Which completion a suggestion click can lead to. */
const COMPLETION_FOR = { blog: 'blog_read_complete', video: 'video_watch_complete', action: 'action_completed' };

/** [start, end) of an India-time day, as Dates. */
function dayRange(day) {
  const start = new Date(`${day}T00:00:00${TIME_ZONE_OFFSET}`);
  return [start, new Date(start.getTime() + 24 * 60 * 60 * 1000)];
}

/** The India-time day of a Date: "2026-11-05". */
function istDay(date = new Date()) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const toDate = (t) => (t && typeof t.toDate === 'function' ? t.toDate() : t ? new Date(t) : null);

/** Count by key, then the top N as [{key, count}], most first (ties by key). */
function top(counts, n = TOP_N) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

/**
 * @param {object} input
 * @param {string} input.day                     YYYY-MM-DD (India time)
 * @param {object[]} input.events                that day's activity_log docs ({id, ...data})
 * @param {Set<string>} input.adminIds           left out of every number
 * @param {object[]} input.users                 users docs ({id, joinedDate, preferredElements})
 * @param {object[]} input.metrics               user_metrics docs ({id, qualityReads, ...})
 * @param {(idOrSlug: string) => {id, title, element}|null} input.story   a story by ID or slug
 * @param {(id: string) => {title, elementIds}|null} input.action
 * @param {object|null} [input.traffic]          Google Analytics numbers for the day, if connected
 */
function computeDailyStats({ day, events, adminIds, users, metrics, story, action, traffic = null }) {
  const counted = events.filter((e) => e.userId && !adminIds.has(e.userId) && e.validation?.status !== 'rejected');
  const by = (type) => counted.filter((e) => e.activityType === type);
  const people = (list) => new Set(list.map((e) => e.userId)).size;

  // Story IDs and slugs both resolve to the story, so reads and clicks match however they were recorded.
  const storyKey = (contentId) => story(contentId)?.id || contentId;
  const reads = by('blog_read_complete');
  const completions = by('action_completed');

  const byElement = Object.fromEntries(ELEMENTS.map((el) => [el, { qualityReads: 0, actionsCompleted: 0 }]));
  reads.forEach((e) => {
    const el = story(e.contentId)?.element;
    if (byElement[el]) byElement[el].qualityReads++;
  });
  completions.forEach((e) => {
    const els = e.elementIds?.length ? e.elementIds : action(e.contentId)?.elementIds || [];
    els.forEach((el) => byElement[el] && byElement[el].actionsCompleted++);
  });

  // Suggestions: clicks, and how many led to the matching completion the same day by the same person.
  const done = new Set(counted
    .filter((e) => Object.values(COMPLETION_FOR).includes(e.activityType))
    .map((e) => `${e.userId}|${e.activityType}|${e.activityType === 'blog_read_complete' ? storyKey(e.contentId) : e.contentId}`));
  const suggestions = Object.fromEntries(SUGGESTION_VIAS.map((via) => [via, { clicks: 0, converted: 0, users: 0 }]));
  const clickers = Object.fromEntries(SUGGESTION_VIAS.map((via) => [via, new Set()]));
  by('suggestion_click').forEach((e) => {
    const s = suggestions[e.via];
    if (!s) return;
    s.clicks++;
    clickers[e.via].add(e.userId);
    const completion = COMPLETION_FOR[e.contentType];
    const key = e.contentType === 'blog' ? storyKey(e.contentId) : e.contentId;
    if (completion && done.has(`${e.userId}|${completion}|${key}`)) s.converted++;
  });
  SUGGESTION_VIAS.forEach((via) => (suggestions[via].users = clickers[via].size));

  const storyCounts = new Map();
  reads.forEach((e) => storyCounts.set(storyKey(e.contentId), (storyCounts.get(storyKey(e.contentId)) || 0) + 1));
  const actionCounts = new Map();
  completions.forEach((e) => actionCounts.set(e.contentId, (actionCounts.get(e.contentId) || 0) + 1));

  // First steps, as of the end of the day: everyone who has signed in, minus the team.
  const [start, end] = dayRange(day);
  const members = users.filter((u) => !adminIds.has(u.id));
  const metricsById = new Map(metrics.map((m) => [m.id, m]));
  const has = (u, test) => test(metricsById.get(u.id) || {});
  const steps = {
    members: members.length,
    choseElements: members.filter((u) => (u.preferredElements || []).length > 0).length,
    readStory: members.filter((u) => has(u, (m) => (m.qualityReads || 0) > 0)).length,
    watchedVideo: members.filter((u) => has(u, (m) => (m.videosCompleted || 0) > 0)).length,
    checkedEq: members.filter((u) => has(u, (m) => m.lastEqScore != null)).length,
    didAction: members.filter((u) => has(u, (m) => (m.totalActionsCompleted || 0) > 0)).length
  };
  steps.allFive = members.filter((u) => (u.preferredElements || []).length > 0 && has(u, (m) =>
    (m.qualityReads || 0) > 0 && (m.videosCompleted || 0) > 0 && m.lastEqScore != null && (m.totalActionsCompleted || 0) > 0)).length;

  return {
    day,
    users: {
      active: people(counted),
      engaged: people(counted.filter((e) => ENGAGED_TYPES.has(e.activityType))),
      new: members.filter((u) => {
        const joined = toDate(u.joinedDate);
        return joined && joined >= start && joined < end;
      }).length
    },
    totals: {
      storiesOpened: by('blog_read').length,
      qualityReads: reads.length,
      videosOpened: by('video_view').length,
      videosCompleted: by('video_watch_complete').length,
      actionsCompleted: completions.length,
      eqChecks: by('eq_completion').length,
      pollVotes: by('poll_vote').length,
      widgetUses: by('widget_usage').length,
      suggestionClicks: by('suggestion_click').length
    },
    byElement,
    suggestions,
    topStories: top(storyCounts).map(({ key, count }) => ({ id: key, title: story(key)?.title || key, element: story(key)?.element || null, reads: count })),
    topActions: top(actionCounts).map(({ key, count }) => ({ id: key, title: action(key)?.title || key, completions: count })),
    firstSteps: steps,
    // Who was active (8.15.0): Admin → Analytics works out how many came
    // back from these, over the days it already loads. Account IDs only,
    // in an admin-only doc; never shown.
    activeMemberIds: [...new Set(counted.map((e) => e.userId))].sort(),
    traffic,
    excludes: 'admins',
    version: 2
  };
}

/**
 * Reads what a day's summary needs and writes analytics_daily/{day}. The
 * reads are bounded by the day (activity_log by timestamp) plus the small
 * users, user_metrics, admins, blog and action lists.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} day
 * @param {{ fetchTraffic?: (day: string) => Promise<object|null>, Timestamp: any, FieldValue: any, write?: boolean }} deps
 */
async function buildDailyStatsDoc(db, day, { fetchTraffic, Timestamp, FieldValue, write = true }) {
  const [start, end] = dayRange(day);
  const [events, admins, users, metrics, blogs, actions, traffic] = await Promise.all([
    db.collection('activity_log').where('timestamp', '>=', Timestamp.fromDate(start)).where('timestamp', '<', Timestamp.fromDate(end)).get(),
    db.collection('admins').select().get(),
    db.collection('users').select('joinedDate', 'preferredElements').get(),
    db.collection('user_metrics').select('qualityReads', 'videosCompleted', 'lastEqScore', 'totalActionsCompleted').get(),
    db.collection('Blogs').select('title', 'slug', 'category').get(),
    db.collection('actions').select('title', 'elementIds').get(),
    fetchTraffic ? fetchTraffic(day) : Promise.resolve(null)
  ]);
  const stories = new Map();
  blogs.docs.forEach((d) => {
    const entry = { id: d.id, title: d.get('title') || d.id, element: String(d.get('category') || '').toLowerCase() || null };
    stories.set(d.id, entry);
    if (d.get('slug')) stories.set(d.get('slug'), entry);
  });
  const actionById = new Map(actions.docs.map((d) => [d.id, { title: d.get('title') || d.id, elementIds: d.get('elementIds') || [] }]));
  const stats = computeDailyStats({
    day,
    events: events.docs.map((d) => ({ ...d.data(), id: d.id })),
    adminIds: new Set(admins.docs.map((d) => d.id)),
    users: users.docs.map((d) => ({ ...d.data(), id: d.id })),
    metrics: metrics.docs.map((d) => ({ ...d.data(), id: d.id })),
    story: (key) => stories.get(String(key)) || null,
    action: (id) => actionById.get(String(id)) || null,
    traffic
  });
  if (write) await db.collection(STATS_COLLECTION).doc(day).set({ ...stats, computedAt: FieldValue.serverTimestamp() });
  return stats;
}

module.exports = { STATS_COLLECTION, SUGGESTION_VIAS, addDays, buildDailyStatsDoc, computeDailyStats, dayRange, istDay };
