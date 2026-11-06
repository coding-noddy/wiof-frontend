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
/** The default; admins can change it (site_settings/community_impact.minMembers, 1–1000). */
const MIN_MEMBERS = 20;

/** The admin's minimum if it's a sensible whole number, else the default. */
function minMembersFrom(setting) {
  const n = setting && setting.minMembers;
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : MIN_MEMBERS;
}

/**
 * @param {{id: string, impactByMonth?: object}[]} metricsDocs user_metrics docs
 * @param {Set<string>} adminIds left out
 * @param {string} month "YYYY-MM"
 */
function computeCommunityImpact(metricsDocs, adminIds, month, minMembers = MIN_MEMBERS) {
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
  return { month, totals, members, minMembers };
}

/** Reads the members' totals and writes community_impact/{month}. */
async function buildCommunityImpact(db, month, { FieldValue }) {
  const [metrics, admins, setting] = await Promise.all([
    db.collection('user_metrics').select('impactByMonth').get(),
    db.collection('admins').select().get(),
    db.collection('site_settings').doc('community_impact').get()
  ]);
  const summary = computeCommunityImpact(
    metrics.docs.map((d) => ({ ...d.data(), id: d.id })),
    new Set(admins.docs.map((d) => d.id)),
    month,
    minMembersFrom(setting.exists ? setting.data() : null)
  );
  await db.collection(COMMUNITY_COLLECTION).doc(month).set({ ...summary, updatedAt: FieldValue.serverTimestamp() });
  return summary;
}

module.exports = { COMMUNITY_COLLECTION, MIN_MEMBERS, buildCommunityImpact, computeCommunityImpact, minMembersFrom };
