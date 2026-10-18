// 18.10 (Джессика переслала отзыв, п. 5 и 7): «Бабочковый» — коконы под целью подписаны, заголовок «Профиль» читается;
// плашки «0 / 10 мин» в квестах одинаковые во всех скинах (без рамки, мягкая заливка). 360.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node profbits.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(() => { S.gold = 5000; save(); });
const chips = {};
for (const sk of ['', 'pencil', 'celestial', 'ellada', 'babochkovyi']) {
  chips[sk || 'default'] = await p.evaluate(async sk => { if (sk) { buy('skin-' + sk); wear('skin-' + sk); } __navAllow = true; show('profile'); __navAllow = false; renderMvpQuests(); await new Promise(q => setTimeout(q, 250));
    return [...document.querySelectorAll('#mvpQuestBox .mvp-quest .chip')].map(c => { const s = getComputedStyle(c); return { bw: s.borderTopWidth, sh: s.boxShadow, bg: s.backgroundColor, h: Math.round(c.getBoundingClientRect().height) }; }); }, sk);
}
const all = Object.values(chips).flat();
ok('quests: «0 / 10 мин» plates have no frame in any skin, a filled pill of one height', all.length === 10 && all.every(c => c.bw === '0px' && c.sh === 'none' && !/, 0\)$/.test(c.bg) && c.bg !== 'rgba(0, 0, 0, 0)' && c.h === all[0].h), chips);
const bb = await p.evaluate(async () => { renderGoalCard(); await new Promise(q => setTimeout(q, 100)); const h = document.getElementById('bbHatch'), cap = h && h.parentElement.querySelector('.bbcap'), t = document.querySelector('#profile .wrap > .row h1'), ts = getComputedStyle(t);
  return { cocoons: h ? h.querySelectorAll('i').length : 0, cap: cap && cap.textContent.trim(), capVis: !!cap && cap.getBoundingClientRect().height > 8, size: parseFloat(ts.fontSize), stroke: parseFloat(ts.webkitTextStrokeWidth) || 0 }; });
ok('Бабочковый: the cocoon row under the goal is labelled', bb.cocoons === 10 && /из 10/.test(bb.cap || '') && bb.capVis, bb);
ok('Бабочковый: «Профиль» title is bigger and not hairline-thin', bb.size >= 26 && bb.stroke >= 0.4, bb);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY profbits.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
