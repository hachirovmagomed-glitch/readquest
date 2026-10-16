// Skin «Бабочковый» (Джессика 16.10, handoff/skins/babochkovyi): second shop skin after «Бабочковый», same contract.
// Catalog 500, «Купить» once, wear → html[data-skin=babochkovyi] + reader theme 'babochkovyi'; day/night inside the skin; tokens and fonts from the build
// (no Google Fonts @import, woff2 precached); the book page stays clean (page tokens, no decor); not owned (import) → sepia, rq_set untouched;
// bought skin is a tile in «Тема» and a swatch in the reader; prefers-reduced-motion → no animation; export → reset → import keeps it; 360/390 header fits.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node babochkovyi.test.mjs
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
const cat = await p.evaluate(() => { const it = typeof shopItem === 'function' && shopItem('skin-babochkovyi'); return it ? { name: it.name, price: it.price, ready: shopReady('skin-babochkovyi'), cols: SHOP_CATALOG.filter(x => x.skin === 'skin-babochkovyi').length } : null; });
ok('1 catalog: «Бабочковый» 500, ready (not «Скоро»), one bundled colour', cat && cat.name === 'Бабочковый' && cat.price === 500 && cat.ready && cat.cols === 1, cat);

// 2. not owned: wear refused, a saved theme 'babochkovyi' renders sepia and rq_set is not rewritten
await p.evaluate(() => { S.gold = 0; save(); });
const w0 = await p.evaluate(() => wear('skin-babochkovyi'));
const set0 = await p.evaluate(async () => { SET.theme = 'babochkovyi'; saveSet(); applySet(); await new Promise(r => setTimeout(r, 200)); return { t: activeTheme().name, raw: JSON.parse(localStorage.getItem(RQ_K.set)).theme, skin: document.documentElement.dataset.skin || '' }; });
ok('2 not owned: wear() refused, saved theme «babochkovyi» renders Сепия without the skin, rq_set keeps «babochkovyi»', w0 === false && set0.t === 'Сепия' && set0.raw === 'babochkovyi' && set0.skin === '', { w0, set0 });
await p.evaluate(() => { SET.theme = 'sepia'; saveSet(); applySet(); });

// 3. buy once, wear → skin on :root
await p.evaluate(() => { S.gold = 640; save(); });
const b1 = await p.evaluate(() => buy('skin-babochkovyi')), b2 = await p.evaluate(() => buy('skin-babochkovyi'));
const g = await p.evaluate(() => S.gold);
ok('3 buy: 640 → 140 once, second buy refused (owned)', b1.ok === true && b2.ok === false && b2.reason === 'owned' && g === 140, { b1, b2, g });
await p.evaluate(() => wear('skin-babochkovyi')); await sleep(300);
let s = await st();
ok('3b wear → html[data-skin=babochkovyi], day (no data-theme), SET.theme babochkovyi, shopWorn skin-babochkovyi', s.skin === 'babochkovyi' && s.theme === '' && s.set === 'babochkovyi' && s.worn === 'skin-babochkovyi', s);

