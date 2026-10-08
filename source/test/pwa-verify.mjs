// ReadQuest PWA mini-build verification: service worker, update, offline, storage.persist, single writer (e1–e4), no navigator.locks (e5), manifest.
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
/* on timeout: dump the boot journal (rqdiag) of the stuck page before failing */
/* polling by interval, not rAF: a background tab gets no animation frames → a 'raf' wait never resolves (test artefact) */
const ready = (p) => p.waitForFunction(() => window.__rqReady, { timeout: 20000, polling: 100 }).catch(async (e) => {
  const d = await Promise.race([p.evaluate(() => ({ url: location.href, sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), other: !document.getElementById('rqOther').classList.contains('hidden'), fail: !document.getElementById('rqFail').classList.contains('hidden'),
    runs: JSON.parse(localStorage.getItem(RQ_NS + 'diag') || '[]').map(r => ({ id: r.id, t0: r.t0, sw: r.sw, steps: r.steps.map(x => x.s + (x.x !== undefined ? '=' + JSON.stringify(x.x) : '') + '@' + x.p).join(' > ') })) })).catch(x => ({ err: x.message })), sleep(3000).then(() => ({ err: 'evaluate timeout' }))]);
  console.log('READY TIMEOUT', JSON.stringify(d, null, 1)); throw e; });
const keys = (p) => p.evaluate(() => caches.keys());
const idbAll = (p, store) => p.evaluate((store) => new Promise((res, rej) => {
  const r = indexedDB.open('readquest'); r.onsuccess = () => { const q = r.result.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); };
}), store);
const gameOf = (p) => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('rq_v1') || '{}'); const g = v.game || {};
  return { gold: g.gold, xp: g.xp, awarded: (g.awardedSessionIds || []).slice().sort(), daily: (g.dailyPaidDays || []).slice().sort(), weekly: (g.weeklyPaidWeeks || []).slice().sort() }; });
const overlayOn = (p) => p.evaluate(() => { const o = document.getElementById('rqOther'); return !!o && !o.classList.contains('hidden') && getComputedStyle(o).display !== 'none'; });
const rq = (p) => p.evaluate(() => localStorage.getItem('rq_v1') + '\u0000' + localStorage.getItem('rq_set') + '\u0000' + localStorage.getItem('rq_session_draft'));
/* old window (lost the lock): «Книга открыта в другом окне» / «Прогресс сохранён на странице N» / «Вернуться сюда»;
   N = page saved in NS_v1 (read by the NEW writer), and the saved page = the farthest page the old window reached */
async function oldScreen(pOld, pNew, id) {
  const o = await pOld.evaluate(() => ({ h: document.getElementById('rqOtherH').textContent, p: document.getElementById('rqOtherP').textContent, b: document.getElementById('rqOtherL').textContent, pc: R.pageCount, max: R.maxRatio, close: /Закрыть/.test(document.getElementById('rqOther').textContent) }));
  const ratio = await pNew.evaluate((id) => (S.progress[id] || {}).ratio || 0, id);
  const n = Math.round(ratio * (o.pc - 1)) + 1;
  return { ...o, ratio, n, ok: o.h === 'Книга открыта в другом окне' && o.p === 'Прогресс сохранён на странице ' + n && o.b === 'Вернуться сюда' && !o.close && Math.abs(ratio - o.max) < 1e-9 && n > 1 };
}
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
await p1.waitForFunction(() => (S.userBooks || []).length > 0, { polling: 100, timeout: 10000 });
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
await p1.waitForFunction(() => (S.userBooks || []).some(b => b.type === 'pdf'), { polling: 100, timeout: 15000 });
const pdfId = await p1.evaluate(() => S.userBooks.find(b => b.type === 'pdf').id);
build(B);
await p1.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p1.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting), { polling: 100, timeout: 15000 }).catch(() => {});
const waitingB = await p1.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r.waiting && !!r.active));
ok('(A) new build B installed and WAITING while old window is open (no skipWaiting)', waitingB);
await p1.evaluate(() => performance.clearResourceTimings());
await p1.evaluate((id) => openBook(id), pdfId);
await p1.waitForFunction(() => R.mode === 'pdf' && window.pdfjsLib && document.querySelector('#pdfWrap canvas'), { polling: 100, timeout: 20000 }).catch(() => {});
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
await p1.waitForFunction((b) => caches.keys().then(k => k.includes('rq-' + b) && !k.some(x => x.startsWith('rq-') && x !== 'rq-' + b)), { polling: 100, timeout: 15000 }, B).catch(() => {});
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
  const g0 = await gameOf(p1); const ids0 = new Set((await idbAll(p1, 'sessions')).map(r => r.id)); /* sessions store is keyed by UUID → compare ids, not slice by index */
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
  const dgP = await p2.evaluate(() => { const r = JSON.parse(localStorage.getItem(RQ_NS + 'diag') || '[]'); const me = r.find(x => x.id === __rqDiag.run.id); return { n: r.length, steps: me ? me.steps.map(x => x.s) : null }; });
  ok(`(${label}) boot journal: passive window logged its run (key ${'rqdiag'}, not dropped by the write gate), ≤5 runs kept`, dgP.steps && dgP.steps.includes('other-window') && dgP.steps.includes('acquire-try') && dgP.n <= 5, dgP);
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
  { const o = await oldScreen(p1, p2, bookId); ok(`(${label}) old window screen: «Книга открыта в другом окне» / «Прогресс сохранён на странице N» (N = saved = farthest page) / «Вернуться сюда», no «Закрыть»`, o.ok, o); }
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
  const neu = s1.filter(r => !ids0.has(r.id));
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
  const g0 = await gameOf(p1); const ids0 = new Set((await idbAll(p1, 'sessions')).map(r => r.id)); /* UUID-keyed store → set-of-ids diff */
  await readSession(p1, bookId, 12);
  const draftA = await p1.evaluate(() => localStorage.getItem(RQ_K.v1.replace('_v1', '_session_draft')));
  ok('(e3) A: reader active mid-session, draft present', !!draftA && await p1.evaluate(() => !!R.book && !document.getElementById('reader').classList.contains('hidden')));
  const p2 = await mk();
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForFunction(() => !document.getElementById('rqOther').classList.contains('hidden'), { polling: 100 });
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
  const s1 = await idbAll(p2, 'sessions'); const g1 = await gameOf(p2); const neu = s1.filter(r => !ids0.has(r.id));
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
  { const o = await oldScreen(p1, p2, bookId); ok('(e3) thawed A: old-window screen, page N = A\'s farthest page, already saved before the freeze (B sees it)', o.ok, o); }
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
  ok('(e3) exactly one row for A\'s session; gold/awarded/daily unchanged after thaw; A credited no XP', s2.filter(r => r.id === neu[0].id).length === 1 && s2.filter(r => !ids0.has(r.id)).length === 1 && g2a.gold === g1.gold && g2a.xp === g1.xp && JSON.stringify(g2a.awarded) === JSON.stringify(g1.awarded) && JSON.stringify(g2a.daily) === JSON.stringify(g1.daily));
  console.log('   [e3] AFTER THAW', JSON.stringify(g2a));
  await p2.bringToFront(); await p2.reload({ waitUntil: 'load' }); await ready(p2); await sleep(500);
  const g3 = await gameOf(p2); const s3 = await idbAll(p2, 'sessions');
  console.log('   [e3] RELOAD', JSON.stringify(g3));
  ok('(e3) B after reload: data intact, no repeat payout', JSON.stringify(g3) === JSON.stringify(g1) && s3.length === s1.length);
  await p1.close(); p1 = p2;
}

