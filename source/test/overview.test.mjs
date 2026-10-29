// «Обзор» 29.10 (Джессика: «как сделать "Обзор" удобнее» → пункты 1, 2, 4, 7; js/page-grid.js):
// 1 chapter titles cut the grid (sticky), 2 marks on the pictures (bookmark, quote colours, note), 4 the fast thumb on the right with a tip,
// 7 «Стр. [__] Перейти» + «К текущей». Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node overview.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const PDFO = process.env.RQ_PDF_OUTLINE || new URL('./fixtures/f-outline-30.pdf', import.meta.url).pathname; /* 30 pages, «Глава N» on 1, 6, 11 … */
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await (await p.$('#fileInp')).uploadFile(PDFO); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
await p.evaluate(() => jumpTo(12)); await sleep(800);
const openGrid = () => p.evaluate(async () => { showChrome(); if (el('panel').classList.contains('hidden')) el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 1200)); });

/* 2. marks: bookmark on p.15, quotes on p.13 (yellow) and p.14 (two colours, one with a note) */
const store0 = await p.evaluate(() => { const b = R.book; S.marks[b.id] = [{ page: 15, ratio: 14 / 29, date: '2026-10-29' }];
  S.quotes[b.id] = [{ text: 'слово лампа', c: 'y', pdf: { p: 12, r: [] } }, { text: 'город улица', c: 'g', note: 'заметка', pdf: { p: 13, r: [] } }, { text: 'море ветер', c: 'b', pdf: { p: 13, r: [] } }];
  return JSON.stringify([S.marks[b.id], S.quotes[b.id]]); });
await openGrid();
const g = await p.evaluate(() => {
  const B = el('panelBody'), hs = [...B.querySelectorAll('.pgsec .pgch')], t = (n) => B.querySelector('.pgt[data-n="' + n + '"]');
  const secOf = (n) => { const h = t(n).closest('.pgsec').querySelector('.pgch'); return h ? h.querySelector('.pgcht').textContent : null; };
  return { tiles: B.querySelectorAll('.pgt').length, pc: R.pageCount, heads: hs.map(h => h.querySelector('.pgcht').textContent), pages: hs.map(h => h.querySelector('.pgchp').textContent),
    s0: secOf(0), s4: secOf(4), s5: secOf(5), s29: secOf(29), sticky: getComputedStyle(hs[0]).position, barSticky: getComputedStyle(B.querySelector('.pgbar')).position,
    cur: B.querySelector('.pgt.cur').dataset.n, curAria: B.querySelector('.pgt.cur .pgopen').getAttribute('aria-current'),
    bm: [...B.querySelectorAll('.pgt .pgbmb.on')].map(x => x.closest('.pgt').dataset.n), q12: t(12).querySelectorAll('.pgqs i').length, q13: t(13).querySelectorAll('.pgqs i').length,
    n13: !!t(13).querySelector('.pgnote'), n12: !!t(12).querySelector('.pgnote'), plain: !t(3).querySelector('.pgqs,.pgbmb.on'), lab13: t(13).querySelector('.pgopen').getAttribute('aria-label'), lab14: t(14).querySelector('.pgopen').getAttribute('aria-label') };
});
ok('grid: one tile per page', g.tiles === g.pc && g.pc === 30, g);
ok('1: six chapter titles in book order, each with its first page', g.heads.length === 6 && /^Глава 1\./.test(g.heads[0]) && /^Глава 6\./.test(g.heads[5]) && g.pages.join() === 'стр. 1,стр. 6,стр. 11,стр. 16,стр. 21,стр. 26', g);
ok('1: a page sits under its own chapter (5 → Глава 1, 6 → Глава 2, 30 → Глава 6)', /^Глава 1\./.test(g.s0) && /^Глава 1\./.test(g.s4) && /^Глава 2\./.test(g.s5) && /^Глава 6\./.test(g.s29), g);
ok('1/7: chapter title and the go-to bar stay on top while scrolling (sticky)', g.sticky === 'sticky' && g.barSticky === 'sticky', g);
ok('2: bookmark ribbon on the picture of p.15 only', g.bm.join() === '14', g.bm);
ok('2: quote colours on the picture: p.13 one, p.14 two; note sign on p.14 only; a page without marks has none', g.q12 === 1 && g.q13 === 2 && g.n13 && !g.n12 && g.plain, g);
ok('2: marks are read out (aria-label)', /закладка/.test(g.lab14) && /цитаты, заметка/.test(g.lab13), g);
ok('grid: the page being read is marked', g.cur === '12' && g.curAria === 'page', g);

