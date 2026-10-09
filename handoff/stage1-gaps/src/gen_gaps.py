# Недостающие макеты этапа 1 (базовый стиль, токены stage1-final). python3 gen_gaps.py
# Переиспользует хелперы канонического gen.py (canon/src/gen.py) и mock.css/tokens.css без изменений.
import os, sys, re, math, json, subprocess
from concurrent.futures import ThreadPoolExecutor
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)
sys.path.insert(0, os.path.join(D, 'canon', 'src'))
import gen as G                      # канон: ic, mon, nav, coinchip, library, profile, summ, reader, pdfpage, reader_settings, doc
os.chdir(D)
ic, mon, nav, doc, reader = G.ic, G.mon, G.nav, G.doc, G.reader

def plural(n, one, few, many):
    m, k = n % 100, n % 10
    return one if k == 1 and m != 11 else few if 2 <= k <= 4 and not 12 <= m <= 14 else many
def books(n): return f'{n} {plural(n, "книга", "книги", "книг")}'
def files(n): return f'{n} {plural(n, "файл", "файла", "файлов")}'
NOPEN = 'не открылся' if True else ''          # 1 файл не открылся / 2 файла не открылись
def fails(n): return f'{files(n)} {"не открылся" if plural(n,1,2,3)==1 else "не открылись"}'

def toast_above_nav(inner): # канон: 12 px над нижним меню (84 в макете) -> bottom:96
    return f'<div style="position:absolute;left:0;right:0;bottom:96px;display:flex;justify-content:center">{inner}</div>'

# ---------- 1. Профиль: заглушка «Создать героя» ----------
def hero_row(pressed=False):
    bg = 'color-mix(in srgb,var(--rq-text) 10%,var(--rq-surface))' if pressed else 'var(--rq-surface)'
    return (f'<div data-tap="Создать героя" role="button" style="margin:12px 16px 0;min-height:52px;display:flex;align-items:center;gap:12px;padding:0 8px 0 14px;'
            f'background:{bg};color:var(--rq-text);border:1px solid var(--rq-line);border-radius:var(--rq-radius-md)">'
            f'<span style="flex:1;font-size:16px;font-weight:500">Создать героя</span>'
            f'<span style="color:var(--rq-text-2);display:flex">{ic("chevron-right",20)}</span></div>')
def profile_hero(tapped=False):
    p = G.profile()
    i = p.rfind('<div class="bnav">')
    t = toast_above_nav(f'<div class="toast info" style="min-width:160px">{ic("info",20)}<span>Скоро</span></div>') if tapped else ''
    return p[:i] + hero_row(tapped) + t + p[i:]

# ---------- 2–4. Библиотека: импорт нескольких файлов ----------
NEW = [('Идиот','Ф. Достоевский','#6b4a2a','PDF'),('Отцы и дети','И. Тургенев','#3d5a3a','FB2'),('Обломов','И. Гончаров','#5a3d5e','EPUB'),
       ('Дубровский','А. Пушкин','#2f4a5e','FB2'),('Мёртвые души','Н. Гоголь','#6d2a2a','EPUB'),('Шинель','Н. Гоголь','#4a4a3a','TXT')]
def library_import(new=False, extra=''):
    h = G.library()
    h = h.replace(f'<div class="ib">{ic("plus",24)}</div></div>', '</div>', 1)          # «+» из шапки переехал в кнопку с подписью
    s0 = f'<div class="search">{ic("search",20)}Поиск по названию и автору</div>'
    s1 = (f'<div style="grid-area:search;display:flex;gap:8px;margin:12px 16px 0"><div class="search" style="margin:0;flex:1;min-width:0">{ic("search",20)}Поиск</div>'
          f'<div class="btn sec2" data-tap="Добавить книги" style="min-height:44px;padding:0 14px 0 10px;font-size:15px;white-space:nowrap;gap:6px">{ic("plus",20)}Добавить книги</div></div>')
    assert s0 in h; h = h.replace(s0, s1, 1)
    if new:
        g0 = h.index('<div class="grid">') + len('<div class="grid">')
        nb = ''.join(G.cover(t, a, None, c, 0, f) for t, a, c, f in NEW)
        h = h[:g0] + nb + h[g0:]
        h = h.replace('<span class="on">Все</span>', '<span class="on">Все · 12</span>', 1)
    i = h.rfind('<div class="bnav">')
    return h[:i] + extra + h[i:]
