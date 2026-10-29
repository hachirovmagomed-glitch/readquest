// Selection bar (#selpop) is readable in every app theme and skin (Джессика 20.10: «внизу появляется плашка, на которой по сути ничего нету» —
// white #fff labels/icons on the light --sheet of the light theme and the shop skins). Each label and icon ≥ 4.5:1 against the bar.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/workspace/out] node selpop.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { S.gold = 5000; save(); for (const k of ['skin-ellada', 'skin-babochkovyi', 'skin-celestial']) buy(k); });

// open a book, select a few words, show the bar
const select = () => p.evaluate(async () => {
  if (document.getElementById('reader').classList.contains('hidden')) { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); }
  const c = document.getElementById('content'), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const r = n.parentElement.getBoundingClientRect(); if (n.textContent.trim().length > 20 && r.top > 80 && r.bottom < innerHeight - 200) break; }
  const s = getSelection(); s.removeAllRanges(); const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 15); s.addRange(rg);
  updSelPop(); SA.bar = true; selMiniApply(); selPlace(); /* 29.10: the circle went into the side menu, its pencil opens the bar */ await new Promise(r => setTimeout(r, 200));
});
// contrast of every visible label and icon against the bar's own background
const measure = () => p.evaluate(() => {
  const rgb = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bar = document.getElementById('selpop'), bg = rgb(getComputedStyle(bar).backgroundColor);
  const out = [...bar.querySelectorAll('button')].filter(b => b.offsetParent).map(b => {
    const ic = b.querySelector('.ic'), fg = rgb(getComputedStyle(b).color), ig = ic ? rgb(getComputedStyle(ic).color) : fg;
    return { id: b.id, txt: +cr(fg.c, bg.c).toFixed(2), ic: +cr(ig.c, bg.c).toFixed(2) };
  });
  return { shown: !bar.classList.contains('hidden') && bar.getBoundingClientRect().height > 30, opaque: bg.a === 1, min: Math.min(...out.flatMap(o => [o.txt, o.ic])), out, skin: document.documentElement.dataset.skin || '' };
});
const shot = async (name) => { const r = await p.evaluate(() => { const q = document.getElementById('selpop').getBoundingClientRect(); return { x: 0, y: Math.max(0, q.top - 70), width: innerWidth, height: q.height + 90 }; }); await p.screenshot({ path: SHOTS + 'selpop-' + name + '.png', clip: r }); };

// app themes without a skin
const apps = await p.evaluate(() => Object.keys(APP_THEMES));
for (const k of apps) {
  await p.evaluate((k) => { SET.theme = 'sepia'; saveSet(); applySet(); S.appTheme = k; save(); applyAppTheme(); }, k); await sleep(150);
  await select(); const m = await measure(); await shot('app-' + k);
  ok(`app theme ${k}: bar shown, opaque, labels and icons ≥ 4.5:1`, m.shown && m.opaque && !m.skin && m.min >= 4.5, { min: m.min, out: m.min < 4.5 ? m.out : undefined });
}
// skins, day and night (pencil is free; the shop skins were bought above)
for (const k of ['pencil', 'pencil-night', 'ellada', 'ellada-night', 'babochkovyi', 'babochkovyi-night', 'celestial', 'celestial-night']) {
  await p.evaluate((k) => { SET.theme = k; saveSet(); applySet(); }, k); await sleep(300);
  await select(); const m = await measure(); await shot(k);
  ok(`skin ${k}: bar shown, opaque, labels and icons ≥ 4.5:1`, m.shown && m.opaque && m.skin === k.replace(/-night$/, '') && m.min >= 4.5, { skin: m.skin, min: m.min, out: m.min < 4.5 ? m.out : undefined });
}
// 360: still one row inside the screen
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await sleep(300);
await select();
const fit = await p.evaluate(() => { const b = document.getElementById('selpop'), r = b.getBoundingClientRect(); /* 20.10: colours row + one row of actions */
  const rows = new Set([...b.querySelectorAll(':scope > button')].filter(x => x.offsetParent && x.id !== 'spFold') /* «Свернуть» is a corner badge */.map(x => Math.round(x.getBoundingClientRect().top))).size;
  return { l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), rows }; });
await shot('360');
ok('360: bar inside the screen, actions in one row under the colours', fit.l >= 0 && fit.r <= 360 && fit.rows === 1 && fit.h < 120, fit);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
