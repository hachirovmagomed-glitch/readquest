// «Фокус» в читалке (Джессика 25.10): помодоро, фокус-слова, круг по засчитанным минутам, выход из приложения (звонок не сжигает
// круг), тихий режим, звуки по скинам, вызовы недели, карта, итог фокуса в итоге сессии. js/focus.js.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_MAIN_URL=http://127.0.0.1:8767/readquest/ [RQ_SHOTS=/dir] node focusui.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const MAIN = process.env.RQ_MAIN_URL || BASE.replace(/test\/$/, '');
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
async function page(url, w) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: w || 390, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => {
    window.__rqTimeOffset = 0;
    const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
    const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset));
    let vis = 'visible'; Object.defineProperty(document, 'visibilityState', { get: () => vis, configurable: true });
    window.__setVis = (v) => { vis = v; document.dispatchEvent(new Event('visibilitychange')); };
  });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return p;
}
const p = await page(BASE);
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
await (await p.$('#fileInp')).uploadFile(TXT); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
const gold0 = await p.evaluate(() => S.gold || 0);

/* 1. the tab */
await p.evaluate(() => { showChrome(); openReaderSettings('grpFocus'); }); await sleep(400);
const t1 = await p.evaluate(() => ({ box: !document.getElementById('fzBox').hidden, pomo: !!document.getElementById('fzPomo'), len: !!document.getElementById('fzLen'),
  snd: [...document.querySelectorAll('#fzSnd button')].map(b => b.textContent), map: document.querySelectorAll('.fzmap .fzwk').length, chal: document.querySelectorAll('.fzchal > div').length,
  old: !!document.getElementById('focusSeg') }));
ok('вкладка «Фокус»: старый режим фокуса на месте + помодоро, звуки (Выкл и три своих), 3 вызова недели, карта 12 недель', t1.box && t1.pomo && !t1.len && t1.old && t1.snd.length === 4 && t1.snd[0] === 'Выкл' && t1.chal === 3 && t1.map === 12, t1);
await shot('390-1-vkladka-fokus');
await p.click('#fzPomo'); await sleep(300);
await p.evaluate(() => document.querySelector('#fzLen button[data-v="15"]').click()); await sleep(200);
const t2 = await p.evaluate(() => ({ pomo: SET.fz.pomo, len: SET.fz.len, go: (document.getElementById('fzGo') || {}).textContent, saved: JSON.parse(localStorage.getItem(RQ_K.set)).fz }));
ok('«Помодоро» включается, круг 15 мин, всё сохранено в SET.fz', t2.pomo && t2.len === 15 && /Начать круг 15 мин/.test(t2.go) && t2.saved.pomo === true && t2.saved.len === 15, t2);
const ov = await p.evaluate(() => { const b = document.getElementById('sheet'); return [b.scrollWidth, b.clientWidth]; });
ok('вкладка без горизонтальной прокрутки (390)', ov[0] <= ov[1] + 1, ov);
await shot('390-2-pomodoro-vkl');

/* 2. «Фокус» button: focus words, then the round */
await p.evaluate(() => { document.getElementById('sheet').classList.add('hidden'); showChrome(); }); await sleep(300);
await p.click('#btnFocus'); await sleep(300);
const w1 = await p.evaluate(() => ({ shown: !document.getElementById('fzWords').classList.contains('hidden'), chips: document.querySelectorAll('#fzWordsChips button').length }));
ok('«Фокус» с помодоро: вопроса «Зачем читаешь сейчас?» нет (Джессика 25.10: «они лишние»), круг сразу', !w1.shown, w1);
await sleep(1300);
const r1 = await p.evaluate(() => ({ run: document.getElementById('reader').classList.contains('fzrun'), focus: isFocusOn(), chip: document.getElementById('fzChip').textContent, fw: FZ.fw, phase: FZ.phase }));
ok('круг начался: режим фокуса, фишка «Круг 1 · 0 / 15 мин», без фокус-слов', r1.run && r1.focus && /^Круг 1 · 0 \/ 15 мин/.test(r1.chip) && r1.fw === '' && r1.phase === 'run', r1);
await shot('390-4-krug-idet');

