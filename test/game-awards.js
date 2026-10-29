/**
 * Game side of the session contract — derives rewards ONLY from sessions[] rows.
 *
 *   XP      = 10 × (dayMinutes with the row − dayMinutes without it), «before» = the same day's rows that STARTED
 *             earlier (startedAt; rows without it: order in sessions[]) — deterministic, import-order independent; stored as row.xp; once per id
 *   daily   = +30 gold when dayMinutes(day) ≥ goal (auto, once per day)
 *   weekly  = +120 gold when ≥ 4 days of the week have dayMinutes ≥ goal (auto, once per week)
 *   dayMinutes(day) = Math.floor(sum of the day's sessions[].minutes) — the ONLY day-minutes formula
 *
 * Idempotency: awarded row ids (sessions[].id) live in game.awardedSessionIds.
 * Pre-2026-10-06 rows (`legacy-…` ids, or no string id) already got their XP from the old
 * closeReader — never re-awarded.
 *
 * Days are LOCAL device days (row.date = local day the session started, see reader-session.js);
 * weeks are Mon–Sun of local days. No UTC (toISOString) anywhere.
 */
import { localDay, addLocalDays } from './storage/sessions.js?v=20261029-1226';
export { localDay, addLocalDays };

export const XP_PER_MIN = 10;

/** Legacy per-row formula (kept for callers that pass it explicitly as opts.xpFn; not the default any more). */
export function xpForRow(row) {
  return Math.round(Number(row && row.minutes) || 0) * XP_PER_MIN;
}

function rowDay(r) { return r && r.date ? String(r.date).slice(0, 10) : null; }
/** startedAt as ms (ISO string or legacy number); NaN when the row has none */
export function startMs(r) {
  const v = r && r.startedAt;
  if (v == null || v === '') return NaN;
  const t = typeof v === 'number' ? v : Date.parse(String(v));
  return Number.isFinite(t) && t > 0 ? t : NaN;
}
/**
 * Start order inside a day (Architect): a row without startedAt is always before a row with it; both rows have startedAt → by startedAt; otherwise (old rows without it) →
 * by their position in sessions[] (`rows`). Ties → position. Deterministic for a given sessions[].
 */
export function startOrder(a, b, rows) {
  const sa = startMs(a), sb = startMs(b);
  const fa = Number.isFinite(sa), fb = Number.isFinite(sb);
  if (fa !== fb) return fa ? 1 : -1; // fix B: a row without startedAt predates the fix → always earlier
  if (fa && fb && sa !== sb) return sa < sb ? -1 : 1;
  const list = rows || [];
  const ia = list.indexOf(a), ib = list.indexOf(b);
  if (ia !== ib) return ia < ib ? -1 : 1;
  return 0;
}

/**
 * XP of one session (1б, team decision B): 10 × (floor(dayMin after) − floor(dayMin before)), «before» = sum of the
 * same day's sessions that STARTED earlier (startOrder). 0.9 + 0.9 + 0.9 → 0, 10, 10. Never depends on what was paid.
 */
export function xpForSession(rows, row) {
  const day = rowDay(row);
  if (!day) return 0;
  const before = (rows || []).filter(function (r) {
    return r && r !== row && r.id !== row.id && rowDay(r) === day && startOrder(r, row, rows) < 0;
  });
  /* ×LEVELS[row.lvl].xp — only rows that carry a level (19.10); 10 × 1.5 and 10 × 2 stay whole numbers */
  /* ×row.hon (25.10, the quiet honesty index, 0.5…1) — only rows that carry it */
  return Math.round((dayMinutes(before.concat([row]), day) - dayMinutes(before, day)) * XP_PER_MIN * LEVELS[rowLevel(row)].xp * rowHon(row)) + pomoXp(row);
}

/** New-style row: string id that is not a legacy (already paid) id. */
export function isAwardable(row) {
  return !!row && typeof row.id === 'string' && row.id.length > 0 && row.id.indexOf('legacy-') !== 0;
}

/**
 * Award every not-yet-awarded row. Mutates `game` ({ xp, awardedSessionIds }).
 * @returns {{ xp: number, byId: Object<string, number>, ids: string[] }}
 */
export function applySessionAwards(game, rows, opts) {
  const o = opts || {};
  const xpFn = o.xpFn || function (r) { return xpForSession(rows, r); };
  if (!Array.isArray(game.awardedSessionIds)) game.awardedSessionIds = [];
  const seen = new Set(game.awardedSessionIds);
  const out = { xp: 0, byId: {}, ids: [] };
  (rows || []).forEach(function (r) {
    if (!isAwardable(r) || seen.has(r.id)) return;
    const xp = xpFn(r);
    r.xp = xp; /* the paid value lives in the row (summary shows it, never recomputes); caller persists it */
    seen.add(r.id);
    game.awardedSessionIds.push(r.id);
    game.xp = (Number(game.xp) || 0) + xp;
    out.xp += xp;
    out.byId[r.id] = xp;
    out.ids.push(r.id);
  });
  return out;
}

/** Mark ids as awarded without granting (full-UI formula already paid them). */
export function markAwarded(game, ids) {
  if (!Array.isArray(game.awardedSessionIds)) game.awardedSessionIds = [];
  (ids || []).forEach(function (id) {
    if (id && game.awardedSessionIds.indexOf(id) < 0) game.awardedSessionIds.push(id);
  });
}

export function minutesByDay(rows) {
  const m = {};
  (rows || []).forEach(function (r) {
    if (!r || !r.date) return;
    const k = String(r.date).slice(0, 10);
    m[k] = (m[k] || 0) + (Number(r.minutes) || 0);
  });
  return m;
}

export function minutesOnDay(rows, day) {
  return minutesByDay(rows)[day] || 0;
}

