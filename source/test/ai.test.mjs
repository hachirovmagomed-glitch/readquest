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
    if (/^https:\/\/(api\.deepseek\.com|openrouter\.ai|api\.openai\.com|api\.anthropic\.com|ai\.example\.test)\//.test(u)) {
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: CORS, body: '' });
      const q = { url: u, headers: r.headers(), body: (() => { try { return JSON.parse(r.postData() || 'null'); } catch (e) { return null; } })() }; reqs.push(q);
      const a = reply ? reply(q) : { status: 500, json: {} };
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
  const d = await p.evaluate(() => { openGeneralSettings(false); const on = el('aiProvSeg').querySelector('button.on'); return { prov: on && on.textContent, base: el('aiBase').hidden, ph: el('aiModel').placeholder, sai: JSON.parse(JSON.stringify(S.ai)) }; });
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
  await p.evaluate(() => { openGeneralSettings(false); [...el('aiProvSeg').querySelectorAll('button')].find(b => /Claude/.test(b.textContent)).click(); });
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
  await p.evaluate(() => { openGeneralSettings(false); [...el('aiProvSeg').querySelectorAll('button')].find(b => b.textContent === 'Другой').click(); });
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

ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY ai.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
