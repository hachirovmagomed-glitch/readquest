// «Путь читателя» (arch.md 16.10, поле pathId):
//  1) карта и карточка книги ничего не пишут: NS и NS_set побайтно равны, setItem не вызывался;
//  2) «Взять в библиотеку»: книга одна, с pathId, текст в IDB, открывается читалка; повторный тап копию не добавляет;
//  3) экспорт → сброс → импорт: pathId на месте, карта снова отмечает книгу; старый бэкап без pathId и битый pathId не ломают карту;
//  4) звание и «прочитано» берутся из S.finished, монеты и XP не меняются;
//  5) книга скачивается только по кнопке и удаляется с телефона: текст уходит из IDB, карточка и прогресс остаются, «Скачать снова» и открытие с полки качают заново.
// Text of books/<id>.txt is served by request interception (fixture), so the test does not depend on the real texts.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node path.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const TEXT = 'Муза, скажи мне о том многоопытном муже, который\n\n' + 'Долго скитался с тех пор, как святой Илион им разрушен. '.repeat(400);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = [], dialogs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
let fetched = 0;
await p.setRequestInterception(true);
p.on('request', r => {
  if (/\/books\/odyssey\.txt/.test(r.url())) { fetched++; r.respond({ status: 200, contentType: 'text/plain; charset=utf-8', body: TEXT }); }
  else if (/\/books\/[a-z]+\.txt/.test(r.url())) r.respond({ status: 404, body: '' });
  else r.continue();
});
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();

// 1. map + sheet = 0 writes
const snap = () => p.evaluate(async () => { await new Promise(r => setTimeout(r, 400)); return { ns: localStorage.getItem(RQ_K.v1), set: localStorage.getItem(RQ_K.set) }; });
await p.evaluate(() => { window.__lsW = []; const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__lsW.push(k); return s.call(this, k, v); }; });
const a = await snap();
const m = await p.evaluate(async () => { navGo('path'); await new Promise(r => setTimeout(r, 300));
  const nodes = document.querySelectorAll('#pathBox .pathnode').length, ch = document.querySelectorAll('#pathBox .pathch').length;
  pathOpen('odyssey'); const sheet = !el('bookSheet').classList.contains('hidden'); const cta = el('bookSheetBody').querySelector('.cta').textContent; el('bookSheet').classList.add('hidden');
  pathOpen('crime'); el('bookSheet').classList.add('hidden');
  const roads = document.querySelectorAll('#pathBox .pathline path').length;
  const card = {}; [['pr', 'prometheus'], ['ae', 'aesop'], ['an', 'antigone'], ['oe', 'oedipus'], ['me', 'medea'], ['il', 'iliad']].forEach(function (x) { pathOpen(x[1]); card[x[0]] = el('bookSheetBody').textContent; el('bookSheet').classList.add('hidden'); });
  const ch1 = Array.from(document.querySelectorAll('#pathBox .pathch[data-ch="ch1"] .pathnode')).map(n => n.dataset.pid).join(' ');
  return { nodes, ch, sheet, roads, cta, ch1, card, vis: !el('path').classList.contains('hidden') }; });
ok('1b глава I «Древняя Греция» по хронологии (Джессика 18.10): эпос, лирика, басня, трагедия, философия, роман', m.ch1 === 'iliad odyssey hesiod lyrics aesop prometheus antigone medea oedipus apology poetics daphnis', m.ch1);
ok('1d карточка книги: эпоха и время; спорное авторство и примерные даты помечены (Джессика 18.10)', /Эпоха\s*Трагедия/.test(m.card.pr) && /ок\. 460 до н\. э\./.test(m.card.pr) && /авторство спорное/i.test(m.card.pr) && /дата примерная/i.test(m.card.pr) && /Эпоха\s*Басня/.test(m.card.ae) && /дата примерная/i.test(m.card.an) && /дата примерная/i.test(m.card.oe) && !/дата примерная/i.test(m.card.me) && /Эпоха\s*Эпос/.test(m.card.il), m.card);
ok('1a карта: 4 главы, 23 книги, дорога между книгами (19 отрезков), карточка открывается', m.vis && m.ch === 4 && m.nodes === 23 && m.roads === 19 && m.sheet, m);
const b = await snap(); const w = await p.evaluate(() => window.__lsW.filter(k => k === RQ_K.v1 || k === RQ_K.set));
ok('1c до кнопки ничего не скачано: кнопка «Скачать на телефон и читать · 1,1 МБ», запросов к books/ нет', /^Скачать на телефон и читать · 1,1 МБ$/.test(m.cta) && fetched === 0, { cta: m.cta, fetched });
ok('1b карта и карточка ничего не пишут (NS и NS_set равны, setItem 0)', a.ns === b.ns && a.set === b.set && w.length === 0, { writes: w });
const money0 = await p.evaluate(() => ({ gold: S.gold, xp: S.xp }));