def imp_progress():
    t = (f'<div class="toast info" style="width:358px">{ic("loader-circle",20)}<span>Добавляем 3 из 7…</span></div>')
    return library_import(False, toast_above_nav(t))
RESULT_TOAST = (f'<div class="toast info" data-tap="тост итога" role="button" style="width:358px;align-items:center;gap:10px;padding:10px 10px 10px 14px">{ic("circle-alert",20)}'
                f'<span style="flex:1;min-width:0">Добавлено {books(6)} · {fails(1)}'
                f'<small style="display:block;font-weight:500;font-size:13px;line-height:18px">уже в библиотеке: 2</small></span>'
                f'<span style="display:flex">{ic("chevron-right",20)}</span></div>')
def imp_result(): return library_import(True, toast_above_nav(RESULT_TOAST))
def imp_detail():
    row = lambda icn, col, name, why: (f'<div style="display:flex;align-items:center;gap:12px;min-height:52px;border-bottom:1px solid var(--rq-line)">'
                                       f'<span style="color:{col};display:flex">{ic(icn,22)}</span><div style="flex:1;min-width:0">'
                                       f'<div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</div>'
                                       f'<div style="font-size:13px;color:var(--rq-text-2);line-height:1.35">{why}</div></div></div>')
    sheet = (f'<div class="scrim"></div><div class="sheet" style="padding-bottom:28px"><div class="grab"></div>'
             f'<div class="shead"><div><h2>Добавление книг</h2><div class="sub">Добавлено {books(6)} из 9 выбранных файлов</div></div><div class="ib" data-tap="закрыть">{ic("x")}</div></div>'
             f'<div class="lab" style="margin:12px 0 2px">Не открылся · {files(1)}</div>'
             + row('circle-alert', 'var(--rq-danger)', 'Курсовая_2019.pdf', 'Не удалось прочитать файл')
             + f'<div class="lab" style="margin:16px 0 2px">Уже в библиотеке: 2</div>'
             + row('book-check', 'var(--rq-text-2)', 'Мастер и Маргарита.fb2', 'Пропущен, прогресс не тронут')
             + row('book-check', 'var(--rq-text-2)', 'Sapiens.pdf', 'Пропущен, прогресс не тронут').replace('border-bottom:1px solid var(--rq-line)', 'border-bottom:0')
             + f'<div class="btn" data-tap="Понятно" style="margin-top:16px">Понятно</div></div>')
    h = library_import(True)
    i = h.rfind('</div>')          # шторка поверх всего экрана, включая нижнее меню
    return h[:i] + sheet + h[i:]

# ---------- 5. PDF увеличен ×2 ----------
def pdf_zoomed():
    pg = G.pdfpage().replace('>41</div></div>', '>76</div></div>')
    pg = pg.replace('class="rq-pdf-page"', 'class="rq-pdf-page" style="background:#fbfaf4;position:absolute;left:-30px;top:-96px;transform:scale(2) rotate(-.25deg);transform-origin:0 0;box-shadow:none"', 1)
    chip = ('<div style="position:absolute;left:0;right:0;bottom:40px;display:flex;justify-content:center"><div style="background:var(--rq-badge-bg);color:var(--rq-badge-text);'
            'font-size:14px;font-weight:600;line-height:20px;padding:8px 16px;border-radius:var(--rq-radius-pill);box-shadow:var(--rq-shadow-2);white-space:nowrap">Дважды коснитесь — по ширине</div></div>')
    return (f'<READER><div class="pdfwrap" style="overflow:hidden;display:block">{pg}</div>{chip}'
            f'<div class="corner" style="bottom:7px;right:18px;background:var(--r-bg);border-radius:6px;padding:1px 6px"><span class="pgnum">76 / 144</span></div>'
            f'<div class="daybar" style="position:absolute;left:0;right:0;bottom:0"><i style="width:60%"></i></div></READER>')

