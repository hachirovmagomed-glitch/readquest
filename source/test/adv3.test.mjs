// «Приключения», третья волна (Джессика 19.10 «давай все»; arch.md 19.10, источник se:, без новых полей):
//  1) прогресс по подборкам «прочитано N из M», закрытая подборка даёт награду «Подборка закрыта»;
//  2) фильтры стихи / проза / пьесы и «до часа» / «длинное» по категориям Викитеки;
//  3) поиск по цитате: длинный запрос ищется фразой, под книгой видна найденная строка;
//  4) «Похожие книги» в карточке: та же подборка и другие тексты автора;
//  5) «Скачать все» в «Хочу прочитать»: книги по одной, Гутенберг пропускается с пояснением;
//  6) Standard Ebooks: каталог, карточка, EPUB скачивается на полку.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node adv3.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const link = (t, n) => '<li><a href="/wiki/' + encodeURIComponent(t) + '" title="' + t + '">' + n + '</a></li>';
const para = (s, n) => ('<p>' + s + '</p>').repeat(n);
const ONEGIN = 'Евгений Онегин (Пушкин)/ПСС 1977 (СО)/Глава 1';
const META = {
  'Зимнее утро (Пушкин)': { cats: ['Поэзия Александра Сергеевича Пушкина', 'Стихотворения', 'PD-old-70'], len: 2721 },
  'Муму (Тургенев)': { cats: ['Повести', 'Русская проза', 'PD-old-70'], len: 99005 },
  'Ревизор (Гоголь)': { cats: ['Ревизор (Гоголь)'], len: 5414 },
  'Ревизор (Гоголь)/Действие первое': { cats: ['Русская драматургия'], len: 40000 },
  'Белые ночи (Достоевский)': { cats: ['Романы', 'Русская проза', 'PD-RusEmpire'], len: 183692 },
  'Евгений Онегин (Пушкин)': { cats: ['Списки редакций'], len: 4004 },
  [ONEGIN]: { cats: ['Поэзия Александра Сергеевича Пушкина'], len: 46916 }
};
const PAGES = {
  'Автор:Александр Сергеевич Пушкин': { cats: [{ category: 'Родившиеся_в_1799_году' }], html: '<ul>' + link('Бесы (Пушкин)', 'Бесы') + link('Зимнее утро (Пушкин)', 'Зимнее утро') + link('Узник (Пушкин)', 'Узник') + '</ul>' },
  'Зимнее утро (Пушкин)': { cats: [], html: para('Мороз и солнце; день чудесный!', 20) },
  'Муму (Тургенев)': { cats: [], html: para('В одной из отдалённых улиц Москвы, в сером доме с белыми колоннами.', 30) },
  'Белые ночи (Достоевский)': { cats: [], html: para('Была чудная ночь, такая ночь, которая разве только и может быть тогда, когда мы молоды.', 30) }
};
// Standard Ebooks: the markup of its list and book pages as checked 19.10
const SE_LIST = (items, next) => '<html><body><main class="ebooks"><ol class="ebooks-list list">' + items.map(x => '<li typeof="schema:Book" about="/ebooks/' + x[0] + '"><div class="thumbnail-container"><a href="/ebooks/' + x[0] + '"><picture><img src="/images/covers/' + x[0].replace('/', '_') + '/cover@2x.jpg" alt=""/></picture></a></div>' +
  '<p><a href="/ebooks/' + x[0] + '" property="schema:url"><span property="schema:name">' + x[1] + '</span></a></p><div><p class="author"><a href="/ebooks/' + x[0].split('/')[0] + '">' + x[2] + '</a></p></div><div class="details"><p>' + x[3] + ' words • 70 reading ease</p></div></li>').join('') +
  '</ol>' + (next ? '<nav class="pagination"><a href="' + next + '" rel="next">Next</a></nav>' : '') + '</main></body></html>';
const SE_BOOK = '<html><head><meta property="schema:inLanguage" content="en-GB"/></head><body><main><article class="ebook"><header><hgroup><h1 property="schema:name">Pride and Prejudice</h1><p><a property="schema:author" href="/ebooks/jane-austen"><span property="schema:name">Jane Austen</span></a></p></hgroup></header>' +
  '<aside id="reading-ease"><meta property="schema:wordCount" content="121970"/><p>121,970 words</p></aside><section id="description"><div property="schema:description"><p>A Regency-era novel of manners.</p></div></section>' +
  '<section id="download"><ul><li><a property="schema:contentUrl" href="/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub">Compatible epub</a></li><li><a property="schema:contentUrl" href="/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice_advanced.epub">Advanced epub</a></li><li><a property="schema:contentUrl" href="/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.kepub.epub">Kobo</a></li></ul></section></article></main></body></html>';
