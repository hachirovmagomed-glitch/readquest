// Stage 1a step 1: after a BUILD change the new HTML gets the NEW js/ scripts, never an old one from the SW cache or HTTP cache.
// Self-contained: copies source/ to a temp root, adds two probe scripts to js/ + <script src> tags into app.html,
// builds A then B with build-dist.sh (rq and rqt), serves the temp dist with Cache-Control: max-age=600 (like GitHub Pages).
// Part «split» (static, no browser): the 1a cut is behaviour-neutral. js/*.js re-inlined into the built HTML must give the
// build of SPLIT_BASE (default 1c5b7b9 = last commit before any cut) byte for byte; every other dist file identical, sw.js
// differs only by the js/ precache entries. A path probe './probe-x.js' is appended to each js/ file (and to the same
// inline script of the base) → any ?v= rewrite inside js/ by build-dist turns this red.
// Pieces of ONE inline block (step 3 cuts the big block 1085 from the end): adjacent pieces are merged back at the seams
// (`…\n</script>\n<script src=js/x>` and `<script src=js/x></script>\n<script src=js/y>`). A piece cut from a block that
// starts with 'use strict'; carries exactly that one line first (its mode stays strict); it is dropped when merging at a
// seam. The '<script src>' order is covered too: any other order cannot rebuild the base byte for byte.
// Hoisting (static, any branch): inside one block a function declared further down can be called by top-level code;
// across files it cannot. For every classic script in document order: identifiers used by code that RUNS AT LOAD
// (top level + IIFE bodies, every branch) must not name a function declared only in a LATER script — new vs the base.
// Red runs (dist post-processed after the build, as if step 1 were missing / the SW were wrong):
//   SCRIPTV_BREAK=nov    — no ?v= on <script src="js/…"> and in the SW precache  → the new HTML must get an old script
//   SCRIPTV_BREAK=swold  — the SW matches the cache with ignoreSearch               → ?v=B is answered with the ?v=A file
//   SCRIPTV_BREAK=sedjs  — build-dist applies the module sed ('./x.js' → ?v=) to js/ too → split check red
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const esprima = createRequire(import.meta.url)('esprima');

