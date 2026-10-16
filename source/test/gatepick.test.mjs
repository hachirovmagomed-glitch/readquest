// Architect blocker (14.10): font / «Карандашный» picks write NS_set only when the write gate exists AND allows (window.__rqWriter && mayWrite()).
// Picks before __rqReady apply in memory, write nothing; on __rqReady exactly ONE saveSet with the current SET (no queue), only if the gate allows.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node gatepick.test.mjs
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
// hook: count NS_set writes that reach storage; at the moment __rqReady flips to true, do the picks first (= picks before ready)
const hook = (mode) => {
  window.__w = []; const f = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (window.RQ_K && k === RQ_K.set) window.__w.push({ ready: !!window.__rqR, t: performance.now(), v }); return f.call(this, k, v); };
  let r = false;
  Object.defineProperty(window, '__rqReady', { configurable: true, get() { return r; }, set(v) {
    if (v && !window.__picked && mode !== 'none') { window.__picked = 1;
      try { if (mode === 'closed') { window.__rqWriter.mayWrite = () => false; }
        const fs = document.querySelectorAll('#fontSeg button'); fs[2].onclick(); fs[5].onclick(); fs[3].onclick(); /* several picks before ready */
        renderSettings(); const pt = document.querySelector('#appThemeBox .appsw[data-k="pencil"]'); pt && pt.onclick();
        window.__mem = { font: SET.font, theme: SET.theme }; window.__wBefore = window.__w.length; } catch (e) { window.__hookErr = String(e); } }
    r = v; window.__rqR = v; } });
};
async function run(mode) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluateOnNewDocument(hook, mode);
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(1500);
  const r = await p.evaluate(() => ({ before: window.__wBefore, total: window.__w.length, after: window.__w.filter(x => x.ready).length, mem: window.__mem, err: window.__hookErr || null,
    stored: (() => { try { const s = JSON.parse(window.__w.length ? window.__w[window.__w.length - 1].v : 'null'); return s && { font: s.font, theme: s.theme }; } catch (e) { return null; } })() }));
  return { p, ctx, r, errs };
}
const base = await run('none'); const baseAfter = base.r.after; await base.ctx.close();
const a = await run('open');
ok('picks before __rqReady: applied in memory, 0 NS_set writes before ready', a.r.mem && a.r.mem.font === 3 && a.r.mem.theme === 'pencil' && a.r.before === 0 && !a.r.err, a.r);
ok('several picks before ready → exactly 1 deferred write after ready, with the current SET', a.r.after - baseAfter === 1 && a.r.stored && a.r.stored.font === 3 && a.r.stored.theme === 'pencil', { r: a.r, baseAfter });
await a.p.evaluate(() => { delete window.__picked; }); await a.p.reload({ waitUntil: 'load' }); await a.p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(800);
const rl = await a.p.evaluate(() => ({ font: SET.font, theme: SET.theme }));
ok('deferred write survives reload', rl.font === 3 && rl.theme === 'pencil', rl); await a.ctx.close();
const c = await run('closed');
ok('gate closed: picks stay in memory, 0 NS_set writes (before and after ready)', c.r.mem && c.r.mem.font === 3 && c.r.total === 0, c.r); await c.ctx.close();
const src = ['../js/reader.js', '../js/settings.js', '../js/core-b.js'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
ok('no «!window.__rqWriter||» bypass left in reader.js / settings.js / core-b.js', !/!window\.__rqWriter\s*\|\|/.test(src));
ok('no page errors', [base, a, c].every(x => x.errs.length === 0), [base, a, c].map(x => x.errs));
const n = checks.filter(Boolean).length; console.log(`SUMMARY gatepick.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
