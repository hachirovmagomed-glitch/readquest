// Headless checks for small-fixes items 1–4 (+ item 7 probe). Fresh browser context, dist on :8766.
// TODO (stage 1, not the PWA mini-build): add a check — backup import with a legacy `cur` object (v6 shape) must keep MVP lock-downs and must not re-pay sessions.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const HERE = new URL('.', import.meta.url).pathname;
const OUT = process.env.RQ_OUT || HERE + '../../shots/mvp-check'; /* screenshots + json, gitignored-ish (shots/ untracked) */
fs.mkdirSync(OUT, { recursive: true });
const BOOK = HERE + 'fixtures/Длинная книга.txt';
const res = []; const ok = (n, p, i) => { res.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.emulate({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36', viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const boot = async () => { await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
const go = async (q = '') => { await page.goto(BASE + q, { waitUntil: 'load' }); await boot(); };
const reload = async () => { await page.reload({ waitUntil: 'load' }); await boot(); };
const vis = (id) => page.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && e.offsetParent !== null && r.width > 0; }, id);
const rowVis = (id) => page.evaluate((id) => { const e = document.getElementById(id); const row = e && e.closest('.setrow'); return !!row && getComputedStyle(row).display !== 'none' && row.offsetParent !== null; }, id);
const state = () => page.evaluate(() => { const t = trackerOpts(); return { goal: S.goal, minSec: S.anti && S.anti.minSec, maxMin: S.anti && S.anti.maxMin, devMoney: S.devMoney, goalMin: goalMin(), capMs: t.capMs, minSecMs: t.minSecMs, mvp: isMvp(), gold: S.gold, xp: S.xp, paid: (S.dailyPaidDays || []).slice(), awarded: (S.awardedSessionIds || []).length }; });
const libUi = () => page.evaluate(() => ({ title: document.getElementById('goalTitle').textContent, sub: document.getElementById('goalSub').textContent, ring: document.getElementById('ringTxt').textContent }));
const openSettings = async () => { await page.evaluate(() => { renderSettings(); show('settings'); }); await sleep(300); };
const openLib = async () => { await page.evaluate(() => { renderLibrary(); show('library'); }); await sleep(300); };

await go();
const build = await page.evaluate(() => RQ_BUILD);
/* expected = the build actually served (RQ_BUILD env wins; else read from dist sw.js, injected by build-dist.sh) */
const expBuild = process.env.RQ_BUILD || ((await (await fetch(BASE + 'sw.js', { cache: 'no-store' })).text()).match(/const BUILD = '([^']+)'/) || [])[1];
ok('build marker', !!build && build !== '__RQ_BUILD__' && build === expBuild, { build, expBuild });

// ---- 1. saved goal 5 / anti 30 s · 7 min / devMoney true → reload (MVP) ----
await page.evaluate(() => { S.goal = 5; S.anti = { minSec: 30, maxMin: 7, v: 2 }; S.devMoney = true; save(); });
const savedRaw = await page.evaluate(() => Object.keys(localStorage).filter(k => /^rq/.test(k)));
await reload();
let s1 = await state();
ok('1 saved goal 5 / minSec 30 / maxMin 7 / devMoney true → after load in MVP: goal 10, 12 s, 3 min, devMoney false; trackerOpts capMs 180000, minSecMs 12000',
  s1.mvp && s1.goal === 10 && s1.minSec === 12 && s1.maxMin === 3 && s1.devMoney === false && s1.goalMin === 10 && s1.capMs === 180000 && s1.minSecMs === 12000, s1);
const persisted = await page.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); return { goal: e.progress.goal, anti: e.game.anti, devMoney: e.game.devMoney }; });
ok('1 enforced values are persisted (export after boot)', persisted.goal === 10 && persisted.anti.minSec === 12 && persisted.anti.maxMin === 3 && persisted.devMoney === false, persisted);
// in-session mutation is ignored too (code reads goalMin()/antiCfg())
const mut = await page.evaluate(() => { S.goal = 5; S.anti.minSec = 30; S.anti.maxMin = 7; const t = trackerOpts(); const r = { goalMin: goalMin(), capMs: t.capMs, minSecMs: t.minSecMs, info: mvpDailyInfo() }; S.goal = 10; S.anti.minSec = 12; S.anti.maxMin = 3; return r; });
ok('1 S mutated in-session (goal 5, 30 s, 7 min) → MVP code still uses 10 / 12 s / 3 min', mut.goalMin === 10 && mut.capMs === 180000 && mut.minSecMs === 12000 && / \/ 10 мин$/.test(mut.info), mut);

