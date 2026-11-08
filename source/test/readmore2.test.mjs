// 05.11 «Ещё идеи для чтения» (Джессика: «давай реализуем все»): js/read-more2.js, SET.rm dlg / hard / chEnd / chQ / rsvp / oneh / edge / roles (arch.md 05.11).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node readmore2.test.mjs
import puppeteer from 'puppeteer-core';
import { normRm } from '../storage/schema.js';
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
const p = await fresh();
let r;

// 0. normalisation: page = node, junk → defaults
const JUNK = { dlg: 1, hard: 'y', chEnd: false, chQ: 0, rsvp: 1234, oneh: true, edge: false, roles: { on: true, v: '  nova  ', sv: 5 } };
r = await p.evaluate((j) => ({ a: rqRmNorm(j), d: rqRmNorm(null) }), JUNK);
const nd = normRm(JUNK);
ok('0 rqRmNorm = schema normRm for the new fields; defaults', JSON.stringify(r.a) === JSON.stringify(nd) && r.a.dlg === false && r.a.hard === false && r.a.chEnd === false && r.a.chQ === true &&
  r.a.rsvp === 300 && r.a.oneh === true && r.a.edge === false && r.a.roles.v === 'nova' && r.a.roles.sv === '' && r.d.chEnd && r.d.edge && r.d.rsvp === 300, { a: r.a, nd });

// 5 + 2 on «Хамелеон»: dialogues painted, old words underlined, a tap on one shows its meaning
await open(p, 'b1');
r = await p.evaluate(() => {
  el('r2Dlg').click(); el('r2Hard').click();
  const d = CSS.highlights.get('rm-dlg'), h = CSS.highlights.get('rm-hard'), dl = [...d].map(x => x.toString()), hw = [...h].map(x => x.toString().toLowerCase());
  return { on: [SET.rm.dlg, SET.rm.hard], nd: dl.length, d0: dl.slice(0, 3), nh: hw.length, hw: [...new Set(hw)].slice(0, 12), sp: r2DlgSpans('— Пошёл вон! — крикнул он. — Ну!').map(x => '— Пошёл вон! — крикнул он. — Ну!'.slice(x[0], x[1])) };
});
ok('5 dialogues: the spoken parts are painted, the words of the author are not', r.on[0] && r.nd > 10 && JSON.stringify(r.sp) === JSON.stringify(['Пошёл вон!', 'Ну!']) && !r.d0.some(x => /^—/.test(x)), r);
ok('2 hard words: «городовой», «надзиратель» … underlined', r.on[1] && r.nh > 3 && r.hw.some(w => /городов/.test(w)) && r.hw.some(w => /надзирател/.test(w)), r);
r = await p.evaluate(() => { const h = [...CSS.highlights.get('rm-hard')].find(x => /^городов/i.test(x.toString())); if (!h) return null;
  goPage(selPageAt(h.getClientRects()[0]), false); const q = h.getClientRects()[0]; viewerTap(q.left + q.width / 2, q.top + q.height / 2);
  return { shown: !el('rmNote').hidden, t: el('rmNote').textContent }; });
ok('2 a tap on «городовой» shows its meaning on the page', r && r.shown && /полицейский/.test(r.t), r);
await p.evaluate(() => { rmFnHide(); el('rmBion').click(); });
r = await p.evaluate(() => ({ d: CSS.highlights.get('rm-dlg').size, h: CSS.highlights.get('rm-hard').size, bi: el('content').querySelectorAll('b.rmbi').length }));
ok('5 + 2 still there after «Жирное начало слова» rebuilt the text', r.d > 10 && r.h > 3 && r.bi > 100, r);
await p.evaluate(() => { el('rmBion').click(); el('r2Dlg').click(); el('r2Hard').click(); });
r = await p.evaluate(() => ({ d: CSS.highlights.has('rm-dlg'), h: CSS.highlights.has('rm-hard') }));
ok('5 + 2 off → nothing painted', !r.d && !r.h, r);

