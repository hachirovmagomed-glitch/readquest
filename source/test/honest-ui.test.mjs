// Честное чтение в приложении (25.10; arch.md): скрин «0 страниц, 3 минуты, +30 XP», пояснения в итоге, отрезки прочитанного,
// пауза (круг, перетаскивание, автопауза), мини-проверка на своём ключе (fetch подменён). Только тестовый сайт (rqt).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node honest-ui.test.mjs   [RQ_SHOTS=dir — скриншоты 390 и 360]
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '';
const BOOK = process.env.RQ_BOOK || fileURLToPath(new URL('./fixtures/Длинная книга.txt', import.meta.url));
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(w = 390, h = 844) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset)); });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
  p.__bid = await p.evaluate(() => S.userBooks[0].id); p.__ctx = ctx; return p;
}
const open = async (p) => { await p.evaluate(id => openBook(id), p.__bid); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(300); };
const adv = (p, ms) => p.evaluate(ms => { window.__rqTimeOffset += ms; }, ms);
const turn = (p) => p.evaluate(() => goPage(R.page + 1, true));
const close = async (p) => { await p.evaluate(() => closeReader()); await sleep(1300); };
const state = (p) => p.evaluate(async () => ({ rows: (await __rq.listSessions({})).length, xp: S.xp, summary: !document.getElementById('summary').classList.contains('hidden'),
  note: document.getElementById('sumNote').textContent, flash: (document.querySelector('.flash,#flash,.toast') || {}).textContent || '', last: SESS[SESS.length - 1] || null,
  spans: (S.readSpans || {})[S.userBooks[0].id] || null, quiz: !document.getElementById('sumQuiz').classList.contains('hidden') }));
const done = async (p) => { await p.evaluate(() => { if (!document.getElementById('summary').classList.contains('hidden')) document.getElementById('btnDone').click(); }); await sleep(200); };

ok('флаг включён на тестовом сайте', await (await fresh()).evaluate(() => honestOn()));

// 1. Скрин Джессики: книга открыта 3 минуты без листания → ни строки, ни опыта; объяснение
{ const p = await fresh(); await open(p);
  let flash = ''; await p.exposeFunction('__fl', t => { flash = t; }); await p.evaluate(() => { const f = flashMsg; window.flashMsg = function (t, o) { window.__fl(String(t)); return f(t, o); }; });
  await adv(p, 3 * 60000); await close(p); const s = await state(p);
  ok('скрин: 3 мин без листания → строки нет, +0 XP, итога нет', s.rows === 0 && s.xp === 0 && !s.summary, s);
  ok('скрин: сказано почему', /без перелистывания/.test(flash), flash); await p.__ctx.close(); }

// 2. Честное чтение: 6 страниц по минуте, 2 мин на последней без касаний → 6,5 мин, пояснение про последнюю страницу, отрезки записаны
{ const p = await fresh(); await open(p);
  for (let i = 0; i < 6; i++) { await adv(p, 60000); await turn(p); await sleep(40); }
  await adv(p, 120000); await close(p); const s = await state(p);
  ok('чтение: строка 6,5 мин, ct 90 с, XP 60', s.last && +s.last.minutes.toFixed(1) === 6.5 && s.last.ct === 90 && s.xp === 60, s.last);
  ok('итог: «Последняя страница: 1 мин 30 с … не засчитаны»', /Последняя страница: 1 мин 30 с/.test(s.note), s.note);
  ok('отрезки прочитанного записаны', Array.isArray(s.spans) && s.spans.length === 1 && s.spans[0][0] === 0, s.spans);
  if (SHOTS) await p.screenshot({ path: SHOTS + '/1-itog-hvost-390.png' });
  await done(p);
  // 3. Повтор: открыть с начала и прочитать те же страницы
  await p.evaluate(id => { S.progress[id] = Object.assign({}, S.progress[id], { pos: 0 }); }, p.__bid);
  await open(p); await p.evaluate(() => goPage(0, false)); await sleep(100);
  const sp0 = await p.evaluate(() => __tracker.snapshot().page);
  for (let i = 0; i < 4; i++) { await adv(p, 60000); await turn(p); await sleep(40); }
  let fl2 = ''; await p.exposeFunction('__fl2', t => { fl2 = t; }); await p.evaluate(() => { const f = flashMsg; window.flashMsg = function (t, o) { window.__fl2(String(t)); return f(t, o); }; });
  await adv(p, 20000); await close(p); const r = await state(p);
  const st = await p.evaluate(() => __tracker.lastStats());
  ok('повтор: те же страницы → строки нет, опыт не вырос, rr ≥ 4', r.rows === 1 && r.xp === 60 && st.rr >= 4, { sp0, st, xp: r.xp });
  ok('повтор: сказано, что за повтор опыт не начисляется', /уже читал/.test(fl2), fl2);
  // и наполовину новые: 3 старые + 3 новые страницы
  await p.evaluate(id => { S.progress[id] = Object.assign({}, S.progress[id], { pos: 0 }); }, p.__bid);
  await open(p); await p.evaluate(() => goPage(4, false)); await sleep(100);
  for (let i = 0; i < 6; i++) { await adv(p, 60000); await turn(p); await sleep(40); }
  await adv(p, 20000); await close(p); const r2 = await state(p);
  ok('половина повтор: rr 3, новые 3 стр. засчитаны, в итоге строка про повтор', r2.last && r2.last.rr === 3 && r2.last.pageTurns === 3 && /уже читал раньше/.test(r2.note), { last: r2.last, note: r2.note });
  if (SHOTS) await p.screenshot({ path: SHOTS + '/1b-itog-povtor-390.png' });
  await done(p); await p.__ctx.close(); }

