// Library header (Интерфейс/Оскар 15.10): ☰ · «Библиотека» · search 44px · balance as TEXT «N монет(а/ы)» = Math.floor(S.gold), same source as the drawer,
// no own counter, no writes. Search hidden by default, opens in place of the header with focus, ✕ closes and clears; chips stay.
// «Моя полка» row: sort button + small menu (44px rows, check on current, skin colours, no native select) + add icon 44px (Lucide plus).
// Sort persistence (Архитектор): NS_set.libSort = string id from the whitelist; forgiving read never writes; one gated saveSet only on a DIFFERENT pick,
// deferred until __rqReady; export carries it; old backup → default; rq / rqt never mix.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node libhead.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const hookW = () => { window.__w = []; const f = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/^rqt?_/.test(String(k))) window.__w.push({ k, ready: !!window.__rqReady }); return f.call(this, k, v); }; };
async function page(w = 390) { const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); await p.evaluateOnNewDocument(hookW);
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(400); await p.evaluate(() => show('library')); await sleep(200); return { p, ctx }; }
const safe = async (f, d = {}) => { try { return await f(); } catch (e) { return Object.assign({ err: String(e.message || e).slice(0, 120) }, d); } };
const W = (p) => p.evaluate(() => window.__w.filter(x => x.k === RQ_K.set || x.k === RQ_K.v1).length);
const { p, ctx } = await page();
// 1 header layout
const h = await p.evaluate(() => { const g = (id) => document.getElementById(id); const r = (e) => e ? e.getBoundingClientRect() : null;
  const m = g('menuLib'), t = g('libTitle'), s = g('libSearchBtn'), c = g('goldChip');
  return { title: t && t.textContent.trim(), s: s ? [Math.round(r(s).width), Math.round(r(s).height), !!s.querySelector('use[href="#i-search"]')] : null,
    order: m && t && s && c ? r(m).left < r(t).left && r(t).left < r(s).left && r(s).left < r(c).left : false, chipSvg: c ? c.querySelectorAll('svg').length : -1, chip: c && c.textContent.trim(),
    sameRow: m && s && c ? Math.abs((r(s).top + r(s).bottom) / 2 - (r(c).top + r(c).bottom) / 2) < 4 : false }; });
ok('header: ☰ · «Библиотека» · search 44×44 (Lucide search) · balance text without icon, one row', h.title === 'Библиотека' && h.s && h.s[0] === 44 && h.s[1] === 44 && h.s[2] && h.order && h.chipSvg === 0 && h.sameRow, h);
// 2 balance = Math.floor(S.gold) with plural, same as drawer, no writes
const pl = await p.evaluate(async () => { window.__w.length = 0; const out = []; const g0 = S.gold;
  for (const v of [1, 3, 5, 21.9, 104.5, 0]) { S.gold = v; renderLibrary(); try { renderDrawerHead(); } catch (e) {} out.push([el('goldChip').textContent.trim(), (el('dGold') || {}).textContent]); }
  S.gold = g0; renderLibrary(); return out; });
ok('balance: Math.floor(S.gold) + plural (1 монета / 3 монеты / 5 монет / 21 монета / 104 монеты / 0 монет), equals the drawer', JSON.stringify(pl.map(x => x[0])) === JSON.stringify(['1 монета', '3 монеты', '5 монет', '21 монета', '104 монеты', '0 монет']) && pl.every(x => x[0] === x[1]), pl);
ok('balance: rendering header writes nothing', await W(p) === 0, await W(p));
// 3 shop purchase + daily payout → header and drawer identical
const pd = await p.evaluate(async () => { window.__w.length = 0; const out = {};
  /* audit 15.10: skins without styling are «Скоро» → mark all ready to exercise a real purchase */
  SHOP_CATALOG.filter(x => x.type === 'skin').forEach(x => { if (SHOP_READY.indexOf(x.id) < 0) SHOP_READY.push(x.id); });
  S.gold = 1000.6; save(); const it = SHOP_CATALOG.find(x => x.type === 'skin' && x.price > 0 && !shopOwns(x.id)); const r = buy(it.id); show('library'); renderDrawerHead();
  out.buy = { ok: r && r.ok, gold: S.gold, head: el('goldChip').textContent.trim(), drawer: el('dGold').textContent };
  const day = today(); SESS.push({ id: 'lh-' + Date.now(), date: day, bookId: allBooks()[0].id, minutes: 12, pageTurns: 3, startedAt: new Date().toISOString() });
  const g1 = S.gold; const res = awardPendingSessions(); show('library'); renderDrawerHead();
  out.daily = { paid: res.gold, before: g1, gold: S.gold, head: el('goldChip').textContent.trim(), drawer: el('dGold').textContent }; return out; });
