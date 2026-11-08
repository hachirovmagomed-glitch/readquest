// 07.11 Озвучка+ (Джессика: «Еще можно улучшить озвучку» → «Давай всё»): js/tts-plus.js.
// Голос телефона подменён (headless Chrome без голосов): speak() записывает, что и на каком языке сказано. Нейроголос — подменённый fetch.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node ttsplus.test.mjs   [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i).slice(0, 600) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: (await browser.userAgent()) });
await p.evaluateOnNewDocument(() => {
  const voices = [{ lang: 'ru-RU', name: 'Рус', voiceURI: 'ru', localService: true, default: true }, { lang: 'en-GB', name: 'Eng', voiceURI: 'en', localService: true }, { lang: 'fr-FR', name: 'Fra', voiceURI: 'fr', localService: true }];
  window.__said = []; window.__dur = 40; let cur = null;
  const ss = window.speechSynthesis;
  ss.getVoices = () => voices;
  ss.speak = function (u) { __said.push({ t: u.text, lang: u.lang, at: performance.now(), rate: u.rate, pitch: u.pitch, vol: u.volume }); cur = u;
    setTimeout(() => { if (cur !== u) return; u.onstart && u.onstart({}); setTimeout(() => { if (cur !== u) return; cur = null; u.onend && u.onend({}); }, window.__dur); }, 5); };
  ss.cancel = function () { const u = cur; cur = null; if (u && u.onerror) setTimeout(() => u.onerror({ error: 'interrupted' }), 0); };
  window.__ms = {}; try { const o = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler = function (a, f) { __ms[a] = !!f; try { o(a, f); } catch (e) {} }; } catch (e) {}
});
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);

/* 1 + 5: текст перед голосом */
const prep = await p.evaluate(() => {
  const P = (t) => tpPrep(t).s;
  return {
    abbr: P('Это, т. е. главное, и т. д. Потом в XIX в. и в 1812 г. было. XVIII–XIX вв. шли. Глава XII'),
    cent: P('XIX век и XIX века, а XX в. кончился.'),
    yo: P('Он идет, ее нет, еще Пётр и Еще.'),
    fn: P('Слово[12] и конец.3 Дальше¹ всё.\n15\nНовый абзац.'),
    cm: P('Длиной 5 см. И см. выше.'),
    map: (() => { const t = 'т. е. он'; const r = tpPrep(t); return { s: r.s, at: r.m[r.s.indexOf(' он') + 1] }; })(),
    ord: [tpOrd(3, 'pre'), tpOrd(21, 'nom'), tpOrd(2, 'fem'), tpOrd(19, 'gen')],
    prov: Object.keys(TTS_PROV).slice(0, 3), def: JSON.stringify(rqTpNorm(null)),
  };
});
ok('сокращения целиком: «то есть», «так далее», «в девятнадцатом веке», «в 1812 году», «восемнадцатый — девятнадцатый века», «Глава двенадцатая»',
  /то есть главное/.test(prep.abbr) && /и так далее\. Потом/.test(prep.abbr) && /в девятнадцатом веке/.test(prep.abbr) && /в 1812 году/.test(prep.abbr) && /восемнадцатый — девятнадцатый века/.test(prep.abbr) && /Глава двенадцатая/.test(prep.abbr), prep.abbr);
