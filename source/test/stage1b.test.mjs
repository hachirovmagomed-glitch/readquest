// Stage 1б (Фронт): focus mode + settings contract, jumps, atRisk 2 min, tap zones, pinch plaque, PDF backdrop, PDF night dim.
// Run: RQ_URL=http://127.0.0.1:8811/readquest/ [RQ_SHOTS=/tmp/1b-shots] node stage1b.test.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8811/readquest/';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const SHOTS = process.env.RQ_SHOTS || '/tmp/1b-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(book) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(book || BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
  p.__bid = await p.evaluate(() => S.userBooks[0].id); p.__ctx = ctx; return p;
}
const open = async (p) => { await p.evaluate(id => openBook(id), p.__bid); await p.waitForFunction(() => R.pageCount > 1, { timeout: 15000 }); await sleep(400); };
const tap = async (p, fx, fy) => { const r = await p.evaluate(() => { const b = document.getElementById('viewer').getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; }); await p.touchscreen.tap(r.l + r.w * fx, r.t + r.h * fy); await sleep(350); };
const st = (p) => p.evaluate(() => { const r = document.getElementById('reader'), c = document.getElementById('focusCount'); return { focus: r.classList.contains('focus'), barsoff: r.classList.contains('barsoff'), page: R.page, cnt: c.textContent, cntVis: getComputedStyle(c).display !== 'none', done: c.classList.contains('done'), aria: c.getAttribute('aria-label'), pgNumVis: getComputedStyle(document.getElementById('pgNum')).display !== 'none', dayBarVis: getComputedStyle(document.getElementById('dayBar')).visibility }; });
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);

/* ---------- 1. settings contract (hydrateSettings = import path) ---------- */
if (want('set')) {
  const sch = await import(new URL('../storage/schema.js', import.meta.url).href);
  const h = (s) => sch.hydrateSettings(s);
  ok('set: defaults focus=button pdfDim=0.35 readCounter=true, no focusMode', (() => { const d = h({}); return d.focus === 'button' && d.pdfDim === 0.35 && d.readCounter === true && !('focusMode' in d); })(), h({}));
  ok("set: focus 'хуйня' → 'button'; 'auto' kept", h({ focus: 'хуйня' }).focus === 'button' && h({ focus: 'auto' }).focus === 'auto' && h({ focus: 'off' }).focus === 'off');
  const dims = [[0.37, 0.35], [0.375, 0.4], [0.9, 0.5], [-1, 0], ['0.2', 0.35], [NaN, 0.35], [Infinity, 0.35], [0.5, 0.5]];
  ok('set: pdfDim 0.37→0.35, 0.375→0.4, 0.9→0.5, −1→0, string→0.35, NaN/∞→0.35', dims.every(([a, b]) => h({ pdfDim: a }).pdfDim === b), dims.map(([a]) => h({ pdfDim: a }).pdfDim));
  ok("set: readCounter 'да'→true, false kept", h({ readCounter: 'да' }).readCounter === true && h({ readCounter: false }).readCounter === false);
  ok('set: old backup focusMode:false → focus=button, key dropped', (() => { const d = h({ focusMode: false }); return d.focus === 'button' && !('focusMode' in d); })());
}

