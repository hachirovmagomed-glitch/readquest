// No emoji in the app (Джессика 17.10: «убери колхозные смайлики из статистики и отовсюду»). MVP screens after one 10-minute session:
// library, summary, profile, Путь, Дневник (quests, quotes, vocab), Прогресс (stats + «Год в чтении», calendar, achievements, shelf), settings.
// In every theme no visible text node and no visible placeholder holds an emoji (\p{Extended_Pictographic}); icons are Lucide <svg>.
// Covers of the demo books (🦎 🏮 🧠 in the data) render as Lucide + format in every theme; «Бейджи» use Lucide too.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node noemoji.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.evaluateOnNewDocument(() => { window.__rqTimeOffset = 0; const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset; const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset; });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady === true, { timeout: 20000 }); await sleep(400);

/* visible emoji on the current screen */
const scan = () => p.evaluate(() => {
  const R = /\p{Extended_Pictographic}/u, out = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility({ visibilityProperty: true }); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (R.test(n.nodeValue) && n.parentElement && vis(n.parentElement)) out.push(n.nodeValue.trim().slice(0, 60));
  document.querySelectorAll('input[placeholder]').forEach(i => { if (R.test(i.placeholder) && vis(i)) out.push('placeholder: ' + i.placeholder); });
  return out;
});
const go = (f, a) => p.evaluate(f, a).then(() => sleep(350));

/* one 10-minute session on «Хамелеон» (built-in book with an emoji cover in the data), quotes + a vocab word + a planned day */
await go(() => openBook('b1')); await p.waitForFunction(() => R.pageCount > 1, { timeout: 10000 });
for (let i = 0; i < 4; i++) await go(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); });
await go(() => closeReader()); await sleep(1000);
const sum = await scan(); const sumOn = await p.evaluate(() => !document.getElementById('summary').classList.contains('hidden'));
ok('session summary: no emoji', sumOn && sum.length === 0, { sumOn, sum });
await go(() => { const b = document.getElementById('btnDone'); if (b) b.click(); });
await go(() => { const k = today(); S.planned[k.slice(0, 8) + '28'] = 1; S.vocab.push({ w: 'слово', ctx: 'контекст', book: 'Хамелеон', date: k, box: 4 }); S.vocab.push({ w: 'ещё', ctx: '', book: 'Хамелеон', date: k, box: 1 });
  (S.quotes = S.quotes || {}).b1 = [{ text: 'Цитата', note: 'заметка', date: k }]; save(); });

const SCREENS = [
  ['library', () => navGo('library')], ['profile', () => navGo('profile')], ['path', () => navGo('path')],
  ['quests', () => navGo('quests')], ['quotes', () => navGo('notes')], ['vocab', () => navGo('vocab')],
  ['vocab cards', () => { navGo('vocab'); document.getElementById('btnVocabCards').click(); }],
  ['stats', () => { __navAllow = true; openProgress('stats'); }],
  ['year in reading', () => { __navAllow = true; openProgress('stats'); document.getElementById('btnYearReview').click(); }],
  ['calendar', () => { __navAllow = true; openProgress('calendar'); }],
  ['calendar day', () => { __navAllow = true; openProgress('calendar'); calPick(today()); }],
  ['achievements', () => { __navAllow = true; openProgress('achievements'); }],
  ['shelf', () => { __navAllow = true; openProgress('shelf'); }],
  ['settings', () => navGo('settings')], ['book card', () => { navGo('library'); bookInfo('b1'); }]];
/* app palettes (dark «Бирюза», «Светлая») and the free skin «Карандашный» */
for (const t of ['teal', 'light', 'pencil']) {
  await go((t) => { if (t === 'pencil') { SET.theme = 'pencil'; saveSet(); applySet(); } else { S.appTheme = t; save(); applyAppTheme(); } }, t);
  const bad = {};
  for (const [name, f] of SCREENS) { await go(f); const e = await scan(); if (e.length) bad[name] = e; await go(() => { el('bookSheet').classList.add('hidden'); }); }
  ok(`theme ${t}: no emoji on ${SCREENS.length} MVP screens`, Object.keys(bad).length === 0, bad);
}
const cov = await p.evaluate(() => { navGo('library'); return [...document.querySelectorAll('#shelf .cover')].map(c => ({ svg: !!c.querySelector('svg'), t: c.textContent.trim() })); });
ok('demo-book covers: Lucide svg + format, no emoji text', cov.length >= 3 && cov.every(c => c.svg && !/\p{Extended_Pictographic}/u.test(c.t)), cov);
const badges = await p.evaluate(() => { __navAllow = true; openProgress('achievements'); return [...document.querySelectorAll('.badge .bi')].map(b => !!b.querySelector('svg') && !b.textContent.trim()); });
ok('«Бейджи»: every badge icon is a Lucide svg', badges.length >= 9 && badges.every(Boolean), badges);
ok('no page errors', errs.length === 0, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`\nSUMMARY noemoji.test ${pass}/${checks.length}`); process.exit(pass === checks.length ? 0 : 1);