// ---------- (e4) two LIVE windows, both with the book open, 2 min of reading → exactly ONE session row ----------
{
  await p1.bringToFront();
  try { await p1.evaluate(() => { if (R.book) return closeReader(); }); } catch (e) {}
  await sleep(600);
  const g0 = await gameOf(p1); const ids0 = new Set((await idbAll(p1, 'sessions')).map(r => r.id)); /* sessions store is keyed by UUID → compare ids, not slice by index */
  const p2 = await mk();
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForFunction(() => !document.getElementById('rqOther').classList.contains('hidden'), { polling: 100 });
  await p2.bringToFront(); await p2.evaluate(() => document.getElementById('rqOtherBtn').click());
  await ready(p2); await sleep(800);
  ok('(e4) A handed over cooperatively and is passive, B is the writer', await p1.evaluate(() => __rqWriter.passive) && await p2.evaluate(() => !__rqWriter.passive));
  // both windows open the same book (A bypasses its overlay from the console, like a misbehaving/stale UI)
  await p2.evaluate((id) => openBook(id), bookId);
  try { await p1.evaluate((id) => openBook(id), bookId); } catch (e) {}
  await sleep(600);
  const open = { a: await p1.evaluate(() => !!(R && R.book)), b: await p2.evaluate(() => !!(R && R.book)) };
  for (let i = 0; i < 2; i++) { // 2 minutes, both windows turning pages
    for (const p of [p2, p1]) { try { await p.evaluate(() => { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); }); } catch (e) {} }
    await sleep(150);
  }
  try { await p1.evaluate(async () => { try { await closeReader(); } catch (e) {} try { await __tracker.end(); } catch (e) {} }); } catch (e) {}
  await p2.evaluate(() => closeReader()); await sleep(1200);
  const s1 = await idbAll(p2, 'sessions'); const g1 = await gameOf(p2); const neu = s1.filter(r => !ids0.has(r.id));
  ok('(e4) two live windows, 2 min: exactly 1 new session row (B), minutes in (0, 2.5]', neu.length === 1 && neu[0].minutes > 0 && neu[0].minutes <= 2.5, { open, rows: neu.map(r => ({ id: r.id, minutes: r.minutes })) });
  ok('(e4) that row paid exactly once, no extra payout from A', neu.length === 1 && g1.awarded.filter(x => x === neu[0].id).length === 1 && g1.awarded.length === g0.awarded.length + 1, { g0: [g0.gold, g0.xp], g1: [g1.gold, g1.xp] });
  ok('(e4) A stayed passive the whole time, overlay shown', await p1.evaluate(() => __rqWriter.passive) && await overlayOn(p1));
  await p1.close(); p1 = p2;
}

