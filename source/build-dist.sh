#!/usr/bin/env bash
# Build a clean static site into dist/ (GitHub Pages / any static host).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
# RQ_NS: 'rq' (main, dist/ → /readquest/) or 'rqt' (test build, dist/test/ → /readquest/test/).
# Test build: run AFTER the main build (main build wipes dist/). Local only for now.
NS="${RQ_NS:-rq}"
case "$NS" in rq) DIST="${RQ_DIST:-$ROOT/dist}";; rqt) DIST="${RQ_DIST:-$ROOT/dist/test}";; *) echo "RQ_NS must be rq or rqt" >&2; exit 1;; esac
rm -rf "$DIST"
mkdir -p "$DIST/storage" "$DIST/icons"

# Entry: index.html is the MVP app (also keep app.html for deep links)
cp "$ROOT/app.html" "$DIST/index.html"
cp "$ROOT/app.html" "$DIST/app.html"
cp "$ROOT/reader-session.js" "$DIST/reader-session.js"
cp "$ROOT/game-awards.js" "$DIST/game-awards.js"
cp "$ROOT/manifest.webmanifest" "$DIST/manifest.webmanifest"
if [ "$NS" = rq ]; then
  cp "$ROOT/icons/"*.png "$DIST/icons/"
else
  # Test build: Интерфейс's test icons + manifest snippet (vendored into source/icons-test, source/manifest-test.json)
  cp "$ROOT/icons-test/"* "$DIST/icons/"
  cp "$ROOT/icons-test/icon-test-192.png" "$DIST/icons/icon-192.png"   # favicon / apple-touch-icon links in app.html
  python3 - "$ROOT/manifest.webmanifest" "$ROOT/manifest-test.json" "$DIST/manifest.webmanifest" << 'EOP'
import json,sys
main=json.load(open(sys.argv[1])); snip=json.load(open(sys.argv[2]))
for k in ('background_color','theme_color'):
    if snip.get(k,main[k]).lower()!=main[k].lower(): sys.exit(f'test manifest {k} {snip[k]} != main {main[k]}')
m=dict(main); m.update(snip); m.pop('orientation',None)
for k in ('id','start_url','scope'): assert m[k]=='/readquest/test/', (k,m[k])
json.dump(m,open(sys.argv[3],'w'),ensure_ascii=False,indent=2)
EOP
fi
cp "$ROOT/sw.js" "$DIST/sw.js"

# Stage 1a: classic scripts cut out of app.html live in js/ (copied for both rq and rqt; only *.js, no notes/dotfiles).
# Each gets ?v=BUILD in the HTML (below) and in the SW precache, so a new HTML never gets an old file from SW/HTTP cache.
if [ -d "$ROOT/js" ]; then
  (cd "$ROOT" && find js -type f -name '*.js' -print0) | while IFS= read -r -d '' f; do
    mkdir -p "$DIST/$(dirname "$f")"; cp "$ROOT/$f" "$DIST/$f"
  done
fi

# Storage modules only (no harness)
for f in schema.js idb.js state.js sessions.js events.js migrate-v6.js adapter.js index.js; do
  cp "$ROOT/storage/$f" "$DIST/storage/$f"
done

# Build marker + cache-busting (phones must not keep an old module graph).
# Every relative ES-module specifier gets the SAME ?v=BUILD, so module identity stays consistent.
BUILD="${RQ_BUILD:-$(date +%Y%m%d-%H%M)}"
for f in "$DIST/index.html" "$DIST/app.html"; do
  sed -i -E "s/__RQ_NS__/$NS/g; s/__RQ_BUILD__/$BUILD/g; s#(from ')(\./[^']+\.js)'#\1\2?v=$BUILD'#g; s#(<script src=\")(js/[^\"?]+\.js)\"#\1\2?v=$BUILD\"#g" "$f"
