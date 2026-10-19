// Джессика 17.10: «Внешний вид» (тема, скин, анимации) is its own drawer item; «Инвентарь» = статистика, цитаты и заметки, словарь — one item with tabs.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node menu.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
const cur = () => p.evaluate(() => SCREENS.find(s => !el(s).classList.contains('hidden')));
const items = await p.evaluate(() => { openDrawer(); return [...document.querySelectorAll('#dList .ditem .dlab')].map(x => x.textContent); });
ok('1 drawer: one «Инвентарь», no separate «Цитаты и заметки» / «Словарь» / «Статистика»', items.includes('Инвентарь') && !items.includes('Цитаты и заметки') && !items.includes('Словарь') && !items.includes('Статистика'), items);
ok('2 drawer: «Внешний вид» right before the separator and «Настройки»', items.slice(-2).join('|') === 'Внешний вид|Настройки', items);
await p.evaluate(() => document.querySelector('#dList [data-nav="look"]').click()); await sleep(200);
let r = await p.evaluate(() => ({ th: !!document.querySelector('#look #appThemeX'), sk: !!document.querySelector('#look #appSkinX'), an: !!document.querySelector('#look #uxAnim'), inSet: !!document.querySelector('#settings #appThemeBox'), on: el('dLook').classList.contains('on') }));
ok('3 «Внешний вид» opens a screen with Тема, Скин, Анимации; they are no longer in «Общие настройки»', (await cur()) === 'look' && r.th && r.sk && r.an && !r.inSet && r.on, r);
await p.evaluate(() => { S.gold = 600; save(); buy('skin-ellada'); renderSettings(); document.querySelector('#appSkinBox .appsw[data-k="ellada"]').click(); }); await sleep(300);
ok('4 picking a skin on «Внешний вид» wears it', await p.evaluate(() => document.documentElement.dataset.skin) === 'ellada');
await p.evaluate(() => { openGeneralSettings(false); }); await sleep(100);
r = await p.evaluate(() => ({ row: !!el('btnLookCfg'), skin: !!document.querySelector('#settings #appSkinBox, #settings .shopcard'), txt: /Внешний вид|скин/i.test(el('settings').textContent) }));
ok('5 «Общие настройки» have nothing about skins any more (17.10)', !r.row && !r.skin && !r.txt, r);
r = await p.evaluate(() => { const pane = el('rewPaneShop'); return { inLook: !!pane && !!pane.closest('#look'), cards: document.querySelectorAll('#look .shopcard').length, tab: !!el('rewTabShop') }; });
ok('6 the skin shop is on «Внешний вид», «Награды» has no «Магазин» tab', r.inLook && r.cards >= 7 && !r.tab, r);
await p.evaluate(() => openRewardsSheet('shop')); await sleep(200);
ok('6b an old «shop» link opens «Внешний вид»', (await cur()) === 'look' && await p.evaluate(() => !el('rewardsSheet').classList.contains('open')));
await p.evaluate(() => navGo('stats')); await sleep(100);
const tabs = await p.evaluate(() => [...document.querySelectorAll('#quotes .progtab')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.dataset.sub));
ok('7 «Инвентарь» opens quotes; MVP shows two tabs: Цитаты и заметки, Словарь (statistics moved to «Профиль», 18.10)', (await cur()) === 'quotes' && tabs.join() === 'quotes,vocab', tabs);
await p.evaluate(() => document.querySelector('#quotes .progtab[data-sub="vocab"]').click()); await sleep(100);
r = await p.evaluate(() => ({ on: [...document.querySelectorAll('#vocab .progtab.on')].map(b => b.dataset.sub), di: el('dStats') && el('dStats').classList.contains('on') }));
ok('8 the vocab tab works in MVP and is marked', (await cur()) === 'vocab' && r.on.join() === 'vocab' && r.di, r);
await p.evaluate(() => { navGo('profile'); el('statCard').click(); applyMvpChrome(); }); await sleep(150);
r = await p.evaluate(() => ({ h1: el('stats').querySelector('h1').textContent.trim(), tabs: el('stats').querySelectorAll('.progtab').length, prof: el('bnProf').classList.contains('on'), di: el('dProf').classList.contains('on') || !el('dProf') }));
ok('9 «Статистика» opens from «Профиль»: own header, no inventory tabs, «Профиль» lit', (await cur()) === 'stats' && r.h1 === 'Статистика' && !r.tabs && r.prof, r);
await p.evaluate(() => document.querySelector('#quotes .progtab[data-sub="vocab"]').click()); await sleep(100);
r = await p.evaluate(() => ({ on: [...document.querySelectorAll('#vocab .progtab.on')].map(b => b.dataset.sub), body: !!el('vocabBody').innerHTML, di: el('dStats').classList.contains('on') }));
ok('9b the «Словарь» tab opens the vocab inside «Инвентарь»', (await cur()) === 'vocab' && r.on.join() === 'vocab' && r.body && r.di, r);
const nav = await p.evaluate(() => { SET.nav = ['library', 'notes', 'vocab', 'profile']; return navGet(); });
ok('10 stored «notes» / «vocab» pins become one «Инвентарь» (stats), nothing else lost', nav.join() === 'library,stats,profile', nav);
await p.evaluate(() => { SET.nav = ['library', 'stats', 'profile']; renderNav(); openProgress('quotes'); applyMvpChrome(); });
ok('11 the pinned «Статистика» tab lights on the quotes tab too', await p.evaluate(() => el('bnStats').classList.contains('on')));
await p.evaluate(() => navGo('quests')); await sleep(100);
r = await p.evaluate(() => ({ tabs: document.querySelectorAll('#quests .jtab, #quests .ptabs').length, h1: el('quests').querySelector('h1').textContent.trim(), box: !!el('questBox').children.length }));
ok('12 «Квесты» has no «Цитаты» / «Словарь» tabs any more (they live in «Инвентарь»)', (await cur()) === 'quests' && !r.tabs && r.h1 === 'Квесты' && r.box, r);
await p.evaluate(() => openJournal('vocab')); await sleep(100);
ok('12b an old journal link to the vocab opens it inside «Инвентарь»', (await cur()) === 'vocab');
await p.evaluate(() => navGo('library')); await sleep(150);
r = await p.evaluate(() => ({ inLib: !!document.querySelector('#library .goalcard'), inProf: !!document.querySelector('#profile #goalCard') }));
ok('13 the day goal card left the library and lives in «Профиль»', !r.inLib && r.inProf, r);
const cols = {};
for (const sk of ['default', 'ellada', 'babochkovyi', 'celestial', 'pencil']) {
  cols[sk] = await p.evaluate(sk => { S.gold = 9999; if (sk === 'default') { const w = (S.skin || ''); if (w) wear(w); } else { buy('skin-' + sk); wear('skin-' + sk); } navGo('library'); renderLibrary();
    const g = getComputedStyle(el('shelf')), c = el('shelf').querySelector('.bookcard .cover');
    return g.display + ' ' + g.gridTemplateColumns.split(' ').length + ' ' + (c ? Math.round(c.getBoundingClientRect().height / c.getBoundingClientRect().width * 100) : 0); }, sk);
}
ok('14 «Моя полка» is a grid of covers three across (3:4) in every skin', Object.values(cols).every(v => v === 'grid 3 133'), cols);
await p.evaluate(() => navGo('profile')); await sleep(150);
r = await p.evaluate(() => ({ ring: el('ringTxt').textContent, sub: el('goalSub').textContent }));
ok('15 the goal card in «Профиль» is drawn (ring and today)', /%$/.test(r.ring) && /Сегодня/.test(r.sub), r);
const lay = {};
for (const sk of ['default', 'ellada', 'babochkovyi', 'celestial', 'pencil']) {
  lay[sk] = await p.evaluate(async sk => { if (sk !== 'default') { buy('skin-' + sk); wear('skin-' + sk); } navGo('profile'); await new Promise(r => setTimeout(r, 300));
    const t = s => Math.round(document.querySelector(s).getBoundingClientRect().top), b = s => Math.round(document.querySelector(s).getBoundingClientRect().bottom);
    return { qh: t('#mvpQuestH'), goal: t('#goalCard'), end: b('#mvpWeeklyCard'), nav: t('#botnav') }; }, sk);
}
const L = Object.values(lay);
ok('16 «Профиль» one layout in every skin: «Квесты» and the goal card at the same height, both quests above the bottom bar (18.10)',
  L.every(v => v.qh === L[0].qh && v.goal === L[0].goal && v.end <= v.nav), lay);
