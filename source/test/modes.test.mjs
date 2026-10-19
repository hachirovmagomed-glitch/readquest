// Reading modes 16.10 (handoff/notes/arch.md «SET.flip.mode и SET.flip.anim», «SET.pdfDim»): page-turn animations, vertical scroll for text,
// «Затемнение PDF» removed, read-aloud button icon, reading-settings sheet controls.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node modes.test.mjs   [RQ_ONLY=flipnorm,anim,…]
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(w) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w || 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return { ctx, p };
}
/* a long built-in text book, opened at the start */
const openLong = (p) => p.evaluate(async () => {
  const b = BOOKS.slice().sort((a, b) => (b.text || '').length - (a.text || '').length)[0];
  S.progress[b.id] = { ratio: 0, pos: 0 }; save();
  openBook(b.id); await new Promise(r => setTimeout(r, 1500)); return { id: b.id, pc: R.pageCount };
});

/* flipnorm: mode / anim are whitelisted strings inside SET.flip; junk → defaults; booleans untouched; old flip object without them → defaults */
if (want('flipnorm')) {
  const { ctx, p } = await fresh();
  const r = await p.evaluate(() => {
    const n = (f) => normSet({ flip: f }).flip;
    return {
      def: n(null) === null ? FLIP_DEF : n(null),
      ok: n({ mode: 'scroll', anim: 'slide' }), fade: n({ anim: 'fade' }),
      junk: n({ mode: 'вбок', anim: 7, invert: true }), old: n({ btns: true, tap: false, invert: true, swipe: false })
    };
  });
  ok('flipnorm: defaults mode=page, anim=none', r.def.mode === 'page' && r.def.anim === 'none', r.def);
  ok('flipnorm: valid values kept (scroll/slide, fade)', r.ok.mode === 'scroll' && r.ok.anim === 'slide' && r.fade.anim === 'fade' && r.fade.mode === 'page', r);
  ok('flipnorm: junk → defaults, booleans kept', r.junk.mode === 'page' && r.junk.anim === 'none' && r.junk.invert === true, r.junk);
  ok('flipnorm: old flip object without the new keys → defaults, its booleans kept', r.old.mode === 'page' && r.old.anim === 'none' && r.old.btns === true && r.old.tap === false, r.old);
  /* picked in the sheet → stored through the gate → survives a reload */
  await openLong(p);
  await p.evaluate(() => { openReaderSettings('grpNav'); document.querySelector('#flipModeSeg [data-v="scroll"]').click(); document.querySelector('#flipAnimSeg [data-v="fade"]').click(); });
  await sleep(300);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  const st = await p.evaluate(() => ({ flip: SET.flip, stored: (JSON.parse(localStorage.getItem(RQ_K.set) || '{}').flip) || null }));
  ok('flipnorm: picked «Прокрутка» + «Плавно» in the sheet → stored, kept after reload', st.flip && st.flip.mode === 'scroll' && st.flip.anim === 'fade' && st.stored && st.stored.mode === 'scroll', st);
  await ctx.close();
}

/* anim: «Сдвиг» moves the column strip on the main thread (no transition / will-change ever), «Плавно» fades the screen-sized #viewer.
   Off with «Нет», with S.ux.anim=false, with prefers-reduced-motion, for slider / jumps. Never a page turn on its own (tracker unchanged). */
if (want('anim')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const turn = (setup) => p.evaluate(async (setup) => {
    eval(setup); const a0 = (window.__rqAnim || {}).n || 0, t0 = __tracker.snapshot().turns;
    const p0 = R.page; goPage(R.page + 1, true);
    const c = document.getElementById('content'), cs = getComputedStyle(c);
    const mid = { tr: c.style.transform, trans: cs.transitionProperty + ' ' + cs.transitionDuration, will: cs.willChange, vAnims: document.getElementById('viewer').getAnimations().length };
    await new Promise(r => setTimeout(r, 450));
    return { a: ((window.__rqAnim || {}).n || 0) - a0, last: (window.__rqAnim || {}).last || null, mid, page: R.page, p0, end: c.style.transform, step: R.step, turns: __tracker.snapshot().turns - t0 };
  }, setup);
  let r = await turn("SET.flip=Object.assign({},flipGet(),{anim:'none'});");
  ok('anim: «Нет» → no animation, page turned at once (as before)', r.a === 0 && r.page === r.p0 + 1 && r.turns === 1, r);
  r = await turn("SET.flip=Object.assign({},flipGet(),{anim:'slide'});S.ux.anim=true;");
  const endX = -r.page * r.step;
  ok('anim: «Сдвиг» → one slide, strip ends exactly on the new page, page counted once', r.a === 1 && r.last === 'slide' && r.page === r.p0 + 1 && r.end === 'translateX(' + endX + 'px)' && r.turns === 1, r);
  ok('anim: «Сдвиг» never puts a transition or will-change on the strip (Android blank-page bug 06.10)', /none|0s/.test(r.mid.trans) && r.mid.will === 'auto', r.mid);
  r = await turn("SET.flip=Object.assign({},flipGet(),{anim:'fade'});");
  ok('anim: «Плавно» → fade on #viewer (screen-sized), strip already on the new page', r.a === 1 && r.last === 'fade' && r.mid.vAnims >= 1 && r.mid.tr === 'translateX(' + (-r.page * r.step) + 'px)', r);
  r = await turn("SET.flip=Object.assign({},flipGet(),{anim:'slide'});S.ux.anim=false;");
  ok('anim: «Анимации» off in general settings → no animation', r.a === 0 && r.page === r.p0 + 1, r);
  await p.evaluate(() => { S.ux.anim = true; });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  r = await turn("SET.flip=Object.assign({},flipGet(),{anim:'slide'});");
  ok('anim: prefers-reduced-motion → no animation', r.a === 0 && r.page === r.p0 + 1, r);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const j = await p.evaluate(async () => { const a0 = (window.__rqAnim || {}).n || 0; jumpTo(R.page + 5); goPage(R.page - 1, false); await new Promise(r => setTimeout(r, 400)); return ((window.__rqAnim || {}).n || 0) - a0; });
  ok('anim: jumps / slider / non-turn moves are never animated', j === 0, j);
  /* fast taps: a new turn during a slide finishes the old one, both pages counted, strip ends on the last page */
  const f = await p.evaluate(async () => { SET.flip = Object.assign({}, flipGet(), { anim: 'slide' }); jumpTo(0); await new Promise(r => setTimeout(r, 300)); const p0 = R.page, t0 = __tracker.snapshot().turns;
    goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 40)); goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 500));
    return { d: R.page - p0, tr: document.getElementById('content').style.transform, want: 'translateX(' + (-R.page * R.step) + 'px)', turns: __tracker.snapshot().turns - t0 }; });
  ok('anim: two fast turns during a slide → +2 pages, strip on the last one', f.d === 2 && f.tr === f.want && f.turns === 2, f);
  await ctx.close();
}

