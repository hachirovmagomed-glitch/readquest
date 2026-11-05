// 05.11 «обратная дорога» (Джессика: «Делай обратную дорогу»): вопрос ушёл в свою нейросеть → плашка «Ответ нейросети — вставить» →
// ответ заметкой к цитате на этом месте / в словарь / в дневник. js/content.js aiBack*. Run: RQ_URL=… node aiback.test.mjs [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(async () => { window.__open = []; window.open = (u) => { window.__open.push(u); return null; }; window.__clipIn = '';
  try { navigator.clipboard.writeText = async (t) => { window.__clipOut = t; }; navigator.clipboard.readText = async () => window.__clipIn; } catch (e) {}
  S.ai.key = ''; save(); openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); });
const sel = (word) => p.evaluate(async (word) => { const c = el('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, hit = null; const vw = el('viewer').getBoundingClientRect();
  while ((n = w.nextNode())) { const m = n.textContent.indexOf(word); if (m < 0) continue; const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + word.length); const b = rg.getBoundingClientRect(); if (b.width && b.left >= vw.left && b.right <= vw.right) { hit = rg; break; } }
  const s = getSelection(); s.removeAllRanges(); s.addRange(hit); document.dispatchEvent(new Event('selectionchange')); await new Promise(r => setTimeout(r, 500)); return !!hit; }, word);
// 1: «Объясни» без ключа → ChatGPT → плашка → ответ заметкой к цитате
await sel('Очумелов'); await p.evaluate(() => el('spAI').click()); await sleep(300);
await p.evaluate(() => document.querySelector('#aiBody [data-ai-else="chatgpt"]').click()); await sleep(1500);
const c1 = await p.evaluate(() => { const c = el('aiBackChip'); return { chip: !!c && !c.hidden && c.offsetHeight > 0, open: window.__open.length, bk: AI_BACK && { frag: AI_BACK.frag, n: AI_BACK.n } }; });
ok('1. вопрос ушёл в ChatGPT — внизу плашка «Ответ нейросети — вставить», место запомнено', c1.chip && c1.open === 1 && c1.bk.frag === 'Очумелов', c1);
if (SHOTS) { await p.evaluate(() => el('aiSheet').classList.add('hidden')); await p.screenshot({ path: SHOTS + '/back-1-plashka.png' }); }
await p.evaluate(() => { window.__clipIn = 'Очумелов — полицейский надзиратель; фамилия от «очуметь».'; el('aiBackGo').click(); }); await sleep(400);
const c2 = await p.evaluate(() => ({ sheet: !el('aiSheet').classList.contains('hidden'), tx: el('aiBackTx').value, h: el('aiSheet').querySelector('h3').textContent.trim(), btns: [...document.querySelectorAll('#aiBody .ai-back-row button')].map(b => b.textContent.trim()) }));
ok('2. «вставить» — ответ из буфера в окне «Ответ нейросети», кнопки «Заметкой к цитате», «В словарь», «В дневник»', c2.sheet && /надзиратель/.test(c2.tx) && c2.h === 'Ответ нейросети' && c2.btns.join('|') === 'Заметкой к цитате|В словарь|В дневник', c2);
if (SHOTS) await p.screenshot({ path: SHOTS + '/back-2-otvet.png' });
const q0 = await p.evaluate(() => (S.quotes[R.book.id] || []).length);
await p.evaluate(() => el('aiBackQ').click()); await sleep(400);
const c3 = await p.evaluate(() => { const qs = S.quotes[R.book.id] || [], q = qs[qs.length - 1]; return { n: qs.length, text: q && q.text, note: q && q.note, mark: [...el('content').querySelectorAll('mark,.hl')].some(m => m.textContent === 'Очумелов'), chip: el('aiBackChip').hidden, sheet: el('aiSheet').classList.contains('hidden') }; });
ok('3. «Заметкой к цитате» — цитата «Очумелов» с ответом в заметке, подсвечена в тексте, плашка ушла', c3.n === q0 + 1 && c3.text === 'Очумелов' && /надзиратель/.test(c3.note) && c3.mark && c3.chip && c3.sheet, c3);
// 4: «Вопрос» (как на половине экрана) → в буфере ещё вопрос → поле пустое, вставили руками → в дневник
await sel('городовой'); await p.evaluate(async () => { await stAsk(); }); await sleep(1500);
await p.evaluate(() => { window.__clipIn = window.__clipOut; el('aiBackGo').click(); }); await sleep(400);
const c4 = await p.evaluate(() => ({ tx: el('aiBackTx').value, note: (el('aiBody').querySelector('.ai-note') || {}).textContent || '' }));
ok('4. в буфере всё ещё наш вопрос — поле пустое и подсказка «скопируйте ответ»', c4.tx === '' && /нет ответа/.test(c4.note), c4);
const d0 = await p.evaluate(() => { const y = diaryOf(R.book.id); return y ? (y.e || y.entries || []).length : 0; });
await p.evaluate(() => { el('aiBackTx').value = 'Городовой — нижний чин полиции.'; el('aiBackD').click(); }); await sleep(400);
const c5 = await p.evaluate(() => { const y = diaryOf(R.book.id); const e = y && (y.e || y.entries || []); const last = e && e[e.length - 1]; return { n: e ? e.length : 0, x: last && last.x }; });
ok('5. «В дневник» — запись с цитатой и ответом', c5.n === d0 + 1 && /^> городовой/.test(c5.x) && /нижний чин/.test(c5.x), c5);
// 6: «В словарь»
await sel('решетом'); await p.evaluate(async () => { await stAsk(); }); await sleep(1300);
await p.evaluate(() => { window.__clipIn = 'Решето — сито.'; el('aiBackGo').click(); }); await sleep(300);
await p.evaluate(() => el('aiBackW').click()); await sleep(300);
const c6 = await p.evaluate(() => (S.vocab || []).find(v => v.w === 'решетом'));
ok('6. «В словарь» — слово с объяснением из ответа', c6 && c6.ex === 'Решето — сито.', c6);
const c7 = await p.evaluate(() => { aiBackArm({ q: 'x' }); AI_BACK.at = Date.now() - 46 * 60000; sessionStorage.setItem('rqAiBack', JSON.stringify(AI_BACK)); AI_BACK = null; aiBackShow(); const c = el('aiBackChip'); return { gone: !c || c.hidden, store: sessionStorage.getItem('rqAiBack') }; });
ok('7. через 45 минут плашка не появляется', c7.gone && c7.store === null, c7);
ok('no page errors', errs.length === 0, errs);
console.log('SUMMARY aiback.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
