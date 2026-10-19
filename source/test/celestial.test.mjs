// Skin «Небесный» (Джессика 17.10: «следующим внедрять Небесный скин»; prototype /mnt/project-files/skins/rannie/mockups/celestial, pack handoff/skins/celestial).
// Same contract as «Эллада» / «Бабочковый»: catalog 800, one bundled colour, buy once, wear → html[data-skin=celestial] + reader theme 'celestial';
// day/night inside the skin; tokens and woff2 fonts from the build; the book page stays flat paper (no sky, no stars), book font Lora;
// sky + gold frames on the app screens; night-sky covers; own reader icons; pale night accent gets dark text; 360 fits; contrast; reduced motion.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node celestial.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const st = () => p.evaluate(() => ({ skin: document.documentElement.dataset.skin || '', theme: document.documentElement.dataset.theme || '', set: SET.theme, worn: shopWorn() }));
const lum = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
const hex = rgb => rgb.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');

// 1. catalog
const cat = await p.evaluate(() => { const it = shopItem('skin-celestial'); return { name: it.name, price: it.price, ready: shopReady('skin-celestial'), cols: SHOP_CATALOG.filter(x => x.skin === 'skin-celestial').length }; });
ok('1 catalog: «Небесный» 800, ready (not «Скоро»), one bundled colour', cat.name === 'Небесный' && cat.price === 800 && cat.ready && cat.cols === 1, cat);
// 2. not owned
await p.evaluate(() => { S.gold = 0; save(); });
const w0 = await p.evaluate(() => wear('skin-celestial'));
ok('2 not owned: wear() refused, no skin on :root', w0 === false && (await st()).skin === '', w0);
// 3. buy once, wear
await p.evaluate(() => { S.gold = 900; save(); });
const b1 = await p.evaluate(() => buy('skin-celestial')), b2 = await p.evaluate(() => buy('skin-celestial')), g = await p.evaluate(() => S.gold);
ok('3 buy: 900 → 100 once, second buy refused (owned)', b1.ok && !b2.ok && b2.reason === 'owned' && g === 100, { b1, b2, g });
await p.evaluate(() => wear('skin-celestial')); await sleep(300); let s = await st();
ok('3b wear → html[data-skin=celestial], day, SET.theme celestial', s.skin === 'celestial' && s.theme === '' && s.set === 'celestial' && s.worn === 'skin-celestial', s);

// 4. tokens + fonts + precache
const tk = await p.evaluate(async () => { const cs = getComputedStyle(document.documentElement);
  await document.fonts.load('700 30px "Cormorant Garamond"', 'Библиотека'); await document.fonts.load('500 15px "Manrope"', 'Цель'); await document.fonts.load('800 15px "Manrope"', '42'); await document.fonts.load('400 16px "Lora"', 'Текст');
  const has = (n, w) => [...document.fonts].some(f => f.family.replace(/"/g, '') === n && (!w || f.weight === w) && f.status === 'loaded');
  return { bg: cs.getPropertyValue('--rq-bg').trim(), accent: cs.getPropertyValue('--rq-accent').trim(), corm: has('Cormorant Garamond'), man5: has('Manrope', '500'), man8: has('Manrope', '800'), lora: has('Lora', '400'),
    font: getComputedStyle(document.getElementById('libTitle')).fontFamily, ui: getComputedStyle(document.body).fontFamily }; });
ok('4 tokens: --rq-bg #f6efe2, accent ink #3f4a82 (not the app teal); Cormorant title, Manrope UI, Lora loaded', tk.bg === '#f6efe2' && tk.accent === '#3f4a82' && tk.corm && tk.man5 && tk.man8 && tk.lora && /Cormorant Garamond/.test(tk.font) && /Manrope/.test(tk.ui), tk);
const sw = await (await fetch(BASE + 'sw.js')).text(), tokCss = await (await fetch(BASE + 'tokens.css')).text();
const fw = sw.match(/fonts\/celestial-[a-z-]+\.woff2/g) || [];
ok('4b precache: the 6 celestial woff2; tokens.css carries the skin, no @import', fw.length === 6 && /\[data-skin="celestial"\]/.test(tokCss) && !/@import/.test(tokCss), fw);

// 5. app screens: sky on the root (body transparent), gold-framed cards, covers, balance coin; 390 and 360 fit
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; renderLibrary(); }); await sleep(300);
const lib = () => p.evaluate(() => { const root = getComputedStyle(document.documentElement), card = document.querySelector('#shelf .cover'), cs = card && getComputedStyle(card);
  const covers = [...document.querySelectorAll('#shelf .cl-cover')], inks = new Set(covers.map(c => c.className)), emb = new Set(covers.map(c => c.querySelector('svg').innerHTML));
  const kids = [...document.querySelectorAll('#libHead > *, #libHead .row > *')].map(e => e.getBoundingClientRect()).filter(r => r.width);
  return { sky: /data:image\/svg/.test(root.backgroundImage) && /gradient/.test(root.backgroundImage), body: getComputedStyle(document.body).backgroundColor, frame: cs && /0px 0px 0px 1\.5px/.test(cs.boxShadow) && /0px 0px 0px 3px/.test(cs.boxShadow),
    covers: covers.length, inks: inks.size, emb: emb.size, coin: !document.getElementById('goldChip') /* 18.10: no balance in the library header */,
    inside: kids.every(r => r.left >= 0 && r.right <= innerWidth + 0.5), sx: document.documentElement.scrollWidth <= innerWidth }; });
