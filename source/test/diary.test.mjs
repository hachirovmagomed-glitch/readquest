// «Дневники читателя», этап 1 (Джессика 25.10: «дневник в приложении, куда пользователи будут добавлять заметки… у каждого дневника под книгу свой скин»;
// место — «Только в меню»; arch.md 25.10, поля diaries и diaryAuto):
//  1) раздел в левом меню (Чтение), в нижней панели по умолчанию нет, но его можно туда поставить;
//  2) свободный блокнот и дневник к книге; у книги дневник заводится сам при первой цитате или закладке (выключается);
//  3) записи: шаблон, текст с разметкой, автосохранение, пустая запись не остаётся, закрепление, удаление;
//  4) цитаты и закладки книги видны в дневнике без копирования, заметка к цитате правится там же;
//  5) оформление (обложка, расцветка, бумага, шрифт, размер, чернила, ленточка) хранится у дневника;
//  6) поиск по всем дневникам; системный «назад» по шагам; запись в дневник из читалки (глава и страница);
//  7) экспорт и импорт, битые данные отбрасываются; монеты и XP не меняются.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node diary.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const money0 = await p.evaluate(() => ({ g: S.gold, xp: S.xp }));

// 1. menu
const s1 = await p.evaluate(() => { openDrawer(); const d = el('dDiary'), sec = [...el('dList').children]; const iSec = sec.findIndex(x => x.textContent === 'Чтение'), iHero = sec.findIndex(x => x.textContent === 'Герой');
  const at = sec.indexOf(d); const r = { lab: d && d.textContent, inRead: at > iSec && at < iHero, bar: navShown(), def: NAV_DEF.slice(), canPick: !!navItem('diary') && navAvail('diary') };
  d.click(); r.shown = !el('diary').classList.contains('hidden'); r.on = el('dDiary') ? null : null; r.drawer = el('drawer').classList.contains('open'); return r; });
ok('1 «Дневники» в левом меню в разделе «Чтение», открывают экран; нижняя панель по умолчанию прежняя, но раздел можно выбрать в «Нижней панели»',
  s1.lab === 'Дневники' && s1.inRead && JSON.stringify(s1.bar) === '["library","path","rewards","profile"]' && JSON.stringify(s1.def) === JSON.stringify(s1.bar) && s1.canPick && s1.shown && !s1.drawer, s1);

// 2. empty shelf, free notebook through the UI
const s2 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  const r = { empty: !!document.querySelector('#diary .dyempty'), emptyBtn: !!document.querySelector('#diary .dyempty [data-act="new"]') };
  document.querySelector('#diary [data-act="new"]').click(); await w(100);
  r.sheet = !el('dySheet').hidden && /Новый дневник/.test(el('dySheet').textContent);
  el('dySheet').querySelector('[data-act="mkfree"]').click(); await w(150);
  r.cfg = !el('dySheet').hidden && /Оформление/.test(el('dySheet').textContent);
  const nm = el('dyName'); nm.value = 'Мысли'; nm.dispatchEvent(new Event('change')); await w(50);
  r.n = S.diaries.length; r.d = S.diaries[0] && { t: S.diaries[0].t, b: S.diaries[0].b, cv: S.diaries[0].cv };
  r.title = document.querySelector('#dyBox .dyhead h1').textContent;
  return r; });
ok('2 пустая полка с подсказкой; «+» → «Свободный блокнот» заводит блокнот и сразу открывает оформление; название сохраняется',
  s2.empty && s2.emptyBtn && s2.sheet && s2.cfg && s2.n === 1 && s2.d.t === 'Мысли' && s2.d.b === '' && s2.d.cv === 'pencil' && s2.title === 'Мысли', s2);
await p.goBack(); await sleep(200); // closes the sheet
const s2b = await p.evaluate(() => ({ sheet: el('dySheet').hidden, view: DY.view }));
ok('2b системный «назад» закрывает лист оформления, блокнот открыт', s2b.sheet && s2b.view === 'book', s2b);

