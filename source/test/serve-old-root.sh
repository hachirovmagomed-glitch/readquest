#!/usr/bin/env bash
# Serves the OLD root build 20261008-1054 (main d36cc66, the last main commit with it in the root; without test/)
# Pinned: the root moved to 20261017-0034 on 17.10, importskin checks compatibility with the old build people still have.
# Serves it at http://127.0.0.1:8770/readquest/ for cross-build import tests.
set -euo pipefail
cd "$(dirname "$0")/../.."
D=/tmp/rq-old/readquest
rm -rf "$D" && mkdir -p "$D" && git archive "${RQ_OLD_REF:-d36cc66}" | tar -x -C "$D" --exclude=test
curl -sf -o /dev/null http://127.0.0.1:8770/readquest/index.html || { (cd /tmp/rq-old && nohup python3 -m http.server 8770 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 1; }
