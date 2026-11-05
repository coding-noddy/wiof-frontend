/**
 * STAGING ONLY end-to-end test for "Today on WIOF" (Phase 2 step 6, 8.6.0):
 * the home card for today's real calendar occasion — its fact and source,
 * an admin-linked story and action (and that editing the occasion re-runs
 * the matcher, onEnvcalWritten), the action link opening its details,
 * "Hide for today", and the phone layout. Links it adds to the occasion are
 * removed at the end. Skips (exit 0) on a day with no occasion.
 * See tests/e2e/README.md.
 *
 *   npm run e2e:today
 */
const path = require('path');
const { BASE, API_KEY, CHROME, OUT, puppeteer, requireEnv } = require('./e2e-config');

const ADMIN_EMAIL = requireEnv('WIOF_E2E_ADMIN_EMAIL');
const ADMIN_PASSWORD = requireEnv('WIOF_E2E_ADMIN_PASSWORD');
const DOCS = 'https://firestore.googleapis.com/v1/projects/wiof-staging/databases/(default)/documents';
const STORY = { type: 'blog', id: '9qX7yRX7VgHDY7hfC05B', title: 'How about a Vegetable garden!' };
const ACTION = { type: 'action', id: 'care-for-a-tree-or-plant', title: 'Care for a Tree or Plant' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
let token;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

const api = async (p, method = 'GET', body) => {
  const res = await fetch(DOCS + p, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const enc = (v) => (Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
  : { stringValue: String(v) });
const setLinks = (p, refs) => api(`${p}?updateMask.fieldPaths=relatedContent&updateMask.fieldPaths=relatedKeys`, 'PATCH',
  { fields: refs ? { relatedContent: enc(refs), relatedKeys: enc(refs.map((r) => `${r.type}:${r.id}`)) } : {} });

/** Today's first occasion with a description (Envcal month is 0-based, day a string), as the app picks it. */
async function todaysOccasion() {
  const res = await api('/Envcal?pageSize=500');
  const now = new Date();
  const hit = (res.json.documents || []).find((doc) => {
    const f = doc.fields || {};
    return Number(f.month?.integerValue) === now.getMonth() && Number(f.day?.stringValue ?? f.day?.integerValue) === now.getDate()
      && (f.description?.stringValue || '').trim() && f.occasion?.stringValue;
  });
  if (!hit) return null;
  const f = hit.fields;
  return {
    id: hit.name.split('/').pop(), name: f.occasion.stringValue, description: f.description.stringValue, link: f.showMoreLink?.stringValue || '',
    fact: f.fact?.stringValue || '', factStatus: f.factStatus?.stringValue || '',
    hadLinks: (f.relatedKeys?.arrayValue?.values || []).length > 0
  };
}

async function newPage(browser, viewport, errors) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('wiof_launch_ribbon_cut', '1');
    localStorage.setItem('wiof_onboarding_seen', 'true');
    localStorage.setItem('privacyConsentAccepted', 'true');
  });
  return page;
}

const readCard = (page) => page.evaluate(() => {
  const s = document.querySelector('app-today-on-wiof .today');
  if (!s) return null;
  const src = s.querySelector('.today-source');
  return {
    title: s.querySelector('.today-title')?.textContent.trim(),
    fact: s.querySelector('.today-fact')?.textContent.trim(),
    didYouKnow: s.querySelector('.today-didyouknow')?.textContent.replace(/\s+/g, ' ').trim() || null,
    source: src ? { text: src.textContent.replace(/\s+/g, ' ').trim(), target: src.target, rel: src.rel, href: src.href } : null,
    picks: [...s.querySelectorAll('.today-pick')].map((a) => `${a.querySelector('.pick-label').textContent.trim()}: ${a.querySelector('.pick-title').textContent.trim()}`)
  };
});

