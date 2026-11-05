/**
 * Firestore Security Rules — emulator regression tests
 * =====================================================
 *
 * Runs firestore.rules against the Firestore emulator so a rules change that
 * silently reopens a hole (like the admin self-escalation and poll email/IP
 * exposure this suite was written to guard) fails a test instead of shipping.
 *
 * Requires the Firestore emulator — run via:
 *   npm run test:rules
 * (wraps `firebase emulators:exec`, which starts/stops the emulator around
 * `node --test tests/rules`).
 */

const { readFileSync } = require('fs');
const path = require('path');
const { describe, it, before, beforeEach, after } = require('node:test');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const PROJECT_ID = 'demo-wiof-rules-test';
const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

/** A minimally valid profile payload matching isValidOwnProfileCreate()'s allowed keys. */
function validProfile(uid, overrides = {}) {
  return {
    uid,
    displayName: 'Test User',
    email: `${uid}@test.com`,
    photoURL: '',
    role: 'public',
    joinedDate: new Date(),
    preferredElements: [],
    lastLogin: new Date(),
    loginCount: 1,
    daysVisited: 1,
    currentStreak: 1,
    savedBlogsCount: 0,
    ...overrides
  };
}

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080
    }
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Writes data via the Admin SDK path, bypassing security rules entirely — for seeding fixtures. */
async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await fn(context.firestore());
  });
}

describe('users/{userId}', () => {
  it('denies a client creating their own profile — createUserProfile (Cloud Function) is the only path', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').set(validProfile('alice'))
    );
  });

  it('denies a create with role "admin" too (belt-and-braces — create is unconditionally denied)', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      db.collection('users').doc('mallory').set(validProfile('mallory', { role: 'admin' }))
    );
  });

  it('denies creating a profile document for someone else', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      db.collection('users').doc('alice').set(validProfile('alice'))
    );
  });

  it('lets the owner update an editable field', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      db.collection('users').doc('alice').update({ displayName: 'Alice Updated' })
    );
  });

  it('lets the owner update firstName/lastName (Settings page name split)', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      db.collection('users').doc('alice').update({
        firstName: 'Alice', lastName: 'Updated', displayName: 'Alice Updated'
      })
    );
  });

  it('lets the owner choose up to five known elements, and nothing else', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    const ref = db.collection('users').doc('alice');
    await assertSucceeds(ref.update({ preferredElements: ['water', 'earth'] }));
    await assertFails(ref.update({ preferredElements: ['water', 'fire'] }));
    await assertFails(ref.update({ preferredElements: 'water' }));
    await assertFails(ref.update({ preferredElements: ['air', 'water', 'earth', 'energy', 'spirit', 'air'] }));
  });

  it('keeps a legacy preferredElements value from blocking an unrelated edit', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice', { preferredElements: ['Old Value'] })));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('users').doc('alice').update({ displayName: 'Alice' }));
  });

  it('lets the owner record the welcome and the checklist dismissal with the server clock', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    const ref = db.collection('users').doc('alice');
    await assertSucceeds(ref.update({ 'onboarding.welcomeDoneAt': serverTimestamp(), preferredElements: ['air'] }));
    await assertSucceeds(ref.update({ 'onboarding.checklistDismissedAt': serverTimestamp() }));
  });

  it('denies a backdated, changed, removed or padded onboarding record', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    const ref = db.collection('users').doc('alice');
    await assertFails(ref.update({ 'onboarding.welcomeDoneAt': new Date('2020-01-01') }));
    await assertFails(ref.update({ 'onboarding.badge': serverTimestamp() }));
    await assertFails(ref.update({ onboarding: 'done' }));
    await assertSucceeds(ref.update({ 'onboarding.welcomeDoneAt': serverTimestamp() }));
    await assertFails(ref.update({ 'onboarding.welcomeDoneAt': serverTimestamp() }));
    await assertFails(ref.update({ onboarding: {} }));
  });

  it('denies the owner changing their own role via update', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').update({ role: 'admin' })
    );
  });

  it('denies the owner writing an unlisted field via update', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').update({ isSuperAdmin: true })
    );
  });

  it('denies the owner inflating their own login count directly (the exact gap this fix closed)', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').update({ loginCount: 999999 })
    );
  });

  it('denies the owner forging their own streak directly', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').update({ currentStreak: 365, daysVisited: 365 })
    );
  });

  it('denies the owner resetting their own counters directly (resetEngagementCounters Cloud Function is the only path)', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('users').doc('alice').update({ loginCount: 0, daysVisited: 0, currentStreak: 0, savedBlogsCount: 0 })
    );
  });

  it("denies a user reading another user's profile", async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('users').doc('alice').get());
  });

  it('denies an unauthenticated read', async () => {
    await seed((db) => db.collection('users').doc('alice').set(validProfile('alice')));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('users').doc('alice').get());
  });

  it('lets an admin (per the admins collection) read any profile', async () => {
    await seed(async (db) => {
      await db.collection('users').doc('alice').set(validProfile('alice'));
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('users').doc('alice').get());
  });
});

describe('admins/{uid} (admin authority — see isAdmin())', () => {
  it('lets a user confirm their own admin entry exists', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('admins').doc('root').get());
  });

  it("denies reading someone else's admin entry", async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('admins').doc('root').get());
  });

  it('denies listing the admins collection (no roster enumeration)', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('admins').get());
  });

  it('denies any client write, even from an already-admin account', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('admins').doc('newbie').set({ role: 'admin' }));
  });
});

