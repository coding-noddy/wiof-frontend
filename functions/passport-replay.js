/**
 * Planet Passport v1 backfill: when did an existing member earn each stamp?
 * (decision D3, docs/PLANET_PASSPORT_V1_PROPOSAL.md §3.7).
 *
 * Replays the member's accepted activity_log events in time order, building
 * the same state the evaluator reads, and records the moment each stamp was
 * first earned. That moment is a real, server-stamped event time.
 *
 * Where history can't prove a date, the stamp is dateKnown: false and the
 * booklet shows "Earned before launch":
 * - the streak stamps (only the longest streak is stored, not when);
 * - Earthrise when the date the member chose their elements is unknown
 *   (no onboarding.welcomeDoneAt).
 *
 * Only stamps the member's current trusted state also earns are returned, so
 * the backfill can never award more than the live trigger would.
 *
 * Pure apart from getBlog (a blog's element for per-element reads).
 */
const { CATALOGUE } = require('./passport-catalogue');
const { ISSUING_STAMP, emptyLadder, evaluate, ladderAfter } = require('./passport');
const { elementOfBlog } = require('./user-metrics');

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t ? new Date(t).getTime() : NaN));
const ELEMENTS = new Set(['air', 'energy', 'water', 'earth', 'spirit']);
const STREAK_RULE = 'visit_streak';

function emptyState() {
  return {
    reads: new Set(), qualityReadsByElement: {}, videos: new Set(), conversations: new Set(), polls: new Set(), lastEqScore: null,
    totalActionsCompleted: 0, actions: new Set(), actionsByElement: {}, elementVisits: {}, ladder: emptyLadder()
  };
}

function metricsOf(s) {
  return {
    qualityReads: s.reads.size, qualityReadsByElement: s.qualityReadsByElement, videosCompleted: s.videos.size,
    conversationsWatched: s.conversations.size,
    pollsVoted: s.polls.size, lastEqScore: s.lastEqScore, totalActionsCompleted: s.totalActionsCompleted,
    uniqueActionsCompleted: s.actions.size, actionsByElement: s.actionsByElement, elementVisits: s.elementVisits, ladder: s.ladder
  };
}

async function applyEvent(s, data, getBlog, isConversationVideo) {
  switch (data.activityType) {
    case 'blog_read_complete': {
      const blog = await getBlog(data.contentId);
      const key = blog && blog.id ? blog.id : data.contentId;
      if (!s.reads.has(key)) {
        const element = elementOfBlog(blog);
        if (element) s.qualityReadsByElement[element] = (s.qualityReadsByElement[element] || 0) + 1;
        s.reads.add(key);
      }
      return true;
    }
    case 'video_watch_complete':
      s.videos.add(data.contentId);
      if (isConversationVideo && await isConversationVideo(data.contentId)) s.conversations.add(data.contentId);
      return true;
    case 'poll_vote': s.polls.add(data.contentId); return true;
    case 'eq_completion': s.lastEqScore = data.score !== undefined ? data.score : null; return true;
    case 'element_visit':
      if (!ELEMENTS.has(data.element)) return false;
      s.elementVisits[data.element] = 1;
      return true;
    case 'action_completed': {
      const elements = Array.isArray(data.elementIds) ? data.elementIds : [];
      s.totalActionsCompleted += 1;
      s.actions.add(data.contentId);
      new Set(elements).forEach((e) => { if (ELEMENTS.has(e)) s.actionsByElement[e] = (s.actionsByElement[e] || 0) + 1; });
      s.ladder = ladderAfter(s.ladder, { actionId: data.contentId, elements, timestamp: data.timestamp });
      return true;
    }
    default:
      return false;
  }
}

/**
 * @param {{id: string, data: object}[]} events the member's activity_log docs (any order)
 * @param {object} profile the member's users doc (preferredElements, longestStreak, onboarding)
 * @param {object} currentMetrics the member's user_metrics now (after a recompute)
 * @param {(id: string) => Promise<object|null>} getBlog
 * @param {object[]} [catalogue]
 * @param {(videoId: string) => Promise<boolean>} [isConversationVideo] Coffee Conversation videos
 * @returns {Promise<Map<string, {earnedAtMs: number|null, dateKnown: boolean, evidence: object}>>}
 */
async function replayEarnedDates(events, profile, currentMetrics, getBlog, catalogue = CATALOGUE, isConversationVideo = null) {
  const p = profile || {};
  const replayProfile = { preferredElements: p.preferredElements || [], longestStreak: 0 };
  const byId = new Map(catalogue.map((s) => [s.id, s]));
  const earned = new Map();
  const state = emptyState();

  const accepted = (events || [])
    .filter(({ data }) => data && data.validation && data.validation.status === 'accepted' && Number.isFinite(toMillis(data.timestamp)))
    .sort((a, b) => toMillis(a.data.timestamp) - toMillis(b.data.timestamp));

  for (const { data } of accepted) {
    if (!(await applyEvent(state, data, getBlog, isConversationVideo))) continue;
    for (const r of evaluate({ metrics: metricsOf(state), profile: replayProfile }, catalogue)) {
      if (r.earned && !earned.has(r.id) && byId.get(r.id).rule.type !== STREAK_RULE) {
        earned.set(r.id, { earnedAtMs: toMillis(data.timestamp), dateKnown: true });
      }
    }
  }

  // Earthrise also needs the elements chosen: the later of the two, if we know when they were chosen.
  if (earned.has(ISSUING_STAMP)) {
    const chosenAt = toMillis(p.onboarding && p.onboarding.welcomeDoneAt);
    const e = earned.get(ISSUING_STAMP);
    earned.set(ISSUING_STAMP, Number.isFinite(chosenAt)
      ? { earnedAtMs: Math.max(e.earnedAtMs, chosenAt), dateKnown: true }
      : { earnedAtMs: null, dateKnown: false });
  }

  // Only what the member's trusted state earns now; streaks without a known date.
  const now = evaluate({ metrics: currentMetrics || {}, profile: { preferredElements: p.preferredElements || [], longestStreak: p.longestStreak || 0 } }, catalogue);
  const result = new Map();
  for (const r of now.filter((x) => x.earned)) {
    const evidence = { rule: byId.get(r.id).rule.type, target: r.target, value: r.value };
    const found = earned.get(r.id);
    result.set(r.id, found ? { ...found, evidence } : { earnedAtMs: null, dateKnown: false, evidence });
  }
  return result;
}

module.exports = { replayEarnedDates };
