// 28.10 (Джессика: «чтобы граница сливалась с книгой чуть более незаметно»): the reader panels have no drawn line against the page in
// any skin; each panel melts into the page by a fade that starts from the colour the panel really has at that edge.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node panelfade.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
// the edge colour a panel paints at its inner side, read from a screenshot row 1 px inside the panel, and the fade's first row just outside
async function probe(p) {
  return p.evaluate(() => {
    const r = el('reader'), h = r.querySelector('.rhead'), b = r.querySelector('.rbot');
    const sh = (e) => getComputedStyle(e).boxShadow, bd = (e) => getComputedStyle(e).borderBottomWidth + '/' + getComputedStyle(e).borderTopWidth;
    const fa = getComputedStyle(h, '::after'), fb = getComputedStyle(b, '::before');
    return { shadows: [sh(h), sh(b), sh(r.querySelector('.rfoot'))], borders: [bd(h), bd(b), bd(r.querySelector('.rfoot'))],
      fadeA: fa.backgroundImage, fadeB: fb.backgroundImage, hA: fa.height, maskA: fa.maskImage || fa.webkitMaskImage || '',
      hb: Math.round(h.getBoundingClientRect().bottom), bt: Math.round(b.getBoundingClientRect().top) };
  });
}
const px = async (p, y) => { const png = await p.screenshot({ clip: { x: 20, y, width: 1, height: 1 }, encoding: 'base64' });
  return p.evaluate(async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); }, png); };
const near = (a, b, d = 6) => a.every((v, i) => Math.abs(v - b[i]) <= d);
for (const skin of ['', 'pencil', 'ellada', 'celestial', 'babochkovyi']) for (const night of [false, true]) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  if (skin) await p.evaluate((s) => { S.gold = 99999; buy('skin-' + s); wear('skin-' + s); }, skin);
  await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
  if (night) { await p.evaluate(() => el('btnDayNight').click()); await sleep(600); }
  await p.evaluate(() => { const r = el('reader'); r.classList.add('nobaranim'); r.classList.remove('barsoff'); document.querySelectorAll('.toast,#toast').forEach(t => t.remove()); }); await sleep(600);
  const s = await probe(p), tag = (skin || 'default') + (night ? ' night' : ' day');
  ok(tag + ': no line drawn between the panels and the page (no box-shadow, no border)', s.shadows.every(x => x === 'none') && s.borders.every(x => x === '0px/0px'), s);
  ok(tag + ': both panels end in a soft fade of 32 px, no pencil line mask', /gradient/.test(s.fadeA) && /gradient/.test(s.fadeB) && s.hA === '32px' && !/url/.test(s.maskA), { a: s.fadeA.slice(0, 60), h: s.hA });
  const inA = await px(p, s.hb - 2), outA = await px(p, s.hb), inB = await px(p, s.bt + 1), outB = await px(p, s.bt - 1);
  ok(tag + ': no step at the panel edge — the fade starts in the panel\'s own colour (top and bottom)', near(inA, outA) && near(inB, outB), { inA, outA, inB, outB });
  await p.close();
}
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\npanelfade: ${n}/${checks.length}`); process.exit(n === checks.length ? 0 : 1);
