// ReadQuest PWA mini-build verification: service worker, update, offline, storage.persist, single writer, manifest.
// Rebuilds source/dist (served at http://127.0.0.1:8766/readquest/) with two test build numbers.
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import fs from 'fs';

const BASE = process.env.RQ_URL || 'http://127.0.0.1:8766/readquest/';
const SRC = new URL('..', import.meta.url).pathname;
const BOOK = '/workspace/rqtest/Длинная книга.txt';
const A = '20990101-0001', B = '20990101-0002';
const checks = [];
const ok = (n, p, i) => { checks.push({ n, p: !!p }); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const build = (b) => execSync(`RQ_BUILD=${b} ./build-dist.sh`, { cwd: SRC, stdio: 'pipe' });

build(A);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = browser.defaultBrowserContext();
async function mk() {
  const p = await browser.newPage();
  await p.setViewport({ width: 412, height: 915 });
  await p.evaluateOnNewDocument(() => {
    window.__rqTimeOffset = 0;
    const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  return p;
}
const ready = (p) => p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
const keys = (p) => p.evaluate(() => caches.keys());
const idbAll = (p, store) => p.evaluate((store) => new Promise((res, rej) => {
  const r = indexedDB.open('readquest'); r.onsuccess = () => { const q = r.result.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); };
}), store);
const gameOf = (p) => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('rq_v1') || '{}'); const g = v.game || {};
  return { gold: g.gold, xp: g.xp, awarded: (g.awardedSessionIds || []).slice().sort(), daily: (g.dailyPaidDays || []).slice().sort(), weekly: (g.weeklyPaidWeeks || []).slice().sort() }; });
const overlayOn = (p) => p.evaluate(() => { const o = document.getElementById('rqOther'); return !!o && !o.classList.contains('hidden') && getComputedStyle(o).display !== 'none'; });
const rq = (p) => p.evaluate(() => localStorage.getItem('rq_v1') + '\u0000' + localStorage.getItem('rq_set') + '\u0000' + localStorage.getItem('rq_session_draft'));
async function readSession(p, id, steps) {
  await p.bringToFront();
  await p.evaluate((id) => openBook(id), id); await sleep(400);
  for (let i = 0; i < steps; i++) { await p.evaluate(() => { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); }); await sleep(120); }
}

// ---------- (a) SW installs, rq-A cache ----------
let p1 = await mk();
await p1.goto(BASE, { waitUntil: 'load' }); await ready(p1);
await p1.evaluate(() => navigator.serviceWorker.ready);
await p1.reload({ waitUntil: 'load' }); await ready(p1);
const ctl = await p1.evaluate(() => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL);
ok('(a) SW registered and controls the page (scope /readquest/)', ctl && ctl.endsWith('/readquest/sw.js'), ctl);
const scope = await p1.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
ok('(a) SW scope = /readquest/', scope === new URL(BASE).href, scope);
let k = await keys(p1);
ok('(a) cache rq-' + A + ' exists', k.includes('rq-' + A), k);
const pre = await p1.evaluate(async (c) => (await (await caches.open(c)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search), 'rq-' + A);
ok('(a) precache has html, storage/, reader-session, pdf.js + worker, manifest, icons',
  ['/readquest/', '/readquest/index.html', '/readquest/app.html', '/readquest/manifest.webmanifest', '/readquest/vendor/pdfjs/pdf.min.js', '/readquest/vendor/pdfjs/pdf.worker.min.js', '/readquest/icons/icon-maskable-512.png', `/readquest/storage/state.js?v=${A}`, `/readquest/reader-session.js?v=${A}`].every(x => pre.includes(x)), pre.length);

// ---------- (f) manifest ----------
const man = await p1.evaluate(async () => (await fetch('manifest.webmanifest')).json());
ok('(f) manifest has no orientation', !('orientation' in man));
ok('(f) manifest standalone, #0c2127', man.display === 'standalone' && man.background_color === '#0c2127' && man.theme_color === '#0c2127');
const purp = man.icons.map(i => i.purpose);
ok('(f) icons: separate any (192+512) and maskable files', purp.filter(x => x === 'any').length === 2 && purp.includes('maskable') && !purp.some(x => /\s/.test(x)) && new Set(man.icons.map(i => i.src)).size === man.icons.length, man.icons);
const icoOk = await p1.evaluate(async (ic) => { for (const i of ic) { const r = await fetch(i.src); if (!r.ok || !(r.headers.get('content-type') || '').includes('png')) return false; } return true; }, man.icons);
ok('(f) all manifest icons served as png', icoOk);

// ---------- (d) storage_persist ----------
await sleep(500);
let ev = (await idbAll(p1, 'events')).filter(e => e.type === 'storage_persist');
ok('(d) storage_persist event with boolean granted, once per launch (2 launches → 2)', ev.length === 2 && ev.every(e => typeof e.granted === 'boolean'), ev);
const ses0 = await idbAll(p1, 'sessions');
ok('(d) storage_persist never in sessions[]', !ses0.some(s => s.type === 'storage_persist'));

// ---------- (c) offline ----------
const inp = await p1.$('#fileInp'); await inp.uploadFile(BOOK);
await p1.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
const bookId = await p1.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
await p1.setOfflineMode(true);
await p1.reload({ waitUntil: 'load' }); await ready(p1);
const offB = await p1.evaluate(() => (document.getElementById('buildVer') || {}).textContent || RQ_BUILD);
ok('(c) offline reload: app opens, shows build ' + A, offB === A, offB);
await p1.evaluate((id) => openBook(id), bookId); await sleep(600);
const offRead = await p1.evaluate(() => !document.getElementById('reader').classList.contains('hidden') && !!R.book && (R.book.text || '').length > 1000);
ok('(c) offline: previously imported book opens from IndexedDB', offRead);
await p1.evaluate(() => closeReader()); await sleep(400);
await p1.setOfflineMode(false);

// ---------- (b) update A → B ----------
await p1.evaluate(async () => { await (await caches.open('other-x')).put('/readquest/foreign', new Response('x')); });
build(B);
await p1.reload({ waitUntil: 'load' }); await ready(p1);
const shownB = await p1.evaluate(() => RQ_BUILD);
ok('(b) next open shows new build ' + B, shownB === B, shownB);
await p1.waitForFunction((b) => caches.keys().then(k => k.includes('rq-' + b) && !k.some(x => x.startsWith('rq-') && x !== 'rq-' + b)), { timeout: 15000 }, B).catch(() => {});
k = await keys(p1);
ok('(b) old rq-' + A + ' deleted, rq-' + B + ' present', !k.includes('rq-' + A) && k.includes('rq-' + B), k);
ok('(b) foreign cache other-x survives', k.includes('other-x'), k);
const mods = await p1.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js\?v=/.test(n)));
ok('(b) no mixed builds: every module loaded with ?v=' + B, mods.length > 0 && mods.every(n => n.includes('v=' + B)), mods.length);

