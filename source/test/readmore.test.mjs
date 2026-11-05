// 05.11 «Ещё для чтения» (Джессика: «давай все кроме заботы о глазах»): SET.wsp / SET.psp / SET.rm (arch.md 05.11), js/read-more.js.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node readmore.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { normRm, hydrateSettings } from '../storage/schema.js';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const fresh = async (w = 390, h = 844) => {
  const p = await (await browser.createBrowserContext()).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  return p;
};
const imp = (p, buf, name) => p.evaluate(async (b64, name) => {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), ids = allBooks().map(b => b.id);
  await importBookFiles([new File([bin], name)]); await new Promise(r => setTimeout(r, 300));
  const b = allBooks().find(x => !ids.includes(x.id)); return b ? b.id : null;
}, Buffer.from(buf).toString('base64'), name);
const open = (p, id, ms = 700) => p.evaluate(async (id, ms) => { await openBook(id); await new Promise(r => setTimeout(r, ms)); }, id, ms);
let p = await fresh();
let r;

// 0. normalisation: page and node agree, junk → defaults; a fresh start changes nothing
const JUNK = { bion: 1, cap: true, maxw: 60, ufont: '  Мой  ', auto: { sec: 3 }, fn: 'yes', zones: ['next', 'x'], sleep: 20, ttsHl: false, recap: false,
  ruler: { on: true, n: 5, auto: 1 }, eink: true, tod: { on: true, day: 'День', eve: 5, from: '25:00', to: '06:30' }, extra: 1 };
r = await p.evaluate((j) => ({ a: rqRmNorm(j), d: rqRmNorm(null), set: SET.rm, wsp: SET.wsp, psp: SET.psp }), JUNK);
const nd = normRm(JUNK);
ok('0 rqRmNorm = schema normRm; junk → defaults', JSON.stringify(r.a) === JSON.stringify(nd) && r.a.bion === false && r.a.cap === true && r.a.maxw === 0 && r.a.ufont === 'Мой' &&
  r.a.auto.sec === 0 && r.a.fn === true && r.a.zones === null && r.a.sleep === 0 && r.a.ttsHl === false && r.a.ruler.n === 1 && r.a.ruler.auto === false &&
  r.a.tod.from === '20:00' && r.a.tod.to === '06:30' && r.a.tod.eve === '' && !('extra' in r.a), { page: r.a, node: nd });
ok('0 fresh start: SET.rm = defaults, no spacing', JSON.stringify(r.set) === JSON.stringify(r.d) && r.wsp === 0 && r.psp === 0 && !r.d.bion && !r.d.eink && r.d.fn && r.d.ttsHl, r);
const hs = hydrateSettings({ wsp: 3.4, psp: 0.6, bookSet: { b9: { wsp: 2, psp: 0.5, size: 20 } } });
ok('0 import: wsp / psp clamped to their steps, kept in «Только к этой книге»', hs.wsp === 3 && hs.psp === 0.5 && hs.bookSet.b9.wsp === 2 && hs.bookSet.b9.psp === 0.5, hs);

// 1. word / paragraph spacing; 18 the sample text is the page's own words
await open(p, 'b1');
r = await p.evaluate(() => { const n0 = R.pageCount; el('rmWspPlus').click(); el('rmWspPlus').click(); el('rmPspPlus').click(); el('rmPspPlus').click();
  const s = JSON.parse(localStorage.getItem(RQ_K.set)); return { n0, n1: R.pageCount, ws: el('content').style.wordSpacing, psp: el('content').classList.contains('rmpsp'), sw: s.wsp, sp: s.psp,
    mb: getComputedStyle(el('content').querySelectorAll('p')[3]).marginBottom }; });
