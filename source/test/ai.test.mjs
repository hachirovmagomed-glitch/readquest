// ИИ «Объясни» на своём ключе (20.10, handoff/notes/arch.md «ИИ «Объясни»»). Сеть подменена: запросы к сервисам ловятся перехватом.
// sel: кнопка «Объясни» в панели выделения, панель влезает в 360 и 390; nokey: без ключа окно ведёт в Настройки → ИИ-помощник;
// deepseek/anthropic/custom: запрос уходит прямо в сервис с ключом, моделью и подсказкой, ответ в окне, «В словарь с объяснением» → vocab[].ex,
// опыт и монеты не меняются; err: 401 → «сервис не принял ключ» и «Ещё раз»; test: «Проверить ключ»; data: нормализация, экспорт без ключа, импорт.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node ai.test.mjs   [RQ_ONLY=sel,…] [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

/* reply(req) → {status, json} for the AI hosts; everything else goes through */
async function fresh(width, reply) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: width || 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  const reqs = [];
  await p.setRequestInterception(true);
  p.on('request', r => {
    const u = r.url();
    if (/^https:\/\/(api\.deepseek\.com|openrouter\.ai|api\.openai\.com|api\.anthropic\.com|ai\.example\.test|api\.elevenlabs\.io|texttospeech\.googleapis\.com)\//.test(u)) {
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: CORS, body: '' });
      const q = { url: u, headers: r.headers(), body: (() => { try { return JSON.parse(r.postData() || 'null'); } catch (e) { return null; } })() }; reqs.push(q);
      const a = reply ? reply(q) : { status: 500, json: {} };
      if (a.raw) return r.respond({ status: a.status, headers: CORS, contentType: a.type, body: a.raw });
      return r.respond({ status: a.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(a.json) });
    }
    r.continue();
  });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return { ctx, p, reqs };
}
async function openAndSelect(p, word, stay) {
  return p.evaluate(async (word, stay) => {
    if (!stay) { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); }
    const c = el('content'); const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n, hit = null;
    const vw = el('viewer') ? el('viewer').getBoundingClientRect() : { left: 0, right: innerWidth };
    while ((n = w.nextNode())) {
      const m = word ? n.textContent.indexOf(word) : n.textContent.search(/[А-Яа-яЁё]{6,}/);
      if (m < 0) continue; const len = word ? word.length : n.textContent.slice(m).match(/[А-Яа-яЁё]+/)[0].length;
      const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + len); const b = rg.getBoundingClientRect();
      if (b.width > 0 && b.left >= vw.left && b.right <= vw.right) { hit = rg; break; }
    }
    if (!hit) return null;
    const s = getSelection(); s.removeAllRanges(); s.addRange(hit);
    await new Promise(r => setTimeout(r, 500));
    return String(s);
  }, word || '', !!stay);
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '.png' }); };
const sheetText = (p) => p.evaluate(() => ({ open: !el('aiSheet').classList.contains('hidden'), t: el('aiBody').textContent, vocab: !!el('aiToVocab'), retry: !!el('aiRetry'), set: !!el('aiOpenSet') }));
const waitAnswer = (p) => p.waitForFunction(() => !el('aiBody').querySelector('.ai-wait'), { timeout: 30000 }).catch(() => {});

if (want('sel')) for (const W of [360, 390]) {
  const { ctx, p } = await fresh(W);
  const t = await openAndSelect(p);
  const r = await p.evaluate(() => { const pop = el('selpop'), b = el('spAI'); const pr = pop.getBoundingClientRect(); const br = b.getBoundingClientRect();
    return { popVis: !pop.classList.contains('hidden'), btnVis: br.width > 0 && getComputedStyle(b).display !== 'none', label: b.textContent.trim(), l: Math.round(pr.left), r: Math.round(pr.right), w: innerWidth, bh: Math.round(br.height), bw: Math.round(br.width) }; });
  ok('sel ' + W + ': «Объясни» в панели выделения (MVP, без ключа тоже видна)', !!t && r.popVis && r.btnVis && r.label === 'Объясни', { t, ...r });
  ok('sel ' + W + ': панель выделения целиком на экране, кнопка ≥ 44px', r.l >= 0 && r.r <= r.w && r.bh >= 44 && r.bw >= 44, r);
  await shot(p, W + '-1-vydelenie');
  await ctx.close();
}

if (want('nokey')) {
  const { ctx, p, reqs } = await fresh(390);
  await openAndSelect(p);
  await p.click('#spAI'); await sleep(300);
  const s = await sheetText(p);
  ok('nokey: окно говорит, где вставить ключ, и есть «Открыть настройки»; запросов в сеть нет', s.open && /свой ключ/.test(s.t) && s.set && reqs.length === 0, { s, n: reqs.length });
  await shot(p, '390-2-net-klyucha');
  await p.click('#aiOpenSet'); await sleep(600);
  const v = await p.evaluate(() => { const g = el('settings'); const h = el('aiHead').getBoundingClientRect(); return { set: !g.classList.contains('hidden'), sheet: el('aiSheet').classList.contains('hidden'), top: Math.round(h.top), vh: innerHeight, card: !!el('aiCard') && el('aiCard').getBoundingClientRect().height > 0, mvp: isMvp() }; });
  ok('nokey: «Открыть настройки» → Настройки, раздел «ИИ-помощник» виден (и в MVP)', v.set && v.sheet && v.card && v.top >= 0 && v.top < v.vh && v.mvp, v);
  await shot(p, '390-3-nastroyki');
  await ctx.close();
}

