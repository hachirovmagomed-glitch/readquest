// Stage 1a: map of load-time references to functions declared in a LATER classic script ("hoisting nodes").
// Inside one <script> a function declared further down is already defined (hoisted); across files it is not.
// For every classic script in document order (inline blocks + js/*), and — with --plan — the big block 1085 split
// virtually at the planned file boundaries (section headers), it finds code that RUNS AT LOAD:
//   top level, IIFE bodies, synchronous callbacks (forEach/map/…, new Promise executor), and — transitively — the
//   bodies of functions CALLED at load (and their sync callbacks), any branch;
// skipping deferred code (addEventListener/setTimeout/rAF/then/… callbacks, handler assignments are references only).
// A node = an identifier evaluated at load in unit U naming a function first declared in a unit AFTER U.
// `typeof X` is not a reference. Output: line of the reference → function → line of its declaration → chain.
// Run: node test/hoist-map.mjs            (current files)
//      node test/hoist-map.mjs --plan     (current files + block 1085 split by the plan)
//      node test/hoist-map.mjs --plan --json
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const esprima = createRequire(import.meta.url)('esprima');
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

const nodes = [];
units.forEach((u, ui) => {
  const seen = new Set();
  const walk = (n, p, k, ctx, chain) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration') return;
    if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') {
      const iife = p && p.type === 'CallExpression' && k === 'callee';
      const syncCb = p && (p.type === 'CallExpression' || p.type === 'NewExpression') && k === 'arguments' && !(p.callee.type === 'MemberExpression' && !p.callee.computed && DEFERRED.has(p.callee.property.name)) && !(p.callee.type === 'Identifier' && DEFERRED.has(p.callee.name));
      if (!iife && !syncCb) return;
      walk(n.body, n, 'body', ctx, chain); return;
    }
    if (n.type === 'UnaryExpression' && n.operator === 'typeof' && n.argument.type === 'Identifier') return;
    if (n.type === 'Identifier') {
      if (p && ((p.type === 'MemberExpression' && k === 'property' && !p.computed) || (p.type === 'Property' && k === 'key' && !p.computed))) return;
      const d = decl.get(n.name); if (!d) return;
      if (d.u > ui) nodes.push({ unit: u.name, ref: `${ctx.file}:${ctx.lineOff + n.loc.start.line}`, fn: n.name, decl: `${d.file}:${d.line}`, declUnit: units[d.u].name, chain: chain.join(' → ') || '(top level)' });
      /* called (or referenced) at load and already defined → its body runs now if it is CALLED */
      if (d.u <= ui && p && (p.type === 'CallExpression' || p.type === 'NewExpression') && k === 'callee' && !seen.has(n.name)) {
        seen.add(n.name);
        walk(d.node.body, d.node, 'body', { file: d.file, lineOff: d.unit.lineOff }, [...chain, `${n.name}() @${ctx.file}:${ctx.lineOff + n.loc.start.line}`]);
      }
      return;
    }
    for (const kk of Object.keys(n)) { if (kk === 'loc') continue; const v = n[kk]; if (Array.isArray(v)) v.forEach(x => walk(x, n, kk, ctx, chain)); else if (v && typeof v === 'object') walk(v, n, kk, ctx, chain); }
  };
  u.ast.body.forEach(st => walk(st, null, null, { file: u.file, lineOff: u.lineOff }, []));
});
const uniq = [...new Map(nodes.map(x => [x.unit + '|' + x.ref + '|' + x.fn, x])).values()];
if (JSON_OUT) console.log(JSON.stringify({ units: units.map(u => u.name), nodes: uniq }, null, 1));
else {
  console.log('units in load order:\n  ' + units.map(u => u.name).join('\n  '));
  console.log(`\nnodes (${uniq.length}):`);
  for (const x of uniq) console.log(`  [${x.unit}] ${x.ref} uses ${x.fn}() declared ${x.decl} [${x.declUnit}]  via ${x.chain}`);
}
process.exit(uniq.length ? 1 : 0);
