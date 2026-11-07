/**
 * ReadQuest storage schema — version, defaults, domain splits.
 * Soft streak floor (3 min): game logic lives in js/core-a.js STREAK_MIN + closeReader; storage only keeps the number.
 */
export const SCHEMA_VERSION = 1;

/** Namespace (build-time, set by build-dist.sh via window.RQ_NS): 'rq' = main app, 'rqt' = test build.
 *  Every key / DB / lock / channel / cache is derived from it so a test build never touches main data. */
export const NS = (typeof globalThis !== 'undefined' && globalThis.RQ_NS) || 'rq';

/** localStorage keys (v1) */
export const KEYS = {
  envelope: NS + '_v1',
  settings: NS + '_set',
  /** legacy v6 monolith */
  legacyState: NS === 'rq' ? 'readquest' : NS + '_readquest',
  legacyMigratedFlag: NS + '_migrated_v1',
};

/** IndexedDB — one DB; never invent separate DBs for focus/anti-cheat */
export const IDB_NAME = NS === 'rq' ? 'readquest' : 'readquest-test';
/** v1 files (v6) → v2 sessions → v3 reading events (pageVisibleMs) */
export const IDB_VERSION = 3;
export const IDB_STORE = 'files';
export const IDB_STORE_SESSIONS = 'sessions';
export const IDB_STORE_EVENTS = 'events';

/** IDB key helpers — pdf: kept for v6 compat; text: for txt/epub/fb2 bodies */
export function idbKeyPdf(bookId) {
  return 'pdf:' + bookId;
}
export function idbKeyText(bookId) {
  return 'text:' + bookId;
}

/**
 * Progress domain — reading habit metrics & per-book reading state.
 * Streak soft floor ≥ 3 min (Маня 15.10, was 2): STREAK_MIN in js/core-a.js.
 * Daily quest / north-star still use goal (defaultMinutes: 10).
 */
export const PROGRESS_DEF = {
  streak: 0,
  lastDay: null,
  /** Architect: goal (defaultMinutes: 10). Was 15 in v6 DEF. */
  goal: 10,
  dayKey: null,
  minToday: 0,
  sessions: 0,
  totalMin: 0,
  totalPages: 0,
  progress: {},
  finished: [],
  hist: {},
  hourHist: null, // normalized to length-24 on hydrate
  finishDates: {},
  lastRead: null,
  planned: {},
  bookStats: {},
  bookDiff: {},
  /** 19.10 (arch.md «Сложность книги»): id → level 0…2 chosen by the reader; only LOWERS the automatic level */
  bookLvl: {},
  /** 22.10 (arch.md): id → {l: 0…4, w: why ≤ 160} — the neural network's level of the book (reader's own key); raises the automatic level */
  bookLvlAi: {},
  /** 23.10 (arch.md): id → reader's mark «Оценка неверная» {w: 0…4 wanted, d, title/author, the numbers behind the level}, ≤ 200 */
  bookLvlRep: {},
  /** 25.10 (arch.md «Честное чтение»): id → merged [from, to] spans (0…1) of the book already credited; ≤ 300 per book, ≤ 500 books */
  readSpans: {},
  /** arch.md 20.10: «Обсудить книгу» — {bookId: [{r:'u'|'a', t, d}]}, ≤ 20 сообщений на книгу, t ≤ 1500 */
  aiChat: {},
  /** 25.10 (arch.md «Дневники читателя»): дневники и блокноты, ≤ 200; цитаты и закладки не копируются */
  diaries: [],
  /** 25.10: у книги сам заводится дневник при первой цитате или закладке */
  diaryAuto: true,
  /** 06.11: порядок полки дневников recent|title|entries */
  diarySort: 'recent',
  /** 28.10 «Цитата дня» на главной: день (YYYY-MM-DD), до конца которого она скрыта (✕); null = показывается */
  qdayOff: null,
  /** 29.10 «Герои книги» (боковое меню выделения, js/sel-tools.js): id → names the reader marked, ≤ 200 per book, a name ≤ 40 */
  chars: {},
  bookStat: {},
  bookImp: {},
  status: {},
  marks: {},
  quotes: {},
  hl: {},
  stickers: {},
  /** 06.11 «Перо для полей» (arch.md): {<book id>: {<page 1…>: [{c, w, p:[x,y,…]}]}} — x, y in 0…1000 of the page view */
  ink: {},
  /** 06.11 «Наборы стикеров» (arch.md): {<book id>: [{p: page 1…, s: sticker id, x, y: 0…1000}]} (the old `stickers` field is left as it is) */
  stk: {},
  favs: [],
  lastBackup: null,
  backupNag: true,     // 29.10 «Напоминать о копии» (arch.md backupNag)
  backupNagAt: null,   // 29.10: day of the last reminder 'YYYY-MM-DD'
  yearGoal: null,      // 29.10 «Цель на год» {y, n} (arch.md yearGoal)
  bookGoals: {},       // 29.10 «Дочитать к дате» {<book id>: 'YYYY-MM-DD'} ≤ 200 (arch.md bookGoals)
};

/**
 * Game domain — RPG / economy / quests. Bodies never live here.
 */
