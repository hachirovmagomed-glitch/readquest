// Chapter skins of «Путь читателя» (Джессика 16–17.10: a skin of its own for every roadmap): «Ламанча» (II), «Петербург» (III), «Модерн» (IV).
// Free, not sold: owned once every book of the chapter is read (derived from the library like the map, nothing new stored).
// Locked: shop says «За главу N», wear/buy refused, a saved theme renders sepia (rq_set untouched). Unlocked: «Надеть» on the map wears it;
// tokens + woff2 from the build; the book page stays clean; day/night inside the skin; 360/390 without horizontal scroll; losing the chapter → sepia.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node chapterskins.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const SK = { lamancha: { ch: 'ch2', n: 'II', name: 'Ламанча', bg: '#efe6d2', font: 'Bona Nova SC' }, peterburg: { ch: 'ch3', n: 'III', name: 'Петербург', bg: '#eceae4', font: 'Sofia Sans Extra Condensed' }, modern: { ch: 'ch4', n: 'IV', name: 'Модерн', bg: '#f3eee2', font: 'Ysabeau SC' } };
const finishChapter = (ch, on) => p.evaluate((ch, on) => {
  const c = PATH_CHAPTERS.find(x => x.id === ch);
  c.books.forEach(b => { const id = 'cst-' + b.id; if (!S.userBooks.find(x => x.id === id)) S.userBooks.push({ id, title: b.t, author: b.a, pathId: b.id, cover: '📖' });
    S.finished = S.finished.filter(x => x !== id); if (on === true || (on === 'all-but-one' && b !== c.books[c.books.length - 1])) S.finished.push(id); });
  save(); }, ch, on);

// 1. catalog
const cat = await p.evaluate(() => ['lamancha', 'peterburg', 'modern'].map(k => { const it = shopItem('skin-' + k); return it && { id: it.id, name: it.name, price: it.price, chapter: it.chapter, ready: shopReady(it.id), cols: SHOP_CATALOG.filter(x => x.skin === it.id).length }; }));
ok('1 catalog: three chapter skins, price 0, chapter ch2/ch3/ch4, ready, one bundled colour', cat.every(Boolean) && cat.map(x => x.chapter).join() === 'ch2,ch3,ch4' && cat.every(x => x.price === 0 && x.ready && x.cols === 1) && cat.map(x => x.name).join() === 'Ламанча,Петербург,Модерн', cat);

// 2. locked: nothing owned, buy/wear refused, shop card «За главу II» disabled, detail says why
await finishChapter('ch2', 'all-but-one');
const lk = await p.evaluate(() => { const g0 = S.gold; S.gold = 5000; const b = buy('skin-lamancha'); const w = wear('skin-lamancha'); S.gold = g0;
  renderShopPane(); const card = document.querySelector('.shopcard[data-id="skin-lamancha"]');
  openShopDetail('skin-lamancha'); const d = document.getElementById('shopDetail'); const btn = d.querySelector('.shopbuy'); const r = { owns: shopOwns('skin-lamancha'), b, w, st: card && card.dataset.st, cardTxt: card && card.textContent, btn: btn.textContent, dis: btn.disabled, cap: d.querySelector('.spcap').textContent, owned: (S.owned || []).slice() };
  closeShopDetail(); return r; });
ok('2 locked (2 of 3 books read): not owned, buy refused (free), wear refused, card «За главу II» disabled', !lk.owns && lk.b.ok === false && lk.w === false && lk.st === 'chapter' && /За главу II/.test(lk.cardTxt) && lk.owned.indexOf('skin-lamancha') < 0, lk);
ok('2b skin page: «Откроется за главу II», disabled, caption names the chapter', /Откроется за главу II/.test(lk.btn) && lk.dis && /Странники и рыцари/.test(lk.cap), lk);
const sv = await p.evaluate(async () => { SET.theme = 'lamancha'; saveSet(); applySet(); await new Promise(r => setTimeout(r, 200)); return { t: activeTheme().name, raw: JSON.parse(localStorage.getItem(RQ_K.set)).theme, skin: document.documentElement.dataset.skin || '' }; });
ok('2c locked: saved theme «lamancha» renders Сепия, rq_set keeps it, no data-skin', sv.t === 'Сепия' && sv.raw === 'lamancha' && sv.skin === '', sv);
await p.evaluate(() => { SET.theme = 'sepia'; saveSet(); applySet(); });