// ---------- (e) single writer ----------
async function twoWindows(label, frozen) {
  await p1.bringToFront();
  const g0 = await gameOf(p1); const s0 = (await idbAll(p1, 'sessions')).length;
  const p2 = await mk();
  await p2.goto(BASE, { waitUntil: 'load' }); await sleep(1200);
  ok(`(${label}) second window shows overlay, does not boot`, await overlayOn(p2) && !(await p2.evaluate(() => window.__rqReady)));
  const txt = await p2.evaluate(() => document.getElementById('rqOther').textContent.replace(/\s+/g, ' '));
  if (!txt.includes('Открыть здесь')) console.log('overlay text:', txt);
  ok(`(${label}) overlay text exact, no «замок»`, txt.includes('ReadQuest открыт в другом окне') && txt.includes('Чтобы прогресс не задвоился, читать можно только в одном окне') && txt.includes('Открыть здесь') && !/замок/i.test(txt));
  // window 1 reads while window 2 is passive
  await readSession(p1, bookId, 12);
  const before = await rq(p2);
  await sleep(1500);
  ok(`(${label}) passive window writes nothing (rq_v1/rq_set/draft identical)`, before === await rq(p2) && !(await p2.evaluate(() => window.__rqReady)));
  let cdp1;
  if (frozen) { cdp1 = await p1.target().createCDPSession(); await cdp1.send('Page.setWebLifecycleState', { state: 'frozen' }); }
  await p2.bringToFront();
  const t0 = Date.now();
  await p2.click('#rqOtherBtn');
  const spin = await p2.evaluate(() => !document.querySelector('#rqOtherBtn .rq-spin').classList.contains('hidden'));
  await ready(p2); const dt = Date.now() - t0; await sleep(600);
  ok(`(${label}) takeover: window 2 boots (${frozen ? 'steal after ~2 s' : 'cooperative'}) with spinner`, spin && !(await overlayOn(p2)) && (frozen ? dt >= 1900 && dt < 6000 : dt < 1900), { dt, spin });
  if (frozen) { await cdp1.send('Page.setWebLifecycleState', { state: 'active' }); }
  await sleep(1500);
  ok(`(${label}) old window shows overlay`, await overlayOn(p1));
  const snap = await rq(p2);
  await p1.bringToFront(); await p1.evaluate(() => { try { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); } catch (e) {} try { save(); saveSet(); } catch (e) {} }); await sleep(1500);
  ok(`(${label}) old window after waking writes nothing (storage byte-identical)`, snap === await rq(p2));
  const s1 = await idbAll(p2, 'sessions'); const g1 = await gameOf(p2);
  const neu = s1.slice(s0);
  ok(`(${label}) unfinished session counted exactly once (1 new row, minutes>0)`, neu.length === 1 && neu[0].minutes > 0, neu.map(r => ({ id: r.id, minutes: r.minutes })));
  const prev = g0.awarded;
  ok(`(${label}) awardedSessionIds kept + new row awarded once`, prev.every(x => g1.awarded.includes(x)) && g1.awarded.filter(x => x === (neu[0] || {}).id).length === 1 && new Set(g1.awarded).size === g1.awarded.length);
  ok(`(${label}) balance / dailyPaidDays / weeklyPaidWeeks preserved`, g1.gold >= g0.gold && g1.xp > g0.xp && g0.daily.every(x => g1.daily.includes(x)) && g0.weekly.every(x => g1.weekly.includes(x)), { g0: { gold: g0.gold, xp: g0.xp }, g1: { gold: g1.gold, xp: g1.xp } });
  await p2.reload({ waitUntil: 'load' }); await ready(p2); await sleep(500);
  const g2 = await gameOf(p2); const s2 = await idbAll(p2, 'sessions');
  ok(`(${label}) reload: no repeat payout`, JSON.stringify(g2) === JSON.stringify(g1) && s2.length === s1.length, { g1: [g1.gold, g1.xp], g2: [g2.gold, g2.xp] });
  // p1 becomes the old window for next round: swap roles by closing p1
  return p2;
}
const pA = await twoWindows('e1', false);
await p1.close(); p1 = pA;
const pB = await twoWindows('e2', true);
await p1.close();

// ---------- TODO (stage 1, not this build) ----------
console.log('TODO (stage 1): mvp-check — backup import with legacy `cur` object (v6) must not break MVP lock-downs / payouts.');

await browser.close();
const f = checks.filter(c => !c.p).length;
console.log(`\nPWA: ${checks.length - f}/${checks.length} passed`);
process.exit(f ? 1 : 0);