/* scroll: text as one vertical strip; «page» = one screen; reported when the scroll stops: next screen = turn, farther = jump */
if (want('scroll')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const r = await p.evaluate(async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    SET.flip = Object.assign({}, flipGet(), { mode: 'scroll', anim: 'none' }); rqSaveSetGated(); applySet(); relayout({ force: true }); await wait(300);
    const v = document.getElementById('viewer'), c = document.getElementById('content'), cs = getComputedStyle(c), vs = getComputedStyle(v);
    const h = v.clientHeight, max = v.scrollHeight - h;
    const geo = { ovf: vs.overflowY, ta: vs.touchAction, cols: cs.columnWidth, tr: c.style.transform, step: R.step, h, pc: R.pageCount, wantPc: 1 + Math.ceil(max / h - 0.001), page: R.page };
    goPage(0, false); await wait(300);
    const t0 = __tracker.snapshot().turns;
    v.scrollTop = h * 0.6; v.dispatchEvent(new Event('scroll')); await wait(450);
    const one = { page: R.page, turns: __tracker.snapshot().turns - t0, max: R.maxRatio };
    v.scrollTop = h * 5; v.dispatchEvent(new Event('scroll')); await wait(450);
    const far = { page: R.page, turns: __tracker.snapshot().turns - t0, pos: R.pos, stored: (__rq.loadEnvelope().progress.progress[R.book.id] || {}).pos };
    goPage(3, false); await wait(300); const prog = { top: v.scrollTop, page: R.page, want: Math.min(3 * h, max) };
    await wait(300); const progAfter = { page: R.page, turns: __tracker.snapshot().turns - t0 };
    const top0 = v.scrollTop; viewerTap(v.getBoundingClientRect().left + v.clientWidth * 0.9, v.getBoundingClientRect().top + h * 0.5); await wait(500);
    const tap = { dy: v.scrollTop - top0, h, page: R.page };
    goPage(R.pageCount - 1, false); await wait(300); const end = { top: v.scrollTop, max, page: R.page, pc: R.pageCount };
    const sl = document.getElementById('pgSlider'); const m0 = R.maxRatio; goPage(2, false); await wait(200);
    sl.value = 40; sl.dispatchEvent(new Event('input')); await wait(300); const drag = { max: R.maxRatio, m0 };
    sl.dispatchEvent(new Event('change')); await wait(300);
    return { geo, one, far, prog, progAfter, tap, end, drag };
  });
  ok('scroll: text in one column, #viewer scrolls vertically (pan-y), no transform', r.geo.ovf === 'auto' && /pan-y/.test(r.geo.ta) && r.geo.cols === 'auto' && /none|^$|translateX\(0px\)/.test(r.geo.tr), r.geo);
  ok('scroll: page = one screen (step = viewer height), page count = screens to the end', r.geo.step === r.geo.h && r.geo.pc === r.geo.wantPc && r.geo.pc > 3, r.geo);
  ok('scroll: stop on the next screen → one turn, «reached» grows', r.one.page === 1 && r.one.turns === 1 && r.one.max > 0, r.one);
  ok('scroll: stop 4 screens further → jump (no turn), pos saved', r.far.page === 5 && r.far.turns === 1 && Math.abs(r.far.stored - r.far.pos) < 1e-9, r.far);
  ok('scroll: goPage scrolls to the screen and gives no scroll event of its own', r.prog.top === r.prog.want && r.prog.page === 3 && r.progAfter.page === 3 && r.progAfter.turns === 1, { prog: r.prog, after: r.progAfter });
  ok('scroll: tap on the right edge scrolls one screen minus a line (0.8–1 screen)', r.tap.dy > r.tap.h * 0.8 && r.tap.dy < r.tap.h, r.tap);
  ok('scroll: last page = end of the text', Math.abs(r.end.top - r.end.max) <= 1 && r.end.page === r.end.pc - 1, r.end);
  ok('scroll: slider drag writes nothing to «reached»', r.drag.max === r.drag.m0, r.drag);
  /* back to pages: columns again, scroll reset, same place */
  const b = await p.evaluate(async () => { const a = captureAnchor(); SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); applySet(); relayout({ force: true, anchor: a }); await new Promise(r => setTimeout(r, 300));
    const v = document.getElementById('viewer'); return { top: v.scrollTop, cols: getComputedStyle(document.getElementById('content')).columnWidth, ovf: getComputedStyle(v).overflowY, page: R.page }; });
  ok('scroll: back to «Страницы» → columns, no vertical scroll, still mid-book', b.top === 0 && b.cols !== 'auto' && b.ovf === 'hidden' && b.page > 0, b);
  await ctx.close();
}

/* scrollpdf (18.10, Джессика «все 4 по очереди»): PDF scrolls vertically too. Fit-width page slots in #pdfScroll, canvases only near the
   screen, the page under the upper third is the current one; a settled scroll to the next page = a turn, farther = a jump; the slider jumps;
   the choice is saved and the paged view comes back with «Страницы» on the same page. */