if (want('deepseek')) {
  const { ctx, p, reqs } = await fresh(390, () => ({ status: 200, json: { choices: [{ message: { role: 'assistant', content: 'Здесь это слово значит «тест». Объяснение от ИИ.' } }] } }));
  /* через настройки: сервис по умолчанию DeepSeek, вставляем ключ */
  const d = await p.evaluate(() => { NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); const on = el('aiProvSeg').querySelector('button.on'); return { prov: on && on.textContent, base: el('aiBase').hidden, ph: el('aiModel').placeholder, sai: JSON.parse(JSON.stringify(S.ai)) }; });
  ok('deepseek: новый человек — DeepSeek по умолчанию, поле адреса скрыто, подсказка модели deepseek-chat', d.prov === 'DeepSeek' && d.base && /deepseek-chat/.test(d.ph) && d.sai.prov === 'deepseek', d);
  await p.type('#aiKey', 'sk-test-DS'); await sleep(100);
  await p.click('#aiTest'); await p.waitForFunction(() => /Работает|Не работает/.test(el('aiTestRes').textContent), { timeout: 10000 }).catch(() => {});
  const tr = await p.evaluate(() => el('aiTestRes').textContent);
  ok('test: «Проверить ключ» → «Работает»', /^Работает/.test(tr), { tr, n: reqs.length });
  await shot(p, '390-4-nastroyki-klyuch');
  const before = await p.evaluate(() => ({ xp: S.xp, gold: S.gold, goldAll: S.goldAllTime, vocab: (S.vocab || []).length }));
  const word = await openAndSelect(p);
  const n0 = reqs.length;
  await p.click('#spAI'); await waitAnswer(p);
  const s = await sheetText(p);
  const q = reqs[n0] || {};
  ok('deepseek: запрос в api.deepseek.com/chat/completions с ключом и моделью deepseek-chat', q.url === 'https://api.deepseek.com/chat/completions' && q.headers && q.headers.authorization === 'Bearer sk-test-DS' && q.body && q.body.model === 'deepseek-chat', { url: q.url, auth: q.headers && q.headers.authorization, model: q.body && q.body.model });
  const msgs = (q.body && q.body.messages) || [];
  ok('deepseek: подсказка — system про «без спойлеров», в user фрагмент и название книги', msgs[0] && msgs[0].role === 'system' && /спойлер/.test(msgs[0].content) && msgs[1] && msgs[1].content.indexOf(word) >= 0 && /Книга: «.+»/.test(msgs[1].content), msgs.map(m => m.content.slice(0, 160)));
  ok('deepseek: ответ в окне, есть «В словарь с объяснением» и пометка про ИИ', s.open && /Объяснение от ИИ/.test(s.t) && s.vocab && /может ошибаться/.test(s.t), s);
  await shot(p, '390-5-otvet');
  await p.click('#aiToVocab'); await sleep(300);
  const after = await p.evaluate(() => ({ xp: S.xp, gold: S.gold, goldAll: S.goldAllTime, vocab: (S.vocab || []).length, last: (S.vocab || []).slice(-1)[0] }));
  ok('deepseek: слово в словаре с полем ex', after.vocab === before.vocab + 1 && after.last && after.last.w === word && /Объяснение от ИИ/.test(after.last.ex), after.last);
  ok('deepseek: опыт и монеты не изменились', after.xp === before.xp && after.gold === before.gold && after.goldAll === before.goldAll, { before, after });
  /* тот же фрагмент второй раз — из памяти, без нового запроса */
  const n1 = reqs.length; await p.evaluate(() => aiExplain(aiCur)); await waitAnswer(p);
  ok('deepseek: повтор того же фрагмента — без нового запроса', reqs.length === n1 && /Объяснение от ИИ/.test((await sheetText(p)).t), { n1, n: reqs.length });
  /* словарь показывает объяснение */
  const vv = await p.evaluate(async () => { el('aiSheet').classList.add('hidden'); await closeReader(); await new Promise(r => setTimeout(r, 400)); renderVocab(); return el('vocabBody').textContent; });
  ok('deepseek: в списке словаря видно объяснение', /Объяснение от ИИ/.test(vv), vv.slice(0, 200));
  await ctx.close();
}

if (want('anthropic')) {
  const { ctx, p, reqs } = await fresh(360, () => ({ status: 200, json: { content: [{ type: 'text', text: 'Это объяснение от Claude.' }] } }));
  await p.evaluate(() => { NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); [...el('aiProvSeg').querySelectorAll('button')].find(b => /Claude/.test(b.textContent)).click(); });
  await p.type('#aiKey', 'sk-ant-TEST'); await sleep(100);
  await shot(p, '360-4-nastroyki-claude');
  await openAndSelect(p); await p.click('#spAI'); await waitAnswer(p);
  const q = reqs[0] || {}; const s = await sheetText(p);
  ok('anthropic: запрос в api.anthropic.com/v1/messages, x-api-key, версия и разрешение из браузера', q.url === 'https://api.anthropic.com/v1/messages' && q.headers['x-api-key'] === 'sk-ant-TEST' && q.headers['anthropic-version'] === '2023-06-01' && q.headers['anthropic-dangerous-direct-browser-access'] === 'true' && !q.headers.authorization, q.headers && { url: q.url, k: q.headers['x-api-key'] });
  ok('anthropic: модель claude-haiku-5-5, system отдельно, ответ в окне', q.body && q.body.model === 'claude-haiku-5-5' && typeof q.body.system === 'string' && q.body.messages.length === 1 && /объяснение от Claude/.test(s.t), { model: q.body && q.body.model, t: s.t });
  await shot(p, '360-5-otvet');
  await ctx.close();
}

