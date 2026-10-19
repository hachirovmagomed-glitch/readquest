// «Приключения» (js/adv.js, arch.md 18.10, поля lang и srcId):
//  1) экран и карточка книги ничего не пишут; пункт есть в боковом меню;
//  2) Викитека: поиск, подстраницы одной книги сводятся в одну строку; текст с отметкой о нарушении прав скачать нельзя,
//     без шаблона лицензии можно; список изданий открывается списком; 429 не обрывает скачивание;
//     скачивание собирает главы по порядку (современная орфография, без шапки), книга одна, с srcId и lang, открывается читалка;
//  3) Гутенберг: каталог OPDS по-русски по умолчанию; файл без CORS → книга не добавляется, предлагается скачать файл;
//  4) экспорт: srcId и lang в карточке;
//  5) подборки на первом экране, подсказки при вводе, другая раскладка и кириллица для Гутенберга, время чтения и начало книги в карточке.
// The libraries are served by request interception with the CORS headers they really send (checked 18.10 from GitHub Actions):
// Wikisource API and Gutenberg OPDS send Access-Control-Allow-Origin: *, Gutenberg /cache/epub/ files do not.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node adv.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ROOT = 'Одиссея (Гомер; Жуковский)', NONFREE = 'Новая повесть (Автор)', NOLIC = 'Зимнее утро (Пушкин)', LIST = 'Евгений Онегин (Пушкин)', ED = LIST + '/1837 (ВТ)';
const HEAD = '<div class="ws-noexport" style="display:none"><span id="textquality" class="75%"></span></div><div id="headertemplate"><table class="headertemplate ws-noexport"><tr><td><span id="ws-title">Одиссея</span> автор Гомер</td><td><a href="/wiki/x" title="' + ROOT + '/Песнь вторая">Песнь вторая</a></td></tr></table></div>';
const link = (t, n) => '<li><a href="/wiki/' + encodeURIComponent(t) + '" title="' + t + '">' + n + '</a></li>';
const PAGES = {
  [ROOT]: { cats: [{ category: 'PD-old-70' }, { category: 'Переводы_с_древнегреческого_языка' }],
    html: HEAD + '<p>Содержание</p><ul>' + link(ROOT + '/Песнь первая', 'Песнь первая') + link(ROOT + '/Песнь вторая', 'Песнь вторая') + link(ROOT + '/ДО', 'Дореформенная орфография') +
      '<li><a href="/wiki/z" class="new" title="' + ROOT + '/Песнь третья">Песнь третья</a></li>' + link('Гомер', 'Гомер') + '</ul>' },
  [ROOT + '/Песнь первая']: { cats: [], html: HEAD + '<p>Муза, скажи мне о том многоопытном муже, который,<br>Странствуя долго со дня, как святой Илион им разрушен,</p><p><span class="pagenum">[5]</span>Многих людей города посетил и обычаи видел.<sup class="reference">[1]</sup></p>' + '<p>Песнь первая, строфа.</p>'.repeat(30) },
  [ROOT + '/Песнь вторая']: { cats: [], html: HEAD + '<p>Вышла из мрака младая с перстами пурпурными Эос.</p>' + '<p>Песнь вторая, строфа.</p>'.repeat(30) },
  [ROOT + '/ДО']: { cats: [], html: '<p>Муза, скажи мнѣ о томъ</p>'.repeat(40) },
  [NONFREE]: { cats: [{ category: 'Возможные_нарушения_авторских_прав' }], html: '<p>Текст</p>'.repeat(40) },
  [NOLIC]: { cats: [{ category: 'Стихотворения_Александра_Пушкина' }], html: '<p>Мороз и солнце; день чудесный!</p>'.repeat(20) },
  [LIST]: { cats: [{ category: 'Списки_редакций' }], html: HEAD + '<ul>' + link(ED, '1837') + link(LIST + '/1833 (ВТ)', '1833') + link('Категория:Романы', 'Романы') + '<li><a href="/wiki/z" class="new" title="' + LIST + '/1825">1825</a></li></ul>' },
  [ED]: { cats: [{ category: 'PD-old' }], html: '<p>Мой дядя самых честных правил.</p>'.repeat(20) }
};
const atom = (entries, next) => '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:dcterms="http://purl.org/dc/terms/">' +
  (next ? '<link rel="next" href="' + next + '"/>' : '') + entries + '</feed>';
