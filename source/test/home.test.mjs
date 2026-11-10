// «Домик читателя» (10.11, Джессика: «отдельная система с питомцами и домиком как в симс», вариант Б). js/home.js, arch.md 10.11 (S.home).
//  1) вход из профиля, экран: три комнаты (две закрыты уровнем), четыре вкладки, питомец спит, пока сегодня не читали; ничего старого не спрятано;
//  2) чтение: лакомство за каждые 10 засчитанных минут, рост питомца от минут, строки «В домике» в итоге сессии; домик не даёт монет и опыта;
//  3) угощение растит привязанность; 4) «Обставить»: покупка списывает монеты один раз, вещь встаёт на место, снимается, обои;
//  5) питомцы: покупка, смена; 6) не больше 6 лакомств в день; 7) «Память»: корешок прочитанной книги остаётся;
//  8) скин переодевает домик, набор и питомец скина видны только в нём; 9) вкладка «Домик» в магазине;
//  10) перезагрузка и экспорт → импорт возвращают домик; 11) ширина 360: ничего не вылезает; ошибок страницы нет.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ [RQ_SHOTS=/dir] node home.test.mjs
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const TXT = process.env.RQ_TXT || '/workspace/rqtest/Длинная книга.txt';
const SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.evaluateOnNewDocument(() => {
  window.__rqTimeOffset = window.__rqTimeOffset || 0;
  const pn = performance.now.bind(performance); performance.now = () => pn() + window.__rqTimeOffset;
  const dn = Date.now; Date.now = () => dn() + window.__rqTimeOffset;
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => cb(t + window.__rqTimeOffset));
});
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
const boot = async () => { await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400); };
const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
await p.goto(BASE, { waitUntil: 'load' }); await boot();
const yes = async () => { await p.waitForFunction(() => el('rqAsk') && !el('rqAsk').hidden, { timeout: 3000 }); await p.evaluate(() => el('rqAskOk').click()); await sleep(200); };
const read = async (flips) => {
  await p.evaluate(() => { __navAllow = true; openBook(S.userBooks[0].id); __navAllow = false; }); await sleep(2500);
  for (let i = 0; i < flips; i++) { await p.evaluate(() => { window.__rqTimeOffset += 150000; goPage(R.page + 1, true); }); await sleep(200); }
  await p.evaluate(async () => { __navAllow = true; await closeReader(); __navAllow = false; }); await sleep(2500);
};

/* 0. the code never pays: no coins and no XP are added by js/home.js */
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'home.js'), 'utf8');
ok('0 js/home.js не начисляет монеты и опыт (нет S.gold+=, S.xp, goldAllTime)', !/S\.gold\s*\+=|S\.xp\s*[+\-]?=|goldAllTime|setSessionXp/.test(src));

/* 1. the screen */
const s1 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  __navAllow = true; show('profile'); __navAllow = false; await w(300);
  const r = { card: !!el('homeCard'), sub: el('homeCardSub').textContent, tools: !!el('toolCard') && el('toolCard').offsetWidth > 0, cardW: el('homeCard').offsetWidth };
  el('homeCard').click(); await w(300);
  r.open = !el('homePage').hidden; r.scene = !!document.querySelector('#hmBody svg.hmscene'); r.rooms = [...document.querySelectorAll('.hmrooms .fchip')].map(b => b.textContent + (b.classList.contains('lock') ? '!' : ''));
  r.tabs = [...document.querySelectorAll('.hmtabs button')].map(b => b.textContent); r.mood = document.querySelector('.hmstage').dataset.mood; r.feedOff = el('hmFeed').disabled;
  r.pet = !!document.querySelector('.hmscene .hmpet'); r.hero = !document.querySelector('.hmstage .hmhero'); /* 10.11 «персонажа пока убери» */ r.nav = history.state && history.state.rq;
  homeRoom('attic'); await w(100); r.locked = HV.room === 'main';
  return r; });
ok('1 карточка «Домик» в профиле рядом с «Инструментами», экран: комната + две закрытые уровнем, 4 вкладки, питомец спит, «Угостить» выключено, героя в комнате нет',
  s1.card && s1.tools && s1.cardW > 100 && s1.open && s1.scene && s1.rooms.join() === 'Комната,Чердак · ур. 5!,Сад · ур. 10!' && s1.tabs.join() === 'Домик,Обставить,Питомец,Память' && s1.mood === 'sleep' && s1.feedOff && s1.pet && s1.hero && s1.nav === 'home' && s1.locked, s1);
await shot('390-1-domik-spit');
await p.evaluate(() => homeBack()); await sleep(300);
ok('1b «назад» закрывает домик', await p.evaluate(() => el('homePage').hidden));

