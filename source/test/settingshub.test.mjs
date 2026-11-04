// 29.10 «Общие настройки» разделами (Джессика: «внедрить их все… разные секции настроек, чтобы они не были смешаны в одну кучу»):
// the list of sections, a section page and «назад» (also over the book), search, «Настройки чтения» without a book,
// «Только к этой книге» (SET.bookSet), «Мои наборы» (SET.presets), reminder days/time, backup reminder, reset asks for a copy first,
// normalisation of the new fields (arch.md 29.10).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node settingshub.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const fresh = async () => {
  const p = await (await browser.createBrowserContext()).newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  return p;
};
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.offsetParent); }, sel);
let p = await fresh();

// 1. the list of sections
await p.evaluate(() => openGeneralSettings(false)); await sleep(200);
let r = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#gsList [data-sec]')].filter(b => b.offsetParent).map(b => b.dataset.sec),
  secs: [...document.querySelectorAll('#settings .gsec')].filter(s => s.offsetParent).length, t: el('setTitle').textContent,
  subs: [...document.querySelectorAll('#gsList .sub')].filter(s => s.offsetParent).every(s => s.textContent.trim().length > 0) }));
ok('1 «Общие настройки» = 6 sections (no «Внешний вид»: Джессика 29.10), none open, every row has a summary', r.rows.join() === 'read,ai,goal,lang,data,about' && r.secs === 0 && r.t === 'Общие настройки' && r.subs, r);

// 2. a section is its own page; «назад» goes back to the list
await p.click('#gsList [data-sec="ai"]'); await sleep(200);
r = await p.evaluate(() => ({ t: el('setTitle').textContent, ai: !!el('aiX').offsetParent, list: !!el('gsList').offsetParent, st: history.state && history.state.rq,
  other: [...document.querySelectorAll('#settings .gsec')].filter(s => s.offsetParent).map(s => s.dataset.sec) }));
ok('2 «Нейросети» opens as a page: title, its rows, nothing else', r.t === 'Нейросети' && r.ai && !r.list && r.st === 'gsec' && r.other.join() === 'ai', r);
await p.evaluate(() => history.back()); await sleep(300);
r = await p.evaluate(() => ({ t: el('setTitle').textContent, list: !!el('gsList').offsetParent, set: !el('settings').classList.contains('hidden') }));
ok('2 system «назад» → back to the list of sections', r.t === 'Общие настройки' && r.list && r.set, r);
await p.click('#gsList [data-sec="data"]'); await sleep(200); await p.click('#setBack'); await sleep(300);
ok('2 «←» in the header → back to the list', await vis(p, '#gsList'));

// 3. search: a word start («ключ» → ИИ-помощник, not «включить»); a hit opens its section and shows the row
await p.type('#setSearch', 'ключ'); await sleep(200);
r = await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres b')].map(b => b.textContent));
ok('3 search «ключ» finds «ИИ-помощник», not «Наборы оформления» (включить)', r.includes('ИИ-помощник') && !r.includes('Наборы оформления'), r);
await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres')].find(b => /ИИ-помощник/.test(b.textContent)).click()); await sleep(400);
r = await p.evaluate(() => ({ sec: el('settings').dataset.sec, card: !el('aiCard').hidden, q: el('setSearch').value }));
ok('3 tapping the hit opens «Нейросети» with «ИИ-помощник» open, the search is cleared', r.sec === 'ai' && r.card && r.q === '', r);
await p.evaluate(() => openGeneralSettings(false)); await sleep(200);
await p.type('#setSearch', 'яркость'); await sleep(200);
r = await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres')].map(b => b.textContent));
ok('3 search «яркость» finds the row in «Настройки чтения → Страница»', r.some(t => /Яркость/.test(t) && /Чтение → Страница/.test(t)), r);
await p.evaluate(() => [...document.querySelectorAll('#setSearchRes .gsres')].find(b => /Чтение → Страница/.test(b.textContent)).click()); await sleep(500);

