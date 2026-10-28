// Ревизия чтения 28.10 (Джессика: «проверить процесс чтения на работоспособность… Исправляй все»): 14 багов, по проверке на каждый.
// Книги собираются тут же (TXT с CRLF, FB2 в cp1251 с картинкой и стихами, EPUB с подглавами и сносками, .fb2.zip), сеть наружу закрыта —
// EPUB должен открываться без интернета.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node readfix.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; let outside = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.setRequestInterception(true);
p.on('request', r => { if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(r.url()) || r.url().startsWith('data:') || r.url().startsWith('blob:')) r.continue(); else { outside.push(r.url().slice(0, 80)); r.abort(); } });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAIAAAAt/+nTAAAAP0lEQVR42u3PMQ0AAAgDsM2/aDDBQ1oHraaePAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBATUNNZ4AeE33XYAAAAASUVORK5CYII=';
const cp1251 = (s) => Buffer.from([...s].map(c => { const k = c.codePointAt(0); if (k < 128) return k; if (k >= 0x410 && k <= 0x44F) return k - 0x410 + 0xC0; if (k === 0x401) return 0xA8; if (k === 0x451) return 0xB8; if (k === 0x2014) return 0x97; if (k === 0xAB) return 0xAB; if (k === 0xBB) return 0xBB; return 0x3F; }));
const para = (i) => 'Абзац номер ' + i + '. Он нарочно длинный, чтобы занять пару строк на телефоне и не слиться с соседним абзацем в одну стену текста.';
// file → book id (the page builds the File; puppeteer's uploadFile does not take a Cyrillic path)
async function imp(buf, name) {
  return p.evaluate(async (b64, name) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), n0 = S.userBooks.length;
    await importBookFiles([new File([bin], name)]); await new Promise(r => setTimeout(r, 300));
    return S.userBooks.length > n0 ? S.userBooks[S.userBooks.length - 1].id : null;
  }, Buffer.from(buf).toString('base64'), name);
}
async function open(id, ms = 2500) { await p.evaluate(async (id, ms) => { __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, ms)); }, id, ms); }
async function close() { await p.evaluate(() => { closeReader(); }); await sleep(900); await p.evaluate(() => { if (typeof show === 'function' && !el('summary').classList.contains('hidden')) show('library'); }); await sleep(200); }
const paras = () => p.evaluate(() => [...el('content').querySelectorAll('p')].map(x => x.textContent));

// 1. TXT: CRLF and «a paragraph per line» are paragraphs, not one wall
const crlf = Array.from({ length: 30 }, (_, i) => para(i + 1)).join('\r\n\r\n');
let id = await imp(Buffer.from(crlf, 'utf8'), 'Проверка CRLF.txt'); await open(id);
let ps = await paras();
ok('1. TXT with CRLF blank lines → 30 paragraphs', ps.filter(t => /^Абзац номер \d+\./.test(t)).length === 30, ps.length);
await close();
const lines = Array.from({ length: 30 }, (_, i) => para(i + 1)).join('\r\n');
id = await imp(Buffer.from(lines, 'utf8'), 'Проверка строки.txt'); await open(id);
ps = await paras();
ok('1. TXT one paragraph per line (no blank lines) → 30 paragraphs', ps.filter(t => /^Абзац номер \d+\./.test(t)).length === 30, ps.length);
await close();

// 4 + 3 + 13. FB2 in windows-1251 with single quotes in the header; verse lines, epigraph author, subtitle apart; the picture shown
const fb2 = `<?xml version='1.0' encoding='windows-1251'?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><author><first-name>Иван</first-name><last-name>Проверкин</last-name></author><book-title>Проверка ФБ</book-title><lang>ru</lang></title-info></description>
<body><title><p>Проверка ФБ</p></title>
<section><title><p>Глава первая</p></title><epigraph><p>Эпиграф к главе.</p><text-author>Автор Эпиграфа</text-author></epigraph>
<p>Обычный абзац прозы — Привет, мир.</p><subtitle>Подзаголовок внутри</subtitle>
<poem><stanza><v>Строка стиха первая,</v><v>Строка стиха вторая.</v></stanza></poem>
<image l:href="#pic1"/>
${Array.from({ length: 12 }, (_, i) => '<p>' + para(i + 1) + '</p>').join('')}
<section><title><p>Подглава</p></title><p>Текст подглавы.</p></section></section></body>
<binary id="pic1" content-type="image/png">${PNG}</binary></FictionBook>`;
id = await imp(cp1251(fb2), 'Проверка ФБ.fb2');
const fb = await p.evaluate((id) => { const b = S.userBooks.find(x => x.id === id); return b && { title: b.title, author: b.author }; }, id);
ok('4. FB2 encoding=\'windows-1251\' (single quotes) → readable title and author', fb && fb.title === 'Проверка ФБ' && /Проверкин/.test(fb.author || ''), fb);
await open(id, 3000);
ps = await paras();
const has = (s) => ps.some(t => t.trim() === s);
ok('4. FB2 cp1251 text is readable', ps.some(t => t.includes('Привет, мир')), ps.slice(0, 4));
ok('3. FB2 verse lines and epigraph author are not glued to neighbours', has('Строка стиха первая,') && has('Строка стиха вторая.') && has('Автор Эпиграфа') && has('Эпиграф к главе.'), ps.slice(0, 10));
ok('3. FB2 subtitle is its own paragraph', has('Подзаголовок внутри'), ps.slice(0, 10));
const img = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 600)); const i = el('content').querySelector('p.rq-img img'); return i ? { w: i.naturalWidth, gone: i.closest('p').classList.contains('gone') } : null; });
ok('3. FB2 picture is shown in the text', img && img.w === 64 && !img.gone, img);
const ftoc = await p.evaluate(() => tocOf(R.book).map(x => [x.t, x.lvl || 0]));
ok('12. FB2 contents: chapter and its subchapter one level down', JSON.stringify(ftoc).includes('["Глава первая",0]') && JSON.stringify(ftoc).includes('["Подглава",1]'), ftoc);
await close();

