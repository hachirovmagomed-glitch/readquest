// Stage 1а step 0 (test only, app code unchanged): every global name used by inline handlers resolves after boot.
// Inline handlers = on*="…" attributes in the markup AND inside JS strings / templates that build innerHTML
// (onclick="copyQuote('+i+')" etc.). They call globals BY NAME, so after the app.html split a missing global only
// fails on click — this test fails at load instead. Also: zero pageerror / ReferenceError during boot, and the time
// until the library is ready (≤ 3 s).
// Run: RQ_URL=http://127.0.0.1:8766/readquest/ node names.test.mjs
// Red proof: NAMES_BREAK=<functionName> serves app.html / js/*.js with that function renamed away → must FAIL.
// Stage 1a: handlers are also collected from js/**/*.js (cut-out classic scripts), and every global a js/ file declares
// (top-level function/var/let/const at column 0, window.X = …) must resolve after boot.
// Load errors per file: a window 'error' listener (installed before any script) records message + filename:line on every
// load; no error may come from a js/* file (TDZ / ReferenceError when the <script src> order differs from app.html).
// Red proof for the order: NAMES_SWAP=<file.js> serves the HTML with that file's <script src> moved before the preceding
// <script> element (e.g. start.js before the big block → its top-level code runs before the globals it uses exist).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { createRequire } from 'module';
const esprima = createRequire(import.meta.url)('esprima');

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const SRC = new URL('../app.html', import.meta.url).pathname;
const BREAK = process.env.NAMES_BREAK || '';
const SWAP = process.env.NAMES_SWAP || '';
/* NAMES_THROW=<file.js>: that js/ file throws on its first line (after its 'use strict';). After the split an error in one
   file no longer stops the whole block 1085 — the NEXT files still run, the app may boot half-broken → must FAIL here. */
const THROW = process.env.NAMES_THROW || '';
/* guards (Architect, 09.10): `typeof X==='function'&&X()` / window.X on a function from a LATER file silently become false if
   they run before that file. hoist-map lists every guard (--all-guards); here: at the end of the classic scripts
   (readyState → interactive, BEFORE the module boot / __rqStart / any handler) every guarded function must already exist. */
import { spawnSync } from 'child_process';
const HM = JSON.parse(spawnSync(process.execPath, [new URL('./hoist-map.mjs', import.meta.url).pathname, '--json', '--all-guards'], { encoding: 'utf8' }).stdout);
const guardFns = [...new Set(HM.guards.map(g => g.fn))].sort();
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
/* declared AT LOAD (esprima): top-level function / var / let / const, and `window.X = …` in code that runs at load
   (top level + IIFE bodies, not inside other functions — e.g. window.__rqReady is set later by __rqStart) */
