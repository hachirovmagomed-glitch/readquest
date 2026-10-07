# ReadQuest · reader wiring (MVP)

Entry point for testers: **`app.html`** (not `v6.html`).

`v6.html` is the untouched monolith reference. Live UI boots **only** via `bootStorage()` and writes **only** to `rq_v1` + IndexedDB.

## What was wired

| Hook | When | Storage call |
|------|------|----------------|
| Session end | `closeReader()` → `tracker.end()` (minutes computed in the tracker) | ONE `logSession({ id: UUID, date, bookId, minutes, pageTurns })` → IDB `sessions`; then game awards XP by `id` |
| Counted minutes | every page change | visible time on the page, capped at 3 min/page (last page too); hidden tab = 0 |
| Crash safety | page change / hidden / pagehide / 15 s | draft in `localStorage.rq_session_draft` → `recoverDraft()` on next boot |
| Page visibility | page change / visibility hidden / every 15s | `logReadingEvent({ bookId, pageVisibleMs, page })` → IDB `events` |
| Session day | `tracker.begin()` | `date` = **local** day the session started (`localDay()`, never UTC); 23:50–00:15 = one row on the first day |
| Soft streak | end of session | streak updates when the session day's minutes ≥ 2 (daily quest still needs goal, default **10**) |
| Hero stub | profile «Создать героя» | `logAnalyticsEvent({ type: 'hero_create_tapped', date, at })` → IDB `events` (toast «Скоро ✨»). **Not** written to `sessions`. |

## Boot path (single writer)

1. Module script imports `storage/index.js` + `reader-session.js`.
2. `await bootStorage()` — migrates legacy `readquest` → `rq_v1` once (texts → IDB `files`).
3. `window.__rqStart(api, tracker)` hydrates flat state from `loadFlat()`, loads book texts from IDB, then shows library.
4. `save()` → **`saveFlat(S)` only** (envelope `rq_v1`). Bodies stripped to IDB. **Never** `localStorage.setItem('readquest', …)`.

## Files

```
/workspace/readquest/
  app.html              ← runnable MVP (library + reader + session logging)
  reader-session.js     ← pageVisibleMs tracker + end→logSession
  v6.html               ← DO NOT EDIT (reference)
  STORAGE.md            ← Architect save contract
  READER.md             ← this file
  storage/…             ← schema, idb, sessions, events, migrate, adapter
```

## How to open / test

```bash
cd /workspace/readquest && python3 -m http.server 8765
# open http://localhost:8765/app.html
```

### Manual check

1. Open `app.html` → library loads (goal default **10** on fresh install).
2. Open a demo book → start timer ▶ → turn a few pages → back (close reader).
3. DevTools → Application → IndexedDB → `readquest`:
   - `sessions` has a row `{ date, bookId, minutes, pageTurns }`
   - `events` has `page_visible` rows with `pageVisibleMs`
4. Profile → **Создать героя** → toast «Скоро ✨» → `events` row `{ type: 'hero_create_tapped', date, at }`.
5. Confirm localStorage has **`rq_v1`** (and `rq_set`); after migration, app must not keep writing the legacy `readquest` key.

### Harness

- `storage/test.html` — storage APIs in isolation
- `smoke-session.html` — quick boot + logSession/events/analytics check

## Android render fix (2026-10-06)

- Root cause of the blank page on flip: `#content` (one CSS multi-column strip, N pages wide) had
  `transition: transform .22s`. During the transition Chrome promoted the whole strip to one huge composited
  layer and animated it on the compositor towards an offset whose tiles were not rasterized yet → blank
  (checkerboard) page with the page chrome still visible; deeper pages = bigger offset = worse.
  Now: no transition / no will-change on the strip; the flip is one main-thread commit, so Chrome keeps the
  previous frame until the new page's tiles are ready. Opening a book measures + positions synchronously.
- Pinch: `#viewer { touch-action: none }` (text mode) + non-passive `touchmove` `preventDefault` + iOS
  `gesturestart` → the browser never scales the text layer. Pinch = font size (like Aa): only a small «Aa N»
  hint during the gesture, exactly ONE reflow on the first finger up, reading position kept via a text anchor
  (`captureAnchor` / `pageOfAnchor`). `relayout()` skips the reflow when geometry/typography did not change.
- Taps are handled on `touchend` (Chrome can swallow the synthetic click right after a swipe).
- MVP: no reading timer / ▶ button / timer toasts. Opening a book starts counting; thin day-progress bar
  (`#dayBar`, 3 px) under the page.

## Local day + flip/pinch feedback (2026-10-06, build 2)

- **Local day**: one helper `localDay(ts)` (`storage/sessions.js`, swapped into `window.localDay` at boot).
  The tracker captures the day in `begin()`; `end()` writes that day. Day bar, summary and streak use the
  session day; library/profile «сегодня» use `localDay(Date.now())`. No `toISOString().slice(0,10)` for days.