const l390 = await lib();
ok('5 library: sky + star dust on the root, body transparent, gold-framed covers, dusk covers (≥2 inks, ≥2 emblems), no balance chip, fits 390', l390.sky && l390.body === 'rgba(0, 0, 0, 0)' && l390.frame && l390.covers >= 3 && l390.inks >= 2 && l390.emb >= 2 && l390.coin && l390.inside && l390.sx, l390);
await p.screenshot({ path: SHOTS + 'celestial-library-390.png' });
const labels = await p.evaluate(() => [...document.querySelectorAll('#shelf .cl-cover')].map(c => { const bg = getComputedStyle(c).backgroundImage.match(/rgb\([^)]+\)/g) || []; return { c: getComputedStyle(c.querySelector('i')).color, bg }; }));
const lc = labels.flatMap(x => x.bg.map(b => cr(hex(x.c), hex(b))));
ok('5b cover format label ≥ 4.5 on both ends of every ink', lc.length && lc.every(r => r >= 4.5), lc);
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(300);
const l360 = await lib();
const hov = await p.evaluate(() => { const bad = []; for (const id of ['stats', 'profile', 'quotes', 'achievements', 'calendar', 'path', 'look']) { __navAllow = true; show(id); __navAllow = false;
    const row = document.querySelector('#' + id + ' .wrap > .row:first-child'), h = row && row.querySelector('h1'); if (!h) continue;
    if (row.scrollWidth > row.clientWidth + 1 || h.getBoundingClientRect().height > 44) bad.push(id + ':' + (row.scrollWidth - row.clientWidth) + '/' + Math.round(h.getBoundingClientRect().height)); }
  __navAllow = true; show('library'); __navAllow = false; return { bad, sx: document.documentElement.scrollWidth <= innerWidth }; });
const tt = await p.evaluate(() => { libGoldRender(); const t = document.getElementById('libTitle'); return { full: t.scrollWidth <= t.clientWidth + 1, chip: null }; });
ok('5c2 360: the title «Библиотека» stays whole (the coins shorten to the number instead)', tt.full, tt);
ok('5c 360: library header inside, every screen title on one line, no horizontal scroll', l360.inside && l360.sx && !hov.bad.length && hov.sx, { l360, hov });
await p.screenshot({ path: SHOTS + 'celestial-library-360.png' });
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(200);
const hd = await p.evaluate(() => { __navAllow = true; show('stats'); __navAllow = false; const a = getComputedStyle(document.querySelector('#stats .wrap > .row:first-child'), '::after');
  __navAllow = true; show('summary'); __navAllow = false; const b = getComputedStyle(document.querySelector('#summary .sumbox'), '::before'), cell = document.querySelector('#summary .sumcell b');
  const r = { div: /data:image\/svg/.test(a.backgroundImage), stars: /data:image\/svg/.test(b.backgroundImage), num: cell && getComputedStyle(cell).fontFamily };
  __navAllow = true; show('library'); __navAllow = false; return r; });
