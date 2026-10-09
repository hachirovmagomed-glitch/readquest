# Макеты этапа 1 ReadQuest (бирюза B, ночной PDF — затемнение). python3 tokens.py && python3 gen.py
import re, os, math, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)
os.chdir(D)
IC = {}
for f in os.listdir('icons'):
    s = open('icons/'+f).read(); IC[f[:-4]] = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)
def ic(n, sz=22, c='currentColor', sw=1.8, fill='none'):
    return f'<svg class="i" width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="{fill}" stroke="{c}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{IC[n]}</svg>'
def mon(n):
    m = n % 100; k = n % 10
    w = 'монет' if 11 <= m <= 14 else 'монета' if k == 1 else 'монеты' if 2 <= k <= 4 else 'монет'
    return f'{n:,}'.replace(',', '\u202f') + ' ' + w
def nb(n): return f'{n:,}'.replace(',', '\u202f')

def doc(body, theme, page=None, title=''):
    if 'class="scrim"' in body and 'data-under' not in body: body = body.replace('class="rcontent"', 'class="rcontent" data-under="1"')
    pg = f' data-page="{page}"' if page else ''
    body = re.sub(r'(font-size:\s*)(\d+(?:\.\d+)?)px', lambda m: f'{m.group(1)}{float(m.group(2))/16:g}rem', body)
    body = re.sub(r'(font:\s*\d{3}\s+)(\d+(?:\.\d+)?)px', lambda m: f'{m.group(1)}{float(m.group(2))/16:g}rem', body)
    return (f'<!doctype html><html lang="ru" data-theme="{theme}"><head><meta charset="utf-8"><title>{title}</title>'
            f'<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="mock.css"></head>'
            f'<body>{body.replace("<READER", f"<div id=reader{pg}").replace("</READER>", "</div>")}</body></html>')

# ---------------- читалка ----------------
P1 = ("Он долго стоял у окна, глядя, как над крышами медленно светлеет небо. Город просыпался неохотно: где-то хлопнула дверь, "
      "внизу прогрохотала первая телега, и снова всё стихло. Мысли путались, возвращаясь к вчерашнему разговору, к словам, "
      "которые так и не были сказаны вслух.")
P2 = ("Чайник на плите давно остыл. На столе лежала раскрытая тетрадь, и последняя строчка обрывалась на середине, будто "
      "рука устала раньше, чем голова. Он перечитал её дважды, усмехнулся и закрыл тетрадь. Всё, что нужно было решить, "
      "решится само, стоит только выйти на улицу и пройти до конца переулка.")
P3 = ("Внизу, во дворе, дворник уже мёл листья, и мерный шорох метлы почему-то успокаивал. Он накинул пальто, нащупал в "
      "кармане ключи и на секунду задержался у двери, прислушиваясь к тишине пустой квартиры.")
V='аеёиоуыэюяАЕЁИОУЫЭЮЯ'
def hy(w):  # грубые мягкие переносы для макета (на Android работает hyphens:auto с lang=ru)
    if len(w)<5: return w
    lw=w.lower();n=len(w);cut=set()
    for i in range(1,n-2):
        a,b,c=lw[i],lw[i+1],lw[i+2]
        if a in V and b not in V and c in V and b not in 'ьъй': cut.add(i)
        elif a not in V and b not in V and lw[i-1] in V and c in V and b not in 'ьъй' and a!='ь': cut.add(i)
        elif a in 'йьъ' and b not in V and c in V: cut.add(i)
    return ''.join(ch+('\u00ad' if i in cut and i>=1 and i<=n-3 else '') for i,ch in enumerate(w))
def H(t): return re.sub(r'[А-Яа-яЁё]+',lambda m:hy(m.group(0)),t)
def textpage(): return f'<div class="viewer"><p>{H(P1)}</p><p>{H(P2)}</p><p>{H(P3)}</p><p>{H(P1)}</p></div>'
TOT = 185
def rtop():
    return (f'<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t"><b>Мастер и Маргарита</b><span>Михаил Булгаков · FB2</span></div></div>')
def rbot(n, night, back=None, aa='Шрифт'):
    pct = (n-1)/(TOT-1)*100
    b = f'<div class="plate">{n} из {TOT}</div>'
    if back: b += f'<div class="backpill"><span>{ic("chevron-left",18)}на стр. {back}</span></div>'
    mk = f'<div class="mk" style="left:{(back-1)/(TOT-1)*100:.2f}%"></div>' if back else ''
    nbt = ("sun", "День") if night else ("moon", "Ночь")
    btns = [(ic("list"), "Оглавление"), (ic(nbt[0]), nbt[1]), ('<div class="aa">Aa</div>', aa), (ic("focus"), "Фокус"), (ic("maximize"), "Весь экран")]
    r = ''.join(f'<div class="rb">{i}<span>{t}</span></div>' for i, t in btns)
    return (f'<div class="rbot">{b}<div class="slider"><div class="tr"></div><div class="fi" style="width:{pct:.2f}%"></div>{mk}'
            f'<div class="th" style="left:{pct:.2f}%"></div></div><div class="rbtns">{r}</div></div>')
def reader(inner='', n=98, daypct=60):
    under = ' data-under="1"' if 'scrim' in inner else ''   # слой под шторкой/модалкой — неактивен, в замер не идёт
    hid = ' style="visibility:hidden"' if 'rbot' in inner else ''  # при панелях номер в углу скрыт (спек), место держим
    return (f'<READER><div class="rcontent"{under} style="display:flex;flex-direction:column;flex:1;min-height:0">{textpage()}<div class="pgline"><span class="pgnum"{hid}>{n} / {TOT}</span></div>'
            f'<div class="daybar"><i style="width:{daypct}%"></i></div></div></READER>{inner}')

