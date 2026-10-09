// saveFlat contract (Architect 09.10): a text body is written to IndexedDB ONCE — on add (fileInp → upsertUserBook),
// import (importBackup) or v6 migration. save()/saveFlat writes only the rq_v1 envelope.
// Counter: a wrapper around IDBObjectStore.prototype.put counting keys `text:<id>` (no app instrumentation).
// Run against a served dist:  RQ_URL=http://127.0.0.1:8766/readquest/ node savetext.test.mjs
// Red-run proof: serve a dist of the old saveFlat (every save() re-puts every text) → the «0 putText» checks fail.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- fixtures: 7 files = 2 books + 2 duplicates of them + 1 broken PDF + 2 one-byte txt ----
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-savetext-'));
const words = 'книга текст чтение страница глава слово мысль время дом город река лес'.split(' ');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const bookText = (n) => `Книга ${n}\n\n` + Array.from({ length: 40 }, () => Array.from({ length: 60 }, () => words[Math.floor(rnd() * words.length)]).join(' ')).join('\n\n');
const T1 = bookText(1), T2 = bookText(2);
fs.mkdirSync(path.join(DIR, 'dup'));
const files = [
  [path.join(DIR, 'Книга-1.txt'), T1], [path.join(DIR, 'Книга-2.txt'), T2],
  [path.join(DIR, 'dup', 'Книга-1.txt'), T1], [path.join(DIR, 'dup', 'Книга-2.txt'), T2],
  [path.join(DIR, 'broken.pdf'), Buffer.concat([Buffer.from('%PDF-1.4\n%not really a pdf\n'), Buffer.alloc(1024, 7)])],
  [path.join(DIR, 'tiny-1.txt'), 'a'], [path.join(DIR, 'tiny-2.txt'), 'b'],
];
for (const [f, c] of files) fs.writeFileSync(f, c);

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915 });
await page.evaluateOnNewDocument(() => {
  window.__putText = [];
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (typeof key === 'string' && key.indexOf('text:') === 0) window.__putText.push({ key, len: typeof value === 'string' ? value.length : -1 });
    return put.apply(this, arguments);
  };
});
const dialogs = [];
page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss().catch(() => {}); });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const ready = () => page.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 });
const idbKeys = () => page.evaluate(() => new Promise((res) => { const r = indexedDB.open(RQ_K.idb || 'readquest'); r.onsuccess = () => { const q = r.result.transaction('files').objectStore('files').getAllKeys(); q.onsuccess = () => { res(q.result); r.result.close(); }; }; }));
const idbText = (id) => page.evaluate((id) => __rq.idb.getText(id), id);

await page.goto(BASE, { waitUntil: 'load' }); await ready();
const build = await page.evaluate(() => RQ_BUILD);
console.log('build', build, 'url', BASE);
await page.evaluate(() => { window.__putText.length = 0; });

// (1) add the 7 files one by one through the real file input (no batch import yet: same path, sequential)
const ids0 = await page.evaluate(() => S.userBooks.map(b => b.id));
for (const [f] of files) {
  const n0 = await page.evaluate(() => S.userBooks.length), d0 = dialogs.length;
  await (await page.$('#fileInp')).uploadFile(f);
  const t0 = Date.now(); while (Date.now() - t0 < 8000) { if (dialogs.length > d0 || (await page.evaluate((n0) => S.userBooks.length > n0, n0))) break; await sleep(50); }
  await sleep(250); /* distinct 'u'+Date.now() ids; let the save() chain settle */
}
await sleep(600);
const added = await page.evaluate((ids0) => S.userBooks.filter(b => !ids0.includes(b.id)).map(b => ({ id: b.id, title: b.title, type: b.type || 'text', len: (b.text || '').length })), ids0);
const putAdd = await page.evaluate(() => window.__putText.slice());
const keys1 = await idbKeys();
const orphanPdf = keys1.filter(k => typeof k === 'string' && k.startsWith('pdf:') && !added.some(b => 'pdf:' + b.id === k));
ok('add 7 files (2 books, 2 duplicates, 1 broken PDF, 2 one-byte txt) sequentially → exactly 4 putText, one per added book',
  putAdd.length === 4 && added.length === 4 && new Set(added.map(b => b.id)).size === 4 && putAdd.every(p => added.some(b => 'text:' + b.id === p.key)) && new Set(putAdd.map(p => p.key)).size === 4,
  { putText: putAdd.length, keys: putAdd.map(p => p.key), added: added.map(b => b.title), dialogs: dialogs.length });
