#!/usr/bin/env bash
# Полная пересборка баз и толстовки. Скрипты работают в плоской папке, поэтому собираем во временной и раскладываем обратно.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; B="$(mktemp -d)"
cp "$ROOT"/tools/*.py "$ROOT"/palette.json "$B"/
cp "$ROOT"/bases/orig/base-*.orig.png "$B"/
cp "$ROOT"/items/hoodie/source/red-*.jpg "$B"/
cd "$B"
python3 cutout.py
python3 reg.py
python3 ext.py
python3 gray.py
python3 previews.py
python3 sheet.py
python3 edges.py edges-dark.png
cp base-girl.png base-boy.png base-*.trim.png base-*.trim.json "$ROOT"/bases/
cp hoodie-*.png hoodie-*.trim.json "$ROOT"/items/hoodie/
cp M-*.json "$ROOT"/items/hoodie/source/
cp preview-*.png swatches-*.png edges-dark.png "$ROOT"/previews/
echo "Готово: $ROOT (сборка в $B)"
