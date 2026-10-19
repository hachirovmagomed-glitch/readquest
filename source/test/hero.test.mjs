// 18.10 (Джессика): мультяшный персонаж заменён стикменом; вещи из Эллады в «Внешнем виде» (Одежда / Снаряжение),
// цвет вещи — любой из палитры, поза зависит от вещи в руке, герой стоит на постаменте прямо на плашке профиля во всех скинах.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node hero.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());

// before any script: no placeholder book / purple square in the profile frame
const raw = await (await fetch(BASE)).text();
const frame = (raw.match(/<div class="avatarframe" id="avatarFrame">([\s\S]*?)<\/div><\/div>/) || [])[1] || '';
ok('static HTML: the avatar is empty until hero.js draws it (no book flash)', /<div class="avatar" id="avatar"><\/div>/.test(raw) && !/i-book-open/.test(frame), frame.slice(0, 160));

await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
await p.evaluate(() => { S.gold = 999999; save(); });

// Greek items exist only inside the Эллада skin: other skins show no clothes/gear tabs and cannot buy them
const lock = await p.evaluate(async () => {
  openLook(true); heroShopTab('wear'); await new Promise(q => setTimeout(q, 150));
  const tabs = [...document.querySelectorAll('#look .shopkinds .fchip')].map(b => b.textContent).join();
  const g0 = S.gold; heroBuyAsk('gr-helm'); const noBuy = el('shopConfirm').hidden && S.gold === g0 && !(S.ownedGear || []).includes('gr-helm');
  const none = !el('heroShop') || el('heroShop').hidden || !el('heroShop').querySelector('.heroitem');
  buy('skin-ellada'); wear('skin-ellada'); renderShopPane(); return { tabs, noBuy, none, all: HERO_GEAR.filter(g => /^(gr|ch)-/.test(g.id)).every(g => g.skin === 'ellada') };
});
ok('outside Эллада: only the «Скины» tab, no Greek item cards, no purchase', lock.tabs === 'Скины' && lock.noBuy && lock.none && lock.all, lock);

const base = await p.evaluate(() => ({ gear: HERO_GEAR.filter(g => /^gr-/.test(g.id)).length, chars: HERO_GEAR.filter(g => g.slot === 'char' && g.skin === 'ellada').map(g => g.id), svg: typeof heroSvg === 'function' && avatarSvg() === heroSvg() }));
ok('9 Greek items + 3 characters, avatarSvg() draws the stickman', base.gear === 9 && base.chars.join() === 'ch-reader,ch-pythagoras,ch-aristotle' && base.svg, base);

// shop: tabs, try-on (memory only), buy through the confirm dialog, wear / take off
const shop = await p.evaluate(async () => {
  openLook(true); heroShopTab('wear'); await new Promise(q => setTimeout(q, 200));
  const tabs = [...document.querySelectorAll('#look .shopkinds .fchip')].map(b => b.textContent);
  const cards = document.querySelectorAll('#heroShop .heroitem').length, listHidden = el('shopList').hidden;
  const gold0 = S.gold, own0 = (S.ownedGear || []).slice();
  heroTryOn('gr-helm'); const tried = /Коринфский/.test(el('heroShop').querySelector('.heroprevtx').textContent) && (S.ownedGear || []).join() === own0.join() && S.gold === gold0;
  heroBuyAsk('gr-helm'); const dlg = !el('shopConfirm').hidden && /Коринфский шлем/.test(el('scTitle').textContent);
  shopConfirmOk(); const bought = S.ownedGear.includes('gr-helm') && S.equipped.head === 'gr-helm' && S.gold === gold0 - 300 && el('shopConfirm').hidden;
  heroBuyAsk('gr-helm'); const noRebuy = el('shopConfirm').hidden;
  heroWear('gr-helm'); const off = !S.equipped.head; heroWear('gr-helm'); const on = S.equipped.head === 'gr-helm';
  heroShopTab('skins'); const back = !el('shopList').hidden && el('heroShop').hidden;
  return { tabs, cards, listHidden, tried, dlg, bought, noRebuy, off, on, back };
});
ok('«Внешний вид»: tabs Скины / Персонажи / Одежда / Снаряжение, 4 clothes cards', shop.tabs.join() === 'Скины,Персонажи,Одежда,Снаряжение' && shop.cards === 4 && shop.listHidden, shop);
ok('try-on writes nothing; buy = confirm dialog, −300 coins, worn at once; no second purchase', shop.tried && shop.dlg && shop.bought && shop.noRebuy, shop);
ok('owned item: Снять / Надеть toggles the slot; «Скины» tab shows the skins list again', shop.off && shop.on && shop.back, shop);

