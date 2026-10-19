// Shop polish (after 20261014-1621 review): custom buy dialog (mockup D) — buy(id) only on «Купить», once even on double tap, «Отмена»/close write nothing,
// window.confirm never called; «Из жизни» tap targets ≥44px; colour labels one line; «+1000 монет для теста» only in rqt namespace (normal write);
// detail = sheet over the list (mockup C), «Купить» on cards, rewards reopen at top, rewards/sheet don't cover the bottom nav, pencil frames on shop cards,
// no 🏅 on the badge, owned ids deduped after the «Лес» rename, no coin icons left in library/app.html.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_MAIN_URL=http://127.0.0.1:8767/readquest/ [RQ_SHOTS=/workspace/out] node shop2.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const MAIN = process.env.RQ_MAIN_URL || 'http://127.0.0.1:8767/readquest/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function page(url) { const p = await (await browser.createBrowserContext()).newPage().then(async (pg) => { await pg.evaluateOnNewDocument(() => { try { localStorage.setItem('rqpreview', '1'); localStorage.setItem('rqtpreview', '1'); } catch (e) {} }); return pg; }) /* audit 19.10: paid skins / Путь live behind the preview flag */;
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.evaluateOnNewDocument(() => { window.__confirmCalls = 0; const c = window.confirm; window.confirm = function () { window.__confirmCalls++; return true; }; });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300); await allReady(p); return p; }
/* audit 15.10: skins without styling are «Скоро» (SHOP_READY = ['skin-pencil']); this test checks buying for when they ship → mark all ready */
async function allReady(p) { await p.evaluate(() => { SHOP_CATALOG.filter(x => x.type === 'skin').forEach(x => { if (SHOP_READY.indexOf(x.id) < 0) SHOP_READY.push(x.id); }); if (typeof renderShopPane === 'function') renderShopPane(); }); }
const p = await page(BASE);
const raw = () => p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); return localStorage.getItem(RQ_K.v1) || ''; });
await p.evaluate(async () => { S.gold = 1000; save(); window.__buyCalls = 0; const b = window.buy; window.buy = function () { window.__buyCalls++; return b.apply(this, arguments); }; });
/* flake 15.10: the rewards sheet slides in (--rq-dur-sheet); after a fixed 300 ms the «Магазин» tab was sometimes still below
   the viewport (y 896 of 844) → wait until it is fully on screen before clicking */
await p.evaluate(() => navGo('look')); await sleep(300); /* 17.10: the skin shop lives on «Внешний вид» */

// 5a. cards: «Купить» button on buyable cards
const cards = await p.evaluate(() => [...document.querySelectorAll('#rewPaneShop .shopcard')].map(c => ({ id: c.dataset.id, cta: ((c.querySelector('.shopcta') || {}).textContent || '').trim(), tag: (c.querySelector('.shopcta') || {}).tagName })));
ok('cards: «Купить» button on buyable skins (Гравюра at 1000)', cards.some(c => c.id === 'skin-gravyura' && c.cta === 'Купить' && c.tag === 'BUTTON'), cards);
await p.screenshot({ path: SHOTS + 'shop2-shop-390.png' });

// 5b. skin page: full screen (← back, large preview, colours, button pinned at the bottom); list scroll remembered in memory only
await p.evaluate(() => { document.querySelector('#look .scroll').scrollTop = 260; }); await sleep(150);
const listScroll = await p.evaluate(() => document.querySelector('#look .scroll').scrollTop);
const setBefore = await p.evaluate(() => localStorage.getItem(RQ_K.set));
await p.evaluate(() => openShopDetail('skin-gravyura')); await sleep(400);
const sh = await p.evaluate(() => { const d = document.getElementById('shopDetail'), r = d.getBoundingClientRect(), b = d.querySelector('.shopbuy').getBoundingClientRect(), pv = d.querySelector('.spprev');
  return { pos: getComputedStyle(d).position, top: Math.round(r.top), h: Math.round(r.height), back: !!d.querySelector('#shopBack'), prevH: pv ? Math.round(pv.getBoundingClientRect().height) : 0, btnBottom: Math.round(b.bottom), inList: !!d.closest('#rewPaneShop'), nav: history.state && history.state.rq }; });