# ---------- 6. Пинч шрифта ----------
def pinch():
    plate = ('<div id="pinchHint" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:baseline;gap:10px;'
             'background:var(--rq-accent);color:var(--rq-on-accent);border-radius:var(--rq-radius-pill);padding:12px 24px;box-shadow:var(--rq-shadow-3)">'
             '<span style="font:600 22px/1 var(--rq-font-read)">Aa</span><b class="num" style="font-size:22px;line-height:1">22</b></div>')
    return reader(plate)

# ---------- 7. Итог: цель дня не набрана ----------
def summ_not_done():
    h = G.summ('missed')
    g0 = re.search(r'<div class="sr"><svg[^>]*viewBox="0 0 64 64".*?</div></div>', h, re.S).group(0)
    calm = (f'<div class="sr"><span style="color:var(--rq-coin);display:flex">{ic("coins",22)}</span>'
            f'<span class="n" style="color:var(--rq-text-2)">Ещё 4 мин сегодня — и +30 монет</span></div>')
    h = h.replace(g0, calm, 1)
    h = re.sub(r'<div class="btn sec2".*?Почитать ещё 4 мин</div>', '', h, flags=re.S)
    h = h.replace('<div class="btn" style="margin-top:10px">В библиотеку', '<div class="btn" data-tap="В библиотеку" style="margin-top:12px">В библиотеку')
    assert 'Почитать' not in h and 'data-tap="В библиотеку"' in h
    return h

# ---------- 8. «Вид страницы»: тема страницы + оформление приложения ----------
def skin_preview(kind, night):
    if kind == 'base':
        bg, sf, ln, tx, ac = ('#0c1719', '#13232a', '#2a3d42', '#d6e2e0', '#5fb8ae') if night else ('#faf6ec', '#ffffff', '#e3d8bf', '#3b3226', '#1f6f6b')
        frame = f'<rect x="10" y="16" width="100" height="26" rx="5" fill="{sf}" stroke="{ln}"/>'
        pill = f'<rect x="10" y="48" width="44" height="10" rx="5" fill="{ac}"/>'
        lines = f'<rect x="17" y="23" width="52" height="4" rx="2" fill="{tx}"/><rect x="17" y="31" width="34" height="3" rx="1.5" fill="{tx}" opacity=".55"/>'
        hd = f'<rect x="10" y="5" width="40" height="5" rx="2.5" fill="{tx}"/>'
    else:  # карандашная: неровный контур запечён в path, без SVG-фильтров
        bg, sf, ln, tx, ac = ('#2b3038', '#353b45', '#cfccc3', '#e8e6df', '#86cbc2') if night else ('#f3f0e7', '#fbfaf5', '#3d3d3a', '#2a2a28', '#1d6464')
        frame = f'<path d="M10.5 16.8 C40 15.6 80 16.9 109.6 16.2 L110.3 41.5 C80 42.4 40 41.2 9.8 42.1 Z" fill="{sf}" stroke="{ln}" stroke-width="1.1" stroke-linejoin="round"/>'
        pill = f'<path d="M11 49.5 C25 48.6 40 49.8 54 48.9 L53.6 58.3 C40 57.6 25 58.9 10.6 58 Z" fill="none" stroke="{ac}" stroke-width="1.6"/>'
        lines = (f'<path d="M17 25 C30 24 50 26 69 24.6" stroke="{tx}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
                 f'<path d="M17 32.6 C28 32 40 33.4 51 32.4" stroke="{tx}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>')
        hd = f'<path d="M10 7.6 C22 6.6 36 8.4 50 7.2" stroke="{tx}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    return (f'<svg width="100%" height="64" viewBox="0 0 120 64" preserveAspectRatio="xMidYMid meet" style="display:block;background:{bg};border-radius:8px 8px 0 0" aria-hidden="true">'
            f'{hd}{frame}{lines}{pill}</svg>')
