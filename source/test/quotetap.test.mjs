// A tap on a saved highlight (Джессика 22.10, like ReadEra: «можно нажимать на текст, который ты выделил, и с ним взаимодействовать»)
// + PDF selection follows the finger («PDF более отзывчивы к выделению текста»).
// Text book and PDF: a tap on a saved quote opens the bar for it (outlined, ring on its colour, «Удалить» and «Все цитаты»), no page turn;
// a colour recolours it, «Заметка» edits its note, «Удалить» removes it (text stays), the next tap elsewhere only closes the bar.
// PDF: with text selected, a one-finger drag / swipe never flips or pans the page; a finger resting on the page then moving is a selection, not a swipe.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_PDF=/workspace/rqtest/pdf/b-nolabels-40.pdf] [RQ_SHOTS=/workspace/out] node quotetap.test.mjs
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
const touchAt = async (x, y) => { await p.touchscreen.tap(x, y); await sleep(500); };
const bar = () => p.evaluate(() => { const b = document.getElementById('selpop'), r = b.getBoundingClientRect(), vis = (id) => { const x = document.getElementById(id); return !!x && !!x.offsetParent; };
  return { shown: !b.classList.contains('hidden'), q: b.classList.contains('qmode'), on: [...document.querySelectorAll('#spColors button.on')].map(x => x.dataset.c || x.id).join(), del: vis('spDel'), all: vis('spAll'), hl: !!document.getElementById('spHl'),
    l: Math.round(r.left), r: Math.round(r.right), rows: new Set([...b.querySelectorAll(':scope > button')].filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().top))).size, page: R.page }; });

// 1. text book: make a green quote on the visible page, then tap it
const mk = await p.evaluate(() => { const c = document.getElementById('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let x;
  while ((x = w.nextNode())) { if (x.parentElement.tagName !== 'P' || x.length < 40) continue; const q = document.createRange(); q.setStart(x, 4); q.setEnd(x, 30); const r = q.getBoundingClientRect();
    if (r.top > 100 && r.bottom < innerHeight - 260 && r.left >= 0 && r.right <= innerWidth && r.height < 40) { const g = getSelection(); g.removeAllRanges(); g.addRange(q); updSelPop(); return String(g).trim(); } } return null; });
await sleep(300); await tap('#spColors button[data-c="g"]');
const mc = () => p.evaluate(() => { const m = document.querySelector('#content mark'); if (!m) return null; const r = m.getClientRects()[0]; return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2, cls: m.className, t: m.textContent }; });
let m1 = await mc(); const pg0 = await p.evaluate(() => R.page);
await touchAt(m1.x, m1.y);
let b1 = await bar();
ok('1 tap on a saved highlight: its bar (ring on green, «Удалить», «Все цитаты»; no «Цитата» marker at all), outlined, no page turn', mk && b1.shown && b1.q && b1.on === 'g' && b1.del && b1.all && !b1.hl && /qon/.test((await mc()).cls) && b1.page === pg0, { mk, b1 });
ok('1b the bar for a quote fits 360 (inside the screen, actions in one row)', b1.l >= 0 && b1.r <= 360 && b1.rows === 1, b1);
await p.screenshot({ path: SHOTS + 'quotetap-text.png' });

// 2. blue recolours it, no copy, bar closed
const n2 = await p.evaluate((id) => S.quotes[id].length, ids[0]);
await tap('#spColors button[data-c="b"]');
let q2 = await p.evaluate((id) => S.quotes[id].map(q => q.c), ids[0]); m1 = await mc(); b1 = await bar();
ok('2 blue on the tapped quote: recoloured (mark hl-b), still one quote, bar closed', q2.length === n2 && q2[0] === 'b' && m1.cls === 'hl-b' && !b1.shown, { q2, m1, b1 });

// 3. «Заметка» edits its note
await touchAt(m1.x, m1.y); await tap('#spNote'); await p.keyboard.type('мысль'); await tap('#rqAskOk');
const n3 = await p.evaluate((id) => S.quotes[id][0].note, ids[0]);
ok('3 «Заметка» on the tapped quote edits its note', n3 === 'мысль', n3);

