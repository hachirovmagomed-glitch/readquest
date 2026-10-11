# Глубина настроек (Интерфейс, 11.10.2026): поиск, «Управление» (rq_set.gestures), «Настройка интерфейса» (rq_set.uiHidden).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.argv = sys.argv[:1]
from gen import ic, doc, reader, shot, D, OUT
from gen_settings import row, card, cap, chev, val
O = f'{OUT}/settings-frame'
hdr = lambda t: f'<div class="hdr back" style="height:84px"><div class="ib">{ic("arrow-left",24)}</div><h1>{t}</h1></div>'
lock = f'<span class="mut" style="display:flex;align-items:center;gap:4px;font-size:13px">{ic("lock",16)}всегда</span>'
def hl(s, q): return s.replace(q, f'<mark style="background:var(--rq-accent-tint);color:var(--rq-accent-text);border-radius:3px">{q}</mark>')

def search(night):
    sb = (f'<div style="margin:0 16px 8px;display:flex;align-items:center;gap:8px;height:48px;padding:0 12px;border-radius:12px;background:var(--rq-surface);border:2px solid var(--rq-accent)">'
          f'<span class="mut">{ic("search",20)}</span><span style="flex:1;font-size:16px">экран</span><span class="mut">{ic("x",20)}</span></div>')
    res = lambda t, path, icon: row(hl(t,'экран'), path, chev, icon)
    return (f'<div class="scr">{hdr("Поиск по настройкам")}{sb}<div class="setwrap">'
            + cap('Найдено 3') + card(res('Не гасить экран','Общие → Во время чтения','smartphone')
                                    + res('Размер интерфейса (весь экран)','Общие → Внешний вид','zoom-in')
                                    + row(hl('Кнопка «Весь экран»','экран'),'Настройка интерфейса → Нижняя панель',chev,'maximize',last=True))
            + '<div class="mut" style="margin:14px 20px;font-size:13px">Ищет по названию и по описанию. Тап по результату открывает раздел и подсвечивает пункт.</div></div></div>')

def control(night):
    z = [('Назад', 'chevron-left'), ('Панели', 'menu'), ('Вперёд', 'chevron-right')]
    cell = lambda t,i,h,top=False: (f'<div style="flex:1;height:{h}px;border:1.5px dashed var(--rq-border-strong);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:12px;'
                              + ('background:var(--rq-accent-tint);color:var(--rq-accent-text);font-weight:600;border-style:solid;border-color:var(--rq-accent)' if top else 'color:var(--rq-text-2)') + f'">{ic(i,18)}{t}</div>')
    grid = (f'<div class="card" style="margin:0 16px;padding:10px"><div style="display:flex;gap:6px;margin-bottom:6px">{cell("Закладка","bookmark",44,True)}{cell("Панели","menu",44)}{cell("День / ночь","sun-moon",44)}</div>'
            f'<div style="display:flex;gap:6px">' + ''.join(cell(t,i,150) for t,i in z) + '</div>'
            f'<div class="mut" style="font-size:12px;margin-top:8px;text-align:center">Нажмите на зону, чтобы выбрать действие</div></div>')
    pick = (f'<div class="card" style="margin:8px 16px 0;padding:2px 14px;border-color:var(--rq-accent)">'
            f'<div class="lab" style="margin:10px 0 2px">Верхний левый угол · касание</div>'
            + row('Закладка', None, f'<span style="color:var(--rq-accent-text)">{ic("check",20,sw=2.4)}</span>', 'bookmark')
            + row('Ничего', None, '', 'x')
            + row('Перейти к странице…', 'Это прыжок: минуты чтения не идут', '', 'list', last=True) + '</div>')
    return (f'<div class="scr">{hdr("Управление")}<div class="setwrap">{cap("Зоны касания")}{grid}{pick}'
            + cap('Жесты') + card(row('Свайп влево / вправо','Листать страницу',val('Вкл'),'chevrons-up')
                                + row('Долгое нажатие','Выделить текст',val(''),'type',last=True))
            + f'<div style="margin:12px 16px;display:flex;align-items:center;gap:8px;color:var(--rq-accent-text);font-weight:600">{ic("undo-2",20)}Вернуть стандартное управление</div></div></div>')

def visibility(night):
    t = lambda on: '<div class="tg"></div>' if on else '<div class="tg off"></div>'
    return (f'<div class="scr">{hdr("Настройка интерфейса")}<div class="setwrap">'
            + cap('Верхняя панель · список по коду уточнит Фронт') + card(row('Поиск по книге',None,t(1),'search') + row('Закладки',None,t(1),'bookmark') + row('Название книги',None,t(0),'file-text',last=True))
            + cap('Нижняя панель') + card(row('Оглавление',None,t(1),'list') + row('День / ночь',None,t(1),'sun-moon') + row('Фокус',None,t(1),'focus')
                                        + row('Весь экран',None,t(0),'maximize') + row('Номер страницы «98 из 185»',None,t(1),'file-text',last=True))
            + cap('Чтение и прогресс') + card(row('Кольцо дня','Нужно для награды',lock,'target') + row('Счётчик «N / 10 мин»',None,lock,'clock')
                                            + row('Монеты в итоге сессии',None,lock,'coins',last=True))
            + f'<div class="mut" style="margin:10px 20px 4px;font-size:13px">Скрытая кнопка только пропадает с панели, функция и её данные остаются.</div>'
            + f'<div style="margin:6px 16px;display:flex;align-items:center;gap:8px;color:var(--rq-accent-text);font-weight:600">{ic("rotate-cw",20)}Сбросить настройки интерфейса</div></div></div>')

S = [('settings-search', search), ('settings-control', control), ('settings-interface', visibility)]
for key, fn in S:
    for th in ('day','night'):
        f = f'{D}/sf-{key}-{th}.html'; open(f,'w').write(doc(fn(th=='night'), th, None, key)); shot(f, f'{O}/{key}-{th}.png', 1, 390, 1000)
from PIL import Image
ims=[Image.open(f'{O}/{k}-{t}.png') for t in ('day','night') for k,_ in S]
W=ims[0].width*3+20; H=ims[0].height*2+20; c=Image.new('RGB',(W,H),'#e9e4da')
for n,i in enumerate(ims): c.paste(i,((n%3)*(i.width+10),(n//3)*(i.height+20)))
c.save(f'{O}/overview-depth.png'); print('ok')