// 3. entries
const s3 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), y = S.diaries[0], r = {};
  document.querySelector('#diary [data-act="newe"]').click(); await w(100);
  r.edit = DY.view === 'edit' && !!el('dyEX');
  dyBack(); await w(250);
  r.dropped = y.e.length === 0 && DY.view === 'book';
  document.querySelector('#diary [data-act="tpl"][data-v="chars"]').click(); await w(100);
  r.tpl = el('dyET').value === 'Персонажи' && /# Главные/.test(el('dyEX').value);
  el('dyEX').value = 'Ива — **смелая**, *странная*\n- раз\n- два\n> цитата\n---'; el('dyEX').setSelectionRange(0, 3);
  document.querySelector('#diary [data-act="fmt"][data-v="b"]').click(); await w(700);
  r.fmt = el('dyEX').value.startsWith('**Ива** —'); r.saved = y.e[0].x.startsWith('**Ива**') && el('dySaved').textContent === 'Сохранено';
  document.querySelector('#diary [data-act="pin"]').click(); r.pin = y.e[0].pin === true;
  dyBack(); await w(250);
  const art = document.querySelector('#diary .dyent'); r.md = art && { b: art.querySelectorAll('.dymd b').length, i: art.querySelectorAll('.dymd i').length, li: art.querySelectorAll('.dymd li').length, q: art.querySelectorAll('.dymd blockquote').length, hr: art.querySelectorAll('.dymd hr').length, pin: !!art.querySelector('.dypin') };
  // a second entry: pinned one stays on top
  const n2 = dyNewEntry(y, 'final'); dyRender(); await w(50);
  r.order = [...document.querySelectorAll('#diary .dyent h3')].map(h => h.textContent);
  // delete through the editor
  dyOpenEntry(y.id, n2.id); await w(100); document.querySelector('#diary [data-act="dele"]').click(); await w(100); el('rqAskOk').click(); await w(300);
  r.del = y.e.length === 1 && DY.view === 'book';
  return r; });
ok('3a «Новая запись» открывает редактор; пустая запись при выходе не остаётся', s3.edit && s3.dropped, s3);
ok('3b шаблон «Персонажи», кнопка «Жирный» оборачивает выделенное, автосохранение через полсекунды', s3.tpl && s3.fmt && s3.saved, s3);
ok('3c разметка в дневнике: жирный, курсив, список, цитата, черта; закреплённая запись сверху; удаление с подтверждением',
  s3.pin && s3.md && s3.md.b === 2 && s3.md.i === 1 && s3.md.li === 2 && s3.md.q === 1 && s3.md.hr === 1 && s3.md.pin && s3.order[0] === 'Персонажи' && s3.order[1] === 'Итог книги' && s3.del, s3);

// 4. book diary: auto on bookmark, quotes and marks shown live, note edited in place
const s4 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), b = BOOKS[0], r = {};
  r.none = !diaryOf(b.id);
  await openBook(b.id); await w(1200); addBookmark(); r.auto = !!diaryOf(b.id); r.autoCv = diaryOf(b.id).cv;
  // reader quick note: chapter + page
  const pr = diaryQuickNote(); await w(100); el('rqAskIn').value = 'Сильное начало'; el('rqAskOk').click(); await pr; await w(100);
  const y = diaryOf(b.id), n = y.e[0]; r.quick = n && { x: n.x, pg: n.pg, r: typeof n.r === 'number' };
  await closeReader(); await w(300); if (!el('summary').classList.contains('hidden')) el('btnDone').click(); await w(200);
  S.quotes[b.id] = (S.quotes[b.id] || []).concat([{ text: 'Первая цитата из книги', note: '', date: '2026-10-25', c: 'y' }]); save();
  navGo('diary'); await w(200); r.shelfN = document.querySelectorAll('#diary .dynb').length;
  dyOpen(y.id); await w(150);
  r.items = { e: document.querySelectorAll('#diary .dyent').length, q: document.querySelectorAll('#diary .dyq').length, m: document.querySelectorAll('#diary .dymk').length };
  r.copied = !y.q && !y.quotes && !JSON.stringify(y).includes('Первая цитата');
  document.querySelector('#diary .dyq [data-act="qnote"]').click(); await w(100); el('rqAskIn').value = 'моя мысль'; el('rqAskOk').click(); await w(200);
  r.note = S.quotes[b.id].slice(-1)[0].note; r.noteShown = /моя мысль/.test(document.querySelector('#diary .dyq').textContent);
  document.querySelector('#diary [data-act="tab"][data-v="quotes"]').click(); await w(50);
  r.tabQ = { e: document.querySelectorAll('#diary .dyent').length, q: document.querySelectorAll('#diary .dyq').length };
  // auto off → no diary for a new book
  S.diaryAuto = false; diaryAuto(BOOKS[1].id); r.off = !diaryOf(BOOKS[1].id); S.diaryAuto = true;
  return r; });
