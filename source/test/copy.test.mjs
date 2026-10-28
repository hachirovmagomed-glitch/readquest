// Корректное копирование (28.10, Джессика: «чтобы система более умно сканировала текст… корректно копировать даже вот такие вещи»,
// скан «Старшей Эдды» в две колонки; «там не только в PDF плохо, там все форматы»).
// PDF (fixtures/gen-copy.py): the OCR layer goes across both columns line by line → the copy reads the left column, then the right one,
// verse lines stay lines, stanzas are apart, line and page numbers are not copied, Latin look-alikes inside Russian words are Cyrillic;
// prose: a hyphenated word is glued, a paragraph's lines flow, a new paragraph is a new line. Taps in the gutter stay in their column.
// Books (FB2, EPUB, TXT): one line per paragraph / verse line, no «автор · формат» line, no note marks, no soft hyphens; a TXT stanza
// keeps its lines on the page. The system copy (Ctrl+C / long press) gives the same text as «Копировать».
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_PDF=/workspace/rqtest/pdf/copy-edda.pdf] [RQ_SHOTS=/workspace/out] node copy.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const PDF = process.env.RQ_PDF || '/workspace/rqtest/pdf/copy-edda.pdf';
if (!existsSync(PDF)) execFileSync('python3', [new URL('./fixtures/gen-copy.py', import.meta.url).pathname, PDF.replace(/[^/]*$/, '')]);
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const origin = new URL(BASE).origin;
const ctx = await browser.createBrowserContext(); await ctx.overridePermissions(origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);

// select a range inside the current text layer / #content, then: our text, the system copy's text
const grab = (sel) => p.evaluate(async (sel) => {
  const g = getSelection(); g.removeAllRanges(); const rg = document.createRange();
  const tl = sel.root ? document.querySelector(sel.root) : document.getElementById(sel.pdf ? 'pdfText' : 'content');
  const find = (re, nth) => { const w = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT); let t, k = 0; while ((t = w.nextNode())) { const m = re.exec(t.nodeValue); if (m && k++ === (nth || 0)) return [t, m.index]; } return null; };
  const a = find(new RegExp(sel.from)), b = find(new RegExp(sel.to)); if (!a || !b) return { err: 'not found ' + !!a + !!b };
  rg.setStart(a[0], a[1]); rg.setEnd(b[0], b[1] + (sel.toLen != null ? sel.toLen : new RegExp(sel.to).exec(b[0].nodeValue.slice(b[1]))[0].length)); g.addRange(rg);
  const mine = rqSelPlain(), st = selText(); document.execCommand('copy'); await new Promise(r => setTimeout(r, 150));
  let clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'ERR ' + e.message; }
  return { mine, clip, st, raw: String(g) };
}, sel);

// ---------- PDF: page 1, verse in two columns ----------
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
await (await p.$('#fileInp')).uploadFile(PDF); await sleep(2500);
const bid = await p.evaluate(async () => { const b = allBooks().find(x => x.type === 'pdf'); S.progress[b.id] = { ratio: 0, pos: 0 }; save(); openBook(b.id); await new Promise(r => setTimeout(r, 3500)); return b.id; });
ok('0 PDF open with a text layer', await p.evaluate(() => R.mode === 'pdf' && !!document.querySelector('#pdfText span')));
const V = 'Знаю второе, —\nоно врачеванью\nпользу приносит.\n\nЗнаю и третье, —\nоно защитит\nв битве с врагами,\nклинки их туплю,\n\nЧетвертое знаю, —\nколь свяжут мне члены\nоковами крепкими,\n\nЗнаю восьмое, —\nэто бы всем\nпомнить полезно:\nгде ссора начнется\nсредь воинов смелых,\nмогу помирить их.\n\nЗнаю девятое, —\nесли ладья\nборется с бурей,\n\nЗнаю десятое, —\nесли замечу,\nчто ведьмы взлетели,\n\nОдиннадцатым\nдрузей оберечь\nв битве берусь я,';
let r = await grab({ pdf: 1, from: 'Знаю второе', to: 'берусь я,' });
ok('1 whole page: left column, then right; verse lines; stanzas apart; no line numbers', r.mine === V, r.mine);
ok('1b the system copy gives the same text', r.clip === V, r.clip);
ok('1c no page number, no «147», no Latin look-alikes', !/\d/.test(r.mine) && !/[a-z]/i.test(r.mine), r.mine.match(/[\da-z]/gi));
ok('1d the selection itself runs in reading order (the raw selection holds the left column before the right one)', r.raw.indexOf('начнется') < r.raw.indexOf('средь воинов'), r.raw.slice(0, 80));
r = await grab({ pdf: 1, from: 'помнить', to: 'ладья' });
ok('2 from the left column\'s bottom to the right column: only those lines, in order', r.mine === 'помнить полезно:\nгде ссора начнется\nсредь воинов смелых,\nмогу помирить их.\n\nЗнаю девятое, —\nесли ладья', r.mine);
// a tap in the gutter just right of the left column's longest line stays in the left column
const hit = await p.evaluate(() => { const sp = [...document.querySelectorAll('#pdfText span')].find(s => s.textContent === 'коль свяжут мне члены'); const q = sp.getBoundingClientRect();
  const s2 = [...document.querySelectorAll('#pdfText span')].find(s => s.textContent === 'Знаю десятое, —'); const q2 = s2.getBoundingClientRect();
  const x = (q.right + q2.left) / 2 - 12, el = document.elementFromPoint(x, q.top + q.height / 2); return { x, t: el && el.textContent, nc: [...document.querySelectorAll('#pdfText span.nc')].map(s => s.textContent) }; });
