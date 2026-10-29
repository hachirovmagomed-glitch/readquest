// Quote colours in a PDF (Джессика 21.10: «выделяю, хочу пометить цветом — ничего не происходит»; PDF «Криничная», прокрутка).
// In «Прокрутка» and «Страницы»: a colour on the bar saves the quote WITH its place (q.pdf {p, r}) and paints boxes of that colour
// over the selected words on that page; the boxes come back after reopening; an own colour works too; a TXT book is unchanged.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_PDF=/workspace/rqtest/pdf/b-nolabels-40.pdf] [RQ_SHOTS=/workspace/out] node pdfhl.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.dismiss());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'scroll' }); rqSaveSetGated(); });
await (await p.$('#fileInp')).uploadFile(PDF); await sleep(2500);
const bid = await p.evaluate(async () => { const b = allBooks().find(x => x.type === 'pdf'); S.quotes[b.id] = []; S.hl[b.id] = []; S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3500)); return b.id; });

// select a few words in a text layer span (k-th visible span with text) and show the bar
const select = (k) => p.evaluate((k) => {
  const ls = [...document.querySelectorAll(R.mode === 'pdf' && flipGet().mode === 'scroll' ? '#pdfScroll .textLayer' : '#pdfText')];
  const sp = ls.flatMap(l => [...l.querySelectorAll('span')]).filter(s => { const r = s.getBoundingClientRect(); return s.textContent.trim().length > 12 && r.top > 80 && r.bottom < innerHeight - 260 && r.width > 40; });
  const s = sp[k]; if (!s) return null; const t = s.firstChild; const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(t, 0); rg.setEnd(t, Math.min(12, t.length)); g.addRange(rg); updSelPop();
  const q = rg.getBoundingClientRect(); return { rr: [q.left, q.top, q.width, q.height], t: String(g).trim(), page: s.closest('.psl') ? +s.closest('.psl').dataset.n : R.page };
}, k);
const tap = async (sel) => { await p.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(300); };
const quotes = () => p.evaluate((id) => (S.quotes[id] || []).map(q => ({ t: q.text, c: q.c, pdf: q.pdf })), bid);
// boxes painted on page n: count + their colour + whether they cover the selected words
const boxes = (n, rr) => p.evaluate((n, rr) => {
  const tl = flipGet().mode === 'scroll' ? document.querySelector('#pdfScroll .psl[data-n="' + n + '"] .textLayer') : document.getElementById('pdfText');
  const bs = tl ? [...tl.querySelectorAll('.pdfhls i')] : [];
  /* 21.10: the box follows the page's line (a bit lower than the invisible text's own box) */
  const hit = rr && bs.find(b => { const r = b.getBoundingClientRect(); return Math.abs(r.left - rr[0]) < 2 && Math.abs(r.width - rr[2]) < 2 && r.top >= rr[1] - 1 && r.top <= rr[1] + rr[3] * 0.45 && Math.abs(r.height - rr[3]) < rr[3] * 0.3; });
  return { n: bs.length, bg: hit ? hit.className + ' ' + hit.style.getPropertyValue('--hc') : '', cover: !!hit, under: !!bs[0] && getComputedStyle(bs[0].parentNode).zIndex === '0' && getComputedStyle(bs[0].parentNode).pointerEvents === 'none' };
}, n, rr);

ok('0 PDF open in «Прокрутка» with a text layer', await p.evaluate(() => R.mode === 'pdf' && flipGet().mode === 'scroll' && !!document.querySelector('#pdfScroll .textLayer span')));

// 1. scroll mode: green dot → quote with place, green boxes over the words, bar closed
let s1 = await select(0); await sleep(300);
await tap('#spColors button[data-c="g"]');
let q = await quotes(); let bx = await boxes(s1.page, s1.rr);
ok('1 «Прокрутка»: green → quote c=g with q.pdf {p, r: boxes in 0…1}', q.length === 1 && q[0].t === s1.t && q[0].c === 'g' && q[0].pdf && q[0].pdf.p === s1.page && q[0].pdf.r.length >= 1 && q[0].pdf.r.every(r => r.length === 4 && r.every(v => v >= 0 && v <= 1)), q[0]);
ok('1b the words are painted green on their page (boxes under the text, no taps taken)', bx.n >= 1 && /hl-g/.test(bx.bg) && bx.cover && bx.under, bx);
await p.screenshot({ path: SHOTS + 'pdfhl-scroll.png' });

