# ReadQuest · скин «Страна чудес» — генератор макетов. Запуск: python3 gen_chudes.py
# Мотивы нарисованы с нуля в духе викторианской гравюры (линия + штриховка). Не Тенниел, не Disney.
import os,random,subprocess,glob,math
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
W,H=390,844
INK='#1c1a17'; RED='#a3202a'; TEAL='#1f5a4e'; GOLD='#a8863c'
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','plus':'<path d="M12 5v14M5 12h14"/>',
}
def ic(n,sz=22,w=1.6): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
HEART='M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13z'
def heart(sz=14,c=RED): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><path d="{HEART}" fill="{c}"/></svg>'
def key(sz=22,c='#c9a24e',s='#5e4512'):
    """Монета = золотой ключик с бородкой-сердечком."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><g transform="rotate(-35 20 20)" stroke="{s}" stroke-width="1.4">
<circle cx="11" cy="20" r="7.5" fill="{c}"/><circle cx="11" cy="20" r="3" fill="#fbf6ea"/><rect x="17" y="18.2" width="20" height="3.6" fill="{c}"/>
<path d="M30 21.8v5h3v-3h2v3h2v-5" fill="{c}"/><path d="M8 16.5q2-2 5-1" fill="none" stroke="#fff6d8" stroke-width="1"/></g></svg>'''
def hatch(op=.07,c='28,26,23',ang=45,gap=3): return f'repeating-linear-gradient({ang}deg,rgba({c},{op}) 0 .7px,transparent .7px {gap}px)'
def frame_corners(c=INK):
    fl=f'<svg width="26" height="26" viewBox="0 0 26 26"><path d="M2 24V8Q2 2 8 2h16" fill="none" stroke="{c}" stroke-width="1.2"/><path d="M6 24V11q0-5 5-5h13" fill="none" stroke="{c}" stroke-width=".6"/><path d="M9 12q3-3 6 0-3 3-6 0z" fill="{c}"/><circle cx="4" cy="4" r="1.4" fill="{c}"/></svg>'
    return ''.join(f'<div class="cn {p}">{fl}</div>' for p in ('tl','tr','br','bl'))
def plate(inner,cls='',style=''): return f'<div class="plate {cls}" style="{style}">{frame_corners()}{inner}</div>'
def watch(filled,tot=10,sz=60,label=True):
    """Прогресс дня: циферблат карманных часов, сектор заполняется минутами."""
    cx=cy=30;R=22;s=''
    for k in range(tot):
        a0=-math.pi/2+2*math.pi*k/tot;a1=a0+2*math.pi/tot
        if k<filled: s+=f'<path d="M{cx} {cy}L{cx+R*math.cos(a0):.2f} {cy+R*math.sin(a0):.2f}A{R} {R} 0 0 1 {cx+R*math.cos(a1):.2f} {cy+R*math.sin(a1):.2f}Z" fill="{RED}" opacity="{.75 if k%2 else .9}"/>'
    ticks=''.join(f'<line x1="{cx+R*math.cos(-math.pi/2+2*math.pi*k/tot):.2f}" y1="{cy+R*math.sin(-math.pi/2+2*math.pi*k/tot):.2f}" x2="{cx+(R-4)*math.cos(-math.pi/2+2*math.pi*k/tot):.2f}" y2="{cy+(R-4)*math.sin(-math.pi/2+2*math.pi*k/tot):.2f}" stroke="{INK}" stroke-width="1.2"/>' for k in range(tot))
    a=-math.pi/2+2*math.pi*filled/tot
    t=f'<rect x="21" y="37" width="18" height="10" fill="#fbf6ea"/><text x="30" y="45" text-anchor="middle" font-family="Fira Sans" font-weight="600" font-size="8.5" fill="{INK}">{filled}/{tot}</text>' if label else ''
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60" style="flex:none"><circle cx="30" cy="6" r="3.2" fill="none" stroke="{INK}" stroke-width="1.4"/><rect x="27" y="7" width="6" height="4" fill="#c9a24e" stroke="{INK}" stroke-width="1"/>
<circle cx="30" cy="30" r="26" fill="#c9a24e" stroke="{INK}" stroke-width="1.4"/><circle cx="30" cy="30" r="{R+1}" fill="#fbf6ea" stroke="{INK}" stroke-width="1"/>{s}{ticks}{t}
<line x1="30" y1="30" x2="{30+(R-3)*math.cos(a):.2f}" y2="{30+(R-3)*math.sin(a):.2f}" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/><circle cx="30" cy="30" r="2" fill="{INK}"/></svg>'''
def mascot(sz=84):
    """Оригинальный маскот «Минутка»: карманные часы на тонких ножках, в перчатках, с одной поднятой стрелкой-бровью."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 90 90"><g stroke="{INK}" stroke-linecap="round" fill="none">
