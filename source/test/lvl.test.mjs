// Сложность книги (Джессика 19.10): level from text/author/genre, XP ×level, coin bonus per day with a cap, pace check in the tracker.
// Node only, no browser. Run: node source/test/lvl.test.mjs
const G = await import(new URL('../game-awards.js', import.meta.url).href);
const { createSessionTracker } = await import(new URL('../reader-session.js', import.meta.url).href);
const fs = await import('node:fs');
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const rep = (s, n) => Array.from({ length: n }, () => s).join(' ');

/* --- level of a text --- */
const RU_KIDS = 'Жил-был кот. Кот был рыжий. Он любил молоко и рыбку. Утром кот пошёл гулять. На лугу он встретил собаку. Собака сказала: гав! Кот сказал: мяу! И они стали дружить. Мишка косолапый по лесу идёт, шишки собирает, песенки поёт. Наша Таня громко плачет: уронила в речку мячик.';
const RU_PHIL = 'Всякое познание начинается с опыта, однако отсюда ещё не следует, что оно целиком проистекает из опыта. Необходимость и строгая всеобщность являются достоверными признаками априорного знания и неразрывно связаны друг с другом. Понятие причинности содержит в себе понятие необходимости связи с действием и строгой всеобщности правила. Трансцендентальное единство апперцепции есть то единство, благодаря которому всё данное в созерцании многообразное объединяется в понятие об объекте. Содержание, значение и применимость категорий определяются исключительно их отношением к возможному опыту.';
const EN_PHIL = 'The transcendental unity of apperception is that unity through which all the manifold given in an intuition is united in a conception of the object. Consequently the possibility of experience is the condition of the objective validity of all our cognitions a priori, and the necessity of this connection is the foundation of the understanding as a faculty of judgement and representation.';
ok('детские стишки (ru) → 0', G.textLevel(rep(RU_KIDS, 40)) === 0, G.textStats(rep(RU_KIDS, 40)).score);
ok('плотная философия (ru) → 2', G.textLevel(rep(RU_PHIL, 30)) === 2, G.textStats(rep(RU_PHIL, 30)).score);
ok('dense philosophy (en) → 2', G.textLevel(rep(EN_PHIL, 40)) === 2, G.textStats(EN_PHIL).score);
ok('меньше 1500 слов → без вердикта (0)', G.textLevel(rep(RU_PHIL, 3)) === 0);
const books = new URL('../books/', import.meta.url);
const shelf = fs.readdirSync(books).filter(f => f.endsWith('.txt'));
const lv = Object.fromEntries(shelf.map(f => [f, G.textLevel(fs.readFileSync(new URL(f, books), 'utf8'))]));
ok('встроенная полка (художественная проза, Эзоп, Гамлет) — вся «Обычная»', Object.values(lv).every(x => x === 0), lv);
const lic = '*** START OF THE PROJECT GUTENBERG EBOOK X ***\n' + rep('Mary had a little lamb. Its fleece was white as snow. And everywhere that Mary went the lamb was sure to go.', 150) +
  '\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\n' + rep('Redistribution is subject to the trademark license, especially commercial redistribution, and the applicable agreement with the foundation.', 200);
ok('лицензия Гутенберга не делает детскую книгу сложной', G.textLevel(lic) === 0, G.textStats(lic).score);

/* --- author, genre, auto, manual --- */
ok('автор: Кант → 2, Платон → 1, Plato → 1, Эзоп → 0, «Канторович» не Кант', G.authorLevel('Иммануил Кант') === 2 && G.authorLevel('Платон') === 1 && G.authorLevel('Plato') === 1 && G.authorLevel('Эзоп') === 0 && G.authorLevel('Канторович') === 0);
ok('жанр FB2 sci_philosophy → 1, «Сказки» → 0', G.genreLevel('sci_philosophy') === 1 && G.genreLevel('Сказки') === 0);
ok('авто = максимум (текст детский, автор Аристотель → 1); PDF без текста — по автору', G.autoLevel({ author: 'Аристотель', text: rep(RU_KIDS, 40) }) === 1 && G.autoLevel({ author: 'Гегель', type: 'pdf' }) === 2);
ok('выбор читателя только понижает: авто 1, выбрал 2 → 1; выбрал 0 → 0; без выбора → 1', G.effLevel(1, 2) === 1 && G.effLevel(1, 0) === 0 && G.effLevel(1, undefined) === 1);

