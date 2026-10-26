// Честное чтение (25.10, Джессика «Давай все кроме 3 и 6»; arch.md): живой экран, свой темп, повтор страниц, индекс честности, мини-проверка.
// Run: node source/test/honest.test.mjs
const { createSessionTracker, addSpan, covered, normSpans, SPANS_MAX } = await import(new URL('../reader-session.js', import.meta.url).href);
const G = await import(new URL('../game-awards.js', import.meta.url).href);
let T = 1e6; const rows = [];
const api = { now: () => T, logSession: async r => { rows.push(r); return r; }, logReadingEvent: async () => null };
const M = 60000, S = 1000;
const span10 = p => (p >= 0 && p < 10 ? [p / 10, (p + 1) / 10] : null);
const H = extra => Object.assign({ capMs: 3 * M, minSecMs: 12 * S, counting: true, extend: null, honest: Object.assign({ tailMs: 30 * S, span: span10, seen: [], hon: 1 }, extra || {}) });
const PDFH = extra => Object.assign(H(extra), { extend: { stepMs: M, everyMs: M, maxMs: 8 * M, minFraction: 0.2 } });
let pass = 0, fail = 0;
function ok(name, cond, info) { cond ? pass++ : fail++; console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (info !== undefined ? ' | ' + JSON.stringify(info) : '')); }
async function sess(opts, body, start) {
  const t = createSessionTracker(api); rows.length = 0; T = 1e6;
  t.begin('b', start || 0, opts);
  await body(t, ms => { T += ms; });
  const r = await t.end();
  return { r, t };
}
const turn = (t, p) => { t.pageTurned(true); t.pageShown(p); };
const min = r => r ? +r.minutes.toFixed(4) : null;

// 1. Скрин Джессики: 0 страниц, 3 минуты → +30 XP. Теперь: открыл и не листал → последняя страница не дольше хвоста → пустая сессия.
{ const { r } = await sess(H(), async (t, adv) => { adv(3 * M); }); ok('скрин: 3 мин без листания → строки нет, опыта нет', r === null, min(r)); }
{ const { r } = await sess(H(), async (t, adv) => { adv(3 * S); turn(t, 1); adv(3 * M); }); ok('скрин: одна быстрая страница + 3 мин → строки нет', r === null, min(r)); }
// без honest — как раньше (тест «р» в cap.test.mjs)
{ const { r } = await sess(Object.assign(H(), { honest: undefined }), async (t, adv) => { adv(70 * S); }); ok('без честного режима 70 с на первой странице = 1,1667 (старые правила)', min(r) === 1.1667, min(r)); }

// 2. Живой экран: 5 страниц по минуте, на последней 2 мин без касаний → засчитано 5 + 0,5; ct = 90 с.
{ const { r } = await sess(H(), async (t, adv) => { for (let i = 1; i <= 5; i++) { adv(M); turn(t, i); } adv(2 * M); });
  ok('хвост: 5 мин + 30 с, ct 90', min(r) === 5.5 && r.ct === 90 && r.pageTurns === 5 && !r.fl, r); }
{ const { r } = await sess(H(), async (t, adv) => { for (let i = 1; i <= 3; i++) { adv(M); turn(t, i); } adv(100 * S); t.userActive('scroll'); adv(20 * S); });
  ok('хвост: прокрутка на 100-й с последней страницы → засчитаны все 120 с', min(r) === 5 && !r.ct, r); }
{ const { r } = await sess(H({ tailMs: 90 * S }), async (t, adv) => { for (let i = 1; i <= 3; i++) { adv(M); turn(t, i); } adv(80 * S); });
  ok('хвост по своему темпу 90 с: 80 с на последней засчитаны целиком', min(r) === +(260 / 60).toFixed(4) && !r.ct, r); }
// PDF: зум продлевает лимит, но без касаний дольше 3 мин после последнего — время стоит
{ const { r } = await sess(PDFH(), async (t, adv) => { t.userActive('zoom'); adv(M); t.userActive('zoom'); adv(10 * M); turn(t, 1); adv(M); turn(t, 2); });
  ok('PDF: зум на 1-й мин, потом 10 мин без касаний → страница 1 + 3 = 4 мин (не 5), всего 5', min(r) === 5, min(r)); }
{ const { r } = await sess(PDFH(), async (t, adv) => { for (let m = 0; m < 10; m++) { adv(55 * S); t.userActive('pan', { fraction: 0.6 }); adv(5 * S); } turn(t, 1); adv(M); turn(t, 2); });
  ok('PDF: живая работа 10 мин → потолок 8 мин как раньше', min(r) === 9, min(r)); }

