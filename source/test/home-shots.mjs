// Скриншоты «Домика» для Джессики: комнаты и скины. Run: RQ_URL=… RQ_SHOTS=/dir node home-shots.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const SHOTS = process.env.RQ_SHOTS || '/tmp/home-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => {
  for (let i = 0; i < 6; i++) shopTestGold();
  S.xp = 12000; S.streak = 7; S.achDates = { a: '2026-11-01' };
  const H = HS(); H.gm.fox = 700; H.bond.fox = 9; H.treats = 4; H.nm.fox = 'Абзац';
  for (let i = 0; i < 34; i++) H.fin.push({ id: 'b' + i, t: 'Книга ' + (i + 1), a: 'Автор', d: '2026-11-0' + (i % 9 + 1) });
  H.q.push({ t: 'Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему.', a: 'Анна Каренина' });
  ['lamp', 'ficus', 'picture', 'bed', 'globe', 'teatable', 'clock', 'bench', 'ball', 'bookstack', 'aquarium', 'rug2', 'rug3', 'pouf', 'pethouse', 'garland'].forEach(id => { H.own[id] = 1; });
  Object.assign(H.put, { 'main:s1': 'lamp', 'main:s2': 'ficus', 'main:w1': 'picture', 'main:pet': 'bed', 'attic:s1': 'globe', 'attic:s2': 'bookstack', 'attic:w1': 'clock', 'attic:w2': 'garland', 'attic:chair': 'pouf', 'attic:rug': 'rug2',
    'garden:chair': 'bench', 'garden:s1': 'teatable', 'garden:pet': 'pethouse', 'garden:rug': 'rug3', 'garden:s2': 'aquarium' });
  /* сегодня «читали» 35 минут, чтобы питомец не спал */
  window.__dm = dayMin; dayMin = function () { return 35; };
  save();
});
const snap = async (name) => { await sleep(350); await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
for (const room of ['main', 'attic', 'garden']) { await p.evaluate((r) => { openHome('home'); homeRoom(r); }, room); await snap('komnata-' + room); }
await p.evaluate(() => { homeRoom('main'); homeTab('mem'); el('hmBody').scrollTop = 0; }); await snap('pamyat');
for (const sk of ['pencil', 'ellada', 'babochkovyi', 'celestial', 'alisa']) {
  await p.evaluate(async (sk) => {
    buy('skin-' + sk); wear('skin-' + sk); await new Promise(r => setTimeout(r, 300)); const H = HS(); H.own['set-' + sk] = 1;
    const it = HM_ITEMS.filter(x => x.set === 'set-' + sk); const by = (t) => it.filter(x => x.t === t).map(x => x.id);
    H.put['main:chair'] = by('chair')[0]; H.put['main:s1'] = by('small')[0]; H.put['main:s2'] = by('small')[1]; H.put['main:w1'] = by('wall')[0];
    const pd = HM_PETS.find(x => x.skin === sk); if (pd) { if (pd.hero) S.ownedGear = (S.ownedGear || []).concat(pd.id); else H.pets[pd.id] = 1; H.pet[sk] = pd.id; H.gm[pd.id] = 700; H.bond[pd.id] = 9; }
    save(); openHome('home'); homeRoom('main'); }, sk);
  await snap('skin-' + sk);
  if (sk === 'celestial' || sk === 'babochkovyi') { await p.evaluate(() => homeRoom('garden')); await snap('skin-' + sk + '-sad'); }
}
await p.evaluate(() => { dayMin = function () { return 0; }; wear('skin-ellada'); }); await sleep(300);
await p.evaluate(() => { openHome('home'); homeRoom('main'); }); await snap('skin-ellada-spit');
await browser.close(); console.log('shots →', SHOTS);
