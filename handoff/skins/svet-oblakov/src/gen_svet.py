# ReadQuest · скин «Свет облаков» (по мотивам настроения: море облаков на закате) — генератор макетов. Запуск: python3 gen_svet.py
# Все рисунки наши: огоньки-монеты, крылатые огни, облачный дух Пёрышко. Без чужих персонажей, логотипов, названий и ассетов.
import os,subprocess,glob,math,random
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; P='svet-oblakov'
W,H=390,844
INK='#2b2340'; T2='#5c4f6e'; VIO='#5b3f99'; AMB='#8a4a0c'; SEA='#23676e'; GOLD='#f5b955'; PEACH='#f4a98a'; LIL='#c9b6dc'; CLOUD='#fffaf5'
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
ICONS['cloud']='<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>'
ICONS['plus']='<path d="M12 5v14M5 12h14"/>'
def ic(n,sz=22,w=1.8): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_u=[0]
def uid(p): _u[0]+=1; return f'{p}{_u[0]}'
def flame(cx,cy,s,c1='#fff3c4',c2=GOLD,o=1):
    return f'<path d="M{cx} {cy-s} C{cx+s*.55} {cy-s*.35} {cx+s*.6} {cy+s*.2} {cx} {cy+s*.45} C{cx-s*.6} {cy+s*.2} {cx-s*.55} {cy-s*.35} {cx} {cy-s}z" fill="{c2}" opacity="{o}"/><path d="M{cx} {cy-s*.45} C{cx+s*.28} {cy-s*.1} {cx+s*.3} {cy+s*.2} {cx} {cy+s*.35} C{cx-s*.3} {cy+s*.2} {cx-s*.28} {cy-s*.1} {cx} {cy-s*.45}z" fill="{c1}" opacity="{o}"/>'
