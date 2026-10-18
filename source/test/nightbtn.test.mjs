// 18.10 (Джессика: «нет кнопки для перехода в ночной режим»): a visible day/night switch at the bottom of the left menu, in every skin,
// plus the «Ночь» button in the reader bar. One tap = night (skin's own night), again = day; the label and aria-checked follow.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node nightbtn.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(() => { S.gold = 999999; save(); });
const night = () => !isLightBg(activeTheme().bg);
for (const sk of ['', 'pencil', 'celestial', 'ellada', 'babochkovyi']) {
  const r = await p.evaluate(async (sk, nightSrc) => { const night = new Function('return (' + nightSrc + ')()');
    if (sk) { buy('skin-' + sk); wear('skin-' + sk); } __navAllow = true; show('library'); __navAllow = false; if (night()) toggleDayNight();
    openDrawer(); await new Promise(q => setTimeout(q, 350));
    const b = document.getElementById('dNight'), d = document.getElementById('drawer'); if (!b) return null;
    const br = b.getBoundingClientRect(), dr = d.getBoundingClientRect(), cs = getComputedStyle(b);
    const o = { skin: document.documentElement.dataset.skin || '', vis: br.height >= 44 && br.left >= dr.left && br.right <= dr.right + 1 && br.bottom <= innerHeight && cs.visibility === 'visible', label0: b.textContent.trim(), aria0: b.getAttribute('aria-checked') };
    b.click(); await new Promise(q => setTimeout(q, 150));
    o.n1 = night(); o.label1 = b.textContent.trim(); o.aria1 = b.getAttribute('aria-checked'); o.theme1 = document.documentElement.dataset.theme || '';
    b.click(); await new Promise(q => setTimeout(q, 150)); o.n2 = night(); closeDrawer(); return o; }, sk, night.toString());
  ok((sk || 'default') + ': left menu has a day/night switch at the bottom; tap = night, tap again = day', r && r.vis && /Ночн/.test(r.label0) && r.aria0 === 'false' && r.n1 && /Ночн/.test(r.label1) && r.aria1 === 'true' && !r.n2 && (!sk || r.theme1 === 'night'), r);
}
await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
await p.evaluate(() => showChrome()); await sleep(600);
const rd = await p.evaluate(() => { const b = document.getElementById('btnDayNight'), r = b.getBoundingClientRect(); return { vis: r.width > 0 && r.height > 0 && r.bottom <= innerHeight, l: b.textContent.trim() }; });
ok('reader bar: the «Ночь» button is visible', rd.vis && /Ночь|День/.test(rd.l), rd);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY nightbtn.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
