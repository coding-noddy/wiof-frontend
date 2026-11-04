#!/usr/bin/env node
/**
 * Recompute user_metrics from accepted events (Phase 2 step 2)
 * ============================================================
 *
 * Runs functions/user-metrics.js — the same code as the backfillUserMetrics
 * callable — directly with the Admin SDK, since this project's admins sign
 * in with Google only and can't call the callable from a script. Only
 * events the server accepts count; events from before Phase 2 step 1 are
 * judged with the same checks (definitions: docs/METRICS.md).
 *
 * DRY RUN BY DEFAULT: prints each changed user's before -> after and the
 * rejected events by reason, and writes nothing. --apply writes the
 * recomputed metrics and the legacy events' verdicts. Safe to re-run.
 *
 * Usage:
 *   node scripts/recompute-user-metrics.js --project staging            # dry run
 *   node scripts/recompute-user-metrics.js --project staging --apply
 *   node scripts/recompute-user-metrics.js --project prod               # dry run
 *
 * Keys: scripts/service-account.json (staging), scripts/service-account.prod.json (prod).
 */

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

// firebase-admin is installed for the functions, not at the repo root.
const functionsRequire = createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldValue } = functionsRequire('firebase-admin/firestore');
const { recomputeUserMetrics } = require('../functions/user-metrics');

const args = process.argv.slice(2);
const target = args[args.indexOf('--project') + 1];
const apply = args.includes('--apply');
const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json' }
};
if (!args.includes('--project') || !PROJECTS[target]) {
  console.error('Usage: node scripts/recompute-user-metrics.js --project staging|prod [--apply]');
  process.exit(1);
}

const keyPath = path.resolve(__dirname, PROJECTS[target].key);
if (!fs.existsSync(keyPath)) {
  console.error(`ERROR: scripts/${PROJECTS[target].key} not found.`);
  process.exit(1);
}
const key = require(keyPath);
if (key.project_id !== PROJECTS[target].id) {
  console.error(`ERROR: ${PROJECTS[target].key} is for ${key.project_id}, not ${PROJECTS[target].id}.`);
  process.exit(1);
}

initializeApp({ credential: cert(key) });

async function main() {
  console.log(`Project: ${key.project_id}   Mode: ${apply ? 'APPLY (writes)' : 'dry run (no writes)'}\n`);
  const report = await recomputeUserMetrics(getFirestore(), { apply, FieldValue });

  console.log(`Events read:            ${report.eventsRead}`);
  console.log(`Users recomputed:       ${report.usersProcessed}`);
  console.log(`Users whose numbers change: ${report.usersChanged}`);
  console.log(`Old events judged now:  ${report.legacyEventsJudged} (${report.legacyEventsRejected} rejected)`);
  console.log('Rejected events by reason (old and new):', report.rejectedByReason);
  if (report.diffs.length) {
    console.log('\nChanges (field: before -> after):');
    for (const { uid, changes } of report.diffs) {
      const text = Object.entries(changes).map(([field, [before, after]]) => `${field}: ${before} -> ${after}`).join(', ');
      console.log(`  ${uid.slice(0, 8)}…  ${text}`);
    }
    if (report.usersChanged > report.diffs.length) {
      console.log(`  …and ${report.usersChanged - report.diffs.length} more`);
    }
  }
  console.log(apply ? '\nApplied.' : '\nDry run only: nothing was written. Re-run with --apply to write.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