describe('user_saved_content/{docId}', () => {
  it('lets the owner create their own saved-content doc with a server timestamp', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      db.collection('user_saved_content').add({
        userId: 'alice',
        contentId: 'blog-1',
        contentType: 'blog',
        savedAt: serverTimestamp()
      })
    );
  });

  it('denies creating a saved-content doc for another user', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      db.collection('user_saved_content').add({
        userId: 'alice',
        contentId: 'blog-1',
        contentType: 'blog',
        savedAt: serverTimestamp()
      })
    );
  });

  it('denies a create with a client-supplied (non-server) timestamp', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('user_saved_content').add({
        userId: 'alice',
        contentId: 'blog-1',
        contentType: 'blog',
        savedAt: new Date()
      })
    );
  });

  it("denies reading another user's saved content", async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('user_saved_content').add({
        userId: 'alice', contentId: 'blog-1', contentType: 'blog', savedAt: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('user_saved_content').doc(docId).get());
  });

  it('denies an unauthenticated read', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('user_saved_content').add({
        userId: 'alice', contentId: 'blog-1', contentType: 'blog', savedAt: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('user_saved_content').doc(docId).get());
  });

  // Regression coverage for a real bug: SavedContentService.saveContent()
  // and isContentSaved() both `.get()`/`.valueChanges()` a *specific*
  // deterministic-ID document before it necessarily exists — e.g. checking
  // "is this already saved?" for content never saved before. A `get` on a
  // nonexistent document evaluates `resource` as null, and without an
  // explicit null guard, `resource.data.userId` throws and Firestore denies
  // the read as permission-denied instead of returning "not found" — which
  // broke the very first bookmark of anything.
  it('lets the owner get() a not-yet-saved deterministic-ID doc (no throw on nonexistent resource)', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('user_saved_content').doc('alice_blog-never-saved').get());
  });

  it('lets the owner delete() a not-yet-saved doc — unsaveContent() has no existence pre-check', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('user_saved_content').doc('alice_blog-never-saved').delete());
  });
});

/** An activity_log event in the exact shape ActivityService writes. */
function activityEvent(activityType, fields = {}, uid = 'alice') {
  return { userId: uid, activityType, schemaVersion: 1, timestamp: serverTimestamp(), calendarDay: '2026-11-04', ...fields };
}

/** Seeds an existing event (rules off) and returns its doc ID. */
async function seedActivity(docId = 'alice_blog_read_blog-1') {
  await seed((db) => db.collection('activity_log').doc(docId).set({
    userId: 'alice', activityType: 'blog_read', schemaVersion: 1, contentId: 'blog-1', timestamp: new Date(), calendarDay: '2026-11-04'
  }));
  return docId;
}

