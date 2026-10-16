// Long option lists collapse into one 52px row (current value + chevron): «Тема приложения» (13 tiles) in General settings and «Шрифт» (10 fonts)
// in «Настройки чтения». Collapsed by default, tap expands inline, picking applies and collapses; open state in memory only (NS/NS_set untouched by toggling).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node expand.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
const vis = (id) => `(function(){const e=document.getElementById('${id}');return !!e&&e.offsetParent!==null&&!e.closest('[hidden]');})()`;
const hookW = () => p.evaluate(() => { window.__w = []; if (!window.__wHooked) { window.__wHooked = 1; const f = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__w.push(k); return f.call(this, k, v); }; } });
const writes = () => p.evaluate(() => (window.__w || []).filter(k => k === RQ_K.v1 || k === RQ_K.set));
const optsInfo = (b) => p.evaluate((b) => { const box = document.getElementById(b); const opts = [...box.querySelectorAll(':scope > .xopt, :scope > .apptile')];
  return { n: opts.length, minH: Math.min(...opts.map(o => Math.round(o.getBoundingClientRect().height))), sample: opts.every(o => !!o.querySelector('.xs, .appsw')), label: opts.every(o => ((o.querySelector('.xn, small') || {}).textContent || '').trim().length > 0),
    cur: opts.filter(o => o.classList.contains('on')).length, mark: opts.filter(o => o.classList.contains('on')).every(o => { const m = o.querySelector('.xm, .chk'); return m && getComputedStyle(m).visibility !== 'hidden' && getComputedStyle(m).display !== 'none' && !!m.querySelector('use[href="#i-check"]'); }) }; }, b);
const store = () => p.evaluate(() => localStorage.getItem(RQ_K.v1) + '|' + localStorage.getItem(RQ_K.set));
async function check(name, boxId, rowId, open, pickSel, valueOf) {
  await open(); await sleep(300);
  const s0 = await store();
  const c = await p.evaluate((b, r) => { const row = document.getElementById(r), box = document.getElementById(b); return { row: !!row, h: row ? Math.round(row.getBoundingClientRect().height) : 0, chev: !!(row && row.querySelector('use[href="#i-chevron-down"],use[href="#i-chevron-right"]')), label: row ? row.textContent.trim() : '', boxShown: !!box && box.offsetParent !== null && !box.hidden }; }, boxId, rowId);
  const cs = await p.evaluate((r, nm) => { const row = document.getElementById(r); if (!row) return {}; const dot = row.querySelector('.xdot'), xv = row.querySelector('.xv');
    return nm === 'theme' ? { dot: !!dot && getComputedStyle(dot).backgroundColor !== 'rgba(0, 0, 0, 0)' } : { font: !!xv && getComputedStyle(xv).fontFamily === getComputedStyle(document.querySelector('#fontSeg button.on .xn') || document.body).fontFamily && !!document.querySelector('#fontSeg button.on .xn') }; }, rowId, name);
  ok(name + ': closed row shows ' + (name === 'theme' ? 'a coloured circle' : 'the value in its own font'), name === 'theme' ? cs.dot : cs.font, cs);
  ok(name + ': collapsed by default — one 52px row with current value and chevron, list hidden', c.row && c.h === 52 && c.chev && c.label.length > 0 && !c.boxShown, c);
  if (!c.row) return;
  await p.evaluate(r => document.getElementById(r).click(), rowId); await sleep(250);
  const e = await p.evaluate((b, r) => ({ shown: document.getElementById(b).offsetParent !== null && !document.getElementById(b).hidden, exp: document.getElementById(r).getAttribute('aria-expanded') }), boxId, rowId);
  const s1 = await store();
  ok(name + ': tap expands inline (aria-expanded), toggling writes nothing', e.shown && e.exp === 'true' && s0 === s1, { e, same: s0 === s1 });
  await p.screenshot({ path: '/workspace/out/expand-' + name + '-open.png' });
  const oi = await optsInfo(boxId);
  ok(name + ': expanded list per mockup sf-1g — every option has sample + label, ≥44px rows, one current with a check mark', oi.n >= 5 && oi.minH >= 44 && oi.sample && oi.label && oi.cur === 1 && oi.mark, oi);
  await hookW(); await p.evaluate(r => document.getElementById(r).click(), rowId); await sleep(200); await p.evaluate(r => document.getElementById(r).click(), rowId); await sleep(200);
  await p.evaluate(r => document.getElementById(r).click(), rowId); await sleep(300);
  ok(name + ': expand / collapse / close without selecting → zero storage writes', (await writes()).length === 0, await writes());
  await p.evaluate(r => document.getElementById(r).click(), rowId); await sleep(200);
  const picked = await p.evaluate((sel) => { const b = document.querySelector(sel); b.click(); return true; }, pickSel); await sleep(400);
  const a = await p.evaluate((b, r) => ({ shown: document.getElementById(b).offsetParent !== null && !document.getElementById(b).hidden, label: document.getElementById(r).textContent.trim() }), boxId, rowId);
  const v = await p.evaluate(valueOf);
  ok(name + ': picking applies it and collapses, row shows new value', picked && !a.shown && a.label.indexOf(v) >= 0 && a.label.length > 0, { a, v });
  await p.screenshot({ path: '/workspace/out/expand-' + name + '-closed.png' });
}
await check('theme', 'appThemeBox', 'appThemeX', () => p.evaluate(() => openGeneralSettings(false)), '#appThemeBox .apptile:nth-child(3) .appsw', () => document.querySelector('#appThemeBox .apptile.on small').textContent);
await p.evaluate(async () => { show('library'); openBook(allBooks()[0].id); for (let i = 0; i < 50 && !(R.pageCount > 1); i++) await new Promise(r => setTimeout(r, 200)); });
await check('font', 'fontSeg', 'fontSegX', () => p.evaluate(() => { el('btnAa').click(); }), '#fontSeg button:nth-child(4)', () => FONTS[SET.font].label);
// paid shop skins in the theme list: locked (Lucide lock, price as text), tap → skin page, buy() not called
await p.evaluate(() => { el('sheet') && el('sheet').classList.add('hidden'); window.__buys = 0; const b = window.buy; window.buy = function () { window.__buys++; return b.apply(this, arguments); }; openGeneralSettings(false); });
await sleep(300);
const paid = await p.evaluate(async () => { const out = []; const ids = (typeof SHOP_CATALOG !== 'undefined' ? SHOP_CATALOG : []).filter(x => x.type === 'skin' && x.price > 0 && !shopOwns(x.id)).map(x => x.id);
  for (const t of [...document.querySelectorAll('#appThemeBox .apptile')]) { const k = (t.querySelector('.appsw') || {}).dataset ? t.querySelector('.appsw').dataset.k : ''; if (ids.indexOf(k) < 0) continue;
    const th0 = SET.theme; t.click(); await new Promise(r => setTimeout(r, 300));
    out.push({ k, lock: !!t.querySelector('use[href="#i-lock"]'), price: /\d+ монет/.test(t.textContent), applied: SET.theme !== th0, page: shopOpen === k }); }
  return { ids, out, buys: window.__buys }; });
ok('paid skins in the theme list: locked with Lucide lock + price text, tap opens the skin page, never applied, buy() not called', paid.out.every(o => o.lock && o.price && !o.applied && o.page) && paid.buys === 0, paid);
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY expand.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
