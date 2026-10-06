# PDF blocker — progress (Фронт)

Updated: 2026-10-06 15:2x MSK

Done:
- PDF reader rewritten in app.html:
  - `#pdfStage` > `#pdfSheet` > canvas + `#pdfText`.
  - Double buffer, swap in rAF.
  - Labels, pinch/pan/double tap, edge flip, resize debounce.
  - Retry + watchdog.
- reader-session.js event API: `pageTurned`, `pageShown`, `userActive`; the PDF cap extension.
- pdf.js vendored (`vendor/pdfjs`); build-dist.sh copies it.
- READER.md PDF section written.
- test/pdf-verify.mjs; test PDFs in /workspace/rqtest/pdf (gen.py).
- Reproduced on old 1306 (RQ_MODE=old): bug 1 (blank frames), bug 2 (tiny upside-down page on a render race, pdf.js "Cannot use the same canvas"), bug 3 (pinch origin 50% 0 → left side unreachable), bug 4 (file number instead of label).
- Last full run: 34/35 PDF (lost/late flip at CPU ×6 in scenario A); 71/71 android-verify.

15:24 build 20261006-1524: PDF 34/35 (one ×6 flip lost: the tap reached touchend, but no flip happened, probably because of selText); android-verify 71/71.
15:3x: added tap diagnostics (P.log 'tap' / 'tap-rejected'); scenario A ×3 clean; full rerun with a new marker in progress.
project branch: source/ = snapshot (no shots/, mirror/, dist/); test/fixtures = rqtest/pdf/gen.py + rqtest/package.json + the txt book.

15:37 build 20261006-1537: PDF 35/35, android-verify 71/71 (same dist). DONE.
15:40 deployed to main: commit 3fdbcfb97160c559da4f64a6fa7abe35a1909d62; Pages serves RQ_BUILD='20261006-1537' and vendor/pdfjs.
Then: one commit to the `project` branch (source/ sync + HANDOFF.md status).

Remaining: check on a real Android (texts + PDF, Fisher 144 pages).

Run: `cp test/*.mjs /workspace/rqtest/`, then `cd /workspace/rqtest && node pdf-verify.mjs`.
Server: `/tmp/rqserve` on port 8766 (`readquest` → dist, `old` → 1306 copy).