(async () => {
  const s = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true })
  })).json();
  token = s.idToken;
  if (!token) throw new Error('admin sign-in failed');

  const occasion = await todaysOccasion();
  if (!occasion) {
    console.log('SKIP  no calendar occasion today on staging');
    process.exit(0);
  }
  if (occasion.hadLinks) {
    console.log(`SKIP  ${occasion.name} already has Related Content links; not touching them`);
    process.exit(0);
  }
  console.log(`Today: ${occasion.name} (${occasion.id})`);

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const errors = [];
  try {
    // 1. As it is: fact and source, plus whatever the matcher found.
    const page = await newPage(browser, { width: 1280, height: 900 }, errors);
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('app-today-on-wiof .today', { timeout: 30000 }).catch(() => {});
    let card = await readCard(page);
    check("home shows today's occasion and its fact", card?.title === occasion.name && card?.fact === occasion.description.trim(), card?.title);
    const host = (() => { try { return new URL(occasion.link).hostname.replace(/^www\./, ''); } catch { return null; } })();
    check('the source names the site and opens safely in a new tab', !host || (card?.source?.text.includes(host) && card.source.target === '_blank' && /noopener/.test(card.source.rel)), JSON.stringify(card?.source));
    if (occasion.fact) {
      check('the occasion\'s fact shows as "Did you know?"', card?.didYouKnow === `Did you know? ${occasion.fact.trim()}`, card?.didYouKnow);
      check('a draft fact links the occasion\'s page as "Learn more", not as its source', occasion.factStatus === 'reviewed' || /^Learn more: /.test(card?.source?.text || ''), card?.source?.text);
    } else {
      console.log('      (no fact on this occasion yet: run scripts/apply-occasion-facts.js)');
    }
    console.log(`      matched without links: ${card?.picks.join(' | ') || '(none: fact only)'}`);

    // 2. Editing the occasion's text re-runs the matcher (onEnvcalWritten).
    // The rebuild writes only lists that change, so the edit must change the
    // matches: a few plant-food words, then the original text back.
    const auto = async () => {
      const f = (await api(`/related_auto/occasion_${occasion.id}`)).json.fields || {};
      return { at: f.computedAt?.timestampValue || null, actions: (f.actions?.arrayValue?.values || []).map((v) => v.mapValue.fields.id.stringValue) };
    };
    const setDescription = (text) => api(`/Envcal/${occasion.id}?updateMask.fieldPaths=description`, 'PATCH', { fields: { description: { stringValue: text } } });
    const before = await auto();
    await setDescription(`${occasion.description} Try a plant-based meal of vegan recipes.`);
    let after = before;
    for (let i = 0; i < 30 && after.at === before.at; i++) { await sleep(2000); after = await auto(); }
    check('editing the occasion re-ran the matcher (onEnvcalWritten)', after.at !== before.at && after.actions.includes('try-a-plant-forward-meal'), `${before.actions.join(',') || '-'} -> ${after.actions.join(',')}`);
    await setDescription(occasion.description);
    let restored = after;
    for (let i = 0; i < 30 && restored.at === after.at; i++) { await sleep(2000); restored = await auto(); }
    check('restoring the text restored the matches', JSON.stringify(restored.actions) === JSON.stringify(before.actions), restored.actions.join(',') || '-');

    // 3. Admin links come first.
    check('linking a story and an action to the occasion saved', (await setLinks(`/Envcal/${occasion.id}`, [STORY, ACTION])).status === 200);

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('app-today-on-wiof .today-pick', { timeout: 30000 }).catch(() => {});
    card = await readCard(page);
    check('the linked story and action show, the admin links first', card?.picks.join(' | ') === `Read: ${STORY.title} | Try today: ${ACTION.title}`, card?.picks.join(' | '));
    await page.evaluate(() => document.querySelector('app-today-on-wiof').scrollIntoView({ block: 'center' }));
    await sleep(600);
    await page.screenshot({ path: path.join(OUT, 'today-desktop.png') });

    await page.evaluate(() => document.querySelector('app-today-on-wiof .today-pick[data-kind="action"]').click());
    await page.waitForSelector('ion-modal app-take-action-detail', { timeout: 20000 }).catch(() => {});
    await sleep(1200);
    const modal = await page.evaluate(() => ({ path: location.pathname + location.search, title: document.querySelector('ion-modal .detail-title')?.textContent.trim() }));
    check('"Try today" opens the action\'s details', modal.title === ACTION.title, JSON.stringify(modal));

    // 3b. "See the full calendar" brings the calendar heading into view and focus.
    const toCalendar = async (p) => {
      await p.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
      await p.waitForSelector('app-today-on-wiof .today-calendar', { timeout: 30000 });
      await p.evaluate(() => document.querySelector('app-today-on-wiof .today-calendar').click());
      await sleep(1500);
      return p.evaluate(() => {
        const h = document.getElementById('environment-calendar');
        const r = h?.getBoundingClientRect();
        return { inView: !!r && r.top >= 0 && r.top < innerHeight / 2, focused: document.activeElement === h, flash: !!document.querySelector('app-env-calendar-agenda .agenda-today.is-flashing') };
      });
    };
    const cal = await toCalendar(page);
    check('"See the full calendar" scrolls to the calendar, focuses its heading and highlights today', cal.inView && cal.focused && cal.flash, JSON.stringify(cal));

    // 4. Hide for today.
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForSelector('app-today-on-wiof .today-hide', { timeout: 30000 });
    await page.click('app-today-on-wiof .today-hide');
    await sleep(400);
    const gone = !(await page.$('app-today-on-wiof .today'));
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);
    check('"Hide for today" hides the card, and it stays hidden after a reload', gone && !(await page.$('app-today-on-wiof .today')));

    // 5. Phone.
    const phone = await newPage(browser, { width: 390, height: 844, isMobile: true }, errors);
    await phone.goto(`${BASE}/home`, { waitUntil: 'networkidle2', timeout: 90000 });
    await phone.waitForSelector('app-today-on-wiof .today', { timeout: 30000 }).catch(() => {});
    await phone.evaluate(() => document.querySelector('app-today-on-wiof')?.scrollIntoView({ block: 'start' }));
    await sleep(800);
    const fit = await phone.evaluate(() => {
      const el = document.querySelector('app-today-on-wiof .today');
      return el && { width: Math.round(el.getBoundingClientRect().width), hScroll: document.documentElement.scrollWidth > innerWidth };
    });
    check('on a phone it fits the screen, no sideways scroll', !!fit && fit.width <= 390 && !fit.hScroll, JSON.stringify(fit));
    await phone.screenshot({ path: path.join(OUT, 'today-phone.png') });
    const phoneCal = await toCalendar(phone);
    check('on a phone "See the full calendar" reaches the calendar too', phoneCal.inView && phoneCal.focused, JSON.stringify(phoneCal));

    const relevant = errors.filter((e) => !/favicon|ERR_BLOCKED|youtube|ytimg|doubleclick|googleads|Failed to load resource/i.test(e));
    check('no console errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  } finally {
    const r = await setLinks(`/Envcal/${occasion.id}`);
    check('removed the links it added to the occasion', r.status === 200);
    await browser.close();
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