ok('4a закладка в книге без дневника сама заводит дневник книги (школьная тетрадь); «Запись в дневник» из читалки — с главой и страницей',
  s4.none && s4.auto && s4.autoCv === 'school' && s4.quick && s4.quick.x === 'Сильное начало' && s4.quick.pg >= 1 && s4.quick.r, s4);
ok('4b в дневнике книги запись, цитата и закладка; цитаты не копируются; заметка к цитате правится в дневнике и пишется в цитату; вкладка «Цитаты»',
  s4.shelfN === 2 && s4.items.e === 1 && s4.items.q === 1 && s4.items.m === 1 && s4.copied && s4.note === 'моя мысль' && s4.noteShown && s4.tabQ.e === 0 && s4.tabQ.q === 1, s4);
ok('4c «Заводить дневник книги сам» выключено — дневник не заводится', s4.off, s4);

// 5. look
const s5 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), y = diaryOf(BOOKS[0].id), r = {};
  dySheet('cfg'); await w(100);
  const click = (s) => { el('dySheet').querySelector(s).click(); };
  click('[data-act="cv"][data-v="pencil"][data-c="black"]'); await w(30); click('[data-act="rb"][data-v="gold"]'); await w(30);
  click('[data-act="stab"][data-v="page"]'); await w(30); click('[data-act="pp"][data-v="dots"]'); await w(30); click('[data-act="ink"][data-v="violet"]'); await w(30);
  click('[data-act="stab"][data-v="text"]'); await w(30); click('[data-act="fn"][data-v="book"]'); await w(30);
  const fs = el('dyFs'); fs.value = 21; fs.dispatchEvent(new Event('input')); await w(400);
  r.y = { cv: y.cv, cc: y.cc, pp: y.pp, fn: y.fn, ink: y.ink, rb: y.rb, fs: y.fs };
  const pap = document.querySelector('#dyBox .dypaper'), cov = document.querySelector('#dyBox .dycov');
  r.dom = { pp: pap.dataset.pp, fn: pap.dataset.fn, ink: pap.dataset.ink, fs: pap.style.getPropertyValue('--dyfs'), cv: cov.dataset.cv, rb: cov.dataset.rb, font: getComputedStyle(pap).fontFamily, ink2: getComputedStyle(pap).color };
  r.sheetOpen = !el('dySheet').hidden;
  dyBack(); await w(200);
  return r; });
ok('5 оформление хранится у дневника и сразу видно: обложка «Чёрный» блокнот, бумага в точку, книжный шрифт 21, фиолетовые чернила, золотая ленточка',
  JSON.stringify(s5.y) === JSON.stringify({ cv: 'pencil', cc: 'black', pp: 'dots', fn: 'book', ink: 'violet', rb: 'gold', fs: 21 }) && s5.dom.pp === 'dots' && s5.dom.fn === 'book' && s5.dom.ink === 'violet' && s5.dom.fs === '21px' && s5.dom.cv === 'pencil' && s5.dom.rb === 'gold' && /Lora/.test(s5.dom.font) && s5.sheetOpen, s5);

