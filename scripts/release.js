/**
 * Release and rollback for a backend + Hosting deploy (written for Phase 2,
 * 8.4.0–8.8.0; works for any later release). The full sequence is in
 * docs/PHASE2_RELEASE_RUNBOOK.md: follow that, not this file alone.
 *
 * Steps:
 *   preflight     read-only: what is live (Hosting version, rules, functions,
 *                 indexes) against this checkout. Reports index drift (live
 *                 indexes missing from firestore.indexes.json, and the other
 *                 way round) and functions this release adds or removes.
 *   snapshot      read-only: save what is DEPLOYED (rules as live, indexes,
 *                 the live Hosting version, functions) to
 *                 scripts/backups/<project>-release-<stamp>/ with a
 *                 ROLLBACK.md for exactly that state. Run right before the deploy.
 *   wait-indexes  block until every composite index is READY.
 *   verify        read-only checks after the deploy and the data scripts;
 *                 exits 1 on any failure.
 *   rollback      put back what the snapshot recorded: --only hosting|rules|functions|all
 *                 (default all; Hosting first). Dry run (prints the commands)
 *                 unless --apply. Needs --snapshot <dir>.
 *
 * Usage:
 *   node scripts/release.js preflight --project staging|prod
 *   node scripts/release.js snapshot  --project staging|prod
 *   node scripts/release.js wait-indexes --project staging|prod
 *   node scripts/release.js verify    --project staging|prod [--snapshot <dir>]
 *   node scripts/release.js rollback  --project staging|prod --snapshot <dir> [--only hosting] [--apply]
 *
 * Keys (gitignored): scripts/service-account.json (staging),
 * scripts/service-account.prod.json (prod); --key overrides. Functions are
 * listed and deployed with the Firebase CLI under your own login.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { createRequire } = require('module');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const functionsRequire = createRequire(path.join(REPO, 'functions', 'package.json'));
const { initializeApp, cert } = functionsRequire('firebase-admin/app');
const { getFirestore } = functionsRequire('firebase-admin/firestore');

const PROJECTS = {
  staging: { id: 'wiof-staging', key: 'service-account.json', url: 'https://wiof-staging.web.app' },
  prod: { id: 'wiof-production', key: 'service-account.prod.json', url: 'https://wiof-production.web.app' }
};

// ── args ────────────────────────────────────────────────────────────────────

const [step, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const option = (name, fallback) => {
  const i = rest.indexOf(name);
  return i >= 0 && rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : fallback;
};
const APPLY = flag('--apply');
const TARGET = option('--project');
if (!PROJECTS[TARGET]) {
  console.error('ERROR: pass --project staging or --project prod (no default, on purpose).');
  process.exit(1);
}
const PROJECT = PROJECTS[TARGET].id;

let app = null;
let credential = null;
function db() {
  if (!app) {
    const keyPath = path.resolve(option('--key', path.join(__dirname, PROJECTS[TARGET].key)));
    if (!fs.existsSync(keyPath)) {
      console.error(`ERROR: service account key not found at ${keyPath}`);
      process.exit(1);
    }
    const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    if (key.project_id !== PROJECT) {
      console.error(`ERROR: ${keyPath} is for "${key.project_id}", expected "${PROJECT}". Refusing to continue.`);
      process.exit(1);
    }
    credential = cert(key);
    app = initializeApp({ credential, projectId: PROJECT });
  }
  return getFirestore(app);
}

async function apiGet(url) {
  db();
  const { access_token: token } = await credential.getAccessToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${(body.error && body.error.message) || url}`);
  return body;
}

// firebase and npm are .cmd shims on Windows and need a shell; git doesn't
// (and a shell would split its arguments).
const needsShell = (cmd) => cmd !== 'git';

function run(cmd, args, opts = {}) {
  const out = spawnSync(cmd, args, { shell: needsShell(cmd), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (out.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${(out.stderr || out.stdout || '').trim().slice(0, 400)}`);
  return out.stdout;
}

const heading = (title) => console.log(`\n=== ${title} — ${PROJECT} ===\n`);

// ── what is live ────────────────────────────────────────────────────────────

/** "Collection(field ASC, field DESC)" — comparable between the API and firestore.indexes.json. */
function indexKey(collectionGroup, queryScope, fields) {
  const parts = (fields || [])
    .filter((f) => f.fieldPath !== '__name__')
    .map((f) => `${f.fieldPath} ${f.order || f.arrayConfig || ''}`.trim());
  return `${collectionGroup}${queryScope && queryScope !== 'COLLECTION' ? ` [${queryScope}]` : ''}(${parts.join(', ')})`;
}