// the skin shop still buys skins through the same dialog
const skinBuy = await p.evaluate(() => { const g = S.gold; shopBuyAsk('skin-celestial'); shopConfirmOk(); return { owned: shopOwns('skin-celestial'), spent: g - S.gold }; });
ok('skin purchase still works through the shared confirm dialog', skinBuy.owned && skinBuy.spent === 800, skinBuy);

// another skin: owned gear stays saved but is nowhere to be seen; back in Эллада it is on again
const other = await p.evaluate(async () => {
  wear('skin-celestial'); renderShopPane(); heroShopTab('wear'); await new Promise(q => setTimeout(q, 100));
  const hidden = S.equipped.head === 'gr-helm' && !Object.keys(heroOn()).length && heroSvg() === heroSvg({});
  const tabs = [...document.querySelectorAll('#look .shopkinds .fchip')].map(b => b.textContent).join(), shopHidden = el('heroShop').hidden, greek = !!document.querySelector('#heroShop .heroitem[data-id^="gr-"]');
  heroWear('gr-helm'); const kept = S.equipped.head === 'gr-helm';
  wear('skin-ellada'); renderShopPane(); const back = heroOn().head === 'gr-helm';
  return { hidden, tabs, shopHidden, greek, kept, back };
});
ok('in another skin (Небесный: its own «Персонажи», «Одежда», «Снаряжение») the Greek gear is not drawn and not listed; in Эллада it is back', other.hidden && other.tabs === 'Скины,Персонажи,Одежда,Снаряжение' && !other.shopHidden && !other.greek && other.kept && other.back, other);

// characters: Читатель free and chosen, Пифагор bought through the dialog, gear stays on, colours are per character
const ch = await p.evaluate(async () => {
  heroShopTab('chars'); await new Promise(q => setTimeout(q, 100));
  const cards = [...el('heroShop').querySelectorAll('.heroitem')].map(c => c.dataset.id).join(), readerBtn = el('heroShop').querySelector('.heroitem[data-id="ch-reader"] .shopcta').textContent;
  const g0 = S.gold; heroBuyAsk('ch-pythagoras'); const dlg = !el('shopConfirm').hidden; shopConfirmOk();
  const bought = S.equipped.char === 'ch-pythagoras' && S.gold === g0 - 600 && S.equipped.head === 'gr-helm' && heroSvg().includes('#8a8a8a');
  heroSetCol('gr-helm', '#123456'); const own = S.char.gearColor['ch-pythagoras:gr-helm'] === '#123456' && S.char.gearColor['gr-helm'] !== '#123456';
  heroWear('ch-reader'); const back = !S.equipped.char && !heroSvg().includes('#8a8a8a') && !heroSvg().includes('#123456');
  const ari = heroSvg({ char: 'ch-aristotle' }).includes('#b5532f'), noRobe = !heroSvg({ char: 'ch-aristotle', body: 'gr-chiton' }).includes('#b5532f');
  return { cards, readerBtn, dlg, bought, own, back, ari, noRobe };
});
ok('«Персонажи»: Читатель free, Пифагор −600 via dialog keeps the gear, colours per character, robe only without clothes', ch.cards === 'ch-reader,ch-pythagoras,ch-aristotle' && ch.readerBtn === 'Выбран' && ch.dlg && ch.bought && ch.own && ch.back && ch.ari && ch.noRobe, ch);

// Карандашный: its own hero (Grok's mannequin) and 30 pc-* items, only in this skin
const pc = await p.evaluate(async () => {
  wear('skin-pencil'); renderShopPane(); heroShopTab('wear'); await new Promise(q => setTimeout(q, 100));
  const tabs = [...document.querySelectorAll('#look .shopkinds .fchip')].map(b => b.textContent).join(), cards = el('heroShop').querySelectorAll('.heroitem').length;
  const greek = !el('heroShop').querySelector('.heroitem[data-id^="gr-"]'), art = typeof HERO_PENCIL_ART === 'object' && Object.keys(HERO_PENCIL_ART.items).length;
  const g0 = S.gold; heroBuyAsk('pc-cap'); shopConfirmOk();
  const bought = S.equipped['pencil:head'] === 'pc-cap' && S.gold === g0 - 120, drawn = avatarSvg().includes('heropencil') && avatarSvg().includes(HERO_PENCIL_ART.items['pc-cap'].front.slice(0, 60));
  heroSetCol('pc-cap', '#2a7a3b'); const col = avatarSvg().includes('--pc-blue:#2a7a3b');
  wear('skin-ellada'); const away = !avatarSvg().includes('heropencil') && heroOn().head === 'gr-helm';
  return { tabs, cards, greek, art, bought, drawn, col, away };
});
ok('Карандашный: own hero, Одежда = 19 pencil items, buy/wear/colour, nothing Greek; Эллада keeps its own', pc.tabs === 'Скины,Одежда,Снаряжение' && pc.cards === 19 && pc.greek && pc.art === 30 && pc.bought && pc.drawn && pc.col && pc.away, pc);

