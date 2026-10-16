// Achievements v2 in the app (js/achievements.js): seed from history once, writes only through save() and only when
// something was added, export → reset → import, old backups, summary lines, title / frame choice, no XP multiplier growth,
// layout at 390 / 360, test build only (rq root: off).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_MAIN_URL=http://127.0.0.1:8767/readquest/ node ach2.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const MAIN = process.env.RQ_MAIN_URL || BASE.replace(/test\/?$/, '');
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i).slice(0, 500) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh(url, w) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w || 390, height: 844, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.setCacheEnabled(false); await p.setBypassServiceWorker(true);
  p.__url = url; await load(p); return p;
}
async function load(p) { await p.goto(p.__url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); }
const V1 = (p) => p.evaluate(() => localStorage.getItem(RQ_K.v1));
const G = (p) => p.evaluate(() => JSON.parse(JSON.stringify({ achDates: S.achDates || {}, achSeed: S.achSeed, achTitle: S.achTitle, achFrame: S.achFrame, xpMult: S.xpMult })));
/* history: 12 days × 15 min at 06:20 in a built-in book (Oct 2026), one 35-min evening session */
const seedHistory = (p) => p.evaluate(async () => {
  const id = BOOKS[0].id;
  for (let i = 1; i <= 12; i++) { const d = '2026-09-' + String(i).padStart(2, '0');
    await __rq.logSession({ date: d, bookId: id, minutes: 15, pageTurns: 30, startedAt: new Date(d + 'T06:20:00').getTime() }); }
  await __rq.logSession({ date: '2026-09-13', bookId: id, minutes: 35, pageTurns: 70, startedAt: new Date('2026-09-13T23:30:00').getTime() });
  return true; });

/* ---- 1. seed from history on boot ---- */
const p = await fresh(BASE);
ok('0 test build: achievements v2 are on', await p.evaluate(() => typeof achV2 === 'function' && achV2() === true));
await seedHistory(p);
/* an existing reader upgrading: history is there, v2 has not run yet */
await p.evaluate(async () => { S.achDates = {}; S.achSeed = null; save(); await new Promise(r => setTimeout(r, 200)); });
await load(p);
let g = await G(p);
const want = ['first', 'h1', 'd3', 'd7', 'streak3', 'streak7', 'lark', 'owl', 'marathon', 'sess10', 'morning10'];
ok('1a boot after history: done achievements recorded in achDates (first, h1, d3, d7, streak7, lark, owl, marathon, sess10, morning10)', want.every(k => /^\d{4}-\d{2}-\d{2}$/.test((g.achDates || {})[k] || '')), g.achDates);
ok('1b achSeed = {d: today, n: number recorded}', g.achSeed && g.achSeed.n === Object.keys(g.achDates).length && g.achSeed.d === await p.evaluate(() => today()), g.achSeed);
ok('1c nothing unearned recorded (no «Сто часов», no «Кирпич»)', !!g.achDates && !g.achDates.h100 && !g.achDates.big1000);
const v1a = await V1(p); await load(p); const v1b = await V1(p);
ok('1d second boot: rq_v1 byte-identical (nothing new → no write)', v1a === v1b);

/* ---- 2. viewing writes nothing ---- */
const before = await V1(p);
const view = await p.evaluate(async () => { renderProfile(); show('profile'); const card = el('achCard'); const vis = !!card && card.offsetParent !== null;
  openAchPage(); await new Promise(r => setTimeout(r, 200)); const pg = el('achPage'); const open = !!pg && !pg.hidden;
  const secs = [...document.querySelectorAll('#achPage [data-sec]')]; for (const b of secs) { b.click(); await new Promise(r => setTimeout(r, 30)); }
  return { vis, open, secs: secs.length, text: pg ? pg.innerText : '' }; });