// a stored (uncompressed) ZIP: enough for an EPUB the app unpacks with JSZip
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zip(files) {
  const parts = [], cen = []; let off = 0;
  for (const [name, text] of files) { const n = Buffer.from(name), d = Buffer.from(text), c = crc32(d);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(c, 14); h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(n.length, 26);
    parts.push(h, n, d);
    const e = Buffer.alloc(46); e.writeUInt32LE(0x02014b50, 0); e.writeUInt16LE(20, 4); e.writeUInt16LE(20, 6); e.writeUInt32LE(c, 16); e.writeUInt32LE(d.length, 20); e.writeUInt32LE(d.length, 24); e.writeUInt16LE(n.length, 28); e.writeUInt32LE(off, 42);
    cen.push(e, n); off += 30 + n.length + d.length; }
  const cd = Buffer.concat(cen), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}
const ch = (t, p) => '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + t + '</title></head><body><h2>' + t + '</h2>' + ('<p>' + p + '</p>').repeat(20) + '</body></html>';
const EPUB = zip([['mimetype', 'application/epub+zip'], ['META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="epub/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'],
  ['epub/content.opf', '<?xml version="1.0"?><package><metadata><dc:title>Pride and Prejudice</dc:title><dc:creator>Jane Austen</dc:creator></metadata><manifest><item id="c1" href="text/chapter-1.xhtml"/><item id="c2" href="text/chapter-2.xhtml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'],
  ['epub/text/chapter-1.xhtml', ch('Chapter I', 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.')],
  ['epub/text/chapter-2.xhtml', ch('Chapter II', 'Mr. Bennet was among the earliest of those who waited on Mr. Bingley.')]]);
const JSZIP = (() => { try { return fs.readFileSync(new URL('./node_modules/jszip/dist/jszip.min.js', import.meta.url)); } catch (e) { return null; } })(); /* cdnjs is closed in the cloud box; CI loads it from cdnjs */
const hits = { ws: [], se: [], epub: 0 };
const CORS = { 'Access-Control-Allow-Origin': '*' };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
const warns = []; p.on('console', m => { if (/\[rq\] adv/.test(m.text())) warns.push(m.text().slice(0, 300)); });
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'ru.wikisource.org') {
    const q = u.searchParams; hits.ws.push(q.get('action') + ':' + (q.get('page') || q.get('titles') || q.get('srsearch')));
    let body;
    if (q.get('list') === 'search' && q.get('srnamespace') === '102') body = { query: { search: [] } };
    else if (q.get('list') === 'search') { const sq = q.get('srsearch');
      body = { query: { search: /^"Мой дядя/.test(sq) ? [{ title: ONEGIN, snippet: '«<span class="searchmatch">Мой</span> <span class="searchmatch">дядя</span> <span class="searchmatch">самых</span> честных правил, Когда не в шутку занемог' }]
        : /Мой дядя/.test(sq) ? [{ title: 'Мой дядя (Случевский)', snippet: 'x' }]
        : [{ title: 'Зимнее утро (Пушкин)' }, { title: 'Муму (Тургенев)' }, { title: 'Ревизор (Гоголь)/Действие первое' }, { title: 'Белые ночи (Достоевский)' }] } }; }
    else if (q.get('action') === 'query' && q.get('prop') === 'categories|info') body = { query: { pages: q.get('titles').split('|').map(t => META[t] ? { title: t, length: META[t].len, categories: META[t].cats.map(c => ({ ns: 14, title: 'Категория:' + c })) } : { title: t, missing: true }) } };
    else if (q.get('action') === 'query') { const t = q.get('titles'), m = META[t]; body = { query: { pages: [{ title: t, length: m ? m.len : 5000, categories: (m ? m.cats : ['PD-old-70']).map(c => ({ ns: 14, title: 'Категория:' + c })) }] } }; }
    else if (q.get('action') === 'parse') { const t = q.get('page'); body = PAGES[t] ? { parse: { title: t, text: PAGES[t].html, categories: PAGES[t].cats } } : { error: { code: 'missingtitle' } }; }
    r.respond({ status: 200, contentType: 'application/json; charset=utf-8', headers: CORS, body: JSON.stringify(body || {}) });
  } else if (u.host === 'standardebooks.org') {
    hits.se.push(u.pathname + u.search);
    if (u.pathname === '/ebooks' && u.searchParams.get('page') === '2') r.respond({ status: 200, contentType: 'application/xhtml+xml; charset=utf-8', headers: CORS, body: SE_LIST([['mark-twain/the-adventures-of-tom-sawyer', 'The Adventures of Tom Sawyer', 'Mark Twain', '70,000']]) });
    else if (u.pathname === '/ebooks') r.respond({ status: 200, contentType: 'application/xhtml+xml; charset=utf-8', headers: CORS, body: SE_LIST([['jane-austen/pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', '121,970'], ['leo-tolstoy/war-and-peace/louise-maude_aylmer-maude', 'War and Peace', 'Leo Tolstoy', '566,000']], '/ebooks?page=2&view=list') });
    else if (u.pathname === '/ebooks/jane-austen/pride-and-prejudice') r.respond({ status: 200, contentType: 'application/xhtml+xml; charset=utf-8', headers: CORS, body: SE_BOOK });
    else if (/\/downloads\/jane-austen_pride-and-prejudice\.epub$/.test(u.pathname) && u.searchParams.get('source') === 'download') { hits.epub++; r.respond({ status: 200, contentType: 'application/epub+zip', headers: CORS, body: EPUB }); }
    else r.respond({ status: 404, headers: CORS, body: '' });
  } else if (u.host === 'www.gutenberg.org') r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: '<feed xmlns="http://www.w3.org/2005/Atom"></feed>' });
  else if (u.host === 'cdnjs.cloudflare.com' && /jszip/.test(u.pathname) && JSZIP) r.respond({ status: 200, contentType: 'application/javascript', body: JSZIP });
  else if (u.host === 'archive.org') r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ response: { numFound: 0, docs: [] } }) }); /* Internet Archive: nothing, so «Везде» shows only the mocked libraries */
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const waitInf = 'for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));';

