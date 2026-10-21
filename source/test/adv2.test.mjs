// «Приключения», вторая волна (Джессика 19.10 «Давай первые 6»; arch.md 19.10, поля advWant, advRecent, IDB advdl:):
//  1) страница автора: поиск в пространстве «Автор:», годы из категорий, тексты по порядку без дублей и старой орфографии; несколько авторов → выбор;
//  2) «Хочу прочитать» переживает перезагрузку, видна на первом экране, убирается кнопкой; «Вы искали» и «Очистить»;
//  3) прерванное скачивание: сохранено в IDB, карточка предлагает продолжить с процентом, после перезагрузки докачивает только недостающее, запись удаляется;
//  4) «Везде»: Викитека и Гутенберг одним списком, метки источника и «есть по-русски»;
//  5) книга дня на первом экране;
//  6) очистка advWant/advRecent при чтении (hydrateLibrary) и экспорт.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node adv2.test.mjs
import puppeteer from 'puppeteer-core';
import { hydrateLibrary } from '../storage/schema.js';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const link = (t, n, cls) => '<li><a href="/wiki/' + encodeURIComponent(t) + '" title="' + t + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + n + '</a></li>';
const AU = 'Автор:Фёдор Иванович Тютчев', BOOK = 'Повести (Тестов)', CHILD = 'Детство (Толстой)';
const para = (s, n) => ('<p>' + s + '</p>').repeat(n);
const PAGES = {
  [AU]: { cats: [{ category: 'Родившиеся_в_1803_году' }, { category: 'Умершие_в_1873_году' }, { category: 'Поэты' }],
    html: '<ul>' + link('Silentium! (Тютчев)', 'Silentium!') + link('Silentium! (Тютчев)/ДО', 'Silentium! (ДО)') + link('Весенняя гроза (Тютчев)', 'Весенняя гроза') +
      link('Весенняя гроза (Тютчев)/Вариант', 'вариант') + link('Категория:Поэты', 'Поэты') + link('Москва', 'Москва') + link('Осенний вечер (Тютчев)', 'Осенний вечер', 'new') + '</ul>' },
  [BOOK]: { cats: [{ category: 'PD-old' }], html: '<ul>' + link(BOOK + '/Первая', 'Первая') + link(BOOK + '/Вторая', 'Вторая') + link(BOOK + '/Третья', 'Третья') + '</ul>' },
  [BOOK + '/Первая']: { cats: [], html: para('Первая повесть, строка.', 20) },
  [BOOK + '/Вторая']: { cats: [], html: para('Вторая повесть, строка.', 20) },
  [BOOK + '/Третья']: { cats: [], html: para('Третья повесть, строка.', 20) },
  [CHILD]: { cats: [{ category: 'PD-old' }], html: para('Двенадцатого августа 18…, ровно в третий день после дня моего рождения.', 20) }
};
const atom = (entries) => '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">' + entries + '</feed>';
const ENTRY = (n, t, a) => '<entry><id>https://www.gutenberg.org/ebooks/' + n + '.opds</id><title>' + t + '</title><content type="text">' + a + '</content></entry>';
const fail = { second: false, first: false }; const hits = { ws: [], gutQ: [] };
const CORS = { 'Access-Control-Allow-Origin': '*' };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'ru.wikisource.org') {
    const q = u.searchParams; hits.ws.push(q.get('action') + ':' + (q.get('page') || q.get('titles') || q.get('srsearch')));
    let body;
    if (q.get('list') === 'search' && q.get('srnamespace') === '102') body = { query: { search: /тютчев/i.test(q.get('srsearch')) ? [{ title: AU }, { title: 'Автор:Иван Тютчев' }] : [] } };
    else if (q.get('list') === 'search') body = { query: { search: [{ title: CHILD }, { title: BOOK }] } };
    else if (q.get('action') === 'query') { const t = q.get('titles'); body = { query: { pages: [PAGES[t] ? { title: t, length: 5000, categories: PAGES[t].cats.map(c => ({ ns: 14, title: 'Категория:' + c.category.replace(/_/g, ' ') })) } : { title: t, missing: true }] } }; }
    else if (q.get('action') === 'parse') { const t = q.get('page');
      if ((fail.second && t === BOOK + '/Вторая') || (fail.first && t === BOOK + '/Первая')) { r.respond({ status: 500, headers: CORS, body: '' }); return; }
      body = PAGES[t] ? { parse: { title: t, text: PAGES[t].html, categories: PAGES[t].cats } } : { error: { code: 'missingtitle' } }; }
    r.respond({ status: 200, contentType: 'application/json; charset=utf-8', headers: CORS, body: JSON.stringify(body || {}) });
  } else if (u.host === 'www.gutenberg.org') {
    if (u.pathname === '/ebooks/search.opds/') { hits.gutQ.push(u.searchParams.get('query'));
      r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: atom(ENTRY(2142, 'Childhood', 'graf Leo Tolstoy') + ENTRY(1342, 'Pride and Prejudice', 'Jane Austen')) }); }
    else r.respond({ status: 404, body: '' });
  } else if (u.host === 'standardebooks.org') r.respond({ status: 200, contentType: 'text/html; charset=utf-8', headers: CORS, body: '<html><body><ol class="ebooks-list list"></ol></body></html>' }); /* the real catalogue answers in CI: kept out of the «Везде» check */
  else if (u.host === 'archive.org') r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ response: { numFound: 0, docs: [] } }) }); /* Internet Archive: nothing, so «Везде» shows only the mocked libraries */
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const wait = (ms) => p.evaluate((ms) => new Promise(r => setTimeout(r, ms)), ms);