// 1 «Кто это?»: in «Действия» for a short selection; the AI gets only pieces of the read text with the name
r = await p.evaluate(async () => {
  S.ai = { prov: 'openai', key: 'sk-test' }; let m = []; const v0 = aiViaKey; aiViaKey = async (x) => { m.push(x); return m.length === 1 ? 'Полицейский надзиратель.' : 'Очумелов — надзиратель\nХрюкин — золотых дел мастер'; };
  goPage(2, false); const c = el('content'), w = c.textContent.indexOf('Очумелов', 300), T = rmNodes(), a = rmAt(T, w), z = rmAt(T, w + 8);
  const s = window.getSelection(), rg = document.createRange(); rg.setStart(a.node, a.offset); rg.setEnd(z.node, z.offset); s.removeAllRanges(); s.addRange(rg);
  ssEl(); if (typeof stBind === 'function' && !el('ssMenu').onclick) stBind(); stMenu(true); const item = el('ssMenu').querySelector('[data-a="who"]'); const has = !!item; el('ssMenu').hidden = true;
  ST_ACT.who(); await new Promise(r => setTimeout(r, 300));
  const t1 = el('aiSheet').querySelector('h3').textContent, a1 = el('aiBody').textContent, u = m[0] && m[0].user || '';
  const at = r2Off(R.book), after = R.book.text.slice(at + 1600);
  el('r2Heroes').click(); await new Promise(r => setTimeout(r, 300)); const li = [...el('aiBody').querySelectorAll('.r2list li')].map(x => x.textContent);
  el('aiSheet').classList.add('hidden'); await new Promise(r => setTimeout(r, 50)); aiViaKey = v0;
  const late = after.match(/[^.]{40,}Очумелов[^.]{10,}/);
  return { has, t1, a1, nosp: !late || u.indexOf(late[0].trim().slice(0, 50)) < 0, snips: (u.match(/^\d+\)/gm) || []).length, li, h3: el('aiSheet').querySelector('h3').textContent };
});
ok('1 «Кто это?» in «Действия»; the answer under its own title', r.has && /Кто это/.test(r.t1) && /Полицейский/.test(r.a1), r);
ok('1 the AI gets pieces with the name from the read part only (no spoilers)', r.snips >= 1 && r.nosp, r);
ok('1 «Все герои до этого места» → a list; closing gives the sheet back its «Объясни» title', r.li.length === 2 && /Хрюкин/.test(r.li[1]) && /Объясни/.test(r.h3), r);

