# Заметки Фронта (свежее сверху)

## 2026-10-09 — Фронт (наша команда)

**Рабочая копия.**
- Клон ветки `project`: `/workspace/rq-project`. Сверять с `git ls-remote https://github.com/hachirovmagomed-glitch/readquest project`.
- `/workspace/readquest` и `/workspace/readquest-pages` — старые состояния, в них не работать.
- Тулинг для тестов (puppeteer-core, pngjs, тестовые PDF в `pdf/`) лежит в `/workspace/rqtest`.

**Тесты** (`source/test`):
- `android-verify.mjs` — читалка текста, 71 проверка;
- `pdf-verify.mjs` — PDF-читалка, строгий режим 0 пустых и нарезанных кадров;
- `pwa-verify.mjs` — 117 проверок;
- `cap.test.mjs` — 15 проверок.

Счёт текущего прогона — в `handoff/STATUS.md`.

**Гарантии PDF (не ломать):**
- Видимый холст подменяется только после завершения рендера: двойной буфер, новый холст вне DOM, подмена в rAF.
- Подложка, холст и текстовый слой лежат в одном контейнере, трансформация одна (`#pdfStage`).
- `reader-session.js` — единственное место учёта минут для текста и PDF (события `pageShown` / `pageTurned` / `userActive`).

**Грабли:**
- `rg` или grep по всему дереву виснет (node_modules, vendor). Ищем по конкретным файлам и с `timeout`.
- Недельная проверка в `android-verify` зависела от дня недели: тест писался во вторник, в пт–вс он красный.
- `saveFlat` переписывает тексты всех книг в IDB при каждом `save()`. Чиним только после «ок» Архитектора.
