// Stage 1б (Фронт): focus mode + settings contract, jumps, atRisk 2 min, tap zones, pinch plaque, PDF backdrop, PDF night dim.
// Run: RQ_URL=http://127.0.0.1:8811/readquest/ [RQ_SHOTS=/tmp/1b-shots] node stage1b.test.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8811/readquest/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const SHOTS = process.env.RQ_SHOTS || '/tmp/1b-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(book, url, vp) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport(vp || { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(url || BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
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

/* ---------- 2. jumps are not page flips ---------- */
if (want('jump')) {
  const p = await fresh();
  await open(p);
  await p.evaluate(() => revealChrome()); await sleep(500);
  const evs = () => p.evaluate(async () => (await __rq.listReadingEvents({})).filter(e => e.type === 'page_visible'));
  await p.evaluate(() => { window.__rqTimeOffset += 20000; }); await tap(p, 0.85, 0.5); /* one real flip after 20 s */
  const n0 = (await evs()).length, s0 = await p.evaluate(() => ({ turned: R.turned, snap: __tracker.snapshot() }));
  // drag the slider 1→76 (0-based 75) with intermediate input events, then release
  await p.evaluate(async () => { const s = document.getElementById('pgSlider'); for (let v = 2; v <= 75; v += 7) { s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 20)); } s.value = 75; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(600);
  const all = await evs(), nw = all.slice(n0), s1 = await p.evaluate(() => ({ page: R.page, turned: R.turned, snap: __tracker.snapshot() }));
  ok("jump: slider 1→76 → exactly one page_visible {via:'jump'}, no mid-drag pages", nw.length === 1 && nw[0].via === 'jump' && s1.page === 75, nw);
  ok('jump: no page turn, no fast-flip count (R.turned, pageTurns, turns unchanged)', s1.turned === s0.turned && s1.snap.pageTurns === s0.snap.pageTurns && s1.snap.turns === s0.snap.turns && s1.snap.page === 75, { s0, s1 });
  ok("jump: earlier flip event tagged via:'turn'", all.some(e => e.via === 'turn'), all.map(e => e.via));
  // TOC / bookmark → jumpRatio
  await p.evaluate(() => jumpRatio(0.1)); await sleep(300);
  const nw2 = (await evs()).slice(n0 + 1), s2 = await p.evaluate(() => ({ turned: R.turned, snap: __tracker.snapshot() }));
  ok("jump: TOC/bookmark jumpRatio → one {via:'jump'}, no turn", nw2.length === 1 && nw2[0].via === 'jump' && s2.turned === s0.turned && s2.snap.turns === s0.snap.turns, nw2);
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.__ctx.close();
}
if (want('jumpunit')) {
  const { createSessionTracker } = await import(new URL('../reader-session.js', import.meta.url).href);
  let T = 1e6; const ev = [];
  const t = createSessionTracker({ now: () => T, logSession: async r => r, logReadingEvent: async e => { ev.push(e); return e; } });
  t.begin('b', 0, { capMs: 180000, minSecMs: 12000, counting: true });
  T += 30000; t.jumped(75); T += 30000; t.pageTurned(true); t.pageShown(76);
  const sn = t.snapshot();
  ok('jump(unit): jumped() credits dwell, no pageTurn; next flip counts', ev.length === 2 && ev[0].via === 'jump' && ev[0].page === 0 && ev[1].via === 'turn' && sn.pageTurns === 1 && sn.turns === 1 && Math.abs(sn.minutes - 1) < 1e-9, { ev, sn });
}

/* ---------- 3. atRisk = 2 min, same as the streak ---------- */
if (want('risk')) {
  const p = await fresh();
  const r = await p.evaluate(() => {
    const k = today(), save = SESS.slice(), s0 = S.streak; S.streak = 3; const out = {};
    for (const m of [0, 1, 1.4 + 0.5, 2, 2.6]) { SESS.length = 0; if (m) SESS.push({ date: k, minutes: m, bookId: 'x', id: 'r' + m }); out[m] = streakAtRisk(k); }
    SESS.length = 0; save.forEach(x => SESS.push(x)); S.streak = s0;
    return { out, STREAK_MIN };
  });
  ok('risk: atRisk at 0 / 1 / 1.9 min, not at 2 / 2.6 min (STREAK_MIN=2 = streak rule)', r.STREAK_MIN === 2 && r.out[0] && r.out[1] && r.out['1.9'] && !r.out[2] && !r.out['2.6'], r);
  const src = fs.readFileSync(new URL('../js/v6-extras.js', import.meta.url), 'utf8');
  ok('risk: hint text says 2 minutes', src.includes('от 2 минут') && /A streak counts for 2\+ minutes/.test(src));
  await p.__ctx.close();
}

