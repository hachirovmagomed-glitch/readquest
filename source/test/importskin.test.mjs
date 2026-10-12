// 1в: an export made with «Карандашный» (rq_set.theme 'pencil' / 'pencil-night') imports
//  - into the OLD root build 20261008-1054 (origin/main root, served from RQ_OLD_URL) → opens as sepia, no errors;
//  - into the new build → pencil (app-wide skin). schemaVersion stays 1. Real UI: «Экспорт» button → file → «Импорт» (#impInp).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ RQ_OLD_URL=http://127.0.0.1:8770/readquest/ node importskin.test.mjs
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const OLD = process.env.RQ_OLD_URL || 'http://127.0.0.1:8770/readquest/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function pg(url) {
  const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  p.on('pageerror', e => { errs.push(url + ': ' + e.message); console.log('PAGEERROR', url, e.message); }); p.on('dialog', d => d.accept());
  await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); return p;
}
const exportJson = (p) => p.evaluate(async () => { let blob = null; const o = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return 'blob:x'; };
  try { await document.getElementById('btnExport').onclick(); } finally { URL.createObjectURL = o; } return blob ? await blob.text() : null; });
async function importInto(url, file) {
  const p = await pg(url);
  const nav = p.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => null);
  await (await p.$('#impInp')).uploadFile(file); await nav; await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(600);
  await p.evaluate(() => openBook(BOOKS[0].id)); await sleep(1500);
  const r = await p.evaluate(() => ({ build: typeof RQ_BUILD !== 'undefined' ? RQ_BUILD : '', theme: (JSON.parse(localStorage.getItem('rq_set') || '{}')).theme,
    bg: getComputedStyle(document.getElementById('reader')).backgroundColor, skin: document.documentElement.dataset.skin || '', night: document.documentElement.dataset.theme || '' }));
  return { p, r };
}
for (const theme of ['pencil', 'pencil-night']) {
  const src = await pg(BASE);
  await src.evaluate((t) => { SET.theme = t; saveSet(); applySkin(); }, theme);
  const txt = await exportJson(src); const j = JSON.parse(txt);
  ok(`[${theme}] export carries settings.theme, schemaVersion 1`, j.schemaVersion === 1 && j.settings && j.settings.theme === theme, { sv: j.schemaVersion, theme: j.settings && j.settings.theme });
  const f = `/tmp/rq-export-${theme}.json`; writeFileSync(f, txt); await src.close();
  const o = await importInto(OLD, f);
  ok(`[${theme}] old root build ${o.r.build}: imports, reader opens as sepia (#f4ecd8), no skin`, o.r.build === '20261008-1054' && o.r.bg === 'rgb(244, 236, 216)' && !o.r.skin, o.r);
  await o.p.close();
  const n = await importInto(BASE, f);
  const wantBg = theme === 'pencil' ? 'rgb(251, 250, 246)' : 'rgb(38, 42, 49)';
  ok(`[${theme}] new build: imports as ${theme} (app-wide skin${theme === 'pencil-night' ? ', night' : ''})`, n.r.theme === theme && n.r.skin === 'pencil' && n.r.bg === wantBg && (theme === 'pencil-night') === (n.r.night === 'night'), n.r);
  await n.p.close();
}
ok('no page errors in either build', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY importskin.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