const SRC = new URL('..', import.meta.url).pathname;
const BREAK = process.env.SCRIPTV_BREAK || '';
const PORT = +(process.env.SCRIPTV_PORT || 8795);
const TMP = fs.mkdtempSync('/tmp/scriptv-');
const ROOT = path.join(TMP, 'src');
const A = '20990202-0001', B = '20990202-0002';
const PROBES = ['js/probe-a.js', 'js/probe-b.js'];
const REAL = fs.existsSync(path.join(SRC, 'js')) ? fs.readdirSync(path.join(SRC, 'js'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => 'js/' + f).sort() : [];
const ALLJS = [...REAL, ...PROBES].sort();
const SPLIT_BASE = process.env.SPLIT_BASE || '1c5b7b9';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- split: re-inlined build == base build ----------
{
  const BS = path.join(TMP, 'base'), CU = path.join(TMP, 'cur'), SB = '20990303-0001';
  const repo = execSync('git rev-parse --show-toplevel', { cwd: SRC }).toString().trim();
  fs.mkdirSync(BS);
  execSync(`git -C '${repo}' archive ${SPLIT_BASE} source | tar -x -C '${BS}'`);
  const baseSrc = path.join(BS, 'source');
  fs.cpSync(SRC, CU, { recursive: true, filter: (s) => !/\/(dist|test|node_modules)(\/|$)/.test(path.relative(SRC, s) ? '/' + path.relative(SRC, s) : '') });
  const PROBE = "var __rqPathProbe = './probe-x.js';\n";
  let bh = fs.readFileSync(path.join(baseSrc, 'app.html'), 'utf8');
  const notCut = [], STRICT = "'use strict';\n";
  for (const f of REAL) {
    const body = fs.readFileSync(path.join(CU, f), 'utf8');
    const strict = body.startsWith(STRICT), core = strict ? body.slice(STRICT.length) : body;
    const idx = bh.indexOf(core);
    if (idx < 0 || bh.indexOf(core, idx + 1) >= 0 || bh[idx - 1] !== '\n') { notCut.push([f, idx < 0 ? 'not found' : 'not unique / not at a line start']); continue; }
    /* real block boundaries are at line starts (the code itself contains '<script' / '<\\/script>' in strings and regexes) */
    const k = bh.lastIndexOf('\n<script', idx) + 1, end = bh.indexOf('\n</script>', k);
    const blockStrict = bh.startsWith('<script>\n' + STRICT, k);
    if (!bh.startsWith('<script>\n', k) || end < 0 || end + 1 < idx + core.length) { notCut.push([f, 'not inside one inline <script>']); continue; }
    if (strict !== blockStrict) { notCut.push([f, `mode: file strict=${strict}, block strict=${blockStrict}`]); continue; }
    bh = bh.slice(0, idx + core.length) + PROBE + bh.slice(idx + core.length);
    fs.writeFileSync(path.join(CU, f), body + PROBE);
  }
  fs.writeFileSync(path.join(baseSrc, 'app.html'), bh);
  ok(`(split) every js/*.js is a verbatim, line-aligned cut of one inline <script> of ${SPLIT_BASE} app.html; 'use strict'; first iff its block is strict (${REAL.join(', ') || 'none'})`, notCut.length === 0, notCut);
  /* ---- hoisting across files ---- */
  const loadOrder = (srcDir) => {
    const h = fs.readFileSync(path.join(srcDir, 'app.html'), 'utf8'), out = [];
    for (const m of h.matchAll(/<script( src="(js\/[^"?]+\.js)")?>([\s\S]*?)<\/script>/g)) out.push(m[2] ? { n: m[2], code: fs.readFileSync(path.join(srcDir, m[2]), 'utf8') } : { n: 'inline@' + (h.slice(0, m.index).split('\n').length), code: m[3] });
    return out;
  };
  const hoistBad = (srcDir) => {
    const sc = loadOrder(srcDir).map(s => ({ ...s, ast: esprima.parseScript(s.code) }));
    const declAt = new Map();
    sc.forEach((s, i) => s.ast.body.forEach(st => { if (st.type === 'FunctionDeclaration' && !declAt.has(st.id.name)) declAt.set(st.id.name, i); }));
    const bad = [];
    sc.forEach((s, i) => {
      const refs = new Set();
      const walk = (n, parent, key) => {
        if (!n || typeof n.type !== 'string') return;
        if (n.type === 'FunctionDeclaration') return;
        if ((n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') && !(parent && parent.type === 'CallExpression' && key === 'callee')) return;
        if (n.type === 'Identifier') { if (!(parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) || (parent.type === 'Property' && key === 'key' && !parent.computed)))) refs.add(n.name); return; }
        for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(x => walk(x, n, k)); else if (v && typeof v === 'object') walk(v, n, k); }
      };
      s.ast.body.forEach(st => walk(st, null, null));
      for (const r of refs) if (declAt.has(r) && declAt.get(r) > i) bad.push(`${s.n} → ${r} (${sc[declAt.get(r)].n})`);
    });
    return { bad, n: sc.length };
  };
  const hb = hoistBad(baseSrc), hc = hoistBad(CU);
  const newBad = hc.bad.filter(x => !hb.bad.some(y => y.split(' (')[0].replace(/^inline@\d+/, 'I') === x.split(' (')[0].replace(/^inline@\d+/, 'I')));
  ok(`(split) no load-time call/use of a function declared only in a LATER script (hoisting across files; ${hc.n} classic scripts, every branch)`, newBad.length === 0, { new: newBad, alreadyInBase: hb.bad.length });
  if (BREAK === 'sedjs') { const bd = path.join(CU, 'build-dist.sh'); fs.writeFileSync(bd, fs.readFileSync(bd, 'utf8').replace(`! -path "$DIST/js/*" `, '')); }
  for (const dir of [baseSrc, CU]) execSync(`RQ_BUILD=${SB} ./build-dist.sh && RQ_NS=rqt RQ_BUILD=${SB}t ./build-dist.sh`, { cwd: dir, stdio: 'pipe' });
  const walk = (d, r = '') => fs.readdirSync(path.join(d, r), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d, path.join(r, e.name)) : [path.join(r, e.name)]);
  for (const [label, sub, bb] of [['rq', 'dist', SB], ['rqt', 'dist/test', SB + 't']]) {
    const db = path.join(baseSrc, sub), dc = path.join(CU, sub);
    const skipSub = (f) => sub === 'dist' && f.startsWith('test/');
    const htmlBad = [];
    for (const f of ['index.html', 'app.html']) {
      let h = fs.readFileSync(path.join(dc, f), 'utf8');
      const S0 = '\u0001S', E0 = '\u0001E', SU = "(?:'use strict';\\n)?";
      h = h.replace(/<script src="(js\/[^"?]+\.js)\?v=([^"]+)"><\/script>/g, (m, s, v) => v === bb ? S0 + fs.readFileSync(path.join(dc, s), 'utf8') + E0 : m);
      h = h.replace(new RegExp('\\n</script>\\n' + S0 + SU, 'g'), '\n')          /* inline head of the block + cut tail */
           .replace(new RegExp(E0 + '\\n' + S0 + SU, 'g'), '')                    /* two adjacent pieces of one block */
           .replace(new RegExp(E0 + "\\n<script>\\n" + SU, 'g'), '')            /* piece + inline rest of the block */
           .split(S0).join('<script>\n').split(E0).join('</script>');
      if (h !== fs.readFileSync(path.join(db, f), 'utf8')) htmlBad.push(f);
    }
    ok(`(split ${label}) built HTML with js/ re-inlined == build of ${SPLIT_BASE} (index.html, app.html)`, htmlBad.length === 0, htmlBad);
    const probeBad = REAL.filter(f => !fs.readFileSync(path.join(dc, f), 'utf8').endsWith(PROBE));
    ok(`(split ${label}) path strings inside js/ untouched by the build ('./probe-x.js' verbatim)`, REAL.length > 0 && probeBad.length === 0, probeBad.map(f => [f, fs.readFileSync(path.join(dc, f), 'utf8').slice(-60)]));
    const fb = walk(db).filter(f => !skipSub(f)).sort(), fc = walk(dc).filter(f => !skipSub(f) && !f.startsWith('js/')).sort();
    const diffF = [...new Set([...fb, ...fc])].filter(f => {
      if (!fb.includes(f) || !fc.includes(f)) return true;
      if (f === 'index.html' || f === 'app.html') return false;
      let a = fs.readFileSync(path.join(db, f)), c = fs.readFileSync(path.join(dc, f));
      if (f === 'sw.js') { c = Buffer.from(c.toString().replace(/"js\/[^"]+",/g, '')); }
      return !a.equals(c);
    });
    ok(`(split ${label}) every other dist file identical; sw.js differs only by js/ precache entries`, diffF.length === 0, diffF);
  }
}

// ---------- temp source with probes ----------
fs.cpSync(SRC, ROOT, { recursive: true, filter: (s) => !/\/(dist|test|node_modules)(\/|$)/.test(path.relative(SRC, s) ? '/' + path.relative(SRC, s) : '') });
let html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const anchor = "<script>window.__rqDiag&&__rqDiag.mark('scripts-end')";
if (!html.includes(anchor)) throw new Error('anchor not found in app.html');
html = html.replace(anchor, PROBES.map(p => `<script src="${p}"></script>\n`).join('') + anchor);
fs.writeFileSync(path.join(ROOT, 'app.html'), html);
function build(b) {
  for (const p of PROBES) fs.writeFileSync(path.join(ROOT, p), `'use strict';\nwindow.__rqProbe = (window.__rqProbe || []).concat('${path.basename(p, '.js')}:${b}');\n`);
  execSync(`RQ_BUILD=${b} ./build-dist.sh && RQ_NS=rqt RQ_BUILD=${b}t ./build-dist.sh`, { cwd: ROOT, stdio: 'pipe' });
  for (const [dir, bb] of [['dist', b], ['dist/test', b + 't']]) {
    const d = path.join(ROOT, dir);
    if (BREAK === 'nov') {
      for (const f of ['index.html', 'app.html']) { const fp = path.join(d, f); fs.writeFileSync(fp, fs.readFileSync(fp, 'utf8').split(`.js?v=${bb}"`).join('.js"')); }
      const sw = path.join(d, 'sw.js'); fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/"(js\/[^"?]+\.js)\?v=[^"]+"/g, '"$1"'));
    }
    if (BREAK === 'swold') {
      const sw = path.join(d, 'sw.js'); const t = fs.readFileSync(sw, 'utf8');
      const a = 'return c.match(req).then(function (m) { return m || fetch(req); });';
      if (!t.includes(a)) throw new Error('swold: fetch handler not found');
      /* look in every cache of this NS, ignoring ?v= — the "SW serves the old file" bug */
      fs.writeFileSync(sw, t.replace(a, 'return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || fetch(req); });'));
    }
  }
}
build(A);

