// 29.10 (Джессика: «что мы можем добавить в боковое меню …» → «давай 1 2 3 5 7», «с 8-11 тоже»): the tools of the side menu of a selection
// (js/sel-tools.js): «Цвета», «Перевести», «Объясни», the count of words; under «Действия» «Заметка», «Копировать», «В словарь», «В дневник»,
// «Закладка здесь», «Википедия», «До конца абзаца», «До конца страницы», «Отметить героя», «Герои книги».
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node seltools.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [], wiki = [];
const ctx = await browser.createBrowserContext();
const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.setRequestInterception(true);
p.on('request', r => {
  const u = r.url(); if (!/wikipedia\.org/.test(u)) return r.continue();
  wiki.push(decodeURIComponent(u)); const h = { 'access-control-allow-origin': '*' };
  if (/summary\/%D0%9E%D1%87%D1%83%D0%BC%D0%B5%D0%BB%D0%BE%D0%B2$|summary\/Очумелов$/.test(u)) return r.respond({ status: 404, headers: h, body: '{}' });
  if (/summary/.test(u)) return r.respond({ status: 200, headers: h, contentType: 'application/json', body: JSON.stringify({ title: 'Хамелеон (рассказ)', description: 'рассказ А. П. Чехова', extract: 'Рассказ о полицейском надзирателе Очумелове.', content_urls: { mobile: { page: 'https://ru.m.wikipedia.org/wiki/X' } } }) });
  return r.respond({ status: 200, headers: h, contentType: 'application/json', body: '["Очумелов",["Хамелеон (рассказ)"]]' });
});
await p.evaluateOnNewDocument(() => { window.__said = []; const fake = { speak(u) { window.__said.push({ t: u.text, lang: u.lang }); window.__lastU = u; }, cancel() { window.__cancel = (window.__cancel || 0) + 1; }, getVoices() { return []; } };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(async () => {
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); saveSet(); applySet && applySet();
  __navAllow = true; openBook(BOOKS[0].id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
  window.__word = (word, k) => { const w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT); let n, seen = 0;
    while ((n = w.nextNode())) { let i = -1; while ((i = n.nodeValue.indexOf(word, i + 1)) > -1) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length); const b = r.getBoundingClientRect();
      if (b.width && b.left >= 0 && b.right <= innerWidth && seen++ === (k || 0)) { getSelection().setBaseAndExtent(n, i, n, i + word.length); return true; } } } return false; };
  window.__open = async () => { await new Promise(r => setTimeout(r, 600)); if (!el('selSide').classList.contains('open')) el('ssTab').click(); await new Promise(r => setTimeout(r, 150)); };
});
const w = (ms) => sleep(ms);

// 7. the count of words
const c7 = await p.evaluate(async () => { __word('Через базарную площадь'); await __open(); return { cnt: el('ssCnt').textContent, lab: el('ssCnt').getAttribute('aria-label') }; });
ok('7. count: «3 слова» under the tools', c7.cnt === '3слова' && c7.lab === 'Выделено 3 слова', c7);

// 29.10 (Джессика: «поиск, озвучку убираем … поставь перевод, "объяснить"», «в одном боковом меню на две разные кнопки открывались
// разные ветки», нижняя плашка — «Убрать, всё в меню»): no magnifier and no voice in the column; «Цвета» and «Действия» open branches
const r0 = await p.evaluate(() => ({ find: !!el('ssFind'), say: !!el('ssSay'), quick: !!el('ssQuick'), pen: !!el('ssPen'), bar: getComputedStyle(el('selpop')).display,
  col: [...el('ssRail').children].map(x => x.id).filter(Boolean) }));
ok('column: Цвета, Перевести, Объясни, Действия; no search, voice or pencil; the bottom bar is not shown while selecting',
  !r0.find && !r0.say && !r0.quick && !r0.pen && r0.bar === 'none' && ['ssCol', 'ssDict', 'ssAI', 'ssMore'].every(x => r0.col.includes(x)), r0);

