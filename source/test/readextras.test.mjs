// 29.10 раздел «Чтение» (Джессика: «давай реализуем все»): SET.rx (arch.md 29.10) — строка внизу, чтение вслух, ночь по расписанию,
// жесты, меню выделения, экран, новые книги, «сколько осталось» по своей скорости.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node readextras.test.mjs
import puppeteer from 'puppeteer-core';
import { normRx } from '../storage/schema.js';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const fresh = async (w = 390, h = 844) => {
  const p = await (await browser.createBrowserContext()).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  return p;
};
const openFirst = (p) => p.evaluate(async () => { const b = BOOKS.find(x => x.text && x.text.length > 50000) || BOOKS[0]; await openBook(b.id); return b.id; });
let p = await fresh();

// 1. normalisation: page and node (schema.js) agree, junk → defaults
const JUNK = { foot: { pct: 1, clock: true }, tts: { rate: 7, voice: 5, follow: 'no' }, night: { on: true, from: '25:00', to: '06:30', day: 'white' },
  gest: { dbl: 'zoom', pinch: false }, sel: { off: ['ai', 'ai', 'x'], order: ['copy'], color: 'r' }, screen: { orient: 'up', spread: 'land' },
  fresh: { set: '  Ночь  ', toc: true }, spd: { cpm: 99999, spp: 30, n: -3 }, extra: 1 };
let r = await p.evaluate((j) => ({ a: rqRxNorm(j), d: rqRxNorm(null), set: SET.rx }), JUNK);
const nd = normRx(JUNK);
ok('1 rqRxNorm = schema normRx; junk → defaults, unknown keys dropped', JSON.stringify(r.a) === JSON.stringify(nd) && r.a.tts.rate === 2 && r.a.tts.voice === '' && r.a.tts.follow === true &&
  r.a.night.from === '22:00' && r.a.night.to === '06:30' && r.a.gest.dbl === 'off' && r.a.gest.pinch === false && r.a.sel.off.join() === 'ai' && r.a.sel.color === '' &&
  r.a.screen.orient === 'auto' && r.a.screen.spread === 'land' && r.a.fresh.set === 'Ночь' && r.a.spd.cpm === null && r.a.spd.spp === 30 && r.a.spd.n === 0 && !('extra' in r.a), { page: r.a, node: nd });
ok('1 a fresh start has SET.rx with the defaults (nothing changes for anyone)', JSON.stringify(r.set) === JSON.stringify(r.d) && r.d.foot.page && !r.d.foot.pct && r.d.gest.bright && r.d.gest.dbl === 'off' && r.d.screen.spread === 'auto', r.set);

// 2. the settings: «Чтение → Удобство чтения», seven cards, search finds a row inside a closed card
await p.evaluate(() => openGeneralSettings(false, 'read')); await sleep(200);
r = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#rxCard > .xrow')].filter(x => x.offsetParent).map(x => x.querySelector('.xt').textContent), open: [...document.querySelectorAll('#rxCard .rxbox')].some(b => !b.hidden) }));
ok('2 seven cards, all closed', r.cards.length === 7 && r.cards[0] === 'Строка внизу страницы' && !r.open, r);
await p.evaluate(() => openGeneralSettings(false)); await sleep(150);
await p.type('#setSearch', 'двойной'); await sleep(200);
await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres')].find(b => /Двойной тап/.test(b.textContent)).click()); await sleep(400);
r = await p.evaluate(() => ({ sec: el('settings').dataset.sec, open: !el('rxBgest').hidden, vis: !!el('rxGDbl').offsetParent }));
ok('2 search «двойной» → «Чтение», card «Жесты» opens', r.sec === 'read' && r.open && r.vis, r);
await p.evaluate(() => [...el('rxGDbl').querySelectorAll('button')].find(b => b.textContent === 'Закладка').click()); await sleep(100);
r = await p.evaluate(() => ({ v: SET.rx.gest.dbl, saved: JSON.parse(localStorage.getItem(RQ_K.set)).rx.gest.dbl, head: el('rxXgest').textContent }));
ok('2 a choice is saved to rq_set and shown in the card title', r.v === 'mark' && r.saved === 'mark' && /двойной тап: закладка/.test(r.head), r);

