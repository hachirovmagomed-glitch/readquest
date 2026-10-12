# 1г: «Настройки чтения» — новая вкладка Текст, список шрифтов, строка «Тема» и список тем, PDF без вкладки Текст (Интерфейс, 12.10.2026).
# Поля только реальные из rq_set (SETDEF в source/js/reader.js): font (индекс FONTS), size, ls, weight, lh, align, hyph, indent, theme, cTxt/cBg.
# Темы страницы — THEMES из source/js/core-b.js + «Карандашный» (handoff/skins/karandashny). Платные скины не показываются.
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
def vrow(t, v, lead=''):  # строка-переход «Шрифт — Georgia ›», вся строка нажимается, ≥48px
    return (f'<div class="sec srow" style="min-height:48px">{lead}<div class="tx">{t}</div>'
            f'<span class="mut" style="font-size:15px;display:flex;align-items:center;gap:2px">{v}{ic("chevron-right",20)}</span></div>')
def caph(t): return f'<div class="lab" style="margin:14px 0 2px;font-weight:600;color:var(--rq-text-2)">{t}</div>'
FONTS = [('Georgia','Georgia, serif'),('Times','"Times New Roman", Times, serif'),('Palatino','"Palatino Linotype","Book Antiqua",Palatino,serif'),
         ('Garamond','Garamond,"Times New Roman",serif'),('Sans','system-ui,"Segoe UI",Roboto,sans-serif'),('Verdana','Verdana,Geneva,sans-serif'),
         ('Trebuchet','"Trebuchet MS",sans-serif'),('Tahoma','Tahoma,sans-serif'),('Comic','"Comic Sans MS","Segoe UI",cursive'),('Mono','"Courier New",monospace')]
# В макете к стеку из FONTS дописаны похожие открытые шрифты бокса — только чтобы на картинке было видно разницу. В app.html стек FONTS не меняем.
MOCK = {'Georgia':'Gelasio','Times':'Tinos','Palatino':'PTSerif','Garamond':'EBGaramond','Sans':'Roboto','Verdana':'DejaVuSans',
        'Trebuchet':'FiraSans','Tahoma':'PTSans','Comic':'Caveat','Mono':'JetBrainsMono'}
# Файлы лежат в src/fonts (OFL/Apache/свободная лицензия DejaVu), подключены @font-face под именами rqm-*; в стеке идут ПЕРВЫМИ, чтобы рендер не зависел от шрифтов бокса.
FACES = '<style>' + ''.join(f"@font-face{{font-family:'rqm-{f}';src:url('fonts/{f}.ttf');font-display:block}}" for f in MOCK.values()) + '</style>'
PRELOAD = '<div aria-hidden="true" style="position:absolute;left:-9999px">' + ''.join(f"<span style=\"font-family:'rqm-{f}'\">Aa</span>" for f in MOCK.values()) + '</div>' + '<script>document.documentElement.style.visibility="hidden";document.fonts.ready.then(()=>Promise.all([...document.fonts].map(f=>f.load()))).then(()=>{document.documentElement.style.visibility=""})</script>'
def fstack(l, v): return (f"'rqm-{MOCK[l]}'," + v).replace('"', "'")
# Темы: (id в rq_set.theme, подпись, фон, текст)
THEMES = [('light','Белая','#f7f5f0','#26241f'),('sepia','Сепия','#f4ecd8','#5b4636'),('dark','Тёмная','#1e1e24','#cfcfd8'),
          ('black','Чёрная (AMOLED)','#000000','#9a9aa3'),('pencil','Карандашный','#f3f0e7','#2a2a28')]
OWN = ('custom','Ваша тема','#e8efe6','#2c3b2f')
def swatch(bg, tx, sz=1):
    lines = ''.join(f'<i style="display:block;height:3px;border-radius:2px;background:{tx};width:{w}%;margin-top:5px"></i>' for w in (82,100,64))
    return (f'<span style="flex:none;width:40px;height:52px;border-radius:6px;background:{bg};border:1px solid var(--rq-border-strong);'
            f'padding:6px 7px;box-sizing:border-box;display:block">{lines}</span>')
def pickrow(label, on, style='', lead='', sub=None):
    s = f'<small>{sub}</small>' if sub else ''
    chk = f'<span style="color:var(--rq-accent-text)">{ic("check",22,sw=2.4)}</span>' if on else '<span style="width:22px"></span>'
    return (f'<div class="srow" style="min-height:52px;padding:4px 0;gap:14px;border-bottom:1px solid var(--rq-line)">{lead}'
            f'<div class="tx" style="{style}">{label}{s}</div>{chk}</div>')
NAMES = [('text','type','Текст'),('page','file-text','Страница'),('nav','book-open','Листание'),('focus','focus','Фокус')]
def tabs(key, pdf=False):
    return '<div style="display:flex;gap:4px;margin:2px 0 4px">' + ''.join(
        f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border-radius:10px;'
        + ('background:var(--rq-accent-tint);color:var(--rq-accent-text);font-weight:600' if k == key else 'color:var(--rq-text-2)')
        + f'">{ic(i,22)}<span style="font-size:12px">{t}</span></div>' for k,i,t in NAMES if not (pdf and k == 'text')) + '</div>'
