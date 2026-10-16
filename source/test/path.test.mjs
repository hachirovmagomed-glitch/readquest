// «Путь читателя» (arch.md 16.10, поле pathId):
//  1) карта и карточка книги ничего не пишут: NS и NS_set побайтно равны, setItem не вызывался;
//  2) «Взять в библиотеку»: книга одна, с pathId, текст в IDB, открывается читалка; повторный тап копию не добавляет;
//  3) экспорт → сброс → импорт: pathId на месте, карта снова отмечает книгу; старый бэкап без pathId и битый pathId не ломают карту;
//  4) звание и «прочитано» берутся из S.finished, монеты и XP не меняются.
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
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
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
  pathOpen('odyssey'); const sheet = !el('bookSheet').classList.contains('hidden'); el('bookSheet').classList.add('hidden');
  pathOpen('crime'); el('bookSheet').classList.add('hidden');
  const roads = document.querySelectorAll('#pathBox .pathline path').length;
  return { nodes, ch, sheet, roads, vis: !el('path').classList.contains('hidden') }; });
ok('1a карта: 4 главы, 14 книг, дорога между книгами (10 отрезков), карточка открывается', m.vis && m.ch === 4 && m.nodes === 14 && m.roads === 10 && m.sheet, m);
const b = await snap(); const w = await p.evaluate(() => window.__lsW.filter(k => k === RQ_K.v1 || k === RQ_K.set));
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

// 3. export → reset → import
const exp = await p.evaluate(async (id) => { S.finished.push(id); save(); await new Promise(r => setTimeout(r, 300)); return JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })); }, t.id);
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
ok('3b импорт: «Одиссея» отмечена прочитанной, «1 из 14»', r.done && /^1 из 14/.test(r.sum), r);
const old = JSON.parse(exp); old.library.userBooks.forEach(x => { delete x.pathId; });
r = await roundTrip(old);
ok('3c старый бэкап без pathId: импорт проходит, книга обычная, «0 из 14»', !r.done && /^0 из 14/.test(r.sum), r);
for (const bad of [42, 'atlantis', null, { x: 1 }]) {
  const j = JSON.parse(exp); j.library.userBooks.forEach(x => { if (x.id === t.id) x.pathId = bad; });
  r = await roundTrip(j);
  ok('3d битый pathId ' + JSON.stringify(bad) + ' → обычная книга, карта без ошибок', !r.done && /^0 из 14/.test(r.sum), r);
}
r = await roundTrip(ej);

// 4. rank + economy
const k = await p.evaluate(async () => {
  const before = { gold: S.gold, xp: S.xp };
  ['aesop', 'oedipus'].forEach(function (pid, i) { const id = 'ptest' + i; S.userBooks.push({ id, title: pid, author: '', pathId: pid, genre: 'Путь читателя' }); S.finished.push(id); });
  navGo('path'); await new Promise(r => setTimeout(r, 300));
  const rank = el('pathBox').querySelector('.pathsum-s').textContent, full = !!document.querySelector('#pathBox .pathch.full[data-ch="ch1"]');
  return { rank, full, before, after: { gold: S.gold, xp: S.xp } };
});
ok('4a глава I прочитана целиком → звание «Слушатель рапсодов», глава отмечена', /Слушатель рапсодов/.test(k.rank) && k.full, k);
ok('4b монеты и XP картой не меняются', k.before.gold === k.after.gold && k.before.xp === k.after.xp, k);
const src = await p.evaluate(() => String(renderPath) + String(pathLines) + String(pathOpen) + String(pathState) + String(pathRank));
ok('4c код карты не пишет: нет save(), saveSet, localStorage, присваиваний S.*', !/save\(|saveSet|localStorage|S\.\w+\s*=[^=]|S\.\w+\.push/.test(src), src.length);
ok('нет ошибок страницы', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log('SUMMARY path.test ' + n + '/' + checks.length);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
