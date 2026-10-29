// «Приключения», волна 4 (Джессика 25.10, «Давай все кроме первого»; arch.md 25.10):
//  1) старая орфография → современная при скачивании (текст, оглавление, название), современные книги не трогаются;
//  2) новые подборки: Серебряный век, мифы и легенды, детективы, русская фантастика;
//  3) «Вам может понравиться» по прочитанному, без сети;
//  4) испытания месяца: прогресс по дочитанным книгам, «Забрать» даёт монеты один раз, значок «Испытатель»;
//  5) каталог без интернета: последний список и открытая карточка видны без сети, и после перезапуска;
//  6) оригинал и перевод по абзацам: отдельная книга «· с переводом», перевод под каждым абзацем (движок перевода подменён).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node adv5.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CORS = { 'Access-Control-Allow-Origin': '*' };
const DOCS = [
  { identifier: 'tolstoy1912', title: 'Война и миръ', creator: 'Толстой, Лев Николаевич (1828-1910)', year: 1912, language: 'rus' },
  { identifier: 'alice1900', title: 'Alice\'s Adventures in Wonderland', creator: 'Carroll, Lewis (1832-1898)', year: 1900, language: 'eng' }];
const META = {
  tolstoy1912: { metadata: { title: 'Война и миръ', creator: 'Толстой, Лев Николаевич (1828-1910)', date: '1912', language: 'rus', collection: ['booksbylanguage'] }, files: [{ name: 'tolstoy1912_djvu.txt', format: 'DjVuTXT', size: '300000' }] },
  alice1900: { metadata: { title: 'Alice\'s Adventures in Wonderland', creator: 'Carroll, Lewis (1832-1898)', date: '1900', language: 'eng', collection: ['americana'] }, files: [{ name: 'alice1900_djvu.txt', format: 'DjVuTXT', size: '150000' }] }
};
const EN = ['Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.',
  'Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.',
  'So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble.'];
const ALICE = Array.from({ length: 8 }, () => EN.join('\n\n')).join('\n\n');
const net = { off: false, q: 0 };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'archive.org') {
    if (net.off) { r.abort('internetdisconnected'); return; }
    if (u.pathname === '/advancedsearch.php') { net.q++; const q = u.searchParams.get('q');
      const docs = /толстой/i.test(q) ? DOCS.slice(0, 1) : /carroll|alice/i.test(q) ? DOCS.slice(1) : [];
      r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ responseHeader: { status: 0 }, response: { numFound: docs.length, start: 0, docs } }) }); }
    else if (u.pathname.indexOf('/metadata/') === 0) r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(META[decodeURIComponent(u.pathname.slice(10))] || {}) });
    else if (u.pathname.indexOf('/download/') === 0) r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', headers: CORS, body: ALICE });
    else r.respond({ status: 404, headers: CORS, body: '' });
  } else if (u.host === 'ru.wikisource.org') r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(u.searchParams.get('action') === 'opensearch' ? ['', [], [], []] : { query: { search: [], pages: [] } }) });
  else if (u.host === 'www.gutenberg.org') r.respond({ status: 200, contentType: 'application/atom+xml; charset=UTF-8', headers: CORS, body: '<feed xmlns="http://www.w3.org/2005/Atom"></feed>' });
  else if (u.host === 'standardebooks.org') r.respond({ status: 200, contentType: 'text/html', headers: CORS, body: '<html><body><ol class="ebooks-list list"></ol></body></html>' });
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();

