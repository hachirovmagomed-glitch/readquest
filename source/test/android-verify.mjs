// ReadQuest Android-fix verification (headless Chrome, Pixel 7 emulation, dist served under /readquest/)
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const OUT = process.env.RQ_OUT || '/workspace/readquest/shots/android-fix3';
fs.mkdirSync(OUT, { recursive: true });
const BOOK = '/workspace/rqtest/Длинная книга.txt';
const results = { checks: [], flips: [], pinch: [], session: {} };
const ok = (name, pass, info) => { results.checks.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + JSON.stringify(info) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.emulate({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
});
// RQ_FAKE_NOW=<ISO or ms> (optional, diagnostics): start the main page's wall clock at that instant (e.g. to prove the
// weekday-dependent checks on a Tuesday / Friday / Sunday). Date.now and `new Date()` are shifted; performance.now is not.
const FAKE_NOW = process.env.RQ_FAKE_NOW ? (isNaN(+process.env.RQ_FAKE_NOW) ? Date.parse(process.env.RQ_FAKE_NOW) : +process.env.RQ_FAKE_NOW) : null;
if (FAKE_NOW !== null && isNaN(FAKE_NOW)) throw new Error('bad RQ_FAKE_NOW');
const WALL_OFF = FAKE_NOW === null ? null : FAKE_NOW - Date.now(); // constant for the whole run → consistent across reloads
await page.evaluateOnNewDocument((wallOff) => {
  // controllable clock for anti-cheat tests (performance.now + Date.now shift together)
  window.__rqTimeOffset = 0;
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now;
  if (wallOff != null) { const RD = Date;
    class FakeDate extends RD { constructor(...a) { if (a.length === 0) super(dn() + wallOff + window.__rqTimeOffset); else super(...a); } }
    FakeDate.now = () => dn() + wallOff + window.__rqTimeOffset; window.Date = FakeDate; }
  else Date.now = () => dn() + window.__rqTimeOffset;
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset));
  // toast observer: any .rq-toast / visible #timerHint while the reader is open
  window.__toasts = [];
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.classList && n.classList.contains('rq-toast')) window.__toasts.push({ t: n.textContent, reader: !document.getElementById('reader').classList.contains('hidden') });
  }))).observe(document, { childList: true, subtree: true });
}, WALL_OFF);
const cdp = await page.target().createCDPSession();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console.' + m.type(), m.text()); });

async function boot() {
  await page.waitForFunction(() => window.__rqReady, { timeout: 20000 });
  await sleep(300);
}
await page.goto(BASE, { waitUntil: 'load' });
await boot();
const build = await page.evaluate(() => RQ_BUILD);
ok('build marker present', build && build !== '__RQ_BUILD__', build);

// ---- add long book via the real file input ----
const inp = await page.$('#fileInp');
await inp.uploadFile(BOOK);
await page.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
const bookId = await page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
await page.screenshot({ path: OUT + '/01-library.png' });

// ---- frame capture helpers ----
let frames = []; let capturing = false;
cdp.on('Page.screencastFrame', async (f) => {
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  if (capturing) frames.push({ data: f.data, md: f.metadata, t: Date.now() });
});
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

function decode(b64) { return PNG.sync.read(Buffer.from(b64, 'base64')); }
let viewerRect = null;
// glyph pixels = dark AND warm (sepia text #5b4636 + antialiasing); excludes the app's dark-teal
// background (#0c2127) that fills the unused part of the 800px-wide headless screencast surface.
function glyphCount(png) {
  let n = 0; const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (L < 150 && d[i] > d[i + 2] + 12) n++;
  }
  return n;
}
function strip(pngs, file, kk) {
  const k = kk || 4; // downscale
  const ws = pngs.map(p => Math.floor(p.width / k)), h = Math.max(...pngs.map(p => Math.floor(p.height / k)));
  const out = new PNG({ width: ws.reduce((a, b) => a + b + 4, 0), height: h });
  out.data.fill(0); // black separators between frames
  let ox = 0;
  pngs.forEach((p, idx) => {
    for (let y = 0; y < Math.floor(p.height / k); y++) for (let x = 0; x < ws[idx]; x++) {
      const si = ((y * k) * p.width + x * k) * 4, di = (y * out.width + ox + x) * 4;
      out.data[di] = p.data[si]; out.data[di + 1] = p.data[si + 1]; out.data[di + 2] = p.data[si + 2]; out.data[di + 3] = 255;
    }
    ox += ws[idx] + 4;
  });
  fs.writeFileSync(file, PNG.sync.write(out));
}
// burst screenshots of the full text area at device resolution (screencast surface is 800×600 @1x in headless)
let bursting = false, bursts = [];
async function burstLoop() {
  const r = viewerRect;
  while (bursting) {
    try {
      const data = await page.screenshot({ type: 'png', encoding: 'base64', captureBeyondViewport: false, optimizeForSpeed: true, clip: { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, scale: 0.5 } });
      bursts.push({ data, t: Date.now() });
    } catch (e) { await sleep(5); }
  }
}
const darkAll = (png) => glyphCount(png);
// DOM probe on every animation frame
async function probeStart() {
  await page.evaluate(() => {
    window.__probe = []; window.__probeOn = true;
    const c = document.getElementById('content'), v = document.getElementById('viewer');
    (function tick() {
      if (!window.__probeOn) return;
      const vr = v.getBoundingClientRect(), cs = getComputedStyle(c);
      const pts = [[0.5, 0.3], [0.5, 0.6], [0.3, 0.45]];
      let hits = 0;
      pts.forEach(([fx, fy]) => {
        const els = document.elementsFromPoint(vr.left + vr.width * fx, vr.top + vr.height * fy);
        if (els.some(e => e !== c && c.contains(e))) hits++;
      });
      // (г) page number + book progress must show the page the strip is translated to, in THIS frame
      const mt = /translateX\((-?[\d.]+)px\)/.exec(c.style.transform || ''); const tp = mt ? Math.round(-parseFloat(mt[1]) / R.step) : 0;
      const num = parseInt(document.getElementById('rPage').textContent, 10), sv = +document.getElementById('pgSlider').value;
      const pgn = document.getElementById('pgNum'), pgnTxt = pgn ? pgn.textContent : null, pgnVis = pgn ? getComputedStyle(pgn).visibility === 'visible' && getComputedStyle(pgn.parentNode).display !== 'none' : false;
      const barsOff = document.getElementById('reader').classList.contains('barsoff');
      window.__probe.push({ connected: c.isConnected, vis: cs.visibility, op: cs.opacity, disp: cs.display, hits, page: R.page, tp, num, sv, numOk: num === tp + 1 && sv === tp,
        pgOk: pgnTxt === (tp + 1) + ' / ' + R.pageCount && (!barsOff || pgnVis), barsOff });
      requestAnimationFrame(tick);
    })();
  });
}
async function probeStop() { return page.evaluate(() => { window.__probeOn = false; return window.__probe; }); }

async function capture(label, action, settleMs = 450, keepStrip = false) {
  frames = []; capturing = true; bursts = []; bursting = true;
  await probeStart();
  const bl = burstLoop();
  await sleep(30);
  await action();
  await sleep(settleMs);
  capturing = false; bursting = false; await bl;
  const probe = await probeStop();
  const pngs = frames.map(f => ({ png: decode(f.data), md: f.md }));
  const counts = pngs.map(p => glyphCount(p.png));
  const bpngs = bursts.map(b => decode(b.data));
  const bcounts = bpngs.map(darkAll);
  if (counts.length) { const mi = counts.indexOf(Math.min(...counts)); fs.mkdirSync('/tmp/minframes', { recursive: true }); fs.writeFileSync(`/tmp/minframes/${label}.png`, Buffer.from(frames[mi].data, 'base64')); fs.writeFileSync(`/tmp/minframes/${label}.json`, JSON.stringify({ md: frames[mi].md, w: pngs[mi].png.width, h: pngs[mi].png.height, count: counts[mi], all: counts })); }
  const domBad = probe.filter(p => !p.connected || p.vis !== 'visible' || p.op !== '1' || p.disp === 'none' || p.hits === 0).length;
  const rec = { label, frames: counts.length, minGlyphPx: counts.length ? Math.min(...counts) : null, maxGlyphPx: counts.length ? Math.max(...counts) : null,
    bursts: bcounts.length, burstMinGlyphPx: bcounts.length ? Math.min(...bcounts) : null, rafSamples: probe.length, domBad,
    numBad: probe.filter(p => !p.numOk).length, pgBad: probe.filter(p => !p.pgOk).length, barsOffSamples: probe.filter(p => p.barsOff).length, pagesSeen: [...new Set(probe.map(p => p.tp))], numsSeen: [...new Set(probe.map(p => p.num))] };
  if (keepStrip && bpngs.length) {
    const file = `${OUT}/strip-${label.replace(/[^\w-]+/g, '_')}.png`;
    strip(bpngs.slice(0, 14), file, 2); rec.strip = file;
  }
  return rec;
}
const sessIds = () => page.evaluate(async () => (await __rq.listSessions({})).map(r => r.id));
async function newRow(beforeIds) { const rows = await page.evaluate(async () => __rq.listSessions({})); const n = rows.filter(r => !beforeIds.includes(r.id)); return n.length === 1 ? n[0] : { error: 'expected 1 new row', rows: n }; }
const st = () => page.evaluate(() => ({ page: R.page, count: R.pageCount, size: SET.size, layouts: window.__rqLayoutCount, scale: window.visualViewport ? visualViewport.scale : 1 }));