if (want('custom')) {
  const { ctx, p, reqs } = await fresh(390, () => ({ status: 200, json: { choices: [{ message: { content: 'Свой сервис ответил.' } }] } }));
  await p.evaluate(() => { NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); [...el('aiProvSeg').querySelectorAll('button')].find(b => b.textContent === 'Другой').click(); });
  const vis = await p.evaluate(() => !el('aiBase').hidden);
  await p.type('#aiKey', 'k-1'); await p.type('#aiBase', 'https://ai.example.test/v1/'); await p.type('#aiModel', 'my-model'); await sleep(100);
  await openAndSelect(p); await p.click('#spAI'); await waitAnswer(p);
  const q = reqs[0] || {};
  ok('custom: поле адреса видно, запрос в <адрес>/chat/completions с моделью человека', vis && q.url === 'https://ai.example.test/v1/chat/completions' && q.body && q.body.model === 'my-model' && /Свой сервис ответил/.test((await sheetText(p)).t), { vis, url: q.url });
  await ctx.close();
}

if (want('err')) {
  let code = 401;
  const { ctx, p, reqs } = await fresh(390, () => code === 401 ? { status: 401, json: { error: { message: 'Authentication Fails' } } } : { status: 200, json: { choices: [{ message: { content: 'Со второго раза.' } }] } });
  await p.evaluate(() => { S.ai.key = 'bad'; save(); });
  await openAndSelect(p); await p.click('#spAI'); await waitAnswer(p);
  const s = await sheetText(p);
  ok('err: 401 → «сервис не принял ключ» и кнопка «Ещё раз»', /сервис не принял ключ/.test(s.t) && s.retry && !s.vocab, s);
  await shot(p, '390-6-oshibka');
  code = 200; await p.click('#aiRetry'); await waitAnswer(p);
  ok('err: «Ещё раз» → ответ', /Со второго раза/.test((await sheetText(p)).t) && reqs.length === 2, { n: reqs.length });
  /* закрыли окно до ответа — ответ не всплывает */
  const { ctx: c2, p: p2 } = await fresh(390, () => ({ status: 200, json: { choices: [{ message: { content: 'Поздно.' } }] } }));
  await p2.evaluate(() => { S.ai.key = 'k'; save(); window.fetch = ((f) => async (...a) => { await new Promise(r => setTimeout(r, 800)); return f(...a); })(window.fetch); });
  await openAndSelect(p2); await p2.click('#spAI'); await sleep(100); await p2.click('#aiSheetClose'); await sleep(1500);
  ok('err: окно закрыли до ответа — оно не открывается само', (await sheetText(p2)).open === false);
  await c2.close(); await ctx.close();
}

if (want('data')) {
  const { ctx, p } = await fresh(390);
  const r = await p.evaluate(async () => {
    const a1 = aiNorm({ key: 'sk-old', model: 'gpt-4o-mini' }), a2 = aiNorm({ key: '', model: 'gpt-4o-mini' }), a3 = aiNorm({ key: 5, model: null, prov: 'zzz', base: 7 });
    const v1 = { w: 'a', ex: 5 }; vocabNorm(v1); const v2 = { w: 'b', ex: 'x'.repeat(900) }; vocabNorm(v2); const v3 = 'битая'; vocabNorm(v3);
    S.ai = { key: 'sk-OWN', model: '', prov: 'anthropic', base: '' }; S.vocab = [{ w: 'слово', ctx: '', book: 'K', date: today(), box: 0, ex: 'объяснение' }]; save(); await new Promise(r => setTimeout(r, 300));
    const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
    const e = exp.game.ai, raw = JSON.stringify(exp).indexOf('sk-OWN') >= 0, ex = exp.game.vocab && exp.game.vocab[0] && exp.game.vocab[0].ex;
    const foreign = JSON.parse(JSON.stringify(exp)); foreign.game.ai = { key: 'sk-FOREIGN', model: 'x', prov: 'openai', base: '' };
    await __rq.importBackup(foreign); const after = __rq.loadEnvelope().game.ai || {};
    return { a1, a2, a3, v1, v2l: v2.ex.length, e, raw, ex, after };
  });
  ok('data: старые данные с ключом → OpenAI, без ключа → DeepSeek и модель по умолчанию, мусор → строки', r.a1.prov === 'openai' && r.a1.model === 'gpt-4o-mini' && r.a2.prov === 'deepseek' && r.a2.model === '' && r.a3.prov === 'deepseek' && r.a3.key === '' && r.a3.base === '' && r.a3.model === '', r);
  ok('data: vocab ex не строка → убрано, длинное → 600', !('ex' in r.v1) && r.v2l === 600, r);
  ok('data: экспорт без ключа, сервис и объяснение в словаре уходят', r.e.key === '' && r.e.prov === 'anthropic' && !r.raw && r.ex === 'объяснение', r.e);
  ok('data: импорт файла с чужим ключом — свой ключ и свой сервис остаются', r.after.key === 'sk-OWN' && r.after.prov === 'anthropic', r.after);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  const r2 = await p.evaluate(() => ({ ai: S.ai, ex: S.vocab[0] && S.vocab[0].ex }));
  ok('data: после перезагрузки ключ, сервис и ex на месте', r2.ai.key === 'sk-OWN' && r2.ai.prov === 'anthropic' && r2.ex === 'объяснение', r2);
  await ctx.close();
}

