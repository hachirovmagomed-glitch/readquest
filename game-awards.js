/**
 * Game side of the session contract — derives rewards ONLY from sessions[] rows.
 *
 *   XP      = Math.round(row.minutes) * 10 per row, once per sessions[].id
 *   daily   = +30 gold when the day's sessions[] minutes ≥ goal (claim, once per day)
 *   weekly  = +120 gold when ≥ 4 days of the week have ≥ goal minutes (claim, once per week)
 *
 * Idempotency: awarded row ids (sessions[].id) live in game.awardedSessionIds.
 * Pre-2026-10-06 rows (`legacy-…` ids, or no string id) already got their XP from the old
 * closeReader — never re-awarded.
 */
export const XP_PER_MIN = 10;

export function xpForRow(row) {
  return Math.round(Number(row && row.minutes) || 0) * XP_PER_MIN;
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
  const xpFn = o.xpFn || xpForRow;
  if (!Array.isArray(game.awardedSessionIds)) game.awardedSessionIds = [];
  const seen = new Set(game.awardedSessionIds);
  const out = { xp: 0, byId: {}, ids: [] };
  (rows || []).forEach(function (r) {
    if (!isAwardable(r) || seen.has(r.id)) return;
    const xp = xpFn(r);
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

/** Days (YYYY-MM-DD list) of the 7-day week starting `weekStart` with ≥ goal minutes. */
export function daysAtGoalInWeek(rows, weekStart, goal) {
  const by = minutesByDay(rows);
  const start = new Date(weekStart + 'T12:00:00Z');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const k = d.toISOString().slice(0, 10);
    if ((by[k] || 0) >= goal) days.push(k);
  }
  return days;
}