// 1. collection progress
const pr = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const set = ADV_SETS.find(x => x.id === 'antiq'), fake = set.pages.map((pg, i) => ({ id: 'advfake' + i, title: 't' + i, author: 'a', text: '', srcId: advWsItem(pg).sid, fname: 'x.txt' }));
  S.userBooks = (S.userBooks || []).concat(fake); S.finished = (S.finished || []).concat(fake.slice(0, 3).map(b => b.id)); advRenderList();
  const card = () => document.querySelector('#advList .advset[data-set="antiq"]');
  const r = { line: card().querySelector('span').textContent, bar: !!card().querySelector('.advbar i'), m: set.pages.length };
  card().click(); await new Promise(r => setTimeout(r, 200));
  r.head = document.querySelector('#advList .advsetprog').textContent; r.read = Array.from(document.querySelectorAll('#advList > .advrow .advown')).map(x => x.textContent.trim());
  S.finished = S.finished.concat(fake.slice(3).map(b => b.id)); el('advBack').click(); await new Promise(r => setTimeout(r, 100));
  r.all = card().querySelector('span').textContent; r.done = advSetsDone(); r.inp = achInput().libSets; r.ach = !!(RQAch.evaluate(achInput()).libset1 || {}).done;
  S.userBooks = S.userBooks.filter(b => !/^advfake/.test(b.id)); S.finished = S.finished.filter(id => !/^advfake/.test(id)); advRenderList(); return r; });
ok('1a подборка: «Прочитано 3 из 10» и полоска на карточке и в заголовке; у дочитанных строка «Прочитано»', pr.line === 'Прочитано 3 из ' + pr.m && pr.bar && pr.head === pr.line && pr.read.filter(x => x === 'Прочитано').length === 3 && pr.read.filter(x => x === 'На полке').length === pr.m - 3, pr);
ok('1b всё дочитано: «Прочитана вся подборка», и это даёт награду «Подборка закрыта»', pr.all === 'Прочитана вся подборка' && pr.done === 1 && pr.inp === 1 && pr.ach, pr);

// 2. filters
const fl = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="wikisource"]').click(); await new Promise(r => setTimeout(r, 100));
  el('advQ').value = 'классика'; ADV.q = 'классика'; await advSearch();
  const rows = () => Array.from(document.querySelectorAll('#advList > .advrow b')).map(x => x.textContent);
  const click = async (sel) => { document.querySelector('#advFlt ' + sel).click(); await new Promise(r => setTimeout(r, 50)); return rows(); };
  const r = { chips: Array.from(document.querySelectorAll('#advFlt .fchip')).map(x => x.textContent), all: rows(), kinds: ADV.items.map(x => x.kind + '/' + (x.size || '')) };
  r.poem = await click('[data-fk="poem"]'); r.prose = await click('[data-fk="prose"]'); r.proseShort = await click('[data-fl="short"]'); r.proseLong = await click('[data-fl="long"]');
  r.drama = await click('[data-fk="drama"]'); await click('[data-fl="long"]'); r.dramaAny = rows(); r.back = await click('[data-fk=""]'); return r; });
