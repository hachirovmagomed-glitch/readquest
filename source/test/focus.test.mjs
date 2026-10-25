// «Фокус» (Джессика 25.10): помодоро с бонусом за полный круг, вызовы недели, серия и карта фокуса, SET.fz.
// Node only, no browser. Run: node source/test/focus.test.mjs
const G = await import(new URL('../game-awards.js', import.meta.url).href);
const { createSessionTracker } = await import(new URL('../reader-session.js', import.meta.url).href);
const { normFz, hydrateSettings } = await import(new URL('../storage/schema.js', import.meta.url).href);
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const row = (id, date, minutes, extra) => Object.assign({ id, date, bookId: 'b', minutes, pageTurns: 10, startedAt: date + 'T10:00:0' + id.length + '.000Z' }, extra || {});

/* --- rounds in a row are trusted only up to the counted minutes --- */
ok('круги 25+25 при 52 мин засчитаны оба', G.rowPomo(row('a', '2026-10-26', 52, { pomo: [25, 25] })).join() === '25,25');
ok('круги 25+25 при 40 мин: только один (круг не больше честного чтения)', G.rowPomo(row('a', '2026-10-26', 40, { pomo: [25, 25] })).join() === '25');
ok('чужие длины (20, «25», 60) отбрасываются', G.rowPomo(row('a', '2026-10-26', 200, { pomo: [20, '25', 60, 15] })).join() === '15');
ok('pomoRun не больше числа кругов', G.rowPomoRun(row('a', '2026-10-26', 30, { pomo: [25], pomoRun: 5 })) === 1);
ok('строка без кругов: 0 бонуса', G.pomoXp(row('a', '2026-10-26', 30)) === 0 && G.pomoMinutes(row('a', '2026-10-26', 30)) === 0);

/* --- XP: +20 % of the round minutes on top of the usual 10 per minute --- */
{ const r = row('a', '2026-10-26', 25.4, { pomo: [25] });
  ok('круг 25 мин: 250 XP за минуты + 50 за круг = 300', G.xpForSession([r], r) === 300, G.xpForSession([r], r));
  const h = row('b', '2026-10-26', 25.4, { pomo: [25], hon: 0.5 });
  ok('индекс честности 0,5 (поле hon) режет и бонус круга: +25', G.pomoXp(h) === 25, G.pomoXp(h)); }

/* --- coins per day: 3 / 5 / 10, cap 20, paid once --- */
{ const d = '2026-10-26';
  const rows = [row('a', d, 16, { pomo: [15] }), row('bb', d, 26, { pomo: [25] })];
  ok('15 + 25 = 3 + 5 = 8 монет', G.pomoCoinsForDay(rows, d) === 8);
  const big = [row('a', d, 100, { pomo: [45, 45] }), row('bb', d, 50, { pomo: [45] })];
  ok('три круга по 45 = 30, потолок 20', G.pomoCoinsForDay(big, d) === 20);
  const game = { gold: 0 };
  const r1 = G.applyFocusAwards(game, rows.slice(0, 1), rows.slice(0, 1));
  const r2 = G.applyFocusAwards(game, rows, rows.slice(1));
  const r3 = G.applyFocusAwards(game, rows, rows);
  ok('выплата по росту: +3, потом +5, повтор 0', r1.pomoGold === 3 && r2.pomoGold === 5 && r3.pomoGold === 0 && game.gold === 8 && game.pomoPaid[d] === 8, [r1, r2, r3, game]);
  const g2 = { gold: 0 };
  G.applyFocusAwards(g2, rows, []);
  ok('история без новых строк не оплачивается', g2.gold === 0); }

