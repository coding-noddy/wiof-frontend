/**
 * Server-side checks for activity_log events (Phase 2 step 1, see
 * docs/PHASE2_PLAN.md). firestore.rules already pins each event type's shape
 * and, for events that count once, its doc ID. This checks what rules can't:
 * that the referenced content exists and that the numbers are plausible.
 * onActivityLogCreated records the verdict on the event and counts only
 * accepted events; rejected ones stay as evidence.
 *
 * Pure apart from the lookups passed in, so it is unit-tested without
 * Firestore (activity-validation.test.js).
 */

/**
 * Bump when a check changes, so a verdict says which rules produced it. The
 * recompute (user-metrics.js) re-judges events judged by an older version.
 * 2: video watches from embedded widgets carry the YouTube ID (8.2.0).
 */
const VALIDATOR_VERSION = 2;

/** Events that count once per user per piece of content: ID {uid}_{type}_{contentId}. */
const CONTENT_DEDUPED_TYPES = new Set([
  'blog_read', 'blog_read_complete', 'video_view', 'video_watch_complete', 'poll_vote'
]);

const KNOWN_TYPES = new Set([
  ...CONTENT_DEDUPED_TYPES, 'eq_completion', 'daily_visit', 'widget_usage', 'action_completed', 'suggestion_click',
  'impact_reported'
]);

const KNOWN_WIDGETS = new Set(['AQI', 'Energy Calculator', 'Food pH', 'Water Rainfall']);

/** Where a suggestion can be shown (suggestion_click, 8.9.0). */
const SUGGESTION_VIAS = new Set(['explore_next', 'story_behind', 'today', 'next_for_you']);

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Mirrors BlogReadTrackerDirective / YoutubeWatchTrackerDirective thresholds. */
const QUALITY_READ_MIN_SCROLL = 75;
const QUALITY_READ_TIME_FACTOR = 0.6;
const VIDEO_COMPLETE_MIN_PERCENT = 75;
/**
 * The server's word count can differ slightly from the browser's (the client
 * may have rendered a later edit), so a read is only rejected when it is
 * clearly shorter than the required time, not one second short.
 */
const QUALITY_READ_TOLERANCE = 0.9;

