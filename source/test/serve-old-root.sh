#!/usr/bin/env bash
# Serves the deployed ROOT build (origin/main, without test/) at http://127.0.0.1:8770/readquest/ for cross-build import tests.
set -euo pipefail
cd "$(dirname "$0")/../.."
D=/tmp/rq-old/readquest
rm -rf "$D" && mkdir -p "$D" && git archive origin/main | tar -x -C "$D" --exclude=test
curl -sf -o /dev/null http://127.0.0.1:8770/readquest/index.html || { (cd /tmp/rq-old && nohup python3 -m http.server 8770 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 1; }