export const GAME_DEF = {
  xp: 0,
  gold: 0,
  goldAllTime: 0,
  xpMult: 1,
  stats: {
    Интеллект: 0,
    Мудрость: 0,
    Харизма: 0,
    Воображение: 0,
    Воля: 0,
  },
  skills: null,
  skillMeta: {},
  badges: [],
  owned: [],
  claimed: {},
  rewards: null,
  customQuests: [],
  customStats: [],
  customAch: [],
  achUnlocked: [],
  /** Достижения v2 (arch.md 15.10): id → 'YYYY-MM-DD' дня записи; только дописывается */
  achDates: {},
  /** первый проход по истории: {d: 'YYYY-MM-DD', n} или null */
  achSeed: null,
  /** выбранные звание и рамка (id каталога js/ach-core.js), '' = нет */
  achTitle: '',
  achFrame: '',
  avatar: null,
  heroName: 'Читатель',
  statuses: null,
  talents: {},
  petXp: 0,
  /** LEGACY (claim button, ≤ build 20261006-1240): last claimed MVP daily date — read once by migrateClaimedToPaid, never written */
  dailyClaimed: null,
  /** LEGACY: week key of last claimed weekly — read by migrateClaimedToPaid, never written */
  weeklyClaimed: null,
  /** Auto-paid MVP daily (+30): local days YYYY-MM-DD already paid (build 3, additive; schemaVersion 1) */
  dailyPaidDays: [],
  /** Auto-paid MVP weekly (+120): week keys (Mon YYYY-MM-DD) already paid */
  weeklyPaidWeeks: [],
  /** 19.10 (arch.md «Сложность книги»): local day YYYY-MM-DD → level-bonus coins already paid that day */
  lvlPaid: {},
  /** 25.10 (arch.md «Честное чтение»): local day YYYY-MM-DD → XP paid for the mini-check that day (once a day) */
  quizPaid: {},
  pomoPaid: {},
  chalPaid: {},
  /** true once old claim dates (dailyClaimed/weeklyClaimed) were folded into the *Paid lists */
  paidMigrated: false,
  /** Legacy v6 daily-bonus button (full UI) */
  dailyClaim: null,
  boss: null,
  inventory: [],
  invHist: [],
  /** Architect: [{id, title, price, at}] ISO at */
  rewardPurchases: [],
  /** arch.md 16.10: cancelled real-life rewards [{id, purchaseId|null, title, price, at}] ISO at */
  rewardRefunds: [],
  /** sessions[].id (UUID) already turned into XP — idempotent awards (reload/import safe) */
  awardedSessionIds: [],
  /** Legacy → migrated to rewardPurchases in hydrateGame */
  rewardHist: [],
  ownedGear: [],
  equipped: {},
  hpMax: 50,
  hp: null,
  anti: null,
  notif: null,
  ai: null,
  /** arch.md 20.10: нейросетевая озвучка {prov, key, voice, base} */
  tts: null,
  aiPref: null, // 29.10 «Нейросети» (arch.md aiPref): {len,tone,lang,spoil,lim,use,trTo,via}, normAiPref
  ux: null,
  appTheme: 'teal',
  pixelOwned: false,
  pixelOn: false,
  lang: 'ru',
  useChar: true,
  char: {},
  vocab: [],
  devMoney: false,
  /** 06.11 «Инструменты читателя» (arch.md): {own, n, parts, pf, drop, hg, sh, sel, pin, on, rw}, normTools */
  tools: null,
};

/**
 * Library domain — shelf meta WITHOUT book text/ArrayBuffer bodies.
 * userBooks[].text is stripped; bodies live in IndexedDB.
 */
export const LIBRARY_DEF = {
  userBooks: [],
  hidden: [],
  shelfOrder: [],
  covers: {},
  autoDiff: true,
  /** arch.md 19.10 «Приключения»: «Хочу прочитать» [{sid, page?, n?, t, a, tr?, ed?, lang?}] ≤ 200 и последние поиски ≤ 8 */
  advWant: [],
  advRecent: [],
};

/** Reader settings (same shape as v6 SETDEF) */
export const SET_DEF = {
  font: 0,
  size: 19,
  lh: 1.65,
  theme: 'sepia',
  margin: 24,
  cTxt: null,
  cBg: null,
  align: 'j',
  hyph: true,
  indent: true,
  ls: 0,
  weight: 400,
  nav: null,
  mvp: true,
  focus: 'button',   // 1б: 'off' | 'button' | 'auto'
  pdfDim: 0.35,      // 1б: 0..0.5, step 0.05
  readCounter: true, // 1б: «7 / 10 мин» in focus
  pauseBtn: true, // 25.10 (arch.md): the floating pause circle in the reader
  pauseXY: null, // 25.10: its centre {x, y} as a share of the screen 0…1; null = default place
  bright: 1,         // 18.10: own brightness 0.3..1 (arch.md SET.bright)
  warm: 0,           // 18.10: warm tint 0..0.6
  pdfFont: false,    // 20.10: PDF text in the reader font (arch.md SET.pdfFont)
  pdfTheme: false,   // 20.10: PDF page in the page-theme colours (arch.md SET.pdfTheme)
  fz: null,          // 25.10 «Фокус»: {pomo,len,rest,quiet,snd,vol,words,warn} (arch.md SET.fz), normFz
  qSort: 'book',     // 28.10: order of quotes in «Навигация → Цитаты» and «Цитаты и заметки»: 'book' | 'new' | 'old'
  presets: [],       // 29.10 «Мои наборы» (arch.md SET.presets): ≤ 8 {n, v}, normPresets
  bookSet: {},       // 29.10 «Только к этой книге» (arch.md SET.bookSet): {<book id>: {...}} ≤ 200, normBookSet
  wsp: 0,           // 05.11 между словами, px 0…8 (arch.md SET.wsp)
  psp: 0,           // 05.11 между абзацами, em 0…1.5 шаг 0.25 (arch.md SET.psp)
  rm: null,          // 05.11 «ещё для чтения» (arch.md SET.rm, js/read-more.js), normRm
  half: null,        // 05.11 половина экрана (arch.md SET.half): {on,size,margin}, normHalf
  rx: null,          // 29.10 раздел «Чтение» (arch.md SET.rx): {foot,tts,night,gest,sel,screen,fresh,sm,spd}, normRx
  flip: null,        // 15.10 (Архитектор): page-turn settings {btns,tap,invert,swipe} + 16.10 {mode,anim}; null = default FLIP_DEF
};

/** SET.flip (arch.md 15.10) — same rules as js/reader.js flipNorm: not an object → dropped (default);
 *  no flip + nav is the OLD flip object (not a tab list) → copied once; nav is never deleted or rewritten. */
export const FLIP_DEF = { btns: false, tap: true, invert: false, swipe: true, mode: 'page', anim: 'none' };
const FLIP_KEYS = ['btns', 'tap', 'invert', 'swipe'];
/* 16.10 (arch.md «SET.flip.mode и SET.flip.anim»): whitelisted strings; junk → default */
const FLIP_STR = { mode: ['page', 'scroll'], anim: ['none', 'slide', 'fade', 'curl'] };
function flipFrom(o) {
  const f = {};
  FLIP_KEYS.forEach((k) => { f[k] = typeof o[k] === 'boolean' ? o[k] : FLIP_DEF[k]; });
  Object.keys(FLIP_STR).forEach((k) => { f[k] = FLIP_STR[k].includes(o[k]) ? o[k] : FLIP_DEF[k]; });
  return f;
}
export function normFlip(s) {
  if (s.flip != null && (typeof s.flip !== 'object' || Array.isArray(s.flip))) s.flip = null;
  if (s.flip) s.flip = flipFrom(s.flip);
  else if (s.nav && typeof s.nav === 'object' && !Array.isArray(s.nav) && FLIP_KEYS.some((k) => k in s.nav)) s.flip = flipFrom(s.nav);
  return s;
}

/** 18.10 (arch.md SET.bright / SET.warm): number clamped to [lo,hi] on a 0.05 grid; not a number → default */
export function normStep(v, lo, hi, def) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return def;
  return Math.round(Math.max(lo, Math.min(hi, v)) * 20) / 20;
}

