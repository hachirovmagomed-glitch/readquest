// Screenshots of the chapter skins («Ламанча», «Петербург», «Модерн») for review: library and «Путь читателя», day and night, 390 and 360.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_SHOTS=/tmp/cs-shots node chapterskins-shots.mjs [skin …]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const OUT = (process.env.RQ_SHOTS || '/tmp/cs-shots').replace(/\/?$/, '/'); mkdirSync(OUT, { recursive: true });
const SKINS = process.argv.slice(2).length ? process.argv.slice(2) : ['lamancha', 'peterburg', 'modern'];
const CH = { lamancha: 'ch2', peterburg: 'ch3', modern: 'ch4' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
for (const w of [390, 360]) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  for (const sk of SKINS) {
    await p.evaluate((ch) => { /* every book of the chapter read (+ one started book elsewhere) — the same shape the map reads */
      const c = PATH_CHAPTERS.find(x => x.id === ch);
      c.books.forEach((b, i) => { const id = 'cs-' + b.id; if (!S.userBooks.find(x => x.id === id)) S.userBooks.push({ id, title: b.t, author: b.a, pathId: b.id, cover: '📖' }); if (!S.finished.includes(id)) S.finished.push(id); });
      ['oedipus', 'hamlet', 'carol'].forEach((pid, i) => { const id = 'cs-' + pid; if (!S.userBooks.find(x => x.id === id)) { S.userBooks.push({ id, title: pid, author: '', pathId: pid, cover: '📖' }); S.progress[id] = { ratio: 0.3 + i * 0.2 }; } });
      save();
    }, CH[sk]);
    const worn = await p.evaluate((sk) => wear('skin-' + sk), sk);
    for (const night of [false, true]) {
      await p.evaluate((sk, night) => { SET.theme = night ? sk + '-night' : sk; saveSet(); applySet(); }, sk, night); await sleep(300);
      await p.evaluate(() => { show('library'); renderLibrary(); }); await sleep(500);
      await p.screenshot({ path: `${OUT}${sk}-biblioteka-${night ? 'noch' : 'den'}-${w}.png` });
      await p.evaluate(async (ch) => { navGo('path'); await new Promise(r => setTimeout(r, 500)); const s = document.querySelector('#path [data-ch="' + ch + '"]'); s.scrollIntoView({ block: 'start' }); const sc = document.querySelector('#path .scroll'); if (sc) sc.scrollTop -= 8; }, CH[sk]); await sleep(400);
      await p.screenshot({ path: `${OUT}${sk}-put-${night ? 'noch' : 'den'}-${w}.png` });
    }
    console.log(sk, w, 'worn', worn);
  }
  await ctx.close();
}
await browser.close();