ok('1 «Между словами» +2 px, «Между абзацами» +0,5 em: saved, the book re-paged', r.ws === '2px' && r.psp && r.sw === 2 && r.sp === 0.5 && r.n1 >= r.n0 && parseFloat(r.mb) > 5, r);
await p.evaluate(() => openReaderSettings('grpText')); await sleep(250);
r = await p.evaluate(() => ({ on: el('sheet').classList.contains('rmprev'), vis: !!el('gsPrev').offsetParent, t: el('gsPrev').textContent.slice(0, 40), ws: el('gsPrev').style.wordSpacing }));
ok('18 «Настройки чтения» in a book: the sample on top shows the page text with the new spacing', r.on && r.vis && /^Через базарную/.test(r.t) && r.ws === '2px', r);
await p.evaluate(() => { el('rmWspMinus').click(); el('rmWspMinus').click(); el('rmPspMinus').click(); el('rmPspMinus').click(); el('sheet').classList.add('hidden'); });

// 4 + 6: bold word starts, drop cap; a long press still takes the whole word
r = await p.evaluate(() => { el('rmCap').click(); el('rmBion').click(); const c = el('content'), b = c.querySelectorAll('b.rmbi')[40], w = smWord([b.firstChild, 0]);
  const rg = document.createRange(); rg.setStart(w[0][0], w[0][1]); rg.setEnd(w[1][0], w[1][1]);
  const fl = getComputedStyle(c.querySelector('p.meta + p'), '::first-letter');
  return { cap: c.classList.contains('rmcap'), fl: parseFloat(fl.fontSize) / parseFloat(getComputedStyle(c).fontSize), bi: c.querySelectorAll('b.rmbi').length, word: rg.toString(), text: c.textContent.length }; });
ok('6 «Красивое начало главы»: a big first letter', r.cap && r.fl > 2.5, r);
ok('4 «Жирное начало слова»: words start bold; a long press selects the whole word', r.bi > 500 && /^[а-яё]{3,}$/i.test(r.word), r);
r = await p.evaluate(() => { const t0 = el('content').textContent.length; el('rmBion').click(); el('rmCap').click(); return { bi: el('content').querySelectorAll('b.rmbi').length, same: el('content').textContent.length === t0, set: [SET.rm.bion, SET.rm.cap] }; });
ok('4 off again: no bold starts left, the text is the same', r.bi === 0 && r.same && !r.set[0] && !r.set[1], r);

// 10. back and forward through jumps
r = await p.evaluate(() => { const a = []; goPage(0, false); jumpTo(3); showJumpBack(0); jumpTo(5); showJumpBack(3);
  el('jumpBack').click(); a.push([R.page, RM.jb.fwd.join()]); el('jumpBack').click(); a.push([R.page, el('jumpBack').classList.contains('hidden'), RM.jb.fwd.join()]);
  el('rmJbFwd').click(); a.push(R.page); el('rmJbFwd').click(); a.push(R.page); return a; });
ok('10 ‹ goes back twice (5 → 3 → 0), › forward again (→ 3 → 5)', JSON.stringify(r) === JSON.stringify([[3, '5'], [0, true, '5,3'], 3, 5]), r);

// 9. own tap zones
r = await p.evaluate(() => { SET.rm.zones = ['tts', 'bars', 'mark', 'next', 'none', 'prev', 'auto', 'bars', 'next']; const v = el('viewer').getBoundingClientRect(); goPage(3, false); concealChrome('tap');
  const a = []; viewerTap(v.left + 20, v.top + v.height / 2); a.push(R.page); viewerTap(v.right - 20, v.top + v.height / 2); a.push(R.page);
  viewerTap(v.left + v.width / 2, v.top + v.height / 2); a.push(el('reader').classList.contains('barsoff')); viewerTap(v.left + 20, v.bottom - 20); a.push(RM.auto.on); rmAutoStop(); SET.rm.zones = null;
  viewerTap(v.right - 20, v.top + v.height / 2); a.push(R.page); return a; });
ok('9 own zones: left = «Вперёд», right = «Назад», centre «Ничего», bottom-left = автолистание; off → as before', JSON.stringify(r) === JSON.stringify([4, 3, true, true, 4]), r);

