// Skin «Страна чудес» (key alisa; Джессика 04.11: «давай внедрять скин алисы в стране чудес»; pack handoff/skins/strana-chudes, app tokens handoff/skins/alisa).
// Same contract as «Небесный»: catalog 500, one bundled colour, buy once, wear → html[data-skin=alisa] + reader theme 'alisa'; day/night inside the skin;
// tokens and woff2 fonts from the build; the book page stays flat paper (no hatch, no falling things), the book font is not the skin's;
// playing-card covers, the ace of hearts for «Читать», own icons, level names, focus sounds, highlight names; 360 fits; contrast; reduced motion.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node alisa.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
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
const cat = await p.evaluate(() => { const it = shopItem('skin-alisa'); return { name: it.name, price: it.price, ready: shopReady('skin-alisa'), cols: SHOP_CATALOG.filter(x => x.skin === 'skin-alisa').length }; });
ok('1 catalog: «Страна чудес» 500, ready (not «Скоро»), one bundled colour', cat.name === 'Страна чудес' && cat.price === 500 && cat.ready && cat.cols === 1, cat);
// 2. not owned
await p.evaluate(() => { S.gold = 0; save(); });
const w0 = await p.evaluate(() => wear('skin-alisa'));
ok('2 not owned: wear() refused, no skin on :root', w0 === false && (await st()).skin === '', w0);
// 3. buy once, wear
await p.evaluate(() => { S.gold = 600; save(); });
const b1 = await p.evaluate(() => buy('skin-alisa')), b2 = await p.evaluate(() => buy('skin-alisa')), g = await p.evaluate(() => S.gold);
ok('3 buy: 600 → 100 once, second buy refused (owned)', b1.ok && !b2.ok && b2.reason === 'owned' && g === 100, { b1, b2, g });
await p.evaluate(() => { if (appIsNight()) toggleAppNight(); wear('skin-alisa'); }); await sleep(300); let s = await st();
ok('3b wear → html[data-skin=alisa], day, SET.theme alisa', s.skin === 'alisa' && s.theme === '' && s.set === 'alisa' && s.worn === 'skin-alisa', s);