if (want('chat')) for (const W of [360, 390]) {
  let n = 0;
  const { ctx, p, reqs } = await fresh(W, (q) => { n++; return n === 2 ? { status: 500, json: { error: { message: 'boom' } } } : { status: 200, json: { choices: [{ message: { content: 'Ответ ' + n + ': Очумелов идёт по площади.' } }] } }; });
  /* без ключа кнопка в шапке ведёт к ключу */
  await p.evaluate(async () => { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); });
  const hb = await p.evaluate(() => { const b = el('btnAiChat').getBoundingClientRect(), h = document.querySelector('#reader .rhead').getBoundingClientRect(), t = el('rTitle').getBoundingClientRect(); return { w: Math.round(b.width), r: Math.round(b.right), vw: innerWidth, hr: Math.round(h.right), tw: Math.round(t.width) }; });
  ok('chat ' + W + ': кнопка «Обсудить книгу» в шапке читалки, 44px, на экране', hb.w >= 44 && hb.r <= hb.vw && hb.tw > 40, hb);
  await p.evaluate(() => { revealChrome && revealChrome(); }).catch(() => {});
  await p.evaluate(() => el('btnAiChat').click()); await sleep(300);
  const nk = await sheetText(p);
  ok('chat ' + W + ': без ключа — окно про ключ, чат не открыт', nk.open && nk.set && await p.evaluate(() => el('aiChat').classList.contains('hidden')), nk);
  await p.evaluate(() => { el('aiSheet').classList.add('hidden'); S.ai.key = 'sk-chat'; save(); goPage(2); });
  await sleep(800);
  await p.evaluate(() => el('btnAiChat').click()); await sleep(300);
  const c0 = await p.evaluate(() => ({ open: !el('aiChat').classList.contains('hidden'), chips: [...el('aiChatChips').querySelectorAll('button')].map(b => b.textContent), sub: el('aiChatSub').textContent, empty: el('aiChatLog').textContent }));
  ok('chat ' + W + ': пустой чат — подсказка и быстрые вопросы', c0.open && c0.chips.length === 3 && /Хамелеон/.test(c0.sub) && /спойлерить не будет/.test(c0.empty), c0);
  await shot(p, W + '-7-chat-pusto');
  await p.evaluate(() => el('aiChatChips').querySelector('button').click());
  await p.waitForFunction(() => !el('aiChatLog').querySelector('.w'), { timeout: 15000 }).catch(() => {});
  const q = reqs[0] || {}; const m = (q.body && q.body.messages) || [];
  const page = await p.evaluate(() => ({ page: R.page, n: R.pageCount, txt: el('content').textContent.replace(/\s+/g, ' ') }));
  const sys = (m[0] && m[0].content) || '';
  const endIdx = Math.ceil(page.txt.length * (page.page + 1) / page.n);
  const after = page.txt.slice(endIdx + 50, endIdx + 120);
  ok('chat ' + W + ': в запросе system с книгой и «без спойлеров», текст до текущей страницы и не дальше, вопрос человека', m[0] && m[0].role === 'system' && /Хамелеон/.test(sys) && /спойлер/.test(sys) && sys.indexOf(page.txt.slice(Math.max(0, endIdx - 200), endIdx - 100)) > 0 && (after.length < 20 || sys.indexOf(after) < 0) && m[1] && m[1].role === 'user' && m[1].content === 'Напомни, что было', { page: page.page, n: page.n, len: sys.length, last: m[m.length - 1] });
  const log1 = await p.evaluate(() => [...el('aiChatLog').querySelectorAll('.cm')].map(e => e.className + ':' + e.textContent));
  ok('chat ' + W + ': в переписке вопрос и ответ', log1.length === 2 && /u:Напомни/.test(log1[0]) && /a:Ответ 1/.test(log1[1]), log1);
  /* второй вопрос — ошибка, «Ещё раз» — ответ; в запросе вся история */
  await p.type('#aiChatIn', 'А кто такой Хрюкин?'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => !el('aiChatLog').querySelector('.w'), { timeout: 15000 }).catch(() => {});
  const e1 = await p.evaluate(() => el('aiChatLog').textContent);
  ok('chat ' + W + ': ошибка сервиса — понятный текст и «Ещё раз», вопрос не потерян', /Не получилось ответить: boom/.test(e1) && /Хрюкин/.test(e1) && !!(await p.$('#aiChatRetry')), e1.slice(-120));
  await shot(p, W + '-8-chat-oshibka');
  await p.click('#aiChatRetry'); await p.waitForFunction(() => !el('aiChatLog').querySelector('.w'), { timeout: 15000 }).catch(() => {});
  const q3 = reqs[2] || {}; const m3 = (q3.body && q3.body.messages) || [];
  ok('chat ' + W + ': «Ещё раз» — ответ; в запросе история u/a/u по очереди', m3.map(x => x.role).join(',') === 'system,user,assistant,user' && /Хрюкин/.test(m3[3].content) && /Ответ 3/.test(await p.evaluate(() => el('aiChatLog').textContent)), m3.map(x => x.role));
  await shot(p, W + '-9-chat');
  const st = await p.evaluate(() => ({ chat: S.aiChat[R.book.id], xp: S.xp, gold: S.gold }));
  ok('chat ' + W + ': переписка в S.aiChat[книга] (4 сообщения), опыт и монеты 0', st.chat.length === 4 && st.chat.every(x => /^[ua]$/.test(x.r) && x.t && /^\d{4}-/.test(x.d)) && st.xp === 0 && st.gold === 0, st);
  /* системный «назад» закрывает чат, книга остаётся открытой */
  if (W === 390) {
    await p.evaluate(() => { navPush('reader'); });
    await p.goBack().catch(() => {}); await sleep(500);
    const b = await p.evaluate(() => ({ chat: el('aiChat').classList.contains('hidden'), reader: readerIsOpen() }));
    ok('chat: системный «назад» закрывает чат, книга открыта', b.chat && b.reader, b);
    /* после перезагрузки переписка на месте; экспорт/импорт */
    await p.evaluate(async () => { await closeReader(); });
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
    const r = await p.evaluate(async () => {
      const id = BOOKS[0].id, n0 = (S.aiChat[id] || []).length;
      const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
      const inExp = exp.progress && exp.progress.aiChat && (exp.progress.aiChat[id] || []).length;
      const f = JSON.parse(JSON.stringify(exp)); f.progress.aiChat = { [id]: [{ r: 'u', t: 'x' }, { r: 'zz', t: 'плохо' }, { r: 'a', t: 5 }], bad: 'нет' };
      await __rq.importBackup(f); const after = __rq.loadEnvelope().progress.aiChat;
      return { n0, inExp, after };
    });
    ok('chat: после перезагрузки 4 сообщения, они в экспорте; импорт отбрасывает битые сообщения', r.n0 === 4 && r.inExp === 4 && JSON.stringify(r.after) === JSON.stringify({ [await p.evaluate(() => BOOKS[0].id)]: [{ r: 'u', t: 'x', d: '' }] }), r);
    /* «Очистить» */
    await p.evaluate(async () => { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 1500)); S.aiChat[R.book.id] = [{ r: 'u', t: 'q', d: '' }]; el('btnAiChat').click(); await new Promise(r => setTimeout(r, 200)); el('aiChatClear').click(); await new Promise(r => setTimeout(r, 300)); el('rqAskOk').click(); await new Promise(r => setTimeout(r, 300)); });
    const cl = await p.evaluate(() => ({ has: !!S.aiChat[R.book.id], btn: el('aiChatClear').hidden }));
    ok('chat: «Очистить» удаляет переписку по книге', !cl.has && cl.btn, cl);
  }
  await ctx.close();
}

