# «Небесный» (celestial)

Прототип: `/mnt/project-files/skins/rannie/mockups/celestial` (ранние макеты, `gen_celestial.py`). Сливочная бумага в двойных золотых рамках, чернильно-синие кнопки,
днём небо от голубого к персиковому закату со звёздной пылью, ночью звёздная синева и лунное золото.

- Токены: `tokens.css` (сборка дописывает его в `tokens.css`, `RQ_SHOP_SKINS`). Цвета подобраны заново: у прототипа не проходил контраст (аудит `handoff/skins/audit.md`, §3).
- Шрифты (SIL OFL): Cormorant Garamond 700 (заголовки), Manrope 500/700/800 (интерфейс, цифры), Lora 400/600 (книга). Woff2, Latin + Cyrillic, `source/fonts/celestial-*.woff2`.
- Декор: `source/tools/gen-cl-decor.py` печатает блок переменных для `skins/skins.css` (§4). Обложки: `celCover` в `js/library.js`. Иконки и конфетти: `SKIN_ICONS.celestial`, `CONFETTI_ART.celestial` в `js/core-b.js`.
- Страница книги чистая: однотонная бумага `#fbf6ea` / `#14172a`, текст `#2b2742` / `#e7dcc6` (13.2 / 13.0).
- Тест: `source/test/celestial.test.mjs`.
