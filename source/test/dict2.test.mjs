// 05.11 (вечер) Словари, 10 идей (Джессика: «Все»): англо-русский, Даль, английский Викисловарь, короткий вид, «Произнести»,
// «В словарь» со значением, вопросы по словам с монетами, «Слова этой книги», поиск без книги, порядок / выключение, долгое нажатие.
// Needs the packs in dist/dict/ (python3 tools/gen-dict-packs.py dist/dict --ru … --wn … --web … --dal … --enwikt … --enru …).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node dict2.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(async () => { const cat = await dkCatalog(); for (const pk of cat) await dkInstall(pk); });
let r;

// 1 the new packs: English → Russian, Dahl through the Wiktionary's forms, the English Wiktionary with forms
r = await p.evaluate(async () => { const a = await dkLookup('cats', 'en'), b = await dkLookup('шинели', 'ru'), c = await dkLookup('went', 'en');
  return { a: a.map(h => [h.m.id, h.via, h.text.split('\n')[0]]), b: b.map(h => [h.m.id, h.via]), c: c.map(h => [h.m.id, h.via, h.text.slice(0, 200)]) }; });
ok('1 «cats» → the English-Russian: «кошка» first', r.a.some(x => x[0] === 'en-ru' && x[1] === 'cat' && /кошка/.test(x[2])), r);
ok('1 «шинели» → Даль finds «шинель» by the Wiktionary\'s form; «went»: the English Wiktionary («past of go»), the English-Russian via «go»', r.b.some(x => x[0] === 'ru-dal' && x[1] === 'шинель') && r.c.some(x => x[0] === 'en-wikt' && /\bgo\b/.test(x[2])) && r.c.some(x => x[0] === 'en-ru' && x[1] === 'go'), r);

// 2 the window: short, «Всё значение», «Произнести», «В словарь» with the meaning and the sentence
r = await p.evaluate(async () => { await openBook('b1'); await new Promise(r => setTimeout(r, 700)); SET.rm = rqRmNorm(Object.assign({}, rqRm(), { dkShort: true }));
  await dkShow('шинели', 200, 300, 'Очумелов в новой шинели и с узелком в руке.'); const n = el('rmNote');
  const vis = (q) => [...n.querySelectorAll(q)].filter(x => !x.closest('[hidden]')).length;
  const o = { secs: vis('.dkhit'), more: !!n.querySelector('[data-dkmore]'), say: !!el('dkSay'), save: !!el('dkSave') };
  o.rest0 = [...n.querySelectorAll('.dkrest')].filter(x => x.hidden).length; n.querySelector('[data-dkmore]').click(); o.after = vis('.dkhit'); o.rest1 = [...n.querySelectorAll('.dkrest')].filter(x => x.hidden).length;
  let said = null; const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { said = [u.text, u.lang]; }; el('dkSay').click(); speechSynthesis.speak = sp; o.said = said;
  S.vocab = []; el('dkSave').click(); o.v = S.vocab[0]; rmFnHide(); return o; });
ok('2 short window: the main sense from each dictionary (Викисловарь and Даль), «Всё значение» shows the rest', r.secs === 2 && r.more && r.after === 2 && r.rest0 > 0 && r.rest1 === 0, r);
ok('2 «Произнести»: the word without the stress mark, Russian voice', r.said && r.said[0] === 'шинель' && r.said[1] === 'ru-RU', r);
ok('2 «В словарь» from the window: «шинель» with the meaning and the sentence of the book', r.v && r.v.w === 'шинель' && /пальто|плащ/.test(r.v.d) && /шинели/.test(r.v.ctx) && r.v.box === 0, r);

// 3 «В словарь» from the selection menu gets the meaning by itself; the list and the card show it
r = await p.evaluate(async () => { goPage(1, false); const c = el('content'), at = c.textContent.indexOf('городов'), T = rmNodes(), a = rmAt(T, at), z = rmAt(T, at + 9), s = getSelection(), rg = document.createRange();
  rg.setStart(a.node, a.offset); rg.setEnd(z.node, z.offset); s.removeAllRanges(); s.addRange(rg); addWord(); await new Promise(r => setTimeout(r, 800));
  const v = S.vocab.find(x => /городов/.test(x.w)); openProgress('vocab'); renderVocab(); const list = el('vocabBody').textContent;
  return { v, list: /домашнее животное|полицейский|полиции/.test(list) || (v && v.d && list.includes(v.d.slice(0, 20))) }; });
ok('3 «В словарь» from the menu: the meaning comes from the dictionary and shows in «Словарь»', r.v && r.v.d && r.v.d.length > 5 && r.list, r);

// 4 the search on the «Словарь» tab and in the settings card
r = await p.evaluate(async () => { const box = el('dkVoc'), i = box.querySelector('input'); i.value = 'overcoat'; i.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 900));
  const t = box.querySelector('.dkres').textContent; const save = box.querySelector('[data-a="save"]'); const n0 = S.vocab.length; save.click();
  return { t: t.slice(0, 200), added: S.vocab.length === n0 + 1, w: S.vocab[S.vocab.length - 1].w }; });
ok('4 search without a book: «overcoat» → «пальто», «В словарь» adds it', /пальто/.test(r.t) && r.added && r.w === 'overcoat', r);

