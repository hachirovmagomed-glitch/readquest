# ReadQuest · скин «Паровая библиотека» (стимпанк) — генератор макетов. Запуск: python3 gen_parovaya.py
# Все рисунки наши: шестерни, манометр, вентили, механический филин. Без чужих логотипов и персонажей.
import os,random,subprocess,glob,math
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; P='parovaya-biblioteka'
W,H=390,844
SOOT='#231a12'; T2='#54443a'; COP='#8a3b12'; VER='#1f5a52'; BR='#b5893a'; BRT='#6a4a10'; LEA='#5a3420'; STEEL='#7d7a72'
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
'wrench':'<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5l2.5 2.5 2-2z"/>',
}
def ic(n,sz=22,w=1.8): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
def gearpath(cx,cy,r,teeth,depth=None):
    depth=depth or r*.18; pts=[]
    for k in range(teeth*4):
        a=2*math.pi*k/(teeth*4); rr=r if (k%4) in (1,2) else r-depth
        pts.append(f'{cx+rr*math.cos(a):.2f},{cy+rr*math.sin(a):.2f}')
    return 'M'+' L'.join(pts)+'Z'
def gear(cx,cy,r,teeth,fill,stroke,o=1,hole=True,sw=1):
    h=f'<circle cx="{cx}" cy="{cy}" r="{r*.32:.1f}" fill="none" stroke="{stroke}" stroke-width="{sw}"/>' if hole else ''
    spokes=''.join(f'<line x1="{cx+r*.32*math.cos(a):.1f}" y1="{cy+r*.32*math.sin(a):.1f}" x2="{cx+(r*.66)*math.cos(a):.1f}" y2="{cy+(r*.66)*math.sin(a):.1f}" stroke="{stroke}" stroke-width="{sw}"/>' for a in [k*math.pi/3 for k in range(6)]) if r>14 else ''
    return f'<g opacity="{o}"><path d="{gearpath(cx,cy,r,teeth)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/><circle cx="{cx}" cy="{cy}" r="{r*.68:.1f}" fill="none" stroke="{stroke}" stroke-width="{sw*.7}"/>{spokes}{h}</g>'