// 4. «Настройки чтения» without a book: the sheet on <body>, sample paragraph, «назад» puts it back into the reader
r = await p.evaluate(() => ({ alone: el('sheet').classList.contains('gsalone'), shown: !el('sheet').classList.contains('hidden'), body: el('sheet').parentNode === document.body,
  prev: !!el('gsPrev').offsetParent, tab: document.querySelector('#setCats .on').dataset.g, pdf: [...document.querySelectorAll('#sheet .pdfonly')].some(e => e.offsetParent),
  own: !!el('rBookOnlyRow').offsetParent, font: getComputedStyle(el('gsPrev')).fontSize }));
ok('4 without a book the reader sheet opens over the settings with a sample paragraph, tab «Страница», no PDF rows, no «Только к этой»', r.alone && r.shown && r.body && r.prev && r.tab === 'grpPage' && !r.pdf && !r.own, r);
await p.evaluate(() => { el('szPlus').click(); }); await sleep(200);
r = await p.evaluate(() => ({ size: SET.size, prev: getComputedStyle(el('gsPrev')).fontSize }));
ok('4 a change shows on the sample at once', r.prev === r.size + 'px', r);
await p.evaluate(() => history.back()); await sleep(400);
r = await p.evaluate(() => ({ hidden: el('sheet').classList.contains('hidden'), home: !!el('sheet').closest('#reader'), alone: el('sheet').classList.contains('gsalone'), set: !el('settings').classList.contains('hidden') }));
ok('4 system «назад» closes it, the sheet is back inside the reader, settings stay', r.hidden && r.home && !r.alone && r.set, r);

// 5. «Мои наборы»: save, switch, delete
await p.evaluate(() => { SET.size = 22; SET.lh = 1.8; saveSet(); applySet(); openGeneralSettings(false, 'read'); }); await sleep(200);
await p.evaluate(() => document.querySelector('#gsPresets .padd').click()); await sleep(300);
await p.evaluate(() => { el('rqAskIn').value = 'Ночь крупно'; el('rqAskOk').click(); }); await sleep(300);
r = await p.evaluate(() => ({ ps: SET.presets, on: [...document.querySelectorAll('#gsPresets .fchip.on')].map(b => b.textContent), ls: JSON.parse(localStorage.getItem(RQ_K.set)).presets }));
ok('5 «Сохранить текущий» stores the look under its name, chip is on, rq_set has it', r.ps.length === 1 && r.ps[0].n === 'Ночь крупно' && r.ps[0].v.size === 22 && r.ps[0].v.lh === 1.8 && r.on.join() === 'Ночь крупно' && r.ls && r.ls.length === 1 && !('theme' in r.ps[0].v), r);
await p.evaluate(() => { SET.size = 17; SET.lh = 1.4; saveSet(); applySet(); renderSettings(); document.querySelector('#gsPresets .fchip:not(.padd)').click(); }); await sleep(300);
r = await p.evaluate(() => ({ size: SET.size, lh: SET.lh }));
ok('5 tapping the set brings its look back', r.size === 22 && r.lh === 1.8, r);
await p.evaluate(() => document.querySelector('#gsPresets .fchip.on').click()); await sleep(300);
r = await p.evaluate(() => ({ t: el('rqAskT') && el('rqAskT').textContent }));
await p.evaluate(() => el('rqAskOk').click()); await sleep(300);
ok('5 tapping the set that is on offers to delete it; «Удалить» removes it', /Удалить набор/.test(r.t) && (await p.evaluate(() => SET.presets.length)) === 0, r);

