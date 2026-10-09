/**
 * Game side of the session contract — derives rewards ONLY from sessions[] rows.
 *
 *   XP      = 10 × (dayMinutes with the row − dayMinutes without it), «before» = the same day's rows that STARTED
 *             earlier (startedAt, then id) — deterministic, import-order independent; stored as row.xp; once per id
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
import { localDay, addLocalDays } from './storage/sessions.js';
export { localDay, addLocalDays };

export const XP_PER_MIN = 10;

/** Legacy per-row formula (kept for callers that pass it explicitly as opts.xpFn; not the default any more). */
export function xpForRow(row) {
  return Math.round(Number(row && row.minutes) || 0) * XP_PER_MIN;
}

function rowDay(r) { return r && r.date ? String(r.date).slice(0, 10) : null; }
/** start order inside a day: startedAt (ms; missing = 0 → old rows first), then id */
export function startOrder(a, b) {
  const sa = Number(a && a.startedAt) || 0, sb = Number(b && b.startedAt) || 0;
  if (sa !== sb) return sa < sb ? -1 : 1;
  const ia = String(a && a.id), ib = String(b && b.id);
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

/**
 * XP of one session (1б, team decision B): 10 × (floor(dayMin after) − floor(dayMin before)), «before» = sum of the
 * same day's sessions that STARTED earlier (startOrder). 0.9 + 0.9 + 0.9 → 0, 10, 10. Never depends on what was paid.
 */
export function xpForSession(rows, row) {
  const day = rowDay(row);
  if (!day) return 0;
  const before = (rows || []).filter(function (r) {
    return r && r !== row && r.id !== row.id && rowDay(r) === day && startOrder(r, row) < 0;
  });
  return (dayMinutes(before.concat([row]), day) - dayMinutes(before, day)) * XP_PER_MIN;
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
 * sessions[].minutes). Streak (≥ 2), daily «N / 10», week, gold, quests, XP and metrics.py all use this —
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
