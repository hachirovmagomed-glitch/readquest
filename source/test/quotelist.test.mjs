// «Навигация → Цитаты» (Джессика 28.10: «Нужна возможность удалять цитаты прямо во время чтения… пусть там отмечается, на какой странице цитата»).
// Each quote shows «стр. N» = the page it is on now (text book: follows the layout; PDF: the page label); the bin asks, then removes the quote,
// its note and its highlight in the text; the other quotes stay. Every skin, day and night.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_PDF=/workspace/rqtest/pdf/a-labels-144.pdf] [RQ_SHOTS=/workspace/out] node quotelist.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [], dialogs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => { dialogs.push(d.type()); d.dismiss(); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
await (await p.$('#fileInp')).uploadFile(PDF); await sleep(2500);
const ids = await p.evaluate(async () => { const t = allBooks().find(x => x.type !== 'pdf'), f = allBooks().find(x => x.type === 'pdf');
  for (const id of [t.id, f.id]) { S.quotes[id] = []; S.hl[id] = []; S.progress[id] = { ratio: 0, pos: 0 }; } SET.hlc = 'y'; saveSet(); save();
  __navAllow = true; openBook(t.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); return [t.id, f.id]; });
const tap = async (sel) => { await p.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(300); };
/** select some words on the page shown and save them in colour c */
const quoteHere = async (c, from) => { const t = await p.evaluate((from) => {
  for (let y = 160; y < innerHeight - 280; y += 24) { const cr = document.caretRangeFromPoint(60, y); if (!cr || cr.startContainer.nodeType !== 3) continue; const x = cr.startContainer, o = cr.startOffset;
    if (!x.parentElement.closest('#content p') || x.parentElement.closest('mark') || x.length < o + 30) continue; const q = document.createRange(); q.setStart(x, o); q.setEnd(x, o + 28); const r = q.getBoundingClientRect();
    if (r.top > 100 && r.bottom < innerHeight - 260 && r.left >= 0 && r.right <= innerWidth && r.height < 40) { const g = getSelection(); g.removeAllRanges(); g.addRange(q); updSelPop(); return String(g).trim(); } } return null; }, from);
  await sleep(300); const dbg = await p.evaluate(() => ({ pop: el("selpop").className, cols: el("spColors").innerHTML.slice(0, 200), page: R.page })); if (process.env.DBG) console.log(t, dbg); await tap('#spColors button[data-c="' + c + '"]'); return t; };
const list = () => p.evaluate(() => [...document.querySelectorAll('#panelBody .pq')].map(r => ({ t: r.querySelector('.ptt').textContent, pg: (r.querySelector('.pqp') || {}).textContent || '', del: !!r.querySelector('.pqdel'),
  dw: Math.round((r.querySelector('.pqdel') || { getBoundingClientRect: () => ({}) }).getBoundingClientRect().width || 0), rr: Math.round(r.getBoundingClientRect().right), dr: Math.round((r.querySelector('.pqdel') || { getBoundingClientRect: () => ({}) }).getBoundingClientRect().right || 0) })));
const openList = async () => { await p.evaluate(() => { el('panel').classList.remove('hidden'); renderPanel('qts'); }); await sleep(300); };

// 1. three quotes: pages 1, 4, 9 → «стр. 1 / 4 / 9»
const pages = [0, 3, 8], words = [];
const at = [];
for (const [k, pg] of pages.entries()) { await p.evaluate((pg) => jumpTo(pg), pg); await sleep(500); at.push(await p.evaluate(() => R.page + 1)); words.push(await quoteHere(['g', 'b', 'p'][k], 4)); }
await openList(); let l1 = await list();
ok('1 every quote in «Цитаты» shows the page it was made on (' + at.join(', ') + ')', l1.length === 3 && l1.map(x => x.pg).join() === at.map(n => 'стр. ' + n).join() && at[2] > at[1] && at[1] > 1 && words.every(Boolean), { l1, words, at });
ok('1b every row has a bin (≥ 44 px, inside the row at 360)', l1.every(x => x.del && x.dw >= 44 && x.dr <= x.rr && x.rr <= 360), l1);
await p.screenshot({ path: SHOTS + 'quotelist-sepia.png' });

// 2. bigger font: the pages follow the layout; «Открыть в книге» goes to the page shown
const pg2 = await p.evaluate(async () => { el('panel').classList.add('hidden'); SET.size = (SET.size || 18) + 8; saveSet(); applySet(); relayout(); await new Promise(r => setTimeout(r, 1500));
  const qs = S.quotes[R.book.id]; return qs.map(q => quotePage(R.book, q) + 1); });
await openList(); const l2 = await list();
const b2 = await p.evaluate(() => R.page + 1); await p.evaluate(() => quoteToggle(2)); await tap('#panelBody .pq.on .pqgo'); await sleep(800); if (process.env.DBG) console.log('before', b2, await p.evaluate(() => [R.page, R.pageCount, quotePage(R.book, S.quotes[R.book.id][2])])); const at2 = await p.evaluate(() => R.page + 1);
ok('2 a bigger font: the pages move with the layout, «Открыть в книге» opens the page written', pg2[2] > at[2] && l2.map(x => x.pg).join() === pg2.map(n => 'стр. ' + n).join() && at2 === pg2[2], { pg2, l2: l2.map(x => x.pg), at2 });
await p.evaluate(async () => { SET.size -= 8; saveSet(); applySet(); relayout(); await new Promise(r => setTimeout(r, 1500)); jumpTo(3); await new Promise(r => setTimeout(r, 500)); });

