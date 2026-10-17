// RQ_MVP_DRAWER_EXTRAS (js/library.js): one flag for quotes/quests/vocab/stats in MVP mode. true → shown; false → hidden (drawer, bottom bar, «Нижняя панель»).
// The false case rewrites the constant in js/library.js via request interception. Default bottom bar stays library,rewards,profile.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node mvpflag.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const EXTRA = ['quests', 'look', 'stats'];
async function run(flag) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setCacheEnabled(false); await p.setRequestInterception(true); await p.setBypassServiceWorker(true);
  let patched = false;
  p.on('request', async r => { if (!flag && /\/js\/library\.js(\?|$)/.test(r.url())) { const res = await fetch(r.url()); let t = await res.text(); const t2 = t.replace(/const RQ_MVP_DRAWER_EXTRAS\s*=\s*true/, 'const RQ_MVP_DRAWER_EXTRAS=false'); patched = t2 !== t; r.respond({ status: 200, contentType: 'application/javascript', body: t2 }); } else r.continue(); });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
  const r = await p.evaluate(async () => { const mvp = isMvp(); const flagV = typeof RQ_MVP_DRAWER_EXTRAS !== 'undefined' ? RQ_MVP_DRAWER_EXTRAS : 'missing';
    const def = JSON.stringify(navGet()); navSave(['library', 'rewards', 'quests', 'look', 'profile']); openDrawer(); await new Promise(r => setTimeout(r, 300));
    const drawer = [...document.querySelectorAll('#drawer .ditem')].filter(x => x.offsetParent).map(x => x.dataset.nav);
    const bar = [...document.querySelectorAll('#botnav .botnav-btn')].filter(x => x.offsetParent).map(x => x.dataset.nav); closeDrawer();
    openGeneralSettings(false); openNavCfg(); const cfg = [...document.querySelectorAll('#navCfg [data-nav]')].map(x => x.dataset.nav); closeNavCfg();
    const stored = JSON.parse(localStorage.getItem(RQ_K.set)).nav; navSave(['library', 'rewards', 'profile']); return { mvp, flagV, def, drawer, bar, cfg, stored }; });
  await ctx.close(); return { ...r, patched };
}
const t = await run(true), f = await run(false);
const has = (a, ids) => ids.every(x => a.includes(x)), none = (a, ids) => ids.every(x => !a.includes(x));
ok('flag true (default) in MVP: quotes/quests/vocab/stats in drawer, bottom bar and «Нижняя панель»', t.mvp && t.flagV === true && has(t.drawer, EXTRA) && has(t.bar, ['quests', 'look']) && has(t.cfg, EXTRA), t);
ok('flag false in MVP: hidden in drawer, bottom bar and «Нижняя панель»; stored nav not rewritten', f.patched && f.mvp && f.flagV === false && none(f.drawer, EXTRA) && none(f.bar, EXTRA) && none(f.cfg, EXTRA) && f.stored.includes('quests'), f);
ok('bottom bar default stays ["library","rewards","profile"] in both', t.def === '["library","rewards","profile"]' && f.def === t.def && JSON.stringify(f.bar) === '["library","rewards","profile"]', { t: t.def, f: f.def, fbar: f.bar });
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY mvpflag.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
