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
  img64.green = await p.evaluate(PIXEL + '("rgb(20,160,60)")');
  const qOf = (u) => { const m = /[?&](?:q|gsrsearch)=([^&]*)/.exec(u); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; };
  p.on('request', r => { const u = r.url();
    /* «название автор» finds nothing anywhere → the search tries the title alone (улучшение 3) */
    if (/googleapis\.com\/books|openlibrary\.org\/search|wikipedia\.org\/w\/api/.test(u) && /Обложкин/.test(decodeURIComponent(u.replace(/\+/g, ' ')))) return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    if (u.startsWith('https://ru.wikipedia.org/w/api.php')) { const q = qOf(u); return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ query: { pages: { 7: { index: 1, title: q, thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/ru/thumb/1/1a/C.jpg/320px-C.jpg', width: 320, height: 480 } }, 8: { index: 2, title: 'Флаг', thumbnail: { source: 'https://upload.wikimedia.org/x/Flag_of_X.svg/320px-Flag_of_X.svg.png', width: 320 } } } } }) }); }
    if (u.startsWith('https://upload.wikimedia.org/')) return r.respond({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: Buffer.from(img64.green, 'base64') });
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
  await p.click('#covGrid .cov-tile[data-i="2"]'); await p.waitForFunction(() => !!el('covCrop') && el('covCropImg').naturalWidth > 0, { timeout: 10000 });
  await p.click('#covCropOk'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  ok(`${w} «Страница из PDF»: page 2 (white) becomes the cover, then «Обрезать и сдвинуть» opens, «Готово» closes`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), pdfId, colourOf), [255, 255, 255]));
  /* улучшение 1 «Обрезать и сдвинуть»: EPUB 3 cover (600×900, white text band at the top third) → zoom 2, drag the picture up */
  const e3 = await p.evaluate(() => S.userBooks.find(b => b.fname === 'Обложка EPUB3.epub').id);
  ok(`${w} crop: the card offers «Обрезать и сдвинуть» for a picture cover`, await p.evaluate((id) => { bookInfo(id); return [...el('bookSheetBody').querySelectorAll('.bk-line')].some(x => x.textContent === 'Обрезать и сдвинуть'); }, e3));
  await p.evaluate((id) => covCropOpen(id), e3); await p.waitForFunction(() => el('covCropImg') && el('covCropImg').naturalWidth > 0 && el('covCropImg').style.width, { timeout: 10000 });
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-5-obrezat.png` });
  const fr0 = await p.evaluate(() => { const z = el('covZoom'); z.value = 2; z.dispatchEvent(new Event('input')); const r = el('covCrop').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height }; });
  await p.mouse.move(fr0.x, fr0.y); await p.mouse.down(); await p.mouse.move(fr0.x + 400, fr0.y + 400, { steps: 6 }); await p.mouse.up(); /* far up-left: clamps to the top-left corner */
  await p.click('#covCropOk'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  const cr = await p.evaluate(async (id, cs) => { const hi = await idbGet('cov:' + id), src = await idbGet('covsrc:' + id); const c = S.covCrop[id];
    return { c, hi: hi ? await eval(cs)(URL.createObjectURL(hi)) : null, src: src instanceof Blob, edge: await (async () => { const im = new Image(); im.src = URL.createObjectURL(hi); await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
      return [[...x.getImageData(4, 200, 1, 1).data].slice(0, 3), [...x.getImageData(47, 200, 1, 1).data].slice(0, 3)]; })() }; }, e3, colourOf);
  ok(`${w} crop: zoom 2 + drag → window at the top-left corner, sharp copy 420×560 (3:4), the picture kept for later (covsrc)`, cr.c && Math.abs(cr.c.z - 2) < 0.01 && cr.c.x < 0.3 && cr.c.y < 0.3 && cr.hi && cr.hi[3] === 420 && cr.hi[4] === 560 && cr.src, cr);
  /* picture 600 px wide, frame line at x 30…38; window 300 px wide from x 0 → ×1.4 in the 420 px result: blue at x 4, white at x 47 */
  ok(`${w} crop: the result is exactly that window (blue edge, then the picture's white frame line at x≈47)`, near(cr.edge[0], [40, 90, 160]) && cr.edge[1][0] > 200 && cr.edge[1][2] > 200, cr.edge);
  const cr2 = await p.evaluate(async (id) => { await covCropOpen(id); await new Promise(r => setTimeout(r, 300)); const v = +el('covZoom').value; el('covCropReset').click(); const v2 = +el('covZoom').value; covClose(); return [v, v2]; }, e3);
  ok(`${w} crop: opens again with the saved zoom, «Как было» resets it`, Math.abs(cr2[0] - 2) < 0.01 && cr2[1] === 1, cr2);
  /* «Картинка из книги» on a book without pictures → hint + «Взять обложку из файла книги»: the same EPUB 3 file → its cover */
  const noId = await p.evaluate(() => S.userBooks.find(b => b.fname === 'Без обложки.epub').id);
  await p.evaluate((id) => covFromBook(id), noId); await p.waitForFunction(() => /нет картинок/.test(el('covStat').textContent), { timeout: 10000 });
  await p.evaluate(async (id, u, gf) => covFromFile(id, await eval(gf)(u, 'Обложка EPUB3.epub')), noId, CURL, getF.toString());
  await p.waitForFunction((id) => !!S.covers[id], { timeout: 15000 }, noId);
  ok(`${w} «Взять обложку из файла книги»: the cover of the picked file, the book itself untouched`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), noId, colourOf), C['Обложка EPUB3.epub']) &&
    await p.evaluate((id) => S.userBooks.find(b => b.id === id).title === 'Без обложки', noId));
  /* 10.11 (скрин Джессики): the author inside a file name is split off before searching */
  const sp = await p.evaluate(() => ['Криничная Н.А. Мифология воды и водоемов', 'Н. А. Криничная. Мифология воды', 'Достоевский - Идиот', 'Идиот (Достоевский)', 'Толстой Л.Н., Война и мир (2015)', 'Пушкин_А.С._Евгений_Онегин.pdf', 'Мастер и Маргарита'].map(x => { const m = covSplit(x); return m.t + '|' + m.a; }));
  ok(`${w} search: «Фамилия И.О. Название», «И.О. Фамилия. Название», «Автор - Название», «Название (Автор)», year / .pdf / _ dropped`, JSON.stringify(sp) === JSON.stringify(['Мифология воды и водоемов|Криничная Н.А.', 'Мифология воды|Н. А. Криничная', 'Идиот|Достоевский', 'Идиот|Достоевский', 'Война и мир|Толстой Л.Н.', 'Евгений Онегин|Пушкин А.С.', 'Мастер и Маргарита|']), sp);
  const gq = await p.evaluate(async () => { const seen = []; const f0 = window.fetch; window.fetch = (u, o) => { seen.push(decodeURIComponent(String(u))); return Promise.reject(new Error('x')); };
    try { await covSearchAll('Криничная Н.А. Мифология воды и водоемов'); } finally { window.fetch = f0; } return seen; });
  ok(`${w} search: Google Книги asked by title and author apart (intitle / inauthor), Open Library by title= & author=`, gq.some(u => /intitle:"Мифология воды и водоемов" inauthor:"Криничная"/.test(u)) && gq.some(u => /openlibrary\.org\/search\.json\?title=Мифология воды и водоемов&author=Криничная/.test(u)), gq);
  /* «Найти в интернете» */
  const fbId = await p.evaluate(() => S.userBooks.find(b => /fb2/i.test(b.fname)).id);
  await p.evaluate((id) => { bookInfo(id); covFromWeb(id); }, fbId);
  await p.waitForFunction(() => el('covGrid').querySelectorAll('.cov-tile').length === 3, { timeout: 10000 }); await sleep(400);
  const web = await p.evaluate(() => ({ q: el('covQIn').value, ya: el('covYa').href, tiles: [...el('covGrid').querySelectorAll('.cov-tile span')].map(s => s.textContent), stat: el('covStat').textContent }));
  ok(`${w} web: «название автор» found nothing → tried the title alone; Google Книги by title/author first, then Википедия (a flag dropped), Open Library (a hit without a cover dropped); Яндекс link`, web.q === 'Обложка FB2 Тест Обложкин' && web.tiles.join('|') === 'Google Книги|Википедия|Open Library' && /yandex\.ru\/images\/search\?text=/.test(web.ya), web);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-3-internet.png` });
  await p.click('#covGrid .cov-tile[data-i="1"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  ok(`${w} web: Википедия → a copy on the phone`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), fbId, colourOf), [20, 160, 60]));
  await p.evaluate((id) => covFromWeb(id), fbId); await p.waitForFunction(() => el('covGrid').querySelectorAll('.cov-tile').length === 3, { timeout: 10000 });
  await p.click('#covGrid .cov-tile[data-i="0"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
  ok(`${w} web: a site that allows copying (Google) → a copy on the phone`, near(await p.evaluate((id, cs) => eval(cs)(S.covers[id]), fbId, colourOf), [30, 60, 200]));
  await p.evaluate((id) => covFromWeb(id), fbId); await p.waitForFunction(() => el('covGrid').querySelectorAll('.cov-tile').length === 3, { timeout: 10000 });
  await p.click('#covGrid .cov-tile[data-i="2"]'); await p.waitForFunction(() => el('covSheet').classList.contains('hidden'), { timeout: 10000 });
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
  /* улучшение 4 «Подобрать обложки» (⋮ библиотеки): PDF → page 1, no picture in the text → the web hit whose title matches */
  const all = await p.evaluate(async (pdfId, e3, noId, cs) => { covDrop(pdfId); covDrop(e3); covDrop(noId); save(); show('library');
    libSortMenu(true); const btn = el('libCovAll'); const has = !!btn; btn.click();
    for (let i = 0; i < 100 && !/Готово/.test((el('covStat') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 200));
    const c = async (id) => S.covers[id] ? (S.covers[id].startsWith('data:') ? await eval(cs)(S.covers[id]) : S.covers[id]) : null;
    return { has, stat: el('covStat').textContent, pdf: await c(pdfId), e3: await c(e3), no: await c(noId) }; }, pdfId, e3, noId, colourOf);
  ok(`${w} «Подобрать обложки»: in the ⋮ menu; all found — PDF page 1, two EPUBs from the web by their title`, all.has && /Поставлено обложек: (\d) из \1\./.test(all.stat) && near(all.pdf, C['Обложка PDF.pdf']) && near(all.e3, [20, 160, 60]) && near(all.no, [20, 160, 60]), all);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-6-podobrat.png` });
  await p.evaluate(() => covClose());
  /* 10.11 «Обложки из файлов» (⋮): many pictures at once, each finds its book by the file name */
  const many = await p.evaluate(async (pdfId, noId, cs) => {
    const mk = (rgb, name) => new Promise(r => { const c = document.createElement('canvas'); c.width = 300; c.height = 450; const x = c.getContext('2d'); x.fillStyle = rgb; x.fillRect(0, 0, 300, 450); c.toBlob(b => r(new File([b], name, { type: 'image/jpeg' })), 'image/jpeg', .9); });
    const files = [await mk('rgb(240,200,0)', 'Обложка PDF.jpg'), await mk('rgb(120,0,160)', 'Тест Обложкин - Без обложки.png'), await mk('rgb(0,0,0)', 'IMG_2041.jpg')];
    show('library'); libSortMenu(true); const has = !!el('libCovMany'); libSortMenu(false);
    covMany(files); await new Promise(r => setTimeout(r, 300));
    const sel = [...el('covManyList').querySelectorAll('select')].map(x => ({ f: files[+x.dataset.i].name, v: x.value }));
    const btn = el('covManyOk').textContent;
    /* the reader moves the unmatched picture onto the PDF → the PDF's old pick is cleared (one picture per book) */
    const s3 = [...el('covManyList').querySelectorAll('select')].find(x => files[+x.dataset.i].name === 'IMG_2041.jpg'); s3.value = pdfId; s3.dispatchEvent(new Event('change', { bubbles: true }));
    const after = [...el('covManyList').querySelectorAll('select')].map(x => ({ f: files[+x.dataset.i].name, v: x.value }));
    el('covManyOk').click();
    for (let i = 0; i < 50 && !el('covSheet').classList.contains('hidden'); i++) await new Promise(r => setTimeout(r, 100));
    return { has, sel, btn, after, pdf: await eval(cs)(S.covers[pdfId]), no: await eval(cs)(S.covers[noId]) }; }, pdfId, noId, colourOf);
  const sv = (arr, f) => (arr.find(x => x.f === f) || {}).v;
  ok(`${w} «Обложки из файлов»: in the ⋮ menu; «Обложка PDF.jpg» → the PDF, «Автор - Название.png» → its book, «IMG_2041.jpg» → none; button «Поставить (2)»`,
    many.has && sv(many.sel, 'Обложка PDF.jpg') === pdfId && sv(many.sel, 'Тест Обложкин - Без обложки.png') === noId && sv(many.sel, 'IMG_2041.jpg') === '' && many.btn === 'Поставить (2)', many);
  ok(`${w} «Обложки из файлов»: a book picked twice keeps only the last picture; one tap sets them all`, sv(many.after, 'Обложка PDF.jpg') === '' && sv(many.after, 'IMG_2041.jpg') === pdfId && near(many.pdf, [0, 0, 0]) && near(many.no, [120, 0, 160]), many);
  if (SHOTS) { await p.evaluate(async () => { const fs = []; for (const [n, c] of [['Обложка EPUB3.jpg', '#36c'], ['Обложка FB2.png', '#3a6'], ['photo_123.jpg', '#c63']]) fs.push(await new Promise(r => { const cv = document.createElement('canvas'); cv.width = 60; cv.height = 90; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 60, 90); cv.toBlob(b => r(new File([b], n, { type: 'image/jpeg' })), 'image/jpeg'); }));
    covMany(fs); await new Promise(r => setTimeout(r, 300)); }); await p.screenshot({ path: `${SHOTS}/${w}-7-iz-faylov.png` }); await p.evaluate(() => covClose()); }
  /* улучшение 2: the skin's frame over a picture cover */
  const fr = await p.evaluate(async () => { const out = {}; show('library');
    S.gold = 99999;
    for (const t of ['sepia', 'ellada', 'celestial', 'alisa', 'babochkovyi', 'pencil']) {
      if (t === 'sepia') { SET.skin = null; SET.color = null; SET.theme = 'sepia'; saveSet(); applySet(); } else { const id = SHOP_CATALOG.find(x => x.type === 'skin' && x.id.indexOf(t) >= 0).id; buy(id); wear(id); }
      renderLibrary(); await new Promise(r => setTimeout(r, 200));
      const c = document.querySelector('#shelf .cover:has(>img[data-cv])'); const a = c && getComputedStyle(c, '::after');
      out[t] = { skin: document.documentElement.dataset.skin || '', sh: a ? a.boxShadow.slice(0, 60) : null, bg: a ? a.backgroundImage.slice(0, 30) : null }; }
    SET.skin = null; SET.color = null; SET.theme = 'sepia'; saveSet(); applySet(); return out; });
  ok(`${w} frames: every skin draws its own frame over a picture cover (meander, gold, card, …)`, Object.values(fr).every(x => x.sh && x.sh !== 'none') && /url/.test(fr.ellada.bg) && new Set(Object.values(fr).map(x => x.sh)).size >= 5, fr);
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
