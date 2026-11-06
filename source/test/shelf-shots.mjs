// Скриншоты полки «Дневников» (06.11) по скинам. Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ OUT=/tmp/x node shelf-shots.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const OUT = process.env.OUT || '/tmp/shelf-shots';
const W = +(process.env.W || 390);
const SKINS = (process.env.SKINS || 'none,pencil,ellada,babochkovyi,celestial,alisa').split(',');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
for (const sk of SKINS) for (const night of [false, true]) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(sk + ': ' + e.message));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  await p.evaluate(async (sk, night) => {
    S.gold = 5000;
    if (sk !== 'none') { const id = 'skin-' + sk; if (shopItem(id).price) buy(id); wear(id); }
    const bs = allBooks(); const cc = ['blue', 'kraft', 'black', 'green', 'red', 'blue', 'kraft'];
    bs.slice(0, 6).forEach((b, i) => { S.quotes[b.id] = Array.from({ length: (i * 3) % 9 }, (_, k) => ({ text: 'Цитата ' + k, note: '', date: '2026-10-2' + (k % 9), c: 'y' }));
      const y = diaryNew({ b: b.id }); y.cc = cc[i]; if (i % 2) y.rb = 'gold';
      for (let k = 0; k < i; k++) { const n = dyNewEntry(y, ''); n.t = 'Запись ' + (k + 1); n.x = 'Мне нравится, как автор сразу бросает в конфликт и не тянет.'; }
      y.u = Date.now() - i * 3600e3; });
    const y3 = diaryNew({ t: 'Что прочитать' }); y3.cc = 'black'; y3.rb = 'red'; y3.pn = true; y3.u = Date.now() - 9e7;
    save();
    if (night) { if (sk === 'none') toggleAppNight(); else toggleDayNight(); }
  }, sk, night);
  await sleep(500);
  const tag = sk + (night ? '-night' : '-day');
  await p.evaluate(() => navGo('diary')); await sleep(500);
  await p.screenshot({ path: `${OUT}/${tag}-1shelf.png` });
  await p.evaluate(() => { el('diary').querySelector('.scroll').scrollTop = 420; }); await sleep(250);
  await p.screenshot({ path: `${OUT}/${tag}-2shelf-low.png` });
  await ctx.close();
}
console.log('errors', JSON.stringify(errs));
await browser.close();
