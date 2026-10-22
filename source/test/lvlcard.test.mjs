// Сложность книги в приложении (19.10): раздел «Сложность» в карточке (только /test/), выбор только вниз, уровень и лимит страницы
// в трекере, строки итога, поля переживают сохранение, экспорт и импорт. Корень (rq) — без изменений.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ RQ_MAIN_URL=http://127.0.0.1:8767/readquest/ node lvlcard.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const MAIN = process.env.RQ_MAIN_URL || BASE.replace(/test\/$/, '');
const SHOTS = process.env.RQ_SHOTS || '';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = [];
const PHIL = 'Всякое познание начинается с опыта, однако отсюда ещё не следует, что оно целиком проистекает из опыта. Необходимость и строгая всеобщность являются достоверными признаками априорного знания и неразрывно связаны друг с другом. Трансцендентальное единство апперцепции есть то единство, благодаря которому всё данное в созерцании многообразное объединяется в понятие об объекте.';
const KIDS = 'Жил-был кот. Кот был рыжий. Он любил молоко и рыбку. Утром кот пошёл гулять. На лугу он встретил собаку. Собака сказала: гав! Кот сказал: мяу!';
const page = async (url, w, ctx) => {
  const c = ctx || await browser.createBrowserContext(); const p = await c.newPage(); await p.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  return { p, c };
};
const addBooks = (p, phil, kids) => p.evaluate((phil, kids) => {
  const mk = (id, title, author, t) => ({ id, title, author, genre: 'Текст', cover: '', text: Array.from({ length: 60 }, () => t).join('\n\n'), size: 1, fname: id + '.txt' });
  S.userBooks.push(mk('u_phil', 'Критика', 'Автор Неизвестен', phil), mk('u_kids', 'Стишки', 'Народ', kids), { id: 'u_hegel', title: 'Феноменология духа', author: 'Георг Гегель', genre: 'PDF', type: 'pdf', pages: 10, cover: '' });
}, phil, kids);
const card = (p, id) => p.evaluate((id) => {
  show('library'); bookInfo(id);
  const body = el('bookSheetBody'), sheet = el('bookSheet');
  const hs = [...body.querySelectorAll('.bk-h')].map(h => h.textContent), i = hs.indexOf('Сложность');
  const chips = i < 0 ? [] : [...body.querySelectorAll('.bk-h')[i].nextElementSibling.querySelectorAll('button')];
  const R = sheet.getBoundingClientRect();
  const over = [...body.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > R.right + 0.5 || b.left < R.left - 0.5); }).map(e => e.className || e.tagName);
  return { has: i >= 0, chips: chips.map(b => ({ t: b.textContent, on: b.getAttribute('aria-checked') === 'true', off: b.disabled, h: Math.round(b.getBoundingClientRect().height) })),
    note: i < 0 ? '' : (() => { let t = '', e = body.querySelectorAll('.bk-h')[i].nextElementSibling.nextElementSibling; while (e && !e.classList.contains('bk-h')) { t += e.textContent + ' '; e = e.nextElementSibling; } return t; })(), over, emoji: body.textContent.match(/\p{Extended_Pictographic}/gu) || [] };
}, id);

