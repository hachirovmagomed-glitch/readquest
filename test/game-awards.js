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
import { localDay, addLocalDays } from './storage/sessions.js?v=20261022-0209';
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
  return Math.round((dayMinutes(before.concat([row]), day) - dayMinutes(before, day)) * XP_PER_MIN * LEVELS[rowLevel(row)].xp);
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
 * Three levels; the level of a book is automatic (text + author + genre), the reader may only LOWER it (S.bookLvl).
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
];
export const LVL_MAX = LEVELS.length - 1;
export const LVL_DAY_CAP = 20;
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
  [2, ['кант', 'kant', 'гегель', 'hegel', 'витгенштейн', 'wittgenstein', 'хайдеггер', 'heidegger', 'гуссерль', 'husserl', 'фихте', 'fichte', 'спиноза', 'spinoza']],
  [1, ['платон', 'plato', 'аристотель', 'aristotle', 'юм', 'hume', 'локк', 'locke', 'декарт', 'descartes', 'лейбниц', 'leibniz',
    'ницше', 'nietzsche', 'шопенгауэр', 'schopenhauer', 'кьеркегор', 'kierkegaard', 'гоббс', 'hobbes', 'беркли', 'berkeley',
    'паскаль', 'pascal', 'монтень', 'montaigne', 'сенека', 'seneca', 'лукреций', 'lucretius', 'аврелий', 'aurelius',
    'плотин', 'plotinus', 'цицерон', 'cicero', 'макиавелли', 'machiavelli', 'милль', 'mill', 'руссо', 'rousseau', 'соловьёв', 'соловьев']],
];
export function authorLevel(author) {
  const w = String(author || '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  for (const [lvl, names] of AUTHOR_LVL) if (names.some(function (x) { return w.indexOf(x) >= 0; })) return lvl;
  return 0;
}
/** genre of an imported file (FB2 «sci_philosophy», «Философия», …) */
export function genreLevel(genre) {
  return /филос|philosoph|трактат|sci_|науч|scien|эконом|econom|математ|math|физик|physic|учебн|textbook/i.test(String(genre || '')) ? 1 : 0;
}

/**
 * Text statistics on three 20 000-character samples (15 %, 45 %, 75 % of the text — away from title pages and notes):
 *   abs  = % of «abstract» words (-ость/-ние/-ство/-ция/-изм…, -tion/-ity/-ness/-ism/-ence…),
 *   long = % of long words (≥ 5 syllables Russian, ≥ 4 English), asl = words per sentence.
 * score = abs + long + max(0, asl − 20) / 4. Checked 19.10: Russian fiction of the built-in shelf 0.6–9.3
 * (Эзоп 0.6, Каренина 8.6), Alice 1.9, Austen 7.1, Hume 12.8, Nietzsche 13.9, Kant 21.4.
 * Fewer than 1500 words → no verdict (0).
 */
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
  const score = 100 * abs / n + 100 * long / n + Math.max(0, asl - 20) / 4 + Math.min(12, 1.5 * math);
  return { words: words.length, cyr: cyr, asl: asl, abs: 100 * abs / n, long: 100 * long / n, math: math, score: score };
}
/** version of the text rule; a PDF card whose lvlText was computed by an older rule (lvlV ≠ this) is re-checked once on open.
 *  1 = 19.10, 2 = 21.10 (formulas). */
export const LVL_ALGO = 2;
/** score thresholds per language: [Сложная, Очень сложная] */
export const LVL_SCORE = { ru: [14, 22], en: [10, 16] };
export function textLevel(text) {
  const st = textStats(text);
  if (st.words < 1500) return 0;
  const th = st.cyr ? LVL_SCORE.ru : LVL_SCORE.en;
  return st.score >= th[1] ? 2 : st.score >= th[0] ? 1 : 0;
}
/**
 * Automatic level of a book card {author, genre, text?, lvlText?}: the highest of text, author and genre.
 * PDF: no text in the card — `lvlText` (0…2) is textLevel() of a sample of its pages (pdfSample, computed once, arch.md);
 * a scan without a text layer gives 0 there, so only author and genre count.
 */
export function autoLevel(book) {
  const b = book || {};
  const lt = Number.isInteger(b.lvlText) && b.lvlText >= 0 && b.lvlText <= LVL_MAX ? b.lvlText : 0;
  return Math.max(b.text ? textLevel(b.text) : lt, authorLevel(b.author), genreLevel(b.genre));
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