export const FOCUS_MODES = ['off', 'button', 'auto'];
/** 25.10 SET.fz (arch.md «Фокус») — same rules as js/reader.js fzNorm */
export const FZ_DEF = { pomo: false, len: 25, rest: 5, quiet: false, snd: 0, vol: 0.5, words: true, warn: true };
export function normFz(o) {
  const d = FZ_DEF, f = {};
  o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  ['pomo', 'quiet', 'words', 'warn'].forEach((k) => { f[k] = typeof o[k] === 'boolean' ? o[k] : d[k]; });
  f.len = [15, 25, 45].includes(o.len) ? o.len : d.len;
  f.rest = [3, 5, 10].includes(o.rest) ? o.rest : d.rest;
  f.snd = [0, 1, 2, 3].includes(o.snd) ? o.snd : d.snd;
  f.vol = typeof o.vol === 'number' && Number.isFinite(o.vol) ? Math.round(Math.max(0.05, Math.min(1, o.vol)) * 20) / 20 : d.vol;
  return f;
}
/** 29.10 SET.presets / SET.bookSet (arch.md) — same rules as js/reader.js rqTypoPick / rqPresetsNorm / rqBookSetNorm */
export const BOOK_KEYS = ['font', 'size', 'lh', 'ls', 'weight', 'align', 'hyph', 'indent', 'margin', 'wsp', 'psp'];
export const PRESET_KEYS = BOOK_KEYS.concat(['bright', 'warm']);
export function typoPick(o, keys) {
  const n = (v, lo, hi, st) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(lo, Math.min(hi, v)) / st) * st : undefined), r = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return r;
  keys.forEach((k) => {
    const v = o[k];
    let x;
    if (k === 'font') x = typeof v === 'number' && v >= 0 && v < 64 && Math.floor(v) === v ? v : undefined;
    else if (k === 'size') x = n(v, 14, 30, 1);
    else if (k === 'lh') x = n(v, 1.2, 2.4, 0.05);
    else if (k === 'ls') x = n(v, -1, 3, 0.5);
    else if (k === 'margin') x = n(v, 10, 80, 1);
    else if (k === 'wsp') x = n(v, 0, 8, 1);
    else if (k === 'psp') x = n(v, 0, 1.5, 0.25);
    else if (k === 'weight') x = [300, 400, 600].includes(v) ? v : undefined;
    else if (k === 'align') x = v === 'j' || v === 'l' ? v : undefined;
    else if (k === 'hyph' || k === 'indent') x = typeof v === 'boolean' ? v : undefined;
    else if (k === 'bright') x = n(v, 0.3, 1, 0.05);
    else if (k === 'warm') x = n(v, 0, 0.6, 0.05);
    if (x !== undefined) r[k] = k === 'lh' || k === 'bright' || k === 'warm' ? +x.toFixed(2) : x;
  });
  return r;
}
export function normPresets(a) {
  return Array.isArray(a)
    ? a.filter((p) => p && typeof p === 'object' && typeof p.n === 'string' && p.n.trim()).slice(0, 8).map((p) => ({ n: p.n.trim().slice(0, 24), v: typoPick(p.v, PRESET_KEYS) }))
    : [];
}
export function normBookSet(o) {
  const r = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return r;
  Object.keys(o).filter((k) => k && k.length <= 200).slice(-200).forEach((k) => { const v = typoPick(o[k], BOOK_KEYS); if (Object.keys(v).length) r[k] = v; });
  return r;
}
/** 29.10 S.aiPref (arch.md «Нейросети») — same rules as js/core-b.js aiPrefNorm */
export function normAiPref(o) {
  o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const u = o.use && typeof o.use === 'object' && !Array.isArray(o.use) ? o.use : {};
  const en = (v, a) => (a.includes(v) ? v : a[0]), int = (v, hi) => (Number.isInteger(v) && v >= 0 ? Math.min(hi, v) : 0);
  return { len: en(o.len, ['short', 'long']), tone: en(o.tone, ['simple', 'expert']), lang: en(o.lang, ['ru', 'en', 'book']), spoil: typeof o.spoil === 'boolean' ? o.spoil : true, lim: int(o.lim, 500),
    use: { m: typeof u.m === 'string' && /^\d{4}-\d\d$/.test(u.m) ? u.m : '', n: int(u.n, 1e7), ch: int(u.ch, 1e10), tch: int(u.tch, 1e10), d: typeof u.d === 'string' && /^\d{4}-\d\d-\d\d$/.test(u.d) ? u.d : '', dn: int(u.dn, 1e5) },
    trTo: en(o.trTo, ['', 'ru', 'en', 'de', 'fr', 'es', 'it']), via: en(o.via, ['', 'chatgpt', 'grok', 'claude', 'deepseek', 'alice']) }; // via 05.11: своя нейросеть без ключа
}
/** 29.10 S.yearGoal / S.bookGoals (arch.md) — same rules as js/core-b.js yearGoalNorm / bookGoalsNorm */
export function normYearGoal(g) {
  return g && typeof g === 'object' && Number.isInteger(g.y) && g.y >= 2000 && g.y <= 2100 && Number.isInteger(g.n) && g.n >= 1 && g.n <= 365 ? { y: g.y, n: g.n } : null;
}
export function normBookGoals(o) {
  const r = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return r;
  Object.keys(o).filter((k) => k && k.length <= 200 && typeof o[k] === 'string' && /^\d{4}-\d\d-\d\d$/.test(o[k])).slice(-200).forEach((k) => { r[k] = o[k]; });
  return r;
}
/** 05.11 SET.half — same rules as js/reader.js rqHalfNorm */
export function normHalf(h) {
  h = h && typeof h === 'object' && !Array.isArray(h) ? h : {};
  const n = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
  return { on: typeof h.on === 'boolean' ? h.on : true, size: n(h.size, 14, 30), margin: n(h.margin, 10, 80) };
}
/** 29.10 SET.rx (arch.md «раздел Чтение») — same rules as js/reader.js rqRxNorm */
export const RX_SEL = ['colors', 'note', 'word', 'dict', 'ai', 'grow', 'copy'];
export function normRx(o) {
  const ob = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), bo = (v, d) => (typeof v === 'boolean' ? v : d),
    en = (v, a) => (a.includes(v) ? v : a[0]), hm = (v, d) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d),
    nm = (v) => (typeof v === 'string' ? v.trim().slice(0, 24) : ''),
    num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : null),
    ids = (a) => (Array.isArray(a) ? a.filter((x, i) => RX_SEL.includes(x) && a.indexOf(x) === i) : []);
  o = ob(o);
  const f = ob(o.foot), t = ob(o.tts), n = ob(o.night), g = ob(o.gest), s = ob(o.sel), sc = ob(o.screen), fr = ob(o.fresh), sp = ob(o.spd);
  return {
    foot: { page: bo(f.page, true), pct: bo(f.pct, false), clock: bo(f.clock, false), chap: bo(f.chap, false) },
    tts: { rate: typeof t.rate === 'number' && Number.isFinite(t.rate) ? Math.round(Math.max(0.5, Math.min(2, t.rate)) * 20) / 20 : 1, voice: typeof t.voice === 'string' ? t.voice.slice(0, 200) : '', follow: bo(t.follow, true) },
    night: { on: bo(n.on, false), from: hm(n.from, '22:00'), to: hm(n.to, '07:00'), day: typeof n.day === 'string' && n.day.length <= 32 ? n.day : '' },
    gest: { bright: bo(g.bright, true), pinch: bo(g.pinch, true), dbl: en(g.dbl, ['off', 'night', 'mark', 'bars', 'auto', 'dict']) },
    sel: { off: ids(s.off), order: ids(s.order), color: ['y', 'g', 'b', 'p', 'o'].includes(s.color) ? s.color : '' },
    screen: { orient: en(sc.orient, ['auto', 'portrait', 'landscape']), spread: en(sc.spread, ['auto', 'land', 'off']) },
    fresh: { set: nm(fr.set), pdf: nm(fr.pdf), toc: bo(fr.toc, false) },
    sm: ((m) => ({ lp: en(m.lp, ['n', 'f', 's']), tap: bo(m.tap, true), drag: en(m.drag, ['edge', 'any', 'off']), lpd: bo(m.lpd, true), unit: en(m.unit, ['word', 'char']), edge: en(m.edge, ['off', 'f', 's']), hand: en(m.hand, ['n', 'b']), vib: bo(m.vib, true), hint: bo(m.hint, true) }))(ob(o.sm)),
    spd: { cpm: num(sp.cpm, 100, 6000), spp: num(sp.spp, 5, 1200), n: typeof sp.n === 'number' && Number.isFinite(sp.n) ? Math.max(0, Math.min(1e6, Math.floor(sp.n))) : 0 },
  };
}
/** 05.11 SET.rm (arch.md «SET.rm — ещё для чтения») — same rules as js/reader.js rqRmNorm */
export const RM_ZONE = ['none', 'prev', 'next', 'bars', 'night', 'mark', 'auto', 'tts', 'rsvp'];
export function normRm(o) {
  const ob = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), bo = (v, d) => (typeof v === 'boolean' ? v : d),
    hm = (v, d) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d), nm = (v) => (typeof v === 'string' ? v.trim().slice(0, 24) : '');
  o = ob(o);
  const a = ob(o.auto), r = ob(o.ruler), t = ob(o.tod);
  return {
    bion: bo(o.bion, false), cap: bo(o.cap, false), maxw: [0, 55, 65, 75].includes(o.maxw) ? o.maxw : 0,
    ufont: typeof o.ufont === 'string' ? o.ufont.trim().slice(0, 40) : '',
    auto: { sec: typeof a.sec === 'number' && Number.isFinite(a.sec) && a.sec >= 5 && a.sec <= 600 ? Math.round(a.sec) : 0 },
    fn: bo(o.fn, true), orth: bo(o.orth, false), // 05.11 orth: pre-1918 spelling → modern in copies (js/reader-ui.js rqOrth)
    zones: Array.isArray(o.zones) && o.zones.length === 9 && o.zones.every((z) => RM_ZONE.includes(z)) ? o.zones.slice() : null,
    sleep: [0, 15, 30, 45, 60, -1].includes(o.sleep) ? o.sleep : 0, ttsHl: bo(o.ttsHl, true), recap: bo(o.recap, true),
    ruler: { on: bo(r.on, false), n: [1, 2, 3].includes(r.n) ? r.n : 1, auto: bo(r.auto, false) },
    eink: bo(o.eink, false),
    tod: { on: bo(t.on, false), day: nm(t.day), eve: nm(t.eve), from: hm(t.from, '20:00'), to: hm(t.to, '07:00') },
    dlg: bo(o.dlg, false), hard: bo(o.hard, false), chEnd: bo(o.chEnd, true), chQ: bo(o.chQ, true),
    rsvp: typeof o.rsvp === 'number' && o.rsvp >= 100 && o.rsvp <= 1000 ? Math.round(o.rsvp / 50) * 50 : 300,
    oneh: bo(o.oneh, false), edge: bo(o.edge, true),
    roles: { on: bo(ob(o.roles).on, false), v: typeof ob(o.roles).v === 'string' ? ob(o.roles).v.trim().slice(0, 80) : '', sv: typeof ob(o.roles).sv === 'string' ? ob(o.roles).sv.slice(0, 200) : '' },
    // 05.11 словари: dkShort — сначала одно значение, dkLong — долгое нажатие на слово = значение, dkQuiz — вопросы по словам при чтении
    dkShort: bo(o.dkShort, true), dkLong: bo(o.dkLong, false), dkQuiz: bo(o.dkQuiz, true),
  };
}
/** 1б import/boot contract (arch.md «Настройки 1б»): clamp, no migration from focusMode. */
export function normPdfDim(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0.35;
  return Math.round(Math.max(0, Math.min(0.5, v)) * 20) / 20;
}

