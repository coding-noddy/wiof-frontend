/**
 * Unit tests for social-meta.js (link previews). No emulator needed:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { conversationMeta, escapeHtml, metaHtml, stripHtml } = require('./social-meta');

describe('social-meta', () => {
  it('escapes titles so quotes and tags cannot break the page', () => {
    assert.equal(escapeHtml(`Rivers "alive" <b>& well</b>`), 'Rivers &quot;alive&quot; &lt;b&gt;&amp; well&lt;/b&gt;');
    const html = metaHtml({ title: 'A "quoted" title', imageUrl: 'https://x/y.jpg', url: 'https://wiof/a' });
    assert.ok(html.includes('<meta property="og:title" content="A &quot;quoted&quot; title">'));
    assert.ok(!html.includes('"quoted"'));
  });

  it('turns the editor\'s HTML into one plain line', () => {
    assert.equal(stripHtml('<p>Water&nbsp;is <strong>life</strong></p><p>Second</p>'), 'Water is life Second');
    assert.equal(stripHtml(null), '');
  });

  it('a conversation previews with its topic, guest and YouTube thumbnail', () => {
    const meta = conversationMeta({ topic: 'Corporate purpose', topicShortDesc: '<p>Shiv on purpose</p>', intervieweeName: 'Shiv', videoLink: 'dQw4w9WgXcQ' }, 'https://fallback.jpg');
    assert.deepEqual(meta, {
      title: 'Corporate purpose',
      description: 'Shiv on purpose',
      author: 'Shiv',
      imageUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      type: 'video.other'
    });
  });

  it('falls back to WIOF and the default image when the guest or video is missing', () => {
    const meta = conversationMeta({ topic: 'T', intervieweeName: 'NA', videoLink: 'https://example.com' }, 'https://fallback.jpg');
    assert.equal(meta.author, 'WIOF');
    assert.equal(meta.imageUrl, 'https://fallback.jpg');
    assert.equal(meta.description, undefined);
  });
});
