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
const pre0 = await p1.evaluate(async (c) => (await (await caches.open(c)).keys()).map(r => new URL(r.url).pathname + new URL(r.url).search), 'rq-' + A);
ok('(a) precache has html, storage/, reader-session, pdf.js + worker, manifest, icons',
  ['/readquest/', '/readquest/index.html', '/readquest/app.html', '/readquest/manifest.webmanifest', '/readquest/vendor/pdfjs/pdf.min.js', '/readquest/vendor/pdfjs/pdf.worker.min.js', '/readquest/icons/icon-maskable-512.png', `/readquest/storage/state.js?v=${A}`, `/readquest/reader-session.js?v=${A}`].every(x => pre0.includes(x)), pre0.length);

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
// /readquest/test/ is NOT ours: offline navigation there must fail (no SW fallback to the app)
const probe = await p1.goto(BASE + 'test/probe.html', { waitUntil: 'load', timeout: 8000 }).then(r => ({ status: r && r.status(), sw: r && r.fromServiceWorker() }), e => ({ err: String(e.message).slice(0, 40) }));
ok('(c) SW does not intercept /readquest/test/ (offline → network error, not cached app)', !!probe.err || (probe.sw === false && probe.status !== 200), probe);
await p1.setOfflineMode(false);
await p1.goto(BASE, { waitUntil: 'load' }); await ready(p1);
const probe2 = await p1.goto(BASE + 'test/probe.html', { waitUntil: 'load' }).then(r => ({ status: r.status(), sw: r.fromServiceWorker() }));
ok('(c) online /readquest/test/ request bypasses SW', probe2.sw === false, probe2);
await p1.goto(BASE, { waitUntil: 'load' }); await ready(p1);

// ---------- (b) update A → B ----------
await p1.evaluate(async () => { await (await caches.open('other-x')).put('/readquest/foreign', new Response('x')); });
// ---------- (A) old window stays on its build while a new build is deployed ----------
const PDF = '/workspace/rqtest/pdf/b-nolabels-40.pdf';
const swBuild = (p) => p.evaluate(() => new Promise((res) => { const c = navigator.serviceWorker.controller; if (!c) return res(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data); c.postMessage({ t: 'build' }, [ch.port2]); setTimeout(() => res(null), 3000); }));
{ const inpP = await p1.$('#fileInp'); await inpP.uploadFile(PDF); }
await p1.waitForFunction(() => (S.userBooks || []).some(b => b.type === 'pdf'), { timeout: 15000 });
const pdfId = await p1.evaluate(() => S.userBooks.find(b => b.type === 'pdf').id);
build(B);
await p1.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p1.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting), { timeout: 15000 }).catch(() => {});
const waitingB = await p1.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting && !!r.active));
ok('(A) new build B installed and WAITING while old window is open (no skipWaiting)', waitingB);
await p1.evaluate(() => performance.clearResourceTimings());
await p1.evaluate((id) => openBook(id), pdfId);
await p1.waitForFunction(() => R.mode === 'pdf' && window.pdfjsLib && document.querySelector('#pdfWrap canvas'), { timeout: 20000 }).catch(() => {});
await sleep(800);
const ctlA = await swBuild(p1);
ok('(A) old window still controlled by SW of build ' + A, ctlA && ctlA.build === A && ctlA.cache === 'rq-' + A, ctlA);
const res = await p1.evaluate(() => performance.getEntriesByType('resource').filter(e => new URL(e.name).origin === location.origin && !e.name.startsWith('blob:')).map(e => ({ u: new URL(e.name).pathname + new URL(e.name).search, sw: e.workerStart > 0 })));
const pdfFiles = res.filter(r => /vendor\/pdfjs/.test(r.u));
const inA = await p1.evaluate(async (urls) => { const c = await caches.open(location.pathname.replace(/[^/]*$/, '') && 'rq-' + RQ_BUILD); const o = {}; for (const u of urls) o[u] = !!(await c.match(u)); return o; }, res.map(r => r.u));
ok('(A) old window opens a PDF: pdf.js (+worker) loaded', pdfFiles.length >= 1 && await p1.evaluate(() => !!window.pdfjsLib), pdfFiles);
ok('(A) every file it fetched came through the SW from cache rq-' + A + ' (no ?v=' + B + ')', res.length > 0 && res.every(r => r.sw && inA[r.u] && !r.u.includes('v=' + B)), res);
ok('(A) old window page is build ' + A, await p1.evaluate(() => RQ_BUILD) === A);
await p1.evaluate(() => closeReader()); await sleep(400);