const DEFAULT_SKILLS = ['Концентрация', 'Дисциплина', 'Аналитика', 'Скорочтение'];
const DEFAULT_SKILL_LINKS = {
  Концентрация: { Воля: 100, Интеллект: 30 },
  Дисциплина: { Воля: 100 },
  Аналитика: { Интеллект: 100, Мудрость: 40 },
  Скорочтение: { Интеллект: 60 },
};

/** Fields that belong to progress when splitting a flat v6 blob */
export const PROGRESS_KEYS = Object.keys(PROGRESS_DEF);
/** Fields that belong to game */
export const GAME_KEYS = Object.keys(GAME_DEF);
/** Fields that belong to library */
export const LIBRARY_KEYS = Object.keys(LIBRARY_DEF);

/**
 * Normalize nested defaults after merge (mirrors v6 hydrate, without side effects).
 */
/** 19.10: {key: whole number 0…max}; not an object / bad keys / bad values → dropped */
/** arch.md 20.10: {bookId: [{r:'u'|'a', t: string ≤ 1500, d: 'YYYY-MM-DD'|''}]} — not an object/array → dropped; last 20 per book */
function aiChatMap(o) {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    Object.keys(o).forEach(function (k) {
      if (!Array.isArray(o[k])) return;
      const l = o[k].filter(function (m) { return m && (m.r === 'u' || m.r === 'a') && typeof m.t === 'string' && m.t; })
        .map(function (m) { return { r: m.r, t: m.t.slice(0, 1500), d: typeof m.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.d) ? m.d : '' }; }).slice(-20);
      if (l.length) out[k] = l;
    });
  }
  return out;
}
function diaryList(a){ /* 25.10 «Дневники» (arch.md): [{id,t,b,bt,ba,cv,cc,pp,fn,fs,ink,rb,so,lh,al,d,u,e:[{id,t,x,tp,ch,pg,r,d,u,pin,cl}]}] ≤ 200, записей ≤ 1000 */
  const out=[],seen={},str=function(v,n){return typeof v==='string'?v.slice(0,n):'';},one=function(v,l,d){return l.indexOf(v)>=0?v:d;},
    day=function(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';},ms=function(v){return typeof v==='number'&&isFinite(v)&&v>=0?Math.floor(v):0;},
    key=function(v){return typeof v==='string'&&/^[a-z0-9-]{1,24}$/.test(v)?v:'';};
  if(!Array.isArray(a))return out;
  a.forEach(function(y){
    if(!y||typeof y!=='object'||typeof y.id!=='string'||!/^dy[a-z0-9]{1,22}$/.test(y.id)||seen[y.id]||out.length>=200)return;seen[y.id]=1;
    const es=[],eseen={};
    (Array.isArray(y.e)?y.e:[]).forEach(function(n){
      if(!n||typeof n!=='object'||typeof n.id!=='string'||!/^e[a-z0-9]{1,22}$/.test(n.id)||eseen[n.id]||es.length>=1000)return;
      const t=str(n.t,120),x=str(n.x,20000);if(!t&&!x)return;eseen[n.id]=1;
      es.push({id:n.id,t:t,x:x,tp:key(n.tp),ch:str(n.ch,120),pg:Number.isInteger(n.pg)&&n.pg>=0?n.pg:0,r:typeof n.r==='number'&&n.r>=0&&n.r<=1?n.r:null,d:day(n.d),u:ms(n.u),pin:n.pin===true,cl:one(n.cl,['','red','orange','yellow','green','blue','violet'],'')});});
    out.push({id:y.id,t:str(y.t,80),b:str(y.b,200),bt:str(y.bt,120),ba:str(y.ba,80),cv:key(y.cv)||'school',cc:key(y.cc),
      pp:one(y.pp,['lines','grid','dots','plain','old','papyrus','pearl','stars'],'lines'),fn:one(y.fn,['hand','book','ui'],'hand'),fs:Number.isInteger(y.fs)&&y.fs>=14&&y.fs<=24?y.fs:17,
      ink:one(y.ink,['ink','blue','brown','green','violet','terracotta','gold'],'ink'),rb:one(y.rb,['red','blue','green','gold','black'],'red'),so:one(y.so,['book','date'],'book'),pn:y.pn===true,lh:one(y.lh,['tight','normal','wide'],'normal'),al:one(y.al,['left','justify'],'left'),
      d:day(y.d),u:ms(y.u),e:es});});
  return out;
}
function lvlRepMap(o) { /* 23.10 «Оценка неверная» (arch.md): id → {w, d, t, au, k, a, tx, s, tm, m, au2, ti, p, ai}, ≤ 200 */
  const out={},lv=function(v){return Number.isInteger(v)&&v>=0&&v<=4?v:null;},num=function(v){return typeof v==='number'&&isFinite(v)?Math.round(v*10)/10:null;};
  if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).slice(-200).forEach(function(k){const v=o[k];
    if(!v||lv(v.w)==null||typeof v.d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.d))return;
    out[k]={w:v.w,d:v.d,t:typeof v.t==='string'?v.t.slice(0,120):'',au:typeof v.au==='string'?v.au.slice(0,80):'',k:v.k==='pdf'?'pdf':'text',
      a:lv(v.a),tx:lv(v.tx),s:num(v.s),tm:num(v.tm),m:num(v.m),au2:lv(v.au2),ti:lv(v.ti),p:num(v.p),ai:lv(v.ai)};});
  return out;
}
/** 25.10: {bookId: [[from, to], …]} — 0 ≤ from < to ≤ 1, sorted, non-overlapping, ≤ 300 per book, last 500 books; anything else dropped */
function spansMap(o) {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    Object.keys(o).slice(-500).forEach(function (k) {
      if (!Array.isArray(o[k])) return;
      let end = -1;
      const l = o[k].filter(function (x) {
        if (!Array.isArray(x) || x.length !== 2 || typeof x[0] !== 'number' || typeof x[1] !== 'number') return false;
        if (!(x[0] >= 0 && x[1] <= 1 && x[0] < x[1] && x[0] > end)) return false;
        end = x[1];
        return true;
      }).slice(0, 300).map(function (x) { return [x[0], x[1]]; });
      if (l.length) out[k] = l;
    });
  }
  return out;
}
function lvlAiMap(o) {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    Object.keys(o).forEach(function (k) {
      const v = o[k];
      if (v && Number.isInteger(v.l) && v.l >= 0 && v.l <= 4) out[k] = { l: v.l, w: typeof v.w === 'string' ? v.w.slice(0, 160) : '' };
    });
  }
  return out;
}
function intMap(o, max, keyRe) {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    Object.keys(o).forEach(function (k) {
      const v = o[k];
      if (Number.isInteger(v) && v >= 0 && v <= max && (!keyRe || keyRe.test(k))) out[k] = v;
    });
  }
  return out;
}

