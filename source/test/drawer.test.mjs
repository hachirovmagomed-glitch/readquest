// Боковое меню — условия Квестмастера (14.10):
//  1) уровень / XP / монеты в шапке меню — из тех же источников, что «Награды» и тосты: S.gold (coinsP) и S.xp
//     (= Σ row.xp, 10 × шаг целых минут дня, applySessionAwards); своего счётчика нет.
//  2) открытие и закрытие меню ничего не пишет: NS (RQ_K.v1) и NS_set (RQ_K.set) побайтно равны до и после.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node drawer.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const head = () => p.evaluate(() => ({ lvl: el('dLvl').textContent, xp: el('dXp').textContent, gold: el('dGold') ? el('dGold').textContent : null, bar: el('dXpBar').style.width }));
const expect = () => p.evaluate(() => { renderRewardsSheet(); const lv = level(S.xp), b = lvlBounds(lv);
  return { lvl: 'Уровень ' + lv, xp: (S.xp - b[0]) + ' / ' + (b[1] - b[0]) + ' XP', gold: el('rewBalance').textContent, sumRowXp: SESS.reduce((a, r) => a + (r && r.xp || 0), 0), Sxp: S.xp }; });
const open = () => p.evaluate(() => { el('menuLib').click(); return el('drawer').classList.contains('open'); });
const close = () => p.evaluate(() => { el('scrim').click(); return !el('drawer').classList.contains('open'); });

// 1. sources
let o = await open(); let h = await head(); let e = await expect();
ok('1a шапка = «Награды»/тосты (level(S.xp), lvlBounds); монет в меню нет (18.10, Джессика)', o && h.lvl === e.lvl && h.xp === e.xp && h.gold === null, { h, e });
await close();
await p.evaluate(async () => { S.gold = 1234; S.xp = 437; }); // memory only — must show on next open, no cache
await open(); h = await head(); e = await expect();
ok('1b нет своего счётчика: после смены S.xp шапка = «Награды» (Уровень 3)', h.gold === null && h.lvl === 'Уровень 3' && h.xp === e.xp, { h, e });
await close();
const src = await p.evaluate(() => String(drawerStats) + String(renderDrawerHead));
ok('1c drawerStats/renderDrawerHead читают только S.gold/S.xp, без save() и своих полей', /S\.gold/.test(src) && /S\.xp/.test(src) && !/save\(|S\.\w+\s*=[^=]|localStorage/.test(src), src.length);
const d = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); return Object.keys(S).filter(k => /drawer|dGold|dXp/i.test(k)); });
ok('1d в S нет полей меню', d.length === 0, d);
// restore real data before storage check
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(600);
// 2. no writes
const snap = () => p.evaluate(async () => { await new Promise(r => setTimeout(r, 400)); return { ns: localStorage.getItem(RQ_K.v1), set: localStorage.getItem(RQ_K.set) }; });
const writes = await p.evaluate(() => { window.__lsW = []; const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__lsW.push(k); return s.call(this, k, v); }; return true; });
const a = await snap();
for (let i = 0; i < 3; i++) { await open(); await sleep(300); await close(); await sleep(300); }
const b = await snap(); const w = await p.evaluate(() => window.__lsW.filter(k => k === RQ_K.v1 || k === RQ_K.set));
ok('2 открытие/закрытие ×3: NS и NS_set побайтно равны, setItem не вызывался', a.ns === b.ns && a.set === b.set && w.length === 0, { ns: a.ns === b.ns, set: a.set === b.set, writes: w });
ok('нет ошибок страницы', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`drawer.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