// 6. search + system back + book sheet
const s6 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), r = {};
  navGo('diary'); await w(100);
  const q = el('dyQ'); q.value = 'смелая'; q.dispatchEvent(new Event('input')); await w(100);
  r.res = [...document.querySelectorAll('#diary .dyres')].map(x => x.querySelector('small').textContent);
  el('dyQ').value = 'первая цитата'; el('dyQ').dispatchEvent(new Event('input')); await w(100);
  r.resQ = [...document.querySelectorAll('#diary .dyres')].map(x => x.querySelector('small').textContent);
  el('dyQ').value = 'смелая'; el('dyQ').dispatchEvent(new Event('input')); await w(50);
  document.querySelector('#diary .dyres').click(); await w(150);
  r.opened = DY.view === 'edit' && el('dyET').value === 'Персонажи';
  return r; });
ok('6a поиск по всем дневникам находит запись и цитату, открывает запись', JSON.stringify(s6.res) === '["Мысли"]' && s6.resQ.length === 1 && /цитата/.test(s6.resQ[0]) && s6.opened, s6);
await p.goBack(); await sleep(250); const v1 = await p.evaluate(() => DY.view);
await p.goBack(); await sleep(250); const v2 = await p.evaluate(() => DY.view);
ok('6b системный «назад»: запись → дневник → полка', v1 === 'book' && v2 === 'shelf', { v1, v2 });
const s6c = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); renderLibrary(); show('library'); bookInfo(BOOKS[1].id); await w(100);
  const ln = [...el('bookSheetBody').querySelectorAll('.bk-dy .bk-line')].map(x => x.textContent); el('bookSheetBody').querySelector('.bk-dy .bk-line').click(); await w(200);
  return { ln, made: !!diaryOf(BOOKS[1].id), view: DY.view, shown: !el('diary').classList.contains('hidden'), sheet: el('bookSheet').classList.contains('hidden') }; });
ok('6c карточка книги: «Завести дневник книги» заводит и открывает его', s6c.ln[0] === 'Завести дневник книги' && s6c.made && s6c.view === 'book' && s6c.shown && s6c.sheet, s6c);

// 6d. full screen (Джессика 25.10: «можно открывать дневники на весь экран»)
const s6d = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), vis = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, r = {};
  navGo('diary'); await w(100); r.navShelf = vis('#botnav');
  const y = S.diaries.find(x => x.t === 'Мысли'); dyOpen(y.id); await w(150); r.navBook = vis('#botnav');
  document.querySelector('#diary [data-act="full"]').click(); await w(200);
  const pap = document.querySelector('#diary .dypaper').getBoundingClientRect();
  r.full = { cls: el('diary').classList.contains('dyfull'), head: vis('#diary .dyhead'), top: vis('#diary .dytop'), x: Math.round(pap.left), w: Math.round(pap.width), h: Math.round(pap.height) >= innerHeight - 1, bar: vis('.dyfbar'), fab: vis('.dyfab') };
  document.querySelector('.dyfab').click(); await w(150); r.edFull = DY.view === 'edit' && el('diary').classList.contains('dyfull') && vis('.dyfbar') && !vis('#diary .dyhead');
  el('dyEX').value = 'на весь экран'; el('dyEX').dispatchEvent(new Event('input'));
  document.querySelector('.dyfbar [data-act="back"]').click(); await w(300); r.saved = y.e.some(n => n.x === 'на весь экран') && DY.view === 'book' && DY.full;
  document.querySelector('.dyfbar [data-act="full"]').click(); await w(150); r.off = !el('diary').classList.contains('dyfull') && vis('#diary .dyhead') && !document.querySelector('.dyfbar');
  dyFull(true); await w(50); dyBack(); await w(300); r.shelfOff = DY.view === 'shelf' && !DY.full && !el('diary').classList.contains('dyfull');
  return r; });
ok('6d открытый дневник без нижней панели; «На весь экран» — только лист от края до края, кнопки в углу, новая запись тоже на весь экран; выход кнопкой и на полке',
  s6d.navShelf && !s6d.navBook && s6d.full.cls && !s6d.full.head && !s6d.full.top && s6d.full.x === 0 && s6d.full.w === 390 && s6d.full.h && s6d.full.bar && s6d.full.fab && s6d.edFull && s6d.saved && s6d.off && s6d.shelfOff, s6d);

