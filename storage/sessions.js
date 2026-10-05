/**
 * Append-only sessions[] — Architect contract:
 *   { date, bookId, minutes, pageTurns }
 *
 * Stored in IndexedDB store `sessions` (can grow; not localStorage).
 * Reader calls logSession at end of session; game/metrics only read.
 *
 * North-star: days/week with ≥10 minutes → daysMeetingThreshold({ minMinutes: 10 }).
 */
import { IDB_STORE_SESSIONS } from './schema.js';
import { openDb } from './idb.js';

/** YYYY-MM-DD in local timezone */
export function dayKey(d) {
  const x = d instanceof Date ? d : new Date(d || Date.now());
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function normalizeDate(input) {
  if (!input) return dayKey(new Date());
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    return dayKey(new Date(input));
  }
  if (input instanceof Date) return dayKey(input);
  return dayKey(new Date());
}

/**
 * Append one reading session (Architect shape).
 * @param {{ date?: string|Date, bookId: string, minutes: number, pageTurns: number }} entry
 * @returns {Promise<{id:number, date:string, bookId:string, minutes:number, pageTurns:number}>}
 */
export async function logSession(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('logSession: entry required');
  }
  if (entry.bookId == null || entry.bookId === '') {
    throw new Error('logSession: bookId required');
  }
  const minutes = Number(entry.minutes);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error('logSession: minutes must be a non-negative number');
  }
  // Accept legacy alias `pages` once; persist only as pageTurns
  const rawTurns =
    entry.pageTurns != null ? entry.pageTurns : entry.pages != null ? entry.pages : 0;
  const pageTurns = Number(rawTurns);
  if (!Number.isFinite(pageTurns) || pageTurns < 0) {
    throw new Error('logSession: pageTurns must be a non-negative number');
  }

  const rec = {
    date: normalizeDate(entry.date),
    bookId: String(entry.bookId),
    minutes: minutes,
    pageTurns: pageTurns,
  };

  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_SESSIONS, 'readwrite');
    const store = tx.objectStore(IDB_STORE_SESSIONS);
    const req = store.add(rec);
    let id;
    req.onsuccess = function () {
      id = req.result;
    };
    tx.oncomplete = function () {
      res(Object.assign({ id: id }, rec));
    };
    tx.onerror = function () {
      rej(tx.error);
    };
  });
}

/**
 * List sessions[] (Architect records). Optional inclusive date range / bookId.
 * @param {{ from?: string|Date, to?: string|Date, bookId?: string }} [opts]
 */
export async function listSessions(opts) {
  const options = opts || {};
  const from = options.from != null ? normalizeDate(options.from) : null;
  const to = options.to != null ? normalizeDate(options.to) : null;
  const bookId = options.bookId != null ? String(options.bookId) : null;

  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_SESSIONS, 'readonly');
    const store = tx.objectStore(IDB_STORE_SESSIONS);
    const req = store.getAll();
    req.onsuccess = function () {
      let rows = req.result || [];
      if (from) rows = rows.filter(function (r) { return r.date >= from; });
      if (to) rows = rows.filter(function (r) { return r.date <= to; });
      if (bookId) rows = rows.filter(function (r) { return r.bookId === bookId; });
      rows.sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (a.id || 0) - (b.id || 0);
      });
      res(rows);
    };
    req.onerror = function () {
      rej(req.error);
    };
  });
}

/** Minutes / pageTurns per calendar day (for north-star). */
export async function aggregateSessionsByDay(opts) {
  const rows = await listSessions(opts);
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!map[r.date]) map[r.date] = { minutes: 0, pageTurns: 0, sessions: 0 };
    map[r.date].minutes += r.minutes || 0;
    map[r.date].pageTurns += r.pageTurns || 0;
    map[r.date].sessions += 1;
  }
  return map;
}

/**
 * North-star: distinct days with total minutes ≥ threshold (default 10 = defaultMinutes).
 */
export async function daysMeetingThreshold(opts) {
  const options = opts || {};
  const min = options.minMinutes != null ? Number(options.minMinutes) : 10;
  const byDay = await aggregateSessionsByDay(options);
  const days = Object.keys(byDay).filter(function (d) {
    return byDay[d].minutes >= min;
  });
  days.sort();
  return { count: days.length, days: days, minMinutes: min, byDay: byDay };
}

export async function clearSessions() {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_SESSIONS, 'readwrite');
    tx.objectStore(IDB_STORE_SESSIONS).clear();
    tx.oncomplete = function () {
      res();
    };
    tx.onerror = function () {
      rej(tx.error);
    };
  });
}

