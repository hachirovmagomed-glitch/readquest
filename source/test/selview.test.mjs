// 06.11 (Джессика: «чтобы все эти режимы выделения … между ними можно было переключаться в прямом режиме, не заходя постоянно в настройки»):
// «Вид» in the selection menu lists the five looks; a tap switches the menu at once, the selection stays; the setting is the same SET.selLook.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node selview.test.mjs   (SHOTS=dir)
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
await p.evaluate(() => { if (typeof rxS === 'function') { rxS().sm.tap = true; saveSet(); } }); /* 10.11: «Нажатие ставит конец» is off by default now; these checks are about it on */
await p.evaluate(async () => { const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); SET.selLook = 'bar'; saveSet(); applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); goPage(2, false); await new Promise(r => setTimeout(r, 400)); });
await p.touchscreen.touchStart(150, 300); await sleep(700); await p.touchscreen.touchEnd(); await sleep(500);
await p.touchscreen.tap(250, 360); await sleep(500);
const len0 = await p.evaluate(() => String(getSelection()).length);
const tapEl = async (id) => { const r = await p.evaluate((id) => { const b = el(id).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }, id); await p.touchscreen.tap(r.x, r.y); await sleep(400); return r; };
const v0 = await p.evaluate(() => ({ look: el('selSide').dataset.look, btn: !!el('ssView') && el('ssView').getBoundingClientRect().width > 0 }));
ok('the menu «Плашка» (10.11 one row) has no own «≡ Вид»: it is in «Ещё», as in «Сбоку»', v0.look === 'bar' && !v0.btn && len0 > 0, { v0, len0 });
await sleep(3300); /* the hint toast «Нажми на слово…» is gone */
const order = ['dock', 'bubble', 'big', 'side', 'bar'];
for (const lk of order) {
  const cur = await p.evaluate(() => SET.selLook);
  if (cur === 'side' || cur === 'bar') { await tapEl('ssMore'); const vb = await p.evaluate(() => { const r = el('ssMenu').querySelector('[data-a="view"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.touchscreen.tap(vb.x, vb.y); await sleep(400); } /* «Сбоку», «Плашка»: «⋮ → Вид меню» */
  else await tapEl('ssView');
  const m = await p.evaluate(() => ({ items: [...el('ssMenu').querySelectorAll('[data-look]')].map(b => [b.dataset.look, b.getAttribute('aria-checked')]), hidden: el('ssMenu').hidden }));
  if (SHOTS && lk === 'dock') await p.screenshot({ path: SHOTS + '/vid-1-spisok.png' });
  const b = await p.evaluate((lk) => { const r = el('ssMenu').querySelector('[data-look="' + lk + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, lk);
  await p.touchscreen.tap(b.x, b.y); await sleep(500);
  const s = await p.evaluate(() => ({ look: el('selSide').dataset.look, set: SET.selLook, menu: el('ssMenu').hidden, len: String(getSelection()).length, open: el('selSide').classList.contains('open'), shown: !el('selSide').hidden }));
  ok('«Вид» → ' + lk + ': five looks listed, a tap switches the menu at once, the selection stays', !m.hidden && m.items.length === 5 && s.look === lk && s.set === lk && s.menu && s.len === len0 && s.shown && s.open, { m, s });
  if (SHOTS) await p.screenshot({ path: SHOTS + '/vid-' + lk + '.png' });
}
ok('no page errors', errs.length === 0, errs);
console.log(checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