def view_sheet(night):
    h = G.reader_settings(night)
    def card(kind, name, on):
        b = 'border:2.5px solid var(--rq-accent)' if on else 'border:1.5px solid var(--rq-line)'
        ck = (f'<i class="ck" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:var(--rq-accent);color:var(--rq-on-accent);display:flex;align-items:center;justify-content:center">{ic("check",14,sw=3)}</i>' if on else '')
        return (f'<div data-tap="{name}" role="radio" aria-checked="{str(on).lower()}" style="flex:1;position:relative;border-radius:var(--rq-radius-md);{b};background:var(--rq-surface);overflow:visible">'
                f'<div style="border-radius:var(--rq-radius-md) var(--rq-radius-md) 0 0;overflow:hidden">{skin_preview(kind, night)}</div>'
                f'<div style="display:flex;align-items:center;justify-content:center;height:34px;font-size:14px;font-weight:{700 if on else 500};color:{"var(--rq-accent-text)" if on else "var(--rq-text)"}">{name}</div>{ck}</div>')
    sec = (f'<div class="sec"><div class="lab" style="margin-bottom:2px">Оформление приложения</div>'
           f'<div style="font-size:13px;color:var(--rq-text-2);line-height:1.35;margin-bottom:10px">Меню и экраны вокруг книги. Страница не меняется.</div>'
           f'<div style="display:flex;gap:10px">{card("base","Базовая",True)}{card("pencil","Карандашная",False)}</div></div>')
    a = '<div class="sec"><div class="lab" style="display:flex;justify-content:space-between"><span>Размер текста</span>'
    assert a in h
    h = h.replace(a, sec + a, 1)
    h = h.replace('<div class="sec"><div class="lab">Тема страницы</div>', '<div class="sec"><div class="lab">Тема страницы <span style="font-weight:400">· только лист книги</span></div>', 1)
    h = h.replace('<div class="sheet" style="height:704px">', '<div class="sheet" style="height:780px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 93%,transparent)">', 1)
    return h

SCREENS = [
 ('profile-hero-stub',         '1в', 'Профиль: «Создать героя»', 'последняя строка под статистикой; surface + text, только шеврон', lambda n: profile_hero(), None),
 ('profile-hero-stub-tapped',  '1в', 'Профиль: тап по заглушке', 'событие hero_create_tapped, тост info «Скоро»', lambda n: profile_hero(True), None),
 ('library-import-progress',   '1в', 'Импорт: идёт', 'кнопка «Добавить книги» (мультивыбор), тост «Добавляем 3 из 7…»', lambda n: imp_progress(), None),
 ('library-import-result',     '1в', 'Импорт: итог', 'тост по тапу открывает подробности; новые книги первыми', lambda n: imp_result(), None),
 ('library-import-detail',     '1в', 'Импорт: подробности', 'что не открылось и почему, дубликаты; «Понятно»', lambda n: imp_detail(), None),
 ('reader-pdf-zoomed',         '1б', 'PDF ×2', 'верхние 12 % выкл.; подсказка про двойной тап; «76 / 144» из меток PDF', lambda n: pdf_zoomed(), 'page'),
 ('reader-pinch-font',         '1б', 'Пинч шрифта', 'плашка «Aa 22» (#pinchHint, --rq-accent); текст пока прежний', lambda n: pinch(), 'page'),
 ('summary-daily-not-done',    '1в', 'Итог: цель не набрана', 'одна спокойная строка с монетами, без кнопки и кольца', lambda n: summ_not_done(), 'page'),
 ('reader-view-sheet-themes',  '1б', '«Вид страницы» + оформление', 'тема страницы отдельно; оформление: Базовая / Карандашная', lambda n: view_sheet(n), 'page'),
]

TAPJS = ('<script>addEventListener("load",()=>{const r=[...document.querySelectorAll("[data-tap],.ib,.btn,.bnav>div,.toast,.themes>div")].filter(e=>!e.closest("[data-under]")).map(e=>{const b=e.getBoundingClientRect();'
         'return [e.dataset.tap||e.className||e.textContent.trim().slice(0,20),Math.round(b.width),Math.round(b.height)]});document.body.setAttribute("data-taps",JSON.stringify(r))})</script>')

