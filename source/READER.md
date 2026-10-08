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

## Этап 0 — приложение (PWA mini-build, branch `pwa`)

### Контракт (копия из `readquest-arch/reader-contract.md`, без изменений)
- Замок одного писателя: `navigator.locks.request('rq-writer')`. Без замка окно не пишет ни в `rq_v1`, ни в IndexedDB.
- «Открыть здесь»: запрос через `BroadcastChannel('rq')`, ждать 2 с, затем `{steal:true}`. Потерявшее замок окно перестаёт писать и показывает экран «открыт в другом окне».
- Незакрытая сессия старого окна доначисляется в новом через `awardPendingSessions()` ровно один раз.
- Сервис-воркер: scope `/readquest/`, кеш `rq-<build>`, удаляет только `rq-*`, не трогает книги и `blob:`; `app.html` берёт из сети (network-first).
- `navigator.storage.persist()` при запуске; событие `storage_persist {granted}`.
- Манифест без `orientation`.

### Как сделано в коде
- **Namespace `NS`** (build-time, `RQ_NS=rq|rqt ./build-dist.sh`, default `rq`): `window.RQ_NS` / `window.RQ_K` in the first `<script>` of `app.html`, `NS` in `storage/schema.js`, `DRAFT_KEY` in `reader-session.js`, `const NS` in `sw.js`. Derived: `NS_v1`, `NS_set`, `NS_owner`, `NS_session_draft`, `NS_migrated_v1`; IndexedDB `readquest` (rq) / `readquest-test` (rqt); lock `NS-writer`; `BroadcastChannel(NS)`; cache `NS-<build>`. Test build → `dist/test/` (`/readquest/test/`): own SW scope, «ТЕСТ» banner, «Сбросить тест» (deletes only `rqt*` keys, `readquest-test`, `rqt-*` caches, unregisters the test SW), manifest `ReadQuest ТЕСТ`, icons `icons-test/icon-test-*` + `manifest-test.json` (Интерфейс, vendored from `readquest-ui/pwa/test/`; build fails if its colours differ from the main manifest; id/start_url/scope = `/readquest/test/`). `window.__rqTestReset()` refuses (returns `false`) in the main build, also from the console. Local only, not deployed.
- **Write guard** (first `<script>` of `app.html`, before any app code): `Storage.prototype.setItem/removeItem` are wrapped — for `localStorage` keys matching `^NS_` (except `NS_owner`) the call is silently dropped when the window may not write. `IDBDatabase.prototype.transaction` is wrapped — a `readwrite` transaction in a non-writer window **throws `DOMException('ReadQuest: passive window','ReadOnlyError')`**. So a `ReadOnlyError` in the console / a rejected `logSession`/`addEvent` comes from this guard, not from the browser. Readonly transactions are untouched. `save()` also returns early. "May write" = `!gate.passive` **and** `localStorage.NS_owner === this window id` (synchronous check, so a thawed frozen tab that was stolen from stops writing even before its lock-abort promise fires; it then demotes itself).
- **Lock:** at boot `navigator.locks.request(NS-writer, {ifAvailable:true})` before `bootStorage()`; a window without the lock never boots storage. Takeover: `postMessage({t:'takeover'})` → holder runs `closeReader()` (normal session end), `saveFlat`, becomes passive, releases; requester waits ≤2 s, else `{steal:true}`. Lock loss (AbortError on the held request, or foreign `NS_owner`) → passive, `hydrateS(loadFlat())` read-only, overlay, no toast.
- **Thawed stolen window** (phone case, test e3): a stale queued takeover message is ignored (`mayWrite()` first → demote). `closeReader`, `goPage`, `pdfGo` and the counting tracker calls (`begin/pageShown/pageTurned/userActive/setCounting/onPageChange/end`) are gated by `mayWrite()`, plus `resume`/`visibilitychange` ownership checks — so the first thing a thawed window does is demote; book stays open under the overlay, no summary/toast, page unchanged.
- **SW** (`sw.js`, generated precache incl. `?v=BUILD` URLs): no `skipWaiting` — a new SW waits until every old window is closed, so an open old window gets all files (also lazily loaded pdf.js) from its own `NS-<oldbuild>` cache. Navigations network-first with `cache:'no-cache'`; network copies are not stored (cache = only this SW's build). Static: cache-first from own cache, else network. Skips non-GET, cross-origin, `blob:`/`data:`, book extensions, paths outside scope, and (main SW) `/readquest/test/`. Activate deletes only `NS-*` ≠ current.
- **persist:** after the lock is held, once per launch, `logAnalyticsEvent({type:'storage_persist', granted})` → `events`.
- Tests: `test/pwa-verify.mjs` (rebuilds dist, run it alone); `test/mvp-check.mjs` (moved into the repo, checks the build marker against the served `sw.js`).

### Отличия кода от контракта
1. Lock is requested with `{ifAvailable:true}` (non-blocking) instead of a plain `request('rq-writer')`; and the name is `NS-writer` (`rq-writer` in main, `rqt-writer` in test).
2. Cooperative takeover: the old window ends its session itself (`closeReader()` writes the row and pays it). Only on steal (frozen tab) the session is finished in the new window — by `recoverDraft()` (draft → `sessions[]` row) followed by `awardPendingSessions()` at boot. `awardPendingSessions()` runs only in MVP (`isMvp()`), as before.
3. Extra guard beyond the contract: synchronous `NS_owner` ownership check before every write; guard also covers `NS_set` and `NS_session_draft`, not only `rq_v1` / IndexedDB.
4. Network-first applies to every navigation (`./`, `index.html`, `app.html`), not just `app.html`; the network copy is not written to cache. Stage 0: network **races a 1.5 s timer** — if the network neither answers nor fails (Wi-Fi without internet), the cached build is served; the request is not aborted (late answer ignored); fast failure → cache at once; no cached copy → wait for the network. Side effect: TTFB > 1.5 s → the installed build opens, the new one still arrives via the SW update. Test: pwa-verify (g) (CDP Fetch hold on the SW target).
5. SW update: new build activates only after all old windows are closed (no `skipWaiting`). Contract doesn't specify; "next open" = next launch after the app was fully closed.
6. SW also ignores book-file extensions and `/readquest/test/`; cache prefix is `NS-` (`rq-`/`rqt-`), and each SW deletes only its own prefix.
7. `storage_persist` is logged only by the writer window (passive windows skip it) and only if `navigator.storage.persist` exists.
8. No `navigator.locks` (Architect, stage 0) → reading works and the page is saved (`S.progress` on close), but **no sessions[] rows, no draft, no XP / coins**: the tracker gets a no-op `logSession` + `noDraft`, boot skips `recoverDraft()` / `awardPendingSessions()`, quote coins (+2) are skipped. Analytics `no_locks` once per boot. Reader shows a thin grey line under the day bar «В этом браузере опыт не начисляется. Чтение и страница сохраняются» (in the flex column, never over the text, no close). Test: pwa-verify e5.
9. Test-build namespace (`rqt`) and the `readquest-test` DB are an addition, not in the contract.
10. Old-window screen (stage 0, Architect/Интерфейс): a window that HAD the lock and lost it (handover / stolen / owner) shows «Книга открыта в другом окне» / «Прогресс сохранён на странице N» / «Вернуться сюда» (no open book: «ReadQuest открыт в другом окне» / «Прогресс сохранён» / «Вернуться сюда»). N = the page saved in `NS_v1` = where the book reopens (progress ratio is the **farthest** page, as before). The waiting new window keeps «ReadQuest открыт в другом окне» / «Чтобы прогресс не задвоился…» / «Открыть здесь». «Вернуться сюда» = reload with `sessionStorage NS_takeover=1` → the normal takeover flow. One click handler for both buttons (before: an old window that had booted without waiting had no handler at all).
11. «Save first» on lock loss: after losing the lock a window may not write (contract), so page and time are saved **while it is the writer**: `persistPage()` writes the progress ratio (monotonic, progress-only, sync `loadEnvelope/saveEnvelope`) on every page change; session time is in `NS_session_draft` (reader-session.js). Handover: `closeReader()` before release, as before. On demote: tracker cancelled, day bar / timer stopped, no XP.
12. Boot diagnostics (stage 0): `localStorage[NS+'diag']` (`rqdiag` / `rqtdiag`, outside the `NS_` write gate, so passive windows log too), last 5 runs merged by run id; steps with `Date.now()` + `performance.now()`, navigation timing (`workerStart`, `responseStart`, `domInteractive`…), SW controller, `onLine`. Static `#rqBoot` «Открываем библиотеку…»; 3 s watchdog → `#rqFail` + «Скопировать журнал запуска» (also in settings).
13. Boot theme: writer stores `NS_theme` (plain string `bg txt muted`, or `auto` + light/dark triples); the first `<script>` reads only that key and sets `--bg/--txt/--muted`. The OS splash still uses the manifest colour `#0c2127` (can't follow the theme).

## Gaps / next

- 4-screen MVP — see `MVP.md` (`SET.mvp`, focus mode, rewards sheet).
- Anti-cheat / focus mode consume `pageVisibleMs` only; no extra DBs.
- Avatar/PNG in IDB — out of scope.