ok('5d screen header: gold line with a diamond; summary: three stars, numbers in Manrope (not old-style Cormorant digits)', hd.div && hd.stars && /Manrope/.test(hd.num), hd);

// 5e. v2 after the prototype (Джессика 17.10: «очень отличным от того, что было в моих скриншотах», «вдохновлялся Геншин Импактом»):
// covers in a grid of three with the title on the cover; gold corner brackets on panels; a floating framed bottom nav
const g3 = async () => p.evaluate(() => { const sh = document.getElementById('shelf'), cards = [...sh.querySelectorAll('.bookcard')].slice(0, 3).map(c => c.getBoundingClientRect());
  const t = sh.querySelector('.cl-cover .cl-t'), cv = sh.querySelector('.cover').getBoundingClientRect();
  return { cols: getComputedStyle(sh).gridTemplateColumns.split(' ').length, row: cards.length === 3 && cards.every(r => Math.abs(r.top - cards[0].top) < 1), right: cards.length && cards[2].right <= innerWidth,
    title: t && getComputedStyle(t).display !== 'none' && /Cormorant/.test(getComputedStyle(t).fontFamily) && t.textContent.length > 0, tall: cv.height > cv.width * 1.2 }; });
const gA = await g3(); await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(300);
const gB = await g3(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(200);
ok('5e shelf: three covers per row (390 and 360), tall covers with the title in Cormorant on them', [gA, gB].every(x => x.cols === 3 && x.row && x.right && x.title && x.tall), { gA, gB });
const ct = await p.evaluate(() => [...document.querySelectorAll('#shelf .cl-cover')].map(c => ({ c: getComputedStyle(c.querySelector('.cl-t')).color, bg: getComputedStyle(c).backgroundImage.match(/rgb\([^)]+\)/g) || [] })));
const ctr = ct.flatMap(x => x.bg.map(b => cr(hex(x.c), hex(b))));
ok('5f cover title ≥ 4.5 on both ends of every ink', ctr.length && ctr.every(r => r >= 4.5), ctr);
const fr = await p.evaluate(() => { __navAllow = true; show('summary'); __navAllow = false;
  const n = s => { const e = document.querySelector(s); return e ? (getComputedStyle(e).backgroundImage.match(/data:image\/svg/g) || []).length : 0; };
  __navAllow = true; show('library'); __navAllow = false; const bn = document.getElementById('botnav').getBoundingClientRect(); __navAllow = true; show('summary'); __navAllow = false;
  const r = { goal: n('.goalcard'), sum: n('#summary .sumbox'), nav: n('#botnav'), float: bn.left >= 10 && innerWidth - bn.right >= 10 && innerHeight - bn.bottom >= 8, head: getComputedStyle(document.getElementById('sumHead')).fontSize };
  __navAllow = true; show('library'); __navAllow = false; return r; });
ok('5g gold corner brackets (4) on the goal card, summary and bottom nav; the nav floats inside the screen; summary title 30px', fr.goal === 4 && fr.sum === 4 && fr.nav === 4 && fr.float && fr.head === '30px', fr);

// 5h. «скин небесный едет в разные стороны» (Джессика 17.10, видео с телефона 411px): the library header overflowed («230 монет» + Cormorant title),
// the screen scroller became sideways-scrollable and slid under a diagonal swipe. Now the title gives way and screens never scroll sideways.
const sd = await p.evaluate(async () => { const t = document.getElementById('libTitle'), g0 = S.gold; S.gold = 230; save(); renderLibrary(); t.style.fontSize = '44px'; /* ≈ Android text scaling 130 % */
  await new Promise(q => setTimeout(q, 150)); const s = document.querySelector('#library > .scroll'), chip = { right: 0 } /* 18.10: no balance chip */;
  s.scrollLeft = 40; const r = { chipIn: chip.right <= innerWidth + 0.5, ox: getComputedStyle(s).overflowX, left: s.scrollLeft, sw: document.documentElement.scrollWidth <= innerWidth };
  t.style.fontSize = ''; S.gold = g0; save(); renderLibrary(); return r; });
