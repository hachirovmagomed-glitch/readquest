// 10.11 (тестер: «сворачиваешь приложение и заходишь назад — страница на время слетает»). Headless Chrome, dist under /readquest/test/.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node bgsnap.test.mjs
// Leaving the app: a copy of the page on screen stays, the column strip is out of the layout (display:none) → the first frame back
// is the light copy (no empty page while the whole book is laid out again); two frames later the strip is back, same page.
// Checks: copy = the page pixel for pixel; first frame back shows the copy; strip back, copy gone, page / anchor kept; no extra
// re-layout when the size is the same; a size change while away → ONE re-layout, the reading place kept; read-aloud / selection
// → nothing is put away; closing the reader while away brings the strip back; rq_v1 byte-identical over a hide / return.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { PNG } from 'pngjs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const TXT = (process.env.RQ_FIX || '/workspace/rqtest/') + 'Длинная книга.txt';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const txt = fs.readFileSync(TXT, 'utf8');
await p.evaluate(async (t) => { await importBookFiles([new File([t.repeat(6)], 'Свернуть.txt', { type: 'text/plain' })]); }, txt);
await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
await p.evaluate(() => openBook(S.userBooks[0].id)); await p.waitForFunction(() => R.pageCount > 50, { timeout: 15000 }); await sleep(800);
await p.evaluate(() => goPage(30, true)); await sleep(500);
await p.evaluate(() => concealChrome('tap')); await sleep(700);
const st = () => p.evaluate(() => ({ page: R.page, pc: R.pageCount, lc: __rqLayoutCount, on: __rqBgSnap.on, takes: __rqBgSnap.takes, backs: __rqBgSnap.backs,
  disp: el('content').style.display, sheets: document.querySelectorAll('.rqBgSnap').length }));
const png = (b) => PNG.sync.read(b);
const same = (a, b) => { const A = png(a), B = png(b); if (A.width !== B.width || A.height !== B.height) return -1; let d = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 30) d++; return d; };

// 1. the copy is the page, pixel for pixel
const real = await p.screenshot();
await p.evaluate(() => rqBgSnapTake()); await sleep(200);
const s1 = await st(); const snap = await p.screenshot();
ok('away: strip out of the layout, one page copy over it', s1.on && s1.disp === 'none' && s1.sheets === 1, s1);
ok('the copy looks exactly like the page', same(real, snap) === 0, { diff: same(real, snap) });
await p.evaluate(() => rqBgSnapRestore()); await sleep(200);
const s2 = await st();
ok('back: strip in, copy gone, same page, no re-layout', !s2.on && s2.disp === '' && s2.sheets === 0 && s2.page === 30 && s2.lc === s1.lc, s2);

// 2. a real hide / return (another tab in front): first frame back = the copy, then the strip; nothing written
const v1a = await p.evaluate(() => localStorage.getItem(RQ_K.v1));
await p.evaluate(() => { window.__fr = []; document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return;
  const t0 = performance.now(); const f = () => { __fr.push({ t: Math.round(performance.now() - t0), copy: !!document.querySelector('.rqBgSnap'), disp: el('content').style.display }); if (__fr.length < 4) requestAnimationFrame(f); }; requestAnimationFrame(f); }); });
const lc0 = (await st()).lc;
let p2 = await ctx.newPage(); await p2.bringToFront(); await sleep(700);
const s3 = await st();
ok('hidden → put away', s3.on && s3.disp === 'none' && s3.sheets === 1, s3);
await p.bringToFront(); await sleep(1500);
const fr = await p.evaluate(() => __fr), s4 = await st();
ok('first frame back shows the copy (no empty page)', fr[0] && fr[0].copy && fr[0].disp === 'none', fr);
ok('then the strip is back on the same page, no re-layout', !s4.on && s4.disp === '' && s4.sheets === 0 && s4.page === 30 && s4.lc === lc0, s4);
const v1b = await p.evaluate(() => localStorage.getItem(RQ_K.v1));
ok('rq_v1 byte-identical over hide / return', v1a === v1b);
await p2.close();

// 3. the screen size changes while away (fullscreen gone) → ONE re-layout, the reading place kept
await p.evaluate(() => concealChrome('tap')); await sleep(600);
await p.evaluate(() => { window.__A = readingAnchor(); });
ok('anchor taken before hiding', await p.evaluate(() => !!__A));
p2 = await ctx.newPage(); await p2.bringToFront(); await sleep(500);
await p.setViewport({ width: 412, height: 843, isMobile: true, hasTouch: true }); await sleep(400);
await p.bringToFront(); await sleep(1500);
const s5 = await st(), ap = await p.evaluate(() => pageOfAnchor(__A));
ok('size changed while away: one re-layout, anchor still on screen', !s5.on && s5.sheets === 0 && s5.lc === lc0 + 1 && ap === s5.page, { s5, anchorPage: ap });
await p2.close();

// 4. read-aloud / a selection: nothing is put away
await p.evaluate(() => { ttsOn = true; rqBgSnapTake(); }); const s6 = await st(); await p.evaluate(() => { ttsOn = false; });
ok('read-aloud on → not put away', !s6.on && s6.disp === '', s6);
await p.evaluate(() => { const c = el('content'), t = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n; while ((n = t.nextNode()) && n.nodeValue.length < 20); const r = document.createRange(); r.setStart(n, 2); r.setEnd(n, 12); getSelection().removeAllRanges(); getSelection().addRange(r); rqBgSnapTake(); });
const s7 = await st(); await p.evaluate(() => getSelection().removeAllRanges());
ok('a selection → not put away', !s7.on && s7.disp === '', s7);

// 5. a turn while away brings the strip back first; closing the reader while away too
await p.evaluate(() => rqBgSnapTake()); await p.evaluate(() => goPage(R.page + 1, true)); await sleep(300);
const s8 = await st();
ok('a page turn while away: strip back, page turned', !s8.on && s8.disp === '' && s8.sheets === 0 && s8.page === s5.page + 1, s8);
await p.evaluate(() => rqBgSnapTake()); await p.evaluate(() => closeReader()); await sleep(800);
const s9 = await st();
ok('closing the reader while away: strip back, no copy left', !s9.on && s9.disp === '' && s9.sheets === 0, s9);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\nbgsnap: ${n}/${checks.length}`); process.exit(n === checks.length ? 0 : 1);
