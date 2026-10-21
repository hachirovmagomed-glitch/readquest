// 20.10 (Джессика: «наверх лупу, чтобы быстро ориентироваться в документе», как в ReadEra; «черточки глав на ползунке,
// уникальные под каждый скин, и название главы, когда тащишь ползунок»). js/book-find.js.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/dir] node bookfind.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const PDFO = process.env.RQ_PDF_OUTLINE || new URL('./fixtures/f-outline-30.pdf', import.meta.url).pathname; /* fixtures/gen-outline.py */
const PDFB = process.env.RQ_PDF_SCAN || '/workspace/rqtest/pdf/d-scan.pdf'; /* scanned pages: no text layer */
const SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
const add = async (f, n) => { await (await p.$('#fileInp')).uploadFile(f); await p.waitForFunction(n => (S.userBooks || []).length >= n, { timeout: 30000 }, n); await sleep(400); };
const open = async (i) => { await p.evaluate(i => { __navAllow = true; openBook(S.userBooks[i].id); __navAllow = false; }, i); await sleep(2500); await p.evaluate(() => showChrome()); await sleep(500); };
const typeQ = async (q) => { await p.evaluate(() => { const i = document.getElementById('bfQ'); i.value = ''; }); await p.type('#bfQ', q); await sleep(500); };

await add(TXT, 1); await add(PDFO, 2); await add(PDFB, 3);
await open(0);
/* 1. the magnifier in the header */
const hb = await p.evaluate(() => { const b = document.getElementById('btnFind'), h = b.closest('.rhead'), r = b.getBoundingClientRect(), t = document.getElementById('rTitle').getBoundingClientRect();
  return { w: r.width, h: r.height, inHead: !!h, right: r.right <= innerWidth, noOverlap: t.right <= r.left + 1, label: b.getAttribute('aria-label') }; });
ok('reader header: a magnifier button 44×44, inside the screen, not over the title', hb.inHead && hb.w >= 44 && hb.h >= 44 && hb.right && hb.noOverlap && /Поиск/.test(hb.label), hb);
await p.click('#btnFind'); await sleep(300);
const o1 = await p.evaluate(() => ({ open: !document.getElementById('bookFind').hidden, st: history.state && history.state.rq, focus: document.activeElement && document.activeElement.id }));
ok('tap → the search screen opens (history entry «find»), the field has the focus', o1.open && o1.st === 'find' && o1.focus === 'bfQ', o1);
await typeQ('очумелов');
const r1 = await p.evaluate(() => { const rows = [...document.querySelectorAll('#bfList .bfrow')];
  return { n: rows.length, hits: BF.hits.length, stat: document.getElementById('bfStat').textContent, marks: rows.every(r => /очумелов/i.test(r.querySelector('.bfm').textContent)),
    pages: rows.map(r => +r.querySelector('.bfpg').textContent), sorted: rows.every((r, i, a) => !i || +a[i - 1].querySelector('.bfpg').textContent <= +r.querySelector('.bfpg').textContent),
    direct: (() => { const t = S.userBooks[0].text.toLowerCase(); let c = 0, i = 0; for (;;) { const j = t.indexOf('очумелов', i); if (j < 0) break; c++; i = j + 8; } return c; })() }; });
ok('TXT: every «Очумелов» of the book is found, each row has the word marked and a page number, in book order', r1.n > 3 && r1.hits === r1.direct && r1.marks && r1.pages.every(x => x >= 1) && r1.sorted && /Найдено: \d+/.test(r1.stat), r1);
await shot('360-1-poisk-txt');
/* ё = е, case-insensitive */
await typeQ('ОЧУМЕЛОВ'); const r1b = await p.evaluate(() => BF.hits.length);
ok('search ignores the letter case', r1b === r1.hits, r1b);
/* 2. pick a match → its page, highlighted; «‹ 3 из N ›» */
const before = await p.evaluate(() => R.page);
const PICK = await p.evaluate(() => [...document.querySelectorAll('#bfList .bfrow')].findIndex(r => +r.querySelector('.bfpg').textContent >= 5));
await p.evaluate((i) => document.querySelectorAll('#bfList .bfrow')[i].click(), PICK); await sleep(700);
const g1 = await p.evaluate((PICK) => { const h = BF.hits[PICK]; const T = bfTextIndex(); const a = bfNodeAt(T, h.o, false);
  return { closed: document.getElementById('bookFind').hidden, page: R.page, want: pageOfAnchor(a), cur: CSS.highlights.has('rq-find-cur'), all: CSS.highlights.has('rq-find'),
    curTxt: (() => { const hl = CSS.highlights.get('rq-find-cur'); return hl ? [...hl][0].toString() : ''; })(), pill: !document.getElementById('bfPill').classList.contains('hidden'),
    num: document.getElementById('bfNum').textContent, jb: !document.getElementById('jumpBack').classList.contains('hidden'), st: history.state && history.state.rq }; }, PICK);