// 7. autoscroll: turns by itself, a centre tap pauses, the strip shows the speed
r = await p.evaluate(async () => { SET.rm.auto.sec = 5; goPage(0, false); rmAutoStart(); await new Promise(r => setTimeout(r, 5600)); const a = { p1: R.page };
  const v = el('viewer').getBoundingClientRect(); viewerTap(v.left + v.width / 2, v.top + v.height / 2); a.paused = RM.auto.paused; a.strip = !el('rmAuto').hidden; a.v = el('rmAutoV').textContent;
  await new Promise(r => setTimeout(r, 1500)); a.p2 = R.page; el('rmAutoSlow').click(); a.sec = SET.rm.auto.sec; el('rmAutoFast').click(); a.sec2 = SET.rm.auto.sec; el('rmAutoX').click(); a.on = RM.auto.on; SET.rm.auto.sec = 0; return a; });
ok('7 autoscroll: page 1 → 2 after 5 s; centre tap = pause; «−» slower, «+» faster; ✕ stops', r.p1 === 1 && r.paused && r.strip && /5 с на страницу/.test(r.v) && r.p2 === 1 && r.sec > 5 && r.sec2 === 5 && !r.on, r);
r = await p.evaluate(async () => { SET.rm.auto.sec = 5; rmAutoStart(); RM.auto.lastIn = Date.now() - 31 * 60000; await new Promise(r => setTimeout(r, 100)); const on = RM.auto.on; SET.rm.auto.sec = 0; return on; });
ok('7 half an hour without a touch → the autoscroll stops', r === false);

// 11 + 12: sleep timer, the sentence being read (speech mocked)
r = await p.evaluate(async () => { SET.rm.sleep = 15; speechSynthesis.speak = function (u) { setTimeout(() => { u.onstart && u.onstart(); u.onboundary && u.onboundary({ charIndex: 300 }); }, 50); };
  ttsVoiceReady = () => Promise.resolve(true); goPage(0, false); el('btnTts').click(); await new Promise(r => setTimeout(r, 400));
  const hl = CSS.highlights.get('rm-tts'), a = { on: ttsOn, hl: hl ? [...hl][0].toString() : '', chip: el('rmSleep').textContent, moon: !el('btnSleep').hidden };
  RM.sleep.until = Date.now() - 1; rmSleepTick(); a.after = ttsOn; a.hl2 = !!CSS.highlights.get('rm-tts'); a.moon2 = !el('btnSleep').hidden; SET.rm.sleep = 0; return a; });
ok('12 the sentence being read is painted on the page', r.on && /^Открытые двери лавок.*нищих\.$/.test(r.hl), r);
ok('11 timer 15 min: «сон через 15 мин» under the page, moon button; at the end the voice stops', /сон через 15 мин/.test(r.chip) && r.moon && !r.after && !r.hl2 && !r.moon2, r);
r = await p.evaluate(() => { el('btnSleep').hidden = false; const a = []; for (let i = 0; i < 6; i++) { el('btnSleep').click(); a.push(SET.rm.sleep); } return a; });
ok('11 the moon button steps through 15 / 30 / 45 / 60 / chapter / off', JSON.stringify(r) === '[15,30,45,60,-1,0]', r);

// 16 ruler, 17 e-ink
r = await p.evaluate(() => { SET.rm.ruler.on = true; SET.rm.ruler.n = 2; rmRulerDraw(); const t = el('rmRulerT'), b = el('rmRulerB'); const a = { t: !t.hidden, b: !b.hidden, g: !el('rmRulerG').hidden, gap: b.getBoundingClientRect().top - t.getBoundingClientRect().bottom };
  SET.rm.ruler.on = false; rmRulerDraw(); a.off = t.hidden; return a; });
