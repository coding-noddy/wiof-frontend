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
