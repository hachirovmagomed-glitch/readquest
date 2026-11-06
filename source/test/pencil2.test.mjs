// «Карандашный» v2 (Джессика 17.10: «довольно-таки невзрачный. Добавить туда клеточки, как в тетради, или что-то такое. Больше деталей»).
// Squared paper + red margin on the root, doodles in the margins (masks, token colours), circled active chip/tab/tier, hatched progress,
// hand-drawn title underline; the book page stays flat; text on the grid line ≥ 4.5; night accent fills get dark text; 360 fits.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node pencil2.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lum = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
const hex = rgb => rgb.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; const p = await (await browser.createBrowserContext()).newPage();
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
await p.evaluate(() => { wear('skin-pencil'); __navAllow = true; show('library'); __navAllow = false; }); await sleep(400);

const pg = await p.evaluate(() => { const r = getComputedStyle(document.documentElement), b = getComputedStyle(document.body), lib = getComputedStyle(document.getElementById('library'));
  const m = e => (getComputedStyle(document.body, e).webkitMaskImage || getComputedStyle(document.body, e).maskImage || '').match(/data:image\/svg/g) || [];
  return { skin: document.documentElement.dataset.skin, grads: (r.backgroundImage.match(/linear-gradient/g) || []).length, size: r.backgroundSize, body: b.backgroundColor, lib: lib.backgroundColor, d1: m('::before').length, d2: m('::after').length }; });
ok('1 paper: squared grid 20px + margin on the root, body and library transparent', pg.skin === 'pencil' && pg.grads === 3 && /20px 20px/.test(pg.size) && pg.body === 'rgba(0, 0, 0, 0)' && pg.lib === 'rgba(0, 0, 0, 0)', pg);
ok('2 doodles: graphite caterpillar/spiral and two accent stars as masks', pg.d1 === 2 && pg.d2 === 2, pg);
// 18.10 (Джессика): fewer stars, at the edge, never on the red margin or over the shelf text
const dz = await p.evaluate(() => { const c = e => getComputedStyle(document.body, e).webkitMaskPosition || getComputedStyle(document.body, e).maskPosition || ''; return { a: c('::before'), b: c('::after') }; });
ok('2b doodles: nothing on the left margin (all anchored to the right edge)', !/left|^0px|, 0px|^1px|, 1px/.test(dz.a + ',' + dz.b), dz);
const ac = await p.evaluate(() => { const c = document.querySelector('#libChips .fchip.on') || document.querySelector('.fchip.on'), n = document.querySelector('#botnav .botnav-btn.on');
  const ring = e => /data:image\/svg/.test(getComputedStyle(e, '::after').webkitMaskImage || ''), t = document.getElementById('libTitle');
  return { chipBg: getComputedStyle(c).backgroundColor, chipRing: ring(c), navBg: getComputedStyle(n).backgroundColor, navRing: ring(n), under: /data:image\/svg/.test(getComputedStyle(t, '::after').webkitMaskImage || '') }; });
ok('3 active filter and tab circled in pencil (no fill), library title underlined by hand', ac.chipBg === 'rgba(0, 0, 0, 0)' && ac.chipRing && ac.navBg === 'rgba(0, 0, 0, 0)' && ac.navRing && ac.under, ac);
// 06.11 (Джессика): every chip is circled in pencil instead of a frame; the selected one in accent, the ring sits where the frame was
const rf = await p.evaluate(() => { const c = document.createElement('button'); c.className = 'fchip on'; c.textContent = 'Этюд ×1,5'; document.getElementById('libChips').appendChild(c);
  const d = c.cloneNode(true); d.classList.remove('on'); document.getElementById('libChips').appendChild(d);
  const s = getComputedStyle(c), a = getComputedStyle(c, '::after'), da = getComputedStyle(d, '::after'), ring = x => /data:image\/svg/.test(x.webkitMaskImage || x.maskImage || '');
  const r = { frame: s.borderTopColor, off: getComputedStyle(d).borderTopColor, bw: s.borderTopWidth, inset: [a.top, a.right, a.bottom, a.left].join(' '), on: ring(a), onBg: a.backgroundColor, offRing: ring(da), offBg: da.backgroundColor }; c.remove(); d.remove(); return r; });