def coin(sz=22):
    """Огонёк: тёплый диск-ореол, в нём язычок пламени и два маленьких крыла света (наш рисунок)."""
    g=uid('cg')
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff2c8"/><stop offset=".6" stop-color="#f7c46a"/><stop offset="1" stop-color="#e08a4a"/></radialGradient></defs>
<circle cx="20" cy="20" r="18.5" fill="url(#{g})" stroke="#9a5418" stroke-width="1.2"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#fff6dd" stroke-width="1" opacity=".9"/>
<path d="M17 23c-4-1-8-4-9-8 3 2 6 2 9 4zM23 23c4-1 8-4 9-8-3 2-6 2-9 4z" fill="#fff8e6" stroke="#9a5418" stroke-width=".8"/>
<path d="M20 9c4 5 5 9 0 15-5-6-4-10 0-15z" fill="#fffdf2" stroke="#9a5418" stroke-width="1"/><path d="M20 15c2 3 2 5 0 7-2-2-2-4 0-7z" fill="#f2a24a"/>
<path d="M15 28h10" stroke="#9a5418" stroke-width="1.2" stroke-linecap="round"/></svg>'''
def lights(filled,tot=10,w=150,night=False,label=True):
    """Цель дня — «дорожка огоньков»: 10 фонариков по пологой дуге облака, 1 минута = 1 огонёк. Пустые — сиреневый контур."""
    out=''; n=tot
    for k in range(n):
        x=8+k*(w-16)/(n-1); y=16-8*math.sin(math.pi*k/(n-1))+6
        if k<filled: out+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6.5" fill="{GOLD}" opacity=".35"/>'+flame(x,y,6)
        else: out+=f'<circle cx="{x:.1f}" cy="{y+1:.1f}" r="3" fill="none" stroke="{"#6d6aa0" if night else "#9d8cb8"}" stroke-width="1.2"/>'
    cl=f'<path d="M2 34 q10-8 22-3 q8-7 20-2 q10-6 22 0 q10-5 22 1 q10-6 22 0 q12-5 22 1 q8-2 14 3z" fill="{"#2a3170" if night else "#fff"}" opacity=".9"/>'
    t=f'<text x="{w/2}" y="44" text-anchor="middle" font-family="Montserrat Alternates" font-weight="600" font-size="10" fill="{"#f1ecff" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{48 if label else 36}" viewBox="0 0 {w} {48 if label else 36}" style="flex:none">{cl}{out}{t}</svg>'
def wing(sz=24,on=True,night=False):
    """Неделя: крылатый огонь. Зажжён — золотое пламя с крыльями света, не зажжён — сиреневый контур."""
    if on:
        return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><circle cx="12" cy="13" r="10" fill="{GOLD}" opacity=".28"/><path d="M10 15C6 15 3 12 2 8c3 2 5 3 8 3zM14 15c4 0 7-3 8-7-3 2-5 3-8 3z" fill="#fff8e6" stroke="#b46a1e" stroke-width=".8"/>{flame(12,12,8)}</svg>'
    c='#6d6aa0' if night else '#a796c2'
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><path d="M10 15C6 15 3 12 2 8c3 2 5 3 8 3zM14 15c4 0 7-3 8-7-3 2-5 3-8 3z" fill="none" stroke="{c}" stroke-width="1"/><path d="M12 4c4 5 4 8 0 12-4-4-4-7 0-12z" fill="none" stroke="{c}" stroke-width="1.2"/></svg>'
def spirit(sz=96):
    """Маскот «Пёрышко» — облачный дух: пухлое облачко с круглой мордочкой, длинный струящийся шарф-плащ цвета заката, огонёк-хохолок."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 100 100"><circle cx="50" cy="52" r="40" fill="{GOLD}" opacity=".18"/>
<path d="M60 62 C74 66 84 60 94 70 C86 70 82 76 72 76 C82 82 80 88 90 92 C74 92 64 82 56 72z" fill="{PEACH}" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M64 70 C72 74 78 74 84 76" fill="none" stroke="#e07f66" stroke-width="1.2"/>
<path d="M26 72 C14 72 12 58 22 55 C18 42 34 34 42 42 C46 30 64 30 66 44 C78 42 84 56 74 64 C80 74 66 80 58 74 C52 82 34 82 26 72z" fill="#fff" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M30 62 C40 70 58 70 68 62" fill="none" stroke="{PEACH}" stroke-width="7" stroke-linecap="round"/>
<path d="M34 54 q3-3 6 0M54 54 q3-3 6 0" fill="none" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="32" cy="59" r="2.6" fill="#f6b3a5"/><circle cx="62" cy="59" r="2.6" fill="#f6b3a5"/><path d="M45 58 q2 2 4 0" fill="none" stroke="{INK}" stroke-width="1.4" stroke-linecap="round"/>
{flame(50,24,9)}<path d="M50 33v4" stroke="{INK}" stroke-width="1.2"/></svg>'''
def sparks(seed=3,n=14,area=(0,0,W,H),c=GOLD,o=.8):
    r=random.Random(seed); s=''
    for _ in range(n):
        x=r.uniform(area[0],area[2]); y=r.uniform(area[1],area[3]); k=r.uniform(1.5,3.2)
        s+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{k*2.2:.1f}" fill="{c}" opacity="{o*.25:.2f}"/><path d="M{x:.0f} {y-k*1.8:.1f}L{x+k*.5:.1f} {y:.0f}L{x:.0f} {y+k*1.8:.1f}L{x-k*.5:.1f} {y:.0f}z" fill="#fff6d8" opacity="{o}"/>'
    return s
