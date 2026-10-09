# Автопрокрутка с блокировкой касаний (этап 1, дополнение). python3 autoscroll.py
import os, math, sys
from concurrent.futures import ThreadPoolExecutor
from gen import D, OUT, ic, doc, H, P1, P2, P3, ring_s, pdfpage, shot
AO = os.path.join(OUT, 'autoscroll')
SPEED = 6
def ribbon(off, end=False):
    body = f'<p>{H(P2)}</p><p>{H(P3)}</p><h3>Глава 2. Понтий Пилат</h3><p>{H(P1)}</p><p>{H(P2)}</p><p>{H(P3)}</p>'
    if end:
        body = f'<p>{H(P1)}</p><p>{H(P2)}</p><p>{H(P3)}</p><div class="asend">{ic("book-check",16)}Конец книги</div>'
    return f'<div class="asview"><div class="viewer" style="{off}">{body}</div></div>'
def counter(): return f'<span class="fcount" aria-label="Чтение засчитывается: 7 из 10 минут">{ring_s(.7)}7 / 10 мин</span>'
def stat(kind='run'):
    if kind == 'lock': return f'<span class="asstat">{ic("lock",14,sw=2.2)}Касания заблокированы</span>'
    if kind == 'stop': return f'<span class="asstat">{ic("pause",14,sw=2.2)}Остановлено</span>'
    return f'<span class="asstat" aria-label="Автопрокрутка, скорость {SPEED}">{ic("chevrons-up",14,sw=2.2)}Автопрокрутка · {SPEED}</span>'
def line(kind='run'): return f'<div class="asline">{stat(kind) if kind else "<span></span>"}{counter()}</div><div style="height:3px"></div>'
def pill(playing=True):
    pp = (f'<div class="pb pri" aria-label="Пауза">{ic("pause",20,sw=2)}</div>' if playing else
          f'<div class="pb pri" aria-label="Продолжить">{ic("play",20,sw=2)}</div>')
    return (f'<div class="aspill" role="toolbar" aria-label="Автопрокрутка">{pp}'
            f'<div class="pb" aria-label="Медленнее">{ic("minus",22)}</div>'
            f'<div class="spd" aria-label="Скорость {SPEED} из 20"><b>{SPEED}</b><span>скорость</span></div>'
            f'<div class="pb" aria-label="Быстрее">{ic("plus",22)}</div><div class="dv"></div>'
            f'<div class="lk">{ic("lock",20)}Блокировать</div></div>')
def screen(inner, after=''):
    return f'<READER><div class="rcontent" style="display:flex;flex-direction:column;flex:1;min-height:0">{inner}</div></READER>{after}'

def as_running(n): return screen(ribbon('top:-14px') + line(None), pill(True))  # пока видна панель, статус слева не нужен: скорость на панели
def as_clean(n):   return screen(ribbon('top:-196px') + line())
def as_locked(n):
    r = 24; L = 2*math.pi*r; p = .6
    ring = (f'<svg class="ring" width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="{r}" fill="none" stroke="var(--rq-border-strong)" stroke-opacity=".45" stroke-width="3.5"/>'
            f'<circle cx="28" cy="28" r="{r}" fill="none" stroke="var(--rq-accent)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="{L:.2f}" stroke-dashoffset="{L*(1-p):.2f}" transform="rotate(-90 28 28)"/></svg>')
    return screen(ribbon('top:-312px') + line('lock'),
                  f'<div class="lockb" role="button" aria-label="Разблокировать: удерживайте 1 секунду">{ring}<div class="core">{ic("lock",22,sw=2)}</div></div>'
                  f'<div class="lockhint">Удерживайте, чтобы разблокировать</div>')
def as_end(n):
    return screen(ribbon('bottom:176px', end=True) + line('stop'),
                  pill(False) + f'<div style="position:absolute;left:16px;right:16px;bottom:100px;display:flex;justify-content:center"><div class="toast info">{ic("book-check",20)}<span>Книга закончилась, автопрокрутка остановлена</span></div></div>')
