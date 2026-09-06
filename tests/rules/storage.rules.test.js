/**
 * Storage Security Rules — emulator regression tests
 * ===================================================
 *
 * Mirrors firestore.rules.test.js for storage.rules, including the same
 * admins-collection isAdmin() fix (storage.rules calls firestore.exists()
 * against the Firestore emulator, so both emulators run together here).
 *
 * Run via: npm run test:rules
 */

const { readFileSync } = require('fs');
const path = require('path');
const { describe, it, before, beforeEach, after } = require('node:test');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'demo-wiof-rules-test';

const ONE_KB = 1024;
const UNDER_AVATAR_LIMIT = Buffer.alloc(500 * ONE_KB, 1); // < 1 MB avatar limit
const OVER_AVATAR_LIMIT = Buffer.alloc(1200 * ONE_KB, 1); // > 1 MB avatar limit
const UNDER_MEDIA_LIMIT = Buffer.alloc(2 * 1024 * ONE_KB, 1); // < 10 MB media limit
const OVER_MEDIA_LIMIT = Buffer.alloc(11 * 1024 * ONE_KB, 1); // > 10 MB media limit

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080
    },
    storage: {
      rules: readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199
    }
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

/** Seeds the admins/{uid} Firestore doc that storage.rules' isAdmin() checks, bypassing rules. */
async function seedAdmin(uid) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('admins').doc(uid).set({ role: 'admin' });
  });
}

describe('user-avatars/{userId}/{fileName}', () => {
  it('lets anyone read an avatar (rendered via plain <img>, no auth token sent)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' });
    });
    const storage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(storage.ref('user-avatars/alice/profile.png').getDownloadURL());
  });

  it('lets the owner upload a valid avatar under the size limit', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    await assertSucceeds(
      storage.ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' })
    );
  });

  it('denies an avatar upload over the 1 MB size limit', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    await assertFails(
      storage.ref('user-avatars/alice/profile.png').put(OVER_AVATAR_LIMIT, { contentType: 'image/png' })
    );
  });

  it('denies an avatar upload with a disallowed content type', async () => {
    const storage = testEnv.authenticatedContext('alice').storage();
    await assertFails(
      storage.ref('user-avatars/alice/profile.svg').put(UNDER_AVATAR_LIMIT, { contentType: 'image/svg+xml' })
    );
  });

  it("denies uploading to another user's avatar path", async () => {
    const storage = testEnv.authenticatedContext('mallory').storage();
    await assertFails(
      storage.ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' })
    );
  });

  it('lets the owner delete their own avatar', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' });
    });
    const storage = testEnv.authenticatedContext('alice').storage();
    await assertSucceeds(storage.ref('user-avatars/alice/profile.png').delete());
  });

  it("denies deleting another user's avatar", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' });
    });
    const storage = testEnv.authenticatedContext('mallory').storage();
    await assertFails(storage.ref('user-avatars/alice/profile.png').delete());
  });

  it("lets an admin delete another user's avatar", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('user-avatars/alice/profile.png').put(UNDER_AVATAR_LIMIT, { contentType: 'image/png' });
    });
    await seedAdmin('root');
    const storage = testEnv.authenticatedContext('root').storage();
    await assertSucceeds(storage.ref('user-avatars/alice/profile.png').delete());
  });
});

describe('published media (admin-managed content, e.g. blog-images/**)', () => {
  it('lets anyone read published media', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('blog-images/hero.jpg').put(UNDER_MEDIA_LIMIT, { contentType: 'image/jpeg' });
    });
    const storage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(storage.ref('blog-images/hero.jpg').getDownloadURL());
  });

  it('denies a non-admin upload', async () => {
    const storage = testEnv.authenticatedContext('mallory').storage();
    await assertFails(
      storage.ref('blog-images/hacked.jpg').put(UNDER_MEDIA_LIMIT, { contentType: 'image/jpeg' })
    );
  });

  it('lets an admin upload valid media', async () => {
    await seedAdmin('root');
    const storage = testEnv.authenticatedContext('root').storage();
    await assertSucceeds(
      storage.ref('blog-images/hero.jpg').put(UNDER_MEDIA_LIMIT, { contentType: 'image/jpeg' })
    );
  });

  it('denies an admin upload over the 10 MB size limit', async () => {
    await seedAdmin('root');
    const storage = testEnv.authenticatedContext('root').storage();
    await assertFails(
      storage.ref('blog-images/huge.jpg').put(OVER_MEDIA_LIMIT, { contentType: 'image/jpeg' })
    );
  });

  it('denies an admin upload with a disallowed content type', async () => {
    await seedAdmin('root');
    const storage = testEnv.authenticatedContext('root').storage();
    await assertFails(
      storage.ref('blog-images/doc.pdf').put(UNDER_MEDIA_LIMIT, { contentType: 'application/pdf' })
    );
  });

  it('denies a non-admin delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('blog-images/hero.jpg').put(UNDER_MEDIA_LIMIT, { contentType: 'image/jpeg' });
    });
    const storage = testEnv.authenticatedContext('mallory').storage();
    await assertFails(storage.ref('blog-images/hero.jpg').delete());
  });

  it('lets an admin delete published media', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.storage().ref('blog-images/hero.jpg').put(UNDER_MEDIA_LIMIT, { contentType: 'image/jpeg' });
    });
    await seedAdmin('root');
    const storage = testEnv.authenticatedContext('root').storage();
    await assertSucceeds(storage.ref('blog-images/hero.jpg').delete());
  });
});
