// «Страна чудес» (alisa): screens day/night at 390 and 360 for review. Run: RQ_URL=… RQ_SHOTS=/tmp/out node alisa-shots.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const SKIN = process.env.RQ_SKIN || 'alisa';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
for (const w of (process.env.RQ_W || '390,360').split(',').map(Number)) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: w, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
  await p.evaluate(sk => { S.gold = 99999; save(); buy('skin-' + sk); wear('skin-' + sk); }, SKIN); await sleep(400);
  const clean = () => p.evaluate(() => { try { clearToasts(); } catch (e) {} document.querySelectorAll('.rq-toast').forEach(t => t.remove()); });
  for (const night of [false, true]) {
    await p.evaluate(night => { if (appIsNight() !== night) toggleAppNight(); }, night); await sleep(400);
    const tag = `${w}-${night ? 'night' : 'day'}`;
    for (const scr of ['library', 'rewards', 'profile']) {
      await p.evaluate(s => { navGo(s); }, scr); await sleep(800); await clean();
      await p.screenshot({ path: `${SHOTS}${tag}-${scr}.png` });
    }
    await p.evaluate(() => { __navAllow = true; show('summary'); __navAllow = false; }); await sleep(600); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-summary.png` });
    await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
    await p.evaluate(() => { try { if (typeof showBars === 'function') showBars(); } catch (e) {} });
    await p.mouse.click(w / 2, 420); await sleep(700); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-reader.png` });
    await p.evaluate(() => { try { closeReader(); } catch (e) { navGo('library'); } }); await sleep(800);
  }
  await p.close();
}
await browser.close();