// ---------- (b) next open after all old windows closed → build B ----------
await p1.close();
p1 = await mk();
await p1.goto(BASE, { waitUntil: 'load' }); await ready(p1);
const shownB = await p1.evaluate(() => RQ_BUILD);
ok('(b) next open shows new build ' + B, shownB === B, shownB);
await p1.waitForFunction((b) => caches.keys().then(k => k.includes('rq-' + b) && !k.some(x => x.startsWith('rq-') && x !== 'rq-' + b)), { timeout: 15000 }, B).catch(() => {});
k = await keys(p1);
ok('(b) old rq-' + A + ' deleted, rq-' + B + ' present', !k.includes('rq-' + A) && k.includes('rq-' + B), k);
ok('(b) foreign cache other-x survives', k.includes('other-x'), k);
await p1.reload({ waitUntil: 'load' }); await ready(p1);
const ctlB = await swBuild(p1);
ok('(b) controlled by SW of build ' + B, ctlB && ctlB.build === B, ctlB);
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
  const obs = await mk(); await obs.goto(BASE + 'manifest.webmanifest');
  await obs.evaluate(() => { window.__tk = 0; const c = new BroadcastChannel('rq'); c.onmessage = (e) => { if (e.data && e.data.t === 'takeover') window.__tk++; }; });
  const t0 = Date.now();
  await p2.bringToFront();
  const dis = await p2.evaluate(() => { const b = document.getElementById('rqOtherBtn'); b.click(); const d = b.disabled; b.click(); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return d; });
  await sleep(50);
  const spin = await p2.evaluate(() => !document.querySelector('#rqOtherBtn .rq-spin').classList.contains('hidden'));
  await ready(p2); const dt = Date.now() - t0; await sleep(600);
  ok(`(${label}) takeover: window 2 boots (${frozen ? 'steal after ~2 s' : 'cooperative'}) with spinner`, spin && !(await overlayOn(p2)) && (frozen ? dt >= 1900 && dt < 6000 : dt < 1900), { dt, spin });
  const tkN = await obs.evaluate(() => window.__tk); await obs.close();
  ok(`(${label}) double/triple click → button disabled while waiting, exactly one takeover sent`, dis && tkN === 1, { dis, takeovers: tkN });
  if (frozen) { await cdp1.send('Page.setWebLifecycleState', { state: 'active' }); }
  await sleep(1500);
  ok(`(${label}) old window shows overlay`, await overlayOn(p1));
  const snap = await rq(p2);
  await p1.bringToFront(); await p1.evaluate(() => { try { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); } catch (e) {} try { save(); saveSet(); } catch (e) {} }); await sleep(1500);
  ok(`(${label}) old window after waking writes nothing (storage byte-identical)`, snap === await rq(p2));
  if (frozen) {
    const sBefore = (await idbAll(p2, 'sessions')).length; const st0 = await rq(p2);
    const r = await p1.evaluate(async () => { const hadBook = !!R.book; try { await closeReader(); } catch (e) {} try { if (__tracker && __tracker.end) await __tracker.end(); } catch (e) {} return hadBook; });
    await sleep(800);
    ok(`(${label}) thawed old window: closing the session again writes no 2nd row, draft/rq_v1 not overwritten`, (await idbAll(p2, 'sessions')).length === sBefore && st0 === await rq(p2), { hadOpenBook: r });
  }
  const s1 = await idbAll(p2, 'sessions'); const g1 = await gameOf(p2);
  const neu = s1.slice(s0);
  ok(`(${label}) unfinished session counted exactly once (1 new row, minutes>0)`, neu.length === 1 && neu[0].minutes > 0, neu.map(r => ({ id: r.id, minutes: r.minutes })));
  console.log(`   [${label}] BEFORE`, JSON.stringify(g0));
  console.log(`   [${label}] AFTER `, JSON.stringify(g1));
  const prev = g0.awarded;
  ok(`(${label}) awardedSessionIds kept + new row awarded once`, prev.every(x => g1.awarded.includes(x)) && g1.awarded.filter(x => x === (neu[0] || {}).id).length === 1 && new Set(g1.awarded).size === g1.awarded.length);
  ok(`(${label}) balance / dailyPaidDays / weeklyPaidWeeks preserved`, g1.gold >= g0.gold && g1.xp > g0.xp && g0.daily.every(x => g1.daily.includes(x)) && g0.weekly.every(x => g1.weekly.includes(x)), { g0: { gold: g0.gold, xp: g0.xp }, g1: { gold: g1.gold, xp: g1.xp } });
  await p2.reload({ waitUntil: 'load' }); await ready(p2); await sleep(500);
  const g2 = await gameOf(p2); const s2 = await idbAll(p2, 'sessions');
  console.log(`   [${label}] RELOAD`, JSON.stringify(g2));
  ok(`(${label}) reload: no repeat payout`, JSON.stringify(g2) === JSON.stringify(g1) && s2.length === s1.length, { g1: [g1.gold, g1.xp], g2: [g2.gold, g2.xp] });
  // p1 becomes the old window for next round: swap roles by closing p1
  return p2;
}
const pA = await twoWindows('e1', false);
await p1.close(); p1 = pA;
const pB = await twoWindows('e2', true);
await p1.close(); p1 = pB;