// ---------- (e6) «Вернуться сюда»: old window (no book open) takes the lock back, the other window becomes the old one ----------
{
  await p1.bringToFront();
  const p2 = await mk();
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForFunction(() => !document.getElementById('rqOther').classList.contains('hidden'), { polling: 100 });
  await p2.evaluate(() => document.getElementById('rqOtherBtn').click()); await ready(p2); await sleep(800);
  const o1 = await p1.evaluate(() => ({ h: document.getElementById('rqOtherH').textContent, p: document.getElementById('rqOtherP').textContent, b: document.getElementById('rqOtherL').textContent, passive: __rqWriter.passive, book: !!R.book }));
  ok('(e6) old window without an open book: «ReadQuest открыт в другом окне» / «Всё сохранено. Продолжайте в другом окне или вернитесь сюда» / «Вернуться сюда»', o1.passive && !o1.book && o1.h === 'ReadQuest открыт в другом окне' && o1.p === 'Всё сохранено. Продолжайте в другом окне или вернитесь сюда' && o1.b === 'Вернуться сюда', o1);
  await p1.bringToFront(); const t0 = Date.now();
  await Promise.all([p1.waitForNavigation({ waitUntil: 'load' }), p1.evaluate(() => document.getElementById('rqOtherBtn').click())]);
  await ready(p1); const dt = Date.now() - t0; await sleep(800);
  const st = { p1: await p1.evaluate(() => ({ passive: __rqWriter.passive, ov: !document.getElementById('rqOther').classList.contains('hidden') })), p2: await p2.evaluate(() => ({ passive: __rqWriter.passive, h: document.getElementById('rqOtherH').textContent, b: document.getElementById('rqOtherL').textContent })) };
  ok('(e6) «Вернуться сюда» → reload + takeover: this window is the writer again, the other shows the old-window screen', !st.p1.passive && !st.p1.ov && st.p2.passive && st.p2.b === 'Вернуться сюда' && await overlayOn(p2) && dt < 6000, { dt, ...st });
  await p2.close();
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
await pt.waitForFunction(() => (S.userBooks || []).length > 0, { polling: 100, timeout: 10000 });
const tBook = await pt.evaluate(() => S.userBooks[0].id);
await readSession(pt, tBook, 11); await pt.evaluate(() => closeReader()); await sleep(800);
const tk = await pt.evaluate(() => ({ ls: Object.keys(localStorage).sort(), caches: [] }));
tk.caches = await keys(pt);
const tdbs = await pt.evaluate(async () => (await indexedDB.databases()).map(d => d.name).sort());
ok('(C) test build wrote only rqt_* keys, readquest-test DB, rqt- cache', tk.ls.some(x => x === 'rqt_v1') && tk.caches.includes('rqt-' + TB) && tdbs.includes('readquest-test'), { ls: tk.ls, caches: tk.caches, dbs: tdbs });
const tdg = await pt.evaluate(() => { const r = JSON.parse(localStorage.getItem('rqtdiag') || '[]'); const l = r[r.length - 1]; return { key: RQ_NS + 'diag', n: r.length, steps: l && l.steps.map(x => x.s), build: l && l.build }; });
const tnavT = await pt.evaluate(() => { const r = JSON.parse(localStorage.getItem('rqtdiag') || '[]'); return r[r.length - 1].nav; });
ok('(C) boot journal has navigation timing (responseStart, domInteractive, workerStart)', tnavT && tnavT.responseStart > 0 && tnavT.domInteractive >= tnavT.responseStart && typeof tnavT.workerStart === 'number', tnavT);
ok('(C) test build boot journal in rqtdiag (markup → module → idb → library), build marker filled', tdg.key === 'rqtdiag' && tdg.steps && ['markup', 'module', 'acquire-out', 'idb-open', 'idb-success', 'storage-out', 'library'].every(x => tdg.steps.includes(x)) && tdg.build === TB, tdg);
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

// ---------- (D) light theme: boot screen already in the saved theme (NS_theme plain string, read before any app code) ----------
{
  await p1.bringToFront();
  await p1.evaluate(() => { S.appTheme = 'light'; save(); applyAppTheme(); });
  const tv = await p1.evaluate(() => localStorage.getItem('rq_theme'));
  await p1.reload({ waitUntil: 'load' }); await ready(p1);
  const th = await p1.evaluate(() => ({ boot: window.__rqBootTheme || null, bootBg: getComputedStyle(document.getElementById('rqBoot')).backgroundColor, bg: getComputedStyle(document.body).backgroundColor }));
  ok('(D) writer stores rq_theme as a plain string; next launch paints the boot screen in it (light: #eef2f3), same as the library', tv === '#eef2f3 #1d2b30 #526c73' && th.boot === tv && th.bootBg === 'rgb(238, 242, 243)' && th.bg === th.bootBg, { tv, ...th });
  await p1.evaluate(() => { S.appTheme = 'teal'; save(); applyAppTheme(); });
  const hit = await p1.evaluate(async () => { renderSettings(); show('settings'); const b = document.getElementById('btnDiagCopy'); b.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 100));
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const at = (y) => { const e = document.elementFromPoint(cx, y); return !!e && (e === b || b.contains(e)); };
    const out = { h: Math.round(r.height), up: at(cy - 21.5), down: at(cy + 21.5) }; show('library'); return out; });
  ok('(D) settings «Скопировать журнал запуска»: hit area ≥ 44 px tall (center ± 21.5 px hits the button)', hit.up && hit.down, hit);
  const qt = await p1.evaluate(async (id) => { await openBook(id); await new Promise(r => setTimeout(r, 400)); const g0 = S.gold, n0 = (S.quotes[id] || []).length; const os = window.selText; window.selText = () => 'Проверочная цитата';
    try { addQuote(false); } finally { window.selText = os; } const out = { mvp: isMvp(), gold: [g0, S.gold], quotes: [n0, (S.quotes[id] || []).length] }; await closeReader(); show('library'); return out; }, bookId);
  const qe = await p1.evaluate(() => { const sv = S.quotes; S.quotes = {}; let t = ''; try { renderQuotes(); t = el('quoteBox').textContent; } finally { S.quotes = sv; renderQuotes(); } return { mvp: isMvp(), text: t }; });
  ok('(D) MVP quotes empty screen: hint «🖍 Цитата» kept, no «+2» coin promise', qe.mvp && /Выделите текст/.test(qe.text) && qe.text.includes('«🖍 Цитата»') && !/\+\s*2/.test(qe.text) && !/приносит/.test(qe.text), qe);
  ok('(D) MVP: a quote is saved but gives no coins (+2 removed in MVP)', qt.mvp && qt.gold[0] === qt.gold[1] && qt.quotes[1] === qt.quotes[0] + 1, qt);
  ok('(D) back to teal → rq_theme updated', await p1.evaluate(() => localStorage.getItem('rq_theme')) === '#0c2127 #e8f1f2 #8fb0b5');
}