def ring_s(p, sz=16):
    r = 6.5; L = 2*math.pi*r
    return (f'<svg class="i" width="{sz}" height="{sz}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="{r}" fill="none" stroke="var(--r-txt-2)" stroke-opacity=".3" stroke-width="2.2"/>'
            f'<circle cx="8" cy="8" r="{r}" fill="none" stroke="var(--r-txt-2)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="{L:.2f}" stroke-dashoffset="{L*(1-p):.2f}" transform="rotate(-90 8 8)"/></svg>')
def reader_focus(zones=False, done=False, toast=None):
    z = ''
    if zones:
        z = ('<div class="zones" style="top:12%;height:88%">'
             '<div style="width:30%"><div class="zl"><b>Назад</b>листает</div></div>'
             '<div style="width:40%;border-left:0;border-right:0"><div class="zl"><b>Центр</b>панели и выход из фокуса</div></div>'
             '<div style="width:30%"><div class="zl"><b>Вперёд</b>листает</div></div></div>'
             '<div class="zones" style="top:0;height:12%">'
             f'<div style="width:30%;border-bottom:0"><div class="zl" style="padding:6px 8px"><b>{ic("sun-moon",16)}</b>день / ночь</div></div>'
             '<div style="width:40%;border:0;background:none"></div>'
             f'<div style="width:30%;border-bottom:0"><div class="zl" style="padding:6px 8px"><b>{ic("bookmark",16)}</b>закладка</div></div></div>'
             '<div style="position:absolute;left:14px;right:14px;bottom:40px;display:flex;justify-content:center"><div style="background:var(--rq-surface);color:var(--rq-text);border:1px solid var(--rq-line);border-radius:14px;box-shadow:var(--rq-shadow-2);padding:10px 14px;font-size:13px;line-height:1.4;text-align:center">'
             'Углы, боковые тапы и свайпы фокус не трогают.<br>Выход из фокуса — только тап в центр.<br>Если листание тапом выключено, весь экран — центр.</div></div>')
    if done:
        cnt = f'<span class="fcount done" aria-label="Цель дня выполнена: 10 из 10 минут">{ic("check",14,sw=2.6)}10 / 10 мин</span>'
    else:
        cnt = f'<span class="fcount" aria-label="Чтение засчитывается: 7 из 10 минут">{ring_s(.7)}7 / 10 мин</span>'
    t = (f'<div style="position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:center"><div class="toast info">{ic(toast[0],20)}<span>{toast[1]}</span></div></div>' if toast else '')
    return (f'<READER><div class="rcontent" style="display:flex;flex-direction:column;flex:1;min-height:0">{textpage()}'
            f'<div class="pgline">{cnt}</div><div style="height:3px"></div></div></READER>{z}{t}')

def pdfpage():
    bars = [(1, 38, '#c0392b'), (2, 64, '#e67e22'), (3, 96, '#27ae60'), (4, 128, '#2e86de')]
    svgb = ''.join(f'<rect x="{18+ (k-1)*44}" y="{140-h}" width="30" height="{h}" fill="{c}" rx="2"/>' for k, h, c in bars)
    chart = (f'<svg width="196" height="160" viewBox="0 0 196 160" style="display:block"><line x1="10" y1="140" x2="192" y2="140" stroke="#555" stroke-width="1"/>'
             f'<line x1="10" y1="8" x2="10" y2="140" stroke="#555" stroke-width="1"/>{svgb}'
             + ''.join(f'<text x="{33+(k)*44}" y="153" font-size="9" text-anchor="middle" fill="#333" font-family="Noto Sans">{t}</text>' for k, t in enumerate(['X','XII','XIV','XVI']))
             + '</svg>')
    land = ('<svg width="118" height="160" viewBox="0 0 118 160" style="display:block;border-radius:2px">'
            '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a90d9"/><stop offset="1" stop-color="#bfe0f7"/></linearGradient></defs>'
            '<rect width="118" height="160" fill="url(#sky)"/><circle cx="88" cy="34" r="15" fill="#f7c948"/>'
            '<path d="M0 104 Q30 80 60 98 T118 92 V160 H0Z" fill="#5aa845"/><path d="M0 124 Q40 108 118 122 V160 H0Z" fill="#e2b33c"/>'
            '<rect x="22" y="96" width="24" height="18" fill="#c0392b"/><path d="M19 97 L34 84 L49 97Z" fill="#7b2d26"/><rect x="31" y="104" width="6" height="10" fill="#3b2a1a"/>'
            '</svg>')
    t = 'font-size:9.6PX;line-height:1.45;text-align:justify;hyphens:auto;margin-bottom:6px;text-indent:1.2em'
    return (f'<div class="rq-pdf-page" data-nocheck="1"><div style="font-size:8PX;color:#666;text-align:center;letter-spacing:.08em;margin-bottom:10px">ЧАСТЬ ВТОРАЯ · АГРАРНАЯ РЕВОЛЮЦИЯ</div>'
            f'<div style="font-size:15PX;font-weight:700;margin-bottom:8px">Глава 5. Хлеб и зерно</div>'
            f'<p style="{t}">Когда люди начали сеять пшеницу, им пришлось остаться рядом с полем. Урожай рос медленно, но из года в год, и вместе с ним росли деревни, амбары и заботы. Через несколько веков поле кормило уже не семью, а город.</p>'
            f'<div style="display:flex;gap:10px;align-items:flex-end;margin:8px 0 4px">{chart}{land}</div>'
            f'<div style="font-size:8.4PX;color:#444;line-height:1.35;margin-bottom:8px"><b>Рис. 3.</b> Урожай пшеницы с гектара по векам (слева) и типичная деревня на краю поля (справа).</div>'
            f'<p style="{t}">Земледелие дало больше еды, но и больше работы. Крестьянин вставал до рассвета, потому что поле не ждёт, а зима всегда приходит раньше, чем хочется. Запасы зерна стали первым богатством, которое нужно было охранять.</p>'
            f'<p style="{t}">Так появились стены, сторожа и счёт. Чтобы помнить, кто сколько должен, понадобились знаки на глине, и это стало началом письма.</p>'
            f'<div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:9PX;color:#555">41</div></div>')