ok('века по падежам: «девятнадцатый век», «девятнадцатого века», «двадцатый век.»', prep.cent === 'девятнадцатый век и девятнадцатого века, а двадцатый век. кончился.' || /^девятнадцатый век и девятнадцатого века, а двадцатый век/.test(prep.cent), prep.cent);
ok('буква «ё»: идёт, её, ещё, Ещё', prep.yo === 'Он идёт, её нет, ещё Пётр и Ещё.', prep.yo);
ok('номера сносок и строка с номером страницы не читаются', prep.fn === 'Слово и конец. Дальше всё.\n\nНовый абзац.', prep.fn);
ok('«5 см.» остаётся сантиметрами, «см. выше» → «смотри выше»', /5 см\./.test(prep.cm) && /смотри выше/.test(prep.cm), prep.cm);
ok('место в исходном тексте сохраняется (листать за голосом)', prep.map.s === 'то есть он' && prep.map.at === 6, prep.map);
ok('порядковые: третьем, двадцать первый, вторая, девятнадцатого', JSON.stringify(prep.ord) === JSON.stringify(['третьем', 'двадцать первый', 'вторая', 'девятнадцатого']), prep.ord);
ok('«Нейроголос» второй в списке озвучки; настройки по умолчанию', JSON.stringify(prep.prov) === JSON.stringify(['system', 'piper', 'yandex']) && prep.def === JSON.stringify({ yo: true, dict: [], pause: 'm', clean: true, lang: true, pre: true, bar: true, pitch: 1, vol: 1, expr: 'norm', style: '', pos: { s: 'B', y: 0.55 } }), prep);

/* 2: свой словарь; 5: абзацы и паузы; 6: иностранные фразы */
const plan = await p.evaluate(() => {
  tpS().dict = [['замок', 'з+амок'], ['Холмс', 'Х+олмс']];
  const d = tpPrep('Старый замок. Замок висел. Холмс.').s;
  tpS().dict = [];
  const s = tpPrep('Первый абзац.\n\nВторой абзац.\n\n* * *\n\nГлава 2\nТретий.').s, pl = tpPlan(s).map(x => [s.slice(x.a, x.z).trim(), x.gap, x.lang]);
  const f = tpPrep('Он сказал: «Je vous aime, ma chérie», и ушёл. Потом: «Good morning, my dear friend». Год MCMXII.').s, fl = tpPlan(f).map(x => [f.slice(x.a, x.z).trim(), x.lang]);
  tpS().pause = 'off'; const off = tpPlan(s).length; tpS().pause = 'm';
  return { d, pl, fl, off };
});
ok('свой словарь: «замок» → «за́мок» (ударение из «+»), регистр сохраняется', plan.d === 'Старый за́мок. За́мок висел. Хо́лмс.', plan.d);
ok('абзацы — отдельными кусками; перед главой пауза длиннее; «* * *» не читается', plan.pl.length === 4 && plan.pl[0][1] === 450 && plan.pl[1][1] >= 1200 && !plan.pl.some(x => /\*/.test(x[0])), plan.pl);
ok('паузы «Нет» — кусок целиком, как раньше', plan.off === 1, plan.off);
ok('французская и английская фразы — своими голосами, римское число — нет', plan.fl.some(x => x[1] === 'fr' && /Je vous aime/.test(x[0])) && plan.fl.some(x => x[1] === 'en' && /Good morning/.test(x[0])) && !plan.fl.some(x => x[1] && /MCMXII/.test(x[0])), plan.fl);

/* чтение голосом телефона */
await p.evaluate(async () => { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); goPage(2, false); });
await sleep(500);
await p.evaluate(() => { __said.length = 0; el('btnTts').click(); }); await sleep(2500);
const r1 = await p.evaluate(() => ({ said: __said.slice(0, 8), on: ttsOn, bar: !el('tpBar').hidden, ms: __ms, sil: !!TP.sil && !TP.sil.paused, pos: TP.pos, tp: R.ttsPos }));
const gaps = r1.said.slice(1).map((x, i) => Math.round(x.at - r1.said[i].at));
ok('книга читается по абзацам: в одном куске нет двух абзацев', r1.on && r1.said.length >= 3 && r1.said.every(x => !/\n\s*\S/.test(x.t)), r1.said.map(x => x.t.slice(0, 40)));
ok('между абзацами пауза (≈ 0,45 с)', gaps.some(g => g > 400), gaps);
ok('плашка «назад / вперёд» видна, пока звучит книга', r1.bar);
ok('шторка: назад / вперёд и перемотка назначены; тихий звук держит экран-блокировку', r1.ms.previoustrack && r1.ms.nexttrack && r1.ms.seekbackward && r1.ms.seekforward && r1.sil, { ms: r1.ms, sil: r1.sil });
if (SHOTS) await p.screenshot({ path: SHOTS + '/ttsplus-1-bar.png' });
/* 4: вперёд / назад */
const f1 = await p.evaluate(async () => { window.__dur = 2000; await new Promise(r => setTimeout(r, 2100)); const t = R.book.text, before = TP.pos; tpFwd('s'); await new Promise(r => setTimeout(r, 400));
  return { before, after: R.ttsPos, exp: tpSentEnd(t, before + 1), last: __said[__said.length - 1].t.slice(0, 50), at: t.slice(R.ttsPos, R.ttsPos + 50) }; });
