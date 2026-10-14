// «Карандашный» in «Общие настройки» (Оскар 13.10, правила Интерфейса): captioned skin tile, switches 44×24 / round 20px thumb inside
// the track, hand-drawn frame only on cards (inside, no offset), buttons/fields 1.5px line, theme tiles 1px / selected 2px + check,
// hyphens:none + no word split in «Данные» / «О приложении», bottom nav = 3 items with Lucide icons.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ [RQ_SHOTS=/workspace/out] node pencil.test.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);

// 1. bottom nav: Библиотека · Награды · Профиль, each with a Lucide icon (default skin and pencil)
const nav = () => p.evaluate(() => [...document.querySelectorAll('#botnav button')].filter(b => getComputedStyle(b).display !== 'none')
  .map(b => ({ t: b.textContent.trim(), ic: [...b.querySelectorAll('svg use')].filter(u => getComputedStyle(u.closest('svg')).display !== 'none').map(u => u.getAttribute('href')).join() })));
let n = await nav();
ok('bottom nav: 3 items Библиотека/Награды/Профиль', n.map(x => x.t).join('|') === 'Библиотека|Награды|Профиль', n);

// 2. «Общие настройки»: theme tiles captioned, «Карандашный» tile → html[data-skin=pencil]
await p.evaluate(() => openGeneralSettings(false)); await sleep(300);
const tiles = await p.evaluate(() => [...document.querySelectorAll('#appThemeBox .appsw')].map(b => ({ cap: (b.closest('.apptile') || b).querySelector('small') ? (b.closest('.apptile') || b).querySelector('small').textContent.trim() : '', k: b.dataset.k || '' })));
ok('every app theme tile has a caption', tiles.length > 5 && tiles.every(t => t.cap), tiles.map(t => t.cap));
ok('«Карандашный» tile exists', tiles.some(t => t.cap === 'Карандашный'));
const pt = await p.$('#appThemeBox .appsw[data-k="pencil"]');
if (pt) { await pt.click(); await sleep(400); }
else await p.evaluate(() => { SET.theme = 'pencil'; saveSet(); applySet(); renderSettings(); }); /* no tile (red run): still measure the rest in the skin */
const sk = !pt ? { skin: 'no tile' } : await p.evaluate(() => ({ skin: document.documentElement.dataset.skin || '', theme: SET.theme, on: [...document.querySelectorAll('#appThemeBox .appsw.on')].map(b => b.dataset.k) }));
ok('click «Карандашный» → data-skin=pencil, SET.theme=pencil, tile selected', sk.skin === 'pencil' && sk.theme === 'pencil' && sk.on.join() === 'pencil', sk);
n = await nav();
ok('pencil: nav 3 items, each a Lucide icon', n.length === 3 && n.every(x => /^#i-/.test(x.ic)), n);

// 3. switches: 44×24 track, round 20px thumb inside the track, no frame, both states
const swi = () => p.evaluate(() => [...document.querySelectorAll('#settings .sw')].filter(b => b.offsetParent).map(b => {
  const cs = getComputedStyle(b), a = getComputedStyle(b, '::after'), f = getComputedStyle(b, '::before'), r = b.getBoundingClientRect();
  const m = new DOMMatrix(a.transform === 'none' ? undefined : a.transform);
  const bl = parseFloat(cs.borderLeftWidth), bt = parseFloat(cs.borderTopWidth);
  const x = bl + parseFloat(a.left) + m.m41, y = bt + parseFloat(a.top) + m.m42, w = parseFloat(a.width), h = parseFloat(a.height);
  return { id: b.id, on: b.getAttribute('aria-checked'), tw: Math.round(r.width), th: Math.round(r.height), x, y, w, h, rad: a.borderRadius,
    inside: x >= 0 && y >= 0 && x + w <= r.width + .01 && y + h <= r.height + .01, img: a.borderImageSource + '|' + cs.borderImageSource, before: f.content, trad: cs.borderRadius, op: cs.backgroundColor };
}));
for (const pass of [0, 1]) {
  const s = await swi();
  const bad = s.filter(x => x.tw !== 44 || x.th !== 24 || x.w !== 20 || x.h !== 20 || x.rad !== '50%' || !x.inside || x.img !== 'none|none' || (x.before !== 'none' && x.before !== 'normal'));
  ok(`switches (${pass ? 'toggled' : 'initial'}): 44×24 track, round 20px thumb inside, no frame`, s.length >= 3 && !bad.length, bad.length ? bad : s.map(x => x.id + ':' + x.on));
  if (!pass) await p.evaluate(() => [...document.querySelectorAll('#settings .sw')].filter(b => b.offsetParent).forEach(b => b.click())), await sleep(300);
}
await p.evaluate(() => [...document.querySelectorAll('#settings .sw')].filter(b => b.offsetParent).forEach(b => b.click())); await sleep(300);

// 4. frame only on cards, inside the card (no negative inset / transform), card overflow hidden; nothing inside gets a frame
const fr = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#settings .pcard')].filter(c => c.offsetParent).map(c => { const a = getComputedStyle(c, '::after'), cs = getComputedStyle(c);
    return { ins: [a.top, a.right, a.bottom, a.left].map(parseFloat), tr: a.transform, ov: cs.overflow, img: a.borderImageSource !== 'none', rad: [cs.borderRadius, a.borderRadius] }; });
  const inner = [...document.querySelectorAll('#settings .pcard *')].filter(e => e.offsetParent && e.tagName !== 'svg' && !e.closest('svg') && !e.classList.contains('sw')).map(e => {
    const a = getComputedStyle(e, '::after'), b = getComputedStyle(e, '::before');
    return { e: e.id || e.className, f: [a, b].some(x => x.borderImageSource !== 'none') }; }).filter(x => x.f);
  return { cards, inner };
});
const badC = fr.cards.filter(c => !c.img || c.ins.some(v => v < 0) || c.tr !== 'none' || c.ov !== 'hidden' || c.rad[0] !== c.rad[1]);
ok('pencil frame on every settings card, inside (inset ≥0, no transform, same radius, overflow hidden)', fr.cards.length >= 4 && !badC.length, badC.length ? badC : fr.cards.length);
ok('no hand-drawn frame on rows/buttons/fields/tiles inside cards', !fr.inner.length, fr.inner.slice(0, 8));

