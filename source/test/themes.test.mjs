// 1в: reader themes. «Карандашный» = 5th free theme (handoff/skins/karandashny, data-skin="pencil" on #reader, page stays flat),
// day/night inside the skin; «Ваша тема»: a saved paid theme that is owned stays (highlighted swatch), not owned → base (sepia) rendered,
// rq_set NOT rewritten until the user picks another. Screenshots → /workspace/rq-shots-1v/theme-*.png
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node themes.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
const SHOTS = process.env.RQ_SHOTS || '/workspace/rq-shots-1v/'; mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; };
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => raf(() => f(performance.now())); /* rAF time on the test clock (summary count-up) */ });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
const id = await p.evaluate(() => S.userBooks[0].id);
const open = async () => { await p.evaluate(id => openBook(id), id); await p.waitForFunction(() => R.pageCount > 1 && (!el('txtBack') || el('txtBack').classList.contains('hidden')), { timeout: 15000 }); await sleep(500); };
const st = () => p.evaluate(() => { const r = el('reader'), cs = getComputedStyle(r), pg = document.querySelector('#viewer') ; const sw = [...document.querySelectorAll('#themeSeg .swatch')];
  return { theme: SET.theme, ls: (JSON.parse(localStorage.getItem(RQ_K.set) || '{}')).theme, skin: r.dataset.skin || '', dtheme: r.dataset.theme || '', page: r.dataset.page, bg: cs.backgroundColor,
    bgImg: cs.backgroundImage + '|' + (pg ? getComputedStyle(pg).backgroundImage : ''), filter: pg ? getComputedStyle(pg).filter : '', acc: getComputedStyle(r).getPropertyValue('--rq-accent').trim(), hskin: document.documentElement.dataset.skin || '', htheme: document.documentElement.dataset.theme || '', sheetBg: getComputedStyle(el('sheet')).backgroundColor, headBg: getComputedStyle(document.querySelector('.rhead')).backgroundColor, barBg: getComputedStyle(document.querySelector('.rbar')).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor, icFilter: getComputedStyle(document.querySelector('#btnBack .ic')).filter, headLine: getComputedStyle(document.querySelector('.rhead'), '::after').maskImage || getComputedStyle(document.querySelector('.rhead'), '::after').webkitMaskImage || '',
    sw: sw.map(b => b.dataset.t), on: sw.filter(b => b.classList.contains('on')).map(b => b.dataset.t), yours: sw.filter(b => b.classList.contains('yours')).map(b => b.dataset.t),
    cap: [...document.querySelectorAll('#themeSeg .yourwrap small')].map(x => x.textContent) }; });
const sheet = async (on) => { await p.evaluate((on) => { if (on) openReaderSettings('grpPage'); else el('sheet').classList.add('hidden'); }, on); await sleep(400); };
const tokTxt = await p.evaluate(async () => (await (await fetch('tokens.css')).text()).includes('[data-skin="pencil"]'));
ok('dist tokens.css carries the Карандашный skin tokens (handoff tokens.rq.css)', tokTxt);

const base0 = await st(); /* app palette before the skin */
// 1. five free swatches, Карандашный among them; no «Ваша тема» on a fresh install
await open(); await sheet(true);
let s = await st();
ok('5 free theme swatches incl. «Карандашный», no «Ваша тема»', s.sw.join() === 'light,sepia,dark,black,pencil' && !s.yours.length && s.on.join() === 'sepia', s);
// 2. pick Карандашный (day)
await p.click('#themeSeg .swatch[data-t="pencil"]'); await sleep(400);
s = await st();
ok('Карандашный day: SET/rq_set = pencil, #reader data-skin=pencil, flat page #fbfaf6, swatch on', s.theme === 'pencil' && s.ls === 'pencil' && s.hskin === 'pencil' && !s.htheme && s.page === 'day' && s.bg === 'rgb(251, 250, 246)' && s.on.join() === 'pencil', s);
{ const ev = await p.evaluate(async () => (await __rq.listReadingEvents({})).filter(e => e.type === 'theme_changed').map(e => e.from + '>' + e.to));
  ok('switching to Карандашный writes ONE theme_changed default>pencil', ev.join() === 'default>pencil', ev); }