const ENTRY = (n, t, a) => '<entry><id>https://www.gutenberg.org/ebooks/' + n + '.opds</id><title>' + t + '</title><content type="text">' + a + '</content></entry>';
const BOOK = '<entry><title>Детство</title><content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Summary: A boy grows up. (This is an automatically generated summary.)</p><p>Downloads: 1234</p><p>Rights: Public domain in the USA.</p></div></content>' +
  '<author><name>Tolstoy, Leo, graf, 1828-1910</name></author><dcterms:language>ru</dcterms:language>' +
  '<link type="application/epub+zip" rel="http://opds-spec.org/acquisition" length="210000" href="https://www.gutenberg.org/ebooks/19681.epub.noimages"/></entry>';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
const hits = { ws: [], gutQ: [], gutFile: 0, tooMany: 0 };
const CORS = { 'Access-Control-Allow-Origin': '*' };
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'ru.wikisource.org') {
    const q = u.searchParams; hits.ws.push(q.get('action') + ':' + (q.get('page') || q.get('titles') || q.get('srsearch')));
    let body;
    if (q.get('action') === 'opensearch') body = [q.get('search'), /^одис/i.test(q.get('search')) ? [ROOT, ROOT + '/Песнь первая', 'ЭСБЕ/Одиссея'] : []];
    else if (q.get('list') === 'search' && /^[a-z]/i.test(q.get('srsearch'))) body = { query: { search: [] } };
    else if (q.get('list') === 'search') body = { query: { search: [{ title: ROOT }, { title: ROOT + '/Песнь первая' }, { title: NONFREE }, { title: NOLIC }, { title: LIST }, { title: 'ЭСБЕ/Гомер' }] } };
    else if (q.get('prop') && q.get('prop').indexOf('categories') === 0 && q.get('action') === 'query') { const t = q.get('titles'); body = { query: { pages: [PAGES[t] ? { title: t, length: 5000, categories: PAGES[t].cats.map(c => ({ ns: 14, title: 'Категория:' + c.category.replace(/_/g, ' ') })) } : { title: t, missing: true }] } }; }
    else if (q.get('action') === 'parse' && q.get('page') === ROOT + '/Песнь первая' && !hits.tooMany++) { r.respond({ status: 429, headers: CORS, body: '' }); return; }
    else if (q.get('action') === 'parse') { const t = q.get('page'); body = PAGES[t] ? { parse: { title: t, text: PAGES[t].html, categories: PAGES[t].cats } } : { error: { code: 'missingtitle' } }; }
    r.respond({ status: 200, contentType: 'application/json; charset=utf-8', headers: CORS, body: JSON.stringify(body || {}) });
  } else if (u.host === 'www.gutenberg.org') {
    if (u.pathname === '/ebooks/search.opds/' && /[а-яё]/i.test(u.searchParams.get('query'))) { hits.gutQ.push(u.searchParams.get('query')); r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: atom('') }); }
    else if (u.pathname === '/ebooks/search.opds/') { hits.gutQ.push(u.searchParams.get('query'));
      r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: atom(ENTRY(19681, 'Детство (Russian)', 'graf Leo Tolstoy') + ENTRY(21186, 'Записки из подполья (Russian)', 'Fyodor Dostoyevsky')) }); }
    else if (u.pathname === '/ebooks/19681.opds') r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: atom(BOOK) });
    else if (/^\/cache\/epub\/\d+\/pg\d+\.txt$/.test(u.pathname)) { hits.gutFile++; r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Детство\r\n\r\nТекст книги. '.repeat(50) }); } /* no ACAO, as on gutenberg.org */
    else if (/\.jpg$/.test(u.pathname)) r.respond({ status: 404, body: '' });
    else r.respond({ status: 404, body: '' });
  } else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();

// 1. screen + sheet = 0 writes, drawer item
await p.evaluate(() => { window.__lsW = []; const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__lsW.push(k); return s.call(this, k, v); }; });
const ns0 = await p.evaluate(() => localStorage.getItem(RQ_K.v1));
const m = await p.evaluate(async () => { openDrawer(); const di = !!el('dAdv'); const lab = di ? el('dAdv').textContent.trim() : ''; navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const vis = !el('adv').classList.contains('hidden'), h1 = document.querySelector('#adv h1').textContent;
  const src = Array.from(document.querySelectorAll('#advSrc .fchip')).map(b => b.textContent + (b.classList.contains('on') ? '*' : ''));
  const hints = document.querySelectorAll('#advList .advhints .fchip').length;
  return { di, lab, vis, h1, src, hints, on: el('dAdv') && el('dAdv').classList.contains('on') }; });
ok('1a «Приключения» в боковом меню, экран открывается; источники Везде (выбрано), Викитека и Гутенберг; без запроса подсказки авторов', m.di && m.lab === 'Приключения' && m.vis && m.h1 === 'Приключения' && m.src.join() === 'Везде*,Викитека,Гутенберг' && m.hints >= 4 && hits.ws.length === 0, m);