// 3 + 4: the end of a chapter → a card «Итог в дневник» / «Вопрос»
const ch = (i) => '<section><title><p>Глава ' + i + '</p></title>' + Array.from({ length: 30 }, (_, k) => '<p>Глава ' + i + ', абзац ' + k + '. Он долго шёл по улице и думал о своём, а ветер гнал листья по мостовой, и было тихо и пусто.</p>').join('') + '</section>';
const fb2 = '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Главы</book-title><author><last-name>Тестов</last-name></author><lang>ru</lang></title-info></description><body>' + ch(1) + ch(2) + ch(3) + '</body></FictionBook>';
const cid = await imp(p, Buffer.from(fb2, 'utf8'), 'chapters.fb2'); await open(p, cid);
await p.evaluate(() => { r2ChapCov = () => -1; }); /* без «Честного чтения»: по порядку + время (честное правило — anticheat2.test.mjs) */
r = await p.evaluate(async () => {
  const b = R.book, toc = r2Toc(b); R2.cps = 1e9; goPage(0, false); await new Promise(r => setTimeout(r, 50));
  let pg = 0; while (pg < R.pageCount - 1 && r2ChapAt(b, r2Off(b)) < 1) { goPage(++pg, true); await new Promise(r => setTimeout(r, 30)); if (!el('r2Offer').hidden) break; }
  const card = !el('r2Offer').hidden, txt = el('r2Offer').textContent, q = !!el('r2ChQ');
  let m = null; const v0 = aiViaKey; aiViaKey = async (x) => { m = x; return 'Он шёл по улице.\nБыло тихо.\nЛистья.'; };
  el('r2ChSum').click(); await new Promise(r => setTimeout(r, 200)); el('r2SumSave').click(); await new Promise(r => setTimeout(r, 100));
  const y = diaryOf(b.id), e = y && y.e[0];
  aiViaKey = async () => '[{"q":"Куда он шёл?","a":"По улице"},{"q":"Что гнал ветер?","a":"Листья"}]'; delete R2_AI['quiz|' + b.id + '|0'];
  r2ChapQuiz(b, 0); await new Promise(r => setTimeout(r, 200)); const qs = [...el('aiBody').querySelectorAll('.r2q b')].map(x => x.textContent), ans = el('aiBody').querySelector('.r2q details:not([open])') != null;
  el('aiSheet').classList.add('hidden'); aiViaKey = v0;
  return { toc: toc.length, card, txt, q, sent: m && m.user.indexOf('Глава 1, абзац 29') > 0 && m.user.indexOf('Глава 2, абзац 1.') < 0, e: e && [e.t, e.ch, e.x], qs, ans };
});
ok('3 the chapter read to the end → a card «Глава … прочитана» with «Итог в дневник» and «Вопрос»', r.toc === 3 && r.card && /Глава прочитана.*Глава 1/.test(r.txt) && r.q, r);
ok('3 «Итог в дневник»: the AI reads only this chapter; «Записать» puts it into the book diary', r.sent && r.e && r.e[0] === 'Итог главы' && r.e[1] === 'Глава 1' && /шёл по улице/.test(r.e[2]), r);
ok('4 «Вопрос по главе»: two questions, the answers hidden until a tap', r.qs.length === 2 && /Куда он шёл/.test(r.qs[0]) && r.ans, r);
r = await p.evaluate(async () => { SET.rm.chEnd = false; R2.cb = ''; el('r2Offer').hidden = true; goPage(0, false); r2ChapWatch(); let pg = 0;
  while (pg < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { goPage(++pg, true); await new Promise(r => setTimeout(r, 30)); } SET.rm.chEnd = true; return el('r2Offer').hidden; });
ok('3 «Предлагать итог главы» off → no card', r === true, r);

// 3 (08.11, подруга Джессики: «вылезает и мешает, крестик не нажимается»): one compact row; the cross / a tap on the card / a swipe up / the next page close it;
// no card after «Contents» and short chapters; not more often than once in 10 minutes
const walk = (toc) => p.evaluate(async (toc) => { const t0 = r2Toc; if (toc) r2Toc = () => toc; R2.offAt = 0; R2.cb = ''; r2OfferHide(); goPage(0, false); r2ChapWatch(); let pg = 0, seen = false;
  while (pg < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { goPage(++pg, true); await new Promise(r => setTimeout(r, 30)); if (!el('r2Offer').hidden) { seen = true; break; } }
  const a = { seen, pg, txt: el('r2Offer').textContent, h: el('r2Offer').getBoundingClientRect().height }; if (toc) r2Toc = t0; return a; }, toc);
r = await walk(null);
const card = await p.evaluate(() => { const x = el('r2OffX').getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2, top: (document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2) || {}).closest?.('#r2OffX') != null }; });
await p.touchscreen.tap(card.x, card.y); await sleep(150);
const xClosed = await p.evaluate(() => el('r2Offer').hidden);
ok('3 the card is one short row; the cross is on top and a finger on it closes the card', r.seen && r.h <= 64 && /Глава прочитана/.test(r.txt) && card.top && xClosed, { r, card, xClosed });
r = await p.evaluate(async () => { const toc = r2Toc(R.book), a = {};
  const show = () => { r2OfferHide(); r2ChapOffer(R.book, 0); }, rc = () => el('r2Offer').getBoundingClientRect(), pe = (t, y) => el('r2Offer').querySelector('.r2ot').dispatchEvent(new PointerEvent(t, { pointerId: 3, clientX: rc().left + 30, clientY: y, bubbles: true }));
  show(); const y = rc().top + 20; pe('pointerdown', y); pe('pointerup', y); a.tap = el('r2Offer').hidden;
  show(); pe('pointerdown', y); pe('pointermove', y - 40); pe('pointerup', y - 40); a.swipe = el('r2Offer').hidden;
  show(); R2.cp = R.page; R2.offP = R.page; goPage(R.page + 1, true); await new Promise(r => setTimeout(r, 50)); a.turn = el('r2Offer').hidden;
  return a; });
