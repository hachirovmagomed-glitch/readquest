/**
 * Reader session wiring — single source of truth for counted reading minutes.
 *
 * - logSession({ id, date, bookId, minutes, pageTurns }) — ONE row per sitting; `id` = UUID made here
 * - logReadingEvent({ bookId, pageVisibleMs, page }) while reading
 *   (reader WRITES; game only reads sessions[] and awards by sessions[].id)
 *
 * Counted minutes (anti-cheat, Product lock 2026-10-06):
 *   - time is measured per page, only while the tab is visible (hidden/background = 0);
 *   - each page contributes at most `capMs` (default 3 min) — a forgotten open book
 *     can never add more than one cap, including the last page of the session;
 *   - `pageTurns` = forward turns where the page was visible ≥ `minSecMs` (default 12 s).
 *   - optional per-page cap EXTENSION (PDF only, Product 2026-10-06): a qualifying activity
 *     (zoom change, or a pan of more than `minFraction` of the screen) raises THIS page's cap by
 *     `stepMs`, at most once per `everyMs`, never above `maxMs`. Text passes no extension → flat cap.
 *
 * Event API — reading modes (text columns, PDF canvas) only REPORT events; all accounting is here:
 *   begin(bookId, startPage, { capMs, minSecMs, counting, extend })
 *   pageTurned(forward)      user asked for another page (tap / swipe / slider / key); intent only
 *   pageShown(page)          that page is now actually on screen → closes the previous page
 *                            (min(dwell, pageCap) credited; a forward turn after ≥ minSec = pageTurns+1)
 *   userActive(kind, info)   'pan' {fraction} | 'zoom' | … → may extend the current page's cap
 *   jumped(page)             slider / TOC / bookmark jump, once on release: one page_visible {via:'jump'}, no turn
 *   onPageChange(page, fwd)  legacy shorthand = pageTurned(fwd) + pageShown(page)
 *   end() / cancel() / snapshot() / setCounting(on)
 *
 * Day (Product lock 2026-10-06): `date` = the device's LOCAL day on which the session STARTED
 *   (captured in begin()); reading 23:50–00:15 is one row, entirely on the first day.
 *
 * Crash safety: an open session is mirrored to localStorage (`rq_session_draft`) on every
 * page change / visibility change / 15 s, and `recoverDraft()` turns a leftover draft into
 * the sessions[] row on next boot (app killed from the task switcher, etc.).
 */
import { localDay, newSessionId } from './storage/sessions.js?v=20261010-144h';
export { newSessionId };

export const DRAFT_KEY = ((typeof globalThis !== 'undefined' && globalThis.RQ_NS) || 'rq') + '_session_draft';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* quota */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

/** Skip empty sessions: < ~9 s counted and no counted page. */
function isEmpty(minutes, turns) { return minutes < 0.15 && !turns; }

/**
 * @param {{ logSession: Function, logReadingEvent: Function, now?: Function, dayFn?: Function }} api
 */
