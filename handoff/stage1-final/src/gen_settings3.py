# Панель чтения, все 4 вкладки (Интерфейс, 11.10.2026). Только реальные поля rq_set (SETDEF в source/js/reader.js, FONTS в core-b.js).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.argv = sys.argv[:1]
from gen import ic, doc, reader, rtop, rbot, shot, D, OUT
O = f'{OUT}/settings-frame'
seg = lambda opts, on: '<div class="seg">' + ''.join(f'<div class="{"on" if k == on else ""}">{o}</div>' for k, o in enumerate(opts)) + '</div>'
def sl(lab, v, pct, l='', r=''):
    return (f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between"><span>{lab}</span><b class="num" style="color:var(--rq-text)">{v}</b></div>'
            f'<div style="display:flex;align-items:center;gap:8px"><span class="mut" style="font-size:12px">{l}</span><div class="slider" style="flex:1;margin:0"><div class="tr"></div>'
            f'<div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div><span class="mut" style="font-size:12px">{r}</span></div></div>')
def tg(t, sub=None, on=True):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<div class="sec srow"><div class="tx">{t}{s}</div><div class="tg{"" if on else " off"}"></div></div>'
def lab(t, inner): return f'<div class="sec"><div class="lab">{t}</div>{inner}</div>'
fonts = ['Georgia','Times','Palatino','Garamond','Sans','Verdana','Trebuchet','Tahoma','Comic','Mono']
fgrid = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">' + ''.join(
    f'<div style="min-height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12px;'
    + ('background:var(--rq-accent-tint);color:var(--rq-accent-text);font-weight:700;border:1.5px solid var(--rq-accent)' if i == 0 else 'background:var(--rq-surface-2)')
    + f'">{f}</div>' for i, f in enumerate(fonts)) + '</div>'
TABS = {
 'text': lambda n: sl('Размер текста','19',42,'A','A') + lab('Шрифт', fgrid) + lab('Жирность', seg(['Обычный','Средний','Жирный'],0))
        + sl('Межстрочный интервал','1,65',55) + sl('Межбуквенный интервал','0',30) + lab('Выравнивание', seg(['По левому краю','По ширине'],1))
        + tg('Переносы слов') + tg('Красная строка', 'Отступ в начале абзаца'),
 'page': lambda n: lab('Тема страницы', seg(['День','Сепия','Ночь'], 2 if n else 1))
        + lab('Свои цвета', '<div style="display:flex;gap:10px">' + ''.join(f'<div style="flex:1;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--rq-surface-2);font-size:13px"><i style="width:22px;height:22px;border-radius:50%;background:{c};border:1px solid var(--rq-border-strong)"></i>{t}</div>' for t,c in (('Текст','#5b4636'),('Фон','#f4ecd8'))) + '</div>')
        + sl('Поля страницы','24 px',40) + sl('Притушить экран','0 %',0,'','ярче системы нельзя') + sl('Затемнение PDF ночью','35 %',70,'0 %','50 %'),
 'nav': lambda n: tg('Листать касанием', 'Тап по краю — следующая или предыдущая страница') + tg('Листать свайпом')
        + tg('Кнопки громкости листают', 'Только в установленном приложении', False) + tg('Поменять стороны местами', 'Левый край — вперёд', False)
        + f'<div class="sec srow"><div class="tx">Зоны касания и жесты<small>Отдельный экран «Управление»</small></div><span class="mut">{ic("chevron-right",20)}</span></div>',
 'focus': lambda n: lab('Режим фокуса', seg(['Выкл','Кнопкой','Авто'],1)) + '<div class="mut" style="font-size:13px;margin:-4px 0 8px">«Авто» — включается сам через 10 с чтения</div>'
        + tg('Счётчик «N / 10 мин»', 'В углу во время фокуса'),
}
NAMES = [('text','type','Текст'),('page','file-text','Страница'),('nav','book-open','Листание'),('focus','focus','Фокус')]
def sheet(key, night):
    tb = ''.join(f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border-radius:10px;'
                 + ('background:var(--rq-accent-tint);color:var(--rq-accent-text);font-weight:600' if k == key else 'color:var(--rq-text-2)')
                 + f'">{ic(i,22)}<span style="font-size:12px">{t}</span></div>' for k,i,t in NAMES)
    gen = (f'<div class="srow" style="margin:4px -20px -24px;padding:6px 20px 18px;border-top:1px solid var(--rq-line);background:var(--rq-surface)">'
           f'<span style="color:var(--rq-accent-text)">{ic("settings",22)}</span><div class="tx" style="font-weight:600">Общие настройки<small>Тема приложения, язык, экран, данные</small></div><span class="mut">{ic("chevron-right",20)}</span></div>')
    return (reader(rtop()+rbot(98, night, aa='Настройки'), n=98) + '<div class="scrim"></div>'
            f'<div class="sheet" style="max-height:780px"><div class="grab"></div><div class="shead"><h2>Настройки чтения</h2><div class="ib">{ic("x")}</div></div>'
            f'<div style="display:flex;gap:4px;margin:2px 0 4px">{tb}</div>{TABS[key](night)}{gen}</div>')
from PIL import Image
ims = []
for th in ('day','night'):
    for k,_,_ in NAMES:
        f = f'{D}/sf-tab-{k}-{th}.html'; open(f,'w').write(doc(sheet(k, th=='night'), th, 'night' if th=='night' else 'sepia', k))
        p = f'{O}/reader-tab-{k}-{th}.png'; shot(f, p, 1); ims.append(Image.open(p))
W = ims[0].width; c = Image.new('RGB', (W*4+30, ims[0].height*2+20), '#e9e4da')
for n,i in enumerate(ims): c.paste(i, ((n%4)*(W+10), (n//4)*(i.height+20)))
c.save(f'{O}/overview-reader-tabs.png'); print('ok')