/**
 * THE day-minutes rule (1б, team decision A): whole minutes of a local day = Math.floor(sum of that day's
 * sessions[].minutes). Streak (≥ 3, STREAK_MIN), daily «N / 10», week, gold, quests, XP and metrics.py all use this —
 * no second formula. EPS only absorbs float noise of the sum (1.4 + 0.6 = 1.9999999999999998 → 2).
 */
export const DAY_MIN_EPS = 1e-9;
export function dayMinutes(rows, day) {
  const k = String(day || '').slice(0, 10);
  let m = 0;
  (rows || []).forEach(function (r) {
    if (r && r.date && String(r.date).slice(0, 10) === k) m += Number(r.minutes) || 0;
  });
  return Math.floor(m + DAY_MIN_EPS);
}

/** dayMinutes for every day that has rows: { 'YYYY-MM-DD': wholeMinutes } */
export function dayMinutesMap(rows) {
  const raw = minutesByDay(rows), out = {};
  Object.keys(raw).forEach(function (k) { out[k] = Math.floor(raw[k] + DAY_MIN_EPS); });
  return out;
}

/** Monday (local YYYY-MM-DD) of the week containing local day `day`. */
export function weekStartOf(day) {
  const p = String(day || localDay()).slice(0, 10).split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  return addLocalDays(localDay(d), -dow);
}

/** Days (YYYY-MM-DD list) of the 7-day week starting `weekStart` with ≥ goal minutes (local days). */
export function daysAtGoalInWeek(rows, weekStart, goal) {
  const by = dayMinutesMap(rows);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const k = addLocalDays(weekStart, i);
    if ((by[k] || 0) >= goal) days.push(k);
  }
  return days;
}

/* ===== Daily / weekly gold — AUTO-paid (Product + Интерфейс, 2026-10-06 build 3) =====
 *   daily  +30  for local day D (row.date = day the session STARTED) when D's sessions[] minutes ≥ goal;
 *   weekly +120 for week W (Mon–Sun, local) when W has ≥ 4 days at goal.
 * Triggered ONLY by rows that are being awarded right now (new sessions[] rows: summary or a draft
 * recovered at boot) — history is never paid retroactively. Days/weeks are independent.
 * Idempotency: game.dailyPaidDays[] / game.weeklyPaidWeeks[] (YYYY-MM-DD / Monday YYYY-MM-DD).
 */
export const DAILY_GOLD = 30;
export const WEEKLY_GOLD = 120;
export const WEEKLY_DAYS = 4;

function ensurePaid(game) {
  if (!Array.isArray(game.dailyPaidDays)) game.dailyPaidDays = [];
  if (!Array.isArray(game.weeklyPaidWeeks)) game.weeklyPaidWeeks = [];
}
function addOnce(arr, v) { if (v && arr.indexOf(v) < 0) arr.push(v); }
/** UTC calendar day of `ts` — ONLY to recognise claims written by pre-local-day builds. */
function utcDay(ts) { return new Date(ts == null ? Date.now() : ts).toISOString().slice(0, 10); }

/**
 * One-shot migration (flag game.paidMigrated): everything claimed with the old «Забрать» button counts
 * as paid. Old builds wrote the UTC day; if the stored daily claim equals TODAY's UTC day, today's local
 * day is marked paid too (no extra daily on the UTC→local switch day). Same for the week.
 */
export function migrateClaimedToPaid(game, nowTs) {
  ensurePaid(game);
  if (game.paidMigrated) return false;
  const now = nowTs == null ? Date.now() : nowTs;
  const d = game.dailyClaimed ? String(game.dailyClaimed).slice(0, 10) : null;
  if (d) {
    addOnce(game.dailyPaidDays, d);
    if (d === utcDay(now)) addOnce(game.dailyPaidDays, localDay(now));
  }
  const w = game.weeklyClaimed ? String(game.weeklyClaimed).slice(0, 10) : null;
  if (w) {
    addOnce(game.weeklyPaidWeeks, w);
    if (w === weekStartOf(utcDay(now))) addOnce(game.weeklyPaidWeeks, weekStartOf(localDay(now)));
  }
  if (game.claimed && typeof game.claimed === 'object') {
    Object.keys(game.claimed).forEach(function (k) {
      if (!game.claimed[k]) return;
      if (k.indexOf('mvp_daily:') === 0) addOnce(game.dailyPaidDays, k.slice(10, 20));
      if (k.indexOf('mvp_weekly:') === 0) addOnce(game.weeklyPaidWeeks, k.slice(11, 21));
    });
  }
  game.paidMigrated = true;
  return true;
}

/**
 * Pay daily/weekly for the days of `newRows` (rows awarded right now). Mutates game.gold/goldAllTime.
 * @returns {{ gold:number, daily:string[], weekly:string[] }}
 */
export function applyQuestAwards(game, rows, newRows, opts) {
  const o = opts || {};
  const goal = Number(o.goal) || 10;
  ensurePaid(game);
  const by = dayMinutesMap(rows);
  const out = { gold: 0, daily: [], weekly: [] };
  const days = [];
  (newRows || []).forEach(function (r) { const k = r && r.date ? String(r.date).slice(0, 10) : null; if (k && days.indexOf(k) < 0) days.push(k); });
  days.sort();
  days.forEach(function (day) {
    if ((by[day] || 0) >= goal && game.dailyPaidDays.indexOf(day) < 0) {
      game.dailyPaidDays.push(day); out.daily.push(day); out.gold += DAILY_GOLD;
    }
    const wk = weekStartOf(day);
    if (game.weeklyPaidWeeks.indexOf(wk) < 0 && daysAtGoalInWeek(rows, wk, goal).length >= WEEKLY_DAYS) {
      game.weeklyPaidWeeks.push(wk); out.weekly.push(wk); out.gold += WEEKLY_GOLD;
    }
  });
  if (out.gold) {
    game.gold = (Number(game.gold) || 0) + out.gold;
    game.goldAllTime = (Number(game.goldAllTime) || 0) + out.gold;
  }
  return out;
}