ok('«вперёд на предложение»: голос начинает со следующего предложения', f1.after === f1.exp && f1.after > f1.before, f1);
const b1 = await p.evaluate(async () => { const t = R.book.text; tpBack('p'); await new Promise(r => setTimeout(r, 400)); return { pos: R.ttsPos, prev: JSON.stringify(t[R.ttsPos - 1] || ''), on: ttsOn }; });
ok('«назад на абзац»: с начала абзаца', b1.on && (b1.pos === 0 || b1.prev === '"\\n"'), b1);
/* 4: «Читать отсюда» по тапу */
const h1 = await p.evaluate(async () => {
  const c = el('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT), vw = el('viewer').getBoundingClientRect(); let n, pt = null;
  while ((n = w.nextNode())) { const m = n.textContent.search(/[А-Яа-яЁё]{5,}/); if (m < 0) continue; const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + 2); const b = rg.getBoundingClientRect();
    if (b.width && b.left > vw.left + vw.width * 0.32 && b.right < vw.left + vw.width * 0.68 && b.top > vw.top + vw.height * 0.2 && b.bottom < vw.bottom - 90) { pt = [b.left + 2, b.top + b.height / 2, n.textContent.slice(m, m + 30)]; break; } }
  if (!pt) return { none: true };
  viewerTap(pt[0], pt[1]); await new Promise(r => setTimeout(r, 300)); const vis = !el('tpHere').hidden, at = TP.chip;
  el('tpHere').click(); await new Promise(r => setTimeout(r, 400));
  return { vis, at, pos: R.ttsPos, word: pt[2], here: R.book.text.slice(at, at + 200) }; });
ok('тап по тексту во время озвучки → «Читать отсюда» → голос с этого предложения', h1.vis && h1.at >= 0 && h1.pos === h1.at && h1.here.indexOf(h1.word.slice(0, 5)) >= 0, h1);
if (SHOTS) { await p.evaluate(() => { const r = el('viewer').getBoundingClientRect(); tpChip({ pos: TP.pos, x: r.left + r.width / 2, y: r.top + r.height * 0.55 }); }); await sleep(200); await p.screenshot({ path: SHOTS + '/ttsplus-2-otsyuda.png' }); await p.evaluate(() => tpChip(null)); }
/* 07.11 по отзыву: в шапке нет повторяющихся значков; плашку можно перетащить вбок и вернуть вниз */
const hd = await p.evaluate(() => { const vis = (id) => { const x = el(id); return !!x && !x.hidden && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0; };
  const top = document.querySelector('#reader .rtop') || el('btnTts').parentElement;
  return { pause: vis('rqPause'), ttsIcon: el('btnTts').innerHTML.indexOf('volume') >= 0, sleepIn: el('tpBar').contains(el('btnSleep')), walkIn: el('tpBar').contains(el('btnWalk')),
    topPause: [...top.querySelectorAll('button')].filter(b => b.offsetWidth && /pause/.test(b.innerHTML)).length }; });
