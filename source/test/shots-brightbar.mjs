// 20.10 shots: «Яркость» under the top bar in every skin + «Настройки чтения» (font row, sticky head). Run: node shots-brightbar.mjs OUTDIR
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/', OUT = process.argv[2] || '/tmp';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await browser.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
const skins = await p.evaluate(() => { S.gold = 99999; save(); return [...new Set(SHOP_CATALOG.filter(x => x.skin).map(x => x.skin))]; });
console.log(skins);
for (const sk of ['', ...skins]) {
  for (const night of [false, true]) {
    await p.evaluate(async (sk, night) => {
      if (sk) { buy(sk); wear(sk); } else if (typeof unwear === 'function') unwear(); 
      const b = BOOKS.slice().sort((a, b) => (b.text || '').length - (a.text || '').length)[0];
      if (el('reader').classList.contains('hidden')) { openBook(b.id); await new Promise(r => setTimeout(r, 1500)); }
      if (night !== (el('reader').dataset.page === 'night')) toggleDayNight();
      SET.bright = 0.75; applySet(); el('sheet').classList.add('hidden'); revealChrome(); await new Promise(r => setTimeout(r, 500));
    }, sk, night);
    const name = (sk || 'default').replace('skin-', '') + (night ? '-night' : '');
    await p.screenshot({ path: `${OUT}/yarkost-${name}.png`, clip: { x: 0, y: 0, width: 390, height: 170 } });
  }
}
await p.evaluate(async () => { if (el('reader').dataset.page === 'night') toggleDayNight(); openReaderSettings('grpText'); await new Promise(r => setTimeout(r, 400)); });
await p.screenshot({ path: `${OUT}/nastroyki-verh.png` });
await p.evaluate(async () => { el('sheet').scrollTop = 300; await new Promise(r => setTimeout(r, 200)); });
await p.screenshot({ path: `${OUT}/nastroyki-prokrutka.png` });
await p.evaluate(async () => { el('sheet').scrollTop = 0; document.querySelector('#setCats [data-g=grpPage]').click(); await new Promise(r => setTimeout(r, 300)); });
await p.screenshot({ path: `${OUT}/nastroyki-stranica.png` });
await browser.close();