// 4. Пауза: круг виден, тап = пауза, время на паузе не идёт; перетаскивание запоминается; в настройках прячется
{ const p = await fresh(); await open(p);
  const vis = await p.evaluate(() => { const b = document.getElementById('rqPause'); const r = b.getBoundingClientRect(); return { hidden: b.hidden, w: r.width, op: getComputedStyle(b).opacity, x: r.left, y: r.top }; });
  ok('круг паузы виден, 52 px, полупрозрачный', !vis.hidden && vis.w === 52 && +vis.op < 0.6, vis);
  if (SHOTS) await p.screenshot({ path: SHOTS + '/2-krug-pauzy-390.png' });
  await p.tap('#rqPause'); await sleep(100);
  const pz = await p.evaluate(() => ({ paused: R.paused, counting: __tracker.snapshot().counting, cls: document.getElementById('rqPause').className }));
  ok('тап: пауза, трекер не считает', pz.paused === 'me' && pz.counting === false && /on/.test(pz.cls), pz);
  if (SHOTS) await p.screenshot({ path: SHOTS + '/3-pauza-vklyuchena-390.png' });
  for (let i = 0; i < 3; i++) { await adv(p, 60000); await turn(p); await sleep(40); }
  const m0 = await p.evaluate(() => __tracker.snapshot().countedMs);
  await p.tap('#rqPause'); await sleep(100);
  for (let i = 0; i < 2; i++) { await adv(p, 60000); await turn(p); await sleep(40); }
  const m1 = await p.evaluate(() => __tracker.snapshot().countedMs);
  ok('на паузе 3 минуты = 0, после снятия 2 минуты идут', m0 === 0 && Math.round(m1 / 1000) === 120, { m0, m1 });
  // перетаскивание
  const b = await p.$('#rqPause'); const bb = await b.boundingBox();
  await p.touchscreen.touchStart(bb.x + 26, bb.y + 26); await p.touchscreen.touchMove(120, 200); await p.touchscreen.touchMove(100, 160); await p.touchscreen.touchEnd(); await sleep(150);
  const dr = await p.evaluate(() => ({ xy: SET.pauseXY, paused: R.paused, left: document.getElementById('rqPause').style.left }));
  ok('перетаскивание: место сохранено, пауза не переключилась', dr.xy && Math.abs(dr.xy.x * 390 - 100) < 2 && Math.abs(dr.xy.y * 844 - 160) < 2 && dr.paused === false, dr);
  // автопауза
  for (let i = 0; i < 5; i++) { await adv(p, 2000); await turn(p); await sleep(40); }
  const ap = await p.evaluate(() => R.paused);
  ok('5 быстрых перелистываний подряд → автопауза', ap === 'auto', ap);
  await adv(p, 30000); await sleep(1300);
  const ap2 = await p.evaluate(() => ({ paused: R.paused, counting: __tracker.snapshot().counting }));
  ok('задержался на странице дольше порога → счёт пошёл сам', ap2.paused === false && ap2.counting === true, ap2);
  await close(p); await done(p);
  await p.evaluate(() => { SET.pauseBtn = false; saveSet(); }); await open(p);
  ok('«Кнопка паузы» выключена → круга нет', await p.evaluate(() => document.getElementById('rqPause').hidden));
  await close(p); await p.__ctx.close(); }

