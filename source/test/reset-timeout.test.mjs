// Test reset: deleteDatabase that never finishes (3 s timeout) must NOT reload as success; shows info toast.
// Main build: reset still refused. Run: RQ_URL=http://127.0.0.1:8811/readquest/ node reset-timeout.test.mjs (uses …/test/ itself)
import puppeteer from 'puppeteer-core';
const BASE = (process.env.RQ_URL || 'http://127.0.0.1:8811/readquest/').replace(/test\/?$/, '');
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext();
const ready = (p) => p.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 });
{ const p = await ctx.newPage(); await p.goto(BASE, { waitUntil: 'load' }); await ready(p);
  const r = await p.evaluate(() => window.__rqTestReset({ noConfirm: true }));
  ok('main build: test reset refused (false)', r === false, r); await p.close(); }
const p = await ctx.newPage(); await p.goto(BASE + 'test/', { waitUntil: 'load' }); await ready(p);
await p.evaluate(() => { window.__marker = 1; localStorage.setItem('rqt_keepme', '1');
  indexedDB.deleteDatabase = function () { return {}; }; /* never fires onsuccess/onerror → 3 s timeout */ });
let nav = false; p.on('framenavigated', (f) => { if (f === p.mainFrame()) nav = true; });
const t0 = Date.now();
const r = await p.evaluate(() => window.__rqTestReset({ noConfirm: true }));
await new Promise(s => setTimeout(s, 1500));
const st = await p.evaluate(() => ({ marker: window.__marker, keep: localStorage.getItem('rqt_keepme'),
  toast: [...document.querySelectorAll('.rq-toast')].map(n => n.textContent), log: (window.__rqResetLog || []).map(x => x.s) }));
ok('timeout → returns false after ≥3 s', r === false && Date.now() - t0 >= 3000, { r, ms: Date.now() - t0 });
ok('timeout → no reload', !nav && st.marker === 1, { nav, marker: st.marker });
ok('timeout → rqt* keys not wiped', st.keep === '1', st.keep);
ok('timeout → toast «Не удалось сбросить, закройте другие окна» (no emoji)', st.toast.includes('Не удалось сбросить, закройте другие окна') && st.toast.every(t => !/\p{Extended_Pictographic}/u.test(t)), st.toast);
ok('log has idb-timeout, no reload step', st.log.includes('idb-timeout') && !st.log.includes('reload'), st.log);
await browser.close();
console.log(`\nSUMMARY reset-timeout.test ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