if (want('scrollpdf')) {
  const { ctx, p } = await fresh();
  const inp = await p.$('#fileInp');
  await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'scroll' }); rqSaveSetGated(); });
  await inp.uploadFile(PDF); await sleep(2500);
  await p.evaluate(async () => {
    window.__ev = []; const t = __tracker; ['pageTurned', 'pageShown', 'jumped'].forEach(k => { const f = t[k] && t[k].bind(t); if (f) t[k] = function () { __ev.push([k, ...arguments]); return f.apply(null, arguments); }; });
    const b = allBooks().find(x => x.type === 'pdf'); S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3000));
  });
  const a = await p.evaluate(() => { const s = document.getElementById('pdfScroll'), w = document.getElementById('pdfWrap');
    return { on: !!(window.__rqPdfScroll && __rqPdfScroll.on), shown: !s.classList.contains('hidden') && s.scrollHeight > s.clientHeight * 3, wrap: w.classList.contains('hidden'),
      slots: s.querySelectorAll('.psl').length, pc: R.pageCount, canv: s.querySelectorAll('canvas').length, sw: s.querySelector('.psl').getBoundingClientRect().width, vw: s.clientWidth, page: R.page }; });
  ok('scrollpdf: PDF opens as one vertical strip, a slot per page, fit to width, page 1', a.on && a.shown && a.wrap && a.slots === a.pc && Math.abs(a.sw - a.vw) < 1 && a.page === 0, a);
  ok('scrollpdf: only pages near the screen have a canvas (≤ 6 of ' + a.pc + ')', a.canv >= 1 && a.canv <= 6, a);
  /* user scroll to page 2 → a turn; then far → a jump */
  const b = await p.evaluate(async () => {
    const s = document.getElementById('pdfScroll'), P2 = __rqPdfScroll; __ev.length = 0;
    s.scrollTop = P2.tops[1] - 8; await new Promise(r => setTimeout(r, 450));
    const t1 = { page: R.page, ev: __ev.map(e => e[0]).join(','), num: document.getElementById('rPage').textContent };
    __ev.length = 0; s.scrollTop = P2.tops[20] - 8; await new Promise(r => setTimeout(r, 450));
    const t2 = { page: R.page, ev: __ev.map(e => e[0]).join(','), canv: s.querySelectorAll('canvas').length,
      far: [...s.querySelectorAll('canvas')].map(c => +c.parentElement.dataset.n) };
    return { t1, t2 };
  });
  ok('scrollpdf: a settled scroll to the next page = turn (pageTurned + pageShown), page number follows', b.t1.page === 1 && b.t1.ev === 'pageTurned,pageShown' && /^2 \//.test(b.t1.num), b.t1);
  ok('scrollpdf: a long scroll = one jump, far canvases freed', b.t2.page === 20 && b.t2.ev === 'jumped' && b.t2.canv <= 6 && b.t2.far.every(n => Math.abs(n - 20) <= 3), b.t2);
  /* slider / contents jump; tap on the right edge scrolls down */
  const c = await p.evaluate(async () => {
    const s = document.getElementById('pdfScroll'); __ev.length = 0;
    jumpTo(5); await new Promise(r => setTimeout(r, 400));
    const j = { page: R.page, ev: __ev.map(e => e[0]).join(','), top: Math.round(s.scrollTop), slot: __rqPdfScroll.tops[5] - 8 };
    const top0 = s.scrollTop, vr = document.getElementById('viewer').getBoundingClientRect();
    __ev.length = 0; pdfSingleTap(0.9, 0.5); await new Promise(r => setTimeout(r, 900));
    return { j, tap: { moved: Math.round(s.scrollTop - top0), h: s.clientHeight, ev: __ev.map(e => e[0]).join(',') } };
  });
  ok('scrollpdf: jumpTo (contents / bookmark) scrolls to the page top and reports one jump', c.j.page === 5 && c.j.ev === 'jumped' && Math.abs(c.j.top - c.j.slot) <= 1, c.j);
  ok('scrollpdf: tap on the right edge scrolls about one screen down and counts as a turn', c.tap.moved > c.tap.h * 0.5 && c.tap.moved <= c.tap.h && c.tap.ev === 'pageTurned,pageShown', c.tap);
  /* settings: no disabled button; back to pages on the same page */
  const d = await p.evaluate(async () => {
    openReaderSettings('grpNav'); await new Promise(r => setTimeout(r, 200));
    const btn = document.querySelector('#flipModeSeg [data-v="scroll"]'), on = btn.classList.contains('on'), dis = btn.disabled;
    const pg = R.page; document.querySelector('#flipModeSeg [data-v="page"]').click(); await new Promise(r => setTimeout(r, 1500));
    document.getElementById('sheet').classList.add('hidden');
    return { on, dis, pg, page: R.page, shown: __rqPdf.shown, wrap: !document.getElementById('pdfWrap').classList.contains('hidden'), scroll: !document.getElementById('pdfScroll').classList.contains('hidden'), saved: JSON.parse(localStorage.getItem(RQ_K.set)).flip.mode };
  });
  ok('scrollpdf: «Прокрутка» is available for PDF; «Страницы» brings the paged view back on the same page, saved', d.on && !d.dis && d.wrap && !d.scroll && d.shown === d.pg && d.page === d.pg && d.saved === 'page', d);
  ok('scrollpdf: no page errors', !errs.length, errs);
  await ctx.close();
}

/* pdfdim: «Затемнение PDF» slider and the night layer are gone; SET.pdfDim stays in the data (export), normalised as before */
if (want('pdfdim')) {
  const { ctx, p } = await fresh();
  const r = await p.evaluate(() => ({ range: !!document.getElementById('pdfDimRange'), row: !!document.getElementById('pdfDimRow'), layer: !!document.getElementById('pdfDim'),
    txt: /Затемнение PDF/.test(document.getElementById('sheet').textContent), norm: normSet({ pdfDim: 0.9 }).pdfDim, def: normSet({}).pdfDim }));
  ok('pdfdim: no «Затемнение PDF» row, slider or layer', !r.range && !r.row && !r.layer && !r.txt, r);
  ok('pdfdim: SET.pdfDim still normalised in the data (0.9→0.5, default 0.35)', r.norm === 0.5 && r.def === 0.35, r);
  await ctx.close();
}

/* tts: while reading aloud the header button is a highlighted pause (not a bare square), aria-pressed; stop → speaker again */
if (want('tts')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const r = await p.evaluate(async () => {
    window.speechSynthesis.speak = function () {}; window.speechSynthesis.getVoices = () => [{ lang: 'ru-RU', name: 'stub-ru' }]; /* audit 19.10: TTS needs a Russian voice */ /* headless: no audio */
    const b = document.getElementById('btnTts'), use = () => (b.querySelector('use') || {}).getAttribute ? b.querySelector('use').getAttribute('href') : '';
    const before = { icon: use(), pressed: b.getAttribute('aria-pressed') };
    b.click(); await new Promise(r => setTimeout(r, 200));
    const on = { icon: use(), pressed: b.getAttribute('aria-pressed'), cls: b.classList.contains('on'), label: b.getAttribute('aria-label') };
    b.click(); await new Promise(r => setTimeout(r, 200));
    const off = { icon: use(), pressed: b.getAttribute('aria-pressed'), cls: b.classList.contains('on'), label: b.getAttribute('aria-label') };
    return { before, on, off };
  });
  ok('tts: listening → pause icon on a highlighted button, aria-pressed=true, label «Остановить озвучку»', r.on.icon === '#i-pause' && r.on.pressed === 'true' && r.on.cls && /Остановить/.test(r.on.label), r.on);
  ok('tts: stop → speaker icon, not pressed', r.off.icon === '#i-volume-2' && r.off.pressed === 'false' && !r.off.cls && r.before.icon === '#i-volume-2', r);
  await ctx.close();
}

