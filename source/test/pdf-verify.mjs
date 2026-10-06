// ReadQuest PDF reader verification — headless Chrome, Pixel 7 emulation (412×915 @2.625, touch).
// RQ_MODE=new (default): full criterion (а)–(д), (ж)–(л) + rotation/scan extras.
// RQ_MODE=old: reproduction of bugs 1–4 on the old build (no pass/fail of the criterion, only indicators).
// Frames: rAF DOM probe on every frame + burst screenshots of the reading area analysed pixel by pixel
// (ink = glyphs, blue header band must be ABOVE the red footer mark, green marks = machine-readable file index).
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'fs';

const MODE = process.env.RQ_MODE || 'new';
const OLD = MODE === 'old';
const BASE = process.env.RQ_URL || (OLD ? 'http://127.0.0.1:8766/old/' : 'http://127.0.0.1:8766/readquest/');
const OUT = process.env.RQ_OUT || ('/workspace/readquest/shots/pdf-fix' + (OLD ? '/old-1306' : ''));
const PDFDIR = process.env.RQ_PDFDIR || '/workspace/rqtest/pdf/';
const TXT = '/workspace/rqtest/Длинная книга.txt';
fs.mkdirSync(OUT, { recursive: true });
const results = { mode: MODE, checks: [], runs: {}, old: {} };
const ok = (name, pass, info) => { results.checks.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 900) : '')); };
const note = (k, v) => { results.old[k] = v; console.log('OLD ' + k + ' — ' + JSON.stringify(v).slice(0, 1200)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const LABEL_A = (i) => i < 4 ? ['i', 'ii', 'iii', 'iv'][i] : String(i - 2); // a-labels-144.pdf: /PageLabels [0 /r, 4 /D St 2]
const PHONE = { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.emulate({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36', viewport: PHONE });
await page.evaluateOnNewDocument(() => {
  window.__rqTimeOffset = 0; // accelerated clock: performance.now + Date.now (+ rAF timestamps) shift together
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset));
});
const cdp = await page.target().createCDPSession();
const pageErrors = [];
page.on('pageerror', e => { pageErrors.push(e.message); console.log('PAGEERROR', e.message); });
page.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text()); });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__rqReady, { timeout: 20000 });
await sleep(300);
const build = await page.evaluate(() => RQ_BUILD);
console.log('build', build, 'mode', MODE);
results.build = build;

async function upload(file) {
  const n0 = await page.evaluate(() => (S.userBooks || []).length);
  const inp = await page.$('#fileInp'); await inp.uploadFile(file);
  await page.waitForFunction((n) => (S.userBooks || []).length > n, { timeout: 30000 }, n0);
  return page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
}
const ids = {};
ids.a = await upload(PDFDIR + 'a-labels-144.pdf');
ids.b = await upload(PDFDIR + 'b-nolabels-40.pdf');
ids.c = await upload(PDFDIR + 'c-rotate.pdf');
ids.d = await upload(PDFDIR + 'd-scan.pdf');
if (!OLD) ids.t = await upload(TXT);

// ---------- pixel analysis ----------
const decode = (b64) => PNG.sync.read(Buffer.from(b64, 'base64'));
function analyze(png) {
  // Page features only (the reader bars' small blue/red icons are ignored): the header band = rows with ≥25 % blue
  // pixels, the footer mark = rows with ≥ max(12 px, 5 %) red pixels; body ink is counted strictly between them.
  const d = png.data, W = png.width, H = png.height;
  let ink = 0; const green = [];
  const inkRows = new Int32Array(H), inkCols = new Int32Array(W), bRow = new Int32Array(H), rRow = new Int32Array(H), bMin = new Int32Array(H).fill(1e9), bMax = new Int32Array(H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    if (r > 150 && g < 110 && b < 110 && r > g + 70) rRow[y]++;
    else if (b > 140 && r <110 && g < 140 && b > r + 60) { bRow[y]++; if (x < bMin[y]) bMin[y] = x; if (x > bMax[y]) bMax[y] = x; }
    else if (g > 100 && g > r + 40 && g > b + 25) green.push([x, y]);
    else if (L < 140 && r > b + 8 && r >= g) { ink++; inkRows[y]++; inkCols[x]++; }
  }
  // group band / mark rows into runs; a capture taken during setViewport can contain the page TWICE (tiled
  // composite) — then only the first band and the first mark below it are used, and the frame is flagged `tiled`.
  const runs = (pred) => { const out = []; let cur = null; for (let y = 0; y < H; y++) { if (pred(y)) { if (cur && y - cur.b <= 2) cur.b = y; else { cur = { a: y, b: y }; out.push(cur); } } } return out; };
  const bRuns = runs(y => bRow[y] >= W * 0.25), rRuns = runs(y => rRow[y] >= Math.max(8, W * 0.015));
  const b0 = bRuns[0] || null; const r0 = b0 ? (rRuns.find(r => r.a > b0.b) || null) : (rRuns[0] || null);
  const tiled = bRuns.length > 1 || rRuns.length > 1;
  let bn = 0, by = 0, bxmin = 1e9, bxmax = -1, bymin = 1e9, bymax = -1, rn = 0, ry = 0, rymin = 1e9;
  if (b0) for (let y = b0.a; y <= b0.b; y++) { bn += bRow[y]; by += y * bRow[y]; bxmin = Math.min(bxmin, bMin[y]); bxmax = Math.max(bxmax, bMax[y]); bymin = Math.min(bymin, y); bymax = Math.max(bymax, y); }
  const rr = r0 || (rRuns.length ? rRuns[0] : null);
  if (rr) for (let y = rr.a; y <= rr.b; y++) { rn += rRow[y]; ry += y * rRow[y]; rymin = Math.min(rymin, y); }
  // flipped page: the mark is ABOVE the band (only meaningful for a single, non-tiled copy)
  const blue = bn > 0 ? { n: bn, y: by / bn, xmin: bxmin, xmax: bxmax, ymin: bymin, ymax: bymax } : null;
  const red = rn > 0 ? { n: rn, y: ry / rn, ymin: rymin } : null;
  let body = ink;
  if (blue && red && blue.y < red.y) { body = 0; for (let y = Math.ceil(blue.ymax + 3); y < Math.floor(red.ymin - 3); y++) body += inkRows[y]; }
  const flipped = !tiled && !!(blue && red && blue.y > red.y && !rRuns.some(r => r.a > b0.b));
  let idx = null;
  if (blue && red && !flipped && blue.xmax - blue.xmin > W * 0.5) {
    const gg = green.filter(p => p[1] > red.y && p[1] < red.y + (red.y - blue.y) * 0.08 && p[0] >= blue.xmin - 2 && p[0] <= blue.xmax + 2);
    if (gg.length >= 6) {
      const ys = gg.map(p => p[1]); const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
      const up = gg.filter(p => p[1] < mid), lo = gg.filter(p => p[1] >= mid);
      if (up.length >= 2 && lo.length >= 2) {
        const pt = (xs) => { const x = xs.reduce((a, p) => a + p[0], 0) / xs.length; return (x - blue.xmin) / (blue.xmax - blue.xmin) * 364 + 28; };
        idx = Math.round((pt(up) - 45) / 30) * 12 + Math.round((pt(lo) - 45) / 30);
      }
    }
  }
  let firstCol = -1, lastCol = -1; for (let x = 0; x < W; x++) if (inkCols[x] > 0) { if (firstCol < 0) firstCol = x; lastCol = x; }
  let firstRow = -1, lastRow = -1; for (let y = 0; y < H; y++) if (inkRows[y] > 0 || bRow[y] > 0 || rRow[y] > 0) { if (firstRow < 0) firstRow = y; lastRow = y; }
  return { tiled, ink, body, blue: !!blue, red: !!red, blueY: blue ? Math.round(blue.y) : null, redY: red ? Math.round(red.y) : null, flipped, idx, firstCol, lastCol, firstRow, lastRow, W, H };
}
function strip(pngs, file, k = 2) {
  const ws = pngs.map(p => Math.floor(p.width / k)), h = Math.max(...pngs.map(p => Math.floor(p.height / k)));
  const out = new PNG({ width: ws.reduce((a, b) => a + b + 4, 0), height: h }); out.data.fill(0);
  let ox = 0;
  pngs.forEach((p, n) => { for (let y = 0; y < Math.floor(p.height / k); y++) for (let x = 0; x < ws[n]; x++) { const si = ((y * k) * p.width + x * k) * 4, di = (y * out.width + ox + x) * 4; out.data[di] = p.data[si]; out.data[di + 1] = p.data[si + 1]; out.data[di + 2] = p.data[si + 2]; out.data[di + 3] = 255; } ox += ws[n] + 4; });
  fs.writeFileSync(file, PNG.sync.write(out));
}

