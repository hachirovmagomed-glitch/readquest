// Добавление книг (Джессика 15.10): 1) несколько файлов за раз; 2) «Выбрать папку» (Android); 3) «Поделиться → ReadQuest» (share target).
// One import path for all three: files are added one by one, a file already on the shelf (same name + size) is skipped,
// a broken file does not stop the rest, the batch result is one toast (arch.md «1в: импорт пачкой»), no alert(). Share: the SW keeps the POSTed files in the cache `<ns>_share`
// until the app picks them up on `?share=1`, then the cache is emptied and the URL cleaned.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node import-many.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const dir = mkdtempSync(join(tmpdir(), 'rq-imp-'));
const txt = (t) => ('Глава первая. ' + t + ' ').repeat(20);
const fb2 = (t, a) => `<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><author><first-name>${a}</first-name><last-name>Тестов</last-name></author><book-title>${t}</book-title><lang>ru</lang></title-info></description><body><section><title><p>Глава 1</p></title><p>${txt(t)}</p></section></body></FictionBook>`;
const F = {};
const put = (name, body) => { const p = join(dir, name); writeFileSync(p, body); F[name] = p; return p; };
put('Альфа.txt', txt('Альфа')); put('Бета.txt', txt('Бета')); put('Гамма.fb2', fb2('Гамма', 'Иван'));
put('Битая.epub', 'это не zip'); put('Заметки.docx', 'не книга');
/* bug 16.10 (Джессика): an .mp3 picked through «Все файлы» landed on the shelf as a text book; binary bytes under .txt likewise */
const mp3 = Buffer.concat([Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'binary'), Buffer.from(Array.from({ length: 6000 }, (_, i) => (i * 37 + 11) % 256))]);
put('Skillet_-_The_Resistance.mp3', mp3); put('Песня.txt', mp3);
const cp1251 = (t) => Buffer.from([...t].map(ch => { const c = ch.charCodeAt(0); return c >= 0x410 && c <= 0x44F ? c - 0x410 + 0xC0 : c === 0x401 ? 0xA8 : c === 0x451 ? 0xB8 : c; }));
put('Старая.txt', cp1251(txt('Старая книга про лес и реку')));
mkdirSync(join(dir, 'Книги'), { recursive: true });
put('Книги/Дельта.txt', txt('Дельта')); put('Книги/Эпсилон.txt', txt('Эпсилон')); put('Книги/Заметки.docx', 'не книга'); put('Книги/Альфа.txt', txt('Альфа'));

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
const alerts = []; p.on('dialog', d => { alerts.push(d.message()); d.accept(); });
const boot = async (url) => { await p.goto(url || BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300); };
await boot();
const books = () => p.evaluate(() => S.userBooks.map(b => ({ id: b.id, t: b.title, f: b.fname })));
const idle = () => p.waitForFunction(() => !document.getElementById('btnAdd').hasAttribute('aria-busy'), { timeout: 20000 }).then(() => sleep(300));
const toast = () => p.evaluate(() => { const t = document.querySelector('.rq-toast'); const s = t && t.textContent; if (t) t.remove(); return s || null; });

// --- manifest: share target for both builds
for (const m of [BASE + 'manifest.webmanifest', BASE.replace(/test\/$/, '') + 'manifest.webmanifest']) {
  const j = await p.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? r.json() : null; }, m);
  const st = j && j.share_target;
  const fl = st && st.params && st.params.files && st.params.files[0];
  ok(`manifest ${m.includes('/test/') ? 'test' : 'main'}: share_target POST multipart, files accept pdf/epub/fb2/txt`,
    !!st && st.method === 'POST' && st.enctype === 'multipart/form-data' && /share-target$/.test(st.action) && !!fl &&
    ['.pdf', '.epub', '.fb2', '.txt'].every(x => fl.accept.includes(x)), st);
}