# ---------------- экраны приложения ----------------
def nav(a):
    it = [("library", "Библиотека"), ("gift", "Награды"), ("user", "Профиль")]
    return '<div class="bnav">' + ''.join(f'<div class="{"on" if k == a else ""}"><i>{ic(i)}</i>{t}</div>' for k, (i, t) in enumerate(it)) + '</div>'
def coinchip(n): return f'<div class="coinchip">{ic("coins",18)}{mon(n)}</div>'
def ring(p, sz=64, inner='', stroke=7):
    r = 26; L = 2*math.pi*r
    return (f'<svg class="i" width="{sz}" height="{sz}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="{r}" fill="none" stroke="var(--rq-surface-2)" stroke-width="{stroke}"/>'
            f'<circle cx="32" cy="32" r="{r}" fill="none" stroke="var(--rq-accent)" stroke-width="{stroke}" stroke-linecap="round" stroke-dasharray="{L:.2f}" stroke-dashoffset="{L*(1-p):.2f}" transform="rotate(-90 32 32)"/>{inner}</svg>')
def rtext(t, fs=17, sub=None):
    if sub: return (f'<text x="32" y="33" text-anchor="middle" font-size="{fs}" font-weight="700" fill="var(--rq-text)" font-family="Roboto">{t}</text>'
                    f'<text x="32" y="45" text-anchor="middle" font-size="10" fill="var(--rq-text-2)" font-family="Roboto">{sub}</text>')
    return f'<text x="32" y="38" text-anchor="middle" font-size="{fs}" font-weight="700" fill="var(--rq-text)" font-family="Roboto">{t}</text>'
def rcheck(): return f'<g transform="translate(18 18)" style="color:var(--rq-accent)">{ic("check",28,sw=2.4)}</g>'

BOOKS = [('Мастер и Маргарита','М. Булгаков','#6d2a2a',None,53,'FB2'),('Преступление и наказание','Ф. Достоевский','#2f4a5e',None,12,'FB2'),
         ('Хамелеон','А. П. Чехов',None,'#5f7230',100,'TXT'),('Атомные привычки','Джеймс Клир',None,'#a85a20',0,'PDF'),
         ('Война и мир','Л. Толстой','#3c3a5a',None,4,'EPUB'),('Sapiens','Ю. Н. Харари',None,'#245e5a',22,'PDF')]
def cover(t, a, real, col, p, f):
    if real: c = f'<div class="cv" style="background:linear-gradient(160deg,{real},#1c1712)"><span class="fmt">{f}</span><div style="font-size:13px;font-weight:700;line-height:1.2">{t}</div><div style="font-size:10px;margin-top:4px">{a}</div></div>'
    else: c = f'<div class="cv let" style="background:{col}"><span class="fmt">{f}</span>{t[0]}</div>'
    st = 'прочитано' if p == 100 else (f'{p}%' if p else 'не начата')
    return f'<div class="bk">{c}<div class="ti">{t}</div><div class="au">{a}</div><div class="pbar"><i style="width:{p}%"></i></div></div>'

def library():
    return (f'<div class="scr"><div class="hdr"><h1>Библиотека</h1>{coinchip(390)}<div class="ib">{ic("plus",24)}</div></div>'
            f'<div class="lib"><div class="goal card">{ring(.6, 68, rtext("6", 20, "из 10"))}<div class="t" style="flex:1"><b>Цель 10 мин</b>'
            f'<div class="mut" style="font-size:14px;margin-top:2px">Сегодня: 6 мин · ещё 4 до +30 монет</div>'
            f'<div class="meta"><span>{ic("flame",18,"var(--rq-coin)")}3 дня подряд</span><span>{ic("star",18,"var(--rq-accent-text)")}Уровень 4</span></div></div></div>'
            f'<div class="search">{ic("search",20)}Поиск по названию и автору</div>'
            f'<div class="chips"><span class="on">Все</span><span>Читаю</span><span>Хочу</span><span>Прочитано</span></div>'
            f'<div class="cont card"><div class="mini" style="background:linear-gradient(160deg,#6d2a2a,#1c1712)"></div><div style="flex:1;min-width:0">'
            f'<div class="mut" style="font-size:12px;font-weight:600">ПРОДОЛЖИТЬ</div><div style="font-weight:600;font-size:15px">Мастер и Маргарита</div>'
            f'<div class="mut num" style="font-size:13px">Стр. 98 из 185 · 53%</div></div><div class="sbtn" style="background:var(--rq-accent);color:var(--rq-on-accent)">{ic("book-open",18)}Читать</div></div>'
            f'<div class="grid">{"".join(cover(*b) for b in BOOKS)}</div></div>{nav(0)}</div>')

def rewards():
    rw = [('Серия любимого сериала', 100, True), ('Кофе в любимой кофейне', 250, True), ('Новая книга', 500, False)]
    rows = ''.join(
        f'<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rq-line);min-height:64px">'
        f'<span class="mut">{ic("gift",22)}</span><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:500">{n}</div>'
        f'<div class="coin" style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;margin-top:2px">{ic("coins",16)}{mon(p)}</div></div>'
        + (f'<div class="sbtn">Обменять</div>' if ok else f'<div style="text-align:right"><div class="sbtn dis">Обменять</div><div class="mut" style="font-size:12px;margin-top:3px">не хватает {mon(p-390)}</div></div>')
        + '</div>' for n, p, ok in rw)
    return (f'<div class="scr"><div class="hdr"><h1>Награды</h1>{coinchip(390)}</div>'
            f'<div class="card" style="margin:0 16px;display:flex;align-items:center;gap:14px">{ring(.6,56,rtext("6",17))}<div style="flex:1"><b style="font-size:16px">Задание дня</b>'
            f'<div class="mut" style="font-size:13px;margin-top:2px">Читать 10 мин · 6 из 10 мин</div></div><div class="price">{ic("coins",16)}+30</div></div>'
            f'<div class="card" style="margin:10px 16px 0;display:flex;align-items:center;gap:14px"><div style="flex:1"><b style="font-size:16px">Задание недели</b>'
            f'<div class="mut" style="font-size:13px;margin:2px 0 8px">4 дня по 10 мин · 2 из 4 дней</div><div class="dots"><i class="f"></i><i class="f"></i><i></i><i></i></div></div>'
            f'<div class="price">{ic("coins",16)}+120</div></div>'
            f'<div class="cap" style="display:flex;justify-content:space-between"><span>Награды из жизни</span><span style="text-transform:none;letter-spacing:0;font-weight:500">3 из 5</span></div>'
            f'<div style="border-top:1px solid var(--rq-line)">{rows}</div>'
            f'<div style="padding:14px 16px 0"><div class="btn sec2">{ic("plus",20)}Добавить награду</div></div>'
            f'<div class="mut" style="font-size:13px;padding:12px 16px 0;line-height:1.45">Монеты приходят только за чтение: 30 за цель дня и ещё 120, когда наберётся 4 таких дня за неделю.</div>'
            f'{nav(1)}</div>')