ok('3b chips: every chip circled in pencil (no frame), the selected one in another colour, ring covers the border box', rf.frame === 'rgba(0, 0, 0, 0)' && rf.off === 'rgba(0, 0, 0, 0)' && rf.on && rf.offRing && rf.onBg !== rf.offBg && rf.inset === '-' + rf.bw + ' -' + rf.bw + ' -' + rf.bw + ' -' + rf.bw, rf);
// 06.11 (Джессика: «со всеми параметрами… Пробегись по другим настройкам»): reading-settings options, settings .seg and price tiers are circled the same way; tabs: the open one circled
const og = await p.evaluate(() => { const mk = (wrapCls, id, inner) => { const w = document.createElement('div'); w.className = wrapCls; if (id) w.id = id; w.innerHTML = inner; document.body.appendChild(w); return w; };
  const ring = x => /data:image\/svg/.test(x.webkitMaskImage || x.maskImage || '');
  const sheet = document.getElementById('sheet'), rs = document.createElement('div'); rs.className = 'rseg'; rs.innerHTML = '<button class="on">А</button><button>Б</button>'; sheet.appendChild(rs);
  const sg = mk('seg', 'tLangX', '<button class="on">Р</button><button>E</button>'), ts = mk('tierseg', '', '<button class="on">1</button><button>2</button>'), pt = mk('ptabs', '', '<button class="on">Т</button><button>Д</button>');
  const st = b => { const s = getComputedStyle(b), a = getComputedStyle(b, '::after'); return { bg: s.backgroundColor, ring: ring(a), c: a.backgroundColor }; };
  const r = {}; for (const [k, w] of [['rseg', rs], ['seg', sg], ['tier', ts]]) { const [on, off] = w.querySelectorAll('button'); r[k] = { on: st(on), off: st(off) }; }
  const [ton, toff] = pt.querySelectorAll('button'); r.tab = { on: st(ton), off: st(toff) };
  [rs, sg, ts, pt].forEach(x => x.remove()); return r; });
ok('3c options: every option circled (no fill), the chosen one in another colour', ['rseg', 'seg', 'tier'].every(k => og[k].on.ring && og[k].off.ring && og[k].on.bg === 'rgba(0, 0, 0, 0)' && og[k].off.bg === 'rgba(0, 0, 0, 0)' && og[k].on.c !== og[k].off.c), og);
ok('3d tabs: no fill, the open tab circled', og.tab.on.ring && !og.tab.off.ring && og.tab.on.bg === 'rgba(0, 0, 0, 0)', og.tab);
// 06.11 (Джессика: «Ползунки… тоже сделать рисованными»): switches drawn in pencil (masked outline, ringed knob), sliders with a dashed line, shading to the knob (--pv) and a ringed knob
const sw = await p.evaluate(async () => { const ring = x => /data:image\/svg/.test(x.webkitMaskImage || x.maskImage || '');
  const b = document.createElement('button'); b.className = 'ghostbtn sw'; b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', 'true'); document.getElementById('libChips').appendChild(b);
  const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = 30; document.getElementById('libChips').appendChild(r);
  await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));
  const bs = getComputedStyle(b), ka = getComputedStyle(b, '::after');
  const rules = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).filter(x => x.selectorText && x.selectorText.includes('pencil') && x.selectorText.includes('input[type="range"]'));
  const tr = rules.find(x => x.selectorText.includes('slider-runnable-track') && /repeating-linear-gradient/.test(x.style.background || x.style.backgroundImage)), th = rules.find(x => x.selectorText.includes('slider-thumb') && /border: 2px solid/.test(x.style.cssText));
  const out = { swMask: ring(bs), swHatch: (bs.webkitMaskImage.match(/data:image\/svg/g) || []).length, knob: ka.borderTopWidth, pv: r.style.getPropertyValue('--pv'), app: getComputedStyle(r).appearance, track: !!tr, thumb: !!th };
  b.remove(); r.remove(); return out; });