ok('skin page: full screen, ← back, large preview, button pinned at the bottom, history entry', sh.pos === 'fixed' && !sh.inList && (sh.top === 0 || sh.top === 32) && sh.top + sh.h === 844 /* audit 19.10 A11Y-04: on the test build the page starts under the 32 px banner */ && sh.back && sh.prevH >= 200 && sh.btnBottom >= 844 - 70 && sh.nav === 'shopskin', sh);
await p.screenshot({ path: SHOTS + 'shop2-skin-page-390.png' });
// try-on + in-app ← : memory only, NS_set unchanged, list scroll restored
await p.evaluate(() => shopTryOn('color-gravyura-night')); await sleep(200);
const tried = await p.evaluate(() => shopTry());
await p.screenshot({ path: SHOTS + 'shop2-skin-page-tryon-390.png' });
await p.click('#shopBack'); await sleep(500);
let bk = await p.evaluate(() => ({ open: !document.getElementById('shopDetail').hidden, tr: shopTry(), set: localStorage.getItem(RQ_K.set), skin: SET.skin || null, color: SET.color || null, scroll: document.querySelector('#look .scroll').scrollTop, nav: history.state && history.state.rq }));
ok('← back: page closed, try-on reset, NS_set skin/color unchanged', tried === 'color-gravyura-night' && !bk.open && bk.tr === null && bk.set === setBefore && bk.nav !== 'shopskin', { tried, ...bk, same: bk.set === setBefore });
ok('← back: shop list scroll restored', listScroll > 0 && Math.abs(bk.scroll - listScroll) <= 2, { listScroll, now: bk.scroll });
// system back (popstate)
await p.evaluate(() => openShopDetail('skin-gravyura')); await sleep(300); await p.evaluate(() => shopTryOn('color-gravyura-autumn')); await sleep(150);
await p.goBack().catch(() => null); await sleep(600);
bk = await p.evaluate(() => ({ open: !document.getElementById('shopDetail').hidden, tr: shopTry(), set: localStorage.getItem(RQ_K.set), scroll: document.querySelector('#look .scroll').scrollTop, rew: !document.getElementById('look').classList.contains('hidden') }));
ok('system back: page closed, try-on reset, NS_set unchanged, still in the shop', !bk.open && bk.tr === null && bk.set === setBefore && bk.rew, bk);
ok('system back: shop list scroll restored', Math.abs(bk.scroll - listScroll) <= 2, { listScroll, now: bk.scroll });
// сворачивание
await p.evaluate(() => openShopDetail('skin-gravyura')); await sleep(300);
bk = await p.evaluate(() => { shopTryOn('color-gravyura-night'); const a = shopTry(); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState;
  return { a, b: shopTry(), set: localStorage.getItem(RQ_K.set) }; });
ok('сворачивание: try-on reset, NS_set unchanged', bk.a === 'color-gravyura-night' && bk.b === null && bk.set === setBefore, bk);
const leak = await p.evaluate((n) => { const all = Object.keys(localStorage).map(k => localStorage.getItem(k)).join('|'); return { scrollKey: /scroll/i.test(Object.keys(localStorage).join()) || /shopListScroll|listScroll/.test(all), setHas: /scroll/i.test(localStorage.getItem(RQ_K.set) || '') }; }, listScroll);
ok('list scroll kept in memory only (nothing in localStorage / NS_set)', !leak.scrollKey && !leak.setHas, leak);

// 3. colour labels one line each
const cl = await p.evaluate(() => [...document.querySelectorAll('#shopDetail .shopcol small')].map(e => { const rg = document.createRange(); rg.selectNodeContents(e);
  return { t: e.textContent, lines: new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size }; }));
ok('colour labels: name / price each on one line (no «Ночь / 150 / монет»)', cl.length >= 4 && cl.every(x => x.lines === 1), cl);

// 1. custom dialog: «Отмена», close, double «Купить»
const r0 = await raw();
await p.evaluate(() => document.querySelector('#shopDetail .shopbuy').click()); await sleep(300);
const dlg = await p.evaluate(() => { const d = document.getElementById('shopConfirm'); if (!d || d.hidden || getComputedStyle(d).display === 'none') return null;
  return { t: d.textContent.replace(/\s+/g, ' ').trim(), btns: [...d.querySelectorAll('button')].map(b => b.textContent.trim()) }; });
