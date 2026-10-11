# Каркас настроек (Интерфейс, 11.10.2026): панель чтения → «Общие настройки», экран общих настроек, загрузка страницы PDF.
# По карте Архитектора: панель = rq_set, общие = rq_v1. goal/anti/xpMult/autoDiff/devMoney не выносятся.
import os, sys
sys.argv = sys.argv[:1]
from gen import ic, doc, reader, rtop, rbot, shot, D, OUT
O = f'{OUT}/settings-frame'; os.makedirs(O, exist_ok=True)
seg = lambda opts, on: '<div class="seg sm">' + ''.join(f'<div class="{"on" if k == on else ""}">{o}</div>' for k, o in enumerate(opts)) + '</div>'
def row(t, sub=None, right='', icon=None, last=False):
    s = f'<small>{sub}</small>' if sub else ''
    lead = f'<span class="mut">{ic(icon,20)}</span>' if icon else ''
    b = '0' if last else '1px solid var(--rq-line)'
    return f'<div class="srow" style="padding:3px 0;border-bottom:{b}">{lead}<div class="tx">{t}{s}</div>{right}</div>'
def card(rows): return f'<div class="card" style="margin:0 16px;padding:2px 14px">{rows}</div>'
def cap(t): return f'<div class="cap" style="margin:12px 16px 6px">{t}</div>'
chev = f'<span class="mut">{ic("chevron-right",20)}</span>'
def val(t): return f'<span class="mut" style="font-size:14px;display:flex;align-items:center;gap:2px">{t}{ic("chevron-right",18)}</span>'

def panel(night):
    tabs = [('type','Текст',1),('file-text','Страница',0),('book-open','Листание',0),('focus','Фокус',0)]
    tb = ''.join(f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border-radius:10px;'
                 + ('background:var(--rq-accent-tint);color:var(--rq-accent-text);font-weight:600' if on else 'color:var(--rq-text-2)')
                 + f'">{ic(i,22)}<span style="font-size:12px">{t}</span></div>' for i,t,on in tabs)
    body = (f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between"><span>Размер текста</span><b class="num" style="color:var(--rq-text)">19</b></div>'
            f'<div style="display:flex;align-items:center;gap:6px"><div class="ib" style="font:600 15px var(--rq-font-read)">A</div>'
            f'<div class="slider" style="flex:1;margin:0"><div class="tr"></div><div class="fi" style="width:42%"></div><div class="th" style="left:42%"></div></div>'
            f'<div class="ib" style="font:600 24px var(--rq-font-read)">A</div></div></div>'
            f'<div class="sec"><div class="lab">Шрифт</div>{seg(["Georgia","Times","Без засечек"],0)}</div>'
            f'<div class="sec"><div class="lab">Интервал</div>{seg(["Плотно","Обычно","Свободно"],1)}</div>'
            f'<div class="sec srow" style="border:0"><div class="tx">Выравнивание по ширине<small>С переносами слов</small></div><div class="tg"></div></div>')
    gen = (f'<div class="srow" style="margin:4px -20px -24px;padding:6px 20px 18px;border-top:1px solid var(--rq-line);background:var(--rq-surface)">'
           f'<span style="color:var(--rq-accent-text)">{ic("settings",22)}</span><div class="tx" style="font-weight:600">Общие настройки<small>Тема приложения, язык, экран, данные</small></div>{chev}</div>')
    return (reader(rtop()+rbot(98, night, aa='Настройки'), n=98) + '<div class="scrim"></div>'
            f'<div class="sheet" style="max-height:620px"><div class="grab"></div><div class="shead"><h2>Настройки чтения</h2><div class="ib">{ic("x")}</div></div>'
            f'<div style="display:flex;gap:4px;margin:2px 0 4px">{tb}</div>{body}{gen}</div>')

def general(night):
    return (f'<div class="scr"><div class="hdr back" style="height:84px"><div class="ib">{ic("arrow-left",24)}</div><h1>Общие настройки</h1></div>'
            f'<div class="setwrap" style="overflow:hidden">'
            + cap('Внешний вид') + card(row('Тема приложения', 'Авто: день с 7:00 до 21:00', val('Ночь' if night else 'Авто'), 'sun-moon')
                                      + row('Размер интерфейса', None, val('100 %'), 'zoom-in')
                                      + row('Анимации', None, '<div class="tg"></div>', 'sparkles', last=True))
            + cap('Во время чтения') + card(row('Не гасить экран', None, '<div class="tg"></div>', 'smartphone')
                                          + row('Вибрация', 'При наградах и отметках', '<div class="tg off"></div>', 'vibrate', last=True))
            + cap('Язык и напоминание') + card(row('Язык интерфейса', None, val('Русский'), 'languages')
                                             + row('Напоминание почитать', 'Каждый день в 21:00', '<div class="tg"></div>', 'clock', last=True))
            + cap('Данные') + card(row('Экспорт и импорт', 'Резервная копия в файл', chev, 'download')
                                 + row('Журнал запуска', 'Скопировать для поддержки', chev, 'copy', last=True))
            + cap('О приложении') + card(row('ReadQuest', 'Сборка 20261010-144h', '', 'info', last=True))
            + '</div></div>')

def loading(night):
    sk = ''.join(f'<div style="height:9px;margin:9px 0;border-radius:4px;background:var(--rq-surface-2);width:{w}%"></div>' for w in (92,100,96,100,88,100,94,70,0,100,97,100,90,100,62))
    return (f'<READER><div class="pdfwrap" style="display:flex;align-items:center;justify-content:center;flex:1">'
            f'<div style="position:relative;width:330px;height:470px;background:var(--rq-surface);border-radius:4px;box-shadow:var(--rq-shadow-1);padding:34px 28px;box-sizing:border-box;opacity:.9">{sk}'
            f'<div style="position:absolute;left:0;right:0;top:44%;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--rq-text-2)">'
            f'<span style="color:var(--rq-accent)">{ic("loader-circle",28,sw=2.2)}</span><span style="font-size:13px">Открываем страницу 338</span></div></div></div>'
            f'<div class="corner"><span class="pgnum">338 / 784</span></div></READER>')

S = [('reader-settings-panel', panel, 'page'), ('general-settings', general, None), ('pdf-page-loading', loading, 'page')]
jobs = []
for key, fn, pg in S:
    for th in ('day','night'):
        page = ('night' if th == 'night' else 'sepia') if pg else None
        f = f'{D}/sf-{key}-{th}.html'; open(f,'w').write(doc(fn(th=='night'), th, page, key))
        jobs.append((f, f'{O}/{key}-{th}.png'))
for f, p in jobs: shot(f, p, 1)
print('ok')