// 7. export / import, bad data, economy
await p.reload({ waitUntil: 'load' }); await boot();
const s7 = await p.evaluate(async () => {
  const r = { n: S.diaries.length, ent: S.diaries.map(y => y.e.length) };
  const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
  r.inExp = exp.progress && Array.isArray(exp.progress.diaries) && exp.progress.diaries.length; r.auto = exp.progress.diaryAuto;
  const f = JSON.parse(JSON.stringify(exp)), good = f.progress.diaries[0];
  f.progress.diaries = [good, { id: 'x' }, { id: good.id, t: 'дубль' }, { id: 'dyok1', t: 7, b: 5, cv: 'нет', pp: 'zz', fn: 1, fs: 99, ink: 'red', rb: {}, so: 'q',
    e: [{ id: 'e1', t: '', x: '' }, { id: 'e2', x: 'текст', pg: -3, r: 4, pin: 'да' }, { id: 'e2', x: 'дубль' }, 'мусор'] }, 'мусор'];
  f.progress.diaryAuto = 'да';
  await __rq.importBackup(f); const env = __rq.loadEnvelope().progress;
  r.after = env.diaries.map(y => ({ id: y.id, t: y.t, b: y.b, cv: y.cv, pp: y.pp, fn: y.fn, fs: y.fs, ink: y.ink, rb: y.rb, so: y.so, e: y.e.map(n => ({ id: n.id, x: n.x, pg: n.pg, r: n.r, pin: n.pin })) }));
  r.autoAfter = env.diaryAuto;
  r.norm = diaryNorm([{ id: 'dyq', e: [{ id: 'e9', t: 'а'.repeat(500), x: 'б' }] }])[0].e[0].t.length;
  await __rq.importBackup(exp); r.back = __rq.loadEnvelope().progress.diaries.length;
  return r; });
ok('7a дневники и «заводить сам» уходят в экспорт и возвращаются импортом', s7.n === 3 && s7.inExp === 3 && s7.auto === true && s7.back === 3, s7);
ok('7b импорт отбрасывает битые дневники и записи (без id, дубли, мусор), поля вне правил → умолчания',
  s7.after.length === 2 && JSON.stringify(s7.after[1]) === JSON.stringify({ id: 'dyok1', t: '', b: '', cv: 'school', pp: 'lines', fn: 'hand', fs: 17, ink: 'ink', rb: 'red', so: 'book', e: [{ id: 'e2', x: 'текст', pg: 0, r: null, pin: false }] }) && s7.autoAfter === true && s7.norm === 120, s7);
const money1 = await p.evaluate(() => ({ g: S.gold, xp: S.xp }));
ok('7c монеты не меняются от дневников (XP — только минуты чтения)', money1.g === money0.g, { money0, money1 });