for (const w of [360, 390]) {
  const { p, c } = await page(BASE, w); await addBooks(p, PHIL, KIDS);
  let a = await card(p, 'u_phil');
  ok(w + ' тест: у плотной философии раздел «Сложность», 5 кнопок, выбрана «Запредельная», все доступны', a.has && a.chips.length === 5 && a.chips[4].on && a.chips.every(x => !x.off) && a.chips[4].t === 'Запредельная ×3', a.chips);
  /* 21.10: names per skin (Джессика: «название которых в каждом скине разное») */
  const sk = await p.evaluate(() => { const h = document.documentElement, was = h.dataset.skin; const out = {};
    for (const k of ['ellada', 'babochkovyi', 'celestial', 'pencil']) { h.dataset.skin = k; bookInfo('u_phil'); out[k] = [...el('bookSheetBody').querySelectorAll('.chips[aria-label="Сложность книги"] button')].map(b => b.textContent); }
    h.dataset.skin = 'ellada'; out.sum = summaryLevelLine({ lvl: 3, rowLvl: 3 }).t;
    if (was) h.dataset.skin = was; else delete h.dataset.skin; return out; });
  ok(w + ' скины: свои названия ступеней (Эллада «Смертный…Олимп», Бабочковый «Гусеница…Монарх», Небесный «Звезда…Вселенная», Карандашный «Набросок…Шедевр»), итог «Сложность «Титан»»',
    sk.ellada.join('|') === 'Смертный|Герой ×1,5|Полубог ×2|Титан ×2,5|Олимп ×3' && sk.babochkovyi[0] === 'Гусеница' && sk.babochkovyi[4] === 'Монарх ×3' &&
    sk.celestial[0] === 'Звезда' && sk.celestial[4] === 'Вселенная ×3' && sk.pencil[0] === 'Набросок' && sk.pencil[4] === 'Шедевр ×3' && sk.sum === 'Сложность «Титан»: опыт ×2,5', sk);
  ok(w + ' ничего не вылезает за карточку, без эмодзи', a.over.length === 0 && a.emoji.length === 0, { over: a.over.slice(0, 4), emoji: a.emoji });
  if (SHOTS) { await p.evaluate(() => { const b = el('bookSheetBody'); const h = [...b.querySelectorAll('.bk-h')].find(x => x.textContent === 'Сложность'); h.scrollIntoView({ block: 'center' }); }); await sleep(200); await p.screenshot({ path: SHOTS + '/card-' + w + '.png' }); }
  const k = await card(p, 'u_kids');
  ok(w + ' детская книга: «Обычная» выбрана, остальные неактивны', k.has && k.chips[0].on && k.chips.slice(1).every(x => x.off), k.chips);
  const hg = await card(p, 'u_hegel');
  ok(w + ' PDF без текста: уровень по автору (Гегель → «Запредельная»)', hg.has && hg.chips[4].on, hg.chips);
  const s1 = await p.evaluate(() => { setBookLvl('u_phil', 1); const a = S.bookLvl.u_phil; setBookLvl('u_kids', 2); const b = 'u_kids' in S.bookLvl;
    const o = trackerOpts.call(null); return { a, b, lvl: bookLvlOf(allBooks().find(x => x.id === 'u_phil')) }; });
  ok(w + ' понизить: «Сложная» сохраняется (bookLvl 1); повысить детскую нельзя (ничего не пишется)', s1.a === 1 && !s1.b && s1.lvl === 1, s1);
  a = await card(p, 'u_phil');
  ok(w + ' после понижения выбрана «Сложная», «Запредельная» всё ещё доступна (можно вернуть)', a.chips[1].on && !a.chips[4].off, a.chips);
  const s2 = await p.evaluate(() => { setBookLvl('u_phil', 4); return 'u_phil' in S.bookLvl; });
  ok(w + ' вернуть авто: ключ удаляется', !s2);
  await c.close();
}

/* 22.10: own pace and the neural network (Джессика: «Давай первое. И четвертое») */
{ const { p, c } = await page(BASE, 390); await addBooks(p, PHIL, KIDS);
  const r = await p.evaluate(async () => {
    const out = {}; const b0 = BOOKS[0].id, b1 = BOOKS[1].id;
    const row = (id, min, turns) => ({ id: 's' + Math.random(), date: today(), bookId: id, minutes: min, pageTurns: turns });
    SESS.push(row(b0, 10, 20), row(b0, 10, 20), row(b1, 10, 20), row(b1, 10, 20), row(b1, 10, 20));
    SESS.push(row('u_kids', 15, 10), row('u_kids', 15, 10), row('u_kids', 15, 10)); /* 1.5 min/turn vs 0.5 → ratio 3 */
    show('library'); bookInfo('u_kids');
    const chips = () => [...el('bookSheetBody').querySelectorAll('.chips[aria-label="Сложность книги"] button')].map(b => b.getAttribute('aria-checked') === 'true');
    out.pace = chips(); out.paceNote = (el('bkLvlPace') || {}).textContent || ''; out.hint = !!el('bkLvlAiHint') && !el('bkLvlAiBtn');
    S.ai = Object.assign({}, S.ai || {}, { prov: 'openai', key: 'test-key' });
    let asked = null; window.aiViaKey = async (m) => { asked = m; return 'Ответ: {"level": 3, "why": "Плотные философские термины"}'; };
    bookInfo('u_kids'); el('bkLvlAiBtn').click();
    for (let i = 0; i < 50 && !(S.bookLvlAi && S.bookLvlAi.u_kids); i++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 200));
    out.ai = S.bookLvlAi && S.bookLvlAi.u_kids; out.aiChips = chips(); out.aiNote = (el('bkLvlAiRes') || {}).textContent || '';
    out.askedText = !!(asked && /Отрывки из книги/.test(asked.user) && /Жил-был кот/.test(asked.user)); out.btnAgain = (el('bkLvlAiBtn') || {}).textContent || '';
    window.aiViaKey = async () => 'не знаю'; el('bkLvlAiBtn').click(); await new Promise(r => setTimeout(r, 400));
    out.keptAfterBad = S.bookLvlAi.u_kids.l;
    out.lvlOf = bookLvlOf(allBooks().find(x => x.id === 'u_kids'));
    save(); const ex = await __rq.exportBackup(); out.ex = ex.progress && ex.progress.bookLvlAi;
    return out;
  });
  ok('темп: детская книга, которую читаешь втрое медленнее обычного → «Очень сложная», пояснение в карточке', r.pace[2] && /в 3 раза дольше/.test(r.paceNote), r);
  ok('без ключа: вместо кнопки подсказка про «Нейросети»', r.hint);
  ok('нейросеть: кнопка отправляет отрывки, ответ 3 → «Экспертная» выбрана, пояснение и «ещё раз»', r.ai && r.ai.l === 3 && r.aiChips[3] && r.askedText && /Экспертная/.test(r.aiNote) && /Плотные философские/.test(r.aiNote) && /ещё раз/.test(r.btnAgain), r);
  ok('нейросеть: непонятный ответ ничего не портит; уровень книги 3; экспорт несёт bookLvlAi', r.keptAfterBad === 3 && r.lvlOf === 3 && r.ex && r.ex.u_kids && r.ex.u_kids.l === 3, r);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const kept = await p.evaluate(() => S.bookLvlAi && S.bookLvlAi.u_kids);
  ok('после перезагрузки оценка нейросети на месте', kept && kept.l === 3 && kept.w === 'Плотные философские термины', kept);
  if (SHOTS) { await p.evaluate(() => { show('library'); bookInfo('u_kids'); const h = [...el('bookSheetBody').querySelectorAll('.bk-h')].find(x => x.textContent === 'Сложность'); h.scrollIntoView({ block: 'start' }); }); await sleep(300); await p.screenshot({ path: SHOTS + '/card-ai-390.png' }); }
  await c.close();
}

