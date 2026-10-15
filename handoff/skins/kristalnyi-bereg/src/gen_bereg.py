# ReadQuest · скин «Кристальный берег» — генератор макетов. Запуск: python3 gen_bereg.py
import os,random,subprocess,glob,math
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
W,H=390,844
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
'coffee':'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>','tv':'<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M8 2l4 4 4-4"/>',
}
def ic(n,sz=22,w=1.5): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_g=[0]
def gid(): _g[0]+=1; return f'g{_g[0]}'
def prism(g): return f'<linearGradient id="{g}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6b8c8"/><stop offset=".3" stop-color="#f3e3a0"/><stop offset=".55" stop-color="#a8ecd0"/><stop offset=".8" stop-color="#a9c4f5"/><stop offset="1" stop-color="#cdb5f0"/></linearGradient>'
def gem(sz=22,a='#e9fbf6',b='#7fd6c0',c='#3f9c8a',edge='#2a6f62'):
    """Монета = огранённый камень (бриллиантовая огранка сбоку) с тонкой призматической кромкой."""
    g=gid()
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>{prism(g)}</defs>
<path d="M11 7h18l8 9-17 18L3 16z" fill="url(#{g})" stroke="{edge}" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M3 16h34M11 7l5 9 4-9 4 9 5-9M16 16l4 18 4-18" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".9"/>
<path d="M11 7h18l8 9" fill="none" stroke="url(#{g}p)" stroke-width="1.4" opacity=".9"/><path d="M13 9l2.6 5h-5z" fill="#fff" opacity=".85"/></svg>'''
def seam(w,h,seed,color='#c8a24a',n=1):
    """Кинцуги: тонкие золотые «швы» трещины в углу панели."""
    r=random.Random(seed); s=''
    for _ in range(n):
        # шов всегда в правом верхнем углу и не длиннее ~70px, чтобы не пересекать текст
        x,y=w,r.uniform(.25,.55)*min(h,90); pts=[(x,y)]
        for k in range(4):
            x-=r.uniform(10,18); y-=r.uniform(3,10)*(1 if y>10 else -.3); pts.append((x,max(y,0)))
        pts.append((x-r.uniform(6,12),0))
        d='M'+' L'.join(f'{a:.1f} {b:.1f}' for a,b in pts)
        bx,by=pts[2]; d2=f'M{bx:.1f} {by:.1f} L{bx-r.uniform(4,10):.1f} {by+r.uniform(6,12):.1f}'
        s+=f'<path d="{d}" stroke="{color}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="{d2}" stroke="{color}" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
    return f'<svg class="abs" style="left:0;top:0" width="{w}" height="{h}">{s}</svg>'
def shore(night=False):
    sand='#f3ece0' if not night else '#0c2430'; foam='#ffffff' if not night else '#4a8a9a'
    return f'''<svg class="abs" style="left:0;bottom:0" width="{W}" height="230" viewBox="0 0 390 230"><defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7f0ec"/><stop offset="1" stop-color="#eef7f5"/></linearGradient></defs>
