// «Страница сайта» (Джессика 13.11: читать сайт как книгу; js/web.js, без новых полей — книга с genre 'Сайт', srcId 'web:<адрес>'):
//  1) «+» → «Страница сайта» открывает шторку: ссылка, вставить текст, файл страницы;
//  2) ссылка на Википедию: статья через API Википедии, без «Примечаний», заголовки в оглавлении, книга открывается в читалке;
//  3) та же ссылка второй раз: «уже на полке», вторая книга не появляется;
//  4) сайт, который пускает приложение (CORS): текст статьи без меню, шапки и подвала;
//  5) сайт, который не пускает: вопрос про Jina Reader, без согласия запроса к службе нет; после нажатия книга из ответа службы;
//  6) вставленный текст становится книгой; слишком короткий — нет;
//  7) сохранённая страница .html и .mhtml («Скачать» в Chrome) через выбор файлов;
//  8) «Поделиться → ReadQuest» ссылкой (сразу «Начало текста») и выделенным текстом (шторка с текстом);
//  15) раскладчик: чистка (меню, счётчики, «читайте также», комментарии) и вид (цитата, подзаголовок, список, код, картинка с подписью);
// 13.11 «давай все»: 9) страницы сайтов не идут в «дочитанные книги» и ачивки за книги; 10) «Обновить с сайта» — новый текст, место сохранено;
//  11) фильтр «Сайты»; 12) одно поле: ссылка или текст; 13) «Больше не спрашивать» про Jina; 14) «Начало текста» и «Отмена» — без записи.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node web.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs'; import os from 'os'; import path from 'path';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CORS = { 'Access-Control-Allow-Origin': '*' };
const P = (n) => Array.from({ length: n }, (_, i) => '<p>Абзац номер ' + (i + 1) + ' о том, как Антон Павлович писал рассказы в Мелихове, принимал больных и сажал вишнёвый сад.</p>').join('');
const WIKI = { parse: { title: 'Чехов, Антон Павлович', displaytitle: '<span>Чехов, Антон Павлович</span>',
  text: '<div class="mw-parser-output"><table class="infobox"><tr><td>Инфобокс-мусор</td></tr></table><div class="hatnote">Не путать с …</div><p>Антон Павлович Чехов — русский писатель.<sup class="reference">[1]</sup></p>' + P(3) +
    '<h2>Биография<span class="mw-editsection">[править]</span></h2>' + P(4) + '<h2>Творчество</h2>' + P(4) + '<h2>Примечания</h2><ol class="references"><li>Сноска-хвост</li></ol><h2>Ссылки</h2><ul><li>Ссылка-хвост</li></ul></div>' } };
const SITE = '<html lang="ru"><head><title>Как читать больше — Блог читателя</title><meta property="og:site_name" content="Блог читателя"></head><body>' +
  '<header><nav><a>Главная</a><a>Меню-мусор</a></nav></header><aside>Реклама-мусор</aside><main><article><h1>Как читать больше</h1>' + P(5) +
  '<h2>Совет первый</h2>' + P(3) + '<ul><li>Читать каждый день</li><li>Носить книгу с собой</li></ul><h2>Совет второй</h2>' + P(3) + '</article></main><footer>Подвал-мусор © 2026</footer><script>var x="скрипт-мусор"</script></body></html>';
const JINA = 'Title: Закрытая статья\n\nURL Source: https://closed.example/article\n\nMarkdown Content:\nЗакрытая статья\n===============\n\n![картинка](https://closed.example/a.png)\n\n' +
  Array.from({ length: 6 }, (_, i) => 'Текст закрытой статьи, абзац ' + (i + 1) + ', с [ссылкой](https://closed.example/x) и **жирным** словом.').join('\n\n') + '\n\n## Вторая часть\n\n* пункт один\n* пункт два\n\nПоследний абзац закрытой статьи.';
