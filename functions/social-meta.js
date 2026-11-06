/**
 * Link previews for crawlers (WhatsApp, LinkedIn, Facebook, X…): the HTML
 * that socialMetaTags (index.js) sends for a shared story or conversation.
 *
 * Every value is escaped: titles and descriptions are admin-written and can
 * hold quotes or `<`, which would otherwise break the tag or inject markup.
 */

const SITE_NAME = 'World is One Family (WIOF)';
const DEFAULT_DESCRIPTION = 'Inspire through Creativity, Enlighten through Knowledge, Protect through Action';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** Plain text from the editor's HTML (a conversation's short description), on one line. */
const stripHtml = (html) => String(html || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The preview for a page: Open Graph and Twitter tags, plus a redirect so a
 * person who lands on this HTML still reaches the app.
 * @param {{title?: string, description?: string, author?: string, imageUrl: string, url: string, type?: string}} page
 */
function metaHtml({ title, description, author, imageUrl, url, type = 'article' }) {
  const t = escapeHtml(title || 'World is One Family');
  const d = escapeHtml(description || DEFAULT_DESCRIPTION);
  const a = escapeHtml(author || 'WIOF');
  const img = escapeHtml(imageUrl);
  const u = escapeHtml(url);
  const site = escapeHtml(SITE_NAME);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${t} | ${site}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:image" content="${img}">
  <meta property="og:url" content="${u}">
  <meta property="og:site_name" content="${site}">
  <meta property="article:author" content="${a}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${img}">

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${u}">
  <link rel="canonical" href="${u}">
</head>
<body>
  <p>Redirecting to <a href="${u}">${t}</a>...</p>
</body>
</html>`;
}

/** A Coffee Conversation's preview fields: its topic, short description, guest and video thumbnail. */
function conversationMeta(cc, fallbackImage) {
  const videoId = String(cc.videoLink || '').trim();
  const guest = String(cc.intervieweeName || '').trim();
  return {
    title: cc.topic,
    description: stripHtml(cc.topicShortDesc).slice(0, 300) || undefined,
    author: guest && guest.toUpperCase() !== 'NA' ? guest : 'WIOF',
    imageUrl: YOUTUBE_ID.test(videoId) ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : fallbackImage,
    type: 'video.other'
  };
}

module.exports = { escapeHtml, stripHtml, metaHtml, conversationMeta };
