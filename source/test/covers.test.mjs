// 10.11 обложки своих книг (js/covers.js; Джессика: «чтобы можно было подгрузить обложки книг, которые ты сам загружаешь»).
// A new EPUB 3 / EPUB 2 / FB2 / PDF gets its own cover on import (small copy in S.covers, sharp one in IDB «cov:<id>»), a book without one
// keeps the drawn cover; the ⓘ card: «Страница из PDF», «Картинка из книги» (same file again), «Найти в интернете» (Open Library +
// Google Книги, mocked here; a site without CORS → the https address), «Вернуть стандартную»; the one-time start-up pass for old books.
// Fixtures: RQ_COV_OUT=/workspace/rqtest/covers/ python3 fixtures/gen-covers.py
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_COV_URL=/rqcov/ node covers.test.mjs   (RQ_SHOTS=dir → screenshots)
// RQ_COV_URL = where the same server serves the fixtures (e.g. a symlink rqcov → /workspace/rqtest/covers next to readquest);
// the files go through the same importBookFiles as the «+» button (the input's change handler is that one line).
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const CURL = process.env.RQ_COV_URL || '/rqcov/', SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
/* a 300×450 JPEG of one colour, made by the page itself → the mocked web covers */
const PIXEL = `(async (rgb) => { const c = document.createElement('canvas'); c.width = 300; c.height = 450; const x = c.getContext('2d'); x.fillStyle = rgb; x.fillRect(0, 0, 300, 450);
  return await new Promise(r => c.toBlob(b => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(b); }, 'image/jpeg', 0.9)); })`;
