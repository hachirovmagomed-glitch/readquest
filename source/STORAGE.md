# ReadQuest · storage (Architect contract)

`schemaVersion: **1**`. Оригинал `v6.html` не менялся.

## Контракт сейва (зафиксирован Архитектором)

| Что | Где | Форма |
|-----|-----|--------|
| **schemaVersion** | `localStorage` envelope `rq_v1` | `1` |
| **Тела книг** | IndexedDB only (`files`) | `text:{id}` / `pdf:{id}` — **не** в localStorage |
| **progress** | localStorage (`rq_v1.progress`) | прогресс по книгам, hist, минуты дня, … |
| **goal** | localStorage (`rq_v1.progress.goal`) | **defaultMinutes: 10** (в коде поле `goal`) |
| **streak** | localStorage (`rq_v1.progress.streak`) | TODO: soft floor **≥ 2 мин** (логика позже; storage только хранит) |
| **quests** | localStorage (`rq_v1.game`: `customQuests`, `claimed`, …) | квесты + claimed |
| **gold** | localStorage (`rq_v1.game.gold`) | валюта |
| **sessions[]** | IndexedDB store `sessions` | `{ id, date, bookId, minutes, pageTurns }` — `id` = reader UUID (2026-10-06, additive) |
| **reading events** | IndexedDB store `events` | `{ date, bookId, pageVisibleMs, … }` — **reader пишет, game только читает** |

Фокус / античит — **не** отдельные БД: это флаги/правила поверх `pageVisibleMs` и сессий.

## Файлы

```
/workspace/readquest/
  v6.html                 ← не трогать (reference)
  app.html                ← runnable MVP: bootStorage + single writer + session log
  reader-session.js       ← pageVisibleMs tracker → logReadingEvent / logSession
  STORAGE.md
  READER.md               ← how session logging is wired / how to test
  storage/
    schema.js             SCHEMA_VERSION=1, DEF, migrate, split
    idb.js                DB readquest v3: files + sessions + events
    state.js              load/save envelope (без тел книг)
    migrate-v6.js         readquest + rq_set → rq_v1 + IDB text
    sessions.js           logSession / listSessions (контракт sessions[])
    events.js             logReadingEvent + logAnalyticsEvent (generic type)
    adapter.js            тонкий S/save() + session/event API
    index.js              публичный re-export
    test.html             ручной харнесс
```

## localStorage

| Ключ | Содержимое |
|------|------------|
| `rq_v1` | `{ schemaVersion:1, progress, game, library }` — library.userBooks **без** `.text` |
| `rq_set` | настройки читалки |
| `rq_migrated_v1` | `"1"` после миграции |
| `readquest` | legacy v6 blob (читается миграцией) |

Домены внутри envelope:

- **progress** — `goal` (defaultMinutes **10**), `streak` (TODO soft floor ≥2), `progress{}`, `minToday`, hist, …
- **game** — `gold`, quests (`customQuests` / `claimed` / …), XP/RPG
- **library** — мета книг без тел, covers, hidden, shelfOrder

Один envelope (атомарный save), поля контракта — внутри доменов, не три разрозненных ключа.

## IndexedDB `readquest` (одна БД)

| Store | Назначение |
|-------|------------|
| `files` | тела книг (`text:{id}`, `pdf:{id}`) |
| `sessions` | append-only **sessions[]** |
| `events` | append-only reading events (`pageVisibleMs`) |

Версия БД: **3** (v1 files из v6 → +sessions → +events).

### sessions[] (строго)

```js
{ id: 'UUID', date: 'YYYY-MM-DD', bookId: string, minutes: number, pageTurns: number }
```

- **`id`** (additive, 2026-10-06, schemaVersion остаётся **1**): UUID, который генерирует **читалка**
  (`crypto.randomUUID()`, fallback — случайный v4). Это и ключ IDB (`keyPath: 'id'`), и ключ
  идемпотентности наград. **Никогда** не IDB-автоинкремент. Повторный `logSession` с тем же `id` → ConstraintError.
- **Старые строки** (до 2026-10-06, числовой автоинкремент или без `id`) получают детерминированный id:
  `legacy-<date>-<bookId>-<minutes>-<pageTurns>-<index>`, где `index` — позиция среди таких строк в порядке
  (date, старый числовой ключ / позиция в массиве). Делает это `ensureSessionIds()` (на старте приложения и
  перед экспортом) и `importBackup` (`withLegacyIds`) — повторный импорт старого экспорта даёт те же id.
  `legacy-…` строки **не** награждаются повторно (XP за них уже выдан старым closeReader).