/* ---------- 4. tap zones ---------- */
if (want('zones')) {
  const p = await fresh();
  await open(p);
  await p.evaluate(() => revealChrome()); await sleep(500);
  await p.evaluate(() => setFocus(true)); await sleep(300);
  const pg0 = await p.evaluate(() => R.page);
  await tap(p, 0.85, 0.5); await tap(p, 0.85, 0.5); await tap(p, 0.15, 0.5);
  let s = await st(p);
  ok('zones: side 30 % flips, focus kept', s.focus && s.page === pg0 + 1, s);
  await tap(p, 0.05, 0.05); s = await st(p);
  const dn = await p.evaluate(() => document.getElementById('reader').dataset.page);
  ok('zones: top-left 12 % = day/night, focus kept', s.focus && dn === 'night', { s, dn });
  await tap(p, 0.5, 0.05); s = await st(p);
  ok('zones: top-middle = centre (leaves focus)', !s.focus && !s.barsoff, s);
  await p.evaluate(() => { SET.nav.tap = false; applySet(); }); await sleep(500);
  await p.evaluate(() => setFocus(true)); await sleep(300);
  const m0 = await p.evaluate(() => (S.marks[R.book.id] || []).length), pg1 = await p.evaluate(() => R.page);
  await tap(p, 0.9, 0.05); s = await st(p);
  const m1 = await p.evaluate(() => (S.marks[R.book.id] || []).length);
  ok('zones: SET.nav.tap=false → top-right corner is centre (no bookmark, focus off)', !s.focus && m1 === m0, { s, m0, m1 });
  await p.evaluate(() => setFocus(true)); await sleep(300);
  await tap(p, 0.9, 0.5); s = await st(p);
  ok('zones: SET.nav.tap=false → side tap is centre (no flip, focus off)', !s.focus && s.page === pg1, s);
  await p.evaluate(() => { SET.nav.tap = true; SET.theme = 'sepia'; applySet(); closeReader(); }); await sleep(800);
  await p.__ctx.close();
  if (fs.existsSync(PDF)) {
    const q = await fresh(PDF);
    await q.evaluate(id => openBook(id), q.__bid); await q.waitForFunction(() => R.pageCount > 1 && P.shown === P.target && P.front, { timeout: 20000 }); await sleep(600);
    await q.evaluate(() => revealChrome()); await sleep(500);
    await q.evaluate(() => setFocus(true)); await sleep(300);
    await q.evaluate(() => { P.z = 2; pdfApply(); }); await sleep(200);
    const m0 = await q.evaluate(() => (S.marks[R.book.id] || []).length), th0 = await q.evaluate(() => SET.theme);
    await tap(q, 0.9, 0.05); await sleep(350); await tap(q, 0.05, 0.05); await sleep(350); await tap(q, 0.5, 0.5); await sleep(400);
    const r = await q.evaluate(() => ({ marks: (S.marks[R.book.id] || []).length, theme: SET.theme, focus: document.getElementById('reader').classList.contains('focus') }));
    ok('zones: zoomed PDF — top corners off, centre does not leave focus', r.marks === m0 && r.theme === th0 && r.focus, { r, m0, th0 });
    await q.evaluate(() => closeReader()); await sleep(800);
    await q.__ctx.close();
  } else ok('zones: PDF fixture missing ' + PDF, false);
}

