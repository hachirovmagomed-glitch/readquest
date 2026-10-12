// 1в-black-2: PDF canvas backing dropped (Android, after leaving the app) → never a black page.
// Simulated: front canvas cleared (alpha:false → opaque black) + 'contextlost'; __rqLoseCanvas hook = context still lost for re-renders.
// Checks: placeholder (page colour + quiet spinner) instead of black; clock held (no minutes, no payout) while lost; 'contextrestored' → same page
// redrawn with real pixels; rq_v1 and events byte-identical; periodic pixel check catches a silent drop (no event); visibilitychange path too.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node blackcanvas.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const PDF = (process.env.RQ_PDFDIR || '/workspace/rqtest/pdf/') + 'b-nolabels-40.pdf';
const SHOTS = process.env.RQ_SHOTS || '/workspace/rq-shots-1v/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; }; });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await (await p.$('#fileInp')).uploadFile(PDF); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
const id = await p.evaluate(() => S.userBooks[0].id);
await p.evaluate(id => openBook(id), id); await p.waitForFunction(() => R.pdf && __rqPdf.swaps > 0, { timeout: 20000 });
for (let i = 0; i < 4; i++) { await p.evaluate(() => { window.__rqAdv(20000); goPage(R.page + 1, true); }); await sleep(400); }
await p.waitForFunction(() => __rqPdf.shown === 4 && !__rqPdf.task, { timeout: 10000 }); await sleep(600);
const snap = () => p.evaluate(async (id) => ({ v1: localStorage.getItem(RQ_K.v1), ev: JSON.stringify(await __rq.listReadingEvents({})), ms: __tracker.snapshot().countedMs, gold: S.gold, page: R.page, pos: R.pos, max: R.maxRatio, shown: __rqPdf.shown }), id);
const view = () => p.evaluate(() => { const cv = __rqPdf.front, st = el('pdfStage'), bk = el('pdfBack');
  let px = null; try { const c = cv.getContext('2d'); const d = c.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data; px = [d[0], d[1], d[2]]; } catch (e) {}
  return { stageHidden: st.style.visibility === 'hidden', back: !bk.classList.contains('hidden'), backTxt: el('pdfBackN').textContent, px, lost: __rqPdf.lost || 0, resuming: !!__rqPdf.resuming, swaps: __rqPdf.swaps }; });
const lose = () => p.evaluate(() => { const cv = __rqPdf.front; window.__rqLoseCanvas = () => true; cv.width = cv.width; /* backing cleared → black */ cv.dispatchEvent(new Event('contextlost')); });
const s0 = await snap();

// A. contextlost while visible; GPU not back for a while
await lose(); await sleep(700);
let v = await view();
ok('A: lost → placeholder (page colour + quiet spinner, no text), black canvas hidden, clock held', v.stageHidden && v.back && v.backTxt === '' && v.resuming && v.lost >= 1, v);
await p.screenshot({ path: SHOTS + 'pdf-lost-placeholder.png' });
await p.evaluate(() => window.__rqAdv(180000)); await sleep(1500); /* 3 fake minutes «on» a lost page */
const s1 = await snap(); v = await view();
ok('A: while lost no minutes counted, no payout, still placeholder (re-renders with a lost context are never swapped in)', s1.ms - s0.ms < 1500 && s1.gold === s0.gold && v.stageHidden && v.back, { dms: s1.ms - s0.ms, gold: [s0.gold, s1.gold], v });
await p.evaluate(() => { window.__rqLoseCanvas = null; __rqPdf.front && __rqPdf.front.dispatchEvent(new Event('contextrestored')); });
await p.waitForFunction(() => el('pdfStage').style.visibility !== 'hidden' && !__rqPdf.resuming, { timeout: 8000 }).catch(() => {});
await sleep(400); v = await view(); const s2 = await snap();
ok('A: contextrestored → same page redrawn with real pixels, placeholder gone, clock released', !v.stageHidden && !v.back && v.px && (v.px[0] + v.px[1] + v.px[2]) > 0 && s2.shown === 4 && !v.resuming, v);
ok('A: recovery writes nothing: rq_v1 + events byte-identical, page/pos/maxRatio unchanged', s2.v1 === s0.v1 && s2.ev === s0.ev && s2.page === s0.page && s2.pos === s0.pos && s2.max === s0.max, { v1: s2.v1 === s0.v1, ev: s2.ev === s0.ev, page: [s0.page, s2.page], max: [s0.max, s2.max] });
await p.screenshot({ path: SHOTS + 'pdf-lost-recovered.png' });

