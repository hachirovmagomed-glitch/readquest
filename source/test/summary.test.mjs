// 1б decisions B+D in the app (headless Chrome, dist under /readquest/): XP per session from the day's whole-minute step,
// stored in sessions[].xp; summary only for ≥ 1 min or a reward; «меньше минуты»; reward headline.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node summary.test.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh() {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset)); });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
  p.__bid = await p.evaluate(() => S.userBooks[0].id); p.__ctx = ctx; return p;
}
/* one session of `min` counted minutes: ≤ 2.9 min per page (page cap 3), then turn */
async function session(p, min) {
  await p.evaluate(id => openBook(id), p.__bid); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(300);
  let left = Math.round(min * 60000);
  while (left > 0) { const step = Math.min(left, 174000); left -= step; await p.evaluate((ms, more) => { window.__rqTimeOffset += ms; if (more) goPage(R.page + 1, true); }, step, left > 0); await sleep(60); }
  await p.evaluate(() => closeReader()); await sleep(1300);
  return p.evaluate(async () => {
    const rows = await __rq.listSessions({}); const last = SESS[SESS.length - 1];
    const idbRow = rows.find(r => r.id === last.id) || {};
    return { summary: !document.getElementById('summary').classList.contains('hidden'), library: !document.getElementById('library').classList.contains('hidden'),
      head: document.getElementById('sumHead').textContent, min: document.getElementById('sumMin').textContent, xpTxt: document.getElementById('sumXp').textContent,
      daily: document.getElementById('sumDailyInfo').textContent, libDaily: (typeof mvpDailyInfo === 'function' ? mvpDailyInfo() : ''), streak: S.streak, xp: S.xp, gold: S.gold,
      rowMin: +last.minutes.toFixed(3), rowXp: last.xp, idbXp: idbRow.xp, startedAt: typeof idbRow.startedAt === 'string' && /^\d{4}-\d\d-\d\dT/.test(idbRow.startedAt) && !isNaN(Date.parse(idbRow.startedAt)), n: rows.length };
  });
}
const done = async (p) => { await p.evaluate(() => { const b = document.getElementById('btnDone'); if (!document.getElementById('summary').classList.contains('hidden')) b.click(); }); await sleep(200); };

// 0.9 + 0.9 + 0.9
{ const p = await fresh();
  const a = await session(p, 0.9); await done(p);
  ok('0.9 #1: +0 XP → no summary, straight to library', !a.summary && a.library && a.rowXp === 0 && a.idbXp === 0 && a.startedAt /* stored as ISO */, a);
  const b = await session(p, 0.9);
  ok('0.9 #2: +10 XP → summary, «меньше минуты», «+10 XP», row.xp 10 in IDB', b.summary && b.min === 'меньше минуты' && b.xpTxt === '+10 XP' && b.rowXp === 10 && b.idbXp === 10, b); await done(p);
  const c = await session(p, 0.9);
  ok('0.9 #3: +10 XP; total +20 XP, «2 / 10», streak 1', c.summary && c.rowXp === 10 && c.xp === 20 && /^2 \/ 10/.test(c.daily) && c.streak === 1 && c.n === 3, c); await done(p);
  await p.__ctx.close(); }
// single 0.71
{ const p = await fresh();
  const a = await session(p, 0.71);
  ok('single 0.71: +0 XP, no summary, library, row kept', !a.summary && a.library && a.xp === 0 && a.rowXp === 0 && a.n === 1, a);
  await p.__ctx.close(); }
// 9.5 + 0.6
{ const p = await fresh();
  const a = await session(p, 9.5);
  ok('9.5: summary «9», +90 XP, no reward headline', a.summary && a.min === '9' && a.rowXp === 90 && a.head === 'Сессия завершена', a); await done(p);
  const b = await session(p, 0.6);
  ok('+0.6: summary with headline «Цель дня выполнена · +30 монет», «меньше минуты», +10 XP, «10 / 10»', b.summary && b.head === 'Цель дня выполнена · +30 монет' && b.min === 'меньше минуты' && b.rowXp === 10 && b.gold - a.gold === 30 && /^✓ 10 \/ 10/.test(b.daily), b); await done(p);
  await p.__ctx.close(); }
ok('no pageerror', !errs.length, errs);
const pass = checks.filter(c => c.p).length;
console.log('SUMMARY summary.test ' + pass + '/' + checks.length);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