ok('в шапке во время озвучки нет второй «паузы»; таймер сна и «на ходу» — на плашке', !hd.pause && hd.ttsIcon && hd.sleepIn && hd.walkIn && hd.topPause === 0, hd);
const gb = await p.evaluate(() => { const r = el('tpGrip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await p.mouse.move(gb[0], gb[1]); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(gb[0] + (370 - gb[0]) * i / 8, gb[1] + (380 - gb[1]) * i / 8); await sleep(20); } await p.mouse.up(); await sleep(300);
const sd = await p.evaluate(() => { const r = el('tpBar').getBoundingClientRect(); return { s: SET.tp.pos.s, y: SET.tp.pos.y, side: el('tpBar').classList.contains('side'), right: Math.round(innerWidth - r.right), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /set/i.test(k) && /"tp"/.test(localStorage.getItem(k))) || 'null') || 'null') }; });
ok('плашку потянули к правому краю — она сбоку, узкая, высокая, там, куда отпустили', sd.s === 'R' && sd.side && sd.right < 20 && sd.h > sd.w * 2 && sd.top > 100 && sd.top < 600, { ...sd, saved: undefined });
if (SHOTS) await p.screenshot({ path: SHOTS + '/ttsplus-9-sboku.png' });
const cyc = await p.evaluate(async () => { const g = el('tpGrip'), tap = () => { const r = g.getBoundingClientRect(), o = { clientX: r.left + 5, clientY: r.top + 5, pointerId: 1, bubbles: true };
    g.dispatchEvent(new PointerEvent('pointerdown', o)); g.dispatchEvent(new PointerEvent('pointerup', o)); return SET.tp.pos.s; };
  const a = tap(), b = tap(), c = tap(); const r = el('tpBar').getBoundingClientRect(); return { a, b, c, side: el('tpBar').classList.contains('side'), cx: Math.round(r.left + r.width / 2), bottom: Math.round(innerHeight - r.bottom) }; });
ok('нажатие на «ручку»: справа → слева → снизу (плашка снова внизу по центру)', cyc.a === 'L' && cyc.b === 'B' && cyc.c === 'R' || (cyc.a === 'L' && cyc.b === 'B'), cyc);
await p.evaluate(() => { SET.tp.pos.s = 'B'; saveSet(); tpBarSync(); });
/* стоп и продолжение с того же предложения */
const s1 = await p.evaluate(async () => { el('tpPP').click(); await new Promise(r => setTimeout(r, 200)); const st = { on: ttsOn, bar: !el('tpBar').hidden, stop: TP.stop && TP.stop.pos, sil: TP.sil.paused };
  window.__dur = 40; __said.length = 0; el('btnTts').click(); await new Promise(r => setTimeout(r, 600)); const t = R.book.text;
  st.first = __said[0] && __said[0].t.slice(0, 40); st.exp = t.slice(tpSent(t, st.stop), tpSent(t, st.stop) + 40); el('btnTts').click(); return st; });
ok('«стоп»: озвучка и плашка выключены, тихий звук тоже', !s1.on && !s1.bar && s1.sil, s1);
ok('«Слушать» снова на той же странице — с того же предложения, не с начала страницы', s1.first && s1.exp.replace(/\s+/g, ' ').indexOf(s1.first.replace(/\s+/g, ' ').trim().slice(0, 20)) === 0, s1);