export function createSessionTracker(api) {
  let bookId = null;
  let sessionId = null;
  let page = 0;
  let turns = 0;          // all forward turns
  let pagesRead = 0;      // forward turns after ≥ minSec on the page
  let visibleAccum = 0;   // for pageVisibleMs events
  let pageClock = 0;
  let dwellAcc = 0;       // visible ms on the current page (counting only)
  let dwellClock = 0;
  let creditedMs = 0;     // sum of capped page dwell
  let capMs = 3 * 60000;
  let pageCapMs = capMs;  // cap of the CURRENT page (capMs, possibly extended by userActive)
  let extend = null;      // {stepMs, everyMs, maxMs, minFraction} | null (text: no extension)
  let lastExtAt = -Infinity;
  let pendingTurn = 0;    // +1 forward / -1 back requested by pageTurned(), consumed by pageShown()
  let extCount = 0;       // diagnostics: extensions granted on the current page
  let minSecMs = 12000;
  let counting = true;
  let running = false;
  let startedAt = 0;
  let startDay = null;    // local YYYY-MM-DD of begin() — the session's day
  let flushTimer = null;
  const FLUSH_EVERY_MS = 15000;

  function docVisible() {
    return typeof document === 'undefined' ? true : document.visibilityState !== 'hidden';
  }
  function now() {
    if (api.now) return api.now();
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
  function today() { return api.dayFn ? api.dayFn() : localDay(Date.now()); }
  function sessionDay() { return startDay || today(); }

  /* --- visible-time clock for pageVisibleMs events (unchanged semantics) --- */
  function startClock() { pageClock = docVisible() ? now() : 0; }
  function pauseClock() {
    if (pageClock) { visibleAccum += now() - pageClock; pageClock = 0; }
  }

  /* --- counted dwell on the current page --- */
  function dwellStart() { dwellClock = running && counting && docVisible() ? now() : 0; }
  function dwellPause() {
    if (dwellClock) { dwellAcc += now() - dwellClock; dwellClock = 0; }
  }
  function dwellLive() { return dwellAcc + (dwellClock ? now() - dwellClock : 0); }
  /** Close the current page: add min(dwell, cap); returns raw dwell. */
  function creditPage() {
    dwellPause();
    const raw = dwellAcc;
    creditedMs += Math.min(raw, pageCapMs);
    dwellAcc = 0;
    return raw;
  }
  function newPageCap() { pageCapMs = capMs; lastExtAt = -Infinity; extCount = 0; }
  function countedMsLive() { return creditedMs + Math.min(dwellLive(), pageCapMs); }

  function persistDraft() {
    if (!running || !bookId || api.noDraft) return; /* noDraft: browser without navigator.locks — nothing to recover = no XP */
    lsSet(DRAFT_KEY, JSON.stringify({
      id: sessionId,
      bookId: bookId,
      date: sessionDay(),
      countedMs: Math.round(countedMsLive()),
      pageTurns: pagesRead,
      startedAt: startedAt,
      updatedAt: Date.now(),
    }));
  }

  async function flushEvent(via) {
    if (!running || !bookId) return null;
    pauseClock();
    const ms = Math.round(visibleAccum);
    visibleAccum = 0;
    if (docVisible()) startClock();
    if (ms <= 0 && via !== 'jump') return null; /* a jump is always ONE event (tests / metrics count them) */
    try {
      const ev = { bookId: bookId, pageVisibleMs: Math.max(0, ms), page: page };
      if (via) ev.via = via;
      return await api.logReadingEvent(ev);
    } catch (e) {
      console.warn('[rq] logReadingEvent failed', e);
      return null;
    }
  }

  function armFlush() {
    clearInterval(flushTimer);
    flushTimer = setInterval(function () { flushEvent(); persistDraft(); }, FLUSH_EVERY_MS);
  }

  function onVis() {
    if (!running) return;
    if (docVisible()) { startClock(); dwellStart(); }
    else { dwellPause(); persistDraft(); flushEvent(); }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVis);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', function () { if (running) { dwellPause(); persistDraft(); } });
  }

  /** Remove the crash draft only if it still belongs to `id` (a newer session may own the slot by now). */
  function delDraftOf(id) {
    let d = null;
    try { d = JSON.parse(lsGet(DRAFT_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || d.id === id) lsDel(DRAFT_KEY);
  }

  /**
   * Close the running session SYNCHRONOUSLY (the counters are final the moment this returns):
   * close the last page (capped), start the pageVisibleMs flush, build the row, reset.
   * @returns {{row: object|null, ev: Promise|null}}
   */
  function closeRunning(options) {
    creditPage();
    clearInterval(flushTimer); flushTimer = null;
    const ev = flushEvent(); /* args captured synchronously, before reset() */
    const row = {
      id: sessionId,
      date: options.date || sessionDay(),   // day the session STARTED (local)
      bookId: bookId,
      minutes: creditedMs / 60000,
      pageTurns: pagesRead,
      startedAt: startedAt ? new Date(startedAt).toISOString() : undefined, // ISO; orders XP inside a day (game-awards xpForSession)
    };
    if (!row.bookId || isEmpty(row.minutes, row.pageTurns)) { reset(); return { row: null, ev: ev }; }
    /* keep the draft until the row is durably written (recoverDraft retries on next boot) */
    reset(true);
    return { row: row, ev: ev };
  }

  async function writeRow(row) {
    if (!row) return null;
    try {
      const stored = await api.logSession(row);
      delDraftOf(row.id);
      return stored;
    } catch (e) {
      console.warn('[rq] logSession failed — draft kept for recovery', e);
      const d = JSON.stringify({ id: row.id, bookId: row.bookId, date: row.date,
        countedMs: Math.round(row.minutes * 60000), pageTurns: row.pageTurns, startedAt: row.startedAt, updatedAt: Date.now() });
      /* a newer session owns the main draft slot → keep this one in the spare slot (recoverDraft reads both) */
      if (running && sessionId !== row.id) lsSet(DRAFT_KEY + '_prev', d); else lsSet(DRAFT_KEY, d);
      return null;
    }
  }

  let staleHandler = null;

  function reset(keepDraft) {
    clearInterval(flushTimer); flushTimer = null;
    running = false; bookId = null; sessionId = null; startDay = null;
    pageClock = 0; visibleAccum = 0; dwellAcc = 0; dwellClock = 0;
    creditedMs = 0; turns = 0; pagesRead = 0; pendingTurn = 0; newPageCap();
    if (!keepDraft) lsDel(DRAFT_KEY);
  }

  return {
    /**
     * Reader opened a book.
     * @param {string} id
     * @param {number} startPage
     * @param {{ capMs?: number, minSecMs?: number, counting?: boolean,
     *          extend?: {stepMs:number, everyMs:number, maxMs:number, minFraction?:number}|null }} [opts]
     */
    begin(id, startPage, opts) {
      const o = opts || {};
      /* 1б: a session that is still running is NEVER overwritten. It is closed exactly like end() — one row,
         its minutes kept — before the new one starts. The app normally closes it first (closeReader quiet path,
         with payout); this is the safety net. The row write is async; the app hears about it via setStaleHandler. */
      if (running) {
        const c = closeRunning({});
        const p = Promise.resolve(c.ev).then(function () { return writeRow(c.row); });
        if (staleHandler) { try { staleHandler(p); } catch (e) { console.warn('[rq] stale handler', e); } }
      }
      flushEvent();
      bookId = id != null ? String(id) : null;
      sessionId = newSessionId();
      page = startPage || 0;
      turns = 0; pagesRead = 0; visibleAccum = 0;
      dwellAcc = 0; dwellClock = 0; creditedMs = 0;
      if (o.capMs != null) capMs = Math.max(0, Number(o.capMs));
      if (o.minSecMs != null) minSecMs = Math.max(0, Number(o.minSecMs));
      counting = o.counting !== false;
      extend = o.extend && o.extend.stepMs > 0 ? {
        stepMs: Number(o.extend.stepMs), everyMs: Number(o.extend.everyMs) || 60000,
        maxMs: Math.max(capMs, Number(o.extend.maxMs) || capMs),
        minFraction: o.extend.minFraction != null ? Number(o.extend.minFraction) : 0.2,
      } : null;
      pendingTurn = 0; newPageCap();
      startedAt = Date.now();
      startDay = today();
      running = !!bookId;
      startClock();
      dwellStart();
      armFlush();
      persistDraft();
    },

    /** Full UI only (timer ▶/⏸). MVP keeps counting on. */
    setCounting(on) {
      if (!running) { counting = !!on; return; }
      if (!on) { dwellPause(); counting = false; }
      else { counting = true; dwellStart(); }
    },

    /** The user asked for another page (tap / swipe / slider / key). Intent only — the page is
     *  closed when the new one is actually shown (pageShown). */
    pageTurned(forward) {
      if (!running) return;
      pendingTurn = forward === false ? -1 : 1;
    },

    /**
     * A page is now on screen (after the render/transform swap). Closes the previous page:
     * min(dwell, pageCap) is credited; a pending FORWARD turn after ≥ minSec counts as pageTurns.
     * @param {number} newPage
     */
    pageShown(newPage) {
      if (!running) return;
      if (newPage === page && !pendingTurn) return;
      flushEvent('turn');
      const raw = creditPage();
      if (pendingTurn > 0) {
        turns += 1;
        if (counting && raw >= minSecMs) pagesRead += 1;
      }
      pendingTurn = 0;
      page = newPage;
      newPageCap();
      startClock();
      dwellStart();
      persistDraft();
    },

    /**
     * The reader is actively working with the current page.
     * @param {'pan'|'zoom'|string} kind
     * @param {{fraction?: number}} [info] pan: max(|dx|/screenW, |dy|/screenH)
     * @returns {boolean} true when the page cap was extended
     */
    userActive(kind, info) {
      if (!running || !extend) return false;
      const qualifies = kind === 'zoom' ||
        (kind === 'pan' && info && Number(info.fraction) > extend.minFraction);
      if (!qualifies) return false;
      const t = now();
      if (t - lastExtAt < extend.everyMs) return false;
      if (pageCapMs >= extend.maxMs) return false;
      lastExtAt = t;
      pageCapMs = Math.min(extend.maxMs, pageCapMs + extend.stepMs);
      extCount += 1;
      persistDraft();
      return true;
    },

    /**
     * 1б: jump by slider / TOC / bookmark / search (called ONCE, when the finger is released).
     * Closes the previous page (capped dwell credited) with one `page_visible` {via:'jump'};
     * never a page turn: pageTurns and the fast-flip count stay as they are; new page = fresh cap.
     */
    jumped(newPage) {
      if (!running) return;
      pendingTurn = 0;
      if (newPage === page) return;
      flushEvent('jump');
      creditPage();
      page = newPage;
      newPageCap();
      startClock();
      dwellStart();
      persistDraft();
    },

    /** Legacy shorthand: pageTurned(fwd) + pageShown(page). */
    onPageChange(newPage, wasForwardTurn) {
      if (!running) return;
      if (wasForwardTurn) pendingTurn = 1;
      this.pageShown(newPage);
    },

    /** Live counted state (for the day-progress bar). */
    snapshot() {
      return { countedMs: countedMsLive(), minutes: countedMsLive() / 60000, pageTurns: pagesRead, turns: turns,
        page: page, pageCapMs: pageCapMs, pageDwellMs: dwellLive(), extensions: extCount };
    },
    getPageTurns() { return pagesRead; },
    getBookId() { return bookId; },
    getSessionId() { return sessionId; },
    /** Local day (YYYY-MM-DD) the running session belongs to (= day it started). */
    getSessionDay() { return running ? sessionDay() : null; },
    isRunning() { return running; },

    /**
     * End of session: close the last page (capped), flush pageVisibleMs and append ONE
     * sessions[] row. Minutes are computed HERE (single source of truth).
     * @param {{ date?: string|Date }} [opts] (date override for tests only; default = start day)
     * @returns {Promise<object|null>} stored row (with UUID id) or null if empty
     */
    async end(opts) {
      const options = opts || {};
      if (!running) return null;
      const c = closeRunning(options);
      await c.ev;
      return writeRow(c.row);
    },

    /** fn(promise of the stored row | null) — called when begin() had to close a still-running session. */
    setStaleHandler(fn) { staleHandler = typeof fn === 'function' ? fn : null; },

    /** Abort without logging a session (still flush visibility crumbs) */
    async cancel() {
      clearInterval(flushTimer); flushTimer = null;
      await flushEvent();
      reset();
    },
  };
}

/**
 * Boot-time recovery: a draft left by a killed tab becomes its sessions[] row.
 * Idempotent: the draft is removed first; a row with the same id is never written twice
 * (checked against existing rows; IDB key uniqueness is the second guard).
 */
export async function recoverDraft(api) {
  /* spare slot first: a session closed by begin() whose row write failed while the next session owned DRAFT_KEY */
  const prev = lsGet(DRAFT_KEY + '_prev');
  if (prev) { lsDel(DRAFT_KEY + '_prev'); await recoverRaw(api, prev); }
  const raw = lsGet(DRAFT_KEY);
  if (!raw) return null;
  lsDel(DRAFT_KEY);
  return recoverRaw(api, raw);
}

async function recoverRaw(api, raw) {
  let d;
  try { d = JSON.parse(raw); } catch (e) { return null; }
  if (!d || !d.bookId || typeof d.id !== 'string') return null;
  const minutes = (Number(d.countedMs) || 0) / 60000;
  const turns = Number(d.pageTurns) || 0;
  if (isEmpty(minutes, turns)) return null;
  try {
    if (api.listSessions) {
      const rows = await api.listSessions({});
      if (rows.some(function (r) { return r.id === d.id; })) return null;
    }
    return await api.logSession({
      id: d.id, date: d.date, bookId: d.bookId, minutes: minutes, pageTurns: turns, startedAt: d.startedAt,
    });
  } catch (e) {
    console.warn('[rq] recoverDraft failed', e);
    return null;
  }
}
