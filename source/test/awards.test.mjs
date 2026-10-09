// 1б decisions A+B (node, no browser): dayMinutes = floor(day sum) is the one day rule; XP per session =
// 10 × (dayMinutes after − before), «before» = same-day rows that STARTED earlier (startedAt; without it: order in sessions[]); stored in row.xp.
// Run: node source/test/awards.test.mjs
const G = await import(new URL('../game-awards.js', import.meta.url).href);
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const D = '2026-10-09', T0 = Date.parse('2026-10-09T09:00:00+03:00');
let n = 0;
const row = (min, startMin, day) => ({ id: 'id-' + String(++n).padStart(3, '0') + '-' + Math.random().toString(36).slice(2, 6), date: day || D, bookId: 'b', minutes: min, pageTurns: 1, startedAt: T0 + startMin * 60000 });
const game = () => ({ xp: 0, gold: 0, awardedSessionIds: [] });

// 0.9 + 0.9 + 0.9, each paid when it ends (summary flow: SESS grows by one row, then award)
{ const g = game(), rows = [], xs = [];
  for (const r of [row(0.9, 0), row(0.9, 5), row(0.9, 10)]) { rows.push(r); const a = G.applySessionAwards(g, rows); xs.push(a.byId[r.id]); }
  ok('0.9+0.9+0.9 → per session 0, 10, 10; total +20 XP; stored in row.xp', JSON.stringify(xs) === '[0,10,10]' && g.xp === 20 && rows.every((r, i) => r.xp === xs[i]), { xs, xp: g.xp });
  ok('… dayMinutes = 2 («2 / 10», streak threshold 2 reached)', G.dayMinutes(rows, D) === 2, G.dayMinutes(rows, D));
  const again = G.applySessionAwards(g, rows);
  ok('… second award pass pays nothing (once per sessionId)', again.xp === 0 && g.xp === 20, again);
}
// single 0.71
{ const g = game(), r = row(0.71, 0); const a = G.applySessionAwards(g, [r]);
  ok('single 0.71 → +0 XP', a.byId[r.id] === 0 && r.xp === 0 && g.xp === 0, a.byId); }
// 9.5 + 0.6 → second session: +10 XP and the daily +30
{ const g = game(), r1 = row(9.5, 0), r2 = row(0.6, 20), rows = [r1];
  G.applySessionAwards(g, rows); const q1 = G.applyQuestAwards(g, rows, [r1], { goal: 10 });
  rows.push(r2); const a2 = G.applySessionAwards(g, rows); const q2 = G.applyQuestAwards(g, rows, [r2], { goal: 10 });
  ok('9.5 → +90 XP, no daily; +0.6 → +10 XP and daily +30', r1.xp === 90 && q1.gold === 0 && a2.byId[r2.id] === 10 && q2.gold === 30 && q2.daily[0] === D, { r1: r1.xp, q1: q1.gold, r2: a2.byId[r2.id], q2 });
}
// 1.4 and 0.7: forward vs reverse import order → same per-session XP
{ const a = row(1.4, 0), b = row(0.7, 30);
  const fwd = [{ ...a }, { ...b }], rev = [{ ...b }, { ...a }];
  const gf = game(), gr = game(); G.applySessionAwards(gf, fwd); G.applySessionAwards(gr, rev);
  const xf = Object.fromEntries(fwd.map(r => [r.id, r.xp])), xr = Object.fromEntries(rev.map(r => [r.id, r.xp]));
  ok('1.4 + 0.7 imported in reverse order → same per-session xp as forward (10, 10)', xf[a.id] === 10 && xf[b.id] === 10 && xr[a.id] === xf[a.id] && xr[b.id] === xf[b.id] && gf.xp === gr.xp, { xf, xr });
  // late row that STARTED first (e.g. a recovered draft): «before» is by start, not by what was paid
  const g = game(), rows = [{ ...b }]; G.applySessionAwards(g, rows); const late = { ...a }; rows.push(late); G.applySessionAwards(g, rows);
  ok('order by startedAt, not by award time (0.7 paid first: 0; then 1.4 that started earlier: 10)', rows[0].xp === 0 && late.xp === 10, rows.map(r => r.xp)); }