/* ---------- 5. pinch = font size, plaque «Aa N» ---------- */
if (want('pinch')) {
  const p = await fresh();
  await open(p);
  const cdp = await p.target().createCDPSession();
  const size0 = await p.evaluate(() => SET.size);
  const pt = (d) => [{ x: 195 - d, y: 420, id: 1 }, { x: 195 + d, y: 420, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(60) });
  for (let d = 70; d <= 100; d += 10) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(d) }); await sleep(30); }
  const mid = await p.evaluate(() => { const h = document.getElementById('pinchHint'); return { vis: !h.classList.contains('hidden'), txt: h.textContent.replace(/\s+/g, ' ').trim(), color: getComputedStyle(h.querySelector('b')).color, size: SET.size }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(500);
  const end = await p.evaluate(() => ({ vis: !document.getElementById('pinchHint').classList.contains('hidden'), size: SET.size, toasts: document.querySelectorAll('.rq-toast').length }));
  const want = Math.max(14, Math.min(30, Math.round(size0 * 100 / 60)));
  ok('pinch: plaque «Aa N» follows the fingers, no reflow during the gesture', mid.vis && mid.txt === 'Aa ' + want && mid.size === size0, { mid, want });
  ok('pinch: plaque accent colour (no old #2bb3c0)', mid.color === 'rgb(95, 184, 174)', mid.color);
  ok('pinch: finger up → one reflow to N, plaque hidden, no toast', !end.vis && end.size === want && end.toasts === 0, end);
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.__ctx.close();
}

/* ---------- 6. PDF backdrop instead of a white flash ---------- */
if (want('pdfback') && fs.existsSync(PDF)) {
  const q = await fresh(PDF);
  await q.evaluate(() => { SET.theme = 'dark'; saveSet(); });
  // slow the first render: sample every frame from openBook until the page is on screen
  const frames = await q.evaluate(async (id) => {
    const out = []; let go = true;
    const tick = () => { if (!go) return; const b = document.getElementById('pdfBack'), st = document.getElementById('pdfStage'), w = document.getElementById('pdfWrap');
      out.push({ back: !b.classList.contains('hidden'), txt: b.textContent, bg: getComputedStyle(b).backgroundColor, stage: st.style.visibility, wrap: !w.classList.contains('hidden') }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick); openBook(id);
    const t0 = performance.now(); while (!(P.front && P.shown === P.target) && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 16));
    await new Promise(r => setTimeout(r, 100)); go = false; return out;
  }, q.__bid);
  const wrapFrames = frames.filter(f => f.wrap);
  const bad = wrapFrames.filter(f => !f.back && f.stage === 'hidden'); /* wrap visible, no backdrop, no page = flash */
  const bgNight = await q.evaluate(() => getComputedStyle(document.getElementById('reader')).getPropertyValue('--r-bg').trim());
  ok('pdfback: every frame while loading shows backdrop or the page (no empty/white frame)', wrapFrames.length > 0 && bad.length === 0, { n: wrapFrames.length, bad: bad.length });
  ok('pdfback: backdrop in the page colour with «N / M»', frames.some(f => f.back && /^\d+ \/ \d+$/.test(f.txt)) && frames.filter(f => f.back).every(f => f.bg !== 'rgb(255, 255, 255)'), { first: frames.find(f => f.back), bgNight });
  ok('pdfback: hidden once the page is on screen', !frames[frames.length - 1].back && frames[frames.length - 1].stage === '', frames[frames.length - 1]);
  await q.evaluate(() => { closeReader(); SET.theme = 'sepia'; saveSet(); }); await sleep(800);
  await q.__ctx.close();
}

/* ---------- 7. night PDF dim slider ---------- */
if (want('dim') && fs.existsSync(PDF)) {
  const q = await fresh(PDF);
  await q.evaluate(id => openBook(id), q.__bid); await q.waitForFunction(() => R.pageCount > 1 && P.shown === P.target && P.front, { timeout: 20000 }); await sleep(500);
  const L = () => q.evaluate(() => { const d = document.getElementById('pdfDim'), sh = document.getElementById('pdfSheet'), kids = [...sh.children].map(c => c.id || c.tagName); const cs = getComputedStyle(d);
    return { disp: cs.display, bg: cs.backgroundColor, pe: cs.pointerEvents, order: kids, val: document.getElementById('pdfDimVal').textContent, hint: getComputedStyle(document.getElementById('pdfDimHint')).display }; });
  let a = await L();
  ok('dim: day — layer off, slider hint «работает в ночной теме» visible', a.disp === 'none' && a.hint !== 'none' && a.val === '35 %', a);
  await q.evaluate(() => { SET.theme = 'dark'; applySet(); }); await sleep(150); a = await L();
  ok('dim: night default 35 %, layer between canvas and text layer, pointer-events none', a.disp === 'block' && a.bg === 'rgba(0, 0, 0, 0.35)' && a.pe === 'none' && a.order.indexOf('CANVAS') < a.order.indexOf('pdfDim') && a.order.indexOf('pdfDim') < a.order.indexOf('pdfText'), a);
  await q.evaluate(() => { const s = document.getElementById('pdfDimRange'); s.value = 50; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); }); await sleep(100); a = await L();
  const saved = await q.evaluate(() => JSON.parse(localStorage.getItem(RQ_K.set)).pdfDim);
  ok('dim: slider 50 % → layer .5, saved SET.pdfDim=0.5', a.bg === 'rgba(0, 0, 0, 0.5)' && a.val === '50 %' && saved === 0.5, { a, saved });
  const rng = await q.evaluate(() => { const s = document.getElementById('pdfDimRange'); return { min: s.min, max: s.max, step: s.step }; });
  ok('dim: range 0–50, step 5', rng.min === '0' && rng.max === '50' && rng.step === '5', rng);
  await q.evaluate(() => { revealChrome(); document.getElementById('sheet').classList.remove('hidden'); }); await sleep(400);
  const row = await q.evaluate(() => { const l = document.querySelector('#pdfDimRow label'), r = document.getElementById('pdfDimRange'), lr = l.getBoundingClientRect(); return { oneLine: l.scrollWidth <= l.clientWidth + 1 && lr.height < 24, h: lr.height, accent: getComputedStyle(r).accentColor, rh: r.getBoundingClientRect().height }; });
  ok('dim(#5): label «Затемнение PDF ночью» on one line, thumb #5fb8ae, range hit ≥44 px', row.oneLine && row.accent === 'rgb(95, 184, 174)' && row.rh >= 44, row);
  await q.screenshot({ path: SHOTS + '/aa-sheet-dim-night.png' });
  await q.evaluate(() => { SET.theme = 'sepia'; applySet(); }); await sleep(150); await q.screenshot({ path: SHOTS + '/aa-sheet-dim-day.png' });
  await q.evaluate(() => { document.getElementById('sheet').classList.add('hidden'); SET.theme = 'dark'; applySet(); }); await sleep(150);
  await q.screenshot({ path: SHOTS + '/pdf-night-dim50.png' });
  await q.evaluate(() => { SET.theme = 'sepia'; SET.pdfDim = 0.35; saveSet(); closeReader(); }); await sleep(800);
  await q.__ctx.close();
}

