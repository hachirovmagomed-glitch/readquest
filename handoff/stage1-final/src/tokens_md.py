# Пишет ../tokens.md из tokens.py
import os
from tokens import COLORS, PAGE, SCALAR, SHADOWS, ALIASES
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)
def L(c):
    c = c.lstrip('#'); v = [int(c[i:i+2], 16)/255 for i in (0, 2, 4)]
    v = [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in v]; return .2126*v[0]+.7152*v[1]+.0722*v[2]
def cr(a, b):
    if not a.startswith('#') or not b.startswith('#'): return '—'
    a, b = sorted([L(a), L(b)], reverse=True); return f'{(a+.05)/(b+.05):.2f}'
C = {n: (d, nv) for n, d, nv, _ in COLORS}
VS = {'text':'bg','text-2':'surface-2','accent-text':'accent-tint','on-accent':'accent','coin':'coin-tint','success':'success-tint','danger':'surface','badge-text':'badge-bg',
      'accent':'bg','accent-pressed':'bg','border-strong':'bg','focus':'bg','toast-game-fg':'toast-game-bg','toast-info-fg':'toast-info-bg','toast-info-icon':'toast-info-bg','toast-error-fg':'toast-error-bg','text-disabled':'surface'}
o = ['# Токены этапа 1 · ReadQuest (бирюза)', '',
     'Источник правды — `src/tokens.py` (генерирует `tokens.css`, `tokens.json` и этот файл). Префикс `--rq-`. День = `:root`, ночь = `[data-theme="night"]` на `<html>`.',
     'Старые имена `app.html` (`--bg`, `--card`, `--txt`, `--muted`, `--accent`…) объявлены как алиасы на новые токены, см. конец файла.', '',
     '## Цвета', '', '| Токен | День | Ночь | Контраст день / ночь (к фону) | Назначение |', '|---|---|---|---|---|']
for n, d, nv, u in COLORS:
    b = VS.get(n); c = f'{cr(d, C[b][0])} / {cr(nv, C[b][1])} к `{b}`' if b else ''
    o.append(f'| `--rq-{n}` | `{d}` | `{nv}` | {c} | {u} |')
o += ['', 'Порог: текст ≥ 4.5:1 (крупный ≥ 3:1), граница кнопок/полей/слайдера ≥ 3:1 (WCAG 1.4.11). `text-disabled` контрастом не ограничен (неактивные элементы).', '',
      '## Страница читалки (`data-page` на `#reader`)', '', 'Имена `--r-bg`/`--r-txt` уже используются в `app.html` (`applySet` пишет их inline) — оставлены как есть; добавлен `--r-txt-2` для номера в углу.', '',
      '| Тема страницы | `--r-bg` | `--r-txt` | контраст | `--r-txt-2` (номер в углу) | контраст | затемнение PDF |', '|---|---|---|---|---|---|---|']
for p, v in PAGE.items():
    o.append(f"| {p} | `{v['r-bg']}` | `{v['r-txt']}` | {cr(v['r-txt'], v['r-bg'])} | `{v['r-txt-2']}` | {cr(v['r-txt-2'], v['r-bg'])} | {v['r-dim']} |")