/* marks survive a picture being dropped (scroll far away and back) */
const keep = await p.evaluate(async () => { const B = el('panelBody'); B.scrollTop = B.scrollHeight; await new Promise(r => setTimeout(r, 600)); B.scrollTop = 0; await new Promise(r => setTimeout(r, 600));
  const t = B.querySelector('.pgt[data-n="13"]'); return { dots: t.querySelectorAll('.pgqs i').length, live: __rqGrid.live.has(t) }; });
ok('2: marks stay on a tile whose picture was dropped', keep.dots === 2, keep);

/* 7. «К текущей» brings p.13 back into view without leaving the grid */
const kc = await p.evaluate(async () => { const B = el('panelBody'); B.scrollTop = B.scrollHeight; await new Promise(r => setTimeout(r, 300));
  const r0 = B.querySelector('.pgt.cur').getBoundingClientRect(), br = B.getBoundingClientRect(), out = r0.bottom < br.top || r0.top > br.bottom;
  B.querySelector('[data-cur]').click(); await new Promise(r => setTimeout(r, 900));
  const r1 = B.querySelector('.pgt.cur').getBoundingClientRect(); return { out, inView: r1.top >= br.top && r1.bottom <= br.bottom + 2, open: !el('panel').classList.contains('hidden'), page: R.page }; });
ok('7: «К текущей» scrolls the grid to the page being read, the panel stays, the book does not move', kc.inView && kc.open && kc.page === 12, kc);

/* 7. «Перейти»: junk and out of range → a hint, nothing moves; 25 → book on p.25, panel closed, return plaque */
const bad = await p.evaluate(async () => { const r = []; for (const v of ['', '0', '31', 'абв']) { const i = el('pgGoN'); i.value = v; el('panelBody').querySelector('[data-go]').click(); await new Promise(r => setTimeout(r, 150));
  r.push({ v, page: R.page, open: !el('panel').classList.contains('hidden'), msg: (document.querySelector('#flash,.flash,#toast') || {}).textContent || '' }); } return r; });
ok('7: empty / 0 / 31 / letters → nothing moves, the panel stays', bad.every(x => x.page === 12 && x.open), bad);
await p.focus('#pgGoN'); await p.keyboard.type('25'); await p.keyboard.press('Enter'); await sleep(1200);
const go = await p.evaluate(() => ({ page: R.page, shown: P.shown, hidden: el('panel').classList.contains('hidden'), back: !el('jumpBack').classList.contains('hidden'), backN: el('jumpBackN').textContent }));
ok('7: «25» + Enter → the book on p.25, panel closed, «на стр. 13» plaque to come back', go.page === 24 && go.hidden && go.back && /13/.test(go.backN), go);
ok('7: nothing stored by the jump bar (marks and quotes as before)', await p.evaluate((s0) => { const b = R.book; return JSON.stringify([S.marks[b.id], S.quotes[b.id]]) === s0; }, store0));

/* 4. the fast thumb: drag it down → the grid scrolls, the tip says the page and its chapter; gone with the panel */
await openGrid();
const th0 = await p.evaluate(() => { const s = document.querySelector('#panel .pgscr'), t = s && s.querySelector('.pgscr-th'), r = t && t.getBoundingClientRect(), B = el('panelBody');
  return s ? { hidden: s.hidden, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, st: B.scrollTop, inPanel: r.right <= innerWidth } : null; });