// colour: any hex; owned = saved, not owned = try-on only
const col = await p.evaluate(() => {
  heroShopTab('wear'); heroSetCol('gr-helm', '#2a6f97'); const saved = S.char.gearColor['gr-helm'] === '#2a6f97' && heroSvg({ head: 'gr-helm' }).includes('#2a6f97');
  heroSetCol('gr-laurel', '#9b2242'); const tryOnly = !(S.char.gearColor || {})['gr-laurel'] && heroTry === 'gr-laurel' && heroSvg({ head: 'gr-laurel' }).includes('#9b2242');
  heroSetCol('gr-helm', 'red;}'); const bad = S.char.gearColor['gr-helm'] === '#2a6f97';
  const picker = !!document.querySelector('#heroShop .heroitem input[type=color]');
  heroShopTab('wear'); const def = heroSvg({ head: 'gr-laurel' }).includes(HERO_BRONZE);
  return { saved, tryOnly, bad, picker, def };
});
ok('colour: palette input on cards; owned saves the hex, not owned only tries it, junk ignored, default bronze', col.saved && col.tryOnly && col.bad && col.picker && col.def, col);

// pose follows the item in hand
const pose = await p.evaluate(() => { const n = (o) => (heroSvg(o).match(/stroke-width="4.8"/g) || []).length;
  return { down: n({}), spear: n({ hand: 'gr-dory' }), scroll: n({ hand: 'gr-scroll' }) }; });
ok('pose: arms down without an item, arm reaches the spear, arm bends to the chest with a scroll', pose.down === 0 && pose.spear === 1 && pose.scroll === 2, pose);

// Небесный: 12 classes as whole characters, Сонный чтец free, bought one becomes the hero; images load; teen 0.88; Эллада keeps Pythagoras
const cel = await p.evaluate(async () => {
  wear('skin-ellada'); S.equipped.char = 'ch-pythagoras'; save();
  wear('skin-celestial'); renderShopPane(); heroShopTab('chars'); await new Promise(q => setTimeout(q, 100));
  const ids = HERO_GEAR.filter(g => g.skin === 'celestial' && g.slot === 'char' && g.id !== 'cl-zvezdochet').map(g => g.id), cards = document.querySelectorAll('#heroShop .heroitem').length;
  const def = avatarSvg().includes('wear/base.webp'), free = heroOwns('cl-sonny-chtets') && heroOwns('cl-zvezdochet') && !heroOwns('cl-kometa');
  S.gold = 5000; const g0 = S.gold; heroBuyAsk('cl-kometa'); shopConfirmOk();
  const bought = S.equipped['celestial:char'] === 'cl-kometa' && S.gold === g0 - 600 && avatarSvg().includes('kometa.webp');
  const teen = /height="84.5"/.test(avatarSvg()), adult = /height="96"/.test(heroCelestialSvg({ char: 'cl-kartograf' }));
  const imgs = await Promise.all(ids.map(id => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalHeight === 480); i.onerror = () => r(false); i.src = 'hero/celestial/' + id.slice(3) + '.webp'; })));
  heroWear('cl-zvezdochet'); const back = !S.equipped['celestial:char'] && avatarSvg().includes('wear/base.webp');
  wear('skin-ellada'); const ell = heroOn().char === 'ch-pythagoras' && !avatarSvg().includes('herocel');
  return { n: ids.length, cards, def, free, bought, teen, adult, imgs: imgs.every(Boolean), back, ell };
});
ok('Небесный: 12 classes + Звездочёт-манекен (free, default), Сонный чтец free, buy Комета → hero (teen 0.88), images load, Эллада keeps its own', cel.n === 12 && cel.cards === 13 && cel.def && cel.free && cel.bought && cel.teen && cel.adult && cel.imgs && cel.back && cel.ell, cel);

