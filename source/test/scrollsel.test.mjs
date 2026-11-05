// 05.11 (Джессика, видео): «когда я хочу продолжить выделение во время режима прокрутки, оно останавливается. И я не могу выделять с помощью
// тапа» + «плашку, когда ты выделяешь, с цветами и прочими настройками, можно было перемещать пальцем по экрану».
// «Прокрутка»: the end dragged by a finger (after a long press, by the handle) never scrolls the text under it, near the bottom edge the text
// scrolls on and the end follows; a finger right of a paragraph's last line does not stop the end (smWord past the text threw); a tap moves the end.
// The menu (looks other than «Сбоку»): dragged by a finger, stays there (SET.selPin), a button under the finger is not pressed, a double tap
// on its strip gives the place back.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node scrollsel.test.mjs   (SHOTS=dir to save screenshots)
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
await p.evaluate(async () => {
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'scroll', anim: 'none' }); SET.selLook = 'dock'; saveSet(); applySet && applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
  goPage(2, false); await new Promise(r => setTimeout(r, 400));
});
const cdp = await p.target().createCDPSession();
const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const st = () => p.evaluate(() => ({ on: SM.on, len: String(getSelection()).length, top: Math.round(el('viewer').scrollTop), lock: el('reader').classList.contains('smlock') }));
const clear = () => p.evaluate(async () => { selDone(); await new Promise(r => setTimeout(r, 900)); });
ok('scroll mode is on', await p.evaluate(() => rqScrollMode()));

// 1. long press, the finger goes on down to the bottom edge and waits there: the text scrolls, the end follows; nothing scrolls by the finger itself
const t0 = (await st()).top;
await T('touchStart', 150, 260); await sleep(700);
const a1 = await st();
ok('long press: a word is selected, the text is locked under the finger', a1.on && a1.len > 0 && a1.lock && a1.top === t0, a1);
for (let i = 1; i <= 20; i++) { await T('touchMove', 150, 260 + i * 15); await sleep(16); }
const b1 = await st();
ok('dragging down inside the screen: the end follows, the text stays', b1.len > a1.len && b1.top === t0, b1);
for (let i = 1; i <= 10; i++) { await T('touchMove', 150, 560 + i * 25); await sleep(16); }
await sleep(800);
const c1 = await st();
ok('held near the bottom edge: the text scrolls on by itself and the selection grows with it', c1.top > t0 + 100 && c1.len > b1.len + 100, { t0, c1 });
await T('touchEnd'); await sleep(300);
const d1 = await st(); await sleep(400); const d1b = await st();
ok('lifted: the selection stays, the text stops and scrolls by a finger again', d1.on && d1.len >= c1.len && !d1.lock && d1b.top === d1.top && d1b.len === d1.len, { d1, d1b });

// 2. a tap further down moves the end; a tap right of a paragraph's last line too (no error)
const e2 = await p.evaluate(() => { const v = el('viewer').getBoundingClientRect(); const ps = [...el('content').querySelectorAll('p')].filter(x => { const r = x.getBoundingClientRect(); return r.top > v.top + 300 && r.bottom < el('selSide').getBoundingClientRect().top - 12 && x.textContent.trim().length > 60; });
  const q = ps.find(x => { const rs = x.getClientRects(); const rg = document.createRange(); rg.selectNodeContents(x); const l = [...rg.getClientRects()].pop(); return l && l.right < v.right - 80; });
  if (!q) return null; const rg = document.createRange(); rg.selectNodeContents(q); const l = [...rg.getClientRects()].pop(); return { x: Math.min(v.right - 10, l.right + 40), y: l.top + l.height / 2, tail: q.textContent.trim().slice(-6) }; });
const n0 = errs.length, l0 = (await st()).len;
if (e2) { await T('touchStart', e2.x, e2.y); await sleep(60); await T('touchEnd'); await sleep(400); }
const f2 = await p.evaluate(() => ({ len: String(getSelection()).length, tail: String(getSelection()).trim().slice(-6) }));
ok('a tap right of a paragraph\'s last line: the end goes to that paragraph\'s end, no error', !!e2 && errs.length === n0 && f2.len !== l0 && f2.tail === e2.tail, { e2, f2, errs: errs.slice(n0) });
await clear();

// 3. the handle: a finger on it locks the text, a drag across paragraph ends never throws, at the bottom it scrolls on
await p.evaluate(() => { el('viewer').scrollTop = Math.max(0, el('viewer').scrollTop - 900); });
await sleep(300);
await T('touchStart', 150, 200); await sleep(700); await T('touchEnd'); await sleep(300);
await T('touchStart', 220, 330); await sleep(60); await T('touchEnd'); await sleep(400);
const h = await p.evaluate(() => { const e = el('smHi'); return e && !e.hidden ? { x: parseFloat(e.style.left), y: parseFloat(e.style.top) + 24 } : null; });
const g3 = await st(); const n3 = errs.length;
if (h) { await T('touchStart', h.x, h.y); }
const lk3 = (await st()).lock;
if (h) { for (let i = 1; i <= 60; i++) { await T('touchMove', h.x + ((i * 7) % 120) - 60, Math.min(820, h.y + i * 9)); await sleep(16); } await sleep(700); await T('touchEnd'); await sleep(300); }
const i3 = await st();
ok('the handle: the text is locked while it is held, the end goes on below the screen, no error', !!h && lk3 && i3.len > g3.len + 200 && i3.top > g3.top && !i3.lock && errs.length === n3, { h, lk3, g3, i3, errs: errs.slice(n3) });