// 8. этап 1б (Джессика 26.10): свои дневники у скинов, «Аа» в записи, новая разметка, «Инвентарь» во вкладках
const s8 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), r = {};
  navGo('diary'); await w(100);
  r.tabs = [...document.querySelectorAll('#diary .dyinv .progtab')].map(b => b.dataset.sub + (b.classList.contains('on') ? '*' : ''));
  document.querySelector('#diary .dyinv [data-sub="quotes"]').click(); await w(150);
  r.quotes = !el('quotes').classList.contains('hidden') && el('quotes').querySelector('h1').textContent;
  el('quotes').querySelector('.progtab[data-sub="diary"]').click(); await w(150); r.backToDiary = !el('diary').classList.contains('hidden');
  openDrawer(); r.drawer = [...el('dList').querySelectorAll('.ditem')].map(b => b.dataset.nav); closeDrawer();
  r.alias = navRead(['library', 'stats', 'path']);
  // locked skin look: visible with a lock, tap → shop offer; nothing is chosen
  const y = diaryNew({ t: 'Скины' }); dyOpen(y.id); await w(100); DY.stab = 'cover'; dySheet('cfg'); await w(100);
  const lk = el('dySheet').querySelector('.dycvb.lk[data-sk="ellada"]'); r.lockShown = !!lk && /Со скином «Эллада»/.test(el('dySheet').textContent);
  lk.click(); await w(100); r.ask = !el('rqAsk').hidden && /Эллада/.test(el('rqAsk').textContent); el('rqAskNo').click(); await w(50); r.notSet = y.cv !== 'amphora';
  dyBack(); await w(200);
  // buy and wear «Эллада» → the cover opens; a new diary takes the skin's cover, papyrus, terracotta ink
  S.gold = 5000; buy('skin-ellada'); wear('skin-ellada'); await w(300);
  const y2 = diaryNew({ t: 'Эллада' }); r.ellada = { cv: y2.cv, pp: y2.pp, ink: y2.ink };
  dyOpen(y2.id); await w(100); dySheet('cfg'); await w(100); r.unlocked = !el('dySheet').querySelector('.dycvb.lk[data-sk="ellada"]') && !!el('dySheet').querySelector('.dycvb[data-v="amphora"]:not(.lk)');
  r.othersLocked = !!el('dySheet').querySelector('.dycvb.lk[data-sk="celestial"]');
  el('dySheet').querySelector('[data-act="cv"][data-v="amphora"][data-c="black"]').click(); await w(50); r.cv = y2.cv + '/' + y2.cc;
  r.prev = !!el('dySheet').querySelector('.dyprev .dycov[data-cv="amphora"]');
  dyBack(); await w(200);
  // editor: «Аа» changes look in place (text and focus stay), colour tag, line tools, undo
  const n = dyNewEntry(y2, ''); dyOpenEntry(y2.id, n.id); await w(100);
  const x = el('dyEX'); x.value = 'строка'; x.dispatchEvent(new Event('input'));
  document.querySelector('#dyBox [data-act="aa"]').click(); await w(50); r.aaOpen = !el('dyAa').hidden;
  const ta = el('dyEX'); el('dyAa').querySelector('[data-act="lh"][data-v="wide"]').click(); await w(50);
  el('dyAa').querySelector('[data-act="fs"][data-v="1"]').click(); await w(50);
  el('dyAa').querySelector('[data-act="al"][data-v="justify"]').click(); await w(50);
  el('dyAa').querySelector('[data-act="cl"][data-v="green"]').click(); await w(50);
  const pap = document.querySelector('#dyBox .dyed');
  r.aa = { same: el('dyEX') === ta && ta.value === 'строка', lh: y2.lh, fs: y2.fs, al: y2.al, cl: n.cl, dom: pap.dataset.lh + '/' + pap.dataset.al + '/' + pap.dataset.cl, still: !el('dyAa').hidden };
  x.focus(); x.setSelectionRange(0, 6); document.querySelector('#dyBox [data-v="ck"]').click(); await w(30); r.ck = x.value;
  document.querySelector('#dyBox [data-v="ck"]').click(); await w(30); r.ckOff = x.value;
  document.querySelector('#dyBox [data-v="undo"]').click(); await w(30); r.undo = x.value;
  document.querySelector('#dyBox [data-v="redo"]').click(); await w(30); r.redo = x.value;
  document.querySelector('#dyBox [data-v="h"]').click(); await w(30); r.h1 = x.value; document.querySelector('#dyBox [data-v="h"]').click(); await w(30); r.h2 = x.value;
  x.value = 'выделить'; x.setSelectionRange(0, 8); document.querySelector('#dyBox [data-v="mk"]').click(); await w(30); r.mk = x.value;
  x.setSelectionRange(2, 10); document.querySelector('#dyBox [data-v="mk"]').click(); await w(30); r.mkOff = x.value;
  x.value = 'а\nб'; x.setSelectionRange(0, 3); document.querySelector('#dyBox [data-v="ol"]').click(); await w(30); r.ol = x.value;
  return r; });
ok('8a «Инвентарь» во вкладках «Дневников»: Дневники · Цитаты и заметки · Словарь; в меню пункта «Инвентарь» больше нет, старая панель со «stats» читается как «Дневники»',
  JSON.stringify(s8.tabs) === '["diary*","quotes","vocab"]' && s8.quotes === 'Дневники' && s8.backToDiary && s8.drawer.indexOf('stats') < 0 && s8.drawer.indexOf('diary') >= 0 && JSON.stringify(s8.alias.slice(0, 3)) === '["library","diary","path"]', s8);