// 4. «Объясни» / copy take the quote's text: copy closes the bar
await touchAt(m1.x, m1.y); const st = await p.evaluate(() => selText()); await tap('#spCopy'); b1 = await bar();
ok('4 copy / dictionary / «Объясни» take the quote\'s words; copy closes the bar', st === m1.t && !b1.shown, { st, b1 });

// 5. tap elsewhere with the bar open: only closes it (no page turn); next tap turns as usual
await touchAt(m1.x, m1.y); await touchAt(330, 420); b1 = await bar();
ok('5 tap elsewhere (right side) with the bar open: bar closed, page not turned', !b1.shown && b1.page === pg0 && !(await mc()).cls.includes('qon'), b1);

// 6. «Все цитаты» opens the list
await touchAt(m1.x, m1.y); await tap('#spAll');
const pn = await p.evaluate(() => ({ open: !document.getElementById('panel').classList.contains('hidden'), tab: document.getElementById('tabQts').classList.contains('on'), n: document.querySelectorAll('#panelBody .pq').length }));
ok('6 «Все цитаты» opens the quotes list of the book', pn.open && pn.tab && pn.n === 1, pn);
// 6b Джессика 22.10: a tap on a quote in the list opens it — whole text and note, the skin's own «current» look, «Открыть в книге»; a second tap closes it
await p.evaluate((id) => { S.quotes[id].push({ text: 'Длинная цитата из другого места книги, и ещё очень длинный хвост, который в закрытом виде не помещается', note: 'мысль', date: today(), c: 'p' }); save(); renderPanel('qts'); }, ids[0]);
const o6 = async () => p.evaluate(() => { const r = [...document.querySelectorAll('#panelBody .pq')].at(-1), t = r.querySelector('.ptt').textContent, cs = getComputedStyle(r);
  return { on: r.classList.contains('on'), full: !t.includes('…'), note: !!r.querySelector('.pqn'), go: !!r.querySelector('.pqgo'), bg: cs.backgroundColor, sh: cs.boxShadow, bd: cs.borderTopStyle + cs.borderTopWidth }; });
const c6 = await o6(); await p.evaluate(() => [...document.querySelectorAll('#panelBody .pq .pqt')].at(-1).click()); await sleep(200); const d6 = await o6();
const looks = {};
for (const k of ['sepia', 'pencil', 'ellada', 'babochkovyi', 'celestial']) { await p.evaluate((k) => { if (k !== 'sepia') { S.gold = 9000; save(); try { buy('skin-' + k); } catch (e) {} } SET.theme = k; saveSet(); applySet(); renderPanel('qts'); }, k); await sleep(250); const o = await o6(); looks[k] = o.bg + '|' + o.sh + '|' + o.bd; if (k === 'pencil' || k === 'celestial') await p.screenshot({ path: SHOTS + 'quotetap-list-' + k + '.png' }); }
await p.evaluate(() => [...document.querySelectorAll('#panelBody .pq .pqt')].at(-1).click()); await sleep(200); const e6 = await o6();
ok('6b list: closed = cut with «…»; a tap opens it whole with its note and «Открыть в книге»; a second tap closes', !c6.on && !c6.full && d6.on && d6.full && d6.note && d6.go && !e6.on, { c6, d6, e6 });
ok('6c the opened quote looks different in every skin (Обычный, Карандашный, Эллада, Бабочковый, Небесный)', new Set(Object.values(looks)).size === 5, looks);
await p.evaluate((id) => { S.quotes[id].pop(); save(); SET.theme = 'sepia'; saveSet(); applySet(); }, ids[0]);
await p.evaluate(() => document.getElementById('panel').classList.add('hidden'));

