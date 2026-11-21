/**
 * Admin → Passport (docs/PLANET_PASSPORT_ADMIN_PROPOSAL.md): the stamp
 * definitions in passport_stamp_defs are the source of truth; the code
 * catalogue (passport-catalogue.js) is the seed and the fallback.
 *
 * - planChange: an admin's save / publish / retire / reactivate / delete,
 *   cleaned, validated and versioned (§4). Pure, so every rule is tested.
 * - loadDefinitions: what the award triggers evaluate, read from Firestore
 *   at most once a minute, skipping (and logging) any invalid definition,
 *   falling back to the code catalogue if the collection is empty or
 *   unreadable.
 */
const { ACTION_RULES, CATALOGUE, ELEMENTS, FAMILY_SHAPES, INK, MILESTONE_SHAPE, validateCatalogue } = require('./passport-catalogue');

const ELEMENT_SLUGS = new Set(ELEMENTS.map((e) => e.slug));
const text = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** The parts of a definition whose change gives it a new version (what it takes to earn it). */
function ruleKey(def) {
  const r = def.rule || {};
  return JSON.stringify([r.type, r.target, r.element || null, r.actionId || null, def.window ? [def.window.start, def.window.end] : null]);
}

/** An admin's input, cleaned into a definition (whitelisted fields only, with sensible defaults). */
function cleanInput(input) {
  const i = input || {};
  const family = text(i.family, 20);
  const element = ELEMENT_SLUGS.has(i.element) ? i.element : null;
  const rule = i.rule || {};
  const cleanRule = { type: text(rule.type, 40), target: Number(rule.target) };
  if (rule.element && ELEMENT_SLUGS.has(rule.element)) cleanRule.element = rule.element;
  if (ACTION_RULES.has(cleanRule.type)) cleanRule.actionId = text(rule.actionId, 120);
  const title = (Array.isArray(i.title) ? i.title : [i.title]).map((l) => text(l, 18)).filter(Boolean).slice(0, 2);
  let shape = text(i.shape, 20);
  if (family === 'milestone') shape = cleanRule.type === 'first_steps' ? 'circle' : MILESTONE_SHAPE[cleanRule.target] || shape;
  else if (FAMILY_SHAPES[family] && !FAMILY_SHAPES[family].has(shape)) shape = [...FAMILY_SHAPES[family]][0];
  const def = {
    id: text(i.id, 40).toLowerCase(),
    family,
    title,
    name: text(i.name, 40) || title.join(' '),
    caption: text(i.caption, 22).toUpperCase() || (element ? element.toUpperCase() : family.toUpperCase()),
    meaning: text(i.meaning, 160),
    hint: text(i.hint, 90),
    unit: text(i.unit, 20),
    element,
    shape,
    ink: HEX.test(i.ink || '') ? i.ink : INK[element || 'journey'],
    rule: cleanRule,
    order: Number.isInteger(i.order) ? i.order : 1000
  };
  if (family === 'challenge') {
    def.window = { start: text(i.window && i.window.start, 10), end: text(i.window && i.window.end, 10) };
    if (i.calendarId) def.calendarId = text(i.calendarId, 120);
  }
  return def;
}

/**
 * What an admin action does to a definition.
 * @param {object|null} existing the stored definition, if any
 * @param {object} input the admin's form (for save; ignored by status actions)
 * @param {'save'|'publish'|'retire'|'reactivate'|'delete'} action
 * @returns {{ ok: true, def: object|null, deleted?: boolean, versionBumped: boolean } | { ok: false, error: string }}
 *   def null with deleted: the draft is removed.
 */
function planChange(existing, input, action) {
  const published = !!existing && existing.status !== 'draft';
  if (action === 'delete') {
    if (!existing) return { ok: false, error: 'No such badge.' };
    if (published || existing.everPublished) return { ok: false, error: 'A published badge is retired, never deleted.' };
    return { ok: true, def: null, deleted: true, versionBumped: false };
  }
  if (['publish', 'retire', 'reactivate'].includes(action)) {
    if (!existing) return { ok: false, error: 'Save the badge first.' };
    const from = existing.status;
    const allowed = { publish: 'draft', retire: 'active', reactivate: 'retired' }[action];
    if (from !== allowed) return { ok: false, error: `Only a ${allowed} badge can be ${action === 'reactivate' ? 'reactivated' : action + 'ed'}.` };
    const to = action === 'retire' ? 'retired' : 'active';
    const def = { ...existing, status: to, ...(to === 'active' ? { everPublished: true } : {}) };
    const problems = validateCatalogue([def]);
    if (problems.length) return { ok: false, error: problems.join('; ') };
    return { ok: true, def, versionBumped: false };
  }
  if (action !== 'save') return { ok: false, error: 'Unknown action.' };

  const def = cleanInput(input);
  if (existing) {
    if (def.id !== existing.id) return { ok: false, error: 'A badge keeps its ID.' };
    if (published && def.family !== existing.family) return { ok: false, error: 'A published badge keeps its family.' };
    if (published && def.rule.type !== (existing.rule || {}).type) return { ok: false, error: 'A published badge keeps its kind of rule; make a new badge instead.' };
  }
  const bump = published && ruleKey(def) !== ruleKey(existing);
  const full = {
    ...def,
    status: existing ? existing.status : 'draft',
    version: existing ? (existing.version || 1) + (bump ? 1 : 0) : 1,
    ...(existing && existing.everPublished ? { everPublished: true } : {})
  };
  const problems = validateCatalogue([full]);
  if (problems.length) return { ok: false, error: problems.join('; ') };
  return { ok: true, def: full, versionBumped: bump };
}

/** The fields an audit record keeps of a definition (no timestamps or bookkeeping). */
function auditSnapshot(def) {
  if (!def) return null;
  const { syncedAt, updatedAt, updatedBy, ...rest } = def;
  return rest;
}

let cache = { at: 0, defs: null };

/**
 * The definitions the server evaluates: active and retired ones from Firestore (retired ones are
 * kept so their display stays, but evaluate() awards only active ones). Invalid ones are skipped.
 */
async function loadDefinitions(db, { maxAgeMs = 60 * 1000, log = console } = {}) {
  if (cache.defs && Date.now() - cache.at < maxAgeMs) return cache.defs;
  let defs = CATALOGUE;
  try {
    const snap = await db.collection('passport_stamp_defs').where('status', 'in', ['active', 'retired']).get();
    const read = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    const valid = read.filter((d) => {
      const problems = validateCatalogue([d]);
      if (problems.length) log.warn(JSON.stringify({ fn: 'loadDefinitions', skipped: d.id, problems }));
      return !problems.length;
    });
    if (valid.length) defs = valid;
  } catch (error) {
    log.warn(JSON.stringify({ fn: 'loadDefinitions', fallback: 'code catalogue', error: String(error && error.message) }));
  }
  cache = { at: Date.now(), defs };
  return defs;
}

/** For tests: forget the cached definitions. */
function resetDefinitionsCache() {
  cache = { at: 0, defs: null };
}

module.exports = { auditSnapshot, cleanInput, loadDefinitions, planChange, resetDefinitionsCache, ruleKey };