ok('8b обложка скина без скина видна с замком и ведёт в магазин; со скином «Эллада» открыта, новый дневник берёт её обложку, папирус и терракоту',
  s8.lockShown && s8.ask && s8.notSet && JSON.stringify(s8.ellada) === '{"cv":"amphora","pp":"papyrus","ink":"terracotta"}' && s8.unlocked && s8.othersLocked && s8.cv === 'amphora/black' && s8.prev, s8);
ok('8c «Аа» в записи: интервал, размер, края и метка меняются сразу, текст и поле остаются',
  s8.aaOpen && s8.aa.same && s8.aa.lh === 'wide' && s8.aa.fs === 18 && s8.aa.al === 'justify' && s8.aa.cl === 'green' && s8.aa.dom === 'wide/justify/green' && s8.aa.still, s8.aa);
ok('8d чек-лист, заголовок # → ##, маркер, нумерованный список; повторное нажатие снимает; «Отменить» и «Вернуть»',
  s8.ck === '- [ ] строка' && s8.ckOff === 'строка' && s8.undo === '- [ ] строка' && s8.redo === 'строка' && s8.h1 === '# строка' && s8.h2 === '## строка' && s8.mk === '==выделить==' && s8.mkOff === 'выделить' && s8.ol === '1. а\n2. б', s8);
// Enter continues the list; an empty item ends it; tapping a checkbox in the diary ticks it in the text
await p.evaluate(() => { const x = el('dyEX'); x.value = '- [ ] молоко'; x.focus(); x.setSelectionRange(x.value.length, x.value.length); });
await p.keyboard.press('Enter'); await p.keyboard.type('хлеб'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.keyboard.type('конец');
const s8e = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)), r = { x: el('dyEX').value };
  dyBack(); await w(200); const y = S.diaries.find(d => d.t === 'Эллада');
  r.boxes = document.querySelectorAll('#dyBox .dyent .dyckb').length; document.querySelector('#dyBox .dyent .dyckb').click(); await w(100);
  r.after = y.e[0].x; r.on = !!document.querySelector('#dyBox .dyent .dyck.on'); r.view = DY.view; r.stripe = document.querySelector('#dyBox .dyent').dataset.cl;
  r.md = dyMd('__п__ ~~з~~ ==м== **ж** *к*'); return r; });
ok('8e Enter продолжает список, пустой пункт его заканчивает; галочка в дневнике отмечает пункт в тексте; метка видна полоской',
  s8e.x === '- [ ] молоко\n- [ ] хлеб\nконец' && s8e.boxes === 2 && s8e.after === '- [x] молоко\n- [ ] хлеб\nконец' && s8e.on && s8e.view === 'book' && s8e.stripe === 'green' &&
  /<u>п<\/u>/.test(s8e.md) && /<s>з<\/s>/.test(s8e.md) && /<mark>м<\/mark>/.test(s8e.md) && /<b>ж<\/b>/.test(s8e.md) && /<i>к<\/i>/.test(s8e.md), s8e);
const s8f = await p.evaluate(() => { const o = diaryNorm([{ id: 'dyz', lh: 'x', al: 1, pp: 'stars', ink: 'gold', e: [{ id: 'e1', x: 'т', cl: 'pink' }, { id: 'e2', x: 'т', cl: 'blue' }] }])[0];
  return { lh: o.lh, al: o.al, pp: o.pp, ink: o.ink, cl: o.e.map(n => n.cl) }; });
ok('8f новые поля (интервал, края, метка, бумага и чернила скинов) проверяются при чтении', JSON.stringify(s8f) === '{"lh":"normal","al":"left","pp":"stars","ink":"gold","cl":["","blue"]}', s8f);
const em = await p.evaluate(() => { navGo('diary'); return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(el('diary').textContent + DIARY_TPL.map(t => t.n + t.x).join('')); });
ok('нет эмодзи в разделе', !em);
ok('нет ошибок страницы', errs.length === 0, errs);
console.log(`SUMMARY diary.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
