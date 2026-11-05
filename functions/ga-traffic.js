/**
 * A day's traffic from Google Analytics (GA4 Data API) for Admin →
 * Analytics (8.9.0): visitors (signed in or not), page views, and the most
 * viewed pages and page groups. GA counts everyone; our own numbers
 * (daily-stats.js) count signed-in activity.
 *
 * Off until GA4_PROPERTY_ID is set (functions/.env.<project>: the numeric
 * property ID, GA Admin → Property settings) and the functions' service
 * account has Viewer access to that property (GA Admin → Property access
 * management). Until then, and on any GA error, it returns null and the
 * page says GA isn't connected. Setup: docs/ANALYTICS.md.
 */
let client = null;

function propertyId() {
  const id = String(process.env.GA4_PROPERTY_ID || '').trim();
  return /^\d+$/.test(id) ? id : null;
}

/** [{dims: [...], values: [...numbers]}] from a runReport response. */
function rows(response) {
  return (response.rows || []).map((r) => ({
    dims: (r.dimensionValues || []).map((d) => d.value),
    values: (r.metricValues || []).map((m) => Number(m.value) || 0)
  }));
}

/**
 * @param {string} day YYYY-MM-DD, in the GA property's own time zone (set it to India time)
 * @returns {Promise<object|null>}
 */
async function fetchTraffic(day) {
  const id = propertyId();
  if (!id) return null;
  try {
    if (!client) {
      const { BetaAnalyticsDataClient } = require('@google-analytics/data');
      client = new BetaAnalyticsDataClient();
    }
    const property = `properties/${id}`;
    const dateRanges = [{ startDate: day, endDate: day }];
    const [totals, pages, groups] = await Promise.all([
      client.runReport({ property, dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }] }),
      client.runReport({
        property, dateRanges,
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 15
      }),
      client.runReport({
        property, dateRanges,
        dimensions: [{ name: 'contentGroup' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20
      })
    ]);
    const [t] = rows(totals[0]);
    return {
      users: t ? t.values[0] : 0,
      newUsers: t ? t.values[1] : 0,
      sessions: t ? t.values[2] : 0,
      pageViews: t ? t.values[3] : 0,
      topPages: rows(pages[0]).map((r) => ({ path: r.dims[0], title: r.dims[1], views: r.values[0], users: r.values[1] })),
      groups: rows(groups[0]).filter((r) => r.dims[0] && r.dims[0] !== '(not set)').map((r) => ({ group: r.dims[0], views: r.values[0] })),
      source: 'ga4'
    };
  } catch (err) {
    console.warn(JSON.stringify({ fn: 'fetchTraffic', day, error: String(err && err.message || err).slice(0, 300) }));
    return { error: 'unavailable' };
  }
}

module.exports = { fetchTraffic, propertyId };