/* ttslook (Джессика 16.10, видео; 17.10 «становится круглой»): the «on» state must not repaint the button: no disc at all, only the glyph changes. Old: solid --accent disc, white icon; in «Эллада»
   the disc and the icon were the same blue → an empty circle. Now: same icon colour as «off», only a faint backdrop; icon ≥ 3:1 on the header. */
if (want('ttslook')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  await p.evaluate(() => { S.gold = 900; save(); buy('skin-ellada'); window.speechSynthesis.speak = function () {}; window.speechSynthesis.getVoices = () => [{ lang: 'ru-RU', name: 'stub-ru' }]; /* audit 19.10: TTS needs a Russian voice */ });
  const keys = await p.evaluate(() => Object.keys(THEMES).concat(['ellada', 'ellada-night']));
  for (const k of keys) {
    const r = await p.evaluate(async (k) => {
      if (k.startsWith('ellada')) wear('skin-ellada'); else if (document.documentElement.dataset.skin === 'ellada') wear(null);
      SET.theme = k; SET.cBg = null; SET.cTxt = null; saveSet(); applySet(); revealChrome(); await new Promise(r => setTimeout(r, 150));
      const b = document.getElementById('btnTts'), head = document.querySelector('#reader .rhead');
      const rgba = (c) => { const m = String(c).match(/[\d.]+/g) || []; const srgb = /color\(srgb/.test(c); const v = m.map(Number); const [r, g, bl] = srgb ? v.slice(0, 3).map(x => x * 255) : v.slice(0, 3); return { r, g, b: bl, a: v.length > 3 ? v[3] : 1 }; };
      const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const icOff = getComputedStyle(b.querySelector('.ic')).color;
      jumpTo(0); b.click(); /* from the start: a pass near the end would finish the book and stop at once */ await new Promise(r => setTimeout(r, 150));
      const icOn = getComputedStyle(b.querySelector('.ic')).color, bg = rgba(getComputedStyle(b).backgroundColor), hb = rgba(getComputedStyle(head).backgroundColor);
      const mix = { r: bg.r * bg.a + hb.r * (1 - bg.a), g: bg.g * bg.a + hb.g * (1 - bg.a), b: bg.b * bg.a + hb.b * (1 - bg.a) };
      const out = { k, skin: document.documentElement.dataset.skin || '', icOff, icOn, bgA: bg.a, cr: +cr(rgba(icOn), mix).toFixed(2), on: b.classList.contains('on') };
      b.click(); await new Promise(r => setTimeout(r, 100));
      return out;
    }, k);
    ok('ttslook ' + k + ': listening keeps the icon colour, no disc behind it (Джессика 17.10), icon ≥ 3:1', r.on && r.icOn === r.icOff && r.bgA === 0 && r.cr >= 3, r);
  }
  await ctx.close();
}

/* ttscorner (Джессика 16.10, видео): while listening the bars hide after a few seconds; a tap where «Слушать» was (top-right corner)
   must bring the bars back so the button can be pressed, not drop a bookmark. Not listening → the corner still bookmarks. */
if (want('ttscorner')) {
  const { ctx, p } = await fresh();
  const bk = await openLong(p);
  const r = await p.evaluate(async (id) => {
    window.speechSynthesis.speak = function () {}; window.speechSynthesis.getVoices = () => [{ lang: 'ru-RU', name: 'stub-ru' }]; /* audit 19.10: TTS needs a Russian voice */
    const v = document.getElementById('viewer'), rd = document.getElementById('reader'), vr = v.getBoundingClientRect();
    const tr = () => viewerTap(vr.left + vr.width * 0.9, vr.top + vr.height * 0.05);
    const n = () => (S.marks[id] || []).length;
    /* headless refuses fullscreen and shows the bars again, so the «hidden bars» state is set by hand after that settles */
    const hide = async () => { await new Promise(r => setTimeout(r, 100)); rd.classList.add('barsoff'); };
    revealChrome(); document.getElementById('btnTts').click(); await hide();
    const m0 = n(); tr(); await new Promise(r => setTimeout(r, 100));
    const listen = { on: ttsOn, marks: n() - m0, bars: !rd.classList.contains('barsoff') };
    document.getElementById('btnTts').click(); await hide();
    const m1 = n(); tr(); await new Promise(r => setTimeout(r, 100));
    return { listen, idle: { marks: n() - m1 } };
  }, bk.id);
  ok('ttscorner: listening → top-right tap shows the bars, no bookmark', r.listen.marks === 0 && r.listen.bars, r);
  ok('ttscorner: not listening → top-right tap still bookmarks', r.idle.marks === 1, r);
  await ctx.close();
}

/* dimfull (Джессика 17.10, скрин): «Затемнение» must cover the whole reader screen evenly — not only the text column between the margins,
   not leave light edges, and it lies over the bars too (it is a brightness control). Text and scroll mode alike; the sheet stays above it. */
if (want('dimfull')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const shot = async (mode) => p.evaluate(async (mode) => {
    flipPick('mode', mode); SET.dim = 0.5; applySet(); revealChrome(); await new Promise(r => setTimeout(r, 400));
    if (mode === 'scroll') { const v = document.getElementById('viewer'); v.scrollTop = v.clientHeight * 1.5; await new Promise(r => setTimeout(r, 300)); }
    const d = document.getElementById('dimmer'), rd = document.getElementById('reader');
    const a = d.getBoundingClientRect(), b = rd.getBoundingClientRect(), cs = getComputedStyle(d);
    const head = document.querySelector('#reader .rhead'), hb = head.getBoundingClientRect();
    const z = (n) => parseInt(getComputedStyle(n).zIndex, 10) || 0;
    openReaderSettings('grpPage');
    await new Promise(r => setTimeout(r, 300));
    const sh = document.getElementById('sheet'), sb = sh.getBoundingClientRect();
    /* elementsFromPoint skips pointer-events:none, so order by z-index inside #reader (one stacking context: all three are its children) */
    const same = d.parentElement === rd && sh.parentElement === rd && head.parentElement.closest('#reader') === rd;
    const overSheet = !(z(sh) > z(d));
    sh.classList.add('hidden');
    return { mode, op: +cs.opacity, rect: [a.left, a.top, a.width, a.height].map(Math.round), screen: [b.left, b.top, b.width, b.height].map(Math.round),
      overHead: same && z(d) > z(head.closest('#reader > *')), overSheet, same };
  }, mode);
  for (const m of ['page', 'scroll']) {
    const r = await shot(m);
    ok('dimfull ' + m + ': dimmer = the whole reader screen (no light edges), over the bars, under the settings sheet',
      r.op === 0.5 && JSON.stringify(r.rect) === JSON.stringify(r.screen) && r.overHead && !r.overSheet, r);
  }
  await p.evaluate(() => { SET.dim = 0; applySet(); flipPick('mode', 'page'); });
  await ctx.close();
}

/* sheet: every tab of «Настройки чтения» uses three control kinds only — stepper, segmented choice, switch; nothing wider than the sheet at 360/390 */
if (want('sheet')) {
  for (const w of [360, 390]) {
    const { ctx, p } = await fresh(w);
    await openLong(p);
    const r = await p.evaluate(async () => {
      const out = {};
      for (const g of ['grpText', 'grpPage', 'grpNav', 'grpFocus']) {
        openReaderSettings(g); openSetTab(g); await new Promise(r => setTimeout(r, 350));
        const grp = document.getElementById(g), sh = document.getElementById('sheet').getBoundingClientRect();
        const over = [...grp.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > sh.right + 0.5 || b.left < sh.left - 0.5); }).map(e => e.id || e.className || e.tagName).slice(0, 5);
        const loose = [...grp.querySelectorAll('button')].filter(b => !b.closest('.rstep,.rseg,.rsw,.xrow,.xlist,#themeSeg,.rcolors') && !b.classList.contains('rsw') && !b.classList.contains('xrow')).map(b => b.id || b.textContent.trim()).slice(0, 8);
        const sws = [...grp.querySelectorAll('.rsw')].map(b => ({ id: b.id, role: b.getAttribute('role'), ch: b.getAttribute('aria-checked') }));
        const tiny = [...grp.querySelectorAll('button')].filter(b => { const x = b.getBoundingClientRect(); return x.width && x.height < 40; }).map(b => b.id || b.textContent.trim()).slice(0, 5);
        out[g] = { over, loose, sws, tiny };
      }
      return out;
    });
    const all = Object.values(r);
    ok('sheet ' + w + ': nothing wider than the sheet on any tab', all.every(x => !x.over.length), Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.over])));
    ok('sheet ' + w + ': every button is a stepper, a segmented choice, a switch or a list row', all.every(x => !x.loose.length), Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.loose])));
    ok('sheet ' + w + ': switches are role=switch with aria-checked', all.every(x => x.sws.every(s => s.role === 'switch' && (s.ch === 'true' || s.ch === 'false'))) && r.grpNav.sws.length >= 4 && r.grpText.sws.length >= 2, r.grpNav.sws);
    ok('sheet ' + w + ': tap targets ≥ 40 px', all.every(x => !x.tiny.length), Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.tiny])));
    await ctx.close();
  }
}