/* 2. reading feeds the house */
await (await p.$('#fileInp')).uploadFile(TXT); await p.waitForFunction(() => (S.userBooks || []).length >= 1, { timeout: 30000 }); await sleep(400);
const g0 = await p.evaluate(() => ({ gold: S.gold, xp: S.xp }));
await read(14);
const s2 = await p.evaluate(() => { const r = SESS[SESS.length - 1];
  return { min: r.minutes, xp: r.xp, treats: S.home.treats, tr: S.home.tr, gm: S.home.gm.fox, sum: el('sumHome').innerText, hid: el('sumHome').classList.contains('hidden'), dXp: S.xp, reader: !!document.querySelector('#reader .hmpet') }; });
ok('2 за ' + Math.round(s2.min) + ' мин: ' + s2.treats + ' лакомства (по одному за 10 минут), минуты роста = минуты строки, в итоге сессии «В домике» с настроением и лакомствами; опыт = опыт строки',
  s2.min >= 30 && s2.treats === Math.min(6, Math.floor(s2.min / 10)) && Math.abs(s2.gm - s2.min) < 0.01 && !s2.hid && /В домике/.test(s2.sum) && /счастлив/.test(s2.sum) && /лакомств/.test(s2.sum) && s2.dXp - g0.xp === s2.xp && !s2.reader, s2);
await shot('390-2-itog-sessii');

/* 3. feeding */
const s3 = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('#sumHome .hmsumgo').click(); await w(300);
  const r = { open: !el('homePage').hidden, mood: document.querySelector('.hmstage').dataset.mood, t0: S.home.treats, gold0: S.gold };
  el('hmFeed').click(); await w(150); r.t1 = S.home.treats; r.b1 = S.home.bond.fox;
  el('hmFeed').click(); await w(150); el('hmFeed').click(); await w(150);
  r.t3 = S.home.treats; r.b3 = S.home.bond.fox; r.lvl = hmBondLvl('fox'); r.off = el('hmFeed').disabled; r.gold = S.gold === r.gold0; return r; });
ok('3 «Заглянуть» из итога открывает домик, питомец счастлив; каждое угощение −1 лакомство и +1 к привязанности, на третьем — «Приятель»; монеты не меняются',
  s3.open && s3.mood === 'happy' && s3.t1 === s3.t0 - 1 && s3.b1 === 1 && s3.t3 === s3.t0 - 3 && s3.b3 === 3 && s3.lvl === 1 && s3.gold, s3);
await shot('390-3-domik');

/* 4. furnish */
await p.evaluate(() => { shopTestGold(); homeTab('edit'); }); await sleep(200);
const s4a = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  const r = { slots: document.querySelectorAll('.hmscene .hmslot').length, chips: [...document.querySelectorAll('.hmchips .fchip')].map(b => b.textContent), hero: !!document.querySelector('.hmstage .hmhero') };
  document.querySelector('.hmscene .hmslot[data-slot="s1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await w(150);
  r.sel = HV.slot; r.cards = [...document.querySelectorAll('.hmpane .hmitem')].map(x => x.dataset.id); r.gold = S.gold;
  document.querySelector('.hmitem[data-id="lamp"] .hmbtn').click(); return r; });
await yes();
const s4 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); await w(200);
  const r = { gold: S.gold, own: S.home.own.lamp, put: S.home.put['main:s1'], on: !!document.querySelector('.hmitem[data-id="lamp"].on'), again: homeBuy('lamp') };
  document.querySelector('.hmitem[data-id="lamp"] .hmbtn').click(); await w(150); r.off = S.home.put['main:s1'] === undefined; r.gold2 = S.gold;
  document.querySelector('.hmitem[data-id="lamp"] .hmbtn').click(); await w(150); r.back = S.home.put['main:s1'];
  homeSlot('chair'); await w(100); document.querySelector('.hmitem[data-id="armchair"] .hmbtn').click(); await w(100); r.noChair = S.home.put['main:chair'];
  document.querySelector('.hmitem[data-id="armchair"] .hmbtn').click(); await w(100); r.chair = S.home.put['main:chair'];
  return r; });
ok('4 «Обставить»: 6 мест пунктиром, тап по месту показывает подходящие вещи; торшер за 80 монет списан один раз и стоит на месте, повторная покупка отклонена; снять и вернуть бесплатно; кресло по умолчанию можно убрать',
  s4a.slots === 6 && s4a.chips.length === 8 && !s4a.hero && s4a.sel === 's1' && s4a.cards.indexOf('lamp') >= 0 && s4a.cards.indexOf('armchair') < 0 && s4.gold === s4a.gold - 80 && s4.own === 1 && s4.put === 'lamp' && s4.on && !s4.again.ok && s4.off && s4.gold2 === s4.gold && s4.back === 'lamp' && s4.noChair === '-' && s4.chair === 'armchair', { a: s4a, b: s4 });