/* ===== 06.11 «Инструменты читателя» (arch.md). The same rules as js/tools.js toolsNorm / inkNorm / stickNorm. ===== */
export const TOOL_IDS = ['lupa', 'pen', 'shield', 'hg', 'compass', 'markers', 'rulers', 'marks', 'stickers', 'qtpl', 'lamp', 'words'];
export const TOOL_USE = ['shield', 'hg'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function int(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi ? v : null; }
export function normTools(o) {
  o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const t = { own: {}, n: {}, parts: {}, pf: 0, drop: null, hg: null, sh: [], sel: {}, pin: [], on: {}, rw: {} };
  if (int(o.pf, 0, 1e6) != null) t.pf = o.pf;
  const map = function (x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; };
  Object.keys(map(o.own)).forEach(function (k) { if (TOOL_IDS.indexOf(k) >= 0 && TOOL_USE.indexOf(k) < 0 && o.own[k]) t.own[k] = 1; });
  Object.keys(map(o.n)).forEach(function (k) { const v = int(o.n[k], 1, 99); if (TOOL_USE.indexOf(k) >= 0 && v) t.n[k] = Math.min(v, k === 'shield' ? 2 : 99); });
  Object.keys(map(o.parts)).forEach(function (k) { const v = int(o.parts[k], 1, 4); if (TOOL_IDS.indexOf(k) >= 0 && v) t.parts[k] = v; });
  const d = map(o.drop); if (DAY_RE.test(d.d) && int(d.k, 0, 9) != null && int(d.ms, 0, 864e5) != null) t.drop = { d: d.d, k: d.k, ms: d.ms };
  const h = map(o.hg); if (DAY_RE.test(h.d) && typeof h.left === 'number' && h.left >= 0 && h.left <= 30 && typeof h.at === 'number' && h.at > 0) t.hg = { d: h.d, at: h.at, left: Math.round(h.left * 1000) / 1000 };
  t.sh = Array.isArray(o.sh) ? o.sh.filter(function (x) { return DAY_RE.test(x); }).slice(-50) : [];
  const sel = map(o.sel); ['ruler', 'mark', 'hls', 'qtpl', 'stk', 'pen'].forEach(function (k) { if (typeof sel[k] === 'string' && /^[a-z0-9#-]{1,12}$/.test(sel[k])) t.sel[k] = sel[k]; });
  t.pin = Array.isArray(o.pin) ? o.pin.filter(function (x, i, a) { return TOOL_IDS.indexOf(x) >= 0 && a.indexOf(x) === i; }).slice(0, 3) : [];
  ['lamp'].forEach(function (k) { if (map(o.on)[k] === true) t.on[k] = true; });
  Object.keys(map(o.rw)).slice(0, 100).forEach(function (k) { if (/^[\w:-]{1,40}$/.test(k) && o.rw[k]) t.rw[k] = 1; });
  return t;
}
export function normInk(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).slice(0, 500).forEach(function (b) {
    const pages = o[b]; if (!pages || typeof pages !== 'object' || Array.isArray(pages)) return;
    const pg = {};
    Object.keys(pages).filter(function (k) { return /^[1-9]\d{0,5}$/.test(k); }).slice(0, 2000).forEach(function (k) {
      const L = Array.isArray(pages[k]) ? pages[k].filter(function (s) {
        return s && typeof s === 'object' && typeof s.c === 'string' && /^#[0-9a-f]{6}$/i.test(s.c) && int(s.w, 1, 40) != null && Array.isArray(s.p) && s.p.length >= 2 && s.p.length % 2 === 0 && s.p.every(function (v) { return int(v, 0, 1000) != null; });
      }).slice(0, 80).map(function (s) { return { c: s.c.toLowerCase(), w: s.w, p: s.p.slice(0, 1200) }; }) : [];
      if (L.length) pg[k] = L;
    });
    if (Object.keys(pg).length) out[b] = pg;
  });
  return out;
}
export function normStickers(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).slice(0, 500).forEach(function (b) {
    const L = Array.isArray(o[b]) ? o[b].filter(function (x) {
      return x && typeof x === 'object' && int(x.p, 1, 999999) != null && typeof x.s === 'string' && /^[a-z0-9-]{1,24}$/.test(x.s) && int(x.x, 0, 1000) != null && int(x.y, 0, 1000) != null;
    }).slice(0, 400).map(function (x) { return { p: x.p, s: x.s, x: x.x, y: x.y }; }) : [];
    if (L.length) out[b] = L;
  });
  return out;
}

export function hydrateProgress(p) {
  const out = Object.assign({}, PROGRESS_DEF, p || {});
  /* 29.10 (arch.md backupNag / yearGoal / bookGoals; progress domain): same rules as js/core-b.js */
  if (typeof out.backupNag !== 'boolean') out.backupNag = true;
  if (out.backupNagAt != null && !/^\d{4}-\d\d-\d\d$/.test(String(out.backupNagAt))) out.backupNagAt = null;
  out.yearGoal = normYearGoal(out.yearGoal);
  out.bookGoals = normBookGoals(out.bookGoals);
  out.progress = out.progress || {};
  out.finished = out.finished || [];
  out.hist = out.hist || {};
  out.hourHist =
    out.hourHist && out.hourHist.length === 24
      ? out.hourHist
      : new Array(24).fill(0);
  out.finishDates = out.finishDates || {};
  out.planned = out.planned || {};
  out.bookStats = out.bookStats || {};
  out.bookDiff = out.bookDiff || {};
  out.bookLvl = intMap(out.bookLvl, 4); // 0…LVL_MAX (game-awards.js; 5 levels since 21.10)
  out.bookLvlAi = lvlAiMap(out.bookLvlAi);
  out.bookLvlRep = lvlRepMap(out.bookLvlRep);
  out.readSpans = spansMap(out.readSpans);
  out.aiChat = aiChatMap(out.aiChat);
  out.diaries = diaryList(out.diaries);
  out.chars = charsMap(out.chars);
  if (typeof out.diaryAuto !== 'boolean') out.diaryAuto = true;
  if (['recent', 'title', 'entries'].indexOf(out.diarySort) < 0) out.diarySort = 'recent';
  out.qdayOff = typeof out.qdayOff === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out.qdayOff) ? out.qdayOff : null;
  out.bookStat = out.bookStat || {};
  out.bookImp = out.bookImp || {};
  out.status = out.status || {};
  out.marks = out.marks || {};
  out.quotes = out.quotes || {};
  out.hl = out.hl || {};
  out.stickers = out.stickers || {};
  out.stk = normStickers(out.stk);
  out.ink = normInk(out.ink);
  out.favs = out.favs || [];
  if (out.goal == null || out.goal < 5) out.goal = PROGRESS_DEF.goal;
  return out;
}

function charsMap(m) {
  const out = {};
  if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
  for (const k of Object.keys(m)) {
    if (!Array.isArray(m[k])) continue;
    const v = m[k].filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 40)).slice(0, 200);
    if (v.length) out[k] = v;
  }
  return out;
}