// 15) раскладчик: грязная страница — меню, счётчики, «читайте также», комментарии уходят; цитата, список, код, подзаголовок, картинка и подпись остаются
const LONG = (n) => 'Это настоящий длинный абзац статьи номер ' + n + ': в нём больше ста сорока знаков, чтобы раскладчик понял, что перед ним основной текст, а не подпись, меню или счётчик просмотров.';
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005050201a5f645400000000049454e44ae426082', 'hex'), Buffer.alloc(3000)]);
const MESSY = '<html lang="ru"><head><title>Большая статья | Журнал</title><meta property="og:site_name" content="Журнал"></head><body><div class="page"><div class="top"><a href="/">Главная</a> <a href="/news">Новости</a> <a href="/blog">Блоги</a> <a href="/about">О нас</a></div>' +
  '<div class="content"><h1>Большая статья</h1><div class="meta"><span>Иван Автор</span><p>7 мин</p><p>19K</p><p>12 ноября</p></div>' +
  '<p>' + LONG(1) + '</p><img src="https://img.example/pic.png" width="800" height="400" alt="Схема"><figure><figcaption>Подпись к схеме</figcaption></figure><img src="https://img.example/nocors.png" width="800"><img src="/icons/logo.png" width="32">' +
  '<h2>Первая часть</h2><p>' + LONG(2) + '</p><blockquote><p>Чтение — вот лучшее учение.</p></blockquote><h3>Подробности</h3><p>' + LONG(3) + '</p><ol><li>Первый шаг</li><li>Второй шаг</li></ol>' +
  '<pre>function read(book) {\n  return book.pages;\n}</pre><p>Стих первая строка<br>Стих вторая строка</p><h2>Вторая часть</h2><p>' + LONG(4) + '</p>' +
  '<h2>Читайте также</h2><ul><li><a href="/1">Другая статья один</a></li><li><a href="/2">Другая статья два</a></li><li><a href="/3">Другая статья три</a></li></ul>' +
  '<h2>Комментарии 15</h2><p>Вася: отличная статья, спасибо автору за труд!</p></div></div></body></html>';
const MESSY_MD = 'Title: Статья из службы\n\nURL Source: https://closed.example/messy\n\nMarkdown Content:\n[Skip to content](https://closed.example/#main)\n\n* [Главная](https://closed.example/)\n* [Новости](https://closed.example/news)\n* [Блоги](https://closed.example/blog)\n* [Контакты](https://closed.example/c)\n\nСтатья из службы\n================\n\nСредний\n\n7 мин\n\n19K\n\n' +
  LONG(1) + '\n\n![Image 3: Фото](https://img.example/md.png)\n\n## Раздел\n\n> Цитата из статьи.\n\n' + LONG(2) + '\n\n```\nlet x = 1;\n  let y = 2;\n```\n\n1. Раз\n2. Два\n\n' + LONG(3) + '\n\n## Похожие публикации\n\n* [Ещё статья](https://closed.example/a)\n* [И ещё статья](https://closed.example/b)\n\n## Комментарии\n\nКто-то: первый!';
const hits = { wiki: 0, jina: [], closed: 0 }; let SITE_V = SITE;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'ru.wikisource.org') { hits.ws = (hits.ws || 0) + 1; r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ parse: { title: 'Каштанка (Чехов)', displaytitle: 'Каштанка (Чехов)',
    text: '<div class="mw-parser-output"><div class="ws-noexport">Навигация-мусор</div><h2>Глава первая</h2>' + P(3) + '<h2>Глава вторая</h2>' + P(3) + '<h2>Примечания</h2><p>Примечание Чехова к рассказу, его надо сохранить в книге.</p></div>' } }) }); }
  else if (u.host === 'ru.wikipedia.org') { hits.wiki++; r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(WIKI) }); }
  else if (u.host === 'img.example') { hits.img = (hits.img || 0) + 1; if (/nocors/.test(u.pathname)) r.respond({ status: 200, contentType: 'image/png', body: PNG }); else r.respond({ status: 200, contentType: 'image/png', headers: CORS, body: PNG }); }
  else if (u.host === 'open.example' && u.pathname === '/messy') r.respond({ status: 200, contentType: 'text/html; charset=utf-8', headers: CORS, body: MESSY });
  else if (u.host === 'r.jina.ai' && /messy/.test(u.pathname)) r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', headers: CORS, body: MESSY_MD });
  else if (u.host === 'open.example') r.respond({ status: 200, contentType: 'text/html; charset=utf-8', headers: CORS, body: SITE_V });
  else if (u.host === 'closed.example' || u.host === 'closed2.example') { hits.closed++; r.respond({ status: 200, contentType: 'text/html', body: SITE }); } /* без Access-Control-Allow-Origin */
  else if (u.host === 'r.jina.ai') { hits.jina.push(u.pathname); r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', headers: CORS, body: JINA }); }
  else r.continue();
});

