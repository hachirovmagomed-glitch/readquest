// «Приключения»: Internet Archive (Джессика 21.10, «Только свободные»; arch.md 21.10, источник ia:, без новых полей):
//  1) источник «Интернет-архив»: подсказка и авторы вместо списка, выбор языка;
//  2) поиск по названию и автору, только свободные книги (до 1930 года или общественное достояние без года), без библиотечной выдачи;
//  3) карточка: год издания, права, предупреждение про опечатки распознанного текста; скачивание текста скана на полку, текст очищен;
//  4) книга 1950 года не скачивается; скан без текста (альбом картинок) не кладётся на полку;
//  5) несколько томов в одной записи: выбор тома, том открывается и скачивается;
//  6) «Хочу прочитать» хранит только sid, карточка открывается из него; поиск «Везде» показывает книги архива.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node adv4.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CORS = { 'Access-Control-Allow-Origin': '*' };
// the archive's answers as seen 21.10 (advancedsearch, /metadata, the _djvu.txt of a scan)
const DOCS = [
  { identifier: 'vojna_i_mir_1912_tom_1', title: 'Война и миръ. Томъ 1', creator: 'Leo Tolstoy (1828-1910); Толстой, Лев Николаевич (1828-1910)', year: 1912, language: 'rus' },
  { identifier: 'tolstoy-later', title: 'Избранное', creator: 'Толстой, Лев Николаевич', year: 1950, language: 'rus' },
  { identifier: 'tolstoy-pss', title: 'Полное собрание сочинений', creator: 'Толстой, Лев Николаевич (1828-1910)', date: '1912-01-01T00:00:00Z', language: 'rus' },
  { identifier: 'album1893', title: 'Альбом акварелей к роману «Война и мир»', creator: 'BMK BRZ', year: 1893, language: 'rus' }];
const PROSE = 'Ну, князь. Генуа и Лукка стали не больше, как поместья фамилии Бонапарте. Нет, я вам вперед говорю, если вы мне не скажете, что у нас война, если вы еще позволите себе защищать все гадости, все ужасы этого Антихриста, — я вас больше не знаю.';
const lines = (s, w) => { const out = []; let cur = ''; for (const x of s.split(' ')) { if ((cur + ' ' + x).length > w) { out.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; } out.push(cur); return out; };
const OCR = (() => { const l = lines(PROSE, 60); l[1] = l[1] + ' собст¬'; l[2] = 'венно ' + l[2];
  return ('  ' + l.join('  \n') + ' \n\n\nВОЙНА И МИРЪ    17 \n\n' + 'т дна -ъ у” > тре \n{. -- “ х в ‚- -. . аи \n\n' + 'Вниманье башен неподвижных, \nСосредоточенность шеренг. \n\n').repeat(12); })();
const META = {
  'vojna_i_mir_1912_tom_1': { metadata: { title: 'Война и миръ. Томъ 1', creator: 'Leo Tolstoy (1828-1910); Толстой, Лев Николаевич (1828-1910)', date: '1912', language: 'rus', licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/', collection: ['booksbylanguage_russian', 'booksbylanguage'], description: '<p>Издание <b>1912</b> года.</p>' },
    files: [{ name: 'vojna_i_mir_1912_tom_1.pdf', format: 'Text PDF', size: '9000000' }, { name: 'vojna_i_mir_1912_tom_1_djvu.txt', format: 'DjVuTXT', size: '1300000' }, { name: 'vojna_i_mir_1912_tom_1.epub', format: 'EPUB', size: '700000' }] },
  'tolstoy-later': { metadata: { title: 'Избранное', creator: 'Толстой, Лев Николаевич', date: '1950', language: 'rus', licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/', collection: ['booksbylanguage'] }, files: [{ name: 'izbr_djvu.txt', format: 'DjVuTXT', size: '500000' }] },
  'tolstoy-pss': { metadata: { title: 'Полное собрание сочинений', creator: 'Толстой, Лев Николаевич (1828-1910)', date: '1912', language: 'rus', collection: ['booksbylanguage'] },
    files: [{ name: 'Полное собрание, том 1 (Детство)_djvu.txt', format: 'DjVuTXT', size: '400000' }, { name: 'Полное собрание, том 1 (Детство) - OCR_djvu.txt', format: 'DjVuTXT', size: '400000' }, { name: 'Полное собрание, том 2 (Отрочество)_djvu.txt', format: 'DjVuTXT', size: '300000' }] },
  'album1893': { metadata: { title: 'Альбом акварелей к роману «Война и мир»', creator: 'BMK BRZ', date: '1893', language: 'rus', collection: ['folkscanomy_bookbin'] }, files: [{ name: 'album1893_djvu.txt', format: 'DjVuTXT', size: '47000' }] },
  'lent1900': { metadata: { title: 'Lent book', date: '1900', language: 'eng', collection: ['inlibrary', 'printdisabled'] }, files: [{ name: 'lent1900_djvu.txt', format: 'DjVuTXT', size: '300000' }] }
};
const NOISE = ('ра 5 © | \n{. -- “ х в ‚- -. . аи \n> неа > ее “с -+ а хе ай \n\n').repeat(200);
const hits = { q: [], dl: [] };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
const flashes = [];
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'archive.org') {
    if (u.pathname === '/advancedsearch.php') { const q = u.searchParams.get('q'); hits.q.push({ q, page: u.searchParams.get('page'), fl: u.searchParams.getAll('fl[]') });
      const docs = /толстой/i.test(q) ? DOCS : [];
      r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ responseHeader: { status: 0 }, response: { numFound: docs.length ? 45 : 0, start: 0, docs: u.searchParams.get('page') === '2' ? [] : docs } }) }); }
    else if (u.pathname.indexOf('/metadata/') === 0) { const m = META[decodeURIComponent(u.pathname.slice(10))]; r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(m || {}) }); }
    else if (u.pathname.indexOf('/download/') === 0) { const f = decodeURIComponent(u.pathname); hits.dl.push(f);
      r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', headers: CORS, body: /album1893/.test(f) ? NOISE : OCR }); }
    else r.respond({ status: 404, headers: CORS, body: '' });
  } else if (u.host === 'ru.wikisource.org') r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(u.searchParams.get('action') === 'opensearch' ? ['', [], [], []] : { query: { search: [], pages: [] } }) });
  else if (u.host === 'www.gutenberg.org') r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: '<feed xmlns="http://www.w3.org/2005/Atom"></feed>' });
  else if (u.host === 'standardebooks.org') r.respond({ status: 200, contentType: 'text/html', headers: CORS, body: '<html><body><ol class="ebooks-list list"></ol></body></html>' });
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
await p.evaluate(() => { const f = window.flashMsg; window.__flash = []; window.flashMsg = function (m) { window.__flash.push(String(m)); return f.apply(this, arguments); }; });

