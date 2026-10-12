// 1в: hyphenation relayout on a COLD renderer. Fresh profile (hyphen-data copied in, as on a device where Chrome
// already has the dictionaries, but never loaded in this process) → open a text book at a saved middle position.
// Checks: placeholder «Открываем страницу N» shown, dictionary applied → exactly ONE silent relayout, same text line,
// pos/ratio (memory + saved) untouched, final text hyphenated, placeholder gone.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ [RQ_HYPHEN_DATA=<dir>] node hyph.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs'; import os from 'os'; import path from 'path';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const HD = process.env.RQ_HYPHEN_DATA || '/workspace/rqtest/hyphen-data';
const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
const checks = [];
const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-hyph-'));
if (fs.existsSync(HD)) fs.cpSync(HD, path.join(prof, 'hyphen-data'), { recursive: true });
ok('setup: hyphen-data present in the cold profile', fs.existsSync(path.join(prof, 'hyphen-data')), HD);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', userDataDir: prof, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
const errs = []; page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); page.on('dialog', d => d.accept());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await (await page.$('#fileInp')).uploadFile(BOOK);
await page.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
const bid = await page.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
await page.evaluate(id => { S.progress[id] = Object.assign({}, S.progress[id] || {}, { ratio: 0.4, pos: 0.4 }); save(); }, bid);
await sleep(500);
const saved = () => page.evaluate(id => new Promise(res => { try { const e = __rq.loadEnvelope(); const p = ((e && e.progress && e.progress.progress) || {})[id] || null; res(p ? JSON.stringify({ r: p.ratio, p: p.pos }) : null); } catch (x) { res('ERR ' + x.message); } }), bid);
const H = () => page.evaluate(() => Object.assign({}, __rqHyph));
const measure = () => page.evaluate(() => { const c = el('content'); const a = c.scrollWidth; c.style.hyphens = 'none'; const n = c.scrollWidth; c.style.hyphens = ''; c.style.hyphens = getComputedStyle(c).hyphens === 'none' ? 'auto' : c.style.hyphens; return { hyph: a < n, auto: a, none: n, lang: c.lang }; });
/* (1) cold renderer, dictionary on disk (device case): first layout already hyphenated, no wait, no relayout */
const h0 = await H();
const r1 = await page.evaluate(id => { openBook(id); return { back: !el('txtBack').classList.contains('hidden'), count: R.pageCount }; }, bid);
await sleep(400); const h1 = await H(); const m1 = await measure();
ok('cold renderer + dictionary on disk: first open hyphenated, no placeholder, no relayout/fallback', !r1.back && m1.hyph && m1.lang === 'ru' && h1.relayouts === h0.relayouts && h1.fallbacks === h0.fallbacks, { r1, m1, h0, h1 });
/* (2) dictionary arrives late (hook 800 ms): placeholder, then exactly ONE silent relayout by text offset */
await page.evaluate(() => closeReader()); await sleep(700);
const t0 = await page.evaluate(id => { window.__rqHyphDelay = 800; openBook(id); const b = el('txtBack');
  window.__hyOff = firstOffsetOfPage(R.page);
  return { page: R.page, count: R.pageCount, pos: R.pos, max: R.maxRatio, mem: JSON.stringify(S.progress[id]), back: !b.classList.contains('hidden'), backTxt: el('txtBackN').textContent }; }, bid);
const sv0 = await saved(); const h2a = await H();
await page.waitForFunction(() => el('txtBack').classList.contains('hidden'), { timeout: 5000 }).catch(() => {});
await sleep(200);
const t1 = await page.evaluate(id => ({ page: R.page, count: R.pageCount, pos: R.pos, max: R.maxRatio, mem: JSON.stringify(S.progress[id]), back: !el('txtBack').classList.contains('hidden'),
  offPage: pageOfOffset(txtNodes(), window.__hyOff), relOff: __rqHyph.off, off: window.__hyOff }), bid);
const sv1 = await saved(); const h2 = await H(); const m2 = await measure();
console.log('   [hy]', JSON.stringify({ t0, t1, sv0, sv1, h2a, h2, m2 }));
ok('late dictionary: placeholder «Открываем страницу N» while waiting', t0.back && /Открываем страницу \d+/.test(t0.backTxt), t0);
ok('late dictionary: exactly ONE relayout, placeholder gone, text hyphenated, fewer pages', h2.relayouts === h2a.relayouts + 1 && h2.fallbacks === h2a.fallbacks && !t1.back && m2.hyph && t1.count < t0.count, { before: h2a, after: h2, counts: [t0.count, t1.count], m2 });
ok('same text line by TEXT OFFSET: first visible char before the relayout is on the page shown after it', t1.relOff === t1.off && t1.offPage === t1.page, { off: t1.off, relOff: t1.relOff, pageBefore: t0.page, pageAfter: t1.page, offPage: t1.offPage });
ok('pos/ratio untouched by the relayout (R.pos, R.maxRatio, S.progress, saved envelope)', t1.pos === t0.pos && t1.max === t0.max && t1.mem === t0.mem && sv1 === sv0, { t0: [t0.pos, t0.max, t0.mem], t1: [t1.pos, t1.max, t1.mem], sv0, sv1 });
await sleep(3300); const h3 = await H();
ok('once per open: nothing more after fonts.ready / dictionary / the 3 s timeout all passed', h3.relayouts === h2.relayouts && h3.fallbacks === h2.fallbacks, { h2, h3 });
/* (3) dictionary never arrives: placeholder removed at ~3 s WITHOUT relayout */
await page.evaluate(() => closeReader()); await sleep(700);
const f0 = await page.evaluate(id => { window.__rqHyphDelay = 0; window.__rqHyphNoDict = true; openBook(id); return { back: !el('txtBack').classList.contains('hidden'), page: R.page, count: R.pageCount, t: Date.now() }; }, bid);
const hf0 = await H();
await sleep(1500); const f1 = await page.evaluate(() => !el('txtBack').classList.contains('hidden'));
await page.waitForFunction(() => el('txtBack').classList.contains('hidden'), { timeout: 6000, polling: 50 }).catch(() => {});
const f2 = await page.evaluate((t) => ({ back: !el('txtBack').classList.contains('hidden'), page: R.page, count: R.pageCount, ms: Date.now() - t }), f0.t); const hf = await H();
ok('fallback: placeholder up at 1.5 s, gone at ~3 s, NO relayout (fallback counted), page/count unchanged', f0.back && f1 && !f2.back && hf.relayouts === hf0.relayouts && hf.fallbacks === hf0.fallbacks + 1 && f2.page === f0.page && f2.count === f0.count && f2.ms >= 2900 && f2.ms < 4500, { f0, f1, f2, hf0, hf });
/* (4) warm reopen: no wait */
await page.evaluate(() => closeReader()); await sleep(700);
const w0 = await page.evaluate(id => { window.__rqHyphNoDict = false; openBook(id); return !el('txtBack').classList.contains('hidden'); }, bid);
await sleep(400); const hw = await H();
ok('warm reopen: no placeholder, no relayout, no fallback', !w0 && hw.relayouts === hf.relayouts && hw.fallbacks === hf.fallbacks, { w0, hw });
ok('no page errors', errs.length === 0, errs);
await browser.close(); fs.rmSync(prof, { recursive: true, force: true });
const pass = checks.filter(Boolean).length;
console.log(`SUMMARY hyph.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
