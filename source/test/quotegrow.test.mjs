// 06.11 (Джессика, скрин: PDF, «Прокрутка», нажата сохранённая цитата): «уже выделил текст один раз, но мне хочется выделить его ещё раз …
// больше пространства выделить. Не появляется ползунок для выделения». A tap on a saved quote shows its handles at both ends (with its bar);
// pulling one turns the quote into a selection whose border follows the finger; a colour saves it in place of the old quote (one quote,
// longer text, the same note). Text book (pages and «Прокрутка») and PDF («Прокрутка» and «Страницы»).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_PDF=/workspace/rqtest/pdf/b-nolabels-40.pdf] node quotegrow.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const SHOTS = process.env.SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const cdp = await p.target().createCDPSession();
const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (x, y) => { await T('touchStart', x, y); await sleep(60); await T('touchEnd'); await sleep(500); };
const qs = () => p.evaluate(() => (S.quotes[R.book.id] || []).map(q => ({ t: q.text, note: q.note || '', c: q.c, pdf: !!q.pdf })));
const handles = () => p.evaluate(() => { const g = (id) => { const e = el(id); return e && !e.hidden ? { x: parseFloat(e.style.left), y: parseFloat(e.style.top) } : null; }; return { lo: g('smLo'), hi: g('smHi'), bar: !el('selpop').classList.contains('hidden') && el('selpop').classList.contains('qmode') }; });

async function round(name, open, sel, where) {
  await open();
  // a quote of a few words (made as by the colour button), with a note
  const made = await p.evaluate(sel);
  await sleep(300);
  await p.evaluate(() => { addQuote(false, 'g'); const q = S.quotes[R.book.id].slice(-1)[0]; q.note = 'моя заметка'; save(); });
  await sleep(600);
  const q0 = await qs();
  ok(name + ': the quote is saved', q0.length === 1 && q0[0].t.length > 3, { made, q0 });
  // tap it
  const at = await p.evaluate(where);
  await tap(at.x, at.y);
  const h = await handles();
  ok(name + ': a tap on the quote shows its bar and handles at both ends', h.bar && h.lo && h.hi, { at, h });
  if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name.replace(/\W+/g, '-') + '-1.png' });
  if (!h.hi) return;
  // pull the end handle down three lines
  const x = h.hi.x, y = h.hi.y + 24;
  await T('touchStart', x, y); for (let i = 1; i <= 12; i++) { await T('touchMove', x, y + i * 6); await sleep(16); } await T('touchEnd'); await sleep(500);
  const s1 = await p.evaluate(() => ({ len: String(getSelection()).trim().length, on: SM.on, qed: !!QED }));
  ok(name + ': pulled, the quote is a selection that grew with the finger', s1.on && s1.qed && s1.len > q0[0].t.length + 20, { q0: q0[0].t.length, s1 });
  if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name.replace(/\W+/g, '-') + '-2.png' });
  await p.evaluate(() => addQuote(false, 'o')); await sleep(700);
  const q1 = await qs();
  ok(name + ': a colour saves it in place of the old one — one quote, longer, the same note, the new colour', q1.length === 1 && q1[0].t.length > q0[0].t.length + 20 && q1[0].t.startsWith(q0[0].t.slice(0, 5)) && q1[0].note === 'моя заметка' && q1[0].c === 'o', q1);
  // tap elsewhere → the bar closes, handles go
  await p.evaluate(() => { selDone(); quoteClose(); });
  await sleep(300);
}

// text book, pages
const openText = (mode) => async () => { await p.evaluate(async (mode) => {
  if (R.book) await closeReader({ quiet: true });
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  S.quotes[bk.id] = []; S.hl[bk.id] = []; save();
  SET.flip = Object.assign({}, SET.flip || {}, { mode, anim: 'none' }); saveSet(); applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); goPage(2, false); await new Promise(r => setTimeout(r, 500)); }, mode); };
const selText = () => { const v = el('viewer').getBoundingClientRect(); const a = smPt(v.left + 40, v.top + 150), w = smWord(a); let z = w[1]; const t = z[0].nodeValue; let k = z[1], n = 0; while (k < t.length && n < 3) { k++; if (/\s/.test(t[k] || '')) n++; } getSelection().setBaseAndExtent(w[0][0], w[0][1], z[0], Math.min(t.length, k)); return String(getSelection()); };
const markAt = () => { const m = document.querySelector('#content mark'); const r = m.getClientRects()[0]; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
await round('text, pages', openText('page'), selText, markAt);
await round('text, scroll', openText('scroll'), selText, markAt);

// PDF
const openPdf = (mode) => async () => {
  await p.evaluate(async (mode) => { if (R.book) await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode }); rqSaveSetGated(); }, mode);
  if (!(await p.evaluate(() => allBooks().some(x => x.type === 'pdf')))) { await (await p.$('#fileInp')).uploadFile(PDF); await sleep(2500); }
  await p.evaluate(async () => { if (R.book) await closeReader({ quiet: true }); const b = allBooks().find(x => x.type === 'pdf'); S.quotes[b.id] = []; S.hl[b.id] = []; S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3500)); });
};
const selPdf = () => { const ss = [...document.querySelectorAll(R.mode === 'pdf' && PS.on ? '#pdfScroll .textLayer span' : '#pdfText span')].filter(s => s.textContent.trim().length > 10 && s.getBoundingClientRect().top > 150 && s.getBoundingClientRect().top < 400); const t = ss[0].firstChild; getSelection().setBaseAndExtent(t, 0, t, Math.min(t.length, 14)); return String(getSelection()); };
const boxAt = () => { const b = document.querySelector('.pdfhls i[data-q]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
await round('PDF, scroll', openPdf('scroll'), selPdf, boxAt);
await round('PDF, pages', openPdf('page'), selPdf, boxAt);

// leaving the re-bordering without a colour puts the old quote back
await p.evaluate(() => { const q = S.quotes[R.book.id][0]; return q; });
const b9 = await p.evaluate(boxAt); await tap(b9.x, b9.y);
const h9 = await handles();
if (h9.hi) { await T('touchStart', h9.hi.x, h9.hi.y + 24); for (let i = 1; i <= 6; i++) { await T('touchMove', h9.hi.x, h9.hi.y + 24 + i * 6); await sleep(16); } await T('touchEnd'); await sleep(400); }
await p.evaluate(() => selDone()); await sleep(500);
const q9 = await p.evaluate(() => ({ n: S.quotes[R.book.id].length, boxes: document.querySelectorAll('.pdfhls i[data-q]').length, qed: !!QED }));
ok('PDF: pulled, then «Снять» — the old quote is still there with its boxes', q9.n === 1 && q9.boxes > 0 && !q9.qed, q9);

ok('no page errors', errs.length === 0, errs);
console.log(checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
