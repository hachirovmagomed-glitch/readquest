// «Страница сайта» (Джессика 13.11: читать сайт как книгу; js/web.js, без новых полей — книга с genre 'Сайт', srcId 'web:<адрес>'):
//  1) «+» → «Страница сайта» открывает шторку: ссылка, вставить текст, файл страницы;
//  2) ссылка на Википедию: статья через API Википедии, без «Примечаний», заголовки в оглавлении, книга открывается в читалке;
//  3) та же ссылка второй раз: «уже на полке», вторая книга не появляется;
//  4) сайт, который пускает приложение (CORS): текст статьи без меню, шапки и подвала;
//  5) сайт, который не пускает: вопрос про Jina Reader, без согласия запроса к службе нет; после нажатия книга из ответа службы;
//  6) вставленный текст становится книгой; слишком короткий — нет;
//  7) сохранённая страница .html и .mhtml («Скачать» в Chrome) через выбор файлов;
//  8) «Поделиться → ReadQuest» ссылкой (открывается сразу) и выделенным текстом (шторка с текстом).
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
const hits = { wiki: 0, jina: [], closed: 0 };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setRequestInterception(true);
p.on('request', r => {
  const u = new URL(r.url());
  if (u.host === 'ru.wikipedia.org') { hits.wiki++; r.respond({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(WIKI) }); }
  else if (u.host === 'open.example') r.respond({ status: 200, contentType: 'text/html; charset=utf-8', headers: CORS, body: SITE });
  else if (u.host === 'closed.example') { hits.closed++; r.respond({ status: 200, contentType: 'text/html', body: SITE }); } /* без Access-Control-Allow-Origin */
  else if (u.host === 'r.jina.ai') { hits.jina.push(u.pathname); r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', headers: CORS, body: JINA }); }
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const books = () => p.evaluate(() => S.userBooks.filter(b => b.genre === 'Сайт').map(b => ({ id: b.id, t: b.title, a: b.author, src: b.srcId || '', toc: (b.toc || []).map(x => x.t), fname: b.fname })));
const text = (id) => p.evaluate(async (id) => { const b = S.userBooks.find(x => x.id === id); return b.text || ''; }, id);
const inReader = () => p.evaluate(() => !el('reader').classList.contains('hidden'));
const toLib = async () => { await p.evaluate(() => { try { closeReader(); } catch (e) {} try { show('library'); } catch (e) {} el('bookSheet').classList.add('hidden'); }); await sleep(400); };
const openSheet = async () => { await p.evaluate(() => { el('btnAdd').click(); }); await sleep(200);
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('#addMenu .lso')).find(x => x.dataset.k === 'web'); b && b.click(); }); await sleep(200); };
const go = async (url) => { await p.evaluate((u) => { el('webUrl').value = u; el('webGo').click(); }, url); };

// 1
await p.evaluate(() => { el('btnAdd').click(); }); await sleep(200);
const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#addMenu .lso')).map(x => x.textContent.trim()));
ok('1) в меню «+» есть «Страница сайта»', rows.includes('Страница сайта'), rows);
await p.evaluate(() => { const b = Array.from(document.querySelectorAll('#addMenu .lso')).find(x => x.dataset.k === 'web'); b.click(); }); await sleep(300);
const sh = await p.evaluate(() => ({ open: !el('bookSheet').classList.contains('hidden'), url: !!el('webUrl'), txt: !!el('webText'), file: !!el('webFile') }));
ok('1) шторка: ссылка, текст, файл', sh.open && sh.url && sh.txt && sh.file, sh);
fs.mkdirSync('/tmp/rq-web-shots', { recursive: true }); await p.screenshot({ path: '/tmp/rq-web-shots/1-sheet.png' });
const wide = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); ok('1) шторка без горизонтальной прокрутки на 390', wide);

// 2
await go('https://ru.wikipedia.org/wiki/Чехов,_Антон_Павлович'); await sleep(1500);
let bs = await books();
ok('2) статья Википедии на полке', bs.length === 1 && bs[0].a === 'Википедия' && bs[0].t === 'Чехов, Антон Павлович' && bs[0].src === 'web:https://ru.wikipedia.org/wiki/%D0%A7%D0%B5%D1%85%D0%BE%D0%B2,_%D0%90%D0%BD%D1%82%D0%BE%D0%BD_%D0%9F%D0%B0%D0%B2%D0%BB%D0%BE%D0%B2%D0%B8%D1%87', bs);
ok('2) оглавление: Биография, Творчество (без Примечаний)', bs[0] && JSON.stringify(bs[0].toc) === JSON.stringify(['Биография', 'Творчество']), bs[0] && bs[0].toc);
let t = bs[0] ? await text(bs[0].id) : '';
ok('2) текст без инфобокса, сносок, «[править]» и хвоста', t.startsWith('Чехов, Антон Павлович\n\nАнтон Павлович Чехов — русский писатель.') && !/Инфобокс|Сноска|Ссылка-хвост|\[1\]|править|Не путать/.test(t), t.slice(0, 160));
ok('2) книга открылась в читалке', await inReader());
await p.screenshot({ path: '/tmp/rq-web-shots/2-wiki-reader.png' });

