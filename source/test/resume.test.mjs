// 1в-black: PDF page after return from background (Квестмастер + Архитектор). Headless Chrome, dist served under /readquest/.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node resume.test.mjs
// Checks: hide 5 min → return: dayMinutes not grown, awardedSessionIds / dailyPaidDays unchanged, pos/ratio byte-identical,
// canvas not blank, visibilitychange + pageshow(persisted) → exactly ONE resume render, session held until pdfSwap, released after.
import puppeteer from 'puppeteer-core';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const PDF = (process.env.RQ_PDFDIR || '/workspace/rqtest/pdf/') + 'b-nolabels-40.pdf';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  window.__rqTimeOffset = 0;
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; };
  window.__vis = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__vis === 'hidden' });
});
const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
page.on('dialog', d => d.accept());

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await (await page.$('#fileInp')).uploadFile(PDF);
await page.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
const bid = await page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
await page.evaluate(id => openBook(id), bid);
await page.waitForFunction(() => R.pdf && __rqPdf.swaps > 0 && __rqPdf.shown >= 0, { timeout: 20000 }); await sleep(500);

const snap = () => page.evaluate((id) => {
  const sn = __tracker.snapshot();
  return { counted: sn.countedMs, dayMin: dayMin(today(), sn.minutes), awarded: JSON.stringify(S.awardedSessionIds || []),
    daily: JSON.stringify(S.dailyPaidDays || []), weekly: JSON.stringify(S.weeklyPaidWeeks || []), gold: S.gold,
    prog: JSON.stringify(S.progress[id] || null), pos: (S.progress[id] || {}).pos, ratio: (S.progress[id] || {}).ratio,
    held: __tracker.isHeld(), renders: __rqPdf.renders, swaps: __rqPdf.swaps, resumes: __rqPdf.resumes || 0, dup: __rqPdf.resumeDup || 0, shown: __rqPdf.shown };
}, bid);
const blank = () => page.evaluate(() => {
  const c = __rqPdf.front; if (!c || !c.width || !c.height || !c.isConnected) return { blank: true, why: 'no canvas' };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 97) { n++; if (d[i] + d[i + 1] + d[i + 2] < 600) dark++; }
  const vis = getComputedStyle(document.getElementById('pdfStage')).visibility;
  return { blank: dark === 0 || dark === n || vis === 'hidden', dark, n, vis, w: c.width };
});

// read: 3 pages × 30 s (flip forward → pos/ratio > 0), then 2 min on the current page (cap 3 min) → day minutes exist
for (let i = 0; i < 3; i++) { await page.evaluate(() => __rqAdv(30000)); await page.evaluate(() => pdfFlip(1)); await page.waitForFunction((n) => __rqPdf.shown === n, { timeout: 10000 }, i + 1); await sleep(300); }
await page.evaluate(() => __rqAdv(2 * 60000)); await sleep(100);
const b = await snap();
ok('reading counted before hiding, pos > 0', b.counted > 60000 && b.pos > 0, { counted: Math.round(b.counted), dayMin: b.dayMin, pos: b.pos, ratio: b.ratio });

// record whether the session is held at the moment of the resume swap
await page.evaluate(() => { const sw = window.pdfSwap; window.__swapHeld = []; window.pdfSwap = function () { window.__swapHeld.push({ held: __tracker.isHeld(), why: __rqPdf.reqWhy }); return sw.apply(this, arguments); }; });

// go to background for 5 minutes; Android drops the canvas bitmap
await page.evaluate(() => { window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); });
await page.evaluate(() => { __rqAdv(5 * 60000); const c = __rqPdf.front; if (c) { c.width = c.width; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); } });
const h = await snap();
ok('hidden: nothing counted while in background', Math.abs(h.counted - b.counted) < 2000, { before: Math.round(b.counted), hidden: Math.round(h.counted) });