<path d="M0 40 C60 26 120 54 195 40 S330 26 390 40 V230 H0Z" fill="url(#sea)"/>
<path d="M0 92 C70 78 140 104 210 90 S340 78 390 92 V230 H0Z" fill="{sand}"/>
<path d="M0 92 C70 78 140 104 210 90 S340 78 390 92" stroke="{foam}" stroke-width="2.5" fill="none" opacity=".9"/>
<path d="M30 60 C80 52 120 66 170 58" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/><path d="M230 64 C270 58 310 70 360 62" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/></svg>'''
def facets_gem(filled,tot=10,sz=58):
    """Прогресс дня: камень полируется грань за гранью (10 граней = 10 минут)."""
    g=gid(); cx=cy=29; R=25; s=''
    for k in range(tot):
        a0=-math.pi/2+2*math.pi*k/tot; a1=a0+2*math.pi/tot
        p=f'M{cx} {cy} L{cx+R*math.cos(a0):.2f} {cy+R*math.sin(a0):.2f} L{cx+R*math.cos(a1):.2f} {cy+R*math.sin(a1):.2f}Z'
        s+=f'<path d="{p}" fill="{"url(#"+g+")" if k<filled else "#f1f6f5"}" stroke="#ffffff" stroke-width="1.2"/>'
    poly=' '.join(f'{cx+R*math.cos(-math.pi/2+2*math.pi*k/tot):.2f},{cy+R*math.sin(-math.pi/2+2*math.pi*k/tot):.2f}' for k in range(tot))
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 58 58" style="flex:none"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f7ee"/><stop offset=".5" stop-color="#8fdcc4"/><stop offset="1" stop-color="#4fa892"/></linearGradient>{prism(g)}</defs>
{s}<polygon points="{poly}" fill="none" stroke="#2a6f62" stroke-width="1.3"/><polygon points="{poly}" fill="none" stroke="url(#{g}p)" stroke-width="1" transform="translate(29 29) scale(.86) translate(-29 -29)" opacity=".8"/>
<circle cx="{cx}" cy="{cy}" r="10.5" fill="#ffffff" stroke="#2a6f62" stroke-width="1"/><text x="{cx}" y="{cy+3.4}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="9.5" fill="#1f3a3d">{filled}/{tot}</text></svg>'''
def mascot(sz=70):
    """Оригинальный маскот «Завиток»: лунная улитка-ракушка с огранённой перламутровой раковиной."""
    g=gid()
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 80 80"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#e6f3f8"/><stop offset=".7" stop-color="#ebe2f6"/><stop offset="1" stop-color="#d2efe6"/></linearGradient>{prism(g)}</defs>
<path d="M6 68 Q20 60 40 64 L72 66 Q76 72 68 74 L10 74Z" fill="#cfe4e0" stroke="#4a6466" stroke-width="1.3"/>
<path d="M44 66 L22 62 L12 44 L20 22 L42 12 L62 20 L68 40 L60 58Z" fill="url(#{g})" stroke="#4a6466" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M42 12 L40 38 L22 62 M20 22 L40 38 L68 40 M12 44 L40 38 L60 58 M62 20 L40 38" stroke="#fff" stroke-width="1" fill="none"/>
<path d="M40 38 L48 32 L52 40 L46 46Z" fill="none" stroke="#c8a24a" stroke-width="1.2"/>
<path d="M20 22 L42 12 L62 20" stroke="url(#{g}p)" stroke-width="1.6" fill="none"/>
<path d="M70 66 Q74 56 72 50 M70 66 Q78 58 80 54" stroke="#4a6466" stroke-width="1.2" fill="none"/><circle cx="72" cy="50" r="1.6" fill="#1f3a3d"/><circle cx="80" cy="54" r="1.6" fill="#1f3a3d"/></svg>'''
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Jost",sans-serif;color:#1f3a3d;background:#f7f9f8}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Forum",serif;font-weight:400;letter-spacing:.6px}}.lbl{{font-family:"Tenor Sans",sans-serif;letter-spacing:2px;text-transform:uppercase;font-size:11px}}
.bg{{position:absolute;inset:0;background:linear-gradient(180deg,#eaf3f6 0%,#f7f9f8 38%,#f7f9f8 100%)}}
.pearl{{position:relative;background:linear-gradient(135deg,#ffffff 0%,#fbfdfc 45%,#f6f3fb 70%,#f1faf7 100%);border:1px solid #d3e3e0;border-radius:4px;box-shadow:0 1px 0 #fff inset,0 10px 30px rgba(31,58,61,.07)}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:54px 22px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:34px;color:#1f3a3d}}
.bal{{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 6px;font-weight:500;font-size:14px;color:#1f3a3d;background:#fff;border:1px solid #d3e3e0;border-radius:2px}}
.bal b{{font-weight:600;color:#2a6f62}}
.nav{{position:absolute;left:16px;right:16px;bottom:16px;height:64px;display:flex;align-items:center;padding:0 6px;isolation:isolate;background:rgba(255,255,255,.94);border:1px solid #d3e3e0;border-radius:4px;box-shadow:0 10px 30px rgba(31,58,61,.08)}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:500;color:#4a6466;position:relative;padding:6px 0}}
.nav .on{{color:#383d78;font-weight:600}}.nav .on:after{{content:"";position:absolute;left:30%;right:30%;bottom:-2px;height:2px;background:#c8a24a}}
.btn{{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:2px;font-family:"Tenor Sans",sans-serif;letter-spacing:2.5px;text-transform:uppercase;font-size:14px;color:#fff;position:relative;overflow:hidden;
 background:linear-gradient(135deg,#565ca6,#383d78);box-shadow:0 0 0 1px #c8a24a,0 8px 20px rgba(56,61,120,.25)}}
.btn:before{{content:"";position:absolute;top:0;bottom:0;left:-30%;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-20deg) translateX(240px)}}
.bar{{height:4px;background:#e2ecea}}.bar i{{display:block;height:100%;background:linear-gradient(90deg,#8fdcc4,#4fa892)}}
.cap{{font-size:12px;color:#4a6466}}
/* читалка: страница чистая */
.rd{{position:absolute;inset:0;background:#fbfcfb;color:#1e2a2b}}
.page{{position:absolute;top:96px;bottom:146px;left:0;right:0;overflow:hidden;padding:20px 28px 0;font-family:"Source Serif Pro",serif;font-size:16.5px;line-height:1.66;text-align:left}}
.page h3{{font-family:"Forum",serif;font-weight:400;font-size:23px;margin-bottom:12px;letter-spacing:.3px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;overflow:hidden;background:linear-gradient(180deg,#eaf3f6,#ffffff);border-bottom:1px solid #d3e3e0}}
.rtop .t{{flex:1;text-align:center;font-family:"Forum",serif;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1f3a3d}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:#383d78}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:146px;overflow:hidden;background:linear-gradient(0deg,#f1f7f5,#ffffff);border-top:1px solid #d3e3e0;padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:10px;font-size:14px;color:#1f3a3d;margin-bottom:10px;font-weight:500}}
.sl{{position:relative;height:22px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:2px;background:#d3e3e0}}.sl .fi{{position:absolute;top:10px;left:0;height:2px;background:#383d78}}
.sl .th{{position:absolute;top:3px;margin-left:-8px;width:16px;height:16px;transform:rotate(45deg);background:#fff;border:1.5px solid #383d78}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;color:#383d78;font-size:12px;font-weight:500}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}.tools span{{color:#1f3a3d}}
.night{{background:#081a22}}.night .rd{{background:#0a171d;color:#dce8e6}}
.night .rtop{{background:linear-gradient(180deg,#0c2430,#0f2731);border-color:#234652}}.night .rbot{{background:linear-gradient(0deg,#0c2430,#0f2731);border-color:#234652}}
.night .rtop .t,.night .pg,.night .tools span{{color:#e3f1ef}}.night .ib,.night .tools{{color:#b8bcff}}
.night .sl .tr{{background:#234652}}.night .sl .fi{{background:#8fe3cf;box-shadow:0 0 6px rgba(143,227,207,.5)}}.night .sl .th{{background:#0f2731;border-color:#8fe3cf;box-shadow:0 0 8px rgba(143,227,207,.45)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Утром берег был совершенно пуст. Песок, ещё влажный после прилива, хранил только следы чаек да тонкие линии, которые вода оставила, уходя. "
 "Марина шла вдоль кромки и думала о том, что тишина бывает разной: одна давит, другая лечит. Эта была второй. Она села на тёплый камень и открыла блокнот. ")
def reader(night=False):
    pct=97/184*100
    sm=''
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Отлив</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop">{sm}<div class="ib">{ic("arrow-left")}</div><div class="t">Тихий берег</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}<span>Оглавление</span></div><div>{ic("type")}<span>Текст</span></div><div>{ic("sun" if night else "moon")}<span>{"День" if night else "Ночь"}</span></div><div>{ic("bookmark-plus")}<span>Закладка</span></div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{gem(22)}<b>390</b> камней</div>'
def scene(): return f'<div class="bg"></div>{shore()}'
# обложки: светлые камни с тёмным текстом, тёмные — со светлым
COV=[('Тихий берег','Е. Волна','EPUB','53%','#e3f6f0','#b9e6d8','#1f3a3d'),('Морская соль','А. Ракитин','FB2','12%','#2f5d7a','#1f3a5a','#ffffff'),('Белый песок','М. Светлова','TXT','прочитано','#f3eefb','#ddd2f2','#2d2a4a'),
 ('Глубина','К. Лазарев','PDF','не начата','#38407a','#232a55','#ffffff'),('Перламутр','О. Тихонова','EPUB','4%','#fbf6ea','#efe2c4','#3d2f12'),('Отражения','С. Миров','PDF','67%','#1f5a52','#123a36','#ffffff')]
def library():
    css='''<style>.chips{position:absolute;top:118px;left:22px;right:22px;display:flex;gap:18px;border-bottom:1px solid #d3e3e0}.chip{padding:6px 0 9px;font-size:14px;color:#4a6466;font-weight:500}.chip.on{color:#383d78;font-weight:600;box-shadow:inset 0 -2px 0 #c8a24a}
.grid{position:absolute;top:172px;left:22px;right:22px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px 14px}.bk{min-width:0}
.cv{position:relative;height:144px;overflow:hidden;padding:36px 8px 0;text-align:center;clip-path:polygon(12% 0,88% 0,100% 9%,100% 91%,88% 100%,12% 100%,0 91%,0 9%)}
.cv:before{content:"";position:absolute;inset:0;background:linear-gradient(125deg,rgba(255,255,255,.12) 0 30%,transparent 30% 60%,rgba(255,255,255,.06) 60% 100%)}
.fmt{position:absolute;top:12px;left:0;right:0;font-family:"Tenor Sans";font-size:9.5px;letter-spacing:2px}
.ct{font-size:18px;line-height:1.1;position:relative}.ca{font-size:11px;margin-top:6px;position:relative}
.bt{font-size:13px;font-weight:500;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ba{font-size:12px;color:#4a6466;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style>'''
    cards=''
    for i,(t,a,f,p,c1,c2,fg) in enumerate(COV):
        prog=f'<div class="bar" style="margin-top:6px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        sm=seam(110,144,i,'#c8a24a' if fg!='#ffffff' else '#e0c27a') if i in (1,4) else ''
        cards+=f'<div class="bk"><div class="cv" style="background:linear-gradient(160deg,{c1},{c2});color:{fg}">{sm}<div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:18px;bottom:84px">{mascot(62)}</div>'
    return css+scene()+f'<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def rewards():
    css='''<style>.sec{position:absolute;left:22px;right:22px}.sh{font-size:11px;color:#4a6466;margin-bottom:12px}
.q{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-bottom:12px}.q .tx{flex:1;min-width:0}.q .tt{font-family:"Forum";font-size:19px}.q .ds{font-size:12.5px;color:#4a6466;margin:2px 0 8px}
.amt{display:flex;align-items:center;gap:4px;font-weight:600;font-size:15px;color:#2a6f62}
.case{padding:18px 10px 14px;overflow:hidden}.shelf{position:absolute;left:0;right:0;top:118px;height:1px;background:#d3e3e0;box-shadow:0 1px 0 #fff}
.rc{display:flex;gap:6px}.it{flex:1 1 0;min-width:0;text-align:center}.it .art{height:96px;display:flex;align-items:center;justify-content:center;position:relative}
.it .nm{font-size:13px;font-weight:500;line-height:1.2;height:36px;display:flex;align-items:center;justify-content:center;margin-top:8px}
.it .pr{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:#2a6f62;border-top:1px solid #c8a24a;padding-top:4px}
.add{display:flex;align-items:center;gap:12px;padding:12px 4px;margin-top:16px;border-top:1px solid #d3e3e0}.add .tt{font-weight:600;font-size:14px;color:#383d78}.add .ds{font-size:12.5px;color:#4a6466}</style>'''
    q1=f'<div class="pearl q">{facets_gem(6)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">10 мин · огранено 6 из 10 граней</div><div class="bar"><i style="width:60%"></i></div></div><div class="amt">{gem(16)}+30</div></div>'
    q2=f'<div class="pearl q">{seam(346,96,9)}{gem(40,"#f1eefc","#b8bcff","#565ca6","#383d78")}<div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:linear-gradient(90deg,#b8bcff,#565ca6)"></i></div></div><div class="amt" style="color:#383d78">{gem(16)}+120</div></div>'
    def plinth(inner,c): return f'<div style="position:relative;display:flex;flex-direction:column;align-items:center">{inner}<div style="width:54px;height:8px;margin-top:4px;background:linear-gradient(90deg,{c},#fff);clip-path:polygon(8% 0,92% 0,100% 100%,0 100%)"></div></div>'
    items=[('Серия сериала',plinth(gem(54,'#ffe9ef','#f2a7bd','#b85a78','#8a3a56'),'#f2c9d6'),),('Кофе в кофейне',plinth(gem(54,'#fff6dd','#e8c77a','#a8823a','#7a5a12'),'#efdcae'),),('Новая книга',plinth(gem(54),'#bfe8dc'),)]
    cards=''.join(f'<div class="it"><div class="art">{a}</div><div class="nm">{n}</div><div class="pr">{gem(14)}XXX</div></div>' for n,a in items)
    pk=f'<div class="abs" style="left:18px;bottom:84px;transform:scaleX(-1)">{mascot(56)}</div>'
    return css+scene()+f'''<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:118px"><div class="sh lbl">Задания</div>{q1}{q2}</div>
<div class="sec" style="top:378px"><div class="sh lbl">Витрина</div><div class="pearl case"><div class="shelf"></div><div class="rc">{cards}</div></div>
<div class="add"><div style="color:#383d78">{ic("plus",24)}</div><div><div class="tt">Добавить в витрину</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в камнях.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css='''<style>.veil{position:absolute;inset:0;background:rgba(31,58,61,.12)}.sm{position:absolute;left:22px;right:22px;top:150px;padding:30px 22px 22px;text-align:center;overflow:hidden}
.sm h2{font-size:30px}.sub{font-size:13px;color:#4a6466;margin:4px 0 16px}.stats{display:flex;margin:6px 0 18px;border-top:1px solid #d3e3e0;border-bottom:1px solid #d3e3e0}.st{flex:1;padding:12px 4px}.st+.st{border-left:1px solid #d3e3e0}
.st b{display:block;font-family:"Forum";font-weight:400;font-size:26px;line-height:1.2}.st span{font-size:12px;color:#4a6466}
.xpl{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:500;margin-bottom:8px}
.rw{display:flex;align-items:center;gap:14px;text-align:left;padding:14px 0;margin:16px 0 4px;border-top:1px solid #d3e3e0}.rw .tt{font-weight:600;font-size:15px;color:#2a6f62}.rw .ds{font-size:12.5px;color:#4a6466}
.wk{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin:6px 0 20px}.dots{display:flex;gap:4px}</style>'''
    dots=''.join(gem(18) for _ in range(3))+gem(18,'#ffffff','#eef3f2','#d3e3e0','#a9bcba')
    inner=f'''{seam(346,520,21)}<div class="lbl" style="color:#7a5a12;margin-bottom:6px">отлив · конец сессии</div><h2 class="H">Сессия завершена</h2><div class="sub">Тихий берег · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:#383d78">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{facets_gem(10,10,50)}<div><div class="tt">+30 камней за день</div><div class="ds">Камень огранён · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene()+f'<div class="veil"></div><div class="pearl sm">{inner}</div>'
SW=[('Индиго-аметист','#383d78','акцент, кнопки'),('Аметист светл.','#565ca6','градиент кнопок'),('Лаванда','#b8bcff','акцент ночи'),('Золото кинцуги','#c8a24a','швы, линии'),
 ('Золото текст','#7a5a12','подписи-золото'),('Аквамарин','#8fdcc4','грани, шкалы'),('Мята тёмн.','#2a6f62','текст камней'),('Мята','#d9f7ee','грани светлые'),
 ('Небо','#eaf3f6','верх фона'),('Жемчуг','#f7f9f8','фон'),('Песок','#f3ece0','берег'),('Чернила моря','#1f3a3d','текст UI'),
 ('Ночь: глубина','#081a22','фон ночи'),('Ночь: волна','#0f2731','панели ночи'),('Ночь: свечение','#8fe3cf','камни ночью'),('Ночь: текст','#dce8e6','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css='<style>.wrap{position:absolute;inset:0;padding:54px 22px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 8px;margin-top:14px}.s{text-align:center;font-size:11px}.c{height:52px;clip-path:polygon(15% 0,85% 0,100% 30%,50% 100%,0 30%);margin-bottom:6px}.s b{display:block;font-weight:600}.s span{display:block;font-family:monospace;color:#4a6466}.s em{font-style:normal;color:#4a6466;font-size:10px}.f{margin-top:18px;font-size:14px;line-height:1.6}</style>'
    return css+scene()+f'''<div class="wrap"><h1 class="H" style="font-size:28px">Палитра «Кристальный берег»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:22px">Forum — заголовки</div><div class="lbl">Tenor Sans — метки и кнопки</div><div>Jost — интерфейс</div><div style="font-family:'Source Serif Pro'">Source Serif Pro — текст книги</div>
<div style="display:flex;gap:12px;align-items:center;margin-top:8px">{gem(40)}{facets_gem(6)}{mascot(60)}</div></div></div>'''
SC=[('kristalnyi-bereg-reader-day',reader(),'','Читалка · день'),('kristalnyi-bereg-reader-night',reader(True),'night','Читалка · ночь'),('kristalnyi-bereg-library',library(),'','Библиотека'),
    ('kristalnyi-bereg-rewards',rewards(),'','Награды'),('kristalnyi-bereg-session-summary',summary(),'','Итог сессии'),('kristalnyi-bereg-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#eef4f3');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(glob.glob(gf+'Forum/*.ttf')[0],46);fC=ImageFont.truetype([f for f in glob.glob(gf+'Jost/*.ttf') if 'Italic' not in f][0],22)
    d.text((G,16),'ReadQuest — скин «Кристальный берег»',font=fH,fill='#1f3a3d')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#4a6466',anchor='ma')
    ov.save(f'{OUT}/kristalnyi-bereg-overview.png')
