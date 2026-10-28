// «Текст страницы»: распознавание сканов (28.10, Джессика выбрала «Офлайн + „Через ИИ“»; js/ocr.js).
// Нужен сервер, где рядом с /readquest/test/ лежит /readquest/ocr/ (tools/gen-ocr-pack.py; нет — тест кладёт его в dist/ocr).
// chip: на странице-картинке без текста при открытых панелях плашка «На странице нет текста · Распознать», на странице с текстом её нет;
// dl: ничего не скачано заранее → «Скачать N МБ» → прогресс → текст страницы в порядке чтения (левая колонка, потом правая, строфы,
//     без номеров строк); пакет в кэше NS_ocr (один вариант движка + rus + eng), из /ocr/ больше ничего не тянется;
// layer: распознанные слова — текстовый слой страницы: выделяется и копируется как обычный PDF, поиск по книге их находит,
//     после повторного открытия книги слой на месте (IDB ocr:<книга>);
// off: без сети новое распознавание работает (движок и языки из кэша); file: на странице с текстом окно показывает текст файла;
// ai: «Через ИИ» шлёт картинку страницы своему сервису (OpenAI-формат image_url, Claude — image base64), ответ в окне; DeepSeek — объяснение;
// del: удаление книги с файлом стирает распознанное; опыт и монеты не меняются.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node ocr.test.mjs   [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '';
const here = path.dirname(new URL(import.meta.url).pathname);
const SCAN = '/workspace/rqtest/pdf/copy-scan.pdf', TEXT = '/workspace/rqtest/pdf/copy-edda.pdf';
if (!fs.existsSync(SCAN) || !fs.existsSync(TEXT)) execFileSync('python3', [path.join(here, 'fixtures/gen-copy.py'), '/workspace/rqtest/pdf/']);
{ const u = new URL('../ocr/index.json', BASE).href; let has = false; try { has = (await fetch(u)).ok; } catch (e) {}
  if (!has) { console.log('no ' + u + ' → tools/gen-ocr-pack.py dist/ocr'); execFileSync('python3', [path.join(here, '../tools/gen-ocr-pack.py'), path.join(here, '../dist/ocr')], { stdio: 'inherit' }); } }
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); await ctx.overridePermissions(new URL(BASE).origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
const ocrReq = []; const aiReq = [];
await p.setRequestInterception(true);
p.on('request', r => {
  const u = r.url();
  if (/\/ocr\//.test(u)) ocrReq.push(u.replace(/^.*\/ocr\//, ''));
  if (/^https:\/\/(api\.openai\.com|api\.anthropic\.com)\//.test(u)) {
    aiReq.push({ u, body: r.postData() || '' });
    if (r.method() === 'OPTIONS') { r.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } }); return; }
    const anth = /anthropic/.test(u), text = 'Знаю второе, —\nоно врачеванью\nпользу приносит.';
    r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(anth ? { content: [{ type: 'text', text }] } : { choices: [{ message: { content: text } }] }) }); return;
  }
  if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u) || /^(data|blob):/.test(u)) r.continue(); else r.abort();
});
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
const S0 = await p.evaluate(() => ({ g: S.gold, xp: S.xp }));
async function addPdf(file) { const n0 = await p.evaluate(() => allBooks().filter(b => b.type === 'pdf').length); await (await p.$('#fileInp')).uploadFile(file); await p.waitForFunction((n0) => allBooks().filter(b => b.type === 'pdf').length > n0, { timeout: 10000 }, n0); return p.evaluate(() => { const a = allBooks().filter(b => b.type === 'pdf'); return a[a.length - 1].id; }); }
async function open(id) { await p.evaluate(async (id) => { S.progress[id] = { ratio: 0, pos: 0 }; save(); __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 3500)); }, id); }
const bars = () => p.evaluate(async () => { el('reader').classList.remove('barsoff'); ocrChipUpd(); await new Promise(r => setTimeout(r, 300)); });
const chip = () => p.evaluate(() => { const c = el('ocrChip'), r = c.getBoundingClientRect(); return { on: !c.classList.contains('hidden') && r.width > 0, t: c.textContent.trim(), fits: r.left >= 0 && r.right <= innerWidth && r.height >= 44 }; });
const body = () => p.evaluate(() => el('ocrBody').innerText);
const V1 = 'Знаю второе, —\nоно врачеванью\nпользу приносит.\n\nЗнаю и третье, —';

