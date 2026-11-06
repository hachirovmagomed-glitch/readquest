// 06.11 (Джессика: «в карандашном скине почему-то нельзя двигать плашку с цветами выделения … во всех скинах … сворачивать в боковое меню,
// если прижать её влево или вправо, или вверх, или вниз»; «почему во время выделения появляются белые пятна»).
// The bar of a tapped saved quote is dragged by a finger and stays there (SET.selPin.quote); any of these menus let go at an edge folds into a
// round tab there (SET.selFold), a tap on the tab opens it by that edge. Every skin. The selection in the book text is painted as solid line bands.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node menufold.test.mjs  (SHOTS=dir)
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const cdp = await p.target().createCDPSession();
const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const drag = async (x, y, x2, y2) => { await T('touchStart', x, y); for (let i = 1; i <= 14; i++) { await T('touchMove', x + (x2 - x) * i / 14, y + (y2 - y) * i / 14); await sleep(16); } await T('touchEnd'); await sleep(500); };
const tap = async (x, y) => { await T('touchStart', x, y); await sleep(60); await T('touchEnd'); await sleep(500); };
const box = (sel) => p.evaluate((sel) => { const n = document.querySelector(sel); const r = n.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), cx: r.left + r.width / 2, cy: r.top + r.height / 2, folded: n.classList.contains('folded'), hidden: n.classList.contains('hidden') || n.hidden }; }, sel);
await p.evaluate(async () => { const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  S.quotes[bk.id] = []; S.hl[bk.id] = []; SET.selPin = {}; SET.selFold = {}; SET.align = 'justify';
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); SET.selLook = 'bar'; saveSet(); applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); goPage(2, false); await new Promise(r => setTimeout(r, 400)); });

// 1. the selection: solid bands, Chrome's own colour off
await T('touchStart', 150, 200); await sleep(700); await T('touchEnd'); await sleep(400); await tap(250, 560); await sleep(3300);
const sp = await p.evaluate(() => { const b = el('selPaint'), is = b ? [...b.children].map(i => i.getBoundingClientRect()) : []; let touching = 0; for (let k = 0; k + 1 < is.length; k++) if (Math.abs(is[k].bottom - is[k + 1].top) < 1) touching++;
  return { own: el('reader').classList.contains('ownsel'), bands: is.length, touching, sel: getComputedStyle(document.querySelector('#content p'), '::selection').backgroundColor, len: String(getSelection()).length }; });
ok('the selection in the text: our solid bands, one per line, neighbouring lines touch; Chrome\'s colour is off', sp.own && sp.bands >= 4 && sp.touching >= sp.bands - 3 && /0\)$|transparent/.test(sp.sel) && sp.len > 50, sp);
if (SHOTS) await p.screenshot({ path: SHOTS + '/1-vydelenie.png' });

// 2. the selection menu «Плашка» let go at the left edge: folds into a tab there; a tap on the tab opens it by the left edge
let m = await box('#selSide');
await drag(m.l + 20, m.t + 6, 6, 420);
let f = await box('#selSide');
ok('«Плашка» let go at the left edge: a round tab at the left edge, remembered', f.folded && f.w <= 50 && f.l <= 4 && Math.abs(f.cy - 420) < 30 && await p.evaluate(() => SET.selFold.bar && SET.selFold.bar.e === 'L'), f);
if (SHOTS) await p.screenshot({ path: SHOTS + '/2-svernuta-vlevo.png' });
await tap(f.cx, f.cy);
let o = await box('#selSide');
ok('a tap on the tab: the menu is back, by the left edge, the selection still there', !o.folded && o.l <= 2 && o.w > 200 && await p.evaluate(() => String(getSelection()).length > 50), o);
// to the top: a tab at the top
await drag(o.l + 30, o.t + 6, 200, 12);
f = await box('#selSide');
ok('let go at the top: a tab at the top edge', f.folded && f.t <= 12 && Math.abs(f.cx - 200) < 30, f);
await tap(f.cx, f.cy);
await p.evaluate(() => { selDone(); }); await sleep(400);

// 3. a saved quote in every skin: its bar moves by a finger, and folds at the bottom / right
const skins = await p.evaluate(() => ['', 'pencil', 'ellada', 'babochkovyi', 'celestial', 'alisa'].filter(k => !k || (typeof SKINS === 'undefined' || true)));
for (const sk of skins) {
  await p.evaluate(async (sk) => { if (sk) document.documentElement.dataset.skin = sk; else delete document.documentElement.dataset.skin; SET.selPin = {}; SET.selFold = {}; saveSet();
    S.quotes[R.book.id] = []; S.hl[R.book.id] = []; save(); document.querySelectorAll('#content mark').forEach(m => { const t = document.createTextNode(m.textContent); m.replaceWith(t); t.parentNode.normalize(); }); goPage(2, false); await new Promise(r => setTimeout(r, 300));
    const v = el('viewer').getBoundingClientRect(); let a = null; for (let y = v.top + 150; !a && y < v.bottom - 100; y += 7) a = smPt(v.left + v.width / 2, y); const w = smWord(a); getSelection().setBaseAndExtent(w[0][0], w[0][1], w[1][0], w[1][1]); await new Promise(r => setTimeout(r, 200)); addQuote(false, 'g'); await new Promise(r => setTimeout(r, 600)); }, sk);
  const mk = await p.evaluate(() => { const r = document.querySelector('#content mark').getClientRects()[0]; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await tap(mk.x, mk.y);
  const q0 = await box('#selpop');
  await drag(q0.cx, q0.t + 8, q0.cx - 20, q0.t + 8 + (q0.t > 400 ? -250 : 250));
  const q1 = await box('#selpop');
  const pin = await p.evaluate(() => SET.selPin.quote);
  ok('skin ' + (sk || 'default') + ': the bar of a tapped quote moves by a finger and stays there', !q1.hidden && Math.abs(Math.abs(q1.t - q0.t) - 250) < 20 && !!pin && await p.evaluate(() => el('selpop').classList.contains('qmode')), { q0, q1, pin });
  if (SHOTS && sk === 'pencil') await p.screenshot({ path: SHOTS + '/3-citata-peretashchena.png' });
  const pg0 = await p.evaluate(() => R.page);
  await drag(q1.cx, q1.t + 8, 385, q1.t + 8);
  ok('skin ' + (sk || 'default') + ': dragging the bar to the edge does not turn the page', await p.evaluate(() => R.page) === pg0, pg0);
  const q2 = await box('#selpop');
  ok('skin ' + (sk || 'default') + ': let go at the right edge — a tab at the right', q2.folded && q2.r >= 380 && q2.w <= 50, q2);
  if (SHOTS && sk === 'pencil') await p.screenshot({ path: SHOTS + '/4-citata-svernuta.png' });
  await tap(q2.cx, q2.cy);
  const q3 = await box('#selpop');
  const tabVis = await p.evaluate(() => getComputedStyle(el('selpop').querySelector('.foldTab')).display);
  ok('skin ' + (sk || 'default') + ': the open bar shows no fold-tab icon', tabVis === 'none', tabVis);
  ok('skin ' + (sk || 'default') + ': tap on the tab — the bar again, by the right edge, colours work', !q3.folded && q3.r >= 386 && q3.w > 200, q3);
  await p.evaluate(() => { quoteClose(); el('selpop').classList.add('hidden'); });
}
ok('no page errors', errs.length === 0, errs);
console.log(checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