// 3. Повтор страниц: прочитано [0, 0.5]; чтение страниц 0…6 по минуте → засчитаны только 5 и 6.
{ const { r, t } = await sess(H({ seen: [[0, 0.5]] }), async (t, adv) => { for (let i = 1; i <= 6; i++) { adv(M); turn(t, i); } adv(25 * S); });
  ok('повтор: 5 страниц уже читаны → rr 5, засчитана 1 мин + 25 с', r && r.rr === 5 && min(r) === +(85 / 60).toFixed(4) && r.pageTurns === 1 && !r.fl, r);
  ok('повтор: новые страницы добавлены к прочитанному', JSON.stringify(t.coverage()) === JSON.stringify([[0, 0.7]]), t.coverage()); }
{ const { r } = await sess(H({ seen: [[0, 1]] }), async (t, adv) => { for (let i = 1; i <= 9; i++) { adv(M); turn(t, i); } adv(M); });
  ok('перечитывание всей книги: строки нет (опыт не начисляется)', r === null, r); }
{ const { r } = await sess(H(), async (t, adv) => { adv(M); turn(t, 1); adv(30 * S); t.pageTurned(false); t.pageShown(0); adv(30 * S); turn(t, 1); adv(M); turn(t, 2); });
  ok('вернулся на страницу назад в той же сессии: время идёт, но страница одна (лимит общий), это не повтор', r && min(r) === 3 && !r.rr && r.pageTurns === 1, r); }
{ const { r } = await sess(H(), async (t, adv) => { adv(2 * M); for (let i = 0; i < 3; i++) { t.pageTurned(false); t.pageShown(0); adv(20 * S); turn(t, 1); adv(M); } turn(t, 2); });
  ok('туда-обратно: стр. 0 = 2 мин + 3×20 с, стр. 1 = 3×1 мин → 6 мин, у каждой не больше 3', r && min(r) === 6, r); }
{ const seen = [[0, 0.2]]; await sess(H({ seen }), async (t, adv) => { adv(M); turn(t, 1); adv(M); turn(t, 2); adv(M); turn(t, 3); });
  ok('прочитанное из хранилища не меняется на месте', JSON.stringify(seen) === '[[0,0.2]]', seen); }

// 4. Свой темп: порог от средней засчитанной страницы
{ const own = Array.from({ length: 4 }, (_, i) => ({ bookId: 'b', minutes: 5, pageTurns: 5, date: '2026-10-2' + i }));
  ok('темп: 60 с на страницу → порог 24 с', G.paceFloorSec(own, 'b') === 24, G.paceFloorSec(own, 'b'));
  const fast = [{ bookId: 'b', minutes: 3, pageTurns: 18 }];
  ok('темп: 10 с на страницу → порог 8 с (быстрого не наказываем)', G.paceFloorSec(fast, 'b') === 8, G.paceFloorSec(fast, 'b'));
  ok('темп: без истории порог 12 с', G.paceFloorSec([], 'b') === 12);
  const other = [{ bookId: 'x', minutes: 10, pageTurns: 20 }];
  ok('темп: мало по этой книге → по всем книгам (30 с → 12 с)', G.paceFloorSec(other.concat([{ bookId: 'b', minutes: 1, pageTurns: 2 }]), 'b') === 12, G.paceFloorSec(other, 'b'));
  ok('хвост: 60 с на страницу → 60 с; без истории 30 с', G.tailSec(own, 'b') === 60 && G.tailSec([], 'b') === 30); }
{ const { r } = await sess(Object.assign(H(), { minSecMs: 24 * S }), async (t, adv) => { for (let i = 1; i <= 4; i++) { adv(15 * S); turn(t, i); } adv(30 * S); turn(t, 5); adv(20 * S); });
  ok('темп 24 с: страницы по 15 с не засчитаны, fl 4', r && r.fl === 4 && r.pageTurns === 1 && min(r) === +(50 / 60).toFixed(4), r); }

// 5. Индекс честности
{ const d = '2026-10-25';
  const honest = [{ date: d, minutes: 60, pageTurns: 60 }];
  ok('индекс: честное чтение → ×1', G.honestyIndex(honest, d).f === 1);
  const flips = honest.concat([{ date: '2026-10-20', minutes: 0, pageTurns: 0, fl: 300 }]); /* 300 × 12 с = 60 мин пролистано */
  const hi = G.honestyIndex(flips, d);
  ok('индекс: половина — пролистывание → ×0,75, причина flip', hi.f === 0.75 && hi.why === 'flip', hi);
  ok('индекс: не ниже ×0,5', G.honestyIndex([{ date: d, minutes: 1, pageTurns: 1, fl: 5000 }], d).f === 0.5);
  ok('индекс: старше 14 дней не считается', G.honestyIndex(honest.concat([{ date: '2026-10-11', minutes: 0, fl: 300 }]), d).f === 1);
  ok('индекс: меньше 20 мин данных → ×1', G.honestyIndex([{ date: d, minutes: 5, fl: 50 }], d).f === 1);
  const idle = G.honestyIndex(honest.concat([{ date: d, minutes: 1, ct: 6000 }]), d);
  ok('индекс: простой без касаний весит вдвое меньше, причина idle', idle.f < 1 && idle.why === 'idle', idle); }
{ const { r } = await sess(H({ hon: 0.8 }), async (t, adv) => { for (let i = 1; i <= 5; i++) { adv(M); turn(t, i); } });
  ok('строка несёт hon 0.8', r && r.hon === 0.8, r);
  ok('опыт ×0,8: 5 мин → 40 XP', G.xpForSession([r], r) === 40, G.xpForSession([r], r));
  ok('строка без hon → опыт как раньше', G.xpForSession([{ id: 'x', date: r.date, minutes: 5 }], { id: 'x', date: r.date, minutes: 5 }) === 50); }