def pages(): 
    for key, part, title, desc, fn, pg in SCREENS:
        for theme in ('day', 'night'):
            page = ('night' if theme == 'night' else 'sepia') if pg else None
            yield key, theme, doc(fn(theme == 'night'), theme, page, f'{key}-{theme}')

def build():
    jobs = []
    for key, theme, h in pages():
        f = f'{D}/{key}-{theme}.html'; open(f, 'w').write(h)
        jobs += [(f, f'{OUT}/{key}-{theme}.png', 1), (f, f'{OUT}/{key}-{theme}@2x.png', 2)]
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda j: G.shot(*j), jobs))

def taps():
    bad = []; os.makedirs('/tmp/gaptaps', exist_ok=True)
    for key, theme, h in pages():
        f = f'/tmp/gaptaps/{key}-{theme}.html'
        open(f, 'w').write(h.replace('href="../tokens.css"', f'href="{OUT}/tokens.css"').replace('href="mock.css"', f'href="{D}/mock.css"').replace('</body>', TAPJS + '</body>'))
        out = subprocess.run([G.CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=390,844', '--virtual-time-budget=2000', '--dump-dom', 'file://'+f], capture_output=True, text=True).stdout
        m = re.search(r'data-taps="([^"]*)"', out); r = json.loads(m.group(1).replace('&quot;', '"'))
        for n, w, hh in r:
            if min(w, hh) < 44: bad.append((key, theme, n, w, hh))
        print(key, theme, 'элементов:', len(r), 'мин:', min([min(w, hh) for _, w, hh in r] or ['—']))
    print('меньше 44 px:', bad or 'нет'); return bad

def overview():
    rows = ''
    for theme in ('day', 'night'):
        mu = '#5d513e' if theme == 'day' else '#93aaa7'
        name = 'день' if theme == 'day' else 'ночь'
        cells = ''.join(f"<div style='width:390px;flex:none'><img src='../{k}-{theme}.png' style='width:390px;height:844px;border-radius:16px;box-shadow:0 2px 12px #0005;display:block'>"
                        f"<div style='margin-top:10px;font-size:19px;font-weight:700'>{t} <span style='font-weight:600;color:{mu}'>· {p}</span></div>"
                        f"<div style='font-size:15px;color:{mu};margin-top:2px;line-height:1.35'>{d}</div><div style='font:13px monospace;color:{mu};margin-top:4px'>{k}-{theme}.png</div></div>"
                        for k, p, t, d, *_ in SCREENS)
        bg, fg = ('#e9e4da', '#2b251c') if theme == 'day' else ('#071012', '#d6e2e0')
        rows += (f"<div style='background:{bg};color:{fg};padding:26px 30px 24px'><div style='font-size:26px;font-weight:700;margin-bottom:18px'>{name}</div>"
                 f"<div style='display:flex;gap:36px'>{cells}</div></div>")
    W = 60 + len(SCREENS)*390 + (len(SCREENS)-1)*36
    html = (f"<!doctype html><meta charset=utf-8><body style='margin:0;font-family:Roboto,sans-serif;width:{W}px;background:#e9e4da'>"
            f"<div style='padding:30px 30px 4px;color:#2b251c'><div style='font-size:32px;font-weight:700'>ReadQuest · этап 1 · недостающие макеты</div>"
            f"<div style='font-size:17px;color:#5d513e;margin-top:6px'>Базовый стиль, токены stage1-final · 390×844 · 1б — читалка, 1в — приложение · верхний ряд — день, нижний — ночь</div></div>{rows}")
    f = f'{D}/overview.html'; open(f, 'w').write(html)
    G.shot(f, f'{OUT}/stage1-gaps-overview.png', 1, W, 96 + 2*(26+18+36+844+10+28+44+24+24))

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or 'build' in a: build()
    if not a or 'overview' in a: overview()
    if 'taps' in a: taps()