// ---------- (e5) browser WITHOUT navigator.locks: reading + page saved, but NO sessions / XP / coins; event no_locks; quiet line ----------
{
  await p1.close();
  const mkNoLocks = async () => { const p = await mk(); await p.evaluateOnNewDocument(() => { try { Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined, configurable: true }); } catch (e) {} }); return p; };
  const pn = await mkNoLocks();
  const t0 = Date.now();
  await pn.goto(BASE, { waitUntil: 'load' }); await ready(pn); const dt = Date.now() - t0;
  ok('(e5) no navigator.locks: app boots to the library within 3 s, no overlay', !(await pn.evaluate(() => !!navigator.locks)) && !(await overlayOn(pn)) && dt < 3000, { dt });
  const g0 = await gameOf(pn); const s0 = (await idbAll(pn, 'sessions')).length;
  await pn.evaluate((id) => openBook(id), bookId); await sleep(500);
  const quiet = await pn.evaluate(() => document.body.innerText.includes('В этом браузере опыт не начисляется'));
  ok('(e5) reader shows the quiet line «В этом браузере опыт не начисляется. Чтение и страница сохраняются»', quiet);
  const lay = await pn.evaluate(() => { const l = document.getElementById('rqNoXp'), v = document.getElementById('viewer'), d = document.getElementById('dayBar'); const a = l.getBoundingClientRect(), b = v.getBoundingClientRect(), c = d.getBoundingClientRect();
    return { text: l.textContent, h: a.height, overText: a.top < b.bottom && a.bottom > b.top, underCounter: a.top >= c.bottom - 0.5, close: !!l.querySelector('button'), color: getComputedStyle(l).color, lh: getComputedStyle(l).lineHeight, fs: getComputedStyle(l).fontSize, clipped: l.scrollHeight > l.clientHeight + 1 || l.scrollWidth > l.clientWidth + 1, ellipsis: getComputedStyle(l).textOverflow === 'ellipsis' }; });
  ok('(e5) quiet line: exact text, visible, below the session counter, not over the text, no close button', lay.text === 'В этом браузере опыт не начисляется. Чтение и страница сохраняются' && lay.h > 0 && !lay.overText && lay.underCounter && !lay.close, lay);
  ok('(e5) quiet line: line-height ≈ 1.35, wraps freely, nothing clipped', Math.abs(parseFloat(lay.lh) / parseFloat(lay.fs) - 1.35) < 0.05 && !lay.clipped && !lay.ellipsis, { lh: lay.lh, fs: lay.fs, h: lay.h, clipped: lay.clipped });
  for (let i = 0; i < 3; i++) { await pn.evaluate(() => { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); }); await sleep(150); }
  const ratio0 = await pn.evaluate(() => R.maxRatio);
  await pn.evaluate(() => closeReader()); await sleep(1200);
  const s1 = await idbAll(pn, 'sessions'); const g1 = await gameOf(pn);
  ok('(e5) no new session row, XP / coins / awarded / daily unchanged', s1.length === s0 && g1.xp === g0.xp && g1.gold === g0.gold && JSON.stringify(g1.awarded) === JSON.stringify(g0.awarded) && JSON.stringify(g1.daily) === JSON.stringify(g0.daily), { rows: [s0, s1.length], xp: [g0.xp, g1.xp], gold: [g0.gold, g1.gold] });
  const ev = (await idbAll(pn, 'events')).filter(e => e.type === 'no_locks');
  ok('(e5) analytics event no_locks logged', ev.length >= 1, ev.length);
  ok('(e5) no_locks once per boot, no session draft written', ev.length === 1 && await pn.evaluate(() => localStorage.getItem(RQ_NS + '_session_draft') === null), ev.length);
  await pn.reload({ waitUntil: 'load' }); await ready(pn);
  ok('(e5) after reload: one more no_locks (2 boots → 2)', (await idbAll(pn, 'events')).filter(e => e.type === 'no_locks').length === 2);
  const ratio1 = await pn.evaluate((id) => (S.progress[id] || {}).ratio || 0, bookId);
  ok('(e5) page saved: after reload progress = where reading stopped', ratio0 > 0 && Math.abs(ratio1 - ratio0) < 1e-9, { ratio0, ratio1 });
  await pn.close();
}