// 3
await toLib(); await openSheet(); await go('ru.wikipedia.org/wiki/Чехов,_Антон_Павлович'); await sleep(500);
const m3 = await p.evaluate(() => el('webMsg').textContent);
ok('3) повтор: «уже на полке», книга одна', /уже на полке/.test(m3) && (await books()).length === 1 && hits.wiki === 1, { m3, wiki: hits.wiki });

// 4
await go('https://open.example/blog/kak-chitat'); await sleep(1500);
bs = await books(); const b4 = bs.find(b => b.src === 'web:https://open.example/blog/kak-chitat');
t = b4 ? await text(b4.id) : '';
ok('4) открытый сайт: книга, автор = сайт, название из <h1>', b4 && b4.a === 'Блог читателя' && b4.t === 'Как читать больше', b4);
ok('4) только статья: без меню, рекламы, подвала, скрипта', t.startsWith('Как читать больше\n\nАбзац номер 1') && /• Читать каждый день/.test(t) && !/мусор/.test(t), t.slice(0, 120));
ok('4) оглавление: два совета', b4 && JSON.stringify(b4.toc) === JSON.stringify(['Совет первый', 'Совет второй']), b4 && b4.toc);

// 5
await toLib(); await openSheet(); await go('https://closed.example/article'); await sleep(1500);
const m5 = await p.evaluate(() => ({ msg: el('webMsg').textContent, btn: !!el('webJina') }));
ok('5) закрытый сайт: вопрос про Jina Reader, к службе без согласия не ходили', m5.btn && /Jina Reader/.test(m5.msg) && /уйдёт/.test(m5.msg) && hits.jina.length === 0, { m5, jina: hits.jina });
await p.screenshot({ path: '/tmp/rq-web-shots/5-closed.png' });
await p.evaluate(() => el('webJina').click()); await sleep(1500);
bs = await books(); const b5 = bs.find(b => b.src === 'web:https://closed.example/article');
t = b5 ? await text(b5.id) : '';
ok('5) через Jina Reader: адрес ушёл службе, книга на полке', hits.jina.length === 1 && hits.jina[0] === '/https://closed.example/article' && b5 && b5.t === 'Закрытая статья' && b5.a === 'closed.example', { jina: hits.jina, b5 });
ok('5) markdown в чистый текст: без картинок, ссылок и звёздочек', t.startsWith('Закрытая статья\n\nТекст закрытой статьи, абзац 1, с ссылкой и жирным словом.') && /• пункт два/.test(t) && !/\]\(|\*\*|!\[|https?:/.test(t) && b5.toc.join() === 'Вторая часть' || (b5 && b5.toc.length === 0), t.slice(0, 140));
ok('5) книга открылась в читалке', await inReader());

// 6
await toLib(); await openSheet();
const n6 = (await books()).length;
await p.evaluate(() => { el('webText').value = 'Коротко.'; el('webTextGo').click(); }); await sleep(300);
ok('6) слишком короткий текст — книги нет', (await books()).length === n6);
await p.evaluate(() => { el('webText').value = 'Заметка о чтении\n\n' + 'Длинный вставленный текст с сайта. '.repeat(20); el('webTextGo').click(); }); await sleep(800);
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
ok('7) .mhtml (quoted-printable, кириллица): книга, текст без мусора', b8 && b8.t === 'История из MHTML' && b8.a === 'МХТ' && t.indexOf('Абзац номер 1 о том, как Антон Павлович') > 0 && !/мусор|=D0/.test(t), { b8, t: t.slice(0, 100) });

// 8
await toLib();
const putShare = (o) => p.evaluate(async (o) => { const c = await caches.open((window.RQ_NS || 'rq') + '_share'); await c.put(new Request('share/' + Date.now() + '-web'), new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'X-RQ-Web': '1' } })); }, o);
await putShare({ title: 'Блог', text: 'Посмотри https://open.example/second', url: '' });
await p.goto(BASE + '?share=1', { waitUntil: 'load' }); await boot(); await sleep(1500);
bs = await books();
ok('8) поделились ссылкой: страница сразу легла на полку', bs.some(b => b.src === 'web:https://open.example/second'), bs.map(b => b.src));
await toLib();
await putShare({ title: 'Отрывок', text: 'Выделенный кусок статьи. '.repeat(20), url: 'https://open.example/third' });
await p.goto(BASE + '?share=1', { waitUntil: 'load' }); await boot(); await sleep(800);
const s8 = await p.evaluate(() => ({ open: !el('bookSheet').classList.contains('hidden'), t: el('webText') && el('webText').value.slice(0, 25), ttl: el('webTitle') && el('webTitle').value }));
ok('8) поделились выделенным текстом: шторка с текстом и названием', s8.open && s8.t === 'Выделенный кусок статьи. ' && s8.ttl === 'Отрывок', s8);
await p.evaluate(() => el('webTextGo').click()); await sleep(800);
bs = await books();
ok('8) из текста — книга «Отрывок» с адресом страницы', bs.some(b => b.t === 'Отрывок' && b.src === 'web:https://open.example/third' && b.a === 'open.example'), bs.filter(b => b.t === 'Отрывок'));
const left = await p.evaluate(async () => (await (await caches.open((window.RQ_NS || 'rq') + '_share')).keys()).length);
ok('8) общий кэш «Поделиться» пустой', left === 0, left);

ok('нет ошибок страницы', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\nweb: ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