export function hydrateGame(g) {
  const out = Object.assign({}, GAME_DEF, g || {});
  out.stats = Object.assign({}, GAME_DEF.stats, out.stats || {});
  out.badges = out.badges || [];
  out.owned = out.owned || [];
  out.claimed = out.claimed || {};
  out.customQuests = out.customQuests || [];
  out.customStats = out.customStats || [];
  out.customAch = out.customAch || [];
  out.achUnlocked = out.achUnlocked || [];
  /* Достижения v2: прощающее чтение, ничего не записывается обратно; кривое → отбросить / умолчание */
  {
    const d = out.achDates, clean = {};
    if (d && typeof d === 'object' && !Array.isArray(d))
      Object.keys(d).forEach(function (k) { if (k.length <= 40 && typeof d[k] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d[k])) clean[k] = d[k]; });
    out.achDates = clean;
    const sd = out.achSeed;
    out.achSeed = sd && typeof sd === 'object' && !Array.isArray(sd) && typeof sd.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sd.d) && Number.isFinite(sd.n) && sd.n >= 0
      ? { d: sd.d, n: Math.floor(sd.n) } : null;
    out.achTitle = typeof out.achTitle === 'string' ? out.achTitle.slice(0, 40) : '';
    out.achFrame = typeof out.achFrame === 'string' ? out.achFrame.slice(0, 40) : '';
  }
  out.talents = out.talents || {};
  out.inventory = out.inventory || [];
  out.invHist = out.invHist || [];
  /* Architect fields + compat */
  out.rewardPurchases = Array.isArray(out.rewardPurchases) ? out.rewardPurchases : [];
  out.rewardRefunds = Array.isArray(out.rewardRefunds) ? out.rewardRefunds.filter(function (x) {
    return x && typeof x === 'object' && typeof x.price === 'number' && Number.isFinite(x.price) && typeof x.at === 'string';
  }) : [];
  out.awardedSessionIds = Array.isArray(out.awardedSessionIds) ? out.awardedSessionIds : [];
  out.dailyPaidDays = Array.isArray(out.dailyPaidDays) ? out.dailyPaidDays : [];
  out.weeklyPaidWeeks = Array.isArray(out.weeklyPaidWeeks) ? out.weeklyPaidWeeks : [];
  out.lvlPaid = intMap(out.lvlPaid, 1e6, /^\d{4}-\d{2}-\d{2}$/);
  out.quizPaid = intMap(out.quizPaid, 1000, /^\d{4}-\d{2}-\d{2}$/);
  out.pomoPaid = intMap(out.pomoPaid, 1e6, /^\d{4}-\d{2}-\d{2}$/); /* 25.10 «Фокус» (arch.md) */
  out.tools = normTools(out.tools); /* 06.11 «Инструменты читателя» */
  out.chalPaid = intMap(out.chalPaid, 1e6, /^\d{4}-\d{2}-\d{2}$/);
  out.rewardHist = out.rewardHist || [];
  if (out.rewardHist.length && !out.rewardPurchases.length) {
    out.rewardPurchases = out.rewardHist.map(function (h, i) {
      return {
        id: h.id || ('rp_legacy_' + i),
        title: h.title || h.name || 'Награда',
        price: h.price != null ? h.price : h.cost || 0,
        at: h.at || (h.date ? h.date + 'T12:00:00.000Z' : new Date().toISOString()),
      };
    });
  }
  if (out.dailyClaimed == null && out.dailyClaim) out.dailyClaimed = out.dailyClaim;
  if (out.weeklyClaimed == null) out.weeklyClaimed = null;
  /* migrate claimed mvp_daily / mvp_weekly keys once */
  if (out.claimed && typeof out.claimed === 'object') {
    Object.keys(out.claimed).forEach(function (k) {
      if (!out.claimed[k]) return;
      if (k.indexOf('mvp_daily:') === 0 && !out.dailyClaimed) {
        out.dailyClaimed = k.slice('mvp_daily:'.length);
      }
      if (k.indexOf('mvp_weekly:') === 0 && !out.weeklyClaimed) {
        out.weeklyClaimed = k.slice('mvp_weekly:'.length);
      }
    });
  }

  out.ownedGear = out.ownedGear || [];
  out.equipped = out.equipped || {};
  out.char = out.char || {};
  out.vocab = out.vocab || [];
  out.skillMeta = out.skillMeta || {};
  /* Product 2026-10-06: forgotten-book guard — max 3 min counted per page (was 4) */
  if (!out.anti) out.anti = { minSec: 12, maxMin: 3, v: 2 };
  else if (!out.anti.v) {
    out.anti = Object.assign({}, out.anti, { v: 2 });
    if (out.anti.maxMin === 4) out.anti.maxMin = 3;
  }
  if (!out.skills)
    out.skills = {
      Концентрация: 0,
      Дисциплина: 0,
      Аналитика: 0,
      Скорочтение: 0,
    };
  if (!out.ux) out.ux = { anim: true, wake: false, vibe: true, scale: 100 };
  if (!out.ai) out.ai = { key: '', model: '', prov: 'deepseek', base: '' };
  out.aiPref = normAiPref(out.aiPref);
  if (!out.tts || typeof out.tts !== 'object') out.tts = { prov: 'system', key: '', voice: '', base: '' }; /* 20.10: prov/base (arch.md); old ai without prov is normalised in core-b aiNorm */
  /* shop build removed the currency picker and ∞ money; the fields stay (old fields are never deleted): cur as stored, devMoney always false */
  out.devMoney = false;
  out.owned = out.owned.map(function (id) { return id === 'skin-les' || id === 'skin-forest' ? 'skin-gravyura' : typeof id === 'string' ? id.replace(/^color-(les|forest)-/, 'color-gravyura-') : id; }).filter(function (id, i, a) { return a.indexOf(id) === i; });
  if (!out.rewards || !out.rewards.length)
    out.rewards = [
      { name: 'Кофе', tier: 'small', cost: 100, bought: 0 },
      { name: 'Серия сериала', tier: 'small', cost: 100, bought: 0 },
      { name: '', tier: 'small', cost: 100, bought: 0, placeholder: true },
    ];
  else {
    out.rewards.forEach(function (r) {
      if (!r.tier) {
        r.tier = r.cost >= 500 ? 'big' : r.cost >= 250 ? 'mid' : 'small';
      }
      const tierCost = { small: 100, mid: 250, big: 500 };
      if (tierCost[r.tier]) r.cost = tierCost[r.tier];
    });
  }
  if (!out.notif) out.notif = { on: false, time: '20:00' };
  /* 29.10 (arch.md notif.days / backupNag): same rules as js/core-b.js */
  if (!(Array.isArray(out.notif.days) && out.notif.days.length === 7 && out.notif.days.every((x) => typeof x === 'boolean'))) out.notif.days = [true, true, true, true, true, true, true];
  if (typeof out.notif.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(out.notif.time)) out.notif.time = '20:00';
  if (!out.statuses)
    out.statuses = [
      [1, 'Новичок'],
      [3, 'Читатель'],
      [5, 'Книжный странник'],
      [8, 'Магистр'],
      [12, 'Архимаг чтения'],
    ];
  if (!out.heroName) out.heroName = 'Читатель';
  if (out.hpMax === undefined) out.hpMax = 50;
  if (out.hp === undefined || out.hp === null) out.hp = out.hpMax;
  if (out.xpMult === undefined) out.xpMult = 1;
  out.goldAllTime = out.goldAllTime || 0;
  out.petXp = out.petXp || 0;
  out.customStats.forEach((s) => {
    if (out.stats[s] === undefined) out.stats[s] = 0;
  });
  DEFAULT_SKILLS.forEach((k) => {
    if (out.skills[k] === undefined) out.skills[k] = 0;
    if (!out.skillMeta[k])
      out.skillMeta[k] = {
        links: Object.assign({}, DEFAULT_SKILL_LINKS[k] || {}),
      };
  });
  Object.keys(out.skills).forEach((k) => {
    if (!out.skillMeta[k]) out.skillMeta[k] = { links: {} };
  });
  return out;
}