// ---- 2/3/4 UI: library + settings (normal) ----
await openLib();
const lib = await libUi();
const st1 = { minus: await vis('goalMinus'), plus: await vis('goalPlus') };
ok('2 library: «Цель 10 мин», −/＋ hidden', lib.title === 'Цель 10 мин' && !st1.minus && !st1.plus, { lib, st1 });
const gap = await page.evaluate(() => { const t = document.getElementById('goalTitle'), r = t.parentElement; return { rowW: r.getBoundingClientRect().width, titleW: t.getBoundingClientRect().width, kids: [...r.children].filter(c => getComputedStyle(c).display !== 'none').length }; });
ok('2 library: only the caption is laid out in the goal row (no gap left by hidden buttons)', gap.kids === 1, gap);
await page.screenshot({ path: OUT + '/library-mvp.png' });
await openSettings();
const setv = {}; for (const id of ['goalMinus2', 'goalPlus2', 'antiMinMinus', 'antiMinPlus', 'antiMaxMinus', 'antiMaxPlus']) setv[id] = await vis(id);
const setTxt = await page.evaluate(() => ({ min: antiMinVal.textContent, max: antiMaxVal.textContent, goal: goalVal2.textContent }));
const rows1 = { mvpTgl: await rowVis('mvpTgl'), devMoneyTgl: await rowVis('devMoneyTgl'), focusTgl: await rowVis('focusTgl') };
const testH2 = await page.evaluate(() => [...document.querySelectorAll('#settings h2')].filter(h => /Тест-режим/.test(h.textContent)).map(h => getComputedStyle(h).display));
ok('2 settings: all goal/anti steppers hidden; read-only values 12 с / 3 мин / 10 мин', Object.values(setv).every(v => !v) && setTxt.min === '12 с' && setTxt.max === '3 мин' && setTxt.goal === '10 мин', { setv, setTxt });
ok('4 settings without ?dev=1: «Режим MVP» row and «🧪 Тест-режим» (∞ валюта) hidden; «Режим фокуса» stays', !rows1.mvpTgl && !rows1.devMoneyTgl && rows1.focusTgl && testH2.every(d => d === 'none'), { rows1, testH2 });
await page.screenshot({ path: OUT + '/settings-mvp.png', fullPage: true });
await page.evaluate(() => { document.querySelector('#settings .scroll').scrollTop = 1e6; }); await sleep(200);
await page.screenshot({ path: OUT + '/settings-mvp-bottom.png' });
const hideB = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll('#settings h2')].map(h => ({ t: h.textContent.trim(), vis: getComputedStyle(h).display !== 'none' && h.offsetParent !== null }));
  const pixel = document.getElementById('pixelTgl');
  const pixelVis = pixel && getComputedStyle(pixel).display !== 'none' && pixel.offsetParent !== null;
  const ai = document.getElementById('aiKey');
  const aiVis = ai && getComputedStyle(ai).display !== 'none' && ai.offsetParent !== null;
  return { h2, pixelVis, pixelTxt: pixel && pixel.textContent, aiVis };
});
ok('B MVP: «Сложность книг» and «ИИ-помощник» headings hidden; «Купить» (pixelTgl) hidden; API-key field not shown',
  hideB.h2.every(h => !/Сложность книг|ИИ-помощник/.test(h.t) || !h.vis) && !hideB.pixelVis && !hideB.aiVis, hideB);
await page.screenshot({ path: OUT + '/settings-mvp-bottom-after.png' });

// ---- EN translation of the caption ----
await page.evaluate(() => setLang('en')); await sleep(400); await openLib(); await sleep(400);
const en = await libUi();
ok('2 EN: caption → «Goal 10 min»', en.title === 'Goal 10 min', en);
await page.evaluate(() => setLang('ru')); await sleep(400); await reload();

