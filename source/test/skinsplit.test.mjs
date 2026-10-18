// Джессика 16.10: «Тема» and «Скин» are separate rows in «Общие настройки». Тема = palette (Авто + app palettes), Скин = «Без скина» + «Карандашный»
// + bought skins. Wearing a skin keeps the picked palette selected underneath; «Без скина» brings that palette back; a palette pick takes the skin off.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node skinsplit.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const rows = () => p.evaluate(() => { openGeneralSettings(false); renderSettings();
  const keys = id => [...document.querySelectorAll('#' + id + ' .appsw')].map(b => b.dataset.k), on = id => [...document.querySelectorAll('#' + id + ' .apptile.on .appsw')].map(b => b.dataset.k);
  const t = (id) => { const r = document.getElementById(id); return r ? { title: (r.querySelector('.xt') || {}).textContent, val: (r.querySelector('.xv') || {}).textContent } : null; };
  return { themeRow: t('appThemeX'), skinRow: t('appSkinX'), theme: keys('appThemeBox'), skin: keys('appSkinBox'), themeOn: on('appThemeBox'), skinOn: on('appSkinBox'),
    dataSkin: document.documentElement.dataset.skin || '', app: S.appTheme }; });
await p.evaluate(() => { S.appTheme = 'teal'; save(); applyAppTheme(); });
let r = await rows();
ok('1 two rows: «Тема» and «Скин»', r.themeRow && r.themeRow.title === 'Тема' && r.skinRow && r.skinRow.title === 'Скин', r);
ok('2 «Тема» lists palettes only, «Скин» lists «Без скина» + «Карандашный»', !r.theme.includes('pencil') && r.theme.includes('auto') && r.theme.includes('teal') && r.skin[0] === 'none' && r.skin.includes('pencil') && !r.skin.includes('teal'), r);
ok('3 nothing worn: «Без скина» selected, palette «Бирюза» selected', r.skinOn.join() === 'none' && r.themeOn.join() === 'teal' && r.skinRow.val === 'Без скина', r);
await p.evaluate(() => { S.gold = 600; save(); buy('skin-ellada'); });
r = await rows();
ok('4 a bought skin shows up under «Скин», not under «Тема»', r.skin.includes('ellada') && !r.theme.includes('ellada'), r);
await p.evaluate(() => document.querySelector('#appSkinBox .appsw[data-k="ellada"]').click()); await sleep(300);
r = await rows();
ok('5 skin tile wears it; the palette stays selected under it', r.dataSkin === 'ellada' && r.skinOn.join() === 'ellada' && r.themeOn.join() === 'teal' && r.skinRow.val === 'Эллада', r);
await p.evaluate(() => document.querySelector('#appSkinBox .appsw[data-k="none"]').click()); await sleep(300);
r = await rows();
ok('6 «Без скина» takes it off, «Бирюза» is back', r.dataSkin === '' && r.skinOn.join() === 'none' && r.app === 'teal', r);
await p.evaluate(() => document.querySelector('#appSkinBox .appsw[data-k="pencil"]').click()); await sleep(300);
await p.evaluate(() => document.querySelector('#appThemeBox .appsw[data-k="auto"]').click()); await sleep(300);
r = await rows();
ok('7 picking a palette while a skin is on takes the skin off', r.dataSkin === '' && r.app === 'auto' && r.skinOn.join() === 'none' && r.themeOn.join() === 'auto', r);
// Джессика 17.10: no avatar in the library goal card, in any skin (the profile keeps it)
const av = [], sk = [];
for (const k of ['none', 'pencil', 'ellada', 'babochkovyi', 'celestial']) {
  await p.evaluate((k) => { S.gold = 5000; save(); if (k === 'babochkovyi' || k === 'celestial') buy('skin-' + k); openGeneralSettings(false); renderSettings(); document.querySelector('#appSkinBox .appsw[data-k="' + k + '"]').click(); }, k); await sleep(250);
  sk.push(await p.evaluate((k) => { const RD = ['arrow-left', 'volume-2', 'list', 'moon', 'sun', 'focus', 'settings'], set = SKIN_ICONS[k] || {};
    const norm = s => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = s; return g.innerHTML; };
    const own = RD.filter(n => set[n] && document.getElementById('i-' + n).innerHTML === norm(set[n]));
    const hx = getComputedStyle(document.documentElement).getPropertyValue('--rq-accent').trim(), c = hx.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16) / 255);
    const mx = Math.max(...c), mn = Math.min(...c), d = mx - mn; let h = d < .08 ? -1 : mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; h = h < 0 && h !== -1 ? h + 6 : h;
    return { k, own: own.length, accent: hx, teal: h >= 2.5 && h <= 3.4 }; }, k));
  av.push(await p.evaluate((k) => { __navAllow = true; show('library'); __navAllow = false; renderLibrary(); const a = document.getElementById('streakAva'); return { k, shown: !!(a && a.offsetParent && a.getBoundingClientRect().width) }; }, k));
}
ok('8 library goal card: no avatar in any skin', av.every(x => !x.shown), av);
// Джессика 17.10: «в скинах всё ещё зелёные, иконки читалки не меняются — во всех скинах»: each skin has its own 7 reader icons and a non-teal accent
ok('9 every skin: own reader icons (back, «Слушать», оглавление, ночь, день, фокус, настройки) and an accent that is not the app teal', sk.filter(x => x.k !== 'none').every(x => x.own === 7 && !x.teal), sk);
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY skinsplit.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