describe('activity_log/{docId}', () => {
  const alice = () => testEnv.authenticatedContext('alice', { email: 'alice@test.com' }).firestore();
  const log = (db) => db.collection('activity_log');

  // One valid event per type, at the doc ID its type requires (null = any ID).
  const VALID = {
    blog_read: ['alice_blog_read_blog-1', { contentId: 'blog-1' }],
    blog_read_complete: ['alice_blog_read_complete_blog-1', { contentId: 'blog-1', contentTitle: 'Blog', scrollDepth: 80, timeSpent: 90 }],
    video_view: ['alice_video_view_GfO-3Oir-qM', { contentId: 'GfO-3Oir-qM' }],
    video_watch_complete: ['alice_video_watch_complete_GfO-3Oir-qM', { contentId: 'GfO-3Oir-qM', contentTitle: 'Video', scrollDepth: 80 }],
    poll_vote: ['alice_poll_vote_poll-1', { contentId: 'poll-1', contentTitle: 'Poll?', selectedOption: 'Yes', userEmail: 'alice@test.com' }],
    daily_visit: ['alice_daily_visit_2026-11-04', {}],
    widget_usage: [null, { widgetName: 'AQI' }],
    suggestion_click: ['alice_suggestion_click_explore_next_blog_blog-1_2026-11-04', { via: 'explore_next', contentType: 'blog', contentId: 'blog-1', position: 2 }]
  };

  for (const [type, [docId, fields]] of Object.entries(VALID)) {
    it(`lets a user create a valid ${type} event`, async () => {
      const ref = docId ? log(alice()).doc(docId) : log(alice()).doc();
      await assertSucceeds(ref.set(activityEvent(type, fields)));
    });

    it(`denies a ${type} event with an extra field`, async () => {
      const ref = docId ? log(alice()).doc(docId) : log(alice()).doc();
      await assertFails(ref.set(activityEvent(type, { ...fields, bonusPoints: 1000 })));
    });
  }

  it('denies an unknown event type', async () => {
    await assertFails(log(alice()).add(activityEvent('blog_shared', { contentId: 'blog-1' })));
  });

  it('denies a count-once event at a random ID (the old way to repeat it)', async () => {
    await assertFails(log(alice()).add(activityEvent('blog_read', { contentId: 'blog-1' })));
  });

  it('denies a count-once event at the ID of different content', async () => {
    await assertFails(log(alice()).doc('alice_blog_read_blog-2').set(activityEvent('blog_read', { contentId: 'blog-1' })));
  });

  it('denies a daily visit at the ID of a different day', async () => {
    await assertFails(log(alice()).doc('alice_daily_visit_2026-11-05').set(activityEvent('daily_visit')));
  });

  it('denies a spoofed userId on create', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(log(db).doc('alice_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1' })));
    await assertFails(log(db).doc('mallory_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1' })));
  });

  it('denies a create with a non-server timestamp (backdating)', async () => {
    await assertFails(log(alice()).doc('alice_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1', timestamp: new Date() })));
  });

  it('denies a malformed calendarDay or an unknown schemaVersion', async () => {
    await assertFails(log(alice()).doc('alice_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1', calendarDay: '4 Nov' })));
    await assertFails(log(alice()).doc('alice_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1', schemaVersion: 2 })));
  });

  it('denies any client-written EQ result, even a valid one (submitEqAssessment scores it on the server)', async () => {
    const dims = { attentionScore: 20, clarityScore: 30, reparationScore: 25 };
    await assertFails(log(alice()).add(activityEvent('eq_completion', { score: 75, eqDimensions: dims })));
    await assertFails(log(alice()).add(activityEvent('eq_completion', { score: 120, eqDimensions: dims })));
  });

  it('denies out-of-range read and watch percentages', async () => {
    await assertFails(log(alice()).doc('alice_blog_read_complete_blog-1').set(
      activityEvent('blog_read_complete', { contentId: 'blog-1', contentTitle: 'Blog', scrollDepth: 180, timeSpent: 90 })));
    await assertFails(log(alice()).doc('alice_video_watch_complete_GfO-3Oir-qM').set(
      activityEvent('video_watch_complete', { contentId: 'GfO-3Oir-qM', contentTitle: 'Video', scrollDepth: -1 })));
  });

  it('denies a poll vote carrying a different email', async () => {
    await assertFails(log(alice()).doc('alice_poll_vote_poll-1').set(
      activityEvent('poll_vote', { contentId: 'poll-1', contentTitle: 'Poll?', selectedOption: 'Yes', userEmail: 'bob@test.com' })));
  });

  it('accepts an empty poll email for a user without one', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(log(db).doc('alice_poll_vote_poll-1').set(
      activityEvent('poll_vote', { contentId: 'poll-1', contentTitle: 'Poll?', selectedOption: 'Yes', userEmail: '' })));
  });

  it('denies a client-written action completion (onUserActionWritten records them)', async () => {
    await assertFails(log(alice()).add(activityEvent('action_completed', { contentId: 'reuse-container' })));
    await assertFails(log(alice()).doc('alice_action_completed_reuse-container_1').set(activityEvent('action_completed', { contentId: 'reuse-container' })));
  });

  it('denies a suggestion click from an unknown place, of an unknown type, at the wrong ID or out of range', async () => {
    const click = (fields) => activityEvent('suggestion_click', { via: 'today', contentType: 'action', contentId: 'leak', position: 1, ...fields });
    const id = (via, type, contentId) => `alice_suggestion_click_${via}_${type}_${contentId}_2026-11-04`;
    await assertSucceeds(log(alice()).doc(id('today', 'action', 'leak')).set(click({})));
    await assertFails(log(alice()).doc(id('popup', 'action', 'leak')).set(click({ via: 'popup' })));
    await assertFails(log(alice()).doc(id('today', 'course', 'leak')).set(click({ contentType: 'course' })));
    await assertFails(log(alice()).doc('random-id').set(click({ contentId: 'plant' })));
    await assertFails(log(alice()).doc(id('today', 'action', 'tree')).set(click({ contentId: 'tree', position: 99 })));
    // Once a day per suggestion and place: a repeat is an update, which is denied.
    await assertFails(log(alice()).doc(id('today', 'action', 'leak')).set(click({})));
  });

  it('denies an unknown widget name', async () => {
    await assertFails(log(alice()).add(activityEvent('widget_usage', { widgetName: 'Free Points' })));
  });

  it('denies a second create at the same deterministic ID (the atomic dedup guarantee)', async () => {
    await seedActivity();
    await assertFails(log(alice()).doc('alice_blog_read_blog-1').set(activityEvent('blog_read', { contentId: 'blog-1' })));
  });

  it('denies reading the activity history of another user', async () => {
    const docId = await seedActivity();
    await assertFails(log(testEnv.authenticatedContext('mallory').firestore()).doc(docId).get());
  });

  it('lets an admin read activity history for analytics', async () => {
    const docId = await seedActivity();
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    await assertSucceeds(log(testEnv.authenticatedContext('root').firestore()).doc(docId).get());
  });

  it('denies mutating an event after creation, including forging a validation verdict', async () => {
    const docId = await seedActivity();
    await assertFails(log(alice()).doc(docId).update({ activityType: 'blog_read_complete' }));
    await assertFails(log(alice()).doc(docId).update({ validation: { status: 'accepted' } }));
  });

  it('denies a client-written validation verdict on create', async () => {
    await assertFails(log(alice()).doc('alice_blog_read_blog-1').set(
      activityEvent('blog_read', { contentId: 'blog-1', validation: { status: 'accepted' } })));
  });

  it('denies deleting the activity record of another user', async () => {
    const docId = await seedActivity();
    await assertFails(log(testEnv.authenticatedContext('mallory').firestore()).doc(docId).delete());
  });

  it('denies a user deleting their own activity record (resetEngagementData is the only deletion path)', async () => {
    const docId = await seedActivity();
    await assertFails(log(alice()).doc(docId).delete());
  });
});

describe('user_metrics/{uid} (materialized dashboard summary)', () => {
  it('lets the owner read their own metrics', async () => {
    await seed((db) => db.collection('user_metrics').doc('alice').set({ blogsRead: 3 }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('user_metrics').doc('alice').get());
  });

  it("denies reading another user's metrics", async () => {
    await seed((db) => db.collection('user_metrics').doc('alice').set({ blogsRead: 3 }));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('user_metrics').doc('alice').get());
  });

  it('lets an admin read any user\'s metrics', async () => {
    await seed(async (db) => {
      await db.collection('user_metrics').doc('alice').set({ blogsRead: 3 });
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('user_metrics').doc('alice').get());
  });

  it('denies a client write, even from the owner (onActivityLogCreated / backfillUserMetrics via Admin SDK only)', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_metrics').doc('alice').set({ blogsRead: 999999 }));
  });
});

