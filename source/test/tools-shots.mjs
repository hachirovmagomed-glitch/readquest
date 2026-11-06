// «Инструменты читателя»: screens for review — the shop tab, the bag, the reader bars with pinned tools, compass, card templates.
// Run: RQ_URL=… RQ_SHOTS=/tmp/out [RQ_SKINS=ellada,alisa,celestial,babochkovyi,pencil] [RQ_W=390,360] node tools-shots.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = (process.env.RQ_SHOTS || '/workspace/out').replace(/\/?$/, '/'); mkdirSync(SHOTS, { recursive: true });
const SKINS = (process.env.RQ_SKINS || 'pencil,ellada,babochkovyi,celestial,alisa').split(',');
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
for (const w of (process.env.RQ_W || '390,360').split(',').map(Number)) {
  const p = await (await browser.createBrowserContext()).newPage();
  await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
  await (await p.$('#fileInp')).uploadFile(TXT); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
  await p.evaluate(() => { S.gold = 99999; ['lupa', 'pen', 'compass', 'markers', 'rulers', 'marks', 'stickers', 'qtpl', 'lamp', 'words'].forEach(id => toolBuy(id)); toolBuy('shield'); toolBuy('hg');
    S.tools.pin = ['lupa', 'pen', 'hg']; S.tools.parts = {}; save(); });
  const clean = () => p.evaluate(() => { try { clearToasts(); } catch (e) {} document.querySelectorAll('.rq-toast').forEach(t => t.remove()); });
  let first = true;
  for (const sk of SKINS) {
    await p.evaluate(sk => { if (sk !== 'pencil') buy('skin-' + sk); wear('skin-' + sk); if (appIsNight()) toggleAppNight(); }, sk); await sleep(400);
    const tag = `${w}-${sk}`;
    if (first) { // the shop tab once with an empty bag look: some tools not owned
      await p.evaluate(() => { const T = S.tools; T._own = Object.assign({}, T.own); delete T.own.pen; delete T.own.lamp; T.parts = { pen: 3 }; }); }
    await p.evaluate(() => { openLook(true); toolsShopKind('tools'); }); await sleep(500); await clean();
    await p.evaluate(() => { const t = el('toolShop'); const sc = el('look').querySelector('.scroll'); sc.scrollTop = t.offsetTop - 120; }); await sleep(200);
    await p.screenshot({ path: `${SHOTS}${tag}-1-magazin.png` });
    await p.evaluate(() => { const t = el('toolShop'), sc = el('look').querySelector('.scroll'); sc.scrollTop = t.offsetTop + 900; }); await sleep(200);
    await p.screenshot({ path: `${SHOTS}${tag}-1b-magazin-niz.png` });
    if (first) { await p.evaluate(() => { const T = S.tools; T.own = T._own; delete T._own; T.parts = {}; save(); }); first = false; }
    await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
    await p.evaluate(() => { goPage(12, false); }); await sleep(500);
    await p.evaluate(() => { showChrome(); }); await sleep(400); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-2-chtenie-paneli.png` });
    await p.evaluate(() => el('btnBag').click()); await sleep(500); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-3-sumka.png` });
    await p.evaluate(() => { const d = el('qSheet'); d.scrollTop = 700; }); await sleep(200);
    await p.screenshot({ path: `${SHOTS}${tag}-3b-sumka-niz.png` });
    await p.evaluate(() => { qSheetClose(); toolsCompass(); }); await sleep(700); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-4-kompas.png` });
    await p.evaluate(() => { qSheetClose(); S.tools.sel.mark = 'sk-' + (document.documentElement.dataset.skin || 'pencil'); const k = R.page + 1;
      if (!(S.marks[R.book.id] || []).some(m => m.page === k)) addBookmark();
      S.ink[R.book.id] = S.ink[R.book.id] || {}; S.ink[R.book.id][String(k)] = [{ c: '#2f6fdd', w: 3, p: [80, 300, 200, 320, 320, 300, 440, 330, 560, 310] }, { c: '#d1495b', w: 12, p: [90, 520, 880, 520] }];
      S.stk[R.book.id] = [{ p: k, s: 'heart', x: 880, y: 160 }, { p: k, s: 'sk-' + (document.documentElement.dataset.skin === 'pencil' ? 'pencil' : document.documentElement.dataset.skin) + '-' + ({ pencil: 'pencil', ellada: 'amphora', babochkovyi: 'flower', celestial: 'star', alisa: 'heart' })[document.documentElement.dataset.skin], x: 850, y: 700 }];
      S.tools.sel.ruler = 'wood'; toolsApply(); hideChrome && hideChrome(); }); await sleep(500); await clean();
    await p.screenshot({ path: `${SHOTS}${tag}-5-pero-stikery.png` });
    await p.evaluate(() => toolsMode('pen')); await sleep(300);
    await p.screenshot({ path: `${SHOTS}${tag}-5b-pero-panel.png` });
    await p.evaluate(() => toolsMode('stk')); await sleep(300);
    await p.screenshot({ path: `${SHOTS}${tag}-5c-stikery-panel.png` });
    await p.evaluate(() => toolsMode(''));
    // quote card templates (one sheet of all four + the skin one)
    const imgs = await p.evaluate(async () => { const b = R.book, q = { text: 'Есть книги, которые читаешь, и есть книги, которые читают тебя.', c: 'g' }, out = {};
      for (const t of ['mini', 'polaroid', 'night', 'paper']) { const bl = await toolsCardBlob(b, q, 'стр. 13', t); out[t] = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(bl); }); }
      return out; });
    if (w === 390 && sk === SKINS[0]) for (const k of Object.keys(imgs)) writeFileSync(`${SHOTS}kartochka-${k}.png`, Buffer.from(imgs[k].split(',')[1], 'base64'));
    await p.evaluate(async () => { __navAllow = true; await closeReader({ quiet: true }); __navAllow = false; }); await sleep(500);
  }
  await p.evaluate(() => { __navAllow = true; show('profile'); renderProfile(); __navAllow = false; }); await sleep(500); await clean();
  await p.screenshot({ path: `${SHOTS}${w}-profil.png` });
  await p.close();
}
await browser.close();