// «Цвета»: the bar's own colour buttons (skin drops + «свой цвет») in a column beside the menu; a tap saves the quote in that colour
const c1 = await p.evaluate(async () => { el('ssCol').click(); await new Promise(r => setTimeout(r, 150)); const b = el('ssColBox'), r = b.getBoundingClientRect(), rr = el('ssRail').getBoundingClientRect();
  return { shown: !b.hidden, inBox: el('spColors').parentNode === b, n: el('spColors').querySelectorAll('button').length, own: !!el('spOwn'), right: r.left >= rr.right, inside: r.top >= 0 && r.bottom <= innerHeight, col: r.height > r.width * 3, exp: el('ssCol').getAttribute('aria-expanded') }; });
ok('«Цвета»: a column of 5 colours + «свой цвет» beside the menu, on screen', c1.shown && c1.inBox && c1.n === 6 && c1.own && c1.right && c1.inside && c1.col && c1.exp === 'true', c1);
const c1b = await p.evaluate(async () => { el('ssMore').click(); await new Promise(r => setTimeout(r, 100)); const a = { col: el('ssColBox').hidden, menu: !el('ssMenu').hidden }; el('ssCol').click(); await new Promise(r => setTimeout(r, 100)); return Object.assign(a, { menu2: el('ssMenu').hidden, col2: !el('ssColBox').hidden }); });
ok('one branch at a time: «Действия» closes «Цвета» and back', c1b.col && c1b.menu && c1b.menu2 && c1b.col2, c1b);
const c1c = await p.evaluate(async () => { const bid = R.book.id, n0 = (S.quotes[bid] || []).length; el('spColors').querySelector('[data-c="g"]').click(); await new Promise(r => setTimeout(r, 400));
  const qs = S.quotes[bid] || [], q = qs.at(-1); return { n: qs.length - n0, t: q && q.text, c: q && q.c, sel: String(getSelection()), back: el('spColors').parentNode.id, side: el('selSide').hidden }; });
ok('«Цвета» → green: the quote is saved in green, the selection and menu go, the colours go back to the bar', c1c.n === 1 && c1c.t === 'Через базарную площадь' && c1c.c === 'g' && !c1c.sel && c1c.back === 'selpop' && c1c.side, c1c);
const c1d = await p.evaluate(async () => { SET.hlc = 'g'; saveSet(); __word('Очумелов'); await __open(); return el('ssCol').style.getPropertyValue('--d'); });
ok('the «Цвета» button shows the last colour', /dot-g/.test(c1d), c1d);

// «Перевести» and «Объясни»: the same windows as from the bar
const t2 = await p.evaluate(async () => { el('ssDict').click(); await new Promise(r => setTimeout(r, 300)); const tr = !el('trSheet').classList.contains('hidden'); el('trSheetClose').click(); return tr; });
ok('«Перевести» opens the translation window', t2, t2);
const a3 = await p.evaluate(async () => { __word('Очумелов'); await __open(); el('ssAI').click(); await new Promise(r => setTimeout(r, 300)); const s = !el('aiSheet').classList.contains('hidden'), txt = el('aiBody').textContent.slice(0, 60); el('aiSheet').classList.add('hidden'); return { s, txt }; });
ok('«Объясни» opens the AI window (here: where to put the key)', a3.s, a3);
const n4 = await p.evaluate(async () => { __word('Очумелов'); await __open(); el('ssMore').click(); await new Promise(r => setTimeout(r, 50)); el('ssMenu').querySelector('[data-a="copy"]').click(); await new Promise(r => setTimeout(r, 300)); return true; });
await p.evaluate(() => getSelection().removeAllRanges()); await w(200);
await p.evaluate(async () => { __word('Через базарную площадь'); await __open(); });

// «⋯»: a labelled list next to the column, on the side of the text
const m = await p.evaluate(async () => { el('ssMore').click(); await new Promise(r => setTimeout(r, 150)); const mm = el('ssMenu'), r = mm.getBoundingClientRect(), rr = el('ssRail').getBoundingClientRect();
  return { shown: !mm.hidden, items: [...mm.querySelectorAll('button')].map(b => b.textContent.trim()), right: r.left >= rr.right, inside: r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth }; });
