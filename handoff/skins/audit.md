# Аудит пака скинов ReadQuest (`skins-pack/`), 09.10.2026

Проверено: все PNG (Read), `src/gen_pixel.py`, `src/*/gen_*.py`, HTML в `src/*/` (CSS в HTML совпадает с генераторами). Файлы пака не менялись.
Скрипт контраста: `/workspace/readquest/skins-pack-audit-contrast.py` (WCAG 2.x, цвета взяты прямо из исходников; полупрозрачные фоны смешаны с фоном под ними; для градиентов взят худший край, где текст реально стоит).

Правила: **A** — текст книги обычным шрифтом из настроек, лист без декора; **B** — в нижнем меню 2 вкладки (Библиотека, Профиль), награды шторкой из профиля; **C** — во время чтения нет «Ур. N», XP, монет/игровых тостов (можно номер страницы и полоску дня 3 px); **D** — AA: обычный текст ≥ 4.5, крупный текст (≥ 24px или ≥ 18.66px жирный) и иконки ≥ 3.

## Сводка

| Скин | A | B | C | D |
|---|---|---|---|---|
| 1 Пергамент (пиксель) | FAIL | FAIL | FAIL | FAIL (4 пары обычного текста; ещё 4 жирные пары проходят только как крупный текст 3:1) |
| 2 Подземелье (пиксель) | FAIL | FAIL | FAIL | FAIL (4 пары обычного текста + 2 обложки < 3:1) |
| 3 Небесный | PASS* | FAIL | PASS | FAIL (17 пар, вне читалки) |
| 4 Лес | FAIL (буквица, орнамент, текстура) | FAIL | PASS | PASS (с оговоркой про текстуру) |
| 5 Звёздный | PASS* | FAIL | PASS | PASS |

\* Шрифт листа зашит в CSS (`Lora` / `PT Serif`), а не взят из настроек. В макете это допустимо, но привязку к настройкам по макету проверить нельзя. Шрифт обычный, не пиксельный.

Экрана профиля нет у Пергамента, Подземелья и Небесного, поэтому B и C на профиле для них проверить нельзя. Полоски цели дня 3 px нет ни в одном скине: в читалке вместо неё слайдер прогресса книги (это не нарушение C, но правило про полоску не показано).

---

## 1. Пергамент (`1-pergament/`, `src/gen_pixel.py`, палитра `P1`)

- **A — FAIL.** Текст книги набран пиксельным GNU Unifont 16px (`BIG`, `body_text()` → `reader()`), это не шрифт из настроек. После увеличения ×2 высота заглавной ≈ 20px, в строке ≈ 25 знаков (`pixel-reader-day.png`), для долгого чтения слишком крупно и рвано. Сам лист без рамки.
- **B — FAIL.** `bottom_nav()`: три вкладки «Библиотека / Награды / Профиль»; `pixel-rewards.png` открыт как вкладка («Награды» активна).
- **C — FAIL.** В `reader()` строки 179–181 полоса «Ур. 4» со звездой и зелёной XP-полоской внизу читалки, днём и ночью (`pixel-reader-day/night.png`). На итоге сессии она видна и под затемнением.
- **D — FAIL** (обычный текст < 4.5):
  - читалка, ночь: номер страницы в плашке «98 из 185», `#fffaf0` на `#3e8a88`, **3.88**;
  - библиотека: активный фильтр «Все», `#fffaf0` на `#a8700f`, **4.05**;
  - нижнее меню: активная вкладка, `#a8700f` на `#f2e4c4`, **3.34**;
  - награды: цены «+30», «100 монет» в плашках, `#a8700f` на `#f2e4c4`, **3.34**;
  - Жирный текст `goldd`/`green` на `#fbf2dc` («+50 XP» 3.44, «+30 монет за день» 3.78, «+ Добавить награду» 3.78, «Продолжить» 4.05) по размеру крупный (Cozette 13 ×2, жирный двойным проходом), поэтому 3:1 проходит. По строгому порогу 4.5 не проходит.
  - Текст на страницах, днём `#2b1d12`/`#fbf2dc` 14.63 и ночью `#d9c9a0`/`#0c2127` 10.15, проходит.
- **Прочее:** иконки «оглавление» и «настройки» в шапке 7×7 px (14 px на экране) с шагом 28 px, зона нажатия < 44 px. Подпись «Закладка» обрезана правым краем экрана (`pixel-reader-*.png`). На итоге сессии при постеризации плашка «98 из 185» под затемнением превращается в кашу («9о из 1о5»).