/* ===== Сложность книги (Джессика 19.10: «за страницу стишков и страницу философии одинаково — несправедливо») =====
 * Five levels (three on 19.10; 21.10 Джессика: «более вариативное ранжирование», + «Экспертная», «Запредельная»); the level of a book is automatic (text + author + genre), the reader may only LOWER it (S.bookLvl).
 * The level is frozen into the session row (row.lvl, only when > 0) when the session closes; a too fast pace drops it
 * (reader-session.js), so a skimmed «очень сложная» book earns like an ordinary one. Paid history is never recomputed.
 *   XP     = 10 × whole-minute step × LEVELS[row.lvl].xp            (xpForSession)
 *   coins  = per local day: Σ_level floor(dayMinutes of that level's rows / 10) × LEVELS[l].coins, at most LVL_DAY_CAP;
 *            paid as the growth over game.lvlPaid[day] (applyLevelAwards), never retroactively for history.
 *   page cap (reader-session capMs) = LEVELS[l].capMin; pace floor (avg counted s per forward turn) = LEVELS[l].paceSec.
 * Daily +30 / weekly +120 and the day minutes themselves (dayMinutes, the north-star metric) do not change.
 */
export const LEVELS = [
  { n: 'Обычная', xp: 1, coins: 0, capMin: 3, paceSec: 0 },
  { n: 'Сложная', xp: 1.5, coins: 5, capMin: 5, paceSec: 20 },
  { n: 'Очень сложная', xp: 2, coins: 10, capMin: 7, paceSec: 30 },
  { n: 'Экспертная', xp: 2.5, coins: 15, capMin: 8, paceSec: 35 },
  { n: 'Запредельная', xp: 3, coins: 20, capMin: 10, paceSec: 40 },
];
export const LVL_MAX = LEVELS.length - 1;
export const LVL_DAY_CAP = 30;
/** pace check needs this many forward turns in a session (a few slow pages tell nothing) */
export const LVL_PACE_TURNS = 5;

/** level stored in a row; anything else (old rows, junk) → 0 */
export function rowLevel(r) {
  const v = r && r.lvl;
  return Number.isInteger(v) && v > 0 && v <= LVL_MAX ? v : 0;
}

/* Authors whose books are hard whatever the text statistics say (dialogues of Plato read «easy» by numbers).
   Match: any word of the card's author equals one of these (Russian or the Latin spelling Gutenberg uses). */
const AUTHOR_LVL = [
  /* 21.10 (Джессика: «книгу Жака Дерриды назвал обычной»): XX век и самые тёмные тексты — на ступень выше Канта */
  [4, ['гегель', 'hegel', 'деррида', 'derrida', 'хайдеггер', 'heidegger', 'гуссерль', 'husserl', 'лакан', 'lacan', 'делёз', 'делез', 'deleuze', 'гваттари', 'guattari']],
  [3, ['кант', 'kant', 'витгенштейн', 'wittgenstein', 'фихте', 'fichte', 'шеллинг', 'schelling', 'фуко', 'foucault', 'адорно', 'adorno',
    'хабермас', 'habermas', 'бодрийяр', 'baudrillard', 'левинас', 'levinas', 'мерло-понти', 'merleau-ponty', 'бадью', 'badiou', 'жижек', 'žižek', 'zizek',
    'агамбен', 'agamben', 'гадамер', 'gadamer', 'рикёр', 'рикер', 'ricoeur', 'лиотар', 'lyotard', 'бланшо', 'blanchot', 'кристева', 'kristeva']],
  [2, ['спиноза', 'spinoza', 'сартр', 'sartre', 'батай', 'bataille', 'маркс', 'marx', 'кейнс', 'keynes', 'фрейд', 'freud', 'соссюр', 'saussure', 'лосев', 'бахтин', 'лотман']],
  [1, ['платон', 'plato', 'аристотель', 'aristotle', 'юм', 'hume', 'локк', 'locke', 'декарт', 'descartes', 'лейбниц', 'leibniz',
    'ницше', 'nietzsche', 'шопенгауэр', 'schopenhauer', 'кьеркегор', 'kierkegaard', 'гоббс', 'hobbes', 'беркли', 'berkeley',
    'паскаль', 'pascal', 'монтень', 'montaigne', 'сенека', 'seneca', 'лукреций', 'lucretius', 'аврелий', 'aurelius',
    'плотин', 'plotinus', 'цицерон', 'cicero', 'макиавелли', 'machiavelli', 'милль', 'mill', 'руссо', 'rousseau', 'соловьёв', 'соловьев']],
];
export function authorLevel(author) {
  const w = String(author || '').toLowerCase().split(/[^\p{L}-]+/u).flatMap(function (x) { return x.indexOf('-') > 0 ? [x].concat(x.split('-')) : [x]; }).filter(Boolean);
  for (const [lvl, names] of AUTHOR_LVL) if (names.some(function (x) { return w.indexOf(x) >= 0; })) return lvl;
  return 0;
}
/** genre of an imported file (FB2 «sci_philosophy», «Философия», …) */
export function genreLevel(genre) {
  return /филос|philosoph|трактат|sci_|науч|scien|эконом|econom|математ|math|физик|physic|учебн|textbook/i.test(String(genre || '')) ? 1 : 0;
}

