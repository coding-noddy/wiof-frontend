/**
 * Community impact (8.15.0): what WIOF members saved together this month,
 * for "Together this month" on Take Action. One public, read-only summary
 * per India-time month, `community_impact/{YYYY-MM}`:
 *
 *   { month, totals: {measure: value}, members, minMembers, updatedAt }
 *
 * Built from each member's own monthly totals (user_metrics.impactByMonth,
 * functions/impact.js), so it always agrees with "Your impact". The team's
 * accounts (admins) are left out. Totals only: nothing about any one person.
 * The page shows the numbers only once at least MIN_MEMBERS contributed, so
 * a handful of early members can't be picked out and small numbers don't
 * read as a failure. Built by buildDailyStats and refreshDailyStats.
 */

const COMMUNITY_COLLECTION = 'community_impact';
const MIN_MEMBERS = 20;

/**
 * @param {{id: string, impactByMonth?: object}[]} metricsDocs user_metrics docs
 * @param {Set<string>} adminIds left out
 * @param {string} month "YYYY-MM"
 */
function computeCommunityImpact(metricsDocs, adminIds, month) {
  const totals = {};
  let members = 0;
  for (const m of metricsDocs) {
    if (adminIds.has(m.id)) continue;
    const mine = (m.impactByMonth || {})[month] || {};
    let contributed = false;
    for (const [measure, value] of Object.entries(mine)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        totals[measure] = (totals[measure] || 0) + value;
        contributed = true;
      }
    }
    if (contributed) members++;
  }
  return { month, totals, members, minMembers: MIN_MEMBERS };
}

/** Reads the members' totals and writes community_impact/{month}. */
async function buildCommunityImpact(db, month, { FieldValue }) {
  const [metrics, admins] = await Promise.all([
    db.collection('user_metrics').select('impactByMonth').get(),
    db.collection('admins').select().get()
  ]);
  const summary = computeCommunityImpact(
    metrics.docs.map((d) => ({ ...d.data(), id: d.id })),
    new Set(admins.docs.map((d) => d.id)),
    month
  );
  await db.collection(COMMUNITY_COLLECTION).doc(month).set({ ...summary, updatedAt: FieldValue.serverTimestamp() });
  return summary;
}

module.exports = { COMMUNITY_COLLECTION, MIN_MEMBERS, buildCommunityImpact, computeCommunityImpact };
