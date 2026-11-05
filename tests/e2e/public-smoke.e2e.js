/**
 * STAGING smoke test: public pages as a fresh guest, on a phone and a desktop
 * viewport. Fails on console errors, sideways page scroll or missing key
 * content. Read-only; no sign-in needed. See tests/e2e/README.md.
 *
 *   npm run e2e:smoke
 */
const path = require('path');
const { BASE, CHROME, OUT, puppeteer } = require('./e2e-config');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = [
  ['home', '/home', '.wiof-header'],
  ['earth', '/element/earth', 'app-blog-card'],
  ['climatenlighten', '/climatenlighten', '.cards-grid .card'],
  ['take-action', '/take-action', 'app-header'],
  ['blog-post', '/element/earth/blog/easy-vegan-recipes-vegan-choco-banana-ice-cream', '.blog-article'],
  ['explore-next', '/element/earth/blog/decoding-the-science-behind-veganism', 'app-explore-next app-take-action-card']
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  let fails = 0;
  for (const [vw, vh, mobile, label] of [[390, 844, true, 'phone'], [1366, 900, false, 'desktop']]) {
    for (const [name, url, must] of PAGES) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: vw, height: vh, isMobile: mobile });
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('wiof_launch_ribbon_cut', '1');
        localStorage.setItem('wiof_onboarding_seen', 'true');
        localStorage.setItem('privacyConsentAccepted', 'true');
      });
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 140)));
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 140)));
      await page.goto(BASE + url, { waitUntil: 'load', timeout: 90000 });
      await page.waitForSelector(must, { timeout: 20000 }).catch(() => {});
      await sleep(2000);
      const r = await page.evaluate((sel) => ({ found: document.querySelectorAll(sel).length, hScroll: document.documentElement.scrollWidth > innerWidth }), must);
      const ok = r.found > 0 && !r.hScroll && errors.length === 0;
      if (!ok) fails++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(7)} ${name.padEnd(16)} ${must}: ${r.found}${r.hScroll ? ' | SIDEWAYS SCROLL' : ''}${errors.length ? ' | ' + errors.join(' | ') : ''}`);
      await page.screenshot({ path: path.join(OUT, `smoke-${label}-${name}.png`) });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n${fails} failed` : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
