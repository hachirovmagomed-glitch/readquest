// Audit 15.10, wave 1 (handoff/notes/arch.md «Аудит 15.10»). One file for the wave-1 UI/storage checks.
// contrast: page number (#pgNum) and «автор · жанр» (#content .meta) ≥ 4.5 on every reader page theme (token --r-txt-2, contrast.tsv).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node audit1.test.mjs   [RQ_ONLY=contrast,…]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh() {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return { ctx, p };
}

if (want('contrast')) {
  const { ctx, p } = await fresh();
  const res = await p.evaluate(async () => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = (c) => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const bgOf = (e) => { while (e) { const a = rgb(getComputedStyle(e).backgroundColor); if (a.length >= 3 && (a.length < 4 || a[3] > 0.9)) return a; e = e.parentElement; } return [255, 255, 255]; };
    const cr = (e) => { const b = bgOf(e); let f = rgb(getComputedStyle(e).color); let o = f[3] != null ? f[3] : 1; for (let x = e; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity);
      f = [0, 1, 2].map(i => f[i] * o + b[i] * (1 - o)); const L1 = lum(f), L2 = lum(b); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); };
    openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 1200));
    const keys = Object.keys(THEMES).concat(Object.keys(THEME_VARIANTS)).concat((typeof OLD_THEMES !== 'undefined' ? OLD_THEMES : []).map(t => t.id));
    const out = [];
    for (const k of keys) {
      SET.theme = k; SET.cBg = null; SET.cTxt = null; applySet(); await new Promise(r => setTimeout(r, 120));
      document.getElementById('reader').classList.add('barsoff'); /* page number is shown with the bars hidden */
      const n = document.getElementById('pgNum'), m = document.querySelector('#content .meta');
      out.push({ k, page: document.getElementById('reader').dataset.page, num: cr(n), meta: m ? cr(m) : null });
    }
    return out;
  });
  const bad = res.filter(r => !(r.num >= 4.5) || !(r.meta >= 4.5));
  ok('contrast: page number and «автор · жанр» ≥ 4.5 on every page theme (' + res.length + ')', res.length >= 5 && !bad.length, bad.length ? bad : res.map(r => r.k + ' ' + r.num + '/' + r.meta).join(', '));
  await ctx.close();
}

/* soon: a skin without styling (all but «Карандашный») shows «Скоро», no «Купить» on the card or the skin page, buy() refuses with
   reason 'soon' and writes nothing (coins unchanged). Already owned (bought on /test/ before): stays owned, no refund, cannot be worn yet. */