// 3. the map shows the skin under the chapter; reading the last book opens it; «Надеть» on the map wears it; the unlock itself writes nothing
const m0 = await p.evaluate(async () => { navGo('path'); await new Promise(r => setTimeout(r, 400)); const s = document.querySelector('#path [data-ch="ch2"] .pathch-sk'); return s ? s.textContent : ''; });
ok('3 map (locked): «Скин за главу: «Ламанча»» under chapter II', /Скин за главу: «Ламанча»/.test(m0), m0);
await finishChapter('ch2', true);
const un = await p.evaluate(async () => { const ns = localStorage.getItem(RQ_K.v1); window.__lsW = []; const s0 = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { window.__lsW.push(k); return s0.call(this, k, v); };
  renderPath(); await new Promise(r => setTimeout(r, 300)); renderShopPane();
  const sk = document.querySelector('#path [data-ch="ch2"] .pathch-sk'), btn = sk && sk.querySelector('button'), card = document.querySelector('.shopcard[data-id="skin-lamancha"]');
  const r = { owns: shopOwns('skin-lamancha'), txt: sk && sk.textContent, btn: !!btn, st: card.dataset.st, writes: window.__lsW.slice(), same: localStorage.getItem(RQ_K.v1) === ns, other: shopOwns('skin-peterburg') };
  Storage.prototype.setItem = s0; return r; });
ok('3b chapter read: owned, map «Скин «Ламанча» открыт» + «Надеть», shop card «Открыт»; nothing written; chapter III still locked', un.owns && /открыт/.test(un.txt) && un.btn && un.st === 'owned' && un.writes.length === 0 && un.same && !un.other, un);
await p.evaluate(() => document.querySelector('#path [data-ch="ch2"] .pathch-sk button').click()); await sleep(400);
const st = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin || '', theme: document.documentElement.dataset.theme || '', set: SET.theme, worn: shopWorn(), raw: JSON.parse(localStorage.getItem(RQ_K.set)).theme, sk: document.querySelector('#path [data-ch="ch2"] .pathch-sk').textContent }));
ok('3c «Надеть» → html[data-skin=lamancha], day, SET.theme lamancha saved, worn skin-lamancha, map says «надет»', st.skin === 'lamancha' && st.theme === '' && st.set === 'lamancha' && st.raw === 'lamancha' && st.worn === 'skin-lamancha' && /надет/.test(st.sk), st);