// 5. buttons / fields / segmented: 1.5px line, no double outline; theme tiles 1px, selected 2px accent + check
const bt = await p.evaluate(() => {
  const els = [...document.querySelectorAll('#settings .ghostbtn:not(.sw), #settings .stepbtn, #settings .seg:not(#appThemeBox) button, #settings input[type=text], #settings input[type=password], #settings select')].filter(e => e.offsetParent);
  const b = els.map(e => { const cs = getComputedStyle(e); return { e: e.id || e.textContent.trim().slice(0, 12), bw: cs.borderTopWidth, bs: cs.borderTopStyle, bc: cs.borderTopColor, bi: cs.borderImageSource, sh: cs.boxShadow }; });
  const gp = document.createElement('i'); gp.style.color = getComputedStyle(document.documentElement).getPropertyValue('--rq-skin-border').trim(); document.body.appendChild(gp); const graph = getComputedStyle(gp).color; gp.remove();
  /* Chrome snaps a 1.5px border to whole px in getComputedStyle → also check the declared width in the pencil rule that hits each control */
  const decl = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).filter(r => r.selectorText && r.selectorText.includes('pencil') && r.style && r.style.borderTopWidth);
  b.forEach((x, i) => { const hit = decl.filter(r => { try { return els[i].matches(r.selectorText); } catch (e) { return false; } }); x.decl = hit.length ? hit[hit.length - 1].style.borderTopWidth : ''; x.graph = x.bc === graph; });
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--rq-accent').trim();
  const t = [...document.querySelectorAll('#appThemeBox .appsw')].map(e => { const cs = getComputedStyle(e); return { k: e.dataset.k, on: e.classList.contains('on'), bw: cs.borderTopWidth, bc: cs.borderTopColor, chk: !!e.parentElement.querySelector('.chk') && getComputedStyle(e.parentElement.querySelector('.chk')).display !== 'none' }; });
  const probe = document.createElement('i'); probe.style.color = acc; document.body.appendChild(probe); const accRgb = getComputedStyle(probe).color; probe.remove();
  return { b, t, accRgb };
});
const badB = bt.b.filter(x => !['1px', '1.5px'].includes(x.bw) || x.decl !== '1.5px' || !x.graph || x.bs !== 'solid' || x.bi !== 'none' || x.sh !== 'none');
ok('buttons/fields/segmented: 1.5px solid graphite line (declared), no border-image, no extra shadow outline', bt.b.length >= 5 && !badB.length, badB.length ? badB : bt.b.length);
const badT = bt.t.filter(x => x.on ? (x.bw !== '2px' || x.bc !== bt.accRgb || !x.chk) : (x.bw !== '1px' || x.chk));
ok('theme tiles: 1px border; selected 2px accent + check', bt.t.length > 5 && !badT.length, badT.length ? badT : 'ok');