// ---------- rAF DOM probe ----------
async function probeStart() {
  await page.evaluate((OLD) => {
    window.__pp = []; window.__ppOn = true;
    const v = document.getElementById('viewer');
    const R4 = (r) => [r.left, r.top, r.right, r.bottom].map(x => Math.round(x * 10) / 10);
    (function tick() {
      if (!window.__ppOn) return;
      const s = { vv: window.visualViewport ? visualViewport.scale : 1, num: document.getElementById('pgNum').textContent, foot: document.getElementById('rPage').textContent, sv: +document.getElementById('pgSlider').value, vr: R4(v.getBoundingClientRect()), barsOff: document.getElementById('reader').classList.contains('barsoff'), fs: !!document.fullscreenElement };
      if (OLD) {
        const pg = document.getElementById('pdfPage'), cv = document.getElementById('pdfCanvas'), wr = document.getElementById('pdfWrap');
        const m = new DOMMatrix(getComputedStyle(pg).transform === 'none' ? '' : getComputedStyle(pg).transform);
        Object.assign(s, { a: m.a, b: m.b, c: m.c, d: m.d, cvW: cv.width, cvH: cv.height, cv: R4(cv.getBoundingClientRect()), sheet: R4(pg.getBoundingClientRect()), wrap: R4(wr.getBoundingClientRect()), sl: wr.scrollLeft, st: wr.scrollTop, page: R.page, z: R.zoom });
      } else {
        const st = document.getElementById('pdfStage'), sh = document.getElementById('pdfSheet'), cv = __rqPdf.front, tl = document.getElementById('pdfText');
        const m = new DOMMatrix(getComputedStyle(st).transform === 'none' ? '' : getComputedStyle(st).transform);
        Object.assign(s, { a: m.a, b: m.b, c: m.c, d: m.d, cvW: cv ? cv.width : 0, cvH: cv ? cv.height : 0, cv: cv ? R4(cv.getBoundingClientRect()) : null, sheet: R4(sh.getBoundingClientRect()), tl: R4(tl.getBoundingClientRect()), vis: getComputedStyle(st).visibility,
          shown: __rqPdf.shown, target: __rqPdf.target, z: __rqPdf.z, k: __rqPdf.k, sliding: __rqPdf.sliding, label: (__rqPdf.labels && __rqPdf.labels[__rqPdf.shown]) || String(__rqPdf.shown + 1), count: R.pageCount, inDom: cv ? cv.isConnected : false });
      }
      window.__pp.push(s);
      requestAnimationFrame(tick);
    })();
  }, OLD);
}
const probeStop = () => page.evaluate(() => { window.__ppOn = false; return window.__pp; });
const near = (a, b, e = 1.01) => a && b && a.every((x, i) => Math.abs(x - b[i]) <= e);
function probeBad(pp) {
  const bad = { scale0: 0, rotated: 0, bboxDiff: 0, numBad: 0, vv: 0, hidden: 0, n: pp.length };
  for (const s of pp) {
    if (!(s.a > 0.05 && s.d > 0.05)) bad.scale0++;
    if (Math.abs(s.b) > 1e-3 || Math.abs(s.c) > 1e-3 || s.a < 0 || s.d < 0) bad.rotated++;
    if (OLD) { if (!near(s.cv, s.sheet) || s.cvW === 0) bad.bboxDiff++; }
    else {
      if (!s.cv || !s.inDom || !near(s.cv, s.sheet) || !near(s.tl, s.sheet) || s.cvW === 0) bad.bboxDiff++;
      const want = (s.sliding ? null : s.label + ' / ' + s.count);
      if (want && (s.num !== want || s.foot !== want || s.sv !== s.shown)) bad.numBad++;
      if (s.vis === 'hidden') bad.hidden++;
    }
    if (s.vv !== 1) bad.vv++;
  }
  return bad;
}
// ---------- bursts ----------
let vrect = null;
async function viewerRect() {
  const v = await page.evaluate(() => { const e = document.getElementById('viewer'); if (!e) return { err: location.href + ' | ' + document.title + ' | ' + (document.body ? document.body.innerText.slice(0, 200) : '') }; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  if (v.err) { await page.screenshot({ path: OUT + '/ERR-no-viewer.png' }); throw new Error('no #viewer: ' + v.err); }
  vrect = v; return vrect;
}
let bursting = false, bursts = [];
async function burstLoop() {
  while (bursting) {
    try {
      const r = vrect;
      const data = await page.screenshot({ type: 'png', encoding: 'base64', optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 0.5 } });
      bursts.push({ data, t: Date.now() });
    } catch (e) { await sleep(5); }
  }
}
// blank threshold (body ink between the header band and the footer mark, @0.5 scale); calibrated on settled frames
let BODY_MIN = 120;
async function capture(label, action, settleMs = 700, keepStrip = false) {
  await viewerRect();
  bursts = []; bursting = true; await probeStart();
  const bl = burstLoop(); await sleep(40);
  await action();
  await sleep(settleMs);
  bursting = false; await bl;
  const pp = await probeStop();
  const pngs = bursts.map(b => decode(b.data));
  const an = pngs.map(analyze);
  /* Harness-artifact skip (≤2 / step): (1) visibly tiled frames (page/chrome repeated at ~viewport height),
     (2) on resize steps only — a fully empty capture (ink=0, no band/mark) taken mid-setViewport.
     Blank-on-empty-canvas stays for non-resize steps and for empties beyond the cap. ≥3 checked frames
     required after each resize; too few checked or >2 skippable → resizeShort / skipOverflow (FAIL). */
  const isResize = /(?:^|-)(?:fs-exit|fs-enter|resize)(?:-|$)/.test(label);
  let skipped = 0, skipOverflow = 0;
  const checked = [];
  let blank = 0, headerOnly = 0;
  for (const a of an) {
    const isBlank = a.body < BODY_MIN && a.ink < BODY_MIN * 3;
    const isHO = !!(a.blue && a.red && a.body < BODY_MIN);
    const emptyCapture = a.ink === 0 && !a.blue && !a.red;
    const skippable = (a.tiled && (isBlank || isHO)) || (isResize && emptyCapture && (isBlank || isHO));
    if (skippable) {
      if (skipped < 2) { skipped++; continue; }
      skipOverflow++;
    }
    checked.push(a);
    if (isBlank) blank++;
    if (isHO) headerOnly++;
  }
  const resizeShort = isResize && checked.length < 3;
  const rec = { label, bursts: an.length, raf: pp.length, blank, headerOnly, flipped: an.filter(a => a.flipped).length, tiled: an.filter(a => a.tiled).length,
    tiledSkipped: skipped, skipOverflow, checked: checked.length, resizeShort,
    minBody: checked.length ? Math.min(...checked.map(a => a.body)) : (an.length ? Math.min(...an.map(a => a.body)) : null),
    idxSeen: [...new Set(an.map(a => a.idx))], dom: probeBad(pp), last: pp[pp.length - 1], lastAn: an[an.length - 1] };
  const worst = an.map((a, i) => [a.flipped ? -1 : a.body, i]).sort((x, y) => x[0] - y[0]).slice(0, 3).map(x => x[1]);
  if (keepStrip || rec.blank || rec.flipped || rec.headerOnly || rec.resizeShort || rec.skipOverflow) {
    const pick = [...new Set([...pngs.slice(0, 10).map((_, i) => i), ...worst])].sort((a, b) => a - b).slice(0, 16);
    strip(pick.map(i => pngs[i]), `${OUT}/strip-${label.replace(/[^\w-]+/g, '_')}.png`, 1);
    rec.strip = `strip-${label}.png`;
  }
    rec.samples = pp.length > 0 ? pp.filter((_, i) => i % Math.max(1, Math.floor(pp.length / 6)) === 0).map(s => ({ a: +(s.a || 0).toFixed(3), d: +(s.d || 0).toFixed(3), cv: s.cv, sheet: s.sheet, num: s.num, cvW: s.cvW })) : [];
  return rec;
}
const ev = async (fn) => { const r = await cdp.send('Runtime.evaluate', { expression: `(${fn})()`, returnByValue: true, userGesture: false }); return r.result.value; };
const st = () => ev(() => ({ page: R.page, count: R.pageCount, num: document.getElementById('pgNum').textContent, foot: document.getElementById('rPage').textContent, sv: +document.getElementById('pgSlider').value,
  z: window.__rqPdf ? __rqPdf.z : R.zoom, shown: window.__rqPdf ? __rqPdf.shown : R.page, target: window.__rqPdf ? __rqPdf.target : R.page, tx: window.__rqPdf ? __rqPdf.tx : 0, ty: window.__rqPdf ? __rqPdf.ty : 0,
  barsOff: document.getElementById('reader').classList.contains('barsoff'), fs: !!document.fullscreenElement, vv: visualViewport.scale, renders: window.__rqPdf ? __rqPdf.renders : null, swaps: window.__rqPdf ? __rqPdf.swaps : null,
  front: window.__rqPdf && __rqPdf.front ? [__rqPdf.front.width, __rqPdf.front.height] : null, snap: __tracker && __tracker.isRunning() ? __tracker.snapshot() : null }));
const settled = async (ms = 8000) => { if (OLD) { await sleep(1200); return; } try { await page.waitForFunction(() => __rqPdf.target === __rqPdf.shown && !__rqPdf.task && __rqPdf.front, { timeout: ms, polling: 50 }); } catch (e) { } await sleep(150); };
const shot = async (name) => { await viewerRect(); return analyze(decode(await page.screenshot({ encoding: 'base64', clip: { x: vrect.x, y: vrect.y, width: vrect.w, height: vrect.h, scale: 0.5 } }))); };
// ---------- gestures (CDP touch = trusted) ----------
const X = (f) => vrect.x + vrect.w * f, Y = (f) => vrect.y + vrect.h * f;
const tapAt = async (fx, fy = 0.5) => { await page.touchscreen.tap(X(fx), Y(fy)); };
async function drag(x0, y0, x1, y1, steps = 8, dt = 16) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }] }); if (dt) await sleep(dt); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const swipe = (dir) => drag(dir > 0 ? X(0.8) : X(0.2), Y(0.5), dir > 0 ? X(0.2) : X(0.8), Y(0.5), 6, 12);
async function pinch(cx, cy, d0, d1, steps = 12) {
  const pts = (d) => [{ x: cx - d / 2, y: cy, id: 0 }, { x: cx + d / 2, y: cy, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + (d1 - d0) * i / steps) }); await sleep(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const dbltap = async (fx, fy = 0.5) => { await tapAt(fx, fy); await sleep(90); await tapAt(fx, fy); };
async function openPdfBook(id) {
  await page.evaluate((id) => openBook(id), id);
  if (OLD) { await page.waitForFunction(() => R.pdf && document.getElementById('pdfCanvas').width > 0, { timeout: 20000 }); }
  else await page.waitForFunction(() => R.pdf && __rqPdf.swaps > 0, { timeout: 20000 });
  await sleep(3800); // bars auto-hide (reading state)
  await viewerRect();
}
async function goTo(n) { await page.evaluate((n) => goPage(n, false), n); await settled(); }
const closeViaBack = async () => { await page.evaluate(() => { revealChrome(); }); await sleep(100); await page.click('#btnBack'); await sleep(900); };

// =====================================================================================
// (а) 10 flips (incl. a chapter title page), pinch in/out, pan zoomed, 2 fullscreen entries + viewport height change
// =====================================================================================
async function scenarioA(tag, cpu) {
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await openPdfBook(ids.a);
  await goTo(15); // file index 15 → label "13"; 10 flips pass the chapter title page (index 20, «Глава 2»)
  const recs = [];
  const s0 = await st();
  for (let i = 0; i < 10; i++) {
    const act = i % 3 === 2 ? () => swipe(1) : () => tapAt(0.85);
    const before = (await st()).target;
    const r = await capture(`${tag}-flip-${i + 1}`, act, cpu > 1 ? 1500 : 700, i === 0 || i === 5);
    let lost = false;
    if (!OLD) { try { await page.waitForFunction((b) => __rqPdf.target !== b, { timeout: 5000, polling: 20 }, before); } catch (e) { lost = await ev(() => __rqPdf.log.slice(-4)); } }
    await settled(); const s = await st(); const an = await shot();
    r.after = { page: s.page, num: s.num, sv: s.sv, idx: an.idx, want: LABEL_A(s.page) + ' / 144', lost };
    if (!OLD && (lost || s.target !== s.shown)) r.after.diag = await ev(() => ({ target: __rqPdf.target, shown: __rqPdf.shown, task: !!__rqPdf.task, log: __rqPdf.log.slice(-6) }));
    recs.push(r);
  }
  const s1 = await st();
  // pinch in at the centre, pan while zoomed, pinch out
  recs.push(await capture(`${tag}-pinch-in`, () => pinch(X(0.5), Y(0.45), 120, 300), cpu > 1 ? 1800 : 900, true));
  const sz = await st();
  recs.push(await capture(`${tag}-pan`, async () => { await drag(X(0.3), Y(0.6), X(0.75), Y(0.35), 10); await drag(X(0.75), Y(0.35), X(0.25), Y(0.7), 10); }, cpu > 1 ? 1500 : 800, true));
  recs.push(await capture(`${tag}-pinch-out`, () => pinch(X(0.5), Y(0.5), 300, 110), cpu > 1 ? 1800 : 900, true));
  const sOut = await st();
  // two fullscreen entries + a viewport height change (system bars): centre tap (bars + exit fs), height change, centre tap (enter fs)
  for (let k = 0; k < 2; k++) {
    recs.push(await capture(`${tag}-fs-exit-${k}`, async () => { await tapAt(0.5, 0.5); await sleep(OLD ? 30 : 290); await page.setViewport({ ...PHONE, height: 851 }); }, cpu > 1 ? 1800 : 900, k === 0));
    recs.push(await capture(`${tag}-fs-enter-${k}`, async () => { await tapAt(0.5, 0.5); await sleep(OLD ? 30 : 290); await page.setViewport(PHONE); }, cpu > 1 ? 1800 : 900, k === 0));
  }
  const sEnd = await st();
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await closeViaBack();
  return { recs, s0, s1, sz, sOut, sEnd };
}
function sumA(run) {
  const R = run.recs; const t = (f) => R.reduce((a, r) => a + f(r), 0);
  return { bursts: t(r => r.bursts), raf: t(r => r.raf), blank: t(r => r.blank), headerOnly: t(r => r.headerOnly), flipped: t(r => r.flipped), scale0: t(r => r.dom.scale0), rotated: t(r => r.dom.rotated), bboxDiff: t(r => r.dom.bboxDiff), numBad: t(r => r.dom.numBad || 0), vv: t(r => r.dom.vv), hidden: t(r => r.dom.hidden || 0), tiledCaptures: t(r => r.tiled || 0),
    tiledSkipped: t(r => r.tiledSkipped || 0), skipOverflow: t(r => r.skipOverflow || 0), resizeShort: t(r => r.resizeShort ? 1 : 0),
    minBody: Math.min(...R.map(r => r.minBody ?? 1e9)), perStep: R.map(r => `${r.label.split('-').slice(1).join('-')}:${r.bursts}b/${r.raf}f bl${r.blank} ho${r.headerOnly} fl${r.flipped} s0${r.dom.scale0} bb${r.dom.bboxDiff} nb${r.dom.numBad || 0} min${r.minBody} sk${r.tiledSkipped || 0}`) };
}

// calibrate: settled body ink on a text page and on a chapter title page
{
  await openPdfBook(ids.a);
  await goTo(20); const title = await shot(); await goTo(21); const body = await shot(); await goTo(3); const front = await shot();
  results.calib = { title: title.body, body: body.body, roman: front.body, idxTitle: title.idx, idxBody: body.idx };
  BODY_MIN = Math.max(60, Math.round(Math.min(title.body, body.body) * 0.35));
  console.log('calibration', results.calib, 'BODY_MIN', BODY_MIN);
  await closeViaBack();
}

const runA1 = await scenarioA('a-cpu1', 1);
const runA6 = await scenarioA('a-cpu6', 6);
results.runs.a1 = { ...sumA(runA1), flips: runA1.recs.slice(0, 10).map(r => r.after) };
results.runs.a6 = { ...sumA(runA6), flips: runA6.recs.slice(0, 10).map(r => r.after) };
for (const [k, s] of [['×1', results.runs.a1], ['×6', results.runs.a6]]) {
  if (OLD) note(`(а) CPU ${k} frames`, s);
  else ok(`(а) CPU ${k}: 10 flips + chapter page + pinch in/out + zoomed pan + 2 fullscreen entries + height change — no frame without glyphs, no flipped frame, canvas = backing bbox every rAF, no scale≈0, visualViewport.scale = 1`,
    s.blank === 0 && s.headerOnly === 0 && s.flipped === 0 && s.scale0 === 0 && s.rotated === 0 && s.bboxDiff === 0 && s.vv === 0 && s.hidden === 0 && !s.resizeShort && !s.skipOverflow && s.bursts > 100 && s.raf > 300, s);
}
for (const [k, run] of [['×1', runA1], ['×6', runA6]]) {
  const fl = run.recs.slice(0, 10).map(r => r.after);
  const advanced = run.s1.page === run.s0.page + 10;
  const chapter = fl.some(f => f.page === 20);
  const numsOk = fl.every(f => f.num === f.want && f.idx === f.page && f.sv === f.page);
  if (OLD) note(`(в) CPU ${k} numbers after each flip`, { advanced, fl, labelsUsed: fl.every(f => f.num === f.want) });
  else {
    ok(`(а) CPU ${k}: 10 flips advanced exactly 10 pages, passing the chapter title page (index 20)`, advanced && chapter, { from: run.s0.page, to: run.s1.page });
    ok(`(в) CPU ${k}: corner number + bar number + slider = printed label of the page on screen after every flip (decoded from the page pixels)`, numsOk, fl);
    ok(`(в) CPU ${k}: number = label of the shown page on EVERY rAF of the 10 flips (same frame as the swap)`, run.recs.slice(0, 10).every(r => r.dom.numBad === 0), run.recs.slice(0, 10).map(r => r.dom.numBad));
  }
}
if (process.env.RQ_ONLY === 'a') { fs.writeFileSync(`${OUT}/results-a.json`, JSON.stringify(results, null, 1)); console.log(`only-a: ${results.checks.filter(c => c.pass).length}/${results.checks.length}`); await browser.close(); process.exit(0); }
if (!OLD) ok('(г) zoom resets on flip / after pinch-out back at width', runA1.sz.z > 1.5 && runA1.sOut.z === 1, { zoomed: runA1.sz.z, out: runA1.sOut.z });

// =====================================================================================
// (б) zoomed: glyphs at every edge reachable / not clipped
// =====================================================================================
{
  await openPdfBook(ids.a); await goTo(30);
  const base = await shot();
  await pinch(X(0.5), Y(0.45), 100, 250); await sleep(OLD ? 1500 : 900);
  const sz = await st();
  const edges = {};
  if (OLD) {
    // old build: geometry DURING the pinch (before touchend re-render) and after it
    const g = await page.evaluate(() => { const w = document.getElementById('pdfWrap'), c = document.getElementById('pdfCanvas'); w.scrollLeft = 0; const r0 = c.getBoundingClientRect(), wr = w.getBoundingClientRect(); const left = { canvasLeft: Math.round(r0.left), wrapLeft: Math.round(wr.left), sw: w.scrollWidth, cw: w.clientWidth }; w.scrollLeft = 1e6; const r1 = c.getBoundingClientRect(); return { left, right: { canvasRight: Math.round(r1.right), wrapRight: Math.round(wr.right) }, zoom: R.zoom, canvas: [c.width, c.height], css: [c.style.width, c.style.height] }; });
    const pts = (d) => [{ x: X(0.5) - d / 2, y: Y(0.45), id: 0 }, { x: X(0.5) + d / 2, y: Y(0.45), id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(120) });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(120 + 160 * i / 8) }); await sleep(16); }
    await sleep(100);
    const mid = await page.evaluate(() => { const w = document.getElementById('pdfWrap'), p = document.getElementById('pdfPage'); const before = w.scrollLeft; w.scrollLeft = 0; const r = p.getBoundingClientRect(), wr = w.getBoundingClientRect(); const out = { pageLeft: Math.round(r.left), pageRight: Math.round(r.right), wrapLeft: Math.round(wr.left), wrapRight: Math.round(wr.right), scrollLeftMin: w.scrollLeft, transform: p.style.transform, origin: p.style.transformOrigin }; w.scrollLeft = before; return out; });
    await page.screenshot({ path: `${OUT}/zoom-mid-pinch.png`, clip: { x: vrect.x, y: vrect.y, width: vrect.w, height: vrect.h, scale: 0.5 } });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    note('(б)/bug3 zoom geometry (old)', { afterPinchRender: g, duringSecondPinch: mid, leftUnreachableDuringPinch: mid.pageLeft < mid.wrapLeft, pinchMidpointIgnored: mid.origin });
  } else {
    for (const [name, dx, dy] of [['left', 1, 0], ['right', -1, 0], ['top', 0, 1], ['bottom', 0, -1]]) {
      // pan towards that edge until the page edge touches the screen edge (a further swipe would flip by design)
      for (let i = 0; i < 6; i++) {
        const atEdge = await page.evaluate((n) => { const g = pdfGeom(); return n === 'left' ? g.atL : n === 'right' ? g.atR : n === 'top' ? __rqPdf.ty >= -0.5 : __rqPdf.ty <= g.s.h - g.H + 0.5; }, name);
        if (atEdge) break;
        await drag(X(0.5 - dx * 0.2), Y(0.5 - dy * 0.2), X(0.5 + dx * 0.2), Y(0.5 + dy * 0.2), 6, 10); await sleep(120);
      }
      await sleep(300);
      const a = await shot();
      const dom = await page.evaluate(() => { const v = document.getElementById('viewer').getBoundingClientRect(), t = document.getElementById('pdfSheet').getBoundingClientRect(); return { v: [v.left, v.top, v.right, v.bottom].map(Math.round), page: [t.left, t.top, t.right, t.bottom].map(Math.round), z: __rqPdf.z, shown: __rqPdf.shown }; });
      edges[name] = { firstCol: a.firstCol, lastCol: a.lastCol, firstRow: a.firstRow, lastRow: a.lastRow, W: a.W, H: a.H, dom, ink: a.ink, blue: a.blue, red: a.red };
      await page.screenshot({ path: `${OUT}/zoom-edge-${name}.png`, clip: { x: vrect.x, y: vrect.y, width: vrect.w, height: vrect.h, scale: 0.5 } });
    }
  }
  const e = edges;
  // reachable: the page edge itself can be brought to the screen edge (then the page margin, not text, touches the screen edge)
  if (!OLD) {
  const leftOk = e.left.dom.page[0] === e.left.dom.v[0] && e.left.firstCol > 4;
  const rightOk = e.right.dom.page[2] === e.right.dom.v[2] && e.right.lastCol < e.right.W - 5;
  const topOk = e.top.dom.page[1] === e.top.dom.v[1] && e.top.blue && e.top.firstRow > 4;
  const botOk = e.bottom.dom.page[3] === e.bottom.dom.v[3] && e.bottom.lastRow < e.bottom.H - 5;
  const stay = Object.values(e).every(x => x.dom.z === 2.5 && x.dom.shown === 30);
  ok('(б) zoomed ×2.5: each page edge (left/right/top/bottom) can be panned to the screen edge, the page margin is visible there — no glyph cut by the container', sz.z > 2 && stay && leftOk && rightOk && topOk && botOk, { zoom: sz.z, edges });
  }
  await closeViaBack();
}