if (want('soon')) {
  const { ctx, p } = await fresh();
  const r = await p.evaluate(async () => {
    S.gold = 2000; S.owned = ['skin-dungeon']; save();
    openRewardsSheet(); await new Promise(r => setTimeout(r, 500));
    const tab = document.getElementById('rewTabShop'); if (tab) tab.click(); await new Promise(r => setTimeout(r, 300));
    renderShopPane();
    const cards = [...document.querySelectorAll('#shopList .shopcard')].map(c => ({ id: c.dataset.id, st: c.dataset.st, cta: (c.querySelector('.shopcta') || {}).textContent || '', dis: !!(c.querySelector('.shopcta') || {}).disabled }));
    openShopDetail('skin-pergament'); await new Promise(r => setTimeout(r, 200));
    const fb = document.querySelector('#shopDetail .shopbuy'); const detail = { t: fb && fb.textContent, dis: !!(fb && fb.disabled) };
    shopBack(); await new Promise(r => setTimeout(r, 200));
    const raw0 = localStorage.getItem(RQ_K.v1); const b1 = buy('skin-pergament'), b2 = buy('color-dungeon-emerald'); const raw1 = localStorage.getItem(RQ_K.v1);
    const worn = wear('skin-dungeon');
    return { cards, detail, b1, b2, same: raw0 === raw1, gold: S.gold, owned: S.owned.slice(), worn, skin: SET.skin || null };
  });
  /* 15.10: a skin leaves «Скоро» in the build that ships its styling («Эллада» first, its own test ellada.test.mjs) */
  const styled = ['skin-pencil', 'skin-ellada', 'skin-babochkovyi', 'skin-lamancha', 'skin-peterburg', 'skin-modern']; /* chapter skins: «За главу N», not «Скоро» (chapterskins.test) */
  const pencil = r.cards.find(c => c.id === 'skin-pencil'), others = r.cards.filter(c => styled.indexOf(c.id) < 0);
  ok('soon: every skin without styling (all but «Карандашный», «Эллада») shows «Скоро» (disabled), no «Купить»; «Карандашный» unchanged', others.length >= 6 && others.every(c => c.st === 'soon' && /Скоро/.test(c.cta) && c.dis) && pencil && pencil.st !== 'soon', r.cards);
  ok('soon: skin page button «Скоро», disabled', /Скоро/.test(r.detail.t || '') && r.detail.dis, r.detail);
  ok('soon: buy() refuses (reason soon) for a skin and its colour, nothing written, coins 2000', r.b1.reason === 'soon' && r.b2.reason === 'soon' && r.same && r.gold === 2000, { b1: r.b1, b2: r.b2, same: r.same, gold: r.gold });
  ok('soon: a skin bought before stays owned (no refund) and cannot be worn yet', r.owned.includes('skin-dungeon') && r.worn === false && r.skin !== 'skin-dungeon', { owned: r.owned, worn: r.worn, skin: r.skin });
  await ctx.close();
}

/* aikey (arch.md 2026-10-15): the AI helper's API key never leaves the device — export has game.ai.key '' (model kept), import of a file
   carrying a key keeps this device's own key. Fields ai / ai.key stay. */
if (want('aikey')) {
  const { ctx, p } = await fresh();
  const r = await p.evaluate(async () => {
    S.ai = { key: 'sk-test-OWN', model: 'gpt-4o-mini' }; save(); await new Promise(r => setTimeout(r, 300));
    const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
    const expKey = exp.game && exp.game.ai ? exp.game.ai.key : '(no ai)', expModel = exp.game && exp.game.ai && exp.game.ai.model;
    const raw = JSON.stringify(exp).indexOf('sk-test-OWN') >= 0;
    const foreign = JSON.parse(JSON.stringify(exp)); foreign.game.ai = { key: 'sk-FOREIGN', model: 'x-model' };
    await __rq.importBackup(foreign);
    const after = __rq.loadEnvelope().game.ai || {};
    return { expKey, expModel, raw, afterKey: after.key, afterModel: after.model };
  });
  ok('aikey: export has no API key (game.ai.key empty, model kept)', r.expKey === '' && r.expModel === 'gpt-4o-mini' && !r.raw, r);
  ok('aikey: import of a file with a key keeps this device\'s own key', r.afterKey === 'sk-test-OWN', r);
  await ctx.close();
}

/* flip (arch.md, Архитектор 15.10): page-turn settings live in SET.flip, the bottom-bar tabs in SET.nav — changing one never loses the other.
   Change flipping, then the tabs, reload → flipping kept. Import an old file without SET.flip (settings.nav = old flip object) → reload →
   flipping taken from it, settings.nav in the next export unchanged. */