ok('«Действия» shows the labelled list beside the menu, on screen', m.shown && m.right && m.inside && ['Заметка', 'Копировать', 'В словарь', 'Предложение, потом абзац', 'Закладка здесь', 'Википедия', 'До конца абзаца', 'До конца страницы', 'Отметить героя'].every(x => m.items.includes(x)) && m.items.some(x => /^Герои книги/.test(x)), m);
const m2 = await p.evaluate(async () => { el('ssFold').click(); await new Promise(r => setTimeout(r, 50)); return el('ssMenu').hidden; });
ok('«Действия» list closes with the menu', m2, m2);
const act = (a) => p.evaluate(async (a) => { await __open(); el('ssMore').click(); await new Promise(r => setTimeout(r, 50)); el('ssMenu').querySelector('[data-a="' + a + '"]').click(); await new Promise(r => setTimeout(r, 300)); }, a);

// 5. «В дневник»: an entry with the words as a quote and the page
const d5 = await p.evaluate(async () => { getSelection().removeAllRanges(); await new Promise(r => setTimeout(r, 200)); __word('Кругом тишина'); return true; });
await act('diary');
const d5b = await p.evaluate(async () => { const shown = !el('rqAsk').hidden; el('rqAskIn').value = 'тишина перед бурей'; el('rqAskOk').click(); await new Promise(r => setTimeout(r, 300));
  const y = diaryOf(R.book.id), e = y && (y.e || y.entries || []); const all = JSON.stringify(y); return { shown, has: /> Кругом тишина/.test(all) && /тишина перед бурей/.test(all) }; });
ok('5. «В дневник»: asks for a thought, the entry has the words as a quote and the thought', d5 && d5b.shown && d5b.has, d5b);

// 8. «Закладка здесь»: the page where the selection begins, its words shown in the bookmarks
const b8 = await p.evaluate(async () => { goPage(2, true); await new Promise(r => setTimeout(r, 300)); getSelection().removeAllRanges(); await new Promise(r => setTimeout(r, 200));
  const w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT), v = el('viewer').getBoundingClientRect(); let n; while ((n = w.nextNode())) { const r = n.parentElement.getBoundingClientRect(); if (n.nodeValue.trim().length > 30 && r.left >= v.left - 2 && r.right <= v.right + 2) break; }
  getSelection().setBaseAndExtent(n, 0, n, 20); window.__b8 = String(getSelection()).replace(/\s+/g, ' ').trim(); return R.page; });
await act('mark');
const b8b = await p.evaluate(async () => { const ms = S.marks[R.book.id] || [], m = ms.at(-1); renderPanel('marks'); const html = el('panel').innerHTML; return { page: m && m.page, t: m && m.t, want: window.__b8, list: html.includes(window.__b8.slice(0, 10)) }; });
ok('8. «Закладка здесь»: on the page of the selection (3), with its words, the list shows them', b8 === 2 && b8b.page === 3 && b8b.t === b8b.want && b8b.list, { b8, b8b });

// 10. «До конца абзаца» / «До конца страницы»: the start stays, the end moves
const p10 = await p.evaluate(async () => { getSelection().removeAllRanges(); goPage(0, true); await new Promise(r => setTimeout(r, 300)); __word('Через базарную'); return String(getSelection()); });
await act('para');
const p10b = await p.evaluate(() => { const s = String(getSelection()).trim(), par = [...document.querySelectorAll('#content p')].find(x => x.textContent.includes('Через базарную')); return { s: s.slice(0, 40), end: par && s === par.textContent.trim().slice(par.textContent.trim().indexOf('Через')) }; });
ok('10. «До конца абзаца»: from «Через базарную» to the end of its paragraph', /^Через базарную/.test(p10b.s) && p10b.end, { p10, p10b });
await act('page');
const pg10 = await p.evaluate(() => { const s = getSelection(), v = el('viewer').getBoundingClientRect(), cr = document.createRange(); cr.setStart(s.focusNode, s.focusOffset - 1); cr.setEnd(s.focusNode, s.focusOffset); const last = cr.getClientRects()[0]; /* the last selected character (a <p> cut by the column gives a box over both pages) */
  let next = null; selWalk(s.focusNode, s.focusOffset, 1, function (x, k, r) { next = selPageAt(r); return true; });
  return { start: String(s).trim().slice(0, 14), inPage: last.right <= v.right + 2 && last.left >= v.left - 2, next, page: R.page }; });
