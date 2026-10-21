// Reader bottom bar: the «Aa» (Шрифт) glyph takes the same colour as the other icons in every skin (Джессика 20.10: it stayed black).
// Only the glyph colour follows the skin; the book font does not.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node aacolor.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const browser = await puppeteer.launch({ executablePath: process.env.RQ_CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await browser.newPage(); await p.setViewport({ width: 390, height: 844 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
const skins = await p.evaluate(() => [...new Set(SHOP_CATALOG.filter(x => x.skin && shopReady(x.skin)).map(x => x.skin))]);
ok('0 at least one ready skin', skins.length > 0, skins);
for (const sk of [null, ...skins]) {
  const r = await p.evaluate(async (sk) => {
    S.gold = 99999; save(); if (sk) { buy(sk); wear(sk); } else document.documentElement.removeAttribute('data-skin');
    await new Promise(r => setTimeout(r, 150));
    const c = e => getComputedStyle(e).color;
    return { skin: document.documentElement.dataset.skin || 'none', aa: c(document.querySelector('#btnAa .aa')), ic: c(document.querySelector('#rBar .ic')) };
  }, sk);
  ok('1 ' + r.skin + ': «Aa» colour = icon colour', r.aa === r.ic, r);
}
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
