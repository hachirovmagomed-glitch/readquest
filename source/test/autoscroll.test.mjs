// 07.11 «Автопрокрутка» (Джессика: «чтобы страница автоматически листалась при прокрутке вниз»): in «Прокрутка» the text and a PDF glide up
// by themselves (js/read-more.js rmGlide); a finger on the screen holds it, after the finger it goes on; the honest rule is told (setAuto).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node autoscroll.test.mjs   (SHOTS=dir to save screenshots)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.SHOTS || '';
const PDF = path.join(here, 'fixtures/f-outline-30.pdf');
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const shot = async (n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png') }); };
await p.evaluate(() => { window.__autoLog = []; const t = __tracker, s0 = t && t.setAuto; if (s0) t.setAuto = function (on) { __autoLog.push(!!on); return s0.apply(this, arguments); }; });
const cdp = await p.target().createCDPSession();
const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

// 1. text in «Прокрутка»
await p.evaluate(async () => {
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, flipGet(), { mode: 'scroll', anim: 'none' }); saveSet(); applySet && applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
});
ok('text: scroll mode is on', await p.evaluate(() => rqScrollMode()));
let r = await p.evaluate(async () => {
  const out = { t: el('rmAutoT') && el('rmAutoT').textContent };
  const fm = el('flipModeSeg').closest('.rrow'); out.under = !!(fm && fm.nextElementSibling && fm.nextElementSibling.id === 'rmAutoRow');
  SET.rm.auto.sec = 10; const v = el('viewer'), t0 = v.scrollTop; rmAutoStart(); out.flash = (el('rmFlash') || {}).textContent || '';
  out.name = rmAutoName(); out.v = el('rmAutoV').textContent;
  const tops = []; for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 400)); tops.push(v.scrollTop - t0); }
  out.tops = tops; out.step = R.step; out.page = R.page; out.line = el('rmAutoLine').hidden; return out; });
ok('text: «Автопрокрутка» starts and the text glides up evenly (no jumps of a screen)', r.name === 'Автопрокрутка' && r.tops[0] > 5 && r.tops[3] > r.tops[2] && r.tops[2] > r.tops[1] && r.tops[1] > r.tops[0] && r.tops[3] < r.step / 2, r);
ok('text: the speed reads per screen, the page strip is hidden', /10 с на экран/.test(r.v) && r.line === true, r);
ok('text: the settings row says «Автопрокрутка» right under «Как листать»', await p.evaluate(() => { rmRenderSheet(); return el('rmAutoT').textContent === 'Автопрокрутка' && el('flipModeSeg').closest('.rrow').nextElementSibling.id === 'rmAutoRow'; }));
await shot('1-text-autoscroll');
// a finger on the text holds it; lifted → goes on
await T('touchStart', 200, 400); await sleep(60); await T('touchMove', 200, 380); await sleep(60);
r = await p.evaluate(async () => { const v = el('viewer'), a = v.scrollTop; await new Promise(r => setTimeout(r, 700)); return { d: v.scrollTop - a, touch: RM.auto.touch, on: RM.auto.on }; });
await T('touchMove', 200, 360);
ok('text: a finger on the screen — the text waits', r.on && r.touch && Math.abs(r.d) < 1.5, r);
await T('touchEnd'); await sleep(100);
r = await p.evaluate(async () => { const v = el('viewer'), a = v.scrollTop; await new Promise(r => setTimeout(r, 1000)); return { d: v.scrollTop - a, on: RM.auto.on, hold: rmAutoHold(), sm: typeof SM !== 'undefined' && SM.on, sel: !!selText(), panel: !el('panel').classList.contains('hidden'), sheet: !el('sheet').classList.contains('hidden'), touch: RM.auto.touch }; });
ok('text: the finger lifted — it goes on by itself', r.on && r.d > 5, r);
// a scroll by the reader (wheel / fling) moves the place; the autoscroll goes on from there, not back
r = await p.evaluate(async () => { const v = el('viewer'); v.scrollTop = v.scrollTop + 600; const a = v.scrollTop; await new Promise(r => setTimeout(r, 200)); const mid = v.scrollTop;
  await new Promise(r => setTimeout(r, 900)); return { a, mid, b: v.scrollTop }; });
