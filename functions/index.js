/**
 * WIOF Cloud Functions
 * ====================
 * Serves dynamic Open Graph meta tags for social media crawlers.
 * When WhatsApp/Twitter/Facebook/LinkedIn crawl a blog URL, they get
 * the blog's actual title, description, and hero image instead of
 * the default WIOF meta tags.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// List of known social media / search crawler user agents
const CRAWLER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'Googlebot',
  'bingbot',
  'Applebot'
];

/**
 * Check if request is from a social media crawler
 */
function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_AGENTS.some(agent => userAgent.includes(agent));
}

/**
 * Get the download URL for a blog image from Firebase Storage
 * Uses the public download URL format (requires Storage rules to allow public read)
 */
async function getImageUrl(imageName) {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(`blog-images/${imageName}`);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return 'https://wiof-staging.web.app/assets/banners/home_banner.jpg';
    }

    // Use the public Firebase Storage URL format (no signed URL needed)
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(`blog-images/${imageName}`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  } catch (e) {
    console.error('Image URL error:', e.message);
    return 'https://wiof-staging.web.app/assets/banners/home_banner.jpg'; // fallback
  }
}

/**
 * Look up blog by slug or ID
 */
async function getBlog(blogParam) {
  // Try slug first
  const slugQuery = await db.collection('Blogs')
    .where('slug', '==', blogParam)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return slugQuery.docs[0].data();
  }

  // Fallback: try as document ID
  const docRef = await db.collection('Blogs').doc(blogParam).get();
  if (docRef.exists) {
    return docRef.data();
  }

  return null;
}

/**
 * Generate HTML with Open Graph meta tags
 */
function generateMetaHtml(blog, imageUrl, originalUrl) {
  const title = blog.title || 'World is One Family';
  const description = blog.shortDescription || 'Inspire through Creativity, Enlighten through Knowledge, Protect through Action';
  const author = blog.author || 'WIOF';
  const siteName = 'World is One Family (WIOF)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} | ${siteName}</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${originalUrl}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="article:author" content="${author}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${originalUrl}">
  <link rel="canonical" href="${originalUrl}">
</head>
<body>
  <p>Redirecting to <a href="${originalUrl}">${title}</a>...</p>
</body>
</html>`;
}

/**
 * Main Cloud Function — handles blog URL requests from crawlers
 * 
 * Region strategy:
 * We deploy to BOTH regions. Firebase Hosting rewrite will route to whichever
 * one exists in that project. When deploying to wiof-staging (asia-south1 Firestore),
 * the function runs in asia-south1. When deploying to wiof-production (us-central),
 * the function runs in us-central1. 
 * 
 * Since firebase deploy deploys ALL exported functions, we just export one function
 * WITHOUT a hardcoded region — Firebase will deploy it to us-central1 by default,
 * which is fine because:
 * - For production: Firestore is in us-central → same region, fast
 * - For staging: Firestore is in asia-south1 → cross-region, slight latency
 *   but acceptable for crawlers (they don't need <100ms response)
 */
exports.socialMetaTags = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30 })
  .https.onRequest(async (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const originalUrl = `https://${req.hostname}${req.originalUrl}`;

  // Only intercept crawler requests — real users get the SPA index.html
  if (!isCrawler(userAgent)) {
    // Serve the Angular SPA index.html so the app boots and handles routing
    try {
      const https = require('https');
      const indexUrl = `https://${req.hostname}/index.html`;
      https.get(indexUrl, (proxyRes) => {
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=600');
        proxyRes.pipe(res);
      }).on('error', () => {
        res.status(500).send('Error loading page');
      });
    } catch (e) {
      res.status(500).send('Error loading page');
    }
    return;
  }

  // Extract blog param from URL: /element/:element/blog/:blogParam
  const blogMatch = req.path.match(/\/element\/\w+\/blog\/(.+)/);
  if (!blogMatch) {
    // Not a blog URL — serve SPA
    try {
      const https = require('https');
      const indexUrl = `https://${req.hostname}/index.html`;
      https.get(indexUrl, (proxyRes) => {
        res.set('Content-Type', 'text/html');
        proxyRes.pipe(res);
      }).on('error', () => {
        res.status(500).send('Error loading page');
      });
    } catch (e) {
      res.status(500).send('Error loading page');
    }
    return;
  }

  const blogParam = blogMatch[1];

  try {
    const blog = await getBlog(blogParam);
    if (!blog) {
      res.status(404).send('Blog not found');
      return;
    }

    const imageUrl = blog.imageName
      ? await getImageUrl(blog.imageName)
      : `https://${req.hostname}/assets/banners/home_banner.jpg`;

    const html = generateMetaHtml(blog, imageUrl, originalUrl);
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving meta tags:', error);
    res.redirect(originalUrl);
  }
});