ok('16 ruler: two lines open, the rest under the page colour; off hides it', r.t && r.b && r.g && r.gap > 40 && r.off, r);
r = await p.evaluate(() => { SET.rm.eink = true; SET.flip = Object.assign({}, flipGet(), { anim: 'slide' }); applySet(); const a = { cls: el('reader').classList.contains('rmeink'), bg: getComputedStyle(el('reader')).backgroundColor, anim: rqAnimKind() };
  SET.rm.eink = false; applySet(); a.anim2 = rqAnimKind(); SET.flip.anim = 'none'; applySet(); return a; });
ok('17 e-ink: white page, no page-turn animation', r.cls && r.bg === 'rgb(255, 255, 255)' && r.anim === null && r.anim2 === 'slide', r);

// 2 own font, 3 bundled fonts
r = await p.evaluate(async () => { const i = FONTS.findIndex(f => f.label === 'Andika'), j = FONTS.findIndex(f => f.label === 'Literata'); SET.font = i; applySet(); await document.fonts.load('400 20px "RQ Andika"', 'Аб');
  const a = { andika: document.fonts.check('400 20px "RQ Andika"', 'Аб'), lit: j > 0, hidden: document.querySelector('#fontSeg .xopt[data-k="' + FONTS.findIndex(f => f.user) + '"]').hidden }; SET.font = 0; applySet(); return a; });
ok('3 Andika and Literata in the list, Russian letters load; «Свой шрифт» hidden until a file', r.andika && r.lit && r.hidden, r);
await p.evaluate(() => openReaderSettings('grpText')); await sleep(150);
const ftmp = '/tmp/rm-test-font.woff2'; fs.copyFileSync(new URL('../fonts/reader-andika-latin-400.woff2', import.meta.url), ftmp);
await (await p.$('#rmUfIn')).uploadFile(ftmp); await sleep(800);
r = await p.evaluate(() => ({ uf: SET.rm.ufont, lab: FONTS[SET.font].label, user: !!FONTS[SET.font].user, row: !document.querySelector('#fontSeg .xopt[data-k="' + SET.font + '"]').hidden, ff: getComputedStyle(el('content')).fontFamily }));
ok('2 a font file → «rm-test-font» in the list and on the page', r.uf === 'rm test font' && r.lab === 'rm test font' && r.user && r.row && /RQ User Font/.test(r.ff), r);
r = await p.evaluate(async () => { await rmUfDel(); return { uf: SET.rm.ufont, font: SET.font, v: await idbGet('ufont') }; });
ok('2 «Убрать»: the file is gone, the font back to the first', r.uf === '' && r.font === 0 && !r.v, r);
await p.evaluate(() => el('sheet').classList.add('hidden'));

// 8 footnotes (FB2 with a notes body)
const para = (i) => '<p>Абзац номер ' + i + '. Он долго шёл по улице и думал о своём' + (i === 2 ? '<a l:href="#n1" type="note">[1]</a>' : '') + (i === 3 ? ', а потом сказал «да»<a l:href="#n2" type="note">2</a>' : '') + '. Ветер гнал листья, и было тихо.</p>';
const body = Array.from({ length: 30 }, (_, i) => para(i + 1)).join('');
const fb2 = '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><book-title>Сноски</book-title><author><last-name>Тестов</last-name></author><lang>ru</lang></title-info></description>' +
  '<body><section><title><p>Глава первая</p></title>' + body + '</section><section><title><p>Глава вторая</p></title>' + body + '</section></body><body name="notes"><title><p>Примечания</p></title>' +
  '<section id="n1"><title><p>1</p></title><p>Это первая сноска.</p></section><section id="n2"><title><p>2</p></title><p>Вторая сноска: «да» тут значит «нет».</p></section></body></FictionBook>';
const fid = await imp(p, Buffer.from(fb2, 'utf8'), 'notes.fb2'); await open(p, fid);
const at = (mark, d) => p.evaluate((mark, d) => { const p0 = [...el('content').querySelectorAll('p')].find(x => x.textContent.includes(mark)); const tn = [...p0.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes(mark));
  const i = tn.nodeValue.indexOf(mark) + d, rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1); const b = rg.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, mark, d);