/**
 * 21.10: title of the card. A PDF card has author «PDF» and the file name as its title («Деррида Ж. – О грамматологии»), so the author
 * is looked for in the title too; a term root in the title («грамматологии», «Макроэкономика») or a genre word → at least 1.
 */
export function titleLevel(title) {
  const t = String(title || '');
  let l = Math.max(authorLevel(t), genreLevel(t));
  if (!l && (t.match(/\p{L}+/gu) || []).some(function (w) { return w.length > 5 && (TERM_RU.test(w) || TERM_EN.test(w)); })) l = 1;
  return l;
}
/**
 * Text statistics on three 20 000-character samples (15 %, 45 %, 75 % of the text — away from title pages and notes):
 *   abs  = % of «abstract» words (-ость/-ние/-ство/-ция/-изм…, -tion/-ity/-ness/-ism/-ence…),
 *   long = % of long words (≥ 5 syllables Russian, ≥ 4 English), asl = words per sentence.
 * score = abs + long + max(0, asl − 20) / 4. Checked 19.10: Russian fiction of the built-in shelf 0.6–9.3
 * (Эзоп 0.6, Каренина 8.6), Alice 1.9, Austen 7.1, Hume 12.8, Nietzsche 13.9, Kant 21.4.
 * Fewer than 1500 words → no verdict (0).
 */