await p.evaluate(() => { wear(''); navGo('library'); }); await sleep(150);
r = await p.evaluate(() => { const out = {}; const views = [...document.querySelectorAll('#libSortMenu .lso[data-v]')].map(b => b.dataset.v);
  for (const v of ['covers', 'short', 'full', 'grid']) { libViewPick(v); const sh = el('shelf'), c = sh.querySelector('.bookcard');
    out[v] = sh.className.includes('v-' + v) + ' ' + getComputedStyle(sh).display + ' ' + (c ? getComputedStyle(c).flexDirection : ''); }
  return { views, out, saved: SET.libView, sorts: [...document.querySelectorAll('#libSortMenu .lso[data-k]')].map(b => b.dataset.k) }; });
ok('17 shelf view in the sort menu (ReadEra): Сетка, Эскизы, Краткий, Полный; lists are rows, grid back by default; «По автору» sort (18.10)',
  r.views.join() === 'grid,covers,short,full' && r.out.covers.startsWith('true grid') && r.out.short === 'true flex row' && r.out.full === 'true flex row' && r.out.grid === 'true grid column' && r.saved === 'grid' && r.sorts.includes('author'), r);
r = await p.evaluate(async () => { wear(''); navGo('library'); LIB.f = 'all'; const P = window.prompt, C = window.confirm; let ans = 'Русская классика'; window.prompt = () => ans; window.confirm = () => true;
  const out = {}; try {
    el('libShelfAdd').click(); out.chipOn = LIB.f === 'sh:' + S.shelves[0].id && el('libTitle').textContent === 'Русская классика'; /* 18.10: filter in «⋮», title names the shelf */ out.bar = !el('libShelfBar').hidden; out.empty = /пока нет книг/.test(el('shelf').textContent);
    const id = S.shelves[0].id, b1 = allBooks()[0].id, b2 = allBooks()[1].id;
    bookInfo(b1); document.querySelector('.bk-shelves .fchip:not(.fshelfadd)').click(); shelfToggle(b2, id);
    ans = 'Чехов'; shelfNew(b1); out.two = S.shelves.length === 2 && S.shelves.every(x => x.b.includes(b1));
    LIB.f = 'sh:' + id; renderLibrary(); out.shown = [...el('shelf').querySelectorAll('.bookcard')].length;
    ans = 'Классика'; shelfRename(id); out.renamed = shelfById(id).n === 'Классика' && /Классика/.test(el('libShelfBar').textContent);
    { const pr = shelfDelete(id); await new Promise(r => setTimeout(r, 50)); el('rqAskOk').click(); await pr; } /* audit 19.10 LIB-02: confirmation sheet, not confirm() */ out.left = S.shelves.map(x => x.n).join(); out.back = LIB.f === 'all' && el('libShelfBar').hidden; out.books = allBooks().length >= 2;
  } finally { window.prompt = P; window.confirm = C; } return out; });
ok('18 own shelves (ReadEra «Коллекции»): create from «+ Полка», put books from ⓘ, one book on two shelves, rename, delete keeps books (18.10)',
  r.chipOn && r.bar && r.empty && r.two && r.shown === 2 && r.renamed && r.left === 'Чехов' && r.back && r.books, r);
ok('no page errors', !errs.length, errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY menu.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