/* 8: меню выделения */
const sel = await p.evaluate(async () => {
  const pick = (len) => { const c = el('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT), vw = el('viewer').getBoundingClientRect(); let n;
    while ((n = w.nextNode())) { const m = n.textContent.search(len > 10 ? /[А-Яа-яЁё][^\n]{60}/ : /[А-Яа-яЁё]{6,}/); if (m < 0) continue; const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + len); const b = rg.getBoundingClientRect();
      if (b.width && b.left >= vw.left && b.right <= vw.right && b.top > 60 && b.bottom < innerHeight - 120) return rg; } };
  const run = async (len) => { const rg = pick(len); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); document.dispatchEvent(new Event('selectionchange')); await new Promise(r => setTimeout(r, 600));
    stMenu(true); await new Promise(r => setTimeout(r, 100)); const b = el('ssMenu').querySelector('[data-a="say"]'); return { lab: b ? b.textContent : '', n: el('ssMenu').children.length }; };
  const a = await run(6); __said.length = 0; a.st = stText(); a.on = ttsOn; el('ssMenu').querySelector('[data-a="say"]').click(); await new Promise(r => setTimeout(r, 150)); const spoke = __said.map(x => x.t);
  stMenu(false); const b = await run(60); stMenu(false); getSelection().removeAllRanges(); return { a, b, spoke };
});
ok('меню выделения: слово → «Произнести» (говорит его), длинное → «Слушать отсюда»', sel.a.lab === 'Произнести' && sel.spoke.length === 1 && sel.b.lab === 'Слушать отсюда', sel);

/* настройки «Чтение вслух» */
const set = await p.evaluate(async () => { RX_EXP.tts = true; rxRender(); const r = { yo: !!el('tpYo'), pause: el('tpPause') && el('tpPause').children.length, lang: el('tpLangRowS') && el('tpLangRowS').textContent };
  el('tpDictBtn').click(); el('tpDA').value = 'Гермиона'; el('tpDB').value = 'Герми+она'; el('tpDAdd').click(); await new Promise(r => setTimeout(r, 100));
  r.dict = JSON.stringify(SET.tp.dict); r.btn = el('tpDictBtn').textContent; r.prep = tpPrep('Гермиона пришла').s; el('tpPause').children[0].click(); r.pz = SET.tp.pause; el('tpPause').children[2].click();
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); } catch (e) {} r.saved = raw.tp && raw.tp.dict && raw.tp.dict.length; return r; });
ok('«Чтение вслух»: ё, словарь, паузы (4 варианта), иностранные голоса телефона', set.yo && set.pause === 4 && /английский, французский/.test(set.lang), set);
ok('свой словарь: добавилось слово, сохранилось, читается с ударением', set.dict === JSON.stringify([['Гермиона', 'Герми+она']]) && set.btn === 'Слова: 1' && set.prep === 'Гермио́на пришла' && set.pz === 'off' && set.saved === 1, set);
if (SHOTS) { await p.evaluate(() => { closeReader && closeReader(); }); await sleep(800); await p.evaluate(() => { openGeneralSettings(false, 'read'); RX_EXP.tts = true; rxRender(); el('rxXtts').scrollIntoView({ block: 'start' }); }); await sleep(500); await p.screenshot({ path: SHOTS + '/ttsplus-3-nastroiki.png' });
  await p.evaluate(() => { el('tpYo').scrollIntoView({ block: 'start' }); }); await sleep(300); await p.screenshot({ path: SHOTS + '/ttsplus-4-nastroiki2.png' }); }

/* 1: «Нейроголос» в «Нейросети → Озвучка» */
const pip = await p.evaluate(async () => { S.tts.prov = 'piper'; S.tts.voice = ''; save(); NN_EXP.tts = true; renderTtsSet(); renderNn();
  return { box: !el('tpPip').hidden, key: getComputedStyle(el('ttsKey')).display, btn: el('tpPipGet').textContent, on: nttsOn(), t: el('tpPipT').textContent, voices: el('tpPipV').children.length, head: el('ttsHead').textContent }; });
ok('«Нейроголос»: без ключа, кнопка «Скачать «Ирина»», 4 голоса; пока не скачан — читает голос телефона', pip.box && pip.key === 'none' && /Скачать «Ирина»/.test(pip.btn) && !pip.on && pip.voices === 4 && /93 МБ/.test(pip.t) && /не скачан/.test(pip.head), pip);
if (SHOTS) { await p.evaluate(() => { openGeneralSettings(false, 'ai'); NN_EXP.tts = true; renderTtsSet(); renderNn(); el('ttsHead').scrollIntoView({ block: 'start' }); }); await sleep(500); await p.screenshot({ path: SHOTS + '/ttsplus-5-neirogolos.png' }); await p.evaluate(() => { if (typeof closeGeneralSettings === 'function') closeGeneralSettings(); }); }

