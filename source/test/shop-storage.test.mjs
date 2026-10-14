// Shop «хранилище до и после» — Architect contract (8 cases): покупка; повтор; не хватает монет; пассивное окно; расцветка без скина;
// devMoney; примерка и сворачивание; импорт старого бэкапа (owned/cur/devMoney, skin-les → skin-gravyura). buy(id) = one write to NS_v1.game.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node shop-storage.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const has = await p.evaluate(() => typeof buy === 'function');
const snap = () => p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); const v = localStorage.getItem(RQ_K.v1) || ''; let g = {}; try { const j = JSON.parse(v); g = j.game || j; } catch (e) {}
  return { raw: v, gold: g.gold, owned: g.owned || [], set: localStorage.getItem(RQ_K.set) || '' }; });
const purchases = () => p.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); return (e.events || []).filter(x => x.type === 'purchase').map(x => ({ id: x.id, price: x.price })); });
const B = (id) => p.evaluate((id) => { try { return buy(id); } catch (e) { return { err: e.message }; } }, id);
const setGold = (g) => p.evaluate(async (g) => { S.gold = g; save(); await new Promise(r => setTimeout(r, 300)); }, g);

// 1. покупка
await setGold(640); let s0 = await snap();
let r = has ? await B('skin-gravyura') : { err: 'buy() missing' }; let s1 = await snap(); let ev = has ? await purchases() : [];
ok('1 покупка: 640 → 140, game.owned += skin-gravyura, one purchase event {id, price 500}', r && r.ok === true && s1.gold === 140 && s1.owned.includes('skin-gravyura') && ev.length === 1 && ev[0].id === 'skin-gravyura' && ev[0].price === 500, { r, gold: s1.gold, owned: s1.owned, ev });
// 2. повтор
r = has ? await B('skin-gravyura') : { err: 'buy() missing' }; let s2 = await snap(); ev = has ? await purchases() : [];
ok('2 повтор: nothing changes (storage byte-equal), still one event', r && r.ok === false && s2.raw === s1.raw && ev.length === 1, { r, same: s2.raw === s1.raw, ev: ev.length });
// 3. не хватает монет
r = has ? await B('skin-krik') : { err: 'buy() missing' }; let s3 = await snap();
ok('3 не хватает монет (140 < 800): refused, storage byte-equal', r && r.ok === false && r.reason === 'gold' && s3.raw === s2.raw, { r, same: s3.raw === s2.raw });
// 4. пассивное окно
await setGold(2000); let s4a = await snap();
r = has ? await p.evaluate(() => { const g = window.__rqWriter, m = g.mayWrite; g.mayWrite = () => false; try { return buy('skin-starry'); } finally { g.mayWrite = m; } }) : { err: 'buy() missing' };
let s4 = await snap(); const mem4 = await p.evaluate(() => ({ gold: S.gold, owned: (S.owned || []).includes('skin-starry') }));
ok('4 пассивное окно: refused, storage and memory untouched', r && r.ok === false && r.reason === 'passive' && s4.raw === s4a.raw && mem4.gold === 2000 && !mem4.owned, { r, same: s4.raw === s4a.raw, mem4 });
// 5. расцветка без скина
const col = await p.evaluate(() => typeof SHOP_CATALOG !== 'undefined' ? (SHOP_CATALOG.find(x => x.type === 'color' && x.skin === 'skin-krik' && !x.bundled) || {}).id : null);
r = has && col ? await B(col) : { err: 'no catalog' }; let s5 = await snap();
ok('5 расцветка без скина (' + col + '): refused, storage byte-equal', r && r.ok === false && r.reason === 'skin' && s5.raw === s4.raw, { r, same: s5.raw === s4.raw });
const colG = await p.evaluate(() => typeof SHOP_CATALOG !== 'undefined' ? (SHOP_CATALOG.find(x => x.type === 'color' && x.skin === 'skin-gravyura' && !x.bundled) || {}).id : null);
r = has && colG ? await B(colG) : { err: 'no catalog' }; let s5b = await snap();
ok('5b расцветка к купленному скину: 150 written, bundled one not sellable', r && r.ok === true && s5b.gold === 1850 && s5b.owned.includes(colG), { r, gold: s5b.gold });
// 6. devMoney
await setGold(0);
r = has ? await p.evaluate(() => { S.devMoney = true; try { return buy('skin-pergament'); } finally { delete S.devMoney; } }) : { err: 'buy() missing' };
let s6 = await snap();
ok('6 devMoney: no effect (0 coins → refused, nothing owned)', r && r.ok === false && r.reason === 'gold' && !s6.owned.includes('skin-pergament') && s6.gold === 0, { r, gold: s6.gold });
// 7. примерка и сворачивание
const set7a = await snap();
const t7 = await p.evaluate(() => { if (typeof shopTryOn !== 'function') return { err: 'shopTryOn missing' }; shopTryOn('skin-krik'); const a = shopTry(); 
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
  const b = shopTry(); delete document.visibilityState; return { a, b }; });
let s7 = await snap();
ok('7 примерка: only in memory (NS_set/NS_v1 untouched), cleared on сворачивание', !t7.err && t7.a === 'skin-krik' && t7.b === null && s7.set === set7a.set && s7.raw === set7a.raw, { t7, setSame: s7.set === set7a.set, rawSame: s7.raw === set7a.raw });
// 8. импорт старого бэкапа
const r8 = await p.evaluate(async () => {
  const e = await __rq.exportBackup(null, SET, { includeTextBodies: false });
  e.game.owned = ['kraft', 'skin-les']; e.game.cur = { icon: '🦄', name: 'алмазики' }; e.game.devMoney = true; e.game.gold = 77;
  e.settings = Object.assign({}, e.settings, { skin: 'skin-les', color: 'color-les-day', theme: 'midnight' });
  try { await __rq.importBackup(e); return { ok: true }; } catch (x) { return { ok: false, err: String(x.message || x) }; } });
await p.reload({ waitUntil: 'load' }); await boot();
const s8 = await p.evaluate(() => ({ owned: S.owned, cur: 'cur' in S, dev: 'devMoney' in S, gold: S.gold, skin: SET.skin, color: SET.color, theme: SET.theme, bg: getComputedStyle(document.documentElement).getPropertyValue('--x') }));
ok('8 импорт старого бэкапа: no error, cur/devMoney gone, skin-les → skin-gravyura (owned + NS_set), gold 77', r8.ok && !s8.cur && !s8.dev && s8.gold === 77 && s8.owned.includes('skin-gravyura') && !s8.owned.includes('skin-les') && s8.skin === 'skin-gravyura' && /^color-gravyura-/.test(s8.color || ''), { r8, s8 });
const free = await p.evaluate(() => ({ t: activeTheme().name, owned: (S.owned || []).includes('midnight') }));
ok('8b old paid theme «Полночь» renders free (no ownership needed)', free.t === 'Полночь', free);
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY shop-storage.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