// 2. own colour in the PDF
let s2 = await select(2); await sleep(300); await tap('#spOwn');
await tap('#hlPk .hlpk-g button[data-c="#d0306a"]'); await tap('#rqAskOk'); await sleep(300); /* 22.10: our «Свой цвет» sheet */
q = await quotes(); bx = await boxes(s2.page, s2.rr);
ok('2 own colour: quote #d0306a with place, pink boxes', q.length === 2 && q[1].c === '#d0306a' && q[1].pdf && /rgba\(208, ?48, ?106/.test(bx.bg) && bx.cover, { q: q[1], bx });

// 3. reopen in «Страницы»: the page shows the boxes again
await p.evaluate(async (id) => { await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); S.progress[id] = { ratio: 0, pos: 0 }; save(); openBook(id); await new Promise(r => setTimeout(r, 3500)); }, bid);
bx = await p.evaluate((r) => { const tl = document.getElementById('pdfText'), b = tl.getBoundingClientRect(); const bs = [...tl.querySelectorAll('.pdfhls i')]; const hit = bs.find(x => { const q = x.getBoundingClientRect(); return Math.abs((q.left - b.left) / b.width - r[0]) < .003 && Math.abs((q.top - b.top) / b.height - r[1]) < .003; }); return { n: bs.length, cover: !!hit, bg: hit ? hit.className + ' ' + hit.style.getPropertyValue('--hc') : '' }; }, (await quotes())[0].pdf.r[0]);
ok('3 reopen in «Страницы» on page 1: green boxes are back over the same words', s1.page !== 0 || (bx.n >= 2 && bx.cover && /hl-g/.test(bx.bg)), { page: s1.page, bx });

// 4. «Страницы»: a new colour quote is painted at once
let s4 = await select(1); await sleep(300); await tap('#spColors button[data-c="b"]');
q = await quotes(); bx = await boxes(s4.page, s4.rr);
ok('4 «Страницы»: blue → quote with place, blue boxes at once', q.length === 3 && q[2].c === 'b' && q[2].pdf && q[2].pdf.p === s4.page && /hl-b/.test(bx.bg) && bx.cover, { q: q[2], bx });
await p.screenshot({ path: SHOTS + 'pdfhl-page.png' });
// 4b the blue box sits on the printed words (canvas ink), not above them
const ink = await p.evaluate(() => { const b = document.querySelector('#pdfText .pdfhls i.hl-b').getBoundingClientRect(), cv = document.querySelector('#pdfWrap canvas'), cr = cv.getBoundingClientRect(), k = cv.width / cr.width, ctx = cv.getContext('2d');
  const x0 = Math.round((b.left - cr.left) * k), x1 = Math.round((b.right - cr.left) * k), c = (b.top + b.bottom) / 2; let top = null, bot = null;
  const dark = (y) => { const d = ctx.getImageData(x0, Math.round((y - cr.top) * k), x1 - x0, 1).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 400) n++; return n > 2; };
  for (let y = c; y > b.top - 8 && dark(y); y -= 0.5) top = y; for (let y = c; y < b.bottom + 8 && dark(y); y += 0.5) bot = y;
  return { box: [b.top, b.bottom].map(v => +v.toFixed(1)), ink: [top, bot] }; });
ok('4b the box covers the printed line: ink inside the box (±1 px)', ink.ink[0] != null && ink.ink[0] >= ink.box[0] - 1 && ink.ink[1] <= ink.box[1] + 1, ink);

// 5. several lines (Джессика 21.10 «не очень эстетично»): one even box per line, neighbours touch but never overlap, no box wider than the text
const m5 = await p.evaluate(() => {
  const tl = document.getElementById('pdfText'), sp = [...tl.querySelectorAll('span')].filter(s => s.textContent.trim().length > 12 && s.getBoundingClientRect().top > 300 && s.getBoundingClientRect().bottom < innerHeight - 280);
  const a = sp[0], z = sp[4]; const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(a.firstChild, 3); rg.setEnd(z.firstChild, Math.min(8, z.firstChild.length)); g.addRange(rg); updSelPop();
  const xs = sp.slice(0, 5).map(s => s.getBoundingClientRect()); return { l: Math.min(...xs.map(r => r.left)), r: Math.max(...xs.map(r => r.right)), n0: S.quotes[R.book.id].length };
}); await sleep(300); await tap('#spColors button[data-c="o"]');
const g5 = await p.evaluate((n0) => { const q = S.quotes[R.book.id][n0]; const tl = document.getElementById('pdfText'), b = tl.getBoundingClientRect();
  const bs = [...tl.querySelectorAll('.pdfhls i.hl-o')].map(x => x.getBoundingClientRect()).sort((u, v) => u.top - v.top);
  return { rs: q && q.pdf && q.pdf.r.length, n: bs.length, overlap: bs.some((u, i) => i && u.top < bs[i - 1].bottom - 0.5), l: Math.min(...bs.map(u => u.left)), r: Math.max(...bs.map(u => u.right)), tw: b.width }; }, m5.n0);
