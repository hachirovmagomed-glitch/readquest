// Per-page cap: expected values in readquest-quest/pdf-cap-expected.md. Run: node source/test/cap.test.mjs
const { createSessionTracker } = await import(new URL('../reader-session.js', import.meta.url).href);
let T = 1e6; const rows = [];
const api = { now: () => T, logSession: async r => { rows.push(r); return r; }, logReadingEvent: async () => null };
const M = 60000, S = 1000;
const PDF = { capMs: 3*M, minSecMs: 12*S, counting: true, extend: { stepMs: M, everyMs: M, maxMs: 8*M, minFraction: 0.2 } };
const TXT = { capMs: 3*M, minSecMs: 12*S, counting: true, extend: null };
let pass = 0, fail = 0;
async function run(name, opts, body, expMin, expCaps) {
  const t = createSessionTracker(api); rows.length = 0; T = 1e6;
  t.begin('b', 90, opts); const caps = [];
  await body(t, ms => { T += ms; }, () => caps.push(t.snapshot().pageCapMs / M));
  const r = await t.end();
  const got = r ? +r.minutes.toFixed(4) : null;
  const ok = got === expMin && (!expCaps || caps.join(',') === expCaps);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' | ждём ' + expMin + (expCaps ? ' [' + expCaps + ']' : '') + ' | получили ' + got + ' [' + caps.join(',') + ']');
}
await run('ж: PDF 10 мин без действий', PDF, async (t, adv) => { adv(10*M); }, 3);
await run('з: пан >20% раз в минуту ×10', PDF, async (t, adv, cap) => { for (let m=0;m<10;m++){ adv(55*S); t.userActive('pan',{fraction:0.6}); cap(); adv(5*S);} }, 8, '4,5,6,7,8,8,8,8,8,8');
await run('и: 20 панов 12% каждые 30 с', PDF, async (t, adv, cap) => { for (let i=0;i<20;i++){ adv(30*S); t.userActive('pan',{fraction:0.12}); cap(); } }, 3, '3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3');
await run('к: большой пан каждые 10 с 3 мин, потом до 10 мин', PDF, async (t, adv, cap) => { for (let i=1;i<=18;i++){ adv(10*S); t.userActive('pan',{fraction:0.6}); } cap(); adv(10*M-180*S); }, 6, '6');
await run('з′: дабл-тап, +20 с дабл-тап, +45 с щипок, 9 мин', PDF, async (t, adv, cap) => { t.userActive('zoom'); cap(); adv(20*S); t.userActive('zoom'); cap(); adv(45*S); t.userActive('zoom'); cap(); adv(9*M); }, 5, '4,4,5');
await run('л: текст 10 мин + события', TXT, async (t, adv, cap) => { for (let m=0;m<10;m++){ adv(M); t.userActive('pan',{fraction:0.5}); t.userActive('zoom'); } cap(); }, 3, '3');
await run('1: 2 мин, 3 продления', PDF, async (t, adv, cap) => { t.userActive('zoom'); adv(60*S); t.userActive('zoom'); adv(60*S); t.userActive('zoom'); cap(); }, 2, '6');
await run('2: потолок 5, вперёд, 10 мин на новой', PDF, async (t, adv, cap) => { t.userActive('zoom'); adv(M); t.userActive('zoom'); cap(); t.pageTurned(true); t.pageShown(91); cap(); adv(10*M); }, 4, '5,3');
await run('3: потолок 5, назад на 5 с (быстрее 12 с — не в счёт, Джессика 17.10) и обратно, 10 мин', PDF, async (t, adv, cap) => { t.userActive('zoom'); adv(M); t.userActive('zoom'); cap(); t.pageTurned(false); t.pageShown(89); adv(5*S); t.pageTurned(true); t.pageShown(90); cap(); adv(10*M); }, 4, '5,3');
// Античит 17.10 (Джессика: «пробежал книгу на 70% за несколько минут», «слишком быстро дали опыт»): время страницы, перелистнутой быстрее minSec (12 с), не засчитывается
await run('м: листание по 2 с, 90 страниц (3 мин) → 0 мин, пустая сессия без строки', TXT, async (t, adv) => { for (let i=0;i<90;i++){ adv(2*S); t.pageTurned(true); t.pageShown(91+i); } }, null);
await run('н: 30 с чтения, потом 10 страниц по 3 с, потом 40 с на последней', TXT, async (t, adv) => { adv(30*S); t.pageTurned(true); t.pageShown(91); for (let i=0;i<10;i++){ adv(3*S); t.pageTurned(true); t.pageShown(92+i); } adv(40*S); }, +(70/60).toFixed(4));
await run('о: ровно 12 с на странице засчитываются', TXT, async (t, adv) => { adv(12*S); t.pageTurned(true); t.pageShown(91); adv(20*S); }, +(32/60).toFixed(4));
await run('4: пан ровно 20%', PDF, async (t, adv, cap) => { t.userActive('pan',{fraction:0.2}); cap(); adv(10*M); }, 3, '3');
await run('5: продления ровно через 60.000 с', PDF, async (t, adv, cap) => { t.userActive('zoom'); cap(); adv(60*S); t.userActive('zoom'); cap(); adv(10*M); }, 5, '4,5');
await run('5б: через 59.999 с — отказ', PDF, async (t, adv, cap) => { t.userActive('zoom'); cap(); adv(59999); t.userActive('zoom'); cap(); adv(10*M); }, 4, '4,4');
await run('7: 6 продлений раз в минуту, всего 15 мин', PDF, async (t, adv, cap) => { for (let i=0;i<6;i++){ t.userActive('zoom'); cap(); adv(M);} adv(9*M); }, 8, '4,5,6,7,8,8');
await run('8: перерисовка той же страницы (pageShown без тапа) не сбрасывает', PDF, async (t, adv, cap) => { t.userActive('zoom'); adv(M); t.userActive('zoom'); t.pageShown(90); cap(); adv(10*M); }, 5, '5');
await run('9: pageTurned(true)+pageShown(та же) — трекер считает это новой страницей (так зовёт только текстовая читалка, стр. ~2110 app.html; PDF отсекает в pdfGo)', PDF, async (t, adv, cap) => { t.userActive('zoom'); adv(M); t.userActive('zoom'); cap(); t.pageTurned(true); t.pageShown(90); cap(); adv(10*M); }, 4, '5,3');
console.log('\nИтого: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