// 5 order and off
r = await p.evaluate(async () => { show('library'); RX_EXP.dict = true; openGeneralSettings(true); gsOpen('read', { noPush: true }); rxRender(); await new Promise(r => setTimeout(r, 900));
  const row = (id) => document.querySelector('#dkList .dkrow[data-id="' + id + '"]');
  row('en-webster1913').querySelector('[data-dk="up"]').click(); await new Promise(r => setTimeout(r, 400));
  const order = (await dkMeta()).map(m => m.id); row('en-ru').querySelector('[data-dk="tog"]').click(); await new Promise(r => setTimeout(r, 400));
  const off = (await dkMeta()).find(m => m.id === 'en-ru').off, hits = (await dkLookup('cat', 'en')).map(h => h.m.id);
  row('en-ru').querySelector('[data-dk="tog"]').click(); await new Promise(r => setTimeout(r, 300));
  const s = el('dkSet'), i = s.querySelector('input'); i.value = 'изба'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise(r => setTimeout(r, 700));
  return { order, off, hits, sw: ['dkShortSw', 'dkLongSw', 'dkQuizSw'].map(x => el(x) && el(x).textContent), set: s.querySelector('.dkres').textContent.slice(0, 80) }; });
ok('5 «выше»: Webster goes above the English Wiktionary; «Выкл»: the English-Russian is skipped', r.order.indexOf('en-webster1913') < r.order.indexOf('en-wikt') && r.off === true && !r.hits.includes('en-ru') && r.hits.length >= 2, r);
ok('5 the card: three switches (Вкл / Выкл / Вкл by default) and search finds «изба»', JSON.stringify(r.sw) === '["Вкл","Выкл","Вкл"]' && /изб/.test(r.set), r);

// 6 «Слова этой книги»: the book card row, the list, the file
r = await p.evaluate(async () => { document.querySelectorAll('#settings').forEach(s => s.classList.add('hidden')); bookInfo('b1'); await new Promise(r => setTimeout(r, 900));
  const row = el('dkBookWords'); if (!row) return { row: false }; const sub = row.textContent; row.click(); await new Promise(r => setTimeout(r, 200));
  const d = el('dkWords'), t = d.textContent; let file = null; const q0 = qSave; qSave = (b, n) => { file = n; }; el('dkWordsFile').click(); qSave = q0; el('dkWordsX').click();
  return { row: true, sub, t: t.slice(0, 300), file, hidden: d.hidden, gone: getComputedStyle(d).display === 'none' }; });
ok('6 book card «Слова этой книги»: the looked-up words with a short meaning, «Сохранить файлом» gives a .txt', r.row && /смотрели в словаре: \d/.test(r.sub) && /шинель/.test(r.t) && /\.txt$/.test(r.file || '') && r.hidden && r.gone, r);

// 7 the quiz while reading: 3 words with meanings → a choice, the right answer +3 coins, at most 5 a day
r = await p.evaluate(async () => { el('bookSheet').classList.add('hidden'); await openBook('b1'); await new Promise(r => setTimeout(r, 500));
  S.vocab = [{ w: 'шинель', d: 'форменное пальто из толстого сукна', box: 0 }, { w: 'изба', d: 'крестьянский деревянный дом', box: 0 }, { w: 'кот', d: 'самец кошки', box: 0 }];
  S.claimed = S.claimed || {}; delete S.claimed['vq:' + today()]; const g0 = S.gold || 0; const shown = dkQuizShow(S.vocab[0]);
  const n = el('rmNote'), opts = [...n.querySelectorAll('[data-ok]')].map(b => b.textContent); n.querySelector('[data-ok="1"]').click();
  const o = { shown, opts, coins: (S.gold || 0) - g0, box: S.vocab[0].box, right: !!n.querySelector('.dkright') };
  S.claimed['vq:' + today()] = 5; const g1 = S.gold; dkQuizShow(S.vocab[1]); el('rmNote').querySelector('[data-ok="1"]').click(); o.capped = S.gold - g1; o.capText = /уже получены/.test(el('rmNote').textContent);
  S.vocab = [{ w: 'шинель', d: 'форменное пальто', box: 2 }]; dkQuizShow(S.vocab[0]); const m = el('rmNote'); o.self = !!m.querySelector('[data-show]'); m.querySelector('[data-show]').click(); m.querySelector('[data-self="0"]').click(); o.reset = S.vocab[0].box;
  return o; });
ok('7 «Помнишь, что значит «шинель»?»: three meanings, the right one → +3 coins, box +1', r.shown && r.opts.length === 3 && r.opts.includes('форменное пальто из толстого сукна') && r.coins === 3 && r.box === 1 && r.right, r);
ok('7 after 5 answers a day: no coins, says so; with one word: «Показать» → «Не помню» resets it', r.capped === 0 && r.capText && r.self && r.reset === 0, r);

// 8 the long press with «Значение по долгому нажатию»
r = await p.evaluate(async () => { rmFnHide(); SET.rm = rqRmNorm(Object.assign({}, rqRm(), { dkLong: true })); goPage(1, false); await new Promise(r => setTimeout(r, 100));
  const c = el('content'), T = rmNodes(), i = c.textContent.indexOf('надзиратель'), a = rmAt(T, i + 2), rg = document.createRange(); rg.setStart(a.node, a.offset); rg.setEnd(a.node, a.offset + 1);
  goPage(selPageAt(rg.getClientRects()[0]), false); await new Promise(r => setTimeout(r, 80)); const q = rg.getClientRects()[0]; smLongAt(q.left + 1, q.top + q.height / 2); await new Promise(r => setTimeout(r, 900));
  const o = { open: !el('rmNote').hidden, t: el('rmNote').textContent.slice(0, 80), sel: SM.on }; rmFnHide(); smOff(); SET.rm = rqRmNorm(Object.assign({}, rqRm(), { dkLong: false }));
  smLongAt(q.left + 1, q.top + q.height / 2); await new Promise(r => setTimeout(r, 600)); o.off = el('rmNote').hidden; smOff(); return o; });
ok('8 long press: the word is selected and its meaning opens; switched off — only the selection', r.open && /надзират/i.test(r.t) && r.sel && r.off, r);

ok('no page errors', errs.length === 0, errs);
console.log('\nSUMMARY dict2.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
