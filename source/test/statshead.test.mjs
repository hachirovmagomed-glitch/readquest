// 06.11 (Джессика, скрин Карандашного на 360: «Статистика налезает на количество дней. Проверить во всех скинах»):
// on the Stats screen the title never overlaps the «7 дней / 30 дней» chips and is not clipped, in every skin, day and night, at 360 and 390.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node statshead.test.mjs   (RQ_SHOTS=<dir> also saves a header shot per case)
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS;
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SK = ['', 'pencil', 'celestial', 'ellada', 'babochkovyi', 'alisa'];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
for (const w of [360, 390]) {
  const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: w, height: 760, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await p.evaluate(() => { S.gold = 999999; save(); });
  for (const sk of SK) for (const nt of [false, true]) {
    const r = await p.evaluate(async (sk, nt) => {
      if (sk) { buy('skin-' + sk); wear('skin-' + sk); } else { wear('skin-default'); S.appTheme = 'light'; save(); applyAppTheme(); }
      if (!isLightBg(activeTheme().bg) !== nt) toggleDayNight();
      __navAllow = true; show('stats'); __navAllow = false; document.querySelectorAll('.scroll').forEach(x => x.scrollTop = 0);
      await new Promise(q => setTimeout(q, 300));
      const h = document.querySelector('#stats h1'), a = document.getElementById('stP7'), b = document.getElementById('stP30'), m = document.getElementById('menuStats');
      const R = e => e.getBoundingClientRect(), hr = R(h), ar = R(a), br = R(b), mr = R(m);
      const rg = document.createRange(); rg.selectNodeContents(h); const tr = rg.getBoundingClientRect();
      const hit = (x, y) => !(x.right <= y.left + 0.5 || y.right <= x.left + 0.5 || x.bottom <= y.top + 0.5 || y.bottom <= x.top + 0.5);
      return { night: !isLightBg(activeTheme().bg), overlap: hit(tr, ar) || hit(tr, br) || hit(tr, mr) || hit(ar, br), clipped: h.scrollWidth > h.clientWidth + 1,
        inside: br.right <= innerWidth - 4 && ar.left >= 0, title: [Math.round(tr.left), Math.round(tr.right)], chips: [Math.round(ar.left), Math.round(br.right), Math.round(ar.top - hr.top)] };
    }, sk, nt);
    const name = `${w} ${sk || 'default'} ${nt ? 'ночь' : 'день'}`;
    ok(name + ': title and chips do not overlap, title whole, chips on screen', r.night === nt && !r.overlap && !r.clipped && r.inside, r);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-${sk || 'default'}-${nt ? 'night' : 'day'}.png`, clip: { x: 0, y: 0, width: w, height: 240 } });
  }
  ok(w + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY statshead.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