def clouds(o=1):
    """Декор фона: закатное солнце, слои облаков внизу, искры духов. На странице книги не бывает."""
    return f'''<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff1c9"/><stop offset=".4" stop-color="#ffd28c" stop-opacity=".8"/><stop offset="1" stop-color="#ffd28c" stop-opacity="0"/></radialGradient></defs><g opacity="{o}">
<circle cx="300" cy="560" r="170" fill="url(#sun)"/>
<path d="M-10 640 q40-30 90-12 q30-34 90-10 q40-28 90 0 q40-26 80 4 q30-10 70 6 V860 H-10z" fill="#fbe7ef" opacity=".9"/>
<path d="M-10 700 q50-26 100-6 q40-30 100-4 q50-22 100 4 q50-20 110 2 V860 H-10z" fill="#fff6f2"/>
<path d="M-10 770 q60-20 120-2 q60-24 130 0 q60-18 150 4 V860 H-10z" fill="#ffffff"/><rect x="0" y="800" width="390" height="60" fill="#ffffff"/>
<path d="M0 230 q20-10 44-2 q14-12 34 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".8"/>
<path d="M300 300 q20-10 44-2 q14-12 40 0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".7"/>
{sparks(7,12,(10,140,380,620))}</g></svg>'''
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Raleway",sans-serif;font-weight:500;color:{INK};background:#f8e6dc}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Philosopher",serif;font-weight:700}}.num{{font-family:"Montserrat Alternates",sans-serif;font-weight:600}}
.bg{{position:absolute;inset:0;background:linear-gradient(180deg,#e7dcf3 0,#f3dfe8 30%,#fbe3d3 58%,#fde9d6 100%)}}
.card{{position:relative;background:rgba(255,250,245,.94);border-radius:22px;box-shadow:0 0 0 1px rgba(201,182,220,.55),0 6px 22px rgba(91,63,153,.12),inset 0 1px 0 #fff}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:30px}}
.bal{{display:flex;align-items:center;gap:6px;padding:4px 14px 4px 4px;font-weight:600;font-size:14px;background:{CLOUD};border-radius:20px;box-shadow:0 0 0 1px {LIL},0 0 14px rgba(245,185,85,.45)}}
.nav{{position:absolute;left:14px;right:14px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 8px;isolation:isolate;border-radius:33px}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:600;color:{T2};position:relative;padding:6px 0}}
.nav .on{{color:#fff;font-weight:700}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;z-index:-1;background:linear-gradient(180deg,#6c4fae,{VIO});border-radius:24px;box-shadow:0 0 12px rgba(245,185,85,.55)}}
.btn{{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;font-family:"Philosopher",serif;font-weight:700;font-size:19px;color:#fff;background:linear-gradient(180deg,#6c4fae,{VIO});border-radius:26px;box-shadow:0 0 0 2px #fff,0 0 18px rgba(245,185,85,.7),0 6px 14px rgba(91,63,153,.3)}}
.bar{{height:8px;background:#efe3ef;border-radius:4px}}.bar i{{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#f0a35e,#d9763c)}}
.cap{{font-size:12px;color:{T2}}}
/* читалка: страница чистая — без облаков, искр и маскота */
.rd{{position:absolute;inset:0;background:#fdf8f2;color:{INK}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"Noto Serif",serif;font-size:16.5px;line-height:1.65}}
.page h3{{font-family:"Philosopher",serif;font-weight:700;font-size:21px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:linear-gradient(180deg,#efe2f2,#fbe6dc);box-shadow:0 1px 0 {LIL}}}
.rtop .t{{flex:1;text-align:center;font-family:"Philosopher",serif;font-weight:700;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{INK}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(0deg,#efe2f2,#fbe6dc);box-shadow:0 -1px 0 {LIL};padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;font-size:14px;margin-bottom:10px;font-weight:600}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:4px;border-radius:2px;background:#d8cbe3}}.sl .fi{{position:absolute;top:10px;left:0;height:4px;border-radius:2px;background:{VIO}}}
.sl .th{{position:absolute;top:2px;margin-left:-10px;width:20px;height:20px;border-radius:50%;background:{VIO};border:2px solid #fdf8f2;box-shadow:0 0 0 2px {VIO},0 0 10px rgba(245,185,85,.8)}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:12px;font-weight:600}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}
.night{{background:#0d1230}}.night .rd{{background:#0f1330;color:#e8e4f4}}
.night .rtop{{background:linear-gradient(180deg,#141a46,#1a2050);box-shadow:0 1px 0 #2e3570}}.night .rbot{{background:linear-gradient(0deg,#141a46,#1a2050);box-shadow:0 -1px 0 #2e3570}}
.night .rtop .t,.night .pg,.night .tools{{color:#f1ecff}}.night .ib,.night .tools svg{{color:#ffc46b}}
.night .sl .tr{{background:#343b78}}.night .sl .fi{{background:#ffc46b}}.night .sl .th{{background:#ffc46b;border-color:#0f1330;box-shadow:0 0 0 2px #ffc46b,0 0 12px rgba(255,196,107,.6)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Ветер поднялся снизу, из-под облачного моря, и принёс запах тёплого камня. Лия поставила свечу на край площадки и долго смотрела, как огонёк клонится то к западу, то к востоку. "
 "Маяк молчал уже третий вечер. Старик Ефим говорил, что свет в нём не гаснет, а просто уходит дальше, к тем, кому он сейчас нужнее. "
 "Она не верила, но каждый вечер всё равно приносила новую свечу. ")
def stars(n=10,seed=5,box=(0,0,W,96)):
    r=random.Random(seed); return ''.join(f'<circle cx="{r.uniform(box[0],box[2]):.0f}" cy="{r.uniform(box[1],box[3]):.0f}" r="{r.uniform(.5,1.2):.1f}" fill="#fff" opacity="{r.uniform(.4,.9):.2f}"/>' for _ in range(n))
def reader(night=False):
    pct=97/184*100
    st=f'<svg class="abs" style="left:0;top:0" width="{W}" height="44">{stars(18,5,(0,4,W,40))}</svg>' if night else ''
    return f'''<div class="rd"><div class="page"><h3>Глава 5. Тёплый ветер</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop">{st}<div class="ib">{ic("arrow-left")}</div><div class="t">Свеча для маяка</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="card nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{coin(26)}<span class="num" style="font-size:15px">390</span> огоньков</div>'
def scene(): return f'<div class="bg"></div>{clouds()}'
COV=[('Свеча для маяка','Л. Ветрова','EPUB','53%','linear-gradient(180deg,#5b3f99,#93496f)','#fff'),('Город над облаками','М. Зорин','FB2','12%','linear-gradient(180deg,#fde2c4,#f4a98a)',INK),('Песня ветра','А. Небесная','TXT','прочитано','linear-gradient(180deg,#1d5258,#2f6f76)','#fff'),
 ('Крылья из бумаги','Е. Лёгкая','PDF','не начата','linear-gradient(180deg,#fff,#e7dcf3)',INK),('Острова тумана','В. Облакова','EPUB','4%','linear-gradient(180deg,#2b2340,#5b3f99)','#fff4dc'),('Последний рассвет','Н. Светлов','PDF','67%','linear-gradient(180deg,#f7c46a,#e08a4a)',INK)]
def library():
    css=f'''<style>.chips{{position:absolute;top:112px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:6px 13px;font-size:14px;font-weight:600;color:{T2};border-radius:16px;background:rgba(255,250,245,.85);box-shadow:0 0 0 1px {LIL}}}.chip.on{{color:#fff;background:{VIO};box-shadow:0 0 10px rgba(245,185,85,.6)}}
.grid{{position:absolute;top:162px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:150px;overflow:hidden;padding:34px 8px 0;text-align:center;border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.7),0 6px 14px rgba(91,63,153,.18)}}
.cv .cl{{position:absolute;left:-6px;right:-6px;bottom:-4px;height:40px;background:radial-gradient(22px 16px at 20% 70%,rgba(255,255,255,.75) 98%,transparent),radial-gradient(28px 20px at 55% 80%,rgba(255,255,255,.75) 98%,transparent),radial-gradient(22px 16px at 88% 72%,rgba(255,255,255,.75) 98%,transparent)}}
.fmt{{position:absolute;top:10px;left:0;right:0;font-size:9.5px;font-weight:700;letter-spacing:1.5px}}
.ct{{font-size:13px;line-height:1.2;position:relative}}.ca{{font-size:10.5px;margin-top:6px;position:relative}}
.bt{{font-size:12.5px;font-weight:700;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:{T2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,bg,fg in COV:
        prog=f'<div class="bar" style="height:5px;margin-top:6px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg}"><div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div><div class="cl"></div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:0;bottom:82px">{spirit(92)}</div>'
    return css+scene()+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def lantern(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="20" fill="{GOLD}" opacity=".3"/><path d="M30 4v6" stroke="{INK}" stroke-width="1.4"/>
<path d="M22 12h16l4 8v18l-4 8H22l-4-8V20z" fill="#fff4e0" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M18 20h24M18 38h24" stroke="{INK}" stroke-width="1.2"/>{flame(30,30,8)}</svg>'''
def kite(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><g stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"><path d="M30 4l16 18-16 18-16-18z" fill="{PEACH}"/><path d="M30 4v36M14 22h32" fill="none" stroke-width="1"/></g>
<path d="M30 40c-4 6 4 8 0 14" fill="none" stroke="{INK}" stroke-width="1.2"/><path d="M27 46l3 2 3-2M27 52l3 2 3-2" fill="none" stroke="{VIO}" stroke-width="1.4"/></svg>'''
def shell(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><g stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"><path d="M30 10c-12 0-20 10-22 26h44C50 20 42 10 30 10z" fill="#e7dcf3"/>
<path d="M30 10v26M30 10l-12 26M30 10l12 26M30 10l-20 22M30 10l20 22" fill="none" stroke-width="1"/><path d="M24 36h12v6H24z" fill="{GOLD}"/><path d="M30 42v8" /></g><circle cx="30" cy="52" r="3" fill="{GOLD}" stroke="{INK}" stroke-width="1.2"/></svg>'''
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:baseline;gap:10px;font-family:Philosopher;font-weight:700;font-size:21px;margin-bottom:10px}}.sh .sm{{font-family:Raleway;font-weight:600;font-size:13px;color:{SEA}}}
.q{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:700;font-size:15px}}.q .ds{{font-size:12.5px;color:{T2};margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:700;font-size:15px;color:{AMB}}}
.ter{{padding:10px 8px 0;overflow:hidden}}.isl{{height:22px;margin:0 -8px;background:radial-gradient(40px 18px at 15% 100%,#fff 98%,transparent),radial-gradient(60px 22px at 50% 100%,#fff 98%,transparent),radial-gradient(40px 18px at 85% 100%,#fff 98%,transparent),linear-gradient(180deg,transparent 60%,#fff 60%)}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;text-align:center}}.it .art{{height:66px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:4px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:13px;font-weight:700;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:700;color:{AMB}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:16px;border:1.5px dashed #9d8cb8;border-radius:22px;background:rgba(255,250,245,.92)}}.add .tt{{font-weight:700;font-size:14px;color:{VIO}}}.add .ds{{font-size:12.5px;color:{T2}}}</style>'''
    q1=f'<div class="card q"><div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div>{lights(6,10,170,label=False)}</div><div class="amt">{coin(20)}+30</div></div>'
    ws=''.join(wing(26,i<3) for i in range(4))
    q2=f'<div class="card q"><div style="display:grid;grid-template-columns:repeat(2,26px);gap:4px;flex:none">{ws}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:linear-gradient(90deg,#3f8a8f,{SEA})"></i></div></div><div class="amt">{coin(20)}+120</div></div>'
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in (lantern(),kite(),shell()))
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
    pk=f'<div class="abs" style="left:2px;bottom:80px">{spirit(80)}</div>'
    return css+scene()+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:112px"><div class="sh">Задания</div>{q1}{q2}</div>
<div class="sec" style="top:378px"><div class="sh">Облачная терраса <span class="sm">награды за прочитанное</span></div><div class="card ter"><div class="rc">{its}</div><div class="isl"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{VIO}">{ic("plus",24)}</div><div><div class="tt">Добавить на террасу</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в огоньках.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(43,35,64,.22)}}.sm{{position:absolute;left:20px;right:20px;top:120px;padding:24px 20px 22px;text-align:center}}
.sm h2{{font-size:27px}}.sub{{font-size:13px;color:{T2};margin:6px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;gap:8px}}.st{{flex:1;padding:8px 4px;border-radius:16px;background:#f6ecf3}}
.st b{{display:block;font-family:"Montserrat Alternates";font-weight:600;font-size:22px;line-height:1.35}}.st span{{font-size:12px;color:{T2}}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:600;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 0 8px;margin:12px 0 8px;border-top:1.5px solid #eadff0}}.rw .tt{{font-weight:700;font-size:15px;color:{AMB}}}.rw .ds{{font-size:12.5px;color:{T2}}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;margin:4px 0 18px}}.dots{{display:flex;gap:5px}}</style>'''
    dots=''.join(wing(26,i<3) for i in range(4))
    top=f'<svg width="160" height="46" viewBox="0 0 160 46"><circle cx="80" cy="24" r="20" fill="{GOLD}" opacity=".3"/>{flame(80,22,13)}<path d="M66 32c-12 0-22-6-26-14 8 4 16 6 26 6zM94 32c12 0 22-6 26-14-8 4-16 6-26 6z" fill="#fff8e6" stroke="#b46a1e" stroke-width="1"/>{sparks(2,5,(20,4,140,40))}</svg>'
    inner=f'''<div style="line-height:0">{top}</div><h2 class="H" style="margin-top:4px">Сессия завершена</h2><div class="sub">Свеча для маяка · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{VIO}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{lights(10,10,96,label=False)}<div style="flex:1"><div class="tt" style="display:flex;align-items:center;gap:6px">{coin(22)}+30 огоньков за день</div><div class="ds">Все 10 огней горят · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene()+f'<div class="veil"></div><div class="card sm">{inner}</div>'
SW=[('Сумерки','#2b2340','текст'),('Закатный фон','#f8e6dc','фон'),('Облако','#fffaf5','карточки'),('Сирень светл.','#f3e4ec','вторичный'),
 ('Туман','#5c4f6e','вторичный текст'),('Вечерний','#5b3f99','акцент'),('Вечерний тёмн.','#46307a','нажатие'),('Море','#23676e','неделя, успех'),
 ('Сияние','#f5b955','только декор'),('Персик','#f4a98a','только декор'),('Огонёк текст','#8a4a0c','суммы'),('Страница','#fdf8f2','книга день'),
 ('Звёздное небо','#0d1230','фон ночи'),('Ночь: облако','#1a2050','поверхность'),('Свеча','#ffc46b','акцент ночи'),('Ночь: текст','#e8e4f4','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:52px 20px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}}.s{{text-align:center;font-size:10.5px}}.c{{height:46px;border-radius:14px;box-shadow:0 0 0 1px {LIL};margin-bottom:6px}}.s b{{display:block;font-weight:700;line-height:1.15}}.s span{{display:block;font-family:monospace;color:{T2}}}.s em{{font-style:normal;color:{T2};font-size:10px}}.f{{margin-top:14px;font-size:14px;line-height:1.55}}</style>'
    return css+scene()+f'''<div class="wrap"><h1 class="H" style="font-size:22px">Палитра «Свет облаков»</h1><div class="g">{sw}</div>
<div class="card f" style="padding:12px 14px"><div class="H" style="font-size:20px">Philosopher — заголовки</div><div class="num" style="font-size:16px">Montserrat Alternates — 18 мин · +180</div><div>Raleway — интерфейс</div><div style="font-family:'Noto Serif';font-size:15px">Noto Serif — текст книги</div>
<div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px">{coin(38)}{wing(30)}{wing(30,False)}{lantern(48)}{spirit(76)}</div><div style="margin-top:4px">{lights(6,10,200)}</div></div></div>'''
SC=[(P+'-reader-day',reader(),'','Читалка · день'),(P+'-reader-night',reader(True),'night','Читалка · ночь'),(P+'-library',library(),'','Библиотека'),
    (P+'-rewards',rewards(),'','Награды'),(P+'-session-summary',summary(),'','Итог сессии'),(P+'-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    # сводка — в самом конце, из финальных PNG
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#f3dfe8');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(gf+'Philosopher/Philosopher-Bold.ttf',46);fC=ImageFont.truetype(glob.glob(gf+'Raleway/Raleway-VariableFont*.ttf')[0],22)
    d.text((G,16),'ReadQuest — скин «Свет облаков»',font=fH,fill=INK)
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill=T2,anchor='ma')
    ov.save(f'{OUT}/{P}-overview.png')
