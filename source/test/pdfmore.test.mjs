// 05.11 сканы и PDF (Джессика: «первое, третье, пятое»; js/pdf-more.js).
// note: a small raised «1» after a word is a note mark (span.pnote, not copied); a tap on it shows the note from the foot of the page
//       in the note window; a copy over it has no «1»;
// text (copy: no ¹): «Читать текстом» → the PDF opens as a book (R.mode text): a paragraph carried over the page break is one paragraph, no running
//       header and no page numbers, the PDF bookmarks are the chapters, verse keeps its lines; the note mark [1] in the text opens the
//       note too; the way back «Как в файле» opens the PDF on the same page; the choice stays after reopening the book;
//       a scan with no text → «сначала распознайте», the window «Текст страницы» opens, the book stays a PDF;
// orth: «Современная орфография при копировании» → a copy of pre-1918 text is modern; off → as printed; a modern text never changes.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/dir] node pdfmore.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '';
const here = path.dirname(new URL(import.meta.url).pathname);
const PDF = '/workspace/rqtest/pdf/pdfmore.pdf', SCAN = '/workspace/rqtest/pdf/copy-scan.pdf';
if (!fs.existsSync(PDF)) execFileSync('python3', [path.join(here, 'fixtures/gen-pdfmore.py'), '/workspace/rqtest/pdf/']);
if (!fs.existsSync(SCAN)) execFileSync('python3', [path.join(here, 'fixtures/gen-copy.py'), '/workspace/rqtest/pdf/']);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); await ctx.overridePermissions(new URL(BASE).origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
async function addPdf(file) { const n0 = await p.evaluate(() => allBooks().filter(b => b.type === 'pdf').length); await (await p.$('#fileInp')).uploadFile(file); await p.waitForFunction((n0) => allBooks().filter(b => b.type === 'pdf').length > n0, { timeout: 10000 }, n0); return p.evaluate(() => { const a = allBooks().filter(b => b.type === 'pdf'); return a[a.length - 1].id; }); }
async function open(id, keep) { await p.evaluate(async (id, keep) => { if (!keep) { S.progress[id] = { ratio: 0, pos: 0 }; save(); } __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 3500)); }, id, keep); }
async function close() { await p.evaluate(async () => { await closeReader({ quiet: true }); }); await sleep(600); await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); }); }
const selAll = (root, from, to) => p.evaluate((root, from, to) => {
  const tl = document.querySelector(root), w = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT); let t, a = null, b = null;
  while ((t = w.nextNode())) { if (!a && t.nodeValue.indexOf(from) >= 0) a = [t, t.nodeValue.indexOf(from)]; if (t.nodeValue.indexOf(to) >= 0) b = [t, t.nodeValue.indexOf(to) + to.length]; }
  if (!a || !b) return { err: 'not found ' + !!a + !!b }; const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(a[0], a[1]); rg.setEnd(b[0], b[1]); g.addRange(rg);
  const s = rqSelPlain(); g.removeAllRanges(); return { s }; }, root, from, to);

const id = await addPdf(PDF); await open(id);

// note
const nt = await p.evaluate(() => { const s = document.querySelector('#pdfText span.pnote'); if (!s) return null; const r = s.getBoundingClientRect(); return { k: s.dataset.fn, x: r.left + r.width / 2, y: r.top + r.height / 2, nc: s.classList.contains('nc') }; });
ok('note: the raised «1» after «маяк» is a note mark, not copied', nt && nt.k === '1' && nt.nc, nt);
let r = await selAll('#pdfText', 'Однажды', 'на скале.');
ok('note: a copy over the mark has no «1»', r.s === 'Однажды он увидел маяк на скале.', r);
await p.evaluate((x, y) => pdfTap(x, y), nt.x, nt.y); await sleep(800);
let note = await p.evaluate(() => { const d = el('rmNote'); return d && !d.hidden ? d.innerText : null; });
ok('note: a tap on it shows the note from the foot of the page', !!note && /Маяк стоял на этой скале двести лет\./.test(note), note);
if (SHOTS) await p.screenshot({ path: SHOTS + '/pdfmore-note.png' });
await p.evaluate(() => rmFnHide()); await sleep(300);

// text
await p.evaluate(async () => { pdfGo(1, 'nav'); await new Promise(r => setTimeout(r, 1500)); });
await p.evaluate(() => { openReaderSettings(); }); await sleep(500);
const row = await p.evaluate(() => { const b = el('ptxtTgl'), r = b.getBoundingClientRect(); return { vis: r.width > 0 && r.height > 0, on: b.getAttribute('aria-checked') }; });
ok('text: «Читать текстом» is in «Настройки чтения» of a PDF, off', row.vis && row.on === 'false', row);
await p.evaluate(() => el('ptxtTgl').click());
await p.waitForFunction(() => R && R.book && R.mode === 'text' && R.book.type === 'ptxt' && /кончается/.test(el('content').textContent), { timeout: 20000 });
await sleep(800);
const tx = await p.evaluate(() => ({ t: R.book.text, toc: tocOf(R.book).map(x => x.t), pdf: !el('pdfWrap').classList.contains('hidden'), asText: allBooks().find(b => b.id === R.book.id).asText, page: R.page, pc: R.pageCount,
  shown: el('content').textContent.indexOf('следующую страницу') }));
