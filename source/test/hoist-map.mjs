// Stage 1a: map of load-time references to functions declared in a LATER classic script ("hoisting nodes").
// Inside one <script> a function declared further down is already defined (hoisted); across files it is not.
// For every classic script in document order (inline blocks + js/*), and — with --plan — the big block 1085 split
// virtually at the planned file boundaries (section headers), it finds code that RUNS AT LOAD:
//   top level, IIFE bodies, synchronous callbacks (forEach/map/…, new Promise executor), and — transitively — the
//   bodies of functions CALLED at load (and their sync callbacks), any branch;
// skipping deferred code (addEventListener/setTimeout/rAF/then/… callbacks, handler assignments are references only).
// A node = an identifier evaluated at load in unit U naming a function first declared in a unit AFTER U.
// `typeof X` is not a reference. Output: line of the reference → function → line of its declaration → chain.
// GUARDS (Architect, 09.10): `typeof X…` and `window.X` on a function X declared in a LATER unit never throw — inside one
// block they saw the hoisted function, across files they silently see 'undefined' if they run before X's file. Every such
// guard is listed as a warning with atLoad = does it run at load (top level / IIFE / sync callback / function called at
// load, transitively) → atLoad:true = silent behaviour change (scriptv fails); atLoad:false = runs only later (handlers,
// after __rqStart from the module, which runs after ALL classic scripts) → safe, listed for review.
// (`X && X()` is a plain reference: it throws when X is not yet defined → it is a node, not a guard.)
// Run: node test/hoist-map.mjs            (current files)
//      node test/hoist-map.mjs --plan     (current files + block 1085 split by the plan)
//      node test/hoist-map.mjs --plan --json
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const esprima = createRequire(import.meta.url)('esprima');
/* --selftest: synthetic page → every expected node / guard must be found, nothing else (exit 0 = analyzer works) */
if (process.argv.includes('--selftest')) {
  const { execFileSync } = await import('child_process');
  const d = fs.mkdtempSync('/tmp/hoist-self-'); fs.mkdirSync(d + '/js');
  fs.writeFileSync(d + '/app.html', "<script>\n'use strict';\n" + [
    'function a(){ [1].forEach(function(){ b(); }); }',       /* 3: b() via a() at load → node */
    'function c(){ setTimeout(function(){ d(); }); }',        /* 4: deferred → nothing */
    "function g(){ if(typeof e==='function')e(); }",          /* 5: guard, g() called at load → AT LOAD */
    "function h(){ if(window.f)f(); }",                        /* 6: window.X guard, h only from a handler → later */
    "document.addEventListener('click', h);",                  /* 7 */
    'a(); c(); g();',                                          /* 8 */
    'x && x();',                                               /* 9: plain reference at load → node */
  ].join('\n') + '\n</script>\n<script src="js/z.js"></script>\n');
  fs.writeFileSync(d + '/js/z.js', 'function b(){}\nfunction d(){}\nfunction e(){}\nfunction f(){}\nfunction x(){}\n');
  let out; try { out = execFileSync(process.execPath, [new URL(import.meta.url).pathname, '--json'], { env: { ...process.env, HOIST_SRC: d }, encoding: 'utf8' }); } catch (e) { out = e.stdout; }
  const r = JSON.parse(out);
  const nodes = r.nodes.map(n => n.fn + '@' + n.ref).sort(), guards = r.guards.map(g => `${g.kind}:${g.fn}@${g.ref}:${g.atLoad ? 'load' : 'later'}`).sort();
  const wantN = ['b@app.html:3', 'x@app.html:9'], wantG = ["typeof:e@app.html:5:load", 'window.X:f@app.html:6:later'];
  const pass = JSON.stringify(nodes) === JSON.stringify(wantN) && JSON.stringify(guards) === JSON.stringify(wantG);
  console.log(JSON.stringify({ selftest: pass ? 'PASS' : 'FAIL', nodes, guards, wantN, wantG }));
  fs.rmSync(d, { recursive: true, force: true });
  process.exit(pass ? 0 : 1);
}
const SRC = process.env.HOIST_SRC || new URL('..', import.meta.url).pathname;
const PLAN = process.argv.includes('--plan'), JSON_OUT = process.argv.includes('--json');
/* planned pieces of block 1085: [name, first line of the section header] — ends at the next one / block end */
const PLAN_PIECES = [
  ['core-a', null],                                                          /* block start ('use strict' line excluded) */
  ['books-builtin', '/* ================= ДАННЫЕ ================= */'],
  ['core-b', 'const STATS_BASE='],
  ['library', '/* ================= ЭКРАНЫ ================= */'],
  ['reader', '/* ================= НАСТРОЙКИ ЧТЕНИЯ ================= */'],
  ['pdf', '/* ===== PDF reader (build PDF-blocker)'],
  ['reader-ui', '/* ===== Bars + fullscreen as ONE state'],
];
const DEFERRED = new Set(['addEventListener', 'removeEventListener', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback', 'then', 'catch', 'finally', 'onmessage', 'request', 'register', 'observe', 'queueMicrotask']);

const html = fs.readFileSync(path.join(SRC, 'app.html'), 'utf8');
const lineAt = (i) => html.slice(0, i).split('\n').length;
const units = []; /* {name, file, lineOff, stmts[]} */
for (const m of html.matchAll(/<script( src="(js\/[^"?]+\.js)")?>([\s\S]*?)<\/script>/g)) {
  if (m[2]) { const code = fs.readFileSync(path.join(SRC, m[2]), 'utf8'); units.push({ name: m[2], file: m[2], lineOff: 0, ast: esprima.parseScript(code, { loc: true }) }); continue; }
  const startLine = lineAt(m.index); /* line of '<script>' ; code line 1 = startLine (same line after '<script>') */
  const ast = esprima.parseScript(m[3], { loc: true });
  const isBig = /^\n'use strict';\n/.test(m[3]) && ast.body.length > 100;
  if (PLAN && isBig) {
    const L = m[3].split('\n');
    /* pieces already cut out to js/ have no header left in the block → skipped */
    const pieces = PLAN_PIECES.map(([n, hdr]) => [n, hdr ? L.findIndex(l => l.startsWith(hdr)) + 1 : 3]).filter(([, k]) => k > 0);
    const starts = pieces.map(([, k]) => k);
    pieces.forEach(([n], i) => {
      const a = starts[i], b = i + 1 < starts.length ? starts[i + 1] - 1 : L.length;
      const stmts = ast.body.filter(s => s.loc.start.line >= a && s.loc.start.line <= b);
      const cross = ast.body.filter(s => s.loc.start.line < a && s.loc.end.line >= a);
      if (cross.length) throw new Error(`boundary ${n} cuts a statement at app.html:${startLine + a - 1}`);
      units.push({ name: `${n} (app.html ${startLine + a - 1}–${startLine + b - 1})`, file: 'app.html', lineOff: startLine - 1, ast: { body: stmts } });
    });
  } else units.push({ name: `inline app.html:${startLine}`, file: 'app.html', lineOff: startLine - 1, ast });
}
/* first declaration of each top-level function */
const decl = new Map();
units.forEach((u, i) => u.ast.body.forEach(st => { if (st.type === 'FunctionDeclaration' && !decl.has(st.id.name)) decl.set(st.id.name, { u: i, node: st, line: u.lineOff + st.loc.start.line, file: u.file, unit: u }); }));

const nodes = [], guards = new Map();
const ALL_GUARDS = process.argv.includes('--all-guards'); /* also guards on functions declared in the SAME / EARLIER unit (evidence) */
const guard = (kind, name, u, ref, atLoad, chain) => {
  const d = decl.get(name); if (!d || (d.u <= u && !ALL_GUARDS)) return;
  const k = ref + '|' + name, g = guards.get(k) || { kind, fn: name, ref, unit: units[u].name, decl: `${d.file}:${d.line}`, declUnit: units[d.u].name, atLoad: false, chain: '' };
  if (atLoad && !g.atLoad) { g.atLoad = true; g.chain = chain.join(' → ') || '(top level)'; }
  guards.set(k, g);
};
/* names guarded by `typeof X` / `window.X` inside a test expression: the guarded branch only runs if X exists */
const guardedIn = (test) => { const s = new Set(); const f = (n) => { if (!n || typeof n.type !== 'string') return;
  if (n.type === 'UnaryExpression' && n.operator === 'typeof' && n.argument.type === 'Identifier') s.add(n.argument.name);
  if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window') s.add(n.property.name);
  for (const k of Object.keys(n)) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(f); else if (v && typeof v === 'object') f(v); } }; f(test); return s; };
units.forEach((u, ui) => {
  const seen = new Set();
  const walk = (n, p, k, ctx, chain) => {
    if (!n || typeof n.type !== 'string') return;
    /* guarded branches: refs to the guarded name inside are governed by the guard (reported as a guard, not a node) */
    const gt = n.type === 'IfStatement' || n.type === 'ConditionalExpression' ? n.test : (n.type === 'LogicalExpression' && n.operator === '&&' ? n.left : null);
    if (gt) { const gs = guardedIn(gt); if (gs.size) {
      const sub = { ...ctx, g: new Set([...(ctx.g || []), ...gs]) };
      walk(gt, n, n.type === 'LogicalExpression' ? 'left' : 'test', ctx, chain);
      if (n.type === 'LogicalExpression') walk(n.right, n, 'right', sub, chain);
      else { walk(n.consequent, n, 'consequent', sub, chain); walk(n.alternate, n, 'alternate', ctx, chain); }
      return; } }
    if (n.type === 'FunctionDeclaration') return;
    if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') {
      const iife = p && p.type === 'CallExpression' && k === 'callee';
      const syncCb = p && (p.type === 'CallExpression' || p.type === 'NewExpression') && k === 'arguments' && !(p.callee.type === 'MemberExpression' && !p.callee.computed && DEFERRED.has(p.callee.property.name)) && !(p.callee.type === 'Identifier' && DEFERRED.has(p.callee.name));
      if (!iife && !syncCb) return;
      walk(n.body, n, 'body', ctx, chain); return;
    }
    if (n.type === 'UnaryExpression' && n.operator === 'typeof' && n.argument.type === 'Identifier') { guard('typeof', n.argument.name, ui, `${ctx.file}:${ctx.lineOff + n.loc.start.line}`, true, chain); return; }
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window') guard('window.X', n.property.name, ui, `${ctx.file}:${ctx.lineOff + n.loc.start.line}`, true, chain);
    if (n.type === 'Identifier') {
      if (p && ((p.type === 'MemberExpression' && k === 'property' && !p.computed) || (p.type === 'Property' && k === 'key' && !p.computed))) return;
      const d = decl.get(n.name); if (!d) return;
      if (ctx.g && ctx.g.has(n.name) && d.u > ui) return; /* inside its own guard → the guard is the finding */
      if (d.u > ui) nodes.push({ unit: u.name, ref: `${ctx.file}:${ctx.lineOff + n.loc.start.line}`, fn: n.name, decl: `${d.file}:${d.line}`, declUnit: units[d.u].name, chain: chain.join(' → ') || '(top level)' });
      /* called (or referenced) at load and already defined → its body runs now if it is CALLED */
      if (d.u <= ui && p && (p.type === 'CallExpression' || p.type === 'NewExpression') && k === 'callee' && !seen.has(n.name)) {
        seen.add(n.name);
        walk(d.node.body, d.node, 'body', { file: d.file, lineOff: d.unit.lineOff, g: ctx.g }, [...chain, `${n.name}() @${ctx.file}:${ctx.lineOff + n.loc.start.line}`]);
      }
      return;
    }
    for (const kk of Object.keys(n)) { if (kk === 'loc') continue; const v = n[kk]; if (Array.isArray(v)) v.forEach(x => walk(x, n, kk, ctx, chain)); else if (v && typeof v === 'object') walk(v, n, kk, ctx, chain); }
  };
  u.ast.body.forEach(st => walk(st, null, null, { file: u.file, lineOff: u.lineOff }, []));
});
/* second pass: ALL code of every unit (incl. functions / handlers) → guards that do not run at load (atLoad stays false) */
units.forEach((u, ui) => {
  const all = (n, p, k) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'UnaryExpression' && n.operator === 'typeof' && n.argument.type === 'Identifier') guard('typeof', n.argument.name, ui, `${u.file}:${u.lineOff + n.loc.start.line}`, false, []);
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window') guard('window.X', n.property.name, ui, `${u.file}:${u.lineOff + n.loc.start.line}`, false, []);
    for (const kk of Object.keys(n)) { if (kk === 'loc') continue; const v = n[kk]; if (Array.isArray(v)) v.forEach(x => all(x, n, kk)); else if (v && typeof v === 'object') all(v, n, kk); }
  };
  u.ast.body.forEach(st => all(st, null, null));
});
for (const g of guards.values()) { const d = decl.get(g.fn), uu = units.findIndex(x => x.name === g.unit); g.where = d.u > uu ? 'LATER' : d.u === uu ? 'same' : 'earlier'; }
const gl = [...guards.values()].filter(g => !ALL_GUARDS || true).sort((a, b) => (b.atLoad - a.atLoad) || a.ref.localeCompare(b.ref));
const uniq = [...new Map(nodes.map(x => [x.unit + '|' + x.ref + '|' + x.fn, x])).values()];
if (JSON_OUT) console.log(JSON.stringify({ units: units.map(u => u.name), nodes: uniq, guards: gl }, null, 1));
else {
  console.log('units in load order:\n  ' + units.map(u => u.name).join('\n  '));
  console.log(`\nnodes (${uniq.length}):`);
  for (const x of uniq) console.log(`  [${x.unit}] ${x.ref} uses ${x.fn}() declared ${x.decl} [${x.declUnit}]  via ${x.chain}`);
  console.log(`\nguards (typeof X / window.X) on functions declared ${ALL_GUARDS ? "anywhere" : "in a LATER unit"} (${gl.length}; LATER: ${gl.filter(g => g.where === "LATER").length}; at load on a LATER target: ${gl.filter(g => g.atLoad && g.where === "LATER").length}):`);
  for (const g of gl) console.log(`  ${g.atLoad ? 'AT LOAD' : 'later  '} [target ${g.where}] ${g.ref} ${g.kind} ${g.fn} → ${g.decl} [${g.declUnit}]${g.atLoad ? '  via ' + g.chain : ''}`);
}
process.exit(uniq.length || gl.some(g => g.atLoad && g.where === 'LATER') ? 1 : 0);