def profile():
    days = [('Пн',0),('Вт',13),('Ср',11),('Чт',6),('Пт',None),('Сб',None),('Вс',None)]
    mx = 16; H = 84
    cols = ''
    for d, m in days:
        h = 0 if not m else round(m/mx*H)
        bar = (f'<div style="height:{h}px;background:var(--rq-accent);border-radius:4px 4px 0 0"></div>' if m else
               f'<div style="height:3px;background:var(--rq-surface-2);border-radius:2px"></div>')
        lbl = f'<div class="num" style="font-size:12px;font-weight:600;height:16px">{m if m else ("0" if m==0 else "")}</div>'
        cols += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px">{lbl}<div style="width:24px;height:{H}px;display:flex;flex-direction:column;justify-content:flex-end">{bar}</div>'
                 f'<div style="font-size:12px;{"font-weight:700;color:var(--rq-accent-text)" if d=="Чт" else "color:var(--rq-text-2)"}">{d}</div></div>')
    goal_y = 16 + H - round(10/mx*H)
    kpi = lambda icn, col, v, l: (f'<div style="flex:1;background:var(--rq-surface-2);border-radius:var(--rq-radius-md);padding:12px 8px;text-align:center">'
                                 f'<div style="display:flex;justify-content:center;color:{col}">{ic(icn,20)}</div><b class="num" style="display:block;font-size:24px;line-height:1.2;margin-top:4px">{v}</b>'
                                 f'<span style="font-size:12px;color:var(--rq-text-2)">{l}</span></div>')
    return (f'<div class="scr"><div class="hdr"><h1>Профиль</h1><div class="ib">{ic("settings",24)}</div></div>'
            f'<div class="card" style="margin:0 16px"><div style="display:flex;align-items:center;gap:14px">'
            f'<div style="width:60px;height:60px;border-radius:50%;background:var(--rq-accent-tint);color:var(--rq-accent-text);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;flex:none">Ч</div>'
            f'<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><b style="font-size:18px">Читатель</b><span class="mut">{ic("pencil" if "pencil" in IC else "user",16)}</span></div>'
            f'<div style="font-size:14px;font-weight:600;color:var(--rq-accent-text);margin-top:1px">Уровень 4</div></div></div>'
            f'<div style="display:flex;justify-content:space-between;font-size:13px;margin:14px 0 6px"><span class="mut">Опыт</span><b class="num">{nb(1240)} / {nb(1600)} XP</b></div>'
            f'<div class="pbar" style="height:8px"><i style="width:{(1240-900)/(1600-900)*100:.0f}%"></i></div>'
            f'<div class="mut" style="font-size:13px;margin-top:6px">Ещё 360 XP до уровня 5 · это 36 минут чтения</div></div>'
            f'<div style="display:flex;gap:10px;margin:12px 16px 0">{kpi("coins","var(--rq-coin)",390,"монет")}{kpi("flame","var(--rq-coin)",3,"дня подряд")}{kpi("clock","var(--rq-accent-text)",30,"мин за неделю")}</div>'
            f'<div class="card" style="margin:12px 16px 0"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px">Эта неделя</b><span class="mut" style="font-size:13px">цель дня — 10 мин</span></div>'
            f'<div style="position:relative;display:flex;margin-top:10px">{cols}<div style="position:absolute;left:0;right:0;top:{goal_y}px;border-top:1.5px dashed var(--rq-border-strong)"></div></div>'
            f'<div class="mut" style="font-size:13px;margin-top:10px">Дней с целью: 2 из 4 — ещё 2, и неделя принесёт +120 монет.</div></div>'
            f'<div class="mut" style="font-size:13px;margin:12px 16px 0;line-height:1.45">Всего прочитано 124 мин · дочитано книг: 1</div>'
            f'{nav(2)}</div>')