const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const books = () => p.evaluate(() => S.userBooks.filter(b => b.genre === 'Сайт').map(b => ({ id: b.id, t: b.title, a: b.author, src: b.srcId || '', toc: (b.toc || []).map(x => x.t), fname: b.fname })));
const text = (id) => p.evaluate((id) => (S.userBooks.find(x => x.id === id) || {}).text || '', id);
const inReader = () => p.evaluate(() => !el('reader').classList.contains('hidden'));
const toLib = async () => { await p.evaluate(async () => { try { await closeReader({ quiet: true }); } catch (e) {} try { show('library'); } catch (e) {} el('bookSheet').classList.add('hidden'); }); await sleep(400); };
const openSheet = async () => { await p.evaluate(() => { el('btnAdd').click(); }); await sleep(200);
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('#addMenu .lso')).find(x => x.dataset.k === 'web'); b && b.click(); }); await sleep(200); };
const type = (v) => p.evaluate((v) => { const i = el('webIn'); i.value = v; i.dispatchEvent(new Event('input')); }, v);
const goBtn = () => p.evaluate(() => ({ t: el('webGo').textContent.trim(), dis: el('webGo').disabled, title: !el('webTitle').hidden }));
const go = async (url, add = true) => { await type(url); await p.evaluate(() => el('webGo').click()); await sleep(1500);
  if (add) { await p.evaluate(() => { const b = el('webAdd'); b && b.click(); }); await sleep(1200); } };