/* 3. an open book without turning pages does not fill the round (page cap) */
await p.evaluate(() => { window.__rqTimeOffset += 20 * 60000; }); await sleep(1300);
const r2 = await p.evaluate(() => ({ prog: Math.floor(FZ.prog / 60000), done: FZ.done.length }));
ok('книга открыта 20 мин без листания: круг не закрыт (страница даёт не больше 3 мин)', r2.done === 0 && r2.prog <= 3, r2);
/* reading: turn pages every 2.5 min */
for (let i = 0; i < 6; i++) { await p.evaluate(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); }); await sleep(250); }
await sleep(1300);
const r3 = await p.evaluate(() => ({ done: FZ.done.slice(), phase: FZ.phase, chip: document.getElementById('fzChip').textContent, row: __tracker && 1 }));
ok('честное чтение 15+ мин: круг 1 готов, начался отдых', r3.done.join() === '15' && r3.phase === 'rest' && /^Отдых \d+:\d\d/.test(r3.chip), r3);
await shot('390-5-otdyh');

/* 4. pause («Защитить награды»: setCounting(false)) stops the round */
await p.evaluate(() => { fzSkipRest(); __tracker.setCounting(false); }); await sleep(300);
for (let i = 0; i < 3; i++) { await p.evaluate(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); }); await sleep(250); }
await sleep(1200);
const r4 = await p.evaluate(() => ({ prog: FZ.prog, phase: FZ.phase }));
ok('на паузе круг стоит на месте', r4.phase === 'run' && r4.prog === 0, r4);
await p.evaluate(() => __tracker.setCounting(true));

/* 5. leaving the app: ≤ 1 min — the round goes on; longer — «Продолжить круг» once */
await p.evaluate(() => { __setVis('hidden'); window.__rqTimeOffset += 30000; __setVis('visible'); }); await sleep(300);
const l1 = await p.evaluate(() => ({ hold: FZ.hold, card: !document.getElementById('fzHold').classList.contains('hidden'), clean: FZ.clean }));
ok('выход на 30 с: круг идёт, но уже не «без выхода»', !l1.hold && !l1.card && l1.clean === false, l1);
await p.evaluate(() => { __setVis('hidden'); window.__rqTimeOffset += 4 * 60000; __setVis('visible'); }); await sleep(300);
const l2 = await p.evaluate(() => ({ hold: FZ.hold, card: !document.getElementById('fzHold').classList.contains('hidden'), t: document.getElementById('fzHoldT').textContent }));
ok('выход на 4 мин (звонок): круг остановлен, карточка «Продолжить круг / Начать заново»', l2.hold && l2.card && /4 мин/.test(l2.t), l2);
await shot('390-6-zvonok');
await p.click('#fzHoldGo'); await sleep(300);
const l3 = await p.evaluate(() => ({ hold: FZ.hold, rescued: FZ.rescued, card: !document.getElementById('fzHold').classList.contains('hidden') }));
ok('«Продолжить круг»: круг идёт дальше (только один раз за круг)', !l3.hold && l3.rescued && !l3.card, l3);
await p.evaluate(() => { __setVis('hidden'); window.__rqTimeOffset += 3 * 60000; __setVis('visible'); }); await sleep(300);
const l4 = await p.evaluate(() => ({ hold: FZ.hold, prog: FZ.prog, card: !document.getElementById('fzHold').classList.contains('hidden') }));
ok('второй долгий выход в том же круге: круг начат заново', !l4.hold && !l4.card && l4.prog === 0, l4);

/* 6. quiet mode */
await p.evaluate(() => { SET.fz.quiet = true; fzPaint(); }); await sleep(200);
const q1 = await p.evaluate(() => ({ quiet: document.getElementById('reader').classList.contains('fzquiet'), chip: getComputedStyle(document.getElementById('fzChip')).display, line: getComputedStyle(document.getElementById('fzLine')).display }));
ok('тихий режим: ни цифр, ни фишки — только тонкая линия круга', q1.quiet && q1.chip === 'none' && q1.line === 'block', q1);
await shot('390-7-tihiy');
await p.evaluate(() => { SET.fz.quiet = false; fzPaint(); });