/* tracker options, summary lines, persistence */
{ const { p, c } = await page(BASE, 390); await addBooks(p, PHIL, KIDS);
  const t = await p.evaluate(async () => { await openBook('u_phil'); await new Promise(r => setTimeout(r, 300)); const o = trackerOpts(); const k = (await (async () => { await closeReader({ quiet: true }); await openBook('u_kids'); await new Promise(r => setTimeout(r, 300)); return trackerOpts(); })()); await closeReader({ quiet: true }); return { o, k }; });
  ok('открыта «Запредельная»: трекер получает level 4 и лимит 10 мин', t.o.level === 4 && t.o.capMs === 10 * 60000, t.o);
  ok('открыта детская: level 0 и прежний лимит 3 мин', t.k.level === 0 && t.k.capMs === 3 * 60000, t.k);
  const sm = await p.evaluate(() => {
    const base = { xp: 150, gold: 0, pages: 6, min: 10, stat: 'Воля', statGain: 1, newB: [], lvBefore: 1, justFinished: false, mult: 1, flipped: 6, cheatFinish: false, dName: '', dmul: 1, newAch: [], achNew: [], day: today(), title: 'Критика' };
    renderSummary(Object.assign({}, base, { quest: { daily: [], weekly: [], lvlGold: 10, lvl: 2, rowLvl: 2 } })); show('summary'); const a = el('sumQuestGold').textContent;
    renderSummary(Object.assign({}, base, { quest: { daily: [], weekly: [], lvlGold: 0, lvl: 2, rowLvl: 0 } })); const b = el('sumQuestGold').textContent;
    renderSummary(Object.assign({}, base, { quest: { daily: [], weekly: [], lvlGold: 0, lvl: 0, rowLvl: 0 } })); const d = el('sumQuestGold').classList.contains('hidden');
    renderSummary(Object.assign({}, base, { quest: { daily: [], weekly: [], lvlGold: 10, lvl: 2, rowLvl: 2 } }));
    return { a, b, d };
  });
  ok('итог: «+10 монет — бонус за сложность книги» и «Сложность «Очень сложная»: опыт ×2»', /\+10 монет — бонус за сложность книги/.test(sm.a) && /Сложность «Очень сложная»: опыт ×2/.test(sm.a), sm.a);
  ok('итог: быстрое листание — «бонус за сложность не начислен»', /Листали быстрее.*бонус за сложность не начислен/.test(sm.b), sm.b);
  ok('итог обычной книги без строк уровня', sm.d);
  if (SHOTS) { await sleep(300); await p.screenshot({ path: SHOTS + '/summary-390.png' }); }
  /* award flow in the app: one row with lvl 2 → XP ×2 and the bonus, paid once */
  const aw = await p.evaluate(async () => {
    const g0 = S.gold, x0 = S.xp;
    const row = await __rq.logSession({ bookId: 'u_phil', minutes: 12, pageTurns: 10, startedAt: Date.now(), lvl: 2 }); SESS.push(row);
    const r1 = awardPendingSessions(); const r2 = awardPendingSessions();
    save(); const ex = await __rq.exportBackup();
    return { xp: S.xp - x0, gold: S.gold - g0, lvlGold: r1.lvlGold, again: r2.gold + r2.xp, rowLvl: row.lvl, paid: JSON.stringify(S.lvlPaid), exRow: (ex.sessions || []).find(r => r.id === row.id), exLvlPaid: ex.game && ex.game.lvlPaid };
  });
  ok('12 мин очень сложной: +240 XP, +10 бонуса (+30 ежедневки), второй проход 0', aw.xp === 240 && aw.lvlGold === 10 && aw.gold === 40 && aw.again === 0, aw);
  ok('экспорт: lvl в строке сессии и lvlPaid в game', aw.exRow && aw.exRow.lvl === 2 && aw.exLvlPaid && Object.values(aw.exLvlPaid)[0] === 10, { row: aw.exRow, lp: aw.exLvlPaid });
  await p.evaluate(() => { setBookLvl('u_phil', 1); });
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const rl = await p.evaluate(() => ({ bl: S.bookLvl.u_phil, lp: Object.values(S.lvlPaid)[0], row: SESS.some(r => r.lvl === 2) }));
  ok('после перезагрузки: bookLvl, lvlPaid и lvl строки на месте', rl.bl === 1 && rl.lp === 10 && rl.row, rl);
  const im = await p.evaluate(async () => {
    const ex = await __rq.exportBackup(); ex.progress.bookLvl = { u_phil: 7, u_kids: 'x', ok: 0 }; ex.game.lvlPaid = { bad: 5, '2026-10-19': -1, '2026-10-18': 15 };
    await __rq.importBackup(ex); const back = await __rq.loadEnvelope ? __rq.loadEnvelope() : null;
    return { bl: back && back.progress.bookLvl, lp: back && back.game.lvlPaid };
  });
  ok('импорт: кривые значения отбрасываются (7, «x», плохой день, −1), годные остаются', im.bl && JSON.stringify(im.bl) === '{"ok":0}' && JSON.stringify(im.lp) === '{"2026-10-18":15}', im);
  const old = await p.evaluate(async () => { const ex = await __rq.exportBackup(); delete ex.progress.bookLvl; delete ex.game.lvlPaid; (ex.sessions || []).forEach(r => delete r.lvl); await __rq.importBackup(ex); const e = __rq.loadEnvelope(); return { bl: e.progress.bookLvl, lp: e.game.lvlPaid }; });
  ok('старый бэкап без новых полей импортируется, умолчания {}', JSON.stringify(old.bl) === '{}' && JSON.stringify(old.lp) === '{}', old);
  await c.close();
}