ok('pencil icons load: no runtime SVG filter on the Lucide strokes (it blanked icons on phones)', s.icFilter === 'none', s.icFilter);
{ const ic = await p.evaluate(() => { const vis = [...document.querySelectorAll('.ic')].filter(e => e.getClientRects().length && !e.closest('#rewardsSheet:not(.open)') && !e.closest('#reader.barsoff .rhead, #reader.barsoff .rbot')); /* closed sheet / hidden reader bars are visibility:hidden since 16.10 — not on screen */ return { n: vis.length, drawn: vis.filter(e => { const r = e.getBoundingClientRect(); return r.width >= 12 && r.height >= 12 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0'; }).length }; });
  ok('pencil: every visible Lucide icon is drawn (≥12 px, visible)', ic.n >= 5 && ic.drawn === ic.n, ic); }
{ const d = await p.evaluate(() => getComputedStyle(document.querySelector('#reader .rbar'), '::before').content);
  ok('pencil: no wobbly divider above the bottom toolbar (.rbar::before none)', d === 'none' || d === 'normal', d); }
{ const L = await p.evaluate(() => { const h = document.getElementById('mvpQuestH'), vis = [...h.children].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent), sh = document.getElementById('shelfH');
    return { quest: vis.join(), qtt: getComputedStyle(h).textTransform, shelf: sh.textContent, stt: getComputedStyle(sh).textTransform, box: !!document.getElementById('mvpQuestBox') }; });
  ok('pencil labels: «Задания» (not «Квесты»), «Моя полка» in sentence case; ids unchanged', L.quest === 'Задания' && L.qtt === 'none' && L.shelf === 'Моя полка' && L.stt === 'none' && L.box, L); }
{ const F = await p.evaluate(async () => { await document.fonts.ready; const ff = [...document.fonts].map(f => f.family.replace(/"/g, '') + ':' + f.status); const sw = await (await fetch('sw.js', { cache: 'no-store' })).text();
    return { ff, ui: getComputedStyle(document.body).fontFamily, pre: /fonts\/nunito\.woff2/.test(sw) && /fonts\/caveat\.woff2/.test(sw), lic: (await fetch('fonts/OFL.txt')).ok }; });
  ok('pencil: bundled Nunito (UI text) + Caveat loaded from fonts/*.woff2, both in the SW precache, OFL.txt shipped', F.ff.includes('Nunito:loaded') && F.ff.some(x => /^Caveat:/.test(x)) && /^"?Nunito/.test(F.ui) && F.pre && F.lic, F); }
ok('reader page stays clean (no background image / filter on the page)', !/url|gradient/.test(s.bgImg) && (s.filter === 'none' || !s.filter), { bgImg: s.bgImg, filter: s.filter });
ok('skin tokens active on #reader (--rq-accent = pencil #1d6464)', s.acc === '#1d6464', s.acc);
ok('app-wide skin day: html[data-skin=pencil]; settings sheet #fbfaf5, header + bottom bar #f3f0e7, body #f3f0e7, wobbly header line', s.hskin === 'pencil' && !s.htheme && s.sheetBg === 'rgb(251, 250, 245)' && s.headBg === 'rgb(243, 240, 231)' && s.barBg === 'rgb(243, 240, 231)' && s.bodyBg === 'rgb(243, 240, 231)' && /svg/.test(s.headLine), { hskin: s.hskin, sheet: s.sheetBg, head: s.headBg, bar: s.barBg, body: s.bodyBg, line: !!s.headLine });
await p.screenshot({ path: SHOTS + 'theme-pencil-day-sheet.png' });
await sheet(false); await p.screenshot({ path: SHOTS + 'theme-pencil-day.png' });
// 3. day/night inside the skin
await p.evaluate(() => toggleDayNight()); await sleep(500);
s = await st();
ok('Карандашный night: pencil-night, data-theme=night, page #262a31, still the Карандашный swatch', s.theme === 'pencil-night' && s.hskin === 'pencil' && s.htheme === 'night' && s.page === 'night' && s.bg === 'rgb(38, 42, 49)', s);
await p.screenshot({ path: SHOTS + 'theme-pencil-night.png' });
await sheet(true); s = await st();
ok('night: --rq-accent = pencil night #86cbc2, Карандашный swatch on', s.acc === '#86cbc2' && s.on.join() === 'pencil', s);
ok('app-wide skin night: html data-theme=night; sheet #353b45, header #2b3038', s.hskin === 'pencil' && s.htheme === 'night' && s.sheetBg === 'rgb(53, 59, 69)' && s.headBg === 'rgb(43, 48, 56)', { sheet: s.sheetBg, head: s.headBg });
await p.screenshot({ path: SHOTS + 'theme-pencil-night-sheet.png' }); await sheet(false);
await p.evaluate(() => toggleDayNight()); await sleep(300); s = await st();
ok('toggle back → pencil (day)', s.theme === 'pencil' && !s.htheme && s.bg === 'rgb(251, 250, 246)', s);
// 4. leaving the skin removes it
await sheet(true); await p.click('#themeSeg .swatch[data-t="light"]'); await sleep(300); s = await st();
{ const ev = await p.evaluate(async () => (await __rq.listReadingEvents({})).filter(e => e.type === 'theme_changed').map(e => e.from + '>' + e.to));
  ok('day/night inside the skin wrote nothing; leaving it writes pencil>default (total 2)', ev.join() === 'default>pencil,pencil>default', ev); }
ok('icons back to plain Lucide (no filter) after leaving the skin', s.icFilter === 'none', s.icFilter);
ok('another theme → skin fully reverted (no html data-skin/theme; sheet, header, bar, body back to the app palette)', s.theme === 'light' && !s.hskin && !s.htheme && s.sheetBg === base0.sheetBg && s.headBg === base0.headBg && s.barBg === base0.barBg && s.bodyBg === base0.bodyBg, { now: [s.sheetBg, s.headBg, s.barBg, s.bodyBg], base: [base0.sheetBg, base0.headBg, base0.barBg, base0.bodyBg] });
// boot: the skin is applied app-wide before any book is opened (library)
await p.evaluate(() => { el('sheet').classList.add('hidden'); SET.theme = 'pencil'; saveSet(); closeReader(); }); await sleep(500);
await p.reload({ waitUntil: 'load' }); await boot();
const lib = await p.evaluate(() => ({ hskin: document.documentElement.dataset.skin || '', bodyBg: getComputedStyle(document.body).backgroundColor }));
ok('after reload, library already in the skin (boot applySkin)', lib.hskin === 'pencil' && lib.bodyBg === 'rgb(243, 240, 231)', lib);
await p.screenshot({ path: SHOTS + 'theme-pencil-library-day.png' });
await open(); await sheet(true); await p.click('#themeSeg .swatch[data-t="light"]'); await sleep(300); await sheet(false);
await p.evaluate(() => closeReader()); await sleep(800);

// 5. saved paid theme, OWNED → stays, highlighted «Ваша тема»
await p.evaluate(() => { S.owned = (S.owned || []).concat('midnight'); save(); SET.theme = 'midnight'; saveSet(); });
await p.reload({ waitUntil: 'load' }); await boot(); await open(); await sheet(true); s = await st();
ok('owned paid theme stays: page #0e1a2b, rq_set midnight', s.theme === 'midnight' && s.ls === 'midnight' && s.bg === 'rgb(14, 26, 43)', s);
ok('«Ваша тема» swatch: 6th, highlighted (on + yours), caption «Ваша тема»', s.sw.length === 6 && s.yours.join() === 'midnight' && s.on.join() === 'midnight' && s.cap.join() === 'Ваша тема', s);
await p.screenshot({ path: SHOTS + 'theme-yours-owned-sheet.png' });
await p.evaluate(() => toggleDayNight()); await sleep(300); s = await st();
ok('day/night from an owned paid theme → sepia (user pick)', s.theme === 'sepia', s);
await p.evaluate(() => closeReader()); await sleep(500);

// 6. saved old theme, NOT owned → still renders (free since the shop build), rq_set untouched until the user picks
await p.evaluate(() => { S.owned = (S.owned || []).filter(x => x !== 'kraft'); save(); SET.theme = 'kraft'; saveSet(); });
await p.reload({ waitUntil: 'load' }); await boot(); await open(); await sheet(true); s = await st();
ok('not owned (shop build 14.10: old themes are free): kraft rendered (page #e8d9b5) as highlighted «Ваша тема»', s.bg === 'rgb(232, 217, 181)' && s.yours.join() === 'kraft' && s.sw.length === 6 && s.on.join() === 'kraft', s);
await p.evaluate(() => el('szPlus').click()); await sleep(500); await p.evaluate(() => closeReader()); await sleep(500);
s = await st();
ok('not owned: rq_set still kraft after other setting changes / closing the book', s.theme === 'kraft' && s.ls === 'kraft', { theme: s.theme, ls: s.ls });
await open(); await sheet(true); await p.click('#themeSeg .swatch[data-t="dark"]'); await sleep(300); s = await st();
ok('user picks another → rq_set rewritten (dark)', s.theme === 'dark' && s.ls === 'dark', { theme: s.theme, ls: s.ls });
// Карандашный on ALL screens, day + night: library, reader (bars shown), settings sheet, session summary, profile
for (const mode of ['day', 'night']) {
  await p.evaluate((m) => { SET.theme = m === 'day' ? 'pencil' : 'pencil-night'; saveSet(); applySkin(); renderLibrary(); show('library'); }, mode); await sleep(500);
  await p.screenshot({ path: SHOTS + `pencil-${mode}-library.png` });
  await open(); await p.evaluate(() => revealChrome()); await sleep(500);
  await p.screenshot({ path: SHOTS + `pencil-${mode}-reader.png` });
  await sheet(true); await p.screenshot({ path: SHOTS + `pencil-${mode}-sheet.png` }); await sheet(false);
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { window.__rqAdv(50000); goPage(R.page + 1, true); }); await sleep(150); }
  await p.evaluate(() => closeReader()); await sleep(1600);
  const sm = await p.evaluate(() => !el('summary').classList.contains('hidden'));
  await p.screenshot({ path: SHOTS + `pencil-${mode}-summary.png` });
  await p.evaluate(() => { const b = el('btnDone'); if (b) b.click(); renderProfile(); show('profile'); }); await sleep(500);
  await p.screenshot({ path: SHOTS + `pencil-${mode}-profile.png` });
  const sk = await p.evaluate(() => ({ h: document.documentElement.dataset.skin || '', t: document.documentElement.dataset.theme || '', body: getComputedStyle(document.body).backgroundColor }));
  ok(`all screens shot in Карандашный ${mode} (summary shown, skin on profile)`, sm && sk.h === 'pencil' && (mode === 'day' ? !sk.t && sk.body === 'rgb(243, 240, 231)' : sk.t === 'night' && sk.body === 'rgb(43, 48, 56)'), { sm, sk });
}
ok('no page errors', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY themes.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
