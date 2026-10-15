// Интерфейс, 4 правки (ревью 1722): 1) нижнее меню нажимается при открытых «Наградах»; 2) кнопка на странице скина 52px;
// 3) в «Карандашном» на карточке нет второго «Надеть»; 4) в шапке бокового меню нет логотипа 📚.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node uifix.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
// 1
await p.evaluate(() => openRewardsSheet()); await sleep(400);
const hit = await p.evaluate(() => { const b = document.getElementById('bnProf'), r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { top: t && (t.id || t.className), inside: !!(t && b.contains(t)) }; });
const r0 = await p.evaluate(() => document.getElementById('bnProf').getBoundingClientRect().toJSON());
await p.mouse.click(r0.x + r0.width / 2, r0.y + r0.height / 2); await sleep(400);
const after = await p.evaluate(() => ({ open: el('rewardsSheet').classList.contains('open'), prof: !el('profile').classList.contains('hidden') }));
ok('1 нижнее меню нажимается при открытых «Наградах» (тап по «Профиль» закрывает их и открывает профиль)', hit.inside && !after.open && after.prof, { hit, after });
// 2
await p.evaluate(() => { openRewardsSheet('shop'); openShopDetail('skin-gravyura'); }); await sleep(400);
const h = await p.evaluate(() => Math.round(document.querySelector('#shopDetail .shopbuy').getBoundingClientRect().height));
ok('2 кнопка на странице скина 52px', h === 52, h);
await p.evaluate(() => { closeShopDetail(); closeRewardsSheet(); });
// 3
const dup = await p.evaluate(() => { wear('skin-pencil'); S.owned = Array.from(new Set((S.owned || []).concat(['skin-gravyura']))); renderShopPane();
  return [...document.querySelectorAll('#shopList .shopcard')].map(c => ({ id: c.dataset.id, n: (c.textContent.match(/Надеть/g) || []).length })); });
ok('3 «Карандашный»: на карточке не больше одного «Надеть»', dup.length && dup.every(c => c.n <= 1), dup);
// 4
const logo = await p.evaluate(() => { const d = document.getElementById('drawer'); return { logo: !!d.querySelector('.logo'), emoji: /📚/.test(d.textContent) }; });
ok('4 в боковом меню нет логотипа 📚', !logo.logo && !logo.emoji, logo);
ok('нет ошибок страницы', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY uifix.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