// --- 1. several files at once
const inp = await p.$('#fileInp');
ok('file input allows several files', await p.evaluate(() => document.getElementById('fileInp').multiple));
const before = (await books()).length;
await inp.uploadFile(F['Альфа.txt'], F['Бета.txt'], F['Гамма.fb2'], F['Битая.epub']); await idle();
let bs = await books();
const added = bs.slice(before);
ok('three good files added in one go', added.length === 3 && ['Альфа', 'Бета', 'Гамма'].every(t => added.some(b => b.t === t)), added);
ok('every new book has its own id', new Set(bs.map(b => b.id)).size === bs.length, bs.map(b => b.id));
ok('texts stored once in IDB for each new book', await p.evaluate(async (ids) => { const r = []; for (const id of ids) r.push(typeof (await window.__rq.idb.getText(id)) === 'string'); return r.every(Boolean); }, added.map(b => b.id)));
let ts = await toast();
ok('batch: no alert, one toast «3 из 4» naming the broken file', !alerts.length && /3 из 4/.test(ts || '') && /Битая\.epub/.test(ts || ''), { alerts, ts });
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.evaluate(() => importToast('Добавлено книг: 3 из 4. Уже были в библиотеке: 2. Не открылись: Очень-длинное-название-книги-номер-один.epub, Битая.epub и ещё 3.', true)); await sleep(100);
const tw = await p.evaluate(() => { const r = document.querySelector('.rq-toast').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
ok('360px: a long toast wraps inside the screen', tw.l >= 0 && tw.r <= tw.w, tw);
await p.screenshot({ path: SHOTS + 'import-toast-360.png' }); await toast();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await inp.uploadFile(F['Альфа.txt'], F['Бета.txt']); await idle();
ok('same files again: skipped, shelf unchanged', (await books()).length === bs.length, (await books()).length);
ts = await toast();
ok('toast says they are already on the shelf', !alerts.length && /Уже были в библиотеке: 2/.test(ts || ''), { alerts, ts });

// --- 1b. not a book (bug 16.10): a single .mp3, and audio bytes renamed to .txt
{ const n = (await books()).length;
  await inp.uploadFile(F['Skillet_-_The_Resistance.mp3']); await idle(); const t1 = await toast(); const a1 = alerts.splice(0);
  ok('single .mp3: no book on the shelf, a toast says it is not a book', (await books()).length === n && /не поддерживается/.test(t1 || '') && !a1.length, { t1, a1 });
  await inp.uploadFile(F['Песня.txt']); await idle(); const a2 = alerts.splice(0), t2 = await toast(); /* audit 19.10: a toast with the file name, no alert() */
  ok('audio bytes named .txt: no book, the toast says it is not text', (await books()).length === n && !a2.length && /Песня\.txt/.test(t2 || '') && /не текст/.test(t2 || ''), { a2, t2 });
  await inp.uploadFile(F['Skillet_-_The_Resistance.mp3'], F['Песня.txt'], F['Альфа.txt']); await idle(); const t3 = await toast(); alerts.splice(0);
  ok('batch with music: only real books count, music never lands', (await books()).length === n && !(await books()).some(b => /Skillet|Песня/.test(b.t)), t3); }
  await inp.uploadFile(F['Старая.txt']); await idle(); alerts.splice(0);
  const old = await p.evaluate(() => { const b = S.userBooks.find(x => x.fname === 'Старая.txt'); return b && b.text.slice(0, 40); });
  ok('old Russian .txt in cp1251 is still a book, read correctly', !!old && /Глава первая\. Старая книга/.test(old), old);

// --- 2. folder
await p.evaluate(() => show('library')); await sleep(200);
await p.click('#btnAdd'); await sleep(250);
const menu = await p.evaluate(() => { const m = document.getElementById('addMenu'); return m && !m.hidden ? [...m.querySelectorAll('[data-k]')].map(b => ({ k: b.dataset.k, t: b.textContent.trim(), h: b.getBoundingClientRect().height })) : null; });
ok('«+» opens a menu: files and folder', !!menu && menu.some(x => x.k === 'files') && menu.some(x => x.k === 'folder'), menu);
ok('menu rows are at least 44px tall', !!menu && menu.every(x => x.h >= 44), menu);
await p.screenshot({ path: SHOTS + 'add-menu-390.png' });
const dirAttr = await p.evaluate(() => { const d = document.getElementById('dirInp'); return d && { wd: d.hasAttribute('webkitdirectory'), multi: d.multiple }; });
ok('folder input has webkitdirectory + multiple', !!dirAttr && dirAttr.wd && dirAttr.multi, dirAttr);
await p.keyboard.press('Escape'); await sleep(150);
ok('Escape closes the menu', await p.evaluate(() => document.getElementById('addMenu').hidden));
const n2 = (await books()).length;
const dinp = await p.$('#dirInp');
await dinp.uploadFile(join(dir, 'Книги')); await idle(); /* webkitdirectory: Chrome takes the folder itself */
bs = await books();
ok('folder: two new books, .docx ignored, Альфа skipped as already there', bs.length === n2 + 2 && bs.some(b => b.t === 'Дельта') && bs.some(b => b.t === 'Эпсилон'), bs.slice(n2));
ts = await toast();
ok('folder: one toast «2 из 3», no alert', !alerts.length && /2 из 3/.test(ts || '') && /Уже были в библиотеке: 1/.test(ts || ''), { alerts, ts });
await p.evaluate(() => importBookFiles([new File(['x'], 'Заметки.docx')])); ts = await toast();
ok('only non-books picked: toast, nothing added', /не поддерживается/.test(ts || '') && (await books()).length === bs.length, ts);

// 360px: menu fits the screen
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(200);
await p.click('#btnAdd'); await sleep(250);
const fit = await p.evaluate(() => { const r = document.getElementById('addMenu').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
ok('360px: menu stays inside the screen', fit.l >= 0 && fit.r <= fit.w, fit);
await p.screenshot({ path: SHOTS + 'add-menu-360.png' });
await p.keyboard.press('Escape');
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

// --- 3. share target through the real service worker
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 20000 }).catch(() => {});
ok('service worker controls the page', await p.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)));
const n3 = (await books()).length;
const shareRes = await p.evaluate(async (a, b) => {
  const fd = new FormData();
  fd.append('books', new File([a], 'Зета.txt', { type: 'text/plain' }));
  fd.append('books', new File([b], 'Эта.fb2', { type: 'application/octet-stream' }));
  fd.append('books', new File([a.replace(/Зета/g, 'Тета')], 'Тета', { type: 'text/plain' })); /* no extension: the type decides */
  const r = await fetch('./share-target', { method: 'POST', body: fd });
  const keys = await caches.keys(); const sk = keys.filter(k => /_share$/.test(k));
  let n = 0; for (const k of sk) n += (await (await caches.open(k)).keys()).length;
  return { url: r.url, redirected: r.redirected, keys: sk, n };
}, txt('Зета'), fb2('Эта', 'Пётр'));
ok('POST share-target → redirect to ?share=1, files kept in <ns>_share cache', /\?share=1$/.test(shareRes.url) && shareRes.n === 3, shareRes);
await boot(BASE + '?share=1'); await idle();
await p.waitForFunction((n) => S.userBooks.length >= n + 3, { timeout: 15000 }, n3).catch(() => {});
bs = await books();
ok('shared files land on the shelf, a file without extension too', bs.length === n3 + 3 && ['Зета', 'Эта', 'Тета'].every(t => bs.some(b => b.t === t)), bs.slice(n3));
const after = await p.evaluate(async () => { const keys = (await caches.keys()).filter(k => /_share$/.test(k)); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; return { n, search: location.search }; });
ok('share cache emptied and ?share=1 removed from the URL', after.n === 0 && after.search === '', after);
await boot(BASE + '?share=1'); await idle();
ok('opening ?share=1 again adds nothing', (await books()).length === bs.length);
ok('a lone ?share=1 shows no message', !alerts.length, alerts);

// --- export round trip keeps the new books (no new fields)
const ex = await p.evaluate(() => { const o = JSON.parse(JSON.stringify(S.userBooks.map(b => Object.keys(b).sort()))); return o; });
ok('book cards carry only the fields single import already wrote', ex.every(ks => ks.every(k => ['id', 'title', 'author', 'genre', 'stat', 'cover', 'type', 'pages', 'text', 'toc', 'lang', 'fname', 'size'].includes(k))), ex.flat().filter((v, i, a) => a.indexOf(v) === i));

ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY import-many ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