describe('Admin content collections (Blogs representative — same isAdmin() gate on all)', () => {
  it('lets anyone read published content', async () => {
    await seed((db) => db.collection('Blogs').doc('post-1').set({ title: 'Hello' }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('Blogs').doc('post-1').get());
  });

  it('denies a non-admin write', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Blogs').doc('post-1').set({ title: 'Hacked' }));
  });

  it('lets an admin write', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('Blogs').doc('post-1').set({ title: 'Published' }));
  });
});

describe('Polls/{id} (raw votes — email/IP, admin-only per the privacy fix)', () => {
  const seedPoll = () => seed((db) => db.collection('Poll').doc('poll-1').set({ question: 'Q?', options: ['A', 'B', 'C'] }));

  it('lets anyone (including unauthenticated) submit a vote', async () => {
    await seedPoll();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1' })
    );
  });

  it("accepts the poll's last option", async () => {
    await seedPoll();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option3' }));
  });

  it('denies a vote for an option the poll does not have', async () => {
    await seedPoll();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option4' }));
    await assertFails(db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option0' }));
  });

  it('denies a vote whose option is free text (junk keys in the public results)', async () => {
    await seedPoll();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'anything I like' }));
  });

  it('denies a vote for a poll that does not exist', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Polls').add({ pollQuestionId: 'no-such-poll', option: 'option1' }));
  });

  it('denies a vote with a field outside the known shape', async () => {
    await seedPoll();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1', voterName: 'x' })
    );
  });

  it('denies an unauthenticated read of raw votes', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1', email: 'a@test.com' });
      docId = ref.id;
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Polls').doc(docId).get());
  });

  it('denies an authenticated non-admin read of raw votes (the exact fix for the email/IP leak)', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1', email: 'a@test.com' });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Polls').doc(docId).get());
  });

  it('denies listing (dumping) the raw votes collection as a non-admin', async () => {
    await seed((db) => db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1', email: 'a@test.com' }));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Polls').where('pollQuestionId', '==', 'poll-1').get());
  });

  it('lets an admin read raw votes', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1', email: 'a@test.com' });
      docId = ref.id;
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('Polls').doc(docId).get());
  });
});

describe('poll_results/{pollQuestionId} (sanitized public aggregate)', () => {
  it('lets anyone read the aggregate', async () => {
    await seed((db) => db.collection('poll_results').doc('poll-1').set({
      pollQuestionId: 'poll-1', totalVotes: 3, optionCounts: { option1: 2, option2: 1 }
    }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('poll_results').doc('poll-1').get());
  });

  it('denies a client write, even from an admin account (Cloud Function via Admin SDK only)', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(
      db.collection('poll_results').doc('poll-1').set({ pollQuestionId: 'poll-1', totalVotes: 999, optionCounts: {} })
    );
  });
});

describe('blog_summaries/{blogId} (card-sized blog copy for the lists)', () => {
  it('lets anyone read a summary', async () => {
    await seed((db) => db.collection('blog_summaries').doc('blog-1').set({ title: 'A blog', category: 'Earth' }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('blog_summaries').where('category', '==', 'Earth').get());
  });

  it('denies a client write, even from an admin account (onBlogWritten via Admin SDK only)', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('blog_summaries').doc('blog-1').set({ title: 'Forged' }));
  });
});

describe('related_auto/{id} (Explore next automatic matches)', () => {
  it('lets anyone read the matches', async () => {
    await seed((db) => db.collection('related_auto').doc('blog_b1').set({ blogs: [], actions: [{ id: 'a1', score: 0.2 }] }));
    await assertSucceeds(testEnv.unauthenticatedContext().firestore().collection('related_auto').doc('blog_b1').get());
  });

  it('denies a client write, even from an admin account (functions only)', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('related_auto').doc('blog_b1').set({ blogs: [], actions: [] }));
  });
});

describe('analytics_daily/{day} (daily summaries for Admin → Analytics)', () => {
  it('lets an admin read a day, not a member or a guest', async () => {
    await seed(async (db) => {
      await db.collection('admins').doc('root').set({ role: 'admin' });
      await db.collection('analytics_daily').doc('2026-11-05').set({ users: { active: 3 } });
    });
    await assertSucceeds(testEnv.authenticatedContext('root').firestore().collection('analytics_daily').doc('2026-11-05').get());
    await assertFails(testEnv.authenticatedContext('alice').firestore().collection('analytics_daily').doc('2026-11-05').get());
    await assertFails(testEnv.unauthenticatedContext().firestore().collection('analytics_daily').doc('2026-11-05').get());
  });

  it('denies a client write, even from an admin account (functions only)', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    await assertFails(testEnv.authenticatedContext('root').firestore().collection('analytics_daily').doc('2026-11-05').set({ users: { active: 1 } }));
  });
});

