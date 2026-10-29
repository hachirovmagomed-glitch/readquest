// 29.10 «Цель и напоминание» (Джессика: «добавим то, что можем добавить»): неделя, цель на год (S.yearGoal), «дочитать к дате»
// (S.bookGoals), файл для календаря телефона; нормализация новых полей (arch.md 29.10).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node goalextras.test.mjs
import puppeteer from 'puppeteer-core';
import { normYearGoal, normBookGoals, hydrateProgress, splitLegacyState } from '../storage/schema.js';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);

// 1. normalisation: page = schema.js
const J = [{ y: 2026, n: 24 }, { y: 2026, n: 0 }, { y: '2026', n: 3 }, null, [1], { y: 2026, n: 400 }];
const G = { a: '2026-11-15', b: 'завтра', c: 5, d: '2026-1-1' };
let r = await p.evaluate((J, G) => ({ y: J.map(yearGoalNorm), g: bookGoalsNorm(G), s: { y: S.yearGoal, g: S.bookGoals } }), J, G);
ok('1 yearGoalNorm / bookGoalsNorm = schema.js; junk → null / dropped', JSON.stringify(r.y) === JSON.stringify(J.map(normYearGoal)) && JSON.stringify(r.g) === JSON.stringify(normBookGoals(G)) &&
  JSON.stringify(r.y) === JSON.stringify([{ y: 2026, n: 24 }, null, null, null, null, null]) && JSON.stringify(r.g) === '{"a":"2026-11-15"}', r);
ok('1 a fresh start: no year goal, no book goals', r.s.y === null && JSON.stringify(r.s.g) === '{}', r.s);

// 2. the week: 7 days, days at the goal ticked, «Ещё N дней … +120»
r = await p.evaluate(async () => { const mon = weekKey(today()); const add = (n) => { const x = new Date(mon + 'T12:00:00'); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const t = today(), past = [0, 1, 2, 3, 4, 5, 6].map(add).filter(d => d < t);
  if (past[0]) SESS.push({ date: past[0], minutes: 14, book: BOOKS[0].id }); if (past[1]) SESS.push({ date: past[1], minutes: 4, book: BOOKS[0].id });
  openGeneralSettings(false, 'goal'); await new Promise(r => setTimeout(r, 300));
  return { n: document.querySelectorAll('#gxWeek .gxday').length, ok: document.querySelectorAll('#gxWeek .gxday.ok').length, part: document.querySelectorAll('#gxWeek .gxday.part').length, today: document.querySelectorAll('#gxWeek .gxday.today').length,
    sub: el('gxWeekSub').textContent, past: past.length, cnt: daysInWeekAtGoal().count }; });
ok('2 «Неделя»: 7 days, today marked, a day ≥ goal ticked, a short day is a ring', r.n === 7 && r.today === 1 && r.ok === Math.min(1, r.past) && r.part === (r.past > 1 ? 1 : 0), r);
ok('2 the line says how many goal days are left for the weekly +120', new RegExp('Ещё ' + (4 - r.cnt) + ' (день|дня|дней) с целью 10 мин — и \\+120 монет за неделю').test(r.sub), r);

// 3. year goal
r = await p.evaluate(async () => { const y = new Date().getFullYear(); S.finished = [BOOKS[0].id]; S.finishDates = { [BOOKS[0].id]: y + '-03-02' }; gxRender(); el('gxYearOn').click(); await new Promise(r => setTimeout(r, 50));
  const a = { g: S.yearGoal, sub: el('gxYearSub').textContent }; el('gxYearPlus').click(); a.n = S.yearGoal.n; a.saved = JSON.parse(JSON.stringify(S.yearGoal)); el('gxYearOff').click(); a.off = S.yearGoal; a.btn = !!el('gxYearOn'); a.y = y; return a; });
ok('3 «Поставить» → 12 books this year, «Прочитано 1 из 12 …»; «+» → 13; «Убрать цель» → none', r.g && r.g.y === r.y && r.g.n === 12 && /^Прочитано 1 из 12 · /.test(r.sub) && r.n === 13 && r.off === null && r.btn, r);

// 4. «дочитать к дате»: minutes a day from the speed; the book card has the line
r = await p.evaluate(async () => { S.finished = []; const b = BOOKS.find(x => x.text) || BOOKS[0]; S.progress[b.id] = { ratio: 0, pos: 0 }; SET.rx.spd.cpm = 1000;
  const d = (() => { const x = new Date(); x.setDate(x.getDate() + 9); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  gxBookGoalSet(b.id, d); await new Promise(r => setTimeout(r, 50)); const row = document.querySelector('.gxbk[data-id="' + b.id + '"] .sub');
  const want = Math.max(1, Math.ceil(b.text.length / 1000 / 10));
  bookInfo(b.id); await new Promise(r => setTimeout(r, 200)); const card = (el('gxBkGoal') || {}).textContent || '';
  return { sub: row && row.textContent, want, card, saved: S.bookGoals[b.id] === d }; });
ok('4 the goal row: «К <дата> · ≈ N мин в день» (text ÷ speed ÷ days left)', r.saved && new RegExp('^К \\d+ \\S+ · ≈ ' + r.want + ' мин в день$').test(r.sub), r);
ok('4 the book card shows the same goal', r.card === r.sub, r);

// 5. the calendar file: weekly repeat on the reminder days at its time, the goal minutes, an alarm
r = await p.evaluate(() => { S.notif.time = '07:30'; S.notif.days = [true, true, true, true, true, false, false]; return gxIcs(); });
ok('5 .ics: VEVENT at 07:30, RRULE by weekdays, 10 minutes, VALARM, CRLF lines', /DTSTART:\d{8}T073000\r\n/.test(r) && /RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR\r\n/.test(r) && /DURATION:PT10M/.test(r) && /BEGIN:VALARM[\s\S]*END:VALARM/.test(r) && /^BEGIN:VCALENDAR\r\n/.test(r), r);

// 6. export → import keeps the goals (boot hydrate)
r = await p.evaluate(() => { S.yearGoal = { y: 2026, n: 20 }; save(); return JSON.parse(JSON.stringify(S)); });
const h = hydrateProgress(splitLegacyState(r).progress);
ok('6 the goals go to the progress domain and survive its hydrate (export / import / boot)', h.yearGoal && h.yearGoal.n === 20 && Object.keys(h.bookGoals).length === 1 && h.backupNag === r.backupNag, { y: h.yearGoal, g: h.bookGoals });

ok('no page errors', !p.errs.length, p.errs);
const pass = checks.filter(Boolean).length; console.log(`SUMMARY goalextras.test ${pass}/${checks.length}`);
await browser.close(); process.exit(pass === checks.length ? 0 : 1);
