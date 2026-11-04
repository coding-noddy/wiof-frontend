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

/** Bump when a check changes, so a verdict says which rules produced it. */
const VALIDATOR_VERSION = 1;

/** Events that count once per user per piece of content: ID {uid}_{type}_{contentId}. */
const CONTENT_DEDUPED_TYPES = new Set([
  'blog_read', 'blog_read_complete', 'video_view', 'video_watch_complete', 'poll_vote'
]);

const KNOWN_TYPES = new Set([
  ...CONTENT_DEDUPED_TYPES, 'eq_completion', 'daily_visit', 'widget_usage', 'action_completed'
]);

const KNOWN_WIDGETS = new Set(['AQI', 'Energy Calculator', 'Food pH', 'Water Rainfall']);

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

const accept = () => ({ status: 'accepted', reason: null });
const reject = (reason) => ({ status: 'rejected', reason });

/**
 * Decides whether an event counts.
 * @param {string} docId the event's document ID
 * @param {object} entry the event's data
 * @param {{ getBlog(id): Promise<object|null>, pollExists(id): Promise<boolean>,
 *           actionExists(id): Promise<boolean> }} lookups
 * @returns {Promise<{status: 'accepted'|'rejected', reason: string|null}>}
 */
async function validateActivityEvent(docId, entry, lookups) {
  if (!entry || typeof entry.userId !== 'string' || !entry.userId) {
    return reject('missing_user');
  }
  if (!KNOWN_TYPES.has(entry.activityType)) {
    return reject('unknown_type');
  }
  const expectedId = expectedDocId(entry);
  if (expectedId !== null && docId !== expectedId) {
    return reject('wrong_doc_id');
  }
  if (!isPlausibleCalendarDay(entry.calendarDay, entry.timestamp)) {
    return reject('implausible_calendar_day');
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
      return YOUTUBE_VIDEO_ID.test(entry.contentId) ? accept() : reject('content_not_found');
    case 'video_watch_complete':
      if (!YOUTUBE_VIDEO_ID.test(entry.contentId)) {
        return reject('content_not_found');
      }
      return entry.scrollDepth >= VIDEO_COMPLETE_MIN_PERCENT ? accept() : reject('below_watch_threshold');
    case 'poll_vote':
      return (await lookups.pollExists(entry.contentId)) ? accept() : reject('content_not_found');
    case 'action_completed':
      return (await lookups.actionExists(entry.contentId)) ? accept() : reject('content_not_found');
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

module.exports = {
  VALIDATOR_VERSION,
  blogWordCount,
  expectedDocId,
  isPlausibleCalendarDay,
  requiredReadSeconds,
  validateActivityEvent
};
