/**
 * STAGING ONLY end-to-end test for Explore next (Phase 2 step 4, 8.4.1):
 * the admin Related Content picker, then Explore next on a blog, a video and
 * the calendar popup, similar content on an unlinked story, and "The story
 * behind this" in an action's details. It writes links to a few staging docs
 * and restores them at the end. See tests/e2e/README.md.
 *
 *   npm run e2e:explore
 */
const { BASE, API_KEY, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');
const path = require('path');
const ADMIN_EMAIL = requireEnv('WIOF_E2E_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('WIOF_E2E_ADMIN_PASSWORD');
const DOCS = 'https://firestore.googleapis.com/v1/projects/wiof-staging/databases/(default)/documents';
const BLOG = { id: '9qX7yRX7VgHDY7hfC05B', slug: 'how-about-a-vegetable-garden', search: 'Vegetable garden' };
const OTHER_BLOG = 'decoding-the-science-behind-veganism';
const ACTION = { id: 'care-for-a-tree-or-plant', title: 'Care for a Tree or Plant' };
const OTHER_ACTION = 'carry-a-reusable-bag';
// An occasion in the home agenda (today or the next 6 days) with no links yet; picked at run time.
let OCCASION = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0; let fail = 0; let token;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const enc = (v) => (Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
  : { stringValue: String(v) });
const api = async (p, method = 'GET', body) => {
  const res = await fetch(DOCS + p, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const keysOf = (doc) => (doc.json.fields?.relatedKeys?.arrayValue?.values || []).map((v) => v.stringValue);
// Sets (or, with no refs, deletes) relatedContent + relatedKeys on a doc.
const setLinks = (p, refs) => api(`${p}?updateMask.fieldPaths=relatedContent&updateMask.fieldPaths=relatedKeys`, 'PATCH',
  { fields: refs ? { relatedContent: enc(refs), relatedKeys: enc(refs.map((r) => `${r.type}:${r.id}`)) } : {} });

/** The first Envcal occasion from today through the next 6 days that has no links (month is 0-based, day a string). */
async function agendaOccasion() {
  const res = await api('/Envcal?pageSize=500&mask.fieldPaths=day&mask.fieldPaths=month&mask.fieldPaths=occasion&mask.fieldPaths=relatedKeys');
  const docs = res.json.documents || [];
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const hit = docs.find((doc) => {
      const f = doc.fields || {};
      return Number(f.month?.integerValue) === d.getMonth() && Number(f.day?.stringValue ?? f.day?.integerValue) === d.getDate()
        && !(f.relatedKeys?.arrayValue?.values || []).length && f.occasion?.stringValue;
    });
    if (hit) return { id: hit.name.split('/').pop(), name: hit.fields.occasion.stringValue };
  }
  return null;
}

const cards = (page, scope = 'body') => page.evaluate((scope) => {
  const root = document.querySelector(scope);
  const block = root && root.querySelector('app-explore-next section');
  if (!block) return null;
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('.explore-meta, .explore-group-subtitle'))).map((n) => n.textContent).join('').trim();
  const card = (a) => a.matches('app-take-action-card') ? `Action|${a.querySelector('.card-title').textContent.trim()}|card`
    : a.matches('app-blog-card') ? `Story|${a.querySelector('.blog-title').textContent.trim()}|blog-card`
    : a.matches('app-video-card') ? `Video|${a.querySelector('.video-title').textContent.trim()}|video-card` : `${own(a.querySelector('.explore-type'))}|${a.querySelector('.explore-title').textContent.trim()}|${a.getAttribute('href')}`;
  const g = {};
  for (const group of block.querySelectorAll('.explore-group')) g[own(group.querySelector('.explore-group-title'))] = [...group.querySelectorAll('.explore-card, app-take-action-card, app-blog-card, app-video-card')].map(card);
  return { heading: block.querySelector('h2').textContent.trim(), g, items: Object.values(g).flat() };
}, scope);
const waitCards = async (page, scope) => {
  for (let i = 0; i < 30; i++) { const c = await cards(page, scope); if (c) return c; await sleep(500); }
  return null;
};

(async () => {
  const s = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }) })).json();
  token = s.idToken;
  if (!token) throw new Error('admin sign-in failed: ' + JSON.stringify(s.error || s));
  OCCASION = await agendaOccasion();

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  const newPage = async (ctx) => {
    const page = await ctx.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
    page.on('dialog', (d) => d.accept());
    await page.evaluateOnNewDocument(() => { localStorage.setItem('wiof_launch_ribbon_cut', '1'); localStorage.setItem('wiof_onboarding_seen', 'true'); localStorage.setItem('privacyConsentAccepted', 'true'); localStorage.setItem('wiof_analytics_consent', 'denied'); });
    return page;
  };

  try {
    // A real video from the Earth page.
    const guestCtx = await browser.createBrowserContext();
    const guest = await newPage(guestCtx);
    await guest.goto(`${BASE}/element/earth`, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(3000);
    const videoId = await guest.evaluate(() => {
      const img = [...document.querySelectorAll('app-video-card img, .video-card img')].map((i) => i.src).find((src) => /\/vi\/[A-Za-z0-9_-]{11}\//.test(src));
      return img && img.match(/\/vi\/([A-Za-z0-9_-]{11})\//)[1];
    });
    check('found a real Earth video', !!videoId, videoId);

    // 1. Admin picker on the Take Action form: link the blog (search) and the video (URL).
    const adminCtx = await browser.createBrowserContext();
    const admin = await newPage(adminCtx);
    await admin.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 90000 });
    await admin.waitForSelector('input[name=email]');
    await admin.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const sel of ['input[name=email]', 'input[name=password]']) await admin.$eval(sel, (el) => { el.value = ''; });
      await admin.type('input[name=email]', ADMIN_EMAIL);
      await admin.type('input[name=password]', ADMIN_PASSWORD);
      await sleep(300);
      await admin.click('.login-submit-btn');
      if (await admin.waitForFunction(() => location.pathname.startsWith('/admin-dashboard'), { timeout: 15000 }).then(() => true, () => false)) break;
      if (attempt === 3) throw new Error('admin sign-in failed');
    }
    await admin.goto(`${BASE}/admin-dashboard/manage-take-action`, { waitUntil: 'load' });
    await sleep(4000);
    const opened = await admin.evaluate((title) => {
      for (const b of document.querySelectorAll('button[title="Edit action"]')) {
        let el = b;
        for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
          if (el.querySelectorAll('button[title="Edit action"]').length > 1) break;
          if (el.textContent.includes(title)) { b.click(); return true; }
        }
      }
      return false;
    }, ACTION.title);
    check('opened the action edit form', opened);
    await admin.waitForSelector('app-related-content-editor', { timeout: 15000 });
    await sleep(2500);
    await admin.type('app-related-content-editor input[type=search]', BLOG.search);
    await admin.waitForSelector('.related-matches button', { timeout: 10000 });
    await admin.click('.related-matches button');
    await admin.evaluate(() => [...document.querySelectorAll('.related-type-switch button')].find((b) => b.textContent.trim() === 'Video').click());
    await admin.waitForSelector('app-related-content-editor input[type=text]');
    // A bad link is refused with a message.
    await admin.type('app-related-content-editor input[type=text]', 'not a video');
    await admin.evaluate(() => [...document.querySelectorAll('app-related-content-editor button')].find((b) => /Add video/.test(b.textContent)).click());
    await sleep(500);
    check('picker refuses a non-YouTube link', /YouTube link/.test(await admin.$eval('.related-error', (e) => e.textContent).catch(() => '')));
    await admin.$eval('app-related-content-editor input[type=text]', (el) => { el.value = ''; el.dispatchEvent(new Event('input')); });
    await admin.type('app-related-content-editor input[type=text]', `https://www.youtube.com/watch?v=${videoId}`);
    await admin.evaluate(() => [...document.querySelectorAll('app-related-content-editor button')].find((b) => /Add video/.test(b.textContent)).click());
    await admin.waitForFunction(() => document.querySelectorAll('.related-row').length === 2, { timeout: 15000 }).catch(() => {});
    const rows = await admin.$$eval('.related-row', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    check('picker lists the story and the video (with its YouTube title)', rows.length === 2 && /Story/.test(rows[0]) && /Video/.test(rows[1]) && !rows[1].includes(videoId), rows.join(' || '));
    await admin.evaluate(() => [...document.querySelectorAll('.form-header .btn-primary')][0].click());
    await admin.waitForFunction(() => location.pathname.endsWith('/manage-take-action'), { timeout: 20000 }).catch(() => {});
    const savedAction = await api(`/actions/${ACTION.id}`);
    check('action saved with relatedContent + relatedKeys', JSON.stringify(keysOf(savedAction)) === JSON.stringify([`blog:${BLOG.id}`, `video:${videoId}`]), keysOf(savedAction).join(', '));
    const videoRef = savedAction.json.fields.relatedContent.arrayValue.values[1].mapValue.fields;
    check('video link stores its title and element', !!videoRef.title?.stringValue && videoRef.element?.stringValue === 'earth', `${videoRef.title?.stringValue} (${videoRef.element?.stringValue})`);

    // 2. Blog links an action and the video; occasion links the blog (admin REST, same fields the forms write).
    const blogLinks = [{ type: 'action', id: OTHER_ACTION, title: 'Carry a Reusable Bag' }, { type: 'video', id: videoId, title: videoRef.title.stringValue, element: 'earth' }];
    check('blog links saved', (await setLinks(`/Blogs/${BLOG.id}`, blogLinks)).status === 200);
    if (OCCASION) check('occasion links saved', (await setLinks(`/Envcal/${OCCASION.id}`, [{ type: 'blog', id: BLOG.id, title: 'How about a Vegetable garden!' }])).status === 200);
    let summaryKeys = [];
    for (let i = 0; i < 20 && summaryKeys.length < 2; i++) { await sleep(1500); summaryKeys = keysOf(await api(`/blog_summaries/${BLOG.id}`)); }
    check('onBlogWritten copied the keys to blog_summaries', summaryKeys.includes(`video:${videoId}`) && summaryKeys.includes(`action:${OTHER_ACTION}`), summaryKeys.join(', '));

    // 3. Guest views.
    errors.length = 0;
    await guest.goto(`${BASE}/element/earth/blog/${BLOG.slug}`, { waitUntil: 'networkidle2', timeout: 90000 });
    let c = await waitCards(guest);
    const show = (c) => c && Object.entries(c.g).map(([k, v]) => `[${k}] ${v.join(' || ')}`).join('  ');
    const read = (c, name = 'Keep reading') => (c && c.g[name]) || [];
    const act = (c, name = 'Your next step') => (c && c.g[name]) || [];
    check('blog: two groups; own video link leads reading; the two linked actions fill "Your next step"', c && /^Because you read/.test(c.heading)
      && read(c).length === 3 && read(c)[0].startsWith('Video|')
      && act(c).length === 2 && /^Action|Carry a Reusable Bag|/.test(act(c)[0]) && act(c)[1].startsWith(`Action|${ACTION.title}|`), show(c));

    await guest.goto(`${BASE}/element/earth/video/${videoId}`, { waitUntil: 'networkidle2', timeout: 90000 });
    c = await waitCards(guest);
    check('video: the blog and the action that link to it', read(c)[0]?.startsWith('Story|How about a Vegetable garden!|')
      && act(c)[0]?.startsWith(`Action|${ACTION.title}|`), show(c));

    await guest.goto(`${BASE}/element/earth/blog/${OTHER_BLOG}`, { waitUntil: 'networkidle2', timeout: 90000 });
    c = await waitCards(guest);
    check('unlinked Veganism story: similar stories and the plant-based meal action, by content', read(c).length === 3 && read(c).some((i) => i.startsWith('Story|Easy Vegan Recipes'))
      && !c.items.some((i) => i.includes(OTHER_BLOG)) && act(c).length === 2 && act(c)[0].startsWith('Action|Try a Plant-Forward Meal'), show(c));

    await guest.goto(`${BASE}/element/earth/take-action?action=${ACTION.id}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await guest.waitForSelector('ion-modal .story-behind', { timeout: 30000 }).catch(() => {});
    const modalTitle = await guest.$eval('ion-modal .detail-title', (e) => e.textContent.trim()).catch(() => '');
    const story = await guest.evaluate(() => {
      const m = document.querySelector('ion-modal');
      const a = m && m.querySelector('.story-behind');
      return { line: a ? a.innerText.replace(/\s+/g, ' ').trim() : '', explore: !!(m && m.querySelector('app-explore-next')), count: m ? m.querySelectorAll('.story-behind').length : 0 };
    });
    check('?action= opens the action details with one "story behind this" line (its own linked story), no Explore next block', modalTitle === ACTION.title
      && story.count === 1 && /THE STORY BEHIND THIS How about a Vegetable garden!/i.test(story.line) && !story.explore,
      `${modalTitle}: ${JSON.stringify(story)}`);
    await guest.click('ion-modal .story-behind');
    await guest.waitForFunction(() => location.pathname.includes('/blog/'), { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    check('the story line opens the blog and closes the modal', (await guest.evaluate(() => location.pathname)) === `/element/earth/blog/${BLOG.slug}` && !(await guest.$('ion-modal .detail-title')),
      await guest.evaluate(() => location.pathname));

    if (!OCCASION) {
      console.log('SKIP  calendar popup: no unlinked occasion in the home agenda this week');
    } else {
      await guest.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
      await sleep(3000);
      const clickedOccasion = await guest.evaluate((name) => {
        const item = [...document.querySelectorAll('app-env-calendar-agenda .agenda-item')].find((li) => li.textContent.includes(name));
        if (item) item.click();
        return !!item;
      }, OCCASION.name);
      c = clickedOccasion ? await waitCards(guest, 'ion-modal') : null;
      check(`calendar popup (${OCCASION.name}): only the occasion's linked story`, c && c.items.length === 1 && read(c)[0]?.startsWith('Story|How about a Vegetable garden!'), clickedOccasion ? (show(c) || 'no block') : 'occasion not in agenda');
      await guest.screenshot({ path: path.join(OUT, 'explore-calendar.png') }).catch(() => {});
    }

    const relevant = errors.filter((e) => !/favicon|ERR_BLOCKED|youtube|ytimg|doubleclick|googleads|Failed to load resource/i.test(e));
    check('no console errors on the public pages', relevant.length === 0, relevant.join(' | '));
  } finally {
    // Restore: none of these docs had links before.
    const r = await Promise.all([setLinks(`/actions/${ACTION.id}`), setLinks(`/Blogs/${BLOG.id}`), ...(OCCASION ? [setLinks(`/Envcal/${OCCASION.id}`)] : [])]);
    check('restored the action, blog and occasion', r.every((x) => x.status === 200), r.map((x) => x.status).join(','));
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