// 1. old spelling
const s1 = await p.evaluate(async () => {
  const r = { conv: advModern('Въ лѣсу онѣ видѣли синяго моря и бѣлыя птицы; разсказъ о нея. Сантьяго и благо'), keep: advModernIf('Сантьяго, Ромео и Джульетта'), title: advModernIf('Война и миръ') };
  const ch2 = 'Глава вторая\n\nОнъ пришёлъ домой и сѣлъ у окна. ';
  const body = 'Глава первая\n\n' + 'Въ этомъ городѣ жилъ одинъ человѣкъ, и всѣ его знали. '.repeat(30) + '\n\n';
  const book = { title: 'Повѣсть о человѣкѣ', author: 'Авторъ', text: body + ch2.repeat(10), toc: [{ t: 'Глава первая', off: 0 }, { t: 'Глава вторая', off: body.length }], lang: 'ru' };
  const b = await advAddBook({ sid: 'wikisource:Повесть (Тест)' }, ADV_SRC.wikisource, book);
  const bk = S.userBooks.find(x => x.id === b.id), txt = (await __rq.idb.get('text:' + b.id).catch(() => '')) || bk.text || '';
  r.book = { t: bk.title, a: bk.author, head: txt.slice(0, 60), old: /[ѣі]|ъ(?![а-яё])/.test(txt), toc2: txt.slice(bk.toc[1].off, bk.toc[1].off + 12) };
  const modern = { title: 'Рассказ', author: 'Чехов', text: 'Сантьяго пришёл домой. '.repeat(100), lang: 'ru' };
  const b2 = await advAddBook({ sid: 'wikisource:Рассказ (Тест)' }, ADV_SRC.wikisource, modern);
  r.modern = ((await __rq.idb.get('text:' + b2.id).catch(() => '')) || S.userBooks.find(x => x.id === b2.id).text || '').slice(0, 22);
  S.userBooks = S.userBooks.filter(x => x.id !== b.id && x.id !== b2.id); save(); return r; });
ok('1a замена: ѣ→е, ъ на конце убран, «онѣ»→«они», «синяго»→«синего», «бѣлыя»→«белые», «разсказъ»→«рассказ», «нея»→«неё»; «Сантьяго» и «благо» не тронуты', s1.conv === 'В лесу они видели синего моря и белые птицы; рассказ о неё. Сантьяго и благо' && s1.keep === 'Сантьяго, Ромео и Джульетта' && s1.title === 'Война и мир', s1);
ok('1b книга в старой орфографии на полке современным письмом: текст, название, автор, оглавление попадает в свою главу', s1.book.t === 'Повесть о человеке' && s1.book.a === 'Автор' && !s1.book.old && /^Глава первая\n\nВ этом городе жил один человек/.test(s1.book.head) && s1.book.toc2 === 'Глава вторая', s1.book);
ok('1c современная книга не меняется', s1.modern === 'Сантьяго пришёл домой.', s1.modern);

// 2. collections
const s2 = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300));
  const sets = Array.from(document.querySelectorAll('#advList .advset')).map(b => b.dataset.set + '|' + b.querySelector('b').textContent);
  document.querySelector('#advList .advset[data-set="detect"]').click(); await new Promise(r => setTimeout(r, 200));
  const rows = Array.from(document.querySelectorAll('#advList .advrow')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advauth').textContent);
  el('advBack').click(); await new Promise(r => setTimeout(r, 100));
  const pages = ADV_SETS.filter(x => x.pages).flatMap(x => x.pages), dup = pages.filter((x, i) => pages.indexOf(x) !== i);
  const bad = ['silver', 'myths', 'detect', 'scifi'].flatMap(id => ADV_SETS.find(x => x.id === id).pages).filter(pg => /[,\d]/.test(advWsName(pg).a));
  return { sets, rows, dup, bad, icons: ['silver', 'myths', 'detect', 'scifi'].map(id => !!document.getElementById('i-' + ADV_SETS.find(x => x.id === id).ic)) }; });
ok('2 четыре новые подборки со значками; «Детективы» открываются списком (Дойль, По, Чехов); книги в подборках не повторяются, автор в названии страницы без лишнего', ['silver|Серебряный век', 'myths|Мифы и легенды', 'detect|Детективы', 'scifi|Русская фантастика'].every(x => s2.sets.includes(x)) &&
  s2.rows[0] === 'Пёстрая лента|Дойль' && s2.rows.some(x => x === 'Убийство на улице Морг|По · пер. Бальмонт') && s2.rows.length === 7 && !s2.dup.length && !s2.bad.length && s2.icons.every(Boolean), s2);