const fl = (g) => Math.floor(g);
ok('after a shop purchase: header = drawer = floor(S.gold)', pd.buy.ok && pd.buy.head === pd.buy.drawer && pd.buy.head.startsWith(fl(pd.buy.gold) + ' '), pd.buy);
ok('after a daily payout: header = drawer = floor(S.gold)', pd.daily.gold > pd.daily.before && pd.daily.head === pd.daily.drawer && pd.daily.head.startsWith(fl(pd.daily.gold) + ' '), pd.daily);
// 4 search
const se = await safe(() => p.evaluate(async () => { const bar = el('libSearchBar'), hd = el('libHead'); const vis = (e) => !!e && e.offsetParent !== null && !e.hidden;
  const o = { hidden0: bar ? !vis(bar) : false, input0: !vis(el('libSearch')) }; el('libSearchBtn').click(); await new Promise(r => setTimeout(r, 200));
  o.open = vis(bar) && !vis(hd) && document.activeElement === el('libSearch') && vis(el('libChips'));
  const inp = el('libSearch'); inp.value = 'zzzz-nothing'; inp.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 200)); o.filtered = document.querySelectorAll('#shelf > *').length;
  const x = el('libSearchClose'); o.xIcon = !!(x && x.querySelector('use[href="#i-x"]')); x.click(); await new Promise(r => setTimeout(r, 200));
  o.closed = !vis(bar) && vis(hd) && inp.value === '' && LIB.q === '' && vis(el('libChips')); o.after = document.querySelectorAll('#shelf > *').length; return o; }));
ok('search: hidden by default; icon opens it in place of the header with focus; chips stay; ✕ closes and clears', se.hidden0 && se.input0 && se.open && se.xIcon && se.closed && se.after > se.filtered, se);
await p.screenshot({ path: '/workspace/out/libhead-test-top.png' });
// 5 sort menu + add
const sm = await safe(() => p.evaluate(async () => { window.__w.length = 0; const b = el('libSortBtn'), m = el('libSortMenu'); if (!b || !m) return { missing: true, select: !!document.querySelector('#library select') };
  const vis = (e) => e.offsetParent !== null && !e.hidden; const o = { select: !!document.querySelector('#library select'), closed0: !vis(m), label: b.textContent.trim() };
  b.click(); await new Promise(r => setTimeout(r, 200)); const rows = [...m.querySelectorAll('[role=menuitemradio]')];
  o.open = vis(m); o.under = Math.round(m.getBoundingClientRect().top) >= Math.round(b.getBoundingClientRect().bottom) - 1; o.n = rows.length; o.h = rows.map(r => Math.round(r.getBoundingClientRect().height));
  o.checks = rows.filter(r => { const c = r.querySelector('use[href="#i-check"]'); return c && getComputedStyle(c.closest('svg')).visibility !== 'hidden'; }).map(r => r.dataset.k); o.cur = LIB.sort;
  o.bg = getComputedStyle(m).backgroundColor; o.card = (() => { const t = document.createElement('div'); t.style.background = 'var(--card)'; document.body.appendChild(t); const c = getComputedStyle(t).backgroundColor; t.remove(); return c; })();
  b.click(); await new Promise(r => setTimeout(r, 150)); o.toggledClosed = !vis(m); b.click(); await new Promise(r => setTimeout(r, 150)); document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 150)); o.outsideClosed = !vis(m);
  b.click(); await new Promise(r => setTimeout(r, 150)); m.querySelector('[data-k="' + LIB.sort + '"]').click(); await new Promise(r => setTimeout(r, 200)); o.repickClosed = !vis(m);
  o.writes = window.__w.filter(x => x.k === RQ_K.set).length;
  const a = el('btnAdd'), ar = a.getBoundingClientRect(); o.add = [Math.round(ar.width), Math.round(ar.height), !!a.querySelector('use[href="#i-plus"]'), a.textContent.trim(), a.getAttribute('aria-label')]; return o; }), { missing: true, add: [] });
ok('sort: no native select; button with current label; small menu under it, 3 rows × 44px, check only on current, card colour', !sm.missing && !sm.select && sm.label === 'Недавние' && sm.closed0 && sm.open && sm.under && sm.n === 3 && sm.h.every(x => x === 44) && sm.checks.length === 1 && sm.checks[0] === sm.cur && sm.bg === sm.card, sm);
ok('sort: open/close, outside tap, re-picking the current option → 0 NS_set writes', !sm.missing && sm.toggledClosed && sm.outsideClosed && sm.repickClosed && sm.writes === 0, sm);
ok('add: 44×44 icon button, Lucide plus, no text, aria-label', !sm.missing && sm.add[0] === 44 && sm.add[1] === 44 && sm.add[2] && sm.add[3] === '' && !!sm.add[4], sm.add);
// 6 different pick → exactly one write, reload keeps it; rq namespace untouched
const pk = await safe(() => p.evaluate(async () => { const main = RQ_K.set.replace(/^rqt_/, 'rq_'); const m0 = localStorage.getItem(main); window.__w.length = 0;
  el('libSortBtn').click(); await new Promise(r => setTimeout(r, 150)); el('libSortMenu').querySelector('[data-k="title"]').click(); await new Promise(r => setTimeout(r, 300));
  const st = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); return { writes: window.__w.filter(x => x.k === RQ_K.set).length, stored: st.libSort, label: el('libSortBtn').textContent.trim(), ns: RQ_K.set, mainSame: localStorage.getItem(main) === m0, mainKey: main }; }));
