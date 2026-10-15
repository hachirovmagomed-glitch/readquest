// Achievements v2 (тред «Система ачивок», план одобрен 15.10): unit test of the pure catalog + evaluator js/ach-core.js.
// No browser: the file is loaded into a vm context. Everything is derived from sessions[] (counted minutes), so the
// reader's anti-cheat (3 min/page, 12 s flips, jumps, «Слушать», background) already applies to the input rows.
// Run: node ach.test.mjs
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i).slice(0, 400) : '')); };
const ctx = {}; vm.createContext(ctx);
let A = null;
try { vm.runInContext(fs.readFileSync(path.join(here, '..', 'js', 'ach-core.js'), 'utf8'), ctx); A = ctx.RQAch; } catch (e) { console.log('FAIL load js/ach-core.js — ' + e.message); }
if (!A) { console.log('SUMMARY ach.test 0/1'); process.exit(1); }

/* ---- helpers ---- */
let n = 0;
const S = (date, minutes, o) => { o = o || {}; const r = { id: 'r' + (++n), date, bookId: o.book || 'b1', minutes, pageTurns: o.turns != null ? o.turns : Math.round(minutes * 2) };
  if (o.at) r.startedAt = new Date(date + 'T' + o.at + ':00').toISOString(); return r; };
const BOOKS = [
  { id: 'b1', title: 'Хамелеон', author: 'А. П. Чехов', own: false },
  { id: 'u1', title: 'Толстая книга', author: 'Л. Толстой', own: true, type: 'pdf', fname: 'a.pdf', pages: 1200 },
  { id: 'u2', title: 'Сказки', author: 'Л. Толстой', own: true, fname: 'b.fb2', textLen: 1800 * 120 },
  { id: 'u3', title: 'Повести', author: 'Л. Толстой', own: true, fname: 'c.epub', textLen: 1800 * 600 },
  { id: 'u4', title: 'Заметки', author: 'Моя книга', own: true, fname: 'd.txt', textLen: 1800 * 50 },
];
const base = (o) => Object.assign({ sessions: [], finished: [], finishDates: {}, books: BOOKS, xp: 0, streak: 0, quotes: {}, goal: 10 }, o || {});
const ev = (o) => A.evaluate(base(o));
const done = (o, id) => { const r = ev(o)[id]; return !!(r && r.done); };
const days = (from, count, min, o) => { const out = []; const d0 = new Date(from + 'T12:00:00'); for (let i = 0; i < count; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i);
  const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); out.push(S(k, min, o)); } return out; };

/* ---- 1. catalog ---- */
const CAT = A.CAT || [], SEC = A.SECTIONS || [];
const regular = CAT.filter(a => !a.legacy);
ok('1a catalog: 106 achievements + 6 legacy ones (shown only when earned)', regular.length === 106 && CAT.filter(a => a.legacy).length === 6, { regular: regular.length, legacy: CAT.length - regular.length });
ok('1b ids unique', new Set(CAT.map(a => a.id)).size === CAT.length);
const want = { hours: 9, habit: 22, books: 14, sessions: 10, daytime: 8, calendar: 10, returns: 5, formats: 7, quotes: 6, levels: 6, secret: 9 };
const got = {}; regular.forEach(a => { got[a.sec] = (got[a.sec] || 0) + 1; });
ok('1c 11 sections with the planned sizes', SEC.length === 11 && Object.keys(want).every(k => got[k] === want[k] && SEC.some(s => s.id === k)), got);
ok('1d tiers: bronze/silver/gold/legend, secret section = secret tier with a hint', regular.every(a => (a.sec === 'secret') === (a.tier === 'secret')) && regular.every(a => ['bronze', 'silver', 'gold', 'legend', 'secret'].includes(a.tier)) && regular.filter(a => a.tier === 'secret').every(a => a.hint));
const emo = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
ok('1e names and descriptions present, no emoji', CAT.every(a => a.name && a.desc && !emo.test(a.name + a.desc + (a.hint || ''))));
ok('1f points: 10 / 25 / 50 / 100, secret 50, legacy 0', A.points('bronze') === 10 && A.points('silver') === 25 && A.points('gold') === 50 && A.points('legend') === 100 && A.points('secret') === 50 && A.points('legacy') === 0);
const titles = CAT.filter(a => a.title);
ok('1g about 20 titles, unique', titles.length >= 20 && new Set(titles.map(a => a.title)).size === titles.length, titles.length);
const F = A.FRAMES || [];
ok('1h frames: 250 / 500 / 1000 / 2000 / 3500 points + one for all secrets', F.length === 6 && [250, 500, 1000, 2000, 3500].every(p => F.some(f => f.points === p)) && F.some(f => f.secrets));
ok('1i legacy ids of old achievements and badges are in the catalog', ['lvl3', 'lvl5', 'lvl10', 'sess10', 'sess50', 'fin1', 'fin5', 'xp1k', 'xp5k', 'goldA1k', 'goldA5k', 'sk5', 'char10', 'first', 'owl', 'lark', 'marathon', 'streak3', 'streak7', 'collector'].every(id => CAT.some(a => a.id === id)) && A.alias('finisher') === 'fin1');
ok('1j nothing at all for an empty history', Object.values(ev()).every(r => !r.done));

