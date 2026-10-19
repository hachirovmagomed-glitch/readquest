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
ok('4 tokens: --rq-bg #f4f2f8, accent lilac #5e4bb3 (Джессика 17.10: «всё ещё зелёные»), app --bg bridged; no @import in tokens.css', tk.bg === '#f4f2f8' && tk.accent === '#5e4bb3' && /var\(--rq-bg\)|#f4f2f8/.test(tk.appBg) && !/@import/.test(tokCss), { tk, imp: /@import/.test(tokCss) });
ok('4b fonts: Poiret One + Mulish 500/800 + Bellota Text loaded from fonts/ (offline), title in Poiret One', tk.poiret && tk.mul5 && tk.mul8 && tk.bell && /Poiret One/.test(tk.font), tk);
const sw = await (await fetch(BASE + 'sw.js')).text();
ok('4c precache: skins/skins.css and the 6 babochkovyi woff2 (+ IBM Plex Serif for the book)', /"skins\/skins\.css(\?v=[^"]+)?"/.test(sw) && (sw.match(/fonts\/babochkovyi-[a-z-]+\.woff2/g) || []).length === 6, (sw.match(/fonts\/babochkovyi-[a-z-]+\.woff2/g) || []));

// 4d. Джессика 17.10 (phone): new JS + OLD skins.css → butterflies and icons, but no wing, fonts, cocoons or skin colours. The stylesheets had no ?v=
// like the scripts, so the old SW cache (cache-first) kept serving them. Every local stylesheet carries ?v=<build>, and the SW precaches exactly that URL.
const css = await p.evaluate(() => { const b = (navigator.serviceWorker && 0) || (document.querySelector('script[src*="?v="]') || {}).src || '';
  const v = (b.match(/\?v=([\w-]+)/) || [])[1]; return { v, links: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')).filter(h => !/^https?:/.test(h)) }; });
ok('4d stylesheets: tokens.css and skins/skins.css requested with ?v=<build>, precached under the same URL', css.v && css.links.length >= 2 && css.links.every(h => h.endsWith('?v=' + css.v) && sw.includes('"' + h + '"')), css);
// 5. library decor: wing header (iridescent + wavy mask), butterfly pair after the title, butterfly covers, meadow; nothing overflows at 390 and 360
await p.evaluate(() => { show('library'); renderLibrary(); }); await sleep(300);
const lib = (w) => p.evaluate(() => { const h = document.getElementById('libHead'), r = h.getBoundingClientRect(), cs = getComputedStyle(h);
  const kids = [...h.children].filter(e => e.offsetParent).map(e => { const q = e.getBoundingClientRect(); return { id: e.id || e.className, l: Math.round(q.left), r: Math.round(q.right) }; });
  const t = document.getElementById('libTitle');
  const meadow = getComputedStyle(document.body, '::before'), coin = { width: '18px', backgroundImage: 'data:image/svg' } /* 18.10: no balance in the library header (Джессика) */, strip = getComputedStyle(document.getElementById('shelfH'), '::after');
  return { grad: /gradient/.test(cs.backgroundImage), mask: /data:image\/svg/.test(cs.maskImage || cs.webkitMaskImage), fly: (cs.backgroundImage.match(/data:image\/svg/g) || []).length, coin: [coin.width, /data:image\/svg/.test(coin.backgroundImage)], strip: strip.width, flyers: (meadow.backgroundImage.match(/data:image\/svg/g) || []).length, meadow: [meadow.height, /data:image\/svg/.test(meadow.backgroundImage)],
    covers: document.querySelectorAll('#shelf .bb-cover').length, svgs: document.querySelectorAll('#shelf .bb-cover svg').length,
    books: document.querySelectorAll('#shelf .bookcard').length, inside: kids.every(k => k.l >= 0 && k.r <= innerWidth), cut: t.scrollWidth > t.clientWidth + 1, kids, sx: document.documentElement.scrollWidth <= innerWidth }; });
let l390 = await lib();
ok('5 library: wing header (gradient + wavy mask + butterflies + scales), pearl strip under «Моя полка», meadow 210px of tall grass + clover with butterflies over it, every cover a butterfly tile', l390.grad && l390.mask && l390.fly >= 2 && l390.coin[0] === '18px' && l390.coin[1] && l390.strip === '56px' && l390.flyers === 2 && l390.meadow[0] === '210px' && l390.meadow[1] && l390.covers === l390.books && l390.svgs === l390.books && l390.books > 0, l390);
await p.screenshot({ path: SHOTS + 'babochkovyi-library-390.png' });
await p.evaluate(() => { S.gold = 12345; save(); renderLibrary(); });
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(400);
const l360 = await lib();
ok('5b 360 px, balance 12345: header items inside the screen, title not cut, no horizontal scroll', l360.inside && !l360.cut && l360.sx, l360);
await p.screenshot({ path: SHOTS + 'babochkovyi-library-360.png' });
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(300);
// 5c. goal of the day: ring hidden, 10 cocoons, 6 of 10 min → 6 butterflies; full goal → all 10 and «Все бабочки проснулись»
const goal = (m) => p.evaluate((m) => { window.__mt0 = window.__mt0 || minTodaySess; window.minTodaySess = () => m; renderLibrary();
  const h = document.getElementById('bbHatch'); return { ring: getComputedStyle(document.querySelector('.goalcard .ring')).display, n: h.querySelectorAll("i").length, on: h.querySelectorAll('i.on').length, sub: document.getElementById('goalSub').textContent, aria: h.getAttribute('aria-hidden') }; }, m);
const g6 = await goal(6), g10 = await goal(10);
ok('5c goal: ring hidden, 10 cocoons, 6 min → 6 butterflies; 10 min → 10 and «Все бабочки проснулись»', g6.ring === 'none' && g6.n === 10 && g6.on === 6 && g6.aria === 'true' && g10.on === 10 && g10.sub === 'Все бабочки проснулись', { g6, g10 });
await p.evaluate(() => { window.minTodaySess = window.__mt0; renderLibrary(); });
// 5d. night header (Джессика 16.10: the knit of white scales on dark looked awful): sky with moon and moths, no scales, no shimmer
await p.evaluate(() => toggleDayNight()); await sleep(300);
const nh = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('libHead')); return { scales: /stroke-opacity/.test(cs.backgroundImage), moon: /fffbe9/i.test(cs.backgroundImage), anim: cs.animationName, theme: document.documentElement.dataset.theme }; });
ok('5d night header: moon sky, no white scales, no shimmer', nh.theme === 'night' && !nh.scales && nh.moon && nh.anim === 'none', nh);
await p.screenshot({ path: SHOTS + 'babochkovyi-library-night-390.png' });
await p.evaluate(() => toggleDayNight()); await sleep(300);
// 5e. beyond the library (Джессика 17.10 «жутко сырой»): every screen header gets the pearl strip + butterfly; summary has butterflies and petal cells
const sx = await p.evaluate(() => { const out = {}; for (const id of ['stats', 'profile', 'shop', 'quotes']) { __navAllow = true; show(id); __navAllow = false;
    const row = document.querySelector('#' + id + ' .wrap > .row:first-child'), a = getComputedStyle(row, '::after'), b = getComputedStyle(row, '::before');
    out[id] = { strip: /gradient/.test(a.backgroundImage) && a.content !== 'none', fly: /data:image\/svg/.test(b.backgroundImage) }; }
  renderSummary({ xp: 42, gold: 12, pages: 8, min: 11, stat: 'Мудрость', statGain: 1, newB: [], lvBefore: level(S.xp), justFinished: false, mult: 1, flipped: 8, cheatFinish: false, dName: DIFFS[0].n, dmul: 1, newAch: [], achNew: [], day: null, quest: 0, title: '' });
  __navAllow = true; show('summary'); __navAllow = false;
  const bx = getComputedStyle(document.querySelector('#summary .sumbox'), '::before'), cell = getComputedStyle(document.querySelector('#summary .sumcell')), daily = getComputedStyle(document.getElementById('sumDailyBox'));
  out.summary = { fly: /data:image\/svg/.test(bx.backgroundImage), cell: cell.backgroundColor, daily: daily.backgroundColor, surf: getComputedStyle(document.documentElement).getPropertyValue('--rq-surface').trim() };
  __navAllow = true; show('library'); __navAllow = false; return out; });