ok('3 a tap on the card, a swipe up or the next page take it away', r.tap && r.swipe && r.turn, r);
r = await p.evaluate(async () => { R2.offAt = 0; R2.cb = ''; goPage(0, false); r2ChapWatch(); let pg = 0, n = 0;
  while (pg < R.pageCount - 1) { goPage(++pg, true); await new Promise(r => setTimeout(r, 20)); if (!el('r2Offer').hidden) { n++; r2OfferHide(); } } return n; });
ok('3 not more often than once in 10 minutes (three chapters → one card)', r === 1, r);
r = await walk([{ t: 'Contents', off: 0 }, { t: 'Глава 2', off: 4000 }, { t: 'Глава 3', off: 8000 }]);
const r1 = await walk([{ t: 'Глава 1', off: 0 }, { t: 'Глава 1а', off: 1200 }, { t: 'Глава 3', off: 8000 }]);
ok('3 no card after «Contents» and after a chapter shorter than 3000 characters', !r.seen && !r1.seen, { r, r1 });
// 3 (08.11, Джессика: «выходит, даже когда я просто листаю книгу»): flipping through fast or jumping → no card; read at a human pace → card
await p.evaluate(() => { R2.cps = 50; });
r = await walk(null);
const slow = await p.evaluate(async () => { R2.offAt = 0; R2.cb = ''; r2OfferHide(); goPage(0, false); r2ChapWatch(); let pg = 0, seen = false;
  while (pg < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { R2.cs.t -= 60000; goPage(++pg, true); await new Promise(r => setTimeout(r, 30)); if (!el('r2Offer').hidden) { seen = true; break; } } return seen; });
const jump = await p.evaluate(async () => { R2.offAt = 0; R2.cb = ''; r2OfferHide(); goPage(0, false); r2ChapWatch(); R2.cs.t -= 600000; let pg = 0, seen = false;
  goPage(2, true); await new Promise(r => setTimeout(r, 30)); pg = 2;
  while (pg < R.pageCount - 1 && r2ChapAt(R.book, r2Off(R.book)) < 1) { goPage(++pg, true); await new Promise(r => setTimeout(r, 30)); if (!el('r2Offer').hidden) { seen = true; break; } } return { seen, pg }; });
ok('3 flipping through a chapter fast or jumping over pages → no card; read at a human pace → the card', !r.seen && slow && !jump.seen, { fast: r, slow, jump });

// 6 word after word
await open(p, 'b1');
r = await p.evaluate(async () => { goPage(2, false); const start = readingAnchor(); SET.rm.rsvp = 600; rsOpen(); await new Promise(r => setTimeout(r, 2200));
  const a = { shown: !el('r2Rs').hidden, i: RS.i, i0: RS.i0, anc: start && start.offset, pg0: R.page, w: el('r2RsW').textContent, orp: el('r2RsW').querySelector('b').textContent.length, run: RS.run };
  el('r2RsPP').click(); const i2 = RS.i; await new Promise(r => setTimeout(r, 400)); a.paused = RS.i === i2 && !RS.run;
  for (let k = 0; k < 400; k++) RS.i++; rsShow(); el('r2RsX').click(); await new Promise(r => setTimeout(r, 100)); a.page = R.page; a.closed = el('r2Rs').hidden; SET.rm.rsvp = 300; return a; });
ok('6 «Слово за словом»: words one by one with the eye letter marked; tap = pause', r.shown && r.run && r.i > 5 && r.orp === 1 && r.paused, r);
ok('6 closing returns to the page where the words stopped', r.closed && r.page > 2, r);

// 7 pick the look in a minute
r = await p.evaluate(() => { el('r2WizGo').click(); const a = []; for (let k = 0; k < 3; k++) { a.push(el('r2Wiz').querySelector('.r2wzh b').textContent); el('r2Wiz').querySelectorAll('.r2wzo')[k === 0 ? 1 : 2].click(); }
  return { a, hid: el('r2Wiz').hidden, s: [SET.font, SET.size, SET.lh, SET.wsp, SET.psp] }; });
ok('7 «Подобрать за минуту»: three questions → font Andika, 23 px, «Просторно»', r.a.length === 3 && r.hid && JSON.stringify(r.s) === JSON.stringify([10, 23, 1.8, 2, 0.5]), r);
await p.evaluate(() => { Object.assign(SET, { font: 0, size: 18, lh: 1.5, wsp: 0, psp: 0 }); saveSet(); applySet(); relayout({ force: true }); });

// 8 one hand
r = await p.evaluate(() => { el('r2OneH').click(); const hd = el('reader').querySelector('.rhead'), inBot = hd.parentNode.classList.contains('rbot');
  const v = el('viewer').getBoundingClientRect(); goPage(3, false); concealChrome('tap'); viewerTap(v.left + v.width / 2, v.top + v.height * 0.8); const p1 = R.page; viewerTap(v.left + 20, v.top + v.height * 0.8); const p2 = R.page;
  revealChrome(); const top = hd.getBoundingClientRect().top; el('r2OneH').click(); return { inBot, p1, p2, low: top > innerHeight / 2, back: hd.parentNode === el('reader') }; });
ok('8 «Одной рукой»: the top panel moves down; a tap low in the middle turns forward, low left back; off → as before', r.inBot && r.low && r.p1 === 4 && r.p2 === 3 && r.back, r);

// 9 the right edge
r = await p.evaluate(async () => { goPage(1, false); await new Promise(r => setTimeout(r, 50)); const g = el('r2Edge'), b = g.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + 20;
  const ev = (t, yy) => g.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: yy, bubbles: true }));
  ev('pointerdown', y); ev('pointermove', y + 20); ev('pointermove', y + 60); const tip = !el('r2EdgeTip').hidden && /стр\./.test(el('r2EdgeTip').textContent); ev('pointerup', y + 60);
  await new Promise(r => setTimeout(r, 50)); return { vis: !g.hidden, tip, page: R.page, back: !el('jumpBack').classList.contains('hidden') }; });