// ---------- (h) IndexedDB answers late / never: watchdog screen at 3 s with «Продолжаем пробовать…», late open → library by itself ----------
{
  /* indexedDB.open('readquest') wrapper: the REAL open is issued only at ~DELAY ms after navigation start (Infinity = never).
     'hangOnce': hang only in the first document of this tab (sessionStorage) → «Попробовать ещё раз» must then boot normally. */
  /* Economy around late-recover (Архитектор/Квестмастер): xp, gold, goldAllTime, awardedSessionIds, dailyPaidDays, weeklyPaidWeeks
     from NS_v1.game (what the app saved), + sessions rows / today's minutes / session draft (IDB + localStorage), + in-memory S.
     H_BREAK (RED runs only, test-side like G2_STRIP): 'daily' = daily-already-paid guard stripped (every boot re-pays the days of ALL rows);
     'session' = the fail-screen period opens a session (a reader draft is written while #rqFail is shown → recovered as a row at late boot);
     'progress' = the late-recover path drops reading progress and saves (the open book would restart at page 1);
     'progress-end' = the late-recover path moves every book to its last page and saves. */
  const H_BREAK = process.env.H_BREAK || '';
  const breakGuard = async (p) => { if (!H_BREAK) return; await p.evaluateOnNewDocument((mode, bid) => {
    if (mode === 'daily') { let g; Object.defineProperty(window, '__rqGame', { configurable: true, get: () => g, set: (v) => { g = Object.assign({}, v, {
      applyQuestAwards: (game, rows, newRows, o) => { const keep = (game.dailyPaidDays || []).slice(); game.dailyPaidDays = []; const out = v.applyQuestAwards(game, rows, rows, o);
        keep.forEach(d => { if (game.dailyPaidDays.indexOf(d) < 0) game.dailyPaidDays.push(d); }); return out; } }); } }); }
    if (mode === 'session') { const sid = 'hfail-' + Date.now(); let t0 = 0; const iv = setInterval(() => { const f = document.getElementById('rqFail');
      if (window.__rqReady) { clearInterval(iv); return; } if (!f || f.classList.contains('hidden')) return; if (!t0) t0 = Date.now();
      const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      localStorage.setItem(RQ_NS + '_session_draft', JSON.stringify({ id: sid, bookId: bid, date: day, countedMs: Date.now() - t0, pageTurns: 1, startedAt: t0, updatedAt: Date.now() })); }, 200); }
    if (mode === 'progress') { let f; Object.defineProperty(window, '__rqStart', { configurable: true, get: () => f, set: (v) => { f = async function () {
      /* __rqStart hydrates S at ~1.6 s (localStorage) and then waits for IDB; break = the late-recover path drops reading progress and saves */
      const r = await v.apply(this, arguments);
      if (window.__rqDiag && __rqDiag.run.steps.some(x => x.s === 'late-recover')) { S.progress = {}; save(); }
      return r; }; } }); }
    if (mode === 'progress-end') { let f; Object.defineProperty(window, '__rqStart', { configurable: true, get: () => f, set: (v) => { f = async function () {
      const r = await v.apply(this, arguments); /* break = the late-recover path sends every book to its LAST page and saves */
      if (window.__rqDiag && __rqDiag.run.steps.some(x => x.s === 'late-recover')) { Object.keys(S.progress || {}).forEach(k => { S.progress[k] = { ratio: 1 }; }); save(); }
      return r; }; } }); }
  }, H_BREAK, bookId); };
  const ECON = ['xp', 'gold', 'goldAllTime', 'awarded', 'daily', 'weekly', 'sessions', 'todayMin', 'draft'];
  const econ = async (p) => { const rows = await idbAll(p, 'sessions');
    const e = await p.evaluate(() => { const g = (JSON.parse(localStorage.getItem(RQ_NS + '_v1') || '{}').game) || {}; const srt = (a) => (a || []).slice().sort();
      return { xp: g.xp, gold: g.gold, goldAllTime: g.goldAllTime, awarded: srt(g.awardedSessionIds), daily: srt(g.dailyPaidDays), weekly: srt(g.weeklyPaidWeeks),
        draft: localStorage.getItem(RQ_NS + '_session_draft'), today: today(), mem: { xp: S.xp, gold: S.gold, goldAllTime: S.goldAllTime, daily: srt(S.dailyPaidDays), awarded: (S.awardedSessionIds || []).length } }; });
    e.sessions = rows.length; e.todayMin = Math.round(rows.filter(r => String(r.date).slice(0, 10) === e.today).reduce((a, r) => a + (Number(r.minutes) || 0), 0) * 1000) / 1000; return e; };
  const econDiff = (a, b) => ECON.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).concat(['xp', 'gold', 'goldAllTime'].filter(k => b.mem[k] !== a[k]).map(k => 'mem.' + k), JSON.stringify(b.mem.daily) !== JSON.stringify(a.daily) ? ['mem.daily'] : []);
  const short = (e) => ({ xp: e.xp, gold: e.gold, goldAllTime: e.goldAllTime, awarded: e.awarded.length, daily: e.daily, weekly: e.weekly, sessions: e.sessions, todayMin: e.todayMin, draft: !!e.draft });
  // seed: today at goal AND today's daily already paid (eligible-but-awarded) → a repeat payout would be visible
  const ps = await mk(); await ps.goto(BASE, { waitUntil: 'load' }); await ready(ps);
  const seed = await ps.evaluate(async (id) => { const need = goalMin() - dayMin(today()); let added = 0;
    added = Math.max(0, need) + 1; await __rq.logSession({ bookId: id, minutes: added, pageTurns: 3, date: today() }); SESS = await __rq.listSessions({});
    const r = awardPendingSessions(); await new Promise(res => setTimeout(res, 300));
    return { goal: goalMin(), added, todayMin: dayMin(today()), paidToday: dailyPaid(today()), seedAward: { xp: r.xp, gold: r.gold, daily: r.daily } }; }, bookId);
  ok("(h) seed: today's minutes ≥ goal and today's daily already paid (eligible-but-awarded)", seed.todayMin >= seed.goal && seed.paidToday, seed);
  const pre = await econ(ps); await ps.close(); await sleep(300);
  console.log('   [h] BEFORE', JSON.stringify(short(pre)));
  const slowIdb = async (mode) => { const p = await mk(); await breakGuard(p); await p.evaluateOnNewDocument((mode) => {
    const o = IDBFactory.prototype.open;
    let hang = mode === 'delay5' ? 5000 : Infinity;
    if (mode === 'hangOnce') { if (sessionStorage.getItem('__hung')) hang = 0; else sessionStorage.setItem('__hung', '1'); }
    if (!hang) return;
    IDBFactory.prototype.open = function (n, v) {
      if (n !== 'readquest') return o.apply(this, arguments);
      const self = this, fake = { result: undefined, error: null };
      if (hang !== Infinity) setTimeout(() => { const r = o.call(self, n, v);
        r.onupgradeneeded = (e) => { fake.result = r.result; fake.onupgradeneeded && fake.onupgradeneeded(e); };
        r.onsuccess = (e) => { fake.result = r.result; fake.onsuccess && fake.onsuccess(e); };
        r.onerror = (e) => { fake.error = r.error; fake.onerror && fake.onerror(e); };
        r.onblocked = (e) => { fake.onblocked && fake.onblocked(e); };
      }, Math.max(0, hang - performance.now()));
      return fake;
    };
  }, mode); return p; };
  const failState = (p) => p.evaluate(() => { const f = document.getElementById('rqFail'), l = document.getElementById('rqFailLine');
    return { fail: !f.classList.contains('hidden'), line: !!l && l.offsetHeight > 0 && l.textContent.trim(), spin: !!(l && l.querySelector('.rq-fspin')), ready: !!window.__rqReady }; });
  // delayed: success at ~5 s
  const pd = await slowIdb('delay5');
  const t0 = Date.now(); await pd.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(Math.max(0, 3500 - (Date.now() - t0)));
  const at35 = await failState(pd);
  ok('(h) IDB answers at ~5 s: at 3.5 s fail screen + «Продолжаем пробовать…» with spinner, not ready', at35.fail && at35.line === 'Продолжаем пробовать…' && at35.spin && !at35.ready, at35);
  const copyH = await pd.evaluate(() => Math.round(document.getElementById('rqFailCopy').getBoundingClientRect().height));
  ok('(h) «Скопировать журнал запуска» on the fail screen: tap target ≥ 44 px', copyH >= 44, copyH);
  await pd.waitForFunction(() => window.__rqReady, { timeout: 10000, polling: 100 }).catch(() => {});
  const tReady = Date.now() - t0; await sleep(400);
  const after = await failState(pd);
  const dg = await pd.evaluate(() => __rqDiag.run.steps.map(x => x.s + (x.x !== undefined ? '=' + JSON.stringify(x.x) : '') + '@' + x.p));
  ok('(h) … then the library by itself (no tap): fail screen gone, journal has watchdog → idb-success → late-recover', after.ready && !after.fail && tReady < 8000 && dg.some(x => x.startsWith('watchdog')) && dg.some(x => x.startsWith('late-recover')) && dg.findIndex(x => x.startsWith('late-recover')) > dg.findIndex(x => x.startsWith('watchdog')), { tReady, steps: dg.slice(-6) });
  // economy: late-recover changes nothing; the fail-screen period opened/counted no session
  const post = await econ(pd); console.log('   [h] AFTER late-recover', JSON.stringify(short(post)), 'mem', JSON.stringify(post.mem));
  const d1 = econDiff(pre, post).filter(k => !['sessions', 'todayMin', 'draft'].includes(k));
  ok('(h) economy after late-recover = before launch (xp, gold, goldAllTime, awardedSessionIds, dailyPaidDays, weeklyPaidWeeks; saved + in memory)' + (H_BREAK ? ` [H_BREAK=${H_BREAK}]` : ''), !d1.length, { changed: d1, before: short(pre), after: short(post) });
  ok('(h) fail-screen time opened/counted no session: no draft, no new sessions row, today\'s minutes unchanged' + (H_BREAK ? ` [H_BREAK=${H_BREAK}]` : ''), !post.draft && post.sessions === pre.sessions && post.todayMin === pre.todayMin, { draft: post.draft, sessions: [pre.sessions, post.sessions], todayMin: [pre.todayMin, post.todayMin] });
  // repeat launches the same day: another late-recover (same tab, IDB again late) + a normal boot → daily not paid twice, nothing changes
  await pd.reload({ waitUntil: 'domcontentloaded' });
  await pd.waitForFunction(() => window.__rqReady, { timeout: 12000, polling: 100 }).catch(() => {}); await sleep(600);
  const lr2 = await pd.evaluate(() => __rqDiag.run.steps.some(x => x.s === 'late-recover'));
  const post2 = await econ(pd); await pd.close(); await sleep(300);
  const pn2 = await mk(); await breakGuard(pn2); await pn2.goto(BASE, { waitUntil: 'load' }); await ready(pn2); await sleep(600);
  const post3 = await econ(pn2); await pn2.close(); await sleep(500);
  console.log('   [h] AFTER 2nd late-recover', JSON.stringify(short(post2)), '| AFTER normal boot', JSON.stringify(short(post3)));
  const d2 = econDiff(pre, post2), d3 = econDiff(pre, post3);
  ok("(h) repeat launch same day (2nd late-recover + normal boot): today's daily not paid again, economy + sessions unchanged" + (H_BREAK ? ` [H_BREAK=${H_BREAK}]` : ''), lr2 && !d2.length && !d3.length && post3.daily.filter(x => x === pre.today).length === 1, { lateRecover2: lr2, changed2: d2, changed3: d3, gold: [pre.gold, post.gold, post2.gold, post3.gold], xp: [pre.xp, post.xp, post2.xp, post3.xp] });
  // never: hang in the first document only → screen + line stay; «Попробовать ещё раз» boots normally
  const ph = await slowIdb('hangOnce');
  await ph.goto(BASE, { waitUntil: 'domcontentloaded' }); await sleep(6000);
  const h6 = await failState(ph);
  ok('(h) IDB never answers: at 6 s fail screen + «Продолжаем пробовать…» still shown, not ready', h6.fail && h6.line === 'Продолжаем пробовать…' && !h6.ready, h6);
  await Promise.all([ph.waitForNavigation({ waitUntil: 'domcontentloaded' }), ph.click('#rqFailRetry')]);
  await ph.waitForFunction(() => window.__rqReady, { timeout: 8000, polling: 100 }).catch(() => {});
  const hr = await failState(ph);
  ok('(h) «Попробовать ещё раз» → reload → library', hr.ready && !hr.fail, hr);
  await ph.close();
  // open book + late IDB: the tab was killed while reading page N (strictly in the middle) → late-recover → reopens at page N
  /* fresh copy of the book (progress 0): saving is monotonic (farthest page), so a book already read past the middle could not be put there */
  const pb = await mk(); await pb.goto(BASE, { waitUntil: 'load' }); await ready(pb);
  { const n0 = await pb.evaluate(() => S.userBooks.length); await (await pb.$('#fileInp')).uploadFile('/workspace/rqtest/Книга для позднего запуска.txt');
    await pb.waitForFunction((n0) => S.userBooks.length > n0, { polling: 100, timeout: 10000 }, n0); }
  const midId = await pb.evaluate(() => S.userBooks[S.userBooks.length - 1].id);
  await pb.bringToFront(); await pb.evaluate((id) => openBook(id), midId); await sleep(500);
  const mid = await pb.evaluate(() => Math.floor((R.pageCount - 1) / 2));
  await pb.evaluate((m) => goPage(m - 2, false), mid); await sleep(150); /* jump near the middle, then two real page turns */
  for (let i = 0; i < 2; i++) { await pb.evaluate(() => { window.__rqTimeOffset += 60000; goPage(R.page + 1, true); }); await sleep(150); }
  await sleep(500);
  const savedRatio = (p, id) => p.evaluate((id) => { const v = JSON.parse(localStorage.getItem(RQ_NS + '_v1') || '{}'); return ((v.progress && v.progress.progress) || {})[id] ? v.progress.progress[id].ratio : null; }, id);
  const bk0 = await pb.evaluate((id) => ({ page: R.page, pages: R.pageCount, mem: (S.progress[id] || {}).ratio }), midId); bk0.saved = await savedRatio(pb, midId);
  bk0.savedPage = bk0.saved == null ? null : Math.round(bk0.saved * (bk0.pages - 1)); bk0.last = bk0.pages - 1;
  ok('(h) setup: saved page strictly in the middle (0 < saved < last, 30–70 % of the book), saved = page on screen', bk0.page === mid && bk0.savedPage === mid && bk0.savedPage > 0 && bk0.savedPage < bk0.last && bk0.savedPage / bk0.last >= 0.3 && bk0.savedPage / bk0.last <= 0.7, bk0);
  await pb.close(); await sleep(400); /* closed with the book open (no closeReader) */
  const pr = await slowIdb('delay5'); await pr.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pr.waitForFunction(() => window.__rqReady, { timeout: 12000, polling: 100 }).catch(() => {}); await sleep(500);
  const bk1 = await pr.evaluate((id) => ({ late: __rqDiag.run.steps.some(x => x.s === 'late-recover'), mem: (S.progress[id] || {}).ratio }), midId); bk1.saved = await savedRatio(pr, midId);
  await pr.evaluate((id) => openBook(id), midId); await sleep(700);
  const bk2 = await pr.evaluate(() => ({ page: R.page, pages: R.pageCount }));
  await pr.evaluate(() => closeReader()); await sleep(500); bk2.savedAfter = await savedRatio(pr, midId);
  ok('(h) open book + late IDB (late-recover): reopens exactly at the saved middle page (≠ first, ≠ last), saved progress unchanged' + (H_BREAK ? ` [H_BREAK=${H_BREAK}]` : ''),
    bk1.late && bk1.mem === bk0.saved && bk1.saved === bk0.saved && bk2.pages === bk0.pages && bk2.page === bk0.savedPage && bk2.page !== 0 && bk2.page !== bk2.pages - 1 && bk2.savedAfter === bk0.saved,
    { before: { page: bk0.page, savedPage: bk0.savedPage, of: bk0.pages, saved: bk0.saved }, afterLateBoot: bk1, reopened: bk2 });
  await pr.close();
}

