// «Страна чудес» v2: падение в нору, кот, Кролик, хвост, чаепитие, розы — кадры для проверки. RQ_SHOTS=/tmp/out node alisa2-shots.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
await p.evaluate(() => { S.gold = 99999; save(); buy('skin-alisa'); wear('skin-alisa'); if (appIsNight()) toggleAppNight(); }); await sleep(400);
const clean = () => p.evaluate(() => { try { clearToasts(); } catch (e) {} document.querySelectorAll('.rq-toast').forEach(t => t.remove()); });
// roses: some progress on the books
await p.evaluate(() => { allBooks().slice(0, 3).forEach((b, i) => { S.progress[b.id] = { ratio: [0.35, 0.7, 1][i], pos: [0.35, 0.7, 1][i] }; }); save(); navGo('library'); renderLibrary(); }); await sleep(600); await clean();
await p.screenshot({ path: SHOTS + 'v2-1-roses.png' });
// cat after idle
await sleep(7600); await p.screenshot({ path: SHOTS + 'v2-2-cat.png' });
// fall: open a book, shoot mid-fall
await p.evaluate(() => { __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(380);
await p.screenshot({ path: SHOTS + 'v2-3-fall.png' }); await sleep(2500);
await p.evaluate(() => { try { closeReader(); } catch (e) { navGo('library'); } }); await sleep(600);
// rabbit
await p.evaluate(() => { navGo('profile'); alRabbit(true); }); await sleep(1300); await clean();
await p.screenshot({ path: SHOTS + 'v2-4-rabbit.png' }); await sleep(2500);
// tea table
await p.evaluate(() => navGo('rewards')); await sleep(700); await clean(); await p.screenshot({ path: SHOTS + 'v2-5-tea.png' });
// mouse tail
await p.evaluate(() => { __navAllow = true; navGo('stats'); __navAllow = false; }); await sleep(400);
await p.evaluate(() => { try { if (typeof statsTab === 'function') statsTab('quotes'); } catch (e) {} const t = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Цитаты' && b.offsetParent); if (t) t.click(); }); await sleep(700); await clean();
await p.screenshot({ path: SHOTS + 'v2-6-tail.png' });
// night: looking-glass, cat grin only
await p.evaluate(() => { toggleAppNight(); navGo('library'); }); await sleep(250); await p.screenshot({ path: SHOTS + 'v2-7-mirror.png' });
await sleep(8000); await p.screenshot({ path: SHOTS + 'v2-8-night-cat.png' });
// cake + bottle
await p.evaluate(() => { toggleAppNight(); navGo('library'); }); await sleep(500);
await p.screenshot({ path: SHOTS + 'v2-9-cake.png', clip: { x: 0, y: 0, width: 390, height: 360 } });
await browser.close();