// 6. «Только к этой книге»: the book keeps its own look, rq_set and other books keep the common one
r = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)); const out = {}, ls = () => JSON.parse(localStorage.getItem(RQ_K.set));
  SET.size = 19; saveSet(); closeGeneralSettings();
  const A = BOOKS[0].id, B = BOOKS[1].id;
  await openBook(A); await w(1000); openReaderSettings('grpText'); await w(200);
  out.row = !!el('rBookOnlyRow').offsetParent;
  el('rBookOnly').querySelector('[data-v="one"]').click(); await w(200);
  setFontSizeKeepPos(25); await w(200);
  out.lsSize = ls().size; out.lsBook = ls().bookSet[A] && ls().bookSet[A].size; out.cur = SET.size;
  await closeReader({ quiet: true }); await w(200); out.closed = SET.size;
  await openBook(B); await w(700); out.b = SET.size; await closeReader({ quiet: true }); await w(200);
  await openBook(A); await w(700); out.a = SET.size;
  openReaderSettings('grpText'); await w(200);
  el('rBookOnly').querySelector('[data-v="all"]').click(); await w(200);
  out.back = SET.size; out.gone = !(A in (ls().bookSet || {}));
  await closeReader({ quiet: true }); await w(200);
  return out;
});
ok('6 «Только к этой»: book A at 25, rq_set keeps 19, bookSet[A] = 25, book B at 19, A again 25', r.row && r.lsSize === 19 && r.lsBook === 25 && r.cur === 25 && r.closed === 19 && r.b === 19 && r.a === 25, r);
ok('6 «Ко всем книгам» drops the book\'s own look', r.back === 19 && r.gone, r);

// 7. «Цель и напоминание»: rows only while on, days and time saved
r = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  S.notif.on = false; save(); openGeneralSettings(false, 'goal'); await w(100);
  const off = { time: !!el('calNotifTimeRow').offsetParent, days: !!el('calNotifDaysRow').offsetParent };
  S.notif.on = true; save(); renderSettings(); await w(100);
  const on = { time: !!el('calNotifTimeRow').offsetParent, days: !!el('calNotifDaysRow').offsetParent };
  const b = [...el('calNotifDays').children]; b[5].click(); await w(50); [...el('calNotifDays').children][6].click(); await w(50);
  const inp = el('calNotifTimeIn'); inp.value = '07:45'; inp.dispatchEvent(new Event('change')); await w(50);
  return { off, on, days: S.notif.days, sub: el('calNotifDaysSub').textContent, time: S.notif.time, shown: el('calNotifTime').textContent, goal: el('gsGoalVal').textContent };
});
ok('7 time and days rows are hidden while the reminder is off', !r.off.time && !r.off.days && r.on.time && r.on.days, r);
ok('7 Сб and Вс off → «По будням»; the clock sets 07:45', r.days.join() === 'true,true,true,true,true,false,false' && r.sub === 'По будням' && r.time === '07:45' && r.shown === '07:45', r);
ok('7 «Цель дня» shows the goal (10 min in MVP)', r.goal === '10 мин', r);

// 8. normalisation (arch.md 29.10): junk is dropped, values are clamped
r = await p.evaluate(() => {
  const s = { presets: [{ n: '', v: {} }, { n: '  A  ', v: { size: 99, font: 'x', theme: 'celestial', evil: 1, lh: 1.83 } }, 'x'], bookSet: { a: { size: 3, margin: 'x' }, b: 'x', c: {} } };
  normSet(s);
  return { s, typo: rqTypoPick({ size: 20, weight: 500, align: 'c', hyph: true }, RQ_BOOK_KEYS) };
});
ok('8 SET.presets / SET.bookSet: empty names and junk dropped, numbers clamped, theme never stored', JSON.stringify(r.s.presets) === JSON.stringify([{ n: 'A', v: { size: 30, lh: 1.85 } }]) && JSON.stringify(r.s.bookSet) === JSON.stringify({ a: { size: 14 } }), r);
ok('8 rqTypoPick keeps only known values (weight 500 / align c dropped)', JSON.stringify(r.typo) === JSON.stringify({ size: 20, hyph: true }), r.typo);