/* --- weekly challenges: three per week, +30 each, once --- */
{ const mon = '2026-10-26';
  ok('вызов недели = 30 монет (Джессика 25.10)', G.CHAL_COINS === 30);
  const ch = G.focusChallenges([], mon);
  ok('три разных вызова на неделю', ch.length === 3 && new Set(ch.map(c => c.id)).size === 3, ch.map(c => c.id));
  const weeks = Array.from({ length: 6 }, (_, i) => G.focusChallenges([], G.addLocalDays(mon, 7 * i)).map(c => c.id).join());
  ok('наборы меняются от недели к неделе (6 недель, 6 разных наборов)', new Set(weeks).size === 6, weeks);
  /* a week that completes everything */
  const rows = [];
  for (let i = 0; i < 7; i++) { const d = G.addLocalDays(mon, i); rows.push(row('w' + i, d, 140, { pomo: [45, 45, 45], pomoRun: 3 })); }
  const all = G.focusChallenges(rows, mon);
  ok('неделя с кругами каждый день: все три вызова выполнены', all.every(c => c.done), all);
  const game = { gold: 0 };
  const a = G.applyFocusAwards(game, rows, rows);
  const b = G.applyFocusAwards(game, rows, rows);
  ok('за неделю: вызовы 3 × 30 = 90 один раз + круги по 20 в день', a.chalGold === 90 && b.chalGold === 0 && a.pomoGold === 7 * 20 && b.pomoGold === 0, [a, b]);
  const runs = G.focusChallenges([row('x', mon, 80, { pomo: [25, 25, 25], pomoRun: 2 })], mon);
  const r3 = runs.find(c => c.id === 'run3');
  ok('«3 круга подряд без выхода» не засчитан при серии 2', !r3 || !r3.done); }

/* --- streak and map --- */
{ const rows = [row('a', '2026-10-24', 30, { pomo: [25] }), row('bb', '2026-10-25', 30, { pomo: [25] }), row('ccc', '2026-10-23', 10)];
  ok('серия фокуса: 24 и 25 → 2 дня (день без круга серию не держит)', G.focusStreak(rows, '2026-10-25') === 2);
  ok('серия жива утром, пока сегодня кругов нет', G.focusStreak(rows, '2026-10-26') === 2);
  ok('серия рвётся через пропущенный день', G.focusStreak(rows, '2026-10-27') === 0);
  const m = G.focusDays(rows);
  ok('карта: минуты полных кругов по дням', m['2026-10-24'] === 25 && m['2026-10-25'] === 25 && !m['2026-10-23'], m); }

/* --- tracker: sureMs never goes down, setFocus goes into the row --- */
{ let t = 1000;
  const rows = [];
  const tr = createSessionTracker({ logSession: async r => { rows.push(r); return r; }, logReadingEvent: async () => null, now: () => t, dayFn: () => '2026-10-26', noDraft: true });
  tr.begin('b', 0, { capMs: 180000, minSecMs: 12000 });
  t = 6000; const s1 = tr.snapshot().sureMs;
  t = 21000; const s2 = tr.snapshot().sureMs;
  tr.pageTurned(true); tr.pageShown(1); t = 26000; const s3 = tr.snapshot().sureMs;
  tr.pageTurned(true); tr.pageShown(2); const s4 = tr.snapshot().sureMs;
  ok('sureMs: открытая страница засчитывается только после 12 с и не убывает', s1 === 0 && s2 === 20000 && s3 === 20000 && s4 === 20000, [s1, s2, s3, s4]);
  tr.setFocus({ pomo: [25], pomoRun: 1, fw: 'Дочитать главу' });
  t = 26000 + 26 * 60000;
  const r = await tr.end();
  ok('строка сессии несёт pomo, pomoRun и фокус-слова', r && r.pomo.join() === '25' && r.pomoRun === 1 && r.fw === 'Дочитать главу', r); }

/* --- SET.fz contract --- */
{ const d = normFz(null);
  ok('SET.fz по умолчанию: помодоро выкл, 25/5, звук выкл, громкость 0,5, слова и напоминание вкл', d.pomo === false && d.len === 25 && d.rest === 5 && d.snd === 0 && d.vol === 0.5 && d.words && d.warn && !d.quiet);
  const j = normFz({ pomo: 'yes', len: 30, rest: 5, snd: 7, vol: 3, x: 1 });
  ok('мусор → умолчания, громкость зажата в 1, лишние ключи выброшены', j.pomo === false && j.len === 25 && j.snd === 0 && j.vol === 1 && !('x' in j), j);
  ok('hydrateSettings кладёт fz', hydrateSettings({}).fz && hydrateSettings({ fz: { pomo: true, len: 45 } }).fz.len === 45); }

console.log(`\nfocus: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