// 4. tokens + fonts + precache
const tk = await p.evaluate(async () => { const cs = getComputedStyle(document.documentElement);
  await document.fonts.load('700 30px "Playfair Display SC"', 'Библиотека'); await document.fonts.load('500 15px "Fira Sans"', 'Цель'); await document.fonts.load('700 15px "Fira Sans"', '42');
  const has = (n, w) => [...document.fonts].some(f => f.family.replace(/"/g, '') === n && (!w || f.weight === w) && f.status === 'loaded');
  return { bg: cs.getPropertyValue('--rq-bg').trim(), accent: cs.getPropertyValue('--rq-accent').trim(), pf: has('Playfair Display SC'), fira: has('Fira Sans', '500'),
    font: getComputedStyle(document.getElementById('libTitle')).fontFamily, ui: getComputedStyle(document.body).fontFamily }; });
ok('4 tokens: --rq-bg #f4ecd9, accent hearts red #a3202a; Playfair SC title, Fira Sans UI', tk.bg === '#f4ecd9' && tk.accent === '#a3202a' && tk.pf && tk.fira && /Playfair Display SC/.test(tk.font) && /Fira Sans/.test(tk.ui), tk);
const sw = await (await fetch(BASE + 'sw.js')).text(), tokCss = await (await fetch(BASE + 'tokens.css')).text();
const fw = sw.match(/fonts\/alisa-[a-z-]+\.woff2/g) || [];
ok('4b precache: the 3 alisa woff2; tokens.css carries the skin, no @import, no book font of its own', fw.length === 3 && /\[data-skin="alisa"\]/.test(tokCss) && !/@import/.test(tokCss) && !/\[data-skin="alisa"\][^}]*--rq-font-read/.test(tokCss), fw);

// 5. app screens: hatch + falling things on the root, card covers, ex-libris frames, the ace for «Читать»
await p.evaluate(() => { navGo('library'); renderLibrary(); }); await sleep(400);
const lib = await p.evaluate(() => { const root = getComputedStyle(document.documentElement), cv = document.querySelectorAll('#shelf .al-cover'), brd = document.querySelector('#botnav .botnav-read .brd'), bc = brd && getComputedStyle(brd);
  return { fall: /data:image\/svg/.test(root.backgroundImage) && /repeating-linear-gradient/.test(root.backgroundImage), body: getComputedStyle(document.body).backgroundColor,
    covers: cv.length, kinds: [...cv].map(c => c.className.replace('al-cover ', '')), title: cv[0] && getComputedStyle(cv[0].querySelector('.al-t')).fontFamily,
    ace: bc && /data:image\/svg/.test(bc.backgroundImage) && bc.transform !== 'none', aceIc: brd && getComputedStyle(brd.querySelector('.ic')).display,
    nav: getComputedStyle(document.getElementById('botnav')).borderTopStyle, sw: document.documentElement.scrollWidth <= innerWidth }; });
ok('5 library: hatch + falling things on the root, body transparent, playing-card covers with the title in Playfair SC', lib.fall && lib.body === 'rgba(0, 0, 0, 0)' && lib.covers >= 1 && /Playfair/.test(lib.title || ''), lib);
ok('5b «Читать» = the ace of hearts (svg card, tilted, no icon on it); the nav is an ink-framed panel; no sideways scroll', lib.ace && lib.aceIc === 'none' && lib.nav === 'solid' && lib.sw, lib);
const hd = await p.evaluate(() => { navGo('profile'); const row = document.querySelector('#profile .wrap > .row:first-child'), a = row && getComputedStyle(row, '::after');
  const gc = document.querySelector('.goalcard'); return { div: !!a && /data:image\/svg/.test(a.backgroundImage), corners: gc ? (getComputedStyle(gc).backgroundImage.match(/url\(/g) || []).length : 0 }; });
ok('5c screen header: double rule with a heart; goal card with 4 ex-libris curls', hd.div && hd.corners === 4, hd);
const sm = await p.evaluate(() => { __navAllow = true; show('summary'); __navAllow = false; const h = getComputedStyle(document.getElementById('sumHead'), '::before'), b = getComputedStyle(document.querySelector('#summary .sumbox'), '::after');
  return { roses: /data:image\/svg/.test(h.backgroundImage), chess: /conic-gradient/.test(b.backgroundImage) }; });
ok('5d summary: roses over the title, chessboard band on the certificate', sm.roses && sm.chess, sm);
const tc = await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; syncThemeColor(); return (document.querySelector('meta[name=theme-color]') || {}).content; });
ok('5e browser bar (theme-color) = the skin paper #f4ecd9', tc === '#f4ecd9', tc);
// 5f. skin details in JS: icons, level names, focus sounds, highlight names, confetti
const js = await p.evaluate(() => ({ ic: ['book-open', 'gift', 'user-round', 'settings', 'moon', 'coins'].every(n => SKIN_ICONS.alisa[n] && SKIN_ICONS_ORIG[n] && document.getElementById('i-' + n).innerHTML !== SKIN_ICONS_ORIG[n]),
  lvl: lvlName(4), snd: fzSoundList().map(x => x[1]).join(','), hl: hlName('p'), conf: confettiPiece(0).c }));
ok('5f own icons on the sprite, levels Двойка…Туз, focus sounds, highlight «Червы», card-suit confetti', js.ic && js.lvl === 'Туз' && /Часы Кролика/.test(js.snd) && js.hl === 'Червы' && js.conf === 'heart', js);