await p.evaluate(() => { homeSlot('wallp'); }); await sleep(100);
await p.evaluate(() => document.querySelector('.hmitem[data-id="w-dots"] .hmbtn').click()); await yes(); await sleep(200);
const s4w = await p.evaluate(() => ({ put: S.home.put['main:wallp'], own: S.home.own['w-dots'], dots: document.querySelectorAll('.hmscene > circle').length }));
ok('4b обои «в горошек» за 150: куплены и сразу на стене', s4w.put === 'w-dots' && s4w.own === 1 && s4w.dots > 50, s4w);
await shot('390-4-obstavit');

/* 5. pets */
await p.evaluate(() => homeTab('pet')); await sleep(150);
await shot('390-5-pitomec');
const g5 = await p.evaluate(() => { const r = { gold: S.gold, stages: document.querySelectorAll('.hmstages > div').length, pets: [...document.querySelectorAll('.hmpane .hmitem')].map(x => x.dataset.id) }; document.querySelector('.hmitem[data-id="owlet"] .hmbtn').click(); return r; });
await yes();
const s5 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); await w(200);
  const r = { gold: S.gold, pet: hmPetId(), owned: S.home.pets.owlet, stage: hmStage('owlet'), foxStage: hmStage('fox') };
  homePick('fox'); await w(100); r.back = hmPetId(); return r; });
ok('5 «Питомец»: 4 стадии, общие питомцы; совёнок за 350 куплен один раз и поселился малышом, лисёнок остался со своим ростом, его можно позвать обратно',
  g5.stages === 4 && g5.pets.join() === 'fox,owlet,cat,dragon' && s5.gold === g5.gold - 350 && s5.pet === 'owlet' && s5.owned === 1 && s5.stage === 0 && s5.back === 'fox', { g5, s5 });

/* 6. the daily cap */
await p.evaluate(() => homeBack()); await sleep(200);
await read(16);
const s6 = await p.evaluate(() => ({ k: S.home.tr.k, treats: S.home.treats, min: dayMin(today()), gm: S.home.gm.fox }));
ok('6 за день не больше 6 лакомств (прочитано ' + Math.round(s6.min) + ' мин), в запасе не больше 12', s6.min >= 70 && s6.k === 6 && s6.treats <= 12 && s6.treats === 3, s6);

/* 7. memory */
const s7 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  const id = S.userBooks[0].id; if (S.finished.indexOf(id) < 0) S.finished.push(id); openHome('mem'); await w(250);
  const r = { fin: S.home.fin.length, t: S.home.fin[0] && S.home.fin[0].t, spines: document.querySelectorAll('.hmspine').length, books: document.querySelectorAll('.hmscene rect[rx=".6"]').length };
  document.querySelector('.hmspine').click(); await w(100); r.info = el('hmSpineInfo').textContent;
  S.finished = S.finished.filter(x => x !== id); homeRender(); r.keeps = S.home.fin.length; return r; });
ok('7 «Память»: корешок прочитанной книги на полке и в комнате, по тапу — книга; корешок остаётся, даже если книга пропала из прочитанных', s7.fin === 1 && s7.spines === 1 && s7.books >= 1 && /Длинная книга/.test(s7.info) && s7.keeps === 1, s7);
await shot('390-7-pamyat');

/* 8. skins */
const s8 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  const wall0 = document.querySelector('.hmscene rect').getAttribute('fill');
  shopTestGold(); shopTestGold(); buy('skin-ellada'); wear('skin-ellada'); await w(300); homeTab('edit'); homeSlot('s2'); await w(150);
  const r = { wall0, wall: document.querySelector('.hmscene rect').getAttribute('fill'), set: !!document.querySelector('.hmitem[data-id="set-ellada"]'), amph: !!document.querySelector('.hmitem[data-id="el-amphora"]'), gold: S.gold };
  r.buy = homeBuy('set-ellada'); HV.slot = 's2'; homePut('el-amphora'); await w(100); r.put = S.home.put['main:s2']; r.gold2 = S.gold;
  homeTab('pet'); await w(100); r.pets = [...document.querySelectorAll('.hmpane .hmitem')].map(x => x.dataset.id); r.owl = homeBuy('gr-owl'); r.gear = S.ownedGear.indexOf('gr-owl') >= 0; r.pet = hmPetId();
  return r; });