// =====================================================================================
// (в) slider drag shows the target label; after the drag number = label; no labels → file number
// =====================================================================================
{
  await openPdfBook(ids.a); await goTo(50);
  await page.evaluate(() => revealChrome()); await sleep(200);
  await probeStart();
  const during = [];
  for (let v = 60; v <= 78; v += 2) {
    await page.evaluate((v) => { const s = document.getElementById('pgSlider'); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await sleep(40);
    during.push(await ev(() => ({ sv: +document.getElementById('pgSlider').value, foot: document.getElementById('rPage').textContent, num: document.getElementById('pgNum').textContent })));
  }
  await page.evaluate(() => { const s = document.getElementById('pgSlider'); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await settled(); await sleep(300);
  const pp = await probeStop();
  await page.evaluate(() => concealChrome('tap')); await sleep(400);
  const after = await st(); const an = await shot();
  const duringOk = during.every(d => d.foot === LABEL_A(d.sv) + ' / 144');
  const afterOk = after.page === 78 && after.num === '76 / 144' && after.foot === '76 / 144' && after.sv === 78 && an.idx === 78;
  await page.screenshot({ path: `${OUT}/slider-label-76.png` });
  if (OLD) note('(в)/bug4 slider (old): number shown vs printed label', { during: during.slice(-3), after: { page: after.page, num: after.num, printed: LABEL_A(after.page), decodedFileIndex: an.idx } });
  else {
    ok('(в) slider drag: the bar number follows the TARGET page label while dragging', duringOk, during);
    ok('(в) after the drag to file page 79: corner + bar = «76 / 144» (printed label), slider = 78, page on screen = file index 78', afterOk, { after: { page: after.page, num: after.num, foot: after.foot, sv: after.sv }, decoded: an.idx });
  }
  await closeViaBack();
  // without labels → 1-based file number
  await openPdfBook(ids.b); await goTo(9);
  const sb = await st(); const ab = await shot();
  if (!OLD) ok('(в) PDF without /PageLabels → 1-based file number «10 / 40»', sb.num === '10 / 40' && ab.idx === 9, { num: sb.num, decoded: ab.idx });
  await closeViaBack();
}

// =====================================================================================
// (г) zoomed swipe pans until the edge; edge tap flips + resets zoom; double tap → width; centre tap → bars first time
// =====================================================================================
if (!OLD) {
  await openPdfBook(ids.a); await goTo(40);
  const s0 = await st();
  await dbltap(0.5, 0.45); await sleep(500);
  const z2 = await st();
  ok('(г) double tap at width → ×2 at the tap point (no bars toggled, no flip)', Math.abs(z2.z - 2) < 0.01 && z2.page === 40 && z2.barsOff, { z: z2.z, page: z2.page, barsOff: z2.barsOff });
  const swipes = [];
  for (let i = 0; i < 5; i++) { await swipe(1); await sleep(350); const s = await st(); swipes.push({ page: s.page, tx: Math.round(s.tx), z: s.z }); if (s.page !== 40) break; }
  const firstFlip = swipes.findIndex(s => s.page !== 40);
  ok('(г) zoomed: swipe left first pans to the right page edge (no flip), the NEXT swipe once the edge touches the screen edge flips (+1) and resets zoom', firstFlip >= 1 && swipes.slice(0, firstFlip).every(s => s.page === 40) && swipes[firstFlip].page === 41 && swipes[firstFlip].z === 1 && swipes[firstFlip - 1].tx <= -(412 * 2 - 412) + 1, swipes);
  await dbltap(0.5, 0.45); await sleep(400);
  const z3 = await st(); await dbltap(0.4, 0.4); await sleep(400); const z4 = await st();
  ok('(г) double tap while zoomed → back to width', z3.z === 2 && z4.z === 1 && z4.page === z3.page, { before: z3.z, after: z4.z });
  await dbltap(0.5, 0.45); await sleep(400);
  const z5 = await st(); await tapAt(0.85); await sleep(450); await settled(); const z6 = await st();
  ok('(г) edge tap while zoomed → flips one page and the new page opens at width', z5.z === 2 && z6.page === z5.page + 1 && z6.z === 1, { before: [z5.page, z5.z], after: [z6.page, z6.z] });
  const t0 = Date.now(); await tapAt(0.85); await page.waitForFunction((p) => __rqPdf.target === p + 1, { timeout: 2000, polling: 10 }, z6.page); const tEdge = Date.now() - t0; await settled();
  ok('(г) at width an edge tap flips immediately (no double-tap wait)', tEdge < 200, { ms: tEdge });
  const f0 = await st();
  await tapAt(0.5, 0.5); await sleep(320); const f1 = await st();
  ok('(г) ONE centre tap → bars shown and fullscreen left (first time)', f0.barsOff && f0.fs && !f1.barsOff && !f1.fs, { before: { barsOff: f0.barsOff, fs: f0.fs }, after: { barsOff: f1.barsOff, fs: f1.fs } });
  await sleep(3600); const f2 = await st();
  ok('(г) bars hide again after 3.2 s and fullscreen comes back (as in 1306)', f2.barsOff && f2.fs, { barsOff: f2.barsOff, fs: f2.fs });
  const tr = await page.evaluate(() => getComputedStyle(document.getElementById('viewer')).touchAction + '|' + getComputedStyle(document.getElementById('pdfWrap')).touchAction);
  ok('(г) visualViewport.scale == 1 after all gestures; touch-action none on the PDF view', f2.vv === 1 && tr === 'none|none', { vv: f2.vv, touchAction: tr });
  const geo = await page.evaluate(() => { const n = document.getElementById('pgNum'), cs = getComputedStyle(n), r = n.getBoundingClientRect(), d = document.getElementById('dayBar').getBoundingClientRect(); return { text: n.textContent, font: cs.fontSize, op: cs.opacity, vis: cs.visibility, bottom: Math.round(r.bottom), dayTop: Math.round(d.top), right: Math.round(r.right) }; });
  ok('(в) corner number in PDF: same style as the text reader (11px, opacity .45, above the day bar, right side)', geo.font === '11px' && Math.abs(+geo.op - 0.45) < 0.01 && geo.vis === 'visible' && geo.bottom <= geo.dayTop + 0.5 && geo.right > 300, geo);
  await page.screenshot({ path: `${OUT}/pdf-reading-state.png` });
  // pinch hint «150%»
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: X(0.4), y: Y(0.5), id: 0 }, { x: X(0.6), y: Y(0.5), id: 1 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: X(0.4) - i * 12, y: Y(0.5), id: 0 }, { x: X(0.6) + i * 12, y: Y(0.5), id: 1 }] }); await sleep(16); }
  await sleep(60);
  const hint = await page.evaluate(() => ({ txt: document.getElementById('pinchHint').textContent.trim(), vis: !document.getElementById('pinchHint').classList.contains('hidden'), pct: document.getElementById('pinchHint').classList.contains('pct') }));
  await page.screenshot({ path: `${OUT}/pinch-hint-pct.png` });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500);
  ok('(opt) pinch shows a «NNN%» hint during the gesture, hidden after', hint.vis && /^\d{3}%$/.test(hint.txt.replace(/^Aa\s*/, '')) && hint.pct && await page.evaluate(() => document.getElementById('pinchHint').classList.contains('hidden')), hint);
  await closeViaBack();
}

