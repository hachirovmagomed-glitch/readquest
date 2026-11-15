// 08.11 «Поле сверху» (тестер: «фронталка загораживает строчки», EPUB/TXT): текст начинается ниже выреза камеры
// (env(safe-area-inset-top) в полноэкранном режиме) + SET.mtop px (по умолчанию 12). app.html #reader:not(.pdfmode), js/reader.js.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node mtop.test.mjs   [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: (await browser.userAgent()) });
const cdp = await p.createCDPSession();
let inset = true; try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 36, topMax: 36 } }); } catch (e) { inset = false; console.log('note: no safe-area emulation in this Chrome — ' + e.message); }
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(async () => { SET.size = 19; SET.margin = 24; saveSet(); openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); goPage(2, false); });
await sleep(600);
const st = () => p.evaluate(() => { const r = el('reader').getBoundingClientRect(), v = el('viewer').getBoundingClientRect();
  const c = el('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, top = null;
  while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) { if (b.width && b.left >= v.left - 1 && b.right <= v.right + 1 && b.height) { top = top == null ? b.top : Math.min(top, b.top); } } }
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); } catch (e) {}
  return { vtop: Math.round(v.top - r.top), first: top == null ? null : Math.round(top - r.top), mtop: SET.mtop, label: el('mtVal').textContent, saved: raw.mtop, page: R.page, n: R.pageCount }; });
const s0 = await st();
const base = inset ? 36 : 0;
ok('по умолчанию текст начинается на вырез + 12 px ниже верха', s0.mtop === 12 && s0.vtop === base + 12 && s0.first >= base + 12, s0);
if (SHOTS) await p.screenshot({ path: SHOTS + '/mtop-1-default.png' });
await p.evaluate(() => { el('mtPlus').click(); el('mtPlus').click(); }); await sleep(700);
const s1 = await st();
ok('«Поле сверху +» дважды: 24 px, строки ниже, сохранено, подпись 24', s1.mtop === 24 && s1.vtop === base + 24 && s1.first >= base + 24 && s1.saved === 24 && s1.label === '24', s1);
for (let i = 0; i < 6; i++) await p.evaluate(() => el('mtMinus').click()); await sleep(700);
const s2 = await st();
ok('до нуля: остаётся только вырез камеры', s2.mtop === 0 && s2.vtop === base, s2);
for (let i = 0; i < 15; i++) await p.evaluate(() => el('mtPlus').click()); await sleep(700);
const s3 = await st();
ok('не больше 60', s3.mtop === 60 && s3.vtop === base + 60, s3);
const nrm = await p.evaluate(() => { const a = { mtop: 999 }, b = { mtop: 'x' }, c = {}; normSet(a); normSet(b); normSet(c); return [a.mtop, b.mtop, c.mtop]; });
ok('normSet: мусор → 12, большое → 60', JSON.stringify(nrm) === '[60,12,12]', nrm);
await p.evaluate(() => { SET.mtop = 12; saveSet(); applySet(); relayout(); }); await sleep(500);
ok('no page errors', errs.length === 0, errs);
console.log('SUMMARY mtop.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