ok('2a фильтры по категориям Викитеки: стихи, проза, пьесы (пьеса узнана по главе), «до часа» и «длинное» (оглавление = длинная книга)', JSON.stringify(fl.chips) === JSON.stringify(['Всё', 'Стихи', 'Проза', 'Пьесы', 'До часа', 'Длинное']) && fl.all.length === 4 &&
  JSON.stringify(fl.poem) === '["Зимнее утро"]' && JSON.stringify(fl.prose) === '["Муму","Белые ночи"]' && JSON.stringify(fl.proseShort) === '["Муму"]' && JSON.stringify(fl.proseLong) === '["Белые ночи"]' &&
  JSON.stringify(fl.drama) === '["Ревизор"]' && JSON.stringify(fl.dramaAny) === '["Ревизор"]' && fl.back.length === 4, fl);

// 3. quote
const ws0 = hits.ws.length;
const qt = await p.evaluate(async () => { el('advQ').value = 'Мой дядя самых честных правил'; ADV.q = 'Мой дядя самых честных правил'; await advSearch();
  const row = document.querySelector('#advList > .advrow'); return { t: row && row.querySelector('b').textContent, snip: row && row.querySelector('.advsnip') ? row.querySelector('.advsnip').innerHTML : '' }; });
const asked = hits.ws.slice(ws0).filter(x => /^query:/.test(x));
ok('3 поиск по цитате: запрос от 4 слов ищется фразой, под книгой строка, где нашлось, совпадение выделено', qt.t === 'Евгений Онегин' && /^«…<em>Мой<\/em> <em>дядя<\/em> <em>самых<\/em> честных правил, Когда не в шутку занемог…»$/.test(qt.snip) && asked.some(x => x === 'query:"Мой дядя самых честных правил"'), { qt, asked });

// 4. similar books
const sm = await p.evaluate(async () => { advOpen(advWsItem('Одиссея (Гомер)')); for (let i = 0; i < 40 && !(advCur && advCur.sim); i++) await new Promise(r => setTimeout(r, 100));
  const set = ADV_SETS.find(x => x.id === 'antiq').pages, i = set.indexOf('Одиссея (Гомер)'), want = [1, 2, 3].map(j => advWsItem(set[(i + j) % set.length]).t);
  const got = Array.from(document.querySelectorAll('#bookSheetBody .advsim .advrow b')).map(x => x.textContent);
  advOpen(advWsItem('Зимнее утро (Пушкин)')); for (let k = 0; k < 40 && !(advCur && advCur.sim); k++) await new Promise(r => setTimeout(r, 100));
  const pu = Array.from(document.querySelectorAll('#bookSheetBody .advsim .advrow b')).map(x => x.textContent), h = (document.querySelector('#bookSheetBody .advsim') || {}).previousElementSibling;
  document.querySelector('#bookSheetBody .advsim .advrow:last-child').click(); await new Promise(r => setTimeout(r, 300));
  const opened = document.querySelector('#bookSheetBody .bk-ttl b').textContent; el('bookSheet').classList.add('hidden'); return { want, got, pu, head: h && h.textContent, opened }; });
ok('4 «Похожие книги»: следующие книги той же подборки; у Пушкина его другие тексты без этой же книги; нажатие открывает карточку', JSON.stringify(sm.got) === JSON.stringify(sm.want) && sm.head === 'Похожие книги' &&
  sm.pu.includes('Бесы') && sm.pu.includes('Узник') && !sm.pu.includes('Зимнее утро') && sm.opened === sm.pu[sm.pu.length - 1], sm);

