# ReadQuest · скин «Золотой век» — генератор макетов. Запуск: python3 gen_zolotoy.py
# Все рисунки — наши: быстрые перьевые наброски «в манере» черновиков, без копий автографов.
import os,random,subprocess,glob,math
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
W,H=390,844
INK='#2a1d14'; BOR='#7a1f2b'; GRN='#2c4a35'; GILT='#b8923f'; GT='#6b4f14'
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
'quill':'<path d="M20 3C12 4 7 10 5 19l-1 2M20 3c-1 6-5 10-11 11M14 8l-4 4"/>',
}
def ic(n,sz=22,w=1.6): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
def coin(sz=22):
    """Монета = золотой «империал» в нашем рисунке: лавровый венок по кругу, перо в центре, гурт точками."""
    leaves=''.join(f'<ellipse cx="{20+13*math.cos(a):.2f}" cy="{20+13*math.sin(a):.2f}" rx="2.3" ry="1" transform="rotate({math.degrees(a)+60:.0f} {20+13*math.cos(a):.2f} {20+13*math.sin(a):.2f})" fill="#7a5a12"/>' for a in [math.pi*(0.6+k*0.16) for k in range(6)]+[math.pi*(0.4-k*0.16) for k in range(6)])
    dots=''.join(f'<circle cx="{20+17.3*math.cos(k*math.pi/14):.2f}" cy="{20+17.3*math.sin(k*math.pi/14):.2f}" r=".7" fill="#7a5a12"/>' for k in range(28))
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="cz" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fbe7a8"/><stop offset=".55" stop-color="#d4ab4f"/><stop offset="1" stop-color="#9c7425"/></radialGradient></defs>
<circle cx="20" cy="20" r="19" fill="url(#cz)" stroke="#5e4310" stroke-width="1.2"/>{dots}<circle cx="20" cy="20" r="15.5" fill="none" stroke="#7a5a12" stroke-width=".8"/>{leaves}
<path d="M26 11C20 12 16 17 15 26l-1 3M26 11c-1 5-4 8-9 9" fill="none" stroke="#4a3208" stroke-width="1.4" stroke-linecap="round"/></svg>'''
def seal(sz=40,c=BOR,letter='Р'):
    r=random.Random(sz); pts=' '.join(f'{20+(15+r.uniform(-1.6,1.8))*math.cos(k*math.pi/12):.1f},{20+(15+r.uniform(-1.6,1.8))*math.sin(k*math.pi/12):.1f}' for k in range(24))
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><polygon points="{pts}" fill="{c}" stroke="#3d0d14" stroke-width=".8"/><circle cx="20" cy="20" r="10" fill="none" stroke="#f3c9b8" stroke-opacity=".55" stroke-width="1"/>
<text x="20" y="25" text-anchor="middle" font-family="Prata" font-size="13" fill="#f6d6c8" fill-opacity=".85">{letter}</text><ellipse cx="14" cy="13" rx="3" ry="1.6" fill="#fff" opacity=".25" transform="rotate(-30 14 13)"/></svg>'''
def candle(filled,tot=10,sz=58,label=True,night=False):
    """Прогресс дня: свеча-часы с метками; прочитанные минуты — растаявшие деления (воск стекает), пламя горит."""
    top=8; h=40; seg=h/tot; burn=filled*seg
    marks=''.join(f'<line x1="21" y1="{top+12+k*seg:.1f}" x2="26" y2="{top+12+k*seg:.1f}" stroke="{BOR}" stroke-width=".9"/>' for k in range(tot+1))
    used=f'<rect x="20" y="{top+12}" width="14" height="{burn:.1f}" fill="#ffe7a8" opacity=".35"/><path d="M20 {top+12+burn:.1f} q3 3 0 6 M34 {top+12+burn:.1f} q-2 4 0 8" stroke="#efe3c6" stroke-width="2" fill="none"/>' if filled<tot else ''
    wy=top+12+burn
    flame=f'<path d="M27 {wy-14:.1f} q-5 7 0 12 q5 -5 0 -12z" fill="#f5b431"/><path d="M27 {wy-9:.1f} q-2 4 0 6 q2 -2 0 -6z" fill="#fff4c8"/><line x1="27" y1="{wy-3:.1f}" x2="27" y2="{wy:.1f}" stroke="{INK}" stroke-width="1"/>'
    glow=f'<circle cx="27" cy="{wy-8:.1f}" r="16" fill="#ffd27a" opacity="{.35 if night else .22}"/>'
    t=f'<text x="46" y="38" text-anchor="middle" font-family="IBM Plex Sans" font-weight="600" font-size="10" fill="{INK}">{filled}/{tot}</text>' if label else ''
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 58 58" style="flex:none">{glow}<rect x="20" y="{wy:.1f}" width="14" height="{top+12+h-wy:.1f}" fill="#f6efdc" stroke="{INK}" stroke-width="1.1"/>{used}{marks}
{flame}<path d="M12 {top+h+12:.1f} h30 l-3 4 h-24z" fill="{GILT}" stroke="{INK}" stroke-width="1"/>{t}</svg>'''
def profile(x,y,s=1,c=INK,o=.55,flip=False):
    """Набросок профиля на полях: несколько быстрых линий пером (наш рисунок)."""
    f=' scale(-1,1)' if flip else ''
    return f'''<g transform="translate({x} {y}) scale({s}){f}" fill="none" stroke="{c}" stroke-width="1.1" stroke-linecap="round" opacity="{o}">
