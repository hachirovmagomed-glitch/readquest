// 1в screenshots (412×915): reader with panels, «Настройки чтения», «Общие настройки», PDF + text page with the bottom strip — day / night.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node shots-1v.mjs [outdir]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const OUT = process.argv[2] || '/workspace/front-shots/1v';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', ...(process.env.RQ_PROFILE ? { userDataDir: process.env.RQ_PROFILE } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
/* warm-up: Chrome loads hyphenation dictionaries lazily; lay out ru/en text once so the reader's first pagination is hyphenated */
if (process.env.RQ_WARM) { const w = await b.newPage(); await w.setContent('<p lang="ru" style="width:60px;hyphens:auto">конфискованным</p><p lang="en" style="width:60px;hyphens:auto">representative</p>'); await sleep(1500); await w.close(); }
const shot = async (p, n) => { await sleep(350); await p.screenshot({ path: OUT + '/' + n + '.png' }); console.log('shot', n); };
for (const mode of ['day', 'night']) {
  const p = await (await b.createBrowserContext()).newPage();
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
  p.on('dialog', d => d.accept());
  await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(BASE); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await p.evaluate((m) => { S.appTheme = m === 'day' ? 'light' : 'dark'; save(); applyAppTheme(); }, mode);
  await (await p.$('#fileInp')).uploadFile('/workspace/rqtest/Длинная книга.txt');
  await p.waitForFunction(() => S.userBooks.length > 0);
  const tid = await p.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
  await (await p.$('#fileInp')).uploadFile('/workspace/rqtest/pdf/b-nolabels-40.pdf');
  await p.waitForFunction(() => S.userBooks.length > 1, { timeout: 15000 });
  const pid = await p.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
  const themes = mode === 'day' ? ['day', 'sepia'] : ['dark'];
  for (const th of themes) {
    await p.evaluate((th) => { SET.theme = th; SET.cBg = null; SET.cTxt = null; saveSet(); }, th);
    await p.evaluate(id => openBook(id), tid); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 }); await sleep(500);
    const tag = mode + (th === 'sepia' ? '-sepia' : '');
    await p.evaluate(() => concealChrome('tap')); await shot(p, 'text-page-' + tag);
    await p.evaluate(() => revealChrome()); await shot(p, 'reader-panels-' + tag);
    if (th !== 'sepia') {
      await p.evaluate(() => el('btnSet').click()); await shot(p, 'reader-settings-' + mode);
      for (const g of ['grpPage', 'grpNav', 'grpFocus']) { await p.evaluate(g => openSetTab(g), g); await shot(p, 'reader-settings-' + g.slice(3).toLowerCase() + '-' + mode); }
      await p.evaluate(() => el('btnGeneral').click()); await shot(p, 'general-settings-' + mode);
      await p.evaluate(() => el('setBack').click()); await sleep(200);
    }
    await p.evaluate(() => closeReader()); await sleep(600);
    await p.evaluate(() => { if (!el('summary').classList.contains('hidden')) el('btnDone').click(); }); await sleep(300);
  }
  await p.evaluate(id => openBook(id), pid); await p.waitForFunction(() => R.pdf && __rqPdf.swaps > 0, { timeout: 20000 }); await sleep(800);
  await p.evaluate(() => concealChrome('tap')); await shot(p, 'pdf-page-' + mode);
  await p.evaluate(() => revealChrome()); await shot(p, 'pdf-panels-' + mode);
  await p.evaluate(() => closeReader()); await sleep(400);
}
await b.close();
console.log('errors', errs.length);
process.exit(errs.length ? 1 : 0);
