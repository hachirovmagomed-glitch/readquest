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

const base = await p.evaluate(() => ({ gear: HERO_GEAR.length, ids: HERO_GEAR.map(g => g.id), svg: typeof heroSvg === 'function' && avatarSvg() === heroSvg() }));
ok('9 Greek items, avatarSvg() draws the stickman', base.gear === 9 && base.ids.every(i => /^gr-/.test(i)) && base.svg, base);

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
ok('«Внешний вид»: tabs Скины / Одежда / Снаряжение, 4 clothes cards', shop.tabs.join() === 'Скины,Одежда,Снаряжение' && shop.cards === 4 && shop.listHidden, shop);
ok('try-on writes nothing; buy = confirm dialog, −300 coins, worn at once; no second purchase', shop.tried && shop.dlg && shop.bought && shop.noRebuy, shop);
ok('owned item: Снять / Надеть toggles the slot; «Скины» tab shows the skins list again', shop.off && shop.on && shop.back, shop);

// the skin shop still buys skins through the same dialog
const skinBuy = await p.evaluate(() => { const g = S.gold; shopBuyAsk('skin-ellada'); shopConfirmOk(); return { owned: shopOwns('skin-ellada'), spent: g - S.gold }; });
ok('skin purchase still works through the shared confirm dialog', skinBuy.owned && skinBuy.spent === 500, skinBuy);

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

// profile: hero fits the card in every skin, gap colour = the card under it, no frame
for (const sk of ['', 'pencil', 'celestial', 'ellada', 'babochkovyi']) {
  const r = await p.evaluate(async (sk) => {
    if (sk) { buy('skin-' + sk); wear('skin-' + sk); }
    S.ownedGear = HERO_GEAR.map(g => g.id); S.equipped = { head: 'gr-helm', body: 'gr-chiton', cloak: 'gr-chlamys', hand: 'gr-dory', shield: 'gr-hoplon', pet: 'gr-owl', bg: 'gr-temple' }; save();
    __navAllow = true; show('profile'); __navAllow = false; renderProfile(); await new Promise(q => setTimeout(q, 250));
    const f = el('avatarFrame'), card = f.closest('.herocard'), fr = f.getBoundingClientRect(), cr = card.getBoundingClientRect(), svg = f.querySelector('svg.herosvg');
    const cs = getComputedStyle(f), sr = svg && svg.getBoundingClientRect();
    return { skin: document.documentElement.dataset.skin || '', svg: !!svg, inside: !!sr && sr.top >= cr.top - 1 && sr.bottom <= cr.bottom + 1 && sr.height >= 100,
      noFrame: cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.boxShadow === 'none', gap: f.style.getPropertyValue('--hero-bg') || getComputedStyle(f).getPropertyValue('--hero-bg').trim(),
      cardBg: getComputedStyle(card).backgroundColor };
  }, sk);
  const gapOk = r.skin === 'pencil' ? !!r.gap : r.gap === r.cardBg;
  ok((sk || 'default') + ': profile hero drawn, ≥100px, inside its card, no frame, gaps = card colour', r.svg && r.inside && r.noFrame && gapOk, r);
}
const tap = await p.evaluate(async () => { el('avatar').click(); await new Promise(q => setTimeout(q, 300)); return !el('look').classList.contains('hidden') && heroTab === 'wear'; });
ok('tap on the hero opens «Внешний вид» → «Одежда»', tap);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY hero.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