// 1. the source
const s1 = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const chip = document.querySelector('#advSrc .fchip[data-src="ia"]'), r = { chip: chip && chip.textContent, set: !!document.querySelector('#advList .advset[data-set="ia"]') };
  r.setSub = r.set ? document.querySelector('#advList .advset[data-set="ia"] span').textContent : '';
  document.querySelector('#advList .advset[data-set="ia"]').click(); await new Promise(r => setTimeout(r, 200));
  r.src = ADV.src; r.on = (document.querySelector('#advSrc .fchip.on') || {}).textContent; r.lang = !el('advLang').hidden; r.items = ADV.items.length;
  r.empty = (document.querySelector('#advList .advempty') || {}).textContent; r.chips = document.querySelectorAll('#advList .advrecent .fchip').length; return r; });
ok('1 «Интернет-архив»: кнопка источника и подборка; подсказка про издания до 1930 года и авторы вместо списка; выбор языка', s1.chip === 'Интернет-архив' && s1.set && s1.setSub === 'сканы книг до 1930 года' && s1.src === 'ia' && s1.on === 'Интернет-архив' &&
  s1.lang && s1.items === 0 && /только изданные до 1930 года/.test(s1.empty) && s1.chips === 8 && hits.q.length === 0, s1);

// 2. search
const s2 = await p.evaluate(async () => { const b = Array.from(document.querySelectorAll('#advList .advrecent .fchip')).find(x => x.textContent === 'Толстой'); b.click();
  for (let i = 0; i < 40 && (ADV.busy || !ADV.items.length); i++) await new Promise(r => setTimeout(r, 100));
  return { rows: Array.from(document.querySelectorAll('#advList > .advrow:not(.advauthrow)')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent), sid: ADV.items[0] && ADV.items[0].sid, more: !!el('advMore'),
    cover: ADV.items[0] && ADV.items[0].cover, q: ADV.q }; });