ok('3e switches and sliders drawn in pencil', sw.swMask && sw.swHatch === 2 && sw.knob === '2px' && sw.pv === '0.300' && sw.app === 'none' && sw.track && sw.thumb, sw);
const hb = await p.evaluate(() => { const i = document.createElement('i'), b = document.createElement('div'); b.className = 'pbar'; i.style.width = '50%'; b.appendChild(i); document.getElementById('shelf').prepend(b);
  const r = { bg: getComputedStyle(i).backgroundImage, line: getComputedStyle(b).boxShadow }; b.remove(); return r; });
ok('4 progress: hatched fill, graphite outline', /repeating-linear-gradient/.test(hb.bg) && /inset/.test(hb.line), hb);
// 18.10 (Джессика): generated covers, «Не начато», two-line titles, chip fade, «Добавь книгу» in the empty grid
const sh = await p.evaluate(() => { const cards = [...document.querySelectorAll('#shelf .bookcard')], c = cards[0].querySelector('.pc-cover'), t = c && c.querySelector('.pc-t'), a = c && c.querySelector('.pc-a');
  const b0 = cards.find(x => /Не начато/.test(x.querySelector('.bpct').textContent)), z = b0 && b0.querySelector('.pbar'), zs = z && getComputedStyle(z);
  const ti = [...document.querySelectorAll('#shelf .btitle')].find(x => /Последний/.test(x.textContent)), ts = ti && getComputedStyle(ti);
  const pct = cards.map(x => x.querySelector('.bpct').textContent);
  return { t: t && t.textContent, tv: t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 8, a: a && a.textContent, title: cards[0].querySelector('.btitle').textContent,
    tbg: t && getComputedStyle(t).backgroundImage, pct, zero: zs && { bg: zs.backgroundColor, sh: zs.boxShadow, bt: zs.borderTopStyle },
    clamp: ts && ts.webkitLineClamp, ws: ts && ts.whiteSpace, lines: ti && Math.round(ti.getBoundingClientRect().height / parseFloat(ts.lineHeight)) }; });
ok('11 covers: title and author printed on the shelf cover, on clean paper (no hatching under the text)', sh.t && sh.title.includes(sh.t) && sh.tv && sh.a && sh.tbg === 'none', sh);
ok('12 0 %: «Не начато» instead of «0%», no grey box (a dashed pencil line)', !sh.pct.includes('0%') && sh.zero && sh.zero.bt === 'dashed' && sh.zero.sh === 'none' && sh.zero.bg === 'rgba(0, 0, 0, 0)', sh);
ok('13 long titles wrap to two lines', sh.clamp === '2' && sh.ws === 'normal' && sh.lines === 2, sh);
const fd = await p.evaluate(() => ({ gone: document.getElementById('libChips').hidden, menu: !!document.querySelector('#libSortMenu [data-f="want"]') }));
ok('14 no filter row under the header; filters live in «⋮» (18.10)', fd.gone && fd.menu, fd);
const ad = await p.evaluate(async () => { const h = document.querySelector('#shelf .addhint'); if (!h) return null; const r = h.getBoundingClientRect(), cv = document.querySelector('#shelf .cover').getBoundingClientRect();
  h.click(); await new Promise(q => setTimeout(q, 100)); const open = !document.getElementById('addMenu').hidden; document.getElementById('addMenu').hidden = true;
  return { txt: h.textContent.trim(), w: Math.round(r.width), cw: Math.round(cv.width), open }; });