// 2. Wikisource
const s = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="wikisource"]').click(); await new Promise(r => setTimeout(r, 200)); el('advQ').value = 'Одиссея'; ADV.q = 'Одиссея'; await advSearch();
  return { q: el('advQ').value, rows: Array.from(document.querySelectorAll('#advList .advrow')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent) }; });
ok('2a поиск: «Одиссея» и её глава сведены в одну строку, автор и переводчик из названия страницы', s.rows.length === 4 && s.rows[0] === 'Одиссея|Гомер · пер. Жуковский' && s.rows[1] === 'Новая повесть|Автор', s);
const nl = await p.evaluate(async () => { advOpen(ADV.items[2]); await new Promise(r => setTimeout(r, 400)); const b = el('bookSheetBody'); const r = { cta: !!b.querySelector('#advGet'), txt: b.textContent }; el('bookSheet').classList.add('hidden'); return r; });
ok('2g стихотворение без шаблона лицензии (как у Пушкина на Викитеке) скачивается; время чтения и начало видны', nl.cta && /Свободный текст Викитеки/.test(nl.txt) && /Объём\s*около 1 минуты чтения/.test(nl.txt) && /НачалоМороз и солнце/.test(nl.txt), nl);
const li = await p.evaluate(async () => { advOpen(ADV.items[3]); await new Promise(r => setTimeout(r, 400)); const b = el('bookSheetBody');
  const rows = Array.from(b.querySelectorAll('.advrow b')).map(x => x.textContent), cta = !!b.querySelector('#advGet');
  b.querySelector('.advrow').click(); await new Promise(r => setTimeout(r, 400));
  const r = { rows, cta, ed: b.querySelector('.bk-ttl b').textContent, edCta: !!b.querySelector('#advGet') }; el('bookSheet').classList.add('hidden'); return r; });
ok('2h список изданий («Евгений Онегин»): вместо скачивания выбор издания, издание скачивается', !li.cta && JSON.stringify(li.rows) === JSON.stringify(['Евгений Онегин · 1837 (ВТ)', 'Евгений Онегин · 1833 (ВТ)']) && li.ed === 'Евгений Онегин · 1837 (ВТ)' && li.edCta, li);
const nf = await p.evaluate(async () => { advOpen(ADV.items[1]); await new Promise(r => setTimeout(r, 400)); const b = el('bookSheetBody'); const r = { cta: !!b.querySelector('#advGet'), txt: b.textContent }; el('bookSheet').classList.add('hidden'); return r; });
ok('2b текст с отметкой о нарушении прав: кнопки скачивания нет, объяснение есть', !nf.cta && /права на текст под вопросом/.test(nf.txt) && /авторское право/.test(nf.txt), nf);
const fr = await p.evaluate(async () => { advOpen(ADV.items[0]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100)); /* the 429 is waited out here now: the card peeks at the first chapter */ const b = el('bookSheetBody');
  return { cta: b.querySelector('#advGet') ? b.querySelector('#advGet').textContent : '', rights: /Общественное достояние/.test(b.textContent), tr: /Жуковский/.test(b.textContent) }; });
ok('2c свободная книга: «Скачать на телефон и читать», права «Общественное достояние»', /Скачать на телефон и читать/.test(fr.cta) && fr.rights && fr.tr, fr);
const tm = await p.evaluate(() => { const b = el('bookSheetBody'); const row = Array.from(b.querySelectorAll('.bk-row')).find(r => r.querySelector('.bk-k').textContent === 'Объём');
  return { vol: row ? row.querySelector('.bk-v').textContent : '', pre: (b.querySelector('.advpre') || {}).textContent || '' }; });
ok('5g карточка книги из частей: объём «2 части · около … чтения» и начало первой главы без шапки и сносок', /^2 части · около \d+ минут[ыа]? чтения$/.test(tm.vol) && /^Муза, скажи мне/.test(tm.pre) && !/\[1\]|\[5\]/.test(tm.pre), tm);
const w1 = await p.evaluate(() => window.__lsW.filter(k => k === RQ_K.v1 || k === RQ_K.set).length);
const ns1 = await p.evaluate(() => localStorage.getItem(RQ_K.v1));
ok('1b экран, поиск и карточка ничего не записали', w1 === 0 && ns1 === ns0, { w1 });
const g = await p.evaluate(async () => { const n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 800));
  const b = S.userBooks.find(x => x.srcId === 'wikisource:Одиссея (Гомер; Жуковский)');
  const idb = b ? await __rq.idb.getText(b.id).catch(() => null) : null;
  const inReader = !el('reader').classList.contains('hidden'); await closeReader({ quiet: true });
  return { added: S.userBooks.length - n0, id: b && b.id, title: b && b.title, author: b && b.author, lang: b && b.lang, genre: b && b.genre, toc: b && b.toc && b.toc.map(t => t.t), idbLen: idb ? idb.length : 0,
    first: idb ? idb.indexOf('Муза, скажи мне') : -1, second: idb ? idb.indexOf('Вышла из мрака') : -1, old: idb ? /мнѣ|томъ/.test(idb) : null, junk: idb ? /Содержание|\[5\]|\[1\]|автор Гомер|75%/.test(idb) : null, inReader }; });