export function hydrateLibrary(lib) {
  const out = Object.assign({}, LIBRARY_DEF, lib || {});
  out.userBooks = (out.userBooks || []).map(stripBookBody);
  out.hidden = out.hidden || [];
  out.shelfOrder = out.shelfOrder || [];
  out.covers = out.covers || {};
  if (out.autoDiff === undefined) out.autoDiff = true;
  out.advWant = Array.isArray(out.advWant)
    ? out.advWant.filter((x) => x && typeof x === 'object' && typeof x.sid === 'string' && /^(wikisource|gutenberg|se|ia):./.test(x.sid)).slice(0, 200)
    : [];
  out.advRecent = Array.isArray(out.advRecent)
    ? out.advRecent.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.slice(0, 60)).slice(0, 8)
    : [];
  return out;
}

export function hydrateSettings(s) {
  const out = Object.assign({}, SET_DEF, s || {});
  /* nav (bottom-bar tabs) is kept exactly as stored — no default object is put there any more (15.10, SET.flip) */
  normFlip(out);
  delete out.focusMode; /* 1б: old bool is ignored, never mapped onto focus */
  if (FOCUS_MODES.indexOf(out.focus) < 0) out.focus = 'button';
  out.pdfDim = normPdfDim(out.pdfDim);
  if (typeof out.readCounter !== 'boolean') out.readCounter = true;
  if (typeof out.pauseBtn !== 'boolean') out.pauseBtn = true;
  if (!['book', 'new', 'old'].includes(out.qSort)) out.qSort = 'book';
  {
    const v = out.pauseXY, c = function (n) { return Math.round(Math.max(0, Math.min(1, n)) * 1000) / 1000; };
    out.pauseXY = v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number' && isFinite(v.x) && isFinite(v.y) ? { x: c(v.x), y: c(v.y) } : null;
  }
  out.bright = normStep(out.bright, 0.3, 1, 1);
  out.warm = normStep(out.warm, 0, 0.6, 0);
  if (typeof out.pdfFont !== 'boolean') out.pdfFont = false;
  if (typeof out.pdfTheme !== 'boolean') out.pdfTheme = false;
  out.fz = normFz(out.fz);
  out.presets = normPresets(out.presets);
  out.bookSet = normBookSet(out.bookSet);
  out.rx = normRx(out.rx);
  out.half = normHalf(out.half);
  out.wsp = typoPick({ wsp: out.wsp }, ['wsp']).wsp || 0;
  out.psp = typoPick({ psp: out.psp }, ['psp']).psp || 0;
  out.rm = normRm(out.rm);
  /* 20.10: «Затемнение» and «Тёплый только ночью» removed — same rules as js/reader.js normSet: old dim folded into bright once */
  if (typeof out.dim === 'number' && isFinite(out.dim) && out.dim > 0) out.bright = normStep((1 - Math.min(0.7, out.dim)) * out.bright, 0.3, 1, 1);
  delete out.dim;
  delete out.warmNight;
  /* 1в: theme is an id string — the free ones incl. 'pencil' / 'pencil-night' («Карандашный»), paid SHOP ids. Unknown ids are KEPT
     (forward compat: an older build simply renders sepia, see activeTheme); only a non-string / empty / huge value falls back. */
  if (typeof out.theme !== 'string' || !out.theme || out.theme.length > 32) out.theme = 'sepia';
  return out;
}