ok('2a profile shows the achievements card; the page opens with 11 section tabs', view.vis && view.open && view.secs >= 11, { vis: view.vis, open: view.open, secs: view.secs });
ok('2b page shows points and «из 106»', /из 106/.test(view.text) && /очк/.test(view.text), view.text.slice(0, 300));
ok('2c open page, switch every section → 0 writes', (await V1(p)) === before);
ok('2d secret ones show «???» and a hint, not the name and not the progress', await p.evaluate(() => { const t = el('achPage').innerText; return /\?\?\?/.test(t) && !/Ровно сто/.test(t) && !/\/ 1001/.test(t); }));
ok('2e no emoji in the page', await p.evaluate(() => !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(el('achPage').innerText + el('achCard').innerText)));
const back = await p.evaluate(async () => { history.back(); await new Promise(r => setTimeout(r, 300)); return el('achPage').hidden && !el('profile').classList.contains('hidden'); });
ok('2f system back closes the page, profile stays', back);

/* ---- 3. layout 390 / 360 ---- */
for (const w of [390, 360]) {
  await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true });
  const L = await p.evaluate(async () => { openAchPage(); await new Promise(r => setTimeout(r, 200)); const pg = el('achPage');
    const bad = [...pg.querySelectorAll('*')].filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5); }).map(n => n.className || n.tagName).slice(0, 5);
    const r = { sw: document.scrollingElement.scrollWidth, iw: innerWidth, bad }; closeAchPage(); return r; });
  ok('3 width ' + w + ': nothing sticks out of the screen', L.bad.length === 0 && L.sw <= L.iw, L);
}
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

/* ---- 4. a new session: summary lines, recorded once, no XP multiplier growth ---- */
const s4 = await p.evaluate(async () => { S.xpMult = 1; const id = BOOKS[0].id;
  SESS.push({ id: 'ach-' + Date.now(), date: '2026-10-01', bookId: id, minutes: 61, pageTurns: 130, startedAt: new Date('2026-10-01T12:10:00').toISOString() });
  const n1 = achRun(); const n2 = achRun(); checkAchievements();
  return { n1: n1.map(a => a.id), n2: n2.length, mult: S.xpMult, dates: Object.assign({}, S.achDates) }; });
ok('4a new 61-min lunch session → «Обеденный перерыв», «Час без перерыва» recorded today', s4.n1.includes('lunch') && s4.n1.includes('sess60') && s4.dates.lunch === await p.evaluate(() => today()), s4.n1);
ok('4b second run → nothing new (idempotent)', s4.n2 === 0);
ok('4c S.xpMult does not grow with v2 (old 13 achievements no longer add a multiplier)', s4.mult === 1, s4.mult);
const sum = await p.evaluate(() => { renderSummary({ xp: 10, gold: 0, pages: 2, min: 1, stat: 'Воля', statGain: 1, newB: [], lvBefore: level(S.xp), justFinished: false, mult: 1, flipped: 0, cheatFinish: false, dName: '', dmul: 1, newAch: [], day: today(), quest: { daily: [], weekly: [] }, title: 'x',
  achNew: [{ id: 'lunch', name: 'Обеденный перерыв' }, { id: 'sess60', name: 'Час без перерыва' }, { id: 'h5', name: 'Пять часов' }, { id: 'h10', name: 'Десять часов' }] });
  show('summary'); const b = el('sumAch'); return { vis: !!b && b.offsetParent !== null && !b.classList.contains('hidden'), lines: b ? [...b.children].map(x => x.textContent.trim()) : [] }; });
ok('4d summary: two lines «Новое достижение: …» + «и ещё 2», visible in MVP', sum.vis && sum.lines.length === 3 && /Новое достижение/.test(sum.lines[0]) && /и ещё 2/.test(sum.lines[2]), sum);
const sum0 = await p.evaluate(() => { renderSummary({ xp: 10, gold: 0, pages: 2, min: 1, stat: 'Воля', statGain: 1, newB: [], lvBefore: level(S.xp), justFinished: false, mult: 1, flipped: 0, cheatFinish: false, dName: '', dmul: 1, newAch: [], day: today(), quest: { daily: [], weekly: [] }, title: 'x', achNew: [] });
  const b = el('sumAch'); return !b || b.classList.contains('hidden') || b.offsetParent === null; });
