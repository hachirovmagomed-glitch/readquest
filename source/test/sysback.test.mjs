// System back must work (Босс 14.10): no overscroll-behavior-x:none/contain on html/body — the browser's own edge swipe «назад» is not disabled.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node sysback.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
const scr = ['library', 'reader', 'settings'];
const r = await p.evaluate(async (scr) => { const out = {}; for (const s of scr) { try { if (s === 'reader') { openBook(allBooks()[0].id); await new Promise(r => setTimeout(r, 800)); } else if (s === 'settings') openGeneralSettings(false); else show('library'); } catch (e) {}
  await new Promise(r => setTimeout(r, 200)); out[s] = [document.documentElement, document.body, document.scrollingElement].map(e => getComputedStyle(e).overscrollBehaviorX); } return out; }, scr);
for (const s of scr) ok('system back allowed on ' + s + ': html/body overscroll-behavior-x = auto', r[s].every(v => v === 'auto'), r[s]);
const src = await (await fetch(BASE)).text().catch(() => '');
ok('app.html has no overscroll-behavior-x:none', !/overscroll-behavior(-x)?\s*:\s*(none|contain)/.test(src), null);
const n = checks.filter(Boolean).length; console.log(`SUMMARY sysback.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
