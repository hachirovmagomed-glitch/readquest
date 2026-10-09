// 1б «назад» через историю браузера (Интерфейс: порядок; Архитектор: контракт). Headless Chrome, dist served under /readquest/.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node back.test.mjs
// Checks: back → summary with the URL unchanged and exactly one sessions[] row; summary → library; library → leaves the app;
// header ← + immediate goBack() → one row; open sheet → back closes it only; panels shown → back hides them only;
// F5 in the reader then back → no crash, no summary; system fullscreen exit → panels visible.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
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
});
const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
page.on('dialog', d => d.accept());

const boot = async () => { await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300); };
const back = async () => { await page.goBack({ timeout: 4000 }).catch(() => {}); await sleep(500); };
const st = () => page.evaluate(async () => ({
  url: location.href, hs: history.state, reader: !document.getElementById('reader').classList.contains('hidden'),
  summary: !document.getElementById('summary').classList.contains('hidden'), library: !document.getElementById('library').classList.contains('hidden'),
  barsoff: document.getElementById('reader').classList.contains('barsoff'), sheet: !document.getElementById('sheet').classList.contains('hidden'),
  panel: !document.getElementById('panel').classList.contains('hidden'), sess: SESS.length, idb: (await __rq.listSessions({})).length,
  ids: SESS.map(r => r.id), book: !!(R && R.book),
}));

await page.goto('about:blank');
await page.goto(BASE, { waitUntil: 'load' }); await boot();
const URL0 = page.url();
await (await page.$('#fileInp')).uploadFile(BOOK);
await page.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
const bid = await page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
const open = async () => { await page.evaluate(id => openBook(id), bid); await page.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(400); };
const read = (ms) => page.evaluate(m => window.__rqAdv(m), ms);

// 1) open, read 1.5 min, back → summary; URL unchanged; exactly one row
let s0 = await st();
await open(); await read(90000);
let s1 = await st();
await back();
let s2 = await st();
ok('open → {rq:reader}, URL unchanged', s1.reader && s1.hs && s1.hs.rq === 'reader' && s1.url === URL0, { hs: s1.hs, url: s1.url });
ok('back in reader (panels hidden) → summary, one sessions[] row (SESS + IDB)', s2.summary && !s2.reader && s2.sess === s0.sess + 1 && s2.idb === s0.idb + 1, { s0: [s0.sess, s0.idb], s2: [s2.sess, s2.idb], summary: s2.summary });
ok('URL unchanged on summary, no #', s2.url === URL0 && !s2.url.includes('#'), s2.url);
await back();
let s3 = await st();
ok('back on summary → library, no extra row', s3.library && !s3.summary && s3.idb === s2.idb, { library: s3.library, idb: s3.idb });

// 2) header ← + immediate goBack() → one row (idempotent closeReader)
await open(); await read(80000);
let h0 = await st();
await page.evaluate(() => document.getElementById('btnBack').click());
await page.goBack({ timeout: 4000 }).catch(() => {});
await sleep(1500);
let h1 = await st();
ok('header ← + immediate goBack() → exactly one new row, unique ids', h1.idb === h0.idb + 1 && h1.sess === h0.sess + 1 && new Set(h1.ids).size === h1.ids.length, { before: h0.idb, after: h1.idb, sess: h1.sess });
ok('… and we are still in the app (summary or library), URL unchanged', (h1.summary || h1.library) && h1.url === URL0, { url: h1.url, summary: h1.summary, library: h1.library });
if (h1.summary) { await page.evaluate(() => document.getElementById('btnDone').click()); await sleep(400); }

// 3) concurrent close: header ← + popstate + pwa-lock style closeReader() in the same tick
await open(); await read(70000);
let c0 = await st();
await page.evaluate(() => { document.getElementById('btnBack').click(); closeReader(); closeReader(); });
await sleep(1500);
let c1 = await st();
ok('← + closeReader() ×2 together → one row, summary stays up', c1.idb === c0.idb + 1 && c1.summary, { before: c0.idb, after: c1.idb, summary: c1.summary });
const xpOnce = await page.evaluate(() => { const id = SESS[SESS.length - 1].id; return (S.awardedSessionIds || (S.game && S.game.awardedSessionIds) || []).filter(x => x === id).length; });
ok('… awarded once', xpOnce <= 1, xpOnce);
await page.evaluate(() => document.getElementById('btnDone').click()); await sleep(400);

// 4) sheet open → back closes the sheet only; panels shown → back hides them only; then back closes the book
await open(); await read(65000);
await page.evaluate(() => { revealChrome(); renderThemeSeg(); document.getElementById('sheet').classList.remove('hidden'); });
let d0 = await st(); const n0 = d0.idb;
await back();
let d1 = await st();
ok('sheet open → back closes the sheet only (reader open, no row)', d0.sheet && !d1.sheet && d1.reader && d1.idb === n0 && d1.hs && d1.hs.rq === 'reader', { d0: d0.sheet, d1 });
await page.evaluate(() => revealChrome());
let p0 = await st();
await back();
let p1 = await st();
ok('panels shown → back hides them only', !p0.barsoff && p1.barsoff && p1.reader && p1.idb === n0 && p1.hs && p1.hs.rq === 'reader', { p0: p0.barsoff, p1: p1.barsoff, reader: p1.reader });
await back();
let p2 = await st();
ok('then back → summary, one row', p2.summary && p2.idb === n0 + 1, { summary: p2.summary, idb: p2.idb });
await back();

// 5) F5 in the reader, then back → no crash, no summary
await open(); await read(30000);
errs.length = 0;
await page.reload({ waitUntil: 'load' }); await boot();
let f0 = await st();
await back();
let f1 = await st();
ok('F5 in reader → back: no pageerror, no summary, library, URL same', !errs.length && !f1.summary && f1.library && !f1.reader && f1.url === URL0, { errs, f0: { hs: f0.hs, lib: f0.library }, f1: { summary: f1.summary, lib: f1.library, url: f1.url } });

// 6) fullscreen: system exits fullscreen while reading → panels visible
await open();
await page.evaluate(() => revealChrome()); await sleep(200);
await page.click('#btnFull'); await sleep(600);
const fsIn = await page.evaluate(() => ({ fs: !!document.fullscreenElement, barsoff: document.getElementById('reader').classList.contains('barsoff'), FSW }));
await page.evaluate(() => document.exitFullscreen()); await sleep(600);
const fsOut = await page.evaluate(() => ({ fs: !!document.fullscreenElement, barsoff: document.getElementById('reader').classList.contains('barsoff') }));
ok('system fullscreen exit → panels visible', fsIn.fs && fsIn.barsoff && !fsOut.fs && !fsOut.barsoff, { fsIn, fsOut });
await page.evaluate(() => document.getElementById('btnBack').click()); await sleep(1200);
const e0 = await st();
if (e0.summary) await back();

// 7) library → back leaves the app
const l0 = await st();
await page.goBack({ timeout: 4000 }).catch(() => {}); await sleep(500);
ok('library → back leaves the app', l0.library && page.url() === 'about:blank', { lib: l0.library, url: page.url() });
ok('no pageerror during the run', !errs.length, errs);

const pass = checks.filter(c => c.p).length;
console.log('SUMMARY back.test ' + pass + '/' + checks.length);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
