// Quote colours on the selection bar (Джессика 20.10, like ReadEra: «вариативность выбора цвета» + selected text to notes).
// 5 dots (no red) + «свой цвет» (Джессика 20.10 «кастомным цветом»: system colour picker, q.c '#rrggbb', SET.hlx); a dot saves a quote in that colour and remembers it (SET.hlc); the mark in the book keeps the colour after reopening;
// a dot over an existing highlight recolours it (no copy); «Заметка» = our sheet with a text field (no system prompt), «Отмена» saves nothing;
// typing a space in the note never turns the page; an old quote without c = yellow; book text over every colour ≥ 7:1 in all themes and skins.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node hlcolor.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [], dialogs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => { dialogs.push(d.type()); d.dismiss(); });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const bid = await p.evaluate(async () => { const id = allBooks()[0].id; S.quotes[id] = []; S.hl[id] = []; save(); SET.hlc = 'y'; saveSet(); __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); return id; });

// select n chars of the k-th long visible text node (offset o), show the bar
const select = (k = 0, o = 0, n = 14) => p.evaluate((k, o, n) => {
  const c = document.getElementById('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let x, i = 0;
  while ((x = w.nextNode())) { const r = x.parentElement.getBoundingClientRect(); if (x.textContent.trim().length > 30 && r.top > 80 && r.bottom < innerHeight - 220 && x.parentElement.tagName === 'P' && i++ === k) break; }
  const s = getSelection(); s.removeAllRanges(); const rg = document.createRange(); rg.setStart(x, o); rg.setEnd(x, o + n); s.addRange(rg); updSelPop();
  return String(s).trim();
}, k, o, n);
const tap = async (sel) => { await p.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(250); };
const qs = () => p.evaluate((id) => (S.quotes[id] || []).map(q => ({ t: q.text, c: q.c, n: q.note })), bid);

// 1. bar: 5 dots in one row above one row of actions, no red, ring on the remembered colour, everything inside 360
let t1 = await select(0); await sleep(300);
const bar = await p.evaluate(() => { const b = document.getElementById('selpop'), r = b.getBoundingClientRect(), d = [...document.querySelectorAll('#spColors button')];
  const top = d.map(x => Math.round(x.getBoundingClientRect().top)), act = document.getElementById('spCopy').getBoundingClientRect();
  const acts = [...b.querySelectorAll(':scope > button')].filter(x => x.offsetParent).map(x => Math.round(x.getBoundingClientRect().top));
  return { n: d.length, own: d[5].id === 'spOwn', keys: d.map(x => x.dataset.c || '').join(''), cols: d.map(x => getComputedStyle(x.querySelector('i')).backgroundColor), on: d.filter(x => x.classList.contains('on')).map(x => x.dataset.c),
    row: new Set(top).size === 1, actRow: new Set(acts).size === 1, above: top[0] < act.top, l: Math.round(r.left), r: Math.round(r.right), tap: d.every(x => x.getBoundingClientRect().width >= 44 && x.getBoundingClientRect().height >= 44), labels: d.every(x => /^Цитата, /.test(x.getAttribute('aria-label'))) }; });
const red = bar.cols.slice(0, 5).some(c => { const [r, g, b] = c.match(/\d+/g).map(Number); return r > 180 && g < 90 && b < 90; });
ok('1 bar: 5 dots (y g b p o) + own colour in one row above one row of actions, no red, ring on yellow, 44 px, labelled, inside 360', bar.n === 6 && bar.own && bar.keys === 'ygbpo' && !red && bar.on.join() === 'y' && bar.row && bar.actRow && bar.above && bar.tap && bar.labels && bar.l >= 0 && bar.r <= 360, bar);
await p.screenshot({ path: SHOTS + 'hlcolor-bar-360.png' });

// 2. green dot → quote in green, mark hl-g, remembered, bar closed
await tap('#spColors button[data-c="g"]');
let q = await qs(); let mk = await p.evaluate(() => [...document.querySelectorAll('#content mark')].map(m => ({ t: m.textContent, cl: m.className })));
let hlc = await p.evaluate(() => [SET.hlc, JSON.parse(localStorage.getItem(RQ_K.set)).hlc, document.getElementById('selpop').classList.contains('hidden')]);
ok('2 green dot: one quote c=g, its mark has class hl-g, SET.hlc g (saved), bar closed', q.length === 1 && q[0].t === t1 && q[0].c === 'g' && mk.length === 1 && mk[0].cl === 'hl-g' && hlc[0] === 'g' && hlc[1] === 'g' && hlc[2], { q, mk, hlc });

// 3. «Цитата» uses the remembered colour; ring moved to green
const t3 = await select(1); await sleep(300);
const on3 = await p.evaluate(() => [...document.querySelectorAll('#spColors button.on')].map(x => x.dataset.c).join());
await tap('#spHl'); q = await qs();
ok('3 «Цитата» saves in the last colour (green), ring on green', on3 === 'g' && q.length === 2 && q[1].t === t3 && q[1].c === 'g', { on3, q });

// 4. selection inside an existing highlight + blue → recolour, no copy, no extra coins
const g4 = await p.evaluate(() => S.gold);
await p.evaluate(() => { const m = document.querySelector('#content mark'); const s = getSelection(); s.removeAllRanges(); const rg = document.createRange(); rg.setStart(m.firstChild, 2); rg.setEnd(m.firstChild, 8); s.addRange(rg); updSelPop(); });
await sleep(300); await tap('#spColors button[data-c="b"]');
q = await qs(); mk = await p.evaluate(() => [...document.querySelectorAll('#content mark')].map(m => m.className));
ok('4 inside a highlight: blue recolours that quote (c=b, mark hl-b), still 2 quotes, no coins', q.length === 2 && q[0].c === 'b' && mk[0] === 'hl-b' && (await p.evaluate(() => S.gold)) === g4, { q, mk });

// 4b. own colour: picker → quote '#d0306a' (pink), mark data-hc with an alpha that keeps 7:1, SET.hlx, ring on «свой»; «Отмена» in the picker saves nothing
const t4b = await select(3); await sleep(300); await tap('#spOwn');
const pv = await p.evaluate(() => { const i = document.getElementById('hlOwnIn'); return { has: !!i, type: i && i.type, v: i && i.value, inBar: !!(i && i.closest('#selpop')) }; });
let n4 = (await qs()).length;
await p.evaluate(() => { const i = document.getElementById('hlOwnIn'); i.value = '#d0306a'; i.dispatchEvent(new Event('change')); }); await sleep(250);
q = await qs(); const own = await p.evaluate(() => { const m = document.querySelector('#content mark[data-hc]'); return m ? { hc: m.dataset.hc, bg: m.style.background, t: m.textContent } : null; });
const hx = await p.evaluate(() => [SET.hlc, SET.hlx]);
ok('4b own colour: picker (input type=color outside the bar, default pink) → quote c=#d0306a, mark data-hc + rgba background, SET.hlc/hlx = it', pv.has && pv.type === 'color' && !pv.inBar && pv.v === '#e86fb0' && q.length === n4 + 1 && q[n4].t === t4b && q[n4].c === '#d0306a' && own && own.hc === '#d0306a' && /rgba\(208, 48, 106/.test(own.bg) && hx[0] === '#d0306a' && hx[1] === '#d0306a', { pv, q: q[n4], own, hx });
await select(4); await sleep(300);
const ring = await p.evaluate(() => { const b = document.getElementById('spOwn'); return { on: b.classList.contains('on'), set: b.querySelector('i').classList.contains('set'), d: b.style.getPropertyValue('--d') }; });
await tap('#spOwn'); await sleep(100); n4 = (await qs()).length; await tap('#spCopy');
ok('4c next selection: ring on «свой», it shows the last own colour; closing the picker without a colour saves nothing', ring.on && ring.set && ring.d === '#d0306a' && (await qs()).length === n4, { ring, n: (await qs()).length, n4 });
await p.evaluate(() => { SET.hlc = 'b'; saveSet(); });

// 5. reopen: marks keep their colours
await p.evaluate(async (id) => { await closeReader({ quiet: true }); __navAllow = true; openBook(id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); }, bid);
mk = await p.evaluate(() => [...document.querySelectorAll('#content mark')].map(m => m.className));
ok('5 reopen: highlights in their colours (hl-b, hl-g, own pink)', mk.length === 3 && mk.includes('hl-b') && mk.includes('hl-g') && (await p.evaluate(() => { const m = document.querySelector('#content mark[data-hc="#d0306a"]'); return !!m && /rgba/.test(m.style.background); })), mk);

// 6. «Заметка»: our sheet with a text field; space does not turn the page; save → note; cancel → nothing
const t6 = await select(2); await sleep(300); await tap('#spNote');
const sh = await p.evaluate(() => { const d = document.getElementById('rqAsk'), i = document.getElementById('rqAskIn'); return { open: !!d && !d.hidden, field: !!i, focus: document.activeElement === i, page: R.page }; });
await p.keyboard.type('моя мысль про это');
const pg = await p.evaluate(() => R.page);
await shotSheet();
await tap('#rqAskOk'); q = await qs();
ok('6 «Заметка»: in-app sheet with a focused text field, no system dialog; typing a space keeps the page; saved with note and the last colour (blue)', sh.open && sh.field && sh.focus && pg === sh.page && dialogs.length === 0 && q.length === 4 && q[3].t === t6 && q[3].n === 'моя мысль про это' && q[3].c === 'b', { sh, pg, dialogs, q: q[3] });
await select(3); await sleep(300); await tap('#spNote'); await p.keyboard.type('не надо'); await tap('#rqAskNo');
q = await qs();
ok('6b «Отмена» in the note sheet saves nothing', q.length === 4, q.length);
async function shotSheet() { await p.screenshot({ path: SHOTS + 'hlcolor-note-360.png' }); }

// 7. quotes screen: colour stripe; an old quote without c = yellow
await p.evaluate((id) => { S.quotes[id].push({ text: 'старая цитата', note: '', date: today() }); save(); renderQuotes(); }, bid);
const cards = await p.evaluate(() => [...document.querySelectorAll('#quoteBox .qcard')].map(c => c.dataset.c).join(''));
ok('7 quotes screen: each card carries its colour (b g own b), old quote without c → y', cards === 'bg#d0306aby', cards);

// 8. book text over every colour ≥ 7:1, day and night, all page themes + skins
await p.evaluate(() => { S.gold = 5000; save(); for (const k of ['skin-ellada', 'skin-babochkovyi', 'skin-celestial']) buy(k); });
const themes = await p.evaluate(() => Object.keys(THEMES).concat(['pencil', 'pencil-night'], Object.keys(SKIN_THEMES)));
const worst = [];
for (const k of themes) {
  await p.evaluate((k) => { SET.theme = k; SET.cBg = null; SET.cTxt = null; saveSet(); applySet(); }, k); await sleep(120);
  const r = await p.evaluate(() => {
    const rgb = (s) => { const v = s.match(/[\d.]+/g).map(Number); return /^color\(srgb/.test(s) ? v.map((x, i) => i < 3 ? x * 255 : x) : v; }; /* color-mix() computes to color(srgb 0…1) */
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const page = rgb(getComputedStyle(document.getElementById('reader')).backgroundColor);
    const m = document.createElement('mark'); m.textContent = 'x'; document.querySelector('#content p:not(.meta)').appendChild(m); const txt = rgb(getComputedStyle(m).color);
    const out = ['y', 'g', 'b', 'p', 'o'].map(c => { m.className = c === 'y' ? '' : 'hl-' + c; const [r, g, b, a] = rgb(getComputedStyle(m).backgroundColor); const bl = [r, g, b].map((v, i) => v * a + page[i] * (1 - a)); return +cr(txt, bl).toFixed(2); });
    m.className = ''; const own = ['#000000', '#ffffff', '#d0306a', '#00ffcc', '#3355ff'].map(h => { m.dataset.hc = h; hlPaintCustom(); const [r, g, b, a] = rgb(m.style.background); const bl = [r, g, b].map((v, i) => v * a + page[i] * (1 - a)); return +cr(txt, bl).toFixed(2); }); out.push(...own); delete m.dataset.hc;
    m.remove(); return { night: document.getElementById('reader').dataset.page, min: Math.min(...out), out };
  });
  if (r.min < 7) worst.push({ k, ...r });
}
ok('8 book text over every quote colour (5 + own black/white/pink/aqua/blue) ≥ 7:1 in ' + themes.length + ' page themes (day + night, skins)', worst.length === 0, worst);
ok('no page errors, no system dialogs', errs.length === 0 && dialogs.length === 0, { errs, dialogs });
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