ok('pick a different option → exactly 1 saveSet, NS_set.libSort = "title" (string id), label «По названию»; rq namespace untouched', pk.writes === 1 && pk.stored === 'title' && pk.label === 'По названию' && pk.ns.startsWith('rqt_') && pk.mainSame, pk);
await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(400);
const rl = await p.evaluate(() => { show('library'); const t = [...document.querySelectorAll('#shelf [data-title], #shelf .bt, #shelf b')].map(e => e.dataset.title || e.textContent.trim()).filter(Boolean);
  return { sort: LIB.sort, label: el('libSortBtn') && el('libSortBtn').textContent.trim(), writes: window.__w.filter(x => x.k === RQ_K.set).length }; });
ok('reload keeps the choice (LIB.sort = title, label «По названию»), boot writes nothing', rl.sort === 'title' && rl.label === 'По названию' && rl.writes === 0, rl);
// 7 forgiving read: broken stored values → default in memory, no write
const br = [];
for (const bad of ['"bogus"', '42', 'null', '{"x":1}']) {
  await p.evaluate((bad) => { const s = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); s.libSort = JSON.parse(bad); localStorage.setItem(RQ_K.set, JSON.stringify(s)); }, bad);
  const before = await p.evaluate(() => localStorage.getItem(RQ_K.set));
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(300);
  br.push(await safe(() => p.evaluate((before) => { show('library'); el('libSortBtn') && el('libSortBtn').click(); el('libSortBtn') && el('libSortBtn').click(); return { sort: LIB.sort, same: localStorage.getItem(RQ_K.set) === before }; }, before)));
}
ok('broken / unknown libSort → «recent» in memory, stored bytes untouched', br.every(x => x.sort === 'recent' && x.same), br);
// 8 export / import
const ex = await p.evaluate(async () => { SET.libSort = 'progress'; saveSet(); const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); const had = e.settings && e.settings.libSort;
  const old = JSON.parse(JSON.stringify(e)); delete old.settings.libSort; window.__old = old; const bad = JSON.parse(JSON.stringify(e)); bad.settings.libSort = 'drop table'; window.__bad = bad; return { had }; });
ok('export carries libSort', ex.had === 'progress', ex);
const imp = async (which) => { const r = await p.evaluate(async (w) => { try { await __rq.importBackup(window[w]); return 'ok'; } catch (e) { return String(e.message || e); } }, which);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(300);
  return { r, sort: await p.evaluate(() => { show('library'); return LIB.sort; }) }; };
await p.evaluate(() => { window.__oldS = JSON.stringify(window.__old); window.__badS = JSON.stringify(window.__bad); sessionStorage.setItem('lhOld', window.__oldS); sessionStorage.setItem('lhBad', window.__badS); });
await p.evaluate(() => { window.__old = JSON.parse(sessionStorage.getItem('lhOld')); }); const i1 = await imp('__old');
await p.evaluate(() => { window.__bad = JSON.parse(sessionStorage.getItem('lhBad')); }); const i2 = await imp('__bad');
ok('old backup without libSort → «recent»; broken libSort after import → «recent», no crash', i1.r === 'ok' && i1.sort === 'recent' && i2.r === 'ok' && i2.sort === 'recent', { i1, i2 });
await ctx.close();
// 9 picks before ready: 0 writes before, exactly 1 after; gate closed → 0
async function early(mode) { const c = await browser.createBrowserContext(); const q = await c.newPage(); await q.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); q.on('pageerror', e => errs.push(e.message));
  await q.evaluateOnNewDocument((mode) => { window.__w = []; const f = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.RQ_K && k === RQ_K.set) window.__w.push({ ready: !!window.__rqR, v }); return f.call(this, k, v); };
    let r = false; Object.defineProperty(window, '__rqReady', { configurable: true, get() { return r; }, set(v) { if (v && !window.__picked) { window.__picked = 1;
      try { if (mode === 'closed') window.__rqWriter.mayWrite = () => false; libSortPick('title'); libSortPick('progress'); libSortPick('title'); window.__mem = LIB.sort; window.__before = window.__w.length; } catch (e) { window.__err = String(e); } } r = v; window.__rqR = v; } }); }, mode);
  await q.goto(BASE, { waitUntil: 'load' }); await q.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(1200);
  const r = await q.evaluate(() => ({ mem: window.__mem, before: window.__before, after: window.__w.filter(x => x.ready).length, err: window.__err || null, stored: (() => { const l = window.__w[window.__w.length - 1]; return l ? JSON.parse(l.v).libSort : null; })() }));
  await c.close(); return r; }
const e1 = await early('open'), e2 = await early('closed');
ok('several sort picks before __rqReady → in memory, 0 writes before, exactly 1 after with the current choice', e1.mem === 'title' && e1.before === 0 && e1.after === 1 && e1.stored === 'title' && !e1.err, e1);
ok('gate closed → sort choice stays in memory, 0 writes', e2.mem === 'title' && e2.before === 0 && e2.after === 0 && !e2.err, e2);
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY libhead.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
