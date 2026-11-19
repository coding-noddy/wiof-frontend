/**
 * Planet Passport v1 evaluator (docs/PLANET_PASSPORT_V1_PROPOSAL.md).
 *
 * Pure functions, shared by the award trigger, the backfill script and the
 * metrics recompute, so all three decide in exactly the same way:
 * - progressFor / evaluate / newAwards: which stamps a member has earned,
 *   from server-trusted state only (user_metrics, plus the profile's
 *   server-written longestStreak and the member's chosen elements);
 * - ladderAfter: the "ladder" state on user_metrics that brakes self-reported
 *   speed (decision D4) and counts weeks per action.
 *
 * The ladder brake: a milestone counts the smaller of "different actions" (or
 * elements) and "different days with an action". Six different actions in
 * one minute count as 1; an action on each of five later days brings it to 6.
 * Days and weeks are IST, like impactByMonth (impact.js).
 */
const { CATALOGUE, RULES_VERSION } = require('./passport-catalogue');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const ELEMENT_SLUGS = new Set(['air', 'energy', 'water', 'earth', 'spirit']);

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t ? new Date(t).getTime() : NaN));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** 'YYYY-MM-DD' in IST. */
function istDay(timestamp) {
  return new Date(toMillis(timestamp) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO-8601 week of the IST date, 'YYYY-Www' (sorts as text). */
function istWeek(timestamp) {
  const d = new Date(toMillis(timestamp) + IST_OFFSET_MS);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const weekday = date.getUTCDay() || 7; // Monday 1 … Sunday 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // the Thursday of this week decides its year
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function emptyLadder() {
  return { actionDays: 0, lastActionDay: null, elementDays: {}, elementLastDay: {}, actionWeeks: {}, actionLastWeek: {} };
}

/**
 * The ladder after one more completion ({actionId, elements, timestamp}).
 * Returns a new object; `ladder` may be missing or partial (older docs).
 * Days and weeks only count once each, and only forwards in time, so a
 * redelivered or out-of-order completion can never add a day twice.
 */
function ladderAfter(ladder, completion) {
  const base = { ...emptyLadder(), ...(ladder || {}) };
  const next = {
    actionDays: num(base.actionDays),
    lastActionDay: base.lastActionDay || null,
    elementDays: { ...(base.elementDays || {}) },
    elementLastDay: { ...(base.elementLastDay || {}) },
    actionWeeks: { ...(base.actionWeeks || {}) },
    actionLastWeek: { ...(base.actionLastWeek || {}) }
  };
  if (!completion || !Number.isFinite(toMillis(completion.timestamp))) return next;
  const day = istDay(completion.timestamp);
  const week = istWeek(completion.timestamp);

  if (!next.lastActionDay || day > next.lastActionDay) {
    next.actionDays += 1;
    next.lastActionDay = day;
  }
  for (const element of new Set(completion.elements || [])) {
    if (!ELEMENT_SLUGS.has(element)) continue;
    if (!next.elementLastDay[element] || day > next.elementLastDay[element]) {
      next.elementDays[element] = num(next.elementDays[element]) + 1;
      next.elementLastDay[element] = day;
    }
  }
  const actionId = completion.actionId ? String(completion.actionId) : '';
  if (actionId && (!next.actionLastWeek[actionId] || week > next.actionLastWeek[actionId])) {
    next.actionWeeks[actionId] = num(next.actionWeeks[actionId]) + 1;
    next.actionLastWeek[actionId] = week;
  }
  return next;
}

/** The five first steps (src/app/models/Journey.ts firstSteps), counted from trusted state. */
function firstStepsDone(metrics, profile) {
  const m = metrics || {};
  const chosen = Array.isArray(profile && profile.preferredElements) && profile.preferredElements.length > 0;
  return [chosen, num(m.qualityReads) > 0, num(m.videosCompleted) > 0, m.lastEqScore != null, num(m.totalActionsCompleted) > 0]
    .filter(Boolean).length;
}

/** How far a member is towards a stamp's rule (not capped). */
function progressFor(rule, state) {
  const m = (state && state.metrics) || {};
  const profile = (state && state.profile) || {};
  const ladder = { ...emptyLadder(), ...(m.ladder || {}) };
  const actedElements = Object.keys(m.actionsByElement || {}).filter((e) => ELEMENT_SLUGS.has(e) && num(m.actionsByElement[e]) > 0).length;
  switch (rule.type) {
    case 'first_steps': return firstStepsDone(m, profile);
    case 'element_visit': return num((m.elementVisits || {})[rule.element]) > 0 ? 1 : 0;
    case 'stories_read': return rule.element ? num((m.qualityReadsByElement || {})[rule.element]) : num(m.qualityReads);
    case 'videos_finished': return num(m.videosCompleted);
    case 'polls_voted': return num(m.pollsVoted);
    case 'eq_taken': return m.lastEqScore != null ? 1 : 0;
    case 'different_actions': return Math.min(num(m.uniqueActionsCompleted), num(ladder.actionDays));
    case 'elements_acted': return Math.min(actedElements, num(ladder.actionDays));
    case 'element_action_days': return num((ladder.elementDays || {})[rule.element]);
    case 'action_weeks': return Object.values(ladder.actionWeeks || {}).reduce((max, n) => Math.max(max, num(n)), 0);
    case 'visit_streak': return num(profile.longestStreak);
    default: return 0;
  }
}

/** Every active stamp with its progress (capped at the target) and whether it's earned. */
function evaluate(state, catalogue = CATALOGUE) {
  return catalogue.filter((s) => s.status === 'active').map((s) => {
    const value = progressFor(s.rule, state);
    return { id: s.id, progress: Math.min(s.rule.target, value), target: s.rule.target, earned: value >= s.rule.target, value };
  });
}

/**
 * Stamps earned now that have no record yet. Only ever adds: a stamp already
 * recorded is never re-decided, so a lower count later removes nothing.
 */
function newAwards(state, existingIds, catalogue = CATALOGUE) {
  const have = new Set(existingIds || []);
  const byId = new Map(catalogue.map((s) => [s.id, s]));
  return evaluate(state, catalogue)
    .filter((r) => r.earned && !have.has(r.id))
    .map((r) => {
      const s = byId.get(r.id);
      return { stampId: s.id, defVersion: s.version, ruleVersion: RULES_VERSION, evidence: { rule: s.rule.type, target: s.rule.target, value: r.value } };
    });
}

/** The Passport is issued with Earthrise (decision D5). */
const ISSUING_STAMP = 'earthrise';

/** The passport_stamps document for an award. Timestamps come from the caller (server time or a replayed date). */
function stampRecord(uid, award, { earnedAt, dateKnown = true, source = 'trigger' }) {
  return {
    userId: uid,
    stampId: award.stampId,
    defVersion: award.defVersion,
    ruleVersion: award.ruleVersion,
    evidence: award.evidence,
    earnedAt,
    dateKnown,
    source
  };
}

const stampDocId = (uid, stampId) => `${uid}_${stampId}`;

module.exports = {
  ISSUING_STAMP, emptyLadder, evaluate, firstStepsDone, istDay, istWeek, ladderAfter, newAwards, progressFor, stampDocId, stampRecord
};
