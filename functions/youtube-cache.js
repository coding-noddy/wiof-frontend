/**
 * Server-side cache of the element video playlists (the YouTube Data API
 * quota ran out on 2026-10-31: every visitor's browser fetched every
 * playlist itself, up to 10 pages each, on one shared key).
 *
 * The youtubePlaylist function (index.js) serves /api/youtube-playlist?id=…
 * through Firebase Hosting. Each playlist is fetched from YouTube at most
 * once an hour and kept in youtube_cache/{playlistId}; the CDN keeps the
 * response for an hour too. If YouTube fails, the last copy is served.
 *
 * Only the site's own playlists are served, so the endpoint can't be used
 * to spend the quota on someone else's playlists.
 */

/** The element playlists (src/app/app.constants.ts ELEMENT_VIDEOS_PLAYLIST_ID). */
const ALLOWED_PLAYLISTS = new Set([
  'PLitAAO2FhPTECrRbhFyIllj6TSobTGiJI', // Air
  'PLitAAO2FhPTHZRcarOENNjYcdPlzwpZEn', // Water
  'PLitAAO2FhPTHdtNVNkcm3JIX6jmhPZjyN', // Earth
  'PLitAAO2FhPTFw5EoLsuua6Ang60PGBH0d', // Energy
  'PLitAAO2FhPTFjxy3EsgDR_XPtgiX8Ez-q' // Spirit
]);

const TTL_MS = 60 * 60 * 1000;
const MAX_PAGES = 10;
const API = 'https://www.googleapis.com/youtube/v3/playlistItems';

/** A playlist item as the app's Video model needs it; null for private or deleted entries. */
function toVideo(item) {
  const s = item && item.snippet;
  const thumbnail = s && s.thumbnails && s.thumbnails.medium && s.thumbnails.medium.url;
  const videoId = s && s.resourceId && s.resourceId.videoId;
  if (!thumbnail || !videoId) return null;
  return { videoId, title: String(s.title || ''), thumbnail, publishedAt: String(s.publishedAt || '') };
}

/** Every video in the playlist, newest first (50 a page, at most MAX_PAGES pages). */
async function fetchPlaylist(id, { key, referer, fetchImpl = fetch }) {
  const videos = [];
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${API}?part=snippet&maxResults=50&playlistId=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    // The key may be restricted to the site's address: say where the request is for.
    const res = await fetchImpl(url, { headers: referer ? { Referer: referer } : {} });
    if (!res.ok) throw new Error(`YouTube answered ${res.status}`);
    const body = await res.json();
    for (const item of body.items || []) {
      const v = toVideo(item);
      if (v) videos.push(v);
    }
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return videos.sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
}

/**
 * The playlist from the cache if it's under an hour old, else fresh from YouTube (and cached).
 * If YouTube fails, the last cached copy, however old; if there is none, the error.
 * @returns {Promise<{ videos: object[], fetchedAt: number, source: 'cache'|'youtube'|'stale' }>}
 */
async function cachedPlaylist(db, id, { key, referer, fetchImpl, now = Date.now(), ttlMs = TTL_MS }) {
  const ref = db.collection('youtube_cache').doc(id);
  const snap = await ref.get();
  const cached = snap.exists ? snap.data() : null;
  if (cached && Array.isArray(cached.videos) && now - Number(cached.fetchedAt || 0) < ttlMs) {
    return { videos: cached.videos, fetchedAt: cached.fetchedAt, source: 'cache' };
  }
  try {
    if (!key) throw new Error('No YouTube key on the server');
    const videos = await fetchPlaylist(id, { key, referer, fetchImpl });
    await ref.set({ videos, fetchedAt: now });
    return { videos, fetchedAt: now, source: 'youtube' };
  } catch (error) {
    if (cached && Array.isArray(cached.videos)) return { videos: cached.videos, fetchedAt: cached.fetchedAt, source: 'stale' };
    throw error;
  }
}

module.exports = { ALLOWED_PLAYLISTS, TTL_MS, cachedPlaylist, fetchPlaylist, toVideo };