// 9. export carries the new fields; import of a backup with junk settles to defaults
r = await p.evaluate(async () => {
  S.notif = { on: true, time: '21:30', days: [true, false, true, false, true, false, true] }; S.backupNag = false; save();
  SET.presets = [{ n: 'День', v: { size: 18 } }]; SET.bookSet = { x1: { size: 21 } }; saveSet();
  let blob = null; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return 'blob:x'; };
  try { await el('btnExport').onclick(); } finally { URL.createObjectURL = orig; }
  const j = JSON.parse(await blob.text());
  const g = j.game || (j.readquest || {}), st = j.settings || {};
  const pr = j.progress || {}; return { notif: g.notif, nag: 'backupNag' in pr ? pr.backupNag : g.backupNag, presets: st.presets, bookSet: st.bookSet, last: S.lastBackup, today: today(), keys: Object.keys(j) };
});
ok('9 export: notif.days, backupNag, SET.presets, SET.bookSet ride along; «Сохранить» sets the copy date', r.notif && r.notif.days && r.notif.days[1] === false && r.nag === false && r.presets && r.presets[0].n === 'День' && r.bookSet && r.bookSet.x1.size === 21 && r.last === r.today, r);

// 10. weekly backup reminder: once, then not again the same week; off = never
r = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)); const toast = () => [...document.querySelectorAll('.rq-toast')].map(t => t.textContent).join('|');
  S.lastBackup = null; S.backupNagAt = null; S.backupNag = true; S.totalMin = 5; save(); show('library');
  renderLibrary._bk = false; renderLibrary(); await w(1700); const first = toast(), at = S.backupNagAt;
  document.querySelectorAll('.rq-toast').forEach(t => t.remove());
  renderLibrary._bk = false; renderLibrary(); await w(1700); const second = toast();
  S.backupNagAt = null; S.backupNag = false; renderLibrary._bk = false; renderLibrary(); await w(1700); const off = toast();
  return { first, at, today: today(), second, off };
});
ok('10 backup reminder: shown once (date stored), not again the same week, never when switched off', /резервную копию|Резервной копии/.test(r.first) && r.at === r.today && !/копи/.test(r.second) && !/копи/.test(r.off), r);

// 11. «Сброс» first offers to save a copy, then asks to confirm; «Отмена» twice changes nothing
r = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)); S.lastBackup = '2020-01-01'; S.gold = 777; save();
  openGeneralSettings(false, 'data'); await w(100); el('btnReset2').click(); await w(200);
  const t1 = el('rqAskT').textContent; el('rqAskNo').click(); await w(200);
  const t2 = el('rqAskT').textContent; el('rqAskNo').click(); await w(200);
  return { t1, t2, gold: S.gold, danger: getComputedStyle(document.querySelector('.gsdanger')).borderTopStyle };
});
ok('11 reset: «Сначала сохранить копию?», then «Сбросить весь прогресс?»; cancel keeps everything', r.t1 === 'Сначала сохранить копию?' && r.t2 === 'Сбросить весь прогресс?' && r.gold === 777 && r.danger === 'solid', r);

// 12. over the book: a section from the list → «назад» = the list; «Открыть настройки» jump → one «назад» = the book
r = await p.evaluate(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  await openBook(BOOKS[0].id); await w(800); openGeneralSettings(true); await w(100);
  document.querySelector('#gsList [data-sec="goal"]').click(); await w(100); history.back(); await w(400);
  const a = { set: !el('settings').classList.contains('hidden'), list: !!el('gsList').offsetParent, look: !!document.querySelector('#gsList [data-sec="look"]') };
  history.back(); await w(400);
  const b = { set: el('settings').classList.contains('hidden'), rdr: !el('reader').classList.contains('hidden') };
  return { a, b };
});
ok('12 over the book: section → «назад» → list (no «Внешний вид» row there) → «назад» → the book', r.a.set && r.a.list && !r.a.look && r.b.set && r.b.rdr, r);
await p.evaluate(() => closeReader({ quiet: true })); await sleep(300);

// 13. «О приложении»: «Что нового» opens a list, build shown
r = await p.evaluate(async () => { openGeneralSettings(false, 'about'); el('wnX').click(); await new Promise(r => setTimeout(r, 100));
  return { items: el('wnBox').querySelectorAll('li').length, open: !el('wnBox').hidden, build: el('buildVer').textContent }; });
ok('13 «Что нового» lists the latest builds; build number is shown', r.open && r.items >= 5 && /^\d{8}-\d{4}$/.test(r.build), r);

ok('no page errors', !p.errs.length, p.errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY settingshub.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