// Небесный: вещи по слотам на манекене (бумажная кукла из листов Джессики), перекраска, вещь на классе возвращает манекен
const doll = await p.evaluate(async () => {
  wear('skin-celestial'); S.gold = 99999; heroWear('cl-zvezdochet'); S.ownedGear = (S.ownedGear || []).concat('cl-kometa'); heroWear('cl-kometa');
  const items = HERO_GEAR.filter(g => g.skin === 'celestial' && g.slot !== 'char');
  heroBuyAsk('cc-night'); shopConfirmOk();
  const worn = S.equipped['celestial:cloak'] === 'cc-night', toDoll = !S.equipped['celestial:char'] && avatarSvg().includes('wear/cc-night.webp') && avatarSvg().includes('wear/base.webp');
  heroBuyAsk('cx-lantern'); shopConfirmOk(); const hand = avatarSvg().includes('wear/hand.webp');
  heroBuyAsk('cg-white'); shopConfirmOk(); const gloves = avatarSvg().includes('cg-white-l.webp') && avatarSvg().includes('cg-white-r.webp');
  heroSetCol('cc-night', '#b03040'); const col = /cc-night\.webp[^>]*hue-rotate/.test(avatarSvg());
  heroShopTab('wear'); await new Promise(q => setTimeout(q, 100)); const tabs = [...document.querySelectorAll('#look .shopkinds .fchip')].map(b => b.textContent).join();
  const files = []; items.forEach(g => HERO_CEL_ART.items[g.id].p.forEach(p => files.push(p[0]))); files.push('base', 'hand');
  const loaded = await Promise.all(files.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = 'hero/celestial/wear/' + f + '.webp'; })));
  wear('skin-ellada'); const ell = !avatarSvg().includes('herocel');
  return { n: items.length, worn, toDoll, hand, gloves, col, tabs, loaded: loaded.every(Boolean), files: files.length, ell };
});
ok('Небесный: 76 вещей на манекене, вещь на классе возвращает Звездочёта, рука держит предмет, перчатки на обе кисти, перекраска, все картинки грузятся', doll.n === 76 && doll.worn && doll.toDoll && doll.hand && doll.gloves && doll.col && doll.tabs === 'Скины,Персонажи,Одежда,Снаряжение' && doll.loaded && doll.ell, doll);

// 3D убран (Джессика 20.10: «отойдём полностью от 3D моделек»): в Небесном нет кнопки 3D и листа
const no3d = await p.evaluate(async () => {
  wear('skin-celestial'); openLook(true); heroShopTab('chars'); await new Promise(q => setTimeout(q, 100));
  return { btn: !!document.querySelector('#heroShop .hero3dbtn'), fn: typeof window.heroOpen3d, sheet: !!document.getElementById('hero3dSheet') };
});
ok('Небесный: no 3D button or sheet', !no3d.btn && no3d.fn === 'undefined' && !no3d.sheet, no3d);

// profile: hero fits the card in every skin, gap colour = the card under it, no frame
for (const sk of ['', 'pencil', 'celestial', 'ellada', 'babochkovyi']) {
  const r = await p.evaluate(async (sk) => {
    if (sk) { buy('skin-' + sk); wear('skin-' + sk); } else { SET.skin = null; SET.color = null; SET.theme = 'sepia'; saveSet(); applySet(); }
    S.ownedGear = HERO_GEAR.map(g => g.id); S.equipped = { head: 'gr-helm', body: 'gr-chiton', cloak: 'gr-chlamys', hand: 'gr-dory', shield: 'gr-hoplon', pet: 'gr-owl', bg: 'gr-temple' }; save();
    __navAllow = true; show('profile'); __navAllow = false; renderProfile(); await new Promise(q => setTimeout(q, 250));
    const f = el('avatarFrame'), card = f.closest('.herocard'), fr = f.getBoundingClientRect(), cr = card.getBoundingClientRect(), svg = f.querySelector('svg.herosvg');
    const cs = getComputedStyle(f), sr = svg && svg.getBoundingClientRect();
    return { skin: document.documentElement.dataset.skin || '', svg: !!svg, inside: !!sr && sr.top >= cr.top - 1 && sr.bottom <= cr.bottom + 1 && sr.height >= 100,
      noFrame: cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.boxShadow === 'none', gap: f.style.getPropertyValue('--hero-bg') || getComputedStyle(f).getPropertyValue('--hero-bg').trim(),
      cardBg: getComputedStyle(card).backgroundColor };
  }, sk);
  r.drawn = await p.evaluate(() => Object.keys(heroOn()).length);
  if ((sk || '') !== 'ellada' && r.drawn) r.svg = false; /* Greek gear only in Эллада */
  const gapOk = r.skin === 'pencil' ? !!r.gap : r.gap === r.cardBg;
  ok((sk || 'default') + ': profile hero drawn, ≥100px, inside its card, no frame, gaps = card colour', r.svg && r.inside && r.noFrame && gapOk, r);
}
const tap = await p.evaluate(async () => { wear('skin-ellada'); el('avatar').click(); await new Promise(q => setTimeout(q, 300)); return !el('look').classList.contains('hidden') && heroTab === 'wear'; });
ok('tap on the hero (Эллада) opens «Внешний вид» → «Одежда»', tap);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY hero.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
