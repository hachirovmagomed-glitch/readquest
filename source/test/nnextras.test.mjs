// 29.10 «Нейросети» (Джессика: «Делай всё»): сводка и «Проверить всё», подключение за минуту, модели и голоса списком, как отвечает ИИ,
// «Без спойлеров», расход и лимит в день, язык перевода, «Стереть все ключи»; S.aiPref (arch.md 29.10). Сеть подменена: настоящих запросов нет.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node nnextras.test.mjs
import puppeteer from 'puppeteer-core';
import { normAiPref } from '../storage/schema.js';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
/* fake services: chat answers «готово», /models lists three, voices; every request body is kept */
await p.evaluate(() => { window.__reqs = []; const f0 = window.fetch; window.fetch = async (u, o) => { u = String(u); if (!/^https:\/\/(api\.deepseek|api\.openai|api\.elevenlabs|texttospeech)/.test(u)) return f0(u, o);
  window.__reqs.push({ u, b: o && o.body ? JSON.parse(o.body) : null }); const J = (d) => new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (/\/models$/.test(u)) return J({ data: [{ id: 'deepseek-chat' }, { id: 'deepseek-reasoner' }, { id: 'deepseek-coder' }] });
  if (/elevenlabs.*voices/.test(u)) return J({ voices: [{ voice_id: 'v1', name: 'Анна' }, { voice_id: 'v2', name: 'Борис' }] });
  if (/audio\/speech|text-to-speech/.test(u)) return new Response(new Blob([new Uint8Array(200)], { type: 'audio/mpeg' }), { status: 200 });
  return J({ choices: [{ message: { content: 'готово' } }] }); }; });

// 1. normalisation
const J = { len: 'huge', tone: 'expert', lang: 'book', spoil: 'no', lim: 9999, use: { m: '2026-10', n: 5, ch: -1, d: 'x', dn: 2.5 }, trTo: 'de', extra: 1 };
let r = await p.evaluate((J) => ({ a: aiPrefNorm(J), d: S.aiPref }), J);
ok('1 aiPrefNorm = schema normAiPref; junk → default, lim ≤ 500', JSON.stringify(r.a) === JSON.stringify(normAiPref(J)) && r.a.len === 'short' && r.a.tone === 'expert' && r.a.lang === 'book' && r.a.spoil === true && r.a.lim === 500 && r.a.use.n === 5 && r.a.use.ch === 0 && r.a.use.dn === 0 && r.a.trTo === 'de' && !('extra' in r.a), r.a);
ok('1 a fresh start: short, simple, Russian, no spoilers, no limit', r.d && r.d.len === 'short' && r.d.tone === 'simple' && r.d.lang === 'ru' && r.d.spoil && r.d.lim === 0, r.d);

// 2. section: summary on top, the cards below
await p.evaluate(async () => { S.ai.prov = 'deepseek'; S.ai.key = ''; save(); NN_EXP.ai = true; openGeneralSettings(false, 'ai'); await new Promise(r => setTimeout(r, 300)); });
r = await p.evaluate(() => ({ sum: [...document.querySelectorAll('#nnSum .nnsrow .lab')].map(x => x.firstChild.textContent), ai: document.querySelector('#nnSum .nnsrow .sub').textContent,
  h: [...document.querySelectorAll('#settings .gsec[data-sec="ai"] h2')].filter(x => x.offsetParent).map(x => x.textContent), get: !el('aiGetKey').hidden && el('aiGetKey').textContent, paste: el('aiPaste').textContent }));
ok('2 summary: ИИ / Озвучка / Перевод, «Нет ключа»; then «Как отвечает ИИ», «Расход», «Приватность»', r.sum.join() === 'ИИ-помощник,Озвучка,Перевод' && /Нет ключа/.test(r.ai) && r.h.filter(x => x !== 'Нейросети').join() === 'Как отвечает ИИ,Расход,Приватность', r);
ok('2 «1. Получить ключ» and «2. Вставить из буфера» under the service', r.get === '1. Получить ключ' && r.paste === '2. Вставить из буфера', r);

// 3. paste from the clipboard → key saved and checked at once; «Проверить всё» marks the summary
r = await p.evaluate(async () => { Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => '  sk-abcdefghijklmnop  ' }, configurable: true });
  el('aiPaste').click(); await new Promise(r => setTimeout(r, 400)); const a = { key: S.ai.key, res: el('aiTestRes').textContent, sum: document.querySelector('#nnSum .nnsrow .sub').textContent };
  el('nnCheckAll').click(); await new Promise(r => setTimeout(r, 600)); a.sum2 = document.querySelector('#nnSum .nnsrow .sub').textContent; return a; });
ok('3 «Вставить из буфера» → key trimmed, «Проверить ключ» runs, summary «ключ работает»', r.key === 'sk-abcdefghijklmnop' && /^Работает/.test(r.res) && /ключ работает/.test(r.sum) && /ключ работает/.test(r.sum2), r);