// 3. the bin: asks first; «Отмена» keeps it
await openList(); await tap('#panelBody .pq:nth-child(2) .pqdel');
const ask = await p.evaluate(() => ({ shown: !el('rqAsk').hidden, t: el('rqAskT').textContent, ok: el('rqAskOk').textContent, danger: el('rqAskOk').className }));
await p.screenshot({ path: SHOTS + 'quotelist-ask.png' });
await tap('#rqAskNo'); const n3 = await p.evaluate((id) => S.quotes[id].length, ids[0]);
ok('3 the bin asks «Удалить цитату?» (red «Удалить»); «Отмена» keeps the quote', ask.shown && ask.t === 'Удалить цитату?' && ask.ok === 'Удалить' && ask.danger === 'danger' && n3 === 3, { ask, n3 });

// 4. «Удалить»: the 2nd quote goes with its highlight in the text, the others stay, the list stays open
await tap('#panelBody .pq:nth-child(2) .pqdel'); await tap('#rqAskOk');
const d4 = await p.evaluate((a) => ({ qs: S.quotes[a.id].map(q => q.text), hl: S.hl[a.id].length, marks: [...document.querySelectorAll('#content mark')].map(m => m.textContent), word: document.getElementById('content').textContent.includes(a.w), open: !el('panel').classList.contains('hidden') }), { id: ids[0], w: words[1] });
const l4 = await list();
ok('4 «Удалить»: that quote and its highlight are gone, the words stay, the other two remain, the list stays open', d4.qs.length === 2 && !d4.qs.includes(words[1]) && d4.hl === 2 && !d4.marks.includes(words[1]) && d4.marks.length === 2 && d4.word && d4.open && l4.map(x => x.pg).join() === 'стр. ' + at[0] + ',стр. ' + at[2], { d4, l4 });

// 5. every skin, day and night: page + bin visible, the bin inside the row
const shots = {};
for (const k of ['sepia', 'pencil', 'ellada', 'babochkovyi', 'celestial', 'pencil-night', 'celestial-night', 'ellada-night', 'babochkovyi-night', 'night']) {
  const ok5 = await p.evaluate((k) => { if (!THEMES[k] && !SKIN_THEMES[k] && k !== 'pencil' && k !== 'pencil-night') return null; const base = (SKIN_THEMES[k] && SKIN_THEMES[k].base) || k.replace(/-night$/, '');
    if (['pencil', 'ellada', 'babochkovyi', 'celestial'].includes(base)) { S.gold = 9000; save(); try { buy('skin-' + base); } catch (e) {} }
    SET.theme = k; saveSet(); applySet(); renderPanel('qts'); quoteToggle(0); return true; }, k);
  if (!ok5) continue; await sleep(300);
  shots[k] = await p.evaluate(() => [...document.querySelectorAll('#panelBody .pq')].map(r => { const d = r.querySelector('.pqdel'), g = r.querySelector('.pqp'), cs = getComputedStyle(d), gs = getComputedStyle(g);
    return d.offsetParent && g.offsetParent && cs.visibility !== 'hidden' && +cs.opacity > 0.3 && gs.visibility !== 'hidden' && d.getBoundingClientRect().right <= r.getBoundingClientRect().right + 0.5 ? 1 : 0; }).join(''));
  await p.screenshot({ path: SHOTS + 'quotelist-' + k + '.png' });
}
ok('5 every skin, day and night: «стр. N» and the bin are shown on each quote', Object.keys(shots).length >= 8 && Object.values(shots).every(v => v === '11'), shots);
await p.evaluate(() => { SET.theme = 'sepia'; saveSet(); applySet(); el('panel').classList.add('hidden'); });

// 6. a tapped quote's own «Удалить» still works (the bar)
const m6 = await p.evaluate(async () => { jumpTo(0); await new Promise(r => setTimeout(r, 500)); const m = document.querySelector('#content mark'), r = m.getClientRects()[0]; return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 }; });
await p.touchscreen.tap(m6.x, m6.y); await sleep(500); await tap('#spDel');
ok('6 a tap on the highlight → «Удалить» still removes it', (await p.evaluate((id) => S.quotes[id].length, ids[0])) === 1);

// 7. PDF: «стр. N» = the PDF page; the bin removes the quote and its boxes
await p.evaluate(async (id) => { await closeReader({ quiet: true }); openBook(id); await new Promise(r => setTimeout(r, 3500)); jumpTo(2); await new Promise(r => setTimeout(r, 1500)); }, ids[1]);
await p.evaluate(() => { const tl = document.getElementById('pdfText'), sp = [...tl.querySelectorAll('span')].filter(s => s.textContent.trim().length > 12 && s.getBoundingClientRect().top > 200 && s.getBoundingClientRect().bottom < innerHeight - 300);
  const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(sp[0].firstChild, 0); rg.setEnd(sp[0].firstChild, 10); g.addRange(rg); updSelPop(); });
await sleep(300); await tap('#spColors button[data-c="o"]'); await sleep(300);
await openList(); const l7 = await list(), want7 = await p.evaluate(() => 'стр. ' + pdfLabel(2));
await p.screenshot({ path: SHOTS + 'quotelist-pdf.png' });
await tap('#panelBody .pq .pqdel'); await tap('#rqAskOk'); await sleep(300);
const d7 = await p.evaluate((id) => ({ n: S.quotes[id].length, boxes: document.querySelectorAll('#pdfText .pdfhls i').length, empty: !!document.querySelector('#panelBody .pempty') }), ids[1]);
ok('7 PDF: the quote shows its page (' + want7 + '); the bin removes it and its boxes', l7.length === 1 && l7[0].pg === want7 && d7.n === 0 && d7.boxes === 0 && d7.empty, { l7, want7, d7 });
ok('no page errors, no system dialogs', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