describe('workshops/{workshopId} (ClimatEnlighten workshops)', () => {
  const workshop = (overrides = {}) => ({
    title: 'Carbon Accounting Basics',
    description: 'A hands-on session.',
    eventDate: '2026-11-15',
    modeOrVenue: 'Online (Zoom)',
    registrationUrl: 'https://forms.gle/abc123',
    posterName: 'workshop_1.webp',
    posterUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/workshop-posters%2Fworkshop_1.webp?alt=media&token=t',
    published: true,
    updatedBy: 'admin@test.com',
    ...overrides
  });
  const asAdmin = async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    return testEnv.authenticatedContext('root').firestore();
  };

  it('lets anyone list published workshops (with the published == true filter)', async () => {
    await seed((db) => db.collection('workshops').doc('w1').set(workshop()));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('workshops').where('published', '==', true).get());
  });

  it('hides drafts from the public: an unfiltered list and a direct read of a draft both fail', async () => {
    await seed((db) => db.collection('workshops').doc('draft').set(workshop({ published: false })));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('workshops').get());
    await assertFails(db.collection('workshops').doc('draft').get());
  });

  it('lets an admin list every workshop, drafts included', async () => {
    await seed((db) => db.collection('workshops').doc('draft').set(workshop({ published: false })));
    const db = await asAdmin();
    await assertSucceeds(db.collection('workshops').get());
  });

  it('lets an admin create a valid workshop with any http(s) registration link', async () => {
    const db = await asAdmin();
    await assertSucceeds(db.collection('workshops').doc('a').set(workshop()));
    await assertSucceeds(db.collection('workshops').doc('b').set(workshop({
      registrationUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf/viewform'
    })));
    await assertSucceeds(db.collection('workshops').doc('c').set(workshop({ registrationUrl: 'https://rzp.io/l/wiof-workshop' })));
    await assertSucceeds(db.collection('workshops').doc('d').set(workshop({ registrationUrl: 'http://example.org:8080/register?id=1#top' })));
  });

  it('rejects registration links that are not real web links', async () => {
    const db = await asAdmin();
    await assertFails(db.collection('workshops').doc('a').set(workshop({ registrationUrl: 'javascript:alert(1)' })));
    await assertFails(db.collection('workshops').doc('b').set(workshop({ registrationUrl: 'forms.gle/abc' })));
    await assertFails(db.collection('workshops').doc('c').set(workshop({ registrationUrl: 'https://localhost/x' })));
    await assertFails(db.collection('workshops').doc('d').set(workshop({ registrationUrl: 'https://example.com/a b' })));
    await assertFails(db.collection('workshops').doc('e').set(workshop({ registrationUrl: 'data:text/html,hi' })));
  });

  it('rejects a bad date, an empty title, a non-Storage poster URL or an unknown field', async () => {
    const db = await asAdmin();
    await assertFails(db.collection('workshops').doc('a').set(workshop({ eventDate: '15/11/2026' })));
    await assertFails(db.collection('workshops').doc('b').set(workshop({ title: '' })));
    await assertFails(db.collection('workshops').doc('c').set(workshop({ posterUrl: 'https://evil.example.com/x.png' })));
    await assertFails(db.collection('workshops').doc('d').set(workshop({ price: 500 })));
  });

  it('accepts optional HH:MM start/end times, or empty strings for "not set"', async () => {
    const db = await asAdmin();
    await assertSucceeds(db.collection('workshops').doc('a').set(workshop({ startTime: '17:00', endTime: '19:30' })));
    await assertSucceeds(db.collection('workshops').doc('b').set(workshop({ startTime: '', endTime: '' })));
  });

  it('rejects malformed times', async () => {
    const db = await asAdmin();
    await assertFails(db.collection('workshops').doc('a').set(workshop({ startTime: '5pm' })));
    await assertFails(db.collection('workshops').doc('b').set(workshop({ endTime: '24:00' })));
    await assertFails(db.collection('workshops').doc('c').set(workshop({ startTime: 1700 })));
  });

  it('denies any write from a signed-in non-admin', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('workshops').doc('a').set(workshop()));
  });
});