ok('4e summary without new ones: no block', sum0);
ok('4f reader has no achievement toast (flashMsg not used by achRun)', await p.evaluate(() => { let n = 0; const f = window.flashMsg; window.flashMsg = function () { n++; }; SESS.push({ id: 'ach2-' + Date.now(), date: '2027-01-01', bookId: BOOKS[0].id, minutes: 11, pageTurns: 22 }); achRun(); window.flashMsg = f; return n === 0; }));

/* ---- 5. title and frame ---- */
const t = await p.evaluate(async () => { const lockedTitle = RQAch.CAT.find(a => a.title && !achEarned(a.id)); const v0 = localStorage.getItem(RQ_K.v1);
  const r1 = achSetTitle(lockedTitle.id); const same = localStorage.getItem(RQ_K.v1) === v0;
  const own = RQAch.CAT.find(a => a.title && achEarned(a.id)); const r2 = achSetTitle(own ? own.id : '');
  await new Promise(r => setTimeout(r, 200)); renderProfile();
  return { r1, same, own: own && own.title, r2, stored: S.achTitle, shown: el('profile').innerText.includes(own ? own.title : '##') }; });
ok('5a locked title refused, nothing written', t.r1 === false && t.same, t);
ok('5b earned title chosen → stored and shown in the profile', t.own && t.r2 === true && t.shown, t);
const fr = await p.evaluate(() => { const v0 = localStorage.getItem(RQ_K.v1); const r = achSetFrame('frame3500'); return { r, same: localStorage.getItem(RQ_K.v1) === v0 }; });
ok('5c frame without enough points refused, nothing written', fr.r === false && fr.same, fr);

/* ---- 6. export → reset → import ---- */
g = await G(p);
const exp = await p.evaluate(async () => JSON.stringify(await __rq.exportBackup(null, SET, { includeTextBodies: false })));
ok('6a export carries achDates / achSeed / achTitle', (() => { const j = JSON.parse(exp); return j.game && j.game.achDates && j.game.achDates.lunch && j.game.achSeed && j.game.achTitle === g.achTitle; })());
await p.evaluate(async (s) => { S.achDates = {}; S.achSeed = null; S.achTitle = ''; save(); await __rq.importBackup(JSON.parse(s)); }, exp); await load(p);
const g2 = await G(p);
ok('6b reset + import + reload → identical achDates / achSeed / achTitle / achFrame', JSON.stringify(g2) === JSON.stringify(Object.assign({}, g, { xpMult: g2.xpMult })), { g, g2 });
/* old backup without the new fields */
const old = JSON.parse(exp); ['achDates', 'achSeed', 'achTitle', 'achFrame'].forEach(k => delete old.game[k]);
await p.evaluate(async (s) => { await __rq.importBackup(JSON.parse(s)); }, JSON.stringify(old)); await load(p);
const g3 = await G(p);
ok('6c old backup without the fields imports, achievements recomputed from history on boot', g3.achDates && g3.achDates.h1 && g3.achDates.owl && g3.achSeed && g3.achTitle === '', g3);
/* broken values are dropped on read */
const bad = JSON.parse(exp); bad.game.achDates = { h1: '2026-10-01', zz: 'вчера', qq: 5 }; bad.game.achSeed = 'x'; bad.game.achTitle = { a: 1 };
await p.evaluate(async (s) => { await __rq.importBackup(JSON.parse(s)); }, JSON.stringify(bad)); await load(p);
const g4 = await G(p);
ok('6d broken achDates entries / achSeed / achTitle → dropped / defaults, no errors', g4.achDates.h1 === '2026-10-01' && !('zz' in g4.achDates) && !('qq' in g4.achDates) && (g4.achSeed === null || typeof g4.achSeed === 'object') && g4.achTitle === '', g4);

/* ---- 7. root build (rq): off ---- */
const m = await fresh(MAIN);
await seedHistory(m); await load(m);
const off = await m.evaluate(() => ({ v2: typeof achV2 === 'function' ? achV2() : 'missing', dates: S.achDates, card: (() => { renderProfile(); show('profile'); const c = el('achCard'); return !!c && c.offsetParent !== null; })() }));
ok('7 root build: v2 off, no card, nothing recorded', off.v2 === false && !off.card && Object.keys(off.dates || {}).length === 0, off);

ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY ach2.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
