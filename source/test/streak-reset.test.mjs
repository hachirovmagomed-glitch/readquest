// 1б: «Сбросить тест» race (stream 2100). Two windows of the /test/ build (ns rqt): B = writer, A = passive.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node streak-reset.test.mjs
// B reads 2.5 min → streak 1; passive A presses reset; reload B → streak 0, lastDay null, no books, rqt_v1 streak 0;
// then 1.1 min in B → summary «1 / 10» and streak still 0. Before the fix B wrote its old state back (streak 1 after reset).
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/test/';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, TZ: 'Europe/Moscow' } });
const ctx = await browser.createBrowserContext();
const errs = [];
async function mk(tag) {
  const p = await ctx.newPage(); await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => {
    window.__rqTimeOffset = 0;
    const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
    window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; };
  });
  p.on('dialog', d => d.accept()); p.on('pageerror', e => { errs.push(tag + ': ' + e.message); console.log('PAGEERROR', tag, e.message); });
  return p;
}
const ready = (p, t) => p.waitForFunction(() => window.__rqReady, { timeout: t || 20000 }).then(() => true, () => false);
const st = (p) => p.evaluate(() => ({ ready: !!window.__rqReady, passive: !!__rqWriter.passive, streak: S.streak, lastDay: S.lastDay, books: (S.userBooks || []).length, sess: SESS.length })).catch(e => ({ err: e.message }));
const lsv = (p) => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('rqt_v1') || 'null'); return v ? { streak: v.progress.streak, lastDay: v.progress.lastDay, books: ((v.library || {}).userBooks || []).length } : null; });
async function addBook(p) { const n = await p.evaluate(() => (S.userBooks || []).length); await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(k => (S.userBooks || []).length > k, { timeout: 10000 }, n); return p.evaluate(() => S.userBooks[S.userBooks.length - 1].id); }
async function sess(p, id, ms) {
  await p.evaluate(i => openBook(i), id); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(400);
  await p.evaluate(m => window.__rqAdv(m), ms);
  await p.evaluate(() => closeReader()); await sleep(1200);
}

// B: clean test namespace, then 2.5 min → streak 1
const B = await mk('B');
await B.goto(BASE); await ready(B);
await Promise.all([B.waitForNavigation(), B.evaluate(() => window.__rqTestReset({ noConfirm: true }))]); await ready(B); await sleep(400);
const bid = await addBook(B);
await sess(B, bid, 150000);
const b1 = await st(B);
ok('B reads 2.5 min → streak 1', b1.streak === 1 && !b1.passive, b1);
await B.evaluate(() => document.getElementById('btnDone').click()); await sleep(300);

// A: second window → passive overlay; presses «Сбросить тест» in the banner
const A = await mk('A');
await A.goto(BASE); await sleep(2500);
const a0 = await A.evaluate(() => ({ passive: !!__rqWriter.passive, overlay: !document.getElementById('rqOther').classList.contains('hidden') }));
ok('A opens passive (overlay)', a0.passive && a0.overlay, a0);
let bNav = false; B.once('framenavigated', f => { if (f === B.mainFrame()) bNav = true; });
await Promise.all([A.waitForNavigation({ timeout: 10000 }).catch(e => console.log('A nav', e.message)), A.click('#rqTestReset')]);
await ready(A, 8000); await sleep(1500);
const log = await A.evaluate(() => JSON.parse(sessionStorage.getItem('__rqResetLog') || '[]').map(x => x.s));
ok('reset waited for deleteDatabase success (no timeout, no reload on blocked)', log.includes('idb-ok') && !log.includes('idb-timeout'), log);
ok('writer B reloaded by the reset (BroadcastChannel / versionchange)', bNav);
const a1 = await st(A);
ok('A after reset: writer, streak 0, no books', a1.ready && !a1.passive && a1.streak === 0 && a1.books === 0, a1);
const ls1 = await lsv(A);
ok('rqt_v1 right after reset: streak 0 (B did not write its old state back)', !ls1 || (ls1.streak === 0 && ls1.books === 0), ls1);

// the old writer B does what it did on the phone: its next save() (any page turn / close) writes its in-memory state
/* (as in the 2100 repro: a 1.1-min session in B right after the reset) — fixed: B already reloaded/passive, nothing to write */
await B.bringToFront();
await B.evaluate(async (id) => { try { if (window.R && (S.userBooks || []).some(b => b.id === id)) { await openBook(id); window.__rqAdv(66000); await closeReader(); } else if (window.S) save(); } catch (e) {} }, bid).catch(() => {}); await sleep(1500);
const lsW = await lsv(A);
ok('old writer B save() after the reset does not resurrect streak/books', !lsW || (lsW.streak === 0 && lsW.books === 0), lsW);
// reload B. A (the window that reset) is the writer now → B shows «открыт в другом окне»; «Открыть здесь» = takeover.
console.log('reloading B');await B.bringToFront();await B.reload({timeout:15000}).catch(e=>console.log('B reload',e.message)); await sleep(2000);console.log('B reloaded');
const bOv = await B.evaluate(() => !document.getElementById('rqOther').classList.contains('hidden'));
console.log('B overlay',bOv);if (bOv) { await B.evaluate(() => document.getElementById('rqOtherBtn').click()); }
await ready(B, 8000); await sleep(800);
const b2 = await st(B), ls2 = await lsv(B);
ok('reload B → streak 0, lastDay null, no books', b2.ready && !b2.passive && b2.streak === 0 && b2.lastDay == null && b2.books === 0 && b2.sess === 0, { b2, overlayFirst: bOv });
ok('rqt_v1 streak 0', ls2 && ls2.streak === 0 && ls2.lastDay == null && ls2.books === 0, ls2);

if (!b2.ready) { console.log('SUMMARY streak-reset.test ' + checks.filter(c => c.p).length + '/' + (checks.length + 4) + ' (B never became writer)'); await browser.close(); process.exit(1); }
// 1.1 min after reset → «1 / 10», streak stays 0 (2-min threshold)
const bid2 = await addBook(B);
await sess(B, bid2, 66000);
const sum = await B.evaluate(() => ({ summary: !document.getElementById('summary').classList.contains('hidden'), daily: (document.getElementById('sumDailyInfo') || {}).textContent, streak: S.streak }));
ok('1.1 min after reset → «1 / 10» and streak 0', /(^|\s)1 \/ 10/.test(sum.daily || '') && sum.streak === 0, sum);
const ls3 = await lsv(B);
ok('rqt_v1 still streak 0', ls3 && ls3.streak === 0, ls3);
const aEnd = await A.evaluate(() => ({ passive: !!__rqWriter.passive })).catch(() => null);
ok('A demoted after B took over (no second writer)', !aEnd || aEnd.passive, aEnd);
ok('no pageerror', !errs.length, errs);

const pass = checks.filter(c => c.p).length;
console.log('SUMMARY streak-reset.test ' + pass + '/' + checks.length);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