ok('text: a scroll by the reader — it waits a moment and goes on from the new place', r.mid >= r.a - 1 && r.mid - r.a < 4 && r.b > r.mid + 3, r);
// centre tap = pause
r = await p.evaluate(async () => { const v = el('viewer').getBoundingClientRect(); viewerTap(v.left + v.width / 2, v.top + v.height / 2); const vv = el('viewer'), a = vv.scrollTop;
  await new Promise(r => setTimeout(r, 600)); const o = { paused: RM.auto.paused, d: vv.scrollTop - a }; rmAutoPause(false); return o; });
ok('text: a tap in the centre pauses it', r.paused && Math.abs(r.d) < 1.5, r);
r = await p.evaluate(() => { el('rmAutoX').click(); return { on: RM.auto.on, log: __autoLog.slice() }; });
ok('honest rule: setAuto(true) on start, false on pause and stop', !r.on && r.log[0] === true && r.log.includes(false) && r.log[r.log.length - 1] === false, r);
// page mode is untouched: still «Автолистание» with a page turn
r = await p.evaluate(async () => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); saveSet(); applySet(); relayout({ force: true }); await new Promise(r => setTimeout(r, 600));
  goPage(1, false); SET.rm.auto.sec = 2; rmAutoStart(); const o = { name: rmAutoName(), p0: R.page }; await new Promise(r => setTimeout(r, 2500)); o.p1 = R.page; rmAutoStop(); rmRenderSheet(); o.t = el('rmAutoT').textContent; return o; });
ok('«Страницы»: still «Автолистание», the page turns', r.name === 'Автолистание' && r.p1 === r.p0 + 1 && r.t === 'Автолистание', r);
await p.evaluate(async () => { await closeReader({ quiet: true }); }); await sleep(600);
await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); });

// 2. PDF in «Прокрутка»
const n0 = await p.evaluate(() => allBooks().filter(b => b.type === 'pdf').length);
await (await p.$('#fileInp')).uploadFile(PDF); await p.waitForFunction((n0) => allBooks().filter(b => b.type === 'pdf').length > n0, { timeout: 10000 }, n0);
await p.evaluate(async () => { const b = allBooks().filter(x => x.type === 'pdf').pop(); SET.flip = Object.assign({}, flipGet(), { mode: 'scroll' }); saveSet();
  S.progress[b.id] = { ratio: 0, pos: 0 }; save(); __navAllow = true; openBook(b.id); __navAllow = false; await new Promise(r => setTimeout(r, 3500)); });
ok('pdf: scroll mode is on', await p.evaluate(() => psOn()));
r = await p.evaluate(async () => { SET.rm.auto.sec = 6; const b = el('pdfScroll'), t0 = b.scrollTop, p0 = P.shown; rmAutoStart(); const o = { name: rmAutoName() };
  const tops = []; for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 500)); tops.push(Math.round(b.scrollTop - t0)); } o.tops = tops; o.slot = PS.tops[1] - PS.tops[0]; o.p0 = p0; return o; });
ok('pdf: «Автопрокрутка» glides the pages up evenly (no jump to the next page)', r.name === 'Автопрокрутка' && r.tops[0] > 5 && r.tops[3] > r.tops[1] && r.tops[3] < r.slot * 0.6, r);
await shot('2-pdf-autoscroll');
r = await p.evaluate(async () => { const b = el('pdfScroll'); b.scrollTop = PS.tops[1] + 10; await new Promise(r => setTimeout(r, 1400)); return { shown: P.shown, on: RM.auto.on }; });
ok('pdf: the page number follows the glide', r.on && r.shown >= 1, r);
r = await p.evaluate(async () => { const b = el('pdfScroll'); b.scrollTop = b.scrollHeight - b.clientHeight - 3; await new Promise(r => setTimeout(r, 1500)); return { on: RM.auto.on }; });
ok('pdf: at the end it stops («Конец книги»)', r.on === false, r);

ok('no page errors', errs.length === 0, errs);
console.log(`autoscroll: ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