async function liveIndexes() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/collectionGroups/-/indexes`;
  return ((await apiGet(url)).indexes || [])
    .filter((i) => (i.fields || []).filter((f) => f.fieldPath !== '__name__').length > 1)
    .map((i) => ({ key: indexKey(i.name.split('/collectionGroups/')[1].split('/')[0], i.queryScope, i.fields), state: i.state }));
}

function repoIndexes() {
  const file = JSON.parse(fs.readFileSync(path.join(REPO, 'firestore.indexes.json'), 'utf8'));
  return (file.indexes || []).map((i) => indexKey(i.collectionGroup, i.queryScope, i.fields));
}

function sourceFunctions() {
  const src = fs.readFileSync(path.join(REPO, 'functions', 'index.js'), 'utf8');
  return [...src.matchAll(/^exports\.([A-Za-z0-9_]+)\s*=/gm)].map((m) => m[1]).sort();
}

function liveFunctions() {
  const parsed = JSON.parse(run('firebase', ['functions:list', '--project', PROJECT, '--json']));
  return (parsed.result || []).map((f) => ({ name: f.id || f.entryPoint, region: f.region }));
}

async function liveHosting() {
  const releases = (await apiGet(`https://firebasehosting.googleapis.com/v1beta1/sites/${PROJECT}/releases?pageSize=5`)).releases || [];
  const live = releases[0];
  return {
    versionId: live ? live.version.name.split('/').pop() : null,
    releaseTime: live && live.releaseTime,
    recent: releases.map((r) => ({ version: r.version.name.split('/').pop(), time: r.releaseTime, type: r.type }))
  };
}

const lastTag = () => run('git', ['tag', '--list', `v*-${TARGET}`, '--sort=-creatordate']).split('\n').filter(Boolean)[0] || null;

// ── preflight ───────────────────────────────────────────────────────────────

async function preflight() {
  heading('Preflight (read-only)');
  const version = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const dirty = run('git', ['status', '--porcelain']).split('\n').filter(Boolean);
  console.log(`Checkout: ${branch} at ${run('git', ['log', '-1', '--format=%h %s']).trim()} (package ${version})`);
  console.log(`Last ${TARGET} tag: ${lastTag() || '(none)'}`);
  if (dirty.length) console.log(`WARN  uncommitted changes (the deploy builds them):\n  ${dirty.join('\n  ')}`);

  const hosting = await liveHosting();
  console.log(`\nHosting live version: ${hosting.versionId} (released ${hosting.releaseTime})`);

  console.log('\nComposite indexes:');
  const live = await liveIndexes();
  const repo = repoIndexes();
  const liveKeys = new Set(live.map((i) => i.key));
  const missingFromRepo = live.filter((i) => !repo.includes(i.key));
  const newInRepo = repo.filter((k) => !liveKeys.has(k));
  console.log(`  live ${live.length}, in firestore.indexes.json ${repo.length}`);
  newInRepo.forEach((k) => console.log(`  NEW   ${k}  (this deploy creates it)`));
  missingFromRepo.forEach((i) => console.log(`  DRIFT ${i.key}  (live, not in firestore.indexes.json: kept by a normal deploy, deleted only by --force)`));
  live.filter((i) => i.state !== 'READY').forEach((i) => console.log(`  BUILDING ${i.key} (${i.state})`));

  console.log('\nCloud Functions:');
  try {
    const liveFns = liveFunctions();
    const liveNames = new Set(liveFns.map((f) => f.name));
    const src = sourceFunctions();
    src.filter((n) => !liveNames.has(n)).forEach((n) => console.log(`  NEW     ${n}`));
    liveFns.filter((f) => !src.includes(f.name)).forEach((f) => console.log(`  REMOVED ${f.name}@${f.region}  (the deploy will ask to delete it)`));
    console.log(`  live ${liveFns.length}, in functions/index.js ${src.length}`);
  } catch (e) {
    console.log(`  could not list functions (${e.message.split('\n')[0]}); run: firebase login`);
  }
  console.log('\nNext: node scripts/release.js snapshot --project ' + TARGET);
}