let xy = await at('[1]', 1); await p.evaluate((q) => viewerTap(q.x, q.y), xy); await sleep(150);
r = await p.evaluate(() => ({ hid: el('rmNote').hidden, t: el('rmNote').textContent, page: R.page }));
ok('8 tap on «[1]» → a window with «Это первая сноска.», the page stays', !r.hid && /Сноска 1.*Это первая сноска\./.test(r.t) && r.page === 0, r);
await p.evaluate(() => rmFnHide()); xy = await at('«да»2', 4); await p.evaluate((q) => viewerTap(q.x, q.y), xy); await sleep(150);
r = await p.evaluate(() => ({ hid: el('rmNote').hidden, t: el('rmNote').textContent }));
ok('8 a number right after a word («да»2) is a note too', !r.hid && /Вторая сноска/.test(r.t), r);
r = await p.evaluate(() => { rmFnHide(); SET.rm.fn = false; return 1; }); xy = await at('[1]', 1); await p.evaluate((q) => viewerTap(q.x, q.y), xy); await sleep(150);
ok('8 «Сноски в окне» off → no window', await p.evaluate(() => { const h = el('rmNote').hidden; SET.rm.fn = true; return h; }));

// 13 «Что было раньше» (AI mocked): the request holds only the text up to the place, the sheet says «Что было раньше»
r = await p.evaluate(async () => { S.ai = { prov: 'openai', key: 'sk-test' }; let m = null; const v0 = aiViaKey; aiViaKey = async (x) => { m = x; return 'Герой шёл по улице.'; };
  goPage(Math.floor(R.pageCount / 2), false); const at = Math.floor(R.page / (R.pageCount - 1) * R.book.text.length); await rmRecap(); await new Promise(r => setTimeout(r, 200)); aiViaKey = v0;
  return { head: document.querySelector('#aiSheet > h3').textContent.trim(), ans: el('aiBody').textContent, tail: m.user.slice(-60), after: R.book.text.slice(at, at + 80), spoil: /без спойлеров/i.test(m.system), ch: /Глава первая/.test(m.user) }; });
ok('13 the recap: «Что было раньше», answer shown, the text sent ends at the place (no text after it), no spoilers asked', r.head === 'Что было раньше' && /Герой шёл/.test(r.ans) && r.spoil && r.ch && !r.after.includes(r.tail.slice(-30)), r);
r = await p.evaluate(() => { el('aiSheet').classList.add('hidden'); return new Promise(res => setTimeout(() => res(document.querySelector('#aiSheet > h3').textContent.trim()), 50)); });
ok('13 closing the sheet gives it back its «Объясни» title', r === 'Объясни', r);
r = await p.evaluate(async (id) => { await closeReader({ quiet: true }); S.lastOpen[id] = Date.now() - 5 * 864e5; S.progress[id] = Object.assign({}, S.progress[id], { pos: 0.4, ratio: 0.4 }); await openBook(id);
  await new Promise(r => setTimeout(r, 200)); return { hid: el('rmRecapOffer').hidden, t: el('rmRecapOffer').textContent }; }, fid);
ok('13 a book not opened for 5 days offers «Напомнить, что было?»', !r.hid && /5 дней/.test(r.t), r);

// 19 presets by the time of day
r = await p.evaluate(() => { SET.presets = [{ n: 'День', v: { size: 18 } }, { n: 'Вечер', v: { size: 24, warm: 0.3 } }]; const d = new Date(), z = (x) => String(x).padStart(2, '0');
  SET.rm.tod = { on: true, day: 'День', eve: 'Вечер', from: z(d.getHours()) + ':' + z(d.getMinutes()), to: z((d.getHours() + 2) % 24) + ':' + z(d.getMinutes()) }; RM.todLast = ''; rmTodTick(true);
  const a = { size: SET.size, warm: SET.warm }; SET.rm.tod.from = z((d.getHours() + 3) % 24) + ':00'; SET.rm.tod.to = z((d.getHours() + 4) % 24) + ':00'; rmTodTick(false); a.size2 = SET.size; SET.rm.tod.on = false; return a; });
