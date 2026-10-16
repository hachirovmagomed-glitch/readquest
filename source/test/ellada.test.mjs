// Skin «Эллада» (Джессика 15.10, handoff/skins/ellada): first shop skin with app styling after «Карандашный».
// Catalog 500, «Купить» once, wear → html[data-skin=ellada] + reader theme 'ellada'; day/night inside the skin; tokens and fonts from the build
// (no Google Fonts @import, woff2 precached); the book page stays clean (page tokens, no decor); not owned (import) → sepia, rq_set untouched;
// bought skin is a tile in «Тема» and a swatch in the reader; prefers-reduced-motion → no animation; export → reset → import keeps it; 360/390 header fits.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node ellada.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const st = () => p.evaluate(() => ({ skin: document.documentElement.dataset.skin || '', theme: document.documentElement.dataset.theme || '', set: SET.theme, worn: typeof shopWorn === 'function' ? shopWorn() : null }));

// 1. catalog + ready + price
const cat = await p.evaluate(() => { const it = typeof shopItem === 'function' && shopItem('skin-ellada'); return it ? { name: it.name, price: it.price, ready: shopReady('skin-ellada'), cols: SHOP_CATALOG.filter(x => x.skin === 'skin-ellada').length } : null; });
ok('1 catalog: «Эллада» 500, ready (not «Скоро»), one bundled colour', cat && cat.name === 'Эллада' && cat.price === 500 && cat.ready && cat.cols === 1, cat);

// 2. not owned: wear refused, a saved theme 'ellada' renders sepia and rq_set is not rewritten
await p.evaluate(() => { S.gold = 0; save(); });
const w0 = await p.evaluate(() => wear('skin-ellada'));
const set0 = await p.evaluate(async () => { SET.theme = 'ellada'; saveSet(); applySet(); await new Promise(r => setTimeout(r, 200)); return { t: activeTheme().name, raw: JSON.parse(localStorage.getItem(RQ_K.set)).theme, skin: document.documentElement.dataset.skin || '' }; });
ok('2 not owned: wear() refused, saved theme «ellada» renders Сепия without the skin, rq_set keeps «ellada»', w0 === false && set0.t === 'Сепия' && set0.raw === 'ellada' && set0.skin === '', { w0, set0 });
await p.evaluate(() => { SET.theme = 'sepia'; saveSet(); applySet(); });

// 3. buy once, wear → skin on :root
await p.evaluate(() => { S.gold = 640; save(); });
const b1 = await p.evaluate(() => buy('skin-ellada')), b2 = await p.evaluate(() => buy('skin-ellada'));
const g = await p.evaluate(() => S.gold);
ok('3 buy: 640 → 140 once, second buy refused (owned)', b1.ok === true && b2.ok === false && b2.reason === 'owned' && g === 140, { b1, b2, g });
await p.evaluate(() => wear('skin-ellada')); await sleep(300);
let s = await st();
ok('3b wear → html[data-skin=ellada], day (no data-theme), SET.theme ellada, shopWorn skin-ellada', s.skin === 'ellada' && s.theme === '' && s.set === 'ellada' && s.worn === 'skin-ellada', s);

// 4. tokens + fonts: skin colours on :root, no @import left, woff2 fonts load from the build
const tk = await p.evaluate(async () => { const cs = getComputedStyle(document.documentElement);
  await document.fonts.load('700 20px "Cormorant Unicase"', 'Библиотека'); await document.fonts.load('500 15px "Alegreya Sans"', 'Цель');
  return { bg: cs.getPropertyValue('--rq-bg').trim(), accent: cs.getPropertyValue('--rq-accent').trim(), appBg: cs.getPropertyValue('--bg').trim(),
    corm: [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Cormorant Unicase' && f.status === 'loaded'), aleg: [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Alegreya Sans' && f.status === 'loaded'),
    font: getComputedStyle(document.getElementById('libTitle')).fontFamily }; });