// 6. reader: flat page, reader font untouched, title in Playfair SC, watch on the slider
await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
await p.evaluate(() => showChrome()); await sleep(500);
const rd = await p.evaluate(() => { const r = document.getElementById('reader'), cs = getComputedStyle(r);
  return { bg: cs.backgroundColor, img: cs.backgroundImage, font: getComputedStyle(document.getElementById('content')).fontFamily, title: getComputedStyle(document.getElementById('rTitle')).fontFamily,
    thumb: [...document.styleSheets].some(sh => { try { return [...sh.cssRules].some(x => /alisa.*#pgSlider::-webkit-slider-thumb/.test(x.selectorText || '') && /--al-watch/.test(x.cssText)); } catch (e) { return false; } }) }; });
ok('6 reader: flat page #f8f3e6 without decor, the book keeps the reader font, title in Playfair SC, pocket-watch thumb', rd.bg === 'rgb(248, 243, 230)' && rd.img === 'none' && !/Playfair|Fira/.test(rd.font) && /Playfair/.test(rd.title) && rd.thumb, rd);
await p.evaluate(() => { toggleDayNight(); }); await sleep(500);
const rn = await p.evaluate(() => ({ bg: getComputedStyle(document.getElementById('reader')).backgroundColor, theme: document.documentElement.dataset.theme, set: SET.theme }));
ok('6b night («кроличья нора»): page #0f1120, data-theme night, SET.theme alisa-night', rn.bg === 'rgb(15, 17, 32)' && rn.theme === 'night' && rn.set === 'alisa-night', rn);

// 7. night app: text on accent fills ≥ 4.5; nav corners not tiled
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; }); await sleep(400);
const nb = await p.evaluate(() => { const n = getComputedStyle(document.getElementById('botnav')), on = document.querySelector('.botnav-btn.on'), c = getComputedStyle(on);
  return { rep: n.backgroundRepeat, c: c.color, b: c.backgroundColor }; });
ok('7 night: active tab text ≥ 4.5 on the pale red; the nav corner curls are not tiled', cr(hex(nb.c), hex(nb.b)) >= 4.5 && /^no-repeat/.test(nb.rep), { ...nb, r: cr(hex(nb.c), hex(nb.b)) });
await p.evaluate(() => { toggleDayNight(); }); await sleep(300);
// 8. contrast from the tokens, day and night; book page ≥ 7
const tkc = await p.evaluate(async () => { const out = {}; const r = document.documentElement, t0 = r.dataset.theme;
  for (const n of [false, true]) { if (n) r.dataset.theme = 'night'; else delete r.dataset.theme; await new Promise(q => setTimeout(q, 50)); const cs = getComputedStyle(r);
    out[n] = Object.fromEntries(['text', 'text-2', 'accent-text', 'accent', 'on-accent', 'coin', 'bg', 'surface', 'surface-2'].map(k => [k, cs.getPropertyValue('--rq-' + k).trim().slice(1)])); }
  if (t0) r.dataset.theme = t0; else delete r.dataset.theme; return out; });
const pairs = [false, true].flatMap(n => [['text', 'bg'], ['text', 'surface'], ['text-2', 'surface'], ['text-2', 'surface-2'], ['accent-text', 'surface'], ['on-accent', 'accent'], ['coin', 'surface']].map(([f, b]) => ({ n, f, b, r: cr(tkc[n][f], tkc[n][b]) })));
ok('8 UI contrast ≥ 4.5 (day and night); book page ≥ 7', pairs.every(x => x.r >= 4.5) && cr('1c1a17', 'f8f3e6') >= 7 && cr('e2dccb', '0f1120') >= 7, pairs.filter(x => x.r < 4.5));
// 8b. covers: label text on the card faces ≥ 4.5
const cvc = await p.evaluate(() => [...document.querySelectorAll('#shelf .al-cover:not(.al-chess)')].map(c => ({ k: c.className, c: getComputedStyle(c.querySelector('.al-t')).color, b: getComputedStyle(c).backgroundColor })));
ok('8b cover titles ≥ 4.5 on their card', cvc.length >= 1 && cvc.every(x => cr(hex(x.c), hex(x.b)) >= 4.5), cvc.map(x => ({ k: x.k, r: cr(hex(x.c), hex(x.b)) })));

// 9. 360 fits
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(400);
const f360 = await p.evaluate(() => { const t = document.getElementById('libTitle').getBoundingClientRect(), n = document.getElementById('botnav').getBoundingClientRect();
  return { sw: document.documentElement.scrollWidth <= innerWidth, title: t.right <= innerWidth, nav: n.left >= 0 && n.right <= innerWidth }; });
ok('9 360: nothing sticks out (title, bottom nav, no sideways scroll)', f360.sw && f360.title && f360.nav, f360);
// 10. reduced motion, leaving the skin
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(200);
const anim = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); return c.animationName !== 'none' && parseFloat(c.animationDuration) > 0; }).map(e => e.id || e.className).slice(0, 5));
ok('10 prefers-reduced-motion: no running animation', anim.length === 0, anim);
await p.emulateMediaFeatures([]);
await p.evaluate(() => wear('skin-pencil')); await sleep(300);
const lv = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, al: document.querySelectorAll('.al-cover').length, gift: document.getElementById('i-gift').innerHTML.includes('M18.3 12.6') }));
ok('10b leaving the skin: no card covers or alisa icons left', lv.skin === 'pencil' && lv.al === 0 && !lv.gift, lv);