## 2. Подземелье (`2-podzemelye/`, `src/gen_pixel.py`, палитра `P2`, `STONE=True`)

- **A — FAIL.** Тот же Unifont. Лист в рамке из каменной кладки (`stone(d,1,24,193,320)` в `reader()`): это декор вокруг текста. Днём лист «пергамент» `#b9a679` внутри тёмного интерфейса.
- **B — FAIL.** Те же три вкладки, `rewards.png` открыт как вкладка.
- **C — FAIL.** «Ур. 4» и XP-полоса в читалке днём и ночью.
- **D — FAIL:**
  - читалка, день и ночь: номер страницы, `#fff2d8` на `#b9741a`, **3.40**;
  - библиотека: активный фильтр, `#fff2d8` на `#b9741a`, **3.40**;
  - нижнее меню: активная вкладка, `#b9741a` на `#262240`, **4.03**;
  - награды: цены в плашках, `#b9741a` на `#262240`, **4.03**;
  - итог: «+30 монет за день», `#b9741a` на `#211d3a`, 4.28 (жирный и крупный, 3:1 проходит);
  - итог: «Продолжить», `#fff2d8` на `#b9741a`, 3.40 (крупный жирный, 3:1 проходит);
  - обложки: буква и фамилия на зелёной `#62b03c` **2.43** и оранжевой `#e0702a` **2.91**, ниже 3:1 даже для крупного текста.
  - Текст на страницах, днём `#2a1d12`/`#b9a679` 6.85 и ночью `#f0cf98`/`#2a2e3d` 9.05, проходит.
- **Прочее:** факелы в шапках и цепи на итоге сессии; README сам отмечает недоделки. Зоны нажатия в шапке те же < 44 px, «Закладка» обрезана.

## 3. Небесный (`3-nebesny/`, `src/celestial/`)

- **A — PASS\*.** Лист `.page`: Lora 16.5/1.6, фон однотонный `#fbf6ea` / `#14172a`, без декора. Звёздная пыль только в шапке и в нижней панели ночью.
- **B — FAIL.** `nav()`: «Библиотека / Награды / Профиль»; `celestial-rewards.png` открыт вкладкой.
- **C — PASS.** В читалке только «98 из 185», слайдер и инструменты, без уровня, XP и монет.
- **D — FAIL** (читалка проходит, проблемы на остальных экранах):
  - нижнее меню, неактивная вкладка 11px: `#8a7f96` на ≈`#fffbf3` **3.66**; активная 11px: `#8a5c12` на `#f6e1ad` **4.50** (на грани);
  - библиотека, строка автора `.ba` 11px на небе: `#857a92` на `#dfe6f6` **3.23**, на `#f6e7dc` **3.35**;
  - обложки, название `#fff8e6` на светлом конце градиента: `#a5c98b` **1.75**, `#f0c27a` **1.56**, `#7fb0d9` **2.17**; формат 9px `#ffe8b0` на `#f0c27a` **1.37**;
  - итог сессии: приглушённый текст (`.sub`, `.st span`, `.cap`) `#857a92` на `#fffaf0` **3.88**; описание награды 12px `#8a6f3e` на `#fde6b8` **3.89**;
  - награды: описание задания 12px `#857a92` на панели **3.94**; «+120» `#fff3c6` на золотом конце `#d9a24a` **2.05**; описание задания недели `#efe3ff` на `#8c5fc2` **3.77**;
  - награды, названия на карточках `#fff8e6` (12px): на `#7fa6d9` **2.37**, `#b48ae6` **2.57**, `#f2c879` **1.49**, `#c27a35` **3.23**; середина градиента: 3.40 / 3.91 / 2.15;
  - описание «Добавить награду» `#857a92` на `#fdeedf` **3.55**.
  - Проходят: текст в читалке (13.18 / 13.03), номер страницы (7.45 / 11.34), инструменты 11px (4.82 / 9.78), кнопка «Продолжить» `#fffaf0` на `#5e6da8` (4.77).
- **Прочее:** под интерфейсом библиотеки и наград градиентное небо с частицами. Задания дня и недели с одной иконкой-монетой, что нарушает правило README «у каждого задания своя иконка» (README сам это отмечает). Названия под обложками обрезаются. Кнопки в шапке читалки `.ib` 42×42, меньше 44. Фильтры около 31 px в высоту.

