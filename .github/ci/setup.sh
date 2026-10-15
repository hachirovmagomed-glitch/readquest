#!/usr/bin/env bash
# CI environment for source/test/run-all.sh on a Linux runner (GitHub Actions ubuntu or the cloud box).
# The tests expect: Chrome at /usr/bin/google-chrome, test books in /workspace/rqtest, puppeteer-core in source/test,
# and a static server on :8767 that maps /readquest/ → source/dist. This script provides all of it without editing the tests.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
T="$REPO/source/test"
SUDO=""; [ "$(id -u)" = 0 ] || SUDO="sudo"

# 1. Chrome: GitHub runners ship /usr/bin/google-chrome; elsewhere link a Chromium we can find.
if [ ! -x /usr/bin/google-chrome ]; then
  C="${RQ_CHROME:-$(command -v chromium || command -v chromium-browser || ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)}"
  [ -n "$C" ] || { echo "no Chrome/Chromium found" >&2; exit 1; }
  $SUDO ln -sf "$C" /usr/bin/google-chrome
fi
/usr/bin/google-chrome --version || true

# 2. Node deps for the tests (versions from fixtures/package.json; not committed into source/test).
if [ ! -d "$T/node_modules/puppeteer-core" ]; then
  W="$(mktemp -d)"; cp "$T/fixtures/package.json" "$W/"
  (cd "$W" && PUPPETEER_SKIP_DOWNLOAD=1 npm install --no-audit --no-fund --silent)
  rm -rf "$T/node_modules"; mv "$W/node_modules" "$T/node_modules"
fi

# 3. Test books: PDFs from fixtures/gen.py, the long TXT twice (second name is used by pwa-verify), export dir.
$SUDO mkdir -p /workspace && $SUDO chown "$(id -u):$(id -g)" /workspace
mkdir -p /workspace/rqtest/pdf /workspace/rqtest/exports
python3 -c "import reportlab, pikepdf, PIL" 2>/dev/null || python3 -m pip install --quiet reportlab pikepdf pillow
python3 "$T/fixtures/gen.py"
cp "$T/fixtures/e-blank-dark.pdf" /workspace/rqtest/pdf/
cp "$T/fixtures/Длинная книга.txt" "/workspace/rqtest/Длинная книга.txt"
cp "$T/fixtures/Длинная книга.txt" "/workspace/rqtest/Книга для позднего запуска.txt"

# 4. Static server :8767, /readquest/ → source/dist (run-all.sh builds dist before the tests).
mkdir -p /tmp/rqp-serve && ln -sfn "$REPO/source/dist" /tmp/rqp-serve/readquest
if ! curl -sf -o /dev/null http://127.0.0.1:8767/; then
  (cd /tmp/rqp-serve && setsid nohup python3 -m http.server 8767 --bind 127.0.0.1 </dev/null >/tmp/rqp-serve.log 2>&1 &)
  for i in $(seq 20); do curl -sf -o /dev/null http://127.0.0.1:8767/ && break; sleep 0.5; done
fi
echo "CI setup done"
