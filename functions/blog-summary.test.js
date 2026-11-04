/**
 * Unit tests for blog-summary.js. No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildBlogSummary } = require('./blog-summary');

const bucket = (token) => ({
  name: 'test-bucket',
  file: () => ({
    getMetadata: async () => [{ metadata: token ? { firebaseStorageDownloadTokens: token } : {} }]
  })
});

describe('buildBlogSummary', () => {
  it('copies the card fields and builds the cover URL from the download token', async () => {
    const summary = await buildBlogSummary({ title: 'T', slug: 't', category: 'Earth', imageName: 'a.jpg', content: 'one two' }, bucket('tok,other'));
    assert.equal(summary.title, 'T');
    assert.equal(summary.category, 'Earth');
    assert.equal(summary.timeToRead, 1);
    assert.equal(summary.imageUrl, 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/blog-images%2Fa.jpg?alt=media&token=tok');
    assert.equal(summary.author, null);
    assert.equal('content' in summary, false);
  });

  it('copies the Explore next keys, so a linked page can find the blog', async () => {
    const summary = await buildBlogSummary({ relatedKeys: ['video:dQw4w9WgXcQ', 7, 'action:a1'] }, bucket(null));
    assert.deepEqual(summary.relatedKeys, ['video:dQw4w9WgXcQ', 'action:a1']);
    assert.equal(summary.imageUrl, null);
  });

  it('stores no keys for a blog without links', async () => {
    assert.deepEqual((await buildBlogSummary({}, bucket(null))).relatedKeys, []);
  });
});
