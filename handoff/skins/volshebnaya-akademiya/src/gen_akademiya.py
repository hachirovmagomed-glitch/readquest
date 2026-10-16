# ReadQuest · скин «Волшебная академия» — генератор макетов. Запуск: python3 gen_akademiya.py
import os,random,subprocess,glob
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
W,H=390,844
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="5" rx="1.5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','plus':'<path d="M12 5v14M5 12h14"/>',
'wand':'<path d="M4 20L15 9"/><path d="M17 3l.9 2.1L20 6l-2.1.9L17 9l-.9-2.1L14 6l2.1-.9z"/>',
}
def ic(n,sz=22,w=2): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_g=[0]
def gid(): _g[0]+=1; return f'g{_g[0]}'
def gem(sz=22,a='#f7b8ff',b='#9a4fe0',c='#5fe0d8'):
    """Монета = огранённый кристалл: голографический градиент, грани, блик."""
    g=gid()
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient></defs>
<path d="M12 6h16l8 10-16 20L4 16z" fill="url(#{g})" stroke="#5a2a8a" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M4 16h32M12 6l4 10 4-10 4 10 4-10M16 16l4 20 4-20" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="1"/>
<path d="M13 9l3 6h-6z" fill="#fff" opacity=".8"/></svg>'''
def star4(sz=12,c='#fff',o=1):
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="opacity:{o}"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0z" fill="{c}"/></svg>'
def heart(sz=14,c='#ff8fd0'): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24"><path d="M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13z" fill="{c}"/></svg>'
def glitter(n,seed,w=W,h=H,cols=('#ffffff','#ffd6f5','#c9f6ff','#fff1a8'),op=(.5,1),top=0):
    r=random.Random(seed); s=''
    for _ in range(n):
        x=r.uniform(0,w);y=r.uniform(top,h);c=r.choice(cols);o=r.uniform(*op)
        if r.random()<.18:
            k=r.uniform(3,7); s+=f'<path d="M{x} {y-k}C{x+.6} {y-.6} {x+.6} {y-.6} {x+k} {y}C{x+.6} {y+.6} {x+.6} {y+.6} {x} {y+k}C{x-.6} {y+.6} {x-.6} {y+.6} {x-k} {y}C{x-.6} {y-.6} {x-.6} {y-.6} {x} {y-k}z" fill="{c}" opacity="{o:.2f}"/>'
        else: s+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r.uniform(.5,1.5):.2f}" fill="{c}" opacity="{o:.2f}"/>'
    return f'<svg class="abs" style="left:0;top:0" width="{w}" height="{h}">{s}</svg>'
def wings(w=120,h=80,o=.55):
    g=gid()
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 120 80"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc4ef"/><stop offset=".5" stop-color="#c8b8ff"/><stop offset="1" stop-color="#9ff3ec"/></linearGradient></defs>
<g fill="url(#{g})" stroke="#fff" stroke-width="1.2" opacity="{o}"><path d="M60 40C40 0 6 2 4 22c-2 16 22 22 56 18z"/><path d="M60 40C80 0 114 2 116 22c2 16-22 22-56 18z"/><path d="M60 42C44 52 22 72 30 78c8 4 24-14 30-36z"/><path d="M60 42C76 52 98 72 90 78c-8 4-24-14-30-36z"/></g>
<g stroke="#fff" stroke-opacity=".8" fill="none" stroke-width=".8" opacity="{o}"><path d="M60 40C44 22 24 14 12 18M60 40C76 22 96 14 108 18"/></g></svg>'''
def mascot(sz=96):
    """Оригинальный маскот «Луми»: кристаллик-фея — огранённое тельце-капля, крылья стрекозы, антенка-звезда."""
    g=gid()
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 100 100"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0f6"/><stop offset=".5" stop-color="#d7b8ff"/><stop offset="1" stop-color="#8fe8e2"/></linearGradient></defs>
<g opacity=".7" fill="#e9f8ff" stroke="#fff" stroke-width="1.2"><ellipse cx="24" cy="40" rx="20" ry="9" transform="rotate(-25 24 40)"/><ellipse cx="76" cy="40" rx="20" ry="9" transform="rotate(25 76 40)"/><ellipse cx="28" cy="56" rx="14" ry="6" transform="rotate(20 28 56)"/><ellipse cx="72" cy="56" rx="14" ry="6" transform="rotate(-20 72 56)"/></g>
<path d="M50 14 L70 40 L62 80 H38 L30 40Z" fill="url(#{g})" stroke="#5a2a8a" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M30 40H70M50 14L42 40 38 80M50 14l8 26 4 40" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>
<path d="M50 14 Q46 6 52 2" fill="none" stroke="#5a2a8a" stroke-width="1.8"/><g transform="translate(46 -3)">{'<path d="M6 0C6.5 4 8 5.5 12 6 8 6.5 6.5 8 6 12 5.5 8 4 6.5 0 6 4 5.5 5.5 4 6 0z" fill="#ffd84d" stroke="#b07a00" stroke-width=".6"/>'}</g>
<ellipse cx="43" cy="54" rx="3.2" ry="4.2" fill="#3d1f4f"/><ellipse cx="57" cy="54" rx="3.2" ry="4.2" fill="#3d1f4f"/><circle cx="44.2" cy="52.5" r="1.2" fill="#fff"/><circle cx="58.2" cy="52.5" r="1.2" fill="#fff"/>
<ellipse cx="38" cy="62" rx="4" ry="2.4" fill="#ff8fd0" opacity=".7"/><ellipse cx="62" cy="62" rx="4" ry="2.4" fill="#ff8fd0" opacity=".7"/><path d="M46 63q4 4 8 0" stroke="#3d1f4f" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>'''
HOLO='linear-gradient(115deg,#ffd1f0 0%,#e2ccff 30%,#c7f3ff 55%,#fff2c2 75%,#ffd1f0 100%)'
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Nunito Sans",sans-serif;color:#3d1f4f;background:#fbf0fb}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Comfortaa",sans-serif;font-weight:700}}.sc{{font-family:"Marck Script",cursive}}
.bg{{position:absolute;inset:0;background:radial-gradient(70% 40% at 15% 8%,#ffd6f2 0,transparent 70%),radial-gradient(60% 40% at 95% 30%,#d4f6ff 0,transparent 70%),radial-gradient(70% 40% at 30% 95%,#e6d4ff 0,transparent 70%),#fbf0fb}}
.glass{{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.92),rgba(250,240,255,.86));border:1.5px solid #fff;border-radius:22px;
 box-shadow:0 0 0 1.5px #e2c4f3,0 10px 24px rgba(140,60,170,.16),inset 0 1px 0 #fff}}
.glass.holo{{border:2px solid transparent;background:linear-gradient(160deg,rgba(255,255,255,.95),rgba(250,242,255,.92)) padding-box,{HOLO} border-box;box-shadow:0 10px 24px rgba(140,60,170,.18)}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:50px 16px 0;gap:8px;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:25px;background:linear-gradient(90deg,#8a1f7a,#5b2aa8 60%,#126c8a);-webkit-background-clip:text;color:transparent}}
.bal{{white-space:nowrap;display:flex;align-items:center;gap:5px;padding:5px 11px 5px 5px;font-weight:800;font-size:13px;color:#4a1f7a;border-radius:999px;border:2px solid transparent;
 background:linear-gradient(#fff,#fff) padding-box,{HOLO} border-box;box-shadow:0 4px 12px rgba(140,60,170,.2)}}
.nav{{position:absolute;left:12px;right:12px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 6px;border-radius:33px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11.5px;font-weight:800;color:#6b4a80;position:relative;padding:6px 0}}
.nav .on{{color:#fff}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;border-radius:24px;z-index:-1;background:radial-gradient(60% 45% at 35% 22%,#ffffff80,transparent),linear-gradient(160deg,#b3349d,#6a2fb0);box-shadow:0 0 0 1.5px #ffd6f2,0 5px 12px rgba(140,40,160,.45)}}
.btn{{display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:27px;font-family:"Comfortaa",sans-serif;font-weight:700;font-size:17px;color:#fff;position:relative;overflow:hidden;
 background:linear-gradient(160deg,#b3349d,#6a2fb0);box-shadow:0 0 0 2px #fff,0 0 0 4px #e8b9f0,0 8px 20px rgba(120,40,160,.4)}}
.btn:before{{content:"";position:absolute;left:18px;right:45%;top:6px;height:12px;border-radius:8px;background:linear-gradient(180deg,#ffffff70,#ffffff00)}}
.bar{{height:10px;border-radius:5px;background:#efe0f7;box-shadow:inset 0 1px 2px rgba(90,40,120,.18)}}.bar i{{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#ff7fcf,#b98cff 50%,#5fe0d8);box-shadow:0 0 8px rgba(185,140,255,.7)}}
.cap{{font-size:12px;color:#6b4a80;font-weight:700}}
/* читалка: страница без блёсток и текстур */
.rd{{position:absolute;inset:0;background:#fdf9fc;color:#2a1a33}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:18px 26px 0;font-family:"Alegreya",serif;font-size:17.5px;line-height:1.58;text-align:left}}
.page h3{{font-family:"Alegreya",serif;font-size:21px;font-weight:700;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;overflow:hidden;
 background:linear-gradient(115deg,#ffe3f4,#ece0ff 45%,#dcf6fb);border-radius:0 0 24px 24px;box-shadow:0 1px 0 #fff inset,0 6px 16px rgba(140,60,170,.14)}}
.rtop .t{{flex:1;text-align:center;font-family:"Comfortaa",sans-serif;font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#3d1f4f}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:#7c1d6e}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;overflow:hidden;background:linear-gradient(295deg,#ffe3f4,#ece0ff 50%,#dcf6fb);border-radius:24px 24px 0 0;box-shadow:0 -6px 16px rgba(140,60,170,.14);padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#3d1f4f;margin-bottom:10px}}
.sl{{position:relative;height:22px}}.sl .tr{{position:absolute;top:9px;left:0;right:0;height:5px;border-radius:3px;background:#e6d2f2}}.sl .fi{{position:absolute;top:9px;left:0;height:5px;border-radius:3px;background:linear-gradient(90deg,#ff7fcf,#9a4fe0)}}
.sl .th{{position:absolute;top:0;margin-left:-11px;width:22px;height:22px}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;color:#7c1d6e;font-size:11.5px;font-weight:800}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}.tools span{{color:#3d1f4f}}
.night{{background:#140b2a}}.night .rd{{background:#120a24;color:#e6dcf0}}
.night .rtop{{background:linear-gradient(115deg,#2a1450,#1f1242 50%,#162048);box-shadow:inset 0 -1px 0 rgba(200,170,255,.25),0 6px 18px rgba(0,0,0,.5)}}
.night .rbot{{background:linear-gradient(295deg,#2a1450,#1f1242 50%,#162048);box-shadow:inset 0 1px 0 rgba(200,170,255,.25),0 -6px 18px rgba(0,0,0,.5)}}
.night .rtop .t,.night .pg,.night .tools span{{color:#f1e6ff}}.night .ib,.night .tools{{color:#ffa8e4}}.night .sl .tr{{background:#3a2668}}.night .sl .fi{{background:linear-gradient(90deg,#ff9be0,#9ff3ec);box-shadow:0 0 8px rgba(255,155,224,.5)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("В библиотеке башни пахло старой бумагой и сиренью. Вера осторожно сняла с полки толстый том в синем переплёте и села у окна, где свет падал прямо на страницы. "
 "Внизу, во дворе, кто-то смеялся, хлопали двери, звенел колокольчик к ужину. Она перевернула страницу и забыла обо всём, кроме истории о маленьком городе у моря. ")
def reader(night=False):
    pct=97/184*100
    gl=glitter(26,7,W,96,op=(.3,.7)) if night else glitter(26,7,W,96)
    gl2=glitter(30,9,W,150,op=(.3,.7)) if night else glitter(30,9,W,150)
    th=gem(22,'#ffd6f5','#b3349d','#6a2fb0') if not night else gem(22,'#ffe6fa','#ff9be0','#9ff3ec')
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Синий том</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop">{gl}<div class="ib">{ic("arrow-left")}</div><div class="t">Город у моря</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot">{gl2}<div class="pg">{star4(10,"#c86fd8")}<span>98 из 185</span>{star4(10,"#4fb8c9")}</div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%">{th}</div></div>
<div class="tools"><div>{ic("list")}<span>Оглавление</span></div><div>{ic("type")}<span>Текст</span></div><div>{ic("sun" if night else "moon")}<span>{"День" if night else "Ночь"}</span></div><div>{ic("bookmark-plus")}<span>Закладка</span></div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="glass holo nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{gem(24)}390 кристаллов</div>'
def scene(seed): return f'<div class="bg"></div>{glitter(110,seed)}'
COV=[('Город у моря','Л. Яснова','EPUB','53%','#a62d92','#6a1f6a','#fff'),('Северные огни','К. Белых','FB2','12%','#176a7c','#1a4470','#fff'),('Сад камней','А. Ветрова','TXT','прочитано','#ffe1f2','#e8c4ff','#3d1f4f'),
 ('Часовая башня','Т. Громов','PDF','не начата','#6a4ac8','#3a1f80','#fff'),('Летний бал','Д. Орлова','EPUB','4%','#d4f7f3','#b8e3ff','#1f3a4f'),('Лунный мост','И. Светлова','PDF','67%','#5a34a0','#22144a','#fff')]
def library():
    css=f'''<style>.chips{{position:absolute;top:108px;left:20px;right:20px;display:flex;gap:7px}}.chip{{padding:7px 13px;border-radius:999px;font-size:13px;font-weight:800;background:rgba(255,255,255,.85);color:#6b4a80;box-shadow:0 0 0 1.5px #e2c4f3}}
.chip.on{{color:#fff;background:linear-gradient(160deg,#a62d92,#6a2fb0);box-shadow:0 0 0 1.5px #fff,0 4px 10px rgba(140,40,160,.35)}}
.grid{{position:absolute;top:158px;left:16px;right:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:150px;border-radius:16px 16px 16px 16px;overflow:hidden;padding:34px 8px 0;text-align:center;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #e2c4f3,0 8px 16px rgba(110,40,150,.22)}}
.cv:after{{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 35%,rgba(255,255,255,.22) 45%,transparent 55%)}}
.fmt{{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:9.5px;font-weight:900;letter-spacing:1px;background:rgba(255,255,255,.9);color:#3d1f4f;border-radius:999px;padding:1px 7px}}
.ct{{font-size:15px;line-height:1.15}}.ca{{font-size:10.5px;margin-top:6px;font-weight:800}}
.bt{{font-size:12.5px;font-weight:800;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:#6b4a80;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,c1,c2,fg in COV:
        prog=f'<div class="bar" style="height:6px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:linear-gradient(160deg,{c1},{c2});color:{fg}">{glitter(14,len(t),110,150,op=(.4,.9))}<div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:-6px;bottom:72px;transform:rotate(-10deg)">{mascot(92)}</div><div class="abs" style="right:84px;bottom:120px">{star4(14,"#ffb3e6")}</div><div class="abs" style="right:100px;bottom:142px">{star4(9,"#9fe0ff")}</div>'
    return css+scene(3)+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def ring(pct,sz=58,label=True):
    """Кольцо заряда палочки: наполняется минутами."""
    g=gid(); r=22; c=2*3.14159*r
    t=f'<text x="29" y="33" text-anchor="middle" font-family="Comfortaa" font-weight="700" font-size="12" fill="#3d1f4f">{int(pct*10)}/10</text>' if label else ''
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 58 58" style="flex:none"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7fcf"/><stop offset=".5" stop-color="#b98cff"/><stop offset="1" stop-color="#3fc9c0"/></linearGradient></defs>
<circle cx="29" cy="29" r="{r}" fill="#fff" stroke="#efe0f7" stroke-width="7"/><circle cx="29" cy="29" r="{r}" fill="none" stroke="url(#{g})" stroke-width="7" stroke-linecap="round" stroke-dasharray="{c*pct:.1f} {c}" transform="rotate(-90 29 29)"/>
<g transform="translate({29+r*__import__('math').sin(6.283*pct)-6:.1f} {29-r*__import__('math').cos(6.283*pct)-6:.1f})">{star4(12,"#fff")}</g>{t}</svg>'''
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:center;gap:8px;font-family:"Comfortaa",sans-serif;font-weight:700;font-size:19px;color:#3d1f4f;margin-bottom:10px}}
.q{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:900;font-size:15px}}.q .ds{{font-size:12.5px;color:#6b4a80;font-weight:700;margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:900;font-size:16px;color:#4a1f7a}}
.wq{{background:linear-gradient(140deg,#7a3ac0,#4a2a9a 60%,#2a6e9a)!important;color:#fff}}.wq .ds{{color:#fff}}.wq .amt{{color:#fff}}.wq .bar{{background:rgba(255,255,255,.25)}}
.shelf{{position:relative;padding:14px 10px 0}}.shelf .wood{{position:absolute;left:0;right:0;bottom:-8px;height:14px;border-radius:7px;background:linear-gradient(180deg,#f3d9ff,#c7a3e6);box-shadow:0 6px 12px rgba(110,40,150,.25)}}
.rc{{display:flex;gap:8px;position:relative}}.it{{flex:1 1 0;min-width:0;text-align:center;padding:8px 2px 18px}}.it .art{{height:76px;display:flex;align-items:flex-end;justify-content:center}}
.it .nm{{font-size:12.5px;font-weight:900;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center;margin-top:4px}}
.it .pr{{display:inline-flex;align-items:center;gap:3px;background:#fff;color:#4a1f7a;border-radius:999px;padding:2px 9px 2px 3px;font-weight:900;font-size:12px;box-shadow:0 0 0 1.5px #e2c4f3}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:24px;border:2px dashed #c78ae0;border-radius:22px;background:rgba(255,255,255,.75)}}.add .tt{{font-weight:900;font-size:14px;color:#7c1d6e}}.add .ds{{font-size:12.5px;color:#6b4a80;font-weight:700}}</style>'''
    q1=f'<div class="glass holo q">{ring(.6)}<div class="tx"><div class="tt">Задание дня · заряд палочки</div><div class="ds">Читать 10 мин · 6 из 10 мин</div><div class="bar" style="height:8px"><i style="width:60%"></i></div></div><div class="amt">{gem(18)}+30</div></div>'
    q2=f'<div class="glass q wq" style="border-color:#d9c4ff">{gem(40,"#e9fbff","#9ff3ec","#5aa0e0")}<div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar" style="height:8px"><i style="width:75%;background:linear-gradient(90deg,#ffe6fa,#9ff3ec)"></i></div></div><div class="amt">{gem(18)}+120</div></div>'
    def potion(c1,c2):
        g=gid(); return f'''<svg width="56" height="74" viewBox="0 0 56 74"><defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
<rect x="21" y="4" width="14" height="8" rx="2" fill="#c7a3e6" stroke="#5a2a8a" stroke-width="1.5"/><path d="M22 12h12v10c10 4 16 12 16 24a22 22 0 0 1-44 0c0-12 6-20 16-24z" fill="#ffffffaa" stroke="#5a2a8a" stroke-width="1.8"/>
<path d="M8 44c6-4 12 2 20-2s14 0 20 2c0 12-9 22-20 22S8 56 8 44z" fill="url(#{g})"/><path d="M14 36q-2 8 2 14" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>{''}</svg>'''
    items=[('Серия сериала',potion('#ff9be0','#b3349d')),('Кофе в кофейне',potion('#9ff3ec','#2a8ea0')),('Новая книга',f'<div style="margin-bottom:-4px">{wings(76,52,.95)}</div>')]
    cards=''.join(f'<div class="it"><div class="art">{a}</div><div class="nm">{n}</div><div class="pr">{gem(16)}XXX</div></div>' for n,a in items)
    pk=f'<div class="abs" style="left:-8px;bottom:70px;transform:rotate(10deg)">{mascot(88)}</div><div class="abs" style="left:78px;bottom:128px">{star4(12,"#ffb3e6")}</div><div class="abs" style="left:92px;bottom:104px">{heart(12)}</div>'
    return css+scene(11)+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:112px"><div class="sh">{star4(16,"#c86fd8")}Задания</div>{q1}{q2}</div>
<div class="sec" style="top:360px"><div class="sh">{heart(16)}Волшебная лавка</div><div class="glass shelf"><div class="rc">{cards}</div><div class="wood"></div></div>
<div class="add"><div style="color:#7c1d6e">{ic("plus",26)}</div><div><div class="tt">Добавить в лавку</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в кристаллах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(61,31,79,.18)}}.sm{{position:absolute;left:20px;right:20px;top:150px;padding:26px 18px 20px;text-align:center;border-radius:30px}}
.wg{{position:absolute;left:50%;top:-44px;transform:translateX(-50%)}}.sm h2{{font-size:25px;color:#3d1f4f}}.acc{{font-size:22px;color:#7c1d6e;line-height:1}}.sub{{font-size:13px;color:#6b4a80;font-weight:700;margin:4px 0 10px}}
.stats{{display:flex;gap:8px;margin:12px 0 14px}}.st{{flex:1;border-radius:18px;padding:10px 4px;background:#fff;box-shadow:0 0 0 1.5px #ecd6f6}}
.st b{{display:block;font-family:"Comfortaa",sans-serif;font-weight:700;font-size:21px;line-height:1.25}}.st span{{font-size:12px;color:#6b4a80;font-weight:800}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:800;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;border-radius:22px;padding:10px 12px;margin:14px 0 10px;border:2px solid transparent;background:linear-gradient(#fdf6ff,#fdf6ff) padding-box,{HOLO} border-box}}
.rw .tt{{font-weight:900;font-size:15px;color:#4a1f7a}}.rw .ds{{font-size:12.5px;color:#6b4a80;font-weight:700}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;margin:6px 2px 16px}}.dots{{display:flex;gap:4px;align-items:center}}</style>'''
    dots=''.join(gem(18) for _ in range(3))+gem(18,'#f2ecf6','#ddd0e6','#cfc2da')
    inner=f'''<div class="wg">{wings(150,96,.75)}</div><div class="sc acc">Чудесно!</div><h2 class="H">Сессия завершена</h2><div class="sub">Город у моря · стр. 85–98</div>
<div class="stats"><div class="st"><b style="color:#7c1d6e">18 мин</b><span>Чтение</span></div><div class="st"><b style="color:#1f6a7a">14</b><span>Страницы</span></div><div class="st"><b style="color:#5b2aa8">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{ring(1,50,False)}<div><div class="tt">+30 кристаллов за день</div><div class="ds">Палочка заряжена · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene(5)+f'<div class="veil"></div><div class="glass holo sm">{inner}</div>'
SW=[('Фуксия','#b3349d','акцент'),('Фуксия тёмн.','#7c1d6e','нажатие, текст'),('Фиалка','#6a2fb0','градиент кнопок'),('Сирень','#b98cff','шкалы, декор'),
 ('Бирюза','#5fe0d8','декор, блики'),('Бирюза тёмн.','#1f6a7a','текст-бирюза'),('Розовый','#ff8fd0','сердца, декор'),('Лимонный','#fff2c2','голограмма'),
 ('Фон','#fbf0fb','фон дня'),('Страница','#fdf9fc','книга день'),('Слива','#3d1f4f','текст UI'),('Слива 2','#6b4a80','вторичный'),
 ('Ночь','#140b2a','фон ночи'),('Ночь: панели','#231446','поверхность'),('Ночь: розов.','#ff9be0','акцент ночи'),('Ночь: текст','#e6dcf0','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css='<style>.wrap{position:absolute;inset:0;padding:52px 18px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}.s{text-align:center;font-size:11px}.c{height:54px;border-radius:16px;box-shadow:0 0 0 2px #fff,0 0 0 3px #e2c4f3,0 5px 10px rgba(110,40,150,.2);margin-bottom:6px}.s b{display:block;font-weight:900}.s span{display:block;font-family:monospace;color:#6b4a80}.s em{font-style:normal;color:#6b4a80;font-size:10px}.f{margin-top:16px;font-size:14px;line-height:1.55}</style>'
    return css+scene(2)+f'''<div class="wrap"><h1 class="H" style="font-size:22px">Палитра «Волшебная академия»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:19px">Comfortaa — заголовки</div><div class="sc" style="font-size:20px;color:#7c1d6e">Marck Script — короткие акценты</div><div style="font-weight:800">Nunito Sans — интерфейс</div><div style="font-family:Alegreya;font-size:16px">Alegreya — текст книги</div>
<div style="display:flex;gap:10px;align-items:center;margin-top:6px">{gem(40)}{ring(.6)}{mascot(70)}{wings(80,52,.9)}</div></div></div>'''
SC=[('volshebnaya-akademiya-reader-day',reader(),'','Читалка · день'),('volshebnaya-akademiya-reader-night',reader(True),'night','Читалка · ночь'),('volshebnaya-akademiya-library',library(),'','Библиотека'),
    ('volshebnaya-akademiya-rewards',rewards(),'','Награды'),('volshebnaya-akademiya-session-summary',summary(),'','Итог сессии'),('volshebnaya-akademiya-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#f6e8fa');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(glob.glob(gf+'Comfortaa/*.ttf')[0],42);fC=ImageFont.truetype(glob.glob(gf+'Nunito Sans/NunitoSans-V*.ttf')[0],22)
    d.text((G,18),'ReadQuest — скин «Волшебная академия»',font=fH,fill='#5b2aa8')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#6b4a80',anchor='ma')
    ov.save(f'{OUT}/volshebnaya-akademiya-overview.png')