/* ---------- 1. counter vs daily payout: 9.8 min → «9 / 10», no +30; 10.0 → «10 / 10», +30 once ---------- */
if (want('pay')) {
  const p = await fresh();
  const read = async (chunks) => { await open(p); await p.evaluate(() => { revealChrome(); }); await sleep(500); await p.evaluate(() => setFocus(true)); await sleep(200);
    for (let i = 0; i < chunks.length; i++) { await p.evaluate((ms, more) => { window.__rqTimeOffset += ms; if (more) goPage(R.page + 1, true); updDayBar(); }, chunks[i], i < chunks.length - 1); await sleep(60); }
    const c = await p.evaluate(() => document.getElementById('focusCount').textContent);
    await p.evaluate(() => closeReader()); await sleep(1300);
    await p.evaluate(() => { const b = document.getElementById('btnDone'); if (!document.getElementById('summary').classList.contains('hidden')) b.click(); }); await sleep(200);
    return c; };
  const g = () => p.evaluate(() => ({ gold: S.gold, paid: (S.dailyPaidDays || []).filter(d => d === today()).length, day: dayMin(today()), raw: SESS.filter(r => r.date === today()).reduce((a, r) => a + r.minutes, 0) }));
  const g0 = await g();
  const c1 = await read([174000, 174000, 174000, 66000]); /* 9.8 counted min */
  const g1 = await g();
  ok('pay: 9.8 min → counter «9 / 10 мин», no +30 (balance unchanged, no daily row)', c1 === '9 / 10 мин' && g1.raw >= 9.8 && g1.raw < 9.9 && g1.day === 9 && g1.gold === g0.gold && g1.paid === 0, { c1, g0, g1 });
  const c2 = await read([12000]); /* +0.2 → 10.0 */
  const g2 = await g();
  ok('pay: 10.0 min → counter «10 / 10 мин», +30 paid once', c2 === '10 / 10 мин' && g2.raw >= 10 && g2.raw < 10.1 && g2.day === 10 && g2.gold === g0.gold + 30 && g2.paid === 1, { c2, g2 });
  await p.evaluate(() => { awardPendingSessions(); awardPendingSessions(); }); await sleep(300);
  const g3 = await g();
  ok('pay: repeated award pass → still +30 once', g3.gold === g2.gold && g3.paid === 1, g3);
  await p.__ctx.close();
}