ok('5 five lines → five boxes (one per line), no overlaps, inside the text column', g5.rs === 5 && g5.n === 5 && !g5.overlap && g5.l >= m5.l - 2 && g5.r <= m5.r + 2, { g5, m5 });
// 5b. old data with a whole-width container box and doubled line boxes is drawn clean
const g5b = await p.evaluate(() => { S.quotes[R.book.id].push({ text: 'x', note: '', date: today(), c: 'p', pdf: { p: R.page, r: [[0, 0.5, 1, 0.06], [0.1, 0.5, 0.3, 0.02], [0.1, 0.51, 0.3, 0.021], [0.1, 0.515, 0.5, 0.02]] } }); pdfHlRefresh();
  const tl = document.getElementById('pdfText'), b = tl.getBoundingClientRect(); const bs = [...tl.querySelectorAll('.pdfhls i.hl-p')].map(x => x.getBoundingClientRect()); S.quotes[R.book.id].pop(); pdfHlRefresh();
  return { n: bs.length, wide: bs.some(u => u.width > b.width * 0.9) }; });
ok('5b old quote with a whole-width box and doubled lines → one box, not full width', g5b.n === 1 && !g5b.wide, g5b);
await p.screenshot({ path: SHOTS + 'pdfhl-lines.png' });

// 6. Джессика 21.10 «выделяю два цвета на одной странице — выбрасывает»: a real tap / click on a dot at the right edge of the bar keeps the page
await p.evaluate(async () => { jumpTo(2); await new Promise(r => setTimeout(r, 1500)); });
for (const how of ['touch', 'mouse']) {
  const s6 = await select(3); await sleep(300);
  const pt = await p.evaluate(() => { SA.bar = true; selMiniApply(); selPlace(); /* 27.10: the bar is a circle while selecting */ const r = document.querySelector('#spColors button[data-c="o"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, pg: R.page, n: S.quotes[R.book.id].length }; });
  if (how === 'touch') await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y);
  await sleep(700);
  const a6 = await p.evaluate(() => ({ pg: R.page, n: S.quotes[R.book.id].length }));
  ok('6 «Страницы», page 3: ' + how + ' on the orange dot (right half of the screen) saves the quote and stays on the page', s6 && pt.pg === 2 && pt.x > 195 && a6.pg === pt.pg && a6.n === pt.n + 1, { pt, a6 });
}
// 7. Джессика 21.10 «нажимаю на цитаты — бросает в ебеня»: a quote in the reader's list opens its own page (+ «вернуться»)
const far = await p.evaluate(async () => { const to = 7; jumpTo(to); await new Promise(r => setTimeout(r, 1500)); return R.page; });
const qi = await p.evaluate(() => S.quotes[R.book.id].length - 1); // the orange quote on page 3
const want = (await quotes())[qi].pdf.p;
await p.evaluate(async (i) => { renderPanel('qts'); }, qi).catch(() => {});
const btn = await p.evaluate((i) => { const t = [...document.querySelectorAll('#panel .pq .pqt')][i]; if (t) t.click(); const b = document.querySelector('#panel .pq.on .pqgo'); if (b) b.click(); return !!b; }, qi); await sleep(1800);
let a7 = await p.evaluate(() => ({ pg: R.page, back: !document.getElementById('jumpBack').classList.contains('hidden'), panel: document.getElementById('panel').classList.contains('hidden') }));
ok('7 panel «Цитаты» → the quote\'s page (not page 1), «вернуться» shown, panel closed', btn && far === 7 && want === 2 && a7.pg === want && a7.back && a7.panel, { btn, far, want, a7 });
// 7b an older PDF quote saved without its place: found by its words, the place is remembered
const n7 = await p.evaluate(async (i) => { const q = S.quotes[R.book.id][i], c = { text: q.text, note: '', date: today(), c: 'g' }; S.quotes[R.book.id].push(c); save(); jumpTo(Math.min(R.pageCount - 1, q.pdf.p + 4)); await new Promise(r => setTimeout(r, 1500)); await quoteGo(S.quotes[R.book.id].length - 1); await new Promise(r => setTimeout(r, 1500));
  const z = S.quotes[R.book.id].pop(); save(); return { pg: R.page, want: q.pdf.p, saved: z.pdf && z.pdf.p }; }, m5.n0);
ok('7b old PDF quote without q.pdf: found by its words on its page, place remembered', n7.pg === n7.want && n7.saved === n7.want, n7);
// 8. Джессика 25.10 (видео «сатанинский» текст): on a PDF page the skin's dots (butterfly pollen, celestial star dust) never sit on the letters,
// and a tapped quote is underlined, not ringed line by line
const s8 = await p.evaluate(async () => {
  S.gold = 5000; save(); for (const k of ['skin-babochkovyi', 'skin-celestial']) { try { buy(k); } catch (e) {} }
  const i = document.querySelector('.pdfhls i'); if (!i) return null; const out = {};
  for (const k of ['babochkovyi', 'celestial']) { SET.theme = k; saveSet(); applySet(); await new Promise(r => setTimeout(r, 200)); out[k] = getComputedStyle(i).backgroundImage.includes('radial-gradient'); }
  i.classList.add('qon'); const cs = getComputedStyle(i); out.ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0; out.under = cs.boxShadow; i.classList.remove('qon');
  return out; });
ok('8 PDF quote in Бабочковый / Небесный: no dots over the letters; tapped quote underlined, not ringed', s8 && !s8.babochkovyi && !s8.celestial && !s8.ring && /2px/.test(s8.under), s8);
// 9. 26.10: «Прокрутка» in a PDF — a selection end held at the bottom edge scrolls on by half a screen and the selection follows onto the next page
const s9 = await p.evaluate(async (id) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode: 'scroll' }); rqSaveSetGated(); S.progress[id] = { ratio: 0, pos: 0 }; save(); openBook(id); await w(3500);
  const box = psBox(), br = box.getBoundingClientRect();
  const sp = [...box.querySelectorAll('.textLayer span')].filter(x => x.textContent.trim().length > 5);
  const top = sp.find(x => { const r = x.getBoundingClientRect(); return r.top > br.top + 100 && r.bottom < br.top + 300; });
  const low = sp.filter(x => { const r = x.getBoundingClientRect(); return r.bottom < br.bottom && r.bottom > br.bottom - 60; }).pop();
  if (!top || !low) return { none: true, top: !!top, low: !!low };
  const g = getSelection(); g.removeAllRanges(); g.setBaseAndExtent(top.firstChild, 0, top.firstChild, 3); await w(300);
  const mid = sp.find(x => { const r = x.getBoundingClientRect(); return r.top > br.top + 350 && r.bottom < br.bottom - 120; }); if (mid) g.extend(mid.firstChild, 2); await w(150);
  g.extend(low.firstChild, low.firstChild.length); await w(300); const st0 = box.scrollTop, len0 = String(g).length, hint = el('selEdge') && el('selEdge').className;
  await w(1100); return { st0, st1: box.scrollTop, len0, len1: String(g).length, hint }; }, bid);