/* 7. sounds: three own per skin, synthesised; off on hide */
const s1 = await p.evaluate(async () => { SET.fz.snd = 1; fzSound(true); await new Promise(r => setTimeout(r, 300)); const a = fzVoice && fzVoice.id;
  const lists = ['', 'pencil', 'ellada', 'babochkovyi', 'celestial'].map(k => (FZ_SOUNDS[k] || []).map(x => x[0]));
  const all = [].concat(...lists); let built = 0; for (const id of all) { if (typeof FZ_VOICE[id] === 'function') built++; }
  __setVis('hidden'); await new Promise(r => setTimeout(r, 900)); const off = fzVoice; __setVis('visible'); await new Promise(r => setTimeout(r, 200));
  return { a, lists, uniq: new Set(all).size, built, off: off ? off.id : null, back: fzVoice && fzVoice.id }; });
ok('звук «Дождь» в базовом скине; 5 скинов × 3 своих звука, все синтезируются', s1.a === 'rain' && s1.uniq === 15 && s1.built === 15, s1);
ok('приложение свернули — звук выключен, вернулись — снова играет', s1.off === null && s1.back === 'rain', s1);
const s2 = await p.evaluate(async () => { const res = {}; for (const id of Object.keys(FZ_VOICE)) { try { fzSound(false); await new Promise(r => setTimeout(r, 50));
  const out = fzGain(1); const v = FZ_VOICE[id](out); v.step(fzAC.currentTime + 0.1); v.b.forEach(x => { try { x.s.stop(); } catch (e) {} }); res[id] = true; } catch (e) { res[id] = String(e); } } return res; });
ok('каждый из 15 звуков строится без ошибок', Object.values(s2).every(x => x === true), s2);
await p.evaluate(() => { SET.fz.snd = 0; fzSound(false); });

/* 8. close: the row carries the round, coins on the summary */
for (let i = 0; i < 7; i++) { await p.evaluate(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); }); await sleep(250); }
await sleep(1300);
const c0 = await p.evaluate(() => FZ.done.slice());
await p.evaluate(async () => { __navAllow = true; await closeReader(); __navAllow = false; }); await sleep(1500);
const c1 = await p.evaluate(() => { const r = SESS[SESS.length - 1];
  return { pomo: r.pomo, fw: r.fw, xp: r.xp, min: r.minutes, sum: document.getElementById('sumFocus').innerText, hidden: document.getElementById('sumFocus').classList.contains('hidden'), gold: S.gold, paid: S.pomoPaid }; });
ok('строка сессии: два круга по 15, без фокус-слов', c0.join() === '15,15' && (c1.pomo || []).join() === '15,15' && !c1.fw, [c0, c1]);
ok('итог: без «Цели сессии», 2 круга, 30 мин чистого чтения, темп, +6 монет за круги', !c1.hidden && !/Цель сессии/.test(c1.sum) && /2 круга · 30 мин чистого чтения/.test(c1.sum) && /мин на страницу/.test(c1.sum) && /\+6 монет — круги фокуса/.test(c1.sum), c1.sum);
const xpBase = Math.floor(c1.min) * 10;
ok('опыт: 10 за минуту + 20 % от 30 мин кругов (+60)', c1.xp === xpBase + 60, { xp: c1.xp, base: xpBase });
ok('монеты: +6 за круги (кроме ежедневки и недели)', Object.values(c1.paid).reduce((a, b) => a + b, 0) === 6, c1.paid);
await shot('390-8-itog');