// 2 + 12. EPUB without internet: JSZip is the app's own; headings h1/h2 → contents with levels; a footnotes file is not a chapter; picture shown
outside = [];
const epubB64 = await p.evaluate(async (png, body) => {
  await loadJSZip(); const z = new window.JSZip();
  z.file('mimetype', 'application/epub+zip');
  z.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  z.file('OEBPS/c.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Проверка ЕПАБ</dc:title><dc:creator>Пётр Проверкин</dc:creator><dc:language>ru</dc:language></metadata>' +
    '<manifest><item id="a" href="t/one.xhtml" media-type="application/xhtml+xml"/><item id="b" href="t/notes.xhtml" media-type="application/xhtml+xml"/><item id="i" href="img/p.png" media-type="image/png"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');
  z.file('OEBPS/t/one.xhtml', '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Часть первая</h1><p>Начало&#x2014;текста<a href="notes.xhtml#n1"><sup>1</sup></a>.</p><h2>Глава вторая</h2><p><img src="../img/p.png" alt=""/></p>' + body + '</body></html>');
  z.file('OEBPS/t/notes.xhtml', '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p id="n1">1. Текст сноски.</p></body></html>');
  z.file('OEBPS/img/p.png', Uint8Array.from(atob(png), c => c.charCodeAt(0)));
  const b = await z.generateAsync({ type: 'base64' }); return b;
}, PNG, Array.from({ length: 12 }, (_, i) => '<p>' + para(i + 1) + '</p>').join('')).catch(e => 'ERR ' + e.message);
ok('2. EPUB module loads with no internet (vendor/jszip)', !String(epubB64).startsWith('ERR') && !outside.some(u => /jszip|cdnjs/.test(u)), { e: String(epubB64).slice(0, 60), outside });
if (!String(epubB64).startsWith('ERR')) {
  id = await imp(Buffer.from(epubB64, 'base64'), 'Проверка ЕПАБ.epub'); await open(id, 3000);
  const ep = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 600)); const i = el('content').querySelector('p.rq-img img');
    return { toc: tocOf(R.book).map(x => [x.t, x.lvl || 0]), h: [...el('content').querySelectorAll('p.rq-h')].map(x => x.textContent), img: i ? i.naturalWidth : 0, dash: el('content').textContent.includes('Начало—текста') }; });
  ok('12. EPUB contents: part, its chapter one level down, notes not a chapter', JSON.stringify(ep.toc) === JSON.stringify([['Часть первая', 0], ['Глава вторая', 1]]) || (JSON.stringify(ep.toc).includes('["Глава вторая",1]') && !JSON.stringify(ep.toc).includes('сноск')), ep.toc);
  ok('12. EPUB headings are styled headings in the text', ep.h.includes('Часть первая') && ep.h.includes('Глава вторая'), ep.h);
  ok('3. EPUB picture is shown; hex entities decoded', ep.img === 64 && ep.dash, ep);
  const jt = await p.evaluate(async () => { const t = tocOf(R.book), i = t.findIndex(x => x.t === 'Глава вторая'); jumpToc(i); await new Promise(r => setTimeout(r, 300));
    const h = [...el('content').querySelectorAll('p.rq-h')].find(x => x.textContent === 'Глава вторая'), v = el('viewer').getBoundingClientRect(), r = h.getBoundingClientRect();
    return { on: r.left >= v.left - 2 && r.right <= v.right + 2 }; });
  ok('12. EPUB: a chapter in the contents opens the page with its heading', jt.on, jt);
  await close();
} else { for (let k = 0; k < 4; k++) ok('2. EPUB checks skipped — module did not load', false); }

