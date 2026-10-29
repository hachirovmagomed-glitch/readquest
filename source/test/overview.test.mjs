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
    cur: B.querySelector('.pgt.cur').dataset.n, curAria: B.querySelector('.pgt.cur').getAttribute('aria-current'),
    bm: [...B.querySelectorAll('.pgt .pgbm')].map(x => x.closest('.pgt').dataset.n), q12: t(12).querySelectorAll('.pgqs i').length, q13: t(13).querySelectorAll('.pgqs i').length,
    n13: !!t(13).querySelector('.pgnote'), n12: !!t(12).querySelector('.pgnote'), plain: !t(3).querySelector('.pgqs,.pgbm'), lab13: t(13).getAttribute('aria-label'), lab14: t(14).getAttribute('aria-label') };
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
const fit = await p.evaluate(() => { const bar = el('panelBody').querySelector('.pgbar'), r = bar.getBoundingClientRect(), kids = [...bar.children].filter(x => x.offsetWidth);
  return { h: Math.round(r.height), out: kids.filter(k => { const q = k.getBoundingClientRect(); return q.right > innerWidth - 8 || q.left < 8; }).length, rows: new Set(kids.map(k => { const q = k.getBoundingClientRect(); return Math.round((q.top + q.bottom) / 2 / 4); })).size }; });
ok('360: «Стр. [__] Перейти · К текущей» in one row inside the screen', fit.rows === 1 && fit.out === 0, fit);

ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`overview: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
