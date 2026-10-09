// Stage 1a step 1: after a BUILD change the new HTML gets the NEW js/ scripts, never an old one from the SW cache or HTTP cache.
// Self-contained: copies source/ to a temp root, adds two probe scripts to js/ + <script src> tags into app.html,
// builds A then B with build-dist.sh (rq and rqt), serves the temp dist with Cache-Control: max-age=600 (like GitHub Pages).
// Red runs (dist post-processed after the build, as if step 1 were missing / the SW were wrong):
//   SCRIPTV_BREAK=nov    — no ?v= on <script src="js/…"> and in the SW precache  → the new HTML must get an old script
//   SCRIPTV_BREAK=swold  — the SW matches the cache with ignoreSearch               → ?v=B is answered with the ?v=A file
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SRC = new URL('..', import.meta.url).pathname;
const BREAK = process.env.SCRIPTV_BREAK || '';
const PORT = +(process.env.SCRIPTV_PORT || 8795);
const TMP = fs.mkdtempSync('/tmp/scriptv-');
const ROOT = path.join(TMP, 'src');
const A = '20990202-0001', B = '20990202-0002';
const PROBES = ['js/probe-a.js', 'js/probe-b.js'];
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
  res: performance.getEntriesByType('resource').filter(e => /\/js\/probe-/.test(e.name)).map(e => ({ u: new URL(e.name).pathname.replace(/^.*\/js\//, 'js/') + new URL(e.name).search, sw: e.workerStart > 0 })),
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
  ok(`(${label}) build ${a}: every <script src="js/…"> carries ?v=${a}`, s.scripts.filter(x => x.startsWith('js/')).length === PROBES.length && s.scripts.filter(x => x.startsWith('js/')).every(x => x.endsWith('?v=' + a)), s.scripts);
  const pre = await p.evaluate(async (c) => (await (await caches.open(c)).keys()).map(r => new URL(r.url).pathname.replace(/^.*\/js\//, 'js/') + new URL(r.url).search).filter(u => u.startsWith('js/')), ns + '-' + a);
  ok(`(${label}) SW precache ${ns}-${a} holds js/ scripts with ?v=${a}`, same(pre.sort(), PROBES.map(x => x + '?v=' + a).sort()), pre);
  ok(`(${label}) build ${a}: js/ scripts came from the SW`, s.res.length === PROBES.length && s.res.every(r => r.sw), s.res);
  // ---------- deploy B, all windows of A closed, NO manual SW update: the next open ----------
  build(B);
  await p.close();
  p = await mk();
  await p.goto(ORIGIN + base, { waitUntil: 'load' }); await ready(p);
  s = await state(p);
  ok(`(${label}) after BUILD change: new HTML ${b} gets NEW js/ scripts (no old file from SW/HTTP cache)`, s.build === b && same(s.probe, want(pb)), { build: s.build, probe: s.probe, res: s.res });
  // ---------- next open after this window closed: SW of build B controls, scripts from its own cache ----------
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update().catch(() => {}); });
  await p.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting), { polling: 100, timeout: 15000 }).catch(() => {});
  await p.close();
  p = await mk();
  await p.goto(ORIGIN + base, { waitUntil: 'load' }); await ready(p);
  const swB = await p.evaluate(() => new Promise((res) => { const c = navigator.serviceWorker.controller; if (!c) return res(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data.build); c.postMessage({ t: 'build' }, [ch.port2]); setTimeout(() => res(null), 3000); }));
  s = await state(p);
  ok(`(${label}) next open on build ${b}: SW ${b} controls, ${b} scripts from its cache`, swB === b && s.build === b && same(s.probe, want(pb)) && s.res.length === PROBES.length && s.res.every(r => r.sw), { swB, build: s.build, probe: s.probe, res: s.res });
  await p.close();
}
ok('zero pageerror', errs.length === 0, errs);

await browser.close(); srv.close();
fs.rmSync(TMP, { recursive: true, force: true });
const n = checks.filter(c => c.p).length;
console.log(`\nSCRIPTV: ${n}/${checks.length} passed${BREAK ? ' [SCRIPTV_BREAK=' + BREAK + ']' : ''}`);
process.exit(n === checks.length ? 0 : 1);