// 4. the menu «Полоса снизу» is dragged by a finger to the middle and stays there
await sleep(300);
const m0 = await p.evaluate(() => { const n = el('selSide'); const r = n.getBoundingClientRect(); return { hidden: n.hidden, look: n.dataset.look, top: Math.round(r.top), bot: Math.round(r.bottom) }; });
ok('the menu «Полоса снизу» is shown while selecting', !m0.hidden && m0.look === 'dock', m0);
if (SHOTS) await p.screenshot({ path: SHOTS + '/1-polosa-do.png' });
const btn = await p.evaluate(() => { const r = el('ssCopy').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const copied0 = await p.evaluate(() => (window.__rqCopied = 0, 0));
await p.evaluate(() => { const c = el('ssCopy'); c.addEventListener('click', () => { window.__rqCopied++; }, true); });
await T('touchStart', btn.x, btn.y); for (let i = 1; i <= 15; i++) { await T('touchMove', btn.x + i, btn.y - i * 25); await sleep(16); } await T('touchEnd'); await sleep(500);
const m1 = await p.evaluate(() => { const n = el('selSide'); const r = n.getBoundingClientRect(); return { top: Math.round(r.top), pin: SET.selPin && SET.selPin.dock, pinned: n.classList.contains('pinned'), copied: window.__rqCopied, sel: String(getSelection()).length }; });
ok('dragged by a finger from a button: the menu moved up with the finger, its place is remembered, the button is not pressed', Math.abs(m1.top - (m0.top - 375)) < 30 && m1.pin && m1.pinned && m1.copied === 0 && m1.sel > 0, m1);
// the selection changes (a tap) — the menu does not jump
const tp = await p.evaluate(() => { const v = el('viewer').getBoundingClientRect(); return { x: v.left + 120, y: Math.max(v.top + 40, el('selSide').getBoundingClientRect().top - 60) }; });
await T('touchStart', tp.x, tp.y + 200 < 800 ? tp.y + 200 : tp.y); await sleep(60); await T('touchEnd'); await sleep(900);
const m2 = await p.evaluate(() => { const r = el('selSide').getBoundingClientRect(); return { top: Math.round(r.top), attop: el('selSide').classList.contains('attop') }; });
ok('the selection changed: the menu stays where it was put', Math.abs(m2.top - m1.top) <= 1 && !m2.attop, { m1: m1.top, m2 });
if (SHOTS) await p.screenshot({ path: SHOTS + '/2-polosa-peretashchena.png' });
// a new selection, the reader reopened — the same place
await clear();
await T('touchStart', 150, 300); await sleep(700); await T('touchEnd'); await sleep(600);
const m3 = await p.evaluate(() => { const r = el('selSide').getBoundingClientRect(); return { top: Math.round(r.top), hidden: el('selSide').hidden }; });
ok('a new selection: the menu is at the same place', !m3.hidden && Math.abs(m3.top - m1.top) <= 1, m3);
// a double tap on the strip: back to its own place
const sp = await p.evaluate(() => { const r = el('ssMove').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.touchscreen.tap(sp.x, sp.y); await sleep(120); await p.touchscreen.tap(sp.x, sp.y); await sleep(500);
const m4 = await p.evaluate(() => { const r = el('selSide').getBoundingClientRect(); return { top: Math.round(r.top), pin: SET.selPin && SET.selPin.dock || null }; });
ok('a double tap on the strip on top: the menu goes back to its own place', !m4.pin && Math.abs(m4.top - m0.top) <= 2, { m0: m0.top, m4 });
await clear();

// 5. «Плашка»: dragged anywhere (left and up), remembered for this look only
await p.evaluate(() => { SET.selLook = 'bar'; saveSet(); });
await T('touchStart', 150, 300); await sleep(700); await T('touchEnd'); await sleep(600);
const b0 = await p.evaluate(() => { const r = el('selSide').getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), look: el('selSide').dataset.look }; });
const bs = await p.evaluate(() => { const r = el('ssMove').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + 4 }; });
await T('touchStart', bs.x, bs.y); for (let i = 1; i <= 12; i++) { await T('touchMove', bs.x - i * 4, bs.y - i * 30); await sleep(16); } await T('touchEnd'); await sleep(500);
const b1x = await p.evaluate(() => { const r = el('selSide').getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), pin: SET.selPin }; });
ok('«Плашка»: moved by the strip, whole on screen, remembered for «Плашка» only', b0.look === 'bar' && b1x.t < b0.t - 300 && b1x.l >= 0 && b1x.r <= 390 && b1x.pin.bar && !b1x.pin.dock, { b0, b1x });
if (SHOTS) await p.screenshot({ path: SHOTS + '/3-plashka-peretashchena.png' });
await clear();

// 6. page mode: nothing of it — the text is never locked (no scroller), long press + drag works as before
await p.evaluate(async () => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); SET.selLook = 'side'; saveSet(); applySet(); relayout({ force: true }); await new Promise(r => setTimeout(r, 800)); });
await T('touchStart', 150, 260); await sleep(700); const p6 = await st(); for (let i = 1; i <= 10; i++) { await T('touchMove', 150, 260 + i * 15); await sleep(16); } await T('touchEnd'); await sleep(300);
const q6 = await st();
ok('page mode: long press + drag selects as before, no lock', p6.on && !p6.lock && q6.len > p6.len && !q6.lock, { p6, q6 });

ok('no page errors', errs.length === 0, errs);
console.log(checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