ok('5h wide header (big title): the library never scrolls sideways', sd.chipIn && sd.ox === 'hidden' && sd.sw, sd);

const tc = await p.evaluate(() => { syncThemeColor(); return (document.querySelector('meta[name=theme-color]') || {}).content; });
ok('5i browser bar (theme-color) = the skin paper #f6efe2, not black (body is transparent over the sky)', tc === '#f6efe2', tc);
// 6. reader: the page is flat paper over the sky, book font Lora, own icons, chrome title in Cormorant
await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
await p.evaluate(() => showChrome()); await sleep(500);
const rd = await p.evaluate(() => { const r = document.getElementById('reader'), at = document.elementFromPoint(200, 420), cs = getComputedStyle(r);
  return { bg: cs.backgroundColor, opaque: !/rgba\(.*, 0\)$/.test(cs.backgroundColor), font: getComputedStyle(document.getElementById('content')).fontFamily, at: at && r.contains(at),
    title: getComputedStyle(document.getElementById('rTitle')).fontFamily, ic: ['arrow-left', 'list', 'settings'].every(n => document.getElementById('i-' + n).innerHTML.replace(/\s/g, '') !== '' && SKIN_ICONS.celestial[n]),
    seg: (document.querySelector('#fontSeg button') || {}).textContent || '' }; });