GEN = (f'<div class="srow" style="margin:4px -20px -24px;padding:6px 20px 18px;border-top:1px solid var(--rq-line);background:var(--rq-surface)">'
       f'<span style="color:var(--rq-accent-text)">{ic("settings",22)}</span><div class="tx" style="font-weight:600">Общие настройки<small>Тема приложения, язык, экран, данные</small></div><span class="mut">{ic("chevron-right",20)}</span></div>')
def head(t, back=False):
    b = f'<div class="ib" style="margin-left:-10px">{ic("arrow-left")}</div>' if back else ''
    return f'<div class="grab"></div><div class="shead"><div style="display:flex;align-items:center;gap:4px">{b}<h2>{t}</h2></div><div class="ib">{ic("x")}</div></div>'
def wrap(inner, mh=780, pdf=False):
    return reader(rtop()+rbot(98, False, aa='Настройки'), n=98) + f'<div class="scrim"></div><div class="sheet" style="max-height:{mh}px">{inner}</div>'

def text_tab(n):
    return ('<style>.sheet .sec{padding:6px 0}.sheet .seg div{min-height:36px;font-size:.8125rem}</style>' + head('Настройки чтения') + tabs('text')
        + vrow('Шрифт', '<span style="font-family:\'rqm-Gelasio\',Georgia,serif;color:var(--rq-text)">Georgia</span>')
        + sl('Размер текста','19',42,'<span style="font:600 13px Georgia,serif">A</span>','<span style="font:600 20px Georgia,serif">A</span>')
        + lab('Расстояние между буквами', seg(['уже','обычное','шире'],1))
        + lab('Толщина шрифта', seg(['тоньше','обычная','жирнее'],1))
        + sl('Межстрочный интервал','1,65',55)
        + caph('Переносы и абзацы')
        + lab('Выравнивание', seg(['По левому краю','По ширине'],1))
        + tg('Переносы слов') + tg('Красная строка', 'Отступ в начале абзаца') + GEN)
def fonts(n):
    rows = ''.join(pickrow(f'<span style="font-size:{24 if l == "Comic" else 19}px">{l}</span>', i == 0, f'font-family:{fstack(l,v)};color:var(--rq-text)') for i,(l,v) in enumerate(FONTS))
    return head('Шрифт', back=True) + f'<div style="margin-top:4px">{rows}</div>'
def page_tab(n):
    th = THEMES[1]
    return (head('Настройки чтения') + tabs('page')
        + vrow('Тема', 'Сепия', f'<span style="margin-right:12px;display:flex">{swatch(th[2],th[3]).replace("width:40px;height:52px","width:26px;height:34px").replace("padding:6px 7px","padding:4px 5px").replace("height:3px","height:2px").replace("margin-top:5px","margin-top:3px")}</span>')
        + sl('Поля страницы','24',40) + sl('Притушить экран','0 %',0,'','ярче системы нельзя') + sl('Затемнение PDF ночью','35 %',70,'0 %','50 %') + GEN)
def themes(own):
    def f(n):
        L = THEMES + ([OWN] if own else [])
        rows = ''.join(pickrow(t, k == 'sepia', 'color:var(--rq-text)', swatch(bg, tx),
                               'Свои цвета текста и фона' if k == 'custom' else None) for k,t,bg,tx in L)
        extra = (vrow('Настроить цвета', '') if own else '')
        return head('Тема', back=True) + f'<div style="margin-top:4px">{rows}</div>' + extra
    return f
def pdf(n):
    hint = (f'<div class="sec srow" style="gap:12px;align-items:flex-start;border:0;background:var(--rq-surface-2);border-radius:12px;padding:12px 14px;margin:6px 0 4px">'
            f'<span style="color:var(--rq-text-2);margin-top:1px">{ic("info",20)}</span><div class="tx" style="font-size:14px;color:var(--rq-text)">В PDF шрифт и вёрстка заданы самим файлом</div></div>')
    return (head('Настройки чтения') + tabs('page', pdf=True) + hint
        + vrow('Тема', 'Сепия') + sl('Притушить экран','0 %',0,'','ярче системы нельзя') + sl('Затемнение PDF ночью','35 %',70,'0 %','50 %') + GEN)
S = [('1g-tab-text', text_tab), ('1g-fonts', fonts), ('1g-tab-page', page_tab), ('1g-themes', themes(False)), ('1g-themes-own', themes(True)), ('1g-pdf-tabs', pdf)]
from PIL import Image
ims = []
for th in ('day','night'):
    for k, fn in S:
        f = f'{D}/sf-{k}-{th}.html'; open(f,'w').write(doc(FACES + PRELOAD + wrap(fn(th=='night')), th, 'night' if th=='night' else 'sepia', k))
        p = f'{O}/{k}-{th}.png'; shot(f, p, 1); shot(f, f'{O}/{k}-{th}@2x.png', 2); ims.append(Image.open(p))
W, H = ims[0].width, ims[0].height; c = Image.new('RGB', (W*6+50, H*2+20), '#e9e4da')
for n,i in enumerate(ims): c.paste(i, ((n%6)*(W+10), (n//6)*(H+20)))
c.save(f'{O}/overview-1g.png'); print('ok')
