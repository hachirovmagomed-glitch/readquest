// 1в: read-aloud (TTS) auto-advance is NOT reading. Pages it shows: page_visible {via:'tts'}, no turn / pageTurns,
// R.maxRatio («reached», 70 % finish rule) unchanged; current position R.pos follows. Text and PDF.
// speechSynthesis is stubbed (utterance ends at once). Run: RQ_URL=http://127.0.0.1:8767/readquest/ node tts.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
const PDF = (process.env.RQ_PDFDIR || '/workspace/rqtest/pdf/') + 'b-nolabels-40.pdf';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const sessRows = [];
async function run(file, mode) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => { /* test clock: __rqAdv(ms) moves Date.now/performance.now (dwell ≥ minSec without waiting) */
    window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; };
  });
  await p.evaluateOnNewDocument(() => { /* utterance «spoken» in 30 ms */
    const ss = { speaking: false, cancel() {}, speak(u) { setTimeout(() => { if (u.onend) u.onend(); }, 30); }, getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (t) { this.text = t; }, configurable: true, writable: true });
  });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(file); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
  const id = await p.evaluate(() => S.userBooks[0].id);
  await p.evaluate(id => openBook(id), id);
  if (mode === 'pdf') await p.waitForFunction(() => R.pdf && __rqPdf.swaps > 0, { timeout: 20000 });
  await sleep(800);
  const b0 = await p.evaluate(() => ({ page: R.page, max: R.maxRatio, pos: R.pos, snap: __tracker.snapshot() }));
  await p.evaluate(() => { revealChrome(); }); await sleep(600);
  await p.evaluate(() => document.getElementById('btnTts').click());
  await p.waitForFunction((pg) => R.page >= pg + 3, { timeout: 20000, polling: 100 }, b0.page).catch(() => {});
  await p.evaluate(() => ttsStop()); await sleep(500);
  const b1 = await p.evaluate(() => ({ page: R.page, max: R.maxRatio, pos: R.pos, snap: __tracker.snapshot() }));
  const ev = await p.evaluate(async (id) => (await __rq.listReadingEvents({})).filter(e => e.type === 'page_visible' && e.bookId === id).map(e => e.via || ''), id);
  console.log('   [' + mode + ']', JSON.stringify({ b0: { page: b0.page, max: b0.max, pos: b0.pos, turns: b0.snap.pageTurns }, b1: { page: b1.page, max: b1.max, pos: b1.pos, turns: b1.snap.pageTurns }, ev }));
  ok(mode + ': read-aloud advanced ≥ 3 pages', b1.page >= b0.page + 3, { from: b0.page, to: b1.page });
  ok(mode + ': its pages are page_visible via:\'tts\' (no via:\'turn\', no \'jump\')', ev.filter(v => v === 'tts').length >= 2 && !ev.includes('turn') && !ev.includes('jump'), ev);
  ok(mode + ': no pageTurns from read-aloud (70 % finish coverage counts reading turns only)', b1.snap.pageTurns === b0.snap.pageTurns, { before: b0.snap.pageTurns, after: b1.snap.pageTurns });
  ok(mode + ': «reached» (R.maxRatio) unchanged, position R.pos follows the page', b1.max === b0.max && b1.pos > b0.pos, { max: [b0.max, b1.max], pos: [b0.pos, b1.pos] });
  ok(mode + ': no fast-flip count (tracker turns) from read-aloud', b1.snap.turns === b0.snap.turns, { before: b0.snap.turns, after: b1.snap.turns });
  // after TTS stops, a normal forward tap is a reading turn again: via:'turn', turns+1, «reached» grows; flags do not stick
  const fl = await p.evaluate(() => ({ ttsAdv: !!R.ttsAdv, pTts: !!(typeof P !== 'undefined' && P.tts) }));
  ok(mode + ': R.ttsAdv / P.tts cleared after stop', !fl.ttsAdv && !fl.pTts, fl);
  await p.evaluate(() => { if (typeof hideChrome === 'function') hideChrome(); }); await sleep(800);
  /* hiding the bars re-lays the text out (taller page → the same first line may land on another page number); that is not reading */
  const bh = await p.evaluate(() => ({ page: R.page, max: R.maxRatio, snap: __tracker.snapshot() }));
  ok(mode + ': re-layout after read-aloud does not grow «reached» nor count turns', bh.max === b1.max && bh.snap.turns === b1.snap.turns && bh.snap.pageTurns === b1.snap.pageTurns, { max: [b1.max, bh.max], page: [b1.page, bh.page] });
  const evh = await p.evaluate(async (id) => (await __rq.listReadingEvents({})).filter(e => e.type === 'page_visible' && e.bookId === id).length, id);
  await p.evaluate(() => window.__rqAdv(13000)); /* dwell ≥ minSec (12 s) so the forward tap is a counted reading turn */
  await p.touchscreen.tap(370, 450);
  await p.waitForFunction((pg) => R.page === pg + 1, { timeout: 8000, polling: 100 }, bh.page).catch(() => {});
  await sleep(600);
  const b2 = await p.evaluate(() => ({ page: R.page, max: R.maxRatio, pos: R.pos, snap: __tracker.snapshot(), pTts: !!(typeof P !== 'undefined' && P.tts), ttsAdv: !!R.ttsAdv }));
  const ev2 = await p.evaluate(async (id) => (await __rq.listReadingEvents({})).filter(e => e.type === 'page_visible' && e.bookId === id).map(e => e.via || ''), id);
  console.log('   [' + mode + ' tap]', JSON.stringify({ page: b2.page, max: b2.max, turns: b2.snap.turns, pageTurns: b2.snap.pageTurns, ev2 }));
  ok(mode + ': forward tap after TTS → page+1, page_visible via:\'turn\'', b2.page === bh.page + 1 && ev2.slice(evh).includes('turn') && !ev2.slice(evh).includes('tts'), { page: [bh.page, b2.page], new: ev2.slice(evh) });
  ok(mode + ': forward tap counts: turns +1, pageTurns +1', b2.snap.turns === bh.snap.turns + 1 && b2.snap.pageTurns === bh.snap.pageTurns + 1, { turns: [bh.snap.turns, b2.snap.turns], pageTurns: [bh.snap.pageTurns, b2.snap.pageTurns] });
  ok(mode + ': forward tap grows «reached» (R.maxRatio); flags still clear', b2.max > bh.max && !b2.pTts && !b2.ttsAdv, { max: [b1.max, b2.max] });
  // session row → metrics.py: a TTS-only reading stretch is not counted as reading (pageTurns 0)
  await p.evaluate(() => closeReader()); await sleep(1500);
  const row = await p.evaluate(() => { const r = SESS[SESS.length - 1]; return r ? { date: r.date, minutes: r.minutes, pageTurns: r.pageTurns } : null; });
  sessRows.push({ mode, row, ttsEvents: ev.length, tapTurns: 1 });
  await ctx.close();
}
await run(BOOK, 'text');
await run(PDF, 'pdf');
// metrics.py: page_visible events (incl. via:'tts') never feed reading metrics; only sessions[].pageTurns does.
{
  const { execFileSync } = await import('child_process'); const fs = await import('fs');
  const ses = [{ date: '2026-10-12', minutes: 3, pageTurns: 0 }];
  const evs = []; for (let i = 0; i < 40; i++) evs.push({ type: 'page_visible', via: i % 3 ? 'tts' : 'jump', bookId: 'b', page: i, pageVisibleMs: 30000 });
  const mk = (e) => JSON.stringify({ ns: 'rq', schemaVersion: 1, sessions: ses, events: e, game: {} });
  fs.writeFileSync('/tmp/tts-m-a.json', mk([])); fs.writeFileSync('/tmp/tts-m-b.json', mk(evs));
  const py = (f) => execFileSync('python3', ['-c', 'import sys,json;sys.path.insert(0,".");import metrics;from datetime import date;r=metrics.tester(sys.argv[1],date(2026,10,12));r.pop("file");print(json.dumps(r,sort_keys=True))', f], { cwd: new URL('.', import.meta.url).pathname }).toString().trim();
  const a = py('/tmp/tts-m-a.json'), b = py('/tmp/tts-m-b.json');
  ok('metrics.py: tts/jump page_visible events change nothing; a TTS-only session (0 page turns) is «fake», not reading', a === b && JSON.parse(b).fake === 1, { a, b });
  ok('session rows: pageTurns = the forward taps only (TTS pages excluded)', sessRows.length === 2 && sessRows.every(r => r.row && r.row.pageTurns === r.tapTurns), sessRows);
}
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY tts.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