const th = await p.evaluate(() => ({ thumb: [...document.styleSheets].some(sh => { try { return [...sh.cssRules].some(r => /celestial.*#pgSlider::-webkit-slider-thumb/.test(r.selectorText || '') && /--cl-thumb/.test(r.cssText)); } catch (e) { return false; } }), dia: /data:image\/svg/.test(getComputedStyle(document.getElementById('rPage'), '::before').backgroundImage), top: /gradient/.test(getComputedStyle(document.querySelector('#reader .rhead')).backgroundImage) }));
ok('6c reader chrome: diamond slider thumb, diamonds around the page count, sky gradient over the title', th.thumb && th.dia && th.top, th);
ok('6 reader: opaque page #fbf6ea over the sky, book keeps the reader font (audit 19.10: a skin never changes it), title in Cormorant, own reader icons', rd.bg === 'rgb(251, 246, 234)' && rd.at && /Georgia/.test(rd.font) && /Cormorant/.test(rd.title) && rd.ic, rd);
await p.screenshot({ path: SHOTS + 'celestial-reader-390.png' });
await p.evaluate(() => { toggleDayNight(); }); await sleep(500);
const rn = await p.evaluate(() => ({ bg: getComputedStyle(document.getElementById('reader')).backgroundColor, theme: document.documentElement.dataset.theme, set: SET.theme }));
ok('6b night: page #14172a, data-theme night, SET.theme celestial-night', rn.bg === 'rgb(20, 23, 42)' && rn.theme === 'night' && rn.set === 'celestial-night', rn);
await p.screenshot({ path: SHOTS + 'celestial-reader-night-390.png' });

// 7. night app: gold accent with dark text on every accent fill (the app paints literal #fff there)
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; openRewardsSheet(); }); await sleep(500);
const nb = await p.evaluate(() => [...document.querySelectorAll('#rewSlots .buy, #rewSlots .tierseg button.on, #libChips .fchip.on, .botnav-btn.on')].filter(e => e.offsetParent)
  .map(e => { const c = getComputedStyle(e); return { t: e.textContent.trim().slice(0, 14), c: c.color, b: c.backgroundColor }; }).filter(x => !/rgba\(0, 0, 0, 0\)/.test(x.b)));
const nbr = nb.map(x => ({ ...x, r: cr(hex(x.c), hex(x.b)) }));
const rar = await p.evaluate(async () => { ensureMvpRewards(); while (S.rewards.length < 3) addRewardSlot && addRewardSlot(); ['small', 'mid', 'big'].forEach((t, i) => { if (S.rewards[i]) S.rewards[i].tier = t; }); renderRewardsSheet(); await new Promise(q => setTimeout(q, 100));
  return [...document.querySelectorAll('#rewSlots .pcard')].slice(0, 3).map(c => ({ bg: getComputedStyle(c).backgroundImage, st: getComputedStyle(c, '::before').width, c: getComputedStyle(c).color })); });
const rarC = rar.flatMap(x => (x.bg.match(/rgb\([^)]+\)/g) || []).map(b => cr(hex(x.c), hex(b))));
ok('7c rewards: tiers coloured like rarity (3 different gradients, 3/4/5 stars), card text ≥ 4.5', rar.length === 3 && new Set(rar.map(x => x.bg)).size === 3 && new Set(rar.map(x => x.st)).size === 3 && rarC.every(r => r >= 4.5), { rar: rar.map(x => x.st), rarC });
ok('7 night: text on accent fills ≥ 4.5 (buy buttons, tiers, active tab)', nbr.length >= 2 && nbr.every(x => x.r >= 4.5), nbr);
await p.screenshot({ path: SHOTS + 'celestial-rewards-night-390.png' });
await p.evaluate(() => closeRewardsSheet()); await sleep(300);

// 7b. «Внешний вид → Магазин скинов»: «Небесный» is «Надето», «Надеть» on an owned skin keeps readable text (was white on cream)
await p.evaluate(() => { toggleDayNight(); openLook(true); }); await sleep(600);
const shp = await p.evaluate(() => [...document.querySelectorAll('#look .shopcta')].map(e => { const c = getComputedStyle(e); return { t: e.textContent.trim(), c: c.color, b: c.backgroundColor, card: (e.closest('.shopcard') || {}).textContent || '' }; }));
const own = shp.filter(x => x.t === 'Надеть').map(x => ({ ...x, card: undefined, r: cr(hex(x.c), hex(x.b)) }));
ok('7b shop: «Небесный» shows «Надето», «Надеть» text ≥ 4.5 on its fill', shp.some(x => /Небесный/.test(x.card) && x.t === 'Надето') && own.length >= 1 && own.every(x => x.r >= 4.5), { own, cel: shp.filter(x => /Небесный/.test(x.card)).map(x => x.t) });
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; toggleDayNight(); }); await sleep(300);
// 8. contrast from the tokens, day and night
const tkc = await p.evaluate(async () => { const out = {}; const r = document.documentElement, t0 = r.dataset.theme;
  for (const n of [false, true]) { if (n) r.dataset.theme = 'night'; else delete r.dataset.theme; await new Promise(q => setTimeout(q, 50)); const cs = getComputedStyle(r);
    out[n] = Object.fromEntries(['text', 'text-2', 'accent-text', 'accent', 'on-accent', 'coin', 'bg', 'surface', 'surface-2'].map(k => [k, cs.getPropertyValue('--rq-' + k).trim().slice(1)])); }
  if (t0) r.dataset.theme = t0; else delete r.dataset.theme; return out; });
const pairs = [false, true].flatMap(n => [['text', 'bg'], ['text', 'surface'], ['text-2', 'surface'], ['text-2', 'surface-2'], ['accent-text', 'surface'], ['on-accent', 'accent'], ['coin', 'surface']].map(([f, b]) => ({ n, f, b, r: cr(tkc[n][f], tkc[n][b]) })));
ok('8 UI contrast ≥ 4.5 (text, text-2, accent, on-accent, coin; day and night); book page ≥ 7', pairs.every(x => x.r >= 4.5) && cr('2b2742', 'fbf6ea') >= 7 && cr('e7dcc6', '14172a') >= 7, pairs.filter(x => x.r < 4.5));

// 9. reduced motion, leaving the skin
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(200);
const anim = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); return c.animationName !== 'none' && parseFloat(c.animationDuration) > 0; }).map(e => e.id || e.className).slice(0, 5));
ok('9 prefers-reduced-motion: no running animation', anim.length === 0, anim);
await p.emulateMediaFeatures([]);
await p.evaluate(() => wear('skin-pencil')); await sleep(300);
const lv = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, cl: document.querySelectorAll('.cl-cover').length, list: document.getElementById('i-list').innerHTML.includes('M5 3.8') }));
ok('9b leaving the skin: no celestial covers or icons left', lv.skin === 'pencil' && lv.cl === 0 && !lv.list, lv);

ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY celestial.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