describe('Subscriptions/{id}', () => {
  it('denies a direct client sign-up, even with the expected fields (only the subscribe function writes)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection('Subscriptions').add({
        firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString()
      })
    );
  });

  it('denies an unauthenticated read, even a bounded (limit-1) one — no public existence oracle', async () => {
    await seed((db) => db.collection('Subscriptions').add({
      firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString()
    }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Subscriptions').where('email', '==', 'alice@test.com').limit(1).get());
  });

  it('denies a non-admin read of any kind, including a bounded one (no enumeration)', async () => {
    await seed((db) => db.collection('Subscriptions').add({
      firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString()
    }));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Subscriptions').where('email', '==', 'alice@test.com').limit(1).get());
  });

  it('lets an admin list/manage subscriptions without the bound', async () => {
    await seed(async (db) => {
      await db.collection('Subscriptions').add({
        firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString()
      });
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('Subscriptions').get());
  });
});

describe('Feedback/{id}', () => {
  function validFeedback(overrides = {}) {
    return {
      category: 'issue',
      message: 'The blog page does not load on my phone.',
      pageUrl: 'https://worldisonefamily.com/home',
      userAgent: 'test-agent',
      status: 'new',
      createdAt: serverTimestamp(),
      ...overrides
    };
  }

  it('lets an anonymous visitor submit feedback', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('Feedback').add(validFeedback({ name: 'Alice', email: 'alice@test.com' })));
  });

  it('accepts every current category', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    for (const category of ['issue', 'idea', 'content', 'other']) {
      await assertSucceeds(db.collection('Feedback').add(validFeedback({ category })));
    }
  });

  it('lets a signed-in user submit feedback tagged with their own uid', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('Feedback').add(validFeedback({ userId: 'alice' })));
  });

  it("denies tagging feedback with someone else's uid", async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Feedback').add(validFeedback({ userId: 'alice' })));
  });

  it('denies an unknown category, an unexpected field, or a too-short/too-long message', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Feedback').add(validFeedback({ category: 'spam' })));
    await assertFails(db.collection('Feedback').add(validFeedback({ category: 'improvement' })));
    await assertFails(db.collection('Feedback').add(validFeedback({ phone: '555-0100' })));
    await assertFails(db.collection('Feedback').add(validFeedback({ message: 'short' })));
    await assertFails(db.collection('Feedback').add(validFeedback({ message: 'x'.repeat(2001) })));
  });

  it('denies a submission pre-marked as resolved or with a client-chosen timestamp', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Feedback').add(validFeedback({ status: 'resolved' })));
    await assertFails(db.collection('Feedback').add(validFeedback({ createdAt: new Date('2020-01-01') })));
  });

  it("lets a signed-in user read their own feedback, but not anyone else's", async () => {
    await seed(async (db) => {
      await db.collection('Feedback').doc('mine').set({ ...validFeedback({ userId: 'alice' }), createdAt: new Date() });
      await db.collection('Feedback').doc('theirs').set({ ...validFeedback({ userId: 'bob' }), createdAt: new Date() });
      await db.collection('Feedback').doc('anon').set({ ...validFeedback(), createdAt: new Date() });
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('Feedback').where('userId', '==', 'alice').get());
    await assertSucceeds(db.collection('Feedback').doc('mine').get());
    await assertFails(db.collection('Feedback').doc('theirs').get());
    await assertFails(db.collection('Feedback').doc('anon').get());
    await assertFails(db.collection('Feedback').where('userId', '==', 'bob').get());
    await assertFails(db.collection('Feedback').get());
  });

  it('denies a user changing the status of their own feedback', async () => {
    await seed((db) => db.collection('Feedback').doc('mine').set({ ...validFeedback({ userId: 'alice' }), createdAt: new Date() }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('Feedback').doc('mine').update({ status: 'resolved' }));
  });

  it('denies an anonymous read', async () => {
    await seed((db) => db.collection('Feedback').doc('f1').set({ ...validFeedback(), createdAt: new Date() }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('Feedback').get());
  });

  it('denies a non-admin read or status change', async () => {
    await seed((db) => db.collection('Feedback').doc('f1').set({ ...validFeedback(), createdAt: new Date() }));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Feedback').get());
    await assertFails(db.collection('Feedback').doc('f1').update({ status: 'resolved' }));
  });

  it('lets an admin list, triage and delete feedback', async () => {
    await seed(async (db) => {
      await db.collection('Feedback').doc('f1').set({ ...validFeedback(), createdAt: new Date() });
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('Feedback').orderBy('createdAt', 'desc').get());
    await assertSucceeds(db.collection('Feedback').doc('f1').update({ status: 'reviewed' }));
    await assertSucceeds(db.collection('Feedback').doc('f1').delete());
  });
});

describe('actions/{actionId} (Take Action catalogue — same isAdmin() gate as Blogs)', () => {
  it('lets anyone, including unauthenticated, read the catalogue', async () => {
    await seed((db) => db.collection('actions').doc('switch-off-lights').set({ title: 'Switch Off Lights', isActive: true }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('actions').doc('switch-off-lights').get());
  });

  it('lets anyone read a deactivated action too — existing user_actions history must still resolve it', async () => {
    await seed((db) => db.collection('actions').doc('old-action').set({ title: 'Old Action', isActive: false }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('actions').doc('old-action').get());
  });

  it('denies a non-admin write', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('actions').doc('hacked-action').set({ title: 'Hacked' }));
  });

  it('lets an admin create and edit an action', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('actions').doc('new-action').set({ title: 'New Action', isActive: true }));
  });

  it('lets an admin deactivate (not delete) an action', async () => {
    await seed(async (db) => {
      await db.collection('admins').doc('root').set({ role: 'admin' });
      await db.collection('actions').doc('action-1').set({ title: 'Action 1', isActive: true });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('actions').doc('action-1').update({ isActive: false }));
  });
});

describe('hero_videos/{slotId} (admin-managed hero video per element page)', () => {
  const valid = { title: 'Rediscover our Planet Earth', videoId: 'ghkQoJoipbM' };

  it('lets anyone, including unauthenticated, read a slot', async () => {
    await seed((db) => db.collection('hero_videos').doc('earth').set(valid));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('hero_videos').doc('earth').get());
  });

  it('denies a non-admin write', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('hero_videos').doc('earth').set(valid));
  });

  it('lets an admin set a known slot', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('hero_videos').doc('our-purpose').set(valid));
  });

  it('denies an admin write to an unknown slot id', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('hero_videos').doc('home').set(valid));
  });

  it('denies a full URL instead of an 11-char video ID', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(
      db.collection('hero_videos').doc('earth').set({ ...valid, videoId: 'https://youtu.be/ghkQoJoipbM' })
    );
  });

  it('denies an empty title', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('hero_videos').doc('earth').set({ ...valid, title: '' }));
  });
});

describe('site_settings/{settingId} (admin-managed site switches, e.g. launch ceremony)', () => {
  it('lets anyone, including unauthenticated, read the launch ceremony switch', async () => {
    await seed((db) => db.collection('site_settings').doc('launch_ceremony').set({ enabled: true }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('site_settings').doc('launch_ceremony').get());
  });

  it('denies a non-admin turning the ceremony on or off', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('site_settings').doc('launch_ceremony').set({ enabled: false }));
  });

  it('lets an admin turn the ceremony on and off', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('site_settings').doc('launch_ceremony').set({ enabled: true }));
    await assertSucceeds(db.collection('site_settings').doc('launch_ceremony').set({ enabled: false }));
  });

  it('denies an admin write to an unknown setting id', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('site_settings').doc('maintenance_mode').set({ enabled: true }));
  });

  it('lets an admin lock and unlock the ribbon, with an opening-time label', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    const ref = db.collection('site_settings').doc('launch_ceremony');
    await assertSucceeds(ref.set({ enabled: true, ribbonLocked: true, opensAtLabel: '3:30 PM IST' }));
    await assertSucceeds(ref.set({ ribbonLocked: false }, { merge: true }));
  });

  it('denies a non-boolean ribbonLocked or an over-long label', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    const ref = db.collection('site_settings').doc('launch_ceremony');
    await assertFails(ref.set({ enabled: true, ribbonLocked: 'yes' }));
    await assertFails(ref.set({ enabled: true, opensAtLabel: 'x'.repeat(41) }));
  });

  it('denies a non-boolean enabled value', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertFails(db.collection('site_settings').doc('launch_ceremony').set({ enabled: 'yes' }));
  });
});