// ---------- (e3) phone case: A frozen mid-session BEFORE any takeover message, B steals, A thaws with the book STILL open ----------
{
  await p1.bringToFront();
  const g0 = await gameOf(p1); const s0 = (await idbAll(p1, 'sessions')).length;
  await readSession(p1, bookId, 12);
  const draftA = await p1.evaluate(() => localStorage.getItem(RQ_K.v1.replace('_v1', '_session_draft')));
  ok('(e3) A: reader active mid-session, draft present', !!draftA && await p1.evaluate(() => !!R.book && !document.getElementById('reader').classList.contains('hidden')));
  const p2 = await mk();
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForFunction(() => !document.getElementById('rqOther').classList.contains('hidden'));
  await p1.evaluate(() => {
    const L = window.__ev = []; const t = (x) => L.push([x, Date.now() - (window.__rqTimeOffset || 0)]);
    window.__tick = 0; window.__gap = 0; let last = Date.now() - window.__rqTimeOffset; setInterval(() => { window.__tick++; const n = Date.now() - window.__rqTimeOffset; window.__gap = Math.max(window.__gap, n - last); last = n; }, 100);
    const c = new BroadcastChannel(RQ_K.bc); c.onmessage = (e) => t('bc:' + (e.data && e.data.t) + (__rqWriter.passive ? ':passive' : ':writer'));
    const d = __rqWriter.demote; __rqWriter.demote = function (w) { t('demote:' + w); return d.apply(this, arguments); };
    const cr = window.closeReader; window.closeReader = function () { t('closeReader'); return cr.apply(this, arguments); };
    const ps = __tracker.pageShown; if (ps) __tracker.pageShown = function () { const w = __rqWriter.mayWrite(); t('pageShown:' + (w ? 'writer' : 'blocked')); return ps.apply(this, arguments); };
    const oset = window.setTimeout; window.setTimeout = function (fn, ms) { return oset(function () { if (window.__thawMark && !window.__firstTimerAfterThaw) window.__firstTimerAfterThaw = __rqWriter.passive ? 'passive' : 'writer'; return typeof fn === 'function' ? fn.apply(this, arguments) : undefined; }, ms); };
    const oi = window.setTimeout; window.__firstTimer = null;
    new MutationObserver(() => { if (!document.getElementById('rqOther').classList.contains('hidden')) t('overlay'); if (!document.getElementById('summary').classList.contains('hidden')) t('summary'); if (document.querySelector('.rq-toast')) t('toast:' + document.querySelector('.rq-toast').textContent); }).observe(document.body, { subtree: true, attributes: true, childList: true });
    window.__page0 = R.page;
  });
  const tick0 = await p1.evaluate(() => window.__tick);
  const cdp = await p1.target().createCDPSession();
  /* Freeze A hard BEFORE B sends anything: lifecycle 'frozen' alone still let BroadcastChannel tasks run in
     headless Chrome (seen: cooperative close started), so also suspend JS with the debugger. Queued tasks
     (the stale takeover message, lock abort, timers) only run after resume — like a thawed phone tab. */
  await cdp.send('Debugger.enable'); await cdp.send('Debugger.pause');
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  await sleep(700);
  const frozenOk = true;
  await p2.bringToFront(); const t0 = Date.now();
  await p2.evaluate(() => document.getElementById('rqOtherBtn').click());
  await ready(p2); const dt = Date.now() - t0; await sleep(800);
  ok('(e3) B takes over by steal after ~2 s', dt >= 1900 && dt < 6000, { dt });
  const s1 = await idbAll(p2, 'sessions'); const g1 = await gameOf(p2); const neu = s1.slice(s0);
  const st1 = await rq(p2);
  ok('(e3) B finished A\'s session: exactly 1 new row, paid once', neu.length === 1 && neu[0].minutes > 0 && g1.awarded.filter(x => x === neu[0].id).length === 1 && g1.xp > g0.xp, neu.map(r => ({ id: r.id, minutes: r.minutes })));
  ok('(e3) B consumed the draft', !(await p2.evaluate(() => localStorage.getItem(RQ_K.v1.replace('_v1', '_session_draft')))));
  console.log('   [e3] BEFORE', JSON.stringify(g0));
  console.log('   [e3] AFTER ', JSON.stringify(g1));
  await cdp.send('Page.setWebLifecycleState', { state: 'active' }); await cdp.send('Debugger.resume'); await cdp.send('Debugger.disable');
  await sleep(1200);
  const evs = await p1.evaluate(() => ({ ev: window.__ev, tick: window.__tick, gap: window.__gap }));
  console.log('   [e3] A event order after thaw', JSON.stringify(evs.ev));
  ok('(e3) A JS was frozen through the whole takeover (100 ms interval had a gap ≥ 2.5 s)', evs.gap >= 2500, { maxGapMs: evs.gap });
  const names = evs.ev.map(e => e[0]); const iDem = names.findIndex(n => n.startsWith('demote'));
  ok('(e3) order: A goes passive (demote:owner) before any pageShown/closeReader/summary/toast; stale takeover message ignored', iDem >= 0 && names[iDem] === 'demote:owner' && !names.some(n => n === 'pageShown:writer' || n === 'closeReader' || n === 'summary' || n.startsWith('toast')) && !names.slice(0, iDem).some(n => n.startsWith('pageShown')), names);
  const ui = await p1.evaluate(() => ({ page: R.page, page0: window.__page0, summary: !document.getElementById('summary').classList.contains('hidden'), toast: !!document.querySelector('.rq-toast') }));
  ok('(e3) A UI: overlay immediately, page number unchanged, no summary, no reward toast', ui.page === ui.page0 && !ui.summary && !ui.toast && names.includes('overlay'), ui);
  const a = await p1.evaluate(() => ({ book: !!R.book, reader: !document.getElementById('reader').classList.contains('hidden'), passive: __rqWriter.passive }));
  ok('(e3) thawed A: book STILL open in reader, A passive, overlay shown', a.book && a.reader && a.passive && await overlayOn(p1), a);
  await p1.bringToFront();
  await p1.evaluate(async () => {
    for (let i = 0; i < 3; i++) { window.__rqTimeOffset += 60000; try { goPage(R.page + 1, true); } catch (e) {} }
    document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide'));
    try { save(); } catch (e) {} try { await __tracker.end(); } catch (e) {} try { await closeReader(); } catch (e) {}
  });
  await sleep(17000); /* > 15 s draft/visibility flush timer */
  const ui2 = await p1.evaluate(() => ({ page: R.page, page0: window.__page0, summary: !document.getElementById('summary').classList.contains('hidden'), toast: !!document.querySelector('.rq-toast'), book: !!R.book, ev: window.__ev.map(e => e[0]) }));
  ok('(e3) after poking A (page turns, visibility, save, end, close): page unchanged, no summary/toast, book still open, no pageShown as writer', ui2.page === ui2.page0 && !ui2.summary && !ui2.toast && ui2.book && !ui2.ev.includes('pageShown:writer'), { page: ui2.page, page0: ui2.page0, book: ui2.book });
  const dr2 = await p2.evaluate(() => localStorage.getItem(RQ_K.v1.replace('_v1', '_session_draft')));
  ok('(e3) NS_session_draft: B removed it, A neither rewrote nor deleted anything (still absent, rq() identical)', dr2 === null);
  const s2 = await idbAll(p2, 'sessions'); const st2 = await rq(p2); const g2a = await gameOf(p2);
  ok('(e3) thawed A writes nothing: no 2nd row, draft + rq_v1 + rq_set byte-identical, no payout', s2.length === s1.length && st2 === st1 && JSON.stringify(g2a) === JSON.stringify(g1), { rows: [s1.length, s2.length] });
  ok('(e3) exactly one row for A\'s session; gold/awarded/daily unchanged after thaw; A credited no XP', s2.filter(r => r.id === neu[0].id).length === 1 && s2.length - s0 === 1 && g2a.gold === g1.gold && g2a.xp === g1.xp && JSON.stringify(g2a.awarded) === JSON.stringify(g1.awarded) && JSON.stringify(g2a.daily) === JSON.stringify(g1.daily));
  console.log('   [e3] AFTER THAW', JSON.stringify(g2a));
  await p2.bringToFront(); await p2.reload({ waitUntil: 'load' }); await ready(p2); await sleep(500);
  const g3 = await gameOf(p2); const s3 = await idbAll(p2, 'sessions');
  console.log('   [e3] RELOAD', JSON.stringify(g3));
  ok('(e3) B after reload: data intact, no repeat payout', JSON.stringify(g3) === JSON.stringify(g1) && s3.length === s1.length);
  await p1.close(); p1 = p2;
}