ok('15 «Добавить книгу» tile in the grid opens the add menu', ad && /Добавить книгу/.test(ad.txt) && Math.abs(ad.w - ad.cw) <= 2 && ad.open, ad);
const wm = await p.evaluate(async () => { const n = () => ((getComputedStyle(document.body, '::before').webkitMaskImage || '').match(/data:image\/svg/g) || []).length, sh = document.getElementById('shelf'), r = { short: n() };
  for (let k = 0; k < 4; k++) sh.appendChild(document.createElement('div')); await new Promise(q => setTimeout(q, 50)); r.long = n(); renderLibrary(); return r; });
ok('16 long shelf: the caterpillar steps aside (only the spiral stays in the gutter)', wm.short === 2 && wm.long === 1, wm);
await p.evaluate(() => { openRewardsSheet(); }); await sleep(400);
const tier = await p.evaluate(() => { const e = document.querySelector('#rewSlots .tierseg button.on'); return { bg: getComputedStyle(e).backgroundColor, ring: /data:image\/svg/.test(getComputedStyle(e, '::after').webkitMaskImage || '') }; });
ok('5 rewards: the chosen price tier is circled', tier.bg === 'rgba(0, 0, 0, 0)' && tier.ring, tier);
await p.evaluate(() => closeRewardsSheet()); await sleep(200);
// contrast: text on the grid line, day and night; accent fills
const tk = await p.evaluate(async () => { const out = {}, r = document.documentElement;
  for (const n of [false, true]) { if (n) r.dataset.theme = 'night'; else delete r.dataset.theme; await new Promise(q => setTimeout(q, 50)); const cs = getComputedStyle(r);
    out[n] = Object.fromEntries(['text', 'text-2', 'accent-text', 'skin-grid', 'bg', 'accent', 'on-accent'].map(k => [k, cs.getPropertyValue('--rq-' + k).trim().slice(1)])); }
  delete r.dataset.theme; return out; });
const pr = [false, true].flatMap(n => [['text', 'skin-grid'], ['text-2', 'skin-grid'], ['accent-text', 'skin-grid'], ['text-2', 'bg'], ['on-accent', 'accent']].map(([f, b]) => ({ n, f, b, r: cr(tk[n][f], tk[n][b]) })));
ok('6 contrast ≥ 4.5: text, text-2, accent on the grid line and paper; on-accent on accent (day, night)', pr.every(x => x.r >= 4.5), pr.filter(x => x.r < 4.5));
await p.evaluate(() => { S.gold = 5000; save(); toggleDayNight(); openRewardsSheet(); }); await sleep(500);
const nb = await p.evaluate(() => [...document.querySelectorAll('#rewSlots .buy:not(:disabled)')].slice(0, 2).map(e => { const c = getComputedStyle(e); return { c: c.color, b: c.backgroundColor }; }));
ok('7 night: «100 монет» dark text on the pale accent', nb.length >= 1 && nb.every(x => cr(hex(x.c), hex(x.b)) >= 4.5), nb);
await p.evaluate(() => { closeRewardsSheet(); toggleDayNight(); __navAllow = true; openBook(allBooks()[0].id); __navAllow = false; }); await sleep(2500);
const rd = await p.evaluate(() => { const r = getComputedStyle(document.getElementById('reader')); return { bg: r.backgroundColor, img: r.backgroundImage }; });
ok('8 reader: flat page, no grid or doodles behind the text', !/rgba\(.*, 0\)$/.test(rd.bg) && rd.img === 'none', rd);
await p.evaluate(() => { __navAllow = true; show('library'); __navAllow = false; }); await p.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await sleep(300);
ok('9 360: no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.evaluate(() => wear('skin-celestial') || (S.gold = 5000, buy('skin-celestial'), wear('skin-celestial'))); await sleep(300);
const lv = await p.evaluate(() => ({ grads: (getComputedStyle(document.documentElement).backgroundImage.match(/linear-gradient\(90deg, rgba\(0, 0, 0, 0\) 9px/g) || []).length, d: getComputedStyle(document.body, '::before').content }));
ok('10 leaving the skin: no grid or doodles', lv.grads === 0 && lv.d === 'none', lv);
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY pencil2.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