ok('9 a finger down the right edge turns several pages, with «стр. N»; the way back is offered', r.vis && r.tip && r.page >= 4 && r.back, r);

// 10 voices by role (system voices stubbed)
r = await p.evaluate(async () => {
  const said = []; const sp = window.speechSynthesis; const s0 = sp.speak.bind(sp);
  sp.speak = (u) => { said.push([u.text, rqRx().tts.voice]); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); };
  const V = [{ voiceURI: 'v-a', name: 'A', lang: 'ru-RU' }, { voiceURI: 'v-b', name: 'B', lang: 'ru-RU' }]; const g0 = ttsVoices; ttsVoices = () => V;
  SET.rx.tts.voice = 'v-a'; SET.rm.roles = { on: true, v: '', sv: 'v-b' }; ttsOn = true; let done = false;
  ttsSay('Он сказал:\n— Пошёл вон! — крикнул он. — Ну!\nТишина.', () => { done = true; }, null, null, '');
  await new Promise(r => setTimeout(r, 2500)); /* 07.11 озвучка+: абзацы с паузами */ ttsOn = false; ttsVoices = g0; sp.speak = s0; SET.rm.roles = { on: false, v: '', sv: '' };
  return { done, said };
});
ok('10 «Голоса по ролям»: replies with the heroes\' voice, the author with his own, in order', r.done && r.said.length >= 4 && r.said.some(x => /Пошёл вон/.test(x[0]) && x[1] === 'v-b') && r.said.some(x => /крикнул он/.test(x[0]) && x[1] === 'v-a'), r);

// 11 listen on the go
r = await p.evaluate(async () => { const sp = window.speechSynthesis, s0 = sp.speak.bind(sp); sp.speak = (u) => { setTimeout(() => { u.onstart && u.onstart(); u.onboundary && u.onboundary({ charIndex: 40 }); }, 5); };
  goPage(1, false); ttsOn = true; ttsBtn(true); R.ttsPos = Math.floor(R.page / (R.pageCount - 1) * R.book.text.length); ttsTextNext(); await new Promise(r => setTimeout(r, 100));
  const btn = !el('btnWalk').hidden; el('btnWalk').click(); await new Promise(r => setTimeout(r, 50));
  const a = { btn, open: !el('r2Walk').hidden, s: el('r2WS').textContent, pp: el('r2WPP').getAttribute('aria-label'), ms: navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.title };
  el('r2WPP').click(); a.stopped = !ttsOn; el('r2WX').click(); a.closed = el('r2Walk').hidden; a.btn2 = el('btnWalk').hidden; sp.speak = s0; return a; });