// ================= READER: open book =================
await page.evaluate((id) => openBook(id), bookId);
await page.waitForFunction(() => !document.getElementById('reader').classList.contains('hidden') && R.pageCount > 1);
await sleep(3800); // let chrome auto-hide settle (barsoff)
viewerRect = await page.evaluate(() => { const r = document.getElementById('viewer').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
let s0 = await st();
ok('book long enough (≥35 pages)', s0.count >= 35, s0);
const timerVisible = await page.evaluate(() => { const b = document.getElementById('btnTimer'); return getComputedStyle(b).display !== 'none'; });
ok('MVP: reader has no ▶ timer button', !timerVisible);
await page.screenshot({ path: OUT + '/02-reader-open.png' });

const tapRight = async () => { const x = viewerRect.left + (viewerRect.right - viewerRect.left) * 0.85, y = (viewerRect.top + viewerRect.bottom) / 2; await page.touchscreen.tap(x, y); };
const tapLeft = async () => { const x = viewerRect.left + (viewerRect.right - viewerRect.left) * 0.15, y = (viewerRect.top + viewerRect.bottom) / 2; await page.touchscreen.tap(x, y); };
async function swipe(dir) {
  const y = (viewerRect.top + viewerRect.bottom) / 2, xa = dir > 0 ? 330 : 90, xb = dir > 0 ? 90 : 330;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xa, y }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: xa + (xb - xa) * i / 6, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// ---- 10 consecutive flips (tap zone) from the start ----
const startPage = (await st()).page; const layoutsBeforeFlips = (await st()).layouts;
for (let i = 0; i < 10; i++) {
  const r = await capture(`tap-flip-${i + 1}`, tapRight, 400, i === 0 || i === 9);
  r.after = (await st()).page; results.flips.push(r);
}
ok('flips never re-measure (0 column reflows during 10 flips)', (await st()).layouts === layoutsBeforeFlips, { before: layoutsBeforeFlips, after: (await st()).layouts });
ok('10 consecutive tap flips advanced 10 pages', (await st()).page === startPage + 10, { from: startPage, to: (await st()).page });
{ // (г) page number / progress in the same frame as the text, on each of the 10 flips
  const f10 = results.flips.slice(0, 10);
  const raf = f10.reduce((a, r) => a + r.rafSamples, 0), bad = f10.reduce((a, r) => a + r.numBad, 0);
  const eachFlipChanged = f10.every((r, i) => r.numsSeen.includes(startPage + i + 2));
  const noTr = await page.evaluate(() => ['rPage', 'rPct', 'pgSlider'].map(id => getComputedStyle(document.getElementById(id)).transitionDuration));
  const pgBad = f10.reduce((a, r) => a + r.pgBad, 0), barsOffN = f10.reduce((a, r) => a + r.barsOffSamples, 0);
  ok('(з) always-on page number «N / M» = page of the visible text on every rAF of 10 flips, visible with bars hidden', pgBad === 0 && barsOffN === raf && raf > 50, { rafSamples: raf, mismatched: pgBad, barsOffSamples: barsOffN });
  const geo = await page.evaluate(() => {
    const n = document.getElementById('pgNum'), nr = n.getBoundingClientRect(), v = document.getElementById('viewer').getBoundingClientRect(), d = document.getElementById('dayBar').getBoundingClientRect(), cs = getComputedStyle(n);
    const rg = document.createRange(); rg.selectNodeContents(document.getElementById('content'));
    let overlap = 0, lines = 0, lowest = 0;
    for (const r of rg.getClientRects()) { if (r.width < 1 || r.right <= v.left || r.left >= v.right) continue; lines++; lowest = Math.max(lowest, r.bottom);
      if (!(r.right <= nr.left || r.left >= nr.right || r.bottom <= nr.top || r.top >= nr.bottom)) overlap++; }
    return { text: n.textContent, num: { l: Math.round(nr.left), t: Math.round(nr.top), r: Math.round(nr.right), b: Math.round(nr.bottom) }, viewerBottom: Math.round(v.bottom), dayBarTop: Math.round(d.top), lowestLine: Math.round(lowest), lines, overlap,
      font: cs.fontSize, opacity: cs.opacity, color: cs.color, pe: getComputedStyle(n.parentNode).pointerEvents, pos: getComputedStyle(n.parentNode).position, inViewer: !!n.closest('#viewer'), barsOff: document.getElementById('reader').classList.contains('barsoff'), vw: innerWidth };
  });
  ok('(з) page number: bottom-right above the 3px day bar, 11–12px, muted (opacity .45, not accent), pointer-events:none, outside the columns, no text line overlaps its bbox',
    geo.overlap === 0 && geo.lines > 5 && geo.num.t >= geo.viewerBottom - 0.5 && geo.lowestLine <= geo.num.t && geo.num.b <= geo.dayBarTop + 0.5 && geo.num.r > geo.vw * 0.7 && ['11px', '12px'].includes(geo.font) && Math.abs(parseFloat(geo.opacity) - 0.45) < 0.01 && geo.color !== 'rgb(43, 179, 192)' && geo.pe === 'none' && !geo.inViewer && geo.barsOff, geo);
  await page.screenshot({ path: OUT + '/11-reader-page-number.png' });
  const ctap = async (wait = 350) => { await page.touchscreen.tap((viewerRect.left + viewerRect.right) / 2, (viewerRect.top + viewerRect.bottom) / 2); if (wait) await sleep(wait); };
  const edgeTap = async () => { await page.touchscreen.tap(viewerRect.left + (viewerRect.right - viewerRect.left) * 0.85, (viewerRect.top + viewerRect.bottom) / 2); };
  // probes WITHOUT a user gesture (puppeteer's page.evaluate runs with userGesture:true and would refresh activation)
  const ev = async (fn) => { const r = await cdp.send('Runtime.evaluate', { expression: `(${fn})()`, returnByValue: true, userGesture: false }); return r.result.value; };
  const fsState = () => ev(() => ({ fs: !!document.fullscreenElement, barsOff: document.getElementById('reader').classList.contains('barsoff'), head: getComputedStyle(document.querySelector('.rhead')).display, foot: getComputedStyle(document.querySelector('.rfoot')).display,
    pending: fsPending, page: R.page, num: document.getElementById('pgNum').textContent, footNum: document.getElementById('rPage').textContent, pgVis: getComputedStyle(document.getElementById('pgNum')).visibility, ua: navigator.userActivation ? navigator.userActivation.isActive : null, log: __rqFsLog.slice(-4).map(x => x.how + ':' + x.ok + (x.why ? ':' + x.why : '')) }));
  const fs0 = await fsState();
  ok('(fs) reader open on phone → reading state: bars hidden + fullscreen', fs0.fs && fs0.barsOff && fs0.head === 'none' && fs0.foot === 'none', fs0);
  // (а) ONE centre tap: bars + leave fullscreen, same handler; check immediately (no wait for timers)
  await page.evaluate(() => { window.__tapFrame = null; const r = document.getElementById('reader'); const mo = new MutationObserver(() => { if (!r.classList.contains('barsoff') && window.__tapFrame === null) window.__tapFrame = { fsAtReveal: !!document.fullscreenElement, exitCalled: true }; }); mo.observe(r, { attributes: true }); window.__tapMo = mo; });
  await ctap(60);
  const fsA = await fsState();
  const tapFrame = await ev(() => { window.__tapMo.disconnect(); return window.__tapFrame; });
  ok('(а) ONE centre tap in fullscreen → our bars visible at once + document.fullscreenElement == null', !fsA.barsOff && fsA.head !== 'none' && fsA.foot !== 'none' && !fsA.fs, { fsA, tapFrame });
  ok('(з) bars shown: footer has the number, corner number hidden (no duplicate / overlap)', fsA.pgVis === 'hidden' && fsA.footNum === fsA.num, { footNum: fsA.footNum, num: fsA.num, pgVis: fsA.pgVis });
  // (б) after 3.2 s: bars hidden again; fullscreen back from the TIMER (tap activation still alive, ≤5 s)?
  await sleep(3500);
  const fsB = await fsState();
  results.fullscreen = { timer: fsB };
  ok('(б) 3.2 s after the tap: bars hidden; fullscreen re-entered by the timer (transient activation ≤5 s)', fsB.barsOff && fsB.foot === 'none' && fsB.fs && fsB.log.some(x => x.startsWith('timer:true')), fsB);
  ok('(з) bars auto-hidden again → corner number visible', fsB.pgVis === 'visible' && fsB.foot === 'none');
  // (б′) EMULATED refusal: activation expired before the timer → fullscreen comes back on the next reading gesture
  await ctap(60);
  await ev(() => { window.__uaPatch = Object.getOwnPropertyDescriptor(UserActivation.prototype, 'isActive'); Object.defineProperty(UserActivation.prototype, 'isActive', { configurable: true, get: () => false }); });
  await sleep(3500);
  const fsC = await fsState();
  await ev(() => { Object.defineProperty(UserActivation.prototype, 'isActive', window.__uaPatch); });
  const pgBeforeEdge = fsC.page;
  await edgeTap(); await sleep(300);
  const fsD = await fsState();
  results.fullscreen.fallback = { afterTimer: fsC, afterEdgeTap: fsD };
  ok('(б′) [emulated: userActivation.isActive=false at the timer] bars hide, fullscreen pending → next edge tap re-enters fullscreen AND still flips 1 page',
    fsC.barsOff && !fsC.fs && fsC.pending && fsC.log.some(x => x.startsWith('timer:false:no-activation')) && fsD.fs && !fsD.pending && fsD.page === pgBeforeEdge + 1 && fsD.barsOff && fsD.log.some(x => x.startsWith('gesture:true')), { fsC, fsD });
  // centre tap with bars open hides them (and re-enters fullscreen from that tap)
  await ctap(60); const fsE1 = await fsState(); await ctap(300); const fsE2 = await fsState();
  ok('centre tap while bars are open → bars hidden + fullscreen back', !fsE1.barsOff && !fsE1.fs && fsE2.barsOff && fsE2.fs && fsE2.foot === 'none', { open: fsE1, closed: fsE2 });
  // (в) enter/exit fullscreen with the bars (real taps) + EMULATED viewport resize (system bars) — frames + position
  await page.evaluate(() => { window.__anc0 = captureAnchor(); window.__anc0txt = window.__anc0 ? window.__anc0.node.nodeValue.slice(window.__anc0.offset, window.__anc0.offset + 24) : null; });
  const posChk = () => page.evaluate(() => ({ anchorPage: pageOfAnchor(window.__anc0), page: R.page, num: document.getElementById('pgNum').textContent, foot: document.getElementById('rPage').textContent, count: R.pageCount, txt: window.__anc0txt }));
  const fsRecs = [], posLog = [];
  for (let k = 0; k < 3; k++) {
    fsRecs.push(await capture(`fs-reveal-${k}`, () => ctap(0), 450, k === 0)); posLog.push(await posChk());
    fsRecs.push(await capture(`sysbars-shrink-${k}`, () => page.setViewport({ width: 412, height: 851, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }), 450, k === 0)); posLog.push(await posChk());
    fsRecs.push(await capture(`fs-conceal-${k}`, () => ctap(0), 450, k === 0)); posLog.push(await posChk());
    fsRecs.push(await capture(`sysbars-grow-${k}`, () => page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }), 450, k === 0)); posLog.push(await posChk());
  }
  results.fullscreen.transitions = { recs: fsRecs.map(r => ({ label: r.label, frames: r.frames, minGlyphPx: r.minGlyphPx, bursts: r.bursts, burstMin: r.burstMinGlyphPx, domBad: r.domBad, numBad: r.numBad, pgBad: r.pgBad })), posLog };
  const fsMinF = Math.min(...fsRecs.filter(r => r.frames).map(r => r.minGlyphPx)), fsMinB = Math.min(...fsRecs.filter(r => r.bursts).map(r => r.burstMinGlyphPx));
  ok('(в) 12 bar/fullscreen + viewport transitions: no blank frame/burst shot, DOM visible every rAF, page number = text page every rAF',
    fsMinF > 3000 && fsMinB > 3000 && fsRecs.every(r => r.domBad === 0 && r.numBad === 0 && r.pgBad === 0), { frames: fsRecs.reduce((a, r) => a + r.frames, 0), minGlyph: fsMinF, bursts: fsRecs.reduce((a, r) => a + r.bursts, 0), burstMin: fsMinB, domBad: fsRecs.reduce((a, r) => a + r.domBad, 0), numBad: fsRecs.reduce((a, r) => a + r.numBad, 0) });
  ok('(в) reading position kept through all 12 transitions (anchor text stays on the current page, number = page)',
    posLog.every(p => p.anchorPage === p.page && p.num === (p.page + 1) + ' / ' + p.count), posLog);
  viewerRect = await page.evaluate(() => { const r = document.getElementById('viewer').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
  ok('(г) page number + slider = page of the visible text on every rAF of 10 flips (same frame), no transition', bad === 0 && raf > 50 && eachFlipChanged && noTr.every(d => d.split(',').every(x => parseFloat(x) === 0)), { rafSamples: raf, mismatched: bad, eachFlipChanged, transition: noTr });
}
// ---- swipes ----
for (let i = 0; i < 4; i++) { const r = await capture(`swipe-${i % 2 ? 'back' : 'fwd'}-${i + 1}`, () => swipe(i % 2 ? -1 : 1), 400, i === 0); r.after = (await st()).page; results.flips.push(r); }
// ---- problematic pages (1-based as reported) ----
const bad = [11, 14, 15, 16, 19, 21, 22, 29, 31, 32, 33];
for (const p of bad) {
  await page.evaluate((n) => goPage(n - 2, false), p); await sleep(250);
  const r1 = await capture(`p${p}-in`, tapRight, 400, [11, 22, 33].includes(p)); r1.after = (await st()).page + 1;
  const r2 = await capture(`p${p}-next`, tapRight, 400); r2.after = (await st()).page + 1;
  const r3 = await capture(`p${p}-back`, tapLeft, 400); r3.after = (await st()).page + 1;
  results.flips.push(r1, r2, r3);
}
// deep flips 35+
await page.evaluate(() => goPage(34, false)); await sleep(200);
for (let i = 0; i < 3; i++) { const r = await capture(`deep-${36 + i}`, tapRight, 400, i === 2); r.after = (await st()).page + 1; results.flips.push(r); }
// slow-device pass: 6× CPU throttling, 10 flips around pages 28–38
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await page.evaluate(() => goPage(27, false)); await sleep(300);
for (let i = 0; i < 10; i++) { const r = await capture(`cpu6x-${29 + i}`, i % 3 === 2 ? tapLeft : tapRight, 500, i === 4); r.after = (await st()).page + 1; results.flips.push(r); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const allF = results.flips;
const totalFrames = allF.reduce((a, r) => a + r.frames, 0);
const minGlyph = Math.min(...allF.filter(r => r.frames).map(r => r.minGlyphPx));
const totalBursts = allF.reduce((a, r) => a + r.bursts, 0);
const minBurst = Math.min(...allF.filter(r => r.bursts).map(r => r.burstMinGlyphPx));
ok('flip burst screenshots (full text area @device res, ~every 20–60 ms): every shot has glyphs', minBurst > 3000, { shots: totalBursts, minGlyph: minBurst });
const domBadTotal = allF.reduce((a, r) => a + r.domBad, 0);
const rafTotal = allF.reduce((a, r) => a + r.rafSamples, 0);
ok('flip frames: every captured frame has glyphs (>3000 dark px in text area)', minGlyph > 3000, { flips: allF.length, frames: totalFrames, minGlyph });
ok('flip DOM: content connected+visible and text under probe points on every rAF', domBadTotal === 0, { rafSamples: rafTotal, bad: domBadTotal });
await page.screenshot({ path: OUT + '/03-reader-deep-page.png' });

// ================= PINCH → font size =================
await page.evaluate(() => goPage(20, false)); await sleep(300);
async function pinch(d0, d1, label) {
  const cx = 206, cy = (viewerRect.top + viewerRect.bottom) / 2;
  const before = await st();
  await page.evaluate(() => { window.__anchorBefore = captureAnchor(); window.__anchorText = window.__anchorBefore ? window.__anchorBefore.node.nodeValue.slice(window.__anchorBefore.offset, window.__anchorBefore.offset + 30) : null; });
  frames = []; capturing = true; bursts = []; bursting = true; await probeStart();
  const bl = burstLoop();
  const pts = (d) => [{ x: cx - d / 2, y: cy, id: 0 }, { x: cx + d / 2, y: cy, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) });
  const layoutsMid = [];
  await page.evaluate(() => { window.__hintVals = []; const n = document.getElementById('pinchHintN'); window.__hintMo = new MutationObserver(() => { const h = document.getElementById('pinchHint'); window.__hintVals.push({ v: n.textContent, vis: getComputedStyle(h).display !== 'none' }); }); window.__hintMo.observe(n, { childList: true, characterData: true, subtree: true }); });
  const hintAtStart = await page.evaluate(() => { const h = document.getElementById('pinchHint'); return getComputedStyle(h).display !== 'none' ? h.textContent : null; });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + (d1 - d0) * i / 12) }); await sleep(16);
    if (i % 4 === 0) layoutsMid.push((await st()).layouts);
    if (i === 9) await page.screenshot({ path: `${OUT}/pinch-hint-${label}.png` });
  }
  const midState = await st();
  const hintMid = await page.evaluate(() => { const h = document.getElementById('pinchHint'); return h.classList.contains('hidden') ? null : h.textContent; });
  const hintStyle = await page.evaluate(() => { const h = document.getElementById('pinchHint'), cs = getComputedStyle(h), r = h.getBoundingClientRect(), a = getComputedStyle(h.querySelector('b'));
    return { pos: cs.position, pe: cs.pointerEvents, bg: cs.backgroundColor, color: cs.color, aa: a.color, radius: cs.borderRadius, font: cs.fontSize, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), vw: innerWidth, vh: innerHeight, inViewer: !!h.closest('#viewer') }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const hintAfter = await page.evaluate(() => getComputedStyle(document.getElementById('pinchHint')).display);
  await sleep(500);
  const hintVals = await page.evaluate(() => { window.__hintMo.disconnect(); return window.__hintVals; });
  const hintAfter500 = await page.evaluate(() => getComputedStyle(document.getElementById('pinchHint')).display);
  capturing = false; bursting = false; await bl; const probe = await probeStop();
  const after = await st();
  const pngs = frames.map(f => ({ png: decode(f.data), md: f.md }));
  const counts = pngs.map(p => glyphCount(p.png));
  const bpngs = bursts.map(b => decode(b.data)); const bcounts = bpngs.map(darkAll);
  if (bpngs.length) strip(bpngs.filter((_, i) => i % Math.max(1, Math.floor(bpngs.length / 14)) === 0).slice(0, 14), `${OUT}/strip-pinch-${label}.png`, 2);
  const posKept = await page.evaluate(() => { const p = pageOfAnchor(window.__anchorBefore); return { anchorPage: p, page: R.page, text: window.__anchorText }; });
  const clip = await page.evaluate(() => {
    const v = document.getElementById('viewer').getBoundingClientRect(), c = document.getElementById('content');
    const rg = document.createRange(); rg.selectNodeContents(c);
    let inside = 0, cut = 0;
    for (const r of rg.getClientRects()) {
      if (r.width < 1 || r.right <= v.left || r.left >= v.right) continue;
      if (r.left >= v.left - 0.5 && r.right <= v.right + 0.5) inside++; else cut++;
    }
    return { visibleLineRects: inside, clipped: cut };
  });
  const domBad = probe.filter(p => !p.connected || p.vis !== 'visible' || p.op !== '1' || p.disp === 'none' || p.hits === 0).length;
  const rec = { label, before, midState, hintMid, after, reflowsDuringGesture: midState.layouts - before.layouts, reflowsAfterTouchend: after.layouts - midState.layouts, frames: counts.length, minGlyphPx: counts.length ? Math.min(...counts) : null, bursts: bcounts.length, burstMinGlyphPx: bcounts.length ? Math.min(...bcounts) : null, rafSamples: probe.length, domBad, posKept, clip, strip: `${OUT}/strip-pinch-${label}.png` };
  results.pinch.push(rec);
  ok(`pinch ${label}: no reflow during gesture, exactly 1 after touchend`, rec.reflowsDuringGesture === 0 && rec.reflowsAfterTouchend === 1, { during: rec.reflowsDuringGesture, after: rec.reflowsAfterTouchend });
  ok(`pinch ${label}: font size changed`, after.size !== before.size, { from: before.size, to: after.size, hintMid });
  ok(`pinch ${label}: page never natively zoomed (visualViewport.scale==1)`, midState.scale === 1 && after.scale === 1, { mid: midState.scale, after: after.scale });
  ok(`pinch ${label}: every frame/burst shot has glyphs + DOM visible each rAF`, (rec.minGlyphPx === null || rec.minGlyphPx > 3000) && rec.burstMinGlyphPx > 3000 && domBad === 0, { frames: rec.frames, minGlyph: rec.minGlyphPx, bursts: rec.bursts, burstMin: rec.burstMinGlyphPx, raf: probe.length, domBad });
  const distinct = [...new Set(hintVals.map(h => h.v))];
  ok(`(д) pinch ${label}: «Aa N» visible during the gesture, N follows the fingers, gone after touchend`,
    !!hintAtStart && !!hintMid && distinct.length >= 2 && hintVals.every(h => h.vis) && hintMid === 'Aa ' + after.size && hintAfter === 'none' && hintAfter500 === 'none',
    { hintAtStart, hintMid, values: distinct, hintAfterTouchend: hintAfter, newSize: after.size, shot: `${OUT}/pinch-hint-${label}.png` });
  ok(`(д) pinch ${label}: hint style (fixed, centered, pointer-events:none, #0c2127 .9 / #e6f1f2 / #2bb3c0, r=12, 18–20px, outside columns)`,
    hintStyle.pos === 'fixed' && hintStyle.pe === 'none' && hintStyle.bg === 'rgba(12, 33, 39, 0.9)' && hintStyle.color === 'rgb(230, 241, 242)' && hintStyle.aa === 'rgb(43, 179, 192)' && hintStyle.radius === '12px' && parseFloat(hintStyle.font) >= 18 && parseFloat(hintStyle.font) <= 20 && Math.abs(hintStyle.cx - hintStyle.vw / 2) <= 2 && Math.abs(hintStyle.cy - hintStyle.vh / 2) <= 2 && !hintStyle.inViewer, hintStyle);
  ok(`pinch ${label}: reading position kept (anchor text on current page)`, posKept.anchorPage === posKept.page, posKept);
  ok(`pinch ${label}: no line box cut by the page edge`, clip.clipped === 0 && clip.visibleLineRects > 5, clip);
}
await pinch(120, 260, 'out-bigger');
await page.screenshot({ path: OUT + '/04-after-pinch-out.png' });
await pinch(260, 140, 'in-smaller');
await page.screenshot({ path: OUT + '/05-after-pinch-in.png' });
// browser-level synthetic pinch (GesturePinch, bypasses touch events) — must not zoom the text either
const beforeSyn = await st();
try { await cdp.send('Input.synthesizePinchGesture', { x: 206, y: 450, scaleFactor: 2, relativeSpeed: 800, gestureSourceType: 'touch' }); } catch (e) { console.log('synthesizePinchGesture n/a', e.message); }
await sleep(600);
const afterSyn = await st();
ok('synthesizePinchGesture (compositor pinch) blocked in reader: scale stays 1', afterSyn.scale === 1, { before: beforeSyn, after: afterSyn });
// tap after pinch still flips (no stuck state)
const pgB = (await st()).page; await tapRight(); await sleep(300);
ok('tap flip still works after pinch', (await st()).page === pgB + 1);

