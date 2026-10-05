/**
 * Reader session wiring — Product #1 + Architect contract.
 *
 * - logSession({ date, bookId, minutes, pageTurns }) at session end
 * - logReadingEvent({ bookId, pageVisibleMs, page }) while reading
 *   (reader WRITES; game only reads)
 *
 * Soft streak ≥2 min is handled in app.html closeReader (comment + hook).
 */
import { dayKey } from './storage/sessions.js';

/**
 * @param {{
 *   logSession: Function,
 *   logReadingEvent: Function,
 * }} api
 */
export function createSessionTracker(api) {
  let bookId = null;
  let page = 0;
  let pageTurns = 0;
  let visibleAccum = 0;
  let pageClock = 0;
  let running = false;
  let flushTimer = null;
  const FLUSH_EVERY_MS = 15000;

  function docVisible() {
    return typeof document === 'undefined'
      ? true
      : document.visibilityState !== 'hidden';
  }

  function now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  function startClock() {
    pageClock = docVisible() ? now() : 0;
  }

  function pauseClock() {
    if (pageClock) {
      visibleAccum += now() - pageClock;
      pageClock = 0;
    }
  }

  async function flushEvent() {
    if (!running || !bookId) return null;
    pauseClock();
    const ms = Math.round(visibleAccum);
    visibleAccum = 0;
    if (docVisible()) startClock();
    if (ms <= 0) return null;
    try {
      return await api.logReadingEvent({
        bookId: bookId,
        pageVisibleMs: ms,
        page: page,
      });
    } catch (e) {
      console.warn('[rq] logReadingEvent failed', e);
      return null;
    }
  }

  function armFlush() {
    clearInterval(flushTimer);
    flushTimer = setInterval(function () {
      flushEvent();
    }, FLUSH_EVERY_MS);
  }

  function onVis() {
    if (!running) return;
    if (docVisible()) startClock();
    else {
      flushEvent();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVis);
  }

  return {
    /** Call when reader opens a book */
    begin(id, startPage) {
      flushEvent();
      bookId = id != null ? String(id) : null;
      page = startPage || 0;
      pageTurns = 0;
      visibleAccum = 0;
      running = !!bookId;
      startClock();
      armFlush();
    },

    /**
     * Call from goPage when page index changes.
     * @param {number} newPage
     * @param {boolean} [wasForwardTurn] — user turned forward (counts as pageTurn)
     */
    onPageChange(newPage, wasForwardTurn) {
      if (!running) return;
      // Flush visibility for the previous page before switching
      flushEvent();
      if (wasForwardTurn) pageTurns += 1;
      page = newPage;
      startClock();
    },

    getPageTurns() {
      return pageTurns;
    },

    getBookId() {
      return bookId;
    },

    /**
     * End of session — flush last pageVisibleMs, then append sessions[] row.
     * @param {{ minutes: number, pageTurns?: number, date?: string|Date }} opts
     */
    async end(opts) {
      const options = opts || {};
      clearInterval(flushTimer);
      flushTimer = null;
      await flushEvent();
      const turns =
        options.pageTurns != null ? Number(options.pageTurns) : pageTurns;
      const minutes = Number(options.minutes) || 0;
      const id = bookId;
      running = false;
      pageClock = 0;
      visibleAccum = 0;
      if (!id) return null;
      // Skip empty sessions (same soft gate as closeReader early-exit)
      if (minutes < 0.15 && turns === 0) return null;
      try {
        return await api.logSession({
          date: options.date || dayKey(new Date()),
          bookId: id,
          minutes: minutes,
          pageTurns: turns,
        });
      } catch (e) {
        console.warn('[rq] logSession failed', e);
        return null;
      }
    },

    /** Abort without logging a session (still flush visibility crumbs) */
    async cancel() {
      clearInterval(flushTimer);
      flushTimer = null;
      await flushEvent();
      running = false;
      bookId = null;
      pageClock = 0;
      visibleAccum = 0;
    },
  };
}