await shot('390-8-ellada');
const s8b = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  wear('skin-pencil'); await w(300); homeRender(); await w(100);
  return { pet: hmPetId(), item: hmPutItem('main', hmRoom('main').slots.find(s => s.id === 's2')), wall: document.querySelector('.hmscene rect').getAttribute('fill'), putKept: S.home.put['main:s2'] }; });
ok('8 скин переодевает домик; набор «Эллада» (600) и Сова Афины видны и покупаются только в Элладе (сова попадает и в вещи героя); в другом скине их не видно, а выбор не теряется',
  s8.wall !== s8.wall0 && s8.set && s8.amph && s8.buy.ok && s8.put === 'el-amphora' && s8.gold2 === s8.gold - 600 && s8.pets.indexOf('gr-owl') >= 0 && s8.owl.ok && s8.gear && s8.pet === 'gr-owl' &&
  s8b.pet === 'fox' && s8b.item === null && s8b.wall !== s8.wall && s8b.putKept === 'el-amphora', { s8, s8b });

/* 9. the shop tab */
const s9 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  homeBack(); await w(200); openLook(true); await w(300);
  const tabs = [...document.querySelectorAll('.shopkinds .fchip')].map(b => b.textContent); document.querySelector('.shopkinds [data-k="home"]').click(); await w(150);
  const r = { tabs, shown: !el('homeShop').hidden, skins: el('shopList').hidden, cards: document.querySelectorAll('#homeShop .hmitem').length, open: !!document.querySelector('#homeShop .hmopen') };
  document.querySelector('.shopkinds [data-k="skins"]').click(); await w(100); r.back = el('homeShop').hidden && !el('shopList').hidden; return r; });
ok('9 в магазине вкладка «Домик» рядом со «Скинами» и «Инструментами»: список вещей и «Открыть домик»; «Скины» возвращаются', s9.tabs.indexOf('Скины') === 0 && s9.tabs.indexOf('Инструменты') > 0 && s9.tabs.indexOf('Домик') > 0 && s9.shown && s9.skins && s9.cards > 15 && s9.open && s9.back, s9);

/* 10. reload + export → import */
const before = await p.evaluate(() => JSON.stringify(S.home));
await p.reload({ waitUntil: 'load' }); await boot();
const after = await p.evaluate(() => JSON.stringify(homeNorm(S.home)));
const s10 = await p.evaluate(async (before) => {
  const payload = await __rq.exportBackup(null, rqSetForSave(), { includeTextBodies: false }); const txt = JSON.stringify(payload);
  const gold = S.gold; S.home = null; HS().treats = 1; save(); await new Promise(r => setTimeout(r, 400));
  await __rq.importBackup(JSON.parse(txt)); return { has: txt.indexOf('"home"') >= 0 && txt.indexOf('el-amphora') >= 0, gold };
}, before);
await p.reload({ waitUntil: 'load' }); await boot();
const imp = await p.evaluate(() => ({ home: JSON.stringify(homeNorm(S.home)), gold: S.gold }));
const old = await p.evaluate(() => JSON.stringify(homeNorm(undefined)) === JSON.stringify(homeNorm({ pet: 5, put: { 'x': 1 }, fin: 'no', treats: -4 })));
ok('10 после перезагрузки домик тот же; экспорт несёт S.home, импорт возвращает домик и баланс один в один; файл без поля или с мусором = пустой домик', after === before && s10.has && imp.home === before && imp.gold === s10.gold && old, { same: after === before, has: s10.has, imp: imp.home === before });

/* 11. 360 px */
await p.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const s11 = await p.evaluate(async () => { const w = (ms) => new Promise(r => setTimeout(r, ms)); const out = {};
  for (const t of ['home', 'edit', 'pet', 'mem']) { openHome(t); if (t === 'edit') homeSlot('s1'); await w(200); const b = el('hmBody');
    out[t] = b.scrollWidth <= b.clientWidth + 1 && [...b.querySelectorAll('.hmtabs button,.hmitem,.pcard')].every(x => x.getBoundingClientRect().right <= 360.5 && x.getBoundingClientRect().left >= -0.5); }
  return out; });
ok('11 на ширине 360 все четыре вкладки помещаются без прокрутки вбок', s11.home && s11.edit && s11.pet && s11.mem, s11);
await p.evaluate(() => openHome('home')); await sleep(200); await shot('360-1-domik');
await p.evaluate(() => { homeTab('edit'); homeSlot('s1'); }); await sleep(200); await shot('360-4-obstavit');
await p.evaluate(() => homeTab('pet')); await sleep(200); await shot('360-5-pitomec');

ok('12 ошибок страницы нет', errs.length === 0, errs.slice(0, 5));
await browser.close();
const bad = checks.filter(x => !x).length; console.log(`\n${checks.length - bad}/${checks.length} PASS`); process.exit(bad ? 1 : 0);