ok('11 «Слушать на ходу»: the footsteps button while listening → big sentence on a dark screen; pause; back to the text', r.btn && r.open && r.s.length > 10 && r.pp === 'Пауза' && r.stopped && r.closed && r.btn2, r);
ok('11 the lock screen knows the book (Media Session)', !('mediaSession' in {}) && (r.ms === undefined || /Хамелеон/.test(r.ms)), r);

// 12 share a preset by code, add it on another phone
r = await p.evaluate(async () => { SET.presets = [{ n: 'Вечер', v: { size: 24, lh: 1.7, warm: 0.3 } }]; saveSet(); openGeneralSettings(true); await new Promise(r => setTimeout(r, 200)); gsPresetsSync();
  const code = r2Code(SET.presets[0]), back = r2Uncode('вот: ' + code + ' — держи'), bad = r2Uncode('RQSET:%%%'), chips = [...document.querySelectorAll('.r2pc')].map(x => x.textContent);
  return { code, back, bad, chips }; });
ok('12 «Поделиться»: a code RQSET:…; the code turns back into the same set; junk → nothing', /^RQSET:/.test(r.code) && r.back && r.back.n === 'Вечер' && r.back.v.size === 24 && r.bad === null && r.chips.join('|').includes('Поделиться') && r.chips.join('|').includes('По коду'), r);
const p2 = await fresh();
r = await p2.evaluate(async (code) => { const a0 = rqAsk; rqAsk = async () => code; await r2AddCode(); await r2AddCode(); rqAsk = a0; return SET.presets.map(x => x.n + ':' + x.v.size); }, r.code);
ok('12 «По коду» on another phone: the set is added (twice → «Вечер 2»)', JSON.stringify(r) === JSON.stringify(['Вечер:24', 'Вечер 2:24']), r);
await p2.close();

// 13 «как было»
await p.evaluate(() => { el('settings') && el('settings').classList.add('hidden'); });
await open(p, 'b1');
r = await p.evaluate(async () => { openReaderSettings('grpText'); await new Promise(r => setTimeout(r, 200)); const b = el('r2Cmp'), vis0 = getComputedStyle(b).display !== 'none';
  el('rmWspPlus').click(); el('rmWspPlus').click(); await new Promise(r => setTimeout(r, 50)); const vis1 = getComputedStyle(b).display !== 'none', now = el('gsPrev').style.wordSpacing;
  b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); const old = el('gsPrev').style.wordSpacing, mark = el('gsPrev').classList.contains('r2old');
  b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); const again = el('gsPrev').style.wordSpacing; el('rmWspMinus').click(); el('rmWspMinus').click(); el('sheet').classList.add('hidden');
  return { vis0, vis1, now, old, mark, again, wsp: SET.wsp }; });
ok('13 «Удерживайте: как было» appears after a change; holding shows the old look, letting go the new', !r.vis0 && r.vis1 && r.now === '2px' && r.old === '' && r.mark && r.again === '2px' && r.wsp === 0, r);

// settings: the new rows and cards
r = await p.evaluate(async () => { openGeneralSettings(true); await new Promise(r => setTimeout(r, 200));
  return { cards: [...document.querySelectorAll('#rxCard .xrow')].length, ch: !!el('rxXrch'), roles: !!el('r2Roles'), walk: /Слушать на ходу/.test(el('rxCard').textContent) }; });
ok('settings: «Когда глава прочитана» card, «Голоса по ролям», «Слушать на ходу»', r.cards === 12 && r.ch && r.roles && r.walk, r);
ok('no page errors', p.errs.length === 0, p.errs);

console.log('\nSUMMARY readmore2.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
