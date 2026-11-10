// 10.11 (тестер: «если случайно выделить текст, режим выделения не сбрасывается просто нажатием в любую область экрана, надо специально выходить»):
// while selecting, a tap off the text (an empty place on the page, the margins) clears the selection and closes its menu;
// a tap on a word still moves the end (Джессика 28.10), and with «Нажатие ставит конец» off any tap clears.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node seltapclear.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(async () => {
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); saveSet(); applySet && applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
  goPage(3, true); await new Promise(r => setTimeout(r, 300));
  /* the k-th non-space letter of the shown page, and an empty place on it (no letter within a line's height) */
  window.__pc = (k) => { const v = el('viewer').getBoundingClientRect(), w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT), out = [], rg = document.createRange(); let n;
    while ((n = w.nextNode())) for (let i = 0; i < n.nodeValue.length; i++) { if (/\s/.test(n.nodeValue[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const r = rg.getClientRects()[0]; if (r && r.left >= v.left - 1 && r.right <= v.right + 1 && r.top >= v.top && r.bottom <= v.bottom) out.push(r); }
    const r = out[k < 0 ? out.length + k : k]; return [r.left + r.width / 2, r.top + r.height / 2]; };
  window.__blank = () => { const v = el('viewer').getBoundingClientRect(); for (let y = v.bottom - 4; y > v.top + 40; y -= 3) for (let x = v.left + 30; x < v.right - 30; x += 40) {
      const c = document.caretRangeFromPoint(x, y); if (!c) continue; const p = [c.startContainer, c.startOffset]; if (p[0].nodeType !== 3) return [x, y]; if (!smNear(p, x, y)) return [x, y]; } return null; };
  window.__st = () => ({ on: SM.on, len: String(getSelection()).length, side: !!el('selSide') && !el('selSide').hidden, page: R.page });
});
const lp = async (k) => { const [x, y] = await p.evaluate((k) => __pc(k), k); await p.touchscreen.touchStart(x, y); await sleep(700); await p.touchscreen.touchEnd(); await sleep(350); };
const tap = async (x, y) => { await p.touchscreen.tap(x, y); await sleep(400); };

// 1. long press, a tap on a later word: the end moves there (as before)
await lp(40); const a1 = await p.evaluate(() => __st());
let [x, y] = await p.evaluate(() => __pc(200)); await tap(x, y); const b1 = await p.evaluate(() => __st());
ok('long press selects a word, a tap on a later word moves the end', a1.on && a1.len > 0 && a1.len < 25 && b1.on && b1.len > 150, { a1, b1 });

// 2. a tap on an empty place of the page: the selection and its menu are gone, the page stays
const bl = await p.evaluate(() => __blank());
ok('the page has an empty place to tap', !!bl, bl);
if (bl) { await tap(bl[0], bl[1]); const s2 = await p.evaluate(() => __st());
  ok('tap on an empty place clears the selection, the menu closes, no page turn', !s2.on && s2.len === 0 && !s2.side && s2.page === 3, s2); }

// 3. after clearing, a tap turns pages again as usual (nothing stuck)
const pg = await p.evaluate(() => R.page); await tap(370, 420); const s3 = await p.evaluate(() => __st());
ok('the next tap on the right edge turns the page again', s3.page === pg + 1 && !s3.on, s3);
await p.evaluate(async () => { goPage(3, true); await new Promise(r => setTimeout(r, 300)); });

// 4. a tap on the margin beside the text column clears too
await lp(60); const a4 = await p.evaluate(() => __st());
const mg = await p.evaluate(() => { const v = el('viewer').getBoundingClientRect(); return v.left > 6 ? [v.left / 2, v.top + v.height / 2] : null; });
if (mg) { await tap(mg[0], mg[1]); const s4 = await p.evaluate(() => __st()); ok('tap on the side margin clears the selection', a4.on && !s4.on && s4.len === 0 && s4.page === 3, { a4, s4 }); }
else { await p.evaluate(() => selDone()); console.log('skip: no side margin at this width'); }

// 5. «Нажатие ставит конец» off: a tap on a word clears the selection
await p.evaluate(() => { const m = rxS ? rxS().sm : rqRx().sm; m.tap = false; saveSet(); });
await lp(80); const a5 = await p.evaluate(() => __st());
[x, y] = await p.evaluate(() => __pc(220)); await tap(x, y); const s5 = await p.evaluate(() => __st());
ok('with «Нажатие ставит конец» off a tap on a word clears the selection', a5.on && a5.len > 0 && !s5.on && s5.len === 0 && s5.page === 3, { a5, s5 });
await p.evaluate(() => { rqRx().sm.tap = true; saveSet(); });

// 6. the menu's own buttons still work: «Снять» still clears; tapping the long-pressed word itself right away does not clear
await lp(100); [x, y] = await p.evaluate(() => __pc(100)); await tap(x, y); const s6 = await p.evaluate(() => __st());
ok('a tap on the selected word keeps the selection', s6.on && s6.len > 0, s6);
await p.evaluate(() => selDone());

ok('no page errors', errs.length === 0, errs);
await browser.close();
const f = checks.filter(x => !x).length; console.log(f ? `${f} FAILED of ${checks.length}` : `ALL ${checks.length} PASSED`); process.exit(f ? 1 : 0);
