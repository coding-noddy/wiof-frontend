/**
 * Planet Passport v1: writes the stamps a member has newly earned
 * (docs/PLANET_PASSPORT_V1_PROPOSAL.md §3.5). Called by the award triggers
 * (functions/index.js) whenever a member's user_metrics, or the
 * profile fields the rules read, change.
 *
 * - Reads only server-trusted state: user_metrics and the profile's
 *   server-written longestStreak, plus the member's chosen elements.
 * - Each stamp is created once at passport_stamps/{uid}_{stampId}, with
 *   create(): a stamp that already exists (a retry, a concurrent trigger)
 *   fails with ALREADY_EXISTS and is skipped, so two runs can never make two
 *   records or change a date.
 * - The Passport is issued (passport_holders/{uid}) with Earthrise (D5).
 * - Nothing is ever removed here; a lower count later changes nothing.
 *
 * Firestore is passed in, so passport-awards.test.js runs on a fake.
 */
const { CATALOGUE_VERSION } = require('./passport-catalogue');
const { ISSUING_STAMP, newAwards, stampDocId, stampRecord } = require('./passport');

const ALREADY_EXISTS = 6;
const isAlreadyExists = (error) => error && (error.code === ALREADY_EXISTS || error.code === 'already-exists');

/** Creates a doc unless it exists; true if this call created it. */
async function createOnce(ref, data) {
  try {
    await ref.create(data);
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) return false;
    throw error;
  }
}

/** The member's state, as the evaluator reads it. */
async function loadState(db, uid) {
  const [metricsSnap, profileSnap] = await Promise.all([
    db.collection('user_metrics').doc(uid).get(),
    db.collection('users').doc(uid).get()
  ]);
  const profile = profileSnap.exists ? profileSnap.data() : {};
  return {
    metrics: metricsSnap.exists ? metricsSnap.data() : {},
    profile: { longestStreak: profile.longestStreak || 0, preferredElements: profile.preferredElements || [] }
  };
}

/**
 * Awards whatever the member has newly earned.
 * @returns {Promise<{awarded: string[], issued: boolean}>} the stamps this run created, and whether it issued the Passport
 */
async function awardStamps(db, uid, { FieldValue, source = 'trigger' }) {
  if (!uid) return { awarded: [], issued: false };
  const [state, existingSnap] = await Promise.all([
    loadState(db, uid),
    db.collection('passport_stamps').where('userId', '==', uid).get()
  ]);
  const existing = existingSnap.docs.map((doc) => doc.get('stampId'));
  const awards = newAwards(state, existing);

  const created = await Promise.all(awards.map((award) => createOnce(
    db.collection('passport_stamps').doc(stampDocId(uid, award.stampId)),
    stampRecord(uid, award, { earnedAt: FieldValue.serverTimestamp(), source })
  )));
  const awarded = awards.filter((_, i) => created[i]).map((a) => a.stampId);

  let issued = false;
  if (existing.includes(ISSUING_STAMP) || awarded.includes(ISSUING_STAMP)) {
    issued = await createOnce(db.collection('passport_holders').doc(uid), {
      userId: uid, issuedAt: FieldValue.serverTimestamp(), catalogueVersion: CATALOGUE_VERSION, source
    });
  }
  return { awarded, issued };
}

/**
 * Whether a user_metrics write should be evaluated. Skips deletes and the
 * metrics recompute: it marks each of its writes with a new recomputeRun
 * value, and its stamps come with real dates from the backfill instead (R2).
 */
function shouldEvaluateMetricsWrite(before, after) {
  if (!after) return false;
  return ((before && before.recomputeRun) || null) === (after.recomputeRun || null);
}

/** Whether a users/{uid} write changed anything the rules read (most profile writes are lastLogin). */
function shouldEvaluateProfileWrite(before, after) {
  if (!after) return false;
  const pick = (p) => JSON.stringify([p ? p.longestStreak || 0 : 0, p ? p.preferredElements || [] : []]);
  return pick(before) !== pick(after);
}

module.exports = { awardStamps, createOnce, loadState, shouldEvaluateMetricsWrite, shouldEvaluateProfileWrite };