/* ---- 2. hours / sessions ---- */
ok('2a 59.9 counted minutes → no «Первый час»; 60 → yes', !done({ sessions: [S('2026-10-01', 59.9)] }, 'h1') && done({ sessions: [S('2026-10-01', 30), S('2026-10-02', 30)] }, 'h1'));
ok('2b «Первые шаги» needs one whole minute (0.9 min → no)', !done({ sessions: [S('2026-10-01', 0.9)] }, 'first') && done({ sessions: [S('2026-10-01', 1)] }, 'first'));
ok('2c «Марафонец»: ONE session of 30 min (29.9 + 29.9 the same day → no)', !done({ sessions: [S('2026-10-01', 29.9), S('2026-10-01', 29.9)] }, 'marathon') && done({ sessions: [S('2026-10-01', 30)] }, 'marathon'));
ok('2d sessions count only from 5 counted minutes (10 × 4.9 → no «Постоянство»)', !done({ sessions: days('2026-10-01', 10, 4.9) }, 'sess10') && done({ sessions: days('2026-10-01', 10, 5) }, 'sess10'));
ok('2e progress numbers: 90 min of 300 for «Пять часов»', (() => { const r = ev({ sessions: [S('2026-10-01', 90)] }).h5; return r.cur === 90 && r.target === 300; })(), ev({ sessions: [S('2026-10-01', 90)] }).h5);

/* ---- 3. habit ---- */
ok('3a day goal = floor(sum of the day) ≥ 10: 9.8 → no, 5 + 5 → yes', ev({ sessions: [S('2026-10-01', 9.8), S('2026-10-02', 5), S('2026-10-02', 5), S('2026-10-03', 10)] }).d3.cur === 2);
ok('3b three goal days → «Три дня»', done({ sessions: days('2026-10-01', 3, 10) }, 'd3'));
ok('3c streak from history: 3 days × 2 min → «Огонёк»; 1.9 min breaks it', done({ sessions: days('2026-10-01', 3, 2) }, 'streak3') && !done({ sessions: [S('2026-10-01', 2), S('2026-10-02', 1.9), S('2026-10-03', 2)] }, 'streak3'));
ok('3d streak from the app (S.streak = 7) counts too', done({ streak: 7 }, 'streak7'));
ok('3e week Mon–Sun with 4 goal days → wk1; 4 days split over two weeks → no', done({ sessions: days('2026-10-05', 4, 10) }, 'wk1') && !done({ sessions: days('2026-10-10', 4, 10) }, 'wk1'));
ok('3f all 7 days of one week → «Без выходных»', done({ sessions: days('2026-10-05', 7, 10) }, 'full7') && !done({ sessions: days('2026-10-06', 7, 10) }, 'full7'));
ok('3g full calendar month at goal → «Месяц без пропусков» (Feb 2026: 28 days)', done({ sessions: days('2026-02-01', 28, 10) }, 'month') && !done({ sessions: days('2026-02-01', 27, 10) }, 'month'));