// ---- ?dev=1 ----
await go('?dev=1');
await openSettings();
const rows2 = { mvpTgl: await rowVis('mvpTgl'), devMoneyTgl: await rowVis('devMoneyTgl') };
ok('4 ?dev=1: «Режим MVP» and «∞ Бесконечная валюта» visible', rows2.mvpTgl && rows2.devMoneyTgl, rows2);
await page.screenshot({ path: OUT + '/settings-mvp-dev.png', fullPage: true });
await page.evaluate(() => document.getElementById('devMoneyTgl').scrollIntoView({ block: 'center' })); await sleep(200);
await page.screenshot({ path: OUT + '/settings-mvp-dev-testmode.png' });
await openLib(); await page.screenshot({ path: OUT + '/library-mvp-dev.png' });

// ---- outside MVP (?dev=1, in-session only): reload would force mvp back on via mvpForceOn ----
await openSettings(); await page.click('#mvpTgl'); await sleep(300);
await page.evaluate(() => { S.goal = 5; S.anti.minSec = 30; save(); renderLibrary(); });
const v6 = await page.evaluate(() => ({ mvp: isMvp(), goal: S.goal, goalMin: goalMin(), minSecMs: trackerOpts().minSecMs, title: goalTitle.textContent }));
const v6btn = await vis('goalMinus');
ok('1/2 outside MVP in-session (v6): goal 5 and 30 s kept, «Цель дня: 5 мин», steppers visible', !v6.mvp && v6.goal === 5 && v6.goalMin === 5 && v6.minSecMs === 30000 && v6.title === 'Цель дня: 5 мин' && v6btn, { ...v6, v6btn });
await page.screenshot({ path: OUT + '/library-v6-dev.png' });
await reload(); // mvpForceOn → MVP back
const forced = await state();
ok('A reload after in-session mvp=false → mvpForceOn restores MVP + lock-downs', forced.mvp && forced.goal === 10 && forced.minSec === 12 && forced.maxMin === 3 && forced.devMoney === false, forced);
await go('?dev=1'); await openSettings(); await page.click('#mvpTgl'); await sleep(200); // off
await openSettings(); await page.click('#mvpTgl'); await sleep(300); // on again
const back = await state();
ok('1 switching MVP back on enforces 10 / 12 / 3 / devMoney false at once', back.mvp && back.goal === 10 && back.minSec === 12 && back.maxMin === 3 && back.devMoney === false, back);

// ---- import: goal 5, anti 30 s · 7 min, devMoney true; sessions today 9.8 min (A), 11 min (B) ----
await go();
const day = await page.evaluate(() => localDay());
const base = JSON.parse(await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false }))));
const mk = (rows) => { const b = JSON.parse(JSON.stringify(base)); b.progress.goal = 5; b.game.anti = { minSec: 30, maxMin: 7, v: 2 }; b.game.devMoney = true; b.game.dailyPaidDays = (b.game.dailyPaidDays || []).filter(d => d !== day); b.sessions = rows; b.game.gold = 1000; return b; };
const A = mk([{ id: '11111111-1111-4111-8111-111111111111', date: day, bookId: 'demo1', minutes: 9.8, pageTurns: 20 }]);
const B = mk([{ id: '22222222-2222-4222-8222-222222222222', date: day, bookId: 'demo1', minutes: 11, pageTurns: 25 }]);
const imp = async (b) => { await page.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, JSON.stringify(b)); await reload(); };
await imp(A);
const sA = await state(); await openLib(); const uiA = await libUi();
const profA = await page.evaluate(() => { renderMvpProfile(); return { min: (document.getElementById('mvpMinToday') || {}).textContent, info: mvpDailyInfo() }; });
ok('1 import A (goal 5, 30 s, 7 min, devMoney true): goal 10 / 12 s / 3 min / devMoney false after import', sA.goal === 10 && sA.minSec === 12 && sA.maxMin === 3 && sA.devMoney === false && sA.capMs === 180000 && sA.minSecMs === 12000, sA);
ok('1 import A: 9.8 min today < fixed 10 → no daily payout (imported goal 5 ignored)', !sA.paid.includes(day), { paid: sA.paid, gold: sA.gold });
ok('3 floor: 9.8 min → «9 / 10 мин», «Сегодня: 9 мин», mvpMinToday 9, ring 90%', profA.info === '9 / 10 мин' && uiA.sub === 'Сегодня: 9 мин' && profA.min === '9' && uiA.ring === '90%', { profA, uiA });
// ring % = min(1, floor(dayMinutes)/goal)·100 — the same value as the «N / 10 мин» text (product decision 10.10)
const ringPct = (min, goal) => Math.min(1, Math.floor(min) / goal) * 100;
ok('3 ring = min(1, floor(dayMinutes)/goal): 9.8 min → 90% (same as «9 / 10 мин»)', uiA.ring === ringPct(9.8, 10) + '%' && uiA.ring === Math.round(parseInt(profA.info, 10) / 10 * 100) + '%', { ring: uiA.ring, want: ringPct(9.8, 10) + '%', info: profA.info });
{ const C = mk([{ id: '33333333-3333-4333-8333-333333333333', date: day, bookId: 'demo1', minutes: 14, pageTurns: 30 }]);
  await imp(C); await openLib(); const uiC = await libUi();
  ok('3 ring cap: 14 min → 100% (not 140%)', uiC.ring === ringPct(14, 10) + '%' && uiC.ring === '100%', { ring: uiC.ring }); }