// =====================================================================================
// rotation (/Rotate 90/180/270) and the scan
// =====================================================================================
{
  await openPdfBook(ids.c);
  const rot = [];
  for (let i = 0; i < 12; i++) { if (i) { await tapAt(0.85); await settled(); await sleep(OLD ? 600 : 0); } const a = await shot(); const s = await st(); rot.push({ i, page: s.page, flipped: a.flipped, blueAboveRed: a.blue && a.red && a.blueY < a.redY, idx: a.idx }); }
  await page.screenshot({ path: `${OUT}/rotate-180-page.png`, clip: { x: vrect.x, y: vrect.y, width: vrect.w, height: vrect.h, scale: 0.5 } });
  if (OLD) note('rotation file (old)', rot);
  else ok('/Rotate 0/90/180/270: every page upright (header band above footer mark), rotation only from page.rotate', rot.every(r => r.blueAboveRed && !r.flipped && r.idx === r.i), rot);
  await closeViaBack();
  await openPdfBook(ids.d);
  const sc = [];
  for (let i = 0; i < 4; i++) { if (i) { await tapAt(0.85); await settled(); } const a = await shot(); const s = await st(); sc.push({ page: s.page, ink: a.ink, flipped: a.flipped, front: s.front }); }
  await pinch(X(0.5), Y(0.5), 100, 380); await sleep(2500); const sz = await st();
  if (!OLD) ok('scan (2480×3508 JPEG pages, no text layer): pages render with content, upright; zoomed bitmap ≤ 16 MP', sc.every(s => s.ink > 500 && !s.flipped) && sz.front && sz.front[0] * sz.front[1] <= 16e6 && sz.z > 3, { sc, zoomed: { z: sz.z, front: sz.front, mp: sz.front && +(sz.front[0] * sz.front[1] / 1e6).toFixed(2) } });
  await closeViaBack();
}

