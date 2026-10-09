# Сверка токенов скинов с каноном stage1-final

Канон: `hachirovmagomed-glitch/readquest@project:handoff/stage1-final/tokens.json` (stage1-2026-10-08), 34 цветовых токена × день/ночь, 3 тени, 76 скаляров, 12 алиасов, страница читалки `--r-*` (sepia/day/night) — всего 137 имён. Копия канона: `_canon/stage1-final-tokens.json`.
Генератор: `skins-pack/src/tokens-rq/build_rq.py` (+ `write_map.py`). Проверка: `python3 check_tokens.py` (нет канонического имени = ошибка, лишнее = предупреждение) — **0 missing у всех 6 скинов**.

## Как подключать (внедрение)
- Скин = **один CSS-файл** `<skin>/tokens.rq.css`, подключается ПОСЛЕ `stage1-final/tokens.css`. Соглашение stage1 сохранено: день/ночь по-прежнему `data-theme` (`:root` = день, `[data-theme="night"]` = ночь, Авто 7:00–21:00), скин — отдельный атрибут `data-skin` на `<html>`:
  - день: `<html data-skin="zhurnal">`; ночь: `<html data-skin="zhurnal" data-theme="night">`; без `data-skin` — штатная тема stage1.
  - legacy-селекторы макетов `data-theme="<skin>-day|<skin>-night"` тоже поддержаны в файле.
  - специфичность: ночь скина (2 атрибута) > день скина (1) ≥ ночь stage1 (1, но файл скина ниже) — проверено в Chrome: `--rq-*`, алиасы `--bg` и `--r-bg` внутри `#reader[data-page]` берутся из скина.
- Переключатель «Тема оформления» в Настройках (штатная + скины), по умолчанию штатная; событие `theme_changed {from,to}`.
- Страница читалки: структура одинакова во всех скинах — `--r-bg/--r-txt/--r-txt-2/--r-dim` в `[data-page="sepia|day|night"]`; сепия = канон без изменений, day/night = плоская страница скина. Шрифт книги — из настроек (`--rq-font-read` не переопределяется). **В читалке нет фильтров, текстур и декора ни в одном скине**; только «34 / 210» + дневная полоса 3px (`--rq-skin-daybar*`).
- «Пастельная сказка»: канонический `--rq-accent` = тёмная слива `#7b2fa8` (белый текст, AA). Глянцевая розовая кнопка макета — это extras `--rq-skin-primary*` + `--rq-skin-on-primary`; если её использовать для главной кнопки, текст тёмный (проверено в `11-pastel/contrast.tsv`).
- Размеры, отступы, тап-зоны (`--rq-tap:44px`), слоты (`--rq-rbar-slots`), тайминги, `--rq-as-*`, `--rq-safe-*` — наследуются из stage1 у всех скинов.
- Внимание: stage1 решил «веб-шрифтов не добавляем, 0 КБ». Скины без своих шрифтов теряют характер, поэтому `--rq-font-ui` у скинов переопределён со **стеком-фолбэком на системный** — шрифт скина грузить лениво только при выборе скина (`font-display:swap`); без шрифта всё работает на системном.

## Итог по скинам