// return: both events; 60 s pass before the page is re-drawn (slow phone)
const r = await page.evaluate(() => {
  window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  const held = __tracker.isHeld(); __rqAdv(60000);
  return { held, resuming: !!__rqPdf.resuming };
});
ok('return: session held right away (resume render in flight)', r.held && r.resuming, r);
await page.waitForFunction((s) => __rqPdf.swaps > s && !__rqPdf.resuming, { timeout: 15000 }, h.swaps); await sleep(600);
const a = await snap();
const sh = await page.evaluate(() => window.__swapHeld);
ok('session was held when the resume page was swapped in', sh.length === 1 && sh[0].held === true && sh[0].why === 'resume', sh);
ok('released after swap', a.held === false, { held: a.held });
ok('visibilitychange + pageshow(persisted) → exactly one resume render', a.resumes - h.resumes === 1 && a.renders - h.renders === 1 && a.swaps - h.swaps === 1 && a.dup - h.dup >= 1,
  { resumes: a.resumes - h.resumes, renders: a.renders - h.renders, swaps: a.swaps - h.swaps, dup: a.dup - h.dup });
ok('dayMinutes not grown (5 min hidden + 60 s blank canvas)', a.dayMin === b.dayMin && Math.abs(a.counted - b.counted) < 2000, { before: b.dayMin, after: a.dayMin, dCountedMs: Math.round(a.counted - b.counted) });
ok('awardedSessionIds / dailyPaidDays / weeklyPaidWeeks / gold unchanged', a.awarded === b.awarded && a.daily === b.daily && a.weekly === b.weekly && a.gold === b.gold, { gold: [b.gold, a.gold] });
ok('pos and ratio byte-identical', a.prog === b.prog, { before: b.prog, after: a.prog });
ok('same page after return', a.shown === b.shown, { before: b.shown, after: a.shown });
const bl = await blank();
ok('canvas not blank after return', !bl.blank, bl);
const pb = await page.evaluate(() => document.getElementById('pdfBack').classList.contains('hidden'));
ok('loading backdrop hidden after return', pb);

// clock runs again after release
await page.evaluate(() => __rqAdv(30000)); await sleep(50);
const c2 = await snap();
ok('clock counts again after release', c2.counted - a.counted >= 29000, { d: Math.round(c2.counted - a.counted) });

// a hidden → visible while NOT in a PDF never holds the session forever: render fails → released by safety / done
// RU/EN + night spinner colour
const misc = await page.evaluate(() => {
  const rd = document.getElementById('reader'); const prev = rd.getAttribute('data-page'); rd.setAttribute('data-page', 'night');
  const back = document.getElementById('pdfBack'); back.classList.remove('hidden');
  const col = getComputedStyle(document.querySelector('#pdfBack .pdfSpin')).borderRightColor;
  back.classList.add('hidden'); if (prev == null) rd.removeAttribute('data-page'); else rd.setAttribute('data-page', prev);
  return { en: tStr('Открываем страницу 12'), enR: tStr('Открываем страницу iv'), col };
});
ok('EN string «Opening page N»', misc.en === 'Opening page 12' && misc.enR === 'Opening page iv', misc);
ok('night spinner = #5fb8ae', misc.col === 'rgb(95, 184, 174)', misc.col);

// close: exactly one sessions[] row with the read minutes only, paid once
const rowN0 = await page.evaluate(() => SESS.length);
await page.evaluate(() => document.getElementById('btnBack').click()); await sleep(1200);
const fin = await page.evaluate((n0) => ({ rows: SESS.length - n0, min: SESS.length ? SESS[SESS.length - 1].minutes : 0,
  once: (S.awardedSessionIds || []).filter(x => x === (SESS[SESS.length - 1] || {}).id).length }), rowN0);
ok('one session row, minutes = reading only (≈3.5 + 0.5 min, not 10)', fin.rows === 1 && fin.min < 4.5 && fin.min > 3, fin);
ok('no page errors', errs.length === 0, errs);

const pass = checks.filter(c => c.p).length;
console.log(`SUMMARY resume: ${pass}/${checks.length}`);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
