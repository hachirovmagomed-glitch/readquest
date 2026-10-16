// Audit 15.10, wave 2 (handoff/notes/arch.md «Аудит 15.10, волна 2»). One file for the wave-2 checks.
// gate: every NS_set write goes through the write gate. Passive window (mayWrite() false) → no NS_set write from any settings control;
//       writer window → the same controls write; before __rqReady → nothing written, then exactly ONE write on ready.
// static: the raw localStorage write of NS_set exists in one place only (saveSetRaw), called only by the gate.
// motion: prefers-reduced-motion OR «Анимации» off (S.ux.anim === false) → no confetti, no book fly-in / opening animation, no CSS animations;
//         default → confetti still runs (sanity).
// s360: «Общие настройки» at 360 and 390: no word of a row label is split across lines; the last VISIBLE row of a card has no divider.
// confetti (part 2): in every theme the confetti are Lucide icons (svg), no emoji; colour = theme tokens (--accent / --accent2), «Карандашный» as before.
// refund (part 2): cancelling a real-life reward writes game.rewardRefunds[] {id, purchaseId, title, price, at}; it survives export → import;
//         an old backup without the field imports with []; junk is dropped; a passive window changes nothing.
// testgold (part 2): «+1000 монет для теста» logs {type:'test_gold', amount:1000} in events.
// metrics (part 2): metrics.py — reward buys = purchases − refunds; skin buys (purchase events) separate; test_gold reported.
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
  if (want('s360')) for (const w of [360, 390, 412]) {
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
      const overlap = [];
      document.querySelectorAll('#settings .setrow .lab').forEach(lab => { if (!lab.offsetParent) return; const lr = lab.getBoundingClientRect();
        [...lab.parentElement.children].filter(k => k !== lab && !k.matches('svg.ic') && k.offsetParent).forEach(k => { const kr = k.getBoundingClientRect();
          const rg = document.createRange(); rg.selectNodeContents(lab); const tr = [...rg.getClientRects()];
          if (tr.some(t => t.width > 0 && t.right > kr.left + 1 && t.left < kr.right - 1 && t.bottom > kr.top + 1 && t.top < kr.bottom - 1)) overlap.push(lab.textContent.trim().slice(0, 20)); }); });
      /* phone Chrome has a Russian hyphenation dictionary (headless here has none): with hyphens:auto the label's min-content is one syllable,
         so «Жур-нал за-пуска» squeezes beside the button instead of wrapping — labels must not auto-hyphenate */
      const hyph = [...document.querySelectorAll('#settings .setrow .lab, #settings .setrow .lab .sub')].filter(e => e.offsetParent && getComputedStyle(e).hyphens !== 'none').map(e => e.textContent.trim().slice(0, 20));
      /* a label with a caption is never squeezed into a narrow column beside its buttons (Маня 16.10: «Экспорт и импорт» in 4 lines) */
      const narrow = [...document.querySelectorAll('#settings .setrow .lab')].filter(l => l.offsetParent && l.querySelector('.sub') && l.getBoundingClientRect().width < 140).map(l => l.firstChild.textContent.trim().slice(0, 20));
      const lines = [];
      document.querySelectorAll('#settings .pcard').forEach(c => { const rows = [...c.children].filter(e => e.offsetParent && /\bsetrow\b/.test(e.className));
        const last = rows[rows.length - 1]; if (last && parseFloat(getComputedStyle(last).borderBottomWidth) > 0) lines.push(last.textContent.trim().slice(0, 30)); });
      return { split, overlap, hyph, narrow, lines, mvp: document.body.classList.contains('mvp') };
    });
    ok('s360 ' + w + ': no row label word split across lines in «Общие настройки»', !r.split.length && !errs.length, r.split);
    ok('s360 ' + w + ': no row label text runs under its buttons', !r.overlap.length, r.overlap);
    ok('s360 ' + w + ': row labels are never auto-hyphenated (phone Chrome splits «Жур-нал»)', !r.hyph.length, r.hyph);
    ok('s360 ' + w + ': a label with a caption is at least 140px wide (buttons go below instead)', !r.narrow.length, r.narrow);
    ok('s360 ' + w + ': no divider under the last visible row of a card (MVP)', r.mvp && !r.lines.length, r.lines);
    await p.screenshot({ path: (process.env.RQ_SHOTS || '/workspace/out/') + 'audit2-settings-' + w + '.png' });
    await ctx.close();
  }
  await browser.close();
}