/* --- PDF: lvlText from sampled pages --- */
ok('PDF: страницы для пробы — до 12, в пределах 10–90 % книги; короткий PDF — все страницы', JSON.stringify(G.pdfSamplePages(300, 12)) === JSON.stringify([30, 52, 74, 95, 117, 139, 161, 183, 205, 226, 248, 270]) && JSON.stringify(G.pdfSamplePages(5, 12)) === '[1,2,3,4,5]' && JSON.stringify(G.pdfSamplePages(1, 12)) === '[1]', [G.pdfSamplePages(300, 12), G.pdfSamplePages(5, 12)]);
ok('PDF: уровень из lvlText (2), автор не нужен; кривой lvlText (5, «2») не считается', G.autoLevel({ type: 'pdf', author: 'PDF', lvlText: 2 }) === 2 && G.autoLevel({ type: 'pdf', author: 'PDF', lvlText: 5 }) === 0 && G.autoLevel({ type: 'pdf', author: 'PDF', lvlText: '2' }) === 0);
ok('PDF: lvlText 0 (скан), но автор Кант → 2', G.autoLevel({ type: 'pdf', author: 'Кант', lvlText: 0 }) === 2);

/* --- XP --- */
const D = '2026-10-19', T0 = Date.parse('2026-10-19T09:00:00+03:00');
let n = 0;
const row = (min, lvl, at, day) => Object.assign({ id: 'r' + (++n), date: day || D, bookId: 'b', minutes: min, pageTurns: 5, startedAt: new Date(T0 + (at || n) * 60000).toISOString() }, lvl ? { lvl } : {});
{ const g = { xp: 0, awardedSessionIds: [] }, rs = [row(10, 0, 1), row(10, 1, 20), row(10, 2, 40)];
  G.applySessionAwards(g, rs);
  ok('опыт: 10 мин обычной 100, сложной 150, очень сложной 200', rs.map(r => r.xp).join() === '100,150,200' && g.xp === 450, rs.map(r => r.xp)); }
{ const r = row(10, 7); const g = { xp: 0, awardedSessionIds: [] }; G.applySessionAwards(g, [r]);
  ok('кривой lvl (7) = обычная, ×1', G.rowLevel(r) === 0 && r.xp === 100, r.xp); }

/* --- coins --- */
{ const g = { gold: 0 }, rs = [row(12, 1, 1)];
  let a = G.applyLevelAwards(g, rs, rs);
  ok('сложная 12 мин → +5', a.gold === 5 && g.gold === 5 && g.lvlPaid[D] === 5, a);
  a = G.applyLevelAwards(g, rs, rs);
  ok('второй проход по тем же строкам → 0', a.gold === 0 && g.gold === 5, a);
  rs.push(row(9, 1, 30)); a = G.applyLevelAwards(g, rs, [rs[1]]);
  ok('ещё 9 мин той же книгой (21 за день) → ещё +5', a.gold === 5 && g.gold === 10, a);
  rs.push(row(60, 2, 60)); a = G.applyLevelAwards(g, rs, [rs[2]]);
  ok('потолок дня 20: очень сложная час сверху → только +10 до 20', a.gold === 10 && g.gold === 20 && g.lvlPaid[D] === 20, a);
  rs.push(row(30, 0, 120)); a = G.applyLevelAwards(g, rs, [rs[3]]);
  ok('обычная книга бонуса не даёт и ничего не платит', a.gold === 0 && g.gold === 20, a); }
{ const g = { gold: 0 }, rs = [row(6, 1, 1), row(5, 2, 10)];
  const a = G.applyLevelAwards(g, rs, rs);
  ok('уровни считаются отдельно: 6 мин сложной + 5 мин очень сложной → 0 (ни одной десятки)', a.gold === 0, a); }
{ const g = { gold: 0 }, old = row(30, 1, 1, '2026-10-18'), now = row(1, 1, 1);
  const a = G.applyLevelAwards(g, [old, now], [now]);
  ok('история задним числом не платится (вчерашние 30 мин не в новых строках)', a.gold === 0 && !g.lvlPaid['2026-10-18'], a); }
{ const g = { gold: 0 }, r = row(20, 1, 1); G.applyQuestAwards(g, [r], [r], { goal: 10 }); const q = g.gold;
  ok('ежедневка от уровня не зависит: +30 за 20 мин сложной', q === 30, q); }