/* ---------- 1. focus mode in the app ---------- */
if (want('focus')) {
  const p = await fresh();
  await open(p);
  await p.evaluate(() => revealChrome()); await sleep(500);
  const btn = await p.evaluate(() => { const b = document.getElementById('btnFocus'); const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, emoji: /\p{Extended_Pictographic}/u.test(b.textContent), svg: !!b.querySelector('svg') }; });
  ok('focus: «Фокус» button ≥44×44, Lucide svg, no emoji', btn.svg && !btn.emoji && btn.w >= 44 && btn.h >= 44, btn);
  await p.evaluate(() => document.getElementById('btnFocus').click()); await sleep(500);
  // 7.4 counted minutes: three pages × ~2.47 min
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { window.__rqTimeOffset += 148000; }); await tap(p, 0.85, 0.5); }
  await p.evaluate(() => { window.__rqTimeOffset += 2000; updDayBar(); }); await sleep(100);
  let s = await st(p);
  const live = await p.evaluate(() => ({ snap: __tracker.snapshot().minutes, info: mvpDailyInfo(today(), __tracker.snapshot().minutes) }));
  ok('focus: side taps flip and keep focus', s.focus && s.barsoff && s.page === 3, s);
  ok('focus: counter «7 / 10 мин» = floor, same string as mvpDailyInfo(), aria', s.cntVis && s.cnt === '7 / 10 мин' && s.cnt === live.info && s.aria === 'Чтение засчитывается: 7 из 10 минут', { s, live });
  ok('focus: corner number and day bar hidden', !s.pgNumVis && s.dayBarVis === 'hidden', s);
  const ring = await p.evaluate(() => +document.querySelector('#focusCount circle:last-child').getAttribute('stroke-dashoffset'));
  ok('focus: ring = min(1, floor/goal) → 70 %', Math.abs(ring - 40.84 * 0.3) < 0.02, ring);
  // game toast suppressed in reader, info allowed
  const toasts = await p.evaluate(() => { document.querySelectorAll('.rq-toast').forEach(x => x.remove()); flashMsg('+30 монет · цель дня выполнена', { kind: 'game' }); flashMsg('+5 XP'); const g = document.querySelectorAll('.rq-toast').length; flashMsg('Яркость 60%', { kind: 'info', icon: 'sun' }); const t = document.querySelector('.rq-toast'); return { g, info: t && t.textContent, svg: !!(t && t.querySelector('svg')), role: t && t.getAttribute('role') }; });
  ok('focus: game toasts never in the reader; info toast with icon + role=status', toasts.g === 0 && toasts.info === 'Яркость 60%' && toasts.svg && toasts.role === 'status', toasts);
  await p.evaluate(() => document.querySelectorAll('.rq-toast').forEach(x => x.remove()));
  await p.screenshot({ path: SHOTS + '/focus-day.png' });
  await p.evaluate(() => { SET.theme = 'dark'; applySet(); }); await sleep(150);
  await p.screenshot({ path: SHOTS + '/focus-night.png' });
  // corner taps keep focus
  await tap(p, 0.9, 0.05); s = await st(p);
  const mark = await p.evaluate(() => ({ n: (S.marks[R.book.id] || []).length, t: (document.querySelector('.rq-toast') || {}).textContent }));
  ok('focus: top-right corner = bookmark + info toast «Закладка на стр. N», focus kept', s.focus && mark.n === 1 && mark.t === 'Закладка на стр. ' + (s.page + 1), { s, mark });
  // 10 / 10
  await p.evaluate(() => { window.__rqTimeOffset += 170000; }); await tap(p, 0.85, 0.5);
  await p.evaluate(() => { window.__rqTimeOffset += 5000; updDayBar(); }); await sleep(100);
  s = await st(p);
  ok('focus: goal met → «10 / 10 мин», check icon, .done, aria «Цель дня выполнена»', s.cnt === '10 / 10 мин' && s.done && s.aria === 'Цель дня выполнена: 10 из 10 минут', s);
  await p.evaluate(() => { SET.theme = 'sepia'; applySet(); document.querySelectorAll('.rq-toast').forEach(x => x.remove()); }); await sleep(150);
  await p.screenshot({ path: SHOTS + '/focus-done-day.png' });
  // centre tap leaves focus and shows panels
  await tap(p, 0.5, 0.5); s = await st(p);
  ok('focus: centre tap → focus off + panels shown', !s.focus && !s.barsoff, s);
  // readCounter off → only text
  await p.evaluate(() => { SET.readCounter = false; applySet(); setFocus(true); }); await sleep(200); s = await st(p);
  ok('focus: readCounter=false → no counter in focus', s.focus && !s.cntVis, s);
  // off → no button, setFocus is a no-op
  await p.evaluate(() => { SET.readCounter = true; revealChrome(); SET.focus = 'off'; applySet(); setFocus(true); }); await sleep(200);
  const off = await p.evaluate(() => ({ focus: document.getElementById('reader').classList.contains('focus'), btn: getComputedStyle(document.getElementById('btnFocus')).display }));
  ok("focus: SET.focus='off' hides the button, no focus", !off.focus && off.btn === 'none', off);
  // auto: 10 s without touching panels
  await p.evaluate(() => { SET.focus = 'auto'; applySet(); concealChrome('tap'); }); await sleep(10600); s = await st(p);
  ok("focus: SET.focus='auto' → focus by itself after 10 s", s.focus, s);
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.__ctx.close();
}

const pass = checks.filter(c => c.p).length;
ok('no pageerror', !errs.length, errs);
console.log('SUMMARY stage1b.test ' + checks.filter(c => c.p).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(c => c.p) ? 0 : 1);