// 6. «Данные» / «О приложении» / headings: hyphens none, overflow-wrap normal, no word split across lines, buttons inside the card
const hy = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('#settings .setrow')].filter(r => r.offsetParent);
  const texts = [...document.querySelectorAll('#settings .lab, #settings .sub, #settings h1, #settings h2, #settings .ghostbtn:not(.sw)')].filter(e => e.offsetParent);
  const bad = [], split = [];
  for (const e of texts) { const cs = getComputedStyle(e); if (cs.hyphens !== 'none' || cs.overflowWrap !== 'normal' || cs.wordBreak === 'break-all') bad.push({ t: e.textContent.trim().slice(0, 30), h: cs.hyphens, w: cs.overflowWrap });
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let nd;
    while ((nd = tw.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(nd.data))) { const rg = document.createRange(); rg.setStart(nd, m.index); rg.setEnd(nd, m.index + m[0].length);
      const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))); if (tops.size > 1) split.push(m[0]); } } }
  const over = rows.map(r => { const c = r.closest('.pcard').getBoundingClientRect(); return [...r.querySelectorAll('button')].filter(b => b.offsetParent).map(b => { const q = b.getBoundingClientRect(); return { b: b.id, out: q.right > c.right + .5 || q.left < c.left - .5 }; }).filter(x => x.out); }).flat();
  const want = ['Журнал запуска', 'Вернуть удалённые демо-книги', 'Если тут старая дата — обновите страницу'].map(s => ({ s, found: texts.some(e => e.textContent.includes(s)) }));
  return { bad, split, over, want };
});
ok('hyphens:none + overflow-wrap:normal on settings texts', !hy.bad.length, hy.bad.slice(0, 10));
ok('no word split across lines (Журнал запуска, демо-книги, старая дата…)', hy.want.every(w => w.found) && !hy.split.length, { split: hy.split, want: hy.want });
ok('row buttons stay inside the card (wrap below the text)', !hy.over.length, hy.over);

// screenshots
await p.evaluate(() => { const s = document.querySelector('#settings .scroll'); if (s) s.scrollTop = 0; }); await sleep(200);
await p.screenshot({ path: SHOTS + 'pencil-settings-390.png' });
await p.evaluate(() => { const h = [...document.querySelectorAll('#settings h2')].find(x => x.textContent === 'Данные'); h.scrollIntoView({ block: 'start' }); }); await sleep(200);
await p.screenshot({ path: SHOTS + 'pencil-data-390.png' });

// 7. another app theme tile leaves the skin (palette would be masked by the skin otherwise)
const t2 = await p.$('#appThemeBox .appsw[data-k="teal"]'); if (t2) { await t2.click(); await sleep(300); }
const sk2 = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin || '', app: S.appTheme, theme: SET.theme }));
ok('picking «Бирюза» leaves the skin (data-skin removed, app theme teal)', sk2.skin === '' && sk2.app === 'teal' && sk2.theme !== 'pencil', sk2);
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