// 5. download the whole list
const wa = await p.evaluate(async () => { S.advWant = [advWsItem('Муму (Тургенев)'), advWsItem('Белые ночи (Достоевский)'), { sid: 'gutenberg:1342', n: '1342', t: 'Pride and Prejudice', a: 'Jane Austen' }]; save();
  navGo('adv'); advSet('want'); await new Promise(r => setTimeout(r, 100));
  const btn = el('advWantDl'), r = { btn: btn && btn.textContent.trim(), note: /Гутенберга скачиваются по одной/.test(el('advList').textContent) }, n0 = S.userBooks.length;
  btn.click(); for (let i = 0; i < 80 && ADV.dl !== false; i++) await new Promise(r => setTimeout(r, 100)); for (let i = 0; i < 50 && ADV.dl; i++) await new Promise(r => setTimeout(r, 100));
  r.added = S.userBooks.length - n0; r.srcs = S.userBooks.slice(-2).map(b => b.srcId); r.left = S.advWant.map(x => x.sid); r.btn2 = !!el('advWantDl'); r.reader = !el('reader').classList.contains('hidden'); return r; });
ok('5 «Скачать все (2)»: обе книги Викитеки на полке, в списке остался только Гутенберг, читалка не открывается', wa.btn === 'Скачать все (2)' && wa.note && wa.added === 2 && JSON.stringify(wa.srcs) === JSON.stringify(['wikisource:Муму (Тургенев)', 'wikisource:Белые ночи (Достоевский)']) &&
  JSON.stringify(wa.left) === '["gutenberg:1342"]' && !wa.btn2 && !wa.reader, wa);

// 6. Standard Ebooks
const se = await p.evaluate(async () => { navGo('adv'); document.querySelector('#advSrc .fchip[data-src="se"]').click(); for (let i = 0; i < 30 && (ADV.busy || !ADV.items.length); i++) await new Promise(r => setTimeout(r, 100));
  const rows = Array.from(document.querySelectorAll('#advList > .advrow')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent);
  const r = { rows, sid: ADV.items[1] && ADV.items[1].sid, cover: ADV.items[0] && ADV.items[0].cover, more: !!el('advMore'), ph: el('advQ').placeholder };
  el('advMore').click(); for (let i = 0; i < 30 && ADV.items.length < 3; i++) await new Promise(r => setTimeout(r, 100)); r.n = ADV.items.length;
  advOpen(ADV.items[0]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const b = el('bookSheetBody'); r.cta = (el('advGet') || {}).textContent; r.txt = b.textContent; r.ru = !!Array.from(b.querySelectorAll('button')).find(x => /Этот автор по-русски/.test(x.textContent));
  const n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 300));
  const bk = S.userBooks.find(x => x.srcId === 'se:jane-austen/pride-and-prejudice'); r.added = S.userBooks.length - n0;
  r.book = bk && { t: bk.title, a: bk.author, lang: bk.lang, genre: bk.genre, toc: (bk.toc || []).map(x => x.t) }; r.text = bk ? ((await __rq.idb.get('text:' + bk.id).catch(() => '')) || '').slice(0, 60) : '';
  r.reader = !el('reader').classList.contains('hidden'); if (r.reader) await closeReader({ quiet: true }); return r; });
ok('6a Standard Ebooks: популярное сразу списком, автор, обложка, «Показать ещё» листает каталог', JSON.stringify(se.rows) === JSON.stringify(['Pride and Prejudice|Jane Austen', 'War and Peace|Leo Tolstoy']) && se.sid === 'se:leo-tolstoy/war-and-peace/louise-maude_aylmer-maude' &&
  /^https:\/\/standardebooks\.org\/images\/covers\/jane-austen_pride-and-prejudice\/cover@2x\.jpg$/.test(se.cover) && se.more && se.n === 3 && hits.se.some(x => /sort=popularity/.test(x)), { ...se, txt: undefined, hits: hits.se.slice(0, 4) });
ok('6b карточка: описание, «около 8 часов чтения», язык английский, кнопка скачать', /A Regency-era novel of manners\./.test(se.txt) && /Объёмоколо 8 часов чтения/.test(se.txt) && /Языканглийский/.test(se.txt) && /Скачать на телефон и читать/.test(se.cta), se.txt.slice(0, 400));
ok('6c скачан обычный EPUB (не «advanced», не Kobo): книга на полке, главы в оглавлении, язык en, открыта читалка', hits.epub === 1 && se.added === 1 && se.book && se.book.t === 'Pride and Prejudice' && se.book.a === 'Jane Austen' && se.book.lang === 'en' && se.book.genre === 'Standard Ebooks' &&
  JSON.stringify(se.book.toc) === '["Chapter I","Chapter II"]' && se.reader, { book: se.book, epub: hits.epub, text: se.text, added: se.added, warns });

ok('нет ошибок страницы и окон', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
const n = checks.filter(Boolean).length; console.log('SUMMARY adv3.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
