/**
 * Builds the Admin → Analytics daily summaries (analytics_daily/{day},
 * functions/daily-stats.js) for past days, e.g. the last 90 after the first
 * deploy. Dry run (prints each day) unless --apply. Google Analytics traffic
 * isn't fetched here; the scheduled buildDailyStats function and the admin
 * page's Refresh add it once GA is connected (docs/ANALYTICS.md).
 *
 *   node scripts/daily-stats.js --project staging|prod [--days 90] [--day 2026-11-05] [--apply]
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = functionsRequire('firebase-admin/firestore');
const { addDays, buildDailyStatsDoc, istDay } = require('../functions/daily-stats');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const APPLY = args.includes('--apply');
const PROJECTS = { staging: ['wiof-staging', 'service-account.json'], prod: ['wiof-production', 'service-account.prod.json'] };
const target = option('--project');
if (!PROJECTS[target]) {
  console.error('Usage: node scripts/daily-stats.js --project staging|prod [--days 90] [--day YYYY-MM-DD] [--apply]');
  process.exit(1);
}
const [projectId, keyFile] = PROJECTS[target];
const key = JSON.parse(fs.readFileSync(path.join(__dirname, keyFile), 'utf8'));
if (key.project_id !== projectId) {
  console.error(`Key is for ${key.project_id}, not ${projectId}. Refusing to run.`);
  process.exit(1);
}
initializeApp({ credential: cert(key), projectId });
const db = getFirestore();

(async () => {
  const last = option('--day', istDay());
  const days = Math.min(Math.max(Number(option('--days', 1)) || 1, 1), 366);
  console.log(`${projectId}: ${days} day(s) to ${last} — ${APPLY ? 'APPLY' : 'DRY RUN (add --apply)'}\n`);
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(last, -i);
    const s = await buildDailyStatsDoc(db, day, { Timestamp, FieldValue, write: APPLY });
    const clicks = Object.entries(s.suggestions).filter(([, v]) => v.clicks).map(([k, v]) => `${k} ${v.converted}/${v.clicks}`).join(', ');
    console.log(`${day}  active ${s.users.active}, engaged ${s.users.engaged}, new ${s.users.new} | reads ${s.totals.qualityReads}, videos ${s.totals.videosCompleted}, actions ${s.totals.actionsCompleted}, EQ ${s.totals.eqChecks}${clicks ? ` | suggestions ${clicks}` : ''}`);
  }
  console.log(APPLY ? `\nWrote ${days} day(s).` : '\nDry run: nothing written.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