// 1, 12
await p.evaluate(() => { el('btnAdd').click(); }); await sleep(200);
const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#addMenu .lso')).map(x => x.textContent.trim()));
ok('1) в меню «+» есть «Страница сайта»', rows.includes('Страница сайта'), rows);
await p.evaluate(() => { const b = Array.from(document.querySelectorAll('#addMenu .lso')).find(x => x.dataset.k === 'web'); b.click(); }); await sleep(300);
const sh = await p.evaluate(() => ({ open: !el('bookSheet').classList.contains('hidden'), inp: !!el('webIn'), file: !!el('webFile'), old: !!el('webUrl') || !!el('webText') }));
ok('12) шторка: одно поле и файл страницы', sh.open && sh.inp && sh.file && !sh.old, sh);
let g = await goBtn(); ok('12) пустое поле: кнопка «Вставьте ссылку или текст» неактивна', g.dis && /Вставьте ссылку или текст/.test(g.t) && !g.title, g);
await type('ru.wikipedia.org/wiki/Чехов'); g = await goBtn(); ok('12) ссылка без https: «Открыть ссылку как книгу», без поля названия', !g.dis && /Открыть ссылку/.test(g.t) && !g.title, g);
await type('Просто текст с сайта, несколько слов.'); g = await goBtn(); ok('12) текст: «Сделать книгу из текста» и поле названия', /Сделать книгу из текста/.test(g.t) && g.title, g);
fs.mkdirSync('/tmp/rq-web-shots', { recursive: true }); await p.screenshot({ path: '/tmp/rq-web-shots/1-sheet.png' });
ok('1) шторка без горизонтальной прокрутки на 390', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

// 2, 14
await go('https://ru.wikipedia.org/wiki/Чехов,_Антон_Павлович', false);
const pv = await p.evaluate(() => ({ add: !!el('webAdd'), cancel: !!el('webCancel'), pre: (document.querySelector('.webpre') || {}).textContent || '', msg: el('webMsg').textContent, n: S.userBooks.length }));
ok('14) перед добавлением: «Начало текста», «На полку и читать», «Отмена»; на полку ещё не легло', pv.add && pv.cancel && pv.pre.startsWith('Антон Павлович Чехов — русский писатель.') && /Чехов, Антон Павлович/.test(pv.msg) && /минут/.test(pv.msg) && (await books()).length === 0, pv);
await p.screenshot({ path: '/tmp/rq-web-shots/2-preview.png' });
await p.evaluate(() => el('webCancel').click()); await sleep(300);
ok('14) «Отмена»: ничего не записано, превью убрано', (await books()).length === 0 && await p.evaluate(() => !el('webAdd')));
await p.evaluate(() => el('webGo').click()); await sleep(1500); await p.evaluate(() => el('webAdd').click()); await sleep(1500);
let bs = await books();
ok('2) статья Википедии на полке', bs.length === 1 && bs[0].a === 'Википедия' && bs[0].t === 'Чехов, Антон Павлович' && bs[0].src.indexOf('web:https://ru.wikipedia.org/wiki/') === 0, bs);
ok('2) оглавление: Биография, Творчество (без Примечаний)', bs[0] && JSON.stringify(bs[0].toc) === JSON.stringify(['Биография', 'Творчество']), bs[0] && bs[0].toc);
let t = bs[0] ? await text(bs[0].id) : '';
ok('2) текст без названия (оно над текстом), инфобокса, сносок, «[править]» и хвоста', t.startsWith('Антон Павлович Чехов — русский писатель.') && !/Инфобокс|Сноска|Ссылка-хвост|\[1\]|править|Не путать/.test(t), t.slice(0, 160));
ok('2) книга открылась в читалке', await inReader());

// 3
await toLib(); await openSheet(); await go('ru.wikipedia.org/wiki/Чехов,_Антон_Павлович', false);
const m3 = await p.evaluate(() => el('webMsg').textContent);
ok('3) повтор: «уже на полке», книга одна', /уже на полке/.test(m3) && (await books()).length === 1 && hits.wiki === 2, { m3, wiki: hits.wiki });

// 4
await go('https://open.example/blog/kak-chitat');
bs = await books(); const b4 = bs.find(b => b.src === 'web:https://open.example/blog/kak-chitat');
t = b4 ? await text(b4.id) : '';
ok('4) открытый сайт: книга, автор = сайт, название из <h1>', b4 && b4.a === 'Блог читателя' && b4.t === 'Как читать больше', b4);
ok('4) только статья, без повтора названия: без меню, рекламы, подвала, скрипта', t.startsWith('Абзац номер 1') && /• Читать каждый день/.test(t) && !/мусор/.test(t), t.slice(0, 120));
ok('4) оглавление: два совета', b4 && JSON.stringify(b4.toc) === JSON.stringify(['Совет первый', 'Совет второй']), b4 && b4.toc);

// 4b
await toLib(); await openSheet(); await go('https://ru.wikisource.org/wiki/Каштанка_(Чехов)');
bs = await books(); const b4b = bs.find(b => b.a === 'Викитека');
t = b4b ? await text(b4b.id) : '';
ok('4b) Викитека через API: главы в оглавлении, примечания на месте, без навигации', b4b && b4b.t === 'Каштанка (Чехов)' && b4b.toc.join() === 'Глава первая,Глава вторая,Примечания' && /Примечание Чехова/.test(t) && !/мусор/.test(t) && hits.ws === 1, { b4b, ws: hits.ws });

// 5, 13
await toLib(); await openSheet(); await go('https://closed.example/article', false);
const m5 = await p.evaluate(() => ({ msg: el('webMsg').textContent, btn: !!el('webJina'), chk: !!el('webJinaAlways') }));
ok('5) закрытый сайт: вопрос про Jina Reader и «Больше не спрашивать», к службе без согласия не ходили', m5.btn && m5.chk && /Jina Reader/.test(m5.msg) && /уйдёт/.test(m5.msg) && hits.jina.length === 0, { m5, jina: hits.jina });
await p.screenshot({ path: '/tmp/rq-web-shots/5-closed.png' });
await p.evaluate(() => { el('webJinaAlways').checked = true; el('webJina').click(); }); await sleep(1500);
ok('13) галочка: SET.webJina запомнен', await p.evaluate(() => SET.webJina === 1));
await p.evaluate(() => el('webAdd').click()); await sleep(1500);
bs = await books(); const b5 = bs.find(b => b.src === 'web:https://closed.example/article');
t = b5 ? await text(b5.id) : '';
ok('5) через Jina Reader: адрес ушёл службе, книга на полке', hits.jina.length === 1 && hits.jina[0] === '/https://closed.example/article' && b5 && b5.t === 'Закрытая статья' && b5.a === 'closed.example', { jina: hits.jina, b5 });
ok('5) markdown в чистый текст: без картинок, ссылок и звёздочек', t.startsWith('\ufffcimg:0\n\nТекст закрытой статьи, абзац 1, с ссылкой и жирным словом.') && /• пункт два/.test(t) && !/\]\(|\*\*|!\[|https?:/.test(t), t.slice(0, 140));
await toLib(); await openSheet();
ok('13) в шторке видно «Спрашивать снова»', await p.evaluate(() => !!el('webJinaOff')));
await go('https://closed2.example/next', false);
ok('13) следующий закрытый сайт — сразу через Jina, без вопроса', hits.jina.length === 2 && await p.evaluate(() => !el('webJina') && !!el('webAdd')), hits.jina);
await p.evaluate(() => el('webCancel').click());
await p.evaluate(() => el('webJinaOff').click()); await sleep(200);
ok('13) «Спрашивать снова» снимает галочку', await p.evaluate(() => !SET.webJina));

// 6
await toLib(); await openSheet();
const n6 = (await books()).length;
await type('Коротко.'); await p.evaluate(() => el('webGo').click()); await sleep(300);
ok('6) слишком короткий текст — книги нет', (await books()).length === n6);
await type('Заметка о чтении\n\n' + 'Длинный вставленный текст с сайта. '.repeat(20)); await p.evaluate(() => el('webGo').click()); await sleep(1000);
bs = await books(); const b6 = bs.find(b => b.t === 'Заметка о чтении');
ok('6) вставленный текст — книга «Заметка о чтении», открылась', b6 && b6.a === 'Вставленный текст' && !b6.src && await inReader(), b6);

// 7
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rqweb-'));
const fHtml = path.join(dir, 'Сохранённая.html');
fs.writeFileSync(fHtml, '<!-- saved from url=(0035)https://saved.example/page/one -->\n' + SITE.replace('Как читать больше — Блог читателя', 'Сохранённая статья').replace('<h1>Как читать больше</h1>', '<h1>Сохранённая статья</h1>').replace(' content="Блог читателя"', ' content="Сохранёнка"'));
const qp = (s) => Buffer.from(s, 'utf8').toString('binary').replace(/[^\x20-\x3c\x3e-\x7e]/g, c => '=' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).replace(/(.{70})/g, '$1=\r\n');
const fMht = path.join(dir, 'Страница.mhtml');
fs.writeFileSync(fMht, 'From: <Saved by Blink>\r\nSnapshot-Content-Location: https://mht.example/story\r\nSubject: Story\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related;\r\n\ttype="text/html";\r\n\tboundary="----MultipartBoundary--abc----"\r\n\r\n\r\n------MultipartBoundary--abc----\r\nContent-Type: text/html\r\nContent-ID: <frame-1@mhtml.blink>\r\nContent-Transfer-Encoding: quoted-printable\r\nContent-Location: https://mht.example/story\r\n\r\n' +
  qp(SITE.replace('<h1>Как читать больше</h1>', '<h1>История из MHTML</h1>').replace(' content="Блог читателя"', ' content="МХТ"')) + '\r\n------MultipartBoundary--abc----\r\nContent-Type: text/css\r\nContent-Location: https://mht.example/a.css\r\n\r\nbody{}\r\n------MultipartBoundary--abc------\r\n', 'binary');
await toLib();
const inp = await p.$('#fileInp');
await inp.uploadFile(fHtml); await sleep(1500);
await toLib();
await inp.uploadFile(fMht); await sleep(1500);
bs = await books();
const b7 = bs.find(b => b.src === 'web:https://saved.example/page/one'), b8 = bs.find(b => b.src === 'web:https://mht.example/story');
ok('7) сохранённая .html: книга с адресом и названием', b7 && b7.t === 'Сохранённая статья' && b7.a === 'Сохранёнка' && b7.fname === 'Сохранённая.html', b7);
t = b8 ? await text(b8.id) : '';
ok('7) .mhtml (quoted-printable, кириллица): книга, текст без мусора', b8 && b8.t === 'История из MHTML' && b8.a === 'МХТ' && t.indexOf('Абзац номер 1 о том, как Антон Павлович') === 0 && !/мусор|=D0/.test(t), { b8, t: t.slice(0, 100) });

// 8
await toLib();
const putShare = (o) => p.evaluate(async (o) => { const c = await caches.open((window.RQ_NS || 'rq') + '_share'); await c.put(new Request('share/' + Date.now() + '-web'), new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'X-RQ-Web': '1' } })); }, o);
await putShare({ title: 'Блог', text: 'Посмотри https://open.example/second', url: '' });
await p.goto(BASE + '?share=1', { waitUntil: 'load' }); await boot(); await sleep(1500);
const s8a = await p.evaluate(() => ({ v: el('webIn') && el('webIn').value, add: !!el('webAdd') }));
await p.evaluate(() => el('webAdd') && el('webAdd').click()); await sleep(1200);
bs = await books();
ok('8) поделились ссылкой: ссылка в поле, «Начало текста», после нажатия на полке', s8a.v === 'https://open.example/second' && s8a.add && bs.some(b => b.src === 'web:https://open.example/second'), { s8a, src: bs.map(b => b.src) });
await toLib();
await putShare({ title: 'Отрывок', text: 'Выделенный кусок статьи. '.repeat(20), url: 'https://open.example/third' });
await p.goto(BASE + '?share=1', { waitUntil: 'load' }); await boot(); await sleep(800);
const s8 = await p.evaluate(() => ({ open: !el('bookSheet').classList.contains('hidden'), t: el('webIn') && el('webIn').value.slice(0, 25), ttl: el('webTitle') && !el('webTitle').hidden && el('webTitle').value }));
ok('8) поделились выделенным текстом: шторка с текстом и названием', s8.open && s8.t === 'Выделенный кусок статьи. ' && s8.ttl === 'Отрывок', s8);
await p.evaluate(() => el('webGo').click()); await sleep(800);
bs = await books();
ok('8) из текста — книга «Отрывок» с адресом страницы', bs.some(b => b.t === 'Отрывок' && b.src === 'web:https://open.example/third' && b.a === 'open.example'), bs.filter(b => b.t === 'Отрывок'));
const left = await p.evaluate(async () => (await (await caches.open((window.RQ_NS || 'rq') + '_share')).keys()).length);
ok('8) общий кэш «Поделиться» пустой', left === 0, left);


