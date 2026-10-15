// Shop build (14.10, brief /workspace/readquest-product/shop-brief.md + Architect contract «Магазин» + Интерфейс shop mockups):
// «Награды» = two tabs «Из жизни» / «Магазин», one balance (S.gold) as text «N монет», no coin icons; catalog prices per brief;
// buy flow with confirm; «Награды из жизни» no longer in the profile; settings −/+ ≥44×44; «Моя полка» on one line at 390px.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ [RQ_SHOTS=/workspace/out] node shop.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
let confirmMsg = ''; p.on('dialog', d => { confirmMsg = d.message(); d.accept(); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
const safe = (f, a) => p.evaluate(f, a).catch(e => ({ err: String(e.message || e).slice(0, 160) }));

// A. catalog per brief: 6 paid skins 500/800, pencil free, colours 150 (≤3 paid, exactly one bundled), color-<skin>-<name>
const cat = await safe(() => SHOP_CATALOG.map(x => ({ id: x.id, type: x.type, price: x.price, skin: x.skin || '', bundled: !!x.bundled, name: x.name })));
const want = { 'skin-pergament': 500, 'skin-gravyura': 500, 'skin-starry': 500, 'skin-dungeon': 800, 'skin-celestial': 800, 'skin-krik': 800 };
const skins = Array.isArray(cat) ? cat.filter(x => x.type === 'skin') : [];
ok('catalog: paid skins + prices 500 (Пергамент/Гравюра/Звёздный) / 800 (Подземелье/Небесный/Крик), Карандашный free', Array.isArray(cat) && Object.keys(want).every(k => (skins.find(s => s.id === k) || {}).price === want[k]) && (skins.find(s => s.id === 'skin-pencil') || {}).price === 0, Array.isArray(cat) ? skins.map(s => s.id + ':' + s.price) : cat);
ok('catalog: «Лес» renamed «Гравюра» (skin-gravyura), no skin-les/forest id', Array.isArray(cat) && (skins.find(s => s.id === 'skin-gravyura') || {}).name === 'Гравюра' && !cat.some(x => /skin-(les|forest)|color-(les|forest)-/.test(x.id)), Array.isArray(cat) ? skins.map(s => s.name) : cat);
const colBad = Array.isArray(cat) ? skins.filter(s => s.price > 0).map(s => { const c = cat.filter(x => x.type === 'color' && x.skin === s.id);
  return { s: s.id, b: c.filter(x => x.bundled).length, paid: c.filter(x => !x.bundled).length, prices: [...new Set(c.filter(x => !x.bundled).map(x => x.price))].join(), ids: c.every(x => x.id.startsWith('color-' + s.id.slice(5) + '-')) }; }).filter(x => x.b !== 1 || x.paid < 1 || x.paid > 3 || x.prices !== '150' || !x.ids) : ['no catalog'];
ok('catalog: each paid skin = 1 bundled colour + 1–3 paid at 150, id color-<skin>-<name>', !colBad.length, colBad);
const ids = Array.isArray(cat) ? cat.map(x => x.id) : []; ok('catalog: no duplicate ids', ids.length && new Set(ids).size === ids.length);
const gone = await p.evaluate(() => ({ SHOP_THEMES: typeof SHOP_THEMES, buyTheme: typeof buyTheme, cur: 'cur' in S, devMoney: 'devMoney' in S }));
ok('SHOP_THEMES / buyTheme / S.cur / S.devMoney removed', gone.SHOP_THEMES === 'undefined' && gone.buyTheme === 'undefined' && !gone.cur && !gone.devMoney, gone);

// B. «Награды»: two tabs, header balance = S.gold as text, no coin icons
await p.evaluate(() => { S.gold = 640; save(); }); await sleep(200);
await p.click('#bnRew'); await sleep(400);
const hdr = await p.evaluate(() => { const sh = document.getElementById('rewardsSheet'); const t = [...sh.querySelectorAll('[role=tab]')].map(b => b.textContent.trim());
  const bal = document.getElementById('rewBalance'); return { tabs: t, bal: bal ? bal.textContent.trim() : null, h: (sh.querySelector('h3') || {}).textContent }; });
ok('«Награды»: header «Награды», tabs «Из жизни» / «Магазин»', hdr.h === 'Награды' && hdr.tabs.join('|') === 'Из жизни|Магазин', hdr);
ok('header balance reads S.gold as text «640 монет»', hdr.bal === '640 монет', hdr.bal);
const lifeOk = await p.evaluate(() => { const life = document.getElementById('rewPaneLife'); return !!life && !life.hidden && !!life.querySelector('#rewSlots') && getComputedStyle(life).display !== 'none'; });
ok('tab «Из жизни» holds the life rewards (slots)', lifeOk);
await p.screenshot({ path: SHOTS + 'shop-tab-life-390.png' });
const icons = () => p.evaluate(() => { const sh = document.getElementById('rewardsSheet');
  const uses = [...sh.querySelectorAll('use')].filter(u => /coin/.test(u.getAttribute('href') || '') && u.closest('svg').getBoundingClientRect().width > 0).length;
  return { uses, emoji: /🪙|💰/.test(sh.textContent) }; });
let ic = await icons(); ok('«Из жизни»: no coin icon / emoji', !ic.uses && !ic.emoji, ic);
const tabShop = await p.$('#rewTabShop'); if (tabShop) { await tabShop.click(); await sleep(400); }
const shop = await p.evaluate(() => { const pane = document.getElementById('rewPaneShop'); if (!pane) return null;
  return { vis: !pane.hidden && getComputedStyle(pane).display !== 'none', lifeHidden: document.getElementById('rewPaneLife').hidden,
    cards: [...pane.querySelectorAll('.shopcard')].map(c => ({ id: c.dataset.id, t: c.textContent.replace(/\s+/g, ' ').trim() })) }; });
ok('tab «Магазин» shows skin cards', shop && shop.vis && shop.lifeHidden && shop.cards.length >= 7, shop);
const card = (id) => (shop && shop.cards.find(c => c.id === id) || {}).t || '';
ok('shop prices as text: «Гравюра 500 монет», «Крик 800 монет», Карандашный «Бесплатно»', /Гравюра.*500 монет/.test(card('skin-gravyura')) && /Крик.*800 монет/.test(card('skin-krik')) && /Бесплатно/.test(card('skin-pencil')), shop && shop.cards.map(c => c.t));
ok('not enough: «Не хватает 160» on 800-coin skins at 640', /Не хватает 160/.test(card('skin-krik')), card('skin-krik'));
ic = await icons(); ok('«Магазин»: no coin icon / emoji', !ic.uses && !ic.emoji, ic);
await p.screenshot({ path: SHOTS + 'shop-tab-shop-390.png' });

// C. buy flow: open skin → «Купить скин за 500 монет» → dialog (shop2: custom, not window.confirm) «Купить «Гравюра» за 500 монет? Останется 140 монет.» → 140, owned, «Надеть»
const opened = await safe(() => { const c = document.querySelector('#rewPaneShop .shopcard[data-id="skin-gravyura"]'); if (!c) return false; c.click(); return true; });
await sleep(300);
const det = await p.evaluate(() => { const d = document.getElementById('shopDetail'); return d && !d.hidden ? { t: d.textContent.replace(/\s+/g, ' ').trim(), btn: (d.querySelector('.shopbuy') || {}).textContent } : null; });
ok('skin card opens detail with «Купить скин за 500 монет» and colours', opened === true && det && (det.btn || '').trim() === 'Купить скин за 500 монет' && /Расцветки/.test(det.t), det);
await p.screenshot({ path: SHOTS + 'shop-buy-detail-390.png' });
confirmMsg = '';
if (det) await p.click('#shopDetail .shopbuy'); await sleep(300);
confirmMsg = await p.evaluate(() => { const d = document.getElementById('shopConfirm'); return d && !d.hidden ? d.textContent.replace(/\s+/g, ' ').trim() : ''; });
await p.evaluate(() => { const b = document.querySelector('#shopConfirm .scOk'); if (b) b.click(); }); await sleep(500);
const after = await p.evaluate(() => ({ gold: S.gold, owned: (S.owned || []).slice(), bal: (document.getElementById('rewBalance') || {}).textContent, btn: ((document.querySelector('#shopDetail .shopbuy') || {}).textContent || '').trim() }));
ok('confirm text «Купить «Гравюра» за 500 монет? Останется 140 монет.»', /Купить «Гравюра» за 500 монет\?\s*Останется 140 монет\./.test(confirmMsg), confirmMsg);
ok('after buy: S.gold 140, owned skin-gravyura, header «140 монет», button «Надеть»', after.gold === 140 && after.owned.includes('skin-gravyura') && (after.bal || '').trim() === '140 монет' && after.btn === 'Надеть', after);
await p.screenshot({ path: SHOTS + 'shop-buy-done-390.png' });
await p.evaluate(() => { const b = document.querySelector('#shopDetail .shopbuy'); if (b) b.click(); }); await sleep(300);
const worn = await p.evaluate(() => ({ skin: SET.skin, color: SET.color, ls: JSON.parse(localStorage.getItem(RQ_K.set) || '{}') }));
ok('«Надеть» → NS_set {skin:skin-gravyura, color:bundled}', worn.skin === 'skin-gravyura' && /^color-gravyura-/.test(worn.color || '') && worn.ls.skin === 'skin-gravyura' && worn.ls.color === worn.color, worn);
await p.evaluate(() => { if (typeof closeShopDetail === 'function') closeShopDetail(); closeRewardsSheet(); }); await sleep(300);

// D. profile: «Награды из жизни» moved out
const prof = await p.evaluate(() => { show('profile'); renderMvpProfile(); const b = document.getElementById('btnOpenRewards'); return { btn: !!(b && b.offsetParent) }; });
ok('profile: no «Награды из жизни» button (moved to «Награды»)', !prof.btn, prof);

// E. settings −/+ ≥ 44×44
await p.evaluate(() => openGeneralSettings(false)); await sleep(300);
const st = await p.evaluate(() => [...document.querySelectorAll('#settings .stepbtn')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { id: b.id, w: Math.round(r.width), h: Math.round(r.height) }; }));
const stBad = st.filter(x => x.w < 44 || x.h < 44);
ok('settings −/+ buttons at least 44×44', st.length >= 4 && !stBad.length, stBad.length ? stBad : st.length);
await p.evaluate(() => document.getElementById('uxScalePlus').scrollIntoView({ block: 'center' })); await sleep(200);
await p.screenshot({ path: SHOTS + 'shop-settings-size-390.png' });

// F. library: «Моя полка» on one line at 390px (default + pencil)
for (const sk of ['default', 'pencil']) {
  if (sk === 'pencil') await p.evaluate(() => { SET.theme = 'pencil'; saveSet(); applySet(); });
  await p.evaluate(() => show('library')); await sleep(300);
  const h = await p.evaluate(() => { const e = document.getElementById('shelfH'); const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
    const rg = document.createRange(); rg.selectNodeContents(e); const lines = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size;
    return { lines, h: Math.round(e.getBoundingClientRect().height), lh: Math.round(lh), t: e.textContent }; });
  ok(`${sk}: «Моя полка» on one line`, h.lines === 1 && h.t === 'Моя полка', h);
  if (sk === 'pencil') await p.screenshot({ path: SHOTS + 'shop-library-header-390.png' });
}
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY shop.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