/* ---------- 1б-fix #4: test banner «Сбросить тест» is not hittable from the reader (landscape 915×412) ---------- */
if (want('banner')) {
  const TBASE = /\/test\/$/.test(BASE) ? BASE : BASE + 'test/';
  const p = await fresh(null, TBASE, { width: 915, height: 412, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  let dialogs = 0; p.on('dialog', () => { dialogs++; });
  const lib = await p.evaluate(() => { const b = document.getElementById('rqTestReset'), r = b.getBoundingClientRect(); return { ns: RQ_NS, vis: getComputedStyle(b).visibility, pe: getComputedStyle(b).pointerEvents, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b }; });
  ok('banner: on the library the reset button is visible and clickable (test build)', lib.ns === 'rqt' && lib.vis === 'visible' && lib.hit, lib);
  await open(p); await p.evaluate(() => revealChrome()); await sleep(500); await p.evaluate(() => setFocus(true)); await sleep(300);
  const books0 = await p.evaluate(() => (S.userBooks || []).length);
  const rd = await p.evaluate(() => { const b = document.getElementById('rqTestReset'), r = b.getBoundingClientRect(); const pts = [[r.left + r.width / 2, r.top + r.height / 2], [innerWidth / 2, innerHeight * 0.05], [innerWidth / 2, 10]];
    return { vis: getComputedStyle(b).visibility, pe: getComputedStyle(b).pointerEvents, hits: pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.tagName) : null; }) }; });
  ok('banner: in the reader the reset button is hidden and not hittable (no element under the centre-top points is the banner)', rd.vis === 'hidden' && rd.pe === 'none' && !rd.hits.some(h => /rqTest/.test(h || '')), rd);
  const cov = await p.evaluate(() => { const bn = document.getElementById('rqTestBanner').getBoundingClientRect(), v = document.getElementById('viewer').getBoundingClientRect(); let first = null;
    const w = document.createTreeWalker(document.getElementById('content'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.left >= v.left - 1 && q.right <= v.right + 1 && q.height > 4 && (!first || q.top < first.top)) first = q; }
    return { bannerBottom: bn.bottom, firstTop: first && first.top }; });
  ok('banner: in the reader the banner does not cover the first text line (stripe ≤ 3 px above it)', cov.bannerBottom <= 3 + 0.5 && cov.firstTop != null && cov.bannerBottom <= cov.firstTop, cov);
  const strip = [];
  for (const th of ['sepia', 'dark']) { await p.evaluate((th) => { SET.theme = th; applySet(); }, th); await sleep(150);
    strip.push(await p.evaluate((th) => { const b = document.getElementById('rqTestBanner'); return { th, h: b.getBoundingClientRect().height, bg: getComputedStyle(b).backgroundColor, vis: getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden' }; }, th)); }
  await p.evaluate(() => { SET.theme = 'sepia'; applySet(); }); await sleep(150);
  ok('banner: on /test/ in the reader the stripe is 3 px, background rgb(194, 65, 12) (--rq-test-strip), day and night', strip.every(x => x.vis && Math.abs(x.h - 3) < 0.5 && x.bg === 'rgb(194, 65, 12)'), strip);
  await p.touchscreen.tap(915 / 2, 412 * 0.05); await sleep(500);
  const r1 = await p.evaluate(() => ({ focus: document.getElementById('reader').classList.contains('focus'), books: (S.userBooks || []).length, reader: !document.getElementById('reader').classList.contains('hidden') }));
  await p.screenshot({ path: SHOTS + '/banner-reader-915x412.png' });
  ok('banner: tap at top-centre (50 %, 5 %) in landscape → focus exit, no reset confirm, data intact', dialogs === 0 && !r1.focus && r1.reader && r1.books === books0, { dialogs, r1 });
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.__ctx.close();
}

/* ---------- 1б-fix #1: «< на стр. N» after a slider jump ---------- */
if (want('jumpback')) {
  const p = await fresh();
  await open(p); await p.evaluate(() => revealChrome()); await sleep(500);
  const evs = () => p.evaluate(async () => (await __rq.listReadingEvents({})).filter(e => e.type === 'page_visible'));
  const drag = (to) => p.evaluate(async (to) => { const s = document.getElementById('pgSlider'); for (let v = 2; v <= to; v += 9) { s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 20)); } s.value = to; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, to);
  const t0 = await p.evaluate(() => ({ turned: R.turned, snap: __tracker.snapshot() })), n0 = (await evs()).length;
  await drag(75); await sleep(400);
  const pl = await p.evaluate(() => { const b = document.getElementById('jumpBack'), r = b.getBoundingClientRect(), pg = document.getElementById('pgLine').getBoundingClientRect(), m = document.getElementById('jumpMark'), mr = m.getBoundingClientRect(), s = document.getElementById('pgSlider').getBoundingClientRect();
    return { vis: getComputedStyle(b).display !== 'none', txt: b.textContent.trim(), h: r.height, w: r.width, left: r.left, bottom: r.bottom, pgTop: pg.top, vw: innerWidth, mark: getComputedStyle(m).display !== 'none', markX: mr.left, sl: s.left, sw: s.width, emoji: /\p{Extended_Pictographic}/u.test(b.textContent), svg: !!b.querySelector('svg') }; });
  ok('jumpback: after slider 1→76 plaque «на стр. 1» left, just above the page-number line, hit area ≥44 px, Lucide chevron, no emoji', pl.vis && pl.txt === 'на стр. 1' && pl.h >= 44 && pl.left < pl.vw * 0.3 && Math.abs(pl.bottom - pl.pgTop) <= 1 && pl.svg && !pl.emoji, pl);
  const sl = await p.evaluate(() => { const s = document.getElementById('pgSlider').getBoundingClientRect(), f = document.querySelector('#reader .rfoot').getBoundingClientRect(); return { h: s.height, footH: f.height, inFoot: s.top >= f.top - 14.5 && s.bottom <= f.bottom + 14.5 }; });
  ok('jumpback(#6): jump slider hit area 44 px high, footer height not grown', sl.h >= 44 && sl.footH < 50 && sl.inFoot, sl);
  ok('jumpback: old-page marker on the slider at page 1 (left end)', pl.mark && pl.markX >= pl.sl && pl.markX < pl.sl + 16, pl);
  await p.screenshot({ path: SHOTS + '/jumpback-day.png' });
  await p.evaluate(() => { SET.theme = 'dark'; applySet(); }); await sleep(150); await p.screenshot({ path: SHOTS + '/jumpback-night.png' }); await p.evaluate(() => { SET.theme = 'sepia'; applySet(); }); await sleep(150);
  const st0 = await p.evaluate(() => ({ S: JSON.stringify(S).includes('jumpFrom'), ls: Object.keys(localStorage).some(k => (localStorage.getItem(k) || '').includes('jumpFrom')) }));
  const exp = await p.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, {})).includes('jumpFrom'));
  ok('jumpback: old page only in memory (not in S, localStorage, export)', !st0.S && !st0.ls && !exp, { st0, exp });
  await p.evaluate(() => document.getElementById('jumpBack').click()); await sleep(400);
  const nw = (await evs()).slice(n0), t1 = await p.evaluate(() => ({ page: R.page, turned: R.turned, snap: __tracker.snapshot(), vis: !document.getElementById('jumpBack').classList.contains('hidden'), mark: !document.getElementById('jumpMark').classList.contains('hidden') }));
  ok("jumpback: tap → back on page 1, plaque + marker gone; jump+return = two page_visible {via:'jump'}, fast-flip 0", t1.page === 0 && !t1.vis && !t1.mark && nw.length === 2 && nw.every(e => e.via === 'jump') && t1.turned === t0.turned && t1.snap.turns === t0.snap.turns && t1.snap.pageTurns === t0.snap.pageTurns, { t1, nw, t0 });
  await drag(40); await sleep(300); await p.evaluate(() => concealChrome('tap')); await sleep(400);
  const vis1 = await p.evaluate(() => !document.getElementById('jumpBack').classList.contains('hidden'));
  await tap(p, 0.85, 0.5);
  const vis2 = await p.evaluate(() => ({ b: !document.getElementById('jumpBack').classList.contains('hidden'), m: !document.getElementById('jumpMark').classList.contains('hidden') }));
  ok('jumpback: first normal flip hides plaque and marker', vis1 && !vis2.b && !vis2.m, { vis1, vis2 });
  await drag(60); await sleep(300);
  await p.evaluate(() => closeReader()); await sleep(1300);
  await p.evaluate(() => { const b = document.getElementById('btnDone'); if (!document.getElementById('summary').classList.contains('hidden')) b.click(); }); await sleep(200);
  await open(p);
  const vis3 = await p.evaluate(() => ({ b: !document.getElementById('jumpBack').classList.contains('hidden'), from: R.jumpFrom }));
  ok('jumpback: gone after closing and reopening the book', !vis3.b && vis3.from == null, vis3);
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.__ctx.close();
}

