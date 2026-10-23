// Эталонная полка сложности (Джессика 23.10: «чтобы не облажаться»). Каждая книга — с заранее понятной ступенью (диапазон min…max),
// уровень считается как в карточке: текст + автор + название (game-awards.js autoLevel). Любая правка алгоритма, которая уводит
// «Алису» вверх или Гегеля вниз, краснеет здесь до выкладки. Тексты: golden/README.md. Run: node golden.test.mjs
import fs from 'node:fs'; import zlib from 'node:zlib';
const G = await import('../game-awards.js');
let pass = 0, fail = 0; const rows = [];
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const NAMES = ['Обычная', 'Сложная', 'Очень сложная', 'Экспертная', 'Запредельная'];
const gold = JSON.parse(fs.readFileSync(new URL('golden/golden.json', import.meta.url), 'utf8'));
for (const b of gold) {
  const text = zlib.gunzipSync(fs.readFileSync(new URL('golden/' + b.f, import.meta.url))).toString('utf8');
  const auto = G.autoLevel({ text, title: b.title, author: b.author }), txt = G.textLevel(text), sc = G.textStats(text).score;
  rows.push([b.title.slice(0, 38), b.author.slice(0, 22), sc.toFixed(1), txt, auto, b.min + '…' + b.max]);
  ok(`«${b.title}» (${b.author}): ${NAMES[auto]}, ждём ${NAMES[b.min]}${b.max > b.min ? ' … ' + NAMES[b.max] : ''}`, auto >= b.min && auto <= b.max, { auto, txt, score: +sc.toFixed(1) });
  if (b.txtMin != null) ok(`«${b.title}»: один текст, без автора, даёт не меньше «${NAMES[b.txtMin]}»`, txt >= b.txtMin, { txt, score: +sc.toFixed(1) });
}
/* Russian: the built-in shelf (classics, all «Обычная») — full texts from ../books */
const books = new URL('../books/', import.meta.url);
for (const f of fs.readdirSync(books).filter(f => f.endsWith('.txt'))) {
  const text = fs.readFileSync(new URL(f, books), 'utf8'), auto = G.autoLevel({ text, title: f.replace(/\.txt$/, '') }), sc = G.textStats(text).score;
  rows.push([f, 'встроенная полка', sc.toFixed(1), G.textLevel(text), auto, '0…0']);
  ok(`встроенная полка ${f}: «Обычная»`, auto === 0, { auto, score: +sc.toFixed(1) });
}
ok('на полке есть все ступени, которые она проверяет (0…4)', [0, 1, 2, 3, 4].every(l => gold.some(b => b.min <= l && l <= b.max)));
if (process.env.RQ_GOLDEN_TABLE) console.table(rows);
console.log(`\nИтого: ${pass} PASS, ${fail} FAIL`);
console.log(`SUMMARY golden.test ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
