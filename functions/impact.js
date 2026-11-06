/**
 * Personal impact (8.14.0): what a member's completed actions saved.
 *
 * Each completion's action_completed event carries an impact snapshot from
 * the action's recipe at that moment (actions/{id}.impact, the same model as
 * src/app/models/Impact.ts): { measure, perUnit, inputMax, amount, value },
 * with the recipe's default amount. If the member then says how much
 * ("About how much?"), an impact_reported event (one per completion, checked
 * here) replaces that amount; the value is always worked out on the server
 * from the snapshot's rate, and the amount is capped at its maximum.
 *
 * user_metrics keeps the totals: impactTotals {measure: value} and
 * impactByMonth {"YYYY-MM": {measure: value}} (India-time months, by the
 * completion's time). Estimates are self-reported (docs/METRICS.md).
 */

const MEASURES = new Set(['water', 'energy', 'co2', 'plastic', 'food']);
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** A usable recipe, or null. */
function validImpact(impact) {
  if (!impact || !MEASURES.has(impact.measure)) return null;
  return positive(impact.perUnit) && positive(impact.inputDefault) && positive(impact.inputMax) ? impact : null;
}

/** Within 0 and the maximum. */
function clampAmount(amount, max) {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

/** The snapshot stored on a completion: the recipe's rate and cap, at its default amount. */
function impactSnapshot(action) {
  const impact = validImpact(action && action.impact);
  if (!impact) return null;
  const amount = clampAmount(impact.inputDefault, impact.inputMax);
  return { measure: impact.measure, perUnit: impact.perUnit, inputMax: impact.inputMax, amount, value: amount * impact.perUnit };
}

/** The value of a reported amount against a completion's snapshot. */
function reportedValue(snapshot, amount) {
  return clampAmount(amount, snapshot.inputMax) * snapshot.perUnit;
}

const toMillis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t ? new Date(t).getTime() : Date.now()));

/** "YYYY-MM" in India time. */
function monthKey(timestamp) {
  return new Date(toMillis(timestamp) + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** A user_metrics merge update adding `value` of `measure` in `month` (FieldValue.increment). */
function impactIncrement(measure, value, month, FieldValue) {
  if (!MEASURES.has(measure) || !Number.isFinite(value) || value === 0) return null;
  return {
    impactTotals: { [measure]: FieldValue.increment(value) },
    impactByMonth: { [month]: { [measure]: FieldValue.increment(value) } }
  };
}

/**
 * Totals from a user's accepted events, for the recompute. `snapshotFor`
 * gives a snapshot for an older completion that has none (made before this
 * release), from the action's current recipe, so past completions count at
 * the default too.
 * @param {{id: string, data: object}[]} completions accepted action_completed events
 * @param {Map<string, number>} reportedByCompletionId completion event id -> reported amount
 */
async function computeImpact(completions, reportedByCompletionId, snapshotFor) {
  const totals = {};
  const byMonth = {};
  for (const { id, data } of completions) {
    const snapshot = data.impact || (await snapshotFor(data.contentId));
    if (!snapshot || !MEASURES.has(snapshot.measure)) continue;
    const value = reportedByCompletionId.has(id) ? reportedValue(snapshot, reportedByCompletionId.get(id)) : snapshot.value;
    if (!(value > 0)) continue;
    const month = monthKey(data.timestamp);
    totals[snapshot.measure] = (totals[snapshot.measure] || 0) + value;
    byMonth[month] = byMonth[month] || {};
    byMonth[month][snapshot.measure] = (byMonth[month][snapshot.measure] || 0) + value;
  }
  return { impactTotals: totals, impactByMonth: byMonth };
}

/** The completion event an impact_reported event belongs to. */
const completionEventId = (entry) => `${entry.userId}_action_completed_${entry.contentId}_${entry.completionNumber}`;

module.exports = { MEASURES, clampAmount, completionEventId, computeImpact, impactIncrement, impactSnapshot, monthKey, reportedValue, validImpact };