/** Mirrors BlogPostPage.getWordCount(): tags are word boundaries; empty → 1000. */
function blogWordCount(html) {
  if (!html) {
    return 1000;
  }
  return String(html)
    .split(/<[^>]*>/)
    .join(' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/** Seconds a quality read must take: 60% of wordCount at 200 words a minute. */
function requiredReadSeconds(blog) {
  return (blogWordCount(blog && blog.content) / 200) * 60 * QUALITY_READ_TIME_FACTOR;
}

/** The doc ID an event that counts once must use, or null if it may use any ID. */
function expectedDocId(entry) {
  if (CONTENT_DEDUPED_TYPES.has(entry.activityType)) {
    return `${entry.userId}_${entry.activityType}_${entry.contentId}`;
  }
  if (entry.activityType === 'daily_visit') {
    return `${entry.userId}_daily_visit_${entry.calendarDay}`;
  }
  if (entry.activityType === 'suggestion_click') {
    return `${entry.userId}_suggestion_click_${entry.via}_${entry.contentType}_${entry.contentId}_${entry.calendarDay}`;
  }
  if (entry.activityType === 'impact_reported') {
    return `${entry.userId}_impact_reported_${entry.contentId}_${entry.completionNumber}`;
  }
  return null;
}

/**
 * The browser stamps calendarDay in its own time zone (UTC-12 to UTC+14), so
 * it can be one day either side of the server timestamp's UTC date, never more.
 */
function isPlausibleCalendarDay(calendarDay, timestamp) {
  if (typeof calendarDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(calendarDay) || !timestamp) {
    return false;
  }
  const millis = typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : new Date(timestamp).getTime();
  const day = Date.parse(`${calendarDay}T00:00:00Z`);
  if (Number.isNaN(millis) || Number.isNaN(day)) {
    return false;
  }
  const utcDay = Date.parse(new Date(millis).toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(day - utcDay) <= 24 * 60 * 60 * 1000;
}

/** The EQ assessment: 24 questions answered 1-5, three dimensions of 8 in order. */
const EQ_QUESTION_COUNT = 24;
const EQ_DIMENSION_SIZE = 8;

/**
 * Scores an EQ assessment on the server (submitEqAssessment), the same sum
 * EqWidgetQuestionCardComponent shows: each dimension is the sum of its 8
 * answers (8-40), the score is the sum of the three (24-120).
 * Returns null for anything but 24 whole-number answers from 1 to 5.
 */
function scoreEqResponses(responses) {
  if (!Array.isArray(responses) || responses.length !== EQ_QUESTION_COUNT
    || !responses.every((r) => Number.isInteger(r) && r >= 1 && r <= 5)) {
    return null;
  }
  const sum = (start) => responses.slice(start, start + EQ_DIMENSION_SIZE).reduce((a, b) => a + b, 0);
  const eqDimensions = {
    attentionScore: sum(0),
    clarityScore: sum(EQ_DIMENSION_SIZE),
    reparationScore: sum(EQ_DIMENSION_SIZE * 2)
  };
  return { score: eqDimensions.attentionScore + eqDimensions.clarityScore + eqDimensions.reparationScore, eqDimensions };
}

const accept = () => ({ status: 'accepted', reason: null });
const reject = (reason) => ({ status: 'rejected', reason });

/**
 * Decides whether an event counts.
 * @param {string} docId the event's document ID
 * @param {object} entry the event's data
 * @param {{ getBlog(id): Promise<object|null>, pollExists(id): Promise<boolean>,
 *           actionExists(id): Promise<boolean> }} lookups
 * @param {{ legacy?: boolean }} [options] legacy: re-judging an event written
 *   before the current checks (user-metrics.js recompute). Skips the doc ID
 *   and calendar-day checks, which old events predate (random IDs, no
 *   calendarDay); repeats are instead collapsed by the recompute itself.
 *   Also skips the YouTube ID format check: before 8.2.0 embedded widgets
 *   recorded a video's title or topic as its ID. Thresholds still apply.
 * @returns {Promise<{status: 'accepted'|'rejected', reason: string|null}>}
 */
async function validateActivityEvent(docId, entry, lookups, options = {}) {
  if (!entry || typeof entry.userId !== 'string' || !entry.userId) {
    return reject('missing_user');
  }
  if (!KNOWN_TYPES.has(entry.activityType)) {
    return reject('unknown_type');
  }
  if (!options.legacy) {
    const expectedId = expectedDocId(entry);
    if (expectedId !== null && docId !== expectedId) {
      return reject('wrong_doc_id');
    }
    if (!isPlausibleCalendarDay(entry.calendarDay, entry.timestamp)) {
      return reject('implausible_calendar_day');
    }
  }

  switch (entry.activityType) {
    case 'blog_read': {
      const blog = await lookups.getBlog(entry.contentId);
      return blog ? accept() : reject('content_not_found');
    }
    case 'blog_read_complete': {
      const blog = await lookups.getBlog(entry.contentId);
      if (!blog) {
        return reject('content_not_found');
      }
      if (!(entry.scrollDepth > QUALITY_READ_MIN_SCROLL)) {
        return reject('below_scroll_threshold');
      }
      if (!(entry.timeSpent >= requiredReadSeconds(blog) * QUALITY_READ_TOLERANCE)) {
        return reject('below_time_threshold');
      }
      return accept();
    }
    case 'video_view':
      return options.legacy || YOUTUBE_VIDEO_ID.test(entry.contentId) ? accept() : reject('content_not_found');
    case 'video_watch_complete':
      if (!options.legacy && !YOUTUBE_VIDEO_ID.test(entry.contentId)) {
        return reject('content_not_found');
      }
      return entry.scrollDepth >= VIDEO_COMPLETE_MIN_PERCENT ? accept() : reject('below_watch_threshold');
    case 'poll_vote':
      return (await lookups.pollExists(entry.contentId)) ? accept() : reject('content_not_found');
    case 'action_completed':
      return (await lookups.actionExists(entry.contentId)) ? accept() : reject('content_not_found');
    case 'suggestion_click': {
      // Counts nothing in user_metrics; the daily stats read it. The item must exist.
      if (!SUGGESTION_VIAS.has(entry.via)) return reject('unknown_via');
      if (entry.contentType === 'blog') return (await lookups.getBlog(entry.contentId)) ? accept() : reject('content_not_found');
      if (entry.contentType === 'action') return (await lookups.actionExists(entry.contentId)) ? accept() : reject('content_not_found');
      if (entry.contentType === 'video') return YOUTUBE_VIDEO_ID.test(entry.contentId || '') ? accept() : reject('invalid_video_id');
      return reject('unknown_content_type');
    }
    case 'impact_reported': {
      // "About how much?" (8.14.0): only for one of the member's own accepted
      // completions that has an impact snapshot. The value is worked out
      // from the snapshot, never taken from the browser (functions/impact.js).
      if (!(typeof entry.amount === 'number' && Number.isFinite(entry.amount) && entry.amount >= 0)) return reject('invalid_amount');
      const completion = lookups.getActivity
        ? await lookups.getActivity(`${entry.userId}_action_completed_${entry.contentId}_${entry.completionNumber}`)
        : null;
      if (!completion || completion.userId !== entry.userId || completion.activityType !== 'action_completed') return reject('no_completion');
      if (completion.validation && completion.validation.status !== 'accepted') return reject('no_completion');
      return completion.impact ? accept() : reject('no_impact');
    }
    case 'widget_usage':
      return KNOWN_WIDGETS.has(entry.widgetName) ? accept() : reject('unknown_widget');
    case 'eq_completion': {
      const d = entry.eqDimensions || {};
      const dims = [d.attentionScore, d.clarityScore, d.reparationScore];
      const valid = dims.every((v) => Number.isInteger(v) && v >= 8 && v <= 40)
        && entry.score === dims[0] + dims[1] + dims[2];
      return valid ? accept() : reject('invalid_score');
    }
    case 'daily_visit':
      return accept();
  }
  return reject('unknown_type');
}

/**
 * Saved EQ checks per user per day (decided 2026-11-05: a score doesn't
 * change much in a day). A check over the limit is still scored and shown;
 * it just isn't saved.
 */
const EQ_DAILY_LIMIT = 2;

/**
 * The day an EQ check is saved under: the browser's local day if it's
 * plausible (one day either side of the server's UTC date), else the
 * server's UTC date, so a made-up day can't open more slots.
 */
function eqCalendarDay(calendarDay, now = new Date()) {
  return isPlausibleCalendarDay(calendarDay, now) ? calendarDay : now.toISOString().slice(0, 10);
}

/** The fixed IDs of a day's EQ slots: {uid}_eq_completion_{day}_{1..limit}. */
function eqSlotIds(uid, calendarDay, limit = EQ_DAILY_LIMIT) {
  return Array.from({ length: limit }, (_, i) => `${uid}_eq_completion_${calendarDay}_${i + 1}`);
}

module.exports = {
  EQ_DAILY_LIMIT,
  eqCalendarDay,
  eqSlotIds,
  VALIDATOR_VERSION,
  blogWordCount,
  expectedDocId,
  isPlausibleCalendarDay,
  requiredReadSeconds,
  scoreEqResponses,
  validateActivityEvent
};