const q0 = hits.q[0] || { q: '' };
ok('2a поиск по названию и автору, по-русски, только свободные: до 1930 года или общественное достояние без года, без библиотечной выдачи', /^\(title:\(\(Толстой\)\) OR creator:\(\(Толстой\)\)\)/.test(q0.q) && /language:\(rus OR Russian\)/.test(q0.q) && /format:DjVuTXT/.test(q0.q) &&
  /date:\[1000-01-01 TO 1929-12-31\]/.test(q0.q) && /licenseurl:\*publicdomain\* AND NOT date:\[1930-01-01 TO 2100-12-31\]/.test(q0.q) && /NOT collection:\(inlibrary OR printdisabled OR lendinglibrary OR internetarchivebooks\)/.test(q0.q) && /NOT access-restricted-item:true/.test(q0.q), q0);
ok('2b список без строки автора Викитеки: название, год, автор «Имя Отчество Фамилия» (из «Leo Tolstoy (…); Толстой, Лев Николаевич (…)»), обложка архива, «Показать ещё»', JSON.stringify(s2.rows.slice(0, 1)) === '["Война и мир. Том 1|Лев Николаевич Толстой · 1912"]' && s2.rows[3] === 'Альбом акварелей к роману «Война и мир»|1893' &&
  s2.sid === 'ia:vojna_i_mir_1912_tom_1' && s2.cover === 'https://archive.org/services/img/vojna_i_mir_1912_tom_1' && s2.more, s2);

// 3. card and download
const s3 = await p.evaluate(async () => { advOpen(ADV.items[0]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const b = el('bookSheetBody'), r = { txt: b.textContent, cta: (el('advGet') || {}).textContent, ru: !!Array.from(b.querySelectorAll('button')).find(x => /Этот автор по-русски/.test(x.textContent)) };
  const n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 300));
  const bk = S.userBooks.find(x => x.srcId === 'ia:vojna_i_mir_1912_tom_1'); r.added = S.userBooks.length - n0;
  r.book = bk && { t: bk.title, a: bk.author, lang: bk.lang, genre: bk.genre }; r.text = bk ? ((await __rq.idb.get('text:' + bk.id).catch(() => '')) || '') : '';
  r.reader = !el('reader').classList.contains('hidden'); if (r.reader) await closeReader({ quiet: true }); return r; });
const t3 = s3.text, p3 = t3.split('\n\n');
ok('3a карточка: архив, автор, год издания, «общественное достояние», объём, предупреждение про опечатки распознанного текста, ссылка на Викитеку', /ИсточникInternet Archive/.test(s3.txt) && /АвторЛев Николаевич Толстой/.test(s3.txt) && /Языкрусский/.test(s3.txt) && /Издание1912 год/.test(s3.txt) &&
  /ПраваОбщественное достояние/.test(s3.txt) && /Объёмоколо 9 часов чтения/.test(s3.txt) && /Текст распознан со скана/.test(s3.txt) && /Издание 1912 года\./.test(s3.txt) && /Скачать на телефон и читать/.test(s3.cta) && s3.ru, s3.txt.slice(0, 500));
ok('3b скачан текст скана (_djvu.txt, не EPUB): книга на полке, язык ru, открыта читалка', hits.dl.length === 1 && /^\/download\/vojna_i_mir_1912_tom_1\/vojna_i_mir_1912_tom_1_djvu\.txt$/.test(hits.dl[0]) && s3.added === 1 && s3.book &&
  s3.book.t === 'Война и мир. Том 1' && s3.book.a === 'Лев Николаевич Толстой' && s3.book.lang === 'ru' && s3.book.genre === 'Интернет-архив' && s3.reader, { book: s3.book, dl: hits.dl });
ok('3c текст очищен: строки скана собраны в абзац, перенос «собст¬венно» склеен, колонтитул с номером страницы и мусор с картинок убраны, стихи остались строками', p3[0].indexOf('\n') < 0 && p3[0].startsWith('Ну, князь. Генуа и Лукка') && /собственно/.test(p3[0]) &&
  !/ВОЙНА И МИРЪ\s+17/.test(t3) && !/тре|аи/.test(t3.replace(/[а-яё]+(тре|аи)|(тре|аи)[а-яё]+/gi, '')) && p3[1] === 'Вниманье башен неподвижных,\nСосредоточенность шеренг.' && !/  /.test(t3), p3.slice(0, 3));

// 4. not free / no text
const s4 = await p.evaluate(async () => { const r = {};
  advOpen(ADV.items[1]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  r.late = el('bookSheetBody').textContent; r.lateGet = !!el('advGet');
  advOpen({ sid: 'ia:lent1900', ia: 'lent1900', t: 'Lent book', a: '' }); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100)); r.lentGet = !!el('advGet');
  advOpen(ADV.items[3]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const n0 = S.userBooks.length; window.__flash = []; await advGet(); r.added = S.userBooks.length - n0; r.flash = window.__flash.slice(); r.albumAuthor = el('bookSheetBody').querySelector('.bk-sub').textContent; el('bookSheet').classList.add('hidden'); return r; });