if (want('flip')) {
  const { ctx, p } = await fresh();
  const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
  await p.evaluate(() => { document.getElementById('navInvert').click(); });
  await sleep(300);
  await p.evaluate(() => navSave(['library', 'rewards', 'profile', 'quests']));
  await sleep(300);
  await p.reload({ waitUntil: 'load' }); await boot();
  const a = await p.evaluate(() => ({ flip: SET.flip || null, nav: SET.nav, stored: JSON.parse(localStorage.getItem(RQ_K.set) || '{}') }));
  ok('flip: invert on, then bottom-bar tabs changed, reload → invert still on, tabs kept', !!(a.flip && a.flip.invert === true) && Array.isArray(a.nav) && a.nav.includes('quests'), a);
  const oldNav = { btns: true, tap: false, invert: true, swipe: false };
  await p.evaluate(async (oldNav) => {
    const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
    exp.settings = Object.assign({}, exp.settings, { nav: oldNav }); delete exp.settings.flip; /* a backup from before SET.flip */
    await __rq.importBackup(exp);
  }, oldNav);
  await p.reload({ waitUntil: 'load' }); await boot();
  const b = await p.evaluate(async () => { const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false }); return { flip: SET.flip || null, expNav: exp.settings.nav, expFlip: exp.settings.flip || null }; });
  ok('flip: old file without flip → flipping restored from its nav object; settings.nav in export unchanged', !!b.flip && b.flip.btns === true && b.flip.tap === false && b.flip.invert === true && b.flip.swipe === false &&
    JSON.stringify(b.expNav) === JSON.stringify(oldNav), b);
  const c = await p.evaluate(async () => { const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false }); exp.settings = Object.assign({}, exp.settings, { flip: 'broken', nav: ['library'] });
    await __rq.importBackup(exp); return __rq.loadSettings(); });
  ok('flip: imported flip that is not an object → dropped, default used', !c.flip || (typeof c.flip === 'object' && !Array.isArray(c.flip) && c.flip.tap !== false && c.flip.invert !== true), { flip: c.flip });
  await ctx.close();
}

/* posbg (arch.md, Архитектор 15.10): on visibilitychange(hidden) / pagehide the current pos is written (it only lived in memory after a
   re-layout); while the slider is dragged the pos saved before the drag stays — a preview page is never written. Only pos changes. */
if (want('posbg')) {
  const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
  const { ctx, p } = await fresh();
  await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
  const id = await p.evaluate(() => S.userBooks[0].id);
  await p.evaluate((id) => openBook(id), id); await p.waitForFunction(() => R.pageCount > 20, { timeout: 15000 }); await sleep(600);
  const hide = () => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const show = () => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const a = await p.evaluate(async (id) => {
    goPage(10, true); await new Promise(r => setTimeout(r, 200));
    const stored = () => ((JSON.parse(localStorage.getItem(RQ_K.v1)).progress.progress || {})[id] || {});
    revealChrome(); await new Promise(r => setTimeout(r, 400)); hideChrome(); await new Promise(r => setTimeout(r, 600));
    if (Math.abs(R.pos - (stored().pos || 0)) < 1e-9) R.pos = Math.min(1, R.pos + 0.013); /* emulate a re-layout that moved pos in memory only */
    const env0 = JSON.parse(localStorage.getItem(RQ_K.v1)); delete env0.progress.progress[id].pos;
    const turns0 = __tracker.snapshot().pageTurns, max0 = R.maxRatio, ev0 = (await __rq.listReadingEvents({})).filter(e => e.via === 'turn' || e.via === 'jump').length;
    return { mem: R.pos, before: stored().pos, env0: JSON.stringify(env0), turns0, max0, ev0 };
  }, id);
  await hide(); await sleep(200);
  const b = await p.evaluate(async (id) => { const env = JSON.parse(localStorage.getItem(RQ_K.v1)); const pos = env.progress.progress[id].pos; delete env.progress.progress[id].pos;
    return { pos, env: JSON.stringify(env), turns: __tracker.snapshot().pageTurns, max: R.maxRatio, ev: (await __rq.listReadingEvents({})).filter(e => e.via === 'turn' || e.via === 'jump').length }; }, id);
  await show(); await sleep(300);
  ok('posbg: hidden after a re-layout → stored pos = current pos (was only in memory)', Math.abs(b.pos - a.mem) < 1e-9 && Math.abs(a.before - a.mem) > 1e-6, { before: a.before, mem: a.mem, stored: b.pos });
  ok('posbg: only pos changed — ratio/other fields byte-identical, no turn/jump events, pageTurns and maxRatio unchanged', b.env === a.env0 && b.turns === a.turns0 && b.max === a.max0 && b.ev === a.ev0, { sameEnv: b.env === a.env0, turns: [a.turns0, b.turns], max: [a.max0, b.max], ev: [a.ev0, b.ev] });
  /* slider: start dragging far away, the app goes to the background mid-drag (hidden + pagehide), then it is killed and reopened */
  const c = await p.evaluate(async (id) => { const sl = document.getElementById('pgSlider'); const pre = R.pos; const prePage = R.page;
    sl.value = String(Math.min(R.pageCount - 1, R.page + 25)); sl.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 200));
    return { pre, prePage, sliding: !!R.sliding, previewPage: R.page }; }, id);
  await hide(); await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await sleep(200);
  const d = await p.evaluate((id) => (JSON.parse(localStorage.getItem(RQ_K.v1)).progress.progress[id] || {}).pos, id);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const e = await p.evaluate(async (id, pre) => { openBook(id); await new Promise(r => setTimeout(r, 1500)); return { pos: R.pos, page: R.page, want: Math.round(pre * (R.pageCount - 1)) }; }, id, c.pre);
  ok('posbg: hidden + pagehide while dragging the slider → stored pos is the one before the drag (preview never written)', c.sliding && c.previewPage !== c.prePage && Math.abs(d - c.pre) < 1e-9, { pre: c.pre, stored: d, preview: c.previewPage });
  /* reopen lands on a whole page: round(pos × (pages − 1)) of the pos saved before the drag, not the preview page */
  ok('posbg: reopened after the kill → book opens at the old place (not the preview page)', e.page === e.want && e.page !== c.previewPage, { pre: c.pre, reopened: e, preview: c.previewPage });
  await ctx.close();
}

