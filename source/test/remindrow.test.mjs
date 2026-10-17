// Джессика 17.10: «время напоминания съехало в бабочковом скине». The «Время напоминания» row in «Общие настройки» keeps the − 20:00 + stepper
// on the label's line (no wrap under the label) at 390 and 360, in every look; the row has its own Lucide icon like its neighbours;
// row lines / dashed buttons are drawn from the theme, not from the old teal (#1d4250 / #2a5564).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node remindrow.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { S.appTheme = 'light'; save(); applyAppTheme(); S.gold = 5000; save(); buy('skin-babochkovyi'); buy('skin-ellada'); });
const probe = () => p.evaluate(() => { openGeneralSettings(false); renderSettings();
  const t = document.getElementById('calNotifTime'), row = t.closest('.setrow'), lab = row.querySelector('.lab'), g = row.querySelector('.stepgrp');
  const rl = lab.getBoundingClientRect(), rg = g.getBoundingClientRect(), rr = row.getBoundingClientRect();
  const lang = document.getElementById('langSeg').closest('.setrow');
  return { icon: !!row.querySelector(':scope > svg.ic use[href^="#i-"]'), sameLine: rg.top < rl.bottom && rg.bottom > rl.top, inside: rg.right <= rr.right + 0.5 && rg.left >= rl.left,
    h: Math.round(rr.height), line: getComputedStyle(lang).borderBottomColor, skin: document.documentElement.dataset.skin || '' }; });
const HARD = ['rgb(29, 66, 80)', 'rgb(42, 85, 100)'];
const looks = [['без скина', 'none'], ['Карандашный', 'pencil'], ['Эллада', 'ellada'], ['Бабочковый', 'babochkovyi'], ['Бабочковый ночь', 'night']];
for (const w of [390, 360]) {
  await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  for (const [name, k] of looks) {
    await p.evaluate((k) => { openGeneralSettings(false); renderSettings(); if (k === 'night') { toggleDayNight(); return; }
      document.querySelector('#appSkinBox .appsw[data-k="' + k + '"]').click(); }, k);
    await sleep(250);
    const r = await probe();
    ok(`${w} ${name}: reminder stepper on the label's line, inside the row, row has an icon`, r.icon && r.sameLine && r.inside, r);
    ok(`${w} ${name}: settings row line from the theme (not old teal)`, !HARD.includes(r.line), r);
  }
}
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY remindrow.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
