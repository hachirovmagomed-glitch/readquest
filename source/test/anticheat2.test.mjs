// 08.11 анти-чит, вторая волна (Джессика: «Какие ещё механизмы…» → «делай все»; arch.md 08.11): плашка «Глава прочитана» по честным страницам,
// «прочитано» только от 80 % честно прочитанного (прыжок в конец не в счёт), часы назад → sessions[].ck: без серии и монет дня. Только тестовый сайт (rqt).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node anticheat2.test.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import * as G from '../game-awards.js';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const BOOK = fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const checks = [];
const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 0. node: a row read with the clock set back counts for no day
{ const D = '2026-11-08', rows = [{ date: D, minutes: 6 }, { date: D, minutes: 12, ck: 1 }];
  ok('0 dayMinutes / minutesByDay skip rows with ck = 1', G.dayMinutes(rows, D) === 6 && G.minutesByDay(rows)[D] === 6 && G.daysAtGoalInWeek(rows, G.weekStartOf(D), 10).length === 0); }

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(file, w = 390, h = 844) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset)); });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(file); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
  p.__bid = await p.evaluate(() => S.userBooks[0].id); p.__ctx = ctx; return p;
}
const open = async (p) => { await p.evaluate(id => openBook(id), p.__bid); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(400); };
const close = async (p) => { await p.evaluate(() => closeReader()); await sleep(1300); };
const done = async (p) => { await p.evaluate(() => { if (!document.getElementById('summary').classList.contains('hidden')) document.getElementById('btnDone').click(); }); await sleep(200); };
/** turn n pages, `ms` of reading on each (fake clock), a touch on each page = a sign of life */
const read = (p, n, ms) => p.evaluate(async (n, ms) => { let seen = false; for (let k = 0; k < n && R.page < R.pageCount - 1; k++) { window.__rqTimeOffset += ms; goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 25)); if (!el('r2Offer').hidden) seen = true; } return seen; }, n, ms);

// 1. the chapter card follows the honest rules: flipping fast → no card; reading at the own pace → the card
{ const ch = (i) => '<section><title><p>Глава ' + i + '</p></title>' + Array.from({ length: 40 }, (_, k) => '<p>Глава ' + i + ', абзац ' + k + '. Он долго шёл по улице и думал о своём, а ветер гнал листья по мостовой, и было тихо и пусто.</p>').join('') + '</section>';
  const fb2 = '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Главы</book-title><author><last-name>Тестов</last-name></author><lang>ru</lang></title-info></description><body>' + ch(1) + ch(2) + ch(3) + '</body></FictionBook>';
  const f = fileURLToPath(new URL('./fixtures/_chapters-ac2.fb2', import.meta.url)); (await import('fs')).writeFileSync(f, fb2);
  let p = await fresh(f); await open(p);
  const fast = await p.evaluate(async () => { const toc = r2Toc(R.book); let seen = false;
    while (R.page < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { window.__rqTimeOffset += 1500; goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 25)); if (!el('r2Offer').hidden) seen = true; }
    return { seen, toc: toc.length, cov: r2ChapCov(R.book, 0) }; });
  ok('1 the chapter flipped through (1.5 s a page) → no card «Глава прочитана»', fast.toc === 3 && !fast.seen && fast.cov >= 0 && fast.cov < 0.8, fast);
  await p.__ctx.close();
  p = await fresh(f); await open(p);
  const slow = await p.evaluate(async () => { let seen = false;
    while (R.page < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { window.__rqTimeOffset += 20000; goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 25)); if (!el('r2Offer').hidden) seen = true; }
    return { seen, txt: el('r2Offer').textContent }; });
  ok('1 the chapter read at a human pace (20 s a page) → the card', slow.seen && /Глава прочитана/.test(slow.txt), slow);
  await p.__ctx.close(); (await import('fs')).unlinkSync(f); }