/** Remove heavy body fields from a book meta object (mutates copy). */
export function stripBookBody(book) {
  if (!book || typeof book !== 'object') return book;
  const meta = Object.assign({}, book);
  delete meta.text;
  // toc stays (offsets only, small); PDF has empty text already
  return meta;
}

/**
 * Split a flat v6-style state object into domain envelopes.
 * Returns { progress, game, library, bodies: [{id, kind, value}] }
 * bodies are extracted for IDB write by migrate.
 */
export function splitLegacyState(flat) {
  const src = flat || {};
  const progress = {};
  const game = {};
  const library = {};
  const bodies = [];

  PROGRESS_KEYS.forEach((k) => {
    if (src[k] !== undefined) progress[k] = src[k];
  });
  GAME_KEYS.forEach((k) => {
    if (src[k] !== undefined) game[k] = src[k];
  });
  // vocab alias
  if (src.vocab !== undefined) game.vocab = src.vocab;

  LIBRARY_KEYS.forEach((k) => {
    if (src[k] !== undefined) library[k] = src[k];
  });

  const books = Array.isArray(src.userBooks) ? src.userBooks : [];
  library.userBooks = books.map((b) => {
    if (b && b.text && b.type !== 'pdf') {
      bodies.push({ id: b.id, kind: 'text', value: b.text });
    }
    // PDF bodies already in IDB under pdf:{id}; nothing to extract from blob
    return stripBookBody(b);
  });

  return {
    progress: hydrateProgress(progress),
    game: hydrateGame(game),
    library: hydrateLibrary(library),
    bodies,
  };
}

/**
 * Merge domains back into a flat S-like object for gradual v6 adapter use.
 * Book .text is NOT rehydrated here — caller uses idb.getText.
 */
export function mergeFlat(envelope) {
  const e = envelope || {};
  return Object.assign(
    {},
    e.game || {},
    e.progress || {},
    e.library || {},
    { schemaVersion: e.schemaVersion || SCHEMA_VERSION }
  );
}

/**
 * Migrate envelope data between schema versions.
 * fromVersion 0 / missing = legacy flat or pre-versioned.
 */
export function migrate(fromVersion, data) {
  let v = fromVersion == null ? 0 : fromVersion;
  let cur = data;

  if (v < 1) {
    // Flat v6 blobs also have a `progress` map (per-book ratios) — do NOT
    // treat that as an envelope. Envelope has domain objects + no top-level xp/userBooks.
    const looksEnvelope = !!(
      cur &&
      cur.library &&
      cur.game &&
      cur.progress &&
      cur.userBooks === undefined &&
      cur.xp === undefined
    );
    if (looksEnvelope) {
      cur = {
        schemaVersion: 1,
        progress: hydrateProgress(cur.progress),
        game: hydrateGame(cur.game),
        library: hydrateLibrary(cur.library),
      };
    } else {
      const split = splitLegacyState(cur || {});
      cur = {
        schemaVersion: 1,
        progress: split.progress,
        game: split.game,
        library: split.library,
        _pendingBodies: split.bodies,
      };
    }
    // Existing user goal preserved via split; new installs get PROGRESS_DEF.goal (10).
    v = 1;
  }

  // Future: if (v < 2) { ... }
  cur.schemaVersion = SCHEMA_VERSION;
  return cur;
}

export function emptyEnvelope() {
  return {
    schemaVersion: SCHEMA_VERSION,
    progress: hydrateProgress({}),
    game: hydrateGame({}),
    library: hydrateLibrary({}),
  };
}