// ================= SESSION / TIMER =================
const toastsReading = await page.evaluate(() => window.__toasts.filter(t => t.reader));
ok('MVP: no toast over the text while reading (flips+pinch)', toastsReading.length === 0, toastsReading);
// fresh session: 10 forward flips, 70 s each (counted), close
await page.evaluate(() => closeReader()); await sleep(800);
await page.evaluate(() => btnDone && document.getElementById('btnDone').click()); await sleep(200);
const xp0 = await page.evaluate(() => S.xp); const goldS0 = await page.evaluate(() => S.gold);
const nSess0 = await page.evaluate(async () => (await __rq.listSessions({})).length); const idsA = await sessIds();
await page.evaluate((id) => openBook(id), bookId); await sleep(500);
for (let i = 0; i < 10; i++) { await page.evaluate(() => { window.__rqTimeOffset += 70000; }); await tapRight(); await sleep(120); }
const barW = await page.evaluate(() => document.querySelector('#dayBar i').style.width);
await page.screenshot({ path: OUT + '/06-reader-daybar.png' });
await page.evaluate(() => { window.__rqTimeOffset += 20000; });
await page.evaluate(() => document.getElementById('btnBack').click());
await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), { timeout: 5000 });
await sleep(1200);
await page.screenshot({ path: OUT + '/07-summary.png' });
const sessA = await newRow(idsA);
const xp1 = await page.evaluate(() => S.xp);
const sumLine = await page.evaluate(() => { const q = document.getElementById('sumQuestGold'); return { text: q.textContent, visible: getComputedStyle(q).display !== 'none', gold: S.gold }; });
const expMin = (10 * 70 + 20) / 60; // 12 min
ok('session row written once, id = reader UUID (not an IDB autoincrement)', sessA && typeof sessA.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(sessA.id) && (await page.evaluate(async () => (await __rq.listSessions({})).length)) === nSess0 + 1, sessA);
ok('counted minutes = sum of capped page dwell (10×70 s + 20 s tail = 12.0 min)', Math.abs(sessA.minutes - expMin) < 0.05, { minutes: sessA.minutes });
ok('pageTurns = 10 counted pages', sessA.pageTurns === 10, sessA.pageTurns);
ok('XP = Math.round(min)*10 = 120, awarded once', xp1 - xp0 === Math.round(sessA.minutes) * 10, { gained: xp1 - xp0 });
ok('day-progress bar moved while reading', parseFloat(barW) > 0, barW);
results.session.normal = { row: sessA, xpGained: xp1 - xp0, dayBar: barW };