// 7. «Удалить» removes it: no quote, no mark, the words stay
await touchAt(m1.x, m1.y); await tap('#spDel');
const d7 = await p.evaluate((a) => ({ n: S.quotes[a.id].length, hl: (S.hl[a.id] || []).length, mark: !!document.querySelector('#content mark'), text: document.getElementById('content').textContent.includes(a.t) }), { id: ids[0], t: m1.t });
ok('7 «Удалить»: quote and highlight gone, the words stay in the book', d7.n === 0 && d7.hl === 0 && !d7.mark && d7.text, d7);

// 8. PDF «Страницы»: tap on a saved box
await p.evaluate(async (id) => { await closeReader({ quiet: true }); openBook(id); await new Promise(r => setTimeout(r, 3500)); }, ids[1]);
await p.evaluate(() => { const tl = document.getElementById('pdfText'), sp = [...tl.querySelectorAll('span')].filter(s => s.textContent.trim().length > 12 && s.getBoundingClientRect().top > 200 && s.getBoundingClientRect().bottom < innerHeight - 300);
  const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(sp[0].firstChild, 0); rg.setEnd(sp[0].firstChild, 10); g.addRange(rg); updSelPop(); });
await sleep(300); await tap('#spColors button[data-c="o"]');
const bc = () => p.evaluate(() => { const b = document.querySelector('#pdfText .pdfhls i'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: b.className }; });
let b8 = await bc(); const pp = await p.evaluate(() => R.page);
await touchAt(b8.x, b8.y); let s8 = await bar();
ok('8 PDF: tap on a saved box opens its bar (ring on orange, outlined), no page turn', b8 && s8.shown && s8.q && s8.on === 'o' && /qon/.test((await bc()).cls) && s8.page === pp, { b8, s8 });
await p.screenshot({ path: SHOTS + 'quotetap-pdf.png' });
await tap('#spColors button[data-c="g"]'); b8 = await bc();
ok('8b PDF: green recolours the boxes, one quote', /hl-g/.test(b8.cls) && (await p.evaluate((id) => S.quotes[id].length, ids[1])) === 1, b8);
await touchAt(b8.x, b8.y); await tap('#spDel');
ok('8c PDF: «Удалить» removes the quote and its boxes', !(await bc()) && (await p.evaluate((id) => S.quotes[id].length, ids[1])) === 0);

// 9. PDF: with text selected, a horizontal one-finger drag extends the selection, never flips the page
const sel9 = async () => p.evaluate(() => { const tl = document.getElementById('pdfText'), sp = [...tl.querySelectorAll('span')].filter(s => s.textContent.trim().length > 12 && s.getBoundingClientRect().top > 200)[1];
  const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(sp.firstChild, 0); rg.setEnd(sp.firstChild, 6); g.addRange(rg); const r = rg.getBoundingClientRect(); return { x: r.right, y: r.top + r.height / 2 }; });
let a9 = await sel9(); const p9 = await p.evaluate(() => R.page);
await p.touchscreen.touchStart(a9.x, a9.y); for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(a9.x - i * 25, a9.y); await sleep(20); } await p.touchscreen.touchEnd(); await sleep(800);
ok('9 PDF with text selected: a one-finger swipe does not flip the page', (await p.evaluate(() => R.page)) === p9, { p9, now: await p.evaluate(() => R.page) });
// 9b a finger resting on the page (long press) then moving is a selection, not a swipe
await p.evaluate(() => getSelection().removeAllRanges()); await sleep(300);
await p.touchscreen.touchStart(200, 400); await sleep(650); for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(200 - i * 25, 400); await sleep(20); } await p.touchscreen.touchEnd(); await sleep(800);
ok('9b PDF: rest then drag (long press) does not flip the page', (await p.evaluate(() => R.page)) === p9);
// 9c a quick swipe still flips
await p.touchscreen.touchStart(300, 400); for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(300 - i * 25, 400); await sleep(10); } await p.touchscreen.touchEnd(); await sleep(1500);
ok('9c PDF: a quick swipe without selection still flips', (await p.evaluate(() => R.page)) === p9 + 1, await p.evaluate(() => R.page));
ok('no page errors, no system dialogs', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