/* озвучка: короткий WAV вместо mp3 (Chromium узнаёт формат по содержимому) */
function wav(sec) {
  const rate = 8000, n = Math.floor(rate * sec), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b;
}
if (want('tts')) for (const W of [360, 390]) {
  let fail = 0;
  const { ctx, p, reqs } = await fresh(W, (q) => {
    if (fail) return { status: 401, json: { error: { message: 'Incorrect API key' } } };
    if (/texttospeech/.test(q.url)) return { status: 200, json: { audioContent: wav(0.3).toString('base64') } };
    return { status: 200, raw: wav(0.4), type: 'audio/wav' };
  });
  const d = await p.evaluate(() => { NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); const on = el('ttsProvSeg').querySelector('button.on'); return { prov: on && on.textContent, fields: el('ttsFields').hidden, sai: JSON.parse(JSON.stringify(S.tts)) }; });
  ok('tts ' + W + ': по умолчанию «Телефон», полей ключа не видно', d.prov === 'Телефон' && d.fields && d.sai.prov === 'system', d);
  await p.evaluate(() => [...el('ttsProvSeg').querySelectorAll('button')].find(b => b.textContent === 'OpenAI').click());
  await p.type('#ttsKey', 'sk-tts'); await sleep(100);
  await p.evaluate(() => el('ttsHead').scrollIntoView({ block: 'start' }));
  await p.click('#ttsTest'); await p.waitForFunction(() => /Работает|Не работает|нажмите/.test(el('ttsTestRes').textContent), { timeout: 10000 }).catch(() => {});
  const tr = await p.evaluate(() => el('ttsTestRes').textContent);
  const q0 = reqs[0] || {};
  ok('tts ' + W + ': «Послушать» → запрос в api.openai.com/v1/audio/speech (ключ, gpt-4o-mini-tts, nova) и «Работает»', /^Работает/.test(tr) && q0.url === 'https://api.openai.com/v1/audio/speech' && q0.headers.authorization === 'Bearer sk-tts' && q0.body.model === 'gpt-4o-mini-tts' && q0.body.voice === 'nova' && /Здравствуйте/.test(q0.body.input), { tr, url: q0.url, body: q0.body });
  await shot(p, W + '-10-ozvuchka');
  /* книга: «Озвучка» читает кусками, следующий кусок заказывается заранее, страницы листаются, минуты не идут */
  const n0 = reqs.length;
  await p.evaluate(async () => { closeGeneralSettings(); openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); });
  const p0 = await p.evaluate(() => R.page);
  await p.evaluate(() => el('btnTts').click());
  await sleep(2500);
  const st = await p.evaluate(() => ({ on: ttsOn, pressed: el('btnTts').getAttribute('aria-pressed'), page: R.page, pos: R.ttsPos, len: R.book.text.length }));
  const speech = reqs.slice(n0).filter(q => /audio\/speech/.test(q.url));
  ok('tts ' + W + ': «Озвучка» играет нейроголос (короткая книга — до конца); ушло ≥ 3 запросов кусками ≤ 1720 знаков, по порядку текста', st.on && st.pressed === 'true' && speech.length >= 3 && speech.every(q => q.body.input.length <= 1720) && st.pos > 0, { st, n: speech.length, lens: speech.map(q => q.body.input.length) });
  const b0 = await p.evaluate(() => R.book.text);
  ok('tts ' + W + ': куски идут подряд без пропусков', speech.length >= 2 && b0.indexOf(speech[0].body.input) >= 0 && b0.indexOf(speech[1].body.input) === b0.indexOf(speech[0].body.input) + speech[0].body.input.length, speech.slice(0, 2).map(q => q.body.input.slice(0, 40)));
  ok('tts ' + W + ': страницы перелистываются вслед за голосом', st.page > p0, { p0, page: st.page });
  await p.evaluate(() => el('btnTts').click()); await sleep(300);
  const s2 = await p.evaluate(() => ({ on: ttsOn, paused: !nttsAudio || nttsAudio.paused, pressed: el('btnTts').getAttribute('aria-pressed') }));
  ok('tts ' + W + ': повторное нажатие останавливает звук', !s2.on && s2.paused && s2.pressed === 'false', s2);
  /* ошибка ключа — понятный текст, озвучка выключена, страница вернулась */
  fail = 1;
  await p.evaluate(async () => { NTTS_CACHE.clear(); goPage(1, false); await new Promise(r => setTimeout(r, 600)); }); /* книга короткая и дочитана голосом до конца */
  const pg1 = await p.evaluate(() => R.page);
  await p.evaluate(() => el('btnTts').click()); await sleep(1200);
  const s3 = await p.evaluate(() => ({ on: ttsOn, page: R.page, toast: [...document.querySelectorAll('.toast,#toast,.flash,[class*=toast]')].map(e => e.textContent).join('|') }));
  ok('tts ' + W + ': ключ не принят — озвучка выключилась, страница на месте, сообщение «сервис не принял ключ»', !s3.on && s3.page === pg1 && /не принял ключ/.test(s3.toast), s3);
  await ctx.close();
}
if (want('tts')) {
  const { ctx, p, reqs } = await fresh(390, (q) => /texttospeech/.test(q.url) ? { status: 200, json: { audioContent: wav(0.3).toString('base64') } } : { status: 200, raw: wav(0.3), type: 'audio/mpeg' });
  await p.evaluate(() => { S.tts = { prov: 'elevenlabs', key: 'xi-1', voice: '', base: '' }; save(); });
  const a = await p.evaluate(async () => { try { const b = await nttsFetch('Привет'); return b.size; } catch (e) { return e.message; } });
  const q = reqs[0] || {};
  ok('tts: ElevenLabs — xi-api-key, голос по умолчанию в адресе, eleven_multilingual_v2', a > 0 && /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/JBFqnCBsd6RMkjVDRZzb\?/.test(q.url) && q.headers['xi-api-key'] === 'xi-1' && q.body.model_id === 'eleven_multilingual_v2' && q.body.text === 'Привет', { a, url: q.url });
  await p.evaluate(() => { S.tts = { prov: 'google', key: 'g-1', voice: 'ru-RU-Wavenet-A', base: '' }; save(); });
  const g = await p.evaluate(async () => { try { const b = await nttsFetch('Привет'); return b.size + ':' + b.type; } catch (e) { return e.message; } });
  const q2 = reqs[1] || {};
  ok('tts: Google — ключ в адресе, ru-RU и голос, ответ base64 → звук', /^\d+:audio\/mpeg$/.test(g) && q2.url === 'https://texttospeech.googleapis.com/v1/text:synthesize?key=g-1' && q2.body.voice.languageCode === 'ru-RU' && q2.body.voice.name === 'ru-RU-Wavenet-A', { g, url: q2.url });
  await p.evaluate(() => { S.tts = { prov: 'openai', key: '', voice: '', base: '' }; S.ai = { prov: 'openai', key: 'sk-ai', model: '', base: '' }; save(); });
  const sh = await p.evaluate(() => ({ on: nttsOn(), key: nttsCfg().key }));
  ok('tts: OpenAI без своего ключа берёт ключ ИИ-помощника (тоже OpenAI)', sh.on && sh.key === 'sk-ai', sh);
  const r = await p.evaluate(async () => {
    const n1 = ttsNorm({ prov: 'zzz', key: 5 }), n2 = ttsNorm(null);
    S.tts = { prov: 'elevenlabs', key: 'xi-OWN', voice: 'v1', base: '' }; save(); await new Promise(r => setTimeout(r, 300));
    const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
    const raw = JSON.stringify(exp).indexOf('xi-OWN') >= 0, e = exp.game.tts;
    const f = JSON.parse(JSON.stringify(exp)); f.game.tts = { prov: 'openai', key: 'sk-FOREIGN', voice: 'x', base: '' };
    await __rq.importBackup(f); const after = __rq.loadEnvelope().game.tts;
    return { n1, n2, raw, e, after };
  });
  ok('tts data: нормализация (мусор → «Телефон», строки), экспорт без ключа, импорт оставляет свой ключ и сервис', r.n1.prov === 'system' && r.n1.key === '' && r.n2.prov === 'system' && !r.raw && r.e.key === '' && r.e.prov === 'elevenlabs' && r.after.key === 'xi-OWN' && r.after.prov === 'elevenlabs', r);
  await ctx.close();
}