/* ---------- 1б-fix #3: #pgLine respects the safe area ---------- */
if (want('safe')) {
  const p = await fresh();
  const r = await p.evaluate(() => { for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const ru of rules) if (ru.selectorText === '#pgLine') return { pad: ru.style.padding || [ru.style.paddingTop, ru.style.paddingRight, ru.style.paddingBottom, ru.style.paddingLeft].join(' '), box: ru.style.boxSizing, h: ru.style.height }; } return null; });
  ok('safe: #pgLine padding uses env(safe-area-inset-bottom) and left/right max(margin, inset), 18 px content height', r && /env\(safe-area-inset-bottom/.test(r.pad) && /safe-area-inset-left/.test(r.pad) && /safe-area-inset-right/.test(r.pad) && r.box === 'content-box' && r.h === '18px', r);
  await p.__ctx.close();
}

/* ---------- 1б «144 / 144»: backdrop number = the page that renders (fresh, 0, r, 1; with and without /PageLabels) ---------- */
if (want('pdfpage')) {
  const LBL = process.env.RQ_PDF_LABELS || '/workspace/rqtest/pdf/a-labels-144.pdf';
  for (const file of [PDF, LBL].filter(x => fs.existsSync(x))) {
    const q = await fresh(file); const nm = file.split('/').pop();
    for (const r of [undefined, 0, 0.28, 1]) {
      const res = await q.evaluate(async (id, r) => {
        if (r === undefined) delete S.progress[id]; else S.progress[id] = { ratio: r };
        const seen = []; let go = true; const b = document.getElementById('pdfBack');
        const tick = () => { if (!go) return; if (!b.classList.contains('hidden') && b.textContent) seen.push(b.textContent); requestAnimationFrame(tick); };
        requestAnimationFrame(tick); openBook(id);
        const t0 = performance.now(); while (!(R.pdf && P.front && P.shown === P.target) && performance.now() - t0 < 15000) await new Promise(z => setTimeout(z, 16));
        go = false; const shown = P.shown, out = { seen: [...new Set(seen)], shown, want: pdfLabel(shown) + ' / ' + R.pageCount, pg: document.getElementById('pgNum').textContent, pc: R.pageCount };
        R.maxRatio = 0; await closeReader({ quiet: true }); delete S.progress[id]; return out;
      }, q.__bid, r);
      const exp = r === undefined ? 0 : Math.round(r * (res.pc - 1));
      ok('pdfpage ' + nm + ' ratio=' + r + ': backdrop «' + (res.seen[0] || '') + '» = rendered page ' + (exp + 1) + ' = corner number', res.seen.length === 1 && res.seen[0] === res.want && res.pg === res.want && res.shown === exp && (r === undefined || r === 0 ? /^(1|i) \//.test(res.want) : true), res);
      await sleep(300);
    }
    await q.__ctx.close();
  }
}

const pass = checks.filter(c => c.p).length;
ok('no pageerror', !errs.length, errs);
console.log('SUMMARY stage1b.test ' + checks.filter(c => c.p).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(c => c.p) ? 0 : 1);