done
# Guard: every local <script src> in the pages carries ?v=<this build> and points to a file in dist (else: mixed builds / 404 → watchdog).
for f in "$DIST/index.html" "$DIST/app.html"; do
  bad=$(grep -oE '<script[^>]* src="[^"]*"' "$f" | sed -E 's/.* src="([^"]*)"/\1/' | grep -vE '^(https?:)?//' | while read -r s; do
    case "$s" in *"?v=$BUILD") [ -f "$DIST/${s%%\?*}" ] || echo "missing:$s";; *) echo "no-v:$s";; esac; done || true)
  if [ -n "$bad" ]; then echo "build-dist: bad <script src> in $(basename "$f"): $bad (rule: write src FIRST — <script src=\"js/x.js\" defer>; the ?v= rewrite only matches '<script src=\"js/')" >&2; exit 1; fi
done
# ES modules (storage/, reader-session, game-awards): every quoted relative './x.js' gets ?v=BUILD.
# NOT js/: classic scripts cut out of app.html get exactly the rules their inline code had in the HTML — the SAME sed as the
# pages above: markers __RQ_NS__/__RQ_BUILD__ (js/core-a.js: const RQ_BUILD='__RQ_BUILD__'), `from './x.js'` and
# `<script src="js/…">` → ?v=; NOT the module rule, so a string like './x.js' inside them stays byte-identical
# (test/scriptv.test.mjs «split» re-inlines js/ and diffs against the base build).
find "$DIST" -name '*.js' ! -path "$DIST/js/*" -print0 | xargs -0 sed -i -E "s#'(\.{1,2}/[^'?]+\.js)'#'\1?v=$BUILD'#g"
if [ -d "$DIST/js" ]; then
  find "$DIST/js" -name '*.js' -print0 | xargs -0 -r sed -i -E "s/__RQ_NS__/$NS/g; s/__RQ_BUILD__/$BUILD/g; s#(from ')(\./[^']+\.js)'#\1\2?v=$BUILD'#g; s#(<script src=\")(js/[^\"?]+\.js)\"#\1\2?v=$BUILD\"#g"
fi
# Guard: no build marker left anywhere in the pages or in js/ (a marker in a cut-out file would show «__RQ_BUILD__» as the build).
left=$(grep -lE '__RQ_(NS|BUILD)__' "$DIST/index.html" "$DIST/app.html" $( [ -d "$DIST/js" ] && find "$DIST/js" -name '*.js' ) 2>/dev/null || true)
if [ -n "$left" ]; then echo "build-dist: build marker left in: $left" >&2; exit 1; fi
echo "Build marker: $BUILD (NS=$NS)"

# Vendored pdf.js (3.11.174, Apache-2.0) + its worker — copied AFTER the ?v= rewrite so the library is byte-identical.
mkdir -p "$DIST/vendor/pdfjs"
cp "$ROOT/vendor/pdfjs/pdf.min.js" "$ROOT/vendor/pdfjs/pdf.worker.min.js" "$ROOT/vendor/pdfjs/LICENSE" "$DIST/vendor/pdfjs/"

# Service worker: inject build + precache list (JS gets the same ?v=BUILD the pages request)
PRE=$(cd "$DIST" && find . -type f ! -name sw.js ! -name README.txt ! -name LICENSE | sed 's#^\./##' | sort | while read -r f; do
  case "$f" in vendor/*) echo "\"$f\"";; *.js) echo "\"$f?v=$BUILD\"";; *) echo "\"$f\"";; esac; done | paste -sd, -)
sed -i "s/__RQ_NS__/$NS/g; s/__RQ_BUILD__/$BUILD/g; s#__RQ_PRECACHE__#[\"./\",$PRE]#" "$DIST/sw.js"

# Tiny README for deployers
cat > "$DIST/README.txt" << 'EOR'
ReadQuest static build
----------------------
Upload the contents of this folder to GitHub Pages (or any static host).

Open: https://<user>.github.io/<repo>/
Under a project site the app uses relative paths (./storage/...), so it works
at https://<user>.github.io/<repo>/ as well as at the domain root.

No build step, no server API, no login required. Books & progress stay in the
browser (localStorage + IndexedDB).
EOR

echo "Built $DIST"
find "$DIST" -type f | sort | sed "s|$DIST/||"
