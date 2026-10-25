// 1б: «Сбросить тест» race (stream 2100). Two windows of the /test/ build (ns rqt): B = writer, A = passive.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node streak-reset.test.mjs
// B reads 2.5 min → streak 0, +1 min → streak 1 (soft floor 3 min); passive A presses reset; reload B → streak 0, lastDay null, no books, rqt_v1 streak 0;
// then 1.1 min in B → summary «1 / 10» and streak still 0. Before the fix B wrote its old state back (streak 1 after reset).
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

/* 1в: fixed test clock (RQ_FAKE_NOW, default Tue 2026-10-06 12:00 MSK) shared by ALL windows of the origin: localStorage '__rqFake'
   {base, real0, adv} (not an rqt* key → survives «Сбросить тест»). Date.now / new Date() / performance.now follow it; __rqAdv(ms) / __rqAt(iso)
   move it for every window. No real-clock day ever enters the test (no midnight flake). */
const FAKE_NOW = process.env.RQ_FAKE_NOW || '2026-10-06T12:00:00+03:00';
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
  await p.evaluateOnNewDocument((iso) => {
    const K = '__rqFake', RD = Date, rnow = RD.now.bind(RD);
    const get = () => { let f = null; try { f = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {} if (!f) { f = { base: RD.parse(iso), real0: rnow(), adv: 0 }; localStorage.setItem(K, JSON.stringify(f)); } return f; };
    const now = () => { const f = get(); return f.base + (rnow() - f.real0) + f.adv; };
    const adv0 = get().adv; const pn = performance.now.bind(performance);
    performance.now = () => pn() + (get().adv - adv0);
    class FakeDate extends RD { constructor(...a) { if (a.length) super(...a); else super(now()); } static now() { return now(); } }
    window.Date = FakeDate;
    window.__rqAdv = (ms) => { const f = get(); f.adv += ms; localStorage.setItem(K, JSON.stringify(f)); };
    window.__rqAt = (t) => { const f = get(); f.adv += RD.parse(t) - now(); localStorage.setItem(K, JSON.stringify(f)); };
  }, FAKE_NOW);
  p.on('dialog', d => d.accept()); p.on('pageerror', e => { errs.push(tag + ': ' + e.message); console.log('PAGEERROR', tag, e.message); });
  return p;
}
const ready = (p, t) => p.waitForFunction(() => window.__rqReady, { timeout: t || 20000 }).then(() => true, () => false);
const st = (p) => p.evaluate(() => ({ ready: !!window.__rqReady, passive: !!__rqWriter.passive, streak: S.streak, lastDay: S.lastDay, books: (S.userBooks || []).length, sess: SESS.length })).catch(e => ({ err: e.message }));
const lsv = (p) => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('rqt_v1') || 'null'); return v ? { streak: v.progress.streak, lastDay: v.progress.lastDay, books: ((v.library || {}).userBooks || []).length } : null; });
async function addBook(p) { const n = await p.evaluate(() => (S.userBooks || []).length); await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(k => (S.userBooks || []).length > k, { timeout: 10000 }, n); return p.evaluate(() => S.userBooks[S.userBooks.length - 1].id); }
async function sess(p, id, ms) {
  await p.evaluate(() => { S.readSpans = {}; }); /* 25.10: the same first pages again would be a re-read (no minutes) — this test is about the streak */
  await p.evaluate(i => openBook(i), id); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(400);
  /* 25.10 честное чтение (тестовый сайт): страница засчитывается, когда её перелистнули — сидеть ms и перелистнуть, потом закрыть */
  await p.evaluate(m => { window.__rqAdv(m); goPage(R.page + 1, true); }, ms); await sleep(60);
  await p.evaluate(() => closeReader()); await sleep(1200);
}

// B: clean test namespace
const B = await mk('B');
await B.goto(BASE); await ready(B);
await Promise.all([B.waitForNavigation(), B.evaluate(() => { window.__rqTestReset({ noConfirm: true }); }) /* not awaited in-page: the reset reloads, the context dies */]); await ready(B); await sleep(400);
let bid = await addBook(B);

