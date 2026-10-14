// Interface notes on 2130 collapsed rows (14.10): font row = «Aa» sample in current font + «Шрифт» + value right, no separate heading;
// theme row = one row: icon, «Тема приложения» + current-mode subtitle, right sample circle (2px border) + theme name; no duplicate heading.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node rowfix.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500);
// theme
await p.evaluate(() => openGeneralSettings(false)); await sleep(300);
const th = await p.evaluate(() => { const row = document.getElementById('appThemeX'); if (!row) return { row: false };
  const sec = row.closest('#settings') || document; const titles = [...sec.querySelectorAll('*')].filter(e => e.children.length === 0 && /^Тема приложения$/.test(e.textContent.trim())).length
    + [...sec.querySelectorAll('.lab')].filter(e => e.firstChild && /Тема приложения/.test(e.firstChild.textContent || '')).length;
  const t = row.querySelector('.xt'), sub = row.querySelector('.xsub'), dot = row.querySelector('.xdot'), v = row.querySelector('.xv');
  const r = row.getBoundingClientRect(), dr = dot ? dot.getBoundingClientRect() : null, vr = v ? v.getBoundingClientRect() : null;
  return { row: true, h: Math.round(r.height), icon: !!row.querySelector('use[href="#i-sun-moon"]'), title: t ? t.textContent.trim() : '', sub: sub ? sub.textContent.trim() : '',
    dupLabel: !!row.querySelector('.xl') && row.querySelector('.xl').textContent.trim() === 'Тема', titles,
    dotRight: !!(dr && dr.left > r.left + r.width / 2), vRight: !!(vr && vr.left > r.left + r.width / 2), v: v ? v.textContent.trim() : '', cur: (document.querySelector('#appThemeBox .apptile.on small') || {}).textContent,
    border: dot ? getComputedStyle(dot).borderTopWidth : '', listBorder: (() => { const s = document.querySelector('#appThemeBox .apptile .appsw'); return s ? getComputedStyle(s).borderTopWidth : ''; })(), auto: S.appTheme === 'auto' }; });
ok('theme: one row — icon, «Тема приложения» + subtitle with current mode, no «Тема» duplicate, single heading', th.row && th.h >= 52 && th.icon && th.title === 'Тема приложения' && (th.auto ? th.sub === 'Авто: день с 7:00 до 21:00' : th.sub.length > 0) && !th.dupLabel && th.titles === 1, th);
ok('theme: sample circle and theme name on the right', th.dotRight && th.vRight && th.v === th.cur, th);
ok('theme: sample circle has a 2px border', th.border === '2px', th);
const th2 = await p.evaluate(async () => { document.querySelector('#appThemeX').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('#appThemeBox .apptile:nth-child(3) .appsw').click(); await new Promise(r => setTimeout(r, 300));
  const row = document.getElementById('appThemeX'); return { sub: (row.querySelector('.xsub') || {}).textContent || '', auto: S.appTheme === 'auto' }; });
ok('theme: subtitle follows the real mode (manual theme → not the «Авто» text)', !th2.auto && th2.sub.length > 0 && !/^Авто/.test(th2.sub), th2);
const th3 = await p.evaluate(async () => { const x = document.querySelector('#appThemeX'); if (document.getElementById('appThemeBox').hidden) x.click(); await new Promise(r => setTimeout(r, 200));
  const t = document.querySelector('#appThemeBox .appsw[data-k="pencil"]'); t.click(); await new Promise(r => setTimeout(r, 400));
  return { skin: !!activeTheme().skin, sub: (document.querySelector('#appThemeX .xsub') || {}).textContent || '' }; });
ok('theme: «Карандашный» → subtitle «Всегда этот скин»', th3.skin && th3.sub === 'Всегда этот скин', th3);
const th4 = await p.evaluate(() => { const row = document.getElementById('appThemeX'), t = row.querySelector('.xt'), v = row.querySelector('.xv'), d = row.querySelector('.xdot');
  const line = getComputedStyle(document.documentElement).getPropertyValue('--rq-skin-border').trim(); const probe = document.createElement('i'); probe.style.color = line; document.body.appendChild(probe); const lineRgb = getComputedStyle(probe).color; probe.remove();
  return { t: t && t.textContent, tFit: !!t && t.scrollWidth <= t.clientWidth, v: v && v.textContent, vFit: !!v && v.scrollWidth <= v.clientWidth, w: v ? getComputedStyle(v).fontWeight : '',
    icon: !!(d && d.querySelector('svg use[href="#i-pencil"], svg.lucide-pencil, svg')), bc: d ? getComputedStyle(d).borderTopColor : '', bw: d ? getComputedStyle(d).borderTopWidth : '', lineRgb }; });
ok('pencil row @390: «Тема приложения» and «Карандашный» not truncated, value weight normal', th4.t === 'Тема приложения' && th4.tFit && th4.v === 'Карандашный' && th4.vFit && (th4.w === '400' || th4.w === 'normal'), th4);
ok('pencil row: circle holds the Lucide pencil icon, 2px border in the skin frame colour (--rq-skin-border)', th4.icon && th4.bw === '2px' && th4.bc === th4.lineRgb, th4);
await p.evaluate(async () => { document.querySelector('#appThemeX').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('#appThemeBox .apptile:nth-child(1) .appsw').click(); });
// font
await p.evaluate(async () => { closeGeneralSettings && closeGeneralSettings(); show('library'); openBook(allBooks()[0].id); for (let i = 0; i < 50 && !(R.pageCount > 1); i++) await new Promise(r => setTimeout(r, 200)); el('btnAa').click(); }).catch(() => {});
await sleep(400);
const f = await p.evaluate(() => { const row = document.getElementById('fontSegX'); if (!row) return { row: false }; const srow = row.closest('.srow');
  const s = row.querySelector('.xs'), l = row.querySelector('.xl'), v = row.querySelector('.xv'); const r = row.getBoundingClientRect();
  return { row: true, sample: s ? s.textContent.trim() : '', sampleFont: s ? getComputedStyle(s).fontFamily : '', cur: (FONTS[SET.font] || FONTS[0]).v, label: l ? l.textContent.trim() : '',
    sampleLeft: !!(s && s.getBoundingClientRect().left < r.left + 60), vRight: !!(v && v.getBoundingClientRect().right > r.right - 60), value: v ? v.textContent.trim() : '', want: (FONTS[SET.font] || FONTS[0]).label,
    heading: !!(srow && [...srow.children].some(c => c.tagName === 'LABEL' && /Шрифт/.test(c.textContent))) }; });
const norm = (x) => (x || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim();
ok('font: «Aa» sample in current font on the left, label «Шрифт», value on the right', f.row && f.sample === 'Aa' && norm(f.sampleFont) === norm(f.cur) && f.label === 'Шрифт' && f.sampleLeft && f.vRight && f.value === f.want, f);
ok('font: no separate «Шрифт» heading above the row', f.row && !f.heading, f);
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY rowfix.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
