// Скриншоты «Дневников» (25.10) по скинам, день и ночь. Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ OUT=/tmp/x node diary-shots.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const OUT = process.env.OUT || '/tmp/diary-shots';
const W = +(process.env.W || 390);
const SKINS = (process.env.SKINS || 'none,pencil,ellada,babochkovyi,celestial').split(',');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
for (const sk of SKINS) for (const night of [false, true]) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(sk + ': ' + e.message));
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  await p.evaluate(async (sk, night) => {
    S.gold = 5000;
    if (sk !== 'none') { const id = 'skin-' + sk; if (shopItem(id).price) buy(id); wear(id); }
    const bs = allBooks();
    const b = bs[0], b2 = bs[1];
    S.quotes[b.id] = [{ text: 'Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему.', note: 'Главная мысль всей книги', date: '2026-10-21', c: 'y' },
      { text: 'Всё смешалось в доме Облонских.', note: '', date: '2026-10-22', c: 'g' }];
    S.marks[b.id] = [{ ratio: 0.12, page: 14, date: '2026-10-22' }];
    const y = diaryNew({ b: b.id }); y.cc = 'blue'; y.rb = 'gold';
    dyNewEntry(y, 'chars'); const n = dyNewEntry(y, '', { ch: 'Глава 3', pg: 27, r: 0.2 }); n.t = 'Первые впечатления'; n.x = 'Начало **очень** сильное. Мне нравится, как автор *сразу* бросает в конфликт.\n\n- Стива — обаятельный и безответственный\n- Долли — устала\n\n> Всё смешалось в доме Облонских';
    n.pin = true;
    const y2 = diaryNew({ b: b2.id }); y2.cv = 'pencil'; y2.cc = 'kraft'; y2.pp = 'grid';
    const y3 = diaryNew({ t: 'Что прочитать' }); y3.cc = 'black'; y3.rb = 'red';
    const n3 = dyNewEntry(y3, ''); n3.t = 'Список'; n3.x = '- Мастер и Маргарита\n- Сто лет одиночества';
    save();
    if (night) { if (sk === 'none') toggleAppNight(); else toggleDayNight(); }
  }, sk, night);
  await sleep(500);
  const tag = sk + (night ? '-night' : '-day');
  await p.evaluate(() => navGo('diary')); await sleep(400);
  await p.screenshot({ path: `${OUT}/${tag}-1shelf.png` });
  await p.evaluate(() => { document.querySelector('#diary .dynb:last-of-type').click(); }); await sleep(400);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#diary .dynb')].find(x => /Анна|Каренина/.test(x.textContent)) || document.querySelector('#diary .dynb'); b && b.click(); });
  await p.evaluate(() => { const y = S.diaries.find(x => x.b && x.cc === 'blue'); dyOpen(y.id); }); await sleep(400);
  await p.screenshot({ path: `${OUT}/${tag}-2diary.png` });
  await p.evaluate(() => { const s = el('diary').querySelector('.scroll'); s.scrollTop = 520; }); await sleep(200);
  await p.screenshot({ path: `${OUT}/${tag}-3diary-low.png` });
  await p.evaluate(() => { const y = S.diaries.find(x => x.b && x.cc === 'blue'); const n = y.e.find(e => e.pin); dyOpenEntry(y.id, n.id); }); await sleep(400);
  await p.screenshot({ path: `${OUT}/${tag}-4edit.png` });
  await p.evaluate(() => { dyFull(true); }); await sleep(300);
  await p.screenshot({ path: `${OUT}/${tag}-7edit-full.png` });
  await p.evaluate(() => { dyBack(); }); await sleep(400);
  await p.screenshot({ path: `${OUT}/${tag}-8diary-full.png` });
  await p.evaluate(() => { dyFull(false); }); await sleep(300);
  await p.evaluate(() => dySheet('cfg')); await sleep(300);
  await p.screenshot({ path: `${OUT}/${tag}-5cfg.png` });
  await p.evaluate(() => { el('dySheet').scrollTop = 600; }); await sleep(200);
  await p.screenshot({ path: `${OUT}/${tag}-6cfg-low.png` });
  await ctx.close();
}
console.log('errors', JSON.stringify(errs));
await browser.close();