// 4. models from the service
r = await p.evaluate(async () => { el('aiModelsBtn').click(); await new Promise(r => setTimeout(r, 300)); const chips = [...el('aiModels').querySelectorAll('.fchip')];
  const a = { n: chips.length, shown: !el('aiModels').hidden }; chips[1].click(); a.model = S.ai.model; a.on = el('aiModels').querySelector('.on') && el('aiModels').querySelector('.on').textContent; return a; });
ok('4 «Модели списком» → three chips; a tap sets the model', r.n === 3 && r.shown && r.model === 'deepseek-coder' && r.on === 'deepseek-coder', r);
await p.evaluate(() => { S.ai.model = ''; save(); });

// 5. how the AI answers + spoilers reach the prompts
r = await p.evaluate(async () => { window.__reqs = []; const P = aiPref(); P.len = 'long'; P.tone = 'expert'; P.lang = 'book'; P.spoil = false;
  const q = { text: 'околоточный', ctx: '', title: 'Хамелеон', author: 'Чехов' }; await aiViaKey(aiMsgs(q), 900); const sys = window.__reqs[0].b.messages[0].content, mt = window.__reqs[0].b.max_tokens;
  const chat = aiChatStyle(); P.len = 'short'; P.tone = 'simple'; P.lang = 'ru'; P.spoil = true; const sys2 = aiSysExplain(); return { sys, mt, chat, sys2 }; });
ok('5 «Подробно» + «Как филолог» + «Язык книги» + spoilers allowed → in the «Объясни» prompt', /Подробно, 5–8/.test(r.sys) && /как филолог/.test(r.sys) && /на языке книги/.test(r.sys) && !/без спойлеров/.test(r.sys) && r.mt === 900, r);
ok('5 defaults → short, simple, Russian, «без спойлеров»', /Коротко, 2–4/.test(r.sys2) && /простым языком/.test(r.sys2) && /по-русски/.test(r.sys2) && /без спойлеров/.test(r.sys2), r.sys2);

// 6. usage and the daily limit
r = await p.evaluate(async () => { const u = nnUse(); const n0 = u.n, d0 = u.dn; await aiViaKey({ system: 'abc', user: 'defg' }, 20); const a = { n: u.n - n0, dn: u.dn - d0, ch: u.ch > 0 };
  aiPref().lim = 10; u.dn = 10; let err = ''; try { await aiViaKey({ system: 'a', user: 'b' }, 20); } catch (e) { err = e.message; } a.err = err; aiPref().lim = 0; u.dn = 0;
  nnUseRender(); a.txt = el('nnUseAi').textContent; return a; });
ok('6 every request counts (month and today); the daily limit stops the 11th with a clear message', r.n === 1 && r.dn === 1 && r.ch && /лимит 10 запросов/.test(r.err) && /запрос/.test(r.txt), r);
r = await p.evaluate(() => { el('nnLimPlus').click(); el('nnLimPlus').click(); const a = aiPref().lim; el('nnLimMinus').click(); return [a, aiPref().lim, el('nnLimV').textContent]; });
ok('6 limit stepper: нет → 10 → 20, back to 10', r[0] === 20 && r[1] === 10 && r[2] === '10', r);

// 7. voices: OpenAI list from the app, ElevenLabs from the service; a tap sets the voice and plays
r = await p.evaluate(async () => { NN_EXP.tts = true; S.tts.prov = 'elevenlabs'; S.tts.key = 'el-key-123456'; save(); renderTtsSet(); renderNn();
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  el('ttsVoicesBtn').click(); await new Promise(r => setTimeout(r, 300)); const chips = [...el('ttsVoices').querySelectorAll('.fchip')].map(b => b.textContent);
  el('ttsVoices').querySelectorAll('.fchip')[1].click(); await new Promise(r => setTimeout(r, 400)); return { chips, voice: S.tts.voice, played: window.__reqs.some(x => /text-to-speech\/v2/.test(x.u)) }; });
ok('7 «Голоса списком» (ElevenLabs) → names; a tap sets the voice and says a phrase', r.chips.join() === 'Анна,Борис' && r.voice === 'v2' && r.played, r);

// 8. translation language
r = await p.evaluate(() => { aiPref().trTo = 'de'; const a = [trTo('en'), trTo('ru')]; aiPref().trTo = ''; a.push(trTo('en')); return a; });
ok('8 «Переводить на: Немецкий» → foreign and Russian text go to German; default as before', r[0] === 'de' && r[1] === 'de' && r[2] === 'ru', r);

// 9. privacy: wipe the keys
r = await p.evaluate(async () => { el('nnWipe').click(); await new Promise(r => setTimeout(r, 300)); const b = document.querySelector('#rqAskOk'); if (b) b.click(); await new Promise(r => setTimeout(r, 300));
  return { ai: S.ai.key, tts: S.tts.key, txt: el('nnPriv').textContent }; });
ok('9 «Стереть все ключи» clears both keys; the card says what goes to the service', r.ai === '' && r.tts === '' && /Что уходит в сервис/.test(r.txt) && /не попадают в резервную копию/.test(r.txt), r);

ok('no page errors', !p.errs.length, p.errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY nnextras.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