ok('10. «До конца страницы»: the end on the last word of this page, the next character is on the next page', pg10.start === 'Через базарную' && pg10.inPage && pg10.next === pg10.page + 1, pg10);

// 9. «Википедия»: a note in a sheet (no exact article → Wikipedia's own search), a link to the article
await p.evaluate(async () => { getSelection().removeAllRanges(); await new Promise(r => setTimeout(r, 200)); __word('Очумелов'); });
await act('wiki'); await w(500);
const w9 = await p.evaluate(() => { const o = el('stSheet'); return { shown: o && !o.hidden, h: el('stSheetH').textContent, body: el('stSheetB').textContent, href: (el('stSheetB').querySelector('a') || {}).href || '' }; });
ok('9. «Википедия»: «Очумелов» → search → «Хамелеон (рассказ)», its note and a link', w9.shown && w9.h === 'Хамелеон (рассказ)' && /надзирателе/.test(w9.body) && /wikipedia\.org/.test(w9.href) && wiki.some(u => /opensearch/.test(u)) && wiki.every(u => /^https:\/\/ru\.wikipedia\.org/.test(u)), { w9, wiki });
await p.evaluate(() => stSheetClose());

// 11. heroes: mark «Очумелов» (twice = once), «Герои книги» lists it with the count, a tap opens the magnifier by its stem
await act('hero'); await act('hero');
const h11 = await p.evaluate(() => S.chars[R.book.id]);
ok('11. «Отметить героя»: the name once in S.chars', JSON.stringify(h11) === '["Очумелов"]', h11);
const h11b = await p.evaluate(async () => { getSelection().removeAllRanges(); await new Promise(r => setTimeout(r, 200)); __word('Ребята, не пущай её! Нынче не велено'); await __open(); el('ssMore').click(); await new Promise(r => setTimeout(r, 50)); el('ssMenu').querySelector('[data-a="hero"]').click(); await new Promise(r => setTimeout(r, 200)); return S.chars[R.book.id].length; });
ok('11. a long piece is not a name: nothing added', h11b === 1, h11b);
await act('heroes');
const h11c = await p.evaluate(async () => { const rows = [...el('stSheetB').querySelectorAll('.sthgo')].map(b => b.textContent); el('stSheetB').querySelector('.sthgo').click(); await new Promise(r => setTimeout(r, 900));
  return { rows, find: !el('bookFind').hidden, q: el('bfQ').value, n: BF.hits.length, sheet: el('stSheet').hidden }; });
ok('11. «Герои книги»: «Очумелов» with its count; a tap opens the magnifier with its places', /^Очумелов\d+ раз/.test(h11c.rows[0] || '') && h11c.find && h11c.q === 'Очумелов' && h11c.n > 3 && h11c.sheet, h11c);
await p.evaluate(() => bfBack()); await w(300);
// heroes are kept after a reload
await p.evaluate(async () => { save(); await new Promise(r => setTimeout(r, 800)); });
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(600);
const h11d = await p.evaluate(() => S.chars && S.chars[allBooks()[0].id]);
ok('11. heroes are kept after a reload', JSON.stringify(h11d) === '["Очумелов"]', h11d);

ok('no page errors', !errs.length, errs.slice(0, 3));
await browser.close();
const f = checks.filter(x => !x).length; console.log(f ? `${f} FAILED of ${checks.length}` : `ALL ${checks.length} PASSED`); process.exit(f ? 1 : 0);