ok('3 a finger in the gutter beside the left column lands on the left column', /свяжут|^ $/.test(hit.t || '') && !/десятое|если|что ведьмы/.test(hit.t || ''), hit);
ok('3b line and page numbers are marked as not copied', ['147', '148', '149', '153', '154', '155', '156', '203'].every(n => hit.nc.includes(n)), hit.nc);
ok('3c the running header on top is not copied either', hit.nc.includes('СТАРШАЯ ЭДДА'), hit.nc);
await p.screenshot({ path: SHOTS + 'copy-pdf-verse.png' });
// a quote keeps the clean text and its place
const qq = await p.evaluate(async () => { const n0 = (S.quotes[R.book.id] || []).length; addQuote(false, 'y'); await new Promise(r => setTimeout(r, 300)); const q = S.quotes[R.book.id][n0]; return q && { t: q.text, pdf: !!q.pdf }; });
ok('4 a PDF quote is saved with the clean text and its place', qq && qq.pdf && qq.t.startsWith('помнить полезно:\nгде ссора') && !/\d/.test(qq.t), qq);
// book search still finds a word and paints it
const bf = await p.evaluate(async () => { const s = bfPdfPageText((await (await R.pdf.getPage(1)).getTextContent()).items, (await R.pdf.getPage(1)).getViewport({ scale: 1 })); return !/ЭДДА/.test(s) && s.indexOf('ведьмы') > s.indexOf('могу помирить') && s.indexOf('могу помирить') > s.indexOf('где ссора'); });
ok('5 book search reads the page in the same order, without the running header', bf);

// ---------- PDF: page 2, prose ----------
await p.evaluate(async () => { pdfGo(1, 'nav'); await new Promise(r => setTimeout(r, 2500)); });
r = await grab({ pdf: 1, from: 'Старшая', to: 'страницы\\.' });
ok('6 prose: a hyphenated word glued, a paragraph flows, a new paragraph on a new line, no page number',
  r.mine === 'Первый абзац текста идёт по всей ширине до самого края переносится на новую строку и спокойно идёт до самого конца и кончается здесь.\nВторой абзац начинается с отступа и тоже идёт до самого конца страницы.', r.mine);
// «Прокрутка»: a selection over the page break
await p.evaluate(async (id) => { await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode: 'scroll' }); rqSaveSetGated(); S.progress[id] = { ratio: 0, pos: 0 }; save(); openBook(id); await new Promise(r => setTimeout(r, 3500)); }, bid);
await p.evaluate(async () => { const s = document.querySelector('#pdfScroll .psl[data-n="1"]'); if (s) s.scrollIntoView({ block: 'start' }); el('pdfScroll').scrollTop -= 150; await new Promise(r => setTimeout(r, 1500)); });
r = await grab({ root: '#pdfScroll', from: 'что ведьмы', to: 'Первый абзац' });
ok('7 «Прокрутка»: over the page break — the end of page 1, then the start of page 2, no page numbers', r.mine === 'что ведьмы взлетели,\n\nОдиннадцатым\nдрузей оберечь\nв битве берусь я,\nПервый абзац', r.mine);
await p.evaluate(async () => { await closeReader({ quiet: true }); SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); }); await sleep(600);
await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); });