// ---------- (C) test build (NS rqt, /readquest/test/) never touches rq_* data, lock or cache ----------
const TB = '20990101-0099';
execSync(`RQ_NS=rqt RQ_BUILD=${TB} ./build-dist.sh`, { cwd: SRC, stdio: 'pipe' });
const mainSnap = async () => ({
  ls: await p1.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => k.startsWith('rq_') && k !== 'rq_owner').sort().map(k => [k, localStorage.getItem(k)]))),
  ses: JSON.stringify(await idbAll(p1, 'sessions')), ev: (await idbAll(p1, 'events')).length,
  caches: JSON.stringify((await keys(p1)).filter(x => x.startsWith('rq-')).sort()),
});
await p1.bringToFront();
const m0 = await mainSnap();
const pt = await mk();
pt.on('dialog', d => d.accept());
const tnav = await pt.goto(BASE + 'test/', { waitUntil: 'load' });
ok('(C) main SW does not serve /readquest/test/', tnav && !tnav.fromServiceWorker());
await ready(pt);
const tinfo = await pt.evaluate(() => ({ ns: RQ_NS, banner: !document.getElementById('rqTestBanner').classList.contains('hidden'), txt: document.getElementById('rqTestBanner').textContent, passive: __rqWriter.passive, idb: RQ_K.idb }));
ok('(C) test build boots alongside main window (own lock), ТЕСТ banner shown', tinfo.ns === 'rqt' && tinfo.banner && tinfo.txt.includes('ТЕСТ') && !tinfo.passive && tinfo.idb === 'readquest-test', tinfo);
await pt.evaluate(() => navigator.serviceWorker.ready); await pt.reload({ waitUntil: 'load' }); await ready(pt);
const tsw = await pt.evaluate(async () => ({ scope: (await navigator.serviceWorker.getRegistration()).scope, ctl: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL }));
ok('(C) test SW scope /readquest/test/', tsw.scope === BASE + 'test/' && tsw.ctl === BASE + 'test/sw.js', tsw);
const tman = await pt.evaluate(async () => (await fetch('manifest.webmanifest')).json());
ok('(C) test manifest: own name/id/start_url in /readquest/test/, no orientation', tman.name === 'ReadQuest ТЕСТ' && new URL(tman.id, BASE + 'test/manifest.webmanifest').href === BASE + 'test/' && new URL(tman.start_url, BASE + 'test/manifest.webmanifest').href === BASE + 'test/' && !('orientation' in tman), { name: tman.name, id: tman.id, start: tman.start_url });
const tIco = await pt.evaluate(async (ic) => { const out = []; for (const i of ic) { const r = await fetch(i.src); out.push({ src: i.src, purpose: i.purpose, ok: r.ok }); } return out; }, tman.icons);
ok('(C) test manifest: Интерфейс test icons (any 192/512 + maskable + monochrome), all served; colors #0c2127; scope /readquest/test/', tIco.every(x => x.ok) && tIco.some(x => x.src.includes('icon-test-maskable') && x.purpose === 'maskable') && tIco.filter(x => x.purpose === 'any').length === 2 && tman.background_color === '#0c2127' && tman.theme_color === '#0c2127' && tman.scope === '/readquest/test/', tIco);
{ const ti = await pt.$('#fileInp'); await ti.uploadFile(BOOK); }
await pt.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 10000 });
const tBook = await pt.evaluate(() => S.userBooks[0].id);
await readSession(pt, tBook, 11); await pt.evaluate(() => closeReader()); await sleep(800);
const tk = await pt.evaluate(() => ({ ls: Object.keys(localStorage).sort(), caches: [] }));
tk.caches = await keys(pt);
const tdbs = await pt.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort());
ok('(C) test build wrote only rqt_* keys, readquest-test DB, rqt- cache', tk.ls.some(x => x === 'rqt_v1') && tk.caches.includes('rqt-' + TB) && tdbs.includes('readquest-test'), { ls: tk.ls, caches: tk.caches, dbs: tdbs });
const heldT = await pt.evaluate(async () => (await navigator.locks.query()).held.map(l => l.name).sort());
ok('(C) locks: main rq-writer and test rqt-writer held separately', heldT.includes('rq-writer') && heldT.includes('rqt-writer'), heldT);
const m1 = await mainSnap();
ok('(C) main rq_* data / sessions / events / rq- caches byte-identical after test-build session', JSON.stringify(m0) === JSON.stringify(m1), { ev0: m0.ev, ev1: m1.ev });
ok('(C) main window still the writer', await p1.evaluate(() => !__rqWriter.passive));
await pt.bringToFront();
await Promise.all([pt.waitForNavigation({ waitUntil: 'load' }), pt.click('#rqTestReset')]); /* real button + confirm dialog */ await ready(pt); await sleep(500);
const after = await pt.evaluate(async () => ({ ses: (await __rq.listSessions({})).length, books: (S.userBooks || []).length }));
const tdbs2 = await pt.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort());
const tc2 = await keys(pt);
ok('(C) «Сбросить тест» cleared test data only (fresh test app, rqt cache recreated only by SW)', after.ses === 0 && after.books === 0 && tc2.filter(x => x.startsWith('rqt-')).length <= 1, { after, tdbs2, tc2 });
const m2 = await mainSnap();
ok('(C) reset left main rq_* / readquest DB / rq- caches untouched', JSON.stringify(m0) === JSON.stringify(m2) && tdbs2.includes('readquest'));
await pt.close();