await imp(B);
const sB1 = await state();
await imp(B);
const sB2 = await state();
ok('1 import B (11 min today): daily paid once (+30 at least); re-import of the same backup → identical gold/xp/paid days (no double payout)',
  sB1.paid.filter(d => d === day).length === 1 && sB1.gold >= 1030 && sB2.gold === sB1.gold && sB2.xp === sB1.xp && JSON.stringify(sB2.paid) === JSON.stringify(sB1.paid) && sB2.goal === 10 && sB2.devMoney === false, { sB1: { gold: sB1.gold, xp: sB1.xp, paid: sB1.paid }, sB2: { gold: sB2.gold, xp: sB2.xp, paid: sB2.paid } });
// plain reload after import B: no further payout
await reload(); const sB3 = await state();
ok('1 reload after import B: no further payout', sB3.gold === sB2.gold && sB3.xp === sB2.xp, { gold: sB3.gold });
// ---- Architect A: import settings.mvp=false + goal 5 + devMoney true → still MVP lock-downs; export proves it ----
const C = mk([]); C.settings = Object.assign({}, C.settings, { mvp: false }); C.progress.goal = 5; C.game.devMoney = true; C.game.anti = { minSec: 30, maxMin: 7, v: 2 };
await imp(C);
const sC = await state();
ok('A import settings.mvp=false + goal 5 + devMoney true → after reload: mvp=true, goal 10, minSec 12, maxMin 3, devMoney false',
  sC.mvp && sC.goal === 10 && sC.minSec === 12 && sC.maxMin === 3 && sC.devMoney === false && sC.capMs === 180000 && sC.minSecMs === 12000, sC);
const expC = await page.evaluate(async () => {
  const e = await __rq.exportBackup(null, SET, { includeTextBodies: false });
  return { mvp: e.settings && e.settings.mvp, goal: e.progress.goal, anti: e.game.anti, devMoney: e.game.devMoney, goldDisp: goldDisp() };
});
ok('A/Architect (b) next export after mvp:false import: settings.mvp===true, goal 10, anti 12/3, no ∞ (devMoney false)',
  expC.mvp === true && expC.goal === 10 && expC.anti.minSec === 12 && expC.anti.maxMin === 3 && expC.devMoney === false && expC.goldDisp !== '∞', expC);

// ---- Architect (c): pdf_stall_recovered round-trip export → clear → import ----
const stallIn = { type: 'pdf_stall_recovered', bookId: 'stall-book', page: 59, label: '60', stalledMs: 1830, reason: 'flip' };
await page.evaluate(async (ev) => { await __rq.logAnalyticsEvent(ev); }, stallIn);
const expStall = JSON.parse(await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false }))));
const inExp = (expStall.events || []).filter(e => e.type === 'pdf_stall_recovered');
ok('Architect (c) export contains pdf_stall_recovered with page/label/stalledMs/reason; none in sessions[]',
  inExp.length >= 1 && inExp.some(e => e.page === 59 && e.label === '60' && e.stalledMs === 1830 && e.reason === 'flip' && e.bookId === 'stall-book') &&
  !(expStall.sessions || []).some(r => r.type === 'pdf_stall_recovered' || 'stalledMs' in r), { events: inExp, sessionsHaveStall: (expStall.sessions || []).some(r => 'stalledMs' in r) });
