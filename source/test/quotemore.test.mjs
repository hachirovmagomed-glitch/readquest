// Цитаты, вторая волна (Джессика 28.10: «давай реализуем все, кроме пятого»): поиск, фильтр по цвету, порядок, экспорт TXT/MD,
// карточка-картинка в оформлении скина, цитата дня на главной, «Объясни» / «Обсудить» из списка, «В дневник» (вместе с «Дневниками»).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node quotemore.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [], dialogs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => { dialogs.push(d.type()); d.dismiss(); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
const id = await p.evaluate(async () => { const t = allBooks().find(x => x.type !== 'pdf'); allBooks().forEach(b => { S.quotes[b.id] = []; S.hl[b.id] = []; }); S.progress[t.id] = { ratio: 0, pos: 0 }; save();
  __navAllow = true; openBook(t.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); return t.id; });
const tap = async (sel) => { await p.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(300); };
const quoteHere = async (c, note) => { const t = await p.evaluate(() => {
  for (let y = 160; y < innerHeight - 280; y += 24) { const cr = document.caretRangeFromPoint(60, y); if (!cr || cr.startContainer.nodeType !== 3) continue; const x = cr.startContainer, o = cr.startOffset;
    if (!x.parentElement.closest('#content p') || x.parentElement.closest('mark') || x.length < o + 30) continue; const q = document.createRange(); q.setStart(x, o); q.setEnd(x, o + 28); const r = q.getBoundingClientRect();
    if (r.top > 100 && r.bottom < innerHeight - 260 && r.right <= innerWidth && r.height < 40) { const g = getSelection(); g.removeAllRanges(); g.addRange(q); updSelPop(); return String(g).trim(); } } return null; });
  await sleep(300); await tap('#spColors button[data-c="' + c + '"]'); return t; };
// three quotes: p.1 green (+ note «мысль»), p.4 blue, p.7 green; dates: old, new, middle
const words = [];
for (const [pg, c] of [[0, 'g'], [3, 'b'], [6, 'g']]) { await p.evaluate((pg) => jumpTo(pg), pg); await sleep(500); words.push(await quoteHere(c)); }
await p.evaluate((id) => { const qs = S.quotes[id]; qs[0].date = '2026-10-01'; qs[0].note = 'Главная мысль'; qs[1].date = '2026-10-27'; qs[2].date = '2026-10-15'; save(); }, id);
const openList = async () => { await p.evaluate(() => { el('panel').classList.remove('hidden'); renderPanel('qts'); }); await sleep(300); };
const rows = () => p.evaluate(() => [...document.querySelectorAll('#pqList .pq .ptt')].map(x => x.textContent.replace(/стр\. \d+$/, '')));
const q = (i) => '«' + words[i] + '»';
await openList();
const tools = await p.evaluate(() => ({ find: !!document.querySelector('[data-pq-find]'), sort: (document.querySelector('[data-pq-sort]') || {}).textContent, exp: !!document.querySelector('[data-pq-exp]'), chips: [...document.querySelectorAll('.qlchips .qlc')].map(b => b.textContent) }));
ok('1 the list has a search field, the order button («По книге»), export and colour chips (Все 3? no: Все, green 2, blue 1)', tools.find && tools.sort === 'По книге' && tools.exp && tools.chips.join() === 'Все,2,1', tools);
await p.screenshot({ path: SHOTS + 'qmore-tools.png' });

