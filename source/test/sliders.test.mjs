// «Яркость» / «Тёплый оттенок» in «Настройки чтения → Страница» are drawn by each skin (Джессика 22.10: «во всех скинах одинаковые … нужно переделать»).
// Every ready skin (and no skin): both sliders are custom-drawn (appearance none); the two thumbs differ from each other; each skin's pair differs
// from every other skin's, day and night; the fill follows the value (--p) after moving a slider; dragging still sets SET.bright / SET.warm.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node sliders.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const skins = await p.evaluate(async () => { S.gold = 99999; save(); const id = allBooks()[0].id; __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2000)); return SHOP_READY.map(s => s); });
const look = (sk, night) => p.evaluate(async (sk, night) => {
  if (sk) { buy(sk); wear(sk); } else { SET.skin = null; SET.theme = 'sepia'; saveSet(); applySet(); }
  if (night !== (el('reader').dataset.page === 'night')) toggleDayNight();
  openReaderSettings('grpPage'); await new Promise(r => setTimeout(r, 300));
  const g = (id) => { const e = el(id), cs = getComputedStyle(e); return { app: cs.appearance, th: cs.getPropertyValue('--sl-th').trim(), fill: cs.getPropertyValue('--sl-fill').trim(), h: cs.getPropertyValue('--sl-h').trim() }; };
  return { b: g('brightRange'), w: g('warmRange'), skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme };
}, sk, night);
const seen = {};
for (const night of [false, true]) {
  for (const sk of ['', ...skins]) {
    const r = await look(sk, night), nm = (sk || 'none') + (night ? ' night' : '');
    ok(`${nm}: both sliders drawn (appearance none)`, r.b.app === 'none' && r.w.app === 'none', [r.b.app, r.w.app]);
    ok(`${nm}: brightness and warmth thumbs differ`, r.b.th && r.w.th && r.b.th !== r.w.th);
    ok(`${nm}: brightness and warmth fills differ`, r.b.fill !== r.w.fill);
    const key = r.b.th + '|' + r.w.th + '|' + r.b.fill + '|' + r.h;
    const dup = Object.keys(seen).find(k => seen[k] === key && k.endsWith(night ? ' night' : 'day'));
    ok(`${nm}: not the same as another skin`, !dup, [dup, r.skin, r.theme, r.b.th.slice(0, 40)]);
    seen[nm + (night ? '' : ' day')] = key;
  }
}
const fill = await p.evaluate(async () => {
  const b = el('brightRange'), w = el('warmRange');
  b.value = 65; b.dispatchEvent(new Event('input')); w.value = 30; w.dispatchEvent(new Event('input'));
  return { bright: SET.bright, warm: SET.warm, pb: b.style.getPropertyValue('--p'), pw: w.style.getPropertyValue('--p'), bar: el('barBright').value };
});
ok('moving the sliders sets SET.bright / SET.warm and the fill (--p)', fill.bright === 0.65 && fill.warm === 0.3 && fill.pb === '0.500' && fill.pw === '0.500' && fill.bar === '65', fill);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`${pass}/${checks.length} sliders`); process.exit(pass === checks.length ? 0 : 1);
