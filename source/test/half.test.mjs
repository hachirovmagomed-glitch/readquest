// 05.11 «Половина экрана» (Джессика: «гибкие настройки под разделённый экран», «окей, первые три»): свой шрифт и поля (SET.half),
// тонкие панели (#reader.half), кнопка «Вопрос» в меню выделения (копирует фрагмент с вопросом). js/reader.js rqHalfSync, js/sel-tools.js stAsk.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node half.test.mjs   [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message));
const vp = (h, w) => p.setViewport({ width: w || 390, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2, screenWidth: 390, screenHeight: 844 });
await p.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: (await browser.userAgent()) });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(async () => { Object.defineProperty(screen, 'height', { get: () => 844 }); Object.defineProperty(screen, 'width', { get: () => 390 });
  SET.size = 19; SET.margin = 24; saveSet(); openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); goPage(3, false); });
await sleep(500);
const st = () => p.evaluate(() => { let raw = {}; try { raw = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); } catch (e) {}
  return { half: el('reader').classList.contains('half'), size: SET.size, margin: SET.margin, fs: el('content').style.fontSize, page: R.page, n: R.pageCount, first: (el('content').textContent || '').length, saved: { size: raw.size, margin: raw.margin, half: raw.half }, rhead: el('reader').querySelector('.rhead').offsetHeight }; });
const s0 = await st();
ok('полный экран: обычный режим', !s0.half && s0.size === 19 && s0.fs === '19px', s0);
await vp(400); await sleep(1200);
const s1 = await st();
ok('половина экрана (400 из 844): сам включился, шрифт на 2 меньше (17), поля 16, панель тоньше', s1.half && s1.size === 17 && s1.margin === 16 && s1.fs === '17px' && s1.rhead < s0.rhead + 1, { s0: s0.rhead, s1 });
await p.evaluate(() => { el('szPlus').click(); el('mgPlus').click(); saveSet(); }); await sleep(600);
const s2 = await st();
ok('на половине «Шрифт +» и «Поля +» меняют только её; в сохранение идут полноэкранные 19/24, а половина — в half', s2.size === 18 && s2.margin === 22 && s2.saved.size === 19 && s2.saved.margin === 24 && s2.saved.half && s2.saved.half.size === 18 && s2.saved.half.margin === 22, s2);
if (SHOTS) await p.screenshot({ path: SHOTS + '/half-1-400.png' });
await vp(844); await sleep(1200);
const s3 = await st();
ok('снова полный экран: вернулись 19 и 24, место в книге то же, half запомнил 18/22', !s3.half && s3.size === 19 && s3.margin === 24 && s3.page === s0.page && JSON.stringify(await p.evaluate(() => SET.half)) === JSON.stringify({ on: true, size: 18, margin: 22 }), s3);
await vp(400); await sleep(1200);
const s4 = await st();
ok('ещё раз половина — сразу свои 18/22', s4.half && s4.size === 18 && s4.margin === 22, s4);
/* клавиатура: поле в фокусе — режим не меняется */
await p.evaluate(() => { const i = document.createElement('input'); i.id = '__kb'; document.body.appendChild(i); i.focus(); }); await vp(844); await sleep(900);
const s5 = await st();
ok('пока открыта клавиатура (поле в фокусе), режим не прыгает', s5.half && s5.size === 18, s5);
await p.evaluate(() => { el('__kb').blur(); el('__kb').remove(); relayout(); }); await sleep(600);
/* «Вопрос» */
await vp(400); await sleep(1200);
const a = await p.evaluate(async () => { window.__clip = ''; try { navigator.clipboard.writeText = async (t) => { window.__clip = t; }; } catch (e) {}
  const c = el('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, hit = null; const vw = el('viewer').getBoundingClientRect();
  while ((n = w.nextNode())) { const m = n.textContent.search(/[А-Яа-яЁё]{6,}/); if (m < 0) continue; const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + 6); const b = rg.getBoundingClientRect(); if (b.width && b.left >= vw.left && b.right <= vw.right && b.top > 40 && b.bottom < innerHeight - 40) { hit = rg; break; } }
  const s = getSelection(); s.removeAllRanges(); s.addRange(hit); document.dispatchEvent(new Event('selectionchange')); await new Promise(r => setTimeout(r, 700));
  const btn = el('ssAsk'); const vis = !!btn && getComputedStyle(btn).display !== 'none'; if (btn) btn.click(); await new Promise(r => setTimeout(r, 300));
  return { vis, clip: window.__clip, word: hit.toString() }; });
ok('на половине в меню выделения есть «Вопрос»: копирует книгу, фрагмент и вопрос без спойлеров', a.vis && a.clip.indexOf(a.word) > 0 && /Книга: «/.test(a.clip) && /Без спойлеров/.test(a.clip), a);
if (SHOTS) await p.screenshot({ path: SHOTS + '/half-2-vopros.png' });
await vp(844); await sleep(1000);
const hid = await p.evaluate(() => { const b = el('ssAsk'); return !b || getComputedStyle(b).display === 'none'; });
ok('на полном экране кнопки «Вопрос» нет', hid);
/* выключатель */
await p.evaluate(() => { el('halfTgl').click(); }); await vp(400); await sleep(1200);
const s6 = await st();
ok('«Половина экрана» выключена — на низком окне обычные 19/24', !s6.half && s6.size === 19 && s6.margin === 24, s6);
await p.evaluate(() => { el('halfTgl').click(); }); await sleep(300);
ok('no page errors', errs.length === 0, errs);
console.log('SUMMARY half.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