// clear via import of same envelope with empty events/sessions, then re-import the stall export
const wipe = JSON.parse(JSON.stringify(expStall)); wipe.events = []; wipe.sessions = [];
await imp(wipe);
const mid = await page.evaluate(async () => (await __rq.listReadingEvents({ type: 'pdf_stall_recovered' })).length);
ok('Architect (c) after wipe import: 0 stall events', mid === 0, { mid });
await imp(expStall);
const after = await page.evaluate(async () => {
  const evs = await __rq.listReadingEvents({ type: 'pdf_stall_recovered' });
  const rows = await __rq.listSessions({});
  return { evs, rowsHaveStall: rows.some(r => r.type === 'pdf_stall_recovered' || 'stalledMs' in r) };
});
const hit = (after.evs || []).find(e => e.page === 59 && e.label === '60' && e.stalledMs === 1830 && e.reason === 'flip' && e.bookId === 'stall-book');
ok('Architect (c) re-import restores same page/label/stalledMs/reason in events; none in sessions[]', !!hit && !after.rowsHaveStall, { hit, n: after.evs.length });

// ---- sumMin floor: 9.8 → summary shows 9, not 10 ----
await page.evaluate(() => {
  renderSummary({ xp: 0, pages: 1, min: 9.8, gold: 0, statGain: 1, stat: 'Воля', day: localDay(), quest: { daily: false, weekly: false }, newB: [], newAch: [], lvBefore: 1, justFinished: false, mult: 1, flipped: 1, cheatFinish: false, dName: '', dmul: 1 });
});
const sumMinTxt = await page.evaluate(() => document.getElementById('sumMin').textContent);
ok('sumMin floor: 9.8 min → «9» (not Math.round «10»)', sumMinTxt === '9', { sumMinTxt });
await page.evaluate(() => { try { document.getElementById('summary').classList.add('hidden'); show('library'); } catch (e) {} });

// ---- item 7 probe: text reader, forward tap on the last page ----
await (await page.$('#fileInp')).uploadFile(BOOK);
await page.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
const bid = await page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
await page.evaluate((id) => openBook(id), bid); await page.waitForFunction(() => R.pageCount > 1); await sleep(600);
await page.evaluate(() => goPage(R.pageCount - 2, false)); await sleep(600);
const vr = await page.evaluate(() => { const r = document.getElementById('viewer').getBoundingClientRect(); return { x: r.left + r.width * 0.85, y: (r.top + r.bottom) / 2 }; });
const tp = await page.evaluate(() => ({ page: R.page, snap: __tracker.snapshot() }));
await page.touchscreen.tap(vr.x, vr.y); await sleep(500);   // control: the same tap on the second-to-last page IS a forward turn
const t0 = await page.evaluate(() => ({ page: R.page, n: R.pageCount, snap: __tracker.snapshot() }));
ok('7 control: forward tap on the second-to-last page → last page, turns +1', t0.page === tp.page + 1 && t0.snap.turns === tp.snap.turns + 1, { from: tp.page, to: t0.page, turns: [tp.snap.turns, t0.snap.turns] });
for (let k = 0; k < 3; k++) { await page.touchscreen.tap(vr.x, vr.y); await sleep(400); }
const t1 = await page.evaluate(() => ({ page: R.page, snap: __tracker.snapshot() }));
ok('7 text reader: 3 forward taps on the LAST page → page unchanged, tracker pageTurns/turns unchanged (no pageTurned+pageShown on the same page)',
  t1.page === t0.page && t0.page === t0.n - 1 && t1.snap.pageTurns === t0.snap.pageTurns && (t1.snap.turns ?? 0) === (t0.snap.turns ?? 0), { before: { page: t0.page, pageTurns: t0.snap.pageTurns, turns: t0.snap.turns }, after: { page: t1.page, pageTurns: t1.snap.pageTurns, turns: t1.snap.turns } });

const pass = res.filter(r => r.p).length;
console.log(`\nTOTAL ${pass}/${res.length}`);
fs.writeFileSync(OUT + '/mvp-check.json', JSON.stringify(res, null, 1));
await browser.close();