ok('4: a thumb on the right edge, at least 30×44', th0 && !th0.hidden && th0.w >= 30 && th0.h >= 44 && th0.inPanel, th0);
await p.touchscreen.touchStart(th0.x, th0.y); for (let k = 1; k <= 8; k++) { await p.touchscreen.touchMove(th0.x, th0.y + k * 25); await sleep(40); }
const mid = await p.evaluate(() => { const s = document.querySelector('#panel .pgscr'), tip = s.querySelector('.pgscr-tip'); return { on: s.classList.contains('on'), tip: tip.textContent, vis: getComputedStyle(tip).display !== 'none', st: el('panelBody').scrollTop, page: R.page }; });
await p.touchscreen.touchEnd(); await sleep(200);
const m = /стр\. (\d+)/.exec(mid.tip), tp = m ? +m[1] : 0, chOf = (n) => 'Глава ' + (Math.floor((n - 1) / 5) + 1) + '.';
ok('4: dragging the thumb scrolls the grid down', mid.st > th0.st + 100, { mid, th0 });
ok('4: the tip shows «стр. N» and the chapter of that page', mid.on && mid.vis && tp > 0 && mid.tip.indexOf(chOf(tp)) > 0, mid);
ok('4: dragging does not turn the book page', mid.page === 24, mid);
const after = await p.evaluate(() => ({ off: !document.querySelector('#panel .pgscr.on') }));
ok('4: the tip hides on release', after.off, after);
const gone = await p.evaluate(async () => { el('tabToc').click(); await new Promise(r => setTimeout(r, 100)); const a = !document.querySelector('#panel .pgscr');
  el('tabGrid').click(); await new Promise(r => setTimeout(r, 300)); el('panelClose').click(); const b = !!document.querySelector('#panel .pgscr'); return { a, b }; });
ok('4: the thumb goes away with another tab', gone.a, gone);

/* a book without contents: no titles, the grid as before; a short one: no thumb */
const plain = await p.evaluate(async () => { R.pdfToc = []; tocOf._ = 0; renderPanel('grid'); await new Promise(r => setTimeout(r, 300)); const B = el('panelBody');
  return { heads: B.querySelectorAll('.pgch').length, tiles: B.querySelectorAll('.pgt').length, secs: B.querySelectorAll('.pgsec').length }; });
ok('1: no contents → no titles, all pages in one grid', plain.heads === 0 && plain.tiles === 30 && plain.secs === 1, plain);

/* 360 wide: the bar fits in one row, nothing sticks out */
await openGrid();
const fit = await p.evaluate(() => { const bar = el('panelBody').querySelector('.pgbar form'), r = bar.getBoundingClientRect(), kids = [...bar.children].filter(x => x.offsetWidth);
  return { h: Math.round(r.height), out: kids.filter(k => { const q = k.getBoundingClientRect(); return q.right > innerWidth - 8 || q.left < 8; }).length, rows: new Set(kids.map(k => { const q = k.getBoundingClientRect(); return Math.round((q.top + q.bottom) / 2 / 4); })).size }; });
ok('360: «Стр. [__] Перейти · К текущей» in one row inside the screen', fit.rows === 1 && fit.out === 0, fit);

/* ===== 29.10 вечер: the other eight («давай все») ===== */
await p.evaluate(() => { jumpTo(12); }); await sleep(800);
await p.evaluate(() => { __navAllow = true; const id = R.book.id; openBook(id); __navAllow = false; }); await sleep(2500); await p.evaluate(() => jumpTo(12)); await sleep(900);
await p.evaluate(() => { const b = R.book; BF.q = 'маяк'; BF.book = b.id; BF.hits = [{ pg: 12 }, { pg: 15 }, { pg: 15 }]; R.maxRatio = 12 / 29; }); /* search hits as the magnifier leaves them */
await openGrid();
const e1 = await p.evaluate(() => { const B = el('panelBody'), t = (n) => B.querySelector('.pgt[data-n="' + n + '"]'), pr = B.querySelector('.pgprog');
  return { rd: [...B.querySelectorAll('.pgt.rd')].map(x => +x.dataset.n), cur: t(12).classList.contains('rd'), now: pr && +pr.getAttribute('aria-valuenow'), w: pr && pr.querySelector('i').style.width,
    hits: [...B.querySelectorAll('.pgt .pghit')].map(x => x.closest('.pgt').dataset.n + ':' + x.textContent), chips: [...B.querySelectorAll('[data-flt]')].map(x => x.dataset.flt).join() }; });
ok('1: pages before the farthest read are dimmed (0…11), the current one is not; progress line 41%', e1.rd.length === 12 && e1.rd[0] === 0 && e1.rd[11] === 11 && !e1.cur && e1.now === 41 && e1.w === '41%', e1);
ok('5: search hits marked with their count on p.13 and p.16; filter chip «Найдено» appears', e1.hits.join() === '12:1,15:2' && e1.chips === 'all,bm,q,ch,find', e1);
const flt = await p.evaluate(async () => { const B = el('panelBody'), vis = () => [...B.querySelectorAll('.pgt')].filter(x => !x.hidden).map(x => +x.dataset.n), r = {};
  for (const f of ['bm', 'q', 'ch', 'find', 'all']) { B.querySelector('[data-flt="' + f + '"]').click(); await new Promise(r => setTimeout(r, 80)); r[f] = vis(); r[f + 'Secs'] = [...B.querySelectorAll('.pgsec')].filter(s => !s.hidden).length; }
  return r; });