// 4. tokens + fonts: skin colours on :root, no @import left, woff2 fonts load from the build
const tk = await p.evaluate(async () => { const cs = getComputedStyle(document.documentElement);
  await document.fonts.load('400 30px "Poiret One"', 'Библиотека'); await document.fonts.load('500 15px "Mulish"', 'Цель'); await document.fonts.load('800 15px "Mulish"', 'Цель'); await document.fonts.load('700 15px "Bellota Text"', '1234');
  const has = (n, w) => [...document.fonts].some(f => f.family.replace(/"/g, '') === n && (!w || f.weight === w) && f.status === 'loaded');
  return { bg: cs.getPropertyValue('--rq-bg').trim(), accent: cs.getPropertyValue('--rq-accent').trim(), appBg: cs.getPropertyValue('--bg').trim(),
    poiret: has('Poiret One'), mul5: has('Mulish', '500'), mul8: has('Mulish', '800'), bell: has('Bellota Text'),
    font: getComputedStyle(document.getElementById('libTitle')).fontFamily }; });
const tokCss = await (await fetch(BASE + 'tokens.css')).text();
ok('4 tokens: --rq-bg #f4f2f8, accent #13646c, app --bg bridged; no @import in tokens.css', tk.bg === '#f4f2f8' && tk.accent === '#13646c' && /var\(--rq-bg\)|#f4f2f8/.test(tk.appBg) && !/@import/.test(tokCss), { tk, imp: /@import/.test(tokCss) });
ok('4b fonts: Poiret One + Mulish 500/800 + Bellota Text loaded from fonts/ (offline), title in Poiret One', tk.poiret && tk.mul5 && tk.mul8 && tk.bell && /Poiret One/.test(tk.font), tk);
const sw = await (await fetch(BASE + 'sw.js')).text();
ok('4c precache: skins/skins.css and the 4 babochkovyi woff2', /"skins\/skins\.css"/.test(sw) && (sw.match(/fonts\/babochkovyi-[a-z-]+\.woff2/g) || []).length === 4, (sw.match(/fonts\/babochkovyi-[a-z-]+\.woff2/g) || []));

// 5. library decor: wing header (iridescent + wavy mask), butterfly pair after the title, butterfly covers, meadow; nothing overflows at 390 and 360
await p.evaluate(() => { show('library'); renderLibrary(); }); await sleep(300);
const lib = (w) => p.evaluate(() => { const h = document.getElementById('libHead'), r = h.getBoundingClientRect(), cs = getComputedStyle(h);
  const kids = [...h.children].filter(e => e.offsetParent).map(e => { const q = e.getBoundingClientRect(); return { id: e.id || e.className, l: Math.round(q.left), r: Math.round(q.right) }; });
  const t = document.getElementById('libTitle');
  const pair = getComputedStyle(t, '::after'), meadow = getComputedStyle(document.body, '::before');
  return { grad: /gradient/.test(cs.backgroundImage), mask: /data:image\/svg/.test(cs.maskImage || cs.webkitMaskImage), pair: [pair.width, pair.marginLeft, /data:image\/svg/.test(pair.backgroundImage)], meadow: [meadow.height, /data:image\/svg/.test(meadow.backgroundImage)],
    covers: document.querySelectorAll('#shelf .bb-cover').length, svgs: document.querySelectorAll('#shelf .bb-cover svg').length,
    books: document.querySelectorAll('#shelf .bookcard').length, inside: kids.every(k => k.l >= 0 && k.r <= innerWidth), cut: t.scrollWidth > t.clientWidth + 1, kids, sx: document.documentElement.scrollWidth <= innerWidth }; });
let l390 = await lib();
ok('5 library: wing header (gradient + wavy mask), pair 44px at 12px after the title, meadow 110px, every cover a butterfly tile', l390.grad && l390.mask && l390.pair[0] === '44px' && l390.pair[1] === '12px' && l390.pair[2] && l390.meadow[0] === '110px' && l390.meadow[1] && l390.covers === l390.books && l390.svgs === l390.books && l390.books > 0, l390);
await p.screenshot({ path: SHOTS + 'babochkovyi-library-390.png' });
await p.evaluate(() => { S.gold = 12345; save(); renderLibrary(); });
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(400);
const l360 = await lib();
ok('5b 360 px, balance 12345: header items inside the screen, title not cut, no horizontal scroll', l360.inside && !l360.cut && l360.sx, l360);
await p.screenshot({ path: SHOTS + 'babochkovyi-library-360.png' });
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(300);

// 6. reader: clean page (skin page tokens, no pseudo decor), day/night stays inside the skin
const bid = await p.evaluate(() => allBooks()[1].id);
await p.evaluate((id) => openBook(id), bid); await sleep(2500);
const rd = () => p.evaluate(() => { const r = document.getElementById('reader'), cs = getComputedStyle(r);
  const deco = [...r.querySelectorAll('*')].filter(e => e.offsetParent).some(e => { const a = getComputedStyle(e, '::before'), b = getComputedStyle(e, '::after');
    return [a, b].some(x => /data:image\/svg/.test(x.backgroundImage) && x.content !== 'none'); });
  return { page: r.dataset.page, bg: cs.backgroundColor, color: cs.color, deco, sea: getComputedStyle(document.body, '::before').content, skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme || '' }; });
let r1 = await rd();
ok('6 reader day: page #fcfbf8 / #1d2140, no wings/meadow next to the text', r1.bg === 'rgb(252, 251, 248)' && r1.color === 'rgb(29, 33, 64)' && !r1.deco && (r1.sea === 'none' || r1.sea === 'normal') && r1.skin === 'babochkovyi', r1);
await p.evaluate(() => toggleDayNight()); await sleep(400);
let r2 = await rd(); s = await st();
ok('6b night: SET.theme babochkovyi-night, data-theme night, page #0e1019 / #e4e6ef, still the skin', s.set === 'babochkovyi-night' && r2.theme === 'night' && r2.skin === 'babochkovyi' && r2.bg === 'rgb(14, 16, 25)' && r2.color === 'rgb(228, 230, 239)' && (r2.sea === 'none' || r2.sea === 'normal') && !r2.deco, { s, r2 });
await p.screenshot({ path: SHOTS + 'babochkovyi-reader-night-390.png' });
await p.evaluate(() => toggleDayNight()); await sleep(300); s = await st();
ok('6c day again: babochkovyi', s.set === 'babochkovyi' && s.skin === 'babochkovyi' && s.theme === '', s);
const sws = await p.evaluate(() => { openReaderSettings('grpPage'); return [...document.querySelectorAll('#themeSeg .swatch')].map(b => ({ t: b.dataset.t, on: b.classList.contains('on') })); });
ok('6d reader «Тема»: «Бабочковый» swatch, selected', sws.some(x => x.t === 'babochkovyi' && x.on), sws);
await p.evaluate(() => { document.getElementById('sheet').classList.add('hidden'); history.back && 0; });
await p.evaluate(() => { if (typeof closeReader === 'function') closeReader(); else show('library'); }); await sleep(400);

// 7. «Общие настройки → Тема»: tile «Бабочковый» selected; picking «Бирюза» leaves the skin, the tile brings it back
await p.evaluate(() => openGeneralSettings(false)); await sleep(300);
const tl = await p.evaluate(() => [...document.querySelectorAll('#appThemeBox .apptile')].map(t => ({ k: t.querySelector('.appsw').dataset.k, on: t.classList.contains('on') })));
ok('7 settings: «Бабочковый» tile, the only selected one', tl.some(x => x.k === 'babochkovyi' && x.on) && tl.filter(x => x.on).length === 1, tl.filter(x => x.on || x.k === 'babochkovyi'));
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="teal"]').click()); await sleep(300); s = await st();
const s7 = s;
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="babochkovyi"]').click()); await sleep(300); s = await st();
ok('7b «Бирюза» leaves the skin (sepia, no data-skin), tile «Бабочковый» puts it back', s7.skin === '' && s7.set === 'sepia' && s.skin === 'babochkovyi' && s.set === 'babochkovyi', { s7, s });

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
ok('9 export → reset → import → reload: balance, owned, theme, worn skin identical; skin on screen', r9.ok && JSON.stringify(after) === JSON.stringify(before) && s.skin === 'babochkovyi', { r9, before, after, s });

// 9b. own icon set: sprite symbols redrawn while the skin is on (flower-2 for «Награды», flower for trophy, butterfly for the streak, cocoon for the level, silkworm for the profile), same ids
const ic1 = await p.evaluate(() => { const h = n => document.getElementById('i-' + n).innerHTML; return { gift: h('gift'), trophy: h('trophy'), flame: h('flame'), star: h('star'), user: h('user-round'), nav: [...document.querySelectorAll('#botnav use')].map(u => u.getAttribute('href')) }; });
ok('9b Бабочковый icons: flower-2, flower, butterfly, cocoon, silkworm; nav keeps the same ids', /M12 10v12/.test(ic1.gift) && /M12 16\.5A4\.5/.test(ic1.trophy) && /M12 9C10 5/.test(ic1.flame) && /M12 5c-4 2/.test(ic1.star) && /cy="14" r="6"/.test(ic1.user) && ic1.nav.includes('#i-gift'), ic1);
// 10. other skins stay «Скоро»; «Карандашный» still free and wearable
const soon = await p.evaluate(() => SHOP_CATALOG.filter(x => x.type === 'skin' && !shopReady(x.id)).map(x => x.id));
await p.evaluate(() => wear('skin-pencil')); await sleep(200); s = await st();
ok('10 the rest stay «Скоро», pencil wear still works', soon.length === 6 && s.skin === 'pencil' && s.set === 'pencil', { soon, s });
const ic2 = await p.evaluate(() => ({ gift: document.getElementById('i-gift').innerHTML, flame: document.getElementById('i-flame').innerHTML, el: document.querySelectorAll('#shelf .bb-cover').length, pc: document.querySelectorAll('#shelf .pc-cover').length }));
ok('10b leaving the skin: Lucide icons back, covers redrawn for the new skin', !/M12 10v12/.test(ic2.gift) && !/M12 9C10 5/.test(ic2.flame) && ic2.el === 0 && ic2.pc > 0, ic2);


// 11. «Дневник»: the mascot «Пыльца» 96px over the empty hint, no emoji; the closed rewards sheet is not painted
await p.evaluate(() => { wear('skin-babochkovyi'); S.quotes = []; save(); __navAllow = true; openJournal('quotes'); __navAllow = false; }); await sleep(400);
const dj = await p.evaluate(() => { const q = document.getElementById('quotes'), hint = q.querySelector('.emptyhint'), b = hint && getComputedStyle(hint, '::before');
  return { w: b && b.width, img: b && /data:image\/svg/.test(b.backgroundImage), emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q.textContent) }; });