ok('2d скачано (один ответ 429 переждан): одна книга с srcId и lang «ru», главы по порядку в оглавлении, текст в IDB, открыта читалка', hits.tooMany >= 1 && g.added === 1 && g.title === 'Одиссея' && g.author === 'Гомер' && g.lang === 'ru' && g.genre === 'Викитека' &&
  JSON.stringify(g.toc) === JSON.stringify(['Песнь первая', 'Песнь вторая']) && g.first >= 0 && g.second > g.first && g.inReader, g);
ok('2e в тексте нет дореформенной копии, шапки, номеров страниц и сносок; несуществующая глава не запрашивалась', g.old === false && g.junk === false && !hits.ws.some(x => /Песнь третья|\/ДО/.test(x)), { old: g.old, junk: g.junk, ws: hits.ws });
const g2 = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 200)); const own = document.querySelector('#advList .advrow .advown');
  advOpen(ADV.items[0]); await new Promise(r => setTimeout(r, 400)); const cta = el('bookSheetBody').querySelector('.cta').textContent; await advGet(); await new Promise(r => setTimeout(r, 600));
  const n = S.userBooks.filter(x => x.srcId === 'wikisource:Одиссея (Гомер; Жуковский)').length, inReader = !el('reader').classList.contains('hidden'); await closeReader({ quiet: true }); return { own: !!own, cta, n, inReader }; });
ok('2f повторно: в списке «На полке», в карточке «Читать», копии нет', g2.own && g2.cta === 'Читать' && g2.n === 1 && g2.inReader, g2);

// 3. Gutenberg
const gu = await p.evaluate(async () => { navGo('adv'); document.querySelector('#advSrc .fchip[data-src="gutenberg"]').click(); await new Promise(r => setTimeout(r, 500));
  return { lang: Array.from(document.querySelectorAll('#advLang .fchip')).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), vis: !el('advLang').hidden,
    rows: Array.from(document.querySelectorAll('#advList .advrow')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent) }; });
ok('3a Гутенберг: русские книги по умолчанию, по популярности, «(Russian)» из названия убран', gu.vis && gu.lang[0] === 'Русские*' && hits.gutQ[0] === 'l.ru' && gu.rows[0] === 'Детство|Leo Tolstoy' && gu.rows.length === 2, { ...gu, q: hits.gutQ });
const gs = await p.evaluate(async () => { advOpen(ADV.items[0]); await new Promise(r => setTimeout(r, 500)); const b = el('bookSheetBody');
  const t = b.textContent; const n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 500));
  const a = b.querySelector('a.cta'); return { sum: /A boy grows up\.$/.test((b.querySelector('.advsum') || {}).textContent || ''), author: /Leo Tolstoy/.test(t), lang: /русский/.test(t), vol: /Объёмоколо 2 часов чтения/.test(t), added: S.userBooks.length - n0,
    href: a ? a.getAttribute('href') : '', note: /Добавить книгу/.test(b.textContent), size: a ? a.textContent : '' }; });
ok('3b карточка: описание, автор «Leo Tolstoy», язык из каталога, время чтения по размеру файла', gs.sum && gs.author && gs.lang && gs.vol, gs);
ok('3c файл Гутенберга без CORS: книга не добавлена, предложено скачать файл и добавить через «Добавить книгу»', gs.added === 0 && hits.gutFile >= 1 && gs.href === 'https://www.gutenberg.org/ebooks/19681.epub.noimages' && gs.note && /205 КБ/.test(gs.size), { ...gs, gutFile: hits.gutFile });
await p.evaluate(() => el('bookSheet').classList.add('hidden'));
const en = await p.evaluate(async () => { document.querySelector('#advLang .fchip[data-l="en"]').click(); await new Promise(r => setTimeout(r, 400)); el('advQ').value = 'austen'; advInput(); await new Promise(r => setTimeout(r, 900)); return true; });
ok('3d язык и поиск уходят в запрос каталога', hits.gutQ.includes('l.en') && hits.gutQ.includes('austen l.en'), hits.gutQ);

