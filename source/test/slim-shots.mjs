// 10.11 mockups of a compacter selection menu (Джессика: «слишком громоздкие и не очень очевидные»).
// Run: OUT=dir MOCK=file.js NAME=x W=390 LOOK=bar SKIN=celestial NIGHT=1 node slim-shots.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const OUT = process.env.OUT || '/tmp', NAME = process.env.NAME || 'x', W = +(process.env.W || 390), H = W === 360 ? 780 : 844;
const MOCK = process.env.MOCK ? fs.readFileSync(process.env.MOCK, 'utf8') : '';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(async (o) => { S.gold = 5000; save(); if (o.skin !== 'none') { buy('skin-' + o.skin); wear('skin-' + o.skin); }
  if (o.night) toggleDayNight();
  const bk = allBooks().slice().sort((a, b) => ((b.text || '').length) - ((a.text || '').length))[0];
  SET.flip = Object.assign({}, SET.flip || {}, { mode: 'page', anim: 'none' }); SET.selLook = o.look; saveSet(); applySet();
  __navAllow = true; openBook(bk.id); __navAllow = false; await new Promise(r => setTimeout(r, 2500)); goPage(3, false); await new Promise(r => setTimeout(r, 400)); },
  { skin: process.env.SKIN || 'celestial', night: process.env.NIGHT === '1', look: process.env.LOOK || 'bar' });
if (MOCK) await p.addScriptTag({ content: MOCK });
await p.touchscreen.touchStart(120, 330); await sleep(700); await p.touchscreen.touchEnd(); await sleep(500);
await p.touchscreen.tap(Math.round(W * .6), 520); await sleep(600);
await sleep(3300);
await p.evaluate(() => { if (window.mockAfter) window.mockAfter(); }); await sleep(300);
await p.screenshot({ path: `${OUT}/${NAME}-${W}-1menu.png`, captureBeyondViewport: false });
const tap = async (sel) => { const r = await p.evaluate((s) => { const b = document.querySelector(s); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel); if (r) { await p.touchscreen.tap(r.x, r.y); await sleep(500); } return r; };
await tap('#ssMore');
await p.evaluate(() => { if (window.mockMore) window.mockMore(); }); await sleep(900); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await p.evaluate(() => { el('ssRail').style.transform = 'translateZ(0)'; }); await sleep(300); await p.screenshot({ path: '/tmp/x.png' }); await sleep(300);
await p.screenshot({ path: `${OUT}/${NAME}-${W}-2more.png`, captureBeyondViewport: false });
if (process.env.DBG) console.log(await p.evaluate(() => { const r = el("ssNote").getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (e && (e.id || e.className || e.tagName)) + " vis=" + getComputedStyle(el("ssNote")).visibility + " op=" + getComputedStyle(el("ssRail")).opacity + " ov=" + getComputedStyle(el("selSide")).overflow + " bop=" + getComputedStyle(el("ssNote")).opacity + " col=" + getComputedStyle(el("ssNote")).color + " flt=" + getComputedStyle(el("selSide")).filter + " anim=" + document.getAnimations().map(a => (a.effect && a.effect.target && a.effect.target.id) + ":" + a.animationName).join(","); }));
if (process.env.DBG) console.log(await p.evaluate(() => [...el("ssRail").children].map(b => b.id + ":" + getComputedStyle(b).display + ":" + b.hidden + ":" + Math.round(b.getBoundingClientRect().top)).join(" ") + " sel=" + String(getSelection()).length + " rail=" + JSON.stringify(el("ssRail").getBoundingClientRect())));
const m = await p.evaluate(() => { const s = el('selSide').getBoundingClientRect(), r = el('ssRail').getBoundingClientRect(), mm = el('ssMenu').getBoundingClientRect(); return { card: Math.round(s.height), w: Math.round(s.width), menu: Math.round(mm.height), mw: Math.round(mm.width), sx: document.documentElement.scrollWidth <= innerWidth, words: String(getSelection()).split(/\s+/).length }; });
console.log(NAME, W, JSON.stringify(m));
await tap('#ssMore'); await tap('#ssCol'); await sleep(300); await p.evaluate(() => { el('ssRail').style.transform = 'translateZ(1px)'; }); await sleep(300); await p.screenshot({ path: '/tmp/x.png' });
await p.screenshot({ path: `${OUT}/${NAME}-${W}-3colors.png`, captureBeyondViewport: false });
await browser.close();