def coin(sz=22):
    """Жетон: латунная монета с зубчатым гуртом-шестернёй и паровым клапаном в центре (наш рисунок)."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="cj" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f7dd9a"/><stop offset=".55" stop-color="#c99a45"/><stop offset="1" stop-color="#8a6420"/></radialGradient></defs>
<path d="{gearpath(20,20,19.5,16,2.6)}" fill="url(#cj)" stroke="#4e3608" stroke-width="1"/><circle cx="20" cy="20" r="13" fill="none" stroke="#5e420e" stroke-width="1"/>
<path d="M15 25h10v-3h-3v-6h-4v6h-3z" fill="#5e420e"/><circle cx="20" cy="13.5" r="3" fill="none" stroke="#5e420e" stroke-width="1.4"/><path d="M20 10.5v6" stroke="#5e420e" stroke-width="1.2"/>
<circle cx="13" cy="13" r="1" fill="#5e420e"/><circle cx="27" cy="13" r="1" fill="#5e420e"/><circle cx="13" cy="27" r="1" fill="#5e420e"/><circle cx="27" cy="27" r="1" fill="#5e420e"/></svg>'''
def gauge(filled,tot=10,sz=60,label=True,night=False):
    """Прогресс дня — манометр: шкала из 10 меток (1 минута = 1 метка), стрелка на прочитанных минутах, пройденные метки — медные."""
    cx,cy,r=30,32,24; a0,a1=math.radians(150),math.radians(390)
    face='#2a231b' if night else '#f6f0e2'; ink='#efe3cc' if night else SOOT
    marks=''
    for k in range(tot+1):
        a=a0+(a1-a0)*k/tot; c=('#f2b84b' if night else COP) if k<=filled else (STEEL)
        marks+=f'<line x1="{cx+(r-9)*math.cos(a):.1f}" y1="{cy+(r-9)*math.sin(a):.1f}" x2="{cx+(r-3.5)*math.cos(a):.1f}" y2="{cy+(r-3.5)*math.sin(a):.1f}" stroke="{c}" stroke-width="{2.2 if k<=filled else 1.4}" stroke-linecap="round"/>'
    an=a0+(a1-a0)*min(filled,tot)/tot
    needle=f'<line x1="{cx}" y1="{cy}" x2="{cx+(r-7)*math.cos(an):.1f}" y2="{cy+(r-7)*math.sin(an):.1f}" stroke="{"#f0956a" if night else COP}" stroke-width="2" stroke-linecap="round"/><circle cx="{cx}" cy="{cy}" r="3" fill="{BR}" stroke="{ink}" stroke-width=".8"/>'
    t=f'<text x="{cx}" y="{cy+14}" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="9.5" fill="{ink}">{filled}/{tot}</text>' if label else ''
    rivets=''.join(f'<circle cx="{cx+(r+3)*math.cos(a):.1f}" cy="{cy+(r+3)*math.sin(a):.1f}" r="1.1" fill="#5e420e"/>' for a in [k*math.pi/4+math.pi/8 for k in range(8)])
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60" style="flex:none"><path d="M26 2h8v5h-8z" fill="{BR}" stroke="#4e3608" stroke-width=".8"/><circle cx="{cx}" cy="{cy}" r="{r+5}" fill="{BR}" stroke="#4e3608" stroke-width="1"/>{rivets}
<circle cx="{cx}" cy="{cy}" r="{r}" fill="{face}" stroke="#4e3608" stroke-width="1"/>{marks}{t}{needle}</svg>'''
def valve(sz=24,on=True,night=False):
    """Неделя: вентиль-маховик. Открытый — латунный с паром, закрытый — серая сталь."""
    c=BR if on else ('#4a453d' if night else '#c9c2b4'); s='#4e3608' if on else ('#6f685c' if night else '#9a9284')
    sp=''.join(f'<line x1="12" y1="12" x2="{12+8*math.cos(a):.1f}" y2="{12+8*math.sin(a):.1f}" stroke="{s}" stroke-width="1.6"/>' for a in [k*math.pi/2+math.pi/4 for k in range(4)])
    steam=f'<path d="M18 3q2-2 0-3M21 5q2-2 0-3" stroke="{"#c4b196" if night else "#9a9284"}" stroke-width="1" fill="none"/>' if on else ''
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><circle cx="12" cy="12" r="9" fill="none" stroke="{c}" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="{s}" stroke-width=".6"/>{sp}<circle cx="12" cy="12" r="2.8" fill="{c}" stroke="{s}"/>{steam}</svg>'
def owl(sz=96,night=False):
    """Маскот «Филин Винтик» — маленький механический филин: латунный корпус на заклёпках, глаза-линзы, крылья-пластины, ключ завода на спине."""
    ln=SOOT
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 100 100"><g stroke="{ln}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M84 46h8M92 40v12M88 42v8" fill="none" stroke-width="2"/>
<path d="M30 30 l-6 -14 14 8 M70 30 l6 -14 -14 8" fill="{COP}"/>
<path d="M50 22 C28 22 22 40 24 60 C26 80 38 90 50 90 C62 90 74 80 76 60 C78 40 72 22 50 22z" fill="{BR}"/>
<path d="M50 52 C40 54 36 64 38 76 C42 84 58 84 62 76 C64 64 60 54 50 52z" fill="#e3c88a"/>
<path d="M40 62q10 4 20 0M40 70q10 4 20 0M42 78q8 3 16 0" fill="none" stroke-width="1"/>
<path d="M24 52 C14 60 16 76 30 84 C30 72 30 62 24 52z M76 52 C86 60 84 76 70 84 C70 72 70 62 76 52z" fill="{LEA}"/>
<circle cx="38" cy="40" r="11" fill="{STEEL}"/><circle cx="62" cy="40" r="11" fill="{STEEL}"/>
<circle cx="38" cy="40" r="7.5" fill="#f2e6c4"/><circle cx="62" cy="40" r="7.5" fill="#f2e6c4"/>
<circle cx="38" cy="40" r="3.4" fill="{VER}"/><circle cx="62" cy="40" r="3.4" fill="{VER}"/>
<path d="M46 48 l4 7 4 -7z" fill="{COP}"/>
<path d="M40 90v5h-6M60 90v5h6" fill="none" stroke-width="2"/></g>
<circle cx="36.5" cy="38.5" r="1.2" fill="#fff"/><circle cx="60.5" cy="38.5" r="1.2" fill="#fff"/>
{''.join(f'<circle cx="{x}" cy="{y}" r="1.3" fill="#4e3608"/>' for x,y in [(30,28),(70,28),(26,48),(74,48),(50,25)])}</svg>'''
def pipes(o=.35):
    """Декор фона: трубы с фланцами и шестерни по краям экрана (не на странице книги)."""
    return f'''<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><g opacity="{o}">
{gear(366,176,30,12,'none',BR,1,True,1.2)}{gear(334,212,16,9,'none',COP,1,True,1)}{gear(20,600,26,11,'none',BR,1,True,1.2)}
<path d="M0 470h22a10 10 0 0 1 10 10v60" fill="none" stroke="{COP}" stroke-width="5"/><rect x="26" y="500" width="12" height="5" fill="{BR}"/>
<path d="M390 700h-14a10 10 0 0 0-10 10v40" fill="none" stroke="{COP}" stroke-width="5"/><rect x="360" y="722" width="12" height="5" fill="{BR}"/>
</g></svg>'''
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Jost",sans-serif;color:{SOOT};background:#e9e1d0}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Playfair Display SC",serif;font-weight:700;letter-spacing:.4px}}.num{{font-family:"Oswald",sans-serif;font-weight:500}}
.bg{{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 20%,#f1eadb 0,#e9e1d0 55%,#d9cdb3 100%)}}
.bg:after{{content:"";position:absolute;inset:0;opacity:.5;background:repeating-linear-gradient(90deg,transparent 0 47px,rgba(31,90,82,.06) 47px 48px),repeating-linear-gradient(0deg,transparent 0 47px,rgba(31,90,82,.06) 47px 48px)}}
.plate{{position:relative;background:linear-gradient(180deg,#f8f3e7,#f1e9d8);border:2px solid {BR};border-radius:8px;box-shadow:inset 0 0 0 1px #f8f3e7,inset 0 0 0 2px rgba(78,54,8,.25),0 3px 0 rgba(78,54,8,.18),0 8px 18px rgba(50,35,15,.14)}}
.plate.rv:before,.plate.rv:after{{content:"";position:absolute;top:5px;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f2d99a,#8a6420);box-shadow:0 0 0 .5px #4e3608}}
.plate.rv:before{{left:5px}}.plate.rv:after{{right:5px}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:28px}}
.bal{{display:flex;align-items:center;gap:6px;padding:4px 12px 4px 4px;font-weight:600;font-size:14px;background:#f8f3e7;border:2px solid {BR};border-radius:18px;color:{SOOT}}}
.nav{{position:absolute;left:12px;right:12px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 10px;isolation:isolate;background:linear-gradient(180deg,#6a3e25,{LEA});border-color:{BR}}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:500;color:#f1e4c8;position:relative;padding:6px 0}}
.nav .on{{color:#fff;font-weight:600}}.nav .on:before{{content:"";position:absolute;inset:3px 10px;z-index:-1;background:{VER};border-radius:6px;box-shadow:inset 0 0 0 1.5px {BR}}}
.btn{{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;font-family:"Playfair Display SC",serif;font-weight:700;letter-spacing:1px;font-size:18px;color:#fff;background:linear-gradient(180deg,#9a4718,{COP});border-radius:8px;box-shadow:inset 0 0 0 2px {BR},inset 0 2px 0 3px rgba(255,220,170,.25),0 4px 0 #4e2008,0 8px 16px rgba(80,30,10,.25)}}
.bar{{height:8px;background:#ddd2bb;border-radius:4px;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}}.bar i{{display:block;height:100%;border-radius:4px;background:linear-gradient(180deg,#a8501d,{COP})}}
.cap{{font-size:12px;color:{T2}}}
/* читалка: страница чистая, без шестерён и труб */
.rd{{position:absolute;inset:0;background:#f5efe2;color:{SOOT}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"Merriweather",serif;font-size:16.5px;line-height:1.65;text-align:left}}
.page h3{{font-family:"Playfair Display SC",serif;font-weight:700;font-size:19px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:linear-gradient(180deg,#e3d8c1,#ddd0b5);border-bottom:3px solid {BR};box-shadow:0 1px 0 #4e3608}}
.rtop .t{{flex:1;text-align:center;font-family:"Playfair Display SC",serif;font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{SOOT}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(0deg,#e3d8c1,#ddd0b5);border-top:3px solid {BR};box-shadow:0 -1px 0 #4e3608;padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:10px;font-size:14px;margin-bottom:10px;font-weight:500}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:4px;border-radius:2px;background:#bfb39a}}.sl .fi{{position:absolute;top:10px;left:0;height:4px;border-radius:2px;background:{COP}}}
.sl .th{{position:absolute;top:2px;margin-left:-10px;width:20px;height:20px;border-radius:50%;background:{COP};border:2px solid #f5efe2;box-shadow:0 0 0 2px {COP}}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:12px;font-weight:500}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}
.night{{background:#0f0d0b}}.night .rd{{background:#12100d;color:#e6dcc8}}
.night .rtop{{background:radial-gradient(50% 160% at 50% 130%,rgba(242,184,75,.18),transparent 70%),#1d1914;border-color:#6e5426;box-shadow:0 1px 0 #000}}
.night .rbot{{background:radial-gradient(50% 140% at 50% -30%,rgba(242,184,75,.18),transparent 70%),#1d1914;border-color:#6e5426;box-shadow:0 -1px 0 #000}}
.night .rtop .t,.night .pg,.night .tools{{color:#efe3cc}}.night .ib,.night .tools svg{{color:#f2b84b}}
.night .sl .tr{{background:#3d352a}}.night .sl .fi{{background:#f2b84b}}.night .sl .th{{background:#f2b84b;border-color:#12100d;box-shadow:0 0 0 2px #f2b84b,0 0 10px rgba(242,184,75,.45)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("К вечеру в мастерской становилось тихо. Савелий гасил горн, протирал верстак и долго разглядывал чертёж, приколотый к стене. "
 "Механизм не желал работать: маятник шёл ровно, но стрелки замирали на третьей минуте, будто кто-то держал их невидимым пальцем. "
 "Он снова и снова перебирал колёса, пока за окном не зажигались фонари. ")
def reader(night=False):
    pct=97/184*100
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Третья минута</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">Часовщик с Литейного</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="plate nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{coin(24)}<span class="num" style="font-size:15px">390</span> жетонов</div>'
def scene(): return f'<div class="bg"></div>{pipes()}'
COV=[('Часовщик с Литейного','С. Колесов','EPUB','53%','#3b4a46','#f1e9d8',BR),('Дирижабль «Сирин»','А. Воздвиженская','FB2','12%',COP,'#fff','#f2d99a'),('Медная ласточка','И. Лудильщикова','TXT','прочитано','#e3d6b8',SOOT,COP),
 ('Паровой город','Г. Котельников','PDF','не начата',LEA,'#f6ead0',BR),('Сад механизмов','В. Шестернёва','EPUB','4%','#f1e9d8',SOOT,VER),('Хроники котельной','П. Манометров','PDF','67%',SOOT,'#efe3cc',BR)]
def library():
    css=f'''<style>.chips{{position:absolute;top:110px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:5px 12px;font-size:14px;color:{T2};border:1.5px solid #bfb39a;border-radius:14px;background:#f1eadb}}.chip.on{{color:#fff;font-weight:600;background:{VER};border-color:{BR}}}
.grid{{position:absolute;top:160px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:150px;overflow:hidden;padding:30px 9px 0;text-align:center;border-radius:3px 6px 6px 3px;box-shadow:inset 7px 0 0 rgba(0,0,0,.18),2px 3px 0 rgba(35,26,18,.2),0 6px 12px rgba(50,35,15,.18)}}
.cv .fr{{position:absolute;inset:7px 7px 7px 12px;border:1.5px solid var(--fr);border-radius:4px}}
.cv .cr{{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--fr)}}
.fmt{{position:absolute;bottom:12px;left:0;right:0;font-size:9.5px;font-weight:600;letter-spacing:1.5px}}
.ct{{font-size:11px;line-height:1.22;position:relative;hyphens:auto;padding:0 2px}}.ca{{font-size:10.5px;margin-top:6px;position:relative}}
.bt{{font-size:12.5px;font-weight:600;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:{T2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,bg,fg,fr in COV:
        prog=f'<div class="bar" style="height:5px;margin-top:6px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        crn=''.join(f'<div class="cr" style="{s}"></div>' for s in ('left:13px;top:9px','right:9px;top:9px','left:13px;bottom:9px','right:9px;bottom:9px'))
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg};--fr:{fr}"><div class="fr"></div>{crn}<div class="ct H">{t}</div><div class="ca">{a}</div><div class="fmt">{f}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:4px;bottom:80px">{owl(88)}</div>'
    return css+scene()+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def watch(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><path d="M30 2v6" stroke="{BR}" stroke-width="3"/><circle cx="30" cy="4" r="3" fill="none" stroke="{BR}" stroke-width="2"/>
<circle cx="30" cy="32" r="20" fill="{BR}" stroke="#4e3608" stroke-width="1.2"/><circle cx="30" cy="32" r="16" fill="#f6f0e2" stroke="#4e3608"/>
{''.join(f'<line x1="{30+13*math.cos(k*math.pi/6):.1f}" y1="{32+13*math.sin(k*math.pi/6):.1f}" x2="{30+15*math.cos(k*math.pi/6):.1f}" y2="{32+15*math.sin(k*math.pi/6):.1f}" stroke="{SOOT}"/>' for k in range(12))}
<path d="M30 32V21M30 32l7 4" stroke="{SOOT}" stroke-width="1.6" stroke-linecap="round"/>{gear(38,40,5,8,BR,'#4e3608',1,False,.6)}</svg>'''
def lamp(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><circle cx="30" cy="24" r="16" fill="#ffd27a" opacity=".35"/><g stroke="#4e3608" stroke-width="1.2">
<path d="M24 8h12l-2 4H26z" fill="{BR}"/><path d="M23 12h14l2 20H21z" fill="#fff2cc" fill-opacity=".85"/><path d="M27 30q3-12 3-12q3 8 3 12z" fill="#f2a83a" stroke="none"/>
<path d="M20 32h20v4H20z" fill="{BR}"/><path d="M24 36h12l3 14H21z" fill="{COP}"/><path d="M16 50h28v4H16z" fill="{BR}"/></g></svg>'''
def scope(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><g stroke="#4e3608" stroke-width="1.2"><path d="M6 36l30-16 4 8-30 16z" fill="{BR}"/><path d="M36 20l14-7 4 8-14 7z" fill="{COP}"/><path d="M14 34l4 8M28 27l4 8" fill="none"/>
<path d="M26 34l-6 20M28 34l8 20M27 34v20" fill="none" stroke="{LEA}" stroke-width="2"/></g></svg>'''
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:baseline;gap:10px;font-family:"Playfair Display SC";font-weight:700;font-size:19px;margin-bottom:10px}}.sh .sm{{font-family:Jost;font-weight:500;font-size:13px;color:{VER}}}
.q{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:600;font-size:15px}}.q .ds{{font-size:12.5px;color:{T2};margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:700;font-size:15px;color:{BRT}}}
.shelf{{padding:14px 8px 0}}.board{{height:12px;margin:0 -8px;background:linear-gradient(180deg,#7a4a2a,{LEA});border-top:2px solid {BR};border-bottom:1px solid #2e1a0e;position:relative}}
.board:before,.board:after{{content:"";position:absolute;top:2px;width:6px;height:6px;border-radius:50%;background:#e1c07a}}.board:before{{left:10px}}.board:after{{right:10px}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;min-width:0;text-align:center}}.it .art{{height:64px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:10px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:13px;font-weight:600;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:700;color:{BRT}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:16px;border:1.5px dashed #8a7a5c;border-radius:8px;background:rgba(248,243,231,.9)}}.add .tt{{font-weight:600;font-size:14px;color:{COP}}}.add .ds{{font-size:12.5px;color:{T2}}}</style>'''
    q1=f'<div class="plate rv q">{gauge(6)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div><div class="bar"><i style="width:60%"></i></div></div><div class="amt">{coin(20)}+30</div></div>'
    vs=''.join(valve(26,i<3) for i in range(4))
    q2=f'<div class="plate rv q"><div style="display:grid;grid-template-columns:repeat(2,26px);gap:4px;flex:none">{vs}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:{VER}"></i></div></div><div class="amt">{coin(20)}+120</div></div>'
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in (watch(),scope(),lamp()))
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
    pk=f'<div class="abs" style="left:4px;bottom:80px">{owl(80)}</div>'
    return css+scene()+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:112px"><div class="sh">Задания</div>{q1}{q2}</div>
<div class="sec" style="top:378px"><div class="sh">Верстак <span class="sm">награды за прочитанное</span></div><div class="plate shelf"><div class="rc">{its}</div><div class="board"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{COP}">{ic("wrench",24)}</div><div><div class="tt">Добавить на верстак</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в жетонах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(35,26,18,.22)}}.sm{{position:absolute;left:20px;right:20px;top:128px;padding:24px 20px 22px;text-align:center}}
.sm h2{{font-size:25px}}.sub{{font-size:13px;color:{T2};margin:6px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;gap:8px}}.st{{flex:1;padding:8px 4px;border:1.5px solid {BR};border-radius:6px;background:#efe6d2}}
.st b{{display:block;font-family:Oswald;font-weight:500;font-size:24px;line-height:1.3}}.st span{{font-size:12px;color:{T2}}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:500;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:10px 0;margin:12px 0 8px;border-top:1.5px solid #cbbd9c}}.rw .tt{{font-weight:700;font-size:15px;color:{BRT}}}.rw .ds{{font-size:12.5px;color:{T2}}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin:4px 0 18px}}.dots{{display:flex;gap:5px}}</style>'''
    dots=''.join(valve(24,i<3) for i in range(4))
    top=f'<svg width="150" height="40" viewBox="0 0 150 40">{gear(55,20,17,12,BR,"#4e3608",1,True,1)}{gear(87,24,12,9,COP,"#4e3608",1,True,1)}<path d="M100 10q6-6 0-10M108 14q6-6 0-10" stroke="#9a9284" stroke-width="1.4" fill="none"/></svg>'
    inner=f'''<div style="line-height:0">{top}</div><h2 class="H" style="margin-top:6px">Сессия завершена</h2><div class="sub">Часовщик с Литейного · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{COP}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{gauge(10,10,48,False)}<div style="flex:1"><div class="tt" style="display:flex;align-items:center;gap:6px">{coin(22)}+30 жетонов за день</div><div class="ds">Давление в норме · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene()+f'<div class="veil"></div><div class="plate rv sm">{inner}</div>'
SW=[('Сажа','#231a12','текст'),('Чертёжная','#e9e1d0','фон'),('Табличка','#f6f0e2','панели'),('Сталь светл.','#ddd2bb','вторичный'),
 ('Копоть','#54443a','вторичный текст'),('Медь','#8a3b12','акцент'),('Медь тёмн.','#6e2e0d','нажатие'),('Патина','#1f5a52','навигация'),
 ('Латунь','#b5893a','рамки, декор'),('Латунь текст','#6a4a10','суммы'),('Кожа','#5a3420','панель вкладок'),('Страница','#f5efe2','книга день'),
 ('Мастерская','#0f0d0b','фон ночи'),('Ночь: панели','#1d1914','поверхность'),('Газовый свет','#f2b84b','акцент ночи'),('Ночь: текст','#e6dcc8','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:52px 20px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}}.s{{text-align:center;font-size:10.5px}}.c{{height:46px;border:2px solid {BR};border-radius:6px;margin-bottom:6px}}.s b{{display:block;font-weight:600;line-height:1.15}}.s span{{display:block;font-family:monospace;color:{T2}}}.s em{{font-style:normal;color:{T2};font-size:10px}}.f{{margin-top:14px;font-size:14px;line-height:1.55}}</style>'
    return css+scene()+f'''<div class="wrap"><h1 class="H" style="font-size:19px">Палитра «Паровая библиотека»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:19px">Playfair Display SC — заголовки</div><div class="num" style="font-size:17px">Oswald — цифры 18 мин · +180</div><div>Jost — интерфейс</div><div style="font-family:Merriweather;font-size:15px">Merriweather — текст книги</div>
<div style="display:flex;gap:8px;align-items:flex-end;margin-top:6px">{coin(38)}{gauge(6,10,56)}{valve(30)}{valve(30,False)}{lamp(50)}{owl(70)}</div></div></div>'''
SC=[(P+'-reader-day',reader(),'','Читалка · день'),(P+'-reader-night',reader(True),'night','Читалка · ночь'),(P+'-library',library(),'','Библиотека'),
    (P+'-rewards',rewards(),'','Награды'),(P+'-session-summary',summary(),'','Итог сессии'),(P+'-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    # сводка — в самом конце, из финальных PNG
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#ddd0b5');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(sorted(glob.glob(gf+'Playfair Display SC/*Bold*.ttf'))[0],44);fC=ImageFont.truetype((glob.glob(gf+'Jost/*Regular*.ttf') or glob.glob(gf+'Jost/*.ttf'))[0],22)
    d.text((G,16),'ReadQuest — скин «Паровая библиотека»',font=fH,fill=SOOT)
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill=T2,anchor='ma')
    ov.save(f'{OUT}/{P}-overview.png')