ok('19 evening now → «Вечер» (24, warm); the evening over → «День» (18)', r.size === 24 && r.warm === 0.3 && r.size2 === 18, r);

// 14 a book with the translation under each paragraph (engine mocked)
const eng = Array.from({ length: 20 }, () => 'It was the best of times, it was the worst of times, and he walked to the old house with his dog.').join('\n\n');
const eid = await imp(p, Buffer.from(eng, 'utf8'), 'Tale.txt');
await p.evaluate((id) => { closeReader({ quiet: true }); bookInfo(id); }, eid); await sleep(500);
r = await p.evaluate(() => [...document.querySelectorAll('#bookSheetBody .rmcard .rmbl>span')].map(x => x.textContent));
ok('14 an English book: «Книга с переводом рядом» in the card', r.includes('Книга с переводом рядом'), r);
r = await p.evaluate(async (id) => { trState = async () => ({ path: ['enru'], have: true }); trEngine = async () => ({ translate: async (q) => ({ target: { text: 'Перевод: ' + q.text.slice(0, 12) } }) });
  await rmBiMake(id); await new Promise(r => setTimeout(r, 800)); return { title: R.book && R.book.title, bi: el('content').querySelectorAll('p.rq-bitr').length, n: allBooks().length }; }, eid);
ok('14 → a new book «Tale · с переводом», a translation under each paragraph', r.title === 'Tale · с переводом' && r.bi === 20, r);
r = await p.evaluate(async (id) => { const n = allBooks().length; await closeReader({ quiet: true }); await rmBiMake(id); await new Promise(r => setTimeout(r, 300)); return { same: allBooks().length === n, title: R.book && R.book.title }; }, eid);
ok('14 again → opens the same translated book, no copy', r.same && r.title === 'Tale · с переводом', r);

// 5 line width on a tablet
const t = await fresh(800, 1100);
r = await t.evaluate(async () => { await openBook('b1'); await new Promise(r => setTimeout(r, 500)); const m0 = parseFloat(el('viewer').style.margin.split(' ')[1]); SET.rm.maxw = 55; applySet(); relayout({ force: true });
  const c = el('content').querySelector('p.meta + p'), rg = document.createRange(); rg.selectNodeContents(c); const lines = [...rg.getClientRects()].filter(x => x.width > 50);
  const m1 = parseFloat(el('viewer').style.margin.split(' ')[1]); const w = lines[0].width; return { m0, m1, w, per: rmCharW() }; });
ok('5 «Ширина строки» 55 on an 800 px tablet: wider fields, a line ≈ 55 letters', r.m1 > r.m0 && r.w / r.per <= 60 && r.w / r.per >= 45, r);

// 18/19 settings: cards in «Чтение», rows in «Настройки чтения»; search finds a new row
r = await p.evaluate(() => { openGeneralSettings(false, 'read'); return [...document.querySelectorAll('#rxCard > .xrow')].map(x => x.querySelector('.xt').textContent); });
ok('settings: «Сноски и возвращение к книге» and «Наборы по времени суток» cards', r.length === 12 && r.includes('Словари') && r.includes('Когда глава прочитана') && r.includes('Наборы по времени суток'), r);
await p.evaluate(() => openGeneralSettings(false)); await sleep(150); await p.type('#setSearch', 'автолист'); await sleep(200);
r = await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres b')].map(b => b.textContent));
ok('settings search «автолист» finds «Автолистание»', r.some(x => /Автолистание/.test(x)), r);

ok('no page errors', !p.errs.length && !t.errs.length, p.errs.concat(t.errs).slice(0, 3));
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\nSUMMARY readmore.test ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
