// Выделение через границу страницы (Джессика 25.10, видео: «когда я хочу выделить текст следующей страницы, у меня начинаются казусы»).
// In the page modes the selection goes on to the next page without losing what is already selected:
// the focus entering the next page turns to it; the focus held at the very end of the page (a handle dragged under the last line) turns after a pause;
// backwards the same at the start of the page. The reader screen never scrolls itself (Chrome reveals a selection end even in overflow:hidden),
// and the selection never runs out of the text into the bars or the selection bar.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node selpage.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);

// the longest book, page 3, animations off (the turn is the same with them, only slower to check)
await p.evaluate(async () => {
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  window.__selBook = bk.title;
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); saveSet(); applySet && applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
  goPage(3, true); await new Promise(r => setTimeout(r, 300));
});
console.log('book', await p.evaluate(() => [window.__selBook, R.pageCount, R.mode, flipGet().mode]));

// helpers in the page: the k-th non-space character of page R.page+d (k<0 counts from the end)
await p.evaluate(() => {
  window.__pc = (d, k) => {
    const v = el('viewer').getBoundingClientRect(), x0 = v.left + d * R.step, x1 = x0 + v.width;
    const w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT), out = []; let n; const rg = document.createRange();
    while ((n = w.nextNode())) {
      const pr = n.parentElement.getBoundingClientRect(); if (pr.right < x0 - 2 || pr.left > x1 + 2) { if (out.length && pr.left > x1 + 2) break; continue; }
      for (let i = 0; i < n.nodeValue.length; i++) { if (/\s/.test(n.nodeValue[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const r = rg.getClientRects()[0]; if (r && r.left >= x0 - 1 && r.right <= x1 + 1) out.push([n, i]); }
    }
    return out[k < 0 ? out.length + k : k];
  };
  window.__sel = (a, f) => { const s = getSelection(); s.removeAllRanges(); s.setBaseAndExtent(a[0], a[1], f[0], f[1]); };
  window.__ext = (f) => getSelection().extend(f[0], f[1]);
  window.__st = () => ({ page: R.page, len: String(getSelection()).length, an: getSelection().anchorNode && getSelection().anchorNode.nodeValue.slice(0, 12) + '@' + getSelection().anchorOffset, tr: el('content').style.transform });
});
const settle = (ms = 400) => sleep(ms);

// 1. the reader never scrolls itself (a selection end revealed by Chrome)
const s1 = await p.evaluate(async () => {
  const pg = R.page, tr = el('content').style.transform;
  el('reader').scrollTop = 150; el('viewer').scrollTop = 90; el('viewer').scrollLeft = 120; document.scrollingElement.scrollTop = 40;
  await new Promise(r => setTimeout(r, 120));
  return { r: el('reader').scrollTop, vt: el('viewer').scrollTop, vl: el('viewer').scrollLeft, d: document.scrollingElement.scrollTop, same: R.page === pg && el('content').style.transform === tr };
});
ok('reader, page and document scroll back to 0 at once, page unchanged', !s1.r && !s1.vt && !s1.vl && !s1.d && s1.same, s1);

// 2. the selection stays in the text: bars, footer, selection bar are not selectable
const s2 = await p.evaluate(() => { const us = (q) => { const e = document.querySelector(q); return e ? getComputedStyle(e).webkitUserSelect || getComputedStyle(e).userSelect : '-'; };
  return { content: us('#content'), selpop: us('#selpop'), rfoot: us('#reader .rfoot'), rhead: us('#reader .rhead') }; });
ok('only the book text is selectable in the reader', s2.content !== 'none' && s2.selpop === 'none' && s2.rfoot === 'none' && s2.rhead === 'none', s2);

// 3. the focus enters the next page → that page is shown, the selection keeps its start
await p.evaluate(() => goPage(3, true)); await settle();
const a3 = await p.evaluate(() => { __sel(__pc(0, 40), __pc(0, 60)); return __st(); }); await settle(300);
await p.evaluate(() => { __ext(__pc(0, 120)); }); await settle(150);
await p.evaluate(() => { __ext(__pc(1, 30)); }); await settle(500);
const b3 = await p.evaluate(() => __st());
ok('focus on the next page → page 4, anchor kept, more text selected', b3.page === 4 && b3.an === a3.an && b3.len > a3.len + 100, { a3, b3 });

// 4. a handle held at the very end of the page (dragged under the last line) → the page turns after a pause, the selection stays
await p.evaluate(() => goPage(3, true)); await settle();
const a4 = await p.evaluate(() => { __sel(__pc(0, 40), __pc(0, 60)); return __st(); }); await settle(300);
await p.evaluate(() => { __ext(__pc(0, -20)); }); await settle(150);
await p.evaluate(() => { const c = __pc(0, -1); __ext([c[0], c[1] + 1]); }); await settle(300);
const m4 = await p.evaluate(() => __st());
await settle(1200);
const b4 = await p.evaluate(() => __st());
ok('handle at the end of the page: no turn at once, turns to page 4 after the pause, anchor kept', m4.page === 3 && b4.page === 4 && b4.an === a4.an && b4.len >= m4.len, { m4, b4 });
// still held at the end of the new page (the finger did not move): no run-away through the book
await p.evaluate(() => { const c = __pc(0, -1); __ext([c[0], c[1] + 1]); }); await settle(1500);
const c4 = await p.evaluate(() => __st());
ok('held at the end of the new page right after a turn: stays on page 4', c4.page === 4, c4);
// back into the new page's text, then down again → next page
await p.evaluate(() => { __ext(__pc(0, 200)); }); await settle(200);
const d4 = await p.evaluate(() => __st());
ok('dragged up into page 4: selection spans page 3 → page 4', d4.page === 4 && d4.an === a4.an && d4.len > a4.len + 200, { a4, d4 });

// the two-page selection saves as ONE quote, marked on both pages
const q4 = await p.evaluate(async () => { const bid = R.book.id, n0 = (S.quotes[bid] || []).length, txt = String(getSelection());
  updSelPop(); await new Promise(r => setTimeout(r, 250)); const b = document.querySelector('#spColors button'); if (b) b.click(); await new Promise(r => setTimeout(r, 400));
  const qs = S.quotes[bid] || [], q = qs[qs.length - 1], v = el('viewer').getBoundingClientRect();
  const ms = [...document.querySelectorAll('#content mark')].map(m => Math.floor((m.getBoundingClientRect().left - v.left + 24) / R.step));
  return { added: qs.length - n0, same: !!q && q.text.replace(/\s+/g, ' ').trim() === txt.replace(/\s+/g, ' ').trim(), on3: ms.includes(-1), on4: ms.includes(0) }; });
ok('the selection across the page break is saved as one quote, marked on both pages', q4.added === 1 && q4.same && q4.on3 && q4.on4, q4);

// a quote over three paragraphs whose middle one already holds an older quote: every paragraph is marked, the older quote keeps its colour, also after reopening
const ov = async () => p.evaluate(() => { const bid = R.book.id, qs = S.quotes[bid], b = qs.at(-1), a = qs.find(q => q.text === window.__ovA);
  const per = new Set(quoteMarks(b).map(m => m.closest('p'))).size, k = b.text.split(/\s*\n\s*/).filter(Boolean).length;
  const am = [...document.querySelectorAll('#content mark')].filter(m => m.textContent === window.__ovA && !m.dataset.qf);
  return { per, k, older: am.length === 1 && am[0].className === '' , bc: quoteMarks(b).every(m => m.className === 'hl-p') }; });
await p.evaluate(async () => { goPage(0, true); await new Promise(r => setTimeout(r, 200));
  const ps = [...document.querySelectorAll('#content p:not(.meta)')].filter(x => x.textContent.length > 60 && !x.querySelector('mark'));
  let i = 0; for (; i + 2 < ps.length; i++) if (ps[i].nextElementSibling === ps[i + 1] && ps[i + 1].nextElementSibling === ps[i + 2]) break;
  const m = ps[i + 1].firstChild, w = m.nodeValue.match(/[А-Яа-яё]{6,}/); const g = getSelection(); g.removeAllRanges();
  const r1 = document.createRange(); r1.setStart(m, w.index); r1.setEnd(m, w.index + w[0].length); g.addRange(r1); window.__ovA = w[0]; updSelPop(); await new Promise(r => setTimeout(r, 250));
  document.querySelector('#spColors button[data-c="y"]').click(); await new Promise(r => setTimeout(r, 400));
  const P = [...document.querySelectorAll('#content p:not(.meta)')].filter(x => x.textContent === ps[i].textContent || x.textContent === ps[i + 2].textContent);
  const a = P[0].lastChild, z = P[1].firstChild; g.removeAllRanges(); const r2 = document.createRange(); r2.setStart(a, a.length - 15); r2.setEnd(z, 12); g.addRange(r2); updSelPop(); await new Promise(r => setTimeout(r, 250));
  document.querySelector('#spColors button[data-c="p"]').click(); await new Promise(r => setTimeout(r, 400)); });
const ov1 = await ov();
ok('quote over an older quote: every paragraph marked, the older quote keeps its colour', ov1.per === 3 && ov1.k === 3 && ov1.older && ov1.bc, ov1);
await p.evaluate(async () => { const id = R.book.id; readerBack && readerBack(); await new Promise(r => setTimeout(r, 600)); __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); });
const ov2 = await ov();
ok('…and the same after reopening the book', ov2.per === 3 && ov2.older && ov2.bc, ov2);

// 5. a fresh selection of the last word of the page (a long press) is not a drag → no turn
await p.evaluate(() => goPage(3, true)); await settle();
await p.evaluate(() => { const c = __pc(0, -1); __sel(__pc(0, -5), [c[0], c[1] + 1]); }); await settle(1600);
const s5 = await p.evaluate(() => __st());
ok('long press on the last word of the page: no turn', s5.page === 3 && s5.len > 0, s5);

// 6. backwards: the start handle held at the very start of the page → previous page
await p.evaluate(() => goPage(3, true)); await settle();
const a6 = await p.evaluate(() => { __sel(__pc(0, 200), __pc(0, 180)); return __st(); }); await settle(300);
await p.evaluate(() => { __ext(__pc(0, 30)); }); await settle(150);
await p.evaluate(() => { __ext(__pc(0, 0)); }); await settle(1500);
const b6 = await p.evaluate(() => __st());
ok('start handle at the start of the page → page 2, anchor kept', b6.page === 2 && b6.an === a6.an, { a6, b6 });

// 8. 26.10 (Джессика: «плашка с настройками мешает выделять текст»): the reader's bars hide as soon as text is selected
await p.evaluate(async () => { getSelection().removeAllRanges(); goPage(3, true); await new Promise(r => setTimeout(r, 200)); revealChrome(); await new Promise(r => setTimeout(r, 300)); });
const b8 = await p.evaluate(async () => { const on = !el('reader').classList.contains('barsoff'); __sel(__pc(0, 40), __pc(0, 60)); await new Promise(r => setTimeout(r, 400)); return { before: on, after: el('reader').classList.contains('barsoff') }; });
ok('bars shown → a selection hides them', b8.before && b8.after, b8);

// 9. the selection bar never covers the end being dragged: hidden while the end moves, back after it stops; at the top when the end is under it
const b9 = await p.evaluate(async () => { const sp = el('selpop'); const w = (ms) => new Promise(r => setTimeout(r, ms));
  __sel(__pc(0, 40), __pc(0, 60)); await w(400); const shown0 = !sp.classList.contains('hidden');
  __ext(__pc(0, 120)); await w(300); const mid = sp.classList.contains('hidden'); await w(700); const back = !sp.classList.contains('hidden');
  __ext(__pc(0, -30)); await w(1000); const end = (() => { const rs = [...getSelection().getRangeAt(0).getClientRects()].filter(r => r.width); return rs[rs.length - 1]; })(), b = sp.getBoundingClientRect();
  return { shown0, mid, back, top: sp.classList.contains('top'), covers: end.bottom > b.top && end.top < b.bottom }; });
ok('bar hides while the end is dragged and comes back after it stops', b9.shown0 && b9.mid && b9.back, b9);
ok('end of the selection near the bottom → the bar goes to the top and does not cover it', b9.top && !b9.covers, b9);

// 10. the hint at the edge: shown while the end is held at the end of the page, gone after the turn
await p.evaluate(async () => { getSelection().removeAllRanges(); goPage(3, true); await new Promise(r => setTimeout(r, 200)); __sel(__pc(0, 40), __pc(0, 60)); await new Promise(r => setTimeout(r, 300)); __ext(__pc(0, -20)); await new Promise(r => setTimeout(r, 150)); const c = __pc(0, -1); __ext([c[0], c[1] + 1]); });
await sleep(300);
const h10 = await p.evaluate(() => { const h = el('selEdge'), r = h && h.getBoundingClientRect(), v = el('viewer').getBoundingClientRect(); return { cls: h && h.className, in: !!r && r.right <= v.right + 1 && r.bottom <= v.bottom + 1 && r.width > 20, page: R.page }; });
await sleep(1000);
const h10b = await p.evaluate(() => ({ cls: el('selEdge').className, page: R.page }));
ok('edge hint: shown at the bottom right while the end is held there, gone after the turn', h10.cls === 'next' && h10.in && h10.page === 3 && h10b.cls === '' && h10b.page === 4, { h10, h10b });

// 11. «Расширить»: a word → its sentence → its paragraph
const g11 = await p.evaluate(async () => { getSelection().removeAllRanges(); goPage(2, true); await new Promise(r => setTimeout(r, 200));
  const ps = [...document.querySelectorAll('#content p:not(.meta)')].filter(x => { const r = x.getBoundingClientRect(), v = el('viewer').getBoundingClientRect(); return r.left >= v.left - 1 && r.right <= v.right + 1 && !x.querySelector('mark') && /[.!?]\s+\S.*[.!?]/.test(x.textContent); });
  const pg = ps[0], t = pg.firstChild, m = /[.!?]\s+([А-ЯЁA-Z][^\s.!?]{3,})/.exec(t.nodeValue); if (!m) return null; const i = m.index + m[0].indexOf(m[1]);
  const g = getSelection(); g.removeAllRanges(); g.setBaseAndExtent(t, i, t, i + m[1].length); const w0 = String(g);
  el('spGrow').click(); const s1 = String(g); el('spGrow').click(); const s2 = String(g);
  return { w0, s1, s2, para: pg.textContent.trim(), grew: s1.length > w0.length && s1.includes(w0) && /[.!?…»"]$/.test(s1.trim()) && s1.trim()[0] === w0[0] }; });
ok('«Расширить»: word → whole sentence → whole paragraph', g11 && g11.grew && g11.s2.trim() === g11.para, g11);

// 12. «Изменить границы» of a saved quote: its words become a selection, a longer selection saved in its place (note and date kept, one quote)
const e12 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); const bid = R.book.id;
  getSelection().removeAllRanges(); goPage(2, true); await w(200);
  __sel(__pc(0, 60), __pc(0, 75)); await w(250); document.querySelector('#spColors button[data-c="b"]').click(); await w(400);
  const qs = S.quotes[bid], q0 = qs.at(-1); q0.note = 'моя заметка'; q0.date = '2026-10-01'; save(); const n0 = qs.length;
  const m = quoteMarks(q0)[0], r = m.getClientRects()[0]; quoteTapAt(r.left + 2, r.top + r.height / 2); await w(250);
  const qmode = el('selpop').classList.contains('qmode') && getComputedStyle(el('spEdit')).display !== 'none';
  el('spEdit').click(); await w(300); const sel = String(getSelection()); const unmarked = !quoteMarks(q0).length;
  __ext(__pc(0, 110)); await w(800); const longer = String(getSelection());
  document.querySelector('#spColors button[data-c="g"]').click(); await w(400);
  const q1 = S.quotes[bid].at(-1);
  return { qmode, sel: sel === q0.text, unmarked, n: S.quotes[bid].length === n0, gone: !S.quotes[bid].includes(q0), t: q1.text.length === longer.trim().length || q1.text === longer, note: q1.note, date: q1.date, c: q1.c, marks: quoteMarks(q1).length > 0 }; });
ok('«Изменить границы»: the quote becomes a selection, the new borders replace it (one quote, note and date kept)', e12 && e12.qmode && e12.sel && e12.unmarked && e12.n && e12.gone && e12.note === 'моя заметка' && e12.date === '2026-10-01' && e12.c === 'g' && e12.marks, e12);
// …and leaving the selection without saving puts the old quote back
const e12b = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); const bid = R.book.id, q = S.quotes[bid].at(-1), n0 = S.quotes[bid].length;
  const m = quoteMarks(q)[0], r = m.getClientRects()[0]; quoteTapAt(r.left + 2, r.top + r.height / 2); await w(250); el('spEdit').click(); await w(300);
  const un = !quoteMarks(q).length; getSelection().removeAllRanges(); await w(400);
  return { un, back: quoteMarks(q).length > 0, n: S.quotes[bid].length === n0 }; });