// 4. each skin: tokens, fonts, map drawing, covers, night, 360/390 fit
const sw = await (await fetch(BASE + 'sw.js')).text(), tokCss = await (await fetch(BASE + 'tokens.css')).text();
ok('4 build: tokens.css has the three skins and no @import; the 12 woff2 are precached', ['lamancha', 'peterburg', 'modern'].every(k => tokCss.includes('[data-skin="' + k + '"]')) && !/@import/.test(tokCss) && (sw.match(/fonts\/(lamancha|peterburg|modern)-[a-z0-9-]+\.woff2/g) || []).length === 12, (sw.match(/fonts\/(lamancha|peterburg|modern)-[a-z0-9-]+\.woff2/g) || []).length);
for (const [k, v] of Object.entries(SK)) {
  await finishChapter(v.ch, true);
  await p.evaluate((k) => wear('skin-' + k), k); await sleep(300);
  for (const w of [390, 360]) {
    await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(200);
    const r = await p.evaluate(async (k, v) => {
      const cs = getComputedStyle(document.documentElement);
      await document.fonts.load('700 20px "' + v.font + '"', 'Библиотека');
      show('library'); renderLibrary(); await new Promise(r => setTimeout(r, 300));
      const h = document.getElementById('libHead'), kids = [...h.children].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
      const t = document.getElementById('libTitle');
      const lib = { inside: kids.every(q => q.left >= 0 && q.right <= innerWidth + 0.5), cut: t.scrollWidth > t.clientWidth + 1, covers: document.querySelectorAll('#shelf .cs-cover').length, books: document.querySelectorAll('#shelf .bookcard').length, sx: document.documentElement.scrollWidth <= innerWidth };
      navGo('path'); await new Promise(r => setTimeout(r, 500));
      const ch = document.querySelector('#path .pathch'), dot = document.querySelector('#path .pn-dot'), sc = document.querySelector('#path .scroll');
      const g = (e, ps) => getComputedStyle(e, ps);
      const pl2 = document.querySelector('#path .pathline path.pl2');
      return { skin: document.documentElement.dataset.skin, bg: cs.getPropertyValue('--rq-bg').trim(), font: [...document.fonts].some(f => f.family.replace(/"/g, '') === v.font && f.status === 'loaded'),
        title: g(t).fontFamily, lib, map: /data:image\/svg/.test(g(ch).backgroundImage), node: /data:image\/svg/.test(g(dot, '::after').backgroundImage), ring: g(dot.querySelector('.pn-ring')).display,
        road: pl2 && g(pl2).display !== 'none', wide: sc.scrollWidth > sc.clientWidth + 1 };
    }, k, v);
    ok(`4 ${v.name} ${w}: skin on, bg ${v.bg}, font ${v.font} loaded and on the title`, r.skin === k && r.bg === v.bg && r.font && r.title.includes(v.font), r);
    ok(`4 ${v.name} ${w}: library header fits (title not cut, nothing outside), skin covers on every book, no horizontal scroll`, r.lib.inside && !r.lib.cut && r.lib.covers === r.lib.books && r.lib.books > 0 && r.lib.sx, r.lib);
    ok(`4 ${v.name} ${w}: map drawn in the skin (sheet, drawings instead of rings, 2nd road stroke), no horizontal scroll`, r.map && r.node && r.ring === 'none' && r.road && !r.wide, r);
  }
  const n = await p.evaluate(async (k) => { toggleDayNight ? toggleDayNight() : (SET.theme = k + '-night', applySet()); await new Promise(r => setTimeout(r, 300));
    const r = { theme: document.documentElement.dataset.theme || '', set: SET.theme, skin: document.documentElement.dataset.skin }; SET.theme = k; saveSet(); applySet(); return r; }, k);
  ok(`5 ${v.name}: night inside the skin (data-theme night, theme ${k}-night)`, n.theme === 'night' && n.set === k + '-night' && n.skin === k, n);
}

// 6. the book page stays clean: page tokens of the skin, no decor pseudo-elements on the reader
const rd = await p.evaluate(async () => { const id = S.userBooks.find(b => /^cst-/.test(b.id)).id; S.userBooks.find(b => b.id === id).text = 'Текст. '.repeat(400);
  try { await openBook(id); } catch (e) { return { err: String(e) }; } await new Promise(r => setTimeout(r, 600));
  const rdr = document.getElementById('reader'), cs = getComputedStyle(rdr); const before = getComputedStyle(document.body, '::before').content;
  const r = { vis: !rdr.classList.contains('hidden'), bg: cs.getPropertyValue('--r-bg').trim(), before };
  try { closeReader(); } catch (e) {} return r; });
ok('6 reader: clean page tokens of «Модерн» (#fbf8f0), no body decor over the page', rd.vis && rd.bg === '#fbf8f0' && (rd.before === 'none' || rd.before === 'normal'), rd);

// 7. losing the chapter (import of an older backup) → sepia, rq_set keeps the key
await finishChapter('ch4', false);
const lost = await p.evaluate(async () => { applySet(); await new Promise(r => setTimeout(r, 200)); return { t: activeTheme().name, skin: document.documentElement.dataset.skin || '', raw: JSON.parse(localStorage.getItem(RQ_K.set)).theme }; });
ok('7 chapter no longer read → Сепия, no data-skin, rq_set keeps «modern»', lost.t === 'Сепия' && lost.skin === '' && lost.raw === 'modern', lost);

// 8. the other skins never touched coins
const gold = await p.evaluate(() => ({ owned: (S.owned || []).filter(x => /lamancha|peterburg|modern/.test(x)) }));
ok('8 nothing bought: S.owned has no chapter skins', gold.owned.length === 0, gold);
ok('9 no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\nchapterskins: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