if (want('compact')) for (const W of [360, 390]) {
  const { ctx, p } = await fresh(W);
  const r = await p.evaluate(async () => {
    openGeneralSettings(false); el('aiHead').scrollIntoView({ block: 'start' });
    const h = (e) => Math.round(e.getBoundingClientRect().height), card = el('aiX').parentElement;
    const r0 = { cardH: h(card), ai: el('aiCard').hidden, tts: el('ttsCard').hidden, aiRow: el('aiX').textContent, ttsRow: el('ttsHead').textContent };
    el('aiX').click(); await new Promise(r => setTimeout(r, 50));
    const r1 = { ai: el('aiCard').hidden, list: el('aiProvSeg').hidden, pick: el('aiProvX').textContent, key: h(el('aiKey')) };
    el('aiProvX').click(); const r2 = { list: el('aiProvSeg').hidden, n: el('aiProvSeg').querySelectorAll('button').length };
    [...el('aiProvSeg').querySelectorAll('button')].find(b => b.textContent === 'Claude').click();
    const r3 = { list: el('aiProvSeg').hidden, pick: el('aiProvX').textContent, prov: S.ai.prov, open: !el('aiCard').hidden };
    return { r0, r1, r2, r3 };
  });
  ok('compact ' + W + ': «Нейросети» — три строки (ИИ, озвучка, перевод), всё свёрнуто, карточка не выше 210px', r.r0.ai && r.r0.tts && r.r0.cardH <= 210 && /ИИ-помощник.*Нет ключа/.test(r.r0.aiRow) && /Озвучка.*Телефон/.test(r.r0.ttsRow), r.r0);
  ok('compact ' + W + ': строка ИИ раскрывается; список сервисов скрыт за кнопкой «Сервис DeepSeek»', !r.r1.ai && r.r1.list && /Сервис\s*DeepSeek/.test(r.r1.pick) && r.r1.key > 0, r.r1);
  ok('compact ' + W + ': «Сервис» раскрывает 5 сервисов, выбор сворачивает список и меняет сервис', !r.r2.list && r.r2.n === 5 && r.r3.list && /Claude/.test(r.r3.pick) && r.r3.prov === 'anthropic' && r.r3.open, { r2: r.r2, r3: r.r3 });
  await p.evaluate(() => { NN_EXP.ai = false; renderNn(); el('aiHead').scrollIntoView({ block: 'start' }); }); await sleep(150);
  await shot(p, W + '-13-neyroseti-svernuto');
  await p.evaluate(() => { NN_EXP.ai = true; NN_EXP.aiP = true; renderNn(); el('aiHead').scrollIntoView({ block: 'start' }); }); await sleep(150);
  await shot(p, W + '-14-neyroseti-servis');
  await ctx.close();
}
if (want('keyhow')) for (const W of [360, 390]) {
  const { ctx, p } = await fresh(W);
  const r = await p.evaluate(async () => {
    NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); const out = {};
    for (const b of [...el('aiProvSeg').querySelectorAll('button')]) { b.click(); out['ai:' + b.textContent] = { t: el('aiHowB').textContent, a: (el('aiHowB').querySelector('a') || {}).href || '', tgt: (el('aiHowB').querySelector('a') || {}).target || '' }; }
    for (const b of [...el('ttsProvSeg').querySelectorAll('button')]) { b.click(); out['tts:' + b.textContent] = { t: el('ttsHowB').textContent, a: (el('ttsHowB').querySelector('a') || {}).href || '' }; }
    return out;
  });
  const want_ = { 'ai:DeepSeek': 'platform.deepseek.com', 'ai:OpenRouter': 'openrouter.ai', 'ai:OpenAI': 'platform.openai.com', 'ai:Claude': 'console.anthropic.com', 'tts:OpenAI': 'platform.openai.com', 'tts:ElevenLabs': 'elevenlabs.io', 'tts:Google': 'console.cloud.google.com' };
  const bad = Object.keys(want_).filter(k => !r[k] || r[k].a.indexOf('https://' + want_[k]) !== 0 || !/как пароль/.test(r[k].t));
  ok('keyhow ' + W + ': у каждого сервиса шаги, ссылка на страницу ключей и совет про пароль', !bad.length && r['ai:DeepSeek'].tgt === '_blank' && /Проверить ключ/.test(r['ai:DeepSeek'].t) && /Послушать/.test(r['tts:OpenAI'].t) && r['ai:Другой'].a === '' && /адрес API/.test(r['ai:Другой'].t), { bad, deep: r['ai:DeepSeek'] });
  await p.evaluate(() => { [...el('aiProvSeg').querySelectorAll('button')][0].click(); el('aiHow').open = true; el('aiHead').scrollIntoView({ block: 'start' }); });
  await sleep(200);
  const ov = await p.evaluate(() => { const c = el('aiCard').getBoundingClientRect(); return [...el('aiCard').querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > c.right + 1 || b.left < c.left - 1); }).map(e => e.tagName + '.' + e.className).slice(0, 5); });
  ok('keyhow ' + W + ': раскрытая инструкция не вылезает за карточку', ov.length === 0, ov);
  await shot(p, W + '-11-kak-poluchit-klyuch');
  await p.evaluate(() => { [...el('ttsProvSeg').querySelectorAll('button')].find(b => b.textContent === 'Google').click(); el('ttsHow').open = true; el('ttsHead').scrollIntoView({ block: 'start' }); });
  await sleep(200); await shot(p, W + '-12-kak-poluchit-klyuch-ozvuchka');
  await ctx.close();
}
if (want('keyhow')) {
  const { ctx, p } = await fresh(390);
  await openAndSelect(p); await p.click('#spAI'); await sleep(300); await p.click('#aiOpenSet'); await sleep(500);
  ok('keyhow: «Открыть настройки» из окна без ключа сразу раскрывает инструкцию', await p.evaluate(() => el('aiHow').open));
  await ctx.close();
}

