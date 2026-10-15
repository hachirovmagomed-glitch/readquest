// Audit 15.10, wave 2 (handoff/notes/arch.md «Аудит 15.10, волна 2»). One file for the wave-2 checks.
// gate: every NS_set write goes through the write gate. Passive window (mayWrite() false) → no NS_set write from any settings control;
//       writer window → the same controls write; before __rqReady → nothing written, then exactly ONE write on ready.
// static: the raw localStorage write of NS_set exists in one place only (saveSetRaw), called only by the gate.
// motion: prefers-reduced-motion OR «Анимации» off (S.ux.anim === false) → no confetti, no book fly-in / opening animation, no CSS animations;
//         default → confetti still runs (sanity).
// s360: «Общие настройки» at 360 and 390: no word of a row label is split across lines; the last VISIBLE row of a card has no divider.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node audit2.test.mjs   [RQ_ONLY=gate,static,…]
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SRC = new URL('../', import.meta.url);

if (want('static')) {
  const files = ['app.html'].concat(readdirSync(new URL('js/', SRC)).filter(f => f.endsWith('.js')).map(f => 'js/' + f));
  const raw = [], direct = [];
  for (const f of files) {
    readFileSync(new URL(f, SRC), 'utf8').split('\n').forEach((l, i) => {
      if (/localStorage\.setItem\(\s*RQ_K\.set\b/.test(l)) raw.push(f + ':' + (i + 1));
      if (/\bsaveSetRaw\(/.test(l) && !/function saveSetRaw\(/.test(l)) direct.push(f + ':' + (i + 1));
    });
  }
  ok('static: one raw NS_set write in the code (function saveSetRaw in js/reader.js)', raw.length === 1 && /^js\/reader\.js:/.test(raw[0]) &&
    /function saveSetRaw\(/.test(readFileSync(new URL(raw[0].split(':')[0], SRC), 'utf8').split('\n')[+raw[0].split(':')[1] - 1]), raw);
  ok('static: saveSetRaw is called only by the gate (rqSaveSetGated, rqFlushSetPending in js/reader.js)', direct.length === 2 && direct.every(d => /^js\/reader\.js:/.test(d)), direct);
}

if (want('gate')) {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const hook = () => {
    window.__w = []; const f = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (window.RQ_K && k === RQ_K.set) window.__w.push({ ready: !!window.__rqReady, v }); return f.call(this, k, v); };
  };
  /* every settings control that used to call saveSet() directly (wave-1 list: reader.js, pdf.js, reader-ui.js, settings.js, start.js, content.js) */
  const poke = () => {
    const out = []; const click = (id) => { const e = document.getElementById(id); if (e && e.onclick) { e.onclick({ target: e }); out.push(id); } };
    ['lhPlus', 'lhMinus', 'mgPlus', 'mgMinus', 'lsPlus', 'lsMinus', 'alignL', 'alignJ', 'hyphTgl', 'hyphTgl', 'indTgl', 'indTgl', 'wBold', 'wNorm', 'cReset', 'readCntTgl', 'readCntTgl'].forEach(click);
    for (const id of ['dimRange', 'pdfDimRange']) { const e = document.getElementById(id); if (e && e.onchange) { e.onchange({ target: e }); out.push(id); } }
    const c = document.getElementById('cBg'); if (c && c.oninput) { c.oninput({ target: { value: '#f0e6d2' } }); out.push('cBg'); }
    document.querySelectorAll('#focusSeg button').forEach(b => { if (b.onclick) { b.onclick(); out.push('focus:' + b.dataset.f); } });
    saveSet(); out.push('saveSet()'); /* gestures (brightness in pdf.js / reader-ui.js), PDF size, theme picks: all end in saveSet() */
    return out;
  };
  async function run(mode) {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.evaluateOnNewDocument(hook);
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(800);
    const r = await p.evaluate((mode, pokeSrc) => {
      const poke = eval('(' + pokeSrc + ')'); renderSettings();
      if (mode === 'passive') window.__rqWriter.mayWrite = () => false;
      const n0 = window.__w.length; const stored0 = localStorage.getItem(RQ_K.set); const did = poke();
      return { did, writes: window.__w.length - n0, same: localStorage.getItem(RQ_K.set) === stored0 };
    }, mode, poke.toString());
    await ctx.close(); return { r, errs };
  }
  const pas = await run('passive');
  ok('gate passive: no settings control writes NS_set when the window may not write (' + pas.r.did.length + ' controls)', pas.r.did.length >= 20 && pas.r.writes === 0 && pas.r.same && !pas.errs.length, { writes: pas.r.writes, errs: pas.errs, did: pas.r.did });
  const wr = await run('writer');
  ok('gate writer: the same controls still write in the writer window', wr.r.did.length >= 20 && wr.r.writes >= wr.r.did.length && !wr.r.same && !wr.errs.length, { writes: wr.r.writes, errs: wr.errs });

  /* before ready: direct saveSet() calls (and mvpForceOn at load) write nothing until __rqReady, then exactly one write */
  {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
    await p.evaluateOnNewDocument(() => {
      window.__w = []; const f = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (window.RQ_K && k === RQ_K.set) window.__w.push({ ready: !!window.__rqR, v }); return f.call(this, k, v); };
      let r = false;
      Object.defineProperty(window, '__rqReady', { configurable: true, get() { return r; }, set(v) {
        if (v && !window.__picked) { window.__picked = 1; try { SET.lh = 1.9; saveSet(); SET.margin = 34; saveSet(); window.__early = window.__w.length; } catch (e) { window.__hookErr = String(e); } }
        r = v; window.__rqR = v; } });
    });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(800);
    const r = await p.evaluate(() => ({ early: window.__early, before: window.__w.filter(x => !x.ready).length, after: window.__w.filter(x => x.ready).length, err: window.__hookErr || null,
      stored: (() => { const s = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); return { lh: s.lh, margin: s.margin }; })() }));
    ok('gate before ready: saveSet() writes nothing before __rqReady, then exactly one write with the current SET', !r.err && r.early === 0 && r.before === 0 && r.after === 1 && r.stored.lh === 1.9 && r.stored.margin === 34, r);
    await ctx.close();
  }
  await browser.close();
}

if (want('motion') || want('s360')) {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  async function page(w, reduce) {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(500);
    return { ctx, p, errs };
  }
  const probe = () => {
    document.querySelectorAll('.confetti').forEach(n => n.remove());
    confetti(); confettiReward(); confettiSummary(); const conf = document.querySelectorAll('.confetti').length;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:60px'; document.body.appendChild(host);
    const anim = ['flyin', 'opening'].map(c => { const d = document.createElement('div'); d.className = 'shelfbook ' + c; host.appendChild(d); return getComputedStyle(d).animationName; });
    const spin = document.createElement('div'); spin.className = 'pdfSpin'; host.appendChild(spin); anim.push(getComputedStyle(spin).animationName);
    host.remove(); document.querySelectorAll('.confetti').forEach(n => n.remove());
    return { conf, anim, still: document.documentElement.classList.contains('rq-still') };
  };
  if (want('motion')) {
    { const { ctx, p, errs } = await page(390, false); const r = await p.evaluate(probe);
      ok('motion default: confetti and book animations run', r.conf > 0 && r.anim[0] !== 'none' && r.anim[1] !== 'none' && !errs.length, r); await ctx.close(); }
    { const { ctx, p, errs } = await page(390, true); const r = await p.evaluate(probe);
      ok('motion prefers-reduced-motion: no confetti, no fly-in / opening / spinner animation', r.conf === 0 && r.anim.every(a => a === 'none') && !errs.length, r); await ctx.close(); }
    { const { ctx, p, errs } = await page(390, false);
      const r = await p.evaluate((probeSrc) => { renderSettings(); const b = document.getElementById('uxAnim'); if (S.ux.anim !== false) b.onclick();
        const off = eval('(' + probeSrc + ')')(); b.onclick(); const on = eval('(' + probeSrc + ')')(); return { off, on, anim: S.ux.anim }; }, probe.toString());
      ok('motion «Анимации» off: no confetti, no book animations; back on → they return', r.off.conf === 0 && r.off.still && r.off.anim.every(a => a === 'none') && r.on.conf > 0 && !r.on.still && r.on.anim[0] !== 'none' && !errs.length, r); await ctx.close(); }
  }
  if (want('s360')) for (const w of [360, 390]) {
    const { ctx, p, errs } = await page(w, false);
    const r = await p.evaluate(async () => {
      renderSettings(); show('settings'); await new Promise(z => setTimeout(z, 400));
      const split = [];
      document.querySelectorAll('#settings .setrow .lab').forEach(lab => {
        if (!lab.offsetParent) return; const tn = [...lab.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
        const t = tn.textContent; const re = /[^\s-]+/g; let m; /* a break right after a hyphen (демо-|книги) is fine */
        while ((m = re.exec(t))) { const rg = document.createRange(); rg.setStart(tn, m.index); rg.setEnd(tn, m.index + m[0].length);
          const tops = new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))); if (tops.size > 1) split.push(m[0]); }
      });
      const lines = [];
      document.querySelectorAll('#settings .pcard').forEach(c => { const rows = [...c.children].filter(e => e.offsetParent && /\bsetrow\b/.test(e.className));
        const last = rows[rows.length - 1]; if (last && parseFloat(getComputedStyle(last).borderBottomWidth) > 0) lines.push(last.textContent.trim().slice(0, 30)); });
      return { split, lines, mvp: document.body.classList.contains('mvp') };
    });
    ok('s360 ' + w + ': no row label word split across lines in «Общие настройки»', !r.split.length && !errs.length, r.split);
    ok('s360 ' + w + ': no divider under the last visible row of a card (MVP)', r.mvp && !r.lines.length, r.lines);
    await p.screenshot({ path: (process.env.RQ_SHOTS || '/workspace/out/') + 'audit2-settings-' + w + '.png' });
    await ctx.close();
  }
  await browser.close();
}

const pass = checks.filter(Boolean).length;
console.log('SUMMARY audit2.test ' + pass + '/' + checks.length);
process.exit(pass === checks.length && checks.length ? 0 : 1);