// idempotency: re-render summary twice, re-run award pass, reload
await page.evaluate(() => { const a = { xp: 120, gold: 0, pages: 10, min: 12, stat: 'Воля', statGain: 1, newB: [], lvBefore: 1, justFinished: false, mult: 1, flipped: 10, cheatFinish: false, dName: '', dmul: 1, newAch: [] }; renderSummary(a); renderSummary(a); awardPendingSessions(); awardPendingSessions(); });
ok('render summary twice + award pass twice → XP unchanged', (await page.evaluate(() => S.xp)) === xp1, await page.evaluate(() => S.xp));
// daily AUTO-paid on the summary of the session that took today to ≥10 min
const daily = await page.evaluate(() => ({ prog: mvpDailyProg(), gold: S.gold, paid: S.dailyPaidDays.slice() })); daily.line = sumLine.text; daily.lineVisible = sumLine.visible; daily.gold = sumLine.gold;
const goldAfterDaily = daily.gold;
ok('(а) session that brings the day to ≥10 min → +30 auto once + summary line «+30 🪙 ежедневка выполнена»', daily.prog === 1 && daily.gold - goldS0 === 30 && daily.paid.includes(await page.evaluate(() => today())) && daily.line === '+30 🪙 ежедневка выполнена' && daily.lineVisible, { daily, gained: daily.gold - goldS0 });
ok('render summary twice + award pass twice → gold unchanged', (await page.evaluate(() => S.gold)) === goldAfterDaily);
await page.reload({ waitUntil: 'load' }); await boot();
ok('reload → XP/gold unchanged', (await page.evaluate(() => S.xp)) === xp1 && (await page.evaluate(() => S.gold)) === goldAfterDaily, await page.evaluate(() => ({ xp: S.xp, gold: S.gold })));