- **Page number / book progress**: `#rPage`, `#rPct` and `#pgSlider` are set in `goPage()` in the same task as
  the strip transform → same frame as the new text; no CSS transitions on them. (While the bars are auto-hidden
  (`.barsoff`) the footer is not shown.)
- **Pinch «Aa N»**: `#pinchHint` (`position:fixed`, centred, outside `#viewer`/columns, `pointer-events:none`,
  `contain:layout paint style`, bg `rgba(12,33,39,.9)`, text `#e6f1f2`, «Aa» `#2bb3c0`, radius 12px, 19px).
  Shown on the 2-finger `touchstart` with the current size; N = predicted size 14–30 follows the fingers;
  hidden immediately on `touchend`/`touchcancel`, then exactly one reflow (`setFontSizeKeepPos`).
  `show()` hides it on every screen change.

## Build 3 (2026-10-06): always-on page number, auto gold

- **Page number** `#pgNum` «34 / 210» in its own 18px strip `#pgLine` between `#viewer` and `#dayBar`
  (bottom-right, 11px, reader text colour at opacity .45, `pointer-events:none`, `contain:layout paint style`).
  It is outside the columns, so it can never overlap a text line, and updating it never reflows the text. It is set in
  `goPage()` together with the transform. Visible in immersive mode and when the bars are auto-hidden. While the
  bars are shown the footer already shows the number, so the corner digits are hidden (`visibility:hidden`,
  which keeps the space and avoids a reflow).
- Session end / recovered draft → `awardPendingSessions()` → XP per row + auto daily/weekly gold (see STORAGE.md).

## Build 4 (2026-10-06): one tap = bars + leave fullscreen

- Reader state is ONE toggle: **reading** = `.barsoff` + browser fullscreen (wanted on phones `<700px` and
  after ⛶), **chrome** = bars shown + fullscreen exited. A centre tap calls `revealChrome()` /
  `concealChrome()`: `exitFullscreen()` and the bars change in the same handler, so there is no idle tap.
  (The old `.imm` class is no longer used.)
- Bars auto-hide after 3.2 s (`armChromeHide` → `concealChrome('timer')`), and the same timer calls
  `requestFullscreen()`. Chrome accepts this while the tap's transient user activation is alive (~5 s;
  `exitFullscreen` does not consume it). If `navigator.userActivation.isActive` is false or the request is
  rejected, `fsPending` is set, and the next reading gesture (edge tap / swipe) calls `requestFullscreen()`
  inside its own handler before the flip (`fsResume`). The gesture still flips, and a pinch never triggers
  it. Diagnostics: `window.__rqFsLog`.
- Viewport changes (system bars on fullscreen exit/enter, bars) → `relayout()`. The reading anchor is
  kept across chained relayouts (`readingAnchor()` / `R.anc`) until the reader turns a page, so the position
  does not drift. The page number is recomputed in the same `goPage()`.
- Closing the reader (`stopChrome`) leaves fullscreen.

## PDF reader (2026-10-06, build 5 — PDF blocker)

**Layout.** `#pdfWrap` (overflow hidden, `touch-action:none`) › `#pdfStage` (the ONLY transform parent:
`translate3d(tx,ty,0) scale(z·k)`, origin 0 0) › `#pdfSheet` (the page backing, sized to the page at fit-width)
› [front `<canvas>`, `#pdfText` text layer]. Backing, bitmap and text layer can't drift apart: pinch, pan and
interim resize move the whole sheet with one transform. `visualViewport.scale` stays 1 (the browser never
zooms; `gesturestart` is prevented in both modes).

**Rendering (double buffer).** `pdfRender()` always renders `P.target` into a NEW off-DOM canvas
(`page.render().promise`). The visible canvas is never resized, cleared or cancelled. A newer request bumps
`P.seq` and `cancel()`s only the in-flight back render. When it resolves, `pdfSwap()` runs in one rAF and
swaps the canvas, the text layer (built in base coordinates, widths fitted with `measureText`, no layout),
the sheet size, the transform, the corner/bar number and the slider together. `tracker.pageShown()` fires
there too. Bitmap = fit-width × zoom × dpr, capped at **16 MP**. The first frame of a newly opened book stays
hidden until the first swap.