def settings(night=False):
    def row(t, sub=None, right='', danger=False, icon=None):
        s = f'<small>{sub}</small>' if sub else ''
        col = 'color:var(--rq-danger);font-weight:600' if danger else ''
        lead = f'<span class="mut" style="margin-right:2px">{ic(icon,20)}</span>' if icon else ''
        return f'<div class="srow" style="padding:3px 0;border-bottom:1px solid var(--rq-line)">{lead}<div class="tx" style="{col}">{t}{s}</div>{right}</div>'
    def card(inner): return f'<div class="card" style="margin:0 16px;padding:2px 14px">{inner}</div>'
    def cap(t): return f'<div class="cap" style="margin:10px 16px 5px">{t}</div>'
    last = lambda s: s.replace('border-bottom:1px solid var(--rq-line)', 'border-bottom:0', 1) if False else s
    def nob(h):  # убрать нижнюю линию у последней строки карточки
        i = h.rfind('border-bottom:1px solid var(--rq-line)'); return h[:i]+'border-bottom:0'+h[i+len('border-bottom:1px solid var(--rq-line)'):]
    seg = lambda opts, on, w='': ('<div class="seg sm" style="' + w + '">' + ''.join(f'<div class="{"on" if k == on else ""}">{o}</div>' for k, o in enumerate(opts)) + '</div>')
    focus = ('<div style="padding:6px 0 8px;border-bottom:1px solid var(--rq-line)"><div class="srow" style="min-height:0;margin-bottom:8px"><div class="tx">Режим фокуса'
             '<small>«Авто» — сам через 10 с чтения</small></div></div>'
             + seg(['Выкл', 'Кнопкой', 'Авто'], 1) + '</div>')
    return (f'<div class="scr"><div class="hdr back" style="height:84px"><div class="ib">{ic("arrow-left",24)}</div><h1>Настройки</h1></div>'
            f'<div class="setwrap">{cap("Оформление")}' + card(nob(
                row('Тема', 'Авто: по часам', seg(['Авто', 'День', 'Ночь'], 2 if night else 1, 'width:186px'))
                + row('Язык', None, seg(['Русский', 'English'], 0, 'width:186px'))))
            + f'{cap("Чтение")}' + card(nob(
                row('Цель дня', 'Одна для всех на время теста', '<b style="font-size:15px">10 мин</b>')
                + focus
                + row('Показывать счётчик чтения', '«7 / 10 мин» в углу в фокусе', '<div class="tg"></div>')
                + row('Не гасить экран при чтении', None, '<div class="tg"></div>')
                + row('Вибрация при наградах', None, '<div class="tg off"></div>')))
            + f'{cap("Данные")}' + card(nob(
                row('Экспорт прогресса', 'Резервная копия в файл JSON', f'<div class="sbtn">{ic("download",18)}Сохранить</div>')
                + row('Импорт прогресса', 'Из сохранённого файла', f'<div class="sbtn">{ic("upload",18)}Загрузить</div>')
                + row('Вернуть удалённые демо-книги', None, '<div class="sbtn">Вернуть</div>')
                + row('Сбросить весь прогресс', None, f'<span style="color:var(--rq-danger)">{ic("chevron-right",20)}</span>', danger=True)))
            + f'<div style="margin:8px 16px 0">'
              f'<div class="srow" style="min-height:44px"><span style="color:var(--rq-accent-text)">{ic("copy",20)}</span><div class="tx" style="color:var(--rq-accent-text);font-weight:600">Скопировать журнал запуска'
              f'<small>Пришлите его, если приложение долго открывалось</small></div></div>'
              f'<div class="mut num" style="font-size:13px;margin-top:2px;padding-left:32px">Версия сборки 20261008-1027</div></div></div></div>')

def summ(kind):
    sc = dict(regular=dict(mins=7, pages=6, today=25, xp0=1240, wk=3),
              day=dict(mins=12, pages=14, today=12, xp0=1240, wk=2),
              week=dict(mins=11, pages=9, today=11, xp0=1240, wk=4),
              missed=dict(mins=6, pages=5, today=6, xp0=1240, wk=2))[kind]
    m = sc['mins']; xp = m*10; x1 = sc['xp0']+xp; done = sc['today'] >= 10
    xpblk = (f'<div class="sr" style="display:block"><div style="display:flex;justify-content:space-between;align-items:baseline"><span>Опыт · Уровень 4</span>'
             f'<b class="v" style="color:var(--rq-accent-text)">+{xp} XP</b></div><div class="pbar" style="height:8px;margin:8px 0 5px"><i style="width:{(x1-900)/700*100:.0f}%"></i></div>'
             f'<small class="num">{nb(x1)} / {nb(1600)} до уровня 5</small></div>')
    if kind == 'missed':
        goal = (f'<div class="sr">{ring(m/10,52,rtext(str(m),16))}<div class="n"><b>Цель дня: 6 из 10 мин</b>'
                f'<small>Ещё 4 мин сегодня — и +30 монет</small></div></div>')
    elif kind == 'regular':
        goal = (f'<div class="sr">{ring(1,52,rcheck())}<div class="n"><b>Цель дня уже выполнена</b>'
                f'<small>Сегодня {sc["today"]} мин · монеты за день уже начислены</small></div></div>')
    else:
        goal = (f'<div class="sr">{ring(1,52,rcheck())}<div class="n"><b>Цель дня выполнена</b>'
                f'<small>Цель 10 мин · сегодня {sc["today"]} мин</small></div></div>')
    wk = sc['wk']
    week = (f'<div class="sr" style="border:0">{ic("calendar-check",22,"var(--rq-text-2)")}<span class="n">Неделя: {wk} из 4 дней</span>'
            f'<div class="dots">{"".join("<i class=f></i>" if k < wk else "<i></i>" for k in range(4))}</div></div>')
    coins = ''
    if kind == 'day':
        coins = f'<div class="hl coinhl">{ic("coins",22)}<span style="flex:1">Цель дня</span><span>+30 монет</span></div>'
    if kind == 'week':
        coins = (f'<div class="hl coinhl" style="flex-direction:column;align-items:stretch;gap:6px">'
                 f'<div style="display:flex;align-items:center;gap:10px">{ic("coins",22)}<span style="flex:1">Цель дня</span><span>+30 монет</span></div>'
                 f'<div style="display:flex;align-items:center;gap:10px">{ic("trophy",22)}<span style="flex:1">Неделя выполнена</span><span>+120 монет</span></div></div>')
    top = {'regular': '', 'day': '', 'week': '', 'missed': ''}[kind]
    sub = {'regular': 'Хорошая порция чтения', 'day': 'Сегодняшняя цель закрыта', 'week': 'Неделя закрыта, так держать', 'missed': 'Почти получилось'}[kind]
    y = {'regular': 104, 'day': 92, 'week': 64, 'missed': 100}[kind]
    book = 'Хамелеон' if kind == 'regular' else 'Мастер и Маргарита'
    fin = (f'<div class="sr">{ic("book-check",22,"var(--rq-success)")}<span class="n">Книга прочитана<small>Хамелеон · А. П. Чехов</small></span></div>'
           if kind == 'regular' else '')
    more = (f'<div class="btn sec2" style="margin-top:12px">{ic("book-open",20)}Почитать ещё 4 мин</div>' if kind == 'missed' else '')
    return (reader(daypct=min(100, sc['today']*10)) + '<div class="scrim"></div>' +
            f'<div class="modal"><div class="bt">{book}</div><h2>Сессия завершена</h2>'
            f'<div class="bt" style="margin-top:2px">{sub}</div><div class="mbody">{coins}<div style="margin-top:6px">'
            f'<div class="sr">{ic("clock",22,"var(--rq-text-2)")}<span class="n">Минуты чтения</span><b class="v">{m} мин</b></div>'
            f'<div class="sr">{ic("file-text",22,"var(--rq-text-2)")}<span class="n">Страницы</span><b class="v">{sc["pages"]}</b></div>'
            f'{fin}{xpblk}{goal}{week}</div></div>{more}<div class="btn" style="margin-top:{10 if more else 12}px">В библиотеку</div></div>')