/* frames: every screencast frame during «Сдвиг» / «Плавно» turns (CPU ×4) has text on it — never an empty page (Android bug 06.10) */
if (want('frames')) {
  const { ctx, p } = await fresh(412);
  await openLong(p);
  await p.evaluate(() => { SET.theme = 'sepia'; SET.cBg = null; SET.cTxt = null; applySet(); jumpTo(0); });
  await p.waitForFunction(() => { const t = document.getElementById('txtBack'); return !t || t.classList.contains('hidden'); }, { timeout: 8000 }); /* hyphenation placeholder gone */
  const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = []; let on = false;
  cdp.on('Page.screencastFrame', (f) => { cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); if (on) frames.push(f.data); });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  const glyphs = (b64, soft) => { const png = PNG.sync.read(Buffer.from(b64, 'base64')); let n = 0; const d = png.data;
    for (let i = 0; i < d.length; i += 4) { const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (L < (soft ? 200 : 150) && d[i] > d[i + 2] + (soft ? 8 : 12)) n++; } return n; };
  const res = {};
  for (const k of ['slide', 'fade']) {
    await p.evaluate((k) => { SET.flip = Object.assign({}, flipGet(), { anim: k }); jumpTo(0); }, k); await sleep(500);
    on = true; frames.length = 0; const counts = [];
    for (let i = 0; i < 4; i++) { await p.evaluate(() => goPage(R.page + 1, true)); await sleep(420); }
    on = false; for (const f of frames) counts.push(glyphs(f, k === 'fade'));
    if (process.env.RQ_DUMP) { const fs = await import('fs'); const i = counts.indexOf(Math.min(...counts)); fs.writeFileSync(process.env.RQ_DUMP + '/min-' + k + '.png', Buffer.from(frames[i], 'base64')); fs.writeFileSync(process.env.RQ_DUMP + '/counts-' + k + '.json', JSON.stringify(counts)); }
    res[k] = { frames: counts.length, min: Math.min(...counts), max: Math.max(...counts), n: await p.evaluate(() => window.__rqAnim.n) };
  }
  await cdp.send('Page.stopScreencast'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  ok('frames: «Сдвиг», 4 turns at CPU ×4 — every frame has text (min ≥ 25 % of the fullest frame)', res.slide.frames >= 8 && res.slide.min >= res.slide.max * 0.25, res.slide);
  ok('frames: «Плавно», 4 turns at CPU ×4 — text visible on every frame, half-faded at most (min ≥ 25 % of the fullest frame)', res.fade.frames >= 8 && res.fade.min >= res.fade.max * 0.25, res.fade);
  await ctx.close();
}

/* bars (16.10, «как в ReadEra»): tap in the centre → the top / bottom bars slide + fade in OVER the text and slide out again
   (CSS transitions on the bars only); the text area never moves; none with reduced motion or «Анимации» off */