// 2. search: by the words and by the note, ё = е, focus stays in the field
await p.focus('[data-pq-find]'); await p.keyboard.type(words[1].split(' ').slice(-2).join(' ')); await sleep(300);
const s1 = await rows(), foc = await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-pq-find'));
await p.evaluate(() => { const i = document.querySelector('[data-pq-find]'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); await p.keyboard.type('главная'); await sleep(300); const s2 = await rows();
await p.evaluate(() => { const i = document.querySelector('[data-pq-find]'); i.value = 'нет такого слова'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
const s3 = await p.evaluate(() => document.querySelector('#pqList').textContent);
await p.evaluate(() => { const i = document.querySelector('[data-pq-find]'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
ok('2 search finds by the words and by the note; the field keeps focus; nothing → «Ничего не нашлось»', s1.length === 1 && s1[0] === q(1) && foc && s2.length === 1 && s2[0] === q(0) && /Ничего не нашлось/.test(s3), { s1, s2, s3, foc });

// 3. colour filter
await tap('.qlchips .qlc:nth-child(3)'); const f1 = await rows(); await tap('.qlchips .qlc:nth-child(2)'); const f2 = await rows(); await tap('.qlchips .qlc:nth-child(1)'); const f3 = await rows();
ok('3 colour chips: blue → the blue quote, green → the two green ones, «Все» → all three', f1.join('|') === q(1) && f2.join('|') === [q(0), q(2)].join('|') && f3.length === 3, { f1, f2, f3 });

// 4. order: by book → newest → oldest → by book (kept in SET.qSort)
await tap('[data-pq-sort]'); const o1 = await rows(), l1 = await p.evaluate(() => document.querySelector('[data-pq-sort]').textContent);
await tap('[data-pq-sort]'); const o2 = await rows(); await tap('[data-pq-sort]'); const o3 = await rows(); const ss = await p.evaluate(() => SET.qSort);
ok('4 order: «Сначала новые» (27.10, 15.10, 01.10), «Сначала старые», back to «По книге»', l1 === 'Сначала новые' && o1.join('|') === [q(1), q(2), q(0)].join('|') && o2.join('|') === [q(0), q(2), q(1)].join('|') && o3.join('|') === [q(0), q(1), q(2)].join('|') && ss === 'book', { l1, o1, o2, o3, ss });

// 5. export: the sheet; TXT and MD texts
await tap('[data-pq-exp]'); const ex = await p.evaluate(() => ({ shown: !el('qSheet').hidden, h: el('qSheet').querySelector('h3').textContent, p: el('qSheet').querySelector('p').textContent, fmt: [...el('qSheet').querySelectorAll('.qfmt button')].map(b => b.textContent.trim()) }));
await p.screenshot({ path: SHOTS + 'qmore-export.png' });
const txt = await p.evaluate((id) => qExportText([id], S.quotes[id], false), id), md = await p.evaluate((id) => qExportText([id], S.quotes[id], true), id);
let saved = null; await p.evaluate(() => { window.__qs = null; window.qSave = (b, n) => { window.__qs = n; }; }); await tap('#qSheet [data-x="save"]'); saved = await p.evaluate(() => window.__qs);
writeFileSync(SHOTS + 'qmore-export.txt', txt); writeFileSync(SHOTS + 'qmore-export.md', md);
ok('5 export: sheet «Экспорт цитат», 3 цитаты, TXT / Markdown; the text has «quote», «— стр. N · date», the note; MD has > quote, *author*', ex.shown && /3 цитаты/.test(ex.p) && ex.fmt.length === 2 &&
  txt.includes(q(0)) && /— стр\. 1 · /.test(txt) && txt.includes('Заметка: Главная мысль') && md.includes('> ' + words[1]) && /^# /.test(md) && /\.txt$/.test(saved || ''), { ex, saved, txt: txt.slice(0, 300), md: md.slice(0, 300) });

// 6. «Объясни» / «Обсудить» on an opened quote (with a key)
await p.evaluate(() => { S.ai = Object.assign({}, S.ai || {}, { key: 'sk-test' }); window.__ai = null; window.aiViaKey = async (m) => { window.__ai = m; return 'Это объяснение.'; }; }); await openList();
await p.evaluate(() => quoteToggle(0)); await sleep(200);
const acts = await p.evaluate(() => [...document.querySelectorAll('#pqList .pq.on .pqacts button')].map(b => b.textContent.trim()));
await p.screenshot({ path: SHOTS + 'qmore-actions.png' });
await tap('#pqList .pq.on .pqa:nth-child(3)'); await sleep(400);
const ai = await p.evaluate(() => ({ sheet: !el('aiSheet').classList.contains('hidden'), ans: (el('aiBody').textContent || ''), user: window.__ai && window.__ai.user }));
await p.evaluate(() => el('aiSheet').classList.add('hidden')); await openList(); await p.evaluate(() => quoteToggle(1)); await sleep(200);
await tap('#pqList .pq.on .pqa:nth-child(4)'); await sleep(300);
const ch = await p.evaluate(() => ({ open: !el('aiChat').classList.contains('hidden'), v: el('aiChatIn').value }));
await p.screenshot({ path: SHOTS + 'qmore-discuss.png' });
await p.evaluate(() => el('aiChat').classList.add('hidden'));
ok('6 opened quote: «Открыть в книге», «Карточка», «Объясни», «Обсудить» (no «В дневник» without diaries); «Объясни» explains the quote; «Обсудить» opens the chat with the quote typed', acts.join('|') === 'Открыть в книге|Карточка|Объясни|Обсудить' && ai.sheet && /Это объяснение/.test(ai.ans) && ai.user.includes(words[0]) && ch.open && ch.v.includes(words[1]), { acts, ai, ch });

// 7. «В дневник» appears with diaries (stubbed js/diary.js API) and writes an entry with the quote
const dy = await p.evaluate(async (id) => { const ys = []; window.diaryOf = (b) => ys.find(y => y.b === b) || null; window.diaryNew = (o) => { const y = { b: o.b, e: [] }; ys.push(y); return y; };
  window.dyNewEntry = (y, t, at) => { const n = { x: '', at }; y.e.push(n); return n; }; window.dyTouch = () => {};
  el('panel').classList.remove('hidden'); renderPanel('qts'); quoteToggle(2); await new Promise(r => setTimeout(r, 200));
  const b = [...document.querySelectorAll('#pqList .pq.on .pqa')].find(x => /В дневник/.test(x.textContent)); if (!b) return { btn: false }; b.click(); await new Promise(r => setTimeout(r, 300));
  el('rqAskIn').value = 'моя мысль'; el('rqAskOk').click(); await new Promise(r => setTimeout(r, 300)); return { btn: true, ys: JSON.parse(JSON.stringify(ys)) }; }, id);
ok('7 with «Дневники»: «В дневник» writes an entry «> quote» + the thought, tied to the page', dy.btn && dy.ys.length === 1 && dy.ys[0].e[0].x === '> ' + words[2] + '\n\nмоя мысль' && dy.ys[0].e[0].at && dy.ys[0].e[0].at.pg === 7, dy);
await p.evaluate(() => { delete window.diaryOf; delete window.diaryNew; delete window.dyNewEntry; delete window.dyTouch; });

// 8. card: a PNG 1080×1350 in every skin, day and night
const looks = {};
for (const k of ['sepia', 'pencil', 'ellada', 'babochkovyi', 'celestial', 'pencil-night', 'ellada-night', 'babochkovyi-night', 'celestial-night']) {
  const r = await p.evaluate(async (k, id) => { const base = k.replace(/-night$/, '');
    if (['pencil', 'ellada', 'babochkovyi', 'celestial'].includes(base)) { S.gold = 9000; save(); try { buy('skin-' + base); } catch (e) {} }
    if (!THEMES[k] && !SKIN_THEMES[k] && k !== 'pencil' && k !== 'pencil-night') return null;
    SET.theme = k; saveSet(); applySet(); await new Promise(r => setTimeout(r, 200));
    const b = allBooks().find(x => x.id === id), blob = await qCardBlob(b, S.quotes[id][0], 'стр. 1'); const u = URL.createObjectURL(blob); const im = new Image(); im.src = u; await im.decode();
    const c = document.createElement('canvas'); c.width = 60; c.height = 75; c.getContext('2d').drawImage(im, 0, 0, 60, 75); const d = c.getContext('2d').getImageData(0, 0, 60, 75).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
    const fr = new FileReader(); const b64 = await new Promise(res => { fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    return { w: im.naturalWidth, h: im.naturalHeight, size: blob.size, hash: h, b64 }; }, k, id);
  if (!r) continue; looks[k] = r.w + 'x' + r.h + ':' + r.hash;
  writeFileSync(SHOTS + 'qcard-' + k + '.png', Buffer.from(r.b64.split(',')[1], 'base64'));
}
ok('8 card: 1080×1350 PNG, different in every skin and in day / night', Object.keys(looks).length >= 9 && Object.values(looks).every(v => v.startsWith('1080x1350')) && new Set(Object.values(looks)).size === Object.keys(looks).length, looks);
await p.evaluate(() => { SET.theme = 'celestial'; saveSet(); applySet(); });
await p.evaluate(() => { el('panel').classList.remove('hidden'); renderPanel('qts'); }); await sleep(200); await p.evaluate(() => quoteToggle(0)); await sleep(200);
await tap('#pqList .pq.on .pqa:nth-child(2)'); await sleep(2500);
const cs = await p.evaluate(() => ({ img: !!el('qSheet').querySelector('.qcprev img'), dis: [...el('qSheet').querySelectorAll('[data-x]')].map(b => b.disabled).join() }));
await p.screenshot({ path: SHOTS + 'qmore-card-sheet.png' });
ok('8b «Карточка» shows the picture with «Сохранить» / «Поделиться»', cs.img && cs.dis === 'false,false', cs);
await p.evaluate(() => qSheetClose());

// 9. quote of the day on the library; ✕ hides it until tomorrow; a tap opens the book at it
await p.evaluate(async () => { el('panel').classList.add('hidden'); await closeReader({ quiet: true }); S.qdayOff = null; save(); __navAllow = true; show('library'); renderLibrary(); __navAllow = false; }); await sleep(600);
const qd = await p.evaluate(() => { const c = el('qdayCard'); return { t: c.textContent, vis: !!c.querySelector('.qday') && c.querySelector('.qday').offsetHeight > 40 }; });
await p.screenshot({ path: SHOTS + 'qmore-qday.png' });
const qdi = await p.evaluate(() => +el('qdayCard').dataset.i);
await tap('#qdayCard [data-qday="go"]'); await sleep(3000);
const at = await p.evaluate((id) => ({ open: !!R.book && R.book.id === id, page: R.page, want: quotePage(R.book, S.quotes[id][+el('qdayCard').dataset.i]) }), id);
ok('9 «Цитата дня» on the library (one of the quotes + the book); a tap opens the book at its page', qd.vis && /Цитата дня/.test(qd.t) && words.some(w => qd.t.includes(w)) && at.open && at.page === at.want, { qd, at, qdi });
await p.evaluate(async () => { await closeReader({ quiet: true }); __navAllow = true; show('library'); renderLibrary(); __navAllow = false; }); await sleep(400);
await tap('#qdayCard [data-qday="off"]'); const off = await p.evaluate(() => ({ html: el('qdayCard').innerHTML, s: S.qdayOff, t: today() }));
ok('9b ✕ hides it until tomorrow (S.qdayOff = today)', off.html === '' && off.s === off.t, off);

// 10. «Цитаты и заметки»: search / chips / order / export; card and «объясни» on every quote; delete asks
await p.evaluate(() => { __navAllow = true; openProgress('quotes'); __navAllow = false; }); await sleep(400);
const inv = await p.evaluate(() => ({ find: !!document.querySelector('[data-qa-find]'), chips: document.querySelectorAll('#qaTools .qlc').length, cards: document.querySelectorAll('#quoteBox .qcard').length, acts: [...document.querySelectorAll('#quoteBox .qcard:first-of-type .qmeta button')].map(b => b.textContent.trim()) }));
await p.focus('[data-qa-find]'); await p.keyboard.type('главная'); await sleep(300);
const inv2 = await p.evaluate(() => ({ n: document.querySelectorAll('#quoteBox .qcard').length, foc: document.activeElement && document.activeElement.hasAttribute('data-qa-find') }));
await p.screenshot({ path: SHOTS + 'qmore-inventory.png' });
await p.evaluate(() => { const i = document.querySelector('[data-qa-find]'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
await tap('#quoteBox [data-qact="del"]'); const ask = await p.evaluate(() => !el('rqAsk').hidden && el('rqAskT').textContent); await tap('#rqAskNo');
ok('10 «Цитаты и заметки»: search + colours + order + export, every quote has карточка / объясни / копировать / удалить; search keeps focus; «удалить» asks', inv.find && inv.chips === 3 && inv.cards === 3 && inv.acts.join('|') === 'карточка|объясни|копировать|удалить' && inv2.n === 1 && inv2.foc && ask === 'Удалить цитату?', { inv, inv2, ask });
ok('no page errors, no system dialogs', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