// ---------- (C2) test reset refuses in the main build ----------
{
  await p1.bringToFront();
  const m0r = await mainSnap(); const db0 = await p1.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort());
  const r = await p1.evaluate(async () => { const out = { fn: typeof window.__rqTestReset }; out.ret = await window.__rqTestReset({ noConfirm: true }); document.getElementById('rqTestReset').click(); out.banner = !document.getElementById('rqTestBanner').classList.contains('hidden'); return out; });
  await sleep(800);
  const m1r = await mainSnap(); const db1 = await p1.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort());
  ok('(C2) main build: __rqTestReset() from console refuses (false), hidden button no-op, data/DBs/caches unchanged', r.ret === false && !r.banner && JSON.stringify(m0r) === JSON.stringify(m1r) && JSON.stringify(db0) === JSON.stringify(db1) && await p1.evaluate(() => !!window.__rqReady && !__rqWriter.passive), r);
}

// ---------- TODO (stage 1, not this build) ----------
console.log('TODO (stage 1): mvp-check — backup import with legacy `cur` object (v6) must not break MVP lock-downs / payouts.');

await browser.close();
const f = checks.filter(c => !c.p).length;
console.log(`\nPWA: ${checks.length - f}/${checks.length} passed`);
process.exit(f ? 1 : 0);