if (want('bars')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const run = () => p.evaluate(async () => {
    const h = document.querySelector('#reader .rhead'), b = document.querySelector('#reader .rbot'), V = () => { const r = document.getElementById('viewer').getBoundingClientRect(); return [r.top, r.bottom].map(Math.round).join(','); };
    const tr = (n) => n.getAnimations().map(x => x.transitionProperty || x.animationName).filter(Boolean);
    concealChrome('tap'); await new Promise(r => setTimeout(r, 400)); const v0 = V();
    revealChrome(); await new Promise(r => setTimeout(r, 30));
    const inA = tr(h).concat(tr(b)), shown = getComputedStyle(h).visibility === 'visible' && getComputedStyle(b).visibility === 'visible', v1 = V();
    await new Promise(r => setTimeout(r, 400)); concealChrome('tap'); await new Promise(r => setTimeout(r, 30));
    const outA = tr(h).concat(tr(b)), stillVisible = getComputedStyle(h).visibility === 'visible'; await new Promise(r => setTimeout(r, 400));
    const gone = getComputedStyle(h).visibility === 'hidden' && getComputedStyle(b).visibility === 'hidden', v2 = V();
    const txt = document.getElementById('content').getAnimations().length + document.getElementById('viewer').getAnimations().length; return { inA, outA, shown, stillVisible, gone, txt, v: [v0, v1, v2] }; });
  let r = await run();
  ok('bars: revealed at once and slid in, slid out on hide (visible during the slide-out, hidden after); text area unchanged; the text is not animated',
    r.shown && r.inA.includes('transform') && r.outA.includes('transform') && r.stillVisible && r.gone && r.txt === 0 && r.v[0] === r.v[1] && r.v[1] === r.v[2], r);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); r = await run();
  ok('bars: prefers-reduced-motion → no animation', r.shown && !r.inA.length && !r.outA.length && r.gone, r);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await p.evaluate(() => { S.ux.anim = false; }); r = await run();
  ok('bars: «Анимации» off → no animation', r.shown && !r.inA.length && !r.outA.length && r.gone, r);
  await ctx.close();
}

/* curl: «Загиб» — the strip jumps at once (no transition / will-change), a screen-sized copy of the OLD page lies over it and peels off.
   Frame 0 must look exactly like the old page (no flash); the tracker hears the same as with «Нет»; off with rqStill, 2 columns, jumps; PDF too. */
if (want('curl')) {
  const diff = (a, b) => { const A = PNG.sync.read(Buffer.from(a)), B = PNG.sync.read(Buffer.from(b)); if (A.width !== B.width || A.height !== B.height) return 1; let n = 0;
    for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) > 48 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 48 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 48) n++;
    return n / (A.width * A.height); };
  const { ctx, p } = await fresh();
  await openLong(p);
  await p.waitForFunction(() => document.getElementById('txtBack').classList.contains('hidden'), { timeout: 15000 }); /* hyphenation placeholder gone */
  await p.evaluate(async () => { S.ux.anim = true; SET.flip = Object.assign({}, flipGet(), { anim: 'curl' }); jumpTo(3); await new Promise(r => setTimeout(r, 400)); });
  const vw = await p.$('#viewer');
  const results = [];
  for (const dir of [1, -1]) {
    const before = await vw.screenshot();
    const m = await p.evaluate((dir) => { const a0 = __rqAnim.n, c0 = __rqCurl.n, t0 = __tracker.snapshot().turns, p0 = R.page;
      goPage(R.page + dir, true); if (rqCurlNow) cancelAnimationFrame(rqCurlNow.raf); /* hold frame 0 */
      const c = document.getElementById('content'), cs = getComputedStyle(c);
      return { a: __rqAnim.n - a0, c: __rqCurl.n - c0, last: __rqAnim.last, d: R.page - p0, turns: __tracker.snapshot().turns - t0, ov: document.querySelectorAll('#viewer > .rqCurl').length,
        tr: c.style.transform, want: 'translateX(' + (-R.page * R.step) + 'px)', trans: cs.transitionProperty + ' ' + cs.transitionDuration, will: cs.willChange }; }, dir);
    const f0 = await vw.screenshot();
    await p.evaluate(() => rqCurlStop());
    const after = await vw.screenshot();
    /* the same new page with «Нет» for reference */
    const ref = await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { anim: 'none' }); return true; }).then(() => vw.screenshot());
    await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { anim: 'curl' }); });
    if (process.env.RQ_SHOTS) { const fs = await import('fs'); [['before', before], ['f0', f0], ['after', after], ['ref', ref]].forEach(([k, b]) => fs.writeFileSync(process.env.RQ_SHOTS + '/curl' + dir + '-' + k + '.png', b)); }
    results.push({ dir, m, f0: +diff(before, f0).toFixed(4), changed: +diff(before, after).toFixed(4), ref: +diff(after, ref).toFixed(4) });
  }
  for (const r of results) {
    ok('curl ' + (r.dir > 0 ? 'forward' : 'back') + ': one curl over the viewer, strip already on the new page, no transition / will-change',
      r.m.c === 1 && r.m.a === 1 && r.m.last === 'curl' && r.m.ov === 1 && r.m.d === r.dir && r.m.tr === r.m.want && /none|0s/.test(r.m.trans) && r.m.will === 'auto', r.m);
    ok('curl ' + (r.dir > 0 ? 'forward' : 'back') + ': frame 0 = the old page pixel for pixel (< 0.3% differ), then the new page shows', r.f0 < 0.003 && r.changed > 0.01 && r.ref < 0.001, r);
  }
  ok('curl: a forward turn is counted once, a back turn not at all (as «Нет»)', results[0].m.turns === 1 && results[1].m.turns === 0, results.map(r => r.m.turns));
  const end = await p.evaluate(async () => { goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 600)); return document.querySelectorAll('.rqCurl').length; });
  ok('curl: the overlay is gone after the animation', end === 0, end);
  const off = await p.evaluate(async () => { const n = () => __rqCurl.n; const c0 = n();
    S.ux.anim = false; goPage(R.page + 1, true); S.ux.anim = true; const a = n() - c0;
    jumpTo(R.page + 4); goPage(R.page - 1, false); const b = n() - c0;
    await new Promise(r => setTimeout(r, 400)); return { a, b }; });
  ok('curl: «Анимации» off, jumps and non-turn moves → no curl', off.a === 0 && off.b === 0, off);
  await ctx.close();
  /* two columns: both columns are copied, frame 0 = the old spread */
  { const { ctx, p } = await fresh(1100); await openLong(p);
    await p.waitForFunction(() => document.getElementById('txtBack').classList.contains('hidden'), { timeout: 15000 });
    await p.evaluate(async () => { S.ux.anim = true; SET.flip = Object.assign({}, flipGet(), { anim: 'curl' }); jumpTo(0); await new Promise(r => setTimeout(r, 400)); });
    const vw = await p.$('#viewer'); const before = await vw.screenshot();
    const r = await p.evaluate(() => { const c0 = __rqCurl.n, p0 = R.page; goPage(R.page + 1, true); if (rqCurlNow) cancelAnimationFrame(rqCurlNow.raf);
      return { c: __rqCurl.n - c0, d: R.page - p0, cols: document.querySelectorAll('#viewer > .rqCurl .rqCurlClip').length, tr: document.getElementById('content').style.transform, want: 'translateX(' + (-R.page * R.step) + 'px)' }; });
    const f0 = await vw.screenshot(); r.f0 = +diff(before, f0).toFixed(4);
    ok('curl: two columns → both columns copied, frame 0 = the old spread, strip on the new one', r.c === 1 && r.d === 1 && r.cols === 2 && r.f0 < 0.003 && r.tr === r.want, r);
    await ctx.close(); }
  /* PDF: the old canvas is copied before it is freed, peels off #pdfWrap; frame 0 = the old page */
  { const { ctx, p } = await fresh(); const inp = await p.$('#fileInp');
    await p.evaluate(() => { S.ux.anim = true; SET.flip = Object.assign({}, flipGet(), { mode: 'page', anim: 'curl' }); rqSaveSetGated(); });
    await inp.uploadFile(PDF); await sleep(2500);
    await p.evaluate(async () => { const b = allBooks().find(x => x.type === 'pdf'); S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3000)); });
    const wrap = await p.$('#pdfWrap');
    const before = await wrap.screenshot();
    const m = await p.evaluate(async () => { const c0 = __rqCurl.n, p0 = R.page; window.__holdCurl = true;
      const orig = window.rqPeel; window.rqPeel = function () { orig.apply(null, arguments); if (rqCurlNow) cancelAnimationFrame(rqCurlNow.raf); };
      pdfFlip(1); for (let i = 0; i < 60 && R.page === p0; i++) await new Promise(r => setTimeout(r, 50));
      window.rqPeel = orig;
      return { c: __rqCurl.n - c0, d: R.page - p0, ov: document.querySelectorAll('#pdfWrap > .rqCurl').length, cv: document.querySelectorAll('#pdfWrap .rqCurlCv').length }; });
    const f0 = await wrap.screenshot();
    await p.evaluate(() => rqCurlStop()); await sleep(100);
    const after = await wrap.screenshot();
    if (process.env.RQ_SHOTS) { const fs = await import('fs'); [['before', before], ['f0', f0], ['after', after]].forEach(([k, b]) => fs.writeFileSync(process.env.RQ_SHOTS + '/curlpdf-' + k + '.png', b)); }
    const d0 = +diff(before, f0).toFixed(4), d1 = +diff(before, after).toFixed(4);
    ok('curl PDF: one curl on #pdfWrap with a copy of the old canvas, frame 0 = the old page, then the new page', m.c === 1 && m.d === 1 && m.ov === 1 && m.cv === 1 && d0 < 0.003 && d1 > 0.01, { m, d0, d1 });
    await ctx.close(); }
}