/* rows (Джессика 21.10 «плашки сходят с ума»): при любом сервисе и крупном шрифте название строки («ИИ-помощник», «Озвучка») не сжимается */
if (want('rows')) for (const sk of ['', 'ellada', 'babochkovyi', 'celestial', 'pencil']) for (const fs of [16, 19]) {
  const { ctx, p } = await fresh(360);
  const r = await p.evaluate(async (sk, fs) => {
    if (sk) { S.gold = 2000; save(); buy('skin-' + sk); wear('skin-' + sk); }
    document.documentElement.style.fontSize = fs + 'px';
    NN_EXP.ai = NN_EXP.tts = true; openGeneralSettings(false); await new Promise(r => setTimeout(r, 200));
    const bad = [];
    const chk = (tag) => { for (const id of ['aiX', 'ttsHead']) { const t = el(id).querySelector('.xt'), v = el(id).querySelector('.xv');
      if (t.scrollWidth > t.clientWidth + 1 || v.scrollWidth > v.clientWidth + 1 || el(id).getBoundingClientRect().height > 60) bad.push(tag + ' ' + id + ': ' + t.textContent + ' ' + t.clientWidth + '/' + t.scrollWidth + ' | ' + v.textContent); } };
    for (const b of [...el('aiProvSeg').querySelectorAll('button')]) { b.click(); S.ai.key = ''; renderNn(); chk('ai ' + b.textContent); S.ai.key = 'sk-x'; renderNn(); chk('ai+key ' + b.textContent); }
    for (const b of [...el('ttsProvSeg').querySelectorAll('button')]) { b.click(); chk('tts ' + b.textContent); }
    return bad;
  }, sk, fs);
  ok('rows ' + (sk || 'base') + ' ' + fs + 'px: названия строк целиком при любом сервисе и с ключом и без', r.length === 0, r.slice(0, 4));
  await ctx.close();
}