**Rotation.** Only `page.rotate` (the file's `/Rotate`): `getViewport({scale})` without a rotation argument.
Nothing else rotates. The old upside-down/tiny frame came from two `render()` calls on ONE canvas: a second
`renderPdfPage()` (relayout / resize / fullscreen / quick flip) set `canvas.width` during the first render.
That cleared the bitmap and reset the 2D transform, so the rest of the first render was drawn without the
viewport matrix (×1/scale, no y-flip). The second render was rejected by pdf.js ("Cannot use the same canvas
during multiple render() operations") and swallowed silently.

**Viewport changes** (bars, fullscreen enter/exit, system bars, rotation) → `pdfOnResize()`: the old frame is
CSS-scaled at once (`P.k = newWidth / baseWidth`, pan scaled). The re-render waits for a stable, non-zero
size (2 equal rAF samples + ≥120 ms), and only happens if the fit width changed. A height-only change
just re-centres. The code never lays out against a 0-size viewport.

**Gestures** (`pdfTouchStart/Move/End`, `pdfTap`):
- Opens fitted to width. Pinch zooms the sheet around the finger midpoint (×1…×4); the «150%» hint shows
  during the gesture; one hi-res re-render on finger up (`pdfHiRes`, skipped if the bitmap is within 12 %).
- At width: edge tap flips at once; a centre tap waits ≤250 ms for a double tap (double = ×2 at the point,
  single = bars + leave fullscreen, exactly as in build 4).
- Zoomed: every tap waits ≤250 ms; a double tap returns to width; an edge tap flips. A one-finger drag
  only pans, clamped to the page edges. A horizontal swipe flips only when the page edge on that side already
  touched the screen edge at touch start (and the drag moved the page < 2 %). Zoom resets on every flip.
- Pages taller than the screen (landscape) pan vertically at width. Ctrl+wheel zooms; the wheel pans when
  pannable and flips otherwise.

**Numbers.** `pdf.getPageLabels()` → the printed label, else the 1-based file number: «76 / 144» in the
corner number (`#pgNum`, same 11px / .45 style as text, above the day bar) and in the bar. While the slider
is dragged, both show the TARGET label; after the swap they show the label of the shown page. The slider value
is the 0-based file index.

**pdf.js** 3.11.174 is vendored: `vendor/pdfjs/pdf.min.js` + `pdf.worker.min.js` (+ LICENSE). `build-dist.sh`
copies them after the `?v=` rewrite (byte-identical); no CDN at runtime.

### Session accounting — single place (reader-session.js)

Text and PDF readers only REPORT events; minutes, per-page caps, pageTurns, UUID ids, drafts and awards are
computed in `reader-session.js` (the PDF reader has no minutes logic of its own).

| call | who calls it | effect |
|---|---|---|
| `begin(bookId, startPage, {capMs, minSecMs, counting, extend})` | open book | new UUID session, local start day |
| `pageTurned(forward)` | tap / swipe / slider / TOC / keys | intent only |
| `pageShown(page)` | text: `goPage`; PDF: `pdfSwap` (page really on screen) | closes the previous page: `min(dwell, pageCap)` credited; a pending forward turn after ≥12 s → `pageTurns+1`; resets the page cap |
| `userActive(kind, {fraction})` | PDF: `'pan'` (fraction = max(|Δx|/W, |Δy|/H) of the page movement), `'zoom'` (pinch / double tap / Ctrl+wheel) | may extend the current page's cap |
| `onPageChange(page, fwd)` | legacy | = `pageTurned(fwd)` + `pageShown(page)` |
| `snapshot()` / `end()` / `cancel()` / `setCounting()` / `recoverDraft()` | | unchanged |

**Per-page cap rule.** Text: a flat 3 min per page (`extend: null`). PDF:
`extend = {stepMs: 60000, everyMs: 60000, maxMs: 480000, minFraction: 0.2}`. The cap starts at 3 min. A zoom
change, or a pan that moves the page by more than 20 % of the screen, adds +1 min to THIS page's cap, at most
once per 60 s, never above 8 min. Pans < 20 % don't count. A new page starts at 3 min again. Pan and zoom are
never page turns.

Tests: `test/pdf-verify.mjs` (criterion (а)–(д), (ж)–(л), rotation, scan, race; `RQ_MODE=old` = bug
reproduction on 1306). Shots: `shots/pdf-fix/`.

## Build 20261007-1118 (2026-10-07): small-fixes

- MVP locked in code: goal 10 / minSec 12 / maxMin 3; `settings.mvp` forced true on load/import; devMoney off; steppers, MVP toggle, ∞, difficulty, AI helper, pixel Buy hidden.
- `Math.floor` on minute captions incl. session summary.
- PDF: `P.redo` + `lastVR`/`lastVS` refresh; `pdfWatch` kept as safety net, logs `pdf_stall_recovered` to events.
- `test/pdf-verify.mjs`: 37 checks (regression + watchdog steps, capped skip of mid-resize empty frames); `metrics.py` stall line.
- Results: pdf-verify 37/37 ×3, android-verify 71/71, mvp-check 27/27. Live on `main` (old `/test/` removed).

## Gaps / next

- 4-screen MVP — see `MVP.md` (`SET.mvp`, focus mode, rewards sheet).
- Anti-cheat / focus mode consume `pageVisibleMs` only; no extra DBs.
- Avatar/PNG in IDB — out of scope.