ok('tap on a match on page 5+ → the screen closes, the book is on that page, the word is highlighted, «N из M» and «< на стр. 1» are shown', g1.closed && g1.page === g1.want && g1.page >= 4 && g1.cur && /очумелов/i.test(g1.curTxt) && g1.pill && g1.num === (PICK + 1) + ' из ' + r1.hits && g1.jb && g1.st === 'reader', { ...g1, before, PICK });
const vis = await p.evaluate(() => { const hl = CSS.highlights.get('rq-find-cur'); const r = [...hl][0].getBoundingClientRect(), v = document.getElementById('viewer').getBoundingClientRect(); return r.left >= v.left - 1 && r.right <= v.right + 1 && r.top >= v.top - 1 && r.bottom <= v.bottom + 1; });
ok('the highlighted match is on the screen', vis);
await shot('360-2-naydeno-txt');
await p.click('#bfNext'); await sleep(500);
const g2 = await p.evaluate(() => ({ cur: BF.cur, num: document.getElementById('bfNum').textContent, page: R.page }));
ok('› goes to the next match', g2.cur === PICK + 1 && g2.num === (PICK + 2) + ' из ' + r1.hits, g2);
await p.evaluate(() => concealChrome('test')); await sleep(400);
ok('the plaque stays over the clean page (bars hidden): the search is on until ✕', await p.evaluate(() => document.getElementById('bfPill').getBoundingClientRect().width > 0));
await p.click('#bfPrev'); await p.click('#bfPrev'); await sleep(400);
ok('‹ goes back', (await p.evaluate(() => BF.cur)) === PICK - 1);
await p.click('#bfNum'); await sleep(300);
const o2 = await p.evaluate(() => ({ open: !document.getElementById('bookFind').hidden, q: document.getElementById('bfQ').value, n: document.querySelectorAll('#bfList .bfrow').length, on: !!document.querySelector('#bfList .bfrow.on[data-i="' + BF.cur + '"]') }));
ok('tap on «K из N» → back to the list with the same query, the current row marked', o2.open && /очумелов/i.test(o2.q) && o2.n === r1.n && o2.on, o2);
await p.evaluate(() => history.back()); await sleep(400);
const o3 = await p.evaluate(() => ({ closed: document.getElementById('bookFind').hidden, reader: !document.getElementById('reader').classList.contains('hidden') && !!R.book }));
ok('system «назад» closes only the search, the book stays open', o3.closed && o3.reader, o3);
await p.click('#bfEnd'); await sleep(200);
const e1 = await p.evaluate(() => ({ pill: document.getElementById('bfPill').classList.contains('hidden'), hl: CSS.highlights.has('rq-find') || CSS.highlights.has('rq-find-cur'), q: BF.q }));
ok('✕ on the plaque ends the search: no plaque, no highlight', e1.pill && !e1.hl && e1.q === '', e1);
/* the old «Поиск» tab of «Оглавление» opens the same screen */
await p.evaluate(() => { el('btnPanel').click(); }); await sleep(200); await p.evaluate(() => el('tabFind').click()); await sleep(200);
ok('«Оглавление» → «Поиск» opens the same search screen', await p.evaluate(() => !document.getElementById('bookFind').hidden && document.getElementById('panel').classList.contains('hidden')));
await typeQ('ы'); ok('one letter: asks for 2', await p.evaluate(() => /2 букв/.test(document.getElementById('bfStat').textContent) && !BF.hits.length));
await typeQ('zzqqxx'); ok('nothing found → «Ничего не найдено»', await p.evaluate(() => /Ничего не найдено/.test(document.getElementById('bfList').textContent)));
await p.click('#bfBack'); await sleep(300);
ok('← closes the search', await p.evaluate(() => document.getElementById('bookFind').hidden && history.state && history.state.rq === 'reader'));
/* 3. chapter ticks + chapter name over the thumb (TXT: 8 × «Глава N») */
const t1 = await p.evaluate(() => { const ch = bfChapters(), ti = [...document.querySelectorAll('#pgTicks i')], sl = document.getElementById('pgSlider'), mx = +sl.max, r = sl.getBoundingClientRect();
  const xs = ti.map(i => i.getBoundingClientRect().left + i.getBoundingClientRect().width / 2);
  const want = ch.filter(c => c.page > 0).map(c => r.left + PG_TH / 2 + (r.width - PG_TH) * c.page / mx);
  return { ch: ch.length, ticks: ti.length, err: Math.max(0, ...xs.map((x, k) => Math.abs(x - want[k]))) }; });
