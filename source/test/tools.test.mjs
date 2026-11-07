// «Инструменты читателя» (06.11, Джессика: «внедрить в магазин инструменты, которые читатель будет собирать и может ими пользоваться
// во время чтения», «Реализуй всё это»). js/tools.js, arch.md 06.11 (S.tools, S.ink, S.stk).
//  1) магазин: вкладка «Инструменты» рядом со скинами, 12 карточек, покупка, лимиты расходников, монеты списываются один раз;
//  2) в книге: «Сумка» в нижней панели, всё видно (не купленное — с ценой), закрепление в панели;
//  3) песочные часы: опыт строки ×1,5 за 30 засчитанных минут; часть чертежа за 30 минут; строки в итоге сессии;
//  4) щит серии спасает серию за пропущенный день;
//  5) перо, стикеры, закладка-предмет на странице; 6) лупа; 7) стили маркеров, линейки, фонарь, компас, шаблоны, записная книжка;
//  8) после перезагрузки всё на месте; ошибок страницы нет.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/dir] node tools.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.evaluateOnNewDocument(() => {
  window.__rqTimeOffset = window.__rqTimeOffset || 0;
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset));
});
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const yes = async () => { await p.waitForFunction(() => el('rqAsk') && !el('rqAsk').hidden, { timeout: 3000 }); await p.evaluate(() => el('rqAskOk').click()); await sleep(150); };

/* 1. shop */
const s1 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  openLook(true); await w(300); shopTestGold(); await w(100);
  const tab = document.querySelector('.shopkinds [data-k="tools"]'); const r = { tab: tab && tab.textContent, skins: !el('shopList').hidden };
  tab.click(); await w(100);
  r.cards = document.querySelectorAll('#toolShop .tlcard').length; r.list = el('shopList').hidden; r.shown = !el('toolShop').hidden;
  r.names = [...document.querySelectorAll('#toolShop .tlname')].map(x => x.firstChild.textContent);
  r.gold = S.gold; return r; });
ok('1 вкладка «Инструменты» рядом со «Скинами», 12 карточек, скины прячутся только на время вкладки', s1.tab === 'Инструменты' && s1.skins && s1.cards === 12 && s1.list && s1.shown &&
  s1.names.join('|') === 'Лупа|Перо для полей|Щит серии|Песочные часы|Компас книги|Пенал маркеров|Линейки|Закладки-предметы|Наборы стикеров|Шаблоны цитат|Фонарь следопыта|Записная книжка слов', s1);
await shot('390-1-magazin-instrumenty');
const g0 = s1.gold;
await p.evaluate(() => toolBuyAsk('hg')); await yes();
await p.evaluate(() => toolBuyAsk('lupa')); await yes();
await p.evaluate(() => toolBuyAsk('shield')); await yes();
await p.evaluate(() => toolBuyAsk('shield')); await yes();
const s1b = await p.evaluate(() => ({ g: S.gold, t: JSON.parse(JSON.stringify(S.tools)), third: toolBuy('shield'), again: toolBuy('lupa'),
  lupa: document.querySelector('#toolShop .tlcard[data-id="lupa"] .tlbuy').textContent, sh: document.querySelector('#toolShop .tlcard[data-id="shield"] .tlbuy').disabled }));
ok('1b покупка: часы 60 + лупа 250 + два щита по 200 = −710; третий щит и вторая лупа не продаются', s1b.g === g0 - 710 && s1b.t.n.hg === 1 && s1b.t.own.lupa === 1 && s1b.t.n.shield === 2 &&
  s1b.third.reason === 'max' && s1b.again.reason === 'owned' && /Есть/.test(s1b.lupa) && s1b.sh, s1b);

/* 2. the bag in the book */
await (await p.$('#fileInp')).uploadFile(TXT); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
const s2 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  showChrome(); el('btnBag').click(); await w(200);
  const d = el('qSheet'), rows = [...d.querySelectorAll('.tlrow')];
  const r = { open: !d.hidden, n: rows.length, first: rows.slice(0, 3).map(x => x.dataset.id), own: rows.filter(x => x.dataset.own === '1').map(x => x.dataset.id).sort(), price: /250|400/.test(rows.find(x => x.dataset.id === 'pen').textContent) };
  d.querySelector('[data-pin="lupa"]').click(); await w(100);
  r.pin = S.tools.pin.slice(); r.btn = !!document.querySelector('#toolPins [data-tool="lupa"]'); return r; });
ok('2 «Сумка» в нижней панели: 12 строк, купленное сверху (закладка Карандашного скина — в подарок со скином), некупленное видно с ценой; булавка ставит лупу в панель', s2.open && s2.n === 12 && s2.own.join() === 'hg,lupa,marks,shield' && s2.price && s2.pin.join() === 'lupa' && s2.btn, s2);
await shot('390-2-sumka');

