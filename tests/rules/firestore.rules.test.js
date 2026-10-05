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

describe('activity_log/{docId}', () => {
  it('lets a user create their own activity event with a server timestamp', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      db.collection('activity_log').add({
        userId: 'alice',
        activityType: 'blog_read',
        contentId: 'blog-1',
        timestamp: serverTimestamp()
      })
    );
  });

  it('denies a spoofed userId on create', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(
      db.collection('activity_log').add({
        userId: 'alice',
        activityType: 'blog_read',
        contentId: 'blog-1',
        timestamp: serverTimestamp()
      })
    );
  });

  it('denies a create with a non-server timestamp (rate-limit bypass attempt)', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('activity_log').add({
        userId: 'alice',
        activityType: 'blog_read',
        contentId: 'blog-1',
        timestamp: new Date()
      })
    );
  });

  it("denies reading another user's activity history", async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('activity_log').add({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('activity_log').doc(docId).get());
  });

  it('lets an admin read activity history for analytics', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('activity_log').add({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      });
      docId = ref.id;
      await db.collection('admins').doc('root').set({ role: 'admin' });
    });
    const db = testEnv.authenticatedContext('root').firestore();
    await assertSucceeds(db.collection('activity_log').doc(docId).get());
  });

  it('denies mutating an event after creation — activity logs are immutable', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('activity_log').add({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('activity_log').doc(docId).update({ activityType: 'blog_read_complete' }));
  });

  it('lets a client create at a deterministic ID (the dedup mechanism ActivityService relies on)', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      db.collection('activity_log').doc('alice_blog_read_blog-1').set({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      })
    );
  });

  it('denies a second set() at the same deterministic ID — this is the atomic dedup guarantee, not a client-side race', async () => {
    await seed((db) => db.collection('activity_log').doc('alice_blog_read_blog-1').set({
      userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
    }));
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.collection('activity_log').doc('alice_blog_read_blog-1').set({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      })
    );
  });

  it("denies deleting another user's activity record", async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('activity_log').add({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(db.collection('activity_log').doc(docId).delete());
  });

  it('denies a user deleting their own activity record — resetEngagementData (Cloud Function) is the only deletion path', async () => {
    let docId;
    await seed(async (db) => {
      const ref = await db.collection('activity_log').add({
        userId: 'alice', activityType: 'blog_read', contentId: 'blog-1', timestamp: serverTimestamp()
      });
      docId = ref.id;
    });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.collection('activity_log').doc(docId).delete());
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
  it('lets anyone (including unauthenticated) submit a vote', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      db.collection('Polls').add({ pollQuestionId: 'poll-1', option: 'option1' })
    );
  });

  it('denies a vote with a field outside the known shape', async () => {
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

describe('Subscriptions/{id}', () => {
  it('lets anyone subscribe with the expected fields', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      db.collection('Subscriptions').add({
        firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString()
      })
    );
  });

  it('denies a subscribe request with an unexpected field', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.collection('Subscriptions').add({
        firstName: 'Alice', lastName: 'Test', email: 'alice@test.com', datetime: new Date().toISOString(),
        phone: '555-0100'
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