// 5. book of the day
const day = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const b = el('advDay'), d = advDayItem(); const r = { has: !!b, t: b ? b.querySelector('b').textContent : '', want: d.t, same: advDayItem().sid === d.sid, first: document.querySelector('#advList .bk-h').textContent };
  b.click(); await new Promise(r => setTimeout(r, 300)); r.sheet = !el('bookSheet').classList.contains('hidden') && document.querySelector('#bookSheetBody .bk-ttl b').textContent; el('bookSheet').classList.add('hidden'); return r; });
ok('5 первый экран начинается с книги дня (одна и та же весь день), нажатие открывает карточку', day.has && day.first === 'Книга дня' && day.t === day.want && day.same && day.sheet === day.want, day);

// 1. author page
const au = await p.evaluate(async () => { await advAuthor('Фёдор Тютчев');
  const r = { h: document.querySelector('#advList .advseth').textContent, alt: Array.from(document.querySelectorAll('#advList .advalt')).map(x => x.textContent), rows: Array.from(document.querySelectorAll('#advList > .advrow .advmeta > b')).map(x => x.textContent) };
  await advAuthor('Тютчев'); r.pick = Array.from(document.querySelectorAll('#advList .advauthrow b')).map(x => x.textContent);
  document.querySelector('#advList .advauthrow').click(); await new Promise(r => setTimeout(r, 400)); r.picked = document.querySelector('#advList .advseth').textContent;
  el('advBack').click(); await new Promise(r => setTimeout(r, 200)); r.home = !!el('advDay'); return r; });
ok('1a страница автора: имя, годы «1803 — 1873», тексты по порядку без старой орфографии, вариантов, категорий и красных ссылок', au.h === 'Фёдор Иванович Тютчев' && au.alt[0] === '1803 — 1873' && au.alt[1] === '2 текста на Викитеке' &&
  JSON.stringify(au.rows) === JSON.stringify(['Silentium!', 'Весенняя гроза']), au);
ok('1b два автора с такой фамилией: выбор, выбранный открывается; «Назад» возвращает на первый экран', JSON.stringify(au.pick) === JSON.stringify(['Фёдор Иванович Тютчев', 'Иван Тютчев']) && au.picked === 'Фёдор Иванович Тютчев' && au.home, au);
const card = await p.evaluate(async () => { advOpen(advWsItem('Детство (Толстой)')); await new Promise(r => setTimeout(r, 500));
  const b = Array.from(document.querySelectorAll('#bookSheetBody button')).find(x => /Все книги автора/.test(x.textContent)); el('bookSheet').classList.add('hidden'); return { btn: !!b, who: b && b.dataset.author }; });
ok('1c в карточке книги Викитеки кнопка «Все книги автора»', card.btn && card.who === 'Толстой', card);

