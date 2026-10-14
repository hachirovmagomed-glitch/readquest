// NS_set.nav (контракт Архитектора, «Нижняя панель и боковое меню») + полное боковое меню по mockups/drawer/spec.md.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node nav.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DEF = '["library","rewards","profile"]';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const has = await p.evaluate(() => typeof navRead === 'function' && typeof navSave === 'function');
const R = (v) => has ? p.evaluate((v) => JSON.stringify(navRead(v)), v) : Promise.resolve('n/a');
// contract: forgiving read
ok('nav: неизвестные id и дубли отбрасываются', await R(['library', 'bogus', 'rewards', 'rewards', 'profile']) === DEF, await R(['library', 'bogus', 'rewards', 'rewards', 'profile']));
const seven = ['library', 'rewards', 'profile', 'quests', 'notes', 'vocab', 'stats'];
ok('nav: сверх 5 обрезается', await R(seven) === '["library","rewards","profile","quests","notes"]', await R(seven));
ok('nav: library всегда первой', await R(['profile', 'quests', 'library']) === '["library","profile","quests"]' && await R(['rewards']) === '["library","rewards"]', [await R(['profile', 'quests', 'library']), await R(['rewards'])]);
const broken = [await R(null), await R(undefined), await R([]), await R('garbage'), await R({ a: 1 }), await R([1, null, {}]), await R(['bogus'])];
ok('nav: пустой или битый → ' + DEF, broken.every(x => x === DEF), broken);
// reading writes nothing: broken nav in storage, reload, drawer + settings + bottom bar render
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem(RQ_K.set) || '{}'); s.nav = ['bogus', 'profile', 'profile', 'stats', 7]; localStorage.setItem(RQ_K.set, JSON.stringify(s)); });
await p.reload({ waitUntil: 'load' }); await boot();
const a = await p.evaluate(() => localStorage.getItem(RQ_K.set));
await p.evaluate(async () => { try { openDrawer(); await new Promise(r => setTimeout(r, 300)); closeDrawer(); openGeneralSettings(false); if (typeof openNavCfg === 'function') openNavCfg(); await new Promise(r => setTimeout(r, 300)); if (typeof closeNavCfg === 'function') closeNavCfg(); show('library'); } catch (e) {} await new Promise(r => setTimeout(r, 400)); });
const b = await p.evaluate(() => localStorage.getItem(RQ_K.set));
const bar = await p.evaluate(() => [...document.querySelectorAll('#botnav .botnav-btn')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.dataset.nav || x.id));
ok('nav: чтение не пишет (NS_set побайтно равен), панель = library,profile,stats', a === b && JSON.stringify(bar) === '["library","profile","stats"]', { same: a === b, bar });
// write: one saveSet through the gate; passive window refused
const w = has ? await p.evaluate(async () => { const r1 = navSave(['library', 'rewards', 'quests', 'notes', 'profile']); await new Promise(r => setTimeout(r, 200));
  const s1 = JSON.parse(localStorage.getItem(RQ_K.set)).nav; const g = window.__rqWriter, m = g.mayWrite; g.mayWrite = () => false; let r2; try { r2 = navSave(['library']); } finally { g.mayWrite = m; }
  const s2 = JSON.parse(localStorage.getItem(RQ_K.set)).nav; const bar = [...document.querySelectorAll('#botnav .botnav-btn')].map(x => x.dataset.nav); return { r1, s1, r2, s2, bar }; }) : {};
ok('nav: запись в NS_set, панель из 5 вкладок; пассивное окно не пишет', w.r1 === true && JSON.stringify(w.s1) === '["library","rewards","quests","notes","profile"]' && w.r2 === false && JSON.stringify(w.s2) === JSON.stringify(w.s1) && w.bar && w.bar.length === 5, w);
// old backup without nav → default
const imp = await p.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); const hadNav = !!(e.settings && e.settings.nav); delete e.settings.nav;
  try { await __rq.importBackup(e); } catch (x) { return { err: String(x.message || x) }; } return { hadNav }; });
