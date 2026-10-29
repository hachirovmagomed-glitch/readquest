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
 *   - a page left by a turn after less than `minSecMs` credits no time at all (Джессика 17.10: no XP for flipping);
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
 *   relaid(page)             same text re-paginated (panels / rotation): index only — no event, no credit, cap kept
 *   onPageChange(page, fwd)  legacy shorthand = pageTurned(fwd) + pageShown(page)
 *   end() / cancel() / snapshot() / setCounting(on)
 *
 * Book level (19.10, game-awards.js LEVELS): begin(…, { level }) — the row gets `lvl` (only when > 0), dropped by
 *   paceLevel() when the average counted time per forward turn is too short for that level (skimming a hard book).
 *
 * Honest reading (25.10, Джессика «Давай все кроме 3 и 6», begin(…, { honest: {…} }); without it everything is as before):
 *   - live screen: a page earns time only up to `capMs` after the last sign of life on it (arrival, pan/zoom/scroll/touch via
 *     userActive) — the PDF extension no longer keeps a forgotten page ticking; the page the session ENDS on (left by «назад»,
 *     not by a turn) earns at most `tailMs` after its last sign of life (row.ct = seconds cut that way);
 *   - re-reading: honest.span(page) → [from, to] of the book (0…1); a page whose middle is already in honest.seen (merged spans
 *     of pages credited before) credits nothing (row.rr = such pages); a newly credited page joins the spans (coverage());
 *   - honest.hon (0.5…1, the quiet honesty index computed by the app from the last two weeks) goes into the row as `hon` when < 1;
 *     row.fl = forward turns faster than minSec (the personal pace floor the app passes as minSecMs).
 *
 * Day (Product lock 2026-10-06): `date` = the device's LOCAL day on which the session STARTED
 *   (captured in begin()); reading 23:50–00:15 is one row, entirely on the first day.
 *
 * Crash safety: an open session is mirrored to localStorage (`rq_session_draft`) on every
 * page change / visibility change / 15 s, and `recoverDraft()` turns a leftover draft into
 * the sessions[] row on next boot (app killed from the task switcher, etc.).
 */
import { localDay, newSessionId } from './storage/sessions.js?v=20261029-1051';
import { paceLevel } from './game-awards.js?v=20261029-1051';
export { newSessionId };

export const DRAFT_KEY = ((typeof globalThis !== 'undefined' && globalThis.RQ_NS) || 'rq') + '_session_draft';

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* quota */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

/** 25.10: focus fields → row (only the non-empty ones; game-awards rowPomo validates them against the minutes) */
function focusInto(row, f) {
  if (!f) return row;
  if (Array.isArray(f.pomo) && f.pomo.length) row.pomo = f.pomo.slice(0, 50);
  if (f.pomoRun > 0 && row.pomo) row.pomoRun = f.pomoRun;
  if (f.fw) row.fw = String(f.fw).slice(0, 80);
  return row;
}

