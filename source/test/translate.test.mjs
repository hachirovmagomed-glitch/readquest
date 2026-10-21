// Перевод выделенного на телефоне (21.10, js/translate.js). Нужен сервер, где рядом с /readquest/test/ лежит /readquest/tr/
// (tools/gen-tr-models.py OUT en-ru ru-en de-en): пакеты Mozilla + движок vendor/bergamot.
// need: «文A» открывает «Перевод» с парой языков и кнопкой «Скачать N МБ», ничего не скачано заранее, в Google не уходит;
// dl: скачивание с прогрессом → перевод, пакет в кэше NS_tr; ru→en и en→ru; pivot: немецкий через английский;
// off: без сети (setOfflineMode) перевод работает, движок из кэша; vocab: «В словарь» → vocab[].ex; опыт и монеты не меняются;
// set: Настройки → Нейросети → «Перевод»: число пакетов, удалить; ai: «Через ИИ» на своём ключе; skins: вид в каждом скине.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node translate.test.mjs   [RQ_ONLY=need,…] [RQ_SHOTS=/dir]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
/* пакеты: если сервер их не отдаёт (CI), скачать у Mozilla в dist/tr (сервер отдаёт dist как /readquest/) */
{ const u = new URL('../tr/index.json', BASE).href; let has = false; try { has = (await fetch(u)).ok; } catch (e) {}
  if (!has) { const { execFileSync } = await import('child_process'); const path = await import('path'); const here = path.dirname(new URL(import.meta.url).pathname);
    console.log('no ' + u + ' → tools/gen-tr-models.py dist/tr');
    execFileSync('python3', [path.join(here, '../tools/gen-tr-models.py'), path.join(here, '../dist/tr'), 'en-ru', 'ru-en', 'de-en'], { stdio: 'inherit' }); } }
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const EN = 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little.';
const DE = 'Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt.';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

async function fresh(width, ctx0) {
  const ctx = ctx0 || await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: width || 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  const ext = [];
  await p.setRequestInterception(true);
  p.on('request', r => {
    const u = r.url();
    if (/^https:\/\/api\.deepseek\.com\//.test(u)) {
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: CORS, body: '' });
      ext.push(u); return r.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'Зовите меня Измаил.' } }] }) });
    }
    if (/translate\.google/.test(u)) ext.push(u);
    r.continue();
  });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return { ctx, p, ext };
}
/* открыть книгу и выделить слово (или вставить абзац на другом языке и выделить его целиком) */
async function select(p, word, para, stay) {
  return p.evaluate(async (word, para, stay) => {
    if (!stay) { openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 2500)); }
    const c = el('content'); let hit = null;
    if (para) {
      const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n;
      const vw = el('viewer').getBoundingClientRect();
      while ((n = w.nextNode())) { const b = n.parentElement.getBoundingClientRect(); if (n.textContent.trim().length > 40 && b.top > vw.top + 40 && b.top < vw.bottom - 200) break; }
      n.textContent = para; hit = document.createRange(); hit.selectNodeContents(n);
    } else {
      const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n; const vw = el('viewer').getBoundingClientRect();
      while ((n = w.nextNode())) { const m = n.textContent.indexOf(word); if (m < 0) continue;
        const rg = document.createRange(); rg.setStart(n, m); rg.setEnd(n, m + word.length); const b = rg.getBoundingClientRect();
        if (b.width > 0 && b.left >= vw.left && b.right <= vw.right) { hit = rg; break; } }
    }
    if (!hit) return null;
    const s = getSelection(); s.removeAllRanges(); s.addRange(hit); await new Promise(r => setTimeout(r, 500));
    return String(s);
  }, word || '', para || '', !!stay);
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '.png' }); };
const sheet = (p) => p.evaluate(() => ({ open: !el('trSheet').classList.contains('hidden') && el('trSheet').getBoundingClientRect().height > 100 && getComputedStyle(el('trSheet')).visibility !== 'hidden' && (() => { const b = el('trSheet').getBoundingClientRect(); return el('trSheet').contains(document.elementFromPoint(b.left + b.width / 2, b.top + 20)); })(), t: el('trBody').textContent, pair: (el('trPairB') || {}).textContent || '',
  dl: !!el('trDlB'), dlt: (el('trDlB') || {}).textContent || '', out: (document.querySelector('#trBody .tr-out') || {}).textContent || '', wait: !!document.querySelector('#trBody .ai-wait'), vocab: !!el('trToVocab') }));