const tokCss = await (await fetch(BASE + 'tokens.css')).text();
ok('4 tokens: --rq-bg #f4f0e8, accent #1f5a8c, app --bg bridged; no @import in tokens.css', tk.bg === '#f4f0e8' && tk.accent === '#1f5a8c' && /var\(--rq-bg\)|#f4f0e8/.test(tk.appBg) && !/@import/.test(tokCss), { tk, imp: /@import/.test(tokCss) });
ok('4b fonts: Cormorant Unicase + Alegreya Sans loaded from fonts/ (offline), title in Cormorant', tk.corm && tk.aleg && /Cormorant Unicase/.test(tk.font), tk);
const sw = await (await fetch(BASE + 'sw.js')).text();
ok('4c precache: skins/skins.css and the 4 ellada woff2', /"skins\/skins\.css"/.test(sw) && (sw.match(/fonts\/ellada-[a-z-]+\.woff2/g) || []).length === 4, (sw.match(/fonts\/ellada-[a-z-]+\.woff2/g) || []));

// 5. library decor: frieze header, vase covers, card frame; nothing overflows at 390 and 360
await p.evaluate(() => { show('library'); renderLibrary(); }); await sleep(300);
const lib = (w) => p.evaluate(() => { const h = document.getElementById('libHead'), r = h.getBoundingClientRect(), cs = getComputedStyle(h);
  const kids = [...h.children].filter(e => e.offsetParent).map(e => { const q = e.getBoundingClientRect(); return { id: e.id || e.className, l: Math.round(q.left), r: Math.round(q.right) }; });
  const t = document.getElementById('libTitle');
  return { bg: cs.backgroundColor, meander: getComputedStyle(h, '::before').backgroundImage.slice(0, 30), covers: document.querySelectorAll('#shelf .el-cover').length,
    books: document.querySelectorAll('#shelf .bookcard').length, inside: kids.every(k => k.l >= 0 && k.r <= innerWidth), cut: t.scrollWidth > t.clientWidth + 1, kids, sx: document.documentElement.scrollWidth <= innerWidth }; });
let l390 = await lib();
ok('5 library: black-glaze frieze with meander, every emoji cover is a vase tile', l390.bg === 'rgb(21, 17, 14)' && /data:image\/svg/.test(l390.meander) && l390.covers === l390.books && l390.books > 0, l390);
await p.screenshot({ path: SHOTS + 'ellada-library-390.png' });
await p.evaluate(() => { S.gold = 12345; save(); renderLibrary(); });
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(400);
const l360 = await lib();
ok('5b 360 px, balance 12345: header items inside the screen, title not cut, no horizontal scroll', l360.inside && !l360.cut && l360.sx, l360);
await p.screenshot({ path: SHOTS + 'ellada-library-360.png' });
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(300);

// 6. reader: clean page (skin page tokens, no pseudo decor), day/night stays inside the skin
const bid = await p.evaluate(() => allBooks()[1].id);
await p.evaluate((id) => openBook(id), bid); await sleep(2500);
const rd = () => p.evaluate(() => { const r = document.getElementById('reader'), cs = getComputedStyle(r);
  const deco = [...r.querySelectorAll('*')].filter(e => e.offsetParent).some(e => { const a = getComputedStyle(e, '::before'), b = getComputedStyle(e, '::after');
    return [a, b].some(x => /data:image\/svg/.test(x.backgroundImage) && x.content !== 'none'); });
  return { page: r.dataset.page, bg: cs.backgroundColor, color: cs.color, deco, sea: getComputedStyle(document.body, '::before').content, skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme || '' }; });
let r1 = await rd();
ok('6 reader day: page #fcf9f3 / #1a1410, no meander/sea next to the text', r1.bg === 'rgb(252, 249, 243)' && r1.color === 'rgb(26, 20, 16)' && !r1.deco && (r1.sea === 'none' || r1.sea === 'normal') && r1.skin === 'ellada', r1);
await p.evaluate(() => toggleDayNight()); await sleep(400);
let r2 = await rd(); s = await st();
ok('6b night: SET.theme ellada-night, data-theme night, page #100d0b / #ebe0d2, still the skin', s.set === 'ellada-night' && r2.theme === 'night' && r2.skin === 'ellada' && r2.bg === 'rgb(16, 13, 11)' && r2.color === 'rgb(235, 224, 210)' && !r2.deco, { s, r2 });
await p.screenshot({ path: SHOTS + 'ellada-reader-night-390.png' });
await p.evaluate(() => toggleDayNight()); await sleep(300); s = await st();
ok('6c day again: ellada', s.set === 'ellada' && s.skin === 'ellada' && s.theme === '', s);
const sws = await p.evaluate(() => { openReaderSettings('grpPage'); return [...document.querySelectorAll('#themeSeg .swatch')].map(b => ({ t: b.dataset.t, on: b.classList.contains('on') })); });
ok('6d reader «Тема»: «Эллада» swatch, selected', sws.some(x => x.t === 'ellada' && x.on), sws);
await p.evaluate(() => { document.getElementById('sheet').classList.add('hidden'); history.back && 0; });
await p.evaluate(() => { if (typeof closeReader === 'function') closeReader(); else show('library'); }); await sleep(400);

// 7. «Общие настройки → Тема»: tile «Эллада» selected; picking «Бирюза» leaves the skin, the tile brings it back
await p.evaluate(() => openGeneralSettings(false)); await sleep(300);
const tl = await p.evaluate(() => [...document.querySelectorAll('#appThemeBox .apptile')].map(t => ({ k: t.querySelector('.appsw').dataset.k, on: t.classList.contains('on') })));
ok('7 settings: «Эллада» tile, the only selected one', tl.some(x => x.k === 'ellada' && x.on) && tl.filter(x => x.on).length === 1, tl.filter(x => x.on || x.k === 'ellada'));
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="teal"]').click()); await sleep(300); s = await st();
const s7 = s;
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="ellada"]').click()); await sleep(300); s = await st();
ok('7b «Бирюза» leaves the skin (sepia, no data-skin), tile «Эллада» puts it back', s7.skin === '' && s7.set === 'sepia' && s.skin === 'ellada' && s.set === 'ellada', { s7, s });