// 3. the line under the page: percent, clock, minutes to the end of the chapter; page number off
const bid = await openFirst(p); await sleep(600);
await p.evaluate(() => { const f = SET.rx.foot; f.pct = true; f.clock = true; f.chap = true; saveSet(); concealChrome('tap'); goPage(3, false); }); await sleep(300);
r = await p.evaluate(() => ({ clock: el('rxClock').textContent, info: el('rxInfo').textContent, cv: getComputedStyle(el('rxClock')).visibility, iv: getComputedStyle(el('rxInfo')).visibility, pg: getComputedStyle(el('pgNum')).display, bars: el('reader').classList.contains('barsoff') || el('reader').classList.contains('imm') }));
ok('3 bars hidden → «ЧЧ:ММ» left, «N мин до конца главы/книги · N %» before the page number', /^\d\d:\d\d$/.test(r.clock) && /(мин|минуты|ч).* до конца (главы|книги) · \d+ %$/.test(r.info) && r.cv === 'visible' && r.iv === 'visible' && r.pg !== 'none' && r.bars, r);
await p.evaluate(() => { SET.rx.foot.page = false; rxFoot(); }); await sleep(50);
ok('3 «Номер страницы» off hides the number', await p.evaluate(() => getComputedStyle(el('pgNum')).display === 'none'));
await p.evaluate(() => { Object.assign(SET.rx.foot, { page: true, pct: false, clock: false, chap: false }); rxFoot(); });
ok('3 everything else off → the line is as before', await p.evaluate(() => el('rxClock').textContent === '' && el('rxInfo').textContent === '' && getComputedStyle(el('pgNum')).display !== 'none'));

// 4. speed: a forward turn after 4 s … 6 min teaches chars per minute; a fast flip does not
r = await p.evaluate(async () => { const t = () => new Promise(r => setTimeout(r, 50)), n0 = SET.rx.spd.n; RX_SP.pg = R.page; RX_SP.t = Date.now() - 30000; goPage(R.page + 1, true); await t();
  const a = { n: SET.rx.spd.n - n0, cpm: SET.rx.spd.cpm }; goPage(R.page + 1, true); await t(); a.fast = SET.rx.spd.n - n0; return a; });
ok('4 30 s on a page → speed learned; a flip a moment later is not counted', r.n === 1 && r.cpm >= 100 && r.cpm <= 6000 && r.fast === 1, r);
r = await p.evaluate((id) => { closeGeneralSettings && 0; bookInfo(id); return new Promise(res => setTimeout(() => res({ left: (document.querySelector('#bookSheetBody .rxleft') || {}).textContent || '' }), 300)); }, bid);
ok('4 the book card shows «осталось ≈ …»', /осталось ≈ (\d+ ч|\d+ мин|меньше минуты)/.test(r.left), r);

// 5. read aloud: speed and voice reach the utterance; «Листать за голосом» off keeps the page
r = await p.evaluate(() => { const got = []; const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => got.push(u.rate);
  SET.rx.tts.rate = 1.5; ttsSay('Проверка'); speechSynthesis.speak = sp; SET.rx.tts.follow = false; const pg = R.page; ttsPageAt(R.book.text.length - 10); const kept = R.page === pg;
  SET.rx.tts.follow = true; SET.rx.tts.rate = 1; try { speechSynthesis.cancel(); } catch (e) {} return { rate: got[0], kept }; });
ok('5 the phone voice reads at «Скорость голоса» 1.5; no page turn with «Листать за голосом» off', r.rate === 1.5 && r.kept, r);

// 6. double tap = the chosen action (bookmark), single tap still works after a pause
r = await p.evaluate(async () => { const n0 = (S.marks[R.book.id] || []).length, v = el('viewer').getBoundingClientRect(), x = v.left + v.width / 2, y = v.top + v.height / 2;
  const bars0 = el('reader').classList.contains('barsoff'); viewerTap(x, y); viewerTap(x, y); await new Promise(r => setTimeout(r, 450));
  const a = { marks: (S.marks[R.book.id] || []).length - n0, same: el('reader').classList.contains('barsoff') === bars0 };
  const pg = R.page; viewerTap(v.left + v.width * 0.9, y); await new Promise(r => setTimeout(r, 450)); a.turn = R.page - pg; return a; });
ok('6 double tap → a bookmark, the bars do not flicker; a single tap on the right still turns the page', r.marks === 1 && r.same && r.turn === 1, r);
await p.evaluate(() => { SET.rx.gest.dbl = 'off'; });

