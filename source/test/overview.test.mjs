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
    s0: secOf(0), s4: secOf(4), s5: secOf(5), s29: secOf(29), sticky: getComputedStyle(hs[0]).position, barSticky: getComputedStyle(B.querySelector('.pgtop')).position,
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
const fit = await p.evaluate(() => { const bar = el('panelBody').querySelector('.pgtop'), r = bar.getBoundingClientRect(), kids = [...bar.children].filter(x => x.offsetWidth);
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

/* ===== 04.11: «первое, третье, четыре … девять» ===== */
await p.evaluate(async () => { el('panelClose').click(); __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
await p.evaluate(() => { const b = R.book; S.marks[b.id] = [{ page: 15, ratio: 14 / 29, date: '2026-11-04' }, { page: 25, ratio: 24 / 29, date: '2026-11-04' }];
  S.quotes[b.id] = [{ text: 'слово лампа', c: 'y', pdf: { p: 12, v: 2, r: [[0.12, 0.3, 0.7, 0.035], [0.12, 0.34, 0.4, 0.035]] } }, { text: 'море ветер', c: 'b', pdf: { p: 19, v: 2, r: [[0.12, 0.6, 0.6, 0.035]] } }];
  BF.q = ''; BF.hits = []; R.rqRecent = []; });
for (const j of [3, 22, 8, 12]) { await p.evaluate(j => jumpTo(j), j); await sleep(500); }
await openGrid();
/* 5 recent places */
const rc = await p.evaluate(() => ({ rec: (R.rqRecent || []).slice(), chips: [...el('panelBody').querySelectorAll('[data-rec]')].map(x => x.textContent) }));
ok('5: «Был на» lists the pages left by jumps, newest first, not the page now', rc.chips.join() === 'стр. 9,стр. 23,стр. 4,стр. 15', rc);
/* 1 the map */
const mp = await p.evaluate(() => { const m = document.querySelector('#panel .pgscr .pgmap'), r = m && m.getBoundingClientRect(), bar = el('panelBody').querySelector('.pgbar').getBoundingClientRect();
  return m ? { bm: m.querySelectorAll('.mbm').length, q: m.querySelectorAll('.mq').length, now: m.querySelector('.mnow').style.top, rd: m.querySelector('.mrd').style.height, x: r.left + r.width / 2, top: r.top, h: r.height, under: r.top >= bar.bottom - 1, vis: getComputedStyle(m).display !== 'none' } : null; });
ok('1: the map shows 2 bookmarks, 2 quotes, «you are here» at p.13 and the read part', mp && mp.vis && mp.bm === 2 && mp.q === 2 && mp.now === '41.38%' && parseFloat(mp.rd) >= 41 && mp.under, mp);
await p.touchscreen.tap(mp.x, mp.top + mp.h * (24 / 29)); await sleep(500);
const mt = await p.evaluate(() => { const B = el('panelBody'), t = B.querySelector('.pgt[data-n="24"]'), br = B.getBoundingClientRect(), r = t.getBoundingClientRect(); return { inView: r.top >= br.top && r.bottom <= br.bottom + 2, page: R.page, open: !el('panel').classList.contains('hidden') }; });
ok('1: a tap on the map at p.25 brings it into view; the book stays', mt.inView && mt.page === 12 && mt.open, mt);
/* 4 highlights drawn on the pictures */
const hl = await p.evaluate(() => { const t = el('panelBody').querySelector('.pgt[data-n="12"]'), is = [...t.querySelectorAll('.pghl i')]; return { n: is.length, top: is[0] && is[0].style.top, w: is[0] && is[0].style.width }; });
ok('4: the yellow quote is drawn on p.13 where it is (2 lines, from 30% down)', hl.n === 2 && parseFloat(hl.top) === 30 && parseFloat(hl.w) === 70, hl);
/* 3 search right in «Обзор» */
await p.evaluate(() => el('panelBody').querySelector('[data-find]').click()); await sleep(300);
await p.type('#pgFindQ', 'маяк'); await sleep(4000);
const fs = await p.evaluate(() => { const B = el('panelBody'); return { vis: [...B.querySelectorAll('.pgt')].filter(x => !x.hidden).map(x => +x.dataset.n), cnt: B.querySelector('.pgfn').textContent, flt: GRID.flt, q: el('pgFindQ').value, page: R.page }; });
ok('3: «маяк» typed in «Обзор» → only its 10 pages (1, 4, 7 … 28) stay, «10 на 10 стр.»', fs.vis.join() === '0,3,6,9,12,15,18,21,24,27' && /10 на 10 стр/.test(fs.cnt) && fs.flt === 'find' && fs.q === 'маяк' && fs.page === 12, fs);
const fs2 = await p.evaluate(async () => { const i = el('pgFindQ'); i.value = 'нетакогослова'; i.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 4500)); const B = el('panelBody');
  return { vis: [...B.querySelectorAll('.pgt')].filter(x => !x.hidden && !x.closest('.pgsec[hidden]')).length, none: !B.querySelector('.pgnone').hidden && B.querySelector('.pgnone').textContent }; });
ok('3: a word that is not there → «Ничего не найдено», no pages', fs2.vis === 0 && /Ничего не найдено/.test(fs2.none), fs2);
await p.evaluate(() => { const i = el('pgFindQ'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(800);
await p.evaluate(() => el('panelBody').querySelector('[data-find]').click()); await sleep(300);
/* 9 a bookmark's name: long press on the ribbon */
const rb = await p.evaluate(() => { const t = el('panelBody').querySelector('.pgt[data-n="14"]'); t.scrollIntoView({ block: 'center' }); const r = t.querySelector('.pgbmb').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await sleep(300); await p.touchscreen.touchStart(rb.x, rb.y); await sleep(700); await p.touchscreen.touchEnd(); await sleep(400);
const ask = await p.evaluate(() => ({ open: !el('rqAsk').hidden, t: el('rqAskT').textContent }));
await p.evaluate(() => { el('rqAskIn').value = 'спор о свободе'; el('rqAskOk').click(); }); await sleep(600);
const nm = await p.evaluate(() => ({ m: (S.marks[R.book.id] || []).find(m => m.page === 15), cap: (el('panelBody').querySelector('.pgt[data-n="14"] .pgbmn') || {}).textContent, n: (S.marks[R.book.id] || []).filter(m => m.page === 15).length, page: R.page }));
ok('9: a long press on the ribbon asks the name; it is kept in the bookmark (marks[].t) and shown under the page', ask.open && /Название закладки/.test(ask.t) && nm.m && nm.m.t === 'спор о свободе' && nm.cap === 'спор о свободе' && nm.n === 1 && nm.page === 12, { ask, nm });
/* 7 a diary note to the page from the large view */
await p.evaluate(() => rqGridPreview(14)); await sleep(800);
const pvn = await p.evaluate(() => { const v = document.querySelector('#panel .pgpv'); return { name: (v.querySelector('[data-name]') || {}).textContent, note: !!v.querySelector('[data-note]') }; });
await p.evaluate(() => document.querySelector('#panel .pgpv [data-note]').click()); await sleep(400);
const nask = await p.evaluate(() => ({ open: !el('rqAsk').hidden, p: el('rqAskP').textContent }));
await p.evaluate(() => { el('rqAskIn').value = 'мысль к пятнадцатой'; el('rqAskOk').click(); }); await sleep(800);
const dy = await p.evaluate(() => { const y = diaryOf(R.book.id), e = y && y.e.find(x => x.x === 'мысль к пятнадцатой'); return { pg: e && e.pg, ch: e && e.ch, mark: !!el('panelBody').querySelector('.pgt[data-n="14"] .pgdy'), page: R.page }; });
ok('7: the large view shows the bookmark name and «Заметка»; the note goes to the diary at p.15 (chapter 3), the page gets a diary sign', /спор о свободе/.test(pvn.name || '') && pvn.note && nask.open && /стр\. 15/.test(nask.p) && /Глава 3/.test(nask.p) && dy.pg === 15 && /Глава 3/.test(dy.ch || '') && dy.mark && dy.page === 12, { pvn, nask, dy });
await p.evaluate(() => { const v = document.querySelector('#panel .pgpv [data-x]'); if (v) v.click(); });
/* 8 pick several pages → copy their text */
const sl = await p.evaluate(async () => { const B = el('panelBody'); B.querySelector('[data-sel]').click(); await new Promise(r => setTimeout(r, 300));
  const t = (n) => el('panelBody').querySelector('.pgt[data-n="' + n + '"]'); t(12).click(); t(13).click(); t(15).click(); t(13).click(); await new Promise(r => setTimeout(r, 200));
  const bar = document.querySelector('#panel .pgselbar'); return { sel: [...GRID.sel].sort((a, b) => a - b), cls: [t(12), t(15)].every(x => x.classList.contains('sel')), n: bar && bar.querySelector('.pgseln').textContent, ocr: !!(bar && bar.querySelector('[data-socr]')), page: R.page, open: !el('panel').classList.contains('hidden') }; });
ok('8: «Выбрать» → taps pick pages (13, 16; a second tap unpicks 14), the bar says «Выбрано: 2», «Распознать» for a PDF; the book stays', sl.sel.join() === '12,15' && sl.cls && sl.n === 'Выбрано: 2' && sl.ocr && sl.page === 12 && sl.open, sl);
await p.evaluate(() => document.querySelector('#panel .pgselbar [data-scopy]').click()); await sleep(1500);
const cp = await p.evaluate(() => GRID.lastCopy || '');
ok('8: «Копировать текст» copies both pages in order, each under «— стр. N —»', /^— стр\. 13 —\n/.test(cp) && cp.indexOf('— стр. 16 —') > cp.indexOf('— стр. 13 —') && /маяк Персея/.test(cp) && cp.split('— стр.').length === 3, cp.slice(0, 120));
await p.evaluate(() => document.querySelector('#panel .pgselbar [data-sx]').click()); await sleep(300);
const sx = await p.evaluate(() => ({ sel: GRID.sel, bar: !!document.querySelector('#panel .pgselbar'), picked: el('panelBody').querySelectorAll('.pgt.sel').length }));
ok('8: ✕ ends picking', !sx.sel && !sx.bar && sx.picked === 0, sx);
/* 6 a PDF's own page numbers (a-labels-144: i … iv, then 2, 3 …) */
const LBL = process.env.RQ_PDF_LABELS || '/workspace/rqtest/pdf/a-labels-144.pdf';
await p.evaluate(() => el('panelClose').click());
await (await p.$('#fileInp')).uploadFile(LBL); await p.waitForFunction(() => (S.userBooks || []).length >= 2, { timeout: 30000 }); await sleep(400);
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks.find(b => /labels/.test(b.title || b.name || b.id) || b.pages === 144 || 1).id); __navAllow = false; }); await sleep(3000);
await p.evaluate(() => { const b = S.userBooks.find(x => x.id !== R.book.id && /labels/i.test(x.title || '')); if (b) { __navAllow = true; openBook(b.id); __navAllow = false; } }); await sleep(2500);
await openGrid();
const lb = await p.evaluate(() => { const t = (n) => el('panelBody').querySelector('.pgt[data-n="' + n + '"] .pgn').textContent; return { pc: R.pageCount, a: t(0), d: t(3), e: t(4), f: t(10) }; });
ok('6: PDF page labels under the pictures: «i · 1», «iv · 4», «2 · 5», «8 · 11»', lb.pc === 144 && lb.a === 'i · 1' && lb.d === 'iv · 4' && lb.e === '2 · 5' && lb.f === '8 · 11', lb);

/* 04.11 (Джессика: «чутка подтормаживает в начале»): far tiles are skipped (content-visibility) at the right height */
const perf = await p.evaluate(async () => { const B = el('panelBody'); if (!B.querySelector('.pgsecs')) { showChrome(); if (el('panel').classList.contains('hidden')) el('btnPanel').click(); el('tabGrid').click(); await new Promise(r => setTimeout(r, 1200)); }
  const t = B.querySelector('.pgsecs .pgt:not(.cur)'), h = parseFloat(getComputedStyle(B.querySelector('.pgsecs')).getPropertyValue('--pgt-h')), o = t.querySelector('.pgopen').offsetHeight;
  return { cv: getComputedStyle(t).contentVisibility, h, o, cache: GRID_TC.m.size }; });
ok('speed: far tiles skipped, kept at the real tile height', perf.cv === 'auto' && Math.abs(perf.h - perf.o) < 1, perf);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`overview: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
