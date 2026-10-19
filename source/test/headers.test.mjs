// 18.10 (Джессика): «верхняя плашка слишком большая, занимает много места… проверить у каждого скина, сделать плюс-минус одинаковыми».
// Screen headers are compact and about the same height in every skin: library (title band → filter chips) and the sub-screens
// (title row → first block); the band skins keep their decor inside the smaller band. 390 and 360.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node headers.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SK = ['', 'pencil', 'celestial', 'ellada', 'babochkovyi'];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; let p;
for (const w of [390, 360]) {
  p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await p.evaluate(() => { S.gold = 999999; save(); });
  const M = {};
  for (const sk of SK) {
    await p.evaluate(sk => { if (sk) buy('skin-' + sk); wear('skin-' + sk); }, sk);
    for (const s of ['library', 'profile', 'stats']) {
      await p.evaluate(s => { __navAllow = true; show(s); __navAllow = false; document.querySelectorAll('.scroll').forEach(x => x.scrollTop = 0); }, s); await sleep(250);
      M[(sk || 'default') + '/' + s] = await p.evaluate(s => { const sc = document.getElementById(s), t = sc.getBoundingClientRect().top;
        if (s === 'library') { const h = document.getElementById('libHead').getBoundingClientRect(); return { band: Math.round(h.bottom - t), first: Math.round(document.getElementById('libChips').getBoundingClientRect().top - t) }; }
        const first = [...sc.querySelectorAll('.wrap > *')].find((e, i) => i > 0 && e.offsetHeight > 0); return { first: Math.round(first.getBoundingClientRect().top - t) }; }, s);
    }
  }
  const lib = SK.map(k => M[(k || 'default') + '/library'].first), sub = SK.flatMap(k => ['profile', 'stats'].map(s => M[(k || 'default') + '/' + s].first));
  ok(w + ' library: the filters start at 70–84 px in every skin (header band ≤ 76)', lib.every(v => v >= 70 && v <= 84) && SK.every(k => M[(k || 'default') + '/library'].band <= 76), Object.fromEntries(SK.map(k => [k || 'default', M[(k || 'default') + '/library']])));
  ok(w + ' library: skins differ by ≤ 8 px', Math.max(...lib) - Math.min(...lib) <= 8, lib);
  ok(w + ' profile/stats: the first block starts at 60–78 px, skins differ by ≤ 14 px', sub.every(v => v >= 60 && v <= 78) && Math.max(...sub) - Math.min(...sub) <= 14, Object.fromEntries(SK.map(k => [k || 'default', [M[(k || 'default') + '/profile'].first, M[(k || 'default') + '/stats'].first]])));
  const fit = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(w + ' no horizontal scroll', fit);
}
// the band skins keep their decor
await p.evaluate(() => wear('skin-babochkovyi')); await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; }); await sleep(200);
const bb = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('libHead')); return { img: (c.backgroundImage.match(/data:image\/svg/g) || []).length, mask: /data:image\/svg/.test(c.webkitMaskImage || c.maskImage) }; });
await p.evaluate(() => wear('skin-ellada')); await sleep(200);
const el = await p.evaluate(() => { const h = document.getElementById('libHead'); return { top: /data:image\/svg/.test(getComputedStyle(h, '::before').backgroundImage), wave: /data:image\/svg/.test(getComputedStyle(h, '::after').backgroundImage) }; });
ok('decor kept: Бабочковый butterflies + scales + wavy edge, Эллада meander + wave', bb.img >= 2 && bb.mask && el.top && el.wave, { bb, el });
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY headers.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