<path d="M34 64 L28 82 M28 82h-6 M56 64 L62 82 M62 82h6" stroke-width="1.6"/>
<path d="M16 42 Q6 40 6 30 M74 42 Q84 40 86 30" stroke-width="1.6"/><circle cx="6" cy="27" r="3.4" fill="#fbf6ea" stroke-width="1.2"/><circle cx="86" cy="27" r="3.4" fill="#fbf6ea" stroke-width="1.2"/></g>
<circle cx="45" cy="9" r="4" fill="none" stroke="{INK}" stroke-width="1.6"/><rect x="41" y="12" width="8" height="5" fill="#c9a24e" stroke="{INK}"/>
<circle cx="45" cy="42" r="27" fill="#c9a24e" stroke="{INK}" stroke-width="1.6"/><circle cx="45" cy="42" r="22" fill="#fbf6ea" stroke="{INK}"/>
<path d="M27 50 q18 10 36 0" fill="none" stroke="{INK}" stroke-width=".5" opacity=".5"/>{"".join(f'<line x1="{45+22*math.cos(a):.1f}" y1="{42+22*math.sin(a):.1f}" x2="{45+19*math.cos(a):.1f}" y2="{42+19*math.sin(a):.1f}" stroke="{INK}" stroke-width="1"/>' for a in [k*math.pi/6 for k in range(12)])}
<circle cx="37" cy="40" r="2.6" fill="{INK}"/><circle cx="53" cy="40" r="2.6" fill="{INK}"/><path d="M33 33 l7 -2 M50 30 l8 3" stroke="{INK}" stroke-width="1.4"/>
<path d="M39 50 q6 4 12 0" fill="none" stroke="{INK}" stroke-width="1.4"/><path d="M45 42 L45 26" stroke="{RED}" stroke-width="1.6"/></svg>'''
def teacup(sz=60,c=TEAL):
    return f'''<svg width="{sz}" height="{sz*.8:.0f}" viewBox="0 0 60 48"><g stroke="{INK}" stroke-width="1.4" fill="#fbf6ea"><path d="M8 14h36q0 22-18 24-18-2-18-24z"/><path d="M44 18q10 0 8 8t-10 6" fill="none"/><ellipse cx="26" cy="42" rx="22" ry="4"/></g>
<path d="M12 20q14 4 28 0" stroke="{c}" stroke-width="3" fill="none"/><path d="M{26-3} 26 {heart(1)[0:0]}" />
<path d="M20 6q2-4 0-6M28 8q2-4 0-7" stroke="{INK}" stroke-width=".9" fill="none" opacity=".6"/></svg>'''
def bottle(sz=60):
    return f'''<svg width="{sz*.7:.0f}" height="{sz}" viewBox="0 0 42 60"><g stroke="{INK}" stroke-width="1.4"><rect x="16" y="2" width="10" height="6" fill="#c9a24e"/><path d="M17 8h8v10q12 4 12 18v18q0 4-4 4H9q-4 0-4-4V36q0-14 12-18z" fill="#dce9e4"/></g>