// ---------- (g) Wi-Fi without internet: SW network fetch hangs (never answered) → cached app within the race window ----------
/* Method: CDP Fetch.enable on the SERVICE WORKER target (page-level Fetch does not see the SW's own fetch()),
   requestPaused events are never continued. Check that the hold really caught the SW's navigation fetch. */
{
  const swT = browser.targets().find(t => t.type() === 'service_worker' && t.url() === BASE + 'sw.js');
  const pg = await mk();
  if (!swT) { ok('(g) main SW target found', false); await pg.close(); }
  else {
    const sws = await swT.createCDPSession(); const held = [];
    sws.on('Fetch.requestPaused', (e) => held.push(e.request.url)); /* never continue = hanging network */
    await sws.send('Fetch.enable', { patterns: [{ urlPattern: new URL(BASE).origin + '/*' }] });
    await pg.bringToFront();
    /* first frame: FCP when Chrome reports it (headless sometimes doesn't), else first rAF after #rqBoot is in the DOM */
    await pg.evaluateOnNewDocument(() => { const f = () => { if (document.getElementById('rqBoot')) requestAnimationFrame(() => { window.__ff = Math.round(performance.now()); }); else setTimeout(f, 5); }; f(); });
    const t0 = Date.now(); let nav = 'ok';
    await pg.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(e => { nav = 'timeout ' + (Date.now() - t0) + ' ms'; });
    await pg.waitForFunction(() => window.__rqReady, { polling: 100, timeout: 4000 }).catch(() => {});
    const within = (pr, ms, fb) => Promise.race([pr, new Promise(r => setTimeout(() => r(fb), ms))]);
    const m = await within(pg.evaluate(() => { const fcp = performance.getEntriesByName('first-contentful-paint')[0]; const st = (window.__rqDiag && __rqDiag.run.steps) || []; const lib = st.find(x => x.s === 'library');
      return { url: location.href, fcp: fcp ? Math.round(fcp.startTime) : (window.__ff || null), fcpSrc: fcp ? 'fcp' : 'raf', ready: lib ? lib.p : null, sw: !!navigator.serviceWorker.controller, boot: !!document.getElementById('rqBoot'), nav: window.__rqDiag && __rqDiag.run.nav }; }).catch(e => ({ err: e.message })), 3000, { err: 'no document (navigation still pending)', fcp: null, ready: null });
    const navHeld = held.some(u => u === BASE || u === BASE + 'index.html');
    console.log('   [g] held by SW-target Fetch:', JSON.stringify(held.slice(0, 5)), 'nav:', nav, JSON.stringify(m));
    ok('(g) hold really caught the SW network fetch of the navigation', navHeld, held.slice(0, 5));
    ok('(g) hanging network: first frame (#rqBoot / library) < 2 s', nav === 'ok' && m.fcp !== null && m.fcp < 2000, { nav, fcp: m.fcp });
    ok('(g) hanging network: library ready ≤ 3 s, controlled by SW', nav === 'ok' && m.ready !== null && m.ready <= 3000 && m.sw, { nav, ready: m.ready });
    await within(sws.send('Fetch.disable').catch(() => {}), 3000); /* no detach: detaching the SW-target session broke later newPage() */
    await within(pg.close().catch(() => {}), 5000);
  }
}