// 2. want list + recent searches
await p.evaluate(() => { window.__lsW = []; const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__lsW.push(k); return s.call(this, k, v); }; });
const w = await p.evaluate(async () => { advOpen(advWsItem('Детство (Толстой)')); for (let i = 0; i < 30 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const before = el('advWant').textContent.trim(); el('advWant').click(); await new Promise(r => setTimeout(r, 200));
  const r = { before, after: el('advWant').textContent.trim(), on: el('advWant').classList.contains('on'), list: S.advWant.map(x => x.sid), writes: window.__lsW.length };
  el('bookSheet').classList.add('hidden'); await __rq.flushNow?.(); return r; });
ok('2a «Хочу прочитать» в карточке: книга в списке, кнопка показывает это, одна запись', w.before === 'Хочу прочитать' && w.after === 'В списке «Хочу прочитать»' && w.on && JSON.stringify(w.list) === JSON.stringify(['wikisource:Детство (Толстой)']) && w.writes >= 1, w);
await wait(1500);
await p.reload({ waitUntil: 'load' }); await boot();
const w2 = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const hs = Array.from(document.querySelectorAll('#advList .advhome .bk-h')).map(x => x.textContent), row = document.querySelector('#advList .advhome [data-w]');
  const r = { list: (S.advWant || []).map(x => x.sid + '|' + x.t + '|' + x.a), hs, row: row && row.querySelector('b').textContent };
  row.click(); for (let i = 0; i < 30 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  el('advWant').click(); await new Promise(r => setTimeout(r, 200)); r.removed = S.advWant.length; el('bookSheet').classList.add('hidden'); advRenderList(); r.hs2 = Array.from(document.querySelectorAll('#advList .advhome .bk-h')).map(x => x.textContent); return r; });
ok('2b после перезагрузки список на месте и виден на первом экране; повторное нажатие убирает книгу', w2.list[0] === 'wikisource:Детство (Толстой)|Детство|Толстой' && w2.hs.includes('Хочу прочитать') && w2.row === 'Детство' && w2.removed === 0 && !w2.hs2.includes('Хочу прочитать'), w2);
const rc = await p.evaluate(async () => { document.querySelector('#advSrc .fchip[data-src="wikisource"]').click(); await new Promise(r => setTimeout(r, 200));
  el('advQ').value = 'детство'; ADV.q = 'детство'; await advSearch(); document.querySelector('#advList > .advrow').click(); await new Promise(r => setTimeout(r, 300)); el('bookSheet').classList.add('hidden');
  const saved = S.advRecent.slice(); el('advQ').value = ''; ADV.q = ''; await advSearch();
  const chips = Array.from(document.querySelectorAll('#advList .advrecent .fchip')).map(x => x.textContent);
  document.querySelector('#advList .advrecent .fchip').click(); await new Promise(r => setTimeout(r, 400)); const q = el('advQ').value, n = ADV.items.length;
  el('advQ').value = ''; ADV.q = ''; await advSearch(); el('advRecentClear').click(); await new Promise(r => setTimeout(r, 100));
  return { saved, chips, q, n, cleared: S.advRecent.length, gone: !document.querySelector('#advList .advrecent') }; });
ok('2c «Вы искали»: запрос запомнен, когда открыли найденную книгу; чип повторяет поиск; «Очистить» убирает', rc.saved[0] === 'детство' && rc.chips[0] === 'детство' && rc.q === 'детство' && rc.n === 2 && rc.cleared === 0 && rc.gone, rc);

// 3. resumable download
fail.second = true;
const d1 = await p.evaluate(async () => { advOpen(advWsItem('Повести (Тестов)')); for (let i = 0; i < 30 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const cta0 = el('advGet').textContent.trim(), n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 200));
  const st = await __rq.idb.get('advdl:wikisource:Повести (Тестов)');
  return { cta0, cta: el('advGet') ? el('advGet').textContent.trim() : '', added: S.userBooks.length - n0, st: st && Object.keys(st.done).sort(), v: st && st.v,
    flash: (document.querySelector('.flash, #flash, .toast') || {}).textContent || '' }; });
ok('3a обрыв на второй части: книга не добавлена, скачанное в IDB, кнопка «Продолжить скачивание · 33 %»', d1.cta0 === 'Скачать на телефон и читать' && d1.added === 0 && d1.v === 1 &&
  JSON.stringify(d1.st) === JSON.stringify(['Повести (Тестов)', 'Повести (Тестов)/Первая']) && d1.cta === 'Продолжить скачивание · 33 %', d1);