for (const [f, s] of Object.entries(jsSrc)) {
  const g = new Set();
  const walk = (n, p, k) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration') return;
    if ((n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') && !(p && p.type === 'CallExpression' && k === 'callee')) return;
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && n.left.object.type === 'Identifier' && n.left.object.name === 'window') g.add(n.left.property.name);
    for (const kk of Object.keys(n)) { const v = n[kk]; if (Array.isArray(v)) v.forEach(x => walk(x, n, kk)); else if (v && typeof v === 'object') walk(v, n, kk); }
  };
  for (const st of esprima.parseScript(s).body) {
    if (st.type === 'FunctionDeclaration') g.add(st.id.name);
    else if (st.type === 'VariableDeclaration') st.declarations.forEach(d => d.id.type === 'Identifier' && g.add(d.id.name));
    walk(st, null, null);
  }
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
const loadErrs = [];
await page.exposeFunction('__rqNamesErr', (e) => { loadErrs.push(e); });
await page.evaluateOnNewDocument(() => {
  window.addEventListener('error', (e) => { try { window.__rqNamesErr({ m: String(e.message), f: String(e.filename || '').replace(/^.*\/readquest\//, ''), l: e.lineno, c: e.colno }); } catch (x) {} }, true);
});
await page.evaluateOnNewDocument((fns) => {
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive' || window.__rqGuardAtEnd) return;
    const o = {}; for (const f of fns) { try { o[f] = (0, eval)('typeof ' + f); } catch (e) { o[f] = 'ERR ' + e.message; } }
    window.__rqGuardAtEnd = o;
  });
}, guardFns);
page.on('console', m => { if (m.type() === 'error' && /ReferenceError|is not defined|TypeError/.test(m.text())) errors.push('console: ' + m.text()); });
if (BREAK || SWAP || THROW) {
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const isJs = /\/js\/[^?]+\.js$/.test(new URL(req.url()).pathname) && req.resourceType() === 'script';
    if (isJs || (/\/app\.html(\?|$)|\/readquest\/(\?|$)|\/$/.test(new URL(req.url()).pathname + (new URL(req.url()).search ? '?' : '')) && req.resourceType() === 'document')) {
      const r = await fetch(req.url()); let body = await r.text();
      if (SWAP && !isJs) {
        const m = body.match(new RegExp('<script src="js/' + SWAP.replace('.', '\\.') + '[^"]*"></script>\\n'));
        if (m) { const i = body.indexOf(m[0]), prev = body.lastIndexOf('\n<script', i - 2) + 1; /* real tags are at line starts */ body = body.slice(0, i) + body.slice(i + m[0].length); body = body.slice(0, prev) + m[0] + body.slice(prev); }
        console.log(`NAMES_SWAP: ${SWAP} ${m ? 'moved before the preceding <script>' : 'NOT FOUND'} in ${new URL(req.url()).pathname}`);
      }
      if (THROW && isJs && new URL(req.url()).pathname.endsWith('/js/' + THROW)) {
        body = body.startsWith("'use strict';\n") ? "'use strict';\nthrow new Error('NAMES_THROW " + THROW + "');\n" + body.slice(14) : "throw new Error('NAMES_THROW " + THROW + "');\n" + body;
        console.log(`NAMES_THROW: ${THROW} throws on load`);
      }
      if (BREAK) body = body.replace(new RegExp('function ' + BREAK + '\\s*\\('), 'function ' + BREAK + '__removed_by_test(');
      if (BREAK && isJs) body = body.replace(new RegExp('window\\.' + BREAK + '\\s*=(?!=)'), 'window.' + BREAK + '__removed_by_test=');
      if (BREAK) console.log(`NAMES_BREAK: ${BREAK} in ${new URL(req.url()).pathname} — ${body.includes(BREAK + '__removed_by_test') ? 'renamed' : 'not here'}`);
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
  /* declared ≠ defined: `let calY;` is declared but undefined → resolve the reference itself (ReferenceError = missing / TDZ) */
  const rs = (n) => { try { (0, eval)(n); return 'ok'; } catch (e) { return 'ERR ' + e.name + ': ' + e.message; } };
  return { calls: calls.map(n => [n, ty(n)]), roots: roots.map(n => [n, ty(n)]), globs: globs.map(([f, n]) => [f, n, rs(n)]) };
}, [...calls], [...roots], jsGlobals);
const badCalls = res.calls.filter(([, t]) => t !== 'function');
const badRoots = res.roots.filter(([, t]) => t === 'undefined' || t.startsWith('ERR'));
ok(`every function called by name from inline handlers resolves after boot (${res.calls.length} names, ${handlers.length} handlers, ${markupOnclick} onclick= in markup)`, badCalls.length === 0 && res.calls.length > 50, { missing: badCalls });
ok(`every object root used by inline handlers is defined after boot (${res.roots.length} names)`, badRoots.length === 0, { undefined: badRoots, roots: res.roots.map(r => r[0]) });
const badGlobs = res.globs.filter(([, , t]) => t !== 'ok');
ok(`every global declared by js/ files resolves after boot (no ReferenceError/TDZ) (${res.globs.length} names in ${jsFiles.length} files)`, badGlobs.length === 0, { undefined: badGlobs, names: res.globs.map(g => g[0] + ':' + g[1]) });
ok('zero pageerror / ReferenceError during boot', errors.length === 0, errors);
const gEnd = await page.evaluate(() => window.__rqGuardAtEnd || null);
const gBad = gEnd ? Object.entries(gEnd).filter(([, t]) => t !== 'function') : [['(no snapshot)', '']];
ok(`typeof/window guards: every guarded function (${guardFns.length}: ${guardFns.join(', ')}) is defined when the classic scripts end (readyState interactive, before module boot); ${HM.guards.filter(g => g.where === 'LATER').length} guard(s) on a LATER file, ${HM.guards.filter(g => g.where === 'LATER' && g.atLoad).length} at load`,
  gBad.length === 0 && !HM.guards.some(g => g.where === 'LATER' && g.atLoad), { bad: gBad, later: HM.guards.filter(g => g.where === 'LATER').map(g => `${g.ref} ${g.kind} ${g.fn} → ${g.decl}${g.atLoad ? ' AT LOAD' : ''}`) });
const ava = await page.evaluate(() => { const a = document.getElementById('streakAva'); const want = (typeof isMvp === 'function' && isMvp()) && S.useChar !== false;
  return { mvp: isMvp(), useChar: S.useChar !== false, svg: !!a && a.innerHTML.startsWith('<svg'), same: !!a && typeof avatarSvg === 'function' && (() => { const d = document.createElement('span'); d.innerHTML = avatarSvg(); return a.innerHTML === d.innerHTML; })(), /* both serialized by the browser */ want, txt: a ? a.textContent.slice(0, 4) : null }; });
ok('streak avatar drawn by avatarSvg() after boot (guard app.html:1133 `typeof avatarSvg` → js/rpg.js took the function branch)', ava.want ? (ava.svg && ava.same) : !ava.svg, ava);

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
const jsErrs = loadErrs.filter(e => /^js\//.test(e.f));
ok(`no js/* file throws while loading (window error with js/ filename, all ${1 + warm.length + warm4.length} loads; ${jsFiles.length} files)`, jsErrs.length === 0, jsErrs.slice(0, 5).map(e => `${e.f}:${e.l}:${e.c} ${e.m}`));

await Promise.race([browser.close(), sleep(8000)]);
const f = checks.filter(c => !c.p).length;
fs.writeFileSync('/tmp/names-names.json', JSON.stringify({ calls: [...calls].sort(), roots: [...roots].sort(), handlers: handlers.length }, null, 1));
console.log(`\nNAMES: ${checks.length - f}/${checks.length} passed${BREAK ? ' [NAMES_BREAK=' + BREAK + ']' : ''}`);
process.exit(f ? 1 : 0);
