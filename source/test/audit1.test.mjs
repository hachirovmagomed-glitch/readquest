// Audit 15.10, wave 1 (handoff/notes/arch.md «Аудит 15.10»). One file for the wave-1 UI/storage checks.
// contrast: page number (#pgNum) and «автор · жанр» (#content .meta) ≥ 4.5 on every reader page theme (token --r-txt-2, contrast.tsv).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/ node audit1.test.mjs   [RQ_ONLY=contrast,…]
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/';
const ONLY = (process.env.RQ_ONLY || '').split(',').filter(Boolean); const want = (k) => !ONLY.length || ONLY.includes(k);
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
async function fresh() {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); }); p.on('dialog', d => d.accept());
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  return { ctx, p };
}

if (want('contrast')) {
  const { ctx, p } = await fresh();
  const res = await p.evaluate(async () => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = (c) => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const bgOf = (e) => { while (e) { const a = rgb(getComputedStyle(e).backgroundColor); if (a.length >= 3 && (a.length < 4 || a[3] > 0.9)) return a; e = e.parentElement; } return [255, 255, 255]; };
    const cr = (e) => { const b = bgOf(e); let f = rgb(getComputedStyle(e).color); let o = f[3] != null ? f[3] : 1; for (let x = e; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity);
      f = [0, 1, 2].map(i => f[i] * o + b[i] * (1 - o)); const L1 = lum(f), L2 = lum(b); return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2); };
    openBook(BOOKS[0].id); await new Promise(r => setTimeout(r, 1200));
    const keys = Object.keys(THEMES).concat(Object.keys(THEME_VARIANTS)).concat((typeof OLD_THEMES !== 'undefined' ? OLD_THEMES : []).map(t => t.id));
    const out = [];
    for (const k of keys) {
      SET.theme = k; SET.cBg = null; SET.cTxt = null; applySet(); await new Promise(r => setTimeout(r, 120));
      document.getElementById('reader').classList.add('barsoff'); /* page number is shown with the bars hidden */
      const n = document.getElementById('pgNum'), m = document.querySelector('#content .meta');
      out.push({ k, page: document.getElementById('reader').dataset.page, num: cr(n), meta: m ? cr(m) : null });
    }
    return out;
  });
  const bad = res.filter(r => !(r.num >= 4.5) || !(r.meta >= 4.5));
  ok('contrast: page number and «автор · жанр» ≥ 4.5 on every page theme (' + res.length + ')', res.length >= 5 && !bad.length, bad.length ? bad : res.map(r => r.k + ' ' + r.num + '/' + r.meta).join(', '));
  await ctx.close();
}

/* soon: a skin without styling (all but «Карандашный») shows «Скоро», no «Купить» on the card or the skin page, buy() refuses with
   reason 'soon' and writes nothing (coins unchanged). Already owned (bought on /test/ before): stays owned, no refund, cannot be worn yet. */
if (want('soon')) {
  const { ctx, p } = await fresh();
  const r = await p.evaluate(async () => {
    S.gold = 2000; S.owned = ['skin-dungeon']; save();
    openRewardsSheet(); await new Promise(r => setTimeout(r, 500));
    const tab = document.getElementById('rewTabShop'); if (tab) tab.click(); await new Promise(r => setTimeout(r, 300));
    renderShopPane();
    const cards = [...document.querySelectorAll('#shopList .shopcard')].map(c => ({ id: c.dataset.id, st: c.dataset.st, cta: (c.querySelector('.shopcta') || {}).textContent || '', dis: !!(c.querySelector('.shopcta') || {}).disabled }));
    openShopDetail('skin-pergament'); await new Promise(r => setTimeout(r, 200));
    const fb = document.querySelector('#shopDetail .shopbuy'); const detail = { t: fb && fb.textContent, dis: !!(fb && fb.disabled) };
    shopBack(); await new Promise(r => setTimeout(r, 200));
    const raw0 = localStorage.getItem(RQ_K.v1); const b1 = buy('skin-pergament'), b2 = buy('color-dungeon-emerald'); const raw1 = localStorage.getItem(RQ_K.v1);
    const worn = wear('skin-dungeon');
    return { cards, detail, b1, b2, same: raw0 === raw1, gold: S.gold, owned: S.owned.slice(), worn, skin: SET.skin || null };
  });
  const pencil = r.cards.find(c => c.id === 'skin-pencil'), others = r.cards.filter(c => c.id !== 'skin-pencil');
  ok('soon: every skin but «Карандашный» shows «Скоро» (disabled), no «Купить»; «Карандашный» unchanged', others.length >= 6 && others.every(c => c.st === 'soon' && /Скоро/.test(c.cta) && c.dis) && pencil && pencil.st !== 'soon', r.cards);
  ok('soon: skin page button «Скоро», disabled', /Скоро/.test(r.detail.t || '') && r.detail.dis, r.detail);
  ok('soon: buy() refuses (reason soon) for a skin and its colour, nothing written, coins 2000', r.b1.reason === 'soon' && r.b2.reason === 'soon' && r.same && r.gold === 2000, { b1: r.b1, b2: r.b2, same: r.same, gold: r.gold });
  ok('soon: a skin bought before stays owned (no refund) and cannot be worn yet', r.owned.includes('skin-dungeon') && r.worn === false && r.skin !== 'skin-dungeon', { owned: r.owned, worn: r.worn, skin: r.skin });
  await ctx.close();
}

ok('no page errors', !errs.length, errs);
await browser.close();
const pass = checks.filter(Boolean).length; console.log(`SUMMARY audit1.test ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