| Скин (папка) | data-skin | missing | контраст канон. пар | мин. текст день / ночь | мин. графика день / ночь | overrides (не-цвет) | тени | extras | SVG-фильтры в UI |
|---|---|---|---|---|---|---|---|---|---|
| Карандашный (`karandashny/`) | `pencil` | 0 | 73 пар, **0 провалов** | 5.12 / 4.52 | 6.02 / 4.91 | `font-ui` | канон | 7 | да, в UI: SVG `#rough`/`#rough2`/`#ri` (дрожание линий заголовков/рамок) |
| Карандашный — тетрадь (`karandashny-tetrad/`) | `pencil-b` | 0 | 73 пар, **0 провалов** | 5.14 / 4.51 | 6.07 / 4.63 | `font-ui` | канон | 9 | да, в UI: `#rough*` + `#grain` на заголовках |
| Карандашный — цветные карандаши (`karandashny-cvetnye/`) | `pencil-c` | 0 | 73 пар, **0 провалов** | 5.28 / 4.50 | 7.84 / 5.16 | `font-ui` | канон | 13 | да, в UI: `#rough*` + `#grain` на заголовках |
| Журнал (`zhurnal/`) | `zhurnal` | 0 | 73 пар, **0 провалов** | 4.67 / 4.56 | 4.95 / 4.80 | `font-ui`, `radius-xs`, `radius-sm`, `radius-md`, `radius-lg`, `toast-radius` | `none` (плоско) | 20 | нет |
| Деловой журнал (`delovoy/`) | `delovoy` | 0 | 73 пар, **0 провалов** | 4.92 / 5.79 | 10.31 / 6.77 | `font-ui`, `radius-xs`, `radius-sm`, `radius-md`, `radius-lg`, `toast-radius` | `none` (плоско) | 23 | нет |
| Пастельная сказка (`pastel/`) | `pastel` | 0 | 73 пар, **0 провалов** | 4.65 / 6.13 | 4.18 / 5.72 | `font-ui`, `radius-xs`, `radius-sm`, `radius-md`, `radius-lg`, `toast-radius` | канон | 43 | нет (plus: стикеры — обычный SVG, свечение — CSS radial-gradient) |

Канонические пары — те же 73 строки `method=tokens` из `stage1-final/contrast.tsv` (66 цветовых пар день/ночь + 6 страничных + PDF ночью); результаты в `<skin>/contrast.rq.tsv`. Пиксельные строки stage1 (995 шт.) относятся к экранам stage1 и не переносимы; экраны скинов проверены их собственными `contrast.tsv`.

## Overrides (не-цветовые)

- `--rq-font-ui` — у всех скинов (шрифт скина + системный стек).
- Радиусы: «Журнал» `--rq-radius-xs..lg` и `--rq-toast-radius` = 2px; «Деловой журнал» = 0px; «Пастельная сказка» xs 9 / sm 18 / md 22 / lg 26, toast 22px. Карандашные — канон (их 10/18px совпадают с sm/lg).
- Тени `--rq-shadow-1..3` = `none` у «Журнала» и «Делового» (плоская вёрстка); остальные — канон.

## Где цвет скина пришлось подвинуть под канонические пары
Значения, которых не было в скине, выведены из его палитры (tint = 12–18% акцента/цвета на surface, pressed = акцент ±18–20% к чёрному/белому). Если канон. пара не проходила, цвет автоматически сдвигался к чёрному (день) / белому (ночь) шагом 4% до AA:

- Карандашный: night: `accent-text` #86cbc2→#95d1c9; night: `danger` #ff8a80→#ff9d94
- Карандашный — тетрадь: night: `accent-text` #f2917e→#f39a88
- Карандашный — цветные карандаши: night: `danger` #ff8a80→#ff8f85
- Журнал: day: `accent-text` #c4330c→#bc310c
- Деловой журнал: без сдвигов
- Пастельная сказка: day: `success` #17805a→#157653

## Шрифты (все SIL OFL 1.1, полная кириллица)

| Скин | Шрифт | Где | Файл | Размер |
|---|---|---|---|---|
| Карандашный | Nunito | UI | `Nunito-VariableFont_wght.ttf` | 270 KB |
| Карандашный | Caveat | заголовки ≥20px | `Caveat-VariableFont_wght.ttf` | 394 KB |
| Карандашный — тетрадь | Nunito | UI | `Nunito-VariableFont_wght.ttf` | 270 KB |
| Карандашный — тетрадь | Neucha | заголовки ≥20px | `Neucha-Regular.ttf` | 115 KB |
| Карандашный — цветные карандаши | Nunito | UI | `Nunito-VariableFont_wght.ttf` | 270 KB |
| Карандашный — цветные карандаши | Neucha | заголовки ≥20px | `Neucha-Regular.ttf` | 115 KB |
| Журнал | Golos Text | UI + заголовки | `GolosText-VariableFont_wght.ttf` | 175 KB |
| Журнал | Playfair Display | крупные цифры, «№» | `PlayfairDisplay-VariableFont_wght.ttf` | 294 KB (сабсет цифр ≈5–10 KB) |
| Деловой журнал | Inter | UI, ▲▼ | `Inter-VariableFont_opsz,wght.ttf` | 875 KB (статичные 400/600/700 WOFF2 ≈3×70–100 KB) |
| Деловой журнал | Prata | заголовки | `Prata-Regular.ttf` | 97 KB |
| Деловой журнал | Playfair Display | только цифры/#/%/№ (unicode-range) | `PlayfairDisplay-VariableFont_wght.ttf` | 294 KB (сабсет ≈5–10 KB) |
| Пастельная сказка | Nunito | UI + заголовки | `Nunito-VariableFont_wght.ttf` | 270 KB |
| Пастельная сказка | — (plus) stickers.svg | стикеры, SVG-спрайт | `stickers.svg` | 17.7 KB / 2.0 KB gzip |