// 13. .fb2.zip
const zipB64 = await p.evaluate(async (fb) => { try { await loadJSZip(); const z = new window.JSZip(); z.file('Проверка ФБ.fb2', fb); return await z.generateAsync({ type: 'base64' }); } catch (e) { return 'ERR ' + e.message; } },
  fb2.replace("encoding='windows-1251'", "encoding='utf-8'").replace('Проверка ФБ</book-title>', 'Проверка ЗИП</book-title>'));
id = String(zipB64).startsWith('ERR') ? null : await imp(Buffer.from(zipB64, 'base64'), 'Проверка ЗИП.fb2.zip');
const zt = id && await p.evaluate((id) => (S.userBooks.find(x => x.id === id) || {}).title, id);
ok('13. .fb2.zip is added as a book', zt === 'Проверка ЗИП', { zt, e: String(zipB64).slice(0, 40), accept: await p.evaluate(() => el('fileInp').accept) });

// long built-in book for the reader checks
await p.evaluate(async () => {
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, flipGet(), { mode: 'page', anim: 'none', invert: false, tap: true, swipe: true }); saveSet(); applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500));
  goPage(3, true); await new Promise(r => setTimeout(r, 300));
});
const pg = () => p.evaluate(() => R.page);
const V = await p.evaluate(() => { const r = el('viewer').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
const midY = Math.round((V.t + V.b) / 2);

// 5. taps on the side fields and on the brightness strip turn the page
await p.evaluate(() => goPage(3, true)); await sleep(250);
await p.touchscreen.tap(Math.round(V.r + (390 - V.r) / 2), midY); await sleep(350);
let a = await pg();
await p.touchscreen.tap(Math.max(1, Math.round(V.l / 2)), midY); await sleep(350);
let b = await pg();
ok('5. tap on the right field → next page, on the left field → back', a === 4 && b === 3, { a, b, V });
const br0 = await p.evaluate(() => SET.bright);
await p.touchscreen.tap(Math.round(V.l + 10), midY); await sleep(350);
a = await pg();
ok('5. tap in the brightness strip at the left edge → previous page, brightness kept', a === 2 && (await p.evaluate(() => SET.bright)) === br0, { a });
// a vertical drag there still sets the brightness
await p.touchscreen.touchStart(Math.round(V.l + 10), midY); for (let k = 1; k <= 6; k++) { await p.touchscreen.touchMove(Math.round(V.l + 10), midY + k * 20); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(300);
const br1 = await p.evaluate(() => SET.bright);
ok('5. vertical drag at the left edge still changes brightness, page stays', br1 < br0 && (await pg()) === 2, { br0, br1 });
await p.evaluate(() => { SET.bright = 1; saveSet(); applySet(); });

// 6. «Поменять стороны» turns only the taps; ‹ › and the swipe keep their direction
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { invert: true, btns: true }); saveSet(); applySet(); goPage(3, true); }); await sleep(300);
await p.evaluate(() => el('navNext').click()); await sleep(250); a = await pg();
await p.evaluate(() => el('navPrev').click()); await sleep(250); b = await pg();
ok('6. inverted: › still goes forward, ‹ back', a === 4 && b === 3, { a, b });
const swipe = async (x0, x1) => { await p.touchscreen.touchStart(x0, midY); for (let k = 1; k <= 5; k++) { await p.touchscreen.touchMove(Math.round(x0 + (x1 - x0) * k / 5), midY); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(350); };
await swipe(300, 100); a = await pg();
ok('6. inverted: swipe right-to-left still goes forward', a === 4, { a });
await p.touchscreen.tap(Math.round(V.l + (V.r - V.l) * 0.15), midY); await sleep(300); b = await pg();
ok('6. inverted: a tap on the left goes forward (that is what the switch is for)', b === 5, { b });
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { invert: false, btns: false }); saveSet(); applySet(); });

// 14. bookmark date in Russian
const md = await p.evaluate(() => { const id = R.book.id; S.marks[id] = [{ ratio: 0.1, page: 2, date: new Date().getFullYear() + '-10-28' }, { ratio: 0.2, page: 3, date: '2025-03-01' }]; renderPanel('marks');
  const t = el('panelBody') ? el('panelBody').textContent : document.querySelector('#panel').textContent; delete S.marks[id]; return t; });
ok('14. bookmark dates: «28 октября», another year with the year', md.includes('28 октября') && md.includes('1 марта 2025') && !/\d{4}-\d{2}-\d{2}/.test(md), md.slice(0, 160));

// 11. «Свои цвета» swatches follow Ночь / День
const sw = await p.evaluate(async () => { const hex = (c) => { const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join(''); };
  const out = []; for (let k = 0; k < 2; k++) { toggleDayNight(); await new Promise(r => setTimeout(r, 200)); const cs = getComputedStyle(el('reader'));
    out.push({ bg: el('cBg').value, real: hex(cs.backgroundColor), tx: el('cTxt').value, realT: hex(cs.color) }); } return out; });
