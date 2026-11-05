// Small batch after build 20261014-1407 (Оскар/Интерфейс/Босс 14.10):
// 1) «Карандашный»: buttons/fields 2px graphite line (was 1.5px, too faint);  2) «＋ Добавить» (.addmini) has a visible outline (both skins);
// 3) in «Общие настройки» no bottom-nav item is highlighted (not «Библиотека»);  4) «Размер интерфейса»: − value ＋ stay on one row at 390px;
// 5) no coin icon in «Ежедневка» / «Неделя» rows and under the «монет» counter in the profile — plain text «+30 монет».
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ [RQ_SHOTS=/workspace/out] node small-batch.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
const setSkin = (k) => p.evaluate((k) => { SET.theme = k; if (k !== 'pencil') S.appTheme = k; saveSet(); applySet(); try { renderSettings(); } catch (e) {} }, k);

for (const skin of ['default', 'pencil']) {
  if (skin === 'pencil') { await setSkin('pencil'); await sleep(300); }
  const tag = skin === 'pencil' ? 'pencil' : 'default';
  // 2. «＋ Добавить» outline
  await p.evaluate(() => show('library')); await sleep(250);
  const am = await p.evaluate(() => { const b = document.getElementById('btnAdd'), cs = getComputedStyle(b);
    return { bw: parseFloat(cs.borderTopWidth), bs: cs.borderTopStyle, bc: cs.borderTopColor, sh: cs.boxShadow, bg: cs.backgroundColor }; });
  const amLine = (am.bw >= 1 && am.bs === 'solid' && !/rgba\(0, 0, 0, 0\)|transparent/.test(am.bc) && am.bc !== am.bg) || /0px 0px 0px (1\.5|2)px/.test(am.sh);
  ok(`${tag}: «＋ Добавить» has a visible outline`, amLine, am);

  // 5. no coin icon in quest rows and under the profile «монет» counter
  await p.evaluate(() => { show('profile'); renderMvpProfile(); }); await sleep(300);
  const co = await p.evaluate(() => {
    const rows = ['mvpDailyCard', 'mvpWeeklyCard'].map(id => document.getElementById(id)).filter(Boolean).map(c => c.querySelector('.row > span'));
    const kpi = document.getElementById('mvpGoldLbl') && document.getElementById('mvpGoldLbl').closest('.kpi');
    const zones = [...rows, kpi].filter(Boolean);
    return { n: zones.length, txt: zones.map(z => z.textContent.trim()),
      icons: zones.map(z => [...z.querySelectorAll('svg,img,.ic')].length + (/🪙|💰/.test(z.textContent) ? 1 : 0) + [...z.querySelectorAll('use')].filter(u => /coin/.test(u.getAttribute('href') || '')).length) };
  });
  ok(`${tag}: «Ежедневка»/«Неделя»/«монет» rows without a coin icon`, co.n === 3 && co.icons.every(x => x === 0), co);
  ok(`${tag}: rows read as plain text «Ежедневка +30 монет», «Неделя +120 монет»`, co.txt[0] === 'Ежедневка +30 монет' && co.txt[1] === 'Неделя +120 монет', co.txt);
  if (skin === 'pencil') await p.screenshot({ path: SHOTS + 'small-profile-390.png', fullPage: false });
  if (skin === 'pencil') { await p.evaluate(() => { const q = document.getElementById('mvpQuestBox'); if (q) q.scrollIntoView({ block: 'center' }); }); await sleep(200); await p.screenshot({ path: SHOTS + 'small-quests-390.png' }); }

  // 3. settings: no bottom-nav item highlighted
  await p.evaluate(() => { openGeneralSettings(false); document.querySelectorAll('#settings .gsec').forEach(s => { s.hidden = false; }); el('settings').classList.add('gs-in'); /* 29.10: settings are sections now — show all of them to measure every control */ }); await sleep(300);
  const nv = await p.evaluate(() => ({ vis: getComputedStyle(document.getElementById('botnav')).display, on: [...document.querySelectorAll('#botnav button.on')].map(b => b.textContent.trim()) }));
  ok(`${tag}: in «Общие настройки» bottom nav highlights nothing`, !nv.on.length, nv);

  // 4. «Размер интерфейса» removed (Маня 15.10): no row; a stored S.ux.scale (80) is kept but ignored — no zoom
  const sz = await p.evaluate(() => { S.ux.scale = 80; applyScale(); renderSettings();
    return { row: !!document.getElementById('uxScalePlus') || [...document.querySelectorAll('#settings .lab')].some(l => /Размер интерфейса/.test(l.textContent)), zoom: document.body.style.zoom, kept: S.ux.scale }; });
  await p.evaluate(() => { S.ux.scale = 100; renderSettings(); });
  ok(`${tag}: no «Размер интерфейса» row; stored scale 80 kept but ignored (no zoom)`, !sz.row && (sz.zoom === '' || sz.zoom === '1') && sz.kept === 80, sz);

  // 1. pencil: controls 2px line
  if (skin === 'pencil') {
    const bt = await p.evaluate(() => {
      const els = [...document.querySelectorAll('#settings .ghostbtn:not(.sw), #settings .stepbtn, #settings .seg:not(#appThemeBox) button, #settings input[type=text], #settings select, #btnAdd')].filter(e => e.offsetParent || e.id === 'btnAdd');
      return els.map(e => { const cs = getComputedStyle(e); return { e: e.id || e.textContent.trim().slice(0, 12), bw: cs.borderTopWidth, bs: cs.borderTopStyle }; });
    });
    const bad = bt.filter(x => x.bw !== '2px' || x.bs !== 'solid');
    ok('pencil: buttons/fields/segmented/«＋ Добавить» 2px solid line', bt.length >= 5 && !bad.length, bad.length ? bad.slice(0, 8) : bt.length);
    await p.evaluate(() => { const s = document.querySelector('#settings .scroll'); if (s) s.scrollTop = 0; }); await sleep(200);
    await p.screenshot({ path: SHOTS + 'small-settings-390.png' });
    await p.evaluate(() => document.getElementById('uxAnim').scrollIntoView({ block: 'center' })); await sleep(200);
    await p.screenshot({ path: SHOTS + 'small-settings-size-390.png' });
  }
}
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
