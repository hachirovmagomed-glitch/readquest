// Stage 1а step 0 (test only, app code unchanged): every global name used by inline handlers resolves after boot.
// Inline handlers = on*="…" attributes in the markup AND inside JS strings / templates that build innerHTML
// (onclick="copyQuote('+i+')" etc.). They call globals BY NAME, so after the app.html split a missing global only
// fails on click — this test fails at load instead. Also: zero pageerror / ReferenceError during boot, and the time
// until the library is ready (≤ 3 s).
// Run: RQ_URL=http://127.0.0.1:8766/readquest/ node names.test.mjs
// Red proof: NAMES_BREAK=<functionName> serves app.html / js/*.js with that function renamed away → must FAIL.
// Stage 1a: handlers are also collected from js/**/*.js (cut-out classic scripts), and every global a js/ file declares
// (top-level function/var/let/const at column 0, window.X = …) must resolve after boot.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const SRC = new URL('../app.html', import.meta.url).pathname;
const BREAK = process.env.NAMES_BREAK || '';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- 1. collect handler code from the SOURCE app.html (markup + JS strings) ----
const JSDIR = new URL('../js/', import.meta.url).pathname;
const jsFiles = fs.existsSync(JSDIR) ? fs.readdirSync(JSDIR, { recursive: true }).filter(f => f.endsWith('.js')).sort() : [];
const jsSrc = Object.fromEntries(jsFiles.map(f => [f, fs.readFileSync(JSDIR + f, 'utf8')]));
const html = fs.readFileSync(SRC, 'utf8') + '\n' + Object.values(jsSrc).join('\n');
/* globals declared by js/ files */
const jsGlobals = [];
for (const [f, s] of Object.entries(jsSrc)) {
  const g = new Set();
  for (const m of s.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) g.add(m[1] || m[2]);
  for (const m of s.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) g.add(m[1]);
  for (const n of g) jsGlobals.push([f, n]);
}
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
const markupOnclick = (fs.readFileSync(SRC, 'utf8').match(/<[a-z][^>]*\sonclick="/gi) || []).length;
console.log(`js/ files: ${jsFiles.join(', ') || 'none'}; globals they declare: ${jsGlobals.map(x => x[1]).join(', ') || 'none'}`);
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
    const isJs = /\/js\/[^?]+\.js$/.test(new URL(req.url()).pathname) && req.resourceType() === 'script';
    if (isJs || (/\/app\.html(\?|$)|\/readquest\/(\?|$)|\/$/.test(new URL(req.url()).pathname + (new URL(req.url()).search ? '?' : '')) && req.resourceType() === 'document')) {
      const r = await fetch(req.url()); let body = await r.text();
      body = body.replace(new RegExp('function ' + BREAK + '\\s*\\('), 'function ' + BREAK + '__removed_by_test(');
      if (isJs) body = body.replace(new RegExp('window\\.' + BREAK + '\\s*=(?!=)'), 'window.' + BREAK + '__removed_by_test=');
      console.log(`NAMES_BREAK: ${BREAK} in ${new URL(req.url()).pathname} — ${body.includes(BREAK + '__removed_by_test') ? 'renamed' : 'not here'}`);
      return req.respond({ status: 200, contentType: isJs ? 'text/javascript' : 'text/html; charset=utf-8', body });
    }
    req.continue();
  });
}
/* null = the app never got ready (e.g. a cut-out file missing) → the timing check FAILs, the name checks still run */
const readyAt = async () => { try { await page.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 'raf' }); } catch (e) { console.log('NOT READY in 20 s'); return null; } return page.evaluate(() => Math.round(performance.now())); };
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
const cold = await readyAt();
await sleep(800); // late boot work (persist, awards) — errors there count too
const res = await page.evaluate((calls, roots, globs) => {
  const ty = (n) => { try { return (0, eval)('typeof ' + n); } catch (e) { return 'ERR ' + e.message; } };
  return { calls: calls.map(n => [n, ty(n)]), roots: roots.map(n => [n, ty(n)]), globs: globs.map(([f, n]) => [f, n, ty(n)]) };
}, [...calls], [...roots], jsGlobals);
const badCalls = res.calls.filter(([, t]) => t !== 'function');
const badRoots = res.roots.filter(([, t]) => t === 'undefined' || t.startsWith('ERR'));
ok(`every function called by name from inline handlers resolves after boot (${res.calls.length} names, ${handlers.length} handlers, ${markupOnclick} onclick= in markup)`, badCalls.length === 0 && res.calls.length > 50, { missing: badCalls });
ok(`every object root used by inline handlers is defined after boot (${res.roots.length} names)`, badRoots.length === 0, { undefined: badRoots, roots: res.roots.map(r => r[0]) });
const badGlobs = res.globs.filter(([, , t]) => t === 'undefined' || t.startsWith('ERR'));
ok(`every global declared by js/ files resolves after boot (${res.globs.length} names in ${jsFiles.length} files)`, badGlobs.length === 0, { undefined: badGlobs, names: res.globs.map(g => g[0] + ':' + g[1]) });
ok('zero pageerror / ReferenceError during boot', errors.length === 0, errors);

// ---- 3. library ready ≤ 3 s: cold (first load) + 10 warm reloads (SW cache) at CPU ×1, 5 warm at CPU ×4 ----
const warm = [];
if (cold !== null) for (let i = 0; i < 10; i++) { await page.reload({ waitUntil: 'domcontentloaded' }); warm.push(await readyAt()); }
const cdp = await page.target().createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const warm4 = [];
if (cold !== null) for (let i = 0; i < 5; i++) { await page.reload({ waitUntil: 'domcontentloaded' }); warm4.push(await readyAt()); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const lib = await page.evaluate(() => ({ visible: !document.getElementById('library').classList.contains('hidden'), build: RQ_BUILD }));
ok('library ready ≤ 3 s (navigation → __rqReady, library shown): cold, median/max of 10 warm reloads (CPU ×1), median of 5 (CPU ×4)',
  lib.visible && cold !== null && warm.length === 10 && warm4.length === 5 && !warm.includes(null) && !warm4.includes(null) && cold <= 3000 && Math.max(...warm) <= 3000 && med(warm4) <= 3000,
  { coldMs: cold, warmMedianMs: med(warm), warmMaxMs: Math.max(...warm), cpu4MedianMs: med(warm4), cpu4MaxMs: Math.max(...warm4), build: lib.build });
ok('zero pageerror / ReferenceError across all reloads', errors.length === 0, errors);

await Promise.race([browser.close(), sleep(8000)]);
const f = checks.filter(c => !c.p).length;
fs.writeFileSync('/tmp/names-names.json', JSON.stringify({ calls: [...calls].sort(), roots: [...roots].sort(), handlers: handlers.length }, null, 1));
console.log(`\nNAMES: ${checks.length - f}/${checks.length} passed${BREAK ? ' [NAMES_BREAK=' + BREAK + ']' : ''}`);
process.exit(f ? 1 : 0);