/** Skip empty sessions: < ~9 s counted and no counted page. */
/* Empty = no row, no XP: under one counted minute without a single honest page turn (Джессика 17.10: «дают опыт за то, что я просто вошёл в книжку»). */
function isEmpty(minutes, turns) { return minutes < 1 && !turns; }

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
  let level = 0;          // book level for this session (0 = ordinary); the row stores paceLevel(level, …)
  let pageMs = [];        // counted ms of every closed page (only while level > 0) — the pace check
  let focus = null;       // 25.10 «Фокус» (js/focus.js): {pomo:[25,…], pomoRun, fw} — copied into the row; the game validates it
  let counting = true;
  let running = false;
  let startedAt = 0;
  let startDay = null;    // local YYYY-MM-DD of begin() — the session's day
  let flushTimer = null;
  let held = false;       // 1в-black: clock held while the page is re-drawn after return from background
  let honest = null;      // 25.10: {tailMs, span, hon} | null (old rules)
  let seen = [];          // merged [from, to] spans of the book credited so far (honest.span)
  let lastSeen = null;    // coverage of the last closed session (coverage())
  let sigMs = 0;          // dwell on the current page at its last sign of life
  let cutMs = 0;          // time cut on the last page (no sign of life before «назад»)
  let reread = 0;         // pages that credited nothing because they were read before
  let lastReread = false; // the page creditPage() just closed was a re-read one (not a page read)
  let mine = {};          // this session: span start → credited ms (a revisited page shares one cap)
  let fresh = [];         // spans credited in this session (join `seen` at the end)
  let fast = 0;           // forward turns after less than minSec on the page
  let fastRun = 0;        // forward turns faster than minSec in a row (the app's auto-pause), counted while paused too
  let pageAt = 0;         // when the current page appeared (wall clock of now())
  let lastStats = null;   // {rr, ct, fl} of the last closed session, also when it wrote no row
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
  function dwellStart() { dwellClock = running && counting && !held && docVisible() ? now() : 0; }
  function dwellPause() {
    if (dwellClock) { dwellAcc += now() - dwellClock; dwellClock = 0; }
  }
  function dwellLive() { return dwellAcc + (dwellClock ? now() - dwellClock : 0); }
  /** Close the current page: add min(dwell, cap); returns raw dwell.
   *  Anti-cheat 17.10 (Джессика: flipping gave XP): a page left by a turn after less than `floorMs` (= minSec, 12 s)
   *  credits nothing — fast flipping adds no minutes, XP, streak or map progress. The last page of a session is not floored. */
  function creditPage(floorMs, last) {
    dwellPause();
    lastReread = false;
    const raw = dwellAcc;
    let got = floorMs > 0 && raw < floorMs ? 0 : Math.min(raw, pageCapMs);
    if (honest) {
      const live = Math.min(got, sigMs + (last ? honest.tailMs : capMs)); /* no sign of life → the clock stopped */
      if (last) cutMs += got - live;
      got = live;
      if (got > 0 && honest.span) {
        const sp = honest.span(page);
        if (sp && covered(seen, sp)) { got = 0; if (raw >= minSecMs) reread += 1; lastReread = true; } /* read in an earlier session */
        else if (sp) {
          const k = sp[0].toFixed(5), had = mine[k] || 0;
          got = Math.min(got, Math.max(0, pageCapMs - had)); /* back on a page of THIS session: one page cap in all, not a new page */
          if (had > 0) lastReread = true;
          mine[k] = had + got; fresh = addSpan(fresh, sp);
        }
      }
    }
    creditedMs += got;
    pageMs.push(got); /* always: the level can arrive mid-session (setLevel, PDF text checked after open) */
    dwellAcc = 0;
    return raw;
  }
  function newPageCap() { pageCapMs = capMs; lastExtAt = -Infinity; extCount = 0; sigMs = 0; }
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
      lvl: rowLvl() || undefined,
      fl: honest && fast > 0 ? fast : undefined,
      hon: honest && honest.hon < 1 ? honest.hon : undefined,
      pomo: focus && focus.pomo, pomoRun: focus && focus.pomoRun, fw: focus && focus.fw,
      updatedAt: Date.now(),
    }));
  }

  /** level of the row: closed pages + the open one (counted so far) */
  function rowLvl() { return level > 0 ? paceLevel(level, pageMs.concat([Math.min(dwellLive(), pageCapMs)]), turns) : 0; }

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
    creditPage(0, true);
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
    const lv = level > 0 ? paceLevel(level, pageMs, turns) : 0; /* creditPage() above already closed the last page */
    if (lv > 0) row.lvl = lv;
    if (honest) {
      if (fast > 0) row.fl = fast;
      if (cutMs >= 1000) row.ct = Math.round(cutMs / 1000);
      if (reread > 0) row.rr = reread;
      if (honest.hon < 1) row.hon = honest.hon;
      lastSeen = honest.span ? fresh.reduce(addSpan, seen) : null;
    }
    lastStats = { rr: reread, ct: Math.round(cutMs / 1000), fl: fast }; /* 25.10: why an empty session was empty (the app says it) */
    focusInto(row, focus);
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
        countedMs: Math.round(row.minutes * 60000), pageTurns: row.pageTurns, startedAt: row.startedAt, lvl: row.lvl,
        fl: row.fl, ct: row.ct, rr: row.rr, hon: row.hon, pomo: row.pomo, pomoRun: row.pomoRun, fw: row.fw, updatedAt: Date.now() });
      /* a newer session owns the main draft slot → keep this one in the spare slot (recoverDraft reads both) */
      if (running && sessionId !== row.id) lsSet(DRAFT_KEY + '_prev', d); else lsSet(DRAFT_KEY, d);
      return null;
    }
  }

  let staleHandler = null;

  function reset(keepDraft) {
    clearInterval(flushTimer); flushTimer = null;
    running = false; held = false; bookId = null; sessionId = null; startDay = null;
    pageClock = 0; visibleAccum = 0; dwellAcc = 0; dwellClock = 0;
    creditedMs = 0; turns = 0; pagesRead = 0; pendingTurn = 0; level = 0; pageMs = []; focus = null; newPageCap();
    honest = null; seen = []; cutMs = 0; reread = 0; mine = {}; fresh = []; fast = 0;
    if (!keepDraft) lsDel(DRAFT_KEY);
  }

  return {
    /**
     * Reader opened a book.
     * @param {string} id
     * @param {number} startPage
     * @param {{ capMs?: number, minSecMs?: number, counting?: boolean,
     *          extend?: {stepMs:number, everyMs:number, maxMs:number, minFraction?:number}|null, level?: number }} [opts]
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
      level = Number.isInteger(o.level) && o.level > 0 ? o.level : 0; pageMs = [];
      extend = o.extend && o.extend.stepMs > 0 ? {
        stepMs: Number(o.extend.stepMs), everyMs: Number(o.extend.everyMs) || 60000,
        maxMs: Math.max(capMs, Number(o.extend.maxMs) || capMs),
        minFraction: o.extend.minFraction != null ? Number(o.extend.minFraction) : 0.2,
      } : null;
      pendingTurn = 0; newPageCap();
      const h = o.honest;
      honest = h && typeof h === 'object' ? {
        tailMs: Math.max(0, Number(h.tailMs) || 0),
        span: typeof h.span === 'function' ? h.span : null,
        hon: Number(h.hon) > 0 && Number(h.hon) < 1 ? Math.max(0.5, Math.round(Number(h.hon) * 100) / 100) : 1,
      } : null;
      seen = honest && Array.isArray(h.seen) ? normSpans(h.seen) : [];
      cutMs = 0; reread = 0; lastSeen = null; mine = {}; fresh = []; fast = 0; fastRun = 0; pageAt = now();
      startedAt = Date.now();
      startDay = today();
      running = !!bookId; held = false;
      startClock();
      dwellStart();
      armFlush();
      persistDraft();
    },

    /**
     * 19.10: the book level became known after begin() (PDF: its text is sampled in the background).
     * From now on the row gets this level (pace-checked over the whole session); the page cap grows to `newCapMs`, never shrinks.
     */
    setLevel(lvl, newCapMs) {
      if (!running) return;
      level = Number.isInteger(lvl) && lvl > 0 ? lvl : 0;
      if (newCapMs > capMs) { capMs = newCapMs; if (pageCapMs < capMs) pageCapMs = capMs; }
      persistDraft();
    },

    /** 25.10 «Фокус»: completed rounds / run / focus words of THIS session (js/focus.js); replaces the previous value */
    setFocus(info) {
      if (!running) return;
      focus = info && typeof info === 'object' ? { pomo: Array.isArray(info.pomo) ? info.pomo.slice(0, 50) : [], pomoRun: info.pomoRun | 0, fw: info.fw ? String(info.fw).slice(0, 80) : '' } : null;
      persistDraft();
    },
    /** id of the running session (focus.js keeps its round state per session) */
    sessionId() { return running ? sessionId : null; },

    /** 1в-black: hold the counted clock until the page is back on screen (pdf resume re-render). */
    holdResume() { held = true; dwellPause(); },
    /** Release the hold (after the swap, or on failure/cancel) — idempotent. */
    releaseResume() { if (!held) return; held = false; dwellStart(); },
    isHeld() { return held; },

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
    pageShown(newPage, via) {
      if (!running) return;
      if (newPage === page && !pendingTurn) return;
      flushEvent(via === 'tts' ? 'tts' : 'turn'); /* 1в: read-aloud auto-advance is marked, never a reading turn */
      if (via === 'tts') pendingTurn = 0;
      const raw = creditPage(via === 'tts' ? 0 : minSecMs);
      const age = now() - pageAt; pageAt = now(); /* wall time on the page, also while paused (auto-pause) */
      if (via !== 'tts') fastRun = pendingTurn > 0 && age < minSecMs ? fastRun + 1 : (pendingTurn > 0 ? 0 : fastRun);
      if (pendingTurn > 0) {
        turns += 1;
        if (counting && raw >= minSecMs && !lastReread) pagesRead += 1;
        if (counting && raw < minSecMs) fast += 1;

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
      if (!running) return false;
      sigMs = dwellLive(); /* 25.10: any work with the page is a sign of life (honest rules) */
      if (!extend) return false;
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
      creditPage(minSecMs); /* jumping on after a few seconds is flipping too */
      page = newPage; pageAt = now();
      newPageCap();
      startClock();
      dwellStart();
      persistDraft();
    },

    /**
     * The SAME text was re-paginated (panels shown/hidden, rotation, font metrics): only the page INDEX changed.
     * Not a page change: no page_visible event, nothing credited, the page cap / dwell / pending turn are kept.
     * @param {number} newPage index of the same text in the new layout
     */
    relaid(newPage) {
      if (!running) return;
      page = newPage; /* memory only: the draft has no page field, so nothing is written to storage */
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
        page: page, pageCapMs: pageCapMs, pageDwellMs: dwellLive(), extensions: extCount, fastRun: fastRun, counting: counting, pageAgeMs: running ? now() - pageAt : 0, minSecMs: minSecMs,
        /* 25.10 «Фокус»: counted ms that can no longer be taken back (the open page only once it passed minSec) — never decreases */
        sureMs: creditedMs + (dwellLive() >= minSecMs ? Math.min(dwellLive(), pageCapMs) : 0) };
    },
    getPageTurns() { return pagesRead; },
    /** 25.10: merged [from, to] spans of the book after the last end() (honest.span given), else null */
    coverage() { return lastSeen; },
    /** 25.10: {rr, ct, fl} of the last end(), also for an empty session (no row) */
    lastStats() { return lastStats; },
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
      id: d.id, date: d.date, bookId: d.bookId, minutes: minutes, pageTurns: turns, startedAt: d.startedAt, lvl: d.lvl,
      fl: d.fl, ct: d.ct, rr: d.rr, hon: d.hon,
      pomo: d.pomo, pomoRun: d.pomoRun, fw: d.fw,
    });
  } catch (e) {
    console.warn('[rq] recoverDraft failed', e);
    return null;
  }
}