// 3. recommendations
const s3 = await p.evaluate(async () => {
  const none = document.querySelector('#advList .advrec') ? 'есть' : '';
  S.userBooks.push({ id: 'u-pd', title: 'Пиковая дама', author: 'Пушкин', srcId: 'wikisource:Пиковая дама (Пушкин)', text: 'x', size: 1 },
    { id: 'u-bl', title: 'Двенадцать', author: 'Блок', srcId: 'wikisource:Двенадцать (Блок)', text: 'x', size: 1 }); save();
  advRenderList(); await new Promise(r => setTimeout(r, 100));
  const rows = Array.from(document.querySelectorAll('#advList .advrec')).map(b => b.querySelector('b').textContent + '|' + b.querySelector('.advwhy').textContent);
  document.querySelector('#advList .advrec').click(); await new Promise(r => setTimeout(r, 100));
  const sid = advCur && advCur.it.sid; el('bookSheet').classList.add('hidden');
  return { none, rows, sid, first: advRecs()[0].it.sid }; });
ok('3 «Вам может понравиться»: пусто без книг на полке; потом три книги — сначала авторы, которых читали («Вы читали: Пушкин»), потом из начатой подборки; уже скачанные не предлагаются; открывается карточка', !s3.none && s3.rows.length === 3 &&
  /\|Вы читали: Пушкин$/.test(s3.rows[0]) && s3.rows.every(x => /\|(Вы читали: (Пушкин|Блок)|Из подборки «Серебряный век»)$/.test(x)) && !s3.rows.some(x => /^(Пиковая дама|Двенадцать)\|/.test(x)) && s3.sid === s3.first, s3);

// 4. monthly challenges
const s4 = await p.evaluate(async () => {
  const m = advMonth(), now = advQuestsNow(), r = { ids: now.map(q => q.id) };
  r.before = Array.from(document.querySelectorAll('#advList .advq')).map(b => b.querySelector('b').textContent + '|' + (b.querySelector('.chip,.advqget') || {}).textContent);
  const mk = (id, a, sid) => ({ id, title: id, author: a, srcId: sid, text: 'x', size: 1 });
  S.userBooks.push(mk('q1', 'Гоголь', 'wikisource:Шинель (Гоголь)'), mk('q2', 'Тургенев', 'wikisource:Муму (Тургенев)'), mk('q3', 'Андерсен', 'wikisource:Огниво (Андерсен; Ганзен)'),
    mk('q4', 'Гомер', 'wikisource:Илиада (Гомер)'), mk('q5', 'Mark Twain', 'se:mark-twain/tom-sawyer'));
  S.finished = (S.finished || []).concat(['q1', 'q2', 'q3', 'q4', 'q5']); S.finishDates = Object.assign({}, S.finishDates, { q1: m + '-01', q2: m + '-02', q3: m + '-03', q4: m + '-04', q5: m + '-05' });
  S.claimed = {}; S.gold = 100; S.goldAllTime = 100; save(); advRenderList(); await new Promise(r => setTimeout(r, 100));
  r.ready = document.querySelectorAll('#advList .advqget').length;
  const q0 = now[0]; document.querySelector('#advList .advqget[data-q="' + q0.id + '"]').click(); await new Promise(r => setTimeout(r, 100));
  r.gold = S.gold; r.all = S.goldAllTime; r.key = Object.keys(S.claimed); r.got = (document.querySelector('#advList .advq.done .chip') || {}).textContent; r.claimed = advQuestsClaimed();
  advQuestClaim(q0.id); r.gold2 = S.gold; r.want = q0.gold;
  const A = RQAch.evaluate(achInput()); r.ach = !!(A.advq1 && A.advq1.done);
  return r; });
ok('4a три испытания месяца с прогрессом «0 из N» на первом экране', s4.before.length === 3 && s4.before.every(x => /\|0 из \d$/.test(x)), s4.before);
ok('4b дочитанные книги закрывают испытания: «Забрать +N монет» даёт монеты один раз, отметка «advq-<id>:<месяц>» в claimed, «Получено», значок «Испытатель»', s4.ready === 3 && s4.gold === 100 + s4.want && s4.all === 100 + s4.want && s4.gold2 === s4.gold &&
  s4.key.length === 1 && /^advq-[a-z0-9]+:\d{4}-\d{2}$/.test(s4.key[0]) && /Получено/.test(s4.got) && s4.claimed === 1 && s4.ach, s4);