def reader_settings(night):
    sel = 'night' if night else 'sepia'
    th = [('day', 'День', '#fbfaf6', '#26241f'), ('sepia', 'Сепия', '#f4ecd8', '#5b4636'), ('night', 'Ночь', '#0f1c1f', '#c2d0cd')]
    tcards = ''.join(f'<div class="{"on" if k == sel else ""}" style="background:{bg};color:{fg}"><b>Аа</b><span>{n}</span>'
                     + (f'<i class="ck">{ic("check",14,sw=3)}</i>' if k == sel else '') + '</div>' for k, n, bg, fg in th)
    return (reader(n=98) + '<div class="scrim"></div>' +
            f'<div class="sheet" style="height:704px"><div class="grab"></div><div class="shead"><h2>Вид страницы</h2><div class="ib">{ic("x")}</div></div>'
            f'<div class="sec"><div class="lab">Тема страницы</div><div class="themes">{tcards}</div></div>'
            f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between"><span>Размер текста</span><b class="num" style="color:var(--rq-text)">19</b></div>'
            f'<div style="display:flex;align-items:center;gap:6px"><div class="ib" style="font:600 15px var(--rq-font-read)">A</div>'
            f'<div class="slider" style="flex:1;margin:0"><div class="tr"></div><div class="fi" style="width:42%"></div><div class="th" style="left:42%"></div></div>'
            f'<div class="ib" style="font:600 24px var(--rq-font-read)">A</div></div></div>'
            f'<div class="sec"><div class="lab">Шрифт</div><div class="seg"><div class="on" style="font-family:var(--rq-font-read)">Georgia</div><div style="font-family:\'Times New Roman\',Tinos,serif">Times</div><div>Без засечек</div></div></div>'
            f'<div class="sec"><div class="lab">Интервал и поля</div><div style="display:flex;gap:10px"><div class="seg" style="flex:1"><div>Плотно</div><div class="on">Обычно</div><div>Свободно</div></div></div>'
            f'<div class="seg" style="margin-top:8px"><div>Узкие поля</div><div class="on">Средние</div><div>Широкие</div></div></div>'
            f'<div class="sec srow"><div class="tx">Выравнивание по ширине<small>С переносами слов</small></div><div class="tg"></div></div>'
            f'<div class="sec"><div class="lab" style="display:flex;justify-content:space-between;margin-bottom:0"><span>Затемнение PDF ночью</span><b class="num" style="color:var(--rq-text)">35 %</b></div>'
            f'<div class="slider" style="margin:0 4px"><div class="tr"></div><div class="fi" style="width:70%"></div><div class="th" style="left:70%"></div></div>'
            f'<div class="mut num" style="display:flex;justify-content:space-between;font-size:12px;margin-top:-6px"><span>0 %</span><span>'
            + ('сейчас применяется к PDF' if night else 'работает в ночной теме') + '</span><span>50 %</span></div></div></div>')

TOC = [(1,'Часть первая',None),(2,'Глава 1. Никогда не разговаривайте с неизвестными',5),(2,'Глава 2. Понтий Пилат',17),(2,'Глава 3. Седьмое доказательство',41),
       (2,'Глава 4. Погоня',45),(2,'Глава 5. Было дело в Грибоедове',52),(2,'Глава 6. Шизофрения, как и было сказано',64),(2,'Глава 7. Нехорошая квартира',72),
       (2,'Глава 8. Поединок между профессором и поэтом',81),(2,'Глава 9. Коровьевские штуки',89),(2,'Глава 10. Вести из Ялты',97,1),(2,'Глава 11. Раздвоение Ивана',106),
       (2,'Глава 12. Черная магия и ее разоблачение',110),(1,'Часть вторая',None),(2,'Глава 19. Маргарита',112)]
def toc():
    rows = ''
    for l, t, p, *cur in TOC:
        if l == 1:
            rows += f'<div style="font-size:12px;font-weight:700;color:var(--rq-text-2);text-transform:uppercase;letter-spacing:.06em;padding:14px 0 6px">{t}</div>'; continue
        if cur:
            rows += (f'<div style="display:flex;align-items:center;min-height:48px;margin:0 -20px;padding:0 20px 0 16px;background:var(--rq-accent-tint);border-left:4px solid var(--rq-accent);font-weight:700;color:var(--rq-text)">'
                     f'<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:10px">{t}</span>'
                     f'<span style="font-size:12px;font-weight:700;color:var(--rq-accent-text);margin-right:10px">вы здесь</span><span class="num" style="font-size:13px;color:var(--rq-text)">{p}</span></div>')
        else:
            rows += (f'<div style="display:flex;align-items:center;min-height:46px;border-bottom:1px solid var(--rq-line);font-size:15px">'
                     f'<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:10px">{t}</span><span class="num mut" style="font-size:13px">{p}</span></div>')
    return (reader(n=98) + '<div class="scrim"></div>' +
            f'<div class="sheet" style="height:612px;overflow:hidden;padding-bottom:0"><div class="grab"></div><div class="shead"><div><h2>Оглавление</h2><div class="sub">Мастер и Маргарита · стр. 98 из 185</div></div><div class="ib">{ic("x")}</div></div>'
            f'<div style="height:530px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 88%,transparent)">{rows}</div></div>')