const waitOut = (p, ms) => p.waitForFunction(() => document.querySelector('#trBody .tr-out') || document.querySelector('#trBody [role=alert]') || el('trDlB'), { timeout: ms || 120000 }).catch(() => {});
const cached = (p) => p.evaluate(async () => { const c = await caches.open(TR_CACHE); return (await c.keys()).map(r => r.url.replace(/^.*\/readquest\//, '')); });
const econ = (p) => p.evaluate(() => ({ xp: S.xp, gold: S.gold, vocab: (S.vocab || []).length }));

/* need + dl + off + vocab + set: one context (the cache lives across pages of one context) */
if (want('need') || want('dl') || want('off') || want('vocab') || want('set') || want('ai')) {
  const ctx = await browser.createBrowserContext();
  let { p, ext } = await fresh(390, ctx);
  const e0 = await econ(p);
  const s = await select(p, 'Очумелов');
  await p.evaluate(() => el('spDict').click()); await waitOut(p, 20000); await sleep(200);
  let r = await sheet(p);
  ok('need: выделили «' + s + '» → «Перевод», Русский → Английский, кнопка «Скачать N МБ»', r.open && /Русский → Английский/.test(r.pair) && r.dl && /Скачать \d+ МБ/.test(r.dlt), r);
  ok('need: в Google и в сеть с текстом ничего не ушло, заранее ничего не скачано', !ext.length && !(await cached(p)).some(u => /\.gz$|wasm$/.test(u)), { ext, c: await cached(p) });
  await shot(p, '1-paket');
  await p.evaluate(() => el('trDlB').click()); await sleep(150);
  const mid = await sheet(p); await shot(p, '2-skachivanie');
  await waitOut(p); await sleep(200); r = await sheet(p);
  ok('dl: прогресс, потом перевод ru→en', /Скачиваю пакет/.test(mid.t) && /Ochumelov|Ochumel/i.test(r.out), { mid: mid.t.slice(0, 80), out: r.out, t: r.t.slice(0, 300) });
  await shot(p, '3-perevod');
  const c1 = await cached(p);
  ok('dl: в кэше пакет ruen и движок, enru не скачан', c1.some(u => /tr\/ruen\/model/.test(u)) && c1.some(u => /bergamot-translator-worker\.wasm$/.test(u)) && !c1.some(u => /tr\/enru\//.test(u)), c1);
  /* en → ru: другой пакет */
  await p.evaluate(() => el('trSheet').classList.add('hidden'));
  await select(p, '', EN, true); await p.evaluate(() => el('spDict').click()); await waitOut(p, 20000); r = await sheet(p);
  ok('dl: английский абзац → Английский → Русский, просит свой пакет', /Английский → Русский/.test(r.pair) && r.dl, r.pair);
  await p.evaluate(() => el('trDlB').click()); await sleep(300); await waitOut(p); r = await sheet(p);
  ok('dl: en→ru переведено по-русски', /Измаил|Ишмаэл/.test(r.out) && /[а-я]{4}/.test(r.out), r.out);
  await shot(p, '4-en-ru');
  /* смена языка: немецкий через английский (deen + enru) */
  await p.evaluate(() => el('trSheet').classList.add('hidden'));
  await select(p, '', DE, true); await p.evaluate(() => el('spDict').click()); await waitOut(p, 20000); r = await sheet(p);
  ok('dl: немецкий узнан по тексту → Немецкий → Русский, пакет меньше (enru уже есть)', /Немецкий → Русский/.test(r.pair) && r.dl, { pair: r.pair, dl: r.dlt });
  await p.evaluate(() => el('trDlB').click()); await sleep(300); await waitOut(p); r = await sheet(p);
  ok('dl: de→ru через английский', /Грегор|Замза|Самса/.test(r.out), r.out);
  /* выбор языка вручную */
  await p.evaluate(() => el('trPairB').click()); await sleep(100);
  const chips = await p.evaluate(() => [...document.querySelectorAll('#trBody .tr-langs .fchip')].map(b => b.textContent));
  await shot(p, '5-yazyki');
  ok('pick: под парой список языков «с английского», «с немецкого»…', chips.includes('с английского') && chips.includes('с немецкого'), chips);
  if (want('off') || want('vocab')) {
    /* без сети: новая страница того же контекста, офлайн */
    await p.close(); ({ p, ext } = await fresh(390, ctx)); await sleep(500);
    await select(p, 'Очумелов'); await p.setOfflineMode(true);
    await p.evaluate(() => el('spDict').click()); await waitOut(p); r = await sheet(p);
    ok('off: без интернета (новая страница, движок не загружен) перевод ru→en работает', /Ochumel/i.test(r.out) && !r.dl, { t: r.t.slice(0, 160) });
    await p.evaluate(() => el('trSheet').classList.add('hidden'));
    await select(p, 'собака', '', true); await p.evaluate(() => el('spDict').click()); await waitOut(p); r = await sheet(p);
    ok('off: слово «собака» → «dog» и кнопка «В словарь»', /dog/i.test(r.out) && r.vocab, r);
    await p.evaluate(() => el('trToVocab').click()); await sleep(200);
    const v = await p.evaluate(() => (S.vocab || []).find(x => x.w === 'собака'));
    ok('vocab: «В словарь» → vocab с переводом в ex', v && /dog/i.test(v.ex || ''), v);
    await p.setOfflineMode(false);
  }
  const e1 = await econ(p);
  ok('econ: опыт и монеты не изменились', e1.xp === e0.xp && e1.gold === e0.gold, { e0, e1 });
  if (want('set')) {
    await p.evaluate(() => { NN_EXP.tr = true; openGeneralSettings(false); el('aiHead').scrollIntoView({ block: 'start' }); renderTrSet(); }); await sleep(800);
    const st = await p.evaluate(() => ({ row: el('trX').textContent, rows: [...document.querySelectorAll('#trList .tr-row')].map(r => r.textContent) }));
    ok('set: «Перевод» в «Нейросетях»: 3 пакета на телефоне, список с размерами', /3 пакета/.test(st.row) && st.rows.filter(t => /на телефоне/.test(t)).length === 3, st);
    await shot(p, '6-nastroyki');
    await p.evaluate(() => document.querySelector('#trList [data-del="deen"]').click()); await sleep(800);
    const st2 = await p.evaluate(() => el('trX').textContent); const c2 = await cached(p);
    ok('set: удалить «Немецкий → Английский» → 2 пакета, файлов deen в кэше нет', /2 пакета/.test(st2) && !c2.some(u => /tr\/deen\//.test(u)), { st2 });
  }
  if (want('ai')) {
    await p.evaluate(() => { S.ai.prov = 'deepseek'; S.ai.key = 'sk-test'; save(); __navAllow = true; show('library'); __navAllow = false; });
    await select(p, 'Очумелов'); await p.evaluate(() => el('spDict').click()); await waitOut(p); await sleep(200);
    const hasAi = await p.evaluate(() => !!el('trAi'));
    await p.evaluate(() => el('trAi') && el('trAi').click()); await p.waitForFunction(() => /Перевод ИИ/.test(el('trBody').textContent), { timeout: 10000 }).catch(() => {}); r = await sheet(p);
    ok('ai: со своим ключом есть «Через ИИ», ответ сервиса в окне с пометкой', hasAi && /Измаил/.test(r.out) && /Перевод ИИ/.test(r.t), r.t.slice(0, 200));
  }
  await ctx.close();
}

/* skins: «Перевод» в каждом скине, текст читается, 360 влезает */
const SKINS = ['default', 'ellada', 'babochkovyi', 'celestial', 'pencil'];
if (want('skins')) {
  const ctx = await browser.createBrowserContext();
  for (const W of [390, 360]) for (const sk of SKINS) {
    const { p } = await fresh(W, ctx);
    if (sk !== 'default') await p.evaluate((sk) => { S.gold = 2000; save(); buy('skin-' + sk); wear('skin-' + sk); }, sk); await sleep(300);
    for (const v of (W === 390 ? ['day', 'night'] : ['day'])) {
      if (sk !== 'default') await p.evaluate((sk, n) => { SET.theme = skinThemeKey(sk, n); SET.cBg = null; SET.cTxt = null; saveSet(); applySet(); }, sk, v === 'night');
      else await p.evaluate((n) => { SET.theme = n ? 'night' : 'day'; saveSet(); applySet(); }, v === 'night');
      await sleep(200);
      /* до скачивания (пакета enru ещё нет в этом контексте до первого прохода) и с переводом */
      await select(p, '', EN); await p.evaluate(() => el('spDict').click()); await waitOut(p, 20000); await sleep(200);
      const first = await sheet(p);
      if (first.dl) { await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-paket'); await p.evaluate(() => el('trDlB').click()); await sleep(300); await waitOut(p); }
      else { await p.evaluate(() => { const q = trCur; trRender(q, 'need', { path: ['enru'], mb: 24 }); }); await sleep(100); await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-paket'); await p.evaluate(() => trOpen(trCur)); await waitOut(p); }
      await sleep(200);
      const r = await sheet(p);
      const ov = await p.evaluate(() => { const c = el('trSheet').getBoundingClientRect(); return [...el('trSheet').querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > c.right + 1 || b.left < c.left - 1); }).map(e => e.tagName + '.' + e.className).slice(0, 4); });
      const look = await p.evaluate(() => {
        const rgb = (s) => (s.match(/rgba?\([^)]*\)/g) || []).map(c => c.match(/[\d.]+/g).map(Number)).filter(c => c.length < 4 || c[3] > 0.5);
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const bgs = (e) => { for (let n = e; n; n = n.parentElement) { const cs = getComputedStyle(n); const g = n === document.documentElement ? [] : rgb(cs.backgroundImage.replace(/url\([^)]*\)/g, '')); const b = rgb(cs.backgroundColor); if (g.length || b.length) return g.concat(b); } return [[255, 255, 255]]; };
        const cr = (e) => { if (!e) return 0; const t = rgb(getComputedStyle(e).color)[0]; return Math.min(...bgs(e).map(b => { const a = lum(t), c = lum(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); })); };
        const q = (s) => document.querySelector(s);
        return { skin: document.documentElement.dataset.skin || 'default', h: getComputedStyle(q('#trSheet h3')).fontFamily, c: { out: cr(q('#trBody .tr-out')), pair: cr(q('#trPairB')), note: cr(q('#trBody .ai-note')), web: cr(q('#trWeb')) } };
      });
      const low = Object.entries(look.c).filter(([k, x]) => x < 4.5);
      ok('skins ' + sk + ' ' + v + ' ' + W + ': текст перевода, пары, пометки, кнопок ≥ 4.5', !low.length, look.c);
      await shot(p, 'skin-' + sk + '-' + v + '-' + W + '-perevod');
      ok('skins ' + sk + ' ' + v + ' ' + W + ': перевод в окне, ничего не вылезает за край', /Измаил|Ишмаэл/.test(r.out) && !ov.length, { out: r.out.slice(0, 60), ov, look });
      await p.evaluate(() => el('trSheet').classList.add('hidden'));
    }
    await p.close();
  }
  await ctx.close();
}

ok('no page errors', errs.length === 0, errs);
await browser.close();
const n = checks.filter(Boolean).length; console.log(`\n${n}/${checks.length} PASS`); process.exit(n === checks.length ? 0 : 1);