// chip
const scan = await addPdf(SCAN); await open(scan); await bars();
let c = await chip();
ok('chip: a picture page with no text → «На странице нет текста · Распознать» (fits, 44 px)', c.on && /нет текста/.test(c.t) && c.fits, c);
if (SHOTS) await p.screenshot({ path: SHOTS + '/ocr-chip.png' });
await p.evaluate(() => el('reader').classList.add('barsoff')); await sleep(300);
ok('chip: hidden while the page is read without bars', !(await chip()).on);
await bars();

// dl
await p.evaluate(() => el('ocrChip').click()); await sleep(1200);
let b = await body();
ok('dl: nothing downloaded before → «Скачать N МБ», the engine is not fetched yet', /Скачать \d+ МБ/.test(b) && !ocrReq.some(u => /wasm|traineddata/.test(u)), { b, ocrReq });
if (SHOTS) await p.screenshot({ path: SHOTS + '/ocr-need.png' });
await p.evaluate(() => el('ocrDlB').click());
await p.waitForFunction(() => el('ocrOut') || /Не получилось|не скачался/.test(el('ocrBody').innerText), { timeout: 180000 });
let out = await p.evaluate(() => el('ocrOut') ? el('ocrOut').textContent : el('ocrBody').innerText);
ok('dl: the page text in reading order — left column, then right; stanzas apart; no line numbers', out.startsWith(V1) && out.indexOf('могу помирить их.') > out.indexOf('где ссора начнется') && out.indexOf('Знаю девятое') > out.indexOf('могу помирить') && !/\d/.test(out), out);
const cached = await p.evaluate(async () => (await (await caches.open(RQ_NS + '_ocr')).keys()).map(r => r.url.replace(/^.*\/ocr\//, '')));
ok('dl: the pack is in the NS_ocr cache: one engine for this phone + rus + eng', cached.filter(u => /tesseract-core.*\.wasm\.js$/.test(u)).length === 1 && cached.includes('rus.traineddata.gz') && cached.includes('eng.traineddata.gz'), cached);
if (SHOTS) await p.screenshot({ path: SHOTS + '/ocr-result.png' });
const clip0 = await p.evaluate(async () => { el('ocrCopy').click(); await new Promise(r => setTimeout(r, 300)); try { return await navigator.clipboard.readText(); } catch (e) { return 'ERR'; } });
ok('dl: «Копировать всё» copies the page text', clip0.startsWith(V1), clip0.slice(0, 60));

// layer
await p.evaluate(() => el('ocrSheetClose').click()); await sleep(1500);
const sel = () => p.evaluate(() => { const tl = el('pdfText'), sp = [...tl.querySelectorAll('span')]; const a = sp.find(s => /^Знаю$/.test(s.textContent) || /^Знаю/.test(s.textContent)), z = sp.find(s => /^ладья/.test(s.textContent));
  if (!a || !z) return { n: sp.length, err: 'no words' }; const g = getSelection(); g.removeAllRanges(); const rg = document.createRange(); rg.setStart(a.firstChild, 0); rg.setEnd(z.firstChild, z.firstChild.length); g.addRange(rg); const t = rqSelPlain(); g.removeAllRanges(); return { n: sp.length, t }; });
let s = await sel();
ok('layer: the recognised words are the page\'s text layer; a selection copies in reading order', s.t && s.t.startsWith(V1) && s.t.endsWith('Знаю девятое, —\nесли ладья') && !/\d/.test(s.t), s);
ok('layer: the chip is gone on the recognised page', !(await chip()).on);
const bf = await p.evaluate(async () => { BF.pdfTxt = []; BF.pdfDoc = null; return (await bfPdfText(0)).indexOf('ведьмы'); });
ok('layer: book search finds a recognised word', bf >= 0, bf);
await p.evaluate(async () => { await closeReader({ quiet: true }); }); await sleep(600); await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); });
await p.evaluate(() => { for (const k in OCR_MEM) delete OCR_MEM[k]; }); await open(scan);
s = await sel();
ok('layer: after reopening the book the recognised layer is back (IDB)', s.t && s.t.startsWith(V1), s);

// off: a new engine from the cache with no network
const n0 = ocrReq.length;
await p.evaluate(async () => { const w = await ocrWk; if (w) await w.terminate(); ocrWk = null; });
await p.setOfflineMode(true);
await p.evaluate(() => ocrOpen(0)); await sleep(800);
await p.evaluate(() => el('ocrGo').click());
await p.waitForFunction(() => el('ocrOut') && /распознано на телефоне/i.test(el('ocrBody').innerText) || /Не получилось/.test(el('ocrBody').innerText), { timeout: 120000 });
out = await p.evaluate(() => el('ocrOut') ? el('ocrOut').textContent : el('ocrBody').innerText);
ok('off: with no network the page is recognised again (engine and languages from the cache, nothing from /ocr/)', out.startsWith(V1) && ocrReq.slice(n0).every(u => /index\.json/.test(u)), { out: out.slice(0, 40), req: ocrReq.slice(n0) });
await p.setOfflineMode(false);
await p.evaluate(() => el('ocrSheetClose').click());
await p.evaluate(async () => { await closeReader({ quiet: true }); }); await sleep(600); await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); });