def toasts():
    def lab(k, t): return f'<div style="display:flex;align-items:baseline;gap:8px;margin:18px 16px 8px"><code style="font:700 13px/1 monospace;color:var(--rq-accent-text)">{k}</code><span class="mut" style="font-size:13px">{t}</span></div>'
    def T(kind, icon, txt, act=''):
        a = f'<span class="act">{act}</span>' if act else ''
        return f'<div style="margin:0 16px 8px"><div class="toast {kind}">{ic(icon,20)}<span>{txt}</span>{a}</div></div>'
    return (f'<div class="scr"><div class="hdr" style="height:84px"><h1>Тосты · flashMsg</h1></div>'
            f'<div class="mut" style="font-size:13px;margin:0 16px;line-height:1.45">Снизу по центру, над нижним меню (отступ 12 px). Один тост за раз: новый заменяет старый. Тап по тосту закрывает его.</div>'
            + lab("kind:'game'", 'монеты и опыт · 3 с · в читалке игровые тосты не показываются никогда')
            + T('game', 'coins', '+30 монет · цель дня выполнена') + T('game', 'coins', '+120 монет · неделя выполнена')
            + lab("kind:'info'", 'нейтральные · 3 с · можно и в читалке')
            + T('info', 'info', 'Книга добавлена в библиотеку') + T('info', 'bookmark', 'Закладка добавлена')
            + lab("kind:'error'", 'ошибки · 5 с · можно с действием')
            + T('error', 'circle-alert', 'Не удалось сохранить прогресс', 'Повторить')
            + T('error', 'circle-alert', 'Файл не открылся: нужен PDF, FB2, EPUB или TXT')
            + f'<div style="position:absolute;left:0;right:0;bottom:96px;display:flex;justify-content:center"><div class="toast game" style="width:358px">{ic("coins",20)}<span>+30 монет · цель дня выполнена</span></div></div>'
            + f'<div class="mut" style="position:absolute;left:16px;bottom:150px;font-size:12px">Так тост стоит над нижним меню:</div>'
            + nav(0) + '</div>')

SCREENS = [
 ('reader-clean',    '1б', 'Читалка: режим чтения', 'только текст, номер в углу, полоска цели дня',
     lambda n: reader(), 'page'),
 ('reader-panels',   '1б', 'Читалка: панели', 'тап в центр: шапка, плашка «98 из 185», слайдер',
     lambda n: reader(rtop()+rbot(98, n)), 'page'),
 ('reader-jump',     '1б', 'После прыжка слайдером', '«< на стр. 98» и метка на слайдере',
     lambda n: reader(rtop()+rbot(142, n, back=98), n=142), 'page'),
 ('reader-focus',    '1б', 'Режим фокуса', 'только текст и счётчик «7 / 10 мин» в углу',
     lambda n: reader_focus(), 'page'),
 ('reader-focus-done', '1б', 'Фокус: цель дня набрана', '«10 / 10 мин» с галочкой; тост info «Яркость 60%»',
     lambda n: reader_focus(done=True, toast=('sun', 'Яркость 60%')), 'page'),
 ('reader-focus-zones','1б', 'Фокус: зоны тапа', 'углы 12 %; ниже 30 % / 40 % / 30 %; выход — только центр',
     lambda n: reader_focus(True), 'page'),
 ('reader-pdf',      '1б', 'PDF', 'ночью затемнение 35 % (по умолчанию), без инверсии',
     lambda n: f'<READER><div class="pdfwrap">{pdfpage()}</div><div class="corner"><span class="pgnum">41 / 312</span></div></READER>', 'page'),
 ('reader-settings', '1б', 'Шторка «Вид страницы»', 'тема, размер, шрифт, интервал, поля, затемнение PDF',
     lambda n: reader_settings(n), 'page'),
 ('toc',             '1б', 'Оглавление', 'шторка 72 % высоты, текущая глава отмечена',
     lambda n: toc(), 'page'),
 ('library',         '1в', 'Библиотека', 'цель 10 мин без степпера, продолжить, полка',
     lambda n: library(), None),
 ('rewards',         '1в', 'Награды', 'задания дня и недели, награды из жизни',
     lambda n: rewards(), None),
 ('profile',         '1в', 'Профиль', 'уровень и XP, монеты, стрик, минуты за неделю',
     lambda n: profile(), None),
 ('settings',        '1в', 'Настройки (MVP)', 'режим фокуса и счётчик; данные, журнал, версия',
     lambda n: settings(n), None),
 ('summary-regular', '1в', 'Итог: обычный', 'цель уже выполнена; пример строки «Книга прочитана»',
     lambda n: summ('regular'), 'page'),
 ('summary-day',     '1в', 'Итог: день выполнен', '+30 монет за цель дня',
     lambda n: summ('day'), 'page'),
 ('summary-week',    '1в', 'Итог: неделя', '+30 за день и +120 за неделю',
     lambda n: summ('week'), 'page'),
 ('summary-missed',  '1в', 'Итог: не дотянул', 'ещё 4 мин до цели; «Почитать ещё 4 мин»',
     lambda n: summ('missed'), 'page'),
 ('toasts',          '1в', 'Тосты', 'game / info / error для flashMsg',
     lambda n: toasts(), None),
]

CHROME = '/usr/bin/google-chrome'
def shot(html, png, scale, w=390, h=844):
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', f'--force-device-scale-factor={scale}',
                    f'--window-size={w},{h}', '--virtual-time-budget=2000', f'--screenshot={png}', 'file://'+html], capture_output=True)