await p.reload({ waitUntil: 'load' }); await boot();
const impNav = has ? await p.evaluate(() => JSON.stringify(navGet())) : 'n/a';
ok('nav: экспорт несёт nav; старый бэкап без nav → ' + DEF, imp.hadNav && impNav === DEF, { imp, impNav });
// drawer per mockup
await p.evaluate(() => { if (typeof navSave === 'function') navSave(['library', 'rewards', 'profile']); openDrawer(); }); await sleep(400);
const d = await p.evaluate(() => { const dr = document.getElementById('drawer'); const items = [...dr.querySelectorAll('.ditem')].filter(x => x.offsetParent);
  return { w: Math.round(dr.getBoundingClientRect().width), ava: !!dr.querySelector('.dava'), name: (dr.querySelector('.dname') || {}).textContent || '', items: items.map(x => x.dataset.nav || x.id), pins: items.filter(x => x.querySelector('.dpin')).map(x => x.dataset.nav),
    h: items.length ? Math.round(items[0].getBoundingClientRect().height) : 0, cap: /закреплено в нижней панели/.test(dr.textContent), emoji: /\p{Extended_Pictographic}/u.test(dr.textContent) }; });
ok('drawer: 85% ширины (≈332px), аватар и имя, 7 разделов + Настройки, пункты 52px, без эмодзи', Math.abs(d.w - 332) <= 2 && d.ava && d.name.length > 0 && JSON.stringify(d.items) === '["library","rewards","profile","quests","notes","vocab","stats","settings"]' && d.h === 52 && !d.emoji, d);
ok('drawer: значок pin у закреплённых (library,rewards,profile) и подпись внизу', JSON.stringify(d.pins) === '["library","rewards","profile"]' && d.cap, d.pins);
await p.evaluate(() => closeDrawer());
// settings «Нижняя панель»
const c = has ? await p.evaluate(async () => { openGeneralSettings(false); const row = document.getElementById('btnNavCfg'); if (!row) return { row: false }; row.click(); await new Promise(r => setTimeout(r, 300));
  const pane = document.getElementById('navCfg'); const add = [...pane.querySelectorAll('.navadd')]; add[0].click(); add[1] && add[1].click(); await new Promise(r => setTimeout(r, 200));
  const pane2 = document.getElementById('navCfg'); const dis = [...pane2.querySelectorAll('.navadd')].every(b => b.disabled); const lock = !!pane2.querySelector('[data-nav="library"] .navlock');
  const prev = pane2.querySelectorAll('.navprev [data-nav]').length; const cnt = (pane2.querySelector('.navcnt') || {}).textContent; const max = /Максимум 5 вкладок/.test(pane2.textContent);
  pane2.querySelector('[data-nav="profile"] .navup').click(); await new Promise(r => setTimeout(r, 200)); const saved = JSON.parse(localStorage.getItem(RQ_K.set)).nav;
  return { row: true, dis, lock, prev, cnt, max, saved }; }) : {};
ok('«Нижняя панель»: превью, «В панели · 5 из 5», добавление выключено, замок у Библиотеки, «Выше» меняет порядок и пишет', c.row && c.dis && c.lock && c.prev === 5 && /5 из 5/.test(c.cnt || '') && c.max && c.saved && c.saved[0] === 'library' && c.saved.indexOf('profile') === 1, c);
// gestures: edge swipe opens, swipe left closes; menu button visible in MVP library
const sw = async (x0, x1) => { const c = await p.target().createCDPSession(); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: 400 }] }); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: (x0 + x1) / 2, y: 402 }] }); await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1, y: 404 }] }); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400); };
await p.evaluate(() => { closeNavCfg && closeNavCfg(); show('library'); }); await sleep(300);
const mb = await p.evaluate(() => !!el('menuLib').offsetParent);
await sw(8, 200); const o1 = await p.evaluate(() => el('drawer').classList.contains('open'));
await sw(300, 60); const o2 = await p.evaluate(() => el('drawer').classList.contains('open'));
ok('drawer: кнопка меню в библиотеке; свайп от края открывает, свайп влево закрывает', mb && o1 && !o2, { mb, o1, o2 });
ok('нет ошибок страницы', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY nav.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