<path d="M10 2 q-6 2 -6 10 q0 4 -3 7 l3 1 q-1 3 1 4 q-1 2 1 3 q-1 3 3 4 q4 0 6 4"/><path d="M10 2 q10 -2 14 6 q3 8 -2 16 q-2 4 -1 10"/>
<path d="M12 3 q8 -6 14 2 M14 1 q6 -4 12 1 M22 7 q4 2 3 7" stroke-width=".8"/><path d="M8 13 h2" stroke-width=".9"/></g>'''
def blot(x,y,s=1,c=INK,o=.7):
    return f'<g transform="translate({x} {y}) scale({s})" opacity="{o}"><path d="M0 0 q4 -6 9 -2 q6 -3 6 3 q5 3 0 7 q1 5 -5 4 q-4 4 -8 0 q-6 1 -4 -5 q-4 -4 2 -7z" fill="{c}"/><circle cx="17" cy="-4" r="1.3" fill="{c}"/><circle cx="-5" cy="9" r=".9" fill="{c}"/></g>'
def scribble(x,y,w=70,c=INK,o=.5):
    """Зачёркнутая строка черновика — декор."""
    r=random.Random(int(x+y)); d=f'M{x} {y}'+''.join(f' q{r.uniform(2,5):.1f} {r.uniform(-3,3):.1f} {r.uniform(5,9):.1f} 0' for _ in range(int(w/8)))
    return f'<g opacity="{o}" fill="none" stroke="{c}" stroke-linecap="round"><path d="{d}" stroke-width=".9"/><path d="M{x-2} {y+1} L{x+w} {y-2}" stroke-width="1.3"/><path d="M{x} {y-2} L{x+w-6} {y+2}" stroke-width="1"/></g>'
def laurel(w=120,c=GRN):
    s=''
    for side in (-1,1):
        for k in range(6):
            t=k/5; x=60+side*(10+t*46); y=10-4*math.sin(t*math.pi)+t*2
            s+=f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="5" ry="2" transform="rotate({side*(-20-20*t):.0f} {x:.1f} {y:.1f})" fill="{c}"/>'
        s+=f'<path d="M60 12 Q{60+side*30} 16 {60+side*58} 10" stroke="{c}" stroke-width="1" fill="none"/>'
    return f'<svg width="{w}" height="22" viewBox="0 0 120 22">{s}<circle cx="60" cy="12" r="2" fill="{GILT}"/></svg>'
def mascot(sz=96):
    """Оригинальный маскот «Кот учёный» — наш рисунок пером: в очках, с пером за ухом, с книгой; на шее — тонкая золотая цепь."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 100 100"><g fill="none" stroke="{INK}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
<path d="M28 92 q-6 -24 6 -40 q-6 -10 -2 -22 l8 10 q10 -4 20 0 l8 -10 q4 12 -2 22 q12 16 6 40" fill="#f3ead6"/>
<path d="M78 90 q16 -4 14 -20 q-2 -8 -8 -6" />
<circle cx="42" cy="40" r="6" fill="#faf5e8"/><circle cx="58" cy="40" r="6" fill="#faf5e8"/><path d="M48 40 h4"/>
<path d="M42 40 h.1 M58 40 h.1" stroke-width="3"/><path d="M47 49 l3 2 3 -2 M50 51 v3 q-3 3 -6 1 M50 54 q3 3 6 1"/>
<path d="M30 48 l-10 -2 M30 51 l-10 2 M70 48 l10 -2 M70 51 l10 2" stroke-width="1"/>
<path d="M66 22 C76 16 84 6 94 4 C88 12 82 18 70 26" fill="#faf5e8" stroke-width="1.2"/><path d="M70 22 l14 -12" stroke-width=".8"/></g>
<path d="M34 62 q16 8 32 0" fill="none" stroke="{GILT}" stroke-width="2.2" stroke-dasharray="3 1.5"/>
<g stroke="{INK}" stroke-width="1.4"><path d="M34 78 l16 -4 16 4 v12 l-16 -4 -16 4z" fill="{BOR}"/><path d="M50 74 v12" /></g></svg>'''
def column(h=200,o=.25):
    return f'''<svg width="34" height="{h}" viewBox="0 0 34 {h}" style="opacity:{o}"><g fill="none" stroke="{INK}" stroke-width="1"><path d="M2 2h30v6H2zM5 8h24v4H5z"/><path d="M8 12v{h-30}M26 12v{h-30}"/>
{''.join(f'<path d="M{11+k*3.6:.1f} 14v{h-34}" stroke-width=".6"/>' for k in range(5))}<path d="M5 {h-18}h24v6H5zM2 {h-12}h30v10H2z"/></g></svg>'''
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"IBM Plex Sans",sans-serif;color:{INK};background:#f3ead6}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Prata",serif;font-weight:400;letter-spacing:.3px}}.hw{{font-family:"Bad Script",cursive}}
.bg{{position:absolute;inset:0;background:radial-gradient(110% 70% at 40% 25%,#f8f1df 0,#f3ead6 55%,#e6d7b6 100%)}}
.bg:after{{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,rgba(122,80,30,.07),transparent 30%),radial-gradient(circle at 10% 70%,rgba(122,80,30,.06),transparent 30%)}}
.sheet{{position:relative;background:#faf5e8;border:1px solid #cdbb94;box-shadow:0 1px 0 #fff inset,2px 3px 0 rgba(42,29,20,.08),0 8px 18px rgba(80,50,20,.10)}}
.sheet.rule:before{{content:"";position:absolute;left:10px;right:10px;top:6px;height:0;border-top:1px solid {GILT};box-shadow:0 2px 0 #faf5e8,0 3px 0 {GILT}}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:30px}}
.bal{{display:flex;align-items:center;gap:6px;padding:4px 12px 4px 4px;font-weight:600;font-size:14px;background:#faf5e8;border:1px solid #cdbb94;border-radius:18px;color:{INK}}}
.nav{{position:absolute;left:12px;right:12px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 10px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:500;color:#5a4632;position:relative;padding:6px 0}}
.nav .on{{color:#fff;font-weight:600}}.nav .on:before{{content:"";position:absolute;inset:3px 10px;z-index:-1;background:{GRN};border-radius:3px;box-shadow:inset 0 0 0 1px #faf5e8,inset 0 0 0 2px {GILT}}}
.btn{{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;font-family:"Prata",serif;letter-spacing:1px;font-size:18px;color:#fff;background:{BOR};border-radius:3px;box-shadow:inset 0 0 0 2px {BOR},inset 0 0 0 3px #e9c98a,0 6px 14px rgba(90,20,30,.25)}}
.bar{{height:6px;background:#e8dcc0;border-radius:3px}}.bar i{{display:block;height:100%;border-radius:3px;background:{INK}}}
.cap{{font-size:12px;color:#5a4632}}
/* читалка: страница чистая */
.rd{{position:absolute;inset:0;background:#f7f0e0;color:{INK}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"Vollkorn",serif;font-size:17px;line-height:1.6;text-align:left}}
.page h3{{font-family:"Prata",serif;font-weight:400;font-size:20px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:#ece0c4;border-bottom:1px solid {GILT};box-shadow:0 2px 0 #ece0c4,0 3px 0 {GILT}}}
.rtop .t{{flex:1;text-align:center;font-family:"Prata",serif;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{INK}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:#ece0c4;border-top:1px solid {GILT};box-shadow:0 -2px 0 #ece0c4,0 -3px 0 {GILT};padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:10px;font-size:14px;margin-bottom:10px;font-weight:500}}
.sl{{position:relative;height:22px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:2px;background:#c9b48a}}.sl .fi{{position:absolute;top:10px;left:0;height:2px;background:{BOR}}}
.sl .th{{position:absolute;top:2px;margin-left:-9px;width:18px;height:18px;border-radius:50%;background:{BOR};border:2px solid #f7f0e0;box-shadow:0 0 0 1px {BOR}}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:12px;font-weight:500}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}
.night{{background:#140d08}}.night .rd{{background:#15100b;color:#e8dcc4}}
.night .rtop{{background:radial-gradient(60% 140% at 50% 120%,rgba(232,170,80,.16),transparent 70%),#20160e;border-color:#6b5428;box-shadow:0 2px 0 #20160e,0 3px 0 #6b5428}}
.night .rbot{{background:radial-gradient(60% 120% at 50% -20%,rgba(232,170,80,.16),transparent 70%),#20160e;border-color:#6b5428;box-shadow:0 -2px 0 #20160e,0 -3px 0 #6b5428}}
.night .rtop .t,.night .pg,.night .tools{{color:#f0e2c6}}.night .ib,.night .tools svg{{color:#e8c27a}}
.night .sl .tr{{background:#4a3825}}.night .sl .fi{{background:#e8c27a}}.night .sl .th{{background:#e8c27a;border-color:#15100b;box-shadow:0 0 0 1px #e8c27a,0 0 10px rgba(232,194,122,.5)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Осень в тот год выдалась долгой и тёплой. Николай Петрович вставал рано, пил чай на террасе и подолгу смотрел, как над прудом поднимается туман. "
 "В доме было тихо: гости разъехались ещё в августе, а письма из города приходили редко. Он завёл привычку писать по утрам и к обеду исписывал несколько листов, "
 "половину которых потом сжигал в камине. ")
def reader(night=False):
    pct=97/184*100
    return f'''<div class="rd"><div class="page"><h3>Глава VII. Письмо из города</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">Осень в Знаменском</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="sheet nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{coin(24)}390 червонцев</div>'
def margins(seed):
    return f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}">{profile(338,640,1.1,INK,.32,True)}{scribble(18,700,64,INK,.28)}{blot(300,150,.8,INK,.18)}{blot(30,560,.6,INK,.14)}</svg>'
def scene(seed): return f'<div class="bg"></div>{margins(seed)}'
COV=[('Осень в Знаменском','А. Любимов','EPUB','53%','#f5ecd6',INK,BOR),('Метель','Н. Зимин','FB2','12%',GRN,'#fff',GILT),('Станционный двор','П. Ямщиков','TXT','прочитано','#e9dcbc',INK,GRN),
 ('Бал у губернатора','Е. Вяземская','PDF','не начата',BOR,'#fff',GILT),('Письма к другу','Д. Дельвин','EPUB','4%','#f1e6cc',INK,BOR),('Капитанская внучка','В. Белогорская','PDF','67%','#2a1d14','#f3ead6',GILT)]
def library():
    css=f'''<style>.chips{{position:absolute;top:110px;left:20px;right:20px;display:flex;gap:16px;border-bottom:1px solid #cdbb94}}.chip{{padding:5px 0 8px;font-size:14px;color:#5a4632}}.chip.on{{color:{INK};font-weight:600;box-shadow:inset 0 -2px 0 {BOR}}}
.grid{{position:absolute;top:160px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:150px;overflow:hidden;padding:30px 9px 0;text-align:center;border-radius:2px 5px 5px 2px;box-shadow:inset 6px 0 0 rgba(0,0,0,.12),2px 3px 0 rgba(42,29,20,.15),0 6px 12px rgba(60,40,15,.15)}}
.cv .fr{{position:absolute;inset:7px 7px 7px 11px;border:1px solid var(--fr)}}.cv .fr:after{{content:"";position:absolute;inset:3px;border:.6px solid var(--fr)}}
.fmt{{position:absolute;bottom:12px;left:0;right:0;font-size:9.5px;font-weight:600;letter-spacing:1.5px}}
.ct{{font-size:13.5px;line-height:1.18;position:relative;overflow-wrap:anywhere}}.ca{{font-size:10.5px;margin-top:6px;position:relative;font-style:italic}}
.bt{{font-size:12.5px;font-weight:600;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:#5a4632;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,bg,fg,fr in COV:
        prog=f'<div class="bar" style="height:4px;margin-top:6px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg};--fr:{fr}"><div class="fr"></div><div class="ct H">{t}</div><div class="ca">{a}</div><div class="fmt">{f}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:2px;bottom:78px">{mascot(92)}</div>'
    return css+scene(3)+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def inkwell(sz=60):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><g stroke="{INK}" stroke-width="1.3"><path d="M14 30h32l4 22H10z" fill="#3a2a1c"/><path d="M20 22h20v8H20z" fill="{GILT}"/><path d="M16 52h28" /></g>
<path d="M34 24C40 14 48 6 58 2C52 10 46 16 38 22" fill="#faf5e8" stroke="{INK}" stroke-width="1.1"/><path d="M36 22 L50 8" stroke="{INK}" stroke-width=".7"/><path d="M18 34 q6 3 12 0" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/></svg>'''
def candlestick(sz=60):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><circle cx="30" cy="12" r="12" fill="#ffd27a" opacity=".3"/><path d="M30 2 q-5 7 0 12 q5 -5 0 -12z" fill="#f5b431"/><line x1="30" y1="14" x2="30" y2="17" stroke="{INK}"/>
<g stroke="{INK}" stroke-width="1.2"><rect x="25" y="17" width="10" height="22" fill="#f6efdc"/><path d="M20 39h20l-4 4h-12z" fill="{GILT}"/><path d="M28 43h4v8h-4z" fill="{GILT}"/><path d="M16 51h28l-3 5H19z" fill="{GILT}"/></g></svg>'''
def letter(sz=60):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><g stroke="{INK}" stroke-width="1.2"><path d="M6 18h48v32H6z" fill="#faf5e8"/><path d="M6 18l24 18 24-18" fill="none"/></g>
<g transform="translate(20 26)">{seal(20)[0:0]}</g><circle cx="30" cy="36" r="7" fill="{BOR}" stroke="#3d0d14" stroke-width=".7"/><path d="M27 36h6M30 33v6" stroke="#f6d6c8" stroke-opacity=".7"/></svg>'''
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:baseline;gap:10px;font-family:"Prata";font-size:20px;margin-bottom:10px}}.sh .hw{{font-size:15px;color:{GRN}}}
.q{{display:flex;align-items:center;gap:12px;padding:14px 14px;margin-bottom:12px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:600;font-size:15px}}.q .ds{{font-size:12.5px;color:#5a4632;margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:700;font-size:15px;color:{GT}}}
.desk{{padding:16px 8px 0;background:linear-gradient(180deg,#faf5e8 0 70%,transparent 70%)}}.top{{height:14px;margin:0 -8px;background:linear-gradient(180deg,#5a3a22,#3e2716);border-top:2px solid {GILT}}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;min-width:0;text-align:center}}.it .art{{height:64px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:10px 0 12px;background:#faf5e8;margin:0 -8px;padding-left:8px;padding-right:8px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:13px;font-weight:600;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:700;color:{GT}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:16px;border:1px dashed #a08a60;background:rgba(250,245,232,.85)}}.add .tt{{font-weight:600;font-size:14px;color:{BOR}}}.add .ds{{font-size:12.5px;color:#5a4632}}</style>'''
    q1=f'<div class="sheet q">{candle(6)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div><div class="bar"><i style="width:60%"></i></div></div><div class="amt">{coin(20)}+30</div></div>'
    q2=f'<div class="sheet q">{seal(42,GRN,"Н")}<div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:{GRN}"></i></div></div><div class="amt">{coin(20)}+120</div></div>'
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in (candlestick(62),inkwell(62),letter(62)))
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
    pk=f'<div class="abs" style="left:2px;bottom:78px;transform:scaleX(-1)">{mascot(84)}</div>'
    return css+scene(11)+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:112px"><div class="sh">Задания</div>{q1}{q2}</div>
<div class="sec" style="top:372px"><div class="sh">Письменный стол <span class="hw">для милых сердцу наград</span></div><div class="sheet desk"><div class="rc">{its}</div><div class="top"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{BOR}">{ic("quill",24)}</div><div><div class="tt">Добавить на стол</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в червонцах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(42,29,20,.18)}}.sm{{position:absolute;left:20px;right:20px;top:136px;padding:26px 20px 22px;text-align:center}}
.sm h2{{font-size:27px}}.q{{font-size:18px;color:{GRN};margin:6px 0 2px;line-height:1.2}}.qa{{font-size:11.5px;color:#5a4632;letter-spacing:.5px}}.sub{{font-size:13px;color:#5a4632;margin:6px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;border-top:1px solid #cdbb94;border-bottom:1px solid #cdbb94}}.st{{flex:1;padding:10px 4px}}.st+.st{{border-left:1px solid #cdbb94}}
.st b{{display:block;font-family:"Prata";font-weight:400;font-size:22px;line-height:1.3}}.st span{{font-size:12px;color:#5a4632}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:500;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:10px 0;margin:12px 0 8px;border-top:1px solid #cdbb94}}.rw .tt{{font-weight:700;font-size:15px;color:{GT}}}.rw .ds{{font-size:12.5px;color:#5a4632}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin:4px 0 18px}}.dots{{display:flex;gap:4px}}</style>'''
    dots=''.join(seal(20,BOR if i<3 else '#d8c8a6','') for i in range(4))
    inner=f'''<div style="line-height:0">{laurel(140)}</div><h2 class="H" style="margin-top:6px">Сессия завершена</h2><div class="hw q">«И пробуждается поэзия во мне»</div><div class="qa">А. С. Пушкин, «Осень»</div><div class="sub">Осень в Знаменском · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{BOR}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{coin(40)}<div><div class="tt">+30 червонцев за день</div><div class="ds">Свеча догорела до метки · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene(5)+f'<div class="veil"></div><div class="sheet rule sm">{inner}</div>'
SW=[('Железо-галловые чернила','#2a1d14','текст, линии'),('Бумага','#f3ead6','фон'),('Лист','#faf5e8','панели'),('Пергамент','#e8dcc0','вторичный'),
 ('Сепия','#5a4632','вторичный текст'),('Бордо','#7a1f2b','акцент'),('Бордо тёмн.','#5c1720','нажатие'),('Зелень','#2c4a35','навигация, неделя'),
 ('Позолота','#b8923f','линейки, декор'),('Позолота текст','#6b4f14','суммы'),('Сургуч','#7a1f2b','печати'),('Страница','#f7f0e0','книга день'),
 ('Гостиная','#140d08','фон ночи'),('Ночь: панели','#20160e','поверхность'),('Свеча','#e8c27a','акцент ночи'),('Ночь: текст','#e8dcc4','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:52px 20px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}}.s{{text-align:center;font-size:10.5px}}.c{{height:48px;border:1px solid #cdbb94;box-shadow:2px 3px 0 rgba(42,29,20,.1);margin-bottom:6px}}.s b{{display:block;font-weight:600;line-height:1.15}}.s span{{display:block;font-family:monospace;color:#5a4632}}.s em{{font-style:normal;color:#5a4632;font-size:10px}}.f{{margin-top:14px;font-size:14px;line-height:1.55}}</style>'
    return css+scene(2)+f'''<div class="wrap"><h1 class="H" style="font-size:24px">Палитра «Золотой век»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:20px">Prata — заголовки</div><div class="hw" style="font-size:17px;color:{GRN}">Bad Script — «Я помню чудное мгновенье»</div><div>IBM Plex Sans — интерфейс</div><div style="font-family:Vollkorn;font-size:16px">Vollkorn — текст книги</div>
<div style="display:flex;gap:8px;align-items:flex-end;margin-top:6px">{coin(38)}{seal(38)}{candle(6,10,54)}{inkwell(50)}{mascot(66)}</div></div></div>'''
SC=[('zolotoy-vek-reader-day',reader(),'','Читалка · день'),('zolotoy-vek-reader-night',reader(True),'night','Читалка · ночь'),('zolotoy-vek-library',library(),'','Библиотека'),
    ('zolotoy-vek-rewards',rewards(),'','Награды'),('zolotoy-vek-session-summary',summary(),'','Итог сессии'),('zolotoy-vek-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#ece0c4');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(glob.glob(gf+'Prata/*.ttf')[0],44);fC=ImageFont.truetype(glob.glob(gf+'IBM Plex Sans/*Regular*.ttf')[0] if glob.glob(gf+'IBM Plex Sans/*Regular*.ttf') else glob.glob(gf+'IBM Plex Sans/*.ttf')[0],22)
    d.text((G,16),'ReadQuest — скин «Золотой век»',font=fH,fill=INK)
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#5a4632',anchor='ma')
    ov.save(f'{OUT}/zolotoy-vek-overview.png')