ok('TXT: a tick on the slider at every chapter (exactly where «Главы» jumps), ±1.5 px', t1.ch === 8 && t1.ticks === 7 && t1.err <= 1.5, t1);
const tip = async (v) => p.evaluate((v) => { const sl = document.getElementById('pgSlider'); const old = +sl.value; sl.value = v; pgTipShow(); const t = document.getElementById('pgTip'), r = t.getBoundingClientRect();
  const o = { txt: t.textContent, ch: t.querySelector('.pgch') && t.querySelector('.pgch').textContent, inside: r.left >= 0 && r.right <= innerWidth, want: (bfChapterAt(v) || {}).t || null };
  return o; }, v);
const mid = await p.evaluate(() => { const c = bfChapters()[4]; return c.page + 1; });
const tp = await tip(mid);
ok('dragging the slider: the tip shows the chapter at that place and the page', tp.ch === tp.want && /Глава 5/.test(tp.ch) && /стр\. \d+/.test(tp.txt) && tp.inside, tp);
await p.evaluate(() => { const t = document.getElementById('pgTip'); t.classList.remove('hidden'); }); await shot('360-3-glava-na-polzunke');
const tp0 = await tip(0); ok('page 1 = «Глава 1» (the book starts with it)', tp0.ch === 'Глава 1' && /стр\. 1$/.test(tp0.txt), tp0);
await p.evaluate(() => { document.getElementById('pgTip').classList.add('hidden'); el('pgSlider').value = R.page; pgArtSync(); });
/* 4. PDF: bookmarks → «Главы» + ticks; search by the text layer; highlight on the page */
await p.evaluate(() => closeReader({ quiet: true })); await sleep(800);
await open(1);
await p.waitForFunction(() => R.pdfToc && R.pdfToc.length === 6, { timeout: 10000 }).catch(() => {});
const pt = await p.evaluate(() => ({ toc: (R.pdfToc || []).map(x => x.page), ticks: document.querySelectorAll('#pgTicks i').length, tocPanel: (renderPanel('toc'), document.querySelectorAll('#panelBody .prow').length) }));
ok('PDF: its bookmarks become «Главы» (6) and ticks on the slider (5 after page 1)', JSON.stringify(pt.toc) === '[0,5,10,15,20,25]' && pt.ticks === 5 && pt.tocPanel === 6, pt);
await p.evaluate(() => jumpToc(2)); await sleep(800);
ok('PDF: «Главы» → chapter 3 opens page 11', (await p.evaluate(() => P.target)) === 10);
await p.click('#btnFind'); await sleep(200); await typeQ('маяк персея');
await p.waitForFunction(() => BF.done && !BF.busy, { timeout: 15000 });
const pr = await p.evaluate(() => ({ hits: BF.hits.map(h => h.pg), rows: document.querySelectorAll('#bfList .bfrow').length, pg: [...document.querySelectorAll('#bfList .bfpg')].map(x => x.textContent) }));
ok('PDF: the phrase is found on every page that has it (1, 4, 7 … 28), page numbers shown', JSON.stringify(pr.hits) === JSON.stringify([0, 3, 6, 9, 12, 15, 18, 21, 24, 27]) && pr.rows === 10 && pr.pg[1] === '4', pr);
await shot('360-4-poisk-pdf');
await p.evaluate(() => document.querySelectorAll('#bfList .bfrow')[4].click()); await sleep(1500);
const pg = await p.evaluate(() => ({ shown: P.shown, cur: CSS.highlights.has('rq-find-cur') ? [...CSS.highlights.get('rq-find-cur')][0].toString() : '', num: document.getElementById('bfNum').textContent }));
ok('PDF: tap → page 13, the phrase highlighted on the page', pg.shown === 12 && /маяк\s?персея/i.test(pg.cur) && pg.num === '5 из 10', pg);
await shot('360-5-naydeno-pdf');
await p.click('#bfNext'); await sleep(1500);
ok('PDF: › → page 16, highlighted again on the new page', await p.evaluate(() => P.shown === 15 && CSS.highlights.has('rq-find-cur')));
await p.evaluate(() => closeReader({ quiet: true })); await sleep(800);
await open(2);
await p.click('#btnFind'); await sleep(200); await typeQ('текст');
await p.waitForFunction(() => BF.done && !BF.busy, { timeout: 15000 });
ok('PDF from pictures only: says there is no text to search', await p.evaluate(() => /нет текста/.test(document.getElementById('bfList').textContent)));
await p.click('#bfBack'); await sleep(200);

