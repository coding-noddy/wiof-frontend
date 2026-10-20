/**
 * Blog summaries
 * ==============
 * Blog lists (element pages, /blogs) only show a card per blog: title, short
 * description, author, read time and the cover image. Reading the full `Blogs`
 * docs for that downloaded every blog's whole body (2 MB for 29 blogs on
 * staging), and the cards then made one getDownloadURL() call per image.
 *
 * `blog_summaries/{blogId}` holds just the card fields plus a ready-made
 * cover image URL. It is written only by the Admin SDK: the onBlogWritten
 * trigger in index.js keeps it in sync, and scripts/optimize-blogs.js
 * backfills it. Both use buildBlogSummary() below, so they can't drift apart.
 */

const BLOG_SUMMARIES = 'blog_summaries';
const BLOG_IMAGE_FOLDER = 'blog-images';
// Same as AVG_WORD_READ_PER_MIN / BlogService.getTimeToRead on the client.
const AVG_WORD_READ_PER_MIN = 250;

function timeToRead(content) {
  const totalWords = String(content || '').split(' ').length;
  return Math.ceil(totalWords / AVG_WORD_READ_PER_MIN);
}

/**
 * The same URL the client's getDownloadURL() returns, built from the object's
 * download token. Null when the image or its token doesn't exist (yet); the
 * client then falls back to getDownloadURL() for that card.
 */
async function coverImageUrl(bucket, imageName) {
  if (!imageName) return null;
  const objectPath = `${BLOG_IMAGE_FOLDER}/${imageName}`;
  try {
    const [metadata] = await bucket.file(objectPath).getMetadata();
    const tokens = metadata.metadata && metadata.metadata.firebaseStorageDownloadTokens;
    const token = tokens ? String(tokens).split(',')[0] : null;
    if (!token) return null;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  } catch (e) {
    if (e && e.code === 404) return null;
    throw e;
  }
}

/** The blog_summaries doc for one Blogs doc's data. */
async function buildBlogSummary(blog, bucket) {
  const pick = (key) => (blog[key] === undefined ? null : blog[key]);
  return {
    title: pick('title'),
    slug: pick('slug'),
    shortDescription: pick('shortDescription'),
    author: pick('author'),
    category: pick('category'),
    subCategory: pick('subCategory'),
    externalUrl: pick('externalUrl'),
    imageName: pick('imageName'),
    imageUrl: await coverImageUrl(bucket, blog.imageName),
    timeToRead: timeToRead(blog.content),
    submitDate: pick('submitDate'),
    publishDate: pick('publishDate')
  };
}

module.exports = { BLOG_SUMMARIES, buildBlogSummary };