ok('text: the PDF is open as a book (text mode, no PDF canvas), the book remembers it', !tx.pdf && tx.asText === true, { pdf: tx.pdf, asText: tx.asText });
ok('text: a paragraph over the page break is one paragraph, no running header, no page numbers', tx.t.indexOf('переходит на следующую страницу и кончается.') > 0 && !/СТАРАЯ КНИГА/.test(tx.t) && !/(^|\n)[567](\n|$)/.test(tx.t), tx.t.slice(0, 400));
ok('text: verse keeps its lines; the bookmarks are the chapters', /Волна идёт,\nмаяк горит,\nстарик не спит\./.test(tx.t) && tx.toc.join('|') === 'Глава первая|Глава вторая', { toc: tx.toc });
ok('text: the note mark is ¹ after its word, the note starts with «1 », after the paragraph the page break cut', /маяк¹ на скале/.test(tx.t) && tx.t.indexOf('кончается.\n\n1 Маяк') > 0 && /(^|\n)1 Маяк стоял/.test(tx.t), tx.t.match(/маяк.{0,12}/));
if (SHOTS) await p.screenshot({ path: SHOTS + '/pdfmore-text.png' });
await p.evaluate(async () => { goPage(0, false); await new Promise(r => setTimeout(r, 400)); });
const mk = await p.evaluate(() => { const w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { const i = t.nodeValue.indexOf('¹'); if (i >= 0) { const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + 1); const q = rg.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; } } return null; });
if (mk) { await p.evaluate((x, y) => viewerTap(x, y), mk.x, mk.y); await sleep(600); }
note = await p.evaluate(() => { const d = el('rmNote'); return d && !d.hidden ? d.innerText : null; });
ok('text: a tap on ¹ in the text shows the note', !!note && /Маяк стоял/.test(note), { mk, note });
await p.evaluate(() => rmFnHide());
r = await selAll('#content', 'Однажды', 'на скале.');
ok('text: a copy in text mode has no ¹', r.s === 'Однажды он увидел маяк на скале.', r);
await close(); await open(id, true);
ok('text: reopening the book opens it as text again', await p.evaluate(() => R.mode === 'text' && R.book.type === 'ptxt'));
await p.evaluate(() => { const s = R.book.ptxt; const at = s.off[1] / s.t.length; goPage(Math.round(at * (R.pageCount - 1)), false); }); await sleep(300);
await p.evaluate(() => { openReaderSettings(); }); await sleep(400);
const on = await p.evaluate(() => el('ptxtTgl').getAttribute('aria-checked'));
await p.evaluate(() => el('ptxtTgl').click());
await p.waitForFunction(() => R && R.book && R.mode === 'pdf' && R.pdf && P.shown >= 0, { timeout: 20000 }); await sleep(600);
const back = await p.evaluate(() => ({ pg: P.shown, asText: allBooks().find(b => b.id === R.book.id).asText }));
ok('text: the switch is on in text mode; off → the PDF again, on about the same page, remembered', on === 'true' && back.asText === false && back.pg >= 0 && back.pg <= 1, { on, back });
await close();

// a scan with no text
const sc = await addPdf(SCAN); await open(sc);
await p.evaluate(() => { openReaderSettings(); }); await sleep(400);
await p.evaluate(() => el('ptxtTgl').click()); await sleep(2500);
const scr = await p.evaluate(() => ({ mode: R.mode, ocr: !el('ocrSheet').classList.contains('hidden'), asText: !!allBooks().find(b => b.id === R.book.id).asText }));
ok('text: a scan without text → the window «Текст страницы» to recognise it, the book stays a PDF', scr.mode === 'pdf' && scr.ocr && !scr.asText, scr);
await p.evaluate(() => el('ocrSheetClose').click()); await close();

// orth
await open(id); await p.evaluate(async () => { pdfGo(1, 'nav'); await new Promise(r => setTimeout(r, 1500)); });
r = await selAll('#pdfText', 'Въ домѣ', 'добрымъ.');
ok('orth: off → the copy is as printed', /Въ домѣ новаго капитана было тихо, и міръ казался добрымъ\./.test(r.s), r);
await p.evaluate(() => { openReaderSettings(); }); await sleep(300);
const orow = await p.evaluate(() => { const b = el('orthTgl'), q = b.getBoundingClientRect(); return q.width > 0; });
await p.evaluate(() => el('orthTgl').click()); await sleep(200);
r = await selAll('#pdfText', 'Въ домѣ', 'добрымъ.');
ok('orth: «Современная орфография при копировании» → «В доме нового капитана было тихо, и мир казался добрым.»', orow && r.s === 'В доме нового капитана было тихо, и мир казался добрым.', r);
const modern = await p.evaluate(() => rqOrth('Низко, благо, разсказ, Живаго и синий мир'));
ok('orth: a modern text never changes', modern === 'Низко, благо, разсказ, Живаго и синий мир', modern);
const kept = await p.evaluate(() => rqRm().orth === true && JSON.parse(localStorage.getItem(RQ_K.set) || '{}').rm.orth === true);
ok('orth: the switch is saved', kept);
await p.evaluate(() => el('orthTgl').click()); await sleep(200);
r = await selAll('#pdfText', 'Въ домѣ', 'добрымъ.');
ok('orth: off again → as printed', /Въ домѣ/.test(r.s), r);
if (SHOTS) { await p.evaluate(() => { openReaderSettings(); }); await sleep(400); await p.screenshot({ path: SHOTS + '/pdfmore-settings.png' }); }
await close();

ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\n${n}/${checks.length} pdfmore`); process.exit(n === checks.length ? 0 : 1);
