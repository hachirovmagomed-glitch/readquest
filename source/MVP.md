# ReadQuest · 4-screen MVP

Entry: **`app.html`**. Flag: `SET.mvp` (default **true**) in `rq_set`. Toggle in **Настройки → MVP**.

## Screens

| Screen | Role |
|--------|------|
| Библиотека | «Продолжить», цель 10 мин, мягкий стрик (≥2), полка. Без RPG-хрома. |
| Читалка | Текст + Aa. **Focus** (`SET.focusMode`, default on): без XP/RPG тостов. Без таймера и ▶: открыл книгу — минуты считаются (≤3 мин на страницу, фон = 0). Тонкая полоска прогресса дня внизу (день сессии = день её начала); над ней справа всегда виден номер страницы «34 / 210» (11px, приглушённый). Щипок = размер шрифта: во время жеста по центру плашка «Aa N», текст перестраивается один раз после отпускания. Номер страницы и ползунок меняются в том же кадре, что и текст. |
| Итог сессии | XP, стрик, прогресс daily/weekly; строки «+30 🪙 ежедневка выполнена» / «+120 🪙 неделя выполнена» — только если начислено этой сессией; кнопка «В библиотеку». |
| Профиль | Рамка героя, «Создать героя», статус ежедневки («✓ выполнено сегодня» или N / 10 мин) и недели («N / 4 дня», «✓ неделя выполнена»), без кнопок «Забрать»; золото, шторка наград. |

Bottom nav: **Библиотека | Профиль**. Reader/summary — не вкладки.

## Hidden behind `SET.mvp = false` (full v6)

Quotes, vocab, game shop, quests list, stats, calendar, achievements, trophy shelf, boss, pet, talents, gear, daily-bonus button, custom quests, gold-from-reading / boss gold.

## Economy (MVP)

- **XP** — only from reading: `Math.round(min)*10` per `sessions[]` row, once per row `id` (`game.awardedSessionIds`).
- **Gold** — AUTO-paid (no claim button): daily +30 on the summary of the session that takes its day to ≥10 min, weekly +120 on the summary of the session that makes the 4th day ≥10 min in the Mon–Sun week. Paid lists `game.dailyPaidDays` / `game.weeklyPaidWeeks`; old claims migrated once. A session recovered after a kill is paid silently at boot + one gold line «+N 🪙 за прошлую сессию» on the library (once).
- **Day** — the device's **local** calendar day (`localDay()`), not UTC. A session belongs to the day it **started** (23:50–00:15 → first day, one row, daily paid for that day). Week = Mon–Sun of local days.
- **Streak** — `progress.streak` (soft ≥2 min on the session's local day).
- **rewardPurchases[]** — `{ id, title, price, at }` in `game`.
- Real-rewards sheet: tiers 100 / 250 / 500; max 5 slots; no free-form price.

## How to test

```bash
cd /workspace/readquest && python3 -m http.server 8765
# http://localhost:8765/app.html
```

1. Library shows continue + goal 10, no daily-bonus / gold chip.
2. Open book → pages → back → summary → «В библиотеку»; IDB `sessions` row written.
3. Summary of the session that reaches 10 min shows «+30 🪙 ежедневка выполнена»; profile shows «✓ выполнено сегодня»; open «Награды из жизни».
4. Settings → turn off MVP → full drawer/UI returns.
5. Export JSON → must include `schemaVersion`, `progress`, `game`, `library`, `sessions`, `events` (+ optional `settings`).

Screenshots: `shots/`.


## Deploy (static)

```bash
./build-dist.sh
# upload dist/ to GitHub Pages (Project site → docs/ or gh-pages)
# or preview under a subpath:
mkdir -p /tmp/pages/readquest && cp -a dist/. /tmp/pages/readquest/
python3 -m http.server 8766 --directory /tmp/pages
# open http://localhost:8766/readquest/
```

`dist/` contains only the MVP app (`index.html` = `app.html`), `storage/*.js`, icons, and `manifest.webmanifest`. No smoke tests, no `v6.html`.
