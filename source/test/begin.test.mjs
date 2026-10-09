// 1б: reader-session begin() never overwrites a running session. Headless Chrome, dist under /readquest/.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node begin.test.mjs
// (a) app path: open book A, read 2.5 min, leave the reader WITHOUT closing it, open book B → A's row is in sessions[]
//     (minutes kept, paid once, no summary shown), then B reads 1.2 min and closes normally → its own row.
// (b) tracker safety net: __tracker.begin(A) … __tracker.begin(B) directly → A's row written + paid via the stale handler.
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  window.__rqTimeOffset = 0;
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; };
});
const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
page.on('dialog', d => d.accept());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
const inp = await page.$('#fileInp');
await inp.uploadFile(BOOK); await page.waitForFunction(() => (S.userBooks || []).length === 1, { timeout: 10000 });
await page.evaluate(() => S.userBooks[0].id).then(() => {});
// second book: same text, other file name (dup books are allowed for now)
const B2 = '/tmp/rq-begin-B.txt';
const fs = await import('fs'); fs.copyFileSync(BOOK, B2);
await inp.uploadFile(B2); await page.waitForFunction(() => (S.userBooks || []).length === 2, { timeout: 10000 });
const [A, B] = await page.evaluate(() => S.userBooks.map(b => b.id));
const rows = () => page.evaluate(async () => ({ sess: SESS.map(r => ({ id: r.id, bookId: r.bookId, min: +r.minutes.toFixed(2) })), idb: (await __rq.listSessions({})).map(r => ({ id: r.id, bookId: r.bookId, min: +r.minutes.toFixed(2) })),
  awarded: ((S.game && S.game.awardedSessionIds) || S.awardedSessionIds || []).slice(), summary: !document.getElementById('summary').classList.contains('hidden'), xp: S.xp }));
const open = async (id) => { await page.evaluate(i => openBook(i), id); await page.waitForFunction(i => R.book && R.book.id === i && R.pageCount > 1, { timeout: 10000 }, id); await sleep(300); };

// (a) app path
await open(A); await page.evaluate(() => window.__rqAdv(150000));
await page.evaluate(() => { stopChrome(); show('library'); }); /* left the reader without closing (no closeReader) */
const xp0 = await page.evaluate(() => S.xp);
await open(B); await sleep(800);
let r1 = await rows();
const aRow = r1.idb.find(r => r.bookId === A);
ok('(a) open B over a running A → A row in IDB sessions[] with its minutes (≈2.5)', aRow && aRow.min >= 2.4 && aRow.min <= 2.6, aRow);
ok('(a) A row also in SESS and paid once, no summary shown', r1.sess.some(r => r.id === (aRow || {}).id) && r1.awarded.filter(x => x === (aRow || {}).id).length === 1 && !r1.summary, { awarded: r1.awarded.length, summary: r1.summary });
ok('(a) XP grew by A\'s payout', r1.xp > xp0, { before: xp0, after: r1.xp });
ok('(a) B is the running session now', await page.evaluate(i => __tracker.isRunning() && __tracker.getBookId() === i, B));
await page.evaluate(() => window.__rqAdv(72000));
await page.evaluate(() => closeReader()); await sleep(1000);
let r2 = await rows();
const bRow = r2.idb.find(r => r.bookId === B);
ok('(a) B closes normally → own row ≈1.2 min, 2 rows total, summary', bRow && bRow.min >= 1.1 && bRow.min <= 1.3 && r2.idb.length === 2 && r2.summary, { bRow, n: r2.idb.length });
await page.evaluate(() => document.getElementById('btnDone').click()); await sleep(300);

// (b) tracker safety net (begin twice, app close path bypassed)
const n0 = r2.idb.length; const old = new Set(r2.idb.map(r => r.id));
await page.evaluate((a) => { __tracker.begin(a, 0, trackerOpts()); }, A);
await page.evaluate(() => window.__rqAdv(100000));
await page.evaluate((b) => { __tracker.begin(b, 0, trackerOpts()); }, B);
await sleep(800);
let r3 = await rows();
const sRow = r3.idb.find(r => !old.has(r.id) && r.bookId === A);
ok('(b) tracker.begin over a running session → its row written (≈1.67 min), in SESS, paid', sRow && sRow.min >= 1.6 && sRow.min <= 1.75 && r3.sess.some(r => r.id === sRow.id) && r3.awarded.includes(sRow.id), sRow);
const draft = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem(RQ_NS + '_session_draft') || 'null'); return d && d.bookId; });
ok('(b) the draft slot belongs to the new session (not deleted by the old row\'s write)', draft === B, draft);
await page.evaluate(() => __tracker.cancel());
ok('no pageerror', !errs.length, errs);
const pass = checks.filter(c => c.p).length;
console.log('SUMMARY begin.test ' + pass + '/' + checks.length);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
