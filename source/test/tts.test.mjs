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
const errs = [];
async function run(file, mode) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
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
  await ctx.close();
}
await run(BOOK, 'text');
await run(PDF, 'pdf');
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY tts.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
