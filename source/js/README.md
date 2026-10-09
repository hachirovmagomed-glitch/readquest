# js/ — классические скрипты, вынесенные из app.html (этап 1а)

- Порядок и состав — `handoff/stage1a-split.md`. Каждый файл подключается `<script src="js/<имя>.js"></script>` на месте вырезанного куска, без `defer`/`async`, в начале `'use strict'`.
- `build-dist.sh` копирует сюда только `*.js` (этот README в сборку не попадает) и дописывает `?v=BUILD` к каждому `<script src="js/…">`. Тот же `?v=BUILD` стоит в списке precache у SW. Сборка падает, если у локального `<script src>` нет `?v=<сборка>` или файла нет в dist.
- Проверка: `test/scriptv.test.mjs`. После смены BUILD новая HTML получает новые скрипты.