// 7. selection menu: hidden buttons and order
r = await p.evaluate(() => { SET.rx.sel.off = ['ai', 'dict']; SET.rx.sel.order = ['copy', 'note']; rxSelApply();
  const o = (id) => +el(id).style.order; return { copy: o('spCopy'), note: o('spNote'), colors: o('spColors'), ai: el('spAI').classList.contains('rxoff'), dict: el('spDict').classList.contains('rxoff'), del: o('spDel') }; });
ok('7 «Копировать» first, «Заметка» second, «Объясни» and «Перевести» hidden, quote buttons at the end', r.copy === 1 && r.note === 2 && r.colors === 3 && r.ai && r.dict && r.del === 20, r);
r = await p.evaluate(() => { SET.rx.sel.color = 'b'; SET.hlc = 'y'; renderSpColors(); const on = el('spColors').querySelector('.on'); const v = on && on.dataset.c; SET.rx.sel = { off: [], order: [], color: '' }; rxSelApply(); return v; });
ok('7 «Цвет для «Заметки»» = голубой is the marked colour', r === 'b', r);

// 8. night on a schedule
r = await p.evaluate(() => { const d = new Date(), hm = (m) => { m = (m + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }, now = d.getHours() * 60 + d.getMinutes();
  SET.theme = 'sepia'; SET.cBg = null; applySet(); Object.assign(SET.rx.night, { on: true, from: hm(now - 60), to: hm(now + 60) }); rxNightLast = null; rxNightTick();
  const a = { dark: rxPageDark(), theme: SET.theme }; Object.assign(SET.rx.night, { from: hm(now + 60), to: hm(now + 120) }); rxNightLast = 'n'; rxNightTick(); a.day = !rxPageDark(); a.back = SET.theme;
  SET.rx.night.on = false; return a; });
ok('8 inside the night hours the page turns dark, after them back to the day theme', r.dark && r.day && r.back === 'sepia', r);

// 9. new books: the preset for books becomes the book's own look; the table of contents opens on the first open
r = await p.evaluate(async () => { await closeReader({ quiet: true });
  SET.presets = [{ n: 'Крупно', v: { size: 26, lh: 1.9 } }]; SET.rx.fresh = { set: 'Крупно', pdf: '', toc: true }; saveSet();
  const b = BOOKS.find(x => x.text && !S.progress[x.id] && !(S.lastOpen && S.lastOpen[x.id]) && /Глава|ГЛАВА|Часть/.test(x.text)) || BOOKS.find(x => x.text && !S.progress[x.id] && !(S.lastOpen && S.lastOpen[x.id]));
  const g = SET.size; await openBook(b.id); await new Promise(r => setTimeout(r, 2600));
  return { id: b.id, own: SET.bookSet[b.id], size: SET.size, g, toc: !el('panel').classList.contains('hidden'), ch: bfChapters().length }; });
ok('9 a book opened for the first time gets the set «Крупно» as its own look', r.own && r.own.size === 26 && r.size === 26, r);
ok('9 «Оглавление при первом открытии» shows the chapters (when there are several)', r.ch > 1 ? r.toc : !r.toc, r);
r = await p.evaluate(async () => { await closeReader({ quiet: true }); return { size: SET.size, saved: JSON.parse(localStorage.getItem(RQ_K.set)).size }; });
ok('9 other books keep the common size', r.size === r.saved && r.size !== 26, r);

ok('no page errors', !p.errs.length, p.errs);

// 10. two pages side by side in landscape (phone 800×380)
const q = await fresh(800, 380);
r = await q.evaluate(async () => { const b = BOOKS.find(x => x.text && x.text.length > 50000) || BOOKS[0]; await openBook(b.id); await new Promise(r => setTimeout(r, 500));
  const m = () => ({ w: el('viewer').clientWidth, c: parseFloat(el('content').style.columnWidth) }), one = m();
  SET.rx.screen.spread = 'land'; relayout(); const two = m();
  SET.rx.screen.spread = 'off'; relayout(); const off = m(); SET.rx.screen.spread = 'auto'; relayout(); return { one, two, off }; });
ok('10 landscape: one column by default, two with «И в альбомной», one with «Никогда»', Math.abs(r.one.c - r.one.w) < 2 && r.two.c < r.two.w / 2 && r.two.w > r.one.w && Math.abs(r.off.c - r.off.w) < 2, r);
ok('10 no page errors', !q.errs.length, q.errs);

const pass = checks.filter(Boolean).length; console.log(`SUMMARY readextras.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