/* grid: «Обзор» = a tile per page with a real thumbnail; only tiles near the screen hold a picture; tap = jump (tracker: jumped) */
if (want('grid')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  await p.waitForFunction(() => document.getElementById('txtBack').classList.contains('hidden'), { timeout: 15000 });
  const a = await p.evaluate(async () => {
    window.__ev = []; const t = __tracker; ['pageTurned', 'pageShown', 'jumped'].forEach(k => { const f = t[k] && t[k].bind(t); if (f) t[k] = function () { __ev.push([k, ...arguments]); return f.apply(null, arguments); }; });
    SET.size = 44; applySet(); relayout(); await new Promise(r => setTimeout(r, 600)); /* big type → many pages, most tiles far from the screen */
    jumpTo(Math.min(R.pageCount - 1, 12)); await new Promise(r => setTimeout(r, 300));
    el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 900));
    const tiles = document.querySelectorAll('#panelBody .pgt'), done = document.querySelectorAll('#panelBody .pgt.done'), cur = document.querySelector('#panelBody .pgt.cur');
    const pr = document.getElementById('panel').getBoundingClientRect(), cr = cur.getBoundingClientRect();
    /* the thumbnail of page k holds the text that starts page k */
    const T = txtNodes(), k = +cur.dataset.n, off = firstOffsetOfPage(k); let s = ''; for (const x of T.a) { if (x.s + x.n.nodeValue.length > off) s += x.n.nodeValue.slice(Math.max(0, off - x.s)); if (s.length > 30) break; }
    const th = cur.querySelector('.rqCurlSheet'), thTxt = th ? th.textContent.replace(/\s+/g, ' ') : '';
    const want = s.replace(/\s+/g, ' ').trim().slice(0, 24);
    const box = cur.querySelector('.pgth').getBoundingClientRect(), sc = cur.querySelector('.pgsc');
    return { n: tiles.length, pc: R.pageCount, done: done.length, cur: k, page: R.page, curIn: cr.top >= pr.top - 1 && cr.bottom <= pr.bottom + 1,
      hasTxt: !!th && thTxt.includes(want), want, scW: sc ? sc.getBoundingClientRect().width : 0, boxW: box.width, ev: __ev.length };
  });
  ok('grid: a tile per page (no 400 cap), the current page marked and scrolled into view', a.n === a.pc && a.cur === a.page && a.curIn, a);
  ok('grid: tiles near the screen have a thumbnail, far ones none', a.pc >= 30 && a.done >= 3 && a.done <= a.pc / 2, a);
  ok('grid: the current tile shows a scaled copy of that page (its first words, fits the tile)', a.hasTxt && Math.abs(a.scW - a.boxW) < 1.5, a);
  const b = await p.evaluate(async () => { __ev.length = 0; const t = document.querySelector('#panelBody .pgt[data-n="3"]'); t.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    t.click(); await new Promise(r => setTimeout(r, 300));
    return { page: R.page, hidden: el('panel').classList.contains('hidden'), ev: __ev.map(e => e[0] + ':' + e[1]), live: __rqGrid.live.size, io: !!__rqGrid.io }; });
  ok('grid: tap a tile → that page, panel closed, one jump for the tracker, thumbnails freed', b.page === 3 && b.hidden && b.ev.join() === 'jumped:3' && b.live === 0 && !b.io, b);
  const c = await p.evaluate(async () => { el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 500)); const n1 = __rqGrid.live.size;
    el('tabToc').click(); await new Promise(r => setTimeout(r, 100)); return { n1, n2: __rqGrid.live.size, io: !!__rqGrid.io }; });
  ok('grid: another tab → all thumbnails freed', c.n1 > 0 && c.n2 === 0 && !c.io, c);
  await p.evaluate(() => el('panel').classList.add('hidden'));
  await ctx.close();
  /* PDF: small pdf.js renders, one at a time */
  { const { ctx, p } = await fresh(); const inp = await p.$('#fileInp');
    await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
    await inp.uploadFile(PDF); await sleep(2500);
    await p.evaluate(async () => { const b = allBooks().find(x => x.type === 'pdf'); S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3000)); });
    const r = await p.evaluate(async () => { el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 2500));
      const cvs = [...document.querySelectorAll('#panelBody .pgt.done canvas')];
      const t = document.querySelector('#panelBody .pgt[data-n="5"]'); t.scrollIntoView(); await new Promise(r => setTimeout(r, 1500)); const c5 = t.querySelector('canvas');
      const g = c5 && c5.getContext('2d'), px = g ? g.getImageData(0, 0, c5.width, c5.height).data : []; let ink = 0; for (let i = 0; i < px.length; i += 16) if (px[i] < 128) ink++;
      t.click(); for (let i = 0; i < 40 && R.page !== 5; i++) await new Promise(r => setTimeout(r, 50));
      return { tiles: document.querySelectorAll('#panelBody .pgt').length, pc: R.pageCount, first: cvs.length, c5: !!c5, ink, page: R.page, hidden: el('panel').classList.contains('hidden') }; });
    ok('grid PDF: tiles get pdf.js thumbnails (with ink), tap → that page', r.tiles === r.pc && r.first >= 3 && r.c5 && r.ink > 20 && r.page === 5 && r.hidden, r);
    await ctx.close(); }
}