// ---------- (g2) captive portal: network ANSWERS, but not with our app (302 → foreign host / 200 foreign HTML) → our cached build opens ----------
{
  const within = (pr, ms, fb) => Promise.race([pr, new Promise(r => setTimeout(() => r(fb), ms))]);
  const swRespond = async (kind, html) => {
    const swT = browser.targets().find(t => t.type() === 'service_worker' && t.url() === BASE + 'sw.js');
    if (!swT) return { err: 'no SW target' };
    const sws = await swT.createCDPSession(); const seen = [];
    const h = (e) => {
      const u = e.request.url; seen.push(u);
      if (u !== BASE && u !== BASE + 'index.html') return sws.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {});
      if (kind === 'html') return sws.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') }).catch(() => {});
      if (kind === '302') return sws.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 302, responseHeaders: [{ name: 'Location', value: 'http://captive.invalid/login' }], body: '' }).catch(() => {});
      return sws.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
        body: Buffer.from('<!doctype html><html><head><title>Wi-Fi login</title></head><body><h1>Captive portal</h1></body></html>').toString('base64') }).catch(() => {});
    };
    sws.on('Fetch.requestPaused', h);
    await sws.send('Fetch.enable', { patterns: [{ urlPattern: new URL(BASE).origin + '/*' }] });
    const pg = await mk(); await pg.bringToFront();
    await pg.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await pg.waitForFunction(() => window.__rqReady, { timeout: 4000, polling: 100 }).catch(() => {});
    const m = await within(pg.evaluate(() => ({ url: location.href, ready: !!window.__rqReady, title: document.title, build: typeof RQ_BUILD !== 'undefined' ? RQ_BUILD : null, diagBuild: window.__rqDiag && __rqDiag.run.build })).catch(e => ({ err: e.message })), 3000, { err: 'evaluate timeout' });
    sws.off('Fetch.requestPaused', h); await within(sws.send('Fetch.disable').catch(() => {}), 3000);
    await within(pg.close().catch(() => {}), 5000);
    return { seen: seen.filter(u => u === BASE).length, ...m };
  };
  const r302 = await swRespond('302');
  ok('(g2) captive 302 → foreign host: our cached build opens at /readquest/', r302.seen > 0 && r302.url === BASE && r302.ready && r302.title === 'ReadQuest', r302);
  const r200 = await swRespond('200');
  ok('(g2) captive 200 with foreign HTML: our cached build opens, not the portal page', r200.seen > 0 && r200.url === BASE && r200.ready && r200.title === 'ReadQuest', r200);
  /* positive path: network alive + fast, answers OUR page (meta rq-app) with a DIFFERENT build id → the network version is shown, not the cache.
     G2_STRIP=1 strips the meta from that answer → the same assertion must go red (proves the check can fail). */
  const cached = fs.readFileSync(SRC + 'dist/index.html', 'utf8'); const cb = (cached.match(/const RQ_BUILD='([^']+)'/) || [])[1]; const NB = '20990101-7777';
  let netHtml = cached.replace(`const RQ_BUILD='${cb}'`, `const RQ_BUILD='${NB}'`).replace(`build:'${cb}'`, `build:'${NB}'`);
  const META = '<meta name="rq-app" content="readquest">';
  if (process.env.G2_STRIP) netHtml = netHtml.replace(META, '');
  const rNet = await swRespond('html', netHtml);
  ok(`(g2) network alive, our page (meta rq-app) with another build → network version shown (build ${NB}, cached ${cb})${process.env.G2_STRIP ? ' [G2_STRIP: meta removed]' : ''}`, cb && cb !== NB && rNet.seen > 0 && rNet.ready && rNet.build === NB && rNet.diagBuild === NB, { cachedBuild: cb, ...rNet });
  const rNoMeta = await swRespond('html', netHtml.replace(META, ''));
  ok('(g2) same answer WITHOUT the meta → treated as foreign: cached build shown', rNoMeta.seen > 0 && rNoMeta.ready && rNoMeta.build === cb, { cachedBuild: cb, ...rNoMeta });
}

// ---------- TODO (stage 1, not this build) ----------
console.log('TODO (stage 1): mvp-check — backup import with legacy `cur` object (v6) must not break MVP lock-downs / payouts.');

await Promise.race([browser.close(), sleep(10000).then(() => { try { browser.process().kill('SIGKILL'); } catch (e) {} })]);
const f = checks.filter(c => !c.p).length;
console.log(`\nPWA: ${checks.length - f}/${checks.length} passed`);
process.exit(f ? 1 : 0);
