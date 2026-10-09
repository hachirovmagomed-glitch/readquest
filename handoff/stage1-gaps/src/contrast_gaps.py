# Контраст новых пар stage1-gaps по каноническим токенам stage1-final (canon/tokens.json). Текст >= 4.5, графика >= 3.
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(D, 'canon', 'tokens.json')))
def hx(c): c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
def mix(a, p, b): A, B = hx(a), hx(b); return '#' + ''.join(f'{round(x*p + y*(1-p)):02x}' for x, y in zip(A, B))
def lum(c):
    f = lambda v: (v/255)/12.92 if v/255 <= .03928 else ((v/255+.055)/1.055)**2.4
    r, g, b = map(f, hx(c)); return .2126*r + .7152*g + .0722*b
def cr(a, b): x, y = sorted((lum(a), lum(b)), reverse=True); return (x+.05)/(y+.05)
def c(n, th): return T['color'][n][th]
def pg(n, p): return T['page'][p][n]
# (экран, элемент, fg, bg, тип)
P = [
 ('profile-hero-stub', '«Создать героя»', 'text', 'surface', 'text'),
 ('profile-hero-stub', 'шеврон', 'text-2', 'surface', 'graphic'),
 ('profile-hero-stub-tapped', '«Создать героя» нажата', 'text', 'PRESSED', 'text'),
 ('profile-hero-stub-tapped', 'тост «Скоро»', 'toast-info-fg', 'toast-info-bg', 'text'),
 ('profile-hero-stub-tapped', 'иконка тоста', 'toast-info-icon', 'toast-info-bg', 'graphic'),
 ('library-import-*', '«Добавить книги»', 'accent-text', 'bg', 'text'),
 ('library-import-*', 'рамка «Добавить книги»', 'accent', 'bg', 'graphic'),
 ('library-import-*', 'плейсхолдер «Поиск»', 'text-2', 'surface', 'text'),
 ('library-import-*', 'чип «Все · 12»', 'on-accent', 'accent', 'text'),
 ('library-import-progress/result', 'текст тоста', 'toast-info-fg', 'toast-info-bg', 'text'),
 ('library-import-progress/result', 'иконки тоста', 'toast-info-icon', 'toast-info-bg', 'graphic'),
 ('library-import-detail', 'имя файла', 'text', 'sheet', 'text'),
 ('library-import-detail', 'причина / подписи', 'text-2', 'sheet', 'text'),
 ('library-import-detail', 'иконка ошибки', 'danger', 'sheet', 'graphic'),
 ('library-import-detail', 'иконка дубликата', 'text-2', 'sheet', 'graphic'),
 ('library-import-detail', '«Понятно»', 'on-accent', 'accent', 'text'),
 ('reader-pdf-zoomed', 'подсказка «Дважды коснитесь…»', 'badge-text', 'badge-bg', 'text'),
 ('reader-pinch-font', 'плашка «Aa 22»', 'on-accent', 'accent', 'text'),
 ('summary-daily-not-done', 'строка «Ещё 4 мин…»', 'text-2', 'sheet', 'text'),
 ('summary-daily-not-done', 'иконка монет', 'coin', 'sheet', 'graphic'),
 ('reader-view-sheet-themes', 'подпись «Меню и экраны…»', 'text-2', 'sheet', 'text'),
 ('reader-view-sheet-themes', '«Базовая» (выбрана)', 'accent-text', 'surface', 'text'),
 ('reader-view-sheet-themes', '«Карандашная»', 'text', 'surface', 'text'),
 ('reader-view-sheet-themes', 'рамка выбранной карточки', 'accent', 'sheet', 'graphic'),
 ('reader-view-sheet-themes', 'галочка', 'on-accent', 'accent', 'graphic'),
]
rows, fail = [], 0
for th in ('day', 'night'):
    for scr, el, f, b, k in P:
        bg = mix(c('text', th), .10, c('surface', th)) if b == 'PRESSED' else c(b, th)
        r = cr(c(f, th), bg); ok = r >= (4.5 if k == 'text' else 3); fail += not ok
        rows.append((scr, el, th, f, b, c(f, th), bg, k, f'{r:.2f}', 'ok' if ok else 'FAIL'))
    # номер «76 / 144» на подложке r-bg поверх увеличенной страницы
    p = 'night' if th == 'night' else 'sepia'
    r = cr(pg('r-txt-2', p), pg('r-bg', p)); ok = r >= 4.5; fail += not ok
    rows.append(('reader-pdf-zoomed', '«76 / 144»', th, 'r-txt-2', f'r-bg ({p})', pg('r-txt-2', p), pg('r-bg', p), 'text', f'{r:.2f}', 'ok' if ok else 'FAIL'))
with open(os.path.join(D, 'contrast-gaps.tsv'), 'w') as o:
    o.write('screen\telement\ttheme\tfg_token\tbg_token\tfg\tbg\ttype\tratio\tresult\n')
    for r in rows: o.write('\t'.join(r) + '\n')
mt = min(float(r[8]) for r in rows if r[7] == 'text'); mg = min(float(r[8]) for r in rows if r[7] == 'graphic')
print(f'пар: {len(rows)}, провалов: {fail}, мин. текст {mt:.2f}, мин. графика {mg:.2f}')
for r in rows:
    if r[9] == 'FAIL': print(r)
sys.exit(1 if fail else 0)