def pdfpage2(num=42, title='Реки и каналы'):
    t = 'font-size:9.6PX;line-height:1.45;text-align:justify;hyphens:auto;margin-bottom:6px;text-indent:1.2em'
    para = ('Первые города росли там, где урожай был надёжнее всего: в долинах больших рек. Разливы приносили ил, и поле '
            'не истощалось. Но вода требовала порядка: каналы нужно было копать вместе, а значит, договариваться.')
    return (f'<div class="rq-pdf-page" data-nocheck="1"><div style="font-size:12PX;font-weight:700;margin:6px 0 10px">{title}</div>'
            + ''.join(f'<p style="{t}">{para}</p>' for _ in range(6))
            + '<div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:9PX;color:#555">{num}</div></div>')
def as_pdf(n):
    return screen(f'<div class="asview" style="max-width:none"><div class="pdfribbon"><div style="margin-top:-322px">{pdfpage()}{pdfpage2()}{pdfpage2(43, "Глава 6. Письмо и счёт")}</div></div></div>' + line())

def as_sheet(night):
    from gen import reader
    sel = 'night' if night else 'sepia'
    pct = (SPEED-1)/19*100
    return (reader(n=98) + '<div class="scrim"></div>' +
        f'<div class="sheet" style="top:56px;display:flex;flex-direction:column"><div aria-hidden="true" style="position:absolute;right:5px;top:250px;width:4px;height:150px;border-radius:2px;background:var(--rq-border-strong);opacity:.6"></div><div class="grab"></div><div class="shead"><h2>Вид страницы</h2><div class="ib">{ic("x")}</div></div>'
        f'<div style="flex:1;min-height:0;overflow:hidden;position:relative;border-top:1px solid var(--rq-line)">'
                f'<div style="margin-top:-6px">'
        f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between"><span>Размер текста</span><b class="num" style="color:var(--rq-text)">19</b></div>'
        f'<div style="display:flex;align-items:center;gap:6px"><div class="ib" style="font:600 15px var(--rq-font-read)">A</div>'
        f'<div class="slider" style="flex:1;margin:0"><div class="tr"></div><div class="fi" style="width:42%"></div><div class="th" style="left:42%"></div></div>'
        f'<div class="ib" style="font:600 24px var(--rq-font-read)">A</div></div></div>'
        f'<div class="sec"><div class="lab">Шрифт</div><div class="seg"><div class="on" style="font-family:var(--rq-font-read)">Georgia</div><div style="font-family:\'Times New Roman\',Tinos,serif">Times</div><div>Без засечек</div></div></div>'
        f'<div class="sec"><div class="lab">Интервал и поля</div><div class="seg"><div>Плотно</div><div class="on">Обычно</div><div>Свободно</div></div>'
        f'<div class="seg" style="margin-top:8px"><div>Узкие поля</div><div class="on">Средние</div><div>Широкие</div></div></div>'
        f'<div class="sec srow"><div class="tx">Выравнивание по ширине<small>С переносами слов</small></div><div class="tg"></div></div>'
        f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between;margin-bottom:0"><span>Затемнение PDF ночью</span><b class="num" style="color:var(--rq-text)">35 %</b></div>'
        f'<div class="slider" style="margin:0 4px"><div class="tr"></div><div class="fi" style="width:70%"></div><div class="th" style="left:70%"></div></div>'
        f'<div class="mut num" style="display:flex;justify-content:space-between;font-size:12px;margin-top:-6px"><span>0 %</span><span>'
        + ('сейчас применяется к PDF' if night else 'работает в ночной теме') + '</span><span>50 %</span></div></div>'
        f'<div class="sec asrow"><div class="lab" style="display:flex;justify-content:space-between;margin-bottom:0;font-size:0.9375rem;color:var(--rq-text);font-weight:600"><span>Автопрокрутка</span><b class="num" style="color:var(--rq-text)">Скорость {SPEED}</b></div>'
        f'<div style="display:flex;align-items:center;gap:6px"><div class="ib" aria-label="Медленнее">{ic("minus",20)}</div>'
        f'<div class="slider" style="flex:1;margin:0" role="slider" aria-valuemin="1" aria-valuemax="20" aria-valuenow="{SPEED}"><div class="tr"></div><div class="fi" style="width:{pct:.1f}%"></div><div class="th" style="left:{pct:.1f}%"></div></div>'
        f'<div class="ib" aria-label="Быстрее">{ic("plus",20)}</div></div>'
        f'<div class="hint">Текст поедет вверх сам. Тап в центр — пауза, свайп — подвинуть текст.</div>'
        f'<div class="btn">{ic("play",20,sw=2)}Запустить</div></div>'
        f'</div></div></div>')

