// 20:01 extras: (1) RQ_MVP_DRAWER_EXTRAS is code-only (not in NS_set/export); OFF → extra ids dropped in memory only, ON again → pinned tab back.
// (2) RQ_MVP_QUEST_PAYOUTS (separate, false): in MVP a completed quest pays nothing and shows no reward line. (3) «Карандашный»: page background reaches the bottom
// (html = body = skin paper, theme-color follows); «Недавние» not clipped; filter chips row has a right-edge fade.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node extra.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
let flagOff = false;
await p.setCacheEnabled(false); await p.setRequestInterception(true); await p.setBypassServiceWorker(true);
p.on('request', async r => { if (flagOff && /\/js\/library\.js(\?|$)/.test(r.url())) { const t = await (await fetch(r.url())).text(); r.respond({ status: 200, contentType: 'application/javascript', body: t.replace(/const RQ_MVP_DRAWER_EXTRAS\s*=\s*true/, 'const RQ_MVP_DRAWER_EXTRAS=false') }); } else r.continue(); });
const load = async () => { await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
const bar = () => p.evaluate(() => [...document.querySelectorAll('#botnav .botnav-btn')].map(x => x.dataset.nav));
await load();
// 1
const a = await p.evaluate(async () => { navSave(['library', 'rewards', 'quests', 'profile']); const e = await __rq.exportBackup(null, SET, { includeTextBodies: false });
  const js = JSON.stringify(e) + localStorage.getItem(RQ_K.set); return { inSet: /DRAWER_EXTRAS|drawerExtras|mvpExtras/i.test(js), raw: localStorage.getItem(RQ_K.set) }; });
flagOff = true; await load();
const off = { bar: await bar(), raw: await p.evaluate(() => localStorage.getItem(RQ_K.set)), flag: await p.evaluate(() => RQ_MVP_DRAWER_EXTRAS) };
flagOff = false; await load();
const on = { bar: await bar(), raw: await p.evaluate(() => localStorage.getItem(RQ_K.set)) };
ok('1 flag is code-only (not in NS_set/export); OFF drops quests in memory, storage byte-equal; ON restores the pinned tab', !a.inSet && off.flag === false && JSON.stringify(off.bar) === '["library","rewards","profile"]' && off.raw === a.raw && on.raw === a.raw && JSON.stringify(on.bar) === '["library","rewards","quests","profile"]', { a: a.inSet, off, on: on.bar });
await p.evaluate(() => navSave(['library', 'rewards', 'profile']));
// 2
const q = await p.evaluate(async () => { const c = typeof RQ_MVP_QUEST_PAYOUTS !== 'undefined' ? RQ_MVP_QUEST_PAYOUTS : 'missing';
  S.finished = ['b1', 'b2', 'b3', 'b4', 'b5']; const before = { gold: S.gold, xp: S.xp, ns: localStorage.getItem(RQ_K.v1) };
  navGo('quests'); await new Promise(r => setTimeout(r, 200)); const vis = !el('quests').classList.contains('hidden');
  const done = allQuests().filter(x => !x.need && x.prog() >= 1).map(x => x.id); const box = el('questBox').innerHTML;
  done.forEach(id => { try { claimQuest(id); } catch (e) {} }); await new Promise(r => setTimeout(r, 400));
  return { c, mvp: isMvp(), vis, done, rewardLine: /\+\s*\d+\s*(монет|XP)|Забрать/.test(box), gold: [before.gold, S.gold], xp: [before.xp, S.xp], nsSame: localStorage.getItem(RQ_K.v1) === before.ns }; });
ok('2 MVP: completed quest visible, pays nothing (S.gold/S.xp unchanged), no reward line; RQ_MVP_QUEST_PAYOUTS=false', q.c === false && q.mvp && q.vis && q.done.length > 0 && !q.rewardLine && q.gold[0] === q.gold[1] && q.xp[0] === q.xp[1] && q.nsSame, q);
// 3
const sortFit = () => p.evaluate(async () => { show('library'); await document.fonts.ready; await new Promise(r => setTimeout(r, 200)); const s = el('libSortBtn'); const l = s && (s.querySelector('.lsl') || s);
  return s ? { w: l.clientWidth, need: l.scrollWidth, txt: s.textContent.trim() } : { w: 0, need: 1 }; }); /* sort is a button now (15.10): label not truncated */
const sf0 = await sortFit();
const v = await p.evaluate(async () => { wear('skin-pencil'); show('library'); await new Promise(r => setTimeout(r, 300)); const cs = e => getComputedStyle(e);
  const s = el('libSortBtn'), l = s && (s.querySelector('.lsl') || s);
  return { html: cs(document.documentElement).backgroundColor, body: cs(document.body).backgroundColor, meta: (document.querySelector('meta[name=theme-color]') || {}).content,
    sortW: l ? l.clientWidth : 0, need: l ? l.scrollWidth : 1, mask: cs(el('libChips')).maskImage || cs(el('libChips')).webkitMaskImage }; });
const rgb = (h) => h && h[0] === '#' ? 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')' : h;
const paper = v.body === 'rgba(0, 0, 0, 0)' ? v.html : v.body; /* v2 (18.10): the grid paper sits on the root, body transparent over it */
ok('3a «Карандашный»: бумага на html (body прозрачный или того же цвета, без чёрной полосы), theme-color = фон', (v.html === v.body || v.body === 'rgba(0, 0, 0, 0)') && v.html !== 'rgba(0, 0, 0, 0)' && rgb(v.meta) === paper, v);
ok('3b «Недавние» не обрезано в обычной теме и в «Карандашном» (ширина ≥ текст + отступы + стрелка)', v.sortW >= v.need && sf0.w >= sf0.need, { sf0, pencil: [v.sortW, v.need] });
ok('3c у ряда фильтров затухание справа', /gradient/.test(v.mask || ''), v.mask);
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY extra.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