/* hyph (Маня 15.10 + arch.md): text is justified only after the hyphenation dictionary really works (class rq-hyph-<lang> on <html>,
   set from the probe — @supports is not enough); without it the text is left-aligned. The class lives only in the DOM. */
if (want('hyph')) {
  const BOOK = decodeURIComponent(new URL('./fixtures/Длинная книга.txt', import.meta.url).pathname);
  const run = async (hook) => {
    const { ctx, p } = await fresh();
    await (await p.$('#fileInp')).uploadFile(BOOK); await p.waitForFunction(() => (S.userBooks || []).length > 0, { timeout: 15000 });
    const r = await p.evaluate(async (hook) => {
      Object.assign(window, hook); const id = S.userBooks[0].id; openBook(id);
      await new Promise(r => setTimeout(r, 300));
      const al = () => getComputedStyle(document.getElementById('content')).textAlign;
      const early = { align: al(), cls: [...document.documentElement.classList].filter(c => /^rq-hyph/.test(c)) };
      await new Promise(r => setTimeout(r, 3600));
      const late = { align: al(), cls: [...document.documentElement.classList].filter(c => /^rq-hyph/.test(c)), relayouts: window.__rqHyph.relayouts, page: R.page };
      const exp = JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false }));
      let ls = ''; for (let i = 0; i < localStorage.length; i++) ls += localStorage.getItem(localStorage.key(i));
      return { early, late, leak: /rq-hyph/.test(JSON.stringify(S) + ls + exp) };
    }, hook);
    await ctx.close(); return r;
  };
  const no = await run({ __rqHyphNoDict: true });
  ok('hyph: no dictionary → text left-aligned (not justified), no class', no.early.align === 'left' && no.late.align === 'left' && !no.late.cls.length, no);
  const late = await run({ __rqHyphDelay: 1200 });
  ok('hyph: dictionary arrives late → left first, then justified with class rq-hyph-ru (one silent re-layout)', late.early.align === 'left' && late.late.align === 'justify' && late.late.cls.includes('rq-hyph-ru') && late.late.relayouts >= 1, late);
  ok('hyph: the class is only in the DOM — not in S, localStorage or the export', !no.leak && !late.leak, { no: no.leak, late: late.leak });
}

ok('no page errors', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY audit1.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