// 2. take the book
const t = await p.evaluate(async () => {
  const n0 = S.userBooks.length; await pathRead('odyssey'); await new Promise(r => setTimeout(r, 900));
  const bk = S.userBooks.filter(x => x.pathId === 'odyssey');
  const inReader = !el('reader').classList.contains('hidden');
  const idb = bk[0] ? await __rq.idb.getText(bk[0].id).catch(() => null) : null;
  return { added: S.userBooks.length - n0, n: bk.length, id: bk[0] && bk[0].id, title: bk[0] && bk[0].title, inReader, idbLen: idb ? idb.length : 0, noTextInLS: !/Илион/.test(localStorage.getItem(RQ_K.v1) || '') };
});
ok('2a «Взять в библиотеку»: одна книга с pathId, «Одиссея», текст в IDB (не в localStorage), открыта читалка', t.added === 1 && t.n === 1 && t.title === 'Одиссея' && t.idbLen > 1000 && t.noTextInLS && t.inReader, t);
const t2 = await p.evaluate(async () => { await closeReader({ quiet: true }); navGo('path'); await pathRead('odyssey'); await new Promise(r => setTimeout(r, 600));
  const n = S.userBooks.filter(x => x.pathId === 'odyssey').length, inReader = !el('reader').classList.contains('hidden'); await closeReader({ quiet: true }); return { n, inReader }; });
ok('2b повторный тап открывает ту же книгу, копии нет, текст скачан один раз', t2.n === 1 && t2.inReader && fetched === 1, { ...t2, fetched });
const t3 = await p.evaluate(async () => { const n0 = S.userBooks.length; await pathRead('hamlet'); return S.userBooks.length - n0; });
ok('2c нет текста (404) → книга не добавляется', t3 === 0, t3);

// 5. delete from the phone, download again
const d = await p.evaluate(async (id) => {
  const bk = S.userBooks.find(x => x.id === id); S.progress[id] = { ratio: 0.3, page: 5 }; save(); await new Promise(r => setTimeout(r, 400));
  pathOpen('odyssey'); const del = el('bookSheetBody').querySelector('.pathdel'); const delT = del ? del.textContent : '';
  const ns0 = localStorage.getItem(RQ_K.v1); window.__lsW = [];
  await pathDrop('odyssey'); await new Promise(r => setTimeout(r, 400));
  const idb = await __rq.idb.getText(id).catch(() => null);
  const st = pathState('odyssey'); const cta = el('bookSheetBody').querySelector('.cta').textContent;
  return { delT, idbGone: !idb, memGone: !bk.text, kept: !!st.lib && S.userBooks.filter(x => x.pathId === 'odyssey').length === 1, prog: (S.progress[id] || {}).ratio,
    nsSame: localStorage.getItem(RQ_K.v1) === ns0, cta, sheetOpen: !el('bookSheet').classList.contains('hidden') };
}, t.id);
ok('5a «Удалить с телефона»: текст удалён из IDB и памяти, карточка и прогресс 30% на месте, rq_v1 не тронут', /^Удалить с телефона · 1,1 МБ$/.test(d.delT) && d.idbGone && d.memGone && d.kept && d.prog === 0.3 && d.nsSame, d);
ok('5b после удаления в карточке «Скачать снова · 1,1 МБ»', /^Скачать снова · 1,1 МБ$/.test(d.cta) && d.sheetOpen, d.cta);
const f0 = fetched;
const g = await p.evaluate(async (id) => { await pathRead('odyssey'); await new Promise(r => setTimeout(r, 900));
  const idb = await __rq.idb.getText(id).catch(() => null); const inReader = !el('reader').classList.contains('hidden'); await closeReader({ quiet: true });
  return { idbLen: idb ? idb.length : 0, inReader, n: S.userBooks.filter(x => x.pathId === 'odyssey').length, prog: (S.progress[id] || {}).ratio >= 0.3 }; }, t.id);
ok('5c «Скачать снова»: текст снова в IDB, та же книга, прогресс не сброшен, открыта читалка', g.idbLen > 1000 && g.inReader && g.n === 1 && g.prog && fetched === f0 + 1, { ...g, fetched });
await p.evaluate(async () => { await pathDrop('odyssey'); });
await p.reload({ waitUntil: 'load' }); await boot();
const f1 = fetched, dl0 = dialogs.length;
const h = await p.evaluate(async (id) => { await openBook(id); await new Promise(r => setTimeout(r, 1200));
  const idb = await __rq.idb.getText(id).catch(() => null); const inReader = !el('reader').classList.contains('hidden'); await closeReader({ quiet: true });
  return { idbLen: idb ? idb.length : 0, inReader }; }, t.id);
ok('5d книга без текста открыта с полки → скачивается заново, без окна «Текст не найден»', h.idbLen > 1000 && h.inReader && fetched === f1 + 1 && dialogs.length === dl0, { ...h, fetched, dialogs: dialogs.slice(dl0) });