if (want('confetti') || want('refund') || want('testgold')) {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  async function open() {
    const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(600);
    return { ctx, p, errs };
  }
  if (want('confetti')) {
    const { ctx, p, errs } = await open();
    const r = await p.evaluate(() => {
      const h = document.documentElement, out = {};
      const EMO = /\p{Extended_Pictographic}/u;
      for (const sk of ['', 'pencil', 'future-skin']) {
        if (sk) h.dataset.skin = sk; else delete h.dataset.skin;
        document.querySelectorAll('.confetti').forEach(n => n.remove());
        confetti(); confettiReward(); confettiSummary();
        const ns = [...document.querySelectorAll('.confetti')];
        const css = getComputedStyle(h), tok = [css.getPropertyValue('--accent'), css.getPropertyValue('--accent2')].map(v => { const d = document.createElement('i'); d.style.color = v.trim(); document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
        out[sk || 'default'] = { n: ns.length, emoji: ns.filter(n => EMO.test(n.textContent)).length, svg: ns.filter(n => n.querySelector('svg use')).length,
          offTok: sk === 'pencil' ? 0 : ns.filter(n => !tok.includes(getComputedStyle(n).color)).length };
        ns.forEach(n => n.remove());
      }
      delete h.dataset.skin; return out;
    });
    for (const k of Object.keys(r)) ok('confetti ' + k + ': Lucide icons only, no emoji' + (k === 'pencil' ? '' : ', colour from theme tokens'), r[k].n > 0 && r[k].emoji === 0 && r[k].svg === r[k].n && r[k].offTok === 0 && !errs.length, r[k]);
    await ctx.close();
  }
  if (want('refund')) {
    const { ctx, p, errs } = await open();
    const r = await p.evaluate(async () => {
      S.rewards = [{ name: 'Кино', cost: 50, qty: null, bought: 0 }]; S.gold = 200; S.rewardPurchases = []; save();
      buyReward(0); await new Promise(r => setTimeout(r, 5)); buyReward(0); undoRewardClaim(0);
      const live = { cost: S.rewards[0].cost, gold: S.gold, bought: S.rewards[0].bought, refunds: JSON.parse(JSON.stringify(S.rewardRefunds || null)), buys: S.rewardPurchases.map(x => x.id) };
      const exp = await __rq.exportBackup(null, SET, { includeTextBodies: false });
      const inExp = (exp.game.rewardRefunds || []).length;
      await __rq.importBackup(JSON.parse(JSON.stringify(exp)));
      const back = __rq.loadEnvelope().game.rewardRefunds;
      const old = JSON.parse(JSON.stringify(exp)); delete old.game.rewardRefunds; await __rq.importBackup(old);
      const fromOld = __rq.loadEnvelope().game.rewardRefunds;
      const junk = JSON.parse(JSON.stringify(exp)); junk.game.rewardRefunds = [{ title: 'x', price: 'много', at: 'вчера' }, 5, { id: 'rr_1', purchaseId: null, title: 'Кино', price: 50, at: '2026-10-16T10:00:00.000Z' }];
      await __rq.importBackup(junk); const fromJunk = __rq.loadEnvelope().game.rewardRefunds;
      const notArr = JSON.parse(JSON.stringify(exp)); notArr.game.rewardRefunds = 'да'; await __rq.importBackup(notArr); const fromStr = __rq.loadEnvelope().game.rewardRefunds;
      return { live, inExp, back, fromOld, fromJunk, fromStr };
    });
    const rf = r.live.refunds;
    ok('refund: cancelling a reward returns coins and writes one rewardRefunds record pointing at the last purchase', r.live.cost > 0 && r.live.gold === 200 - r.live.cost && r.live.bought === 1 && Array.isArray(rf) && rf.length === 1 &&
      rf[0].purchaseId === r.live.buys[1] && rf[0].price === r.live.cost && rf[0].title === 'Кино' && /^rr_/.test(rf[0].id) && !isNaN(Date.parse(rf[0].at)) && r.live.buys.length === 2 && !errs.length, { live: r.live, errs });
    ok('refund: the record survives export → import', r.inExp === 1 && Array.isArray(r.back) && r.back.length === 1 && r.back[0].purchaseId === r.live.buys[1], { inExp: r.inExp, back: r.back });
    ok('refund: an old backup without rewardRefunds imports with [], junk is dropped, a non-array becomes []', Array.isArray(r.fromOld) && r.fromOld.length === 0 &&
      Array.isArray(r.fromJunk) && r.fromJunk.length === 1 && r.fromJunk[0].price === 50 && Array.isArray(r.fromStr) && r.fromStr.length === 0, { fromOld: r.fromOld, fromJunk: r.fromJunk, fromStr: r.fromStr });
    const q = await p.evaluate(() => {
      S.rewards = [{ name: 'Торт', cost: 30, qty: null, bought: 1 }]; S.gold = 10; S.rewardRefunds = []; save();
      window.__rqWriter.mayWrite = () => false; undoRewardClaim(0);
      return { gold: S.gold, bought: S.rewards[0].bought, refunds: (S.rewardRefunds || []).length };
    });
    ok('refund: a passive window changes nothing (coins, counter, record)', q.gold === 10 && q.bought === 1 && q.refunds === 0, q);
    await ctx.close();
  }
  if (want('testgold')) {
    const { ctx, p, errs } = await open();
    const r = await p.evaluate(async () => {
      const g0 = S.gold || 0; shopTestGold(); await new Promise(r => setTimeout(r, 400));
      const ev = (await __rq.listReadingEvents({})).filter(e => e.type === 'test_gold');
      return { ns: window.RQ_NS, add: (S.gold || 0) - g0, ev };
    });
    ok('testgold: «+1000 монет для теста» logs one test_gold event with amount 1000 (rqt)', r.ns === 'rqt' && r.add === 1000 && r.ev.length === 1 && r.ev[0].amount === 1000 && !errs.length, { r, errs });
    await ctx.close();
  }
  await browser.close();
}

if (want('metrics')) {
  const { mkdtempSync, writeFileSync } = await import('fs'); const { tmpdir } = await import('os');
  const dir = mkdtempSync(tmpdir() + '/rq-metrics-');
  const at = '2026-10-13T10:00:00.000Z';
  const sess = [{ date: '2026-10-13', minutes: 12, pageTurns: 5 }];
  const rq = { schemaVersion: 1, ns: 'rq', build: 'x', sessions: sess,
    game: { rewardPurchases: [{ id: 'rp_1', title: 'Кино', price: 50, at }, { id: 'rp_2', title: 'Торт', price: 30, at }, { id: 'rp_3', title: 'Кино', price: 50, at }],
      rewardRefunds: [{ id: 'rr_1', purchaseId: 'rp_3', title: 'Кино', price: 50, at }, { id: 'rr_2', purchaseId: null, title: 'Торт', price: 30, at }] },
    events: [{ type: 'purchase', id: 'skin-pencil', price: 300 }, { type: 'purchase', id: 'skin-x', price: 300 }, { type: 'test_gold', amount: 1000 }] };
  const rqAll = { schemaVersion: 1, ns: 'rq', build: 'x', sessions: sess, game: { rewardPurchases: [{ id: 'rp_9', title: 'Кино', price: 50, at }], rewardRefunds: [{ id: 'rr_9', purchaseId: 'rp_9', title: 'Кино', price: 50, at }] }, events: [] };
  const rqt = { schemaVersion: 1, ns: 'rqt', build: 'x', sessions: sess, game: {}, events: [{ type: 'test_gold', amount: 1000 }, { type: 'test_gold', amount: 1000 }] };
  writeFileSync(dir + '/a.json', JSON.stringify(rq)); writeFileSync(dir + '/b.json', JSON.stringify(rqAll)); writeFileSync(dir + '/c.json', JSON.stringify(rqt));
  const { spawnSync } = await import('child_process');
  const run = spawnSync('python3', [new URL('metrics.py', import.meta.url).pathname, '--start', '2026-10-12', dir + '/a.json', dir + '/b.json', dir + '/c.json'], { encoding: 'utf8' });
  const out = run.stdout || '', err = (run.stderr || '') + (run.error ? String(run.error) : '');
  const lines = out.split('\n'); const head = (lines.find(l => l.startsWith('file |')) || '').split(' | ').map(x => x.trim());
  const row = (f) => { const l = lines.find(l => l.startsWith(dir + '/' + f + ' ')); return l ? Object.fromEntries(l.split(' | ').map((v, i) => [head[i], v.trim()])) : null; };
  const a = row('a.json'), b = row('b.json');
  ok('metrics: reward buys = purchases − refunds (by purchaseId, else by title)', a && a['reward buys'] === '1' && b && b['reward buys'] === '0', { a, b, out: out.slice(0, 400), err: err.slice(0, 300) });
  ok('metrics: skin buys (purchase events) counted separately', a && a['skin buys'] === '2' && b && b['skin buys'] === '0' && /Bought a skin: 50%/.test(out), { a, b });
  ok('metrics: test coins reported — rqt skip names them, test_gold in an rq export warns', /skipped .*c\.json.*test coins: 2000/.test(err) && /a\.json.*test_gold/.test(err), err.slice(0, 400));
}

const pass = checks.filter(Boolean).length;
console.log('SUMMARY audit2.test ' + pass + '/' + checks.length);
process.exit(pass === checks.length && checks.length ? 0 : 1);