// 2. «прочитано» only from 80 % honestly read: a jump to the end is not a finish
{ const p = await fresh(BOOK); await open(p);
  await read(p, 4, 20000); await p.evaluate(() => { window.__rqTimeOffset += 20000; goPage(R.pageCount - 1, true); }); await sleep(100); await p.evaluate(() => { window.__rqTimeOffset += 20000; }); await close(p);
  const a = await p.evaluate(() => ({ fin: (S.finished || []).includes(S.userBooks[0].id), note: el('sumNote').textContent, sp: rqSpansLen((S.readSpans || {})[S.userBooks[0].id]) }));
  ok('2 four pages read, then a jump to the last page → not «прочитано», the summary says how much is read', !a.fin && /не отмечена прочитанной: честно прочитано \d+%, нужно от 80%/.test(a.note) && a.sp < 0.8, a);
  await done(p); await p.evaluate(id => openBook(id), p.__bid); await sleep(500); await p.evaluate(() => goPage(0, false));
  await read(p, 2000, 15000); await p.evaluate(() => { window.__rqTimeOffset += 15000; }); await close(p);
  const b = await p.evaluate(() => ({ fin: (S.finished || []).includes(S.userBooks[0].id), sp: rqSpansLen((S.readSpans || {})[S.userBooks[0].id]), n: R.pageCount }));
  ok('2 the whole book read page by page → «прочитано»', b.fin && b.sp >= 0.8, b);
  await p.__ctx.close(); }

// 3. the clock set back: the row carries ck = 1 — XP yes; no day minutes, no streak, no coins of the day
{ const p = await fresh(BOOK);
  await p.evaluate(() => { localStorage.setItem(rqClockKey(), String(Date.now() + 3 * 3600000)); });
  const back = await p.evaluate(() => ({ b: rqClockBack(), o: honestOpts(S.userBooks[0]).honest.clock() }));
  await open(p); await read(p, 40, 20000); await p.evaluate(() => { window.__rqTimeOffset += 15000; }); await close(p);
  const a = await p.evaluate(async () => { const rows = await __rq.listSessions({}), r = rows[rows.length - 1] || {};
    return { ck: r.ck, min: Math.round(r.minutes || 0), xp: S.xp, day: dayMin(today()), paid: (S.dailyPaidDays || []).includes(today()), note: el('sumNote').textContent }; });
  ok('3 the clock 3 h behind the latest seen → rqClockBack, and the tracker gets it', back.b && back.o, back);
  ok('3 a session then: row ck = 1, XP given, but 0 minutes of the day and no daily coins; the summary says why', a.ck === 1 && a.min >= 10 && a.xp > 0 && a.day === 0 && !a.paid && /Часы телефона переведены назад/.test(a.note), a);
  await done(p);
  /* the backup keeps ck */
  const ex = await p.evaluate(async () => { const j = await __rq.exportBackup(null, rqSetForSave(), { includeTextBodies: false }); const o = typeof j === 'string' ? JSON.parse(j) : j; const s = ((o.data || o).sessions || o.sessions || []).slice(-1)[0] || {}; return s.ck; }).catch(e => 'err ' + e.message);
  ok('3 ck goes into the backup', ex === 1, ex);
  await p.__ctx.close(); }
{ const p = await fresh(BOOK); await p.evaluate(() => { localStorage.setItem(rqClockKey(), String(Date.now() - 60000)); });
  await open(p); await read(p, 40, 20000); await p.evaluate(() => { window.__rqTimeOffset += 15000; }); await close(p);
  const a = await p.evaluate(async () => { const rows = await __rq.listSessions({}), r = rows[rows.length - 1] || {}; return { ck: r.ck, day: dayMin(today()), paid: (S.dailyPaidDays || []).includes(today()), clk: Number(localStorage.getItem(rqClockKey())) > Date.now() - 120000 }; });
  ok('3 the clock as usual → no ck, the day counts and the daily coins come', a.ck === undefined && a.day >= 10 && a.paid, a);
  await p.__ctx.close(); }

ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length;
console.log('SUMMARY anticheat2.test ' + n + '/' + checks.length);
process.exit(n === checks.length ? 0 : 1);