/* 3. hourglass + blueprint */
await p.evaluate(() => { document.querySelector('#qSheet [data-go="hg"]').click(); }); await sleep(200);
const s3a = await p.evaluate(() => ({ hg: S.tools.hg, n: S.tools.n.hg || 0, chip: !el('hgChip').hidden && el('hgChip').textContent }));
ok('3a часы перевёрнуты: 30 минут, в строке страницы «ещё 30 мин»', s3a.hg && s3a.hg.left === 30 && s3a.n === 0 && /ещё 30 мин/.test(s3a.chip), s3a);
for (let i = 0; i < 14; i++) { await p.evaluate(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); }); await sleep(200); }
await p.evaluate(async () => { __navAllow = true; await closeReader(); __navAllow = false; }); await sleep(2500);
const s3 = await p.evaluate(() => { const r = SESS[SESS.length - 1];
  return { min: r.minutes, xp: r.xp, left: S.tools.hg.left, parts: S.tools.parts, pf: S.tools.pf, sum: el('sumTools').innerText, hid: el('sumTools').classList.contains('hidden') }; });
const base = Math.round(s3.xp / 1.5);
ok('3 опыт строки ×1,5 за минуты внутри 30 (≈ ' + base + ' → ' + s3.xp + '), часть чертежа за 30 минут, обе строки в итоге сессии', s3.min >= 30 && s3.xp >= Math.floor(base * 1.5) - 2 && s3.left <= 0.001 && s3.pf === 1 &&
  Object.values(s3.parts).reduce((a, b) => a + b, 0) === 1 && !s3.hid && /XP — песочные часы/.test(s3.sum) && /Часть чертежа/.test(s3.sum), s3);
await shot('390-3-itog-sessii');

/* 4. shield */
const s4 = await p.evaluate(async () => {
  S.streak = 5; S.lastDay = addLocalDays(today(), -2); save();
  __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; await new Promise(r => setTimeout(r, 2000));
  for (let i = 0; i < 3; i++) { window.__rqTimeOffset += 120000; goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 200)); }
  __navAllow = true; await closeReader(); __navAllow = false; await new Promise(r => setTimeout(r, 1200));
  return { streak: S.streak, n: S.tools.n.shield, sh: S.tools.sh.slice(), sum: el('sumTools').innerText, want: addLocalDays(today(), -1) }; });
ok('4 щит серии: пропущенный день прикрыт, серия 5 → 6, щитов 2 → 1, в итоге «Щит серии спас серию»', s4.streak === 6 && s4.n === 1 && s4.sh.join() === s4.want && /спас серию/.test(s4.sum), s4);

/* 5. pen, stickers, bookmark item */
await p.evaluate(() => { el('btnDone') && el('btnDone').click(); }); await sleep(300);
await p.evaluate(() => { S.gold += 3000; ['pen', 'stickers', 'marks', 'markers', 'rulers', 'lamp', 'compass', 'qtpl', 'words'].forEach(id => { const r = toolBuy(id); if (!r.ok) throw new Error(id + ' ' + r.reason); }); });
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2200);
const s5 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), r = {};
  toolsMode('pen'); await w(100); const L = el('tlLayer'), b = L.getBoundingClientRect();
  const ev = (t, x, y) => L.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, clientX: b.left + x, clientY: b.top + y, buttons: t === 'pointerup' ? 0 : 1 }));
  ev('pointerdown', 40, 60); for (let i = 1; i <= 10; i++) ev('pointermove', 40 + i * 12, 60 + i * 6); ev('pointerup', 160, 120); await w(50);
  const k = String(R.page + 1); r.ink = (S.ink[R.book.id] || {})[k]; r.bar = !el('tlBar').hidden && el('tlBar').querySelectorAll('.tlcol').length;
  r.mode = L.dataset.mode; return r; });
ok('5 перо: штрих рисуется на странице и сохраняется (S.ink, x/y в 0…1000), полоса перо: 5 цветов', s5.ink && s5.ink.length === 1 && s5.ink[0].p.length >= 10 && s5.bar === 5 && s5.mode === 'pen', { n: s5.ink && s5.ink.length, pts: s5.ink && s5.ink[0].p.length, bar: s5.bar });
await shot('390-5-pero');
const s5b = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), r = {};
  document.querySelector('#tlBar [data-b="undo"]').click(); await w(50); r.undo = !(S.ink[R.book.id] && S.ink[R.book.id][String(R.page + 1)]);
  toolsMode('stk'); await w(100); const L = el('tlLayer'), b = L.getBoundingClientRect();
  L.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: b.left + 200, clientY: b.top + 300, buttons: 1 })); await w(50);
  r.stk = (S.stk[R.book.id] || []).slice(); r.shown = document.querySelectorAll('#tlStk .tlstk').length;
  toolsMode(''); S.tools.sel.mark = 'ribbon'; addBookmark(); await w(150); toolsLayerDraw();
  r.mark = !el('tlMark').hidden && el('tlMark').dataset.v; r.layerOff = el('tlLayer').dataset.mode === '' && getComputedStyle(el('tlLayer')).pointerEvents === 'none';
  return r; });
