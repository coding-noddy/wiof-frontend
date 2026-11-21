/**
 * Planet Passport challenges (Admin → Passport §3.4): badges with a date
 * window, where only activity inside the window counts.
 *
 * Progress is kept per member and challenge in
 * passport_challenge_progress/{uid}_{challengeId} (server-only), as the set
 * of different actions or stories that counted, or the completions of one
 * action. When it reaches the target, the stamp is created in the same
 * transaction, once. Windows are India-time days (like the ladder), from
 * window.start to window.end inclusive.
 *
 * Rule types:
 *  - window_actions:          different actions done in the window (optionally in one element)
 *  - window_stories:          different stories read to the end (optionally in one element)
 *  - window_specific_action:  completions of one action in the window
 */
const { RULES_VERSION } = require('./passport-catalogue');
const { istDay, stampDocId, stampRecord } = require('./passport');

/** Challenges open on a given India-time day. */
function openChallenges(defs, day) {
  return (defs || []).filter((d) => d.family === 'challenge' && d.status === 'active' && d.window && d.window.start <= day && day <= d.window.end);
}

/**
 * The key this event adds to a challenge's progress, or null if it doesn't count.
 * @param {object} challenge a challenge definition
 * @param {{kind: 'action'|'story', id: string, elements?: string[], element?: string|null, completionNumber?: number}} event
 */
function progressKey(challenge, event) {
  const rule = challenge.rule || {};
  if (rule.type === 'window_actions' && event.kind === 'action') {
    if (rule.element && !(event.elements || []).includes(rule.element)) return null;
    return event.id; // different actions: a repeat adds nothing
  }
  if (rule.type === 'window_stories' && event.kind === 'story') {
    if (rule.element && event.element !== rule.element) return null;
    return event.id;
  }
  if (rule.type === 'window_specific_action' && event.kind === 'action' && event.id === rule.actionId) {
    return `${event.id}#${event.completionNumber || 0}`; // each completion counts
  }
  return null;
}

/** Progress after one more key (keys are unique; at most 200 kept, far above any target). */
function nextProgress(progress, key) {
  const keys = Array.isArray(progress && progress.keys) ? progress.keys : [];
  if (!key || keys.includes(key)) return { keys, changed: false };
  return { keys: [...keys, key].slice(-200), changed: true };
}

/**
 * Records one member event against every open challenge it fits; awards the stamp when a target is reached.
 * @returns {Promise<string[]>} the challenge stamps this event awarded
 */
async function recordChallengeEvent(db, uid, event, { defs, FieldValue }) {
  if (!uid || !event || !event.timestamp) return [];
  const day = istDay(event.timestamp);
  const awarded = [];
  for (const challenge of openChallenges(defs, day)) {
    const key = progressKey(challenge, event);
    if (!key) continue;
    const progressRef = db.collection('passport_challenge_progress').doc(`${uid}_${challenge.id}`);
    const stampRef = db.collection('passport_stamps').doc(stampDocId(uid, challenge.id));
    const done = await db.runTransaction(async (tx) => {
      const [progressSnap, stampSnap] = await Promise.all([tx.get(progressRef), tx.get(stampRef)]);
      const next = nextProgress(progressSnap.exists ? progressSnap.data() : null, key);
      if (!next.changed) return false;
      tx.set(progressRef, {
        userId: uid, challengeId: challenge.id, defVersion: challenge.version || 1, keys: next.keys, count: next.keys.length,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      if (next.keys.length >= challenge.rule.target && !stampSnap.exists) {
        tx.create(stampRef, stampRecord(uid, {
          stampId: challenge.id, defVersion: challenge.version || 1, ruleVersion: RULES_VERSION,
          evidence: { rule: challenge.rule.type, target: challenge.rule.target, value: next.keys.length, window: challenge.window }
        }, { earnedAt: FieldValue.serverTimestamp(), source: 'challenge' }));
        return true;
      }
      return false;
    });
    if (done) awarded.push(challenge.id);
  }
  return awarded;
}

module.exports = { nextProgress, openChallenges, progressKey, recordChallengeEvent };
