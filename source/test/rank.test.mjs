// «Ранг круга», «Комбо», «Итог круга» (Джессика 07.11: «1 2 3» из механик слэшеров, в «Фокусе»).
// Node only. Run: node source/test/rank.test.mjs
const G = await import(new URL('../game-awards.js', import.meta.url).href);
const { createSessionTracker } = await import(new URL('../reader-session.js', import.meta.url).href);
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
/* a round of `len` min: every minute counted, a page every `every` minutes, extra events */
function play(len, every, extra) {
  const st = G.rankNew(len); let t = 0;
  for (let m = 1; m <= len; m++) { t += 60000; G.rankStep(st, { min: 1, page: every && m % every === 0 ? 1 : 0, t }); if (extra) extra(st, m, t); }
  return st;
}
ok('буквы по порогам', ['D', 'C', 'B', 'A', 'S'].join() === [0, 20, 45, 70, 95].map(G.rankLetter).join());
{ const st = play(25, 1); ok('25 мин, страница в минуту, без действий: A', G.rankLetter(st.sc) === 'A', st.sc); ok('комбо 25', st.best === 25 && st.combo === 25); }
{ const st = play(25, 1, (s, m, t) => { if (m === 5) G.rankStep(s, { act: 'hl', t }); if (m === 10) G.rankStep(s, { act: 'note', t }); if (m === 15) G.rankStep(s, { act: 'word', t }); });
  ok('+ выделение, заметка, слово: S', G.rankLetter(st.sc) === 'S', st.sc); }
{ const a = play(15, 1), b = play(45, 1);
  ok('15 и 45 минут дают тот же ранг, что 25', G.rankLetter(a.sc) === 'A' && G.rankLetter(b.sc) === 'A', [a.sc, b.sc]); }
{ const st = play(25, 0); ok('только время, без страниц: B (честно, но без ритма)', G.rankLetter(st.sc) === 'B', st.sc); }
{ const st = play(25, 1, (s, m, t) => { for (let i = 0; i < 40; i++) G.rankStep(s, { act: 'hl', t: t + i }); });
  ok('спам выделениями почти не помогает', st.actSc <= 30 + 1e-9, st.actSc); }
{ const st = play(25, 1, (s, m) => { if (m === 20) G.rankStep(s, { fast: 3 }); });
  ok('быстрое листание: комбо сброшено, ранг ниже A', st.combo === 5 && G.rankLetter(st.sc) !== 'S' && st.sc < play(25, 1).sc - 30, st); }
{ const st = G.rankNew(25); for (let i = 0; i < 100; i++) G.rankStep(st, { fast: 1 }); ok('листание без чтения: D и ноль', st.sc === 0 && G.rankLetter(st.sc) === 'D'); }
{ const st = play(25, 1); const before = st.sc; for (let i = 0; i < 300; i++) G.rankStep(st, { idleMin: 1 / 60 }); ok('5 минут простоя: −30', Math.abs(before - st.sc - 30) < 1e-6 || st.sc === 0, [before, st.sc]); }
{ const st = play(25, 1); G.rankStep(st, { leave: true }); ok('выход из приложения сбрасывает комбо, лучшее остаётся', st.combo === 0 && st.best === 25); }
{ const st = G.rankNew(25); G.rankStep(st, { act: 'hl', t: 0 }); const a = st.sc; G.rankStep(st, { act: 'hl', t: 60000 }); const b = st.sc - a; G.rankStep(st, { act: 'hl', t: 60000 + G.RANK_ACT_GAP }); const c = st.sc - a - b;
  ok('то же действие: свежее +6, повтор +1, через 5 мин снова +6', a === 6 && b === 1 && c === 6, [a, b, c]); }

/* --- coins: S +2, A +1 in the same day cap --- */
const row = (id, date, minutes, extra) => Object.assign({ id, date, bookId: 'b', minutes, pageTurns: 30, startedAt: date + 'T10:00:00.000Z' }, extra || {});
{ const d = '2026-11-07';
  ok('круг 25 с рангом S = 5 + 2', G.pomoCoinsForDay([row('a', d, 26, { pomo: [25], pomoRk: 'S' })], d) === 7);
  ok('A = +1, B без бонуса', G.pomoCoinsForDay([row('a', d, 52, { pomo: [25, 25], pomoRk: 'AB' })], d) === 11);
  ok('потолок 20 не растёт', G.pomoCoinsForDay([row('a', d, 140, { pomo: [45, 45, 45], pomoRk: 'SSS' })], d) === 20);
  ok('ранг недоверенного круга не платится', G.pomoCoinsForDay([row('a', d, 30, { pomo: [25, 25], pomoRk: 'SS' })], d) === 7);
  ok('чужие буквы отбрасываются', G.rowPomoRk(row('a', d, 60, { pomo: [25, 25], pomoRk: 'XS' })).join() === ',S');
  ok('честность 0,5 режет и бонус ранга', G.pomoCoinsForDay([row('a', d, 26, { pomo: [25], pomoRk: 'S', hon: 0.5 })], d) === 3);
  ok('комбо не больше засчитанных страниц', G.rowPomoCb(row('a', d, 30, { pomoCb: 99 })) === 30 && G.rowPomoCb(row('a', d, 30)) === 0); }

/* --- the tracker carries ranks and combo into the row --- */
{ let t = 1e12, logged = null;
  const tr = createSessionTracker({ logSession: async (r) => { logged = r; return r; }, logReadingEvent: async () => {}, now: () => t });
  tr.begin('b', 0);
  for (let i = 1; i <= 40; i++) { t += 40000; tr.pageTurned(true); tr.pageShown(i); }
  tr.setFocus({ pomo: [25], pomoRun: 1, pomoRk: 'S', pomoCb: 40 });
  ok('snapshot отдаёт fast', typeof tr.snapshot().fast === 'number');
  await tr.end();
  ok('строка несёт pomoRk и pomoCb', logged && logged.pomoRk === 'S' && logged.pomoCb === 40, logged && { rk: logged.pomoRk, cb: logged.pomoCb }); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