## 4. Лес (`4-les/`, `src/forest/`)

- **A — FAIL.** Шрифт листа PT Serif, обычный. Но на листе есть декор:
  - буквица 50px зелёная или охра: `.page p:first-of-type:first-letter`;
  - орнамент `rule(160)` под заголовком главы;
  - текстура бумаги и волокна `fibers()` поверх всего, включая текст: `.tex{z-index:50;mix-blend-mode:multiply}`, ночью `screen` 0.35. Фон листа по факту пятнистый, ≈`#e6dcc3` вместо `#efe5cc`.
- **B — FAIL.** Три вкладки, `forest-rewards.png` открыт вкладкой. В профиле нет входа в шторку наград.
- **C — PASS.** В читалке нет уровня, XP и монет. Облака днём и звёзды ночью только в шапке.
- **D — PASS.** Худшие пары: светлый `#efe5cc` на хвое `#4e6447` 5.17 и чернила `#33251a` на охре `#c4924a` 5.32. Текст в читалке 12.79 днём и 11.82 ночью, буквица 5.17 / 5.63. Текстура снижает фон примерно на 1 тон, контраст текста остаётся > 11, но точное значение по пикселям с шумом установить нельзя.
- **Прочее:** полоса сосен и папоротников внизу под нижним меню на каждом экране. Кнопки в шапке читалки 42×42, фильтры ≈ 29 px в высоту. Заглушки «Создать героя» в профиле нет, вместо неё сова-аватар и класс «Хранитель рощи».

## 5. Звёздный (`5-zvezdny/`, `src/starry/`)

- **A — PASS\*.** Лист: PT Serif 16.5/1.6, однотонный `#f1e8d2` / `#0f1a33`. Астролябия и созвездие только в шапке.
- **B — FAIL.** Три вкладки, `starry-rewards.png` открыт вкладкой.
- **C — PASS.** В читалке нет уровня, XP и монет.
- **D — PASS.** Худшее: светлый текст `#aeb8d4` на `#182a50` 7.09–7.14, золото `#d4b46a` на `#182a50` 7.09. Текст в читалке 12.51 днём и 12.87 ночью.
- **Прочее:** ночная читалка меняет только лист. Шапка и низ тёмно-синие и днём, поэтому дневной лист окружён тёмной рамкой. Сетка координат и астролябии под библиотекой и наградами (прозрачность 0.3–0.45). Кнопки в шапке 42×42, фильтры ≈ 28 px. Заглушки «Создать героя» в профиле нет, вместо неё созвездие-аватар.

---

## Общее по паку

- Ни в одном скине нет заглушки «Создать героя» и полоски дня 3 px.
- В README пака сказано «скины будут продаваться за внутреннюю валюту». Цены не назначены, это решение после теста.
- **Генераторы в таком виде не запускаются.**
  - `gen_pixel.py` грузит `fonts/cozette.ttf`, а в паке лежит папка `pixel-fonts/`. Результат пишется в `dungeon/`, а не в `2-podzemelye/`.
  - `gen_celestial.py`, `gen_forest.py` и `gen_starry.py` читают иконки из `/workspace/readquest-ui/mockups/src/icons/`, а такой папки на машине нет. HTML они пишут в `src/src/`.
  - PNG перерисовать нельзя, пока не поправлены пути.

## Все пары контраста (вывод скрипта; порог для жирного пиксельного текста в скрипте строгий, 4.5, см. оговорки выше)