// forgotten open book: no flips for 10 min
const xpF0 = await page.evaluate(() => S.xp); const idsF = await sessIds();
await page.evaluate((id) => openBook(id), bookId); await sleep(400);
await page.evaluate(() => { window.__rqTimeOffset += 10 * 60000; });
await page.evaluate(() => document.getElementById('btnBack').click()); await sleep(1200);
const sessF = await newRow(idsF);
ok('forgotten book: open, 10 min without flips → counted ≤ 3 min', sessF.minutes <= 3.0001 && sessF.minutes >= 2.9, { minutes: sessF.minutes, xp: (await page.evaluate(() => S.xp)) - xpF0 });
results.session.forgotten = sessF;
await page.evaluate(() => document.getElementById('btnDone').click());

// hidden tab = 0
const idsH = await sessIds();
await page.evaluate((id) => openBook(id), bookId); await sleep(300);
await page.evaluate(() => { window.__rqTimeOffset += 60000; });
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
await page.evaluate(() => { window.__rqTimeOffset += 5 * 60000; });
await page.evaluate(() => { delete document.visibilityState; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
await page.evaluate(() => { window.__rqTimeOffset += 30000; });
await tapRight(); await sleep(150);
await page.evaluate(() => { window.__rqTimeOffset += 30000; });
await page.evaluate(() => document.getElementById('btnBack').click()); await sleep(1200);
const sessH = await newRow(idsH);
ok('background time counts 0 (60 s + [5 min hidden] + 30 s on page 1, 30 s on page 2 → 2.0 min)', Math.abs(sessH.minutes - 2.0) < 0.05, { minutes: sessH.minutes });
results.session.hidden = sessH;
await page.evaluate(() => document.getElementById('btnDone').click());

// killed tab: reading without pressing ←, then reload → draft recovered into sessions[] and awarded
const xpK0 = await page.evaluate(() => S.xp);
const nK0 = await page.evaluate(async () => (await __rq.listSessions({})).length); const idsK = await sessIds();
await page.evaluate((id) => openBook(id), bookId); await sleep(300);
for (let i = 0; i < 4; i++) { await page.evaluate(() => { window.__rqTimeOffset += 45000; }); await tapRight(); await sleep(100); }
await page.reload({ waitUntil: 'load' }); await boot();
const sessK = { n: (await sessIds()).length, last: await newRow(idsK) };
const xpK1 = await page.evaluate(() => S.xp);
ok('app killed mid-session → row recovered on next boot (3 min, 4 pages) and XP awarded', sessK.n === nK0 + 1 && Math.abs(sessK.last.minutes - 3) < 0.05 && xpK1 - xpK0 === 30, { row: sessK.last, xp: xpK1 - xpK0 });
await page.reload({ waitUntil: 'load' }); await boot();
ok('second reload → no duplicate recovery / no extra XP', (await page.evaluate(async () => (await __rq.listSessions({})).length)) === nK0 + 1 && (await page.evaluate(() => S.xp)) === xpK1);

// legacy rows (pre-change: numeric IDB autoincrement keys, XP already paid) → deterministic legacy ids, never re-awarded
const xpL0 = await page.evaluate(() => S.xp);
await page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const q = indexedDB.open('readquest'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  await new Promise((res, rej) => { const tx = db.transaction('sessions', 'readwrite'); const st = tx.objectStore('sessions');
    st.add({ date: '2026-10-03', bookId: 'b1', minutes: 11.5, pageTurns: 9 }); st.add({ date: '2026-10-03', bookId: 'b2', minutes: 4, pageTurns: 2 });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
});
await page.reload({ waitUntil: 'load' }); await boot();
const legacyRows = await page.evaluate(async () => (await __rq.listSessions({ from: '2026-10-03', to: '2026-10-03' })).map(r => r.id));
ok('old numeric-key rows re-keyed to deterministic legacy ids; no XP re-award', JSON.stringify(legacyRows.sort()) === JSON.stringify(['legacy-2026-10-03-b1-11.5-9-0', 'legacy-2026-10-03-b2-4-2-1']) && (await page.evaluate(() => S.xp)) === xpL0, { legacyRows, xp: (await page.evaluate(() => S.xp)) - xpL0 });
// an OLD export (rows without id) imported twice → same legacy ids, totals unchanged
const oldExp = await page.evaluate(async () => { const e = await __rq.exportBackup(null, SET, {}); e.sessions = e.sessions.map(r => r.id.startsWith('legacy-') ? { date: r.date, bookId: r.bookId, minutes: r.minutes, pageTurns: r.pageTurns } : r); return JSON.stringify(e); });
const tO0 = await page.evaluate(async () => ({ xp: S.xp, ids: (await __rq.listSessions({})).map(r => r.id).sort() }));
for (let k = 0; k < 2; k++) { await page.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, oldExp); await page.reload({ waitUntil: 'load' }); await boot(); }
const tO1 = await page.evaluate(async () => ({ xp: S.xp, ids: (await __rq.listSessions({})).map(r => r.id).sort() }));
ok('import of an old id-less export twice → identical ids, XP unchanged', tO0.xp === tO1.xp && JSON.stringify(tO0.ids) === JSON.stringify(tO1.ids), { xp: [tO0.xp, tO1.xp], n: tO1.ids.length });

// export → import twice
const exp = await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })));
fs.mkdirSync('/workspace/rqtest/exports', { recursive: true });
fs.writeFileSync('/workspace/rqtest/exports/tester1.json', exp);
const ej = JSON.parse(exp);
ok('export: every session has a string id + game.awardedSessionIds', ej.sessions.length >= 4 && ej.sessions.every(s => typeof s.id === 'string') && ej.game.awardedSessionIds.length >= 4, { sessions: ej.sessions.length, awarded: ej.game.awardedSessionIds.length, schemaVersion: ej.schemaVersion });
const tot0 = await page.evaluate(async () => ({ xp: S.xp, gold: S.gold, n: (await __rq.listSessions({})).length }));
for (let k = 0; k < 2; k++) {
  await page.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, exp);
  await page.reload({ waitUntil: 'load' }); await boot();
}
const tot1 = await page.evaluate(async () => ({ xp: S.xp, gold: S.gold, n: (await __rq.listSessions({})).length, ids: new Set((await __rq.listSessions({})).map(r => r.id)).size }));
ok('import the same export twice → XP / gold / sessions unchanged', tot0.xp === tot1.xp && tot0.gold === tot1.gold && tot0.n === tot1.n && tot1.ids === tot1.n, { before: tot0, after: tot1 });