/* skins (Джессика 20.10: «у каждого скина всё уникально»): «Нейросети», «Объясни» и чат — свой вид в каждом скине, текст читается, 360 влезает */
const SKINS = ['ellada', 'babochkovyi', 'celestial', 'pencil'];
const look = (p) => p.evaluate(() => {
  const rgb = (s) => (s.match(/rgba?\([^)]*\)/g) || []).map(c => c.match(/[\d.]+/g).map(Number)).filter(c => c.length < 4 || c[3] > 0.5);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgs = (e) => { for (let n = e; n; n = n.parentElement) { const cs = getComputedStyle(n); const g = n === document.documentElement ? [] : rgb(cs.backgroundImage.replace(/url\([^)]*\)/g, '')); const b = rgb(cs.backgroundColor); if (g.length || b.length) return g.concat(b); } return [[255, 255, 255]]; };
  const cr = (e) => { if (!e) return 0; const t = rgb(getComputedStyle(e).color)[0]; return Math.min(...bgs(e).map(b => { const a = lum(t), c = lum(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); })); };
  const cs = (q, k) => { const e = document.querySelector(q); return e ? getComputedStyle(e)[k] : ''; };
  const pick = (q) => document.querySelector(q);
  return { u: cs('#aiChatLog .cm.u', 'backgroundImage') + '|' + cs('#aiChatLog .cm.u', 'backgroundColor') + '|' + cs('#aiChatLog .cm.u', 'borderRadius'),
    h: cs('#aiChatH', 'fontFamily'), row: cs('#aiX', 'backgroundImage') + '|' + cs('#aiX', 'backgroundColor') + '|' + cs('#aiX', 'borderRadius'),
    send: cs('#aiChatSend', 'borderRadius') + '|' + cs('#aiChatSend', 'backgroundColor') + '|' + cs('#aiChatSend', 'backgroundImage') + '|' + cs('#aiChatSend', 'color'),
    th: document.documentElement.dataset.theme || 'day', c: { u: cr(pick('#aiChatLog .cm.u')), a: cr(pick('#aiChatLog .cm.a')), xt: cr(pick('#aiX .xt')), xsub: cr(pick('#aiX .xsub')), xv: cr(pick('#aiX .xv')), how: cr(pick('#aiHow > summary')), q: cr(pick('#aiBody .ai-a')) } };
});
if (want('skins')) {
  const seen = {};
  for (const sk of SKINS) for (const W of [360, 390]) {
    const { ctx, p } = await fresh(W, () => ({ status: 200, json: { choices: [{ message: { content: 'Хамелеон — человек, который меняет мнение под начальство. Очумелов то ругает собаку, то хвалит.' } }] } }));
    await p.evaluate((sk) => { S.gold = 2000; S.ai.key = 'sk-skin'; save(); buy('skin-' + sk); wear('skin-' + sk); }, sk); await sleep(400);
    const views = W === 390 ? ['day', 'night'] : ['day'];
    for (const v of views) {
      const setTh = () => p.evaluate((sk, n) => { SET.theme = skinThemeKey(sk, n); SET.cBg = null; SET.cTxt = null; saveSet(); applySet(); }, sk, v === 'night');
      await setTh(); await sleep(300);
      const th = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme || 'day' }));
      /* настройки: ИИ раскрыт, инструкция открыта */
      await p.evaluate(() => { NN_EXP.ai = true; NN_EXP.tts = false; openGeneralSettings(false); el('aiHow').open = true; el('aiHead').scrollIntoView({ block: 'start' }); }); await sleep(300);
      const ov = await p.evaluate(() => { const c = document.querySelector('.nncard').getBoundingClientRect(); return [...document.querySelectorAll('.nncard *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > c.right + 1 || b.left < c.left - 1); }).map(e => e.tagName + '.' + e.className).slice(0, 4); });
      await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-neyroseti');
      /* «Объясни» */
      await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; });
      await p.evaluate(async () => { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); }); await setTh(); await sleep(300);
      await openAndSelect(p, 'Очумелов', true); await p.evaluate(() => el('spAI').click()); /* click without coordinates (keyboard) must not hit the day/night corner */ await waitAnswer(p); await sleep(200);
      await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-obyasni');
      /* чат с перепиской */
      await p.evaluate(() => { el('aiSheet').classList.add('hidden'); S.aiChat[R.book.id] = [{ r: 'u', t: 'Кто такой Очумелов?', d: '2026-10-20' }, { r: 'a', t: 'Полицейский надзиратель. Он меняет мнение о собаке каждый раз, когда слышит, чья она.', d: '2026-10-20' }, { r: 'u', t: 'А Хрюкин?', d: '2026-10-20' }]; save(); openAiChat(); }); await sleep(300);
      const r = await look(p);
      const ovc = await p.evaluate(() => { const c = el('aiChat').getBoundingClientRect(); return [...el('aiChat').querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > c.right + 1 || b.left < c.left - 1); }).map(e => e.tagName + '.' + e.className).slice(0, 4); });
      await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-chat');
      const low = Object.entries(r.c).filter(([k, x]) => x < 4.5);
      ok('skins ' + sk + ' ' + v + ' ' + W + ': скин и тема те, текст в строках, инструкции, ответе и чате ≥ 4.5', th.skin === sk && th.theme === v && r.th === v && !low.length, { th, rth: r.th, c: r.c });
      ok('skins ' + sk + ' ' + v + ' ' + W + ': «Нейросети» и чат не вылезают за край', !ov.length && !ovc.length, { ov, ovc });
      if (v === 'day' && W === 390) seen[sk] = r;
    }
    await ctx.close();
  }
  const keys = ['u', 'h', 'row', 'send'];
  const same = keys.filter(k => new Set(SKINS.map(s => seen[s] && seen[s][k])).size < SKINS.length);
  ok('skins: у каждого скина своё — строка, заголовок чата, реплика человека, кнопка «Отправить»', !same.length, { same, seen: Object.fromEntries(SKINS.map(s => [s, seen[s] && { u: seen[s].u, h: seen[s].h, row: seen[s].row, send: seen[s].send }])) });
}

ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY ai.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