// ── snapshot ────────────────────────────────────────────────────────────────

async function snapshot() {
  heading('Snapshot what is deployed (read-only)');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, 'backups', `${TARGET}-release-${stamp}`);
  const rollbackDir = path.join(dir, 'rollback');
  fs.mkdirSync(rollbackDir, { recursive: true });

  // Rules, exactly as live.
  const rulesApi = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;
  const releases = (await apiGet(`${rulesApi}/releases`)).releases || [];
  const rules = {};
  for (const [service, prefix] of [['firestore', 'cloud.firestore'], ['storage', 'firebase.storage/']]) {
    const rel = releases.find((r) => r.name.split('/releases/')[1].startsWith(prefix));
    if (!rel) continue;
    const ruleset = await apiGet(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
    fs.writeFileSync(path.join(rollbackDir, `${service}.rules`), ruleset.source.files.map((f) => f.content).join('\n'));
    rules[service] = { ruleset: rel.rulesetName, liveSince: rel.updateTime };
    console.log(`  saved rollback/${service}.rules (live since ${rel.updateTime})`);
  }
  fs.writeFileSync(path.join(rollbackDir, 'firebase.json'), JSON.stringify({
    firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
    storage: { rules: 'storage.rules' }
  }, null, 2));
  fs.writeFileSync(path.join(rollbackDir, 'firestore.indexes.json'), run('firebase', ['firestore:indexes', '--project', PROJECT]));
  console.log('  saved rollback/firestore.indexes.json (for the record; a rollback never needs to delete indexes)');

  const hosting = await liveHosting();
  let functions = [];
  try {
    functions = liveFunctions();
  } catch (e) {
    console.log(`  WARN could not list functions (${e.message.split('\n')[0]}); the functions rollback will need them`);
  }
  const tag = lastTag();
  const meta = {
    project: PROJECT,
    target: TARGET,
    takenAt: new Date().toISOString(),
    hostingVersion: hosting.versionId,
    hosting,
    rules,
    functions,
    // The source live functions were deployed from: the last tag for this target.
    functionsSourceTag: tag,
    releasing: JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version,
    gitHead: run('git', ['log', '-1', '--format=%H %s']).trim()
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('  saved meta.json');

  const rel = path.relative(REPO, dir).replace(/\\/g, '/');
  fs.writeFileSync(path.join(dir, 'ROLLBACK.md'), `# Rollback for ${PROJECT}

Snapshot taken ${meta.takenAt}, before releasing ${meta.releasing}. Live then:
Hosting version \`${hosting.versionId}\`, functions from \`${tag || 'unknown tag'}\`.

Automated (dry run first; add --apply to do it):

\`\`\`
node scripts/release.js rollback --project ${TARGET} --snapshot ${rel} --only hosting
node scripts/release.js rollback --project ${TARGET} --snapshot ${rel} --only rules
node scripts/release.js rollback --project ${TARGET} --snapshot ${rel} --only functions
\`\`\`

Order and when to stop:

1. **Hosting** (about a minute; fixes anything users see): the site goes back to version ${hosting.versionId}.
   The old site works with the new rules and functions, so this alone is usually enough.
   Manual: \`firebase hosting:clone ${PROJECT}@${hosting.versionId} ${PROJECT}:live\`,
   or Console > Hosting > Release history > that version > Rollback.
2. **Rules**, only if the new rules are the problem: deploys rollback/firestore.rules and storage.rules exactly as they were live.
3. **Functions**, only if a function is the problem: deletes the functions this release added
   (for Phase 2: onActionWritten, onEnvcalWritten, buildDailyStats, refreshDailyStats) and redeploys ${tag || 'the last tag'}'s functions from a temporary git worktree.

Data: Phase 2 only ADDS data (related_auto, user_metrics.qualityReadsByElement, users.onboarding,
Envcal facts, EQ slots in activity_log); the old app ignores it and the old rules allow it
(profile updates check only the fields that change), so no data restore is needed.
`);
  console.log('  saved ROLLBACK.md');
  console.log(`\nSnapshot: ${rel}`);
  console.log(`Hosting ${hosting.versionId}, ${functions.length} functions, functions source ${tag}`);
}

// ── wait-indexes ────────────────────────────────────────────────────────────

async function waitIndexes() {
  heading('Wait for composite indexes');
  const deadline = Date.now() + 20 * 60 * 1000;
  for (;;) {
    const indexes = await liveIndexes();
    const pending = indexes.filter((i) => i.state !== 'READY');
    console.log(`  ${indexes.length - pending.length}/${indexes.length} READY${pending.length ? `; building: ${pending.map((i) => i.key).join('; ')}` : ''}`);
    if (!pending.length) return;
    if (Date.now() > deadline) throw new Error('indexes still building after 20 minutes; check Firestore > Indexes in the Console');
    await new Promise((r) => setTimeout(r, 30000));
  }
}

// ── verify ──────────────────────────────────────────────────────────────────

async function verify() {
  heading('Verify (read-only)');
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  };
  const info = (text) => console.log(`INFO  ${text}`);

  const snapDir = option('--snapshot');
  const meta = snapDir ? JSON.parse(fs.readFileSync(path.resolve(snapDir, 'meta.json'), 'utf8')) : null;
  const hosting = await liveHosting();
  if (meta) check('Hosting serves a new version', hosting.versionId !== meta.hostingVersion, `${meta.hostingVersion} -> ${hosting.versionId}`);
  else info(`Hosting live version ${hosting.versionId} (pass --snapshot to check it changed)`);

  for (const page of ['/', '/home', '/privacy-policy', '/take-action']) {
    const res = await fetch(PROJECTS[TARGET].url + page).catch(() => null);
    check(`page ${page} loads`, !!res && res.ok, res ? String(res.status) : 'no response');
  }

  try {
    const liveNames = new Set(liveFunctions().map((f) => f.name));
    const missing = sourceFunctions().filter((n) => !liveNames.has(n));
    check('every function in functions/index.js is deployed', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${liveNames.size} live`);
  } catch (e) {
    info(`could not list functions (${e.message.split('\n')[0]})`);
  }

  const live = await liveIndexes();
  const liveKeys = new Set(live.filter((i) => i.state === 'READY').map((i) => i.key));
  const notReady = repoIndexes().filter((k) => !liveKeys.has(k));
  check('every index in firestore.indexes.json is live and READY', notReady.length === 0, notReady.join('; ') || `${liveKeys.size} READY`);

  const store = db();
  const auto = await store.collection('related_auto').select().get();
  const byPrefix = (p) => auto.docs.filter((d) => d.id.startsWith(p)).length;
  check('related content matches are built (run rebuild-related-content.js --apply)', byPrefix('blog_') > 0 && byPrefix('action_') > 0,
    `blog ${byPrefix('blog_')}, action ${byPrefix('action_')}, occasion ${byPrefix('occasion_')}`);
  check('calendar occasions are matched too', byPrefix('occasion_') > 0, `${byPrefix('occasion_')} occasion lists`);

  const metrics = await store.collection('user_metrics').get();
  const readers = metrics.docs.filter((d) => (d.get('qualityReads') || 0) > 0);
  const stale = readers.filter((d) => !d.get('qualityReadsByElement'));
  check('per-element reads are recomputed (run recompute-user-metrics.js --apply)', stale.length === 0, `${readers.length - stale.length}/${readers.length} readers`);

  const envcal = await store.collection('Envcal').get();
  const withFact = envcal.docs.filter((d) => (d.get('fact') || '').trim());
  info(`${withFact.length}/${envcal.size} occasions have a fact (${withFact.filter((d) => d.get('factStatus') === 'draft').length} draft, awaiting admin review)`);

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  console.log('Then the manual check in docs/PHASE2_RELEASE_RUNBOOK.md (about 10 minutes, signed in and out).');
  if (failed) process.exit(1);
}

// ── rollback ────────────────────────────────────────────────────────────────

async function rollback() {
  const snapDir = option('--snapshot');
  if (!snapDir) throw new Error('pass --snapshot <dir> (from the snapshot step)');
  const dir = path.resolve(snapDir);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  if (meta.project !== PROJECT) throw new Error(`snapshot is for ${meta.project}, not ${PROJECT}`);
  const only = option('--only', 'all');
  const parts = only === 'all' ? ['hosting', 'rules', 'functions'] : [only];
  if (!parts.every((p) => ['hosting', 'rules', 'functions'].includes(p))) throw new Error('--only is hosting, rules, functions or all');
  heading(`Rollback ${parts.join(' + ')} to the snapshot of ${meta.takenAt} — ${APPLY ? 'APPLY' : 'DRY RUN (add --apply)'}`);

  const steps = [];
  if (parts.includes('hosting')) {
    steps.push({ what: `Hosting back to version ${meta.hostingVersion}`, cmd: 'firebase', args: ['hosting:clone', `${PROJECT}@${meta.hostingVersion}`, `${PROJECT}:live`] });
  }
  if (parts.includes('rules')) {
    steps.push({ what: 'Firestore + Storage rules exactly as they were live', cmd: 'firebase', args: ['deploy', '--only', 'firestore:rules,storage', '--project', PROJECT], cwd: path.join(dir, 'rollback') });
  }
  if (parts.includes('functions')) {
    if (!meta.functions.length || !meta.functionsSourceTag) throw new Error('the snapshot has no functions list or source tag; roll functions back by hand');
    const before = new Set(meta.functions.map((f) => f.name));
    const added = liveFunctions().filter((f) => !before.has(f.name));
    for (const f of added) {
      steps.push({ what: `delete ${f.name} (added by this release)`, cmd: 'firebase', args: ['functions:delete', f.name, '--region', f.region, '--project', PROJECT, '--force'] });
    }
    const tree = path.join(os.tmpdir(), `wiof-rollback-${meta.functionsSourceTag}`);
    steps.push({ what: `check out ${meta.functionsSourceTag} in a temporary worktree`, cmd: 'git', args: ['worktree', 'add', '--force', tree, meta.functionsSourceTag] });
    steps.push({ what: 'install its functions dependencies', cmd: 'npm', args: ['ci'], cwd: path.join(tree, 'functions') });
    steps.push({ what: `redeploy ${meta.functionsSourceTag}'s functions`, cmd: 'firebase', args: ['deploy', '--only', 'functions', '--project', PROJECT], cwd: tree });
    steps.push({ what: 'remove the temporary worktree', cmd: 'git', args: ['worktree', 'remove', '--force', tree] });
  }

  for (const s of steps) {
    console.log(`- ${s.what}\n    ${s.cwd ? `(in ${path.relative(REPO, s.cwd) || '.'}) ` : ''}${s.cmd} ${s.args.join(' ')}`);
    if (APPLY) {
      const out = spawnSync(s.cmd, s.args, { shell: needsShell(s.cmd), stdio: 'inherit', cwd: s.cwd || REPO });
      if (out.status !== 0) throw new Error(`step failed: ${s.what}. Nothing after it ran; see ROLLBACK.md to finish by hand.`);
    }
  }
  console.log(APPLY ? '\nRollback done. Check the site, then: node scripts/release.js preflight --project ' + TARGET : '\nDry run. Add --apply to run these.');
}

// ── main ────────────────────────────────────────────────────────────────────

const STEPS = { preflight, snapshot, 'wait-indexes': waitIndexes, verify, rollback };
if (!STEPS[step]) {
  console.error(`Usage: node scripts/release.js <${Object.keys(STEPS).join('|')}> --project staging|prod [...]`);
  process.exit(1);
}
STEPS[step]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message || err);
    process.exit(1);
  });