<path d="M7 40h28v14q0 2-2 2H9q-2 0-2-2z" fill="{TEAL}" opacity=".75"/><rect x="9" y="27" width="24" height="11" fill="#fbf6ea" stroke="{INK}" stroke-width=".9"/>
<text x="21" y="31.6" text-anchor="middle" font-family="Fira Sans" font-weight="700" font-size="3.6" fill="{INK}">ВЫПЕЙ</text><text x="21" y="36" text-anchor="middle" font-family="Fira Sans" font-weight="700" font-size="3.6" fill="{INK}">МЕНЯ</text></svg>'''
def teapot(sz=64):
    return f'''<svg width="{sz}" height="{sz*.8:.0f}" viewBox="0 0 70 56"><g stroke="{INK}" stroke-width="1.4" fill="#fbf6ea"><path d="M14 22q0-10 21-10t21 10v14q0 14-21 14T14 36z"/><path d="M14 26q-12-6-12 6 4 6 12 6" fill="none"/><path d="M56 26q12-8 12-18" fill="none"/><ellipse cx="35" cy="12" rx="10" ry="3"/><circle cx="35" cy="7" r="3" fill="#c9a24e"/></g>
<path d="M20 32 h30" stroke="{RED}" stroke-width="3"/><path d="M30 24l3 3 3-3 3 3" stroke="{GOLD}" stroke-width="1" fill="none"/></svg>'''
def rose(x,y,s=1,c=RED):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 14q-2 10 2 18" stroke="{TEAL}" stroke-width="1.4" fill="none"/><path d="M1 22q6-4 9 0-5 3-9 0z" fill="{TEAL}"/><circle r="7" fill="{c}" stroke="{INK}" stroke-width="1"/><path d="M-4 -1q4-5 8 0q-4 4-8 0M-2 2q2 3 4 0" stroke="{INK}" stroke-width=".8" fill="none"/></g>'
def checks(w,h=12,cell=6,c=INK,o=.85):
    s=''.join(f'<rect x="{i*cell}" y="{(i%2)*cell}" width="{cell}" height="{cell}" fill="{c}"/>' for i in range(int(w/cell)+1))
    return f'<svg width="{w}" height="{h}" style="display:block;opacity:{o}">{s}</svg>'
def falling(seed,n=9,night=False):
    r=random.Random(seed); s=''
    items=['heart','key','card','cup','watch']
    for _ in range(n):
        x=r.uniform(10,370);y=r.uniform(120,620);rot=r.uniform(-40,40);k=r.choice(items);o=.13 if not night else .25
        if k=='heart': g=f'<path d="{HEART}" fill="{RED}" transform="scale(.7)"/>'
        elif k=='key': g='<g transform="scale(.5)"><circle cx="11" cy="20" r="7" fill="none" stroke="#1c1a17" stroke-width="2"/><rect x="17" y="19" width="18" height="3" fill="#1c1a17"/></g>'
        elif k=='card': g=f'<rect width="14" height="20" rx="1.5" fill="#fbf6ea" stroke="{INK}"/><path d="{HEART}" fill="{RED}" transform="translate(3 6) scale(.35)"/>'
        elif k=='cup': g=f'<path d="M0 4h14q0 10-7 10T0 4z M14 6q4 0 3 4" fill="none" stroke="{INK}" stroke-width="1.2"/>'
        else: g=f'<circle cx="8" cy="8" r="7" fill="none" stroke="{INK}" stroke-width="1.2"/><path d="M8 8V3M8 8h4" stroke="{INK}"/>'
        s+=f'<g transform="translate({x:.0f} {y:.0f}) rotate({rot:.0f})" opacity="{o}">{g}</g>'
    return f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}">{s}</svg>'
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Fira Sans",sans-serif;color:{INK};background:#f4ecd9}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Playfair Display SC",serif;font-weight:700;letter-spacing:.4px}}.os{{font-family:"Old Standard TT",serif;font-style:italic}}
.bg{{position:absolute;inset:0;background:radial-gradient(100% 70% at 50% 30%,#f8f1e0 0,#f4ecd9 55%,#e9dcbe 100%)}}
.bg:after{{content:"";position:absolute;inset:0;background:{hatch(.035)}}}
.plate{{position:relative;background:#fbf6ea;border:1.2px solid {INK};box-shadow:0 0 0 3px #fbf6ea,0 0 0 4px {INK},0 8px 18px rgba(60,40,10,.12)}}
.cn{{position:absolute;width:26px;height:26px;line-height:0}}.cn.tl{{left:2px;top:2px}}.cn.tr{{right:2px;top:2px;transform:scaleX(-1)}}.cn.br{{right:2px;bottom:2px;transform:scale(-1)}}.cn.bl{{left:2px;bottom:2px;transform:scaleY(-1)}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:30px}}
.bal{{display:flex;align-items:center;gap:5px;padding:4px 12px 4px 4px;font-weight:600;font-size:14px;background:#fbf6ea;border:1.2px solid {INK};box-shadow:0 0 0 2px #fbf6ea,0 0 0 3px {INK};border-radius:16px}}
.nav{{position:absolute;left:12px;right:12px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 10px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:500;color:#4d4536;position:relative;padding:6px 0}}
.nav .on{{color:#fff;font-weight:600}}.nav .on:before{{content:"";position:absolute;inset:3px 10px;z-index:-1;background:{RED};border:1px solid {INK};box-shadow:inset 0 0 0 2px #fbf6ea}}
.btn{{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;font-family:"Playfair Display SC",serif;font-weight:700;letter-spacing:1px;font-size:18px;color:#fff;background:{RED};border:1.2px solid {INK};box-shadow:inset 0 0 0 3px {RED},inset 0 0 0 4px #f4d8c8,3px 3px 0 {INK}}}
.bar{{height:8px;border:1px solid {INK};background:#fbf6ea}}.bar i{{display:block;height:100%;background:{hatch(.0,'0,0,0')},{RED}}}
.cap{{font-size:12px;color:#4d4536}}
/* читалка: страница чистая */
.rd{{position:absolute;inset:0;background:#f8f3e6;color:{INK}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"EB Garamond",serif;font-size:18px;line-height:1.55;text-align:left}}
.page h3{{font-family:"Playfair Display SC",serif;font-size:19px;font-weight:700;margin-bottom:12px;letter-spacing:.3px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.page p:first-of-type::first-letter{{font-size:1em}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:#efe5cd;border-bottom:1.2px solid {INK};box-shadow:0 3px 0 #efe5cd,0 4px 0 {INK}}}
.rtop .t{{flex:1;text-align:center;font-family:"Playfair Display SC",serif;font-weight:700;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{INK}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:#efe5cd;border-top:1.2px solid {INK};box-shadow:0 -3px 0 #efe5cd,0 -4px 0 {INK};padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:10px;font-size:14px;margin-bottom:10px;font-weight:500}}
.sl{{position:relative;height:22px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:3px;background:#c9b994}}.sl .fi{{position:absolute;top:10px;left:0;height:3px;background:{RED}}}
.sl .th{{position:absolute;top:2px;margin-left:-9px;width:18px;height:18px;border-radius:50%;background:#fbf6ea;border:1.5px solid {INK};box-shadow:inset 0 0 0 3px #fbf6ea,inset 0 0 0 9px {RED}}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:12px;font-weight:500}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}
.night{{background:#0d0f1c}}.night .rd{{background:#0f1120;color:#e2dccb}}
.night .rtop,.night .rbot{{background:#161a2e;border-color:#3a4270;box-shadow:none;color:#ece4d2}}
.night .rtop .t,.night .pg,.night .tools{{color:#ece4d2}}.night .ib,.night .tools svg{{color:#a9bcff}}
.night .sl .tr{{background:#2f3658}}.night .sl .fi{{background:#ff6b6b}}.night .sl .th{{background:#161a2e;border-color:#ece4d2;box-shadow:inset 0 0 0 3px #161a2e,inset 0 0 0 9px #ff6b6b}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Чай остыл, а гости всё не расходились. Хозяйка дома то и дело поглядывала на часы над камином, но стрелки, казалось, совсем не двигались. "
 "За окном моросил дождь, и в саду темнели мокрые кусты роз. Маленькая Лиза сидела на подоконнике с книгой и думала, что самое интересное всегда случается, когда взрослые заняты разговором. ")
def reader(night=False):
    pct=97/184*100
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Безумный вечер</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">Сад за стеной</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return plate(''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it),'nav')
def bal(): return f'<div class="bal">{key(24)}390 ключей</div>'
def scene(seed): return f'<div class="bg"></div>{falling(seed)}'
SUITS={'h':HEART,'d':'M12 1L21 12 12 23 3 12z','s':'M12 2C8 8 2 10 2 15a5 5 0 0 0 9 2l-2 5h6l-2-5a5 5 0 0 0 9-2c0-5-6-7-10-13z','c':'M12 3a4.5 4.5 0 0 0-3.4 7.4A4.5 4.5 0 1 0 11 17l-2 5h6l-2-5a4.5 4.5 0 1 0 2.4-6.6A4.5 4.5 0 0 0 12 3z'}
COV=[('Сад за стеной','Н. Розова','EPUB','53%','#fbf6ea',INK,'h',RED),('Часы без стрелок','П. Минутин','FB2','12%',TEAL,'#ffffff','s','#fbf6ea'),('Шахматный лес','Е. Королёва','TXT','прочитано','checks',INK,'c',INK),
 ('Ключ от двери','Г. Замков','PDF','не начата',RED,'#ffffff','d','#fbf6ea'),('Чаепитие','М. Чашкина','EPUB','4%','#efe0b8',INK,'d',RED),('Нора','Л. Глубоков','PDF','67%','#1f2440','#ffffff','h','#ff8a8a')]
def library():
    css=f'''<style>.chips{{position:absolute;top:110px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:6px 12px;font-size:13px;font-weight:500;background:#fbf6ea;border:1px solid {INK};border-radius:14px}}.chip.on{{background:{INK};color:#fbf6ea}}
.grid{{position:absolute;top:160px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:150px;border-radius:8px;overflow:hidden;padding:34px 10px 0;text-align:center;border:1.2px solid {INK};box-shadow:inset 0 0 0 4px var(--bgc),inset 0 0 0 5px currentColor,3px 3px 0 rgba(28,26,23,.25)}}
.pip{{position:absolute;display:flex;flex-direction:column;align-items:center;font-family:"Playfair Display SC";font-weight:700;font-size:11px;line-height:1}}.pip.a{{left:9px;top:8px}}.pip.b{{right:9px;bottom:8px;transform:rotate(180deg)}}
.fmt{{position:absolute;top:10px;left:0;right:0;font-size:9.5px;font-weight:600;letter-spacing:1px}}
.ct{{font-size:16px;line-height:1.12}}.ca{{font-size:10.5px;margin-top:6px;font-weight:500}}.ctw{{background:#fbf6ea;color:{INK};padding:4px 3px;border:1px solid {INK}}}
.bt{{font-size:12.5px;font-weight:600;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:#4d4536;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,bg,fg,su,pc in COV:
        prog=f'<div class="bar" style="height:6px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        if bg=='checks':
            bgcss=f'background:conic-gradient({INK} 25%,#fbf6ea 0 50%,{INK} 0 75%,#fbf6ea 0) 0 0/20px 20px;--bgc:#fbf6ea;color:{INK}'; body=f'<div class="ctw"><div class="ct H">{t}</div><div class="ca">{a}</div></div>'
        else:
            bgcss=f'background:{bg};--bgc:{bg};color:{fg}'; body=f'<div class="ct H">{t}</div><div class="ca">{a}</div>'
        sv=f'<svg width="9" height="9" viewBox="0 0 24 24"><path d="{SUITS[su]}" fill="{pc}"/></svg>'
        pips=f'<div class="pip a" style="color:{pc}">7{sv}</div><div class="pip b" style="color:{pc}">7{sv}</div>' if bg!='checks' else ''
        cards+=f'<div class="bk"><div class="cv" style="{bgcss}">{pips}<div class="fmt" style="{"display:none" if bg=="checks" else ""}">{f}</div>{body}</div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:-12px;bottom:80px;transform:rotate(-8deg)">{mascot(86)}</div><svg class="abs" style="left:12px;bottom:84px" width="60" height="60">{rose(14,14,1)}{rose(36,22,.8)}</svg>'
    return css+scene(3)+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:center;gap:8px;font-family:"Playfair Display SC";font-weight:700;font-size:19px;margin-bottom:10px}}
.q{{display:flex;align-items:center;gap:12px;padding:14px 14px;margin-bottom:14px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:600;font-size:15px}}.q .ds{{font-size:12.5px;color:#4d4536;margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:2px;font-weight:700;font-size:15px;color:#6e5418}}
.tbl{{position:relative;padding:12px 6px 0}}.cloth{{height:16px;margin:0 -6px;background:conic-gradient({RED} 25%,#fbf6ea 0 50%,{RED} 0 75%,#fbf6ea 0) 0 0/16px 16px;border-top:1.2px solid {INK};border-bottom:1.2px solid {INK}}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;min-width:0;text-align:center}}.it .art{{height:76px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:10px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:13px;font-weight:600;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:2px;font-size:12.5px;font-weight:700;color:#6e5418;border:1px solid {INK};border-radius:2px;padding:1px 7px 1px 2px;background:#fbf6ea}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:16px;border:1.2px dashed {INK};background:rgba(251,246,234,.8)}}.add .tt{{font-weight:600;font-size:14px;color:{RED}}}.add .ds{{font-size:12.5px;color:#4d4536}}</style>'''
    q1=plate(f'{watch(6)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div><div class="bar"><i style="width:60%"></i></div></div><div class="amt">{key(20)}+30</div>','q')
    q2=plate(f'<div style="line-height:0">{checks(40,40,10,INK,.9)}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:{TEAL}"></i></div></div><div class="amt">{key(20)}+120</div>','q')
    arts=[teapot(64),teacup(60),bottle(62)]
    names=['Серия сериала','Кофе в кофейне','Новая книга']
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in arts)
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{key(16)}XXX</div></div>' for n in names)
    pk=f'<div class="abs" style="left:-14px;bottom:80px;transform:rotate(8deg)">{mascot(80)}</div>'
    return css+scene(11)+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:110px"><div class="sh">{heart(16)}Задания</div>{q1}{q2}</div>
<div class="sec" style="top:378px"><div class="sh">{heart(16,TEAL)}Чайный стол</div>{plate(f'<div class="tbl"><div class="rc">{its}</div><div class="cloth"></div><div class="tags">{tags}</div></div>')}
<div class="add"><div style="color:{RED}">{ic("plus",24)}</div><div><div class="tt">Поставить на стол</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в ключах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(28,26,23,.22)}}.sm{{position:absolute;left:20px;right:20px;top:140px;padding:28px 20px 22px;text-align:center}}
.sm h2{{font-size:27px}}.acc{{font-size:16px;color:{TEAL};margin-bottom:4px}}.sub{{font-size:13px;color:#4d4536;margin:4px 0 12px}}
.stats{{display:flex;gap:8px;margin:10px 0 14px}}.st{{flex:1;padding:8px 4px;border:1px solid {INK};background:#f4ecd9}}
.st b{{display:block;font-family:"Playfair Display SC";font-weight:700;font-size:21px;line-height:1.3}}.st span{{font-size:12px;color:#4d4536}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:500;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:10px 12px;margin:14px 0 10px;border:1px solid {INK};background:#f4ecd9}}.rw .tt{{font-weight:700;font-size:15px;color:#6e5418}}.rw .ds{{font-size:12.5px;color:#4d4536}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin:6px 0 18px}}.dots{{display:flex;gap:3px}}</style>'''
    card=lambda on: f'<svg width="14" height="19" viewBox="0 0 14 19"><rect x=".6" y=".6" width="12.8" height="17.8" rx="1.5" fill="{"#fbf6ea" if on else "#e9dcbe"}" stroke="{INK}" stroke-width="1"/>{f"<path d=\"{HEART}\" fill=\"{RED}\" transform=\"translate(3 5.5) scale(.34)\"/>" if on else ""}</svg>'
    dots=''.join(card(i<3) for i in range(4))
    inner=f'''<div class="os acc">«Чем дальше, тем чудеснее!»</div><h2 class="H">Сессия завершена</h2><div class="sub">Сад за стеной · стр. 85–98</div><div style="line-height:0;margin:0 -20px">{checks(350,12,6,INK,.85)}</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{RED}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{watch(10,10,46,False)}<div><div class="tt">+30 ключей за день</div><div class="ds">Часы завелись · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">{heart(14,"#fff")}Продолжить{heart(14,"#fff")}</div>'''
    return css+scene(5)+f'<div class="veil"></div>'+plate(inner,'sm')
SW=[('Чернила','#1c1a17','текст, линии'),('Бумага','#f4ecd9','фон'),('Экслибрис','#fbf6ea','панели'),('Пергамент','#e9dcbe','вторичный фон'),
 ('Сепия','#4d4536','вторичный текст'),('Червы','#a3202a','акцент'),('Червы тёмн.','#7e1820','нажатие'),('Сад','#1f5a4e','декор, неделя'),
 ('Золото','#c9a24e','ключи, часы'),('Золото текст','#6e5418','суммы'),('Страница','#f8f3e6','книга день'),('Розы','#a3202a','«покрашены»'),
 ('Нора','#0d0f1c','фон ночи'),('Нора: панели','#161a2e','поверхность'),('Чернильно-син.','#a9bcff','иконки ночи'),('Червы ночью','#ff6b6b','акцент ночи')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:52px 20px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}}.s{{text-align:center;font-size:11px}}.c{{height:50px;border-radius:6px;border:1.2px solid {INK};box-shadow:inset 0 0 0 3px #fbf6ea;margin-bottom:6px}}.s b{{display:block;font-weight:600}}.s span{{display:block;font-family:monospace;color:#4d4536}}.s em{{font-style:normal;color:#4d4536;font-size:10px}}.f{{margin-top:16px;font-size:14px;line-height:1.55}}</style>'
    return css+scene(2)+f'''<div class="wrap"><h1 class="H" style="font-size:24px">Палитра «Страна чудес»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:20px">Playfair Display SC — заголовки</div><div class="os" style="font-size:16px">Old Standard TT — цитаты-курсив</div><div>Fira Sans — интерфейс</div><div style="font-family:'EB Garamond';font-size:16px">EB Garamond — текст книги</div>
<div style="display:flex;gap:10px;align-items:flex-end;margin-top:6px">{key(38)}{watch(6,10,54)}{bottle(52)}{teacup(50)}{mascot(64)}</div></div></div>'''
SC=[('strana-chudes-reader-day',reader(),'','Читалка · день'),('strana-chudes-reader-night',reader(True),'night','Читалка · ночь'),('strana-chudes-library',library(),'','Библиотека'),
    ('strana-chudes-rewards',rewards(),'','Награды'),('strana-chudes-session-summary',summary(),'','Итог сессии'),('strana-chudes-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#efe5cd');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype([f for f in glob.glob(gf+'Playfair Display SC/*.ttf') if 'Bold' in f and 'Italic' not in f][0],44);fC=ImageFont.truetype(gf+'Fira Sans/FiraSans-Regular.ttf',22)
    d.text((G,16),'ReadQuest — скин «Страна чудес»',font=fH,fill=INK)
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#4d4536',anchor='ma')
    ov.save(f'{OUT}/strana-chudes-overview.png')