// ---------- books ----------
async function imp(buf, name) {
  return p.evaluate(async (b64, name) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), n0 = S.userBooks.length; await importBookFiles([new File([bin], name)]); await new Promise(r => setTimeout(r, 300)); return S.userBooks.length > n0 ? S.userBooks[S.userBooks.length - 1].id : null; }, Buffer.from(buf).toString('base64'), name);
}
async function open(id, ms = 2500) { await p.evaluate(async (id, ms) => { __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, ms)); }, id, ms); }
async function close() { await p.evaluate(() => { closeReader(); }); await sleep(900); await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); }); await sleep(200); }
const fb2 = `<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><author><first-name>Иван</first-name><last-name>Проверкин</last-name></author><book-title>Копия ФБ</book-title><lang>ru</lang></title-info></description>
<body><section><title><p>Глава первая</p></title><p>Обычный абзац прозы<a l:href="#n1" type="note">[1]</a> — при&#173;вет, мир.</p>
<poem><stanza><v>Строка стиха первая,</v><v>Строка стиха вторая.</v></stanza></poem><p>Последний абзац.</p></section></body><body name="notes"><section id="n1"><p>Сноска.</p></section></body></FictionBook>`;
let id = await imp(Buffer.from(fb2), 'Копия ФБ.fb2'); await open(id, 3000);
r = await grab({ from: 'Копия ФБ', to: 'Последний абзац\\.' });
ok('8 FB2: title, chapter apart, prose without the note mark and the soft hyphen, verse lines one per line, no «автор · FB2»',
  r.mine === 'Копия ФБ\n\nГлава первая\n\nОбычный абзац прозы — привет, мир.\nСтрока стиха первая,\nСтрока стиха вторая.\nПоследний абзац.', r.mine);
ok('8b the system copy is the same', r.clip === r.mine, r.clip);
r = await grab({ from: 'Строка стиха первая', to: 'вторая\\.' });
ok('8c a quote in the text still marks the words (selText is the page\'s text)', r.st === r.raw.trim(), { st: r.st, raw: r.raw });
await close();
const txt = 'Глава 1\n\nАбзац номер 1 длинный, чтобы занять пару строк на телефоне и не слиться с соседним.\nОн переносится строкой файла, но это один абзац, и строк тут длинные.\n\n   Стих раз,\n   стих два,\n   стих три.\n\nКонец.';
id = await imp(Buffer.from(txt), 'Копия тхт.txt'); await open(id);
r = await grab({ from: 'Абзац номер 1', to: 'Конец\\.' });
ok('9 TXT: a hard-wrapped paragraph flows, a stanza keeps its lines', r.mine === 'Абзац номер 1 длинный, чтобы занять пару строк на телефоне и не слиться с соседним. Он переносится строкой файла, но это один абзац, и строк тут длинные.\nСтих раз,\nстих два,\nстих три.\nКонец.', r.mine);
const vs = await p.evaluate(() => { const v = el('content').querySelector('p.rq-vs'); if (!v) return null; const rg = document.createRange(); rg.selectNodeContents(v); return rg.getClientRects().length >= 3 || v.getBoundingClientRect().height > parseFloat(getComputedStyle(v).lineHeight) * 2.5; });
ok('9b the TXT stanza shows its lines on the page', vs === true, vs);
await p.screenshot({ path: SHOTS + 'copy-txt.png' });
await close();
const epubB64 = await p.evaluate(async () => {
  await loadJSZip(); const z = new window.JSZip(); z.file('mimetype', 'application/epub+zip');
  z.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  z.file('OEBPS/c.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Копия ЕПАБ</dc:title><dc:creator>Пётр</dc:creator><dc:language>ru</dc:language></metadata><manifest><item id="a" href="t/one.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>');
  z.file('OEBPS/t/one.xhtml', '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Часть первая</h1><p>Начало текста<a href="#n1"><sup>1</sup></a> и даль&#173;ше.</p><p class="v">Стих один,<br/>стих два.</p><p>Конец части.</p></body></html>');
  return await z.generateAsync({ type: 'base64' });
});
id = await imp(Buffer.from(epubB64, 'base64'), 'Копия ЕПАБ.epub'); await open(id, 3000);
r = await grab({ from: 'Часть первая', to: 'Конец части\\.' });
ok('10 EPUB: heading apart, no note digit, no soft hyphen, verse lines one per line', r.mine === 'Часть первая\n\nНачало текста и дальше.\nСтих один,\nстих два.\nКонец части.', r.mine);
await close();

ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\n${n}/${checks.length} copy`); process.exit(n === checks.length ? 0 : 1);