// startedAt stored as ISO (logSession) → same order as ms
{ const a = row(1.4, 0), b = row(0.7, 30); a.startedAt = new Date(a.startedAt).toISOString(); b.startedAt = new Date(b.startedAt).toISOString();
  const rev = [b, a]; G.applySessionAwards(game(), rev);
  ok('ISO startedAt, reverse order → 1.4: 10, 0.7: 10 (ordered by start time)', a.xp === 10 && b.xp === 10, [a.xp, b.xp]); }
// rows WITHOUT startedAt (old rows) → order in sessions[], not id
{ const a = { id: 'zzz', date: D, bookId: 'b', minutes: 0.7, pageTurns: 1 }, b = { id: 'aaa', date: D, bookId: 'b', minutes: 1.4, pageTurns: 1 };
  const rows = [a, b]; G.applySessionAwards(game(), rows);
  ok('no startedAt: sessions[] order decides (0.7 first: 0, then 1.4: 20), id ignored', a.xp === 0 && b.xp === 20, [a.xp, b.xp]);
  const c = { ...b }, d = { ...a }; const rows2 = [c, d]; G.applySessionAwards(game(), rows2);
  ok('… same rows, other sessions[] order (1.4 first: 10, then 0.7: 10)', c.xp === 10 && d.xp === 10, [c.xp, d.xp]);
  const old = { id: 'zz-old', date: D, bookId: 'b', minutes: 0.7, pageTurns: 1 }, nw = row(1.4, 0); const rows3 = [old, nw]; G.applySessionAwards(game(), rows3);
  ok('… mixed (old row without startedAt before a new one in sessions[]) → old first: 0, new: 20', old.xp === 0 && nw.xp === 20, [old.xp, nw.xp]); }
// one formula: streak/daily/week/gold use dayMinutes (floor)
{ const rows = [row(1.4, 0), row(0.6, 10)];
  ok('1.4 + 0.6 (float sum 1.9999999999999998) → dayMinutes 2', G.dayMinutes(rows, D) === 2);
  const rows2 = [row(1.4, 0), row(0.5, 10)];
  ok('1.4 + 0.5 → dayMinutes 1 (no streak)', G.dayMinutes(rows2, D) === 1);
  const wk = G.weekStartOf(D); const days = [0, 1, 2, 3].map(i => G.addLocalDays(wk, i));
  const wr = days.map((d, i) => row(i === 3 ? 9.99 : 10, i * 1440, d));
  ok('week counts days by dayMinutes: 10, 10, 10, 9.99 → 3 days at goal (9.99 is 9)', G.daysAtGoalInWeek(wr, wk, 10).length === 3, G.daysAtGoalInWeek(wr, wk, 10)); }
// Fix B (Architect): update day — old row WITHOUT startedAt (already awarded alone: 0.9 → 0) + new row WITH startedAt.
// IndexedDB returns rows in UUID order (random) → test both positions in sessions[]: day total must be exactly 10 XP.
for (const newFirst of [false, true]) {
  const g = game(), old = row(0.9, 0); delete old.startedAt; const neu = row(0.9, 30);
  G.applySessionAwards(g, [old]);
  const rows = newFirst ? [neu, old] : [old, neu]; G.applySessionAwards(g, rows);
  ok('old 0.9 (no startedAt) + new 0.9 (startedAt), ' + (newFirst ? 'new first' : 'old first') + ' in sessions[] → exactly 10 XP total', g.xp === 10 && old.xp + neu.xp === 10, { xp: g.xp, old: old.xp, neu: neu.xp });
  ok('… startOrder: row without startedAt before row with it (' + (newFirst ? 'new first' : 'old first') + ')', G.startOrder(old, neu, rows) < 0 && G.startOrder(neu, old, rows) > 0);
}
console.log(`\nSUMMARY awards.test ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