// 8. reduced motion: no animation on any element of the skin
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(200);
const anim = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); return c.animationName !== 'none' && parseFloat(c.animationDuration) > 0; }).map(e => e.id || e.className).slice(0, 5));
ok('8 prefers-reduced-motion: no running animation', anim.length === 0, anim);
await p.emulateMediaFeatures([]);

// 9. export → reset → import → reload: owned, worn, theme and balance the same
const before = await p.evaluate(() => ({ gold: S.gold, owned: S.owned.slice().sort(), set: SET.theme, skin: SET.skin }));
const r9 = await p.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); window.__bk = JSON.stringify(e);
  S.gold = 0; S.owned = []; save(); SET.theme = 'sepia'; SET.skin = null; saveSet();
  try { await __rq.importBackup(JSON.parse(window.__bk)); return { ok: true, ns: e.ns, build: e.build }; } catch (x) { return { ok: false, err: String(x.message || x) }; } });
await p.reload({ waitUntil: 'load' }); await boot();
const after = await p.evaluate(() => ({ gold: S.gold, owned: S.owned.slice().sort(), set: SET.theme, skin: SET.skin }));
s = await st();
ok('9 export → reset → import → reload: balance, owned, theme, worn skin identical; skin on screen', r9.ok && JSON.stringify(after) === JSON.stringify(before) && s.skin === 'ellada', { r9, before, after, s });

// 9b. own icon set: sprite symbols redrawn while the skin is on (amphora for «Награды», scroll for «Библиотека»), same ids
const ic1 = await p.evaluate(() => ({ gift: document.getElementById('i-gift').innerHTML, lib: document.getElementById('i-book-open').innerHTML, nav: [...document.querySelectorAll('#botnav use')].map(u => u.getAttribute('href')) }));
ok('9b Эллада icons: «Награды» amphora, «Библиотека» scroll, nav keeps the same ids', /M10 2v5\.632/.test(ic1.gift) && /M6 4v16M18 4v16/.test(ic1.lib) && ic1.nav.includes('#i-gift'), ic1);
// 10. other skins stay «Скоро»; «Карандашный» still free and wearable
const soon = await p.evaluate(() => SHOP_CATALOG.filter(x => x.type === 'skin' && !shopReady(x.id)).map(x => x.id));
await p.evaluate(() => wear('skin-pencil')); await sleep(200); s = await st();
ok('10 the rest stay «Скоро», pencil wear still works', soon.length === 6 && s.skin === 'pencil' && s.set === 'pencil', { soon, s });
const ic2 = await p.evaluate(() => ({ gift: document.getElementById('i-gift').innerHTML, el: document.querySelectorAll('#shelf .el-cover').length, pc: document.querySelectorAll('#shelf .pc-cover').length }));
ok('10b leaving the skin: Lucide icons back, covers redrawn for the new skin', !/M10 2v5\.632/.test(ic2.gift) && ic2.el === 0 && ic2.pc > 0, ic2);

ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY ellada.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
