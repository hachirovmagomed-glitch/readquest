// Stage 1а step 0 (test only, app code unchanged): every global name used by inline handlers resolves after boot.
// Inline handlers = on*="…" attributes in the markup AND inside JS strings / templates that build innerHTML
// (onclick="copyQuote('+i+')" etc.). They call globals BY NAME, so after the app.html split a missing global only
// fails on click — this test fails at load instead. Also: zero pageerror / ReferenceError during boot, and the time
// until the library is ready (≤ 3 s).
// Run: RQ_URL=http://127.0.0.1:8766/readquest/ node names.test.mjs
// Red proof: NAMES_BREAK=<functionName> serves app.html with that function renamed away → must FAIL.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const SRC = new URL('../app.html', import.meta.url).pathname;
const BREAK = process.env.NAMES_BREAK || '';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- 1. collect handler code from the SOURCE app.html (markup + JS strings) ----
const html = fs.readFileSync(SRC, 'utf8');
const handlers = [];
const reAttr = /(?:^|[\s"'\\])on(?:click|change|input|submit|keydown|keyup|contextmenu|dblclick|touchstart|touchend|pointerdown|pointerup|load|error|blur|focus)\s*=\s*(\\?["'])([\s\S]*?)\1/g;
for (let m; (m = reAttr.exec(html));) handlers.push(m[2]);
const KW = new Set('event if else for while do return function typeof instanceof new void delete in of var let const this true false null undefined try catch finally throw switch case break continue default async await yield class super import export'.split(' '));
const calls = new Set(), roots = new Set();
for (const h of handlers) {
  /* drop pieces evaluated when the HTML string is BUILT (not on click): '+expr+' / "+expr+" concatenation and ${expr};
     then drop remaining string literals. What is left runs in the handler's scope at click time. */
  const code = h.replace(/\\(["'])/g, '$1').replace(/(['"])\s*\+[\s\S]*?\+\s*\1/g, "''").replace(/\$\{[^}]*\}/g, '0').replace(/'[^']*'|"[^"]*"/g, "''");
  for (const m of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) if (!KW.has(m[1])) calls.add(m[1]);
  for (const m of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\./g)) if (!KW.has(m[1])) roots.add(m[1]);
}
const markupOnclick = (html.match(/<[a-z][^>]*\sonclick="/gi) || []).length;
console.log(`handlers: ${handlers.length} (markup onclick=: ${markupOnclick}); called names: ${calls.size}; object roots: ${roots.size}`);

// ---- 2. boot and resolve every name in the page's global scope (incl. top-level const/let of classic scripts) ----
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && /ReferenceError|is not defined|TypeError/.test(m.text())) errors.push('console: ' + m.text()); });
if (BREAK) {
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (/\/app\.html(\?|$)|\/readquest\/(\?|$)|\/$/.test(new URL(req.url()).pathname + (new URL(req.url()).search ? '?' : '')) && req.resourceType() === 'document') {
      const r = await fetch(req.url()); let body = await r.text();
      const n0 = body.length; body = body.replace(new RegExp('function ' + BREAK + '\\s*\\('), 'function ' + BREAK + '__removed_by_test(');
      console.log(`NAMES_BREAK: renamed function ${BREAK} (${body.length !== n0 || body.includes(BREAK + '__removed_by_test') ? 'done' : 'NOT FOUND'})`);
      return req.respond({ status: 200, contentType: 'text/html; charset=utf-8', body });
    }
    req.continue();
  });
}
const readyAt = async () => { await page.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 'raf' }); return page.evaluate(() => Math.round(performance.now())); };
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
const cold = await readyAt();
await sleep(800); // late boot work (persist, awards) — errors there count too
const res = await page.evaluate((calls, roots) => {
  const ty = (n) => { try { return (0, eval)('typeof ' + n); } catch (e) { return 'ERR ' + e.message; } };
  return { calls: calls.map(n => [n, ty(n)]), roots: roots.map(n => [n, ty(n)]) };
}, [...calls], [...roots]);
const badCalls = res.calls.filter(([, t]) => t !== 'function');
const badRoots = res.roots.filter(([, t]) => t === 'undefined' || t.startsWith('ERR'));
ok(`every function called by name from inline handlers resolves after boot (${res.calls.length} names, ${handlers.length} handlers, ${markupOnclick} onclick= in markup)`, badCalls.length === 0 && res.calls.length > 50, { missing: badCalls });
ok(`every object root used by inline handlers is defined after boot (${res.roots.length} names)`, badRoots.length === 0, { undefined: badRoots, roots: res.roots.map(r => r[0]) });
ok('zero pageerror / ReferenceError during boot', errors.length === 0, errors);

// ---- 3. library ready ≤ 3 s: cold (first load) + 10 warm reloads (SW cache) at CPU ×1, 5 warm at CPU ×4 ----
const warm = [];
for (let i = 0; i < 10; i++) { await page.reload({ waitUntil: 'domcontentloaded' }); warm.push(await readyAt()); }
const cdp = await page.target().createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const warm4 = [];
for (let i = 0; i < 5; i++) { await page.reload({ waitUntil: 'domcontentloaded' }); warm4.push(await readyAt()); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const lib = await page.evaluate(() => ({ visible: !document.getElementById('library').classList.contains('hidden'), build: RQ_BUILD }));
ok('library ready ≤ 3 s (navigation → __rqReady, library shown): cold, median/max of 10 warm reloads (CPU ×1), median of 5 (CPU ×4)',
  lib.visible && cold <= 3000 && Math.max(...warm) <= 3000 && med(warm4) <= 3000,
  { coldMs: cold, warmMedianMs: med(warm), warmMaxMs: Math.max(...warm), cpu4MedianMs: med(warm4), cpu4MaxMs: Math.max(...warm4), build: lib.build });
ok('zero pageerror / ReferenceError across all reloads', errors.length === 0, errors);

await Promise.race([browser.close(), sleep(8000)]);
const f = checks.filter(c => !c.p).length;
fs.writeFileSync('/tmp/names-names.json', JSON.stringify({ calls: [...calls].sort(), roots: [...roots].sort(), handlers: handlers.length }, null, 1));
console.log(`\nNAMES: ${checks.length - f}/${checks.length} passed${BREAK ? ' [NAMES_BREAK=' + BREAK + ']' : ''}`);
process.exit(f ? 1 : 0);