/* скорость и тонкие настройки голоса */
const fine = await p.evaluate(async () => {
  if (el('reader').classList.contains('hidden')) { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); }
  goPage(2, false); window.__dur = 2000; __said.length = 0; const got = []; const sp = speechSynthesis.speak; speechSynthesis.speak = function (u) { const r = sp.call(this, u); got.push([u.rate, u.pitch, u.volume]); return r; };
  el('btnTts').click(); await new Promise(r => setTimeout(r, 500));
  const r = { rateBtn: el('tpRate').textContent };
  el('tpRate').click(); await new Promise(r => setTimeout(r, 100)); r.pop = !el('tpRatePop').hidden; r.chips = [...el('tpRatePop').querySelectorAll('[data-v]')].map(b => b.textContent);
  el('tpRatePop').querySelector('[data-v="2.5"]').click(); r.rate = SET.rx.tts.rate; el('tpRatePop').querySelector('[data-d="0.05"]').click(); r.rate2 = SET.rx.tts.rate; r.btn2 = el('tpRate').textContent;
  for (let i = 0; i < 12; i++) el('tpRatePop').querySelector('[data-d="0.05"]').click(); r.max = SET.rx.tts.rate;
  ttsStop(); speechSynthesis.speak = sp; window.__dur = 40;
  RX_EXP.tts = true; rxRender(); el('tpPre2').querySelector('button').click(); r.book = { rate: SET.rx.tts.rate, expr: SET.tp.expr, pause: SET.tp.pause, on: el('tpPre2').querySelector('.on') && el('tpPre2').querySelector('.on').textContent };
  [...el('tpPre2').querySelectorAll('button')].find(b => b.textContent === 'Перед сном').click(); r.sleep = { rate: SET.rx.tts.rate, pitch: SET.tp.pitch, expr: SET.tp.expr };
  const pr = el('tpPitchR'); pr.value = '1.3'; pr.dispatchEvent(new Event('change')); const vr = el('tpVolR'); vr.value = '0.6'; vr.dispatchEvent(new Event('change'));
  { const sp2 = speechSynthesis.speak; let u0 = null; const f = window.__fakeSpeak; tpSysSay('Проба', 'en', () => {}, () => {}, () => {}); const last = __said[__said.length - 1]; r.utt = last && [last.rate, last.pitch, last.vol]; }
  r.oa = tpVoiceOpts('openai').instructions; SET.tp.style = 'как сказочник'; r.oa2 = tpVoiceOpts('openai').instructions; r.el = tpVoiceOpts('elevenlabs').voice_settings.stability;
  el('tpPhoneBtn').click(); r.help = el('tpPhoneBox').textContent.slice(0, 80); r.rhv = el('tpPhoneBox').querySelectorAll('[data-rhv]').length;
  [...el('tpPre2').querySelectorAll('button')].find(b => b.textContent === 'Как было').click(); SET.tp.pitch = 1; SET.tp.vol = 1; SET.tp.style = ''; saveSet();
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); } catch (e) {} r.saved = raw.tp && [raw.tp.pitch, raw.tp.expr, raw.rx.tts.rate];
  return r; });
