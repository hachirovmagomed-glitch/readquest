// 06.11 (Джессика): «Статистика налезает на количество дней. Проверить во всех скинах» → then «убрать 7/30 дней… более точно настраивать
// количество дней… эстетичнее». The Stats title stands alone (whole, nothing over it); the period is one line above the charts:
// tap → quick picks (неделя … год) + any 3–365 days (slider, −/+); long periods are drawn by weeks / months; the choice is remembered.
// Every skin, day and night, 360 and 390.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node statshead.test.mjs   (RQ_SHOTS=<dir> also saves a shot per case)
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/', SHOTS = process.env.RQ_SHOTS;
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SK = ['', 'pencil', 'celestial', 'ellada', 'babochkovyi', 'alisa'];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
for (const w of [360, 390]) {
  const ctx = await browser.createBrowserContext(), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: w, height: 760, isMobile: true, hasTouch: true, deviceScaleFactor: SHOTS ? 2 : 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(300);
  await p.evaluate(() => { S.gold = 999999; for (let i = 0; i < 400; i++) { const d = addLocalDays(today(), -i); S.hist[d] = { min: (i * 7) % 23, pages: (i * 3) % 11, xp: i % 9, gold: i % 5 }; } save(); });
  for (const sk of SK) for (const nt of [false, true]) {
    const r = await p.evaluate(async (sk, nt) => {
      if (sk) { buy('skin-' + sk); wear('skin-' + sk); } else { wear('skin-default'); S.appTheme = 'light'; save(); applyAppTheme(); }
      if (!isLightBg(activeTheme().bg) !== nt) toggleDayNight();
      __navAllow = true; show('stats'); __navAllow = false; document.querySelectorAll('.scroll').forEach(x => x.scrollTop = 0);
      if (!el('stPerPane').hidden) el('stPerBtn').click(); stPerSet(7);
      await new Promise(q => setTimeout(q, 250));
      const h = document.querySelector('#stats h1'), row = h.parentElement, m = document.getElementById('menuStats');
      const rg = document.createRange(); rg.selectNodeContents(h); const tr = rg.getBoundingClientRect(), mr = m.getBoundingClientRect();
      const kids = [...row.children].filter(e => e.offsetWidth && e !== h && e !== m && !e.classList.contains('spacer'));
      const btn = el('stPerBtn'), br = btn.getBoundingClientRect(), chart = el('chMin').getBoundingClientRect();
      return { night: !isLightBg(activeTheme().bg), titleAlone: !kids.length && !document.getElementById('stP7'), clipped: h.scrollWidth > h.clientWidth + 1, overMenu: tr.left < mr.right,
        btnOnScreen: br.left >= 0 && br.right <= innerWidth - 4 && br.bottom < chart.top, label: el('stPerTxt').textContent };
    }, sk, nt);
    const name = `${w} ${sk || 'default'} ${nt ? 'ночь' : 'день'}`;
    ok(name + ': title alone and whole; the period line sits above the charts', r.night === nt && r.titleAlone && !r.clipped && !r.overMenu && r.btnOnScreen && r.label === 'за неделю', r);
    if (SHOTS) {
      await p.evaluate(() => { el('stPerBtn').click(); stPerSet(45); const sc = document.querySelector('#stats .scroll'); sc.scrollTop = Math.max(0, el('stPerBtn').getBoundingClientRect().top - 260); });
      await sleep(200); await p.screenshot({ path: `${SHOTS}/${w}-${sk || 'default'}-${nt ? 'night' : 'day'}.png` });
      await p.evaluate(() => { el('stPerBtn').click(); });
    }
  }
  // behaviour (last skin is fine — logic is shared)
  const b = await p.evaluate(async () => {
    const o = {}; const pane = el('stPerPane'); el('stPerBtn').click(); o.open = !pane.hidden && el('stPerBtn').getAttribute('aria-expanded') === 'true';
    pane.querySelector('[data-d="30"]').click(); o.m30 = [el('stPerTxt').textContent, el('chMin').children.length, pane.querySelector('[data-d="30"]').classList.contains('on')];
    el('stPerPlus').click(); o.p31 = [el('stPerTxt').textContent, el('chMin').children.length];
    el('stPerMinus').click(); el('stPerMinus').click(); o.m29 = el('stPerTxt').textContent;
    const rg = el('stPerRange'); rg.value = 45; rg.dispatchEvent(new Event('input')); o.r45 = [el('stPerTxt').textContent, el('chMin').children.length, el('stPerNote').textContent];
    pane.querySelector('[data-d="365"]').click(); o.y = [el('stPerTxt').textContent, el('chMin').children.length, el('stPerNote').textContent];
    const lbls = [...el('chMin').querySelectorAll('.bar i')].map(e => e.getBoundingClientRect()); o.lblOverlap = lbls.some((a, i) => i && a.left < lbls[i - 1].right);
    stPerSet(2); o.min = statPeriod; stPerSet(999); o.max = statPeriod;
    el('stPerMinus').click(); o.saved = SET.statDays; return o; });
  ok(w + ' period: opens; Месяц = 30 bars; +/− by one day; slider 45 = by weeks; Год = by months; labels apart; 3–365', b.open && b.m30[0] === 'за месяц' && b.m30[1] === 30 && b.m30[2] && b.p31[0] === 'за 31 день' && b.p31[1] === 31 && b.m29 === 'за 29 дней'
    && b.r45[0] === 'за 45 дней' && b.r45[1] === 7 && /^45 дней · столбик = неделя/.test(b.r45[2]) && b.y[0] === 'за год' && b.y[1] >= 12 && b.y[1] <= 13 && /месяц/.test(b.y[2]) && !b.lblOverlap && b.min === 3 && b.max === 365 && b.saved === 364, b);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 });
  const kept = await p.evaluate(async () => { __navAllow = true; show('stats'); __navAllow = false; renderStats(); await new Promise(q => setTimeout(q, 200)); return el('stPerTxt').textContent; });
  ok(w + ' the chosen period is remembered after a restart', kept === 'за 364 дня', kept);
  ok(w + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}
ok('no page errors', !errs.length, errs);
console.log(`SUMMARY statshead.test ${checks.filter(Boolean).length}/${checks.length}`);
await browser.close();