ok('3: «Закладки» → p.15 only, «Цитаты» → p.13, 14; «Главы» → 1, 6, 11 …; «Найдено» → 13, 16; «Все» → 30', flt.bm.join() === '14' && flt.bmSecs === 1 && flt.q.join() === '12,13' && flt.ch.join() === '0,5,10,15,20,25' && flt.find.join() === '12,15' && flt.all.length === 30, flt);
/* 8: the corner ribbon */
const bm = await p.evaluate(async () => { const B = el('panelBody'), b = R.book, n0 = (S.marks[b.id] || []).length;
  B.querySelector('.pgt[data-n="3"] .pgbmb').click(); await new Promise(r => setTimeout(r, 200)); const a = (S.marks[b.id] || []).map(m => m.page), on = el('panelBody').querySelector('.pgt[data-n="3"] .pgbmb').classList.contains('on');
  el('panelBody').querySelector('.pgt[data-n="3"] .pgbmb').click(); await new Promise(r => setTimeout(r, 200)); const z = (S.marks[b.id] || []).map(m => m.page);
  return { n0, a, on, z, page: R.page, open: !el('panel').classList.contains('hidden'), m: (S.marks[b.id] || [])[0] }; });
ok('8: the ribbon adds a bookmark on p.4 (stored like the others) and takes it off again; the book stays, the panel stays', bm.a.indexOf(4) >= 0 && bm.on && bm.z.indexOf(4) < 0 && bm.z.indexOf(15) >= 0 && bm.page === 12 && bm.open, bm);
/* 7: fold a chapter */
const fd = await p.evaluate(async () => { const B = el('panelBody'); B.querySelector('.pgch[data-p="5"] .pgchb').click(); await new Promise(r => setTimeout(r, 200));
  const s = el('panelBody').querySelector('.pgch[data-p="5"]').closest('.pgsec'), g = s.querySelector('.pgrid2'), h = s.querySelector('.pgchb');
  const a = { fold: s.classList.contains('fold'), gone: getComputedStyle(g).display === 'none', exp: h.getAttribute('aria-expanded'), lab: h.textContent };
  h.click(); await new Promise(r => setTimeout(r, 200)); const s2 = el('panelBody').querySelector('.pgch[data-p="5"]').closest('.pgsec'); a.back = !s2.classList.contains('fold'); a.page = R.page; return a; });
ok('7: a tap on «Глава 2» folds its pages (aria-expanded=false, «5 стр.»), a second tap opens them; the book does not move', fd.fold && fd.gone && fd.exp === 'false' && /5 стр\./.test(fd.lab) && fd.back && fd.page === 12, fd);
const fc = await p.evaluate(async () => { const B = el('panelBody'); B.querySelector('.pgch[data-p="10"] .pgchb').click(); await new Promise(r => setTimeout(r, 200));
  el('panelBody').querySelector('[data-cur]').click(); await new Promise(r => setTimeout(r, 900)); const c = el('panelBody').querySelector('.pgt.cur'), br = el('panelBody').getBoundingClientRect(), r = c.getBoundingClientRect();
  return { open: !c.closest('.pgsec').classList.contains('fold'), inView: r.top >= br.top && r.bottom <= br.bottom + 2 }; });
ok('7: «К текущей» opens a folded chapter with the current page', fc.open && fc.inView, fc);
/* 2: size */
const sz = await p.evaluate(async () => { const B = el('panelBody'), cols = () => getComputedStyle(B.querySelector('.pgrid2')).gridTemplateColumns.split(' ').length, r = [cols()];
  for (let k = 0; k < 3; k++) { el('panelBody').querySelector('[data-cols]').click(); await new Promise(r => setTimeout(r, 150)); r.push(cols(), SET.gridCols); } return r; });