ok('«Изменить границы» then tap away: the quote is back unchanged', e12b.un && e12b.back && e12b.n, e12b);

// 7. scroll mode: nothing turns by itself, the viewer still scrolls
await p.evaluate(async () => { getSelection().removeAllRanges(); SET.flip = Object.assign({}, SET.flip, { mode: 'scroll' }); saveSet(); applySet && applySet(); if (typeof relayout === 'function') relayout(true); await new Promise(r => setTimeout(r, 600)); el('viewer').scrollTop = 600; await new Promise(r => setTimeout(r, 200)); });
const s7 = await p.evaluate(() => ({ st: el('viewer').scrollTop, scroll: rqScrollMode() }));
ok('scroll mode: the viewer keeps its own scroll', s7.scroll && s7.st > 500, s7);
// 13. scroll mode: the end held at the bottom edge → the text scrolls on by half a screen and the selection follows
const s13 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); const v = el('viewer'), vr = v.getBoundingClientRect(); v.scrollTop = 300; await w(300);
  const at = (y) => { const r = document.caretRangeFromPoint(vr.left + 120, y); return [r.startContainer, r.startOffset]; };
  const a = at(vr.top + 120); __sel(a, at(vr.top + 300)); await w(300); __ext(at(vr.top + 500)); await w(150);
  const z = at(vr.bottom - 12); __ext(z); await w(300); const st0 = v.scrollTop, len0 = String(getSelection()).length, hint = el('selEdge') && el('selEdge').className;
  await w(1100); return { st0, st1: v.scrollTop, len0, len1: String(getSelection()).length, hint }; });
ok('scroll mode: end held at the bottom → hint, then half a screen down, the selection grows', s13.hint === 'next' && s13.st1 > s13.st0 + 200 && s13.len1 > s13.len0, s13);

ok('no page errors', errs.length === 0, errs);
await browser.close();
const f = checks.filter(x => !x).length; console.log(f ? `${f} FAILED of ${checks.length}` : `ALL ${checks.length} PASSED`); process.exit(f ? 1 : 0);