describe('user_actions/{userActionId} (product source of truth for completion)', () => {
  // Mirrors toCalendarDay() in activity.service.ts (client-local date).
  function calendarDay(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function seedAction(db, id, overrides = {}) {
    const data = {
      title: id,
      isActive: true,
      repeatType: 'REPEATABLE',
      elementIds: ['earth', 'water'],
      version: 2,
      ...overrides
    };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    return db.collection('actions').doc(id).set(data);
  }

  function seedGuard(db, actionId, day, uid = 'alice') {
    return db.collection('user_action_completions').doc(`${uid}_${actionId}_${day}`).set({
      userId: uid, actionId, calendarDay: day, createdAt: new Date()
    });
  }

  // The exact create shape UserActionService.startAction() writes.
  function validStart(overrides = {}) {
    return {
      userId: 'alice',
      actionId: 'action-1',
      status: 'IN_PROGRESS',
      startedAt: serverTimestamp(),
      completedAt: null,
      completionCount: 0,
      lastCompletedAt: null,
      completionMethod: 'SELF_REPORTED',
      elementIdsSnapshot: ['earth', 'water'],
      actionVersion: 2,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides
    };
  }

  // The exact create shape UserActionService.writeCompletion() writes.
  function validComplete(overrides = {}) {
    return validStart({
      status: 'COMPLETE',
      completedAt: serverTimestamp(),
      completionCount: 1,
      lastCompletedAt: serverTimestamp(),
      ...overrides
    });
  }

  // Already-stored doc state, for update tests (seeded with rules disabled).
  function storedDoc(overrides = {}) {
    return {
      userId: 'alice',
      actionId: 'action-1',
      status: 'COMPLETE',
      startedAt: new Date(),
      completedAt: new Date(),
      completionCount: 1,
      lastCompletedAt: new Date(),
      completionMethod: 'SELF_REPORTED',
      elementIdsSnapshot: ['earth', 'water'],
      actionVersion: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  // The exact merge-update UserActionService.writeCompletion() falls back to.
  function completionUpdate(overrides = {}) {
    return {
      status: 'COMPLETE',
      completedAt: serverTimestamp(),
      completionCount: firebase.firestore.FieldValue.increment(1),
      lastCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides
    };
  }

  const ref = (db) => db.collection('user_actions').doc('alice_action-1');

  // ── create ──

  it('lets a user start an action (IN_PROGRESS, count 0)', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(validStart()));
  });

  it('lets a user one-tap complete a REPEATABLE action (count 1)', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(validComplete()));
  });

  it('accepts a stale-but-real actionVersion (page loaded before an admin edit)', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(validComplete({ actionVersion: 1 })));
  });

  it('accepts actionVersion 1 for a catalogue entry with no version field', async () => {
    await seed((db) => seedAction(db, 'action-1', { version: undefined }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(validComplete({ actionVersion: 1 })));
  });

  it('denies creating a user_action for another user', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(ref(db).set(validStart()));
  });

  it('denies a create with a forged completionCount (metrics inflation)', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ completionCount: 1000000 })));
  });

  it('denies a started (IN_PROGRESS) create with a non-zero count', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validStart({ completionCount: 5 })));
  });

  it('denies a create whose elementIdsSnapshot is not from the catalogue entry', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ elementIdsSnapshot: ['earth', 'water', 'air', 'energy', 'spirit'] })));
  });

  it('denies a create with an actionVersion ahead of the catalogue entry', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ actionVersion: 99 })));
  });

  it('denies a create for a nonexistent action', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete()));
  });

  it('denies a create for a deactivated action', async () => {
    await seed((db) => seedAction(db, 'action-1', { isActive: false }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete()));
  });

  it('denies a create at a doc ID other than {uid}_{actionId}', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_actions').doc('alice_action-1-copy').set(validComplete()));
  });

  it('denies a create with a non-server timestamp (anti-backdating)', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ completedAt: new Date() })));
    await assertFails(ref(db).set(validStart({ createdAt: new Date(), updatedAt: new Date() })));
  });

  it('denies a create with an extra, unlisted field', async () => {
    await seed((db) => seedAction(db, 'action-1'));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ bonusPoints: 500 })));
  });

  it("denies the service's full-doc set() over an existing record (that's what routes it to the update fallback)", async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete()));
  });

  // ── read ──

  it("denies reading another user's action record", async () => {
    await seed((db) => ref(db).set(storedDoc()));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(ref(db).get());
  });

  it("lets a user read their own not-yet-created action record (a card they haven't done)", async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).get());
  });

  it('denies a guest reading a not-yet-created action record', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(ref(db).get());
  });

  it('lets an admin read any user_action', async () => {
    await seed(async (db) => {
      await ref(db).set(storedDoc());
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(ref(db).get());
  });

  // ── update ──

  it('lets the owner complete a started action (IN_PROGRESS -> COMPLETE, 0 -> 1)', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc({ status: 'IN_PROGRESS', completedAt: null, lastCompletedAt: null, completionCount: 0 }));
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(completionUpdate(), { merge: true }));
  });

  it('lets the owner repeat-complete a REPEATABLE action (+1)', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc({ completionCount: 4 }));
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(completionUpdate(), { merge: true }));
  });

  it('lets the owner repeat-complete an OCCASIONAL action (+1)', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'OCCASIONAL' });
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(completionUpdate(), { merge: true }));
  });

  it('denies jumping completionCount by more than 1', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ completionCount: 50 }), { merge: true }));
  });

  it('denies lowering completionCount (the lower-then-raise inflation loop)', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc({ completionCount: 3 }));
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ completionCount: 0 }), { merge: true }));
  });

  it('denies a second completion of a ONCE action', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'ONCE' });
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate(), { merge: true }));
  });

  it('denies completing an action that has since been deactivated', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1', { isActive: false });
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate(), { merge: true }));
  });

  it('denies changing actionId, elementIdsSnapshot or actionVersion on update', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ actionId: 'different-action' }), { merge: true }));
    await assertFails(ref(db).set(completionUpdate({ elementIdsSnapshot: ['earth', 'water', 'air', 'energy', 'spirit'] }), { merge: true }));
    await assertFails(ref(db).set(completionUpdate({ actionVersion: 1 }), { merge: true }));
  });

  it('denies status regressing from COMPLETE back to IN_PROGRESS', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ status: 'IN_PROGRESS' }), { merge: true }));
  });

  it('denies an update with a client-chosen completedAt/updatedAt', async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ completedAt: new Date() }), { merge: true }));
    await assertFails(ref(db).set(completionUpdate({ updatedAt: new Date() }), { merge: true }));
  });

  it("denies another user updating alice's action record", async () => {
    await seed(async (db) => {
      await seedAction(db, 'action-1');
      await ref(db).set(storedDoc());
    });
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(ref(db).set(completionUpdate(), { merge: true }));
  });

  // ── DAILY ──

  it("lets a DAILY action's first completion through when today's guard was claimed", async () => {
    const today = calendarDay();
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'DAILY' });
      await seedGuard(db, 'action-1', today);
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(validComplete({ lastCompletionDay: today })));
  });

  it('denies a DAILY completion with no claimed guard doc', async () => {
    await seed((db) => seedAction(db, 'action-1', { repeatType: 'DAILY' }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(validComplete({ lastCompletionDay: calendarDay() })));
    await assertFails(ref(db).set(validComplete()));
  });

  it("lets a DAILY action repeat on a new day with that day's guard", async () => {
    const today = calendarDay();
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'DAILY' });
      await ref(db).set(storedDoc({ lastCompletionDay: calendarDay(-1) }));
      await seedGuard(db, 'action-1', today);
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(completionUpdate({ lastCompletionDay: today }), { merge: true }));
  });

  it('lets a pre-hardening DAILY doc (no lastCompletionDay yet) repeat with a guard', async () => {
    const today = calendarDay();
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'DAILY' });
      await ref(db).set(storedDoc());
      await seedGuard(db, 'action-1', today);
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(ref(db).set(completionUpdate({ lastCompletionDay: today }), { merge: true }));
  });

  it("denies replaying the same day's guard for a second DAILY increment", async () => {
    const today = calendarDay();
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'DAILY' });
      await ref(db).set(storedDoc({ lastCompletionDay: today }));
      await seedGuard(db, 'action-1', today);
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ lastCompletionDay: today }), { merge: true }));
  });

  it('denies a DAILY increment pointing at a far-future day', async () => {
    const future = calendarDay(30);
    await seed(async (db) => {
      await seedAction(db, 'action-1', { repeatType: 'DAILY' });
      await ref(db).set(storedDoc({ lastCompletionDay: calendarDay(-1) }));
      await seedGuard(db, 'action-1', future);
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).set(completionUpdate({ lastCompletionDay: future }), { merge: true }));
  });

  it('denies any client delete — no delete path needed in V1', async () => {
    await seed((db) => ref(db).set(storedDoc()));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(ref(db).delete());
  });
});