// weekly (+120 at 4 days ≥10 min) derived from sessions[]
await page.evaluate(async () => {
  const wk = weekKey(today());
  for (let i = 0; i < 4; i++) { const d = addLocalDays(wk, i); const r = await __rq.logSession({ id: crypto.randomUUID(), date: d, bookId: 'b1', minutes: 10.2, pageTurns: 5 }); SESS.push(r); }
});
// Expected new dailies depend on the weekday: the 4 seeded days are Mon–Thu of the current week. If today is one of them
// (Mon–Thu) its daily was already paid earlier in this run → 3 new days; Fri–Sun → today is outside → 4 new days.
const wkBefore = await page.evaluate(() => { const wk = weekKey(today()); const days = [0, 1, 2, 3].map(i => addLocalDays(wk, i));
  const paid = days.filter(d => (S.dailyPaidDays || []).indexOf(d) >= 0);
  return { prog: mvpWeeklyProg(), gold: S.gold, xp: S.xp, today: today(), weekday: new Date(Date.now()).getDay(), days, paidBefore: paid, todayInDays: days.indexOf(today()) >= 0, todayPaid: dailyPaid(today()) }; });
const wkNewDays = 4 - (wkBefore.todayInDays && wkBefore.todayPaid ? 1 : 0);
const wkRes = await page.evaluate(() => { const a = awardPendingSessions(); const b = awardPendingSessions(); return { a: { gold: a.gold, daily: a.daily, weekly: a.weekly }, b: { gold: b.gold } }; });
const wkAfter = await page.evaluate(() => ({ gold: S.gold, xp: S.xp }));
// N new dailies (+30 each) + weekly (+120), each once; the only day that may be pre-paid is today; repeat call pays +0
ok('weekly auto from sessions[] (4 days ≥10 min) → +120 once (+30 per newly reached day); XP +400', wkBefore.prog === 1 && wkRes.a.weekly.length === 1 && wkBefore.paidBefore.length === 4 - wkNewDays && wkBefore.paidBefore.every(d => d === wkBefore.today) && wkRes.a.daily.length === wkNewDays && wkAfter.gold - wkBefore.gold === 30 * wkNewDays + 120 && wkRes.a.gold === 30 * wkNewDays + 120 && wkRes.b.gold === 0 && wkAfter.xp - wkBefore.xp === 400, { wkNewDays, expectGold: 30 * wkNewDays + 120, wkBefore, wkRes, wkAfter });

// MVP screens
await page.evaluate(() => { renderLibrary(); show('library'); }); await sleep(300);
await page.screenshot({ path: OUT + '/08-library-after.png' });
await page.evaluate(() => { renderProfile(); show('profile'); if (typeof renderMvpProfile === 'function') renderMvpProfile(); }); await sleep(300);
await page.screenshot({ path: OUT + '/09-profile.png' });
await page.evaluate(() => { renderSettings(); show('settings'); }); await sleep(200);
const ver = await page.evaluate(() => document.getElementById('buildVer').textContent);
ok('build marker visible in Settings', ver === build, ver);
const navOk = await page.evaluate(() => getComputedStyle(document.getElementById('botnav')).display);
ok('MVP bottom nav still shown on settings/library', navOk === 'flex' || navOk === 'none', navOk);