const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => /find|bf/i.test(k)));
ok('no search keys in localStorage / S', keys.length === 0 && await p.evaluate(() => !JSON.stringify(S).includes('маяк')), keys);
/* 5. every skin: header, search screen and ticks, 360 and 390 */
await p.evaluate(() => closeReader({ quiet: true })); await sleep(600);
await p.evaluate(() => { S.gold = 999999; save(); });
for (const W of [360, 390]) {
  await p.setViewport({ width: W, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  for (const sk of ['', 'pencil', 'ellada', 'babochkovyi', 'celestial']) {
    await p.evaluate((sk) => { if (sk) { buy('skin-' + sk); wear('skin-' + sk); } else { SET.skin = ''; SET.color = ''; SET.theme = 'sepia'; saveSet(); applySet(); } }, sk);
    await open(0);
    const L = await p.evaluate(() => { const hd = document.querySelector('#reader .rhead'), bs = [...hd.querySelectorAll('button')].filter(b => b.offsetWidth), t = document.getElementById('rTitle').getBoundingClientRect();
      return { fit: bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5; }), titleW: Math.round(t.width), ticks: document.querySelectorAll('#pgTicks i').length,
        tickVis: (() => { const i = document.querySelector('#pgTicks i'); if (!i) return false; const cs = getComputedStyle(i), r = i.getBoundingClientRect(); return cs.display !== 'none' && r.width > 0 && r.height > 0 && +cs.opacity > 0; })(), skin: document.documentElement.dataset.skin || '' }; });
    ok(`${sk || 'default'} ${W}: header buttons inside the screen, the title keeps room, chapter ticks drawn`, L.fit && L.titleW >= 80 && L.ticks === 7 && L.tickVis, L);
    await p.evaluate(() => { const sl = el('pgSlider'); sl.value = bfChapters()[3].page + 2; pgArtSync(); pgTipShow(); }); await sleep(100);
    await shot(`${W}-${sk || 'default'}-a-polzunok`);
    await p.evaluate(() => { el('pgTip').classList.add('hidden'); el('pgSlider').value = R.page; pgArtSync(); });
    await p.click('#btnFind'); await sleep(200); await typeQ('крыжовник');
    const F = await p.evaluate(() => { const o = document.getElementById('bookFind'), h = o.querySelector('.rhead'), q = document.getElementById('bfQ'), row = document.querySelector('.bfrow');
      const L = c => { const m = c.match(/[\d.]+/g).map(Number); const a = m.length > 3 ? m[3] : 1; return m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); };
      const bgOf = e => { for (let x = e; x; x = x.parentElement) { const b = getComputedStyle(x).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; } return 'rgb(255,255,255)'; };
      const cr = (e) => { const a = L(getComputedStyle(e).color), b = L(bgOf(e)); return +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2); };
      return { headBg: getComputedStyle(h).backgroundColor, readerHeadBg: getComputedStyle(document.querySelector('#reader .rhead')).backgroundColor, rows: document.querySelectorAll('.bfrow').length,
        crRow: row ? cr(row.querySelector('.bfsn')) : 0, crPg: row ? cr(row.querySelector('.bfpg')) : 0, crQ: cr(q), noX: document.body.scrollWidth <= innerWidth }; });
    ok(`${sk || 'default'} ${W}: the search header looks like the reader header, results readable (contrast ≥4.5)`, F.rows > 0 && F.headBg === F.readerHeadBg && F.crRow >= 4.5 && F.crPg >= 4.5 && F.crQ >= 4.5 && F.noX, F);
    await shot(`${W}-${sk || 'default'}-b-poisk`);
    await p.evaluate(() => document.querySelectorAll('#bfList .bfrow')[1].click()); await sleep(600);
    const pl = await p.evaluate(() => { const a = document.getElementById('bfPill').getBoundingClientRect(), b = document.getElementById('jumpBack').getBoundingClientRect();
      return { vis: a.width > 0, inside: a.left >= 0 && a.right <= innerWidth, apart: b.width === 0 || b.right <= a.left - 4 || a.bottom <= b.top || a.top >= b.bottom }; });
    ok(`${sk || 'default'} ${W}: «‹ 2 из N ›» fits next to «< на стр.»`, pl.vis && pl.inside && pl.apart, pl);
    await shot(`${W}-${sk || 'default'}-c-naydeno`);
    await p.click('#bfEnd');
    await p.evaluate(() => closeReader({ quiet: true })); await sleep(600);
  }
}
/* 6. 21.10 (Джессика: «главы нифига не подсвечиваются» — Небесный, день): rows of «Навигация» readable in every skin, day and night */
await p.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
for (const sk of ['', 'pencil', 'ellada', 'babochkovyi', 'celestial']) {
  await p.evaluate((sk) => { if (sk) { buy('skin-' + sk); wear('skin-' + sk); } else { SET.skin = ''; SET.color = ''; SET.theme = 'sepia'; saveSet(); applySet(); } }, sk);
  await open(0); await p.evaluate(() => { jumpTo(bfChapters()[5].page + 1); }); await sleep(500);
  for (const night of [false, true]) {
    const r = await p.evaluate(async (night) => {
      const isN = () => !isLightBg(activeTheme().bg); if (isN() !== night) toggleDayNight(); await new Promise(q => setTimeout(q, 300));
      const L = c => { const m = c.match(/[\d.]+/g).map(Number); return m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); };
      const bgOf = e => { for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x), g = cs.backgroundImage.match(/rgba?\([^)]*\)/g); if (g && /gradient/.test(cs.backgroundImage)) return g[g.length - 1]; const b = cs.backgroundColor, al = /^rgba/.test(b) ? +b.match(/[\d.]+/g)[3] : /^color\(.*\/\s*([\d.]+)\)/.test(b) ? +b.match(/\/\s*([\d.]+)\)/)[1] : /^color\(/.test(b) ? NaN : 1; if (isNaN(al)) return b.replace(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+).*$/, (m, r, g, bb) => `rgb(${r * 255},${g * 255},${bb * 255})`); if (b && al >= 0.5) return b; } return 'rgb(255,255,255)'; }; /* a faint tint (tag chip) counts as its parent's colour */
      const cr = e => { const a = L(getComputedStyle(e).color), b = L(bgOf(e)); return +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2); };
      el('btnPanel').click(); await new Promise(q => setTimeout(q, 250)); renderPanel('toc');
      const toc = [...document.querySelectorAll('#panelBody .prow')].slice(0, 3).map(cr);
      const onEl = document.querySelector('#panelBody .prow.on'), onTxt = onEl ? onEl.querySelector('.ptt').textContent : null, want = (bfChapterAt(R.page) || {}).t || null;
      const other = document.querySelector('#panelBody .prow:not(.on)');
      const look = e => { const cs = getComputedStyle(e); return cs.backgroundColor + cs.backgroundImage + cs.boxShadow + cs.borderTopColor + cs.borderTopWidth; };
      const cur = onEl ? { txt: cr(onEl.querySelector('.ptt')), tag: cr(onEl.querySelector('.pnow')), tagText: onEl.querySelector('.pnow').textContent, differs: !!other && look(onEl) !== look(other), bold: +getComputedStyle(onEl).fontWeight >= 700,
        inView: (() => { const r = onEl.getBoundingClientRect(), pb = document.getElementById('panelBody').getBoundingClientRect(); return r.top >= pb.top - 1 && r.bottom <= pb.bottom + 1; })() } : null;
      addBookmark(); renderPanel('marks');
      const mk = [...document.querySelectorAll('#panelBody .prow button:first-child, #panelBody .prow.add')].slice(0, 3).map(cr);
      const o = { skin: document.documentElement.dataset.skin || '', night: isN(), toc, mk, onTxt, want, cur };
      el('panelClose').click(); return o; }, night);
    ok(`${sk || 'default'} ${night ? 'night' : 'day'}: «Навигация» — chapter and bookmark rows readable (contrast ≥4.5), the chapter being read stands out (own look, «Читаете», readable, scrolled into view)`, r.night === night && r.toc.length >= 3 && r.toc.every(x => x >= 4.5) && r.mk.length >= 2 && r.mk.every(x => x >= 4.5) && r.onTxt === r.want && !!r.want && r.cur && r.cur.txt >= 4.5 && r.cur.tag >= 4.5 && r.cur.tagText === 'Читаете' && r.cur.differs && r.cur.bold && r.cur.inView, r);
    if (SHOTS) { await p.evaluate(() => { document.querySelectorAll('.rq-toast,.toast').forEach(t => t.remove()); el('btnPanel').click(); renderPanel('toc'); }); await sleep(400); await p.evaluate(() => document.querySelectorAll('.rq-toast,.toast').forEach(t => t.remove())); await shot(`390-${sk || 'default'}-d-glavy-${night ? 'noch' : 'den'}`); await p.evaluate(() => el('panelClose').click()); }
  }
  await p.evaluate(() => closeReader({ quiet: true })); await sleep(600);
}
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY bookfind.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