Текст книги во всех скинах — шрифт из настроек читалки (PT Serif / Georgia / системный), без изменений.

## Extras (`--rq-skin-*`, только в `skin_extras` json и в блоке extras CSS)

- **Карандашный**: `--rq-skin-border`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-daybar`, `--rq-skin-daybar-track`, `--rq-skin-hatch`, `--rq-skin-font-heading`
- **Карандашный — тетрадь**: `--rq-skin-rule`, `--rq-skin-margin`, `--rq-skin-border`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-daybar`, `--rq-skin-daybar-track`, `--rq-skin-hatch`, `--rq-skin-font-heading`
- **Карандашный — цветные карандаши**: `--rq-skin-border`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-daybar`, `--rq-skin-daybar-track`, `--rq-skin-hatch`, `--rq-skin-pencil-1`, `--rq-skin-pencil-2`, `--rq-skin-pencil-3`, `--rq-skin-pencil-4`, `--rq-skin-pencil-5`, `--rq-skin-pencil-6`, `--rq-skin-font-heading`
- **Журнал**: `--rq-skin-border`, `--rq-skin-rule`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-daybar`, `--rq-skin-daybar-track`, `--rq-skin-cover-1`, `--rq-skin-cover-1-ink`, `--rq-skin-cover-2`, `--rq-skin-cover-2-ink`, `--rq-skin-cover-3`, `--rq-skin-cover-3-ink`, `--rq-skin-cover-4`, `--rq-skin-cover-4-ink`, `--rq-skin-cover-5`, `--rq-skin-cover-5-ink`, `--rq-skin-cover-6`, `--rq-skin-cover-6-ink`, `--rq-skin-font-heading`, `--rq-skin-font-num`
- **Деловой журнал**: `--rq-skin-border`, `--rq-skin-rule`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-up`, `--rq-skin-down`, `--rq-skin-gold`, `--rq-skin-daybar`, `--rq-skin-daybar-track`, `--rq-skin-cover-1`, `--rq-skin-cover-1-ink`, `--rq-skin-cover-2`, `--rq-skin-cover-2-ink`, `--rq-skin-cover-3`, `--rq-skin-cover-3-ink`, `--rq-skin-cover-4`, `--rq-skin-cover-4-ink`, `--rq-skin-cover-5`, `--rq-skin-cover-5-ink`, `--rq-skin-cover-6`, `--rq-skin-cover-6-ink`, `--rq-skin-font-heading`, `--rq-skin-font-num`
- **Пастельная сказка**: `--rq-skin-primary`, `--rq-skin-primary-2`, `--rq-skin-primary-gloss`, `--rq-skin-on-primary`, `--rq-skin-chip-pink`, `--rq-skin-chip-lavender`, `--rq-skin-chip-mint`, `--rq-skin-chip-sky`, `--rq-skin-chip-butter`, `--rq-skin-rule`, `--rq-skin-tab`, `--rq-skin-tab-active`, `--rq-skin-sparkle`, `--rq-skin-card-a`, `--rq-skin-card-b`, `--rq-skin-daybar-track`, `--rq-skin-daybar-1`, `--rq-skin-daybar-2`, `--rq-skin-daybar-3`, `--rq-skin-daybar-4`, `--rq-skin-daybar-5`, `--rq-skin-rainbow-1`, `--rq-skin-rainbow-2`, `--rq-skin-rainbow-3`, `--rq-skin-rainbow-4`, `--rq-skin-rainbow-5`, `--rq-skin-cover-1a`, `--rq-skin-cover-1b`, `--rq-skin-cover-2a`, `--rq-skin-cover-2b`, `--rq-skin-cover-3a`, `--rq-skin-cover-3b`, `--rq-skin-cover-4a`, `--rq-skin-cover-4b`, `--rq-skin-cover-5a`, `--rq-skin-cover-5b`, `--rq-skin-cover-6a`, `--rq-skin-cover-6b`, `--rq-skin-cover-ink`, `--rq-skin-cover-ink-muted`, `--rq-skin-font-heading`, `--rq-skin-pattern-dot`, `--rq-skin-sticker-glow`

## Канонический токен → значение по скинам (день / ночь)

| токен | Карандашный | Карандашный — тетрадь | Карандашный — цветные карандаши | Журнал | Деловой журнал | Пастельная сказка |
|---|---|---|---|---|---|---|
| `--rq-bg` | `#f3f0e7` / `#2b3038` | `#f6eedb` / `#1b2337` | `#fbf8f2` / `#25262a` | `#f5f3ee` / `#141518` | `#ffffff` / `#0f0f11` | `#fff6fa` / `#1d1233` |
| `--rq-surface` | `#fbfaf5` / `#353b45` | `#fffaf0` / `#253049` | `#fffefb` / `#303136` | `#fbfaf7` / `#1c1d21` | `#ffffff` / `#1a1a1d` | `#ffffff` / `#2a1b47` |
| `--rq-surface-2` | `#eeeee9` / `#434951` | `#f2ede4` / `#353e55` | `#f2f1ee` / `#3f4044` | `#edece9` / `#2d2e31` | `#f1f1f1` / `#2b2b2d` | `#ece4ff` / `#3a2b63` |
| `--rq-sheet` | `#fbfaf5` / `#353b45` | `#fffaf0` / `#253049` | `#fffefb` / `#303136` | `#fbfaf7` / `#1c1d21` | `#ffffff` / `#1a1a1d` | `#ffffff` / `#2a1b47` |
| `--rq-line` | `#d7d4cc` / `#4d5156` | `#dcd3bd` / `#2b3550` | `#dedbd5` / `#49494c` | `#cfcbc2` / `#3a3b40` | `#dcdcdc` / `#333338` | `#f0dcea` / `#3a2a5a` |
| `--rq-border-strong` | `#3d3d3a` / `#cfccc3` | `#3b3833` / `#c9ccd6` | `#34322f` / `#d2d1cb` | `#141414` / `#efece4` | `#111111` / `#f1efe9` | `#8e6aa3` / `#a993c9` |
| `--rq-text` | `#2a2a28` / `#e8e6df` | `#2b2925` / `#e8e5dc` | `#2a2826` / `#ecebe6` | `#141414` / `#efece4` | `#111111` / `#f1efe9` | `#34184a` / `#fbf0ff` |
| `--rq-text-2` | `#595853` / `#b9b7ae` | `#5b5548` / `#b6b9c6` | `#5a5650` / `#b9b8b2` | `#57544e` / `#aaa7a0` | `#5e5e5e` / `#a9a7a1` | `#6a4a7e` / `#cdb9e3` |
| `--rq-text-disabled` | `#97958e` / `#80817f` | `#999283` / `#787d8d` | `#9a9791` / `#7e7e7c` | `#96948e` / `#6e6d6a` | `#9e9e9e` / `#6b6a67` | `#a68fb0` / `#87769d` |
| `--rq-accent` | `#1d6464` / `#86cbc2` | `#a32f27` / `#f2917e` | `#1f4e8c` / `#8fb8ff` | `#c4330c` / `#ff6b3d` | `#0b3b8f` / `#8fb3ff` | `#7b2fa8` / `#e2b8ff` |
| `--rq-accent-pressed` | `#185252` / `#9ed5ce` | `#862720` / `#f5a798` | `#194073` / `#a5c6ff` | `#a12a0a` / `#ff8964` | `#093075` / `#a5c2ff` | `#65278a` / `#e8c6ff` |
| `--rq-accent-text` | `#1d6464` / `#95d1c9` | `#a32f27` / `#f39a88` | `#1f4e8c` / `#8fb8ff` | `#bc310c` / `#ff6b3d` | `#0b3b8f` / `#8fb3ff` | `#7b2fa8` / `#e2b8ff` |
| `--rq-on-accent` | `#fbfaf5` / `#1f2329` | `#fffaf0` / `#1b2337` | `#ffffff` / `#1a1b1e` | `#ffffff` / `#141518` | `#ffffff` / `#0f0f11` | `#ffffff` / `#1d1233` |
| `--rq-control-on` | `#fbfaf5` / `#44555c` | `#fffaf0` / `#4a4153` | `#fffefb` / `#41495a` | `#fbfaf7` / `#452b26` | `#ffffff` / `#2f3646` | `#ffffff` / `#4b3768` |
| `--rq-accent-tint` | `#e0e8e4` / `#44555c` | `#f4e2d8` / `#4a4153` | `#e4e9ee` / `#41495a` | `#f4e2db` / `#452b26` | `#e2e7f2` / `#2f3646` | `#efe6f5` / `#4b3768` |
| `--rq-accent-border` | `#97b6b4` / `#597c7d` | `#d69f96` / `#815c61` | `#9aafc9` / `#5b6e90` | `#e2a08d` / `#82402e` | `#91a7cd` / `#4f5f83` | `#c4a1d8` / `#7d629a` |
| `--rq-coin` | `#7a4f10` / `#e2b866` | `#7a4f10` / `#e2b866` | `#7a4f10` / `#e2b866` | `#7a4f10` / `#e2b866` | `#7d5f0e` / `#e0c56e` | `#7a4f10` / `#e2b866` |
| `--rq-coin-tint` | `#e9e2d5` / `#4d4c4a` | `#ece2d1` / `#3f434d` | `#ece6da` / `#49443d` | `#e9e2d7` / `#38332b` | `#ede9dd` / `#363228` | `#ece6de` / `#44314b` |
| `--rq-success` | `#2f6a22` / `#9fd68c` | `#2f6a22` / `#9fd68c` | `#2f6a22` / `#9fd68c` | `#2f6a22` / `#9fd68c` | `#17703c` / `#5fcf8a` | `#157653` / `#8fe3bf` |
| `--rq-success-tint` | `#dee6d7` / `#44514f` | `#e2e6d3` / `#364752` | `#e2e9dd` / `#404842` | `#dee6d9` / `#2e3730` | `#dfebe4` / `#24332c` | `#dfede8` / `#383758` |
| `--rq-danger` | `#b3392a` / `#ff9d94` | `#b3392a` / `#ff8a80` | `#b3392a` / `#ff8f85` | `#a3261a` / `#ff8a80` | `#b3261e` / `#ff8a7a` | `#b3261e` / `#ff8a7a` |
| `--rq-danger-tint` | `#f1dfd9` / `#51464d` | `#f4dfd4` / `#443d51` | `#f4e2de` / `#4d3d40` | `#efdcd8` / `#3c2c2e` | `#f4e1df` / `#3a2a2a` | `#f4e1df` / `#482b4e` |
| `--rq-focus` | `#1d6464` / `#86cbc2` | `#a32f27` / `#f2917e` | `#1f4e8c` / `#8fb8ff` | `#c4330c` / `#ff6b3d` | `#0b3b8f` / `#8fb3ff` | `#7b2fa8` / `#e2b8ff` |
| `--rq-scrim` | `rgba(42,42,40,.45)` / `rgba(12,14,18,.68)` | `rgba(43,41,37,.45)` / `rgba(8,11,20,.62)` | `rgba(42,40,38,.45)` / `rgba(8,8,10,.6)` | `rgba(20,20,20,.5)` / `rgba(0,0,0,.62)` | `rgba(17,17,17,.5)` / `rgba(0,0,0,.62)` | `rgba(52,24,74,.42)` / `rgba(8,4,18,.6)` |
| `--rq-badge-bg` | `#2a2a28` / `#e8e6df` | `#2b2925` / `#e8e5dc` | `#2a2826` / `#ecebe6` | `#141414` / `#efece4` | `#111111` / `#f1efe9` | `#34184a` / `#fbf0ff` |
| `--rq-badge-text` | `#f3f0e7` / `#2b3038` | `#f6eedb` / `#1b2337` | `#fbf8f2` / `#25262a` | `#f5f3ee` / `#141518` | `#ffffff` / `#0f0f11` | `#fff6fa` / `#1d1233` |
| `--rq-toast-game-bg` | `#1d6464` / `#86cbc2` | `#a32f27` / `#f2917e` | `#1f4e8c` / `#8fb8ff` | `#c4330c` / `#ff6b3d` | `#0b3b8f` / `#8fb3ff` | `#7b2fa8` / `#e2b8ff` |
| `--rq-toast-game-fg` | `#fbfaf5` / `#1f2329` | `#fffaf0` / `#1b2337` | `#ffffff` / `#1a1b1e` | `#ffffff` / `#141518` | `#ffffff` / `#0f0f11` | `#ffffff` / `#1d1233` |
| `--rq-toast-info-bg` | `#fbfaf5` / `#434951` | `#fffaf0` / `#353e55` | `#fffefb` / `#3f4044` | `#fbfaf7` / `#2d2e31` | `#ffffff` / `#2b2b2d` | `#ffffff` / `#3b2c56` |
| `--rq-toast-info-fg` | `#2a2a28` / `#e8e6df` | `#2b2925` / `#e8e5dc` | `#2a2826` / `#ecebe6` | `#141414` / `#efece4` | `#111111` / `#f1efe9` | `#34184a` / `#fbf0ff` |
| `--rq-toast-info-icon` | `#1d6464` / `#86cbc2` | `#a32f27` / `#f2917e` | `#1f4e8c` / `#8fb8ff` | `#c4330c` / `#ff6b3d` | `#0b3b8f` / `#8fb3ff` | `#7b2fa8` / `#e2b8ff` |
| `--rq-toast-info-border` | `#d7d4cc` / `#555a61` | `#dcd3bd` / `#485163` | `#dedbd5` / `#525256` | `#cfcbc2` / `#424244` | `#dcdcdc` / `#414042` | `#f0dcea` / `#504168` |
| `--rq-toast-error-bg` | `#b3392a` / `#ff9d94` | `#b3392a` / `#ff8a80` | `#b3392a` / `#ff8f85` | `#a3261a` / `#ff8a80` | `#b3261e` / `#ff8a7a` | `#b3261e` / `#ff8a7a` |
| `--rq-toast-error-fg` | `#ffffff` / `#2a0d0a` | `#ffffff` / `#2a0d0a` | `#ffffff` / `#2a0d0a` | `#ffffff` / `#2a0d0a` | `#ffffff` / `#2a0d0a` | `#ffffff` / `#2a0d0a` |
| `--rq-shadow-1` | канон | канон | канон | `none` | `none` | канон |
| `--rq-shadow-2` | канон | канон | канон | `none` | `none` | канон |
| `--rq-shadow-3` | канон | канон | канон | `none` | `none` | канон |
| `--r-bg` [data-page="day"] | `#fbfaf6` | `#fcf8ee` | `#fffdf8` | `#f8f6f1` | `#fbfaf8` | `#fffafc` |
| `--r-txt` [data-page="day"] | `#24231f` | `#26231e` | `#26241f` | `#1b1a18` | `#1b1a18` | `#24132f` |
| `--r-txt-2` [data-page="day"] | `#6b6a64` | `#6b6457` | `#6a665e` | `#66625b` | `#66625b` | `#6e5a78` |
| `--r-bg` [data-page="night"] | `#262a31` | `#1f273b` | `#212226` | `#17181b` | `#121214` | `#18121f` |
| `--r-txt` [data-page="night"] | `#e3e0d8` | `#e4e1d8` | `#e6e4de` | `#e8e5dd` | `#e8e5dd` | `#ece3f0` |
| `--r-txt-2` [data-page="night"] | `#a7a59d` | `#a3a7b5` | `#a6a59f` | `#a3a09a` | `#a3a09a` | `#ab9fb5` |
| `--r-*` [data-page="sepia"] | канон | канон | канон | канон | канон | канон |

## Файлы в ui-files/<скин>/
`tokens.rq.css` (подключаемый файл), `tokens.json` (структура stage1 + `skin_extras`; заменил старый), `contrast.rq.tsv`, `README.md`, `*-overview.png`; старые `tokens.css`/`contrast.tsv` макетов оставлены для истории. В `skins-pack/<скин>/` json лежит как `tokens.rq.json` (старый `tokens.json` макетов не тронут).
