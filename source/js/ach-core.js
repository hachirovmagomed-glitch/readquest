'use strict';
/* ================= ДОСТИЖЕНИЯ v2: каталог и подсчёт (чистые функции) =================
   План одобрен Джессикой 15.10 (тред «Система ачивок»): 106 достижений в 11 разделах, награда — очки коллекции, звания и рамки,
   монет и множителя XP нет. Всё считается ТОЛЬКО из засчитанного чтения: sessions[] (минуты после лимита 3 мин на страницу,
   листания от 12 с; прыжки, «Слушать», фон в минуты не попадают), S.finished (правило 70 % в closeReader), цитаты, XP.
   Время суток — из startedAt сессии, день — из row.date (местный день начала). Без DOM: тот же файл грузит test/ach.test.mjs.
   evaluate(input) → {id: {cur, target, done}}; запись и экран — js/achievements.js. */
(function (root) {
  const SECTIONS = [
    { id: 'hours', name: 'Часы чтения', icon: 'clock' },
    { id: 'habit', name: 'Привычка', icon: 'flame' },
    { id: 'books', name: 'Книги', icon: 'book-open' },
    { id: 'sessions', name: 'Сессии', icon: 'timer' },
    { id: 'daytime', name: 'Время суток', icon: 'moon' },
    { id: 'calendar', name: 'Календарь', icon: 'calendar' },
    { id: 'returns', name: 'Возвращения', icon: 'rotate-cw' },
    { id: 'formats', name: 'Форматы и полка', icon: 'file-text' },
    { id: 'quotes', name: 'Цитаты', icon: 'notebook-pen' },
    { id: 'levels', name: 'Уровни', icon: 'star' },
    { id: 'secret', name: 'Секретные', icon: 'sparkles' },
  ];
  const TIERS = { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', legend: 'Легенда', secret: 'Секрет', legacy: 'Из прошлой версии' };
  const POINTS = { bronze: 10, silver: 25, gold: 50, legend: 100, secret: 50, legacy: 0 };
  const GOAL = 10; /* «10+ минут» в условиях дня и времени суток — та же цель дня, что у ежедневки */
  const STREAK_MIN = 2; /* мягкий стрик по истории, если приложение не передало свой порог (input.streakMin = STREAK_MIN из core-a.js); текущий S.streak считается тоже (max) */

  /* [id, раздел, ступень, название, описание, метрика, порог, звание?] — метрики в M ниже */
  const B = 'bronze', SV = 'silver', GD = 'gold', LG = 'legend', SC = 'secret';
  const ROWS = [
    ['first', 'hours', B, 'Первые шаги', 'Первая сессия от минуты', 'maxSession', 1],
    ['h1', 'hours', B, 'Первый час', '1 час чтения всего', 'minutes', 60],
    ['h5', 'hours', B, 'Пять часов', '5 часов чтения всего', 'minutes', 300],
    ['h10', 'hours', SV, 'Десять часов', '10 часов чтения всего', 'minutes', 600],
    ['h25', 'hours', SV, 'Сутки с книгой', '25 часов чтения всего', 'minutes', 1500],
    ['h50', 'hours', GD, 'Полсотни часов', '50 часов чтения всего', 'minutes', 3000],
    ['h100', 'hours', GD, 'Сто часов', '100 часов чтения всего', 'minutes', 6000, 'Часовщик страниц'],
    ['h250', 'hours', LG, 'Двести пятьдесят', '250 часов чтения всего', 'minutes', 15000],
    ['h500', 'hours', LG, 'Пятьсот часов', '500 часов чтения всего', 'minutes', 30000],

    ['d3', 'habit', B, 'Три дня', '3 дня с чтением от 10 минут', 'goalDays', 3],
    ['d7', 'habit', B, 'Семь дней', '7 дней с чтением от 10 минут', 'goalDays', 7],
    ['d14', 'habit', SV, 'Две недели дней', '14 дней с чтением от 10 минут', 'goalDays', 14],
    ['d30', 'habit', SV, 'Месяц дней', '30 дней с чтением от 10 минут', 'goalDays', 30],
    ['d60', 'habit', GD, 'Шестьдесят дней', '60 дней с чтением от 10 минут', 'goalDays', 60],
    ['d100', 'habit', GD, 'Сто дней', '100 дней с чтением от 10 минут', 'goalDays', 100, 'Человек привычки'],
    ['d200', 'habit', LG, 'Двести дней', '200 дней с чтением от 10 минут', 'goalDays', 200],
    ['d365', 'habit', LG, 'Год дней', '365 дней с чтением от 10 минут', 'goalDays', 365],
    ['streak3', 'habit', B, 'Огонёк', 'Серия 3 дня подряд', 'streak', 3],
    ['streak7', 'habit', B, 'Неделя силы', 'Серия 7 дней подряд', 'streak', 7],
    ['streak14', 'habit', SV, 'Две недели подряд', 'Серия 14 дней подряд', 'streak', 14],
    ['streak30', 'habit', SV, 'Месяц подряд', 'Серия 30 дней подряд', 'streak', 30, 'Неугасимый'],
    ['streak60', 'habit', GD, 'Два месяца подряд', 'Серия 60 дней подряд', 'streak', 60],
    ['streak100', 'habit', GD, 'Сто дней подряд', 'Серия 100 дней подряд', 'streak', 100],
    ['streak365', 'habit', LG, 'Год подряд', 'Серия 365 дней подряд', 'streak', 365],
    ['wk1', 'habit', B, 'Неделя с целью', 'Неделя (пн–вс) с 4 днями по 10 минут', 'goalWeeks', 1],
    ['wk4', 'habit', SV, 'Четыре недели', '4 недели с 4 днями по 10 минут', 'goalWeeks', 4],
    ['wk12', 'habit', SV, 'Квартал недель', '12 недель с 4 днями по 10 минут', 'goalWeeks', 12],
    ['wk26', 'habit', GD, 'Полгода недель', '26 недель с 4 днями по 10 минут', 'goalWeeks', 26],
    ['wk52', 'habit', LG, 'Год недель', '52 недели с 4 днями по 10 минут', 'goalWeeks', 52],
    ['full7', 'habit', SV, 'Без выходных', 'Все 7 дней одной недели по 10 минут', 'fullWeek', 1, 'Без выходных'],
    ['month', 'habit', GD, 'Месяц без пропусков', 'Каждый день календарного месяца по 10 минут', 'fullMonth', 1, 'Железная воля'],

    ['fin1', 'books', B, 'Первая книга', 'Дочитать книгу', 'finished', 1],
    ['fin3', 'books', B, 'Три книги', 'Дочитать 3 книги', 'finished', 3],
    ['fin5', 'books', SV, 'Книголюб', 'Дочитать 5 книг', 'finished', 5],
    ['fin10', 'books', SV, 'Десять книг', 'Дочитать 10 книг', 'finished', 10, 'Книгочей'],
    ['fin25', 'books', GD, 'Двадцать пять книг', 'Дочитать 25 книг', 'finished', 25],
    ['fin50', 'books', GD, 'Полсотни книг', 'Дочитать 50 книг', 'finished', 50, 'Библиотекарь'],
    ['fin100', 'books', LG, 'Сто книг', 'Дочитать 100 книг', 'finished', 100],
    ['big500', 'books', SV, 'Толстяк', 'Дочитать книгу от 500 страниц', 'bigBook', 500],
    ['big1000', 'books', GD, 'Кирпич', 'Дочитать книгу от 1000 страниц', 'bigBook', 1000, 'Покоритель кирпичей'],
    ['fast7', 'books', SV, 'Залпом', 'Дочитать книгу за 7 дней от первой сессии', 'fastBook', 1],
    ['slow90', 'books', SV, 'Неспешно', 'Дочитать книгу, которую читали дольше 90 дней', 'slowBook', 1],
    ['author3', 'books', GD, 'Верность автору', 'Дочитать 3 книги одного автора', 'oneAuthor', 3, 'Верный читатель'],
    ['authors5', 'books', SV, 'Широкий круг', 'Дочитать книги 5 разных авторов', 'authors', 5],
    ['parallel3', 'books', SV, 'Жонглёр', 'За одну неделю по 10 минут в 3 разных книгах', 'weekBooks', 3],
    /* «Приключения» (arch.md 19.10): книги, скачанные из открытых библиотек (карточка с srcId) */
    ['lib1', 'books', B, 'Находка', 'Дочитать книгу из «Приключений»', 'libBooks', 1],
    ['lib3', 'books', SV, 'Искатель', 'Дочитать 3 книги из «Приключений»', 'libBooks', 3],
    ['lib10', 'books', GD, 'Книжный странник', 'Дочитать 10 книг из «Приключений»', 'libBooks', 10],
    ['lib2src', 'books', SV, 'Две библиотеки', 'Дочитать книги из двух разных библиотек', 'libSrc', 2],
    ['libset1', 'books', GD, 'Подборка закрыта', 'Дочитать все книги одной подборки «Приключений»', 'libSet', 1],

    ['marathon', 'sessions', B, 'Марафонец', 'Одна сессия от 30 минут', 'maxSession', 30],
    ['sess60', 'sessions', SV, 'Час без перерыва', 'Одна сессия от 60 минут', 'maxSession', 60],
    ['sess120', 'sessions', GD, 'Два часа подряд', 'Одна сессия от 120 минут', 'maxSession', 120, 'Марафонец'],
    ['day100', 'sessions', SV, 'Сотня за день', '100 минут за один день', 'maxDay', 100],
    ['day180', 'sessions', GD, 'Три часа за день', '180 минут за один день', 'maxDay', 180],
    ['sess10', 'sessions', B, 'Постоянство', '10 сессий от 5 минут', 'sessions5', 10],
    ['sess50', 'sessions', SV, 'Книжный червь', '50 сессий от 5 минут', 'sessions5', 50],
    ['sess100', 'sessions', SV, 'Сто сессий', '100 сессий от 5 минут', 'sessions5', 100],
    ['sess500', 'sessions', GD, 'Пятьсот сессий', '500 сессий от 5 минут', 'sessions5', 500],
    ['sess1000', 'sessions', LG, 'Тысяча сессий', '1000 сессий от 5 минут', 'sessions5', 1000],

    ['lark', 'daytime', B, 'Жаворонок', 'Сессия от 10 минут, начатая с 5 до 8 утра', 'lark', 1],
    ['lunch', 'daytime', B, 'Обеденный перерыв', 'Сессия от 10 минут, начатая с 12 до 14', 'lunch', 1],
    ['owl', 'daytime', B, 'Ночная сова', 'Сессия от 10 минут, начатая с 23 до 2 ночи', 'owl', 1],
    ['night3', 'daytime', SV, 'Три часа ночи', 'Сессия от 10 минут, начатая с 2 до 5 ночи', 'night3', 1],
    ['weekend', 'daytime', SV, 'Выходной марафон', '120 минут за субботу и воскресенье одних выходных', 'weekend', 120],
    ['morning10', 'daytime', SV, 'Утренний ритуал', '10 сессий от 10 минут, начатых с 5 до 10 утра', 'mornings', 10, 'Рассветный читатель'],
    ['night10', 'daytime', SV, 'Ночной дозор', '10 сессий от 10 минут, начатых с 22 до 4 ночи', 'nights', 10, 'Хранитель ночи'],
    ['hours24', 'daytime', LG, 'Круглые сутки', 'Сессии от 10 минут, начатые в каждый из 24 часов', 'hours24', 24, 'Круглосуточный'],

    ['ny', 'calendar', SV, 'Новогодняя страница', 'Читать 1 января от 10 минут', 'date', '01-01', 'Новогодний читатель'],
    ['nye', 'calendar', SV, 'Последняя страница года', 'Читать 31 декабря от 10 минут', 'date', '12-31'],
    ['bookday', 'calendar', B, 'День книги', 'Читать 23 апреля от 10 минут', 'date', '04-23'],
    ['rusday', 'calendar', B, 'День русского языка', 'Читать 6 июня от 10 минут', 'date', '06-06'],
    ['sep1', 'calendar', B, 'Первое сентября', 'Читать 1 сентября от 10 минут', 'date', '09-01'],
    ['halloween', 'calendar', B, 'Страшная история', 'Читать 31 октября от 10 минут', 'date', '10-31'],
    ['leap', 'calendar', GD, 'Високосный день', 'Читать 29 февраля от 10 минут', 'date', '02-29'],
    ['summer', 'calendar', B, 'Самый длинный день', 'Читать 21 июня от 10 минут', 'date', '06-21'],
    ['winter', 'calendar', B, 'Самая длинная ночь', 'Читать 21 декабря от 10 минут', 'date', '12-21'],
    ['weekends', 'calendar', SV, 'Все выходные месяца', 'Каждую субботу и воскресенье одного месяца по 10 минут', 'monthWeekends', 1],

    ['back7', 'returns', B, 'С возвращением', 'Вернуться к чтению после перерыва от 7 дней', 'comeback', 7],
    ['back30', 'returns', SV, 'Феникс', 'Вернуться к чтению после перерыва от 30 дней', 'comeback', 30, 'Феникс'],
    ['rebook', 'returns', SV, 'Вспомнить всё', '10 минут в книге, которую не открывали 30 дней', 'rebook', 1],
    ['refinish', 'returns', GD, 'Довести до конца', 'Дочитать книгу после перерыва в ней от 60 дней', 'refinish', 1, 'Упрямец'],
    ['refinish3', 'returns', LG, 'Второй шанс', 'Дочитать 3 книги после долгого перерыва', 'refinish', 3],

    ['collector', 'formats', B, 'Коллекционер', 'Своя книга, в ней от 10 минут чтения', 'ownRead', 1],
    ['pdf60', 'formats', B, 'Читатель PDF', '60 минут в PDF', 'fmt:pdf', 60],
    ['fb260', 'formats', B, 'Читатель FB2', '60 минут в FB2', 'fmt:fb2', 60],
    ['epub60', 'formats', B, 'Читатель EPUB', '60 минут в EPUB', 'fmt:epub', 60],
    ['txt60', 'formats', B, 'Простой текст', '60 минут в TXT', 'fmt:txt', 60],
    ['formats3', 'formats', SV, 'Всеядный', 'По 10 минут в 3 разных форматах', 'formats', 3, 'Всеядный'],
    ['own10', 'formats', GD, 'Своя библиотека', '10 своих книг, в каждой от 10 минут', 'ownRead', 10],

    ['q1', 'quotes', B, 'Первая цитата', 'Сохранить цитату', 'quotes', 1],
    ['q10', 'quotes', B, 'Десять цитат', 'Сохранить 10 цитат', 'quotes', 10],
    ['q50', 'quotes', SV, 'Полсотни цитат', 'Сохранить 50 цитат', 'quotes', 50, 'Собиратель цитат'],
    ['q200', 'quotes', GD, 'Двести цитат', 'Сохранить 200 цитат', 'quotes', 200],
    ['qbooks3', 'quotes', B, 'Цитатник', 'Цитаты из 3 разных книг', 'quoteBooks', 3],
    ['qbooks10', 'quotes', SV, 'Антология', 'Цитаты из 10 разных книг', 'quoteBooks', 10],

    ['lvl3', 'levels', B, 'Подмастерье', 'Достичь 3 уровня', 'level', 3],
    ['lvl5', 'levels', B, 'Бывалый', 'Достичь 5 уровня', 'level', 5],
    ['lvl10', 'levels', SV, 'Магистр', 'Достичь 10 уровня', 'level', 10, 'Магистр'],
    ['lvl15', 'levels', SV, 'Мастер слова', 'Достичь 15 уровня', 'level', 15],
    ['lvl20', 'levels', GD, 'Хранитель знаний', 'Достичь 20 уровня', 'level', 20],
    ['lvl30', 'levels', LG, 'Архимаг', 'Достичь 30 уровня', 'level', 30, 'Архимаг чтения'],

    ['s100', 'secret', SC, 'Ровно сто', 'Ровно 100 минут за один день', 'exactDay', 100, null, 'Круглое число за один день'],
    ['s1001', 'secret', SC, 'Тысяча и одна', '1001 минута чтения всего', 'minutesWhole', 1001, null, 'Сказочное число минут'],
    ['s2222', 'secret', SC, 'Двадцать два двадцать два', 'Сессия от 10 минут, начатая в 22:22', 's2222', 1, null, 'Одинаковые цифры на часах'],
    ['smirror', 'secret', SC, 'Зеркальная дата', 'Читать от 10 минут в дату-зеркало, например 10.01 или 12.21', 'mirror', 1, null, 'Число и месяц смотрят друг на друга'],
    ['stwin', 'secret', SC, 'Тёзки', 'Читать две книги с одинаковым словом в названии', 'twins', 1, null, 'Две книги чем-то похожи'],
    ['s13', 'secret', SC, 'Пятница, 13', 'Читать от 10 минут в пятницу 13-го', 'fri13', 1, null, 'Несчастливый день'],
    ['s7books', 'secret', SC, 'Семь книг за неделю', 'За одну неделю по 10 минут в 7 разных книгах', 'weekBooks', 7, null, 'Неделя большого разнообразия'],
    ['sonce', 'secret', SC, 'От корки до корки', 'Начать и дочитать книгу в один день', 'oneDayBook', 1, null, 'Одна книга, один день'],
    ['sdawn', 'secret', SC, 'Встретить рассвет', 'Сессия от 10 минут, начатая с 4 до 5 утра', 'dawn', 1, null, 'Пока все спят'],

    /* прошлая версия: показываются, только если уже открыты (поля achUnlocked), новых условий нет */
    ['xp1k', 'legacy', 'legacy', 'Тысячник', '1000 XP за всё время', 'never', 1],
    ['xp5k', 'legacy', 'legacy', 'Эрудит', '5000 XP за всё время', 'never', 1],
    ['goldA1k', 'legacy', 'legacy', 'Запасливый', '1000 монет заработано всего', 'never', 1],
    ['goldA5k', 'legacy', 'legacy', 'Богач', '5000 монет заработано всего', 'never', 1],
    ['sk5', 'legacy', 'legacy', 'Мастер навыка', 'Навык до 5 уровня', 'never', 1],
    ['char10', 'legacy', 'legacy', 'Развитый ум', 'Характеристика до 10 уровня', 'never', 1],
  ];
  const CAT = ROWS.map(function (r) {
    const a = { id: r[0], sec: r[1], tier: r[2], name: r[3], desc: r[4], m: r[5], n: r[6] };
    if (r[7]) a.title = r[7];
    if (r[8]) a.hint = r[8];
    if (r[1] === 'legacy') a.legacy = true;
    return a;
  });
  /* старые бейджи (S.badges) → id каталога; остальные бейджи и старые достижения совпадают по id */
  const ALIAS = { finisher: 'fin1' };
  const FRAMES = [
    { id: 'frame250', name: 'Тонкая', points: 250 },
    { id: 'frame500', name: 'Двойная', points: 500 },
    { id: 'frame1000', name: 'Акцентная', points: 1000 },
    { id: 'frame2000', name: 'Золотая', points: 2000 },
    { id: 'frame3500', name: 'Легендарная', points: 3500 },
    { id: 'frameSecret', name: 'Тайная', secrets: true },
  ];

  /* ---- даты: 'YYYY-MM-DD' → номер дня (UTC, без часовых поясов) ---- */
  function dn(k) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(k || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : NaN; }
  function dow(d) { return (new Date(d * 864e5).getUTCDay() + 6) % 7; } /* 0 = пн … 6 = вс */
  function key(d) { return new Date(d * 864e5).toISOString().slice(0, 10); }
  function startOf(r) { const v = r && r.startedAt; if (v == null || v === '') return null; const t = typeof v === 'number' ? v : Date.parse(String(v)); return Number.isFinite(t) && t > 0 ? new Date(t) : null; }
  function level(xp) { return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1; } /* та же формула, что level() приложения */
  const NOT_AUTHOR = { '': 1, 'pdf': 1, 'моя книга': 1, 'неизвестен': 1, 'неизвестный автор': 1 };
  function fmtOf(b) {
    if (!b) return null;
    if (b.type === 'pdf') return 'pdf';
    const m = /\.(fb2|epub|txt)$/i.exec(String(b.fname || ''));
    if (m) return m[1].toLowerCase();
    const g = String(b.genre || '').toLowerCase();
    return g === 'fb2' || g === 'epub' ? g : (b.own ? 'txt' : null);
  }
  function pagesOf(b) { if (!b) return 0; if (b.type === 'pdf') return Number(b.pages) || 0; return Math.floor((Number(b.textLen) || 0) / 1800); } /* 1800 знаков = страница (library.js) */
  function words(t) { return String(t || '').toLowerCase().split(/[^0-9a-zа-яё]+/i).filter(function (w) { return w.length >= 4; }); }

  /** Сводка по истории — один проход; ни один счётчик не зависит от порядка строк. */
  function stats(input) {
    const I = input || {};
    const goal = Number(I.goal) >= 1 ? Number(I.goal) : GOAL;
    const smin = Number(I.streakMin) >= 1 ? Number(I.streakMin) : STREAK_MIN;
    const books = {}; (I.books || []).forEach(function (b) { if (b && b.id != null) books[b.id] = b; });
    const rows = (I.sessions || []).filter(function (r) { return r && Number.isFinite(Number(r.minutes)) && Number(r.minutes) > 0 && Number.isFinite(dn(r.date)); });
    const dayMin = {}, bookMin = {}, bookDays = {}, bookDayMin = {};
    let total = 0, maxSession = 0, sessions5 = 0;
    const tod = { lark: 0, lunch: 0, owl: 0, night3: 0, mornings: 0, nights: 0, s2222: 0, dawn: 0, hours: {} };
    rows.forEach(function (r) {
      const m = Number(r.minutes), d = dn(r.date), b = r.bookId;
      total += m; dayMin[d] = (dayMin[d] || 0) + m; maxSession = Math.max(maxSession, m); if (m >= 5) sessions5++;
      if (b != null) { bookMin[b] = (bookMin[b] || 0) + m; (bookDays[b] = bookDays[b] || {})[d] = 1; const k = b + '|' + d; bookDayMin[k] = (bookDayMin[k] || 0) + m; }
      const st = startOf(r);
      if (st && m >= GOAL) {
        const h = st.getHours(), mi = st.getMinutes();
        tod.hours[h] = 1;
        if (h >= 5 && h < 8) tod.lark = 1;
        if (h >= 12 && h < 14) tod.lunch = 1;
        if (h === 23 || h < 2) tod.owl = 1;
        if (h >= 2 && h < 5) tod.night3 = 1;
        if (h === 4) tod.dawn = 1;
        if (h >= 5 && h < 10) tod.mornings++;
        if (h >= 22 || h < 4) tod.nights++;
        if (h === 22 && mi === 22) tod.s2222 = 1;
      }
    });
    const dayFloor = {}; Object.keys(dayMin).forEach(function (d) { dayFloor[d] = Math.floor(dayMin[d] + 1e-9); });
    const days = Object.keys(dayFloor).map(Number).sort(function (a, b) { return a - b; });
    const goalSet = {}; days.forEach(function (d) { if (dayFloor[d] >= goal) goalSet[d] = 1; });
    const goalDays = Object.keys(goalSet).length;
    /* серия: подряд идущие дни с floor ≥ STREAK_MIN */
    let run = 0, best = 0, prev = NaN;
    days.forEach(function (d) { if (dayFloor[d] < smin) return; run = d === prev + 1 ? run + 1 : 1; prev = d; best = Math.max(best, run); });
    best = Math.max(best, Number(I.streak) || 0);
    /* недели пн–вс */
    const wk = {}; Object.keys(goalSet).forEach(function (d) { d = +d; const w = d - dow(d); wk[w] = (wk[w] || 0) + 1; });
    const goalWeeks = Object.keys(wk).filter(function (w) { return wk[w] >= 4; }).length;
    const fullWeek = Object.keys(wk).some(function (w) { return wk[w] >= 7; }) ? 1 : 0;
    /* месяцы: каждый день / каждая суббота и воскресенье */
    const months = {}; Object.keys(goalSet).forEach(function (d) { const k = key(+d).slice(0, 7); months[k] = 1; });
    let fullMonth = 0, monthWeekends = 0;
    Object.keys(months).forEach(function (ym) {
      const y = +ym.slice(0, 4), mo = +ym.slice(5, 7), first = dn(ym + '-01'), len = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      let all = true, we = true;
      for (let i = 0; i < len; i++) { const d = first + i, g = !!goalSet[d]; if (!g) all = false; if (dow(d) >= 5 && !g) we = false; }
      if (all) fullMonth = 1; if (we) monthWeekends = 1;
    });
    /* выходные: суббота + воскресенье одних выходных */
    let weekend = 0;
    days.forEach(function (d) { if (dow(d) === 5) weekend = Math.max(weekend, Math.floor((dayMin[d] || 0) + (dayMin[d + 1] || 0) + 1e-9)); else if (dow(d) === 6 && !dayMin[d - 1]) weekend = Math.max(weekend, dayFloor[d]); });
    /* книги за неделю: по 10 минут в книге за неделю */
    const wb = {}; Object.keys(bookDayMin).forEach(function (k) { const i = k.lastIndexOf('|'), b = k.slice(0, i), d = +k.slice(i + 1), w = d - dow(d); const o = (wb[w] = wb[w] || {}); o[b] = (o[b] || 0) + bookDayMin[k]; });
    let weekBooks = 0; Object.keys(wb).forEach(function (w) { weekBooks = Math.max(weekBooks, Object.keys(wb[w]).filter(function (b) { return wb[w][b] >= GOAL; }).length); });
    /* даты: день с ≥ цели */
    const dates = {}; let mirror = 0, fri13 = 0, exactDay = 0, maxDay = 0;
    days.forEach(function (d) { maxDay = Math.max(maxDay, dayFloor[d]); if (dayFloor[d] === 100) exactDay = 100; });
    Object.keys(goalSet).forEach(function (d) { d = +d; const k = key(d), md = k.slice(5); dates[md] = 1;
      if (k.slice(8, 10) === k.slice(5, 7).split('').reverse().join('')) mirror = 1;
      if (k.slice(8, 10) === '13' && dow(d) === 4) fri13 = 1; });
    /* возвращения: день с ≥ цели после пустых дней (день чтения = хотя бы целая минута) */
    const readDays = days.filter(function (d) { return dayFloor[d] >= 1; });
    let comeback = 0;
    for (let i = 1; i < readDays.length; i++) if (goalSet[readDays[i]]) comeback = Math.max(comeback, readDays[i] - readDays[i - 1] - 1);
    let rebook = 0;
    Object.keys(bookDays).forEach(function (b) { const ds = Object.keys(bookDays[b]).map(Number).sort(function (x, y) { return x - y; });
      for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] >= 30 && (bookDayMin[b + '|' + ds[i]] || 0) >= GOAL) rebook = 1; });
    /* дочитанные (S.finished — правило 70 % в closeReader) */
    const fin = []; (I.finished || []).forEach(function (id) { if (fin.indexOf(id) < 0) fin.push(id); });
    const fd = I.finishDates || {};
    let bigBook = 0, fastBook = 0, slowBook = 0, refinish = 0, oneDayBook = 0; const byAuthor = {};
    fin.forEach(function (id) {
      const b = books[id]; bigBook = Math.max(bigBook, pagesOf(b));
      const a = b ? String(b.author || '').trim().toLowerCase() : ''; if (!NOT_AUTHOR[a]) byAuthor[a] = (byAuthor[a] || 0) + 1;
      const ds = Object.keys(bookDays[id] || {}).map(Number).sort(function (x, y) { return x - y; }), f = dn(fd[id]);
      if (ds.length && Number.isFinite(f)) {
        if (f - ds[0] <= 6 && f >= ds[0]) fastBook = 1;
        if (f - ds[0] >= 90) slowBook = 1;
        if (ds[0] === f && ds[ds.length - 1] === f) oneDayBook = 1;
      }
      for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] >= 60) { refinish++; break; }
    });
    const libSrcs = {}; let libBooks = 0;
    fin.forEach(function (id) { const b = books[id]; if (b && b.src) { libBooks++; libSrcs[b.src] = 1; } });
    const authorsN = Object.keys(byAuthor).length, oneAuthor = authorsN ? Math.max.apply(null, Object.keys(byAuthor).map(function (k) { return byAuthor[k]; })) : 0;
    /* форматы и свои книги */
    const fmtMin = {}; let ownRead = 0;
    Object.keys(bookMin).forEach(function (id) { const b = books[id], f = fmtOf(b); if (f) fmtMin[f] = (fmtMin[f] || 0) + bookMin[id]; if (b && b.own && bookMin[id] >= GOAL) ownRead++; });
    const formats = Object.keys(fmtMin).filter(function (f) { return fmtMin[f] >= GOAL; }).length;
    /* тёзки: две прочитанные (≥ 10 мин) книги с общим словом от 4 букв в названии */
    let twins = 0; const seenW = {};
    Object.keys(bookMin).forEach(function (id) { if (bookMin[id] < GOAL || !books[id]) return; const ws = {}; words(books[id].title).forEach(function (w) { ws[w] = 1; });
      Object.keys(ws).forEach(function (w) { if (seenW[w] && seenW[w] !== id) twins = 1; seenW[w] = seenW[w] || id; }); });
    /* цитаты: только в книгах с ≥ 10 мин, не больше одной на 2 засчитанные минуты книги */
    let quotes = 0, quoteBooks = 0; const Q = I.quotes || {};
    Object.keys(Q).forEach(function (id) { const n = Array.isArray(Q[id]) ? Q[id].length : 0, m = bookMin[id] || 0; const c = m >= GOAL ? Math.min(n, Math.floor(m / 2)) : 0; quotes += c; if (c > 0) quoteBooks++; });
    return {
      minutes: Math.floor(total + 1e-9), minutesWhole: Math.floor(total + 1e-9), maxSession: Math.floor(maxSession + 1e-9), maxDay: maxDay, sessions5: sessions5,
      goalDays: goalDays, streak: best, goalWeeks: goalWeeks, fullWeek: fullWeek, fullMonth: fullMonth, monthWeekends: monthWeekends,
      finished: fin.length, libBooks: libBooks, libSrc: Object.keys(libSrcs).length, libSet: +I.libSets || 0, bigBook: bigBook, fastBook: fastBook, slowBook: slowBook, oneAuthor: oneAuthor, authors: authorsN, weekBooks: weekBooks,
      lark: tod.lark, lunch: tod.lunch, owl: tod.owl, night3: tod.night3, dawn: tod.dawn, mornings: tod.mornings, nights: tod.nights, s2222: tod.s2222, hours24: Object.keys(tod.hours).length,
      weekend: weekend, dates: dates, mirror: mirror, fri13: fri13, exactDay: exactDay,
      comeback: comeback, rebook: rebook, refinish: refinish, oneDayBook: oneDayBook,
      fmt: fmtMin, formats: formats, ownRead: ownRead, twins: twins, quotes: quotes, quoteBooks: quoteBooks, level: level(I.xp),
    };
  }
  /** {id: {cur, target, done}} для каждого достижения каталога. Старые (legacy) по истории не открываются никогда. */
  function evaluate(input) {
    const s = stats(input), out = {};
    CAT.forEach(function (a) {
      let cur = 0, target = typeof a.n === 'number' ? a.n : 1;
      if (a.m === 'date') { cur = s.dates[a.n] ? 1 : 0; target = 1; }
      else if (a.m === 'exactDay') { cur = s.exactDay === a.n ? 1 : 0; target = 1; }
      else if (a.m.indexOf('fmt:') === 0) cur = Math.floor((s.fmt[a.m.slice(4)] || 0) + 1e-9);
      else if (a.m === 'never') cur = 0;
      else cur = Number(s[a.m]) || 0;
      out[a.id] = { cur: Math.min(cur, target), target: target, done: a.m !== 'never' && cur >= target };
    });
    return out;
  }
  function points(tier) { return POINTS[tier] || 0; }
  function alias(id) { return ALIAS[id] || id; }
  const api = { SECTIONS: SECTIONS, TIERS: TIERS, CAT: CAT, FRAMES: FRAMES, evaluate: evaluate, stats: stats, points: points, alias: alias, level: level, fmtOf: fmtOf, pagesOf: pagesOf };
  root.RQAch = api;
})(typeof window !== 'undefined' ? window : globalThis);