ok('dialog per mockup D: «Купить «Гравюра» за 500 монет?», «Останется 500 монет.», buttons «Отмена» / «Купить»', dlg && /Купить «Гравюра» за 500 монет\?/.test(dlg.t) && /Останется 500 монет\./.test(dlg.t) && dlg.btns.join('|') === 'Отмена|Купить', dlg);
await p.screenshot({ path: SHOTS + 'shop2-confirm-390.png' });
if (dlg) await p.click('#shopConfirm .scCancel'); await sleep(300);
let st = await p.evaluate(() => ({ calls: __buyCalls, gold: S.gold, open: !!document.getElementById('shopConfirm') && !document.getElementById('shopConfirm').hidden }));
ok('«Отмена»: dialog closes, buy() not called, storage byte-equal', dlg && !st.open && st.calls === 0 && st.gold === 1000 && (await raw()) === r0, st);
await p.evaluate(() => document.querySelector('#shopDetail .shopbuy').click()); await sleep(300);
await p.evaluate(() => { const s = document.getElementById('shopConfirmScrim'); if (s) s.click(); }); await sleep(300);
st = await p.evaluate(() => ({ calls: __buyCalls, gold: S.gold, open: !!document.getElementById('shopConfirm') && !document.getElementById('shopConfirm').hidden }));
ok('close (tap outside): dialog closes, buy() not called, storage byte-equal', dlg && !st.open && st.calls === 0 && (await raw()) === r0, st);
await p.evaluate(() => document.querySelector('#shopDetail .shopbuy').click()); await sleep(300);
await p.evaluate(() => { const b = document.querySelector('#shopConfirm .scOk'); if (b) { b.click(); b.click(); } }); await sleep(500);
st = await p.evaluate(() => ({ calls: __buyCalls, gold: S.gold, owned: (S.owned || []).filter(x => x === 'skin-gravyura').length }));
ok('double tap «Купить»: buy() exactly once, 1000 → 500, owned once', st.calls === 1 && st.gold === 500 && st.owned === 1, st);
ok('window.confirm never called', (await p.evaluate(() => __confirmCalls)) === 0, await p.evaluate(() => __confirmCalls));
await p.evaluate(() => closeShopDetail()); await sleep(300);

// 4. «+1000 монет для теста» (rqt only): normal write, no devMoney, buy deducts normally
const tg = await p.evaluate(() => { const b = document.getElementById('btnTestGold'); return b ? { vis: !!b.offsetParent, t: b.textContent.trim() } : null; });
ok('rqt: «+1000 монет для теста» visible in the shop', tg && tg.vis && tg.t === '+1000 монет для теста', tg);
if (tg) { await p.evaluate(() => clearToasts()); await p.click('#btnTestGold'); } await sleep(400); /* the «Куплено» toast may sit over the button on «Внешний вид» */
const tg2 = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); const g = JSON.parse(localStorage.getItem(RQ_K.v1) || '{}'); return { gold: S.gold, stored: (g.game || g).gold, dev: S.devMoney !== false, bal: document.getElementById('rewBalance').textContent }; });
ok('+1000: S.gold 500 → 1500, stored, balance «1500 монет», no devMoney', tg2.gold === 1500 && tg2.stored === 1500 && !tg2.dev && tg2.bal === '1500 монет', tg2);
const b2 = await p.evaluate(() => { const r = buy('skin-krik'); return { r, gold: S.gold }; });
ok('after +1000: buy(skin-krik) deducts by normal rules (1500 → 700)', b2.r.ok && b2.gold === 700, b2);
const tgPass = await p.evaluate(() => { const g = window.__rqWriter, m = g.mayWrite; g.mayWrite = () => false; const before = S.gold; try { const b = document.getElementById('btnTestGold'); if (b) b.click(); } finally { g.mayWrite = m; } return { before, after: S.gold }; });
ok('+1000 in a passive window: no change (write gate)', tgPass.after === tgPass.before, tgPass);

// 5c. reopen rewards at the top; rewards sheet doesn't cover the bottom nav
await p.evaluate(() => { const s = document.getElementById('rewardsSheet'); s.scrollTop = 400; closeRewardsSheet(); }); await sleep(300);
await p.evaluate(() => openRewardsSheet()); await sleep(400);
const rs = await p.evaluate(() => { const s = document.getElementById('rewardsSheet'), r = s.getBoundingClientRect(), n = document.getElementById('botnav').getBoundingClientRect(); return { top: s.scrollTop, bottom: Math.round(r.bottom), navTop: Math.round(n.top), nav: getComputedStyle(document.getElementById('botnav')).display }; });
ok('rewards reopen scrolled to the top', rs.top === 0, rs);
ok('rewards sheet ends above the bottom nav', rs.nav !== 'none' && rs.bottom <= rs.navTop + 1, rs);

