// «Карандашный» v2 (Джессика 17.10: «довольно-таки невзрачный. Добавить туда клеточки, как в тетради, или что-то такое. Больше деталей»).
// Squared paper + red margin on the root, doodles in the margins (masks, token colours), circled active chip/tab/tier, hatched progress,
// hand-drawn title underline; the book page stays flat; text on the grid line ≥ 4.5; night accent fills get dark text; 360 fits.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node pencil2.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lum = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
const hex = rgb => rgb.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { wear('skin-pencil'); __navAllow = true; show('library'); __navAllow = false; }); await sleep(400);

const pg = await p.evaluate(() => { const r = getComputedStyle(document.documentElement), b = getComputedStyle(document.body), lib = getComputedStyle(document.getElementById('library'));
  const m = e => (getComputedStyle(document.body, e).webkitMaskImage || getComputedStyle(document.body, e).maskImage || '').match(/data:image\/svg/g) || [];
  return { skin: document.documentElement.dataset.skin, grads: (r.backgroundImage.match(/linear-gradient/g) || []).length, size: r.backgroundSize, body: b.backgroundColor, lib: lib.backgroundColor, d1: m('::before').length, d2: m('::after').length }; });
ok('1 paper: squared grid 20px + margin on the root, body and library transparent', pg.skin === 'pencil' && pg.grads === 3 && /20px 20px/.test(pg.size) && pg.body === 'rgba(0, 0, 0, 0)' && pg.lib === 'rgba(0, 0, 0, 0)', pg);
ok('2 doodles: graphite caterpillar/arrow/spiral and accent stars as masks', pg.d1 === 3 && pg.d2 === 3, pg);
const ac = await p.evaluate(() => { const c = document.querySelector('#libChips .fchip.on') || document.querySelector('.fchip.on'), n = document.querySelector('#botnav .botnav-btn.on');
  const ring = e => /data:image\/svg/.test(getComputedStyle(e, '::after').webkitMaskImage || ''), t = document.getElementById('libTitle');
  return { chipBg: getComputedStyle(c).backgroundColor, chipRing: ring(c), navBg: getComputedStyle(n).backgroundColor, navRing: ring(n), under: /data:image\/svg/.test(getComputedStyle(t, '::after').webkitMaskImage || '') }; });
ok('3 active filter and tab circled in pencil (no fill), library title underlined by hand', ac.chipBg === 'rgba(0, 0, 0, 0)' && ac.chipRing && ac.navBg === 'rgba(0, 0, 0, 0)' && ac.navRing && ac.under, ac);
const hb = await p.evaluate(() => { const i = document.createElement('i'), b = document.createElement('div'); b.className = 'pbar'; i.style.width = '50%'; b.appendChild(i); document.getElementById('shelf').prepend(b);
  const r = { bg: getComputedStyle(i).backgroundImage, line: getComputedStyle(b).boxShadow }; b.remove(); return r; });
ok('4 progress: hatched fill, graphite outline', /repeating-linear-gradient/.test(hb.bg) && /inset/.test(hb.line), hb);
await p.evaluate(() => { openRewardsSheet(); }); await sleep(400);
const tier = await p.evaluate(() => { const e = document.querySelector('#rewSlots .tierseg button.on'); return { bg: getComputedStyle(e).backgroundColor, ring: /data:image\/svg/.test(getComputedStyle(e, '::after').webkitMaskImage || '') }; });
ok('5 rewards: the chosen price tier is circled', tier.bg === 'rgba(0, 0, 0, 0)' && tier.ring, tier);
await p.evaluate(() => closeRewardsSheet()); await sleep(200);
// contrast: text on the grid line, day and night; accent fills
const tk = await p.evaluate(async () => { const out = {}, r = document.documentElement;
  for (const n of [false, true]) { if (n) r.dataset.theme = 'night'; else delete r.dataset.theme; await new Promise(q => setTimeout(q, 50)); const cs = getComputedStyle(r);
    out[n] = Object.fromEntries(['text', 'text-2', 'accent-text', 'skin-grid', 'bg', 'accent', 'on-accent'].map(k => [k, cs.getPropertyValue('--rq-' + k).trim().slice(1)])); }
  delete r.dataset.theme; return out; });
const pr = [false, true].flatMap(n => [['text', 'skin-grid'], ['text-2', 'skin-grid'], ['accent-text', 'skin-grid'], ['text-2', 'bg'], ['on-accent', 'accent']].map(([f, b]) => ({ n, f, b, r: cr(tk[n][f], tk[n][b]) })));
ok('6 contrast ≥ 4.5: text, text-2, accent on the grid line and paper; on-accent on accent (day, night)', pr.every(x => x.r >= 4.5), pr.filter(x => x.r < 4.5));
await p.evaluate(() => { S.gold = 5000; save(); toggleDayNight(); openRewardsSheet(); }); await sleep(500);
const nb = await p.evaluate(() => [...document.querySelectorAll('#rewSlots .buy:not(:disabled)')].slice(0, 2).map(e => { const c = getComputedStyle(e); return { c: c.color, b: c.backgroundColor }; }));
ok('7 night: «100 монет» dark text on the pale accent', nb.length >= 1 && nb.every(x => cr(hex(x.c), hex(x.b)) >= 4.5), nb);
await p.evaluate(() => { closeRewardsSheet(); toggleDayNight(); __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
const rd = await p.evaluate(() => { const r = getComputedStyle(document.getElementById('reader')); return { bg: r.backgroundColor, img: r.backgroundImage }; });
ok('8 reader: flat page, no grid or doodles behind the text', !/rgba\(.*, 0\)$/.test(rd.bg) && rd.img === 'none', rd);
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; }); await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(300);
ok('9 360: no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.evaluate(() => wear('skin-celestial') || (S.gold = 5000, buy('skin-celestial'), wear('skin-celestial'))); await sleep(300);
const lv = await p.evaluate(() => ({ grads: (getComputedStyle(document.documentElement).backgroundImage.match(/linear-gradient\(90deg, rgba\(0, 0, 0, 0\) 9px/g) || []).length, d: getComputedStyle(document.body, '::before').content }));
ok('10 leaving the skin: no grid or doodles', lv.grads === 0 && lv.d === 'none', lv);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY pencil2.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
