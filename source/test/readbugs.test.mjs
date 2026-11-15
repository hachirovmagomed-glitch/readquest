// 11.11 (Джессика: «проверить процесс чтения на баги … чини»): five reading bugs found on /test/ 20261111-0225.
// 1. after a page turn, a change of the font / line height / letter spacing / weight kept the page NUMBER, not the text on it;
// 2. a long press within 28 px of the text's left edge left the brightness gesture armed: the next swipe set the brightness, no turn;
// 3. the first selections' hint popped up under a finger on the bottom lines and the selection was gone on release; it lay on ‹ ›;
// 4. the menu «У текста» lay on the selection's handle after ›;
// 5. in «Прокрутка» the book reopened at a whole screen (up to half a screen away, also forwards).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node readbugs.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const cdp = await p.target().createCDPSession();
const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (x, y) => { await p.touchscreen.tap(x, y); await sleep(350); };
const lp = async (x, y, ms = 800) => { await T('touchStart', x, y); await sleep(ms); await T('touchEnd'); await sleep(350); };
const drag = async (x0, y0, x1, y1) => { await T('touchStart', x0, y0); for (let i = 1; i <= 10; i++) { await T('touchMove', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await sleep(25); } await T('touchEnd'); await sleep(400); };
// a book whose every paragraph is unique («Длинная книга» repeats itself): the place is told by the paragraph number
let n = 0; const txt = fs.readFileSync(path.join(here, 'fixtures/Длинная книга.txt'), 'utf8').split('\n').map(l => l.trim() && !/^Глава/.test(l) ? l.trimEnd() + ' (абзац ' + (++n) + ')' : l).join('\n');
const id = await p.evaluate(async (t) => { const b0 = new Set(allBooks().map(b => b.id)); await importBookFiles([new File([t], 'Баги чтения.txt', { type: 'text/plain' })]); await new Promise(r => setTimeout(r, 1200)); return allBooks().find(b => !b0.has(b.id)).id; }, txt);
const open = async (mode) => { await p.evaluate(async ({ id, mode }) => { SET.flip = Object.assign({}, flipGet(), { mode, anim: 'none' }); Object.assign(SET, { font: 0, size: 19, lh: 1.65, ls: 0, weight: 400 }); saveSet(); applySet(); __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); }, { id, mode }); };
await open('page');
await p.evaluate(() => { window.__full = el('content').textContent.replace(/[\s­]/g, '');
  /* the fully visible letters of the shown page, and where they start in the book */
  window.__vis = () => { const v = el('viewer').getBoundingClientRect(), w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT), rg = document.createRange(); let n, t = '';
    while ((n = w.nextNode())) { rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (b.right < v.left || b.left > v.right || b.bottom < v.top || b.top > v.bottom) continue;
      for (let i = 0; i < n.nodeValue.length; i++) { if (/[\s­]/.test(n.nodeValue[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const r = rg.getClientRects()[0]; if (r && r.left >= v.left - 1 && r.right <= v.right + 1 && r.top >= v.top - 1 && r.bottom <= v.bottom + 1) t += n.nodeValue[i]; } }
    const m = /\(абзац\d+\)/.exec(t); return { t, off: m ? __full.indexOf(m[0]) - m.index : -1, n: t.length, page: R.page, pages: R.pageCount }; };
  window.__st = () => ({ on: SM.on, len: String(getSelection()).length, page: R.page, bright: SET.bright });
  window.__rect = (e) => { if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null; }; });
const home = async (pg) => { await p.evaluate((pg) => { try { selDone(); } catch (e) {} document.querySelectorAll('.rq-toast').forEach(x => x.remove()); R.jumping = true; goPage(pg, false); R.jumping = false; }, pg); await sleep(300); };

// ---- 1. the reading place over a change of the text's look (after a page turn)
const look = [['lhPlus', 4, 'line height'], ['lsPlus', 4, 'letter spacing'], ['wBold', 1, 'bold'], ['font:9', 1, 'font Mono'], ['font:8', 1, 'font Caveat'], ['font:10', 1, 'font Andika']];
for (const [c, times, name] of look) {
  await p.evaluate(() => { Object.assign(SET, { font: 0, size: 19, lh: 1.65, ls: 0, weight: 400 }); saveSet(); applySet(); relayout({ force: true }); }); await home(20); await tap(378, 420); await tap(378, 420);
  const a = await p.evaluate(() => __vis());
  await p.evaluate(() => el('btnAa').click()); await sleep(250);
  for (let i = 0; i < times; i++) { await p.evaluate((c) => { if (c.startsWith('font:')) document.querySelectorAll('#fontSeg button')[+c.slice(5)].click(); else el(c).click(); }, c); await sleep(120); }
  await sleep(1300); await p.evaluate(() => el('sheet').classList.add('hidden'));
  const b = await p.evaluate(() => __vis()); const d = b.off - a.off;
  ok('1. ' + name + ': the first words of the page stay on the page', a.off >= 0 && b.off >= 0 && d <= 0 && d > -b.n, { from: a.page, to: b.page, shift: d, onPage: b.n });
}
await p.evaluate(() => { Object.assign(SET, { font: 0, size: 19, lh: 1.65, ls: 0, weight: 400 }); saveSet(); applySet(); relayout({ force: true }); });

// ---- 2. a long press at the text's left edge, then a swipe: a page turn, the brightness stays
await p.evaluate(() => { rqRx().sm.hint = false; saveSet(); }); await home(7);
await lp(40, 150); const s2a = await p.evaluate(() => __st());
await drag(300, 620, 90, 620); const s2b = await p.evaluate(() => __st());
ok('2. long press on a line\'s first word selects it', s2a.on && s2a.len > 0, s2a);
ok('2. the swipe after it turns the page and does not touch the brightness', s2b.page === 8 && s2b.bright === s2a.bright, { a: s2a, b: s2b });
await p.evaluate(() => { SET.bright = 1; saveSet(); applySet(); });

// ---- 3. the hint of the first selections: not under the finger, not on ‹ ›, the selection stays
await p.evaluate(() => { rqRx().sm.hint = true; saveSet(); SM.hints = 0; }); await home(7);
await T('touchStart', 120, 762); await sleep(700);
const h3 = await p.evaluate(() => ({ toast: __rect(document.querySelector('.rq-toast')), next: __rect(el('selNext')), prev: __rect(el('selPrev')) }));
await sleep(120); await T('touchEnd'); await sleep(450); const s3 = await p.evaluate(() => __st());
const hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
ok('3. the hint is shown and is not under the finger on a bottom line', !!h3.toast && !(120 >= h3.toast[0] && 120 <= h3.toast[2] && 762 >= h3.toast[1] - 30 && 762 <= h3.toast[3] + 30), h3);
ok('3. the hint does not lie on ‹ ›', !!h3.toast && !hit(h3.toast, h3.next) && !hit(h3.toast, h3.prev), h3);
ok('3. the word on a bottom line stays selected after the finger is lifted', s3.on && s3.len > 0, s3);
await p.evaluate(() => { rqRx().sm.hint = false; saveSet(); });

// ---- 4. «У текста»: after › the menu does not lie on the handle, the handle drags
await p.evaluate(() => { SET.selLook = 'bubble'; saveSet(); }); await home(7);
await lp(120, 762); const nx = await p.evaluate(() => __rect(el('selNext')));
await p.touchscreen.tap((nx[0] + nx[2]) / 2, (nx[1] + nx[3]) / 2); await sleep(600);
const g4 = await p.evaluate(() => ({ st: __st(), menu: __rect(el('selSide')), hs: [...document.querySelectorAll('.smh')].map(__rect).filter(Boolean) }));
const h4 = g4.hs[g4.hs.length - 1];
ok('4. › turns the page with the selection, a handle is on the new page', g4.st.on && g4.st.page === 8 && !!h4, g4);
ok('4. the menu «У текста» does not lie on the handle', !!h4 && !hit(g4.menu, [h4[0] + 8, h4[1], h4[2] - 8, h4[3] - 8]), g4);
if (h4) { await T('touchStart', (h4[0] + h4[2]) / 2, (h4[1] + h4[3]) / 2); await sleep(150); for (let i = 1; i <= 12; i++) { await T('touchMove', (h4[0] + h4[2]) / 2 + (200 - (h4[0] + h4[2]) / 2) * i / 12, (h4[1] + h4[3]) / 2 + (330 - (h4[1] + h4[3]) / 2) * i / 12); await sleep(25); } await T('touchEnd'); await sleep(400); }
const s4 = await p.evaluate(() => __st());
ok('4. the handle drags the selection on over the new page', s4.on && s4.len > g4.st.len + 100, { before: g4.st.len, after: s4.len });
await p.evaluate(() => { selDone(); SET.selLook = 'side'; saveSet(); });

// ---- 5. «Прокрутка»: the book reopens where it was closed, not at a whole screen
await p.evaluate(() => closeReader()); await sleep(800); await open('scroll');
for (const fr of [0.45, 0.55]) {
  const t0 = await p.evaluate(async (fr) => { const v = el('viewer'); v.scrollTop = Math.round((20 + fr) * R.step); await new Promise(r => setTimeout(r, 700)); return v.scrollTop; }, fr);
  await p.evaluate(() => closeReader()); await sleep(800);
  await p.evaluate(async (id) => { __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); }, id);
  const r5 = await p.evaluate(() => ({ top: el('viewer').scrollTop, step: R.step, lh: parseFloat(getComputedStyle(el('content')).lineHeight) }));
  ok('5. closed ' + fr + ' of a screen past a screen border: reopens within a line of that place', Math.abs(r5.top - t0) <= r5.lh, { was: t0, now: r5.top, step: r5.step });
}
const pc = await p.evaluate((id) => { const x = S.progress[id] || {}; return { pos: x.pos, ratio: x.ratio }; }, id);
ok('5. pos is still a number from 0 to 1, not above ratio', typeof pc.pos === 'number' && pc.pos >= 0 && pc.pos <= 1 && pc.pos <= pc.ratio + 1e-9, pc);

ok('no page errors', errs.length === 0, errs);
await browser.close();
const f = checks.filter(x => !x).length; console.log(f ? `${f} FAILED of ${checks.length}` : `ALL ${checks.length} PASSED`); process.exit(f ? 1 : 0);