ok('2: the size button goes 3 → 5 → 2 → 3 in a row, kept in SET.gridCols', sz.join() === '3,5,5,2,2,3,3', sz);
await p.evaluate(() => { SET.gridCols = 2; saveSet(); }); await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const sz2 = await p.evaluate(() => ({ c: SET.gridCols, junk: (SET.gridCols = 4, rqGridCols()), back: (SET.gridCols = 2, rqGridCols()) }));
ok('2: size survives a reload; a value other than 2/3/5 reads as 3', sz2.c === 2 && sz2.junk === 3 && sz2.back === 2, sz2);
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500); await p.evaluate(() => jumpTo(12)); await sleep(800);
await openGrid();
/* 2: pinch */
const pt = await p.evaluate(() => { const t = el('panelBody').querySelector('.pgt[data-n="13"]').getBoundingClientRect(); return { x: t.left + t.width / 2, y: t.top + 20 }; });
const cdp = await p.createCDPSession();
const pinch = async (d0, d1) => { const pts = (d) => [{ x: pt.x - d / 2, y: pt.y, id: 1 }, { x: pt.x + d / 2, y: pt.y, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) }); for (let k = 1; k <= 5; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + (d1 - d0) * k / 5) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300); return p.evaluate(() => SET.gridCols); };
const pc1 = await pinch(60, 20), pc2 = await pinch(40, 120);
ok('2: pinch together → smaller (2 → 3), apart → bigger (3 → 2)', pc1 === 3 && pc2 === 2, { pc1, pc2 });
await p.evaluate(() => { SET.gridCols = 3; saveSet(); renderPanel('grid'); }); await sleep(600);
/* 4: long press */
const lt = await p.evaluate(() => { const t = el('panelBody').querySelector('.pgt[data-n="14"]'); t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await sleep(300);
await p.touchscreen.touchStart(lt.x, lt.y); await sleep(700); await p.touchscreen.touchEnd(); await sleep(1500);
const pv = await p.evaluate(() => { const v = document.querySelector('#panel .pgpv'); return v ? { n: v.querySelector('.pgt').dataset.n, pic: !!v.querySelector('.pgth canvas'), w: v.querySelector('.pgth').clientWidth, head: v.querySelector('.pgpvh').textContent, bm: v.querySelector('[data-bm]').getAttribute('aria-pressed'), page: R.page, panel: !el('panel').classList.contains('hidden') } : null; });
ok('4: a long press opens p.15 large (picture, chapter, «Снять закладку» pressed); the book does not move', pv && pv.n === '14' && pv.pic && pv.w > 150 && /Стр\. 15/.test(pv.head) && /Глава 3/.test(pv.head) && pv.bm === 'true' && pv.page === 12 && pv.panel, pv);
const pv2 = await p.evaluate(async () => { const v = document.querySelector('#panel .pgpv'); v.querySelector('[data-bm]').click(); await new Promise(r => setTimeout(r, 300)); const v2 = document.querySelector('#panel .pgpv');
  const a = { still: !!v2, bm: v2 && v2.querySelector('[data-bm]').getAttribute('aria-pressed'), marks: (S.marks[R.book.id] || []).map(m => m.page) };
  v2.querySelector('[data-bm]').click(); await new Promise(r => setTimeout(r, 300)); document.querySelector('#panel .pgpv [data-x]').click(); a.closed = !document.querySelector('#panel .pgpv'); a.page = R.page; return a; });
ok('4: «Снять закладку» in the large view works and it stays open; ✕ closes it, the book stays', pv2.still && pv2.bm === 'false' && pv2.marks.indexOf(15) < 0 && pv2.closed && pv2.page === 12, pv2);
await p.touchscreen.touchStart(lt.x, lt.y); await sleep(700); await p.touchscreen.touchEnd(); await sleep(800);
await p.evaluate(() => document.querySelector('#panel .pgpv [data-open]').click()); await sleep(1200);
const pv3 = await p.evaluate(() => ({ page: R.page, hidden: el('panel').classList.contains('hidden'), pv: !!document.querySelector('#panel .pgpv') }));
ok('4: «Открыть» goes to that page and closes the panel', pv3.page === 14 && pv3.hidden && !pv3.pv, pv3);
/* 6: the current page in the skin's frame */
const fr = await p.evaluate(async () => { S.gold = (S.gold || 0) + 5000; buy('skin-celestial'); wear('skin-celestial'); await new Promise(r => setTimeout(r, 300)); showChrome(); el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 600));
  const c = el('panelBody').querySelector('.pgt.cur'), st = getComputedStyle(c.querySelector('.pgfr'), '::after'); return { star: st.content !== 'none' && /polygon/.test(st.clipPath), skin: document.documentElement.dataset.skin }; });
ok('6: in «Небесный» the current page has the gold star', fr.star && fr.skin === 'celestial', fr);

ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`overview: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