// 5. collections, suggestions, layout and Cyrillic fallbacks
const cs = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="wikisource"]').click(); await new Promise(r => setTimeout(r, 200));
  const sets = Array.from(document.querySelectorAll('#advList .advset b')).map(b => b.textContent);
  document.querySelector('#advList .advset[data-set="antiq"]').click(); await new Promise(r => setTimeout(r, 200));
  const rows = Array.from(document.querySelectorAll('#advList .advrow')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent), h = document.querySelector('#advList .advseth').textContent;
  el('advBack').click(); await new Promise(r => setTimeout(r, 100)); const back = document.querySelectorAll('#advList .advset').length;
  document.querySelector('#advList .advset[data-set="gut"]').click(); await new Promise(r => setTimeout(r, 400));
  const gut = document.querySelector('#advSrc .fchip.on').dataset.src; return { sets, rows: rows.slice(0, 2), n: rows.length, h, back, gut }; });
ok('5a первый экран: 6 подборок; «Античность» открывается сразу списком книг, «Все подборки» возвращают; «Популярное на Гутенберге» открывает Гутенберг', cs.sets.length === 6 && cs.sets[0] === 'Школьная программа' && cs.h === 'Античность' && cs.n === 10 &&
  cs.rows[0] === 'Илиада|Гомер' && cs.rows[1] === 'Одиссея|Гомер' && cs.back === 6 && cs.gut === 'gutenberg', cs);
const ws0 = hits.ws.length;
const sg = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="wikisource"]').click(); await new Promise(r => setTimeout(r, 100));
  const i = el('advQ'); i.value = 'Одис'; advInput(); await new Promise(r => setTimeout(r, 500));
  const rows = Array.from(document.querySelectorAll('#advSug .advsugrow')).map(b => b.textContent.trim());
  i.value = 'гом'; advInput(); await new Promise(r => setTimeout(r, 500)); const au = Array.from(document.querySelectorAll('#advSug .advsugrow')).map(b => b.textContent.trim());
  i.value = 'Одис'; advInput(); await new Promise(r => setTimeout(r, 500)); document.querySelector('#advSug .advsugrow').click(); await new Promise(r => setTimeout(r, 500));
  const t = document.querySelector('#bookSheetBody .bk-ttl b').textContent, hid = el('advSug').hidden; el('bookSheet').classList.add('hidden'); return { rows, au, t, hid }; });
ok('5c подсказки: книга и её глава одной строкой, статья энциклопедии убрана; нажатие открывает карточку', JSON.stringify(sg.rows) === JSON.stringify(['Одиссея Гомер · пер. Жуковский']) && sg.t === 'Одиссея' && sg.hid && hits.ws.slice(ws0).some(x => /^opensearch/.test(x)), sg);
ok('5d подсказки авторов по первым буквам', sg.au[0] === 'Гомер', sg.au);
const ly = await p.evaluate(async () => { el('advQ').value = 'jlbcctz'; ADV.q = 'jlbcctz'; await advSearch(); return { alt: (document.querySelector('#advList .advalt') || {}).textContent || '', n: ADV.items.length }; });
ok('5e набрано в английской раскладке: найдено по «одиссея», это сказано над списком', ly.n > 0 && ly.alt === 'Показано по запросу «одиссея»', ly);
const cy = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="gutenberg"]').click(); await new Promise(r => setTimeout(r, 400));
  el('advQ').value = 'Достоевский'; ADV.q = 'Достоевский'; await advSearch(); return { alt: (document.querySelector('#advList .advalt') || {}).textContent || '', n: ADV.items.length }; });
ok('5f Гутенберг по-русски ничего не нашёл: ищем «Dostoyevsky»', cy.n > 0 && cy.alt === 'Показано по запросу «Dostoyevsky»' && hits.gutQ.some(x => /^Dostoyevsky l\./.test(x)), { ...cy, q: hits.gutQ.slice(-3) });

// 4. export
const exp = await p.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })));
const eb = ((JSON.parse(exp).library || {}).userBooks || []).find(x => x.id === g.id);
ok('4 в экспорте карточка книги с srcId и lang', eb && eb.srcId === 'wikisource:Одиссея (Гомер; Жуковский)' && eb.lang === 'ru' && !eb.text, eb && { srcId: eb.srcId, lang: eb.lang });
ok('нет ошибок страницы и окон', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
const n = checks.filter(Boolean).length; console.log('SUMMARY adv.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
