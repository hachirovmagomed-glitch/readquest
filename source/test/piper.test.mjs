// 07.11 «Нейроголос» (Piper в телефоне, js/tts-plus.js): скачивание по кнопке, синтез в отдельном потоке, чтение книги.
// Сеть подменена: jsDelivr и Hugging Face отдаются из локальной папки RQ_PIPER_DIR:
//   ort/      ← npm onnxruntime-web@1.18.0 (package/dist)
//   wasm/     ← npm @diffusionstudio/piper-wasm@1.0.0 (package/build)
//   fake/     ← маленькая ONNX-модель с теми же входами, что у голосов Piper, + .onnx.json (настоящий голос 63 МБ из облака не скачать)
// Run: RQ_PIPER_DIR=/dir RQ_URL=http://127.0.0.1:8767/readquest/test/ node piper.test.mjs   [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS || '', DIR = process.env.RQ_PIPER_DIR || '';
if (!DIR || !fs.existsSync(DIR + '/fake')) { console.log('SKIP piper.test: нет RQ_PIPER_DIR'); process.exit(0); }
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i).slice(0, 500) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: (await browser.userAgent()) });
const MAP = [['https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/', DIR + '/ort/package/dist/'], ['https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/', DIR + '/wasm/package/build/'],
  ['https://huggingface.co/diffusionstudio/piper-voices/resolve/main/ru/ru_RU/irina/medium/', DIR + '/fake/']];
const served = [];
await p.setRequestInterception(true);
p.on('request', (r) => { const u = r.url(), m = MAP.find(x => u.indexOf(x[0]) === 0);
  if (!m) { if (/jsdelivr|huggingface/.test(u)) { r.respond({ status: 404, body: '' }); return; } r.continue(); return; }
  const f = m[1] + u.slice(m[0].length); if (!fs.existsSync(f)) { r.respond({ status: 404, body: '' }); return; } served.push(u.split('/').pop());
  r.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Length': String(fs.statSync(f).size) }, contentType: /\.wasm$/.test(f) ? 'application/wasm' : /\.js$/.test(f) ? 'text/javascript' : 'application/octet-stream', body: fs.readFileSync(f) }); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(async () => { try { await caches.delete(PIP_CACHE); } catch (e) {} PIP.have = {}; PIP.eng = false; S.tts.prov = 'piper'; S.tts.voice = 'irina'; save(); openGeneralSettings(false, 'ai'); NN_EXP.tts = true; renderTtsSet(); renderNn(); });
const progSeen = [];
await p.exposeFunction('__prog', (t) => progSeen.push(t));
await p.evaluate(() => { new MutationObserver(() => window.__prog(el('tpPipT').textContent)).observe(el('tpPipT'), { childList: true, characterData: true, subtree: true }); el('tpPipGet').click(); });
await p.waitForFunction(() => PIP.have.irina || /Не скачалось/.test(el('tpPipT').textContent), { timeout: 60000 });
const d1 = await p.evaluate(() => ({ have: PIP.have.irina, t: el('tpPipT').textContent, on: nttsOn(), btn: el('tpPipGet').hidden }));
ok('«Скачать «Ирина»»: движок и голос скачались, прогресс «Скачиваю: N из M МБ»', d1.have && d1.on && progSeen.some(x => /^Скачиваю: \d+ из \d+ МБ$/.test(x)) && served.length === 7, { d1, served, prog: progSeen.slice(-3) });
await p.waitForFunction(() => /^(Работает|Не работает|Голос готов)/.test(el('ttsTestRes').textContent), { timeout: 60000 });
const t1 = await p.evaluate(() => el('ttsTestRes').textContent);
ok('после скачивания сам говорит пробную фразу (поток синтеза, phonemize → onnx → звук)', /^Работает/.test(t1), t1);
if (SHOTS) { await p.evaluate(() => el('ttsHead').scrollIntoView({ block: 'start' })); await sleep(300); await p.screenshot({ path: SHOTS + '/piper-1-skachan.png' }); }
const s1 = await p.evaluate(async () => { const a = await pipSay('Привет.'), b = await pipSay('Это фраза подлиннее, чтобы звука было больше. И ещё одно предложение.'), c = await pipSay('Снова коротко.');
  return { a: a.size, b: b.size, c: c.size, type: a.type, head: new TextDecoder().decode((await a.arrayBuffer()).slice(0, 4)) }; });
ok('синтез повторяется (тот же поток), длина звука растёт с текстом, WAV', s1.type === 'audio/wav' && s1.head === 'RIFF' && s1.b > s1.a * 2 && s1.c > 1000, s1);
const r1 = await p.evaluate(async () => { if (typeof closeGeneralSettings === 'function') closeGeneralSettings(); openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); goPage(2, false);
  await new Promise(r => setTimeout(r, 300)); const p0 = R.ttsPos; el('btnTts').click(); await new Promise(r => setTimeout(r, 6000));
  const r = { on: ttsOn, src: !!(nttsAudio && nttsAudio.currentSrc), pos: TP.pos, p0, bar: !el('tpBar').hidden, sil: !TP.sil || TP.sil.paused }; ttsStop(); return r; });
ok('книга читается нейроголосом в телефоне: звук идёт, голос двигается по тексту, тихий звук не нужен', r1.on && r1.src && r1.pos > 0 && r1.bar && r1.sil, r1);
const del = await p.evaluate(async () => { await pipRemove(); renderTtsSet(); return { on: nttsOn(), btn: el('tpPipGet').hidden, keys: (await caches.keys()).filter(k => /_piper$/.test(k)).length }; });
ok('«Удалить голоса»: кэш пуст, снова кнопка «Скачать», читает голос телефона', !del.on && !del.btn && del.keys === 0, del);
ok('no page errors', errs.length === 0, errs);
console.log('SUMMARY piper.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close(); process.exit(checks.every(Boolean) ? 0 : 1);