// ---------- server: /readquest/ → temp dist, max-age=600 like Pages ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
const served = [];
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith('/readquest/')) { res.writeHead(404); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  p = path.join(ROOT, 'dist', p.slice('/readquest/'.length));
  fs.readFile(p, (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    served.push(u.pathname + u.search);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1');
const ORIGIN = `http://127.0.0.1:${PORT}`;

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function mk() { const p = await browser.newPage(); await p.setViewport({ width: 412, height: 915 }); p.on('pageerror', e => errs.push(e.message)); return p; }
const ready = (p) => p.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 }).catch(async (e) => {
  const d = await p.evaluate(() => ({ url: location.href, fail: document.getElementById('rqFail') && !document.getElementById('rqFail').classList.contains('hidden'),
    diag: JSON.parse(localStorage.getItem(RQ_NS + 'diag') || '[]').slice(-1).map(r => r.steps.map(x => x.s).join('>')) })).catch(x => ({ err: x.message }));
  console.log('READY TIMEOUT', JSON.stringify({ d, errs, served: served.slice(-15) })); throw e; });
const state = (p) => p.evaluate(() => ({
  build: RQ_BUILD, probe: window.__rqProbe || null,
  scripts: [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')),
  res: performance.getEntriesByType('resource').filter(e => /\/js\/[^?]+\.js/.test(e.name)).map(e => ({ u: new URL(e.name).pathname.replace(/^.*\/js\//, 'js/') + new URL(e.name).search, sw: e.workerStart > 0 })),
  ctl: !!navigator.serviceWorker.controller,
}));
const want = (b) => PROBES.map(p => path.basename(p, '.js') + ':' + b);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/* probe files carry the rq build number (A/B) in both rounds; pages of the rqt round are A+'t' / B+'t' */
for (const [label, base, ns, a, b, pa, pb] of [['rq', '/readquest/', 'rq', A, B, A, B], ['rqt', '/readquest/test/', 'rqt', A + 't', B + 't', A, B]]) {
  if (label === 'rqt') build(A); /* build B of the rq round wiped dist/test → back to A for both */
  // ---------- build A: first open + controlled reload ----------
  let p = await mk();
  await p.goto(ORIGIN + base, { waitUntil: 'load' }); await ready(p);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload({ waitUntil: 'load' }); await ready(p);
  let s = await state(p);
  ok(`(${label}) build ${a}: page controlled by SW, runs both js/ scripts of build ${a}`, s.ctl && s.build === a && same(s.probe, want(pa)), s);
  ok(`(${label}) build ${a}: every <script src="js/…"> carries ?v=${a} (${ALLJS.join(', ')})`, s.scripts.filter(x => x.startsWith('js/')).length === ALLJS.length && s.scripts.filter(x => x.startsWith('js/')).every(x => x.endsWith('?v=' + a)), s.scripts);
  const pre = await p.evaluate(async (c) => (await (await caches.open(c)).keys()).map(r => new URL(r.url).pathname.replace(/^.*\/js\//, 'js/') + new URL(r.url).search).filter(u => u.startsWith('js/')), ns + '-' + a);
  ok(`(${label}) SW precache ${ns}-${a} holds js/ scripts with ?v=${a}`, same(pre.sort(), ALLJS.map(x => x + '?v=' + a).sort()), pre);
  ok(`(${label}) build ${a}: js/ scripts came from the SW`, s.res.length === ALLJS.length && s.res.every(r => r.sw && r.u.endsWith('?v=' + a)), s.res);
  // ---------- deploy B, all windows of A closed, NO manual SW update: the next open ----------
  build(B);
  await p.close();
  p = await mk();
  await p.goto(ORIGIN + base, { waitUntil: 'load' }); await ready(p);
  s = await state(p);
  ok(`(${label}) after BUILD change: new HTML ${b} gets NEW js/ scripts (no old file from SW/HTTP cache)`, s.build === b && same(s.probe, want(pb)) && s.res.length === ALLJS.length && s.res.every(r => r.u.endsWith('?v=' + b)), { build: s.build, probe: s.probe, res: s.res });
  // ---------- next open after this window closed: SW of build B controls, scripts from its own cache ----------
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update().catch(() => {}); });
  await p.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting), { polling: 100, timeout: 15000 }).catch(() => {});
  await p.close();
  p = await mk();
  await p.goto(ORIGIN + base, { waitUntil: 'load' }); await ready(p);
  const swB = await p.evaluate(() => new Promise((res) => { const c = navigator.serviceWorker.controller; if (!c) return res(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data.build); c.postMessage({ t: 'build' }, [ch.port2]); setTimeout(() => res(null), 3000); }));
  s = await state(p);
  ok(`(${label}) next open on build ${b}: SW ${b} controls, ${b} scripts from its cache`, swB === b && s.build === b && same(s.probe, want(pb)) && s.res.length === ALLJS.length && s.res.every(r => r.sw && r.u.endsWith('?v=' + b)), { swB, build: s.build, probe: s.probe, res: s.res });
  await p.close();
}
ok('zero pageerror', errs.length === 0, errs);

await browser.close(); srv.close();
fs.rmSync(TMP, { recursive: true, force: true });
const n = checks.filter(c => c.p).length;
console.log(`\nSCRIPTV: ${n}/${checks.length} passed${BREAK ? ' [SCRIPTV_BREAK=' + BREAK + ']' : ''}`);
process.exit(n === checks.length ? 0 : 1);