// 5. Мини-проверка: 16 мин и 8 страниц → карточка; вопрос и проверка через свой ключ (fetch подменён) → +20 XP раз в день
async function quizRun(w, h, shot) {
  const p = await fresh(w, h);
  await p.evaluate(() => { S.ai = Object.assign(S.ai || {}, { key: 'sk-test', prov: 'deepseek' }); save();
    const f = window.fetch; window.__aiCalls = 0;
    window.fetch = async (u, o) => { if (!/chat\/completions|messages/.test(String(u))) return f(u, o); window.__aiCalls++;
      const body = JSON.parse(o.body), sys = (body.messages || [])[0].content;
      const txt = /Придумай/.test(sys) ? '{"q":"О чём говорится в этом отрывке?","a":"о дороге"}' : '{"ok":true,"why":"Смысл верный."}';
      return new Response(JSON.stringify({ choices: [{ message: { content: txt } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }; });
  await open(p);
  for (let i = 0; i < 8; i++) { await adv(p, 120000); await turn(p); await sleep(40); }
  await adv(p, 10000); await close(p); let s = await state(p);
  ok(w + ': карточка мини-проверки в итоге', s.summary && s.quiz, s);
  if (shot && SHOTS) { await p.evaluate(() => document.getElementById('sumQuiz').scrollIntoView({ block: 'center' })); await p.screenshot({ path: SHOTS + '/4-mini-proverka-' + w + '.png' }); }
  const xp0 = await p.evaluate(() => S.xp);
  await p.tap('#qzGo'); await p.waitForSelector('#qzA', { timeout: 5000 });
  await p.type('#qzA', 'Про дорогу и путников');
  if (shot && SHOTS) { await p.evaluate(() => document.getElementById('sumQuiz').scrollIntoView({ block: 'center' })); await p.screenshot({ path: SHOTS + '/5-vopros-' + w + '.png' }); }
  await p.tap('#qzCheck'); await p.waitForFunction(() => /Верно/.test(document.getElementById('sumQuiz').textContent), { timeout: 5000 });
  const r = await p.evaluate(() => ({ xp: S.xp, paid: S.quizPaid, txt: document.getElementById('sumQuiz').textContent, xpTxt: document.getElementById('sumXp').textContent, calls: window.__aiCalls, wide: document.documentElement.scrollWidth }));
  ok(w + ': верно → +20 XP, quizPaid за день, две просьбы к нейросети', r.xp === xp0 + 20 && Object.values(r.paid)[0] === 20 && r.calls === 2, r);
  ok(w + ': без горизонтальной прокрутки', r.wide <= w, r.wide);
  if (shot && SHOTS) { await p.evaluate(() => document.getElementById('sumQuiz').scrollIntoView({ block: 'center' })); await p.screenshot({ path: SHOTS + '/6-verno-' + w + '.png' }); }
  await done(p);
  // вторая длинная сессия в тот же день: карточки нет
  await open(p); for (let i = 0; i < 8; i++) { await adv(p, 120000); await turn(p); await sleep(40); } await close(p); s = await state(p);
  ok(w + ': второй раз за день карточки нет', s.summary && !s.quiz, s.quiz);
  await p.__ctx.close();
}
await quizRun(390, 844, true);
await quizRun(360, 740, true);

// 6. Без ключа: карточка ведёт в настройки
{ const p = await fresh(); await open(p); for (let i = 0; i < 8; i++) { await adv(p, 120000); await turn(p); await sleep(40); } await close(p);
  await p.evaluate(() => { S.ai.key = ''; }); await p.tap('#qzGo'); await sleep(100);
  ok('без ключа: «Вставь ключ в Настройках»', await p.evaluate(() => /Вставь ключ/.test(document.getElementById('sumQuiz').textContent) && !!document.getElementById('qzSet')));
  await p.__ctx.close(); }

ok('без ошибок страницы', errs.length === 0, errs);
await browser.close();
const f = checks.filter(c => !c.p).length;
console.log('\nИтого: ' + (checks.length - f) + ' PASS, ' + f + ' FAIL');
process.exit(f ? 1 : 0);
