/**
 * Unit tests for youtube-cache.js. No network, no emulator:
 *   npm run test:functions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ALLOWED_PLAYLISTS, cachedPlaylist, fetchPlaylist } = require('./youtube-cache');

const item = (videoId, publishedAt, thumb = true) => ({
  snippet: { title: `T ${videoId}`, publishedAt, resourceId: { videoId }, thumbnails: thumb ? { medium: { url: `https://i.ytimg.com/${videoId}.jpg` } } : {} }
});

/** A fake YouTube: pages of items, counting the calls. */
function fakeYouTube(pages, { status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const token = new URL(url).searchParams.get('pageToken');
    const i = token ? Number(token) : 0;
    return { ok: status === 200, status, json: async () => ({ items: pages[i], ...(i + 1 < pages.length ? { nextPageToken: String(i + 1) } : {}) }) };
  };
  return { fetchImpl, calls };
}

function fakeDb(initial = {}) {
  const docs = { ...initial };
  return {
    docs,
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: !!docs[`${name}/${id}`], data: () => docs[`${name}/${id}`] }),
        set: async (data) => { docs[`${name}/${id}`] = data; }
      })
    })
  };
}

const ID = [...ALLOWED_PLAYLISTS][0];

describe('youtube cache', () => {
  it('follows every page, skips private entries, sorts newest first, and sends the site as referer', async () => {
    const yt = fakeYouTube([[item('a', '2026-01-01T00:00:00Z'), item('gone', '2026-05-01T00:00:00Z', false)], [item('b', '2026-03-01T00:00:00Z')]]);
    const videos = await fetchPlaylist(ID, { key: 'k', referer: 'https://wiof-staging.web.app/', fetchImpl: yt.fetchImpl });
    assert.deepEqual(videos.map((v) => v.videoId), ['b', 'a']);
    assert.equal(yt.calls.length, 2);
    assert.equal(yt.calls[0].init.headers.Referer, 'https://wiof-staging.web.app/');
  });

  it('fetches once, then serves the copy for an hour', async () => {
    const db = fakeDb();
    const yt = fakeYouTube([[item('a', '2026-01-01T00:00:00Z')]]);
    const first = await cachedPlaylist(db, ID, { key: 'k', fetchImpl: yt.fetchImpl, now: 1000 });
    const second = await cachedPlaylist(db, ID, { key: 'k', fetchImpl: yt.fetchImpl, now: 1000 + 59 * 60 * 1000 });
    assert.deepEqual([first.source, second.source, yt.calls.length], ['youtube', 'cache', 1]);
    const later = await cachedPlaylist(db, ID, { key: 'k', fetchImpl: yt.fetchImpl, now: 1000 + 61 * 60 * 1000 });
    assert.deepEqual([later.source, yt.calls.length], ['youtube', 2]);
  });

  it('serves the last copy when YouTube fails, and fails only when there is none', async () => {
    const down = fakeYouTube([[]], { status: 403 });
    const db = fakeDb({ [`youtube_cache/${ID}`]: { videos: [{ videoId: 'old' }], fetchedAt: 0 } });
    const stale = await cachedPlaylist(db, ID, { key: 'k', fetchImpl: down.fetchImpl, now: 10 * 60 * 60 * 1000 });
    assert.deepEqual([stale.source, stale.videos[0].videoId], ['stale', 'old']);
    await assert.rejects(cachedPlaylist(fakeDb(), ID, { key: 'k', fetchImpl: down.fetchImpl }), /403/);
    await assert.rejects(cachedPlaylist(fakeDb(), ID, { key: '', fetchImpl: down.fetchImpl }), /No YouTube key/);
  });

  it('serves only the site playlists', () => {
    assert.equal(ALLOWED_PLAYLISTS.size, 5);
    assert.equal(ALLOWED_PLAYLISTS.has('PLsomeoneElse'), false);
  });
});