/* light: own «Яркость» (SET.bright) separate from «Затемнение» (SET.dim), one #dimmer layer = 1 − (1 − dim)·bright;
   «Тёплый оттенок» (SET.warm) layer under the dimmer, only on a night page while «Тёплый только ночью» is on; stored, normalized */
if (want('light')) {
  const { ctx, p } = await fresh();
  await openLong(p);
  const n = await p.evaluate(() => { const f = (o) => { const s = normSet(Object.assign({}, o)); return [s.bright, s.warm, s.warmNight]; };
    return { def: f({}), junk: f({ bright: 'x', warm: NaN, warmNight: 1 }), clamp: f({ bright: 0.01, warm: 2, warmNight: false }), step: f({ bright: 0.83, warm: 0.12 }) }; });
  ok('light: defaults 100 % / 0 / night only; junk → defaults; clamped to 30–100 % and 0–60 % on a 5 % grid',
    JSON.stringify(n.def) === '[1,0,true]' && JSON.stringify(n.junk) === '[1,0,true]' && JSON.stringify(n.clamp) === '[0.3,0.6,false]' && JSON.stringify(n.step) === '[0.85,0.1,true]', n);
  const a = await p.evaluate(async () => {
    openReaderSettings('grpPage'); await new Promise(r => setTimeout(r, 200));
    const set = (id, v) => { const e = el(id); e.value = v; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')); };
    set('dimRange', 20); set('brightRange', 50);
    const op = +getComputedStyle(el('dimmer')).opacity;
    const st = JSON.parse(localStorage.getItem(RQ_K.set) || '{}');
    set('warmRange', 40);
    SET.theme = 'sepia'; SET.cBg = null; applySet(); const dayW = +getComputedStyle(el('warmer')).opacity;
    SET.theme = 'dark'; applySet(); const nightW = +getComputedStyle(el('warmer')).opacity, page = el('reader').dataset.page;
    el('warmNightTgl').click(); SET.theme = 'sepia'; applySet(); const dayAll = +getComputedStyle(el('warmer')).opacity;
    const w = getComputedStyle(el('warmer')), d = el('dimmer'), rd = el('reader');
    const z = (x) => parseInt(getComputedStyle(x).zIndex, 10) || 0;
    const st2 = JSON.parse(localStorage.getItem(RQ_K.set) || '{}');
    return { op, dim: SET.dim, st: [st.dim, st.bright], dayW, nightW, page, dayAll, blend: w.mixBlendMode, pe: w.pointerEvents, under: z(el('warmer')) < z(d) && el('warmer').parentElement === rd,
      lbl: [el('brightVal').textContent, el('warmVal').textContent], st2: [st2.warm, st2.warmNight] };
  });
  ok('light: «Яркость» 50 % + «Затемнение» 20 % → one layer 0.6, both stored separately', Math.abs(a.op - 0.6) < 0.01 && a.dim === 0.2 && a.st[0] === 0.2 && a.st[1] === 0.5 && a.lbl[0] === '50 %', a);
  ok('light: warm tint 40 % only on the night page, then on any page with «только ночью» off; multiply, no touches, under the dimmer',
    a.dayW === 0 && a.page === 'night' && Math.abs(a.nightW - 0.4) < 0.01 && Math.abs(a.dayAll - 0.4) < 0.01 && a.blend === 'multiply' && a.pe === 'none' && a.under && a.st2[0] === 0.4 && a.st2[1] === false, a);
  /* left-edge drag = brightness now; «Затемнение» untouched */
  await p.evaluate(() => { el('sheet').classList.add('hidden'); SET.bright = 1; SET.dim = 0.2; applySet(); });
  const vb = await p.evaluate(() => { const r = el('viewer').getBoundingClientRect(); return { x: r.left + 6, y: r.top + 200 }; });
  const cdp = await p.target().createCDPSession();
  const tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: vb.x, y }] });
  await tp('touchStart', vb.y); for (let i = 1; i <= 8; i++) { await tp('touchMove', vb.y + i * 20); await sleep(16); } await tp('touchEnd'); await sleep(300);
  const g = await p.evaluate(() => ({ bright: SET.bright, dim: SET.dim, op: +getComputedStyle(el('dimmer')).opacity, st: JSON.parse(localStorage.getItem(RQ_K.set) || '{}').bright }));
  ok('light: dragging down at the left edge lowers «Яркость» (stored), «Затемнение» stays', g.bright < 0.9 && g.bright >= 0.3 && g.dim === 0.2 && Math.abs(g.op - (1 - 0.8 * g.bright)) < 0.01 && g.st === g.bright, g);
  await ctx.close();
}

const pass = checks.filter(Boolean).length;
if (errs.length) ok('no page errors', false, errs.slice(0, 5));
console.log('SUMMARY modes.test ' + pass + '/' + checks.length);
await browser.close();
process.exit(pass === checks.length && !errs.length ? 0 : 1);