// 11. v2 (04.11 «сильнее уникализировать»): roses, tea table, card tabs, cake, cat, rabbit, fall, mouse tail, looking-glass night
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.evaluate(() => { wear('skin-alisa'); if (appIsNight()) toggleAppNight(); navGo('library'); renderLibrary(); }); await sleep(400);
const v2 = await p.evaluate(() => { const pb = document.querySelector('#shelf .pbar'), bt = document.querySelector('#botnav .botnav-btn:not(.on)'), add = document.getElementById('btnAdd');
  return { roses: pb && /data:image\/svg/.test(getComputedStyle(pb).backgroundImage) && /data:image\/svg/.test(getComputedStyle(pb.querySelector('i')).backgroundImage),
    back: bt && /data:image\/svg/.test(getComputedStyle(bt, '::before').backgroundImage), cake: add && /data:image\/svg/.test(getComputedStyle(add).backgroundImage),
    flip: getComputedStyle(document.querySelector('#botnav .botnav-btn.on')).animationName }; });
ok('11 roses for progress, face-down card tabs, the active tab flips, «+» is the «Съешь меня» cake', v2.roses && v2.back && v2.cake && v2.flip === 'alFlip', v2);
await sleep(7600);
const catOn = await p.evaluate(() => { const c = document.getElementById('alCat'); return c && c.classList.contains('on') && getComputedStyle(c).visibility; });
await p.mouse.click(200, 300); await sleep(200);
const cat2 = await p.evaluate(() => document.getElementById('alCat').classList.contains('on'));
ok('11b the Cheshire Cat shows after 7 s of quiet in the library and goes at a touch', catOn === 'visible' && cat2 === false, { catOn, cat2 });
const rb = await p.evaluate(() => { const r0 = alRabbit(false), on0 = !!document.querySelector('#alRabbit.on'); const r1 = alRabbit(true); return { r0, on0, r1, on: !!document.querySelector('#alRabbit.on') }; });
ok('11c the White Rabbit runs only when the goal is met (not met → no run)', rb.r0 === false && !rb.on0 && rb.r1 && rb.on, rb);
await p.evaluate(() => { const r = document.getElementById('alRabbit'); if (r) r.classList.remove('on'); navGo('rewards'); }); await sleep(400);
const tea = await p.evaluate(() => /data:image\/svg/.test(getComputedStyle(document.getElementById('rewSlots'), '::before').backgroundImage));
ok('11d «Безумное чаепитие»: the tea table over the rewards', tea, tea);
await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(150);
const fall = await p.evaluate(() => { const f = document.getElementById('alFall'); return f && f.classList.contains('on') && getComputedStyle(f).animationName; });
await sleep(2500);
const fall2 = await p.evaluate(() => document.getElementById('alFall').classList.contains('on'));
ok('11e opening a book: the fall down the rabbit hole plays once and goes', fall === 'alDrop' && fall2 === false, { fall, fall2 });
await p.evaluate(() => { try { closeReader(); } catch (e) { navGo('library'); } }); await sleep(500);
const tail = await p.evaluate(async () => { const b = el('quoteBox'); b.innerHTML = '<div class="emptyhint">Выделите текст в книге и нажмите цвет — цитата появится здесь.</div>'; await new Promise(q => setTimeout(q, 50));
  return { svg: !!b.querySelector('.al-tail textPath'), text: b.querySelector('.emptyhint').textContent.includes('Выделите') }; });
ok('11f «Mouse\'s Tale»: the empty-quotes hint runs down a tail, the plain text stays', tail.svg && tail.text, tail);
await p.evaluate(() => { toggleAppNight(); navGo('rewards'); navGo('library'); }); await sleep(100);
const mir = await p.evaluate(() => ({ a: getComputedStyle(document.getElementById('libTitle')).animationName, fall: /data:image\/svg/.test(getComputedStyle(document.documentElement).backgroundImage) }));
ok('11g night = Looking-Glass: the title flips in from the mirror', mir.a === 'alMirror' && mir.fall, mir);
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const calm = await p.evaluate(() => { alFall(); const r = alRabbit(true); return { fall: !!document.querySelector('#alFall.on'), r, a: getComputedStyle(document.getElementById('libTitle')).animationName }; });
ok('11h reduced motion: no fall, no rabbit, no mirror', !calm.fall && calm.r === false && calm.a === 'none', calm);
await p.emulateMediaFeatures([]);
await p.evaluate(() => { toggleAppNight(); wear('skin-pencil'); navGo('library'); }); await sleep(7600);
const off = await p.evaluate(() => ({ cat: !!document.querySelector('#alCat.on'), vis: document.getElementById('alCat') ? getComputedStyle(document.getElementById('alCat')).display : 'none' }));
ok('11i other skins: no cat', !off.cat && off.vis === 'none', off);

ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY alisa.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