ok('11. colour swatches show the colours in use after Ночь and after День', sw.every(x => x.bg === x.real && x.tx === x.realT), sw);

// 8. fonts: the serif faces come with the app, not from Windows
const fo = await p.evaluate(async () => { const t = FONTS.map(f => f.css || f.f || f.v || JSON.stringify(f)).join(' | ');
  let ld = false; try { await document.fonts.load('16px "RQ Liberation Serif"'); ld = document.fonts.check('16px "RQ Liberation Serif"'); } catch (e) {}
  return { t: t.slice(0, 400), ld, n: FONTS.length }; });
ok('8. «Times» falls back to the bundled Liberation Serif, and it loads', /RQ Liberation Serif/.test(fo.t) && fo.ld && fo.n === 10, fo);
ok('8. no Windows-only faces without a fallback (Palatino, Book Antiqua)', !/Palatino|Book Antiqua/.test(fo.t), fo.t);

// 9 + 10. selection near the bottom: ‹ › do not cover it; the bar at the top keeps its «Свернуть» on screen
await p.evaluate(() => goPage(3, true)); await sleep(300);
const sel = await p.evaluate(async () => {
  // the last line of this page, whole: its first character to its last
  const v = el('viewer').getBoundingClientRect(), w = document.createTreeWalker(el('content'), NodeFilter.SHOW_TEXT), rg = document.createRange(), cs = []; let n;
  while ((n = w.nextNode())) { const pr = n.parentElement.getBoundingClientRect(); if (pr.right < v.left - 2) continue; if (pr.left > v.right + 2) break;
    for (let i = 0; i < n.nodeValue.length; i++) { if (/\s/.test(n.nodeValue[i])) continue; rg.setStart(n, i); rg.setEnd(n, i + 1); const r = rg.getClientRects()[0]; if (r && r.left >= v.left - 1 && r.right <= v.right + 1) cs.push([n, i, r]); } }
  const lt = Math.max(...cs.map(c => c[2].top)), line = cs.filter(c => Math.abs(c[2].top - lt) < 3), f = line.reduce((x, y) => y[2].left < x[2].left ? y : x), l = line.reduce((x, y) => y[2].right > x[2].right ? y : x);
  const [fn, fi] = f, [ln, li] = l;
  getSelection().setBaseAndExtent(fn, fi, ln, li + 1); document.dispatchEvent(new Event('selectionchange'));
  await new Promise(r => setTimeout(r, 700)); SA.mini = false; selMiniApply(); selPlace(); await new Promise(r => setTimeout(r, 200)); // the bar opened from its circle
  const rs = [...getSelection().getRangeAt(0).getClientRects()].filter(r => r.width && r.height), hit = (e) => { const b = e.getBoundingClientRect(); return rs.some(r => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top); };
  const nav = el('selNav'), sp = el('selpop'), fold = el('spFold'), fr = fold ? fold.getBoundingClientRect() : null;
  return { n: rs.length, nav: !!nav && !nav.hidden, pv: hit(el('selPrev')), nx: hit(el('selNext')), top: sp.classList.contains('top'), foldTop: fr && fr.top, foldShown: fr && fr.width > 0, text: String(getSelection()).slice(0, 40) };
});
ok('10. ‹ › are shown and do not cover the selected last line', sel.nav && !sel.pv && !sel.nx && sel.n > 0, sel);
ok('9. bar moved to the top: «Свернуть» is shown and fully on screen', sel.top && sel.foldShown && sel.foldTop >= 0, sel);
await p.evaluate(() => getSelection().removeAllRanges()); await sleep(200);
await close();

// 7. PDF at night is dimmed
const pdf = fs.readFileSync(new URL('./fixtures/f-outline-30.pdf', import.meta.url));
id = await imp(pdf, 'Проверка ПДФ.pdf'); await open(id, 3500);
const dim = await p.evaluate(async () => { const st = () => { const s = getComputedStyle(el('pdfSheet'), '::after'); return { c: s.content, bg: s.backgroundColor }; };
  if (el('reader').dataset.page === 'night') toggleDayNight(); await new Promise(r => setTimeout(r, 300)); const day = st();
  toggleDayNight(); await new Promise(r => setTimeout(r, 300)); const night = st(); toggleDayNight(); return { day, night, page: el('reader').dataset.page }; });
ok('7. PDF: at night a dark layer lies over the page, by day none', dim.night.c !== 'none' && /rgba\(0, 0, 0, 0\.35\)/.test(dim.night.bg) && (dim.day.c === 'none' || dim.day.c === 'normal'), dim);
await close();

ok('no page errors', !errs.length, errs.slice(0, 3));
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
