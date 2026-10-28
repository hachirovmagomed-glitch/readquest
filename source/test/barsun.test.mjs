// The suns at the ends of the «Яркость» bar slider (Джессика 28.10: «справа два солнышка, одно из них нерабочее»): in every skin, day and night,
// both suns are buttons on top (nothing covers them), a real tap on the left one makes it 10 % darker, on the right one 10 % brighter,
// the value is stored and the slider follows; the end stays in 30…100 %, and the bars do not hide on the tap.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node barsun.test.mjs   (RQ_SHOTS=dir to save a shot per skin)
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS;
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const skins = await p.evaluate(async () => { S.gold = 99999; save(); const id = allBooks()[0].id; __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2000)); return SHOP_READY.map(s => s); });
for (const night of [false, true]) for (const sk of ['', ...skins]) {
  const nm = (sk || 'none') + (night ? ' night' : ' day');
  const geo = await p.evaluate(async (sk, night, b0) => {
    if (sk) { buy(sk); wear(sk); } else { SET.skin = null; SET.theme = 'sepia'; saveSet(); applySet(); }
    if (night !== (el('reader').dataset.page === 'night')) toggleDayNight();
    SET.bright = b0; saveSet(); applySet(); revealChrome(); await new Promise(r => setTimeout(r, 450));
    const g = (id) => { const r = el(id).getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      return { x, y, w: r.width, h: r.height, top: !!hit && el(id).contains(hit), vis: getComputedStyle(el(id).querySelector('svg')).visibility }; };
    const row = el('rBright').getBoundingClientRect();
    return { lo: g('barBrightLo'), hi: g('barBrightHi'), bar: el('barBright').getBoundingClientRect().width, row: { x: row.left, y: row.top, w: row.width, h: row.height } };
  }, sk, night, 0.7);
  ok(`${nm}: both suns are on top, ≥40 px, slider still wide`, geo.lo.top && geo.hi.top && geo.lo.w >= 40 && geo.hi.w >= 40 && geo.bar > 180, geo);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${sk || 'none'}-${night ? 'night' : 'day'}.png`, clip: { x: 0, y: Math.max(0, geo.row.y - 50), width: 360, height: geo.row.h + 70 } });
  await p.touchscreen.tap(geo.hi.x, geo.hi.y); await sleep(250);
  const up = await p.evaluate(() => ({ b: SET.bright, bar: el('barBright').value, st: JSON.parse(localStorage.getItem(RQ_K.set) || '{}').bright, shown: !el('reader').classList.contains('barsoff') && el('barBright').getBoundingClientRect().bottom > 1 }));
  await p.touchscreen.tap(geo.lo.x, geo.lo.y); await sleep(250); await p.touchscreen.tap(geo.lo.x, geo.lo.y); await sleep(250);
  const down = await p.evaluate(() => ({ b: SET.bright, bar: el('barBright').value }));
  ok(`${nm}: right sun brighter, left sun darker (stored, slider follows, bars stay)`, up.b === 0.8 && up.bar === '80' && up.st === 0.8 && up.shown && down.b === 0.6 && down.bar === '60', { up, down });
}
const ends = await p.evaluate(() => { SET.bright = 1; applySet(); el('barBrightHi').click(); const a = SET.bright; SET.bright = 0.3; applySet(); el('barBrightLo').click(); const b = SET.bright; SET.bright = 1; saveSet(); applySet(); return [a, b]; });
ok('ends: stays within 30…100 %', ends[0] === 1 && ends[1] === 0.3, ends);
ok('no page errors', !errs.length, errs);
console.log(checks.filter(Boolean).length + '/' + checks.length + ' barsun'); await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