// 6. Отрезки
{ let s = []; for (let i = 0; i < 10; i += 2) s = addSpan(s, [i / 10, (i + 1) / 10]);
  ok('отрезки: через один не сливаются', s.length === 5);
  s = addSpan(s, [0.1, 0.2]); ok('отрезки: соседние сливаются', s.length === 4 && s[0][1] === 0.3, s);
  ok('отрезки: середина внутри', covered(s, [0.05, 0.15]) && !covered(s, [0.3, 0.4]));
  let big = []; for (let i = 0; i < 400; i++) big = addSpan(big, [i / 1000, i / 1000 + 0.0005]);
  ok('отрезки: не больше ' + SPANS_MAX, big.length === SPANS_MAX);
  ok('отрезки: мусор отбрасывается', JSON.stringify(normSpans([[0.5, 0.2], 'x', [0, 0.1], [0.1, 2], [NaN, 1]])) === '[[0,0.1]]'); }

// 7. Мини-проверка: разбор ответов нейросети
ok('вопрос: JSON в тексте', JSON.stringify(G.parseQuizQ('Вот: {"q":"Кто пришёл?","a":"Пьер"} ок')) === '{"q":"Кто пришёл?","a":"Пьер"}');
ok('вопрос: мусор → null', G.parseQuizQ('не знаю') === null && G.parseQuizQ('{"a":"x"}') === null);
ok('проверка: ok true', JSON.stringify(G.parseQuizGrade('{"ok":true,"why":"Верно."}')) === '{"ok":true,"why":"Верно."}');
ok('проверка: ok строкой → null', G.parseQuizGrade('{"ok":"да"}') === null);

// 8. Хранение: проверка при чтении и импорте (storage/schema.js)
{ const Sc = await import(new URL('../storage/schema.js', import.meta.url).href);
  const pr = Sc.hydrateProgress({ readSpans: { a: [[0, 0.1], [0.05, 0.2], [0.3, 0.4], [0.5, 2]], b: 'x', c: [] } });
  ok('readSpans: наложения и мусор отброшены', JSON.stringify(pr.readSpans) === '{"a":[[0,0.1],[0.3,0.4]]}', pr.readSpans);
  ok('readSpans: старый бэкап без поля → {}', JSON.stringify(Sc.hydrateProgress({}).readSpans) === '{}');
  const g = Sc.hydrateGame({ quizPaid: { '2026-10-25': 20, 'x': 20, '2026-10-24': -1, '2026-10-23': 1.5 } });
  ok('quizPaid: только даты и целые 0…1000', JSON.stringify(g.quizPaid) === '{"2026-10-25":20}', g.quizPaid);
  const st = Sc.hydrateSettings({ pauseBtn: 'no', pauseXY: { x: 1.7, y: 0.25 } });
  ok('настройки: pauseBtn по умолчанию true, pauseXY в пределах 0…1', st.pauseBtn === true && st.pauseXY.x === 1 && st.pauseXY.y === 0.25, st);
  ok('настройки: pauseXY мусор → null', Sc.hydrateSettings({ pauseXY: 'x' }).pauseXY === null); }
// 9. Строки сессий: logSession хранит новые поля только в пределах (проверка без IndexedDB — по коду нормализации)
{ const src = (await import('fs')).readFileSync(new URL('../storage/sessions.js', import.meta.url), 'utf8');
  ok('logSession знает fl/ct/rr/hon', /\['fl', 'ct', 'rr'\]/.test(src) && /rec\.hon/.test(src)); }
// 10. Автопауза: подряд быстрые перелистывания видны в snapshot().fastRun, медленная страница сбрасывает
{ const t = createSessionTracker(api); T = 1e6; t.begin('b', 0, H());
  for (let i = 1; i <= 5; i++) { T += 2 * S; turn(t, i); }
  const a = t.snapshot().fastRun; T += 20 * S; turn(t, 6); const b = t.snapshot().fastRun;
  t.setCounting(false); for (let i = 7; i <= 9; i++) { T += 2 * S; turn(t, i); } const c = t.snapshot();
  T += 13 * S; const age = t.snapshot().pageAgeMs; await t.cancel();
  ok('автопауза: 5 быстрых подряд → fastRun 5, медленная → 0, на паузе счёт быстрых идёт', a === 5 && b === 0 && c.fastRun === 3 && c.counting === false && age === 13 * S, { a, b, c: c.fastRun, age }); }
{ const { r } = await sess(H(), async (t, adv) => { adv(M); turn(t, 1); t.setCounting(false); adv(2 * M); turn(t, 2); adv(M); turn(t, 3); t.setCounting(true); adv(M); turn(t, 4); });
  ok('пауза: страницы на паузе не дают ни минут, ни страниц, ни отрезков', r && min(r) === 2 && r.pageTurns === 2, r); }

console.log('\nИтого: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