// 5. catalogue without the network
const s5 = await p.evaluate(async () => { advSwitch('ia'); el('advQ').value = 'Толстой'; ADV.q = 'Толстой'; await advSearch();
  const it = ADV.items[0]; advOpen(it); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  el('bookSheet').classList.add('hidden'); await new Promise(r => setTimeout(r, 300)); return { n: ADV.items.length, t: it && it.t }; });
net.off = true;
const s5b = await p.evaluate(async () => { ADV.items = []; await advSearch();
  const r = { n: ADV.items.length, note: (document.querySelector('#advList .advoffl') || {}).textContent, err: ADV.err };
  advOpen(ADV.items[0]); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  r.card = el('bookSheetBody').textContent; el('bookSheet').classList.add('hidden');
  ADV.q = 'Чехов'; await advSearch(); r.other = ADV.err; return r; });
await p.reload({ waitUntil: 'load' }); await boot();
const s5c = await p.evaluate(async () => { navGo('adv'); await new Promise(r => setTimeout(r, 300)); advSwitch('ia'); el('advQ').value = 'Толстой'; ADV.q = 'Толстой'; await advSearch();
  advOpen(ADV.items[0]); for (let i = 0; i < 150 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const card = el('bookSheetBody').textContent; el('bookSheet').classList.add('hidden');
  return { card, n: ADV.items.length, note: !!document.querySelector('#advList .advoffl'), cat: await __rq.idb.get('advcat').then(v => v && v.v === 1 && v.lists.length >= 1 && v.cards.length >= 1) }; });
net.off = false;
ok('5a без сети: последний найденный список показан с пометкой «Нет сети: показано сохранённое <дата>»', s5.n === 1 && s5b.n === 1 && /^ Нет сети: показано сохранённое \d+ [а-я]+$/.test(s5b.note || '') && !s5b.err, { s5, s5b });
ok('5b без сети (после перезапуска): открытая раньше карточка видна (права, год) с той же пометкой; незнакомый запрос — прежняя ошибка «Нет сети…»/«не ответила»', /1912/.test(s5b.card) && /Нет сети: показано сохранённое/.test(s5c.card) && /Издание1912 год/.test(s5c.card) && /ПраваИздано до 1930 года/.test(s5c.card) && !!s5b.other, { card: s5c.card.slice(-400), other: s5b.other });
ok('5c после перезапуска без сети и список берётся из IDB (advcat v1: lists и cards)', s5c.n === 1 && s5c.note && s5c.cat, s5c);

// 6. original and translation
const s6 = await p.evaluate(async () => {
  window.__tr = { st: 0, dl: 0, n: 0 };
  window.trState = async (f, t) => { __tr.st++; __tr.pair = f + t; return { path: [f + t], have: false, mb: 20 }; };
  window.trDownload = async (path, onp) => { __tr.dl++; onp(0.5); onp(1); };
  window.trEngine = async () => ({ translate: async (q) => { __tr.n++; return { target: { text: '[ru] ' + q.text.split(' ').slice(0, 3).join(' ') } }; } });
  advSwitch('ia'); el('advQ').value = 'Carroll'; ADV.q = 'Carroll'; await advSearch();
  const it = ADV.items[0]; advOpen(it); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  const r = { btn: (el('advGetBi') || {}).textContent, note: (document.querySelector('.advbinote') || {}).textContent, get: !!el('advGet') };
  await advGetBi(); await new Promise(r => setTimeout(r, 300));
  const bk = S.userBooks.find(x => x.srcId === 'ia:alice1900#bi'); r.book = bk && { t: bk.title, lang: bk.lang };
  const txt = bk ? ((await __rq.idb.get('text:' + bk.id).catch(() => '')) || bk.text || '') : '', ps = txt.split(/\n\n+/);
  r.pairs = ps.slice(0, 4); r.tr = ps.filter(x => x.charCodeAt(0) === 0x2063).length; r.orig = ps.filter(x => x.charCodeAt(0) !== 0x2063).length;
  r.reader = !el('reader').classList.contains('hidden'); const tp = document.querySelector('#content p.rq-bitr');
  r.p = tp && { lang: tp.lang, it: getComputedStyle(tp).fontStyle };
  if (r.reader) await closeReader({ quiet: true });
  advOpen(it); for (let i = 0; i < 40 && !(advCur && advCur.inf); i++) await new Promise(r => setTimeout(r, 100));
  r.after = Array.from(el('bookSheetBody').querySelectorAll('button')).map(b => b.textContent.trim()); el('bookSheet').classList.add('hidden');
  r.tr0 = Object.assign({}, __tr); return r; });
ok('6a карточка английской книги: «Скачать с переводом по абзацам» рядом с обычным скачиванием, пояснение про перевод на телефоне и предел слов', /Скачать с переводом по абзацам/.test(s6.btn) && s6.get && /Под каждым абзацем будет перевод на русский/.test(s6.note) && /25 тысяч слов/.test(s6.note), s6);
ok('6b пакет языка en→ru скачан, отдельная книга «… · с переводом» (srcId …#bi, язык en): за каждым абзацем его перевод', s6.tr0.pair === 'enru' && s6.tr0.dl === 1 && s6.book && / · с переводом$/.test(s6.book.t) && s6.book.lang === 'en' &&
  s6.tr === s6.orig && s6.tr === s6.tr0.n && s6.tr >= 20 && s6.pairs[1] === '⁣[ru] ' + s6.pairs[0].split(' ').slice(0, 3).join(' ') && s6.pairs[3].charCodeAt(0) === 0x2063, s6);
ok('6c в читалке перевод отдельным абзацем курсивом с lang=ru; в карточке потом «Читать с переводом», обычное скачивание осталось', s6.reader && s6.p && s6.p.lang === 'ru' && s6.p.it === 'italic' &&
  s6.after.includes('Читать с переводом') && s6.after.some(x => /Скачать на телефон и читать/.test(x)), { p: s6.p, after: s6.after });

// 7. portraits (28.10: «гораздо больше портретов»)
const s7 = await p.evaluate(async () => { el('bookSheet').classList.add('hidden'); navGo('adv'); advSwitch('all'); ADV.q = ''; el('advQ').value = ''; advRenderList(); await new Promise(r => setTimeout(r, 200));
  const faces = Array.from(document.querySelectorAll('#advList .advfaces .advface'));
  const srcs = faces.map(b => b.querySelector('img').getAttribute('src'));
  const ok = await Promise.all(srcs.map(u => fetch(u).then(r => r.ok && r.headers.get('content-type') !== 'text/html').catch(() => false)));
  const o1 = advFaces().map(x => x[1]).join(); advRenderList(); const o1b = Array.from(document.querySelectorAll('#advList .advface img')).map(i => i.getAttribute('src').replace(/^.*\/|\.webp$/g, '')).join();
  openAdv(); await new Promise(r => setTimeout(r, 100)); const o2 = advFaces().map(x => x[1]).join();
  const women = ['ebronte', 'woolf', 'dickinson', 'teffi', 'gippius', 'sand', 'austen', 'tsvetaeva'].filter(k => srcs.some(u => u.indexOf('/' + k + '.webp') >= 0)).length;
  await advAuthor('Тэффи'); for (let i = 0; i < 30 && ADV.busy; i++) await new Promise(r => setTimeout(r, 100));
  return { n: faces.length, uniq: new Set(srcs).size, bad: srcs.filter((u, i) => !ok[i]), a: o1 === o1b, b: o1 !== o2, women, fallback: { q: ADV.q, set: ADV.set, err: ADV.err } }; });
ok('7 «Авторы»: больше 80 портретов, есть писательницы, файлы на месте, без повторов; порядок новый при каждом открытии «Приключений» и не скачет при перерисовке; автор без страницы на Викитеке ищется по имени', s7.n >= 80 && s7.women >= 6 && s7.uniq === s7.n && !s7.bad.length && s7.a && s7.b && s7.fallback.q === 'Тэффи' && s7.fallback.set === null, s7);

ok('нет ошибок страницы и окон', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
const n = checks.filter(Boolean).length; console.log('SUMMARY adv5.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