ok('11 «Дневник»: silkworm mascot 96px over the empty hint, no emoji', dj.w === '96px' && dj.img && !dj.emoji, dj);
await p.screenshot({ path: SHOTS + 'babochkovyi-diary-390.png' });
// 12. contrast from the skin tokens: UI text ≥ 4.5 on surface and bg, day and night
const lum = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const tk12 = await p.evaluate(async () => { const out = {}; const r = document.documentElement, t0 = r.dataset.theme;
  for (const n of [false, true]) { if (n) r.dataset.theme = 'night'; else delete r.dataset.theme; await new Promise(q => setTimeout(q, 50)); const cs = getComputedStyle(r);
    out[n] = Object.fromEntries(['text', 'text-2', 'accent-text', 'bg', 'surface'].map(k => [k, cs.getPropertyValue('--rq-' + k).trim().slice(1)])); }
  if (t0) r.dataset.theme = t0; else delete r.dataset.theme; return out; });
const tkn = (k, n) => tk12[n][k];
const pairs = [false, true].flatMap(n => [['text', 'bg'], ['text', 'surface'], ['text-2', 'surface'], ['accent-text', 'surface']].map(([f, b]) => ({ n, f, b, r: +cr(tkn(f, n), tkn(b, n)).toFixed(2) })));
ok('12 UI contrast ≥ 4.5 (text, text-2, accent on surface/bg, day and night)', pairs.every(x => x.r >= 4.5), pairs);

ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY babochkovyi.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