def build(only=None):
    jobs = []
    for key, part, title, desc, fn, pg in SCREENS:
        if only and key not in only: continue
        for theme in ('day', 'night'):
            page = ('night' if theme == 'night' else 'sepia') if pg else None
            if key == 'reader-pdf' and theme == 'day': page = 'sepia'
            h = doc(fn(theme == 'night'), theme, page, f'{key}-{theme}')
            f = f'{D}/{key}-{theme}.html'; open(f, 'w').write(h)
            jobs += [(f, f'{OUT}/{key}-{theme}.png', 1), (f, f'{OUT}/{key}-{theme}@2x.png', 2)]
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda j: shot(*j), jobs))

def overview():
    for theme in ('day', 'night'):
        bg, fg, mu = ('#e9e4da', '#2b251c', '#5d513e') if theme == 'day' else ('#071012', '#d6e2e0', '#93aaa7')
        cells = ''.join(f"<div style='width:390px'><img src='../{k}-{theme}.png' style='width:390px;height:844px;border-radius:16px;box-shadow:0 2px 12px #0005;display:block'>"
                        f"<div style='margin-top:10px;font-size:19px;font-weight:700'>{t} <span style='font-weight:600;color:{mu}'>· {p}</span></div>"
                        f"<div style='font-size:15px;color:{mu};margin-top:2px'>{d}</div><div style='font:13px monospace;color:{mu};margin-top:2px'>{k}-{theme}.png</div></div>"
                        for k, p, t, d, *_ in SCREENS)
        name = 'день' if theme == 'day' else 'ночь'
        html = (f"<!doctype html><meta charset=utf-8><body style='margin:0;background:{bg};color:{fg};font-family:Roboto,sans-serif;width:2170px;padding:30px 30px 10px;box-sizing:border-box'>"
                f"<div style='font-size:30px;font-weight:700'>ReadQuest · этап 1 · {name}</div><div style='font-size:17px;color:{mu};margin:6px 0 22px'>"
                f"Акцент бирюза {'#1f6f6b' if theme=='day' else '#5fb8ae'} · PDF ночью: затемнение без инверсии · 390×844 · токены tokens.css · 1б — читалка, 1в — приложение</div>"
                f"<div style='display:flex;flex-wrap:wrap;gap:40px 40px'>{cells}</div>")
        f = f'{D}/overview-{theme}.html'; open(f, 'w').write(html)
        rows = math.ceil(len(SCREENS)/5)
        shot(f, f'{OUT}/overview-{theme}.png', 1, 2170, 110 + rows*(844+40+92))

# ---------------- адаптивность ----------------
ADAPTIVE = [  # (экран, ширина, высота, темы)
 ('library', 360, 780, ('day',)), ('reader-panels', 360, 780, ('day',)), ('summary-day', 360, 780, ('day',)), ('settings', 360, 780, ('day',)),
 ('library', 412, 915, ('day',)), ('reader-panels', 412, 915, ('day',)), ('summary-day', 412, 915, ('day',)), ('settings', 412, 915, ('day',)),
 ('reader-panels', 844, 390, ('day', 'night')), ('summary-day', 844, 390, ('day',)), ('library', 844, 390, ('day',)),
]
AD = os.path.join(OUT, 'adaptive')
def build_adaptive():
    os.makedirs(AD, exist_ok=True); jobs = []
    for key, w, h, themes in ADAPTIVE:
        for th in themes:
            f = f'{D}/{key}-{th}.html'
            jobs += [(f, f'{AD}/{key}-{w}x{h}-{th}.png', 1, w, h), (f, f'{AD}/{key}-{w}x{h}-{th}@2x.png', 2, w, h)]
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda j: shot(*j), jobs))
    TT = {'library': 'Библиотека', 'reader-panels': 'Читалка с панелями', 'summary-day': 'Итог: день выполнен', 'settings': 'Настройки'}
    def cell(key, w, h, th):
        return (f"<div style='width:{w}px'><img src='{key}-{w}x{h}-{th}.png' style='width:{w}px;height:{h}px;border-radius:14px;box-shadow:0 2px 12px #0005;display:block'>"
                f"<div style='margin-top:8px;font-size:17px;font-weight:700'>{TT[key]} · {w}×{h}{' · ночь' if th == 'night' else ''}</div>"
                f"<div style='font:12px monospace;color:#5d513e'>{key}-{w}x{h}-{th}.png</div></div>")
    def row(title, items): return (f"<div style='font-size:22px;font-weight:700;margin:26px 0 12px'>{title}</div><div style='display:flex;flex-wrap:wrap;gap:30px'>"
                                    + ''.join(cell(*i) for i in items) + '</div>')
    items = [(k, w, h, t) for k, w, h, ths in ADAPTIVE for t in ths]
    html = ("<!doctype html><meta charset=utf-8><body style='margin:0;background:#e9e4da;color:#2b251c;font-family:Roboto,sans-serif;width:1820px;padding:26px 30px;box-sizing:border-box'>"
            "<div style='font-size:30px;font-weight:700'>ReadQuest · этап 1 · адаптивная вёрстка</div>"
            "<div style='font-size:16px;color:#5d513e;margin-top:6px'>Без настройки масштаба: резиновая ширина, колонка текста ≤ 680 px, шторки и итог ≤ 480 px по центру, полка 3 колонки до 400 px, 4 — от 400 px, auto-fill в альбомной; шрифты clamp() в rem; зона нажатия ≥ 44 px; safe-area.</div>"
            + row('Маленький Android · 360×780', [i for i in items if i[1] == 360])
            + row('Большой Android · 412×915', [i for i in items if i[1] == 412])
            + row('Альбомная ориентация · 844×390', [i for i in items if i[1] == 844]))
    f = f'{AD}/overview-adaptive.html'; open(f, 'w').write(html)
    shot(f, f'{AD}/overview-adaptive.png', 1, 1820, 3260)

if __name__ == '__main__':
    only = sys.argv[1:] or None
    if only == ['adaptive']: build_adaptive(); print('done'); sys.exit()
    build(only)
    if not only: overview(); build_adaptive()
    print('done')
