// Export carries ns + build (Architect blocker before testers). Both paths of Настройки → «Сохранить»:
// __rq.exportBackup (storage/state.js) and the fallback flat payload (js/settings.js). Then: import of that export still
// works, and metrics.py accepts the main-build export (skips the test one).
// Run: RQ_URL=http://127.0.0.1:8811/readquest/ node export.test.mjs   (main → ns 'rq'; …/readquest/test/ → ns 'rqt')
import puppeteer from 'puppeteer-core';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8811/readquest/';
const WANT = /\/test\/?$/.test(BASE) ? 'rqt' : 'rq';
let pass = 0, fail = 0;
const ok = (n, p, i) => { (p ? pass++ : fail++); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await (await browser.createBrowserContext()).newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 });
const shown = await page.evaluate(() => { renderSettings(); show('settings'); return (document.getElementById('buildVer') || {}).textContent; });
const clickExport = (fallback) => page.evaluate(async (fb) => {
  let blob = null; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return 'blob:x'; };
  const saved = window.__rq && window.__rq.exportBackup; if (fb) window.__rq.exportBackup = null;
  try { await document.getElementById('btnExport').onclick(); } finally { URL.createObjectURL = orig; if (fb) window.__rq.exportBackup = saved; }
  return blob ? await blob.text() : null;
}, fallback);
const check = (j, tag) => {
  ok(tag + ': ns = ' + WANT, j && j.ns === WANT, j && j.ns);
  ok(tag + ': build = number shown in Настройки (' + shown + ')', j && typeof j.build === 'string' && j.build === shown, j && j.build);
  ok(tag + ': build is not the raw marker __RQ_BUILD__', j && j.build !== '__RQ_BUILD__' && !/__RQ_/.test(String(j.build)) && !/__RQ_/.test(String(shown)), j && j.build);
  ok(tag + ': schemaVersion stays 1', j && j.schemaVersion === 1, j && j.schemaVersion);
};
// 1б-144: current position `pos` next to farthest `ratio` (built-in book: no file needed)
const PB = await page.evaluate(() => { const id = BOOKS[0].id; S.finished = S.finished.filter(x => x !== id); S.progress[id] = { ratio: 1, pos: 0.3 }; save(); return id; });
const main = JSON.parse(await clickExport(false)); check(main, 'exportBackup');
const fb = JSON.parse(await clickExport(true)); check(fb, 'fallback');
// import of the export (extra fields) still works
const imp = await page.evaluate(async (s) => { try { await __rq.importBackup(JSON.parse(s)); return 'ok'; } catch (e) { return String(e); } }, JSON.stringify(main));
ok('importBackup accepts export with ns/build', imp === 'ok', imp);
ok('pos: exportBackup carries progress[id] = {ratio:1, pos:0.3}', ((main.progress || {}).progress || {})[PB] && main.progress.progress[PB].pos === 0.3 && main.progress.progress[PB].ratio === 1, ((main.progress || {}).progress || {})[PB]);
ok('pos: fallback flat export carries pos', ((fb.readquest || {}).progress || {})[PB] && fb.readquest.progress[PB].pos === 0.3, ((fb.readquest || {}).progress || {})[PB]);
const progOf = (j) => (j.progress ? j.progress.progress : j.readquest.progress);
const roundTrip = async (j, entry) => {
  const jj = JSON.parse(JSON.stringify(j)); if (entry !== undefined) progOf(jj)[PB] = entry;
  await page.evaluate(async (s, id) => { S.progress[id] = { ratio: 0 }; save(); await __rq.importBackup(JSON.parse(s)); }, JSON.stringify(jj), PB); /* reset, then import */
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 });
  return page.evaluate(async (id) => {
    const p = Object.assign({}, S.progress[id]); show('library'); LIB.sort = 'recent'; LIB.f = 'all'; LIB.q = ''; renderLibrary();
    const card = [...document.querySelectorAll('#shelf .bookcard')].find(c => c.querySelector('.btitle').textContent.includes(BOOKS[0].title));
    const pct = card && card.querySelector('.bpct').textContent;
    await openBook(id); await new Promise(z => setTimeout(z, 800)); const o = { p, pct, page: R.page, pc: R.pageCount }; R.maxRatio = 0; await closeReader({ quiet: true }); return o; }, PB);
};
const near = (re, r) => Math.abs(re.page - Math.round(r * (re.pc - 1))) <= 1; /* text repaginates: ±1 page */
for (const [tag, j] of [['exportBackup', main], ['fallback', fb]]) {
  let re = await roundTrip(j);
  ok('pos: ' + tag + ' export pos 30 % / farthest 100 % → reset → import → opens at 30 %, card «30%»', re.p.pos === 0.3 && re.p.ratio === 1 && near(re, 0.3) && /^30%/.test(re.pct || ''), re);
  re = await roundTrip(j, { ratio: 0.6 });
  ok('pos: ' + tag + ' old backup without pos → opens at ratio 60 %', re.p.pos === undefined && re.p.ratio === 0.6 && near(re, 0.6), re);
  for (const bad of [1.5, -0.1, '0.3', null]) {
    re = await roundTrip(j, { ratio: 0.6, pos: bad });
    ok('pos: ' + tag + ' invalid pos ' + JSON.stringify(bad) + ' → dropped, opens at ratio', re.p.pos === undefined && re.p.ratio === 0.6 && near(re, 0.6), re);
  }
  re = await roundTrip(j, { ratio: 0.2, pos: 0.5 });
  ok('pos: ' + tag + ' pos 0.5 > ratio 0.2 → ratio raised to 0.5, opens at 50 %', re.p.pos === 0.5 && re.p.ratio === 0.5 && near(re, 0.5), re);
}
await browser.close();
// metrics.py on the generated export
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-export-')); fs.writeFileSync(path.join(dir, 'tester1.json'), JSON.stringify(main));
const mon = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
const r = spawnSync('python3', [new URL('./metrics.py', import.meta.url).pathname, '--start', mon, path.join(dir, 'tester1.json')], { encoding: 'utf8' });
const code = r.status, out = (r.stdout || '') + (r.stderr || '');
const skipped = /skipped .*tester1/.test(out);
ok(WANT === 'rq' ? 'metrics.py runs on the export (exit 0)' : 'metrics.py: only a test export → nothing to count (exit 1)', WANT === 'rq' ? code === 0 : code === 1, { code, out: out.slice(0, 300) });
ok(WANT === 'rq' ? 'metrics.py counts the main export (not skipped)' : 'metrics.py skips the test export (ns=rqt)', WANT === 'rq' ? !skipped : skipped, out.slice(0, 300));
console.log(`\nSUMMARY export.test ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