/* --- tracker: row.lvl, page cap, pace --- */
let T = 1e6; const rows = [];
const api = { now: () => T, logSession: async r => { rows.push(r); return r; }, logReadingEvent: async () => null };
const M = 60000, S = 1000;
async function sess(opts, body) { const t = createSessionTracker(api); T = 1e6; rows.length = 0; t.begin('b', 0, opts); await body(t, ms => { T += ms; }); return t.end(); }
const turn = (t, p) => { t.pageTurned(true); t.pageShown(p); };
let r = await sess({ capMs: 5 * M, minSecMs: 12 * S, level: 1 }, async (t, adv) => { for (let i = 1; i <= 6; i++) { adv(40 * S); turn(t, i); } adv(4 * M); });
ok('сложная, 40 с на страницу → строка с lvl 1; лимит 5 мин на последней (4 мин засчитаны)', r && r.lvl === 1 && Math.abs(r.minutes - 8) < 1e-9, r);
r = await sess({ capMs: 7 * M, minSecMs: 12 * S, level: 2 }, async (t, adv) => { for (let i = 1; i <= 10; i++) { adv(25 * S); turn(t, i); } });
ok('очень сложная, 25 с на страницу → уровень падает до 1 (30 с не набрано, 20 есть)', r && r.lvl === 1, r);
r = await sess({ capMs: 7 * M, minSecMs: 12 * S, level: 2 }, async (t, adv) => { for (let i = 1; i <= 10; i++) { adv(14 * S); turn(t, i); } });
ok('очень сложная, 14 с на страницу → бонуса нет (поля lvl нет)', r && r.lvl === undefined, r);
r = await sess({ capMs: 5 * M, minSecMs: 12 * S, level: 1 }, async (t, adv) => { for (let i = 1; i <= 20; i++) { adv(3 * S); turn(t, i); } for (let i = 21; i <= 24; i++) { adv(40 * S); turn(t, i); } });
ok('сложная: 20 страниц пролистаны по 3 с + 4 прочитаны → средняя ниже 20 с, бонуса нет', r && r.lvl === undefined, r);
r = await sess({ capMs: 5 * M, minSecMs: 12 * S, level: 1 }, async (t, adv) => { for (let i = 1; i <= 20; i++) { adv(13 * S); turn(t, i); } adv(5 * M); });
ok('сложная: 20 страниц по 13 с и 5 мин стоянки на последней → долгая стоянка не спасает, бонуса нет', r && r.lvl === undefined, r);
r = await sess({ capMs: 5 * M, minSecMs: 12 * S, level: 1 }, async (t, adv) => { for (let i = 1; i <= 8; i++) { adv((i % 2 ? 15 : 60) * S); turn(t, i); } });
ok('сложная: страницы то 15, то 60 с (в среднем 37) → уровень остаётся', r && r.lvl === 1, r);
r = await sess({ capMs: 5 * M, minSecMs: 12 * S, level: 1 }, async (t, adv) => { adv(3 * M); turn(t, 1); adv(M); });
ok('меньше 5 перелистываний — темп не проверяется, уровень остаётся', r && r.lvl === 1, r);
r = await sess({ capMs: 3 * M, minSecMs: 12 * S }, async (t, adv) => { for (let i = 1; i <= 3; i++) { adv(40 * S); turn(t, i); } t.setLevel(2, 7 * M); adv(6 * M); });
ok('уровень пришёл посреди сессии (PDF): строка lvl 2, лимит текущей страницы вырос до 7 мин (2 + 6 мин)', r && r.lvl === 2 && Math.abs(r.minutes - 8) < 1e-9, r);
r = await sess({ capMs: 3 * M, minSecMs: 12 * S }, async (t, adv) => { for (let i = 1; i <= 10; i++) { adv(14 * S); turn(t, i); } t.setLevel(2, 7 * M); adv(20 * S); });
ok('…и темп проверяется по всей сессии, включая страницы до setLevel (по 14 с → без бонуса)', r && r.lvl === undefined, r);
r = await sess({ capMs: 3 * M, minSecMs: 12 * S }, async (t, adv) => { adv(2 * M); });
ok('обычная книга: в строке нет поля lvl (строка как раньше)', r && !('lvl' in r), r);

console.log('\nИтого: ' + pass + ' PASS, ' + fail + ' FAIL');
console.log(`SUMMARY lvl.test ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