/* 9. export → import keeps the rounds and the paid map */
const ex = await p.evaluate(async () => { const e = await __rq.exportBackup(); const j = typeof e === 'string' ? JSON.parse(e) : e; const s = (j.sessions || []).find(r => r.pomo);
  return { row: s ? { pomo: s.pomo, fw: s.fw } : null, set: j.settings && j.settings.fz ? j.settings.fz.len : (j.set && j.set.fz && j.set.fz.len), str: JSON.stringify(j).includes('pomoPaid') }; });
ok('экспорт: круги в строке, pomoPaid в состоянии', ex.row && ex.row.pomo.join() === '15,15' && ex.str, ex);

/* 10. the tab after the session: streak, today, map cell */
await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2000);
await p.evaluate(() => { showChrome(); openReaderSettings('grpFocus'); }); await sleep(400);
const m1 = await p.evaluate(() => ({ head: document.querySelector('#fzBox .fzhead').innerText, cell: document.querySelectorAll('.fzmap i.l2, .fzmap i.l3').length }));
ok('после круга: серия фокуса 1 день, 2 круга сегодня, день на карте закрашен', /1\s*день серии фокуса/.test(m1.head) && /2\s*круга сегодня/.test(m1.head) && m1.cell === 1, m1);
await p.evaluate(() => { document.getElementById('sheet').scrollTop = 9999; }); await sleep(200);
await shot('390-9-vyzovy-karta');
/* 10b. «Статистика»: «Фокус и концентрация» (Джессика 25.10) */
await p.evaluate(async () => { document.getElementById('sheet').classList.add('hidden'); __navAllow = true; await closeReader({ quiet: true }); openProgress('stats'); __navAllow = false; }); await sleep(800);
const st = await p.evaluate(() => { const b = document.getElementById('fzStats'); b.scrollIntoView(); return { vis: !b.hidden && b.getBoundingClientRect().height > 0, t: b.innerText, bars: b.querySelectorAll('#chFocus .bar').length }; });
ok('статистика: «Фокус и концентрация» — 2 круга, 30 мин фокуса, доля, серия, без выхода, вызовы, темп, график по дням', st.vis && /Фокус и концентрация/.test(st.t) && /\b2\s*круга/.test(st.t) && /30\s*мин фокуса/.test(st.t) && /чтения в фокусе/.test(st.t) && /лучшая серия/.test(st.t) && /Вызовов недели выполнено: \d/.test(st.t) && st.bars === 7, st);
await sleep(200); await shot('390-10-statistika');
await p.close();