// =====================================================================================
// bug-2 reproduction attempt (both builds): racing renders = quick double flip / flip during a viewport change, CPU ×6
// =====================================================================================
{
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await openPdfBook(ids.a); await goTo(60);
  const recs = [];
  for (let k = 0; k < 5; k++) recs.push(await capture(`race-dblflip-${k}`, async () => { await tapAt(0.85); await sleep(60); await tapAt(0.85); }, 2500, k === 0));
  for (let k = 0; k < 4; k++) recs.push(await capture(`race-resize-${k}`, async () => { await tapAt(0.85); await sleep(80); await page.setViewport({ ...PHONE, height: k % 2 ? 915 : 851 }); }, 2500, k === 0));
  await page.setViewport(PHONE);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sm = sumA({ recs });
  results.runs.race = sm;
  if (OLD) note('bug-2 race (double flip / flip+resize, CPU ×6)', sm);
  else ok('race: double flip and flip during a viewport change at CPU ×6 — no blank, no flipped, no scale≈0, canvas = backing', sm.blank === 0 && sm.headerOnly === 0 && sm.flipped === 0 && sm.scale0 === 0 && sm.bboxDiff === 0 && !sm.resizeShort && !sm.skipOverflow, sm);
  await closeViaBack();
}

// =====================================================================================
// regression (P.redo): a forward flip requested while the viewport is collapsed (fullscreen / system-bar transition
// → 0-height viewer for a moment) must be shown as soon as the size is back, CPU ×6 — by the resize path itself
// (P.redo), not by the 1.5 s pdfWatch() safety net. Pre-fix app: the render bailed on the 0-size viewport and was only
// re-issued by the watchdog (f30fdc1) or never (b452060).
// =====================================================================================
if (!OLD) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await openPdfBook(ids.a); await goTo(60);
  const r0 = await st();
  await page.evaluate(() => { if (window.__rqPdf.log) window.__rqPdf.log.length = 0; });   // P.log is a 40-entry ring: start empty
  await page.setViewport({ ...PHONE, height: 1 });          // viewer collapses to 0 px height (resize in progress)
  await page.keyboard.press('ArrowRight');                  // forward flip intent during the resize (key: no touch hit-test in a 1-px window)
  await sleep(150);
  const tBack = Date.now();
  await page.setViewport(PHONE);                            // size back, same fit width
  await settled(10000);
  const backMs = Date.now() - tBack;
  await sleep(300);
  const r1 = await st(); const ar = await shot();
  const dbg = await page.evaluate(() => ({ redo: window.__rqPdf.redo, wd: (window.__rqPdf.log || []).filter(e => e.ev === 'watchdog').length }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('(а) regression: forward flip during a 0-height viewport at CPU ×6 → shown +1 once the size is back (page on screen = file index), P.redo === false, no watchdog needed (shown < 1.5 s after the size is back)',
    r1.target === r0.page + 1 && r1.shown === r0.page + 1 && ar.idx === r0.page + 1 && dbg.redo === false && dbg.wd === 0 && backMs < 1500, { before: r0.page, after: { target: r1.target, shown: r1.shown, decoded: ar.idx, num: r1.num }, redo: dbg.redo, watchdogFired: dbg.wd, backMs });
  await closeViaBack();
}

// =====================================================================================
// pdfWatch() recovery → ONE `pdf_stall_recovered` analytics event in the events store (page, label, stalledMs, reason), never in sessions[]
// =====================================================================================
if (!OLD) {
  await openPdfBook(ids.a); await goTo(79);
  const before = await page.evaluate(async () => ({ ev: (await __rq.listReadingEvents({ type: 'pdf_stall_recovered' })).length, rows: (await __rq.listSessions({})).length }));
  // simulate a lost render: target moved, nothing rendering, request 2 s old → the 700 ms watchdog must re-render it
  await page.evaluate(() => { const P = window.__rqPdf; P.target = P.shown + 1; P.reqWhy = 'flip'; P.reqAt = performance.now() - 2000; });
  await page.waitForFunction(() => __rqPdf.shown === __rqPdf.target && __rqPdf.front, { timeout: 6000, polling: 50 }).catch(() => { });
  await sleep(500);
  const after = await page.evaluate(async () => ({ shown: __rqPdf.shown, evs: await __rq.listReadingEvents({ type: 'pdf_stall_recovered' }), rows: await __rq.listSessions({}) }));
  const e = after.evs[after.evs.length - 1] || {};
  await closeViaBack(); await sleep(500);
  const rowsAfterClose = await page.evaluate(async () => (await __rq.listSessions({})));
  ok('watchdog: a stalled page is recovered and logged once as `pdf_stall_recovered` {page index 80, label «78», stalledMs ≥ 1500, reason «flip»} in events; no such row in sessions[]',
    after.shown === 80 && after.evs.length === before.ev + 1 && e.page === 80 && e.label === '78' && e.stalledMs >= 1500 && e.reason === 'flip' && e.bookId === ids.a &&
    !after.rows.concat(rowsAfterClose).some(r => r.type === 'pdf_stall_recovered' || 'stalledMs' in r), { shown: after.shown, event: e, events: after.evs.length - before.ev });
}

if (!OLD) {
  // =====================================================================================
  // (д) 2–3 min in PDF on an accelerated clock, exit with ←, export: pageTurns > 0, minutes, 3-min cap, XP/daily idempotent
  // =====================================================================================
  const adv = (ms) => page.evaluate((ms) => { window.__rqTimeOffset += ms; }, ms);
  const rows = () => page.evaluate(async () => (await __rq.listSessions({})));
  const game = () => page.evaluate(() => ({ xp: S.xp, gold: S.gold, daily: (__rq && __rq.getGame ? null : null), dailyPaid: (S.game && S.game.dailyPaidDays) || null }));
  const ids0 = (await rows()).map(r => r.id);
  await page.evaluate(() => { S.goal = 5; save(); });   // MVP ignores it: goal is fixed at 10 min in code
  const xpGold0 = await page.evaluate(() => ({ xp: S.xp, gold: S.gold }));
  await openPdfBook(ids.a); await goTo(70);
  const sStart = await st();
  for (let i = 0; i < 3; i++) { await adv(170000); await tapAt(0.85); await settled(); }  // 3 pages × 170 s (< 3-min cap)
  await adv(6 * 60000); await tapAt(0.85); await settled();                              // 1 page idle 6 min → capped at 3
  await adv(10000);                                                                     // last page 10 s
  const snapBefore = (await st()).snap;
  await closeViaBack(); await sleep(800);
  const newRows = (await rows()).filter(r => !ids0.includes(r.id));
  const row = newRows[0] || {};
  const xpGold1 = await page.evaluate(() => ({ xp: S.xp, gold: S.gold, dailyPaid: JSON.stringify(S.game || null) }));
  const expMin = (510 + 180 + 10) / 60;   // 11.67 min ≥ fixed MVP goal 10
  ok('(д) PDF session: ONE sessions[] row (UUID id, local day), pageTurns = 4 (> 0), minutes = 3×170 s + 3-min cap + 10 s', newRows.length === 1 && /^[0-9a-f-]{36}$/.test(row.id) && row.pageTurns === 4 && Math.abs(row.minutes - expMin) < 0.12 && row.date === (await page.evaluate(() => localDay())), { row, expectedMin: +expMin.toFixed(3), snapBefore });
  const sum = await page.evaluate(() => ({ vis: !document.getElementById('summary') || !document.getElementById('summary').classList.contains('hidden'), txt: (document.getElementById('summary') || {}).textContent }));
  await page.screenshot({ path: `${OUT}/pdf-session-summary.png` });
  const awarded = await page.evaluate((id) => (window.__rqGame && __rqGame.awardedSessionIds ? __rqGame.awardedSessionIds.includes(id) : null), row.id);
  const g1 = await page.evaluate(() => ({ xp: S.xp, gold: S.gold }));
  // idempotency: reload (boot re-runs awardPendingSessions + recovery) → nothing changes
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(800);
  const g2 = await page.evaluate(() => ({ xp: S.xp, gold: S.gold }));
  const rowsAfter = (await rows()).filter(r => r.id === row.id).length;
  const exp = JSON.parse(await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false }))));
  fs.mkdirSync('/workspace/rqtest/exports', { recursive: true }); fs.writeFileSync('/workspace/rqtest/exports/pdf-session.json', JSON.stringify(exp));
  const er = exp.sessions.find(r => r.id === row.id);
  const paid = exp.game && exp.game.dailyPaidDays || [];
  ok('(д) XP + daily (fixed MVP goal 10 min reached; saved goal 5 ignored) granted once: XP and gold rose at ← and do NOT change after a reload; row once in export; schemaVersion 1; summary shown', g1.xp > xpGold0.xp && g1.gold >= xpGold0.gold + 30 && g2.xp === g1.xp && g2.gold === g1.gold && rowsAfter === 1 && er && er.pageTurns === 4 && exp.schemaVersion === 1 && paid.includes(row.date) && exp.game.awardedSessionIds.includes(row.id) && sum.vis,
    { before: xpGold0, afterBack: g1, afterReload: g2, exportRow: er, dailyPaidDays: paid, summary: (sum.txt || '').replace(/\s+/g, ' ').slice(0, 160) });
  await page.evaluate(() => { try { document.querySelectorAll('#summary button, #sumClose').forEach(b => { if (/закрыть|ок|продолж|в библиотеку/i.test(b.textContent)) b.click(); }); } catch (e) { } });

  // =====================================================================================
  // (ж)–(л) per-page cap rules (single accounting in reader-session.js)
  // =====================================================================================
  async function capSession(label, setup, body, landscape) {
    await page.evaluate(() => { const s = document.getElementById('summary'); if (s) s.classList.add('hidden'); show('library'); });
    if (landscape) await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
    const before = (await rows()).map(r => r.id);
    await setup();
    const pre = (await st()).snap;
    await body();
    const snap = (await st()).snap;
    await closeViaBack(); await sleep(600);
    const nr = (await rows()).filter(r => !before.includes(r.id));
    if (landscape) await page.setViewport(PHONE);
    const credPrev = (pre.countedMs - Math.min(pre.pageDwellMs, pre.pageCapMs)) / 60000; // closed pages only (the page opened before goTo)
    return { minutes: nr.length === 1 ? +(nr[0].minutes - credPrev).toFixed(4) : null, rowMinutes: nr.length === 1 ? +nr[0].minutes.toFixed(4) : null, creditedBefore: +credPrev.toFixed(4), rows: nr.length, snap };
  }
  const pdfSetup = async () => { await openPdfBook(ids.a); await goTo(90); };
  // (ж) idle 10 min on one PDF page → 3 min
  const zh = await capSession('zh', pdfSetup, async () => { await adv(10 * 60000); });
  ok('(ж) PDF, 10 min idle on one page → 3.00 min credited', zh.minutes === 3, zh);
  // (з) landscape (page taller than the screen): a vertical pan > 20 % once a minute → +1 min each, ceiling 8
  const pans = [];
  const zz = await capSession('z', pdfSetup, async () => {
    for (let m = 0; m < 10; m++) {
      await adv(55000);
      const up = m % 2 === 0;
      await drag(X(0.5), Y(up ? 0.8 : 0.2), X(0.5), Y(up ? 0.2 : 0.8), 8, 10); await sleep(80);
      const s = await st(); pans.push({ m, cap: s.snap.pageCapMs / 60000, ty: Math.round(s.ty), page: s.page });
      await adv(5000);
    }
  }, true);
  ok('(з) pan > 20 % once a minute (10 pans in 10 min, landscape, no zoom) → cap 4,5,6,7,8 then stays 8 → 8.00 min credited', zz.minutes === 8 && pans.map(p => p.cap).join(',') === '4,5,6,7,8,8,8,8,8,8' && pans.every(p => p.page === 90), { minutes: zz.minutes, caps: pans.map(p => p.cap), tys: pans.map(p => p.ty) });
  // (и) 20 small pans < 20 % → no extension
  const small = [];
  const zi = await capSession('i', pdfSetup, async () => {
    for (let i = 0; i < 20; i++) { await adv(30000); const up = i % 2 === 0; await drag(X(0.5), Y(0.5), X(0.5), Y(up ? 0.38 : 0.62), 6, 10); await sleep(60); const s = await st(); small.push({ cap: s.snap.pageCapMs / 60000, ty: Math.round(s.ty) }); }
  }, true);
  ok('(и) 20 small pans (≈12 % of the screen, every 30 s for 10 min) → cap stays 3 → 3.00 min credited', zi.minutes === 3 && small.every(s => s.cap === 3) && new Set(small.map(s => s.ty)).size > 1, { minutes: zi.minutes, caps: [...new Set(small.map(s => s.cap))], tys: small.slice(0, 6).map(s => s.ty) });
  // (к) frequent big pans (every 10 s for 3 min) → extended only once a minute (at 10 s, 70 s, 130 s → cap 6)
  const freq = [];
  const zk = await capSession('k', pdfSetup, async () => {
    for (let i = 1; i <= 18; i++) { await adv(10000); const up = i % 2 === 1; await drag(X(0.5), Y(up ? 0.8 : 0.2), X(0.5), Y(up ? 0.2 : 0.8), 8, 8); await sleep(50); const s = await st(); freq.push(s.snap.pageCapMs / 60000); }
    await adv(10 * 60000 - 180000);
  }, true);
  ok('(к) 18 big pans every 10 s → only 3 extensions (once per 60 s) → cap 6 → 6.00 min credited over 10 min', zk.minutes === 6 && freq[freq.length - 1] === 6 && freq.filter((c, i) => i && c !== freq[i - 1]).length === 2, { minutes: zk.minutes, caps: freq });
  // zoom change also extends (once per 60 s)
  const zoomCaps = [];
  const zzoom = await capSession('zoom', pdfSetup, async () => {
    await dbltap(0.5, 0.45); await sleep(400); zoomCaps.push((await st()).snap.pageCapMs / 60000);
    await adv(20000); await dbltap(0.5, 0.45); await sleep(400); zoomCaps.push((await st()).snap.pageCapMs / 60000);
    await adv(45000); await pinch(X(0.5), Y(0.5), 120, 260); await sleep(500); zoomCaps.push((await st()).snap.pageCapMs / 60000);
    await adv(9 * 60000);
  });
  ok('(з′) zoom change (double tap / pinch) extends +1 min, also at most once per 60 s', zoomCaps.join(',') === '4,4,5' && zzoom.minutes === 5, { caps: zoomCaps, minutes: zzoom.minutes });
  // (л) text reader: still a flat 3 min per page (even if activity events arrive)
  const zl = await capSession('l', async () => {
    await page.evaluate((id) => openBook(id), ids.t); await page.waitForFunction(() => !document.getElementById('reader').classList.contains('hidden') && R.pageCount > 1); await sleep(3800); await viewerRect();
  }, async () => { for (let m = 0; m < 10; m++) { await adv(60000); await page.evaluate(() => { __tracker.userActive('pan', { fraction: 0.5 }); __tracker.userActive('zoom'); }); } });
  ok('(л) text reader: 10 min on one page (+ activity events every minute) → 3.00 min (no extension for text)', zl.minutes === 3 && zl.snap.pageCapMs === 180000, zl);
}

results.pageErrors = pageErrors;
if (!OLD) ok('no page errors', pageErrors.length === 0, pageErrors);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const n = results.checks.length, p = results.checks.filter(c => c.pass).length;
console.log(`\n${MODE}: ${p}/${n} checks passed`);
await browser.close();
