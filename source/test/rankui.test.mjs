// «Ранг круга», «Комбо», «Итог круга» в «Фокусе» (Джессика 07.11: «1 2 3»). Browser. js/focus.js + game-awards.js rankStep.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/dir] [RQ_SKINS=…] [RQ_W=390,360] node rankui.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const SHOTS = process.env.RQ_SHOTS || '';
const SKINS = (process.env.RQ_SKINS || 'pencil,ellada,babochkovyi,celestial,alisa').split(',');
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function open(w) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(() => {
    window.__rqTimeOffset = 0;
    const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
    const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
    let vis = 'visible'; Object.defineProperty(document, 'visibilityState', { get: () => vis, configurable: true });
    window.__setVis = (v) => { vis = v; document.dispatchEvent(new Event('visibilitychange')); };
  });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await (await p.$('#fileInp')).uploadFile(TXT); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
  await p.evaluate(() => { S.gold = 99999; save(); __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
  await p.evaluate(() => { SET.fz = Object.assign(SET.fz || {}, { pomo: true, len: 15, rest: 5 }); saveSet(); fzStartRound(); }); await sleep(1300);
  return p;
}
/* read: a page every `sec` seconds, `n` pages; optional actions after page k */
async function read(p, n, sec, act) {
  for (let i = 0; i < n; i++) {
    await p.evaluate((sec) => { window.__rqTimeOffset += sec * 1000; goPage(R.page + 1, true); }, sec); await sleep(1100);
    if (act) await act(i);
  }
}
const addQuote = (p, note) => p.evaluate((note) => { const b = R.book.id; (S.quotes[b] = S.quotes[b] || []).push({ text: 'цитата ' + Math.random(), note: note || '', date: today(), c: 'y' }); }, note);
const addWord = (p) => p.evaluate(() => { (S.vocab = S.vocab || []).push({ w: 'слово' + Math.random(), ctx: '', book: '', date: today(), box: 0 }); });

const W = (process.env.RQ_W || '390,360').split(',').map(Number);
let first = true;
for (const w of W) {
  const p = await open(w);
  if (first) {
    /* 1. chip shows the letter and the combo */
    await read(p, 5, 40);
    const c1 = await p.evaluate(() => ({ chip: el('fzChip').textContent, combo: FZ.rk.combo, sc: FZ.rk.sc }));
    ok('фишка круга показывает букву и комбо', /· [DCBAS] · комбо 5$/.test(c1.chip) && c1.combo === 5, c1);
    /* 2. a text action raises the meter, the same one at once barely */
    const a0 = await p.evaluate(() => FZ.rk.sc); await addQuote(p); await sleep(1200);
    const a1 = await p.evaluate(() => FZ.rk.sc); await addQuote(p); await sleep(1200);
    const a2 = await p.evaluate(() => FZ.rk.sc);
    ok('выделение +10 (k=25/15), второе сразу же +1,7', Math.abs(a1 - a0 - 10) < 0.5 && a2 - a1 < 2, [a0, a1, a2]);
    /* 3. fast flipping breaks the combo and drops the meter */
    const f0 = await p.evaluate(() => FZ.rk.sc);
    for (let i = 0; i < 2; i++) { await p.evaluate(() => { window.__rqTimeOffset += 2000; goPage(R.page + 1, true); }); await sleep(200); }
    await sleep(1200);
    const f1 = await p.evaluate(() => ({ sc: FZ.rk.sc, combo: FZ.rk.combo, best: FZ.rk.best }));
    ok('быстрое листание: комбо 0, шкала ниже', f1.combo === 0 && f1.sc < f0 - 15 && f1.best === 5, [f0, f1]);
    /* 4. leaving the app breaks the combo */
    await read(p, 3, 40);
    await p.evaluate(() => { __setVis('hidden'); }); await sleep(100); await p.evaluate(() => { window.__rqTimeOffset += 20000; __setVis('visible'); }); await sleep(1200);
    ok('выход из приложения сбрасывает комбо', await p.evaluate(() => FZ.rk.combo === 0));
    /* 5. tab status */
    await p.evaluate(() => { showChrome(); openReaderSettings('grpFocus'); }); await sleep(500);
    const t5 = await p.evaluate(() => (document.querySelector('#fzStatus .fzrkst') || {}).textContent || '');
    ok('во вкладке «Фокус»: ранг сейчас и комбо', /Ранг сейчас: [DCBAS] · комбо \d+ стр\./.test(t5), t5);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-0-vkladka.png` });
    await p.evaluate(() => el('sheet').classList.add('hidden')); await sleep(200);
    /* 6. finish the round with honest reading + varied actions → card */
    await read(p, 20, 40, async (i) => { if (i === 2) await addQuote(p, 'мысль'); if (i === 5) await addWord(p); });
    const r6 = await p.evaluate(() => ({ phase: FZ.phase, ranks: FZ.ranks.slice(), shown: !el('fzRes').classList.contains('hidden'), t: el('fzRes').innerText, letter: (el('fzRes').querySelector('.fzrk b') || {}).textContent }));
    ok('круг закрыт: итог круга с буквой, комбо, страницами и монетами', r6.phase === 'rest' && r6.ranks.length === 1 && r6.shown && r6.letter === r6.ranks[0] && /Лучшее комбо: \d+/.test(r6.t) && /Страниц за круг: \d+/.test(r6.t) && /монет/.test(r6.t), r6);
    ok('ранг честного круга с разными действиями — S или A', /^[SA]$/.test(r6.ranks[0]), r6.ranks);
    const ov = await p.evaluate(() => { const b = el('fzRes').getBoundingClientRect(); return [b.left, b.right, innerWidth]; });
    ok('итог круга влезает по ширине', ov[0] >= 0 && ov[1] <= ov[2], ov);
    /* 7. «Без отдыха» → next round; ranks are pushed to the tracker */
    await p.evaluate(() => el('fzResNext').click()); await sleep(1200);
    const r7 = await p.evaluate(() => ({ phase: FZ.phase, hid: el('fzRes').classList.contains('hidden'), n: FZ.done.length }));
    ok('«Без отдыха»: новый круг, итог скрыт', r7.phase === 'run' && r7.hid && r7.n === 1, r7);
    /* 8. session summary: ranks line + coins with rank */
    const g0 = await p.evaluate(() => S.gold);
    await p.evaluate(() => closeReader()); await sleep(2500);
    const r8 = await p.evaluate(() => ({ sum: (el('sumFocus') || {}).innerText || '', row: (SESS || []).slice(-1)[0] || {}, gold: S.gold }));
    ok('строка сессии несёт pomoRk и pomoCb', /^[SA]$/.test(r8.row.pomoRk || '') && r8.row.pomoCb >= 5, { rk: r8.row.pomoRk, cb: r8.row.pomoCb });
    ok('итог сессии: «Ранги кругов» и лучшее комбо', /Ранги кругов: [SA]/.test(r8.sum) && /лучшее комбо \d+ стр\./.test(r8.sum), r8.sum);
    const want = 3 + ({ S: 2, A: 1 })[r8.row.pomoRk];
    ok('монеты круга 15 мин = 3 + бонус ранга', /\+\s*\d+.*круги фокуса и ранги/.test(r8.sum) && r8.gold - g0 >= want, { d: r8.gold - g0, want, sum: r8.sum });
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}-9-itog-sessii.png` });
    first = false;
    await p.close();
    continue;
  }
  await p.close();
}
/* screenshots of the round card in every skin, both widths */
if (SHOTS) for (const w of W) {
  const p = await open(w);
  for (const sk of SKINS) {
    await p.evaluate(sk => { if (sk !== 'pencil') buy('skin-' + sk); wear('skin-' + sk); if (appIsNight()) toggleAppNight(); }, sk); await sleep(400);
    await p.evaluate(() => { FZ.rk = window.__rqGame.rankNew(15); Object.assign(FZ.rk, { sc: 96, best: 14, pages: 19, acts: 3 }); FZ.done = [15]; FZ.ranks = ['S']; FZ.phase = 'rest'; FZ.restUntil = Date.now() + 300000; fzShowRes('S'); }); await sleep(1100);
    await p.screenshot({ path: `${SHOTS}/${w}-${sk}-itog-kruga.png` });
  }
  await p.close();
}
ok('без ошибок на странице', errs.length === 0, errs.slice(0, 3));
await browser.close();
const n = checks.filter(Boolean).length;
console.log(`\nrankui: ${n}/${checks.length} passed`);
process.exit(n === checks.length ? 0 : 1);