// --- calendar cases on the fixed clock: 3 goal days Tue–Thu, then a Sunday session across midnight (Sun → Mon) ---
const cal = () => B.evaluate(() => ({ day: today(), daily: (S.dailyPaidDays || []).slice().sort(), weekly: (S.weeklyPaidWeeks || []).slice().sort(), streak: S.streak, lastDay: S.lastDay, gold: S.gold }));
const read = async (id, min) => { await B.evaluate(i => openBook(i), id); await B.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(300);
  for (let i = 0; i < min; i++) { await B.evaluate(() => { window.__rqAdv(60000); goPage(R.page + 1, true); }); await sleep(40); }
  await B.evaluate(() => closeReader()); await sleep(1200); await B.evaluate(() => { const b = document.getElementById('btnDone'); if (b && !document.getElementById('summary').classList.contains('hidden')) b.click(); }); await sleep(200); };
for (const d of ['2026-10-06', '2026-10-07', '2026-10-08']) { await B.evaluate((t) => window.__rqAt(t), d + 'T12:00:00+03:00'); await read(bid, 11); }
let c0 = await cal();
ok('fixed clock: Tue–Thu 11 min each → daily paid 06/07/08, no weekly yet (3 / 4 days)', c0.daily.join() === '2026-10-06,2026-10-07,2026-10-08' && !c0.weekly.length && c0.day === '2026-10-08', c0);
await B.evaluate(() => window.__rqAt('2026-10-11T23:53:00+03:00')); /* Sunday */
await read(bid, 11); /* 23:53 → 00:04 Monday */
let c1 = await cal();
ok('midnight: Sun 23:53 → Mon 00:04 session counts for its START day: daily 2026-10-11 paid, 2026-10-12 not', c1.daily.includes('2026-10-11') && !c1.daily.includes('2026-10-12') && c1.day === '2026-10-12', c1);
ok('Sun → Mon: 4th goal day of week 2026-10-05 → weekly paid for that week only (not 2026-10-12)', c1.weekly.join() === '2026-10-05', c1);
// Квестмастер: the Sun→Mon session belongs to Sunday, so the Monday ring starts at 0 (library ring + «Сегодня: 0 мин» + dayMinutes(Mon) = 0)
await B.evaluate(() => { if (typeof renderLibrary === 'function') renderLibrary(); }); await sleep(200);
const r1 = await B.evaluate(() => ({ day: today(), mon: dayMin(today()), sun: dayMin('2026-10-11'), ring: document.getElementById('ringTxt').textContent, sub: document.getElementById('goalSub').textContent, off: parseFloat(document.getElementById('ringFg').style.strokeDashoffset) }));
ok('Sun → Mon: Monday ring starts at 0 (dayMinutes Mon 0, Sun ≥ 10, ring 0%, «Сегодня: 0 мин», ring offset full)', r1.day === '2026-10-12' && r1.mon === 0 && r1.sun >= 10 && r1.ring === '0%' && /Сегодня: 0 мин/.test(r1.sub) && Math.abs(r1.off - 207) < 0.5, r1);
await B.evaluate(() => window.__rqAt('2026-10-12T00:10:00+03:00'));
await read(bid, 11);
let c2 = await cal();
ok('Monday 00:10 11 min → daily 2026-10-12 paid; new week 2026-10-12 not paid (1 / 4); weekly list unchanged', c2.daily.includes('2026-10-12') && c2.weekly.join() === '2026-10-05', c2);
// back to a plain weekday for the reset race below; clean namespace again
await B.evaluate(() => window.__rqAt('2026-10-14T12:00:00+03:00'));
await Promise.all([B.waitForNavigation(), B.evaluate(() => { window.__rqTestReset({ noConfirm: true }); })]); await ready(B); await sleep(400);
const c3 = await cal();
ok('reset clears daily/weekly paid lists (fixed clock kept: Wed 2026-10-14)', !c3.daily.length && !c3.weekly.length && c3.day === '2026-10-14', c3);
bid = await addBook(B);

// --- soft floor 3 min (Маня 15.10): 2.5 min a day keeps nothing, +1 min (3.5 that day) → streak 1 ---
await sess(B, bid, 150000);
const b0 = await st(B);
ok('B reads 2.5 min → streak 0 (below the 3-min soft floor)', b0.streak === 0 && b0.lastDay == null && !b0.passive, b0);
await B.evaluate(() => document.getElementById('btnDone').click()); await sleep(300);
// --- reset race (stream 2100): day total 3.5 min → streak 1 ---
await sess(B, bid, 60000);
const b1 = await st(B);
ok('B reads +1 min (3.5 min that day) → streak 1', b1.streak === 1 && b1.lastDay === '2026-10-14' && !b1.passive, b1);
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
// 1.1 min after reset → «1 / 10», streak stays 0 (3-min threshold)
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