const colourOf = `(async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(c.width >> 1, Math.round(c.height * 0.15), 1, 1).data; return [d[0], d[1], d[2], im.naturalWidth, im.naturalHeight]; })`;
const near = (a, b) => a && Math.abs(a[0] - b[0]) < 40 && Math.abs(a[1] - b[1]) < 40 && Math.abs(a[2] - b[2]) < 40;
for (const w of [360, 390]) {
  const ctx = await browser.createBrowserContext(), p = await ctx.newPage(); await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto(BASE + 'app.html', { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const img64 = { blue: await p.evaluate(PIXEL + '("rgb(30,60,200)")'), red: await p.evaluate(PIXEL + '("rgb(200,30,30)")') };
  await p.setRequestInterception(true);
  p.on('request', r => { const u = r.url();
    if (u.startsWith('https://www.googleapis.com/books/')) return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ items: [{ volumeInfo: { title: 'Идиот', authors: ['Ф. Достоевский'], imageLinks: { thumbnail: 'http://books.google.com/books/content?id=A1&printsec=frontcover&img=1&zoom=1&edge=curl' } } }] }) });
    if (u.startsWith('https://openlibrary.org/search.json')) return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ docs: [{ title: 'Идиот', author_name: ['Достоевский'], cover_i: 42 }, { title: 'Без обложки' }] }) });
    if (u.startsWith('https://books.google.com/')) return r.respond({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(img64.blue, 'base64') });
    if (u.startsWith('https://covers.openlibrary.org/')) return r.respond({ status: 200, contentType: 'image/jpeg', body: Buffer.from(img64.red, 'base64') }); /* no CORS */
    if (/^https?:\/\/(?!127\.0\.0\.1)/.test(u)) return r.abort();
    r.continue(); });
  const files = ['Обложка EPUB3.epub', 'Обложка EPUB2.epub', 'Обложка FB2.fb2', 'Обложка PDF.pdf', 'Без обложки.epub'];
  await p.evaluate(() => show('library'));
  const getF = (u, f) => fetch(u + encodeURIComponent(f)).then(r => r.blob()).then(b => new File([b], f));
  await p.evaluate(async (u, fs, gf) => { const g = eval(gf); importBookFiles(await Promise.all(fs.map(f => g(u, f)))); }, CURL, files, getF.toString());
  await p.waitForFunction((n) => S.userBooks.length >= n && !el('btnAdd').getAttribute('aria-busy'), { timeout: 30000 }, files.length); await sleep(600);
  const imp = await p.evaluate(async (cs) => { const out = {};
    for (const b of S.userBooks) { const cv = S.covers[b.id], hi = await idbGet('cov:' + b.id);
      out[b.fname] = { thumb: cv ? await eval(cs)(cv) : null, hi: hi instanceof Blob ? await eval(cs)(URL.createObjectURL(hi)) : null }; }
    const shelfImgs = [...document.querySelectorAll('#shelf .cover img[data-cv]')].map(i => i.src.slice(0, 5));
    return { out, shelfImgs }; }, colourOf);
  const C = { 'Обложка EPUB3.epub': [40, 90, 160], 'Обложка EPUB2.epub': [150, 40, 60], 'Обложка FB2.fb2': [30, 120, 70], 'Обложка PDF.pdf': [217, 115, 26] };
  for (const f of Object.keys(C)) ok(`${w} import ${f}: its own cover — small copy and the sharp one (≤ 420×600, own proportions)`, near(imp.out[f].thumb, C[f]) && near(imp.out[f].hi, C[f]) && imp.out[f].hi[4] <= 600 && imp.out[f].hi[4] > imp.out[f].hi[3], imp.out[f]);
  ok(`${w} import: a book without a cover keeps the drawn one`, !imp.out['Без обложки.epub'].thumb && !imp.out['Без обложки.epub'].hi, imp.out['Без обложки.epub']);
  ok(`${w} shelf: 4 picture covers, the sharp copies swapped in (blob:)`, imp.shelfImgs.length === 4 && imp.shelfImgs.every(s => s === 'blob:'), imp.shelfImgs);
  if (SHOTS) { await p.evaluate(() => { const s = el('shelf'); if (s) s.scrollIntoView(); }); await sleep(300); await p.screenshot({ path: `${SHOTS}/${w}-1-polka.png` }); }
  /* ⓘ card: rows */
  const rows = await p.evaluate(() => { const r = {}; for (const b of S.userBooks) { bookInfo(b.id); r[b.fname] = [...el('bookSheetBody').querySelectorAll('.bk-line')].map(x => x.textContent).filter(t => /картинк|интернет|PDF|стандарт/i.test(t)); } return r; });
  ok(`${w} card: PDF → «Страница из PDF», EPUB/FB2 → «Картинка из книги», all → «Найти в интернете», a set cover → «Вернуть стандартную»`,
    rows['Обложка PDF.pdf'].join('|') === 'Выбрать картинку с телефона|Страница из PDF|Найти в интернете|Вернуть стандартную' &&
    rows['Без обложки.epub'].join('|') === 'Выбрать картинку с телефона|Картинка из книги|Найти в интернете', rows);
  /* «Страница из PDF»: 4 pages, tap page 2 → white page */
  const pdfId = await p.evaluate(() => S.userBooks.find(b => b.type === 'pdf').id);
  await p.evaluate((id) => { bookInfo(id); covFromBook(id); }, pdfId);
  await p.waitForFunction(() => el('covGrid') && el('covGrid').querySelectorAll('.cov-tile').length === 4, { timeout: 20000 });
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-2-stranica-pdf.png` });
  await p.click('#covGrid .cov-tile[data-i="2"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  ok(`${w} «Страница из PDF»: page 2 (white) becomes the cover, the sheet closes`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), pdfId, colourOf), [255, 255, 255]));
  /* «Картинка из книги» on a book without pictures → hint + «Взять обложку из файла книги»: the same EPUB 3 file → its cover */
  const noId = await p.evaluate(() => S.userBooks.find(b => b.fname === 'Без обложки.epub').id);
  await p.evaluate((id) => covFromBook(id), noId); await p.waitForFunction(() => /нет картинок/.test(el('covStat').textContent), { timeout: 10000 });
  await p.evaluate(async (id, u, gf) => covFromFile(id, await eval(gf)(u, 'Обложка EPUB3.epub')), noId, CURL, getF.toString());
  await p.waitForFunction((id) => !!S.covers[id], { timeout: 15000 }, noId);
  ok(`${w} «Взять обложку из файла книги»: the cover of the picked file, the book itself untouched`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), noId, colourOf), C['Обложка EPUB3.epub']) &&
    await p.evaluate((id) => S.userBooks.find(b => b.id === id).title === 'Без обложки', noId));
  /* «Найти в интернете» */
  const fbId = await p.evaluate(() => S.userBooks.find(b => /fb2/i.test(b.fname)).id);
  await p.evaluate((id) => { bookInfo(id); covFromWeb(id); }, fbId);
  await p.waitForFunction(() => el('covGrid').querySelectorAll('.cov-tile').length === 2, { timeout: 10000 }); await sleep(400);
  const web = await p.evaluate(() => ({ q: el('covQIn').value, ya: el('covYa').href, tiles: [...el('covGrid').querySelectorAll('.cov-tile span')].map(s => s.textContent), stat: el('covStat').textContent }));
  ok(`${w} web: query = title + author, 2 results (Google Книги, Open Library; a hit without a cover dropped), Яндекс link`, web.q === 'Обложка FB2 Тест Обложкин' && web.tiles.join('|') === 'Google Книги|Open Library' && /yandex\.ru\/images\/search\?text=/.test(web.ya), web);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-3-internet.png` });
  await p.click('#covGrid .cov-tile[data-i="0"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  ok(`${w} web: a site that allows copying (Google) → a copy on the phone`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), fbId, colourOf), [30, 60, 200]));
  await p.evaluate((id) => covFromWeb(id), fbId); await p.waitForFunction(() => el('covGrid').querySelectorAll('.cov-tile').length === 2, { timeout: 10000 });
  await p.click('#covGrid .cov-tile[data-i="1"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  const net = await p.evaluate(async (id) => ({ cv: S.covers[id], hi: await idbGet('cov:' + id), img: (() => { bookInfo(id); const i = el('bookSheetBody').querySelector('.cover img.cv-net'); return i && i.src; })() }), fbId);
  ok(`${w} web: a site without CORS (Open Library here) → its https address, shown over the drawn cover, no stale sharp copy`, net.cv === 'https://covers.openlibrary.org/b/id/42-L.jpg' && !net.hi && net.img === net.cv, net);
  /* «Вернуть стандартную» + the start-up pass */
  const auto = await p.evaluate(async (pdfId, cs) => {
    resetCover(pdfId); const gone = !S.covers[pdfId] && !(await idbGet('cov:' + pdfId));
    await covAutoPass(); const kept = !S.covers[pdfId];
    /* an «old» book: no cover, never seen by the pass */
    const e3 = S.userBooks.find(b => b.fname === 'Обложка EPUB2.epub').id; covDrop(e3); delete S.covAuto[e3]; delete S.covAuto[pdfId];
    await covAutoPass();
    return { gone, kept, pdf: S.covers[pdfId] ? await eval(cs)(S.covers[pdfId]) : null, epubNoImgs: S.covers[e3] || null };
  }, pdfId, colourOf);
  ok(`${w} «Вернуть стандартную»: cover and sharp copy gone; the start-up pass does not bring it back`, auto.gone && auto.kept, auto);
  ok(`${w} start-up pass: an old PDF gets page 1; an EPUB with no pictures in its text stays drawn`, near(auto.pdf, C['Обложка PDF.pdf']) && !auto.epubNoImgs, auto);
  /* persistence: covers + covAuto survive a reload */
  await sleep(300); await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(800);
  const per = await p.evaluate(() => ({ n: Object.keys(S.covers).length, auto: Object.keys(S.covAuto || {}).length, blobs: [...document.querySelectorAll('#shelf .cover img[data-cv]')].filter(i => i.src.startsWith('blob:')).length }));
  ok(`${w} reload: covers and the pass marks kept, sharp copies read back from IDB`, per.n >= 4 && per.auto >= 5 && per.blobs >= 3, per);
  if (SHOTS) { await p.evaluate(() => show('library')); await sleep(300); await p.screenshot({ path: `${SHOTS}/${w}-4-polka-posle.png` }); }
  await ctx.close();
}
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY covers.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
