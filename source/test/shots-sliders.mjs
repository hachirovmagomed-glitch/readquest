// 22.10 shots: «Яркость» / «Тёплый оттенок» in «Настройки чтения → Страница» + the top-bar «Яркость», every skin, day and night.
// Run: node shots-sliders.mjs OUTDIR [suffix]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/', OUT = process.argv[2] || '/tmp', SUF = process.argv[3] || '';
const W = +(process.env.RQ_W || 390);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await browser.newPage(); await p.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
await p.addStyleTag({ content: '.rq-toast{display:none!important}' });
const SHOP_READY_ = await p.evaluate(() => SHOP_READY);
const skins = await p.evaluate(() => { S.gold = 99999; save(); return [...new Set(SHOP_CATALOG.filter(x => x.skin).map(x => x.skin))]; });
for (const sk of ['', ...skins.filter(s => SHOP_READY_.includes(s))]) {
  for (const night of [false, true]) {
    await p.evaluate(async (sk, night, B, WM) => {
      if (sk) { buy(sk); wear(sk); } else if (typeof unwear === 'function') unwear();
      const b = BOOKS.slice().sort((a, b) => (b.text || '').length - (a.text || '').length)[0];
      if (el('reader').classList.contains('hidden')) { openBook(b.id); await new Promise(r => setTimeout(r, 1500)); }
      if (night !== (el('reader').dataset.page === 'night')) toggleDayNight();
      SET.bright = B; SET.warm = WM; applySet(); revealChrome();
      openReaderSettings('grpPage'); await new Promise(r => setTimeout(r, 400));
      const r = el('warmRange').closest('.rrow'); r.scrollIntoView({ block: 'end' }); await new Promise(r => setTimeout(r, 300));
    }, sk, night, +(process.env.RQ_B || 0.75), +(process.env.RQ_WM || 0.25));
    const name = (sk || 'default').replace('skin-', '') + (night ? '-night' : '');
    const box = await p.evaluate(() => { const a = el('brightRange').closest('.rrow').getBoundingClientRect(), b = el('warmRange').closest('.rrow').getBoundingClientRect(); return { y: a.top - 8, h: b.bottom - a.top + 16 }; });
    await p.screenshot({ path: `${OUT}/sheet-${name}${SUF}.png`, clip: { x: 0, y: Math.max(0, box.y), width: W, height: box.h } });
    await p.evaluate(async () => { el('sheet').classList.add('hidden'); revealChrome(); await new Promise(r => setTimeout(r, 400)); });
    await p.screenshot({ path: `${OUT}/bar-${name}${SUF}.png`, clip: { x: 0, y: 0, width: W, height: 150 } });
  }
}
await browser.close();