const TERM_RU = /(логи[чяиюе]|метри[чя]|теор[еи]|метод|систем|структур|функци|концеп|категор|диалект|трансцендент|феномен|онтолог|эпистем|гносеолог|эмпири|рацион|абстракт|имманент|априор|детермин|парадигм|инфляц|дефляц|эластичн|мультипликат|коэффициент|параметр|интеграл|дифференц|вектор|матриц|алгоритм|молекул|потенциал|квант|инвестиц|капитал|монетарн|фискальн|эквивалент|тождеств|субъект|объект|субстанц|аксиом|теорем|постулат|корреляц|регресс|дисперс|статистик|экспонент|логарифм|производн|спекуляц|синтез|анализ|гипотез|принцип|индивид|универсал|трансформ|интерпрет|макро|микро|агрегат|равновеси|предельн|сбережени|потреблени|номинальн|эффективн|конкретн|содержани|определени|понят[ия]|познани|сознани|суждени)/iu;
const TERM_EN = /(ology|ologic|ometr|theor|method|system|structur|function|concept|categor|dialect|transcend|phenomen|ontolog|epistem|empiric|rational|abstract|immanent|priori|determin|paradigm|inflation|deflation|elastic|multiplier|coefficient|parameter|integral|differenti|vector|matri[cx]|algorithm|molecul|potential|quantum|invest|capital|monetar|fiscal|equivalen|identity|subject|object|substan|axiom|theorem|postulat|correlat|regress|varianc|statistic|exponent|logarithm|derivativ|speculat|synthe|analy[st]|hypothe|principle|individual|universal|transform|interpret|macro|micro|aggregat|equilibri|marginal|consumption|nominal|cognition|perception|judgment|judgement|predicat|proposition|premise|inference)/i;
const SCI_RE = /§|\bibid\b|\bop\.\s?cit\b|\bcf\.|(?<![\p{L}])см\.|(?<![\p{L}])там же(?![\p{L}])|\[\d{1,3}\]|(?<![\p{L}])(?:с|стр|p|pp)\.\s?\d{1,4}\b|\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.?[ \t]+[A-ZА-ЯЁ]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+/giu;
export function textStats(text) {
  let t = String(text || '');
  /* a Project Gutenberg .txt carries its licence (legal prose, scores «hard») before and after the book */
  const g0 = t.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG/i);
  if (g0 >= 0) { const nl = t.indexOf('\n', g0); t = t.slice(nl < 0 ? g0 : nl); }
  const g1 = t.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (g1 > 0) t = t.slice(0, g1);
  const L = t.length;
  let s = '';
  if (L <= 60000) s = t;
  else [0.15, 0.45, 0.75].forEach(function (p) { const a = Math.floor(L * p); s += t.slice(a, a + 20000) + '\n'; });
  const words = s.match(/\p{L}+(?:[-'’]\p{L}+)*/gu) || [];
  const cyr = (s.match(/[а-яё]/giu) || []).length > (s.match(/[a-z]/gi) || []).length;
  const sents = (s.match(/[.!?…;:]+(?=[\s"»”)]|$)/g) || []).length || 1;
  const ABS = cyr
    ? /(ость|ости|остью|остей|ние|ния|нию|нием|ниях|ство|ства|ству|ством|ция|ции|цию|цией|изм|изма|изму|измом|ческ\p{L}*)$/iu
    : /(tion|tions|ity|ities|ness|ism|isms|ence|ences|ance|ances|ment|ments|ical|ive|ible|able)$/i;
  let long = 0, abs = 0;
  words.forEach(function (w) {
    const k = cyr ? ((w.match(/[аеёиоуыэюя]/giu) || []).length || 1)
      : Math.max(1, (w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g) || []).length);
    if (k >= (cyr ? 5 : 4)) long++;
    if (w.length > 5 && ABS.test(w)) abs++;
  });
  const n = words.length || 1, asl = words.length / sents;
  /* 21.10 (Джессика: учебник макроэкономики с формулами вышел только «Сложной»): formulas. Operators and Greek letters, and in a
     Russian text single Latin letters (variables Y, C, I, r). Per 100 words; fiction of the built-in shelf 0–0.03, a textbook page
     with formulas several. Formula tokens also count as short words, so without this they pulled the score DOWN. */
  const ops = (s.match(/[=<>≤≥≈≠±×÷∑∏∫√∂∆Δ∞^]|[α-ωΑ-Ω]/g) || []).length;
  const vars = cyr ? (s.match(/(?<![\p{L}\d])[A-Za-z](?![\p{L}])/gu) || []).length : 0;
  const math = 100 * (ops + vars) / n;
  /* 21.10 (Джессика: «на сложность может повлиять сложность терминологии»): % of words with a term root of philosophy, science,
     economics (TERM_RU / TERM_EN). Checked 21.10: fiction of the built-in shelf and Gutenberg novels 0–0.6, Hume 1.7–1.9, Kant 7. */
  let term = 0;
  const TR = cyr ? TERM_RU : TERM_EN;
  words.forEach(function (w) { if (w.length > 5 && TR.test(w)) term++; });
  const terms = 100 * term / n;
  /* 23.10 (Джессика: научная разметка): references and notes per 1000 words — §, ibid, op. cit., cf., см., там же, [12], с. 12 / p. 12,
     numbered sections «1.2 Title», superscript note marks. Checked on the golden shelf: fiction 0, Hume 0.4, Bergson 1.4, Keynes 2.9, Darwin 4.8. */
  const sci = 1000 * (s.match(SCI_RE) || []).length / n;
  const score = 100 * abs / n + 100 * long / n + Math.max(0, asl - 20) / 4 + Math.min(12, 1.5 * math) + Math.min(15, 1.5 * terms) + Math.min(6, 2 * sci);
  return { words: words.length, cyr: cyr, asl: asl, abs: 100 * abs / n, long: 100 * long / n, math: math, terms: terms, sci: sci, score: score };
}
/** version of the text rule; a PDF card whose lvlText was computed by an older rule (lvlV ≠ this) is re-checked once on open.
 *  1 = 19.10, 2 = 21.10 (formulas), 3 = 21.10 (terms, five levels), 4 = 22.10 (PDF metadata: author, title, subject),
 *  5 = 23.10 (notes and references; PDF page density). */
export const LVL_ALGO = 5;
/** score thresholds per language: [Сложная, Очень сложная, Экспертная, Запредельная]. With terms (21.10): Kant (en) 31.8,
 *  Hume 14.5–15.7, Nietzsche 14.8, Gutenberg novels ≤ 7.4, Russian fiction of the shelf ≤ 9.6. */
export const LVL_SCORE = { ru: [14, 22, 32, 44], en: [10, 16, 24, 32] };
/** 23.10: a PDF page this dense (characters of text per page, sampled pages) is a textbook/monograph layout — but an A4 novel is
 *  dense too, so it counts only together with terms or references: +PDF_DENSE_BONUS to the score. */
export const PDF_DENSE_CPP = 3200;
export const PDF_DENSE_BONUS = 3;
export function textLevel(text, opt) {
  const st = textStats(text);
  if (st.words < 1500) return 0;
  const th = st.cyr ? LVL_SCORE.ru : LVL_SCORE.en;
  const cpp = opt && opt.cpp;
  const score = st.score + (cpp >= PDF_DENSE_CPP && (st.sci >= 0.3 || st.terms >= 1) ? PDF_DENSE_BONUS : 0);
  let l = 0;
  while (l < th.length && score >= th[l]) l++;
  return l;
}
/**
 * Automatic level of a book card {author, genre, text?, lvlText?}: the highest of text, author and genre.
 * PDF: no text in the card — `lvlText` (0…LVL_MAX) is textLevel() of a sample of its pages (pdfSample, computed once, arch.md);
 * a scan without a text layer gives 0 there, so only author and genre count.
 */
export function autoLevel(book) {
  const b = book || {};
  const lt = Number.isInteger(b.lvlText) && b.lvlText >= 0 && b.lvlText <= LVL_MAX ? b.lvlText : 0;
  return Math.max(b.text ? textLevel(b.text) : lt, authorLevel(b.author), genreLevel(b.genre), titleLevel(b.title));
}
/*
 * 22.10 (Джессика: «Давай первое» — the reader's own pace on this book). Minutes per page turn on this book against the same reader's
 * other books of the same kind (PDF with PDF, text with text): a book read much slower than usual is harder than its text shows
 * (a scan has no text at all). Only sessions with ≥ 3 turns; the book needs ≥ PACE_MIN.sessions sessions and ≥ PACE_MIN.turns turns,
 * the baseline ≥ PACE_MIN.baseTurns turns from ≥ PACE_MIN.baseBooks other books. Minutes are the counted ones (page cap, idle cut),
 * so a book left open does not slow the pace much. Not enough data → 0 (no verdict).
 */
export const PACE_MIN = { sessions: 3, turns: 30, baseTurns: 60, baseBooks: 2 };
/** ratio → level: ≥ 1.6 «Сложная», ≥ 2.4 «Очень сложная», ≥ 3.2 «Экспертная»; pace alone never gives more */
export const PACE_LVL = [1.6, 2.4, 3.2];
export function paceRatio(bookRows, baseRows) {
  const use = function (rs) { return (rs || []).filter(function (r) { return r && (Number(r.pageTurns) || 0) >= 3 && (Number(r.minutes) || 0) > 0; }); };
  const sum = function (rs, k) { return rs.reduce(function (s, r) { return s + (Number(r[k]) || 0); }, 0); };
  const b = use(bookRows), a = use(baseRows), bt = sum(b, 'pageTurns'), at = sum(a, 'pageTurns');
  const books = {}; a.forEach(function (r) { books[r.bookId] = 1; });
  if (b.length < PACE_MIN.sessions || bt < PACE_MIN.turns || at < PACE_MIN.baseTurns || Object.keys(books).length < PACE_MIN.baseBooks) return 0;
  const base = sum(a, 'minutes') / at;
  return base > 0 ? (sum(b, 'minutes') / bt) / base : 0;
}
export function paceAutoLevel(ratio) {
  let l = 0;
  while (l < PACE_LVL.length && ratio >= PACE_LVL[l]) l++;
  return l;
}
/*
 * 22.10 (Джессика: «И четвертое» — a neural network on the reader's own key). The answer is asked as JSON {"level": 0…4, "why": "…"};
 * anything else → null (nothing is stored).
 */
export function parseAiLevel(s) {
  const t = String(s || ''), m = t.match(/\{[\s\S]*?\}/);
  let o = null;
  if (m) { try { o = JSON.parse(m[0]); } catch (e) { o = null; } }
  const l = o && typeof o.level === 'string' && /^\d$/.test(o.level) ? Number(o.level) : o && o.level;
  if (!Number.isInteger(l) || l < 0 || l > LVL_MAX) return null;
  return { l: l, w: String((o && o.why) || '').replace(/\s+/g, ' ').trim().slice(0, 160) };
}
/** pages of a PDF to sample for textLevel: up to `n`, spread over 10…90 % of the book (title pages and index left out) */
export function pdfSamplePages(numPages, n) {
  const k = Math.max(1, Math.min(n || 12, numPages | 0)), out = [];
  for (let i = 0; i < k; i++) {
    const p = numPages <= k ? i + 1 : Math.round(numPages * (0.1 + 0.8 * (k === 1 ? 0.5 : i / (k - 1)))) || 1;
    if (out.indexOf(p) < 0) out.push(Math.max(1, Math.min(numPages, p)));
  }
  return out;
}
/** effective level: auto, lowered by the reader's choice (S.bookLvl[id]); never raised */
export function effLevel(auto, manual) {
  const a = Number.isInteger(auto) ? Math.max(0, Math.min(LVL_MAX, auto)) : 0;
  return Number.isInteger(manual) && manual >= 0 ? Math.min(a, manual) : a;
}
/**
 * Pace check (reader-session.js, at session close): the level drops while the average counted time per forward turn
 * is below that level's paceSec. Each page counts at most 2 × paceSec, so one long stop (a book left open on the last page)
 * cannot cover twenty skimmed pages. `pageMs` = counted ms of every page of the session. Fewer than LVL_PACE_TURNS turns → kept.
 */
export function paceLevel(lvl, pageMs, turns) {
  let l = Number.isInteger(lvl) ? Math.max(0, Math.min(LVL_MAX, lvl)) : 0;
  if (!(turns >= LVL_PACE_TURNS)) return l;
  const list = Array.isArray(pageMs) ? pageMs : [];
  while (l > 0) {
    const top = 2 * LEVELS[l].paceSec * 1000;
    const sum = list.reduce(function (a, ms) { return a + Math.min(Number(ms) || 0, top); }, 0);
    if (sum / turns / 1000 >= LEVELS[l].paceSec) break;
    l--;
  }
  return l;
}

/** coins the level bonus is worth for local day `day` (the target; what is paid is game.lvlPaid[day]) */
export function levelCoinsForDay(rows, day) {
  let c = 0;
  for (let l = 1; l <= LVL_MAX; l++) {
    const mine = (rows || []).filter(function (r) { return rowLevel(r) === l; });
    c += Math.floor(dayMinutes(mine, day) / 10) * LEVELS[l].coins;
  }
  return Math.min(LVL_DAY_CAP, c);
}
/**
 * Pay the level bonus for the days of `newRows` (rows awarded right now — no retro pay for history).
 * Idempotent: game.lvlPaid = { 'YYYY-MM-DD': coins already paid }, only the growth is paid.
 * @returns {{ gold:number, days:string[] }}
 */
export function applyLevelAwards(game, rows, newRows) {
  if (!game.lvlPaid || typeof game.lvlPaid !== 'object' || Array.isArray(game.lvlPaid)) game.lvlPaid = {};
  const out = { gold: 0, days: [] };
  const days = [];
  (newRows || []).forEach(function (r) { const k = rowDay(r); if (k && rowLevel(r) > 0 && days.indexOf(k) < 0) days.push(k); });
  days.sort().forEach(function (day) {
    const paid = Number(game.lvlPaid[day]) || 0, due = levelCoinsForDay(rows, day) - paid;
    if (due > 0) { game.lvlPaid[day] = paid + due; out.gold += due; out.days.push(day); }
  });
  if (out.gold) {
    game.gold = (Number(game.gold) || 0) + out.gold;
    game.goldAllTime = (Number(game.goldAllTime) || 0) + out.gold;
  }
  return out;
}

/* ===== Честное чтение (25.10, Джессика «Давай все кроме 3 и 6»; arch.md) =====
 * Own pace: the «too fast» floor follows the reader's average counted time per honest page (this book; else all books).
 * Honesty index: over the last 14 local days, honest seconds vs signs of skimming (fast flips, minutes with no sign of life
 * before «назад»); below 75 % the XP factor goes down smoothly, never under 0.5, and comes back by itself. No bans. */
export const PACE_FLOOR = { k: 0.4, min: 8, max: 25, def: 12 };
export const TAIL_SEC = { min: 20, max: 90, def: 30 };
export const HON = { days: 14, minSec: 1200, ok: 0.75, low: 0.5, flipSec: 12, idleW: 0.5 };
export const QUIZ_XP = 20;
export const QUIZ_MIN = 15;
export const QUIZ_PAGES = 5;

export function rowHon(r) {
  const h = Number(r && r.hon);
  return h >= 0.5 && h < 1 ? h : 1;
}
/** average counted seconds per honest page: this book (≥ 10 pages), else every book (≥ 20 pages), else null */
export function pageSecAvg(rows, bookId) {
  const sum = function (rs) {
    let m = 0, p = 0;
    rs.forEach(function (r) { const t = Number(r.pageTurns) || 0; if (t > 0) { m += Number(r.minutes) || 0; p += t; } });
    return { s: m * 60, p: p };
  };
  const all = (rows || []).filter(function (r) { return r && r.bookId != null; });
  const own = sum(all.filter(function (r) { return String(r.bookId) === String(bookId); }));
  if (own.p >= 10) return own.s / own.p;
  const every = sum(all);
  return every.p >= 20 ? every.s / every.p : null;
}
/** seconds a page must stay on screen to count (own pace; 12 s while there is no history) */
export function paceFloorSec(rows, bookId) {
  const a = pageSecAvg(rows, bookId);
  if (a == null) return PACE_FLOOR.def;
  return Math.max(PACE_FLOOR.min, Math.min(PACE_FLOOR.max, Math.round(a * PACE_FLOOR.k)));
}
/** how long the page the session ends on counts after its last sign of life: about one own page */
export function tailSec(rows, bookId) {
  const a = pageSecAvg(rows, bookId);
  if (a == null) return TAIL_SEC.def;
  return Math.max(TAIL_SEC.min, Math.min(TAIL_SEC.max, Math.round(a)));
}
/**
 * The quiet honesty index on local day `day`: rows of the 14 days up to and including it (the open session is not a row yet).
 * @returns {{h:number, f:number, why:''|'flip'|'idle'}} h = honest share, f = XP factor 0.5…1 (two places)
 */
export function honestyIndex(rows, day) {
  const from = addLocalDays(String(day).slice(0, 10), -(HON.days - 1)), to = String(day).slice(0, 10);
  let ok = 0, flip = 0, idle = 0;
  (rows || []).forEach(function (r) {
    const d = rowDay(r);
    if (!d || d < from || d > to) return;
    ok += (Number(r.minutes) || 0) * 60;
    flip += (Number(r.fl) || 0) * HON.flipSec;
    idle += (Number(r.ct) || 0) * HON.idleW;
  });
  const all = ok + flip + idle;
  if (all < HON.minSec) return { h: 1, f: 1, why: '' };
  const h = ok / all;
  const f = h >= HON.ok ? 1 : Math.max(HON.low, Math.round((1 - (HON.ok - h)) * 100) / 100);
  return { h: h, f: f, why: f < 1 ? (flip >= idle ? 'flip' : 'idle') : '' };
}
/** first {...} of a model answer as an object, else null */
function jsonIn(s) {
  const m = String(s || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { const o = JSON.parse(m[0]); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}
/** mini-check question: {"q","a"} → {q ≤ 300, a ≤ 300} | null */
export function parseQuizQ(s) {
  const o = jsonIn(s);
  if (!o || typeof o.q !== 'string' || !o.q.trim()) return null;
  return { q: o.q.trim().slice(0, 300), a: typeof o.a === 'string' ? o.a.trim().slice(0, 300) : '' };
}
/** mini-check verdict: {"ok","why"} → {ok: boolean, why ≤ 200} | null */
export function parseQuizGrade(s) {
  const o = jsonIn(s);
  if (!o || typeof o.ok !== 'boolean') return null;
  return { ok: o.ok, why: typeof o.why === 'string' ? o.why.trim().slice(0, 200) : '' };
}
/* ===== Фокус: помодоро (Джессика 25.10: «Помодоро будет давать больше бонусов, больше XP, больше монет, если человек
 * более сконцентрированный и более дисциплинированный») =====
 * A round = POMO_LEN minutes of COUNTED reading (the tracker's minutes: pause, background, fast flipping add nothing)
 * without leaving the app for longer than the grace time (js/focus.js). Completed rounds are frozen into the session row:
 *   row.pomo    = [25, 25]  lengths of the completed rounds (only when non-empty);
 *   row.pomoRun = 2         longest run of rounds in a row that never left the app (weekly challenge «подряд без выхода»).
 * rowPomo() trusts a round only while Σ lengths ≤ the row's counted minutes — a round cannot outgrow honest reading.
 *   XP    += 10 × Σ lengths × POMO_XP × honesty                                    (xpForSession, per row)
 *   coins  = per local day: Σ POMO[len].coins × honesty, at most POMO_DAY_CAP; paid as the growth over game.pomoPaid[day].
 * Weekly challenges (FOCUS_CHAL): three per week, each CHAL_COINS once (game.chalPaid[monday] = bitmask of paid ones).
 * Daily +30 / weekly +120 and dayMinutes are not touched.
 */
export const POMO = { 15: { coins: 3 }, 25: { coins: 5 }, 45: { coins: 10 } };
export const POMO_LENS = [15, 25, 45];
export const POMO_XP = 0.2;
export const POMO_DAY_CAP = 20;
export const CHAL_COINS = 30;

/** honesty multiplier of a row (thread «Защитить награды»: row.hon 0.5…1, only when < 1) */
function pomoHon(r) { const h = r && r.hon; return typeof h === 'number' && isFinite(h) && h >= 0.5 && h < 1 ? h : 1; }
/** completed rounds of a row, validated: known lengths, Σ ≤ counted minutes (+ float slack) */
export function rowPomo(r) {
  const a = r && Array.isArray(r.pomo) ? r.pomo : [];
  const out = [];
  let left = (Number(r && r.minutes) || 0) + DAY_MIN_EPS;
  for (let i = 0; i < a.length && i < 50; i++) {
    const v = a[i];
    if (POMO_LENS.indexOf(v) < 0 || v > left) continue;
    out.push(v); left -= v;
  }
  return out;
}
export function pomoMinutes(r) { return rowPomo(r).reduce(function (s, v) { return s + v; }, 0); }
export function rowPomoRun(r) {
  const n = rowPomo(r).length, v = r && r.pomoRun;
  return Number.isInteger(v) && v > 0 ? Math.min(v, n) : 0;
}
/** XP bonus of one row for its rounds */
export function pomoXp(r) { return Math.round(pomoMinutes(r) * XP_PER_MIN * POMO_XP * pomoHon(r)); }
/** coins the round bonus is worth for local day `day` (the target; what is paid is game.pomoPaid[day]) */
export function pomoCoinsForDay(rows, day) {
  let c = 0;
  (rows || []).forEach(function (r) {
    if (rowDay(r) !== day) return;
    const h = pomoHon(r);
    rowPomo(r).forEach(function (v) { c += POMO[v].coins * h; });
  });
  return Math.min(POMO_DAY_CAP, Math.floor(c + 1e-9));
}
function intMapOf(game, k) { if (!game[k] || typeof game[k] !== 'object' || Array.isArray(game[k])) game[k] = {}; return game[k]; }
function addGold(game, g) {
  if (!g) return;
  game.gold = (Number(game.gold) || 0) + g;
  game.goldAllTime = (Number(game.goldAllTime) || 0) + g;
}
/**
 * Pay the round bonus and the weekly challenges for the days of `newRows` (rows awarded right now, no retro pay for history).
 * Idempotent: game.pomoPaid = { day: coins paid }, game.chalPaid = { monday: bitmask of paid challenges }.
 * @returns {{ gold:number, pomoGold:number, chalGold:number, chal:string[] }}
 */
export function applyFocusAwards(game, rows, newRows) {
  const paidD = intMapOf(game, 'pomoPaid'), paidW = intMapOf(game, 'chalPaid');
  const out = { gold: 0, pomoGold: 0, chalGold: 0, chal: [] };
  const days = [], weeks = [];
  (newRows || []).forEach(function (r) {
    const k = rowDay(r);
    if (!k || !rowPomo(r).length) return;
    if (days.indexOf(k) < 0) days.push(k);
    const w = weekStartOf(k); if (weeks.indexOf(w) < 0) weeks.push(w);
  });
  days.sort().forEach(function (day) {
    const paid = Number(paidD[day]) || 0, due = pomoCoinsForDay(rows, day) - paid;
    if (due > 0) { paidD[day] = paid + due; out.pomoGold += due; }
  });
  weeks.sort().forEach(function (w) {
    let mask = Number(paidW[w]) || 0;
    focusChallenges(rows, w).forEach(function (c, i) {
      if (!c.done || (mask & (1 << i))) return;
      mask |= 1 << i; out.chalGold += CHAL_COINS; out.chal.push(c.id);
    });
    if (mask) paidW[w] = mask;
  });
  out.gold = out.pomoGold + out.chalGold;
  addGold(game, out.gold);
  return out;
}

/** focus minutes (completed rounds) per local day: { day: minutes } */
export function focusDays(rows) {
  const by = {};
  (rows || []).forEach(function (r) { const k = rowDay(r), m = pomoMinutes(r); if (k && m) by[k] = (by[k] || 0) + m; });
  return by;
}
/** «Серия фокуса»: days in a row with at least one completed round, ending today (or yesterday while today has none yet) */
export function focusStreak(rows, today) {
  const by = focusDays(rows);
  let d = today || localDay();
  if (!by[d]) d = addLocalDays(d, -1);
  let n = 0;
  while (by[d] && n < 3660) { n++; d = addLocalDays(d, -1); }
  return n;
}
/* Weekly challenges (Джессика 25.10: «Вызов недели»). Three of the pool per week, rotating by the week number. */
export const FOCUS_CHAL = [
  { id: 'run3', t: '3 круга подряд без выхода', goal: 3, val: function (s) { return s.run; } },
  { id: 'days5', t: 'Круг в 5 разных дней', goal: 5, val: function (s) { return s.days; } },
  { id: 'min120', t: '2 часа фокуса за неделю', goal: 120, val: function (s) { return s.min; }, unit: 'мин' },
  { id: 'r10', t: '10 кругов за неделю', goal: 10, val: function (s) { return s.rounds; } },
  { id: 'long2', t: '2 длинных круга по 45 минут', goal: 2, val: function (s) { return s.long; } },
  { id: 'row3', t: 'Три дня подряд с кругом', goal: 3, val: function (s) { return s.row; } },
];
function weekNo(monday) {
  const p = String(monday).split('-').map(Number);
  return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / (7 * 864e5));
}
/** the three challenges of the week starting `monday`, with progress: [{id, t, goal, have, done}] */
export function focusChallenges(rows, monday) {
  const s = { run: 0, days: 0, min: 0, rounds: 0, long: 0, row: 0 };
  let cur = 0;
  for (let i = 0; i < 7; i++) {
    const day = addLocalDays(monday, i);
    const mine = (rows || []).filter(function (r) { return rowDay(r) === day; });
    let any = false;
    mine.forEach(function (r) {
      const p = rowPomo(r);
      if (!p.length) return;
      any = true; s.rounds += p.length; s.min += p.reduce(function (a, v) { return a + v; }, 0);
      s.long += p.filter(function (v) { return v === 45; }).length;
      s.run = Math.max(s.run, rowPomoRun(r));
    });
    if (any) { s.days++; cur++; s.row = Math.max(s.row, cur); } else cur = 0;
  }
  const n = FOCUS_CHAL.length, k = ((weekNo(monday) % n) + n) % n;
  return [0, 1, 3].map(function (o) {
    const c = FOCUS_CHAL[(k + o) % n], have = c.val(s);
    return { id: c.id, t: c.t, goal: c.goal, unit: c.unit || '', have: Math.min(have, c.goal), done: have >= c.goal };
  });
}
