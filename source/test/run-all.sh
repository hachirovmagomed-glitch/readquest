#!/usr/bin/env bash
# Full suite (1б). Builds dist (rq) + dist/test (rqt) with one RQ_BUILD, runs every test, prints one score line per test.
# RQ_HOST: server that maps /readquest/ → source/dist (box: :8767 /tmp/rqp-serve). pwa-verify rebuilds dist itself → runs last.
# Usage: ./run-all.sh [test-name …]   (default: all)
set -uo pipefail
cd "$(dirname "$0")"
HOST="${RQ_HOST:-http://127.0.0.1:8767}"
BUILD="${RQ_BUILD:-$(date +%Y%m%d-%H%M)}"
(cd .. && RQ_BUILD=$BUILD ./build-dist.sh >/dev/null && RQ_NS=rqt RQ_BUILD=$BUILD ./build-dist.sh >/dev/null) || { echo "build failed"; exit 1; }
ALL="export export-test reset-timeout names savetext scriptv cap awards back resume hyph begin summary streak-reset android stage1b tts dayring themes pencil small-batch blackcanvas importskin pdf pdf-test pwa"
SEL="${*:-$ALL}"
LOG="/tmp/rq-runall/$BUILD"; mkdir -p "$LOG"; rc=0  # per-run log dir: a rerun never overwrites the logs of a failed run
for t in $SEL; do
  case "$t" in
    export)       cmd="node export.test.mjs";;
    export-test)  cmd="env RQ_URL=$HOST/readquest/test/ node export.test.mjs";;
    reset-timeout) cmd="node reset-timeout.test.mjs";;
    names)        cmd="node names.test.mjs";;
    savetext)     cmd="node savetext.test.mjs";;
    scriptv)      cmd="node scriptv.test.mjs";;
    cap)          cmd="node cap.test.mjs";;
    awards)       cmd="node awards.test.mjs";;
    back)         cmd="node back.test.mjs";;
    resume)       cmd="node resume.test.mjs";;
    hyph)         cmd="node hyph.test.mjs";;
    begin)        cmd="node begin.test.mjs";;
    summary)      cmd="node summary.test.mjs";;
    streak-reset) cmd="env RQ_URL=$HOST/readquest/test/ node streak-reset.test.mjs";;
    android)      cmd="node android-verify.mjs";;
    stage1b)      cmd="node stage1b.test.mjs";;
    tts)          cmd="node tts.test.mjs";;
    dayring)      cmd="node dayring.test.mjs";;
    themes)       cmd="node themes.test.mjs";;
    pencil)       cmd="node pencil.test.mjs";;
    small-batch)  cmd="node small-batch.test.mjs";;
    blackcanvas)  cmd="node blackcanvas.test.mjs";;
    importskin)   cmd="bash serve-old-root.sh && env RQ_OLD_URL=http://127.0.0.1:8770/readquest/ node importskin.test.mjs";;
    pdf)          cmd="node pdf-verify.mjs";;
    pdf-test)     cmd="env RQ_URL=$HOST/readquest/test/ node pdf-verify.mjs";;
    pwa)          cmd="node pwa-verify.mjs";;
    *) echo "unknown test $t"; rc=1; continue;;
  esac
  RQ_URL="${RQ_URL_OVERRIDE:-$HOST/readquest/}" bash -c "$cmd" > "$LOG/$t.log" 2>&1; code=$?
  [ $code -ne 0 ] && rc=1
  echo "$t: exit $code — $( (grep -E 'SUMMARY|passed|Итого|^[0-9]+\/[0-9]+' "$LOG/$t.log" || true) | tail -1 | cut -c1-200) (PASS $(grep -c '^PASS' "$LOG/$t.log"), FAIL $(grep -c '^FAIL' "$LOG/$t.log"))"
done
exit $rc