ok('5b «Назад» убирает штрих; стикер встаёт на страницу; закладка-лента на углу страницы с закладкой; без режима слой не ловит касания', s5b.undo && s5b.stk.length === 1 && s5b.stk[0].s === 'heart' && s5b.shown === 1 && s5b.mark === 'ribbon' && s5b.layerOff, s5b);
await shot('390-5b-stiker-zakladka');

/* 6. lupa */
const s6 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  toolsMode('lupa'); await w(50); const L = el('tlLayer'), b = el('viewer').getBoundingClientRect();
  L.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: b.left + b.width / 2, clientY: b.top + b.height / 3, buttons: 1 })); await w(50);
  const ln = el('tlLens'); return { shown: ln && !ln.hidden, cls: ln && ln.className, txt: ln && ln.textContent.trim().length }; });
ok('6 лупа: под пальцем — строка крупно', s6.shown && s6.cls === 'txt' && s6.txt > 10, s6);
await shot('390-6-lupa');
await p.evaluate(() => { el('tlLayer').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 })); toolsMode(''); });

/* 7. looks */
const s7 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms)), r = {};
  S.tools.sel.hls = 'wave'; S.tools.sel.ruler = 'wood'; toolsApply(); r.rs = document.documentElement.dataset.rs;
  const tn = [...el('content').querySelectorAll('p')].map(x => x.firstChild).find(n => n && n.nodeType === 3 && n.nodeValue.length > 30);
  const rg = document.createRange(); rg.setStart(tn, 0); rg.setEnd(tn, 20); const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  addQuote(false, 'g'); await w(300);
  const q = (S.quotes[R.book.id] || []).slice(-1)[0]; r.hs = q && q.hs; const m = [...el('content').querySelectorAll('mark')].pop(); r.mark = m && m.dataset.hs;
  r.deco = m && getComputedStyle(m).textDecorationStyle;
  S.vocab = S.vocab || []; S.vocab.push({ w: tn.nodeValue.trim().split(/\s+/).find(x => x.replace(/[^\p{L}]/gu, '').length >= 5).replace(/[^\p{L}]/gu, ''), ctx: '', book: R.book.title, date: today(), box: 0, d: 'тест' });
  S.tools.on.lamp = true; TL.lamp.key = ''; await toolsLamp(); r.lamp = CSS.highlights.get('rq-lamp-w') ? CSS.highlights.get('rq-lamp-w').size : 0;
  toolsCompass(); await w(400); r.compass = !el('qSheet').hidden && el('qSheet').querySelectorAll('.tlch').length; r.here = !!el('qSheet').querySelector('.tlch.here');
  return r; });
ok('7 маркер «Волна» у новой цитаты (q.hs, волнистое подчёркивание), линейка «Деревянная», фонарь подсвечивает слово из словаря, компас: главы и «вы здесь»',
  s7.rs === 'wood' && s7.hs === 'wave' && s7.mark === 'wave' && s7.deco === 'wavy' && s7.lamp >= 1 && s7.compass >= 1 && s7.here, s7);
await shot('390-7-kompas');
const s7b = await p.evaluate(async () => {
  qSheetClose(); const b = R.book, q = S.quotes[b.id].slice(-1)[0], r = {};
  for (const t of ['mini', 'polaroid', 'night', 'paper']) { const bl = await toolsCardBlob(b, q, 'стр. 1', t); r[t] = bl && bl.size > 10000; }
  S.tools.sel.qtpl = 'night'; const bl = await qCardBlob(b, q, 'стр. 1'); r.via = bl && bl.size > 10000;
  r.quiz = dkQuizShow(); r.wb = el('rmNote').classList.contains('tlwb'); return r; });
ok('7b шаблоны цитат рисуются (4 новых, «Ночь» через обычную карточку); записная книжка: проверка слова в стиле тетради', s7b.mini && s7b.polaroid && s7b.night && s7b.paper && s7b.via && s7b.quiz && s7b.wb, s7b);
await shot('390-7b-slovo');

/* 8. reload */
await p.evaluate(async () => { __navAllow = true; await closeReader({ quiet: true }); __navAllow = false; save(); }); await sleep(800);
await p.reload({ waitUntil: 'load' }); await boot();
const s8 = await p.evaluate(() => ({ own: Object.keys(S.tools.own).sort().join(), sh: S.tools.n.shield, pin: S.tools.pin.join(), stk: Object.keys(S.stk).length, sel: S.tools.sel, pf: S.tools.pf, sub: el('toolCardSub') && el('toolCardSub').textContent }));
ok('8 после перезагрузки инструменты, щит, булавка, стикеры и выбор на месте; в профиле «12 из 12»', s8.own === 'compass,lamp,lupa,markers,marks,pen,qtpl,rulers,stickers,words' && s8.sh === 1 && s8.pin === 'lupa' && s8.stk === 1 && s8.sel.mark === 'ribbon' && s8.pf === 1 && /^12 из 12/.test(s8.sub), s8);
await p.evaluate(() => { __navAllow = true; show('profile'); renderProfile(); __navAllow = false; }); await sleep(300);
await shot('390-8-profil');
ok('9 ошибок страницы нет', errs.length === 0, errs.slice(0, 5));
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