```

## 1 Пергамент
OK   14.63 (need 4.5) | reader-day | body text (Unifont 16px native=32px@1x? see note) | #2b1d12 on #fbf2dc
OK   12.95 (need 4.5) | reader-day | header title / tool labels / 'Ур. 4' | #2b1d12 on #f2e4c4
OK   15.68 (need 4.5) | reader-day | page-number pill '98 из 185' | #fffaf0 on #2b1d12
OK   10.15 (need 4.5) | reader-night | body text | #d9c9a0 on #0c2127
OK    6.28 (need 4.5) | reader-night | header title / tool labels / 'Ур. 4' | #d9c9a0 on #1c4650
FAIL  3.88 (need 4.5) | reader-night | page-number pill '98 из 185' | #fffaf0 on #3e8a88
OK   14.63 (need 4.5) | library | book title | #2b1d12 on #fbf2dc
OK    5.89 (need 4.5) | library | author (muted) | #6e5a40 on #fbf2dc
OK    5.21 (need 4.5) | library | filter chip inactive | #6e5a40 on #f2e4c4
FAIL  4.05 (need 4.5) | library | filter chip active | #fffaf0 on #a8700f
OK    8.64 (need 4.5) | library | coin balance '504 монеты' | #2b1d12 on #f0b232
OK   15.68 (need 4.5) | library | format badge PDF/FB2 | #fffaf0 on #2b1d12
OK    5.21 (need 4.5) | library/rewards | tab bar label inactive | #6e5a40 on #f2e4c4
FAIL  3.34 (need 4.5) | library/rewards | tab bar label active | #a8700f on #f2e4c4
OK   14.63 (need 4.5) | session-summary | body text | #2b1d12 on #fbf2dc
OK    5.89 (need 4.5) | session-summary | muted text (book, '320 / 500') | #6e5a40 on #fbf2dc
FAIL  3.44 (need 4.5) | session-summary | '+50 XP' green | #5f8f3a on #fbf2dc
FAIL  3.78 (need 4.5) | session-summary | '+30 монет за день' goldd | #a8700f on #fbf2dc
FAIL  4.05 (need 4.5) | session-summary | button 'Продолжить' (Unifont 16 bold) | #fffaf0 on #a8700f
OK   15.68 (need 4.5) | rewards | card text | #2b1d12 on #fffaf0
OK    6.31 (need 4.5) | rewards | card muted text | #6e5a40 on #fffaf0
FAIL  3.34 (need 4.5) | rewards | coin price pill '+30'/'100 монет' | #a8700f on #f2e4c4
FAIL  3.78 (need 4.5) | rewards | '+ Добавить награду' | #a8700f on #fbf2dc
OK    5.89 (need 4.5) | rewards | hint text | #6e5a40 on #fbf2dc
OK    3.78 (need 3) | rewards | gift icons | #a8700f on #fbf2dc
OK    6.88 (need 3) | library | cover letter/surname on red | #fffaf0 on #963a2a
OK    9.89 (need 3) | library | cover letter/surname on teal2 | #fffaf0 on #1c4650
OK    3.69 (need 3) | library | cover letter/surname on green | #fffaf0 on #5f8f3a
OK    3.54 (need 3) | library | cover letter/surname on orange | #fffaf0 on #d0682a
OK   15.99 (need 3) | library | cover letter/surname on teal | #fffaf0 on #0c2127
OK    3.88 (need 3) | library | cover letter/surname on teal3 | #fffaf0 on #3e8a88

## 2 Подземелье
OK    6.85 (need 4.5) | reader-day | body text (Unifont 16px native=32px@1x? see note) | #2a1d12 on #b9a679
OK   11.49 (need 4.5) | reader-day | header title / tool labels / 'Ур. 4' | #efdfb8 on #262240
FAIL  3.40 (need 4.5) | reader-day | page-number pill '98 из 185' | #fff2d8 on #b9741a
OK    9.05 (need 4.5) | reader-night | body text | #f0cf98 on #2a2e3d
OK   11.49 (need 4.5) | reader-night | header title / tool labels / 'Ур. 4' | #efdfb8 on #262240
FAIL  3.40 (need 4.5) | reader-night | page-number pill '98 из 185' | #fff2d8 on #b9741a
OK   13.80 (need 4.5) | library | book title | #efdfb8 on #15122b
OK    6.73 (need 4.5) | library | author (muted) | #a99c82 on #15122b
OK    5.61 (need 4.5) | library | filter chip inactive | #a99c82 on #262240
FAIL  3.40 (need 4.5) | library | filter chip active | #fff2d8 on #b9741a
OK   10.84 (need 4.5) | library | coin balance '504 монеты' | #0a0914 on #f2b630
OK   17.84 (need 4.5) | library | format badge PDF/FB2 | #fff2d8 on #0a0914
OK    5.61 (need 4.5) | library/rewards | tab bar label inactive | #a99c82 on #262240
FAIL  4.03 (need 4.5) | library/rewards | tab bar label active | #b9741a on #262240
OK   12.23 (need 4.5) | session-summary | body text | #efdfb8 on #211d3a
OK    5.97 (need 4.5) | session-summary | muted text (book, '320 / 500') | #a99c82 on #211d3a
OK    5.99 (need 4.5) | session-summary | '+50 XP' green | #62b03c on #211d3a
FAIL  4.28 (need 4.5) | session-summary | '+30 монет за день' goldd | #b9741a on #211d3a
FAIL  3.40 (need 4.5) | session-summary | button 'Продолжить' (Unifont 16 bold) | #fff2d8 on #b9741a
OK   12.23 (need 4.5) | rewards | card text | #efdfb8 on #211d3a
OK    5.97 (need 4.5) | rewards | card muted text | #a99c82 on #211d3a
FAIL  4.03 (need 4.5) | rewards | coin price pill '+30'/'100 монет' | #b9741a on #262240
OK    4.83 (need 4.5) | rewards | '+ Добавить награду' | #b9741a on #15122b
OK    6.73 (need 4.5) | rewards | hint text | #a99c82 on #15122b
OK    4.83 (need 3) | rewards | gift icons | #b9741a on #15122b
OK    7.56 (need 3) | library | cover letter/surname on red | #fff2d8 on #8a2e2a
OK    9.61 (need 3) | library | cover letter/surname on teal2 | #fff2d8 on #28405a
FAIL  2.43 (need 3) | library | cover letter/surname on green | #fff2d8 on #62b03c
FAIL  2.91 (need 3) | library | cover letter/surname on orange | #fff2d8 on #e0702a
OK   16.31 (need 3) | library | cover letter/surname on teal | #fff2d8 on #0e1626
OK    4.45 (need 3) | library | cover letter/surname on teal3 | #fff2d8 on #3d7a78

## 3 Небесный
OK   13.18 (need 4.5) | reader-day | body text | #2f2a24 on #fbf6ea
OK   10.16 (need 4.5) | reader-day | title in header | #3a3150 on #e3ecf8
OK    5.06 (need 3) | reader-day | header icons | #6d5a8a on #e3ecf8
OK    7.45 (need 4.5) | reader-day | page number (14px bold) | #6b4a14 on #fbf6ea
OK    4.82 (need 4.5) | reader-day | tool labels 11px | #6d5a8a on #f4e3d2
OK   13.03 (need 4.5) | reader-night | body text | #e7dcc6 on #14172a
OK   14.44 (need 4.5) | reader-night | title | #efe2c2 on #0b1030
OK   11.34 (need 4.5) | reader-night | page number | #efcf86 on #161a33
OK    9.78 (need 4.5) | reader-night | tool labels / icons | #c2b6e0 on #0b1030
OK    9.21 (need 4.5) | library | heading/body text on sky | #3d3550 on #dfe6f6
FAIL  3.23 (need 4.5) | library | author line .ba 11px on sky (mid) | #857a92 on #dfe6f6
FAIL  3.35 (need 4.5) | library | author line .ba 11px on sky (lower) | #857a92 on #f6e7dc
OK    5.24 (need 4.5) | library | chip inactive | #6d6280 on #f7f6f4
OK    4.65 (need 4.5) | library | chip active | #fff7e2 on #5e6da8
OK    7.83 (need 4.5) | library | balance pill | #6b4a14 on #fffcf3
OK    3.25 (need 3) | library | cover title on light stop #6b8db4 | #fff8e6 on #6b8db4
FAIL  1.75 (need 3) | library | cover title on light stop #a5c98b | #fff8e6 on #a5c98b
FAIL  1.56 (need 3) | library | cover title on light stop #f0c27a | #fff8e6 on #f0c27a
FAIL  2.17 (need 3) | library | cover title on light stop #7fb0d9 | #fff8e6 on #7fb0d9
OK    3.10 (need 3) | library | cover title on light stop #c77a63 | #fff8e6 on #c77a63
FAIL  1.37 (need 4.5) | library | cover format 9px #ffe8b0 on #f0c27a | #ffe8b0 on #f0c27a
FAIL  3.66 (need 4.5) | all tabs | tab label inactive 11px | #8a7f96 on #fffbf3
OK    4.50 (need 4.5) | all tabs | tab label active 11px | #8a5c12 on #f6e1ad
OK    4.77 (need 4.5) | session-summary | button 'Продолжить' 16px bold (light stop) | #fffaf0 on #5e6da8
FAIL  3.88 (need 4.5) | session-summary | muted .sub/.st span/.cap | #857a92 on #fffaf0
OK    5.23 (need 3) | session-summary | '+50 XP' 28px | #7a52c7 on #fffaf0
OK    6.57 (need 4.5) | session-summary | reward title | #6b4a14 on #fde6b8
FAIL  3.89 (need 4.5) | session-summary | reward desc 12px | #8a6f3e on #fde6b8
FAIL  3.94 (need 4.5) | rewards | quest desc 12px | #857a92 on #fefcf6
FAIL  2.05 (need 4.5) | rewards | weekly quest '+120' 15px bold on #d9a24a end | #fff3c6 on #d9a24a
FAIL  3.77 (need 4.5) | rewards | weekly quest desc on #8c5fc2 | #efe3ff on #8c5fc2
FAIL  2.37 (need 4.5) | rewards | reward card name on #7fa6d9 | #fff8e6 on #7fa6d9
FAIL  2.57 (need 4.5) | rewards | reward card name on #b48ae6 | #fff8e6 on #b48ae6
FAIL  1.49 (need 4.5) | rewards | reward card name on #f2c879 | #fff8e6 on #f2c879
FAIL  3.23 (need 4.5) | rewards | reward card name on #c27a35 | #fff8e6 on #c27a35
FAIL  3.55 (need 4.5) | rewards | add-reward desc 12px | #857a92 on #fdeedf

## 4 Лес
OK   12.79 (need 4.5) | reader-day | body text | #2b1f15 on #efe5cc
OK    5.17 (need 3) | reader-day | drop cap (green, 50px) | #4e6447 on #efe5cc
OK   11.79 (need 4.5) | reader-day | chrome / page number / tools | #33251a on #efe5cc
OK   11.82 (need 4.5) | reader-night | body text | #eadfc4 on #2a2219
OK    5.63 (need 3) | reader-night | drop cap ochre | #c4924a on #2a2219
OK   11.82 (need 4.5) | reader-night | chrome / page number / tools | #eadfc4 on #2a2219
OK   11.79 (need 4.5) | all tabs | tab label inactive | #33251a on #efe5cc
OK    5.17 (need 4.5) | all tabs | tab label active | #efe5cc on #4e6447
OK   11.79 (need 4.5) | library | chip active | #efe5cc on #33251a
OK    5.17 (need 4.5) | library | cover text on pine | #efe5cc on #4e6447
OK    5.32 (need 4.5) | library | cover text on ochre | #33251a on #c4924a
OK    5.17 (need 3) | session-summary | button 18px bold | #efe5cc on #4e6447
OK    5.17 (need 3) | session-summary | '+50 XP' green 22px | #4e6447 on #efe5cc
OK    5.32 (need 4.5) | session-summary | reward card text | #33251a on #c4924a
OK    9.88 (need 4.5) | rewards | weekly card text | #33251a on #e3d2a6
OK    5.17 (need 4.5) | rewards | reward card text on pine | #efe5cc on #4e6447
OK    5.32 (need 4.5) | rewards | reward card text on ochre | #33251a on #c4924a
OK   11.79 (need 4.5) | profile | texts | #33251a on #efe5cc

## 5 Звёздный
OK   12.51 (need 4.5) | reader-day | body text | #1c2440 on #f1e8d2
OK   12.87 (need 4.5) | reader-night | body text | #e6dec8 on #0f1a33
OK   12.80 (need 4.5) | reader (both) | title / page number | #efe6cc on #13213f
OK    8.05 (need 4.5) | reader (both) | tool labels 11.5px | #aeb8d4 on #13213f
OK    8.00 (need 3) | reader (both) | tool icons | #d4b46a on #13213f
OK    7.14 (need 4.5) | all tabs | tab label inactive 11.5px | #aeb8d4 on #182a50
OK    7.09 (need 4.5) | all tabs | tab label active | #d4b46a on #182a50
OK    8.05 (need 4.5) | library | author .ba | #aeb8d4 on #13213f
OK    8.00 (need 4.5) | library | chip active | #13213f on #d4b46a
OK   11.35 (need 4.5) | library | cover text on navy | #efe6cc on #182a50
OK    8.00 (need 4.5) | library | cover text on gold | #13213f on #d4b46a
OK    8.00 (need 4.5) | session-summary | button | #13213f on #d4b46a
OK    7.14 (need 4.5) | session-summary | muted .sub/.cap on panel | #aeb8d4 on #182a50
OK    8.00 (need 4.5) | session-summary | gold reward title | #d4b46a on #13213f
OK    7.09 (need 4.5) | rewards | gold amounts | #d4b46a on #182a50
OK    7.14 (need 4.5) | profile | muted | #aeb8d4 on #182a50
```