ok('broken PDF and one-byte txt → no book, no orphan pdf:* in IDB, every added text body in IDB', dialogs.length === 3 && orphanPdf.length === 0 && added.every(b => keys1.includes('text:' + b.id)), { dialogs, orphanPdf });

// (2) 10 × save() without new books (progress changes) → 0 putText
await page.evaluate(() => { window.__putText.length = 0; });
for (let i = 0; i < 10; i++) { await page.evaluate((i) => { const b = S.userBooks[S.userBooks.length - 1]; S.progress[b.id] = Object.assign({}, S.progress[b.id] || {}, { ratio: (i + 1) / 20 }); save(); }, i); await sleep(60); }
await sleep(800);
const put10 = await page.evaluate(() => window.__putText.slice());
const env10 = await page.evaluate(() => { const v = JSON.parse(localStorage.getItem(RQ_K.v1) || '{}'); const b = S.userBooks[S.userBooks.length - 1]; return { ratio: ((v.progress || {}).progress || {})[b.id] ? v.progress.progress[b.id].ratio : null, textInEnvelope: JSON.stringify(v).indexOf('книга текст') >= 0 || (v.library && (v.library.userBooks || []).some(x => x.text)) }; });
ok('10 × save() without new books → 0 putText; envelope saved (progress 0.5), no book text in rq_v1', put10.length === 0 && env10.ratio === 0.5 && !env10.textInEnvelope, { putText: put10.length, env10 });

// (3) reload → each added book opens with its text (text comes from IDB, not from save())
await page.reload({ waitUntil: 'load' }); await ready();
await page.evaluate(() => { window.__putText.length = 0; });
const opened = [];
for (const b of added) {
  await page.evaluate((id) => openBook(id), b.id);
  await page.waitForFunction(() => window.R && R.book && R.pageCount > 1, { timeout: 10000, polling: 100 }).catch(() => {});
  await sleep(300);
  opened.push(await page.evaluate((id) => ({ id, pages: R.pageCount, len: (R.book && R.book.text || '').length, words: /книга|текст|чтение|страница/.test(document.getElementById('viewer').textContent) }), b.id));
  await page.evaluate(() => { revealChrome && revealChrome(); document.getElementById('btnBack').click(); }); await sleep(900);
  await page.evaluate(() => { const d = document.getElementById('btnDone'); if (d && d.offsetParent) d.click(); }); await sleep(200);
}
const putOpen = await page.evaluate(() => window.__putText.length);
ok('reload → every added book opens with its text (from IDB); opening/closing books writes 0 putText',
  opened.every((o, i) => o.pages > 1 && o.len === added[i].len && o.words) && putOpen === 0, { opened, putOpen });

// (4) export (app format, no text bodies) → import → reload: texts not lost, nothing re-written by save()
const exp = await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })));
await page.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, exp);
await page.reload({ waitUntil: 'load' }); await ready();
const afterImp = [];
for (const b of added) afterImp.push({ id: b.id, len: ((await idbText(b.id)) || '').length, want: b.len, onShelf: await page.evaluate((id) => S.userBooks.some(x => x.id === id), b.id) });
ok('export → import → reload: every book on the shelf, text in IDB unchanged', afterImp.every(a => a.len === a.want && a.onShelf), afterImp);
// export WITH text bodies → import into a cleared store (other device): bodies written by importBackup, one per book
const expT = await page.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: true })));
await page.evaluate(async (ids) => { for (const id of ids) await __rq.idb.delText(id); window.__putText.length = 0; }, added.map(b => b.id));
await page.evaluate(async (j) => { await __rq.importBackup(JSON.parse(j)); }, expT);
const putImp = await page.evaluate(() => window.__putText.slice());
await page.reload({ waitUntil: 'load' }); await ready();
const afterImpT = [];
for (const b of added) afterImpT.push({ id: b.id, len: ((await idbText(b.id)) || '').length, want: b.len });
ok('export with textBodies → texts deleted → import: importBackup writes each body once, texts restored', afterImpT.every(a => a.len === a.want) && putImp.length === added.length, { putText: putImp.length, afterImpT });

await Promise.race([browser.close(), sleep(8000)]);
fs.rmSync(DIR, { recursive: true, force: true });
const f = checks.filter(c => !c.p).length;
console.log(`\nSAVETEXT: ${checks.length - f}/${checks.length} passed (build ${build})`);
process.exit(f ? 1 : 0);