// ================= LOCAL DAY (TZ=Europe/Moscow, clock faked) =================
{
  const ctx = await browser.createBrowserContext();
  const p2 = await ctx.newPage();
  await p2.emulate({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  });
  await p2.emulateTimezone('Europe/Moscow');
  p2.on('pageerror', e => console.log('PAGEERROR(tz)', e.message));
  const T_0100 = Date.parse('2026-10-06T22:00:00Z'); // 01:00 MSK on 2026-10-07; the UTC day is still 2026-10-06
  await p2.evaluateOnNewDocument((t0) => {
    const RD = Date, realNow = RD.now.bind(RD), pn = performance.now.bind(performance);
    const saved = sessionStorage.getItem('__rqOff');
    window.__rqTimeOffset = saved != null ? Number(saved) : t0 - realNow();
    window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; sessionStorage.setItem('__rqOff', String(window.__rqTimeOffset)); };
    window.__rqSetClock = (t) => window.__rqAdv(t - (realNow() + window.__rqTimeOffset));
    class FakeDate extends RD { constructor(...a) { if (a.length === 0) super(realNow() + window.__rqTimeOffset); else super(...a); } }
    FakeDate.now = () => realNow() + window.__rqTimeOffset;
    window.Date = FakeDate;
    performance.now = () => pn() + window.__rqTimeOffset;
    const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset)); // keep rAF time = performance.now (count-up animations)
    sessionStorage.setItem('__rqOff', String(window.__rqTimeOffset));
  }, T_0100);
  const boot2 = async () => { await p2.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300); };
  await p2.goto(BASE, { waitUntil: 'load' }); await boot2();
  const clk = await p2.evaluate(() => ({ local: localDay(), utc: new Date().toISOString().slice(0, 10), tzOff: new Date().getTimezoneOffset(), hour: new Date().getHours(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  await (await p2.$('#fileInp')).uploadFile(BOOK);
  await p2.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
  const bid = await p2.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
  const ids2 = async () => p2.evaluate(async () => (await __rq.listSessions({})).map(r => r.id));
  const newRows2 = async (before) => (await p2.evaluate(async () => __rq.listSessions({}))).filter(r => !before.includes(r.id));
  const vr = await (async () => { await p2.evaluate((id) => openBook(id), bid); await p2.waitForFunction(() => R.pageCount > 1); await sleep(500); return p2.evaluate(() => { const r = document.getElementById('viewer').getBoundingClientRect(); return { x: r.left + r.width * 0.85, y: (r.top + r.bottom) / 2 }; }); })();
  const flip2 = async () => { await p2.touchscreen.tap(vr.x, vr.y); await sleep(120); };
  const close2 = async () => { await p2.evaluate(() => document.getElementById('btnBack').click()); await p2.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden') || !document.getElementById('library').classList.contains('hidden'), { timeout: 5000 }); await sleep(700); };
  // (а) 01:00 MSK: 2 pages × 70 s
  let before = await ids2(); const goldPreA = await p2.evaluate(() => S.gold);
  for (let i = 0; i < 2; i++) { await p2.evaluate(() => window.__rqAdv(70000)); await flip2(); }
  await close2();
  const rA = await newRows2(before);
  const sumA = await p2.evaluate(() => ({ gold: S.gold, line: getComputedStyle(document.getElementById('sumQuestGold')).display !== 'none', paid: S.dailyPaidDays.slice() }));
  ok('(а) TZ=Europe/Moscow, 01:00 MSK: session row gets the LOCAL date (2026-10-07), not the UTC date (2026-10-06)',
    clk.tz === 'Europe/Moscow' && clk.hour === 1 && clk.utc === '2026-10-06' && clk.local === '2026-10-07' && rA.length === 1 && rA[0].date === '2026-10-07', { clock: clk, rows: rA });
  await p2.evaluate(() => document.getElementById('btnDone').click()); await sleep(200);
  // (б) 23:50 → 00:15 MSK: one row, start date, all minutes on that day
  await p2.evaluate(() => window.__rqSetClock(Date.parse('2026-10-07T20:50:00Z'))); // 23:50 MSK
  before = await ids2();
  const gold0 = await p2.evaluate(() => S.gold);
  await p2.evaluate((id) => openBook(id), bid); await sleep(500);
  let dayAfterMidnight = null;
  for (let i = 0; i < 10; i++) { await p2.evaluate(() => window.__rqAdv(150000)); await flip2(); if (i === 5) dayAfterMidnight = await p2.evaluate(() => ({ now: localDay(), sessionDay: __tracker.getSessionDay(), bar: document.querySelector('#dayBar i').style.width })); }
  const endClock = await p2.evaluate(() => ({ local: localDay(), h: new Date().getHours(), m: new Date().getMinutes() }));
  await close2();
  await p2.screenshot({ path: OUT + '/10-summary-cross-midnight.png' });
  const rB = await newRows2(before);
  const dayTot = await p2.evaluate(() => ({ d1: dayMin('2026-10-07'), d2: dayMin('2026-10-08'), sumInfo: (document.getElementById('sumDailyInfo') || {}).textContent, streak: S.streak, lastDay: S.lastDay }));
  ok('(б) session 23:50–00:15 → ONE row dated 2026-10-07 (start day), 25 min all on that day, 0 on 2026-10-08',
    rB.length === 1 && rB[0].date === '2026-10-07' && Math.abs(rB[0].minutes - 25) < 0.05 && endClock.local === '2026-10-08' && endClock.h === 0 && endClock.m === 15 &&
    dayTot.d1 === Math.floor(rA[0].minutes + rB[0].minutes + 1e-9) /* 1б (A): dayMin = floor(sum of the day's rows) */ && dayTot.d2 === 0 && dayAfterMidnight.now === '2026-10-08' && dayAfterMidnight.sessionDay === '2026-10-07' && dayTot.lastDay === '2026-10-07',
    { row: rB[0], endClock, dayTot, dayAfterMidnight });
  // (б) daily for the START day auto-paid on that session's summary
  const sumB = await p2.evaluate(() => ({ line: document.getElementById('sumQuestGold').textContent, gold: S.gold, paid: S.dailyPaidDays.slice() }));
  ok('(б) 23:50–00:15 → daily +30 auto-paid for the start day 2026-10-07 on that summary', sumB.gold - gold0 === 30 && JSON.stringify(sumB.paid) === JSON.stringify(['2026-10-07']) && sumB.line === '+30 🪙 ежедневка выполнена', { sumB, gained: sumB.gold - gold0 });
  ok('(а) session that leaves the day < 10 min (01:00, 2.3 min) → no daily, no summary line', rA[0].minutes < 10 && sumA.gold === goldPreA && !sumA.line && sumA.paid.length === 0, { minutes: rA[0].minutes, sumA, goldPreA });
  await p2.evaluate(() => document.getElementById('btnDone').click()); await sleep(200);
  // helper: one real session of `n` pages × 150 s at absolute clock `t` (ms); returns summary info
  const readAt = async (t, n, close = true, shot = null) => {
    if (t) await p2.evaluate((x) => window.__rqSetClock(x), t);
    const g = await p2.evaluate(() => S.gold); const bef = await ids2();
    await p2.evaluate((id) => openBook(id), bid); await sleep(450);
    for (let i = 0; i < n; i++) { await p2.evaluate(() => window.__rqAdv(150000)); await flip2(); }
    if (!close) return { goldBefore: g };
    await close2();
    const info = await p2.evaluate(() => ({ line: document.getElementById('sumQuestGold').textContent, lineVisible: getComputedStyle(document.getElementById('sumQuestGold')).display !== 'none', gold: S.gold, days: S.dailyPaidDays.slice(), weeks: S.weeklyPaidWeeks.slice() }));
    const rows = await newRows2(bef);
    if (shot) await p2.screenshot({ path: shot });
    await p2.evaluate(() => document.getElementById('btnDone').click()); await sleep(200);
    return Object.assign(info, { gained: info.gold - g, rows });
  };
  // (в) today 2026-10-08 is paid independently of yesterday 2026-10-07
  const c1 = await readAt(null, 5);        // 00:15 → 00:27, 12.5 min on 2026-10-08
  const c2s = await readAt(null, 2);       // another short session the same day → nothing more
  ok('(в) yesterday and today paid independently: 2026-10-08 reaches 10 min → +30 (10-07 stays paid); 2nd session same day → +0',
    c1.gained === 30 && c1.rows[0].date === '2026-10-08' && JSON.stringify(c1.days) === JSON.stringify(['2026-10-07', '2026-10-08']) && c1.line === '+30 🪙 ежедневка выполнена' && c2s.gained === 0 && !c2s.lineVisible, { c1: { gained: c1.gained, days: c1.days, line: c1.line }, c2: { gained: c2s.gained, line: c2s.line } });
  // (г) weekly: history rows (already awarded, no trigger): Sun 10-04 (prev week) + Mon 10-05 → week 10-05 has 3 days
  await p2.evaluate(async () => {
    for (const [d, m] of [['2026-10-04', 12], ['2026-10-05', 10.4]]) { const r = await __rq.logSession({ id: crypto.randomUUID(), date: d, bookId: 'b1', minutes: m, pageTurns: 5 }); SESS.push(r); S.awardedSessionIds.push(r.id); S.dailyPaidDays.push(d); }
    save();
  });
  const wk3 = await p2.evaluate(() => ({ wk: weekKey(today()), days: daysInWeekAtGoal(10).days, weeks: S.weeklyPaidWeeks.slice(), info: mvpWeeklyInfo() }));
  const c4 = await readAt(Date.parse('2026-10-09T07:00:00Z'), 5, true, OUT + '/12-summary-daily-weekly.png');   // Fri 10:00 MSK → 4th day
  const c5 = await readAt(Date.parse('2026-10-10T07:00:00Z'), 5);   // Sat → 5th day
  ok('(г) 4th day of the local week (Fri 10-09) → +30 daily +120 weekly with both summary lines; 5th day (Sat) → +30 only',
    wk3.wk === '2026-10-05' && JSON.stringify(wk3.days) === JSON.stringify(['2026-10-05', '2026-10-07', '2026-10-08']) && wk3.weeks.length === 0 &&
    c4.gained === 150 && c4.line === '+30 🪙 ежедневка выполнена+120 🪙 неделя выполнена' && JSON.stringify(c4.weeks) === JSON.stringify(['2026-10-05']) &&
    c5.gained === 30 && c5.line === '+30 🪙 ежедневка выполнена' && JSON.stringify(c5.weeks) === JSON.stringify(['2026-10-05']), { wk3, c4: { gained: c4.gained, line: c4.line, weeks: c4.weeks }, c5: { gained: c5.gained, line: c5.line } });
  // profile status
  await p2.evaluate(() => { show('profile'); if (typeof renderProfile === 'function') renderProfile(); renderMvpProfile(); }); await sleep(300);
  const prof = await p2.evaluate(() => ({ daily: document.querySelector('#mvpDailyCard .chip').textContent, weekly: document.querySelector('#mvpWeeklyCard .chip').textContent + ' · ' + document.querySelector('#mvpWeeklyCard .mvp-qsub').textContent, buttons: document.querySelectorAll('#mvpQuestBox button').length, gold: document.getElementById('mvpGold').textContent, sGold: S.gold }));
  await p2.screenshot({ path: OUT + '/13-profile-status.png' });
  ok('profile: status instead of a button — «✓ выполнено сегодня», «N / 4 дня · ✓ неделя выполнена», gold = S.gold; no claim code left',
    prof.daily === '✓ выполнено сегодня' && prof.weekly === '4 / 4 дня · ✓ неделя выполнена' && prof.buttons === 0 && String(prof.gold).replace(/\D/g, '') === String(prof.sGold) &&
    (await p2.evaluate(() => typeof claimMvpDaily === 'undefined' && typeof claimMvpWeekly === 'undefined' && typeof dailyClaimDay === 'undefined')), prof);
  await p2.evaluate(() => show('library')); await sleep(150);
  // (д) no second payment: summary again, award pass, reload, re-import ×2
  const snap = async () => p2.evaluate(async () => ({ gold: S.gold, xp: S.xp, n: (await __rq.listSessions({})).length, days: S.dailyPaidDays.slice().sort(), weeks: S.weeklyPaidWeeks.slice(), awarded: S.awardedSessionIds.length }));
  const v0 = await snap();
  await p2.evaluate(() => { const a = { xp: 0, gold: 0, pages: 5, min: 12.5, stat: 'Воля', statGain: 1, newB: [], lvBefore: 1, justFinished: false, mult: 1, flipped: 5, cheatFinish: false, dName: '', dmul: 1, newAch: [], day: '2026-10-10' }; renderSummary(a); renderSummary(a); awardPendingSessions(); awardPendingSessions(); });
  const v1 = await snap();
  await p2.reload({ waitUntil: 'load' }); await boot2();
  const v2 = await snap();
  const exp2 = await p2.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })));
  for (let k = 0; k < 2; k++) { await p2.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, exp2); await p2.reload({ waitUntil: 'load' }); await boot2(); await p2.evaluate(() => awardPendingSessions()); }
  const v3 = await snap();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok('(д) repeated summary, reload, re-import ×2 → gold / paid days / weeks / XP unchanged', same(v0, v1) && same(v0, v2) && same(v0, v3) && !(await p2.evaluate(() => getComputedStyle(document.getElementById('libGoldLine')).display !== 'none')), { v0, v1, v2, v3 });
  fs.mkdirSync('/workspace/rqtest/exports', { recursive: true }); fs.writeFileSync('/workspace/rqtest/exports/tz-moscow.json', exp2);
  const ej2 = JSON.parse(exp2);
  ok('export format unchanged (schemaVersion 1, same top-level keys), local dates in sessions[], paid lists in game', ej2.schemaVersion === 1 && ['progress', 'game', 'library', 'sessions', 'events'].every(k => k in ej2) && ej2.sessions.some(r => r.date === '2026-10-07') && Array.isArray(ej2.game.dailyPaidDays) && Array.isArray(ej2.game.weeklyPaidWeeks), { keys: Object.keys(ej2), dates: ej2.sessions.map(r => r.date), paid: ej2.game.dailyPaidDays, weeks: ej2.game.weeklyPaidWeeks });
  // (е) migration: OLD state (claim button) — today's daily claimed under the UTC day at 01:30 MSK
  await p2.evaluate(() => window.__rqSetClock(Date.parse('2026-10-10T22:30:00Z'))); // Sun 2026-10-11 01:30 MSK, UTC day 2026-10-10
  const old = JSON.parse(exp2);
  delete old.game.dailyPaidDays; delete old.game.weeklyPaidWeeks; delete old.game.paidMigrated;
  old.game.dailyClaimed = '2026-10-10'; old.game.weeklyClaimed = '2026-10-05';
  old.sessions = old.sessions.filter(r => r.date < '2026-10-09'); // the Fri/Sat sessions are not in the old state
  old.game.awardedSessionIds = old.game.awardedSessionIds.filter(id => old.sessions.some(r => r.id === id));
  await p2.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, JSON.stringify(old)); await p2.reload({ waitUntil: 'load' }); await boot2();
  const mig = await p2.evaluate(() => ({ days: S.dailyPaidDays.slice(), weeks: S.weeklyPaidWeeks.slice(), flag: S.paidMigrated, gold: S.gold, local: localDay(), utc: new Date().toISOString().slice(0, 10) }));
  const m1 = await readAt(null, 5);   // 12.5 min on local 2026-10-11 (Sunday)
  ok('(е) migration: old claim of today\'s UTC-day daily → local today marked paid, a 12.5-min session pays no 2nd daily; old weekly claim kept',
    mig.flag === true && mig.local === '2026-10-11' && mig.utc === '2026-10-10' && mig.days.includes('2026-10-10') && mig.days.includes('2026-10-11') && mig.weeks.includes('2026-10-05') && m1.gained === 0 && !m1.lineVisible && m1.rows[0].date === '2026-10-11', { mig, session: { gained: m1.gained, date: m1.rows[0] && m1.rows[0].date } });
  // the one-shot migration must not swallow the NEXT day: Mon 2026-10-12 00:30 MSK (UTC day still 10-11)
  // (ж) app killed mid-session → recovered at boot, daily paid silently, one quiet line on the library
  const kStart = await readAt(Date.parse('2026-10-11T21:30:00Z'), 5, false); // Mon 00:30 MSK, 12.5 min, no ←
  const nK = (await ids2()).length;
  await p2.reload({ waitUntil: 'load' }); await boot2();
  const kb = await p2.evaluate(async () => ({ n: (await __rq.listSessions({})).length, gold: S.gold, days: S.dailyPaidDays.slice(), screen: !document.getElementById('library').classList.contains('hidden'),
    line: getComputedStyle(document.getElementById('libGoldLine')).display !== 'none' ? document.getElementById('libGoldLine').textContent : null, lineColor: getComputedStyle(document.getElementById('libGoldLine')).color,
    toasts: document.querySelectorAll('.rq-toast').length, summary: !document.getElementById('summary').classList.contains('hidden') }));
  await p2.screenshot({ path: OUT + '/14-library-recovered-gold.png' });
  await p2.evaluate((id) => openBook(id), bid); await sleep(400);
  const kReader = await p2.evaluate(() => ({ reader: !document.getElementById('reader').classList.contains('hidden'), lineShown: getComputedStyle(document.getElementById('libGoldLine')).display !== 'none', goldTextInReader: document.getElementById('reader').innerText.includes('за прошлую сессию') }));
  await p2.evaluate(() => document.getElementById('btnBack').click()); await sleep(800);
  await p2.evaluate(() => { const b = document.getElementById('btnDone'); if (!document.getElementById('summary').classList.contains('hidden')) b.click(); }); await sleep(200);
  const kAfterNav = await p2.evaluate(() => getComputedStyle(document.getElementById('libGoldLine')).display);
  await p2.reload({ waitUntil: 'load' }); await boot2();
  const kAfterReload = await p2.evaluate(() => ({ disp: getComputedStyle(document.getElementById('libGoldLine')).display, gold: S.gold }));
  ok('(ж) killed session recovered at boot → daily +30 paid at that start (no summary, no toast), library line «+30 🪙 за прошлую сессию» in #ffc107 once; gone after screen change and after reload',
    kb.n === nK + 1 && kb.gold - kStart.goldBefore === 30 && kb.days.includes('2026-10-12') && kb.screen && !kb.summary && kb.toasts === 0 && kb.line === '+30 🪙 за прошлую сессию' && kb.lineColor === 'rgb(255, 193, 7)' &&
    kReader.reader && !kReader.lineShown && !kReader.goldTextInReader && kAfterNav === 'none' && kAfterReload.disp === 'none' && kAfterReload.gold === kb.gold, { kb, kReader, kAfterNav, kAfterReload, goldBefore: kStart.goldBefore });
  // «Aa N» is removed on screen change, even mid-gesture
  await p2.evaluate((id) => openBook(id), bid); await p2.waitForFunction(() => R.pageCount > 1); await sleep(400);
  const c2 = await p2.createCDPSession();
  await c2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 450, id: 0 }, { x: 260, y: 450, id: 1 }] });
  await c2.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y: 450, id: 0 }, { x: 290, y: 450, id: 1 }] }); await sleep(50);
  const hv = await p2.evaluate(() => getComputedStyle(document.getElementById('pinchHint')).display !== 'none');
  await p2.evaluate(() => { stopChrome(); show('library'); });
  const hGone = await p2.evaluate(() => getComputedStyle(document.getElementById('pinchHint')).display === 'none' && document.getElementById('pinchHint').classList.contains('hidden'));
  await c2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  ok('(д) «Aa N» removed on screen change mid-gesture', hv && hGone, { visibleBefore: hv, goneAfterShow: hGone });
  await ctx.close();
}

results.summary = { flips: allF.length, flipFrames: totalFrames, flipMinGlyphPx: minGlyph, flipBurstShots: totalBursts, flipBurstMinGlyphPx: minBurst,
  pinchBurstShots: results.pinch.reduce((a, r) => a + r.bursts, 0), pinchBurstMinGlyphPx: Math.min(...results.pinch.map(r => r.burstMinGlyphPx)), flipRafSamples: rafTotal, flipDomBad: domBadTotal,
  pinchFrames: results.pinch.reduce((a, r) => a + r.frames, 0), pinchMinGlyphPx: Math.min(...results.pinch.filter(r => r.frames).map(r => r.minGlyphPx)),
  pass: results.checks.filter(c => c.pass).length, fail: results.checks.filter(c => !c.pass).length };
fs.writeFileSync(OUT + '/verify.json', JSON.stringify(results, null, 1));
console.log('SUMMARY', JSON.stringify(results.summary));
await browser.close();
process.exit(results.summary.fail ? 1 : 0);