// B. silent drop (no event at all) → periodic pixel check (~2 s) redraws
const b0 = await snap(); const sw0 = (await view()).swaps;
await p.evaluate(() => { const cv = __rqPdf.front; cv.width = cv.width; });
await p.waitForFunction((sw) => __rqPdf.swaps > sw && el('pdfStage').style.visibility !== 'hidden', { timeout: 6000 }, sw0).catch(() => {});
await sleep(300); v = await view(); const b1 = await snap();
ok('B: silent black canvas → periodic check redraws within ~2–3 s, pixels back', v.swaps > sw0 && v.px && (v.px[0] + v.px[1] + v.px[2]) > 0 && !v.back, v);
ok('B: nothing written', b1.v1 === b0.v1 && b1.ev === b0.ev && b1.max === b0.max, { v1: b1.v1 === b0.v1, ev: b1.ev === b0.ev });

// C. back from background (visibilitychange) with a dropped backing
const c0 = await snap(); const csw = (await view()).swaps;
await p.evaluate(() => { const cv = __rqPdf.front; cv.width = cv.width; document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForFunction((sw) => __rqPdf.swaps > sw && !__rqPdf.resuming, { timeout: 6000 }, csw).catch(() => {});
await sleep(300); v = await view(); const c1 = await snap();
ok('C: visibilitychange → redrawn, nothing written', v.px && (v.px[0] + v.px[1] + v.px[2]) > 0 && c1.v1 === c0.v1 && c1.ev === c0.ev, v);
// D. normal pages that look «empty»: blank white page and a genuinely black page in night mode are NOT flagged; minutes grow as usual
{
  const EPDF = new URL('./fixtures/e-blank-dark.pdf', import.meta.url).pathname;
  const c2 = await browser.createBrowserContext(); const q = await c2.newPage(); await q.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await q.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; }; });
  q.on('pageerror', e => { errs.push(e.message); }); q.on('dialog', d => d.accept());
  await q.goto(BASE, { waitUntil: 'load' }); await q.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await q.$('#fileInp')).uploadFile(EPDF); await q.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
  await q.evaluate(() => openBook(S.userBooks[0].id)); await q.waitForFunction(() => R.pdf && __rqPdf.swaps > 0, { timeout: 20000 });
  const at = async (pg, night) => {
    await q.evaluate((pg) => goPage(pg, false), pg); await q.waitForFunction((pg) => __rqPdf.shown === pg && !__rqPdf.task, { timeout: 10000 }, pg);
    if (night) await q.evaluate(() => { if (el('reader').dataset.page !== 'night') toggleDayNight(); });
    await sleep(800);
    const a = await q.evaluate(() => ({ ms: __tracker.snapshot().countedMs, sw: __rqPdf.swaps, lost: __rqPdf.lost || 0 }));
    await q.evaluate(() => window.__rqAdv(30000)); await sleep(3500); /* > 1 periodic check, + 30 fake s */
    const b = await q.evaluate(() => ({ ms: __tracker.snapshot().countedMs, sw: __rqPdf.swaps, lost: __rqPdf.lost || 0, back: !el('pdfBack').classList.contains('hidden'), night: el('reader').dataset.page }));
    return { a, b };
  };
  const w = await at(2, false);
  ok('D: blank white page — not flagged (no lost, no redraw, no placeholder), minutes grow', w.b.lost === w.a.lost && w.b.sw === w.a.sw && !w.b.back && w.b.ms - w.a.ms >= 25000, w);
  const k = await at(3, true);
  ok('D: genuinely black page in night mode — not flagged, minutes grow', k.b.night === 'night' && k.b.lost === k.a.lost && k.b.sw === k.a.sw && !k.b.back && k.b.ms - k.a.ms >= 25000, k);
  await c2.close();
}
ok('no page errors', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY blackcanvas.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