// 9: страница сайта дочитана — «Прочитано» на полке, но не в счёт дочитанных книг и ачивок за книги
await toLib();
const r9 = await p.evaluate(() => { const w = S.userBooks.find(b => b.genre === 'Сайт'); const before = rqFinBooks().length; S.finished.push(w.id); S.finishDates[w.id] = today();
  const inp = achInput(); const fin = rqFinBooks().length; const st = bookStatus ? bookStatus(w.id) : '';
  const res = { before, fin, inAch: inp.finished.indexOf(w.id) >= 0, st, isWeb: rqIsWebBook(w), src: (inp.books.find(b => b.id === w.id) || {}).src };
  S.finished.pop(); delete S.finishDates[w.id]; return res; });
ok('9) дочитанная страница сайта: на полке «Прочитано», в дочитанные книги и ачивки не идёт', r9.isWeb && r9.fin === r9.before && !r9.inAch && r9.st === 'done' && r9.src === 'web', r9);
const r9b = await p.evaluate(() => { const qs = (typeof QUESTS !== 'undefined' ? QUESTS : []).filter(q => /^finish2$|^chain1$/.test(q.id)).map(q => q.info()); return qs; });
ok('9) задания «Дочитать книгу» считают только книги', r9b.every(x => /^0 \//.test(x)), r9b);

// 11: фильтр «Сайты»
await p.evaluate(() => libFilterPick('web')); await sleep(400);
const r11 = await p.evaluate(() => ({ title: el('libTitle').textContent, web: S.userBooks.filter(rqIsWebBook).map(b => b.title).sort(),
  shown: Array.from(document.querySelectorAll('#shelf .bookcard .btitle')).map(x => x.textContent.trim()).sort() }));
ok('11) фильтр «Сайты»: только страницы сайтов', r11.title === 'Сайты' && r11.shown.length > 0 && JSON.stringify(r11.shown) === JSON.stringify(r11.web), r11);
await p.screenshot({ path: '/tmp/rq-web-shots/11-filter.png' });
await p.evaluate(() => libFilterPick('all')); await sleep(200);

// 10: «Обновить с сайта» — место в тексте сохраняется
const b10 = (await books()).find(b => b.src === 'web:https://open.example/blog/kak-chitat');
await p.evaluate((id) => { const b = S.userBooks.find(x => x.id === id); const at = b.text.indexOf('Абзац номер 1 о том', b.text.indexOf('Совет второй')); S.progress[id] = Object.assign(S.progress[id] || {}, { pos: at / b.text.length, ratio: at / b.text.length }); save(); bookInfo(id); }, b10.id);
await sleep(300);
const c10 = await p.evaluate(() => ({ ref: !!el('webRef'), link: (document.querySelector('#bookSheetBody a.bk-line') || {}).href || '' }));
ok('10) в карточке: «Обновить с сайта» и «Открыть на сайте»', c10.ref && c10.link === 'https://open.example/blog/kak-chitat', c10);
await p.screenshot({ path: '/tmp/rq-web-shots/10-card.png' });
await p.evaluate(() => el('webRef').click()); await sleep(1500);
ok('10) сайт не менялся: «ничего не изменилось»', /ничего не изменилось/.test(await p.evaluate(() => el('webRefMsg').textContent)));
SITE_V = SITE.replace('<h1>Как читать больше</h1>', '<h1>Как читать больше</h1><p>Новое вступление: статью дополнили большим абзацем в самом начале, чтобы проверить, что место в тексте не потеряется.</p>');
const before10 = await p.evaluate((id) => { const b = S.userBooks.find(x => x.id === id); const at = Math.floor(S.progress[id].pos * b.text.length); return b.text.slice(at, at + 40); }, b10.id);
await p.evaluate(() => el('webRef').click()); await sleep(1500);
const r10 = await p.evaluate(async (id) => { const b = S.userBooks.find(x => x.id === id); const at = Math.floor(S.progress[id].pos * b.text.length);
  return { here: b.text.slice(at, at + 40), starts: b.text.slice(0, 30), idb: ((await __rq.idb.getText(id)) || '').slice(0, 30), pos: S.progress[id].pos, ratio: S.progress[id].ratio }; }, b10.id);
ok('10) обновлено: новый текст в книге и в хранилище, место то же', r10.starts.startsWith('Новое вступление') && r10.idb.startsWith('Новое вступление') && r10.here.trim().slice(0, 30) === before10.trim().slice(0, 30) && r10.ratio >= r10.pos, { r10, before10 });

// 15: раскладчик
await p.evaluate(() => { el('bookSheet').classList.add('hidden'); }); await toLib(); await openSheet(); await go('https://open.example/messy');
bs = await books(); const b15 = bs.find(b => b.src === 'web:https://open.example/messy'); t = b15 ? await text(b15.id) : '';
ok('15) название из <h1>, автор = сайт, оглавление из h2 без «Читайте также» и «Комментариев»', b15 && b15.t === 'Большая статья' && b15.a === 'Журнал' && b15.toc.join() === 'Первая часть,Вторая часть', b15);
ok('15) убрано: меню, автор и счётчики над статьёй, «Читайте также», комментарии, логотип', t.startsWith('Это настоящий длинный абзац статьи номер 1') && !/Главная|Новости|7 мин|19K|12 ноября|Иван Автор|Другая статья|Вася|Комментарии|Читайте также/.test(t), t.slice(0, 200));
ok('15) осталось: цитата, подзаголовок, список 1. 2., код с отступом, стих, картинка и подпись', t.includes('⁡Чтение — вот лучшее учение.') && t.includes('⁢Подробности') && t.includes('1. Первый шаг\n\n2. Второй шаг') && t.includes('⁡⁢function read(book) {\n⁡⁢  return book.pages;\n⁡⁢}') && t.includes('Стих первая строка\nСтих вторая строка') && t.includes('￼img:0\n\n⁤Подпись к схеме') && t.includes('￼img:1') && !t.includes('img:2'), JSON.stringify(t.slice(150, 420)));
const im15 = await p.evaluate(async (id) => ({ a: !!(await idbGet('img:' + id + ':0')), b: !!(await idbGet('img:' + id + ':1')) }), b15.id);
ok('15) картинка, которую сайт отдаёт, сохранена в телефон; закрытая — нет', im15.a && !im15.b, im15);
await sleep(1200);
const r15 = await p.evaluate(() => { const c = el('content'), q = (s) => c.querySelector(s); const cs = (s, k) => q(s) ? getComputedStyle(q(s))[k] : null;
  return { reader: !el('reader').classList.contains('hidden'), wp: c.querySelectorAll('p.rq-wp').length, indent: cs('p.rq-wp', 'textIndent'), q: !!q('p.rq-q'), qStyle: cs('p.rq-q', 'fontStyle'), h2: cs('p.rq-h2', 'fontWeight'), li: c.querySelectorAll('p.rq-li.rq-ol').length,
    pre: cs('p.rq-pre', 'whiteSpace'), cap: !!q('p.rq-cap'), vs: !!q('p.rq-wp.rq-vs'), h: c.querySelectorAll('p.rq-h').length, imgShown: c.querySelectorAll('p.rq-img:not(.gone) img').length, imgGone: c.querySelectorAll('p.rq-img.gone').length }; });
ok('15) читалка: абзацы без красной строки, цитата курсивом, подзаголовок жирный, нумерованный список, код моноширинно, подпись, стих', r15.reader && r15.wp >= 8 && r15.indent === '0px' && r15.q && r15.qStyle === 'italic' && +r15.h2 >= 700 && r15.li === 2 && /pre-wrap/.test(r15.pre) && r15.cap && r15.vs && r15.h === 2, r15);
ok('15) читалка: сохранённая картинка видна, несохранённая спрятана', r15.imgShown === 1 && r15.imgGone === 1, r15);
await p.screenshot({ path: '/tmp/rq-web-shots/15-layout.png' });
await toLib(); await openSheet(); await go('https://closed.example/messy', false); await p.evaluate(() => el('webJina').click()); await sleep(1500);
const pv15 = await p.evaluate(() => (document.querySelector('.webpre') || {}).textContent || '');
ok('15) «Начало текста» без служебных знаков и строк картинок', pv15.startsWith('Это настоящий длинный абзац статьи номер 1') && !/[⁡⁢⁤￼]/.test(pv15), pv15.slice(0, 80));
await p.evaluate(() => el('webAdd').click()); await sleep(1800);
bs = await books(); const b15m = bs.find(b => b.src === 'web:https://closed.example/messy'); t = b15m ? await text(b15m.id) : '';
ok('15) служба (markdown): название, без меню, счётчиков, «Похожих» и комментариев', b15m && b15m.t === 'Статья из службы' && t.startsWith('Это настоящий длинный абзац статьи номер 1') && !/Skip to|Главная|Контакты|Средний|7 мин|19K|Ещё статья|первый!|Похожие|Комментарии/.test(t), t.slice(0, 120));
ok('15) служба: цитата, код с отступом, список, картинка на месте', t.includes('⁡Цитата из статьи.') && t.includes('⁡⁢let x = 1;\n⁡⁢  let y = 2;') && t.includes('1. Раз\n\n2. Два') && t.includes('￼img:0'), JSON.stringify(t.slice(180, 330)));

ok('нет ошибок страницы', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\nweb: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
