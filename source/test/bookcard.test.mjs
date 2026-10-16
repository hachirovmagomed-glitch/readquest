// Book card (info sheet, «i» in the library): grouped layout, no emoji; MVP hides difficulty/importance/stat/reward tiles (they change nothing there).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node bookcard.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const card = async (w, mvp) => {
  const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const r = await p.evaluate((mvp) => {
    if (!mvp) SET.mvp = false;
    const id = 'u_bc'; S.userBooks.push({ id, title: 'Очень длинное название книги, которое не помещается в одну строку', author: 'PDF', genre: 'PDF', type: 'pdf', pages: 144, size: 2338324, fname: 'Очень_длинное_имя_файла_без_пробелов_которое_должно_переноситься.pdf', cover: '' });
    S.progress[id] = { ratio: 0.9, pos: 0.4 }; S.bookStats[id] = { min: 135.7, pages: 50 }; show('library'); bookInfo(id);
    const body = el('bookSheetBody'), sheet = el('bookSheet'), sw = sheet.clientWidth;
    const over = [...body.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > sheet.getBoundingClientRect().right + 0.5 || b.left < -0.5) && !e.closest('.chips'); }).map(e => e.className || e.tagName);
    const txt = body.textContent;
    toggleFav(id); const favOn = !!body.querySelector('.bk-act.on'); toggleFav(id);
    return { emoji: (txt.match(/\p{Extended_Pictographic}/gu) || []), slider: !!body.querySelector('#bsetDiff'), reward: !!body.querySelector('#bsetReward'),
      pct: (body.querySelector('[data-rq="pct"]') || {}).textContent, time: (body.querySelector('[data-rq="time"]') || {}).textContent, sub: (body.querySelector('.bk-sub') || {}).textContent, over, favOn,
      acts: [...body.querySelectorAll('.bk-act')].map(b => b.textContent), lines: [...body.querySelectorAll('.bk-line')].map(b => b.textContent), sw };
  }, mvp);
  await p.close(); return r;
};
for (const w of [360, 390]) {
  const a = await card(w, true);
  ok(w + ' MVP: no emoji in the card', a.emoji.length === 0, a.emoji);
  ok(w + ' MVP: no difficulty/importance sliders and no reward tiles', !a.slider && !a.reward, a);
  ok(w + ' MVP: progress shows pos (40%), not farthest page', a.pct === '40%', a.pct);
  ok(w + ' MVP: reading time from bookStats.min, rounded down (135.7 → «2 ч 15 мин»)', a.time === '2 ч 15 мин', a.time);
  ok(w + ' MVP: author == genre shown once («PDF»)', a.sub === 'PDF', a.sub);
  ok(w + ' MVP: 3 quick actions, cover + 2 removal lines', a.acts.length === 3 && a.lines.length === 3, [a.acts, a.lines]);
  ok(w + ' MVP: favourite toggles the on-state', a.favOn);
  ok(w + ' nothing sticks out of the sheet', a.over.length === 0, a.over.slice(0, 5));
  const d = await card(w, false);
  ok(w + ' outside MVP: sliders and reward tiles still there, no emoji', d.slider && d.reward && d.emoji.length === 0, d.emoji);
}
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY bookcard.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
