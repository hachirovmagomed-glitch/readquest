// Джессика 16.10: the goal card «Цель 10 минут», the ring around it, the bottom tab bar's top line and the active tab background
// were hard-coded teal (#1a4a57 / #2a5564 / #1d4250 / rgba(43,179,192,.12)) and did not follow «Тема» (grey active tab on Багрянец).
// Every app theme (and Авто) must paint them from its own --card / --card2 / --accent; skins (pencil, Эллада) keep their own look.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node themecolors.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const probe = () => p.evaluate(() => {
  const rgb = (h) => { const d = document.createElement('div'); d.style.color = h; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const cs = getComputedStyle(document.documentElement), v = (n) => rgb(cs.getPropertyValue(n).trim());
  const gc = getComputedStyle(document.querySelector('#library .goalcard'));
  const track = getComputedStyle(document.querySelector('#library .goalcard circle:not(#ringFg)')).stroke;
  const fg = getComputedStyle(document.getElementById('ringFg')).stroke;
  const nav = getComputedStyle(document.getElementById('botnav')), on = getComputedStyle(document.querySelector('#botnav .botnav-btn.on'));
  return { card: v('--card'), card2: v('--card2'), accent: v('--accent'), good: v('--good'), gcBg: gc.backgroundImage + ' ' + gc.backgroundColor, track, fg,
    navLine: nav.borderTopColor, navW: nav.borderTopWidth, onBg: on.backgroundColor, navBg: nav.backgroundColor };
});
const HARD = ['rgb(26, 74, 87)', 'rgb(42, 85, 100)', 'rgb(29, 66, 80)', 'rgba(43, 179, 192, 0.12)'];
const keys = await p.evaluate(() => { SET.mvp = true; saveSet(); applySet(); show('library'); renderLibrary(); return Object.keys(APP_THEMES); });
for (const k of [...keys, 'auto']) {
  await p.evaluate((k) => { S.appTheme = k; save(); applyAppTheme(); renderLibrary(); }, k); await sleep(60);
  const r = await probe();
  const leak = HARD.filter(h => k !== 'teal' && (r.gcBg.includes(h) || r.track === h || r.navLine === h || r.onBg === h));
  ok(`${k}: goal card from --card2/--card, ring track and tab line from the theme, active tab on --card2`,
    r.gcBg.includes(r.card2) && r.gcBg.includes(r.card) && r.navLine === r.card2 && r.onBg === r.card2 && r.fg === r.accent && r.track !== r.card2 && leak.length === 0, { r, leak });
}
// full goal → ring turns --good (was a hard-coded #4cd97b inline)
await p.evaluate(() => { S.appTheme = 'crimson'; save(); applyAppTheme(); });
const inl = await p.evaluate(() => { renderLibrary(); return el('ringFg').getAttribute('style') || ''; });
ok('ring progress colour is a theme var (--accent / --good), not an inline hex', /var\(--(accent|good)\)/.test(inl), inl);
// skins keep their own colours
for (const sk of ['pencil', 'ellada']) {
  const r = await p.evaluate(async (sk) => { S.gold = 5000; save(); const id = 'skin-' + sk; if (!shopOwns(id)) buy(id); wear(id); await new Promise(r => setTimeout(r, 300)); renderLibrary();
    const cs = getComputedStyle(document.documentElement); return { skin: document.documentElement.dataset.skin, line: cs.getPropertyValue('--rq-line').trim() }; }, sk);
  const q = await probe();
  ok(`${sk}: skin is on, active tab and goal card not teal`, r.skin === sk && !HARD.includes(q.onBg) && !HARD.some(h => q.gcBg.includes(h)), { r, q });
}
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\n${pass}/${checks.length} passed`); process.exit(pass === checks.length ? 0 : 1);