ok('9 PDF «Прокрутка»: end held at the bottom → hint, half a screen down, the selection grows', s9.hint === 'next' && s9.st1 > s9.st0 + 150 && s9.len1 > s9.len0, s9);
// 10. 27.10 (Джессика: «стрелочку … выделение на предыдущих страницах никуда не исчезало … индикатор»): PDF «Страницы» — › with a selection
// turns the page, the part already selected is kept (chip «Выделено со стр. N»), the first word of the new page is selected; a colour saves ONE quote on both pages
const s10 = await p.evaluate(async (id) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); S.quotes[id] = []; S.hl[id] = []; S.progress[id] = { ratio: 0, pos: 0 }; save(); openBook(id); await w(3500);
  goPage(2, true); await w(1500);
  const sp = [...el('pdfText').querySelectorAll('span')].filter(x => x.textContent.trim().length > 12); const t = sp[sp.length - 1].firstChild;
  const g = getSelection(); g.removeAllRanges(); g.setBaseAndExtent(t, 0, t, Math.min(10, t.length)); const t0 = String(g); await w(400);
  const nav = !el('selNav').hidden; el('selNext').click(); await w(2000);
  const out = { nav, page: R.page, sel: String(getSelection()), chip: !el('selFrom').hidden && el('selFromGo').textContent, x: !el('selFromX').hidden };
  updSelPop(); await w(250); document.querySelector('#spColors button[data-c="g"]').click(); await w(500);
  const qs = S.quotes[id]; out.n = qs.length; const q = qs[0]; out.p = q && q.pdf.p; out.more = q && (q.pdf.more || []).map(x => x.p); out.text = q && q.text; out.t0 = t0;
  out.here = el('pdfText').querySelectorAll('.pdfhls i[data-q]').length; out.nav2 = el('selNav').hidden;
  goPage(2, true); await w(1500); out.there = el('pdfText').querySelectorAll('.pdfhls i[data-q]').length; out.pend = el('pdfText').querySelectorAll('.pdfhls i.pend').length;
  return out; }, bid);
ok('10 PDF «Страницы»: › keeps the selection (chip), next page selected, one quote on pages 3 and 4', s10.nav && s10.page === 3 && s10.sel.length > 0 && /Выделено со стр/.test(s10.chip || '') && s10.x && s10.n === 1 && s10.p === 2 && JSON.stringify(s10.more) === '[3]' && s10.text.startsWith(s10.t0.trim()) && s10.text.endsWith(s10.sel.trim()) && s10.here > 0 && s10.there > 0 && !s10.pend && s10.nav2, s10);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
