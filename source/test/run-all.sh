#!/usr/bin/env bash
# Full suite (1б). Builds dist (rq) + dist/test (rqt) with one RQ_BUILD, runs every test, prints one score line per test.
# RQ_HOST: server that maps /readquest/ → source/dist (box: :8767 /tmp/rqp-serve). pwa-verify rebuilds dist itself → runs last.
# Usage: ./run-all.sh [test-name …]   (default: all)
set -uo pipefail
cd "$(dirname "$0")"
HOST="${RQ_HOST:-http://127.0.0.1:8767}"
BUILD="${RQ_BUILD:-$(date +%Y%m%d-%H%M)}"
(cd .. && RQ_BUILD=$BUILD ./build-dist.sh >/dev/null && RQ_NS=rqt RQ_BUILD=$BUILD ./build-dist.sh >/dev/null) || { echo "build failed"; exit 1; }
ALL="names savetext scriptv cap awards back begin summary streak-reset android pdf pdf-test pwa"
SEL="${*:-$ALL}"
mkdir -p /tmp/rq-runall; rc=0
for t in $SEL; do
  case "$t" in
    names)        cmd="node names.test.mjs";;
    savetext)     cmd="node savetext.test.mjs";;
    scriptv)      cmd="node scriptv.test.mjs";;
    cap)          cmd="node cap.test.mjs";;
    awards)       cmd="node awards.test.mjs";;
    back)         cmd="node back.test.mjs";;
    begin)        cmd="node begin.test.mjs";;
    summary)      cmd="node summary.test.mjs";;
    streak-reset) cmd="env RQ_URL=$HOST/readquest/test/ node streak-reset.test.mjs";;
    android)      cmd="node android-verify.mjs";;
    pdf)          cmd="node pdf-verify.mjs";;
    pdf-test)     cmd="env RQ_URL=$HOST/readquest/test/ node pdf-verify.mjs";;
    pwa)          cmd="node pwa-verify.mjs";;
    *) echo "unknown test $t"; rc=1; continue;;
  esac
  RQ_URL="${RQ_URL_OVERRIDE:-$HOST/readquest/}" bash -c "$cmd" > "/tmp/rq-runall/$t.log" 2>&1; code=$?
  [ $code -ne 0 ] && rc=1
  echo "$t: exit $code — $( (grep -E 'SUMMARY|passed|Итого|^[0-9]+\/[0-9]+' "/tmp/rq-runall/$t.log" || true) | tail -1 | cut -c1-200) (PASS $(grep -c '^PASS' "/tmp/rq-runall/$t.log"), FAIL $(grep -c '^FAIL' "/tmp/rq-runall/$t.log"))"
done
exit $rc