// 2. «Из жизни» tap targets ≥ 44
const tt = await p.evaluate(() => [...document.querySelectorAll('#rewardsSheet [role=tab], #rewSlots button, #btnAddRewardSlot, #rewSlots input')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { e: e.id || e.className || e.tagName, t: (e.textContent || e.value || '').trim().slice(0, 14), w: Math.round(r.width), h: Math.round(r.height) }; }));
const ttBad = tt.filter(x => x.h < 44 || x.w < 44);
ok('«Из жизни»: price, levels, «＋ Слот», «удалить» ≥ 44×44', tt.length >= 8 && !ttBad.length, ttBad.length ? ttBad : tt.length);
await p.screenshot({ path: SHOTS + 'shop2-life-390.png' });

// 5d. pencil: hand-drawn frame on shop cards
await p.evaluate(() => { SET.theme = 'pencil'; saveSet(); applySet(); setRewardsTab('shop'); }); await sleep(400);
const pf = await p.evaluate(() => [...document.querySelectorAll('#rewPaneShop .shopcard')].map(c => getComputedStyle(c, '::after').borderImageSource !== 'none'));
ok('pencil: hand-drawn frame on every shop card', pf.length >= 7 && pf.every(Boolean), pf);
await p.screenshot({ path: SHOTS + 'shop2-pencil-shop-390.png' });
await p.evaluate(() => openShopDetail('skin-starry')); await sleep(400);
await p.screenshot({ path: SHOTS + 'shop2-pencil-detail-390.png' });
await p.evaluate(() => { closeShopDetail(); closeRewardsSheet(); }); await sleep(300);

// 5e. 🏅 / coin icons / dedupe
const bd = await p.evaluate(() => { openBadge3D('', 'x', 'y'); const t = document.getElementById('badgeFace').textContent; document.getElementById('badgeModal').classList.add('hidden'); return t; });
ok('badge face without 🏅', !/🏅/.test(bd), bd);
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const coinHtml = (html.match(/🪙/g) || []).length + (html.replace(/<symbol[\s\S]*?<\/symbol>/g, '').match(/#i-coins/g) || []).length;
ok('app.html: no 🪙 and no #i-coins use left', coinHtml === 0, coinHtml);
const lib = await p.evaluate(() => { show('library'); renderLibrary(); return [...document.querySelectorAll('#goldChip use, #libGoldLine use')].filter(u => /coin/.test(u.getAttribute('href'))).length; });
ok('library gold chip / line: no coin icon', lib === 0, lib);
const dd = await p.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); e.game.owned = ['skin-les', 'skin-forest', 'skin-gravyura', 'color-les-night', 'color-forest-night'];
  await __rq.importBackup(e); return true; });
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); await allReady(p);
const hg = await p.evaluate(async () => { const m = await import(new URL('storage/schema.js', location.href).href); return m.hydrateGame({ owned: ['skin-les', 'skin-forest', 'skin-gravyura', 'color-les-night', 'color-forest-night'] }).owned; });
ok('schema hydrateGame: renamed ids deduped', JSON.stringify(hg) === JSON.stringify(['skin-gravyura', 'color-gravyura-night']), hg);
const ow = await p.evaluate(async () => { const raw = await __rq.exportBackup(null, SET, { includeTextBodies: false }); return { mem: S.owned, stored: raw.game.owned }; });
ok('rename «Лес»: owned deduped in memory and in the stored game (schema hydrateGame)', ow.stored.filter(x => x === 'skin-gravyura').length === 1 && ow.stored.filter(x => x === 'color-gravyura-night').length === 1 && ow.mem.filter(x => x === 'skin-gravyura').length === 1, ow);
await p.close();

// 4b. rq namespace: no test-gold button
const m = await page(MAIN);
const mg = await m.evaluate(() => { openRewardsSheet('shop'); return { ns: window.RQ_NS, btn: !!document.getElementById('btnTestGold') && !!document.getElementById('btnTestGold').offsetParent, fn: typeof shopTestGold === 'function' ? (S.gold = 5, shopTestGold(), S.gold) : 'nofn' }; });
ok('rq namespace: no «+1000» button, shopTestGold() does nothing', mg.ns === 'rq' && !mg.btn && (mg.fn === 5 || mg.fn === 'nofn'), mg);
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY shop2.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