// 3. export → reset → import
const exp = await p.evaluate(async (id) => { S.finished.push(id); S.bookStats[id] = { min: 200, pages: 900 }; save(); await new Promise(r => setTimeout(r, 300)); return JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })); }, t.id);
const ej = JSON.parse(exp); const eb = ((ej.library || {}).userBooks || []).find(x => x.id === t.id);
ok('3a в экспорте карточка книги с pathId «odyssey»', eb && eb.pathId === 'odyssey', eb && { pathId: eb.pathId });
const roundTrip = async (j) => {
  await p.evaluate(async (s) => { await __rq.importBackup(JSON.parse(s)); }, JSON.stringify(j));
  await p.reload({ waitUntil: 'load' }); await boot();
  return p.evaluate(async () => { navGo('path'); await new Promise(r => setTimeout(r, 300));
    const n = document.querySelector('#pathBox .pathnode[data-pid="odyssey"]');
    return { done: n && n.classList.contains('done'), sum: el('pathBox').querySelector('.pathsum-t').textContent, err: 0 }; });
};
let r = await roundTrip(ej);
ok('3b импорт: «Одиссея» отмечена прочитанной, «1 из 23»', r.done && /^1 из 23/.test(r.sum), r);
const old = JSON.parse(exp); old.library.userBooks.forEach(x => { delete x.pathId; });
r = await roundTrip(old);
ok('3c старый бэкап без pathId: импорт проходит, книга обычная, «0 из 23»', !r.done && /^0 из 23/.test(r.sum), r);
for (const bad of [42, 'atlantis', null, { x: 1 }]) {
  const j = JSON.parse(exp); j.library.userBooks.forEach(x => { if (x.id === t.id) x.pathId = bad; });
  r = await roundTrip(j);
  ok('3d битый pathId ' + JSON.stringify(bad) + ' → обычная книга, карта без ошибок', !r.done && /^0 из 23/.test(r.sum), r);
}
r = await roundTrip(ej);

// 4. rank + economy
const k = await p.evaluate(async () => {
  const before = { gold: S.gold, xp: S.xp };
  ['aesop', 'oedipus', 'prometheus', 'antigone', 'medea', 'iliad', 'hesiod', 'lyrics', 'apology', 'poetics', 'daphnis'].forEach(function (pid, i) { const id = 'ptest' + i; S.userBooks.push({ id, title: pid, author: '', pathId: pid, genre: 'Путь читателя' }); S.finished.push(id); S.bookStats[id] = { min: 300, pages: 100 }; });
  navGo('path'); await new Promise(r => setTimeout(r, 300));
  const rank = el('pathBox').querySelector('.pathsum-s').textContent, full = !!document.querySelector('#pathBox .pathch.full[data-ch="ch1"]');
  return { rank, full, before, after: { gold: S.gold, xp: S.xp } };
});
ok('4a глава I прочитана целиком → звание «Слушатель рапсодов», глава отмечена', /Слушатель рапсодов/.test(k.rank) && k.full, k);
ok('4b монеты и XP картой не меняются', k.before.gold === k.after.gold && k.before.xp === k.after.xp, k);
const src = await p.evaluate(() => String(renderPath) + String(pathLines) + String(pathOpen) + String(pathState) + String(pathRank));
ok('4c код карты не пишет: нет save(), saveSet, localStorage, присваиваний S.*', !/save\(|saveSet|localStorage|S\.\w+\s*=[^=]|S\.\w+\.push/.test(src), src.length);
// 6. anti-cheat (Джессика 17.10: «пробежал книгу на 70% за несколько минут»): the map credits only counted reading minutes
const ac = await p.evaluate(async () => {
  const id = 'pcheat'; S.userBooks.push({ id, title: 'Царь Эдип', author: '', pathId: 'oedipus' }); /* 104 КБ */
  const st0 = S.userBooks.filter(x => x.pathId === 'oedipus'); st0.forEach(x => { if (x.id !== id) x.pathId = 'none'; });
  S.finished = S.finished.filter(x => !/^ptest1$/.test(x));
  S.progress[id] = { ratio: 0.7, pos: 0.7 }; S.bookStats[id] = { min: 2, pages: 3 };
  const fast = pathState('oedipus').pct;
  navGo('path'); await new Promise(r => setTimeout(r, 300));
  const lab = document.querySelector('#pathBox .pathnode[data-pid="oedipus"] .pn-p').textContent;
  pathOpen('oedipus'); const note = el('bookSheetBody').textContent; el('bookSheet').classList.add('hidden');
  S.bookStats[id] = { min: 30, pages: 60 }; const honest = pathState('oedipus').pct;
  S.finished.push(id); S.bookStats[id] = { min: 3, pages: 100 }; const cheatDone = pathState('oedipus').done;
  S.bookStats[id] = { min: 30, pages: 100 }; const realDone = pathState('oedipus').done;
  return { fast, lab, honest, cheatDone, realDone, noteOk: /пролистанн/i.test(note) };
});
ok('6a пролистал «Царя Эдипа» до 70% за 2 минуты → на карте не больше 15% (засчитываются только минуты чтения)', ac.fast <= 15 && /^\d+%$/.test(ac.lab) && parseInt(ac.lab) === ac.fast, ac);
ok('6b честные 30 минут → засчитаны все 70%', ac.honest === 70, ac);
ok('6c «прочитано» с 3 минутами чтения на 104 КБ не засчитывается, с 30 минутами засчитывается; в карточке объяснение', !ac.cheatDone && ac.realDone && ac.noteOk, ac);
ok('нет ошибок страницы', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log('SUMMARY path.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