/* ===== 25.10: spans of a book already read (honest rules) — merged, sorted [from, to] within 0…1 ===== */
const SPAN_EPS = 1e-6;
export const SPANS_MAX = 300;
export function normSpans(list) {
  let out = [];
  (Array.isArray(list) ? list : []).forEach(function (x) {
    if (!Array.isArray(x) || x.length !== 2) return;
    const a = Number(x[0]), b = Number(x[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b > 1 || b <= a) return;
    out = addSpan(out, [a, b]);
  });
  return out;
}
/** the middle of `sp` lies in a span already read */
export function covered(spans, sp) {
  const m = (sp[0] + sp[1]) / 2;
  return (spans || []).some(function (x) { return m >= x[0] - SPAN_EPS && m <= x[1] + SPAN_EPS; });
}
/** add [a, b], merge touching spans, round to 5 places; over SPANS_MAX the smallest gap is closed */
export function addSpan(spans, sp) {
  const r = function (v) { return Math.round(v * 1e5) / 1e5; };
  const all = (spans || []).map(function (x) { return [x[0], x[1]]; }).concat([[r(sp[0]), r(sp[1])]]).sort(function (x, y) { return x[0] - y[0]; });
  const out = [];
  all.forEach(function (x) {
    const l = out[out.length - 1];
    if (l && x[0] <= l[1] + 1e-4) l[1] = Math.max(l[1], x[1]);
    else out.push([x[0], x[1]]);
  });
  while (out.length > SPANS_MAX) {
    let k = 1;
    for (let i = 2; i < out.length; i++) if (out[i][0] - out[i - 1][1] < out[k][0] - out[k - 1][1]) k = i;
    out[k - 1][1] = out[k][1]; out.splice(k, 1);
  }
  return out;
}