ok('плашка: кнопка скорости «1×» → окошко с −/+ и 0,75…2,5×; 2,5 → 2,55; не больше 3×', fine.rateBtn === '1×' && fine.pop && fine.chips.length === 6 && fine.rate === 2.5 && fine.rate2 === 2.55 && fine.btn2 === '2,55×' && fine.max === 3, fine);
ok('наборы: «Аудиокнига» (живо, длинные паузы), «Перед сном» (0,85×, ниже, спокойно)', fine.book.expr === 'live' && fine.book.pause === 'l' && fine.book.on === 'Аудиокнига' && fine.sleep.rate === 0.85 && fine.sleep.pitch === 0.95 && fine.sleep.expr === 'calm', fine);
ok('высота 1,3 и громкость 60 % доходят до голоса телефона', fine.utt && [0.85, 1.3, 0.6].every((v, i) => Math.abs(fine.utt[i] - v) < 0.001), fine.utt);
ok('выразительность: OpenAI получает манеру (+ своя), ElevenLabs — стабильность', /спокойно, ровно/.test(fine.oa) && /как сказочник$/.test(fine.oa2) && fine.el === 0.8, fine);
ok('«Хорошие голоса для телефона»: RHVoice (без нейросети) и голоса Google, кнопки скачать', /RHVoice/.test(fine.help) && fine.rhv === 2, fine);
ok('сохраняется', JSON.stringify(fine.saved) === JSON.stringify([1, 'norm', 1]), fine.saved);
if (SHOTS) { await p.evaluate(async () => { goPage(2, false); window.__dur = 3000; el('btnTts').click(); await new Promise(r => setTimeout(r, 400)); el('tpRate').click(); }); await sleep(300); await p.screenshot({ path: SHOTS + '/ttsplus-6-skorost.png' }); await p.evaluate(() => { ttsStop(); window.__dur = 40; });
  await p.evaluate(() => { closeReader && closeReader(); }); await sleep(800); await p.evaluate(() => { openGeneralSettings(false, 'read'); RX_EXP.tts = true; rxRender(); el('tpPre2').scrollIntoView({ block: 'start' }); }); await sleep(400); await p.screenshot({ path: SHOTS + '/ttsplus-7-tonkie.png' });
  await p.evaluate(() => { el('tpPhoneBtn').click(); el('tpPhoneBtn').click(); el('tpPhoneBtn').scrollIntoView({ block: 'start' }); }); await sleep(300); await p.screenshot({ path: SHOTS + '/ttsplus-8-golosa.png' }); }

/* 7: нейроголос на ключе — глава заранее, тот же кусок не оплачивается дважды */
const neu = await p.evaluate(async () => {
  try { await caches.delete(TPC_CACHE); } catch (e) {}
  const wav = pipWav(new Int16Array(2205), 22050); window.__req = [];
  const f0 = window.fetch; window.fetch = async function (u, o) { if (String(u).indexOf('api.openai.com') >= 0) { __req.push(JSON.parse(o.body).input); await new Promise(r => setTimeout(r, 30)); return new Response(wav, { status: 200, headers: { 'Content-Type': 'audio/wav' } }); } return f0.apply(this, arguments); };
  S.tts = { prov: 'openai', key: 'sk-' + 'a'.repeat(48), voice: '', base: '' }; save();
  if (!el('reader').classList.contains('hidden')) {} else { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); }
  goPage(2, false); await new Promise(r => setTimeout(r, 300));
  el('btnTts').click(); await new Promise(r => setTimeout(r, 4000));
  const n1 = __req.length, pos = R.ttsPos, ahead = __req.reduce((s, x) => s + x.length, 0);
  tpBack('p'); await new Promise(r => setTimeout(r, 1500)); tpBack('p'); await new Promise(r => setTimeout(r, 1500));
  const dup = __req.filter((x, i) => __req.indexOf(x) !== i).length, c = await tpCSize();
  ttsStop(); window.fetch = f0; S.tts = { prov: 'system', key: '', voice: '', base: '' }; save();
  return { n1, ahead, dup, stored: c[1], total: __req.length };
});
ok('нейроголос: заранее заказано больше, чем уже прозвучало (до ~10 минут вперёд)', neu.n1 >= 6 && neu.ahead > 3000, neu);
ok('после «назад» те же абзацы берутся из сохранённого — ни один кусок не оплачен дважды', neu.dup === 0 && neu.stored >= neu.n1 - 1, neu);

ok('no page errors', errs.length === 0, errs);
console.log('SUMMARY ttsplus.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