describe('user_action_completions/{docId} (per-day dedup guard for DAILY actions)', () => {
  function calendarDay(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const today = calendarDay();
  const guardId = `alice_action-1_${today}`;

  function validGuard(overrides = {}) {
    return {
      userId: 'alice',
      actionId: 'action-1',
      calendarDay: today,
      createdAt: serverTimestamp(),
      ...overrides
    };
  }

  it('lets a user claim their own completion slot for today', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.collection('user_action_completions').doc(guardId).set(validGuard()));
  });

  it('denies claiming a completion slot for another user', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).set(validGuard()));
  });

  it('denies a non-server createdAt', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).set(validGuard({ createdAt: new Date() })));
  });

  it("denies pre-claiming a future day's slot", async () => {
    const future = calendarDay(30);
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('user_action_completions').doc(`alice_action-1_${future}`).set(validGuard({ calendarDay: future }))
    );
  });

  it("denies a doc ID that doesn't match {uid}_{actionId}_{calendarDay}", async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_action_completions').doc('alice_whatever').set(validGuard()));
  });

  it('denies a second claim at the same deterministic ID — this is the per-day dedup guarantee', async () => {
    await seed((db) => db.collection('user_action_completions').doc(guardId).set(validGuard({ createdAt: new Date() })));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).set(validGuard()));
  });

  it("denies reading another user's completion guard doc", async () => {
    await seed((db) => db.collection('user_action_completions').doc(guardId).set(validGuard({ createdAt: new Date() })));
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).get());
  });

  it('denies any update — fully immutable like activity_log', async () => {
    await seed((db) => db.collection('user_action_completions').doc(guardId).set(validGuard({ createdAt: new Date() })));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).update({ calendarDay: '2026-10-02' }));
  });

  it('denies any delete', async () => {
    await seed((db) => db.collection('user_action_completions').doc(guardId).set(validGuard({ createdAt: new Date() })));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('user_action_completions').doc(guardId).delete());
  });
});

describe('Poll/{id} (question configuration)', () => {
  it('lets anyone read poll questions', async () => {
    await seed((db) => db.collection('Poll').doc('poll-1').set({ question: 'Save water?', options: ['Yes', 'No'] }));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.collection('Poll').doc('poll-1').get());
  });

  it('denies a non-admin from creating a poll question', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('Poll').add({ question: 'Hacked?', options: ['Yes'] }));
  });

  it('lets an admin create a poll question', async () => {
    await seed((db) => db.collection('admins').doc('root').set({ role: 'admin' }));
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('Poll').add({ question: 'Save water?', options: ['Yes', 'No'] }));
  });
});