/* ---- 4. time of day: startedAt + ≥10 counted min in that session ---- */
ok('4a dawn 05:30, 10 min → «Жаворонок»; 9.9 min → no; no startedAt → no', done({ sessions: [S('2026-10-01', 10, { at: '05:30' })] }, 'lark') && !done({ sessions: [S('2026-10-01', 9.9, { at: '05:30' })] }, 'lark') && !done({ sessions: [S('2026-10-01', 10)] }, 'lark'));
ok('4b 23:30 → «Ночная сова», 02:10 → «Три часа ночи», 12:30 → «Обеденный перерыв»', done({ sessions: [S('2026-10-01', 10, { at: '23:30' })] }, 'owl') && done({ sessions: [S('2026-10-01', 10, { at: '02:10' })] }, 'night3') && done({ sessions: [S('2026-10-01', 10, { at: '12:30' })] }, 'lunch'));
ok('4c «Круглые сутки»: every one of 24 hours', (() => { const ss = []; for (let h = 0; h < 24; h++) ss.push(S('2026-10-' + String(1 + h).padStart(2, '0'), 10, { at: String(h).padStart(2, '0') + ':15' })); return done({ sessions: ss }, 'hours24') && !done({ sessions: ss.slice(1) }, 'hours24'); })());
ok('4d «Выходной марафон»: 120 min over Sat + Sun of one weekend', done({ sessions: [S('2026-10-10', 60), S('2026-10-11', 60)] }, 'weekend') && !done({ sessions: [S('2026-10-11', 60), S('2026-10-12', 60)] }, 'weekend'));

/* ---- 5. calendar: the session day, ≥10 min that day ---- */
ok('5a 1 January with 10 min → «Новогодняя страница»; 9 min → no', done({ sessions: [S('2027-01-01', 10)] }, 'ny') && !done({ sessions: [S('2027-01-01', 9)] }, 'ny'));
ok('5b 29 February → «Високосный день»', done({ sessions: [S('2028-02-29', 10)] }, 'leap'));
ok('5c all weekend days of October 2026 → «Все выходные месяца»', (() => { const ss = ['03', '04', '10', '11', '17', '18', '24', '25', '31'].map(d => S('2026-10-' + d, 10)); return done({ sessions: ss }, 'weekends') && !done({ sessions: ss.slice(1) }, 'weekends'); })());

/* ---- 6. returns ---- */
ok('6a gap of 7 empty days then 10 min → «С возвращением»; 6 days → no', done({ sessions: [S('2026-10-01', 10), S('2026-10-09', 10)] }, 'back7') && !done({ sessions: [S('2026-10-01', 10), S('2026-10-08', 10)] }, 'back7'));
ok('6b gap of 30 days → «Феникс»', done({ sessions: [S('2026-08-01', 10), S('2026-09-01', 10)] }, 'back30'));
ok('6c a book not opened for 30 days, then 10 min in it → «Вспомнить всё»', done({ sessions: [S('2026-08-01', 10, { book: 'u2' }), S('2026-08-15', 10, { book: 'b1' }), S('2026-09-05', 10, { book: 'u2' })] }, 'rebook'));