AS = [
 ('autoscroll-sheet',   'Шторка: автопрокрутка', 'строка в «Вид страницы»: скорость 1–20, «Запустить»', as_sheet),
 ('autoscroll-running', 'Автопрокрутка идёт', 'лента текста, плавающая панель видна 3 с', as_running),
 ('autoscroll-clean',   'Автопрокрутка: чистый экран', 'панель погасла; внизу статус и счётчик чтения', as_clean),
 ('autoscroll-locked',  'Касания заблокированы', 'значок замка; удержание 1 с заполняет кольцо', as_locked),
 ('autoscroll-pdf',     'Автопрокрутка PDF', 'страницы лентой с зазором 12 px; ночью затемнение 35 %', as_pdf),
]
LAND = [('autoscroll-running', 844, 390, ('day', 'night'))]

def build():
    os.makedirs(AO, exist_ok=True); jobs = []
    for key, title, desc, fn in AS:
        for th in ('day', 'night'):
            page = 'night' if th == 'night' else 'sepia'
            f = f'{D}/{key}-{th}.html'; open(f, 'w').write(doc(fn(th == 'night'), th, page, f'{key}-{th}'))
            jobs += [(f, f'{AO}/{key}-{th}.png', 1), (f, f'{AO}/{key}-{th}@2x.png', 2)]
    for key, w, h, ths in LAND:
        for th in ths:
            f = f'{D}/{key}-{th}.html'
            jobs += [(f, f'{AO}/{key}-{w}x{h}-{th}.png', 1, w, h), (f, f'{AO}/{key}-{w}x{h}-{th}@2x.png', 2, w, h)]
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda j: shot(*j), jobs))

def overview():
    bg, fg, mu = '#e9e4da', '#2b251c', '#5d513e'
    def cell(key, th, title, desc):
        return (f"<div style='width:390px'><img src='{key}-{th}.png' style='width:390px;height:844px;border-radius:16px;box-shadow:0 2px 12px #0005;display:block'>"
                f"<div style='margin-top:10px;font-size:19px;font-weight:700'>{title}{' · ночь' if th == 'night' else ''}</div>"
                f"<div style='font-size:15px;color:{mu};margin-top:2px'>{desc}</div><div style='font:13px monospace;color:{mu};margin-top:2px'>{key}-{th}.png</div></div>")
    def row(t, cells): return f"<div style='font-size:22px;font-weight:700;margin:24px 0 12px'>{t}</div><div style='display:flex;gap:40px'>{cells}</div>"
    land = ''.join(f"<div style='width:{w}px'><img src='{k}-{w}x{h}-{th}.png' style='width:{w}px;height:{h}px;border-radius:14px;box-shadow:0 2px 12px #0005;display:block'>"
                   f"<div style='margin-top:8px;font-size:17px;font-weight:700'>Автопрокрутка идёт · {w}×{h}{' · ночь' if th == 'night' else ''}</div>"
                   f"<div style='font:12px monospace;color:{mu}'>{k}-{w}x{h}-{th}.png</div></div>" for k, w, h, ths in LAND for th in ths)
    W = 30*2 + 6*390 + 5*40
    html = (f"<!doctype html><meta charset=utf-8><body style='margin:0;background:{bg};color:{fg};font-family:Roboto,sans-serif;width:{W}px;padding:26px 30px;box-sizing:border-box'>"
            "<div style='font-size:30px;font-weight:700'>ReadQuest · автопрокрутка с блокировкой касаний</div>"
            f"<div style='font-size:17px;color:{mu};margin-top:6px'>Вход из «Вид страницы» · скорость 1–20, по умолчанию 6 · панель гаснет через 3 с, тап в центр — пауза · блокировка: всё игнорируется, разблокировка удержанием замка 1 с · игровые тосты не показываются · 390×844 и 844×390</div>"
            + row('День (сепия)', ''.join(cell(k, 'day', t, d) for k, t, d, _ in AS))
            + row('Ночь', ''.join(cell(k, 'night', t, d) for k, t, d, _ in AS))
            + row('Альбомная ориентация', f"<div style='display:flex;gap:40px'>{land}</div>"))
    f = f'{AO}/overview-autoscroll.html'; open(f, 'w').write(html)
    shot(f, f'{AO}/overview-autoscroll.png', 1, W, 120 + 2*(844+130) + 390 + 120)

if __name__ == '__main__':
    build(); overview(); print('done')
