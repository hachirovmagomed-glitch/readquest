// Нижнее меню в каждом скине, день и ночь, 360 и 390: обрезка нижней части экрана «Библиотека».
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_SHOTS=/tmp/out node botnav-shots.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const NAV = process.env.RQ_NAV ? JSON.parse(process.env.RQ_NAV) : null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const SKINS = ['', 'pencil', 'ellada', 'babochkovyi', 'celestial'];
for (const w of [360, 390]) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  if (NAV) await p.evaluate(n => navSave(n), NAV);
  for (const sk of SKINS) {
    for (const night of [false, true]) {
      await p.evaluate(async (sk, night) => {
        if (sk) { S.gold = 99999; save(); buy('skin-' + sk); wear('skin-' + sk); }
        await new Promise(r => setTimeout(r, 200));
        if (appIsNight() !== night) toggleAppNight();
        await new Promise(r => setTimeout(r, 300)); clearToasts && clearToasts();
        navGo('library');
      }, sk, night);
      await sleep(700);
      await p.evaluate(() => { try { clearToasts(); } catch (e) {} document.querySelectorAll('.rq-toast').forEach(t => t.remove()); });
      const name = `${w}-${sk || 'default'}-${night ? 'night' : 'day'}.png`;
      await p.screenshot({ path: SHOTS + name, clip: { x: 0, y: 800 - 190, width: w, height: 190 } });
      console.log('shot', name, await p.evaluate(() => document.documentElement.dataset.skin || '-'));
    }
  }
  await p.close();
}
await browser.close();