/* ---- 7. books: S.finished (the 70 % rule lives in closeReader) ---- */
const fin = (ids, extra) => base(Object.assign({ finished: ids, finishDates: Object.fromEntries(ids.map(i => [i, '2026-10-10'])) }, extra));
ok('7a one finished book → «Первая книга»', A.evaluate(fin(['b1'])).fin1.done);
ok('7b «Кирпич»: finished PDF of 1200 pages; «Толстяк» for 600-page text book', A.evaluate(fin(['u1'])).big1000.done && A.evaluate(fin(['u3'])).big500.done && !A.evaluate(fin(['u3'])).big1000.done);
ok('7c 3 books of one author → «Верность автору»; «Моя книга»/«PDF» are not authors', A.evaluate(fin(['u1', 'u2', 'u3'])).author3.done && !A.evaluate(fin(['u4', 'b1'])).author3.done);
ok('7d «Залпом»: first session to finish ≤ 7 days', A.evaluate(fin(['u2'], { sessions: [S('2026-10-04', 10, { book: 'u2' })] })).fast7.done && !A.evaluate(fin(['u2'], { sessions: [S('2026-10-01', 10, { book: 'u2' })] })).fast7.done);
ok('7e «Довести до конца»: a finished book with a 60-day gap inside', A.evaluate(fin(['u2'], { sessions: [S('2026-07-01', 10, { book: 'u2' }), S('2026-09-15', 10, { book: 'u2' })] })).refinish.done);

/* ---- 8. formats ---- */
ok('8a 60 min in a PDF → «PDF»; 59 → no', done({ sessions: [S('2026-10-01', 60, { book: 'u1' })] }, 'pdf60') && !done({ sessions: [S('2026-10-01', 59, { book: 'u1' })] }, 'pdf60'));
ok('8b «Коллекционер»: own book with ≥10 min (added but unread → no)', done({ sessions: [S('2026-10-01', 10, { book: 'u4' })] }, 'collector') && !done({ sessions: [S('2026-10-01', 10, { book: 'b1' })] }, 'collector'));
ok('8c 10 min in 3 formats → «Всеядный»', done({ sessions: [S('2026-10-01', 10, { book: 'u1' }), S('2026-10-01', 10, { book: 'u2' }), S('2026-10-01', 10, { book: 'u3' })] }, 'formats3'));

/* ---- 9. quotes: only in books with ≥10 min, at most one per 2 counted minutes of that book ---- */
const qs = (k) => Array.from({ length: k }, (_, i) => ({ t: 'q' + i }));
ok('9a 20 quotes in a book read 10 min → 5 count', ev({ sessions: [S('2026-10-01', 10, { book: 'u2' })], quotes: { u2: qs(20) } }).q10.cur === 5);
ok('9b quotes in a book read 9 min → 0', ev({ sessions: [S('2026-10-01', 9, { book: 'u2' })], quotes: { u2: qs(20) } }).q1.cur === 0);

/* ---- 10. levels / secrets ---- */
ok('10a level from XP: 400 XP = level 3', done({ xp: 400 }, 'lvl3') && !done({ xp: 399 }, 'lvl3'));
ok('10b secret «Ровно сто»: a day of exactly 100 whole minutes', done({ sessions: [S('2026-10-01', 60), S('2026-10-01', 40.5)] }, 's100') && !done({ sessions: [S('2026-10-01', 101)] }, 's100'));
ok('10c secret «22:22»: a session started at 22:22 with 10 min', done({ sessions: [S('2026-10-01', 10, { at: '22:22' })] }, 's2222') && !done({ sessions: [S('2026-10-01', 10, { at: '22:23' })] }, 's2222'));

/* ---- 11. determinism ---- */
const many = days('2026-06-01', 120, 12, { at: '06:10', book: 'u2' }).concat(days('2026-09-01', 20, 35, { at: '23:40', book: 'u1' }));
const r1 = JSON.stringify(ev({ sessions: many, xp: 30000 })), r2 = JSON.stringify(ev({ sessions: many.slice().reverse(), xp: 30000 }));
ok('11 order of sessions[] does not matter', r1 === r2);
ok('11b legacy-only ids never «done» by evaluation (they come from the old fields)', ['xp1k', 'xp5k', 'goldA1k', 'goldA5k', 'sk5', 'char10'].every(id => !(ev({ sessions: many, xp: 30000 })[id] || {}).done));

const p = checks.filter(Boolean).length; console.log(`SUMMARY ach.test ${p}/${checks.length}`);
process.exit(p === checks.length ? 0 : 1);