/* 11. 360 px: the tab fits */
const p3 = await page(BASE, 360);
await (await p3.$('#fileInp')).uploadFile(TXT); await p3.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(300);
await p3.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2000);
await p3.evaluate(() => { showChrome(); SET.fz.pomo = true; openReaderSettings('grpFocus'); }); await sleep(400);
const n3 = await p3.evaluate(() => { const s = document.getElementById('sheet'); const bad = [...document.querySelectorAll('#fzBox *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).map(e => e.id || e.className);
  return { sw: s.scrollWidth, cw: s.clientWidth, bad: bad.slice(0, 5) }; });
ok('360: ничего не вылезает за экран', n3.sw <= n3.cw + 1 && !n3.bad.length, n3);
if (SHOTS) await p3.screenshot({ path: `${SHOTS}/360-1-vkladka-fokus.png` });
await p3.close();

/* 11b. 28.10: the pause button hides with the bars while reading, shows with them on a tap, stays while paused */
{ const pp = await page(BASE, 390);
  await (await pp.$('#fileInp')).uploadFile(TXT); await pp.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(300);
  await pp.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2200);
  const vis = () => pp.evaluate(() => { const b = document.getElementById('rqPause'); const cs = getComputedStyle(b); return { hidden: b.hidden, vis: cs.visibility, op: cs.opacity, pe: cs.pointerEvents }; });
  await pp.evaluate(() => concealChrome('tap')); await sleep(500); const a = await vis();
  await pp.evaluate(() => revealChrome()); await sleep(500); const b = await vis();
  await pp.evaluate(() => { concealChrome('tap'); pauseSet('me', true); }); await sleep(500); const c = await vis();
  await pp.evaluate(() => pauseSet(false, true)); await sleep(500); const d = await vis();
  ok('кнопка паузы: при чтении (панели скрыты) не видна и не ловит тапы', !a.hidden && a.vis === 'hidden' && a.pe === 'none', a);
  ok('кнопка паузы: тап по экрану — появляется вместе с панелями', b.vis === 'visible' && +b.op > 0.3, b);
  ok('кнопка паузы: на паузе видна и без панелей (чтобы было видно, что счёт стоит)', c.vis === 'visible' && +c.op > 0.9, c);
  ok('кнопка паузы: сняли паузу при скрытых панелях — снова спряталась', d.vis === 'hidden', d);
  if (SHOTS) { await pp.evaluate(() => revealChrome()); await sleep(400); await pp.screenshot({ path: `${SHOTS}/pauza-s-panelyami.png` }); await pp.evaluate(() => concealChrome('tap')); await sleep(500); await pp.screenshot({ path: `${SHOTS}/pauza-chtenie.png` }); }
  await pp.close(); }

/* 12. every skin: its own three sounds in the tab, the chip in the reader */
const p4 = await page(BASE, 390);
await (await p4.$('#fileInp')).uploadFile(TXT); await p4.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(300);
const SK = { pencil: ['Дождь по стеклу', 'Часы', 'Мастерская'], ellada: ['Море', 'Цикады', 'Ветер в оливах'], babochkovyi: ['Сад и птицы', 'Ручей', 'Летний луг'], celestial: ['Космос', 'Звёздный ветер', 'Колокольчики'] };
for (const [k, names] of Object.entries(SK)) {
  const w = await p4.evaluate(async (k) => { S.gold = 9999; const id = k === 'pencil' ? null : 'skin-' + k; if (id) { buy(id); wear(id); } else { SET.theme = 'pencil'; saveSet(); applySet(); }
    await new Promise(r => setTimeout(r, 400)); __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; await new Promise(r => setTimeout(r, 1800));
    SET.fz.pomo = true; SET.fz.snd = 1; showChrome(); openReaderSettings('grpFocus'); await new Promise(r => setTimeout(r, 300));
    return { skin: document.documentElement.dataset.skin, snd: [...document.querySelectorAll('#fzSnd button')].slice(1).map(b => b.textContent) }; }, k);
  ok(`скин ${k}: свои звуки ${names.join(', ')}`, w.skin === k && w.snd.join() === names.join(), w);
  if (SHOTS) await p4.screenshot({ path: `${SHOTS}/skin-${k}-1-vkladka.png` });
  await p4.evaluate(async () => { document.getElementById('sheet').scrollTop = 9999; await new Promise(r => setTimeout(r, 200)); });
  if (SHOTS) await p4.screenshot({ path: `${SHOTS}/skin-${k}-2-vyzovy.png` });
  await p4.evaluate(async () => { document.getElementById('sheet').classList.add('hidden'); fzStartRound(); setFocus(true); await new Promise(r => setTimeout(r, 1200)); });
  if (SHOTS) await p4.screenshot({ path: `${SHOTS}/skin-${k}-3-krug.png` });
  await p4.evaluate(async () => { fzSound(false); __navAllow = true; await closeReader({ quiet: true }); __navAllow = false; });
}
await p4.close();

/* 13. the root build: nothing new (flag RQ_FOCUS_NS = ['rqt']) */
const pm = await page(MAIN);
const rt = await pm.evaluate(() => ({ on: typeof focusOn === 'function' && focusOn(), box: document.getElementById('fzBox') ? document.getElementById('fzBox').hidden : true }));
ok('корень (rq): «Фокус» по-старому, новое только на /test/', rt.on === false && rt.box === true, rt);
await pm.close();

ok('без ошибок JS', !errs.length, errs);
await browser.close();
console.log(`\nfocusui: ${checks.filter(Boolean).length}/${checks.length} passed`);
process.exit(checks.every(Boolean) ? 0 : 1);
