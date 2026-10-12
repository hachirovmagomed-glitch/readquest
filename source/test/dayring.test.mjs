// 1в: reader bottom after Oscar's decision «no "Ещё N мин сегодня — и +30 монет" hint in the reader» (the line was never in the app code —
// only in mockups/notes; this guards that it stays out). Day bar, focus day ring + «N / 10 мин» stay and update; daily +30 is paid exactly
// once when the day reaches 10 min (toast + summary unchanged). Screenshots of the page bottom day/night → /workspace/rq-shots-1v/bottom-*.png
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node dayring.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
const SHOTS = process.env.RQ_SHOTS || '/workspace/rq-shots-1v/'; mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, TZ: 'Europe/Moscow' } });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; window.__rqAdv = (ms) => { window.__rqTimeOffset += ms; }; });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
/* keep the test clear of midnight: the whole run is < 15 fake minutes; refuse to start in the last 20 real minutes of the day */
const late = await p.evaluate(() => { const d = new Date(); return d.getHours() === 23 && d.getMinutes() >= 40; });
if (late) { console.log('SUMMARY dayring.test 0/1 (refused: too close to midnight)'); await browser.close(); process.exit(1); }
await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
const id = await p.evaluate(() => S.userBooks[0].id);
const open = async () => { await p.evaluate(id => openBook(id), id); await p.waitForFunction(() => R.pageCount > 1 && (!el('txtBack') || el('txtBack').classList.contains('hidden')), { timeout: 15000 }); await sleep(400); };
const st = () => p.evaluate(() => { const fc = el('focusCount'), db = el('dayBar'), pl = el('pgLine'), pn = el('pgNum');
  const vis = (x) => !!x && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().height > 0;
  return { gold: S.gold, paid: dailyPaid(), count: fc.textContent, ring: !!fc.querySelector('svg'), countVis: vis(fc), dayBarVis: vis(db), dayW: db.firstElementChild.style.width,
    hint: /Ещё\s*\d+\s*мин/.test(el('reader').innerText), numBottom: Math.round(pl.getBoundingClientRect().bottom), lineH: Math.round(pl.getBoundingClientRect().height), vh: innerHeight }; });
const read = async (min) => { for (let i = 0; i < min; i++) { await p.evaluate(() => { window.__rqAdv(60000); goPage(R.page + 1, true); }); await sleep(60); } await p.evaluate(() => updDayBar()); };

await open(); await p.evaluate(() => { SET.readCounter = true; saveSet(); setFocus(true); }); await sleep(400);
let s0 = await st();
ok('reader bottom: no «Ещё N мин» hint; day bar + focus ring «0 / 10 мин» visible', !s0.hint && s0.countVis && s0.ring && /^0 \/ 10 мин$/.test(s0.count) && s0.dayBarVis, s0);
await p.screenshot({ path: SHOTS + 'bottom-day.png', clip: { x: 0, y: s0.vh - 140, width: 412, height: 140 } });
await read(5); let s1 = await st();
ok('after 5 min: ring/counter update (5 / 10 мин), day bar grows, still no hint, page number on the same baseline', /^5 \/ 10 мин$/.test(s1.count) && parseFloat(s1.dayW) >= 49 && !s1.hint && s1.numBottom === s0.numBottom, { s0: { n: s0.numBottom }, s1 });
await p.evaluate(() => toggleDayNight()); await sleep(400); await p.evaluate(() => document.querySelectorAll('.rq-toast').forEach(x => x.remove())); await sleep(400);
const sN = await st(); await p.screenshot({ path: SHOTS + 'bottom-night.png', clip: { x: 0, y: sN.vh - 140, width: 412, height: 140 } });
ok('night: same bottom line (baseline unchanged), no hint', sN.numBottom === s0.numBottom && !sN.hint && sN.countVis, sN);
const g0 = s1.gold;
await read(5); let s2 = await st();
ok('day reaches 10 min while reading: counter done, no coins until the summary, no hint', /^10 \/ 10 мин$/.test(s2.count) && !s2.hint, s2);
await p.evaluate(() => closeReader()); await sleep(1500);
const sum = await p.evaluate(() => ({ summary: !el('summary').classList.contains('hidden'), text: el('summary').innerText, gold: S.gold, paid: dailyPaid(), toasts: [...document.querySelectorAll('.rq-toast')].map(t => t.textContent) }));
ok('+30 paid once at the 10th minute: gold +30, summary carries «+30 монет»', sum.gold - g0 === 30 && sum.paid && /\+30 монет/.test(sum.text), { d: sum.gold - g0, paid: sum.paid, text: sum.text.slice(0, 200) });
await p.evaluate(() => { const b = el('btnDone'); if (b) b.click(); }); await sleep(300);
await open(); await read(4); await p.evaluate(() => closeReader()); await sleep(1500);
const g2 = await p.evaluate(() => S.gold);
ok('second session the same day: no second +30', g2 === sum.gold, { before: sum.gold, after: g2 });
ok('no page errors', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY dayring.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