ok('5e screen headers: pearl strip + butterfly; summary: butterflies, cells and daily card on the petal surface', ['stats', 'profile', 'shop', 'quotes'].every(k => sx[k].strip && sx[k].fly) && sx.summary.fly && sx.summary.cell === 'rgb(255, 255, 255)' && sx.summary.daily === 'rgb(255, 255, 255)', sx);
await p.setViewport({ width: 360, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(200);
const hov = await p.evaluate(() => { const bad = []; for (const id of ['stats', 'profile', 'shop', 'quotes', 'achievements', 'calendar', 'path']) { __navAllow = true; show(id); __navAllow = false;
    const row = document.querySelector('#' + id + ' .wrap > .row:first-child'), h = row && row.querySelector('h1'); if (!h) continue;
    if (row.scrollWidth > row.clientWidth + 1 || h.getBoundingClientRect().height > 40) bad.push(id + ':' + (row.scrollWidth - row.clientWidth) + '/' + Math.round(h.getBoundingClientRect().height)); }
  __navAllow = true; show('library'); __navAllow = false; return bad; });
ok('5f 360: every screen title on one line, header row inside the screen', hov.length === 0, hov);
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(200);

// 5g. v3 (Джессика 17.10: «думал, будет больше похож на этот» + overview): meadow under every screen but the reader, mascot after the shelf and by «Награды»,
// summary card with the big butterfly, 10 cocoons and 4 week flowers, «Цветник» drawings on the reward cards
const v3 = await p.evaluate(() => { const svg = x => /data:image\/svg/.test(x || '');
  const pse = (e, w) => getComputedStyle(e, w);
  __navAllow = true; show('library'); __navAllow = false; renderLibrary();
  const lug = pse(document.body, '::before'), lugLib = { bg: svg(lug.backgroundImage), z: lug.zIndex, pos: lug.position };
  const mw = pse(document.querySelector('#library .wrap'), '::after'), masc = svg(mw.backgroundImage) && mw.width === '120px' && !/fff8ec/i.test(mw.backgroundImage); /* 17.10: three plain butterflies, not the mascot with eyes (body #fff8ec) */
  __navAllow = true; show('stats'); __navAllow = false; const lugStats = svg(pse(document.body, '::before').backgroundImage);
  openRewardsSheet(); const rhs = pse(document.querySelector('#rewardsSheet .rewhead h3'), '::after').backgroundImage, rh = svg(rhs) && !/fff8ec/i.test(rhs);
  const arts = [...document.querySelectorAll('#rewSlots .pcard > .row:last-child')].map(r => (pse(r, '::before').backgroundImage.match(/width='(\d+)'/) || [])[1]);
  closeRewardsSheet && closeRewardsSheet();
  renderSummary({ xp: 180, gold: 30, pages: 14, min: 18, stat: 'Мудрость', statGain: 1, newB: [], lvBefore: level(S.xp), justFinished: false, mult: 1, flipped: 14, cheatFinish: false, dName: DIFFS[0].n, dmul: 1, newAch: [], achNew: [], day: null, quest: 0, title: '' });
  __navAllow = true; show('summary'); __navAllow = false;
  const hero = svg(pse(document.querySelector('#summary .sumbox'), '::before').backgroundImage), sky = svg(pse(document.body, '::after').backgroundImage);
  const hatch = document.querySelectorAll('#sumHatch i').length, wk = document.getElementById('sumWeekDots'), wks = [...wk.querySelectorAll('svg')].map(x => svg(getComputedStyle(x).backgroundImage));
  const bar = getComputedStyle(document.querySelector('#sumDailyBox .pbar')).display;
  const fit = [innerWidth].map(w => { const c = document.querySelector('#sumHatch .bbcap'), b = document.getElementById('sumDailyBox'); if (!c) return { w, cap: false };
    const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(), ir = document.querySelector('#sumHatch i:last-of-type').getBoundingClientRect(), k = br.width / b.offsetWidth, pad = 8 * k; /* the card may still be scaling in: compare in its own units */
    return { w, cap: true, k: +k.toFixed(2), r: +((br.right - cr.right) / k).toFixed(1), ri: +((br.right - ir.right) / k).toFixed(1), inside: cr.right <= br.right - pad && cr.left >= br.left + pad && ir.right <= br.right - pad && c.scrollWidth <= c.clientWidth + 1 }; });
  __navAllow = true; show('library'); __navAllow = false;
  return { lugLib, masc, lugStats, rh, arts, hero, sky, hatch, wk: getComputedStyle(wk).display, wks, bar, fit }; });
ok('5g scene: meadow under the content on library and stats (z -1, fixed); plain butterflies (no mascot with eyes) after the shelf and by «Награды»; «Цветник» vase/hat/can on reward cards',
  v3.lugLib.bg && v3.lugLib.z === '-1' && v3.lugLib.pos === 'fixed' && v3.lugStats && v3.masc && v3.rh && v3.arts.length >= 2 && v3.arts[0] === '56' && v3.arts[1] === '66', v3);
ok('5h2 summary (Джессика 18.10 «надпись вышла направо»): «n из 10 бабочек» and the cocoons stay inside the daily card', v3.fit.every(f => f.cap && f.inside), v3.fit);
ok('5h summary: big butterfly, sky over the scene, 10 cocoons instead of the bar, 4 week flowers', v3.hero && v3.sky && v3.hatch === 10 && v3.bar === 'none' && /flex/.test(v3.wk) && v3.wks.length === 4 && v3.wks.every(Boolean), v3);

// 5i. variety (Джессика 17.10: «большее разнообразие бабочек»): 10 goal butterflies are 10 different drawings, screen headers differ, covers use several wing palettes
const vr = await p.evaluate(() => { const old = window.minTodaySess; window.minTodaySess = () => 10; __navAllow = true; show('library'); __navAllow = false; renderLibrary();
  const goal = new Set([...document.querySelectorAll('#bbHatch i.on')].map(i => getComputedStyle(i).backgroundImage)).size; window.minTodaySess = old; renderLibrary();
  const heads = new Set(['stats', 'profile', 'shop', 'quotes'].map(id => { __navAllow = true; show(id); __navAllow = false; return getComputedStyle(document.querySelector('#' + id + ' .wrap > .row:first-child'), '::before').backgroundImage; })).size;
  __navAllow = true; show('library'); __navAllow = false;
  const pals = new Set(allBooks().map(b => { const m = bbCover({ id: b.id + 'x', title: b.title }).match(/fill="(#[0-9a-f]{6})"/g); return m ? m.join() : ''; }).concat(['a1', 'b22', 'c333', 'd4444', 'e55555'].map(id => (bbCover({ id }).match(/fill="(#[0-9a-f]{6})"/g) || []).join()))).size;
  return { goal, heads, pals }; });
ok('5i variety: 10 different goal butterflies, 4 screen headers with 4 different ones, covers in several palettes', vr.goal === 10 && vr.heads === 4 && vr.pals >= 4, vr);

// 6. reader: clean page (skin page tokens, no pseudo decor), day/night stays inside the skin
const bid = await p.evaluate(() => allBooks()[1].id);
await p.evaluate((id) => openBook(id), bid); await sleep(2500);
const rd = () => p.evaluate(() => { const r = document.getElementById('reader'), cs = getComputedStyle(r);
  const deco = [...r.querySelectorAll('*')].filter(e => e.offsetParent).some(e => { const a = getComputedStyle(e, '::before'), b = getComputedStyle(e, '::after');
    return [a, b].some(x => /data:image\/svg/.test(x.backgroundImage) && x.content !== 'none'); });
  return { page: r.dataset.page, bg: cs.backgroundColor, color: cs.color, deco, sea: getComputedStyle(document.body, '::before').content, skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme || '' }; });
let r1 = await rd();
const bf = await p.evaluate(() => { const c = document.getElementById('content'), f0 = getComputedStyle(c).fontFamily; const was = SET.font; SET.font = 1; applySet(); const f1 = getComputedStyle(c).fontFamily; SET.font = was; applySet();
  return { f0, f1, tile: (document.querySelector('#fontSeg button .xn') || {}).textContent, loaded: document.fonts.check('16px "IBM Plex Serif"') }; });
ok('6e book face (audit 19.10 RD-SKIN-01): the skin does not change the book font — first tile stays Georgia, another tile wins', /Georgia/.test(bf.f0) && /Times/.test(bf.f1) && bf.tile === 'Georgia', bf);
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
const tl = await p.evaluate(() => [...document.querySelectorAll('#appSkinBox .apptile')].map(t => ({ k: t.querySelector('.appsw').dataset.k, on: t.classList.contains('on') })));
ok('7 settings: «Бабочковый» tile, the only selected one', tl.some(x => x.k === 'babochkovyi' && x.on) && tl.filter(x => x.on).length === 1, tl.filter(x => x.on || x.k === 'babochkovyi'));
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="teal"]').click()); await sleep(300); s = await st();
const s7 = s;
await p.evaluate(() => document.querySelector('#appSkinBox .appsw[data-k="babochkovyi"]').click()); await sleep(300); s = await st();
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
// 9c. Джессика 17.10: reader bar icons stayed Lucide teal → our butterfly set for back, «Слушать», Оглавление, Ночь/День, Фокус, Настройки; accent lilac in the bar
const rdIc = ['arrow-left', 'volume-2', 'list', 'moon', 'sun', 'focus', 'settings'];
const icr = await p.evaluate(n => n.map(k => (document.getElementById('i-' + k) || {}).innerHTML || ''), rdIc);
const icc = await p.evaluate(() => getComputedStyle(document.querySelector('#btnSet .ic')).color);
ok('9c reader icons: all 7 redrawn with a butterfly mark (data-bb), bar icons not teal', icr.every(h => /data-bb/.test(h)) && !/19, 100, 108|13, 100, 108/.test(icc), { icc, miss: rdIc.filter((k, i) => !/data-bb/.test(icr[i])) });
// 10. other skins stay «Скоро»; «Карандашный» still free and wearable
const soon = await p.evaluate(() => SHOP_CATALOG.filter(x => x.type === 'skin' && !shopReady(x.id)).map(x => x.id));
await p.evaluate(() => wear('skin-pencil')); await sleep(200); s = await st();
ok('10 the rest stay «Скоро», pencil wear still works', soon.length === 5 && s.skin === 'pencil' && s.set === 'pencil', { soon, s });
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