ok('4a книга 1950 года и книга из библиотечной выдачи не скачиваются, карточка объясняет почему', !s4.lateGet && /Издано после 1929 года/.test(s4.late) && /только книги, отмеченные как общественное достояние или изданные до 1930 года/.test(s4.late) && !s4.lentGet, s4.late.slice(0, 300));
ok('4b скан без текста (альбом картинок): на полку не кладётся, сообщение «почти нет текста»; служебный «BMK BRZ» не показан автором', s4.added === 0 && s4.flash.some(x => /почти нет текста/.test(x)) && s4.albumAuthor === '', s4);

// 5. volumes
const s5 = await p.evaluate(async () => { advOpen(ADV.items[2]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const b = el('bookSheetBody'), r = { note: (b.querySelector('.bk-note') || {}).textContent, vols: Array.from(b.querySelectorAll('.advrow b')).map(x => x.textContent) };
  b.querySelectorAll('.advrow')[1].click(); for (let i = 0; i < 40 && !(advCur && advCur.inf && advCur.it.f); i++) await new Promise(r => setTimeout(r, 100));
  r.sid = advCur.it.sid; r.txt = el('bookSheetBody').textContent; const n0 = S.userBooks.length; await advGet(); await new Promise(r => setTimeout(r, 300));
  const bk = S.userBooks.find(x => x.srcId === r.sid); r.added = S.userBooks.length - n0; r.title = bk && bk.title; r.reader = !el('reader').classList.contains('hidden'); if (r.reader) await closeReader({ quiet: true }); return r; });
ok('5 несколько томов в записи: выбор тома (повтор «- OCR» убран), том открывается своей карточкой и скачивается со своим названием', /Выберите нужное/.test(s5.note) && JSON.stringify(s5.vols) === JSON.stringify(['Полное собрание сочинений · том 1 (Детство)', 'Полное собрание сочинений · том 2 (Отрочество)']) &&
  s5.sid === 'ia:tolstoy-pss/Полное собрание, том 2 (Отрочество)_djvu.txt' && /Томтом 2 \(Отрочество\)/.test(s5.txt) && /ПраваИздано до 1930 года/.test(s5.txt) && s5.added === 1 && s5.title === 'Полное собрание сочинений · том 2 (Отрочество)' &&
  hits.dl.some(x => x === '/download/tolstoy-pss/Полное собрание, том 2 (Отрочество)_djvu.txt'), s5);

// 6. «Хочу прочитать» and «Везде»
const s6 = await p.evaluate(async () => { const r = {};
  S.advWant = [{ sid: 'ia:tolstoy-pss/Полное собрание, том 1 (Детство)_djvu.txt', t: 'Полное собрание сочинений', a: 'Лев Николаевич Толстой', ed: 'том 1 (Детство)' }]; save();
  r.kept = advWantGet().length; advSet('want'); await new Promise(r => setTimeout(r, 100)); r.dl = (el('advWantDl') || {}).textContent;
  document.querySelector('#advList > .advrow').click(); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  r.txt = el('bookSheetBody').textContent; r.get = !!el('advGet'); el('bookSheet').classList.add('hidden'); S.advWant = []; save();
  ADV.set = null; advSwitch('all'); el('advQ').value = 'Толстой'; ADV.q = 'Толстой'; await advSearch();
  r.all = Array.from(document.querySelectorAll('#advList > .advrow:not(.advauthrow)')).map(b => b.querySelector('b').textContent + '|' + (b.querySelector('.advtags .chip') || {}).textContent); return r; });
const qa = hits.q[hits.q.length - 1] || { q: '' };
ok('6a «Хочу прочитать»: том архива хранится одним sid и открывается из него (карточка тома, можно скачать), «Скачать все (1)»', s6.kept === 1 && s6.dl && /Скачать все \(1\)/.test(s6.dl) && /Томтом 1 \(Детство\)/.test(s6.txt) && s6.get, { ...s6, txt: s6.txt.slice(0, 200) });
ok('6b «Везде»: книги архива в общем списке с пометкой «Интернет-архив», русский запрос ищется по-русски', s6.all.length === 4 && s6.all[0] === 'Война и мир. Том 1|Интернет-архив' && /language:\(rus OR Russian\)/.test(qa.q), { all: s6.all, q: qa.q });

ok('нет ошибок страницы и окон', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
const n = checks.filter(Boolean).length; console.log('SUMMARY adv4.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