o += ['', '## PDF ночью — затемнение (вариант B)', '',
      '- По умолчанию **`--rq-pdf-night-dim: .35`**; живое значение `SET.pdfDim` (0..0.5, шаг 0.05) JS пишет в `--rq-pdf-dim`. Слой `rgba(0,0,0,var(--rq-pdf-dim,var(--rq-pdf-night-dim)))` поверх холста (`.rq-pdf-page::after`, `pointer-events:none`, `z-index:1` — ниже текстового слоя pdf.js). Это `brightness(1 − d)`: цвета схем и фото сохраняют оттенок, негатива нет.',
      '- Почему слой, а не `filter`: холст не трогаем — нет лишнего прохода фильтра по canvas на каждом `pdfSwap`, нет риска пустых тайлов на Android, `pdf-verify` читает пиксели как раньше. Тот же приём, что `#dimmer` (жест яркости `SET.dim`, 0..0.7); они перемножаются, 4.5:1 гарантируем только для `pdfDim`.',
      '- Контраст чёрного текста на белой бумаге PDF под слоем: 0 % — 21:1, 25 % — 11.45:1, **35 % — 8.60:1**, 45 % — 6.27:1, **50 % — 5.28:1**, 55 % — 4.41:1 (ниже 4.5), 60 % — 3.66:1 (ниже 4.5). Серый `#666`: 5.74 / 4.65 / 4.10 / 3.49 / 3.18 / 2.86 / 2.54. Поэтому потолок `--rq-pdf-dim-max: .5`.',
      '- Почему .35 по умолчанию: при .25 бумага (`#bfbfbf`) слишком яркая на фоне `#0f1c1f`; при .45 и выше серые подписи заметно тускнеют. Темнее пользователь сделает ползунком (до 50 %) или жестом яркости.',
      '- Область вокруг страницы ночью — `--r-bg` ночной страницы `#0f1c1f`. Интерфейс слоем не затемняется.', '',
      '## Адаптивность', '',
      '- Шрифты `--rq-fs-*` — `clamp(min, calc(base_rem + (100vmin − 390px) × 0.03), max)` в `rem`: учитывают системный размер шрифта Android, мягко плавают по меньшей стороне экрана (альбомная не раздувает). Ровно 390 px = прежние размеры.',
      '- `--rq-read-max` 680px — колонка текста; `--rq-card-max` 480px — шторки и итог по центру на широком/альбомном; `--rq-bp-grid4` 400px — полка в 4 колонки; `--rq-grid-min` 104px — auto-fill в альбомной; `--rq-safe-*` — `env(safe-area-inset-*)`; `--rq-tap` 44px на любом размере.', '',
      '## Типографика, отступы, радиусы, иконки, движение', '', '| Токен | Значение | Назначение |', '|---|---|---|']
for n, v, u in SCALAR: o.append(f'| `--rq-{n}` | `{v}` | {u} |')
o += ['', '## Тени', '', '| Токен | День | Ночь | Где |', '|---|---|---|---|']
for n, d, nv, u in SHADOWS: o.append(f'| `--rq-{n}` | `{d}` | `{nv}` | {u} |')
o += ['', '## Шрифты и вес', '',
      '- Интерфейс — системный стек `system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif`: на Android это Roboto, **0 КБ загрузки**. Веб-шрифтов не добавляем (старые макеты указывали `"Inter"` — он в приложение никогда не грузился, убран).',
      '- Текст книги — `Georgia,"Noto Serif","Times New Roman",serif` (= `FONTS[0]` в app.html). На Android Georgia нет, будет Noto Serif — макеты отрисованы именно им.',
      '- Насыщенности: 400 текст, 600 кнопки/подписи-акценты, 700 заголовки и цифры. Цифры — `font-variant-numeric: tabular-nums` (номера страниц, монеты, XP).', '',
      '## Тосты (`flashMsg(text,{kind})`)', '',
      '| kind | Фон | Текст/иконка | Иконка Lucide | Висит |', '|---|---|---|---|---|',
      f"| `game` | `--rq-toast-game-bg` {C['toast-game-bg'][0]} / {C['toast-game-bg'][1]} | `--rq-toast-game-fg` ({cr(C['toast-game-fg'][0],C['toast-game-bg'][0])} / {cr(C['toast-game-fg'][1],C['toast-game-bg'][1])}) | `coins` | 3 с |",
      f"| `info` | `--rq-toast-info-bg` + рамка `--rq-toast-info-border` | `--rq-toast-info-fg` ({cr(C['toast-info-fg'][0],C['toast-info-bg'][0])} / {cr(C['toast-info-fg'][1],C['toast-info-bg'][1])}), иконка `--rq-toast-info-icon` | `info` | 3 с |",
      f"| `error` | `--rq-toast-error-bg` | `--rq-toast-error-fg` ({cr(C['toast-error-fg'][0],C['toast-error-bg'][0])} / {cr(C['toast-error-fg'][1],C['toast-error-bg'][1])}) | `circle-alert` | 5 с |",
      '', 'Размеры: `--rq-toast-max-w` 358px, `--rq-toast-min-h` 48px, `--rq-toast-pad` 12px 16px, `--rq-toast-radius` 14px, отступ `--rq-toast-gap` 12px над нижним меню, тень `--rq-shadow-2`. Текст 14px/20px, 600.', '',
      '## Алиасы для app.html', '', '| Старое имя | Новый токен |', '|---|---|']
for a, t in ALIASES.items(): o.append(f'| `--{a}` | `--rq-{t}` |')
o += ['', 'Важно: `applyAppTheme()` сейчас пишет `--bg`, `--card`… inline на `<html>` — это перебьёт алиасы. В 1в вместо этого ставим `document.documentElement.dataset.theme = "day"|"night"` (Авто: 7:00–21:00 день).']
open(f'{OUT}/tokens.md', 'w').write('\n'.join(o)+'\n'); print('md ok')