- **Одна строка на сессию, минуты считает только читалка** (`reader-session.js`):
  время на странице считается только пока вкладка видима (фон/скрыто = 0), **не более 3 мин на страницу**
  (`game.anti.maxMin`, дефолт MVP = 3, включая последнюю страницу сессии), `pageTurns` = листания вперёд
  после ≥ `anti.minSec` (12 с) на странице. Забытая открытая книга даёт максимум 3 мин.
- **`date` = локальный день устройства, в который сессия НАЧАЛАСЬ** (2026-10-06, Продукт). Считается одним
  хелпером `localDay(ts)` (`storage/sessions.js`: `getFullYear/getMonth/getDate`, **без** `toISOString`);
  `dayKey()` — его алиас. Трекер фиксирует день в `begin()`, поэтому чтение 23:50–00:15 — одна строка с датой
  первого дня, все её минуты идут в этот день. Старые строки (могли быть записаны по UTC-дню) не переписываются.
  Тот же локальный день используют ежедневка, неделя, стрик, полоска дня, итог и профиль. `test/metrics.py`
  берёт `date` как есть.
- Открытая сессия зеркалится в `localStorage.rq_session_draft` (на каждое листание / скрытие вкладки / 15 с);
  если приложение убили без «←», на следующем старте `recoverDraft()` записывает эту строку (один раз, по `id`).

```js
import { logSession, listSessions, daysMeetingThreshold } from './storage/index.js';

await logSession({ date: '2026-10-05', bookId: 'u1', minutes: 12, pageTurns: 8 });
const rows = await listSessions({ from: '2026-10-01', to: '2026-10-07' });

// Северная метрика Продукта: дни/неделя с ≥10 мин
const ns = await daysMeetingThreshold({
  from: '2026-10-01', to: '2026-10-07', minMinutes: 10 // = defaultMinutes
});
// ns.count, ns.days
```

Вызов — только из читалки в конце сессии (не из game). Game лишь читает `sessions[]`.

### Награды из sessions[] (game, `game-awards.js`)

| Что | Правило | Идемпотентность |
|-----|---------|-----------------|
| XP | `Math.round(row.minutes) * 10` за строку | id строки → `game.awardedSessionIds`; повтор рендера итога, перезагрузка, импорт не дают XP второй раз |
| Daily +30 🪙 | **автоматически** на итоге сессии, после которой сумма `minutes` за её день (`row.date`, локальный день начала) ≥ `goal` (10). Сессия 23:50–00:15 платит за день начала. Дни независимы | `game.dailyPaidDays[]` (YYYY-MM-DD) |
| Weekly +120 🪙 | **автоматически** на итоге сессии, которая дала 4-й день ≥ `goal` в неделе пн–вс (локальные даты, `weekStartOf`). 5-й день — без недельной | `game.weeklyPaidWeeks[]` (понедельник YYYY-MM-DD) |

Кнопки «Забрать» нет (build 3). Начисление запускают только строки, которые награждаются прямо сейчас
(`applySessionAwards` → `applyQuestAwards(game, rows, newRows)`): итог сессии или черновик, восстановленный
при запуске после kill (тогда начисление молча на старте, на библиотеке одна строка «+N 🪙 за прошлую
сессию», один раз). История задним числом не оплачивается. Повторный итог / перезагрузка / реимпорт не платят
второй раз (списки оплаченных в `game`, экспортируются вместе с ним).

**Миграция** (`migrateClaimedToPaid`, один раз, флаг `game.paidMigrated`): старые `game.dailyClaimed` /
`game.weeklyClaimed` / `claimed['mvp_daily:…' | 'mvp_weekly:…']` → в списки оплаченных. Если старый
`dailyClaimed` равен сегодняшнему UTC-дню (старые сборки писали UTC), сегодняшний локальный день тоже
считается оплаченным (нет лишней ежедневки в день перехода); так же для недели. `dailyClaimed` /
`weeklyClaimed` больше не пишутся (остаются в схеме для совместимости).

Других таймеров/счётчиков для наград нет (MVP). `progress.minToday` остаётся только для полного UI v6.


### events (pageVisibleMs)

```js
import { logReadingEvent, listReadingEvents } from './storage/index.js';

// reader writes:
await logReadingEvent({ bookId: 'u1', pageVisibleMs: 15000, page: 3 });
// game reads only:
const ev = await listReadingEvents({ bookId: 'u1', from: '2026-10-05' });

// Analytics / UI stubs (same `events` store, NEVER sessions[]):
await logAnalyticsEvent({ type: 'hero_create_tapped' });
// → { type, date, at }  (+ optional bookId)
// PDF watchdog recovery (app.html pdfStallLog):
await logAnalyticsEvent({ type: 'pdf_stall_recovered', bookId, page: 59, label: '60', stalledMs: 1830, reason: 'flip' });
// → { type, date, at, bookId, page, label, stalledMs, reason }  (page = 0-based index, label = printed page label)
```