await p.reload({ waitUntil: 'load' }); await boot();
fail.second = false; fail.first = true; /* after the reload the first part can only come from IDB */
const ws0 = hits.ws.length;
const d2 = await p.evaluate(async () => { navGo('adv'); advOpen(advWsItem('Повести (Тестов)')); for (let i = 0; i < 30 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const cta = el('advGet').textContent.trim(), n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 300));
  const b = S.userBooks.find(x => x.srcId === 'wikisource:Повести (Тестов)'); const txt = b ? await __rq.idb.get('text:' + b.id).catch(() => null) : null;
  const st = await __rq.idb.get('advdl:wikisource:Повести (Тестов)'); const inReader = !el('reader').classList.contains('hidden'); if (inReader) await closeReader({ quiet: true });
  return { cta, added: S.userBooks.length - n0, toc: b && b.toc ? b.toc.map(x => x.t) : null, st: st || null, inReader }; });
const gotFirst = hits.ws.slice(ws0).filter(x => x === 'parse:Повести (Тестов)/Первая').length;
ok('3b после перезагрузки карточка помнит 33 %; докачано недостающее, первая часть взята из IDB; книга из трёх частей по порядку; запись удалена', d2.cta === 'Продолжить скачивание · 33 %' && d2.added === 1 &&
  JSON.stringify(d2.toc) === JSON.stringify(['Первая', 'Вторая', 'Третья']) && d2.st === null && d2.inReader, { ...d2, gotFirst });
fail.first = false;

// 4. «Везде»
const all = await p.evaluate(async () => { navGo('adv'); document.querySelector('#advSrc .fchip[data-src="all"]').click(); await new Promise(r => setTimeout(r, 200));
  el('advQ').value = 'Толстой'; ADV.q = 'Толстой'; await advSearch();
  return Array.from(document.querySelectorAll('#advList > .advrow:not(.advauthrow)')).map(b => b.querySelector('b').textContent + '|' + Array.from(b.querySelectorAll('.advtags .chip')).map(c => c.textContent).join('+')); });
ok('4 «Везде»: сначала Викитека, потом Гутенберг, с метками; у Толстого с Гутенберга «есть по-русски», у Остин нет', JSON.stringify(all) === JSON.stringify(['Детство|Викитека', 'Повести|Викитека', 'Childhood|Гутенберг+есть по-русски', 'Pride and Prejudice|Гутенберг']) && hits.gutQ.includes('Tolstoy'), { all, q: hits.gutQ });

// 6. hydrate + export
const h = hydrateLibrary({ advWant: [{ sid: 'wikisource:A', t: 'A' }, { sid: 'x:1' }, 5, null, { t: 'no sid' }], advRecent: ['a', '', 7, 'b'.repeat(80), 'c', 'd', 'e', 'f', 'g', 'h', 'i'] });
const h0 = hydrateLibrary({ advWant: 'x', advRecent: {} });
ok('6a чтение: в advWant только записи с sid Викитеки/Гутенберга, advRecent — до 8 строк по 60 знаков; мусор → пустые списки', h.advWant.length === 1 && h.advRecent.length === 8 && h.advRecent[1].length === 60 && !h.advRecent.includes('') &&
  Array.isArray(h0.advWant) && h0.advWant.length === 0 && h0.advRecent.length === 0, { want: h.advWant, recent: h.advRecent });
const ex = await p.evaluate(async () => { S.advWant = [{ sid: 'gutenberg:1342', n: '1342', t: 'Pride and Prejudice', a: 'Jane Austen' }]; S.advRecent = ['толстой']; save(); await new Promise(r => setTimeout(r, 300));
  const lib = JSON.parse(JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false }))).library || {}; return { w: lib.advWant, r: lib.advRecent }; });
ok('6b экспорт: advWant и advRecent в разделе library', ex.w && ex.w[0] && ex.w[0].sid === 'gutenberg:1342' && ex.r && ex.r[0] === 'толстой', ex);

ok('нет ошибок страницы и окон', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
const n = checks.filter(Boolean).length; console.log('SUMMARY adv2.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
