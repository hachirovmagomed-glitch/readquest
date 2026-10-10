/**
 * Reading + analytics events — IndexedDB store `events`.
 * Reader WRITES pageVisibleMs; UI may write analytics {type}; game only READS.
 * Do NOT invent separate DBs for focus / anti-cheat — those are rules on top of events.
 * Do NOT put analytics into sessions[] — sessions stay reading-only.
 */
import { IDB_STORE_EVENTS } from './schema.js?v=20261010-1150';
import { openDb } from './idb.js?v=20261010-1150';
import { normalizeDate } from './sessions.js?v=20261010-1150';

async function addEvent(rec) {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_EVENTS, 'readwrite');
    const req = tx.objectStore(IDB_STORE_EVENTS).add(rec);
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
 * Reading visibility event (Architect: pageVisibleMs).
 * @param {{ bookId: string, pageVisibleMs: number, date?: string|Date, at?: string, page?: number, type?: string }} entry
 */
export async function logReadingEvent(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('logReadingEvent: entry required');
  }
  if (entry.bookId == null || entry.bookId === '') {
    throw new Error('logReadingEvent: bookId required');
  }
  const pageVisibleMs = Number(entry.pageVisibleMs);
  if (!Number.isFinite(pageVisibleMs) || pageVisibleMs < 0) {
    throw new Error('logReadingEvent: pageVisibleMs must be a non-negative number');
  }
  const rec = {
    type: entry.type || 'page_visible',
    date: normalizeDate(entry.date),
    bookId: String(entry.bookId),
    pageVisibleMs: pageVisibleMs,
    at: entry.at || new Date().toISOString(),
  };
  if (entry.page != null) rec.page = Number(entry.page);
  if (entry.via === 'turn' || entry.via === 'jump') rec.via = entry.via; /* 1б, optional */
  return addEvent(rec);
}

/**
 * Generic analytics / UI event (NOT a reading session).
 * Written to the same `events` store; never to `sessions`.
 * @param {{ type: string, date?: string|Date, at?: string, bookId?: string, [k:string]: any }} entry
 */
export async function logAnalyticsEvent(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('logAnalyticsEvent: entry required');
  }
  if (!entry.type || typeof entry.type !== 'string') {
    throw new Error('logAnalyticsEvent: type required');
  }
  const rec = {
    type: String(entry.type),
    date: normalizeDate(entry.date),
    at: entry.at || new Date().toISOString(),
  };
  if (entry.bookId != null && entry.bookId !== '') {
    rec.bookId = String(entry.bookId);
  }
  // Optional passthroughs (keep small)
  if (entry.pageVisibleMs != null) {
    const ms = Number(entry.pageVisibleMs);
    if (Number.isFinite(ms) && ms >= 0) rec.pageVisibleMs = ms;
  }
  // pdf_stall_recovered diagnostics: page (0-based index), label (printed), stalledMs, reason (render why)
  if (entry.page != null && Number.isFinite(Number(entry.page))) rec.page = Number(entry.page);
  if (entry.stalledMs != null && Number.isFinite(Number(entry.stalledMs))) rec.stalledMs = Math.max(0, Math.round(Number(entry.stalledMs)));
  if (entry.label != null) rec.label = String(entry.label).slice(0, 32);
  if (entry.reason != null) rec.reason = String(entry.reason).slice(0, 32);
  // storage_persist (PWA): navigator.storage.persist() result
  if (typeof entry.granted === 'boolean') rec.granted = entry.granted;
  return addEvent(rec);
}

/**
 * Game/metrics READ path.
 * @param {{ from?: string|Date, to?: string|Date, bookId?: string, type?: string }} [opts]
 */
export async function listReadingEvents(opts) {
  const options = opts || {};
  const from = options.from != null ? normalizeDate(options.from) : null;
  const to = options.to != null ? normalizeDate(options.to) : null;
  const bookId = options.bookId != null ? String(options.bookId) : null;
  const type = options.type != null ? String(options.type) : null;

  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_EVENTS, 'readonly');
    const req = tx.objectStore(IDB_STORE_EVENTS).getAll();
    req.onsuccess = function () {
      let rows = req.result || [];
      if (from) rows = rows.filter(function (r) { return r.date >= from; });
      if (to) rows = rows.filter(function (r) { return r.date <= to; });
      if (bookId) rows = rows.filter(function (r) { return r.bookId === bookId; });
      if (type) rows = rows.filter(function (r) { return r.type === type; });
      rows.sort(function (a, b) {
        if (a.at !== b.at) return (a.at || '') < (b.at || '') ? -1 : 1;
        return (a.id || 0) - (b.id || 0);
      });
      res(rows);
    };
    req.onerror = function () {
      rej(req.error);
    };
  });
}

export async function clearReadingEvents() {
  const db = await openDb();
  return new Promise(function (res, rej) {
    const tx = db.transaction(IDB_STORE_EVENTS, 'readwrite');
    tx.objectStore(IDB_STORE_EVENTS).clear();
    tx.oncomplete = function () {
      res();
    };
    tx.onerror = function () {
      rej(tx.error);
    };
  });
}