// file: a page with its own text → the row in «Настройки чтения» shows the file's text, no chip
const txt = await addPdf(TEXT); await open(txt); await bars();
ok('file: no chip on a page that has text', !(await chip()).on);
await p.evaluate(() => { el('sheet').classList.remove('hidden'); }); await sleep(200);
const row = await p.evaluate(() => { const b = el('ocrRowB'), r = b.getBoundingClientRect(); return { vis: r.width > 0 && r.height >= 44 }; });
await p.evaluate(() => el('ocrRowB').click()); await sleep(1500);
b = await body();
ok('file: «Настройки чтения» → «Текст страницы» → the file text of the page, «Копировать всё», «Распознать по картинке»', row.vis && b.startsWith(V1) && /Копировать всё/.test(b) && /Распознать по картинке/.test(b) && /Текст из файла/.test(b), { row, b: b.slice(0, 80) });

// ai
await p.evaluate(() => { S.ai = Object.assign({}, S.ai || {}, { prov: 'openai', key: 'sk-test', model: '' }); save(); ocrOpen(0); }); await sleep(1200);
await p.evaluate(() => el('ocrAi').click());
await p.waitForFunction(() => /Распознано ИИ|не прочитал/.test(el('ocrBody').innerText), { timeout: 20000 });
b = await body();
const oa = aiReq.filter(x => /openai/.test(x.u) && x.body).pop();
let jb = {}; try { jb = JSON.parse(oa.body); } catch (e) {}
const um = (jb.messages || []).find(m => m.role === 'user');
ok('ai: OpenAI gets the page as image_url (JPEG data URL) with the system rules; the answer is in the window', !!um && Array.isArray(um.content) && um.content.some(x => x.type === 'image_url' && /^data:image\/jpeg;base64,/.test(x.image_url.url)) && /левая колонка/.test((jb.messages[0] || {}).content || '') && /Распознано ИИ/.test(b) && b.startsWith('Знаю второе'), { b: b.slice(0, 60), roles: (jb.messages || []).map(m => m.role) });
await p.evaluate(() => { S.ai.prov = 'anthropic'; save(); ocrOpen(0); }); await sleep(1000);
await p.evaluate(() => el('ocrAi').click());
await p.waitForFunction(() => /Распознано ИИ|не прочитал/.test(el('ocrBody').innerText), { timeout: 20000 });
const an = aiReq.filter(x => /anthropic/.test(x.u) && x.body).pop(); let ja = {}; try { ja = JSON.parse(an.body); } catch (e) {}
ok('ai: Claude gets an image block (base64 JPEG)', !!ja.messages && ja.messages[0].content.some(x => x.type === 'image' && x.source && x.source.media_type === 'image/jpeg' && x.source.data.length > 1000), Object.keys(ja));
await p.evaluate(() => { S.ai.prov = 'deepseek'; save(); ocrOpen(0); }); await sleep(1000);
const nA = aiReq.length; await p.evaluate(() => el('ocrAi').click()); await sleep(500);
b = await body();
ok('ai: DeepSeek → it does not read pictures, nothing is sent', /DeepSeek не читает картинки/.test(b) && aiReq.length === nA, b.slice(0, 80));
if (SHOTS) { await p.evaluate(() => { S.ai.prov = 'openai'; save(); }); }
await p.evaluate(() => el('ocrSheetClose').click());
await p.evaluate(async () => { await closeReader({ quiet: true }); }); await sleep(600); await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) show('library'); });

// del
const del = await p.evaluate(async (id) => { const before = !!(await idbGet('ocr:' + id)); const pr = removeBook(id, true); await new Promise(r => setTimeout(r, 300)); el('rqAskOk').click(); await pr; await new Promise(r => setTimeout(r, 300)); return { before, after: !!(await idbGet('ocr:' + id)) }; }, scan).catch(e => ({ err: e.message }));
ok('del: removing the book with its file wipes the recognised pages', del.before === true && del.after === false, del);
const S1 = await p.evaluate(() => ({ g: S.gold, xp: S.xp }));
ok('no coins or XP for recognising', S1.g === S0.g && S1.xp === S0.xp, { S0, S1 });
ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\n${n}/${checks.length} ocr`); process.exit(n === checks.length ? 0 : 1);