/* PDF (Джессика 19.10 «Давай чтение по ПДФ»): level from the text of sampled pages — on import, and once on open for older cards */
{ const { execFileSync } = await import('node:child_process'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rqlvl-'));
  const EN_PHIL = 'The transcendental unity of apperception is that unity through which all the manifold given in an intuition is united in a conception of the object. Consequently the possibility of experience is the condition of the objective validity of all our cognitions a priori, and the necessity of this connection is the foundation of the understanding as a faculty of judgement and representation.';
  const EN_KIDS = 'Mary had a little lamb. Its fleece was white as snow. The cat sat on the mat. The dog ran to the park. We like to play in the sun all day.';
  const py = `import sys,textwrap
from reportlab.pdfgen import canvas
def mk(fn,txt,pages):
    c=canvas.Canvas(fn)
    for i in range(pages):
        y=800
        for line in textwrap.wrap((txt+' ')*7,95):
            c.drawString(40,y,line); y-=14
        c.showPage()
    c.save()
mk(sys.argv[1],sys.argv[3],30); mk(sys.argv[2],sys.argv[4],30)
c=canvas.Canvas(sys.argv[5])
for i in range(10): c.rect(40,40,500,700,fill=1); c.showPage()
c.save()
c=canvas.Canvas(sys.argv[6]); c.setAuthor('Jacques Derrida'); c.setTitle('scan_0001')
for i in range(10): c.rect(40,40,500,700,fill=1); c.showPage()
c.save()`;
  const f = n => path.join(dir, n);
  execFileSync('python3', ['-c', py, f('phil.pdf'), f('kids.pdf'), EN_PHIL, EN_KIDS, f('scan.pdf'), f('derrida.pdf')]);
  const b64 = n => fs.readFileSync(f(n)).toString('base64');
  const { p, c } = await page(BASE, 390);
  const imp = await p.evaluate(async (files) => {
    const out = {};
    for (const [name, b] of Object.entries(files)) {
      const bin = Uint8Array.from(atob(b), ch => ch.charCodeAt(0));
      const bk = await importBookFile(new File([bin], name, { type: 'application/pdf' }), () => {});
      out[name] = { id: bk.id, lvlText: bk.lvlText, lvlV: bk.lvlV, auto: bookLvlAuto(bk) };
    }
    return out;
  }, { 'phil.pdf': b64('phil.pdf'), 'kids.pdf': b64('kids.pdf'), 'scan.pdf': b64('scan.pdf'), 'derrida.pdf': b64('derrida.pdf') });
  ok('импорт PDF: философия → lvlText 4, детский → 0, скан без текста → 0, скан с автором Деррида в свойствах PDF → 4; версия правила записана', imp['phil.pdf'].lvlText === 4 && imp['kids.pdf'].lvlText === 0 && imp['scan.pdf'].lvlText === 0 && imp['phil.pdf'].lvlV === 4 && imp['derrida.pdf'].lvlText === 4 && imp['derrida.pdf'].auto === 4, imp);
  const pc = await card(p, imp['phil.pdf'].id);
  ok('карточка PDF-философии: выбрана «Запредельная», «Определена по тексту»', pc.chips[4] && pc.chips[4].on && /Определена по тексту/.test(pc.note), pc);
  /* an older card (imported before this build) has no lvlText: checked once when the book is opened */
  const op = await p.evaluate(async (id) => {
    const b = allBooks().find(x => x.id === id); delete b.lvlText; delete __lvlAuto[id]; save();
    await openBook(id); const before = trackerOpts().level;
    for (let i = 0; i < 60 && !Number.isInteger(b.lvlText); i++) await new Promise(r => setTimeout(r, 100));
    const snap = __tracker.snapshot(), after = trackerOpts().level;
    await closeReader({ quiet: true });
    return { before, after, lvlText: b.lvlText, cap: snap.pageCapMs, row: SESS.slice(-1)[0] };
  }, imp['phil.pdf'].id);
  ok('старая карточка PDF: при открытии уровень 0, через пару секунд текст проверен (lvlText 4), лимит страницы 10 мин', op.before === 0 && op.after === 4 && op.lvlText === 4 && op.cap === 10 * 60000, op);
  /* 21.10: a card checked by the older rule (lvlText 1, no lvlV) is re-checked once on open */
  const rv = await p.evaluate(async (id) => {
    const b = allBooks().find(x => x.id === id); b.lvlText = 1; delete b.lvlV; delete __lvlAuto[id]; save();
    await openBook(id); const before = trackerOpts().level;
    for (let i = 0; i < 60 && b.lvlV !== window.__rqGame.LVL_ALGO; i++) await new Promise(r => setTimeout(r, 100));
    const after = trackerOpts().level; await closeReader({ quiet: true });
    await openBook(id); await new Promise(r => setTimeout(r, 2500)); const again = b.lvlV; await closeReader({ quiet: true });
    return { before, after, lvlText: b.lvlText, lvlV: b.lvlV, again };
  }, imp['phil.pdf'].id);
  ok('карточка PDF со старым правилом: сначала старый уровень 1, потом пересчёт до 4 (lvlV 4), второй раз не считается', rv.before === 1 && rv.after === 4 && rv.lvlText === 4 && rv.lvlV === 4 && rv.again === 4, rv);
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  const kept = await p.evaluate((ids) => ids.map(id => (allBooks().find(x => x.id === id) || {}).lvlText), [imp['phil.pdf'].id, imp['scan.pdf'].id]);
  ok('после перезагрузки lvlText в карточках на месте (4 и 0), повторно не считается', kept[0] === 4 && kept[1] === 0, kept);
  await c.close(); fs.rmSync(dir, { recursive: true, force: true });
}

/* root (rq): feature off — no section, no level in the tracker */
{ const { p, c } = await page(MAIN, 390); await addBooks(p, PHIL, KIDS);
  const a = await card(p, 'u_phil');
  const t = await p.evaluate(async () => { await openBook('u_phil'); await new Promise(r => setTimeout(r, 300)); const o = trackerOpts(); await closeReader({ quiet: true }); return o; });
  ok('корень: раздела «Сложность» нет, трекер без уровня и с лимитом 3 мин', !a.has && t.level === 0 && t.capMs === 3 * 60000, { has: a.has, t });
  await c.close(); }

ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY lvlcard.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