## Миграция v6 → v1

`bootStorage()` / `migrateFromV6()`:

1. Прочитать legacy `readquest`.
2. Вырезать `.text` из userBooks → `files` (`text:{id}`); PDF уже в `pdf:{id}`.
3. Записать `rq_v1` (progress / game / library).
4. Флаг `rq_migrated_v1`. Legacy ключ по умолчанию не удаляется.

Существующий `goal` пользователя сохраняется; **новые** установки получают **10**.


### game domain (Architect rewards / economy)

| Field | Type | Notes |
|-------|------|--------|
| `gold` | number | currency balance |
| `dailyClaimed` | `YYYY-MM-DD` or null | LEGACY last claimed MVP daily (claim button), read once by the migration |
| `weeklyClaimed` | week-key `YYYY-MM-DD` (Mon) or null | LEGACY (claim button ≤ 20261006-1240), read once by the migration |
| `dailyPaidDays` | `YYYY-MM-DD[]` | local days whose daily +30 was auto-paid (build 3, additive, schemaVersion 1) |
| `weeklyPaidWeeks` | `YYYY-MM-DD[]` (Mon) | weeks whose weekly +120 was auto-paid |
| `paidMigrated` | boolean | old claim dates already folded into the paid lists |
| `rewardPurchases[]` | `{ id, title, price, at }` | real-rewards shop history; `at` = ISO timestamp |
| `awardedSessionIds[]` | `string[]` | `sessions[].id`, за которые XP уже выдан (2026-10-06) |
| `anti` | `{ minSec: 12, maxMin: 3, v: 2 }` | анти-чит читалки; `maxMin` 4 → 3 однократно (v2) |
| `progress.streak` | number | **not** in game — lives under `progress` |

Compat on hydrate: `rewardHist` → `rewardPurchases`; `dailyClaim` / `claimed['mvp_daily:…']` → `dailyClaimed`; `claimed['mvp_weekly:…']` → `weeklyClaimed`. Legacy `dailyClaim` kept for full-UI daily-bonus button.

## Backup envelope (Architect lock)

Export / import — **один** JSON:

```json
{
  "schemaVersion": 1,
  "progress": { /* rq_v1.progress */ },
  "game": { /* rq_v1.game */ },
  "library": { /* rq_v1.library (без тел книг) */ },
  "sessions": [ { "id": "UUID | legacy-…", "date": "YYYY-MM-DD", "bookId": "…", "minutes": 12, "pageTurns": 8 } ],
  "events": [ { "type": "page_visible"|"hero_create_tapped"|…, "date": "…", "…" } ],
  "settings": { /* optional: rq_set */ }
}
```

- `sessions` / `events` — из IndexedDB (обязательны в экспорте; в импорте **replace**: очистка store → запись массива).
- Import обязателен: восстанавливает `rq_v1` + sessions + events (+ settings если есть).
- PDF-тела в JSON не входят.
- Импорт того же файла дважды → XP / золото / sessions не меняются (`game.awardedSessionIds` приезжает вместе с `game`, строки — с теми же `id`).
- `test/metrics.py` поле `id` игнорирует — работает без изменений.

```js
import { exportBackup, importBackup } from './storage/index.js';
const json = await exportBackup();
await importBackup(json); // round-trip
```

## Как открыть тест

```bash
cd /workspace/readquest && python3 -m http.server 8765
# App (testers):  http://localhost:8765/app.html
# Storage harness: http://localhost:8765/storage/test.html
```

## TODO

1. ~~streak soft floor ≥ 2 мин~~ — сделано в `app.html` closeReader (`minToday ≥ 2`); daily/метрика по-прежнему от `goal` (10).
2. ~~Reader: `logSession` + `logReadingEvent`~~ — см. `app.html` + `reader-session.js` + `READER.md`.
3. 4 экрана MVP — см. `MVP.md` / `app.html` (флаг `SET.mvp`).
4. `data:`-обложки в LS → кандидат в `files` позже.
5. Hero create — только analytics stub (`hero_create_tapped`); без AI/сети.

## Что не сделано намеренно

- `v6.html` не патчился (reference only).
- Нет npm/сборщика.
- Avatar/PNG в IDB — out of scope этого этапа.
- Live path = **`app.html`**: single writer (`rq_v1` + IDB), без параллельной записи в legacy `readquest`.
