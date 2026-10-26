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

// 7. scroll mode: nothing turns by itself, the viewer still scrolls
await p.evaluate(async () => { getSelection().removeAllRanges(); SET.flip = Object.assign({}, SET.flip, { mode: 'scroll' }); saveSet(); applySet && applySet(); if (typeof relayout === 'function') relayout(true); await new Promise(r => setTimeout(r, 600)); el('viewer').scrollTop = 600; await new Promise(r => setTimeout(r, 200)); });
const s7 = await p.evaluate(() => ({ st: el('viewer').scrollTop, scroll: rqScrollMode() }));
ok('scroll mode: the viewer keeps its own scroll', s7.scroll && s7.st > 500, s7);

ok('no page errors', errs.length === 0, errs);
await browser.close();
const f = checks.filter(x => !x).length; console.log(f ? `${f} FAILED of ${checks.length}` : `ALL ${checks.length} PASSED`); process.exit(f ? 1 : 0);
