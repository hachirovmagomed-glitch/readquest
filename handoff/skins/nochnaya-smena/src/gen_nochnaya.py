# ReadQuest · скин «Ночная смена» — генератор макетов. Запуск: python3 gen_nochnaya.py
import os,random,subprocess,glob
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
'coffee':'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
'tv':'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 2l4 4 4-4"/>',
'camera':'<rect x="2" y="7" width="14" height="10" rx="1"/><path d="M16 10l6-3v10l-6-3z"/>',
}
def ic(n,sz=22,w=2): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="square" stroke-linejoin="miter">{ICONS[n]}</svg>'
def token(sz=22):
    """Монета = аркадный жетон: латунь, насечка по краю, звезда-пробойник."""
    teeth=''.join(f'<rect x="19" y="1" width="2" height="4" fill="#5e3f0a" transform="rotate({a} 20 20)"/>' for a in range(0,360,20))
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><circle cx="20" cy="20" r="19" fill="#c9952b"/>{teeth}
<circle cx="20" cy="20" r="14.5" fill="#e8b84a" stroke="#7a5410" stroke-width="1.5"/><circle cx="20" cy="20" r="11" fill="none" stroke="#fff1c0" stroke-width=".8" stroke-dasharray="2 2"/>
<path d="M20 12l2.3 5 5.4.5-4.1 3.6 1.2 5.3-4.8-2.8-4.8 2.8 1.2-5.3-4.1-3.6 5.4-.5z" fill="#7a5410"/></svg>'''
def star(sz=18,c='#e8b84a',rot=0):
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="transform:rotate({rot}deg)"><path d="M12 1.5l3 6.8 7.4.7-5.6 4.9 1.7 7.3L12 17.4 5.5 21.2l1.7-7.3L1.6 9l7.4-.7z" fill="{c}" stroke="#fff8e6" stroke-width="1.6" stroke-linejoin="round"/></svg>'
def mascot(sz=120,flip=False):
    """Оригинальный маскот «Угу-3000»: робот-сова-сторож. Круглая голова-фонарь, разные глаза, антенна-перо, кепка охранника."""
    tr=' transform="scale(-1,1) translate(-120,0)"' if flip else ''
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 120 120"><g{tr}>
<path d="M30 30 L22 8 L44 24Z M90 30 L98 8 L76 24Z" fill="#6f6a5c" stroke="#2b2118" stroke-width="2.5"/>
<rect x="16" y="22" width="88" height="96" rx="40" fill="#9c9583" stroke="#2b2118" stroke-width="3"/>
<path d="M28 40 Q60 20 92 40 L92 46 L28 46Z" fill="#33473d" stroke="#2b2118" stroke-width="2.5"/><rect x="52" y="30" width="16" height="9" rx="2" fill="#e8b84a" stroke="#2b2118" stroke-width="1.5"/>
<circle cx="42" cy="66" r="17" fill="#2b2118"/><circle cx="78" cy="66" r="17" fill="#2b2118"/>
<circle cx="42" cy="66" r="11" fill="#f2e7c9"/><circle cx="44" cy="67" r="5" fill="#b0262a"/><circle cx="46" cy="64" r="1.6" fill="#fff"/>
<circle cx="78" cy="66" r="11" fill="#5c574b"/><path d="M68 66h20" stroke="#2b2118" stroke-width="3"/>
<path d="M54 82 L60 94 L66 82Z" fill="#e8b84a" stroke="#2b2118" stroke-width="2"/>
<circle cx="24" cy="100" r="2" fill="#2b2118"/><circle cx="96" cy="100" r="2" fill="#2b2118"/><path d="M40 108h40" stroke="#2b2118" stroke-width="2" stroke-dasharray="4 3"/></g></svg>'''
def bunting(w=W,n=11,y=0):
    cs=['#b0262a','#e8b84a','#2f6a6a','#e9dcc4','#6a3d7a']
    s=f'<path d="M0 {y+6} Q{w/2} {y+22} {w} {y+6}" stroke="#2b2118" stroke-width="1.2" fill="none"/>'
    for i in range(n):
        x=(i+.5)*w/n; t=(x/w); yy=y+6+16*4*t*(1-t)
        s+=f'<path d="M{x-11} {yy} L{x+11} {yy} L{x} {yy+20}Z" fill="{cs[i%5]}" stroke="#2b2118" stroke-width="1" opacity=".92"/>'
    return f'<svg class="abs" style="left:0;top:{0}px" width="{w}" height="{y+44}">{s}</svg>'
def grime(n,seed,w=W,h=H,col='43,33,24',op=(.02,.05)):
    r=random.Random(seed); s=''
    for _ in range(n):
        x=r.uniform(0,w);y=r.uniform(0,h);a=r.uniform(4,26);o=r.uniform(*op)
        s+=f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{a:.0f}" ry="{a*r.uniform(.4,1):.0f}" fill="rgba({col},{o:.2f})"/>'
    return f'<svg class="abs" style="left:0;top:0" width="{w}" height="{h}">{s}</svg>'
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"PT Sans",sans-serif;color:#2b2118;background:#e9dcc4}}
.abs{{position:absolute;pointer-events:none}}
.H{{font-family:"Oswald",sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px}}
.px{{font-family:"Press Start 2P",monospace;font-size:8px;letter-spacing:.5px;line-height:1.4}}
.mono{{font-family:"IBM Plex Mono",monospace}}
.bg{{position:absolute;inset:0;background:radial-gradient(90% 45% at 50% 18%,#f3e6c8 0,#e9dcc4 55%,#d6c5a4 100%)}}
.floor{{position:absolute;left:0;right:0;bottom:0;height:200px;background:
 linear-gradient(180deg,#e9dcc4 0,rgba(233,220,196,0) 40%),
 conic-gradient(#2b2118 25%,#efe4cc 0 50%,#2b2118 0 75%,#efe4cc 0) 0 0/36px 36px;opacity:.55;transform:perspective(300px) rotateX(38deg);transform-origin:bottom}}
.panel{{position:relative;background:#f5ecda;border:2px solid #2b2118;border-radius:6px;box-shadow:4px 4px 0 rgba(43,33,24,.85)}}
.tape{{position:absolute;width:52px;height:16px;background:rgba(232,216,160,.85);border:1px solid rgba(43,33,24,.15);top:-8px}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between}}
.sign{{display:inline-block;padding:3px 12px 2px;background:#2b2118;color:#f3e6c8;border-radius:4px;font-size:28px;box-shadow:0 0 0 3px #e8b84a,0 0 0 5px #2b2118;position:relative}}
.sign:after{{content:"";position:absolute;inset:-3px;background:radial-gradient(circle,#ffe8a0 0 2px,transparent 2.5px) 0 0/12px 100%;opacity:.0}}
.bal{{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 6px;font-weight:700;font-size:14px;color:#2b2118;background:#f5ecda;border:2px solid #2b2118;border-radius:20px;box-shadow:3px 3px 0 #2b2118}}
.nav{{position:absolute;left:12px;right:12px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 6px;background:#2b2118;border-radius:10px;box-shadow:0 0 0 2px #e8b84a,4px 6px 0 rgba(43,33,24,.5);isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:700;color:#d6c5a4;position:relative;padding:6px 0;text-transform:uppercase;letter-spacing:.5px}}
.nav .on{{color:#1a0f08}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;border-radius:6px;z-index:-1;background:#e8b84a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}}
.btn{{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:8px;font-family:"Oswald",sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;font-size:18px;color:#fff;
 background:#b0262a;border:2px solid #2b2118;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25),4px 4px 0 #2b2118}}
.cap{{font-size:12px;color:#5e4b36;font-weight:700}}
.crt{{position:relative;background:#0e1410;border:3px solid #2b2118;border-radius:14px;box-shadow:inset 0 0 0 2px #3a4a40,inset 0 0 28px rgba(126,230,150,.18),4px 4px 0 rgba(43,33,24,.85);color:#bff0c8;overflow:hidden}}
.crt:after{{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);pointer-events:none}}
.crt .tag{{position:absolute;top:7px;left:10px;color:#9fe0ac}}.crt .ts{{position:absolute;top:7px;right:10px;color:#ffb000}}
.rec{{display:inline-block;width:6px;height:6px;border-radius:50%;background:#ff4a3d;margin-right:4px;box-shadow:0 0 6px #ff4a3d}}
.batt{{display:flex;align-items:center;gap:2px}}.batt i{{width:14px;height:20px;border:1.5px solid #9fe0ac;border-radius:2px}}.batt i.f{{background:#7ee696;box-shadow:0 0 6px rgba(126,230,150,.7)}}.batt b{{width:4px;height:10px;background:#9fe0ac;border-radius:0 2px 2px 0}}
/* читалка: страница без сканлайнов, шума и декора */
.rd{{position:absolute;inset:0;background:#f3ead8;color:#261d15}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:18px 26px 0;font-family:"PT Serif",serif;font-size:16.5px;line-height:1.62;text-align:left}}
.page h3{{font-family:"PT Serif",serif;font-size:19px;font-weight:700;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:#dccbaa;border-bottom:3px solid #2b2118;overflow:hidden}}
.rtop:before,.rbot:before{{content:"";position:absolute;left:0;right:0;height:5px;background:repeating-linear-gradient(-45deg,#2b2118 0 6px,#e8b84a 6px 12px);opacity:.85}}
.rtop:before{{bottom:0}}.rbot:before{{top:0}}
.rtop .t{{flex:1;text-align:center;font-family:"Oswald",sans-serif;font-weight:600;font-size:19px;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#2b2118}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:#2b2118}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:#dccbaa;border-top:3px solid #2b2118;padding:18px 22px 0}}
.pg{{display:flex;justify-content:center;align-items:center;gap:10px;font-size:14px;color:#2b2118;margin-bottom:10px;font-weight:700}}
.sl{{position:relative;height:22px}}.sl .tr{{position:absolute;top:8px;left:0;right:0;height:6px;background:#bfae8c;border:1.5px solid #2b2118}}.sl .fi{{position:absolute;top:8px;left:0;height:6px;background:#b0262a;border:1.5px solid #2b2118}}
.sl .th{{position:absolute;top:0;margin-left:-11px;width:22px;height:22px;border-radius:4px;background:#e8b84a;border:2px solid #2b2118;box-shadow:2px 2px 0 #2b2118}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;color:#2b2118;font-size:11.5px;font-weight:700;text-transform:uppercase}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}
.night{{background:#0b0e0c}}.night .rd{{background:#101311;color:#d9d4c4}}
.night .rtop,.night .rbot{{background:#121a15;border-color:#2f3f35;box-shadow:inset 0 0 24px rgba(126,230,150,.10)}}
.night .rtop:before,.night .rbot:before{{background:repeating-linear-gradient(-45deg,#2a1210 0 6px,#a8332a 6px 12px);opacity:.7}}
.night .rtop:after,.night .rbot:after{{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 1px,transparent 1px 3px);pointer-events:none}}
.night .rtop .t,.night .pg{{color:#d8e6d4}}.night .ib,.night .tools{{color:#9fe0ac}}
.night .sl .tr{{background:#1f2a23;border-color:#3a4a40}}.night .sl .fi{{background:#ff5a4e;border-color:#ff5a4e;box-shadow:0 0 8px rgba(255,90,78,.6)}}.night .sl .th{{background:#ffb000;border-color:#0b0e0c;box-shadow:0 0 10px rgba(255,176,0,.6)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Сторож обошёл зал ещё раз. Стулья были подняты на столы, и в тусклом свете ламп их ножки торчали, как ветки зимнего леса. "
 "За стойкой тихо гудел холодильник, а со стены смотрели выцветшие афиши давно прошедших праздников. "
 "Он сел у окна, открыл термос и достал книгу, которую начал ещё весной. До утра оставалось много страниц. ")
def reader(night=False):
    pct=97/184*100
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Ночной обход</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">Последний автобус</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span class="mono">98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{token(24)}<span class="mono">390</span> жетонов</div>'
def stickers(lst): return ''.join(f'<div class="abs" style="left:{x}px;top:{y}px">{star(s,c,r)}</div>' for x,y,s,c,r in lst)
def scene(seed):
    return f'<div class="bg"></div><div class="floor"></div>{grime(40,seed)}{bunting(y=0)}'
COV=[('Последний автобус','С. Белова','EPUB','53%','#b0262a','#fff'),('Тёплый свет','Г. Руденко','FB2','12%','#2f6a6a','#fff'),('Кафе на углу','Н. Зуева','TXT','прочитано','#e8b84a','#2b2118'),
 ('Карта звёзд','О. Миронов','PDF','не начата','#6a3d7a','#fff'),('Старый парк','В. Кузнецова','EPUB','4%','#e9dcc4','#2b2118'),('Сто лампочек','Р. Ахмедов','PDF','67%','#33473d','#fff')]
def library():
    css='''<style>.chips{position:absolute;top:112px;left:20px;right:20px;display:flex;gap:8px}.chip{padding:7px 13px;font-size:13px;font-weight:700;background:#f5ecda;border:2px solid #2b2118;border-radius:4px;text-transform:uppercase;letter-spacing:.4px;
 -webkit-mask:radial-gradient(circle 4px at 0 50%,#0000 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 4px at 100% 50%,#0000 98%,#000) right/51% 100% no-repeat}
.chip.on{background:#b0262a;color:#fff}
.grid{position:absolute;top:164px;left:16px;right:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}.bk{min-width:0}
.cv{position:relative;height:150px;border:2px solid #2b2118;border-radius:4px;overflow:hidden;padding:34px 8px 0;text-align:center;box-shadow:3px 3px 0 #2b2118}
.cv:before{content:"";position:absolute;inset:6px;border:1.5px dashed currentColor;opacity:.45}
.fmt{position:absolute;top:9px;left:50%;transform:translateX(-50%)}
.ct{font-size:17px;line-height:1.1}.ca{font-size:10.5px;margin-top:6px;font-weight:700}
.bt{font-size:12.5px;font-weight:700;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ba{font-size:11.5px;color:#5e4b36;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pb{height:8px;margin-top:5px;background:#d6c5a4;border:1.5px solid #2b2118}.pb i{display:block;height:100%;background:#b0262a}</style>'''
    cards=''
    for t,a,f,p,bg,fg in COV:
        prog=f'<div class="pb"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg}"><div class="fmt px">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    peek=f'<div class="abs" style="right:-30px;bottom:66px;transform:rotate(-12deg)">{mascot(100,True)}</div>'
    st=stickers([(16,690,26,'#e8b84a',-12),(70,712,18,'#b0262a',18),(300,150,20,'#e8b84a',10)])
    return css+scene(3)+f'<div class="hdr"><h1 class="H sign">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{st}{peek}{nav("Библиотека")}'
def battery(n,tot=10): return '<div class="batt">'+''.join(f'<i class="{"f" if k<n else ""}"></i>' for k in range(tot))+'<b></b></div>'
def ticket(inner,bg,fg):
    return f'''<div class="tk" style="background:{bg};color:{fg}">{inner}</div>'''
def rewards():
    css='''<style>.sec{position:absolute;left:20px;right:20px}.sh{display:flex;align-items:center;gap:8px;font-family:"Oswald",sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:20px;margin-bottom:10px}
.mon{padding:28px 14px 12px}.mon .tt{font-family:"Oswald",sans-serif;font-weight:500;font-size:17px;letter-spacing:.5px;color:#d8f5dc}.mon .ds{font-size:12.5px;color:#bff0c8;margin:3px 0 8px}.mon .row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.amt{display:flex;align-items:center;gap:4px;font-family:"IBM Plex Mono",monospace;font-weight:700;font-size:16px;color:#ffb000}
.wk{margin-top:12px}.wkb{display:flex;gap:6px}.wkb i{flex:1;height:12px;border:1.5px solid #9fe0ac}.wkb i.f{background:#ffb000;border-color:#ffb000;box-shadow:0 0 6px rgba(255,176,0,.6)}
.rc{display:flex;gap:8px}.tk{flex:1 1 0;min-width:0;position:relative;padding:12px 4px 10px;text-align:center;border:2px solid #2b2118;box-shadow:3px 3px 0 #2b2118;
 -webkit-mask:radial-gradient(circle 7px at 50% 0,#0000 98%,#000) top/100% 51% no-repeat,radial-gradient(circle 7px at 50% 100%,#0000 98%,#000) bottom/100% 51% no-repeat}
.tk:before{content:"";position:absolute;left:6px;right:6px;top:50%;border-top:2px dashed currentColor;opacity:.35}
.tk .art{height:50px;display:flex;align-items:center;justify-content:center}.tk .nm{font-size:13px;font-weight:700;line-height:1.2;height:48px;display:flex;align-items:center;justify-content:center;padding:0 4px}
.tk .pr{display:inline-flex;align-items:center;gap:4px;margin-top:4px;background:#2b2118;color:#ffcf5a;border-radius:3px;padding:3px 8px 3px 3px;font-family:"IBM Plex Mono",monospace;font-weight:700;font-size:12px}
.add{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:16px;border:2.5px dashed #2b2118;border-radius:6px;background:rgba(245,236,218,.85)}.add .tt{font-weight:700;font-size:14px;text-transform:uppercase}.add .ds{font-size:12.5px;color:#5e4b36}</style>'''
    mon=f'''<div class="crt mon"><div class="tag px"><span class="rec"></span>CAM 03</div><div class="ts px">12:00 AM</div>
<div class="row"><div><div class="tt">ЗАДАНИЕ ДНЯ · ЗАРЯД</div><div class="ds">Читать 10 мин · 6 из 10 мин</div></div><div class="amt">{token(18)}+30</div></div>{battery(6)}
<div class="wk"><div class="row"><div><div class="tt">ЗАДАНИЕ НЕДЕЛИ</div><div class="ds">4 дня по 10 мин · 3 из 4</div></div><div class="amt">{token(18)}+120</div></div><div class="wkb"><i class="f"></i><i class="f"></i><i class="f"></i><i></i></div></div></div>'''
    cards=''
    for (n,i),bg,fg in zip((('Серия сериала','tv'),('Кофе в кофейне','coffee'),('Новая книга','book-open')),('#b0262a','#e8b84a','#2f6a6a'),('#fff','#2b2118','#fff')):
        cards+=ticket(f'<div class="art">{ic(i,32,2.2)}</div><div class="nm">{n}</div><div class="pr">{token(16)}XXX</div>',bg,fg)
    peek=f'<div class="abs" style="left:-28px;bottom:66px;transform:rotate(14deg)">{mascot(96)}</div>'
    st=stickers([(330,640,24,'#e8b84a',14),(352,676,16,'#b0262a',-10)])
    return css+scene(11)+f'''<div class="hdr"><h1 class="H sign">Награды</h1>{bal()}</div>
<div class="sec" style="top:116px"><div class="sh">{ic("camera",20)}Задания</div>{mon}</div>
<div class="sec" style="top:392px"><div class="sh">{star(18)}Призовая стойка</div><div class="rc">{cards}</div>
<div class="add"><div>{ic("plus",26)}</div><div><div class="tt">Добавить приз</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в жетонах.</div></div></div></div>{st}{peek}{nav("Награды")}'''
def summary():
    css='''<style>.veil{position:absolute;inset:0;background:rgba(20,14,8,.35)}.sm{position:absolute;left:20px;right:20px;top:140px;padding:24px 18px 20px;text-align:center}
.sm h2{font-size:30px}.sub{font-size:13px;color:#5e4b36;margin:2px 0 10px}.stats{display:flex;gap:8px;margin:12px 0 14px}.st{flex:1;padding:10px 4px;border:2px solid #2b2118;background:#efe4cc}
.st b{display:block;font-family:"IBM Plex Mono",monospace;font-size:22px;line-height:1.2}.st span{font-size:12px;color:#5e4b36;font-weight:700;text-transform:uppercase}
.xpl{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:700;margin-bottom:6px}.xb{height:12px;border:2px solid #2b2118;background:#d6c5a4;margin-bottom:14px}.xb i{display:block;height:100%;background:repeating-linear-gradient(90deg,#b0262a 0 10px,#8a1d20 10px 12px)}
.ch{padding:24px 12px 10px;margin-bottom:14px;text-align:left}.ch .row{display:flex;align-items:center;gap:10px}.ch .tt{font-family:"Oswald",sans-serif;font-size:16px;color:#d8f5dc}.ch .ds{font-size:12.5px;color:#bff0c8}
.wk{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;margin:4px 2px 16px}.dots{display:flex;gap:6px}.dots i{width:16px;height:16px;border:2px solid #2b2118}.dots i.f{background:#e8b84a}</style>'''
    inner=f'''<div class="tape" style="left:30px;transform:rotate(-6deg)"></div><div class="tape" style="right:30px;transform:rotate(5deg)"></div>
<div class="px" style="color:#8a1d20;font-size:9px;margin-bottom:8px">06:00 AM · СМЕНА ОКОНЧЕНА</div><h2 class="H">Сессия завершена</h2><div class="sub">Последний автобус · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:#8a1d20">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="xb"><i style="width:64%"></i></div>
<div class="crt ch"><div class="tag px"><span class="rec"></span>CAM 01</div><div class="ts px">06:00 AM</div><div class="row">{token(38)}<div style="flex:1"><div class="tt">+30 ЖЕТОНОВ ЗА ДЕНЬ</div><div class="ds">Заряд 100% · цель 10 мин, сегодня 18 мин</div></div></div><div style="margin-top:8px">{battery(10)}</div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots"><i class="f"></i><i class="f"></i><i class="f"></i><i></i></div></div><div class="btn">Продолжить</div>'''
    return css+scene(5)+f'<div class="veil"></div><div class="panel sm">{inner}</div>'
SW=[('Сажа','#2b2118','текст, контуры'),('Обои','#e9dcc4','фон дня'),('Бумага','#f5ecda','панели'),('Кафель','#d6c5a4','вторичный фон'),
 ('Табличка','#5e4b36','вторичный текст'),('Вывеска','#b0262a','акцент'),('Вывеска тёмн.','#8a1d20','нажатие, текст'),('Латунь','#e8b84a','жетоны, активное'),
 ('Латунь тёмн.','#7a5410','текст жетонов'),('Бирюза кафе','#2f6a6a','декор'),('Слива флажков','#6a3d7a','декор'),('Страница','#f3ead8','книга день'),
 ('Офис','#0b0e0c','фон ночи'),('ЭЛТ-зелёный','#9fe0ac','UI ночи'),('Янтарь','#ffb000','жетоны ночи'),('Тревога','#ff5a4e','акцент ночи')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css='<style>.wrap{position:absolute;inset:0;padding:56px 18px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;margin-top:12px}.s{text-align:center;font-size:11px}.c{height:54px;border:2px solid #2b2118;border-radius:4px;box-shadow:3px 3px 0 #2b2118;margin-bottom:6px}.s b{display:block}.s span{display:block;font-family:"IBM Plex Mono";color:#5e4b36}.s em{font-style:normal;color:#5e4b36;font-size:10px}.f{margin-top:16px;font-size:14px;line-height:1.55}</style>'
    return css+f'''<div class="bg"></div>{bunting(y=0)}<div class="wrap"><h1 class="H sign" style="font-size:24px">Палитра «Ночная смена»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:20px">Oswald — вывески и кнопки</div><div class="px" style="font-size:9px;margin:4px 0">Press Start 2P — CAM 03 · 12:00 AM</div><div>PT Sans — интерфейс · <span class="mono">IBM Plex Mono — 390 / 18:00</span></div><div style="font-family:PT Serif">PT Serif — текст книги, спокойная антиква</div>
<div style="display:flex;gap:10px;align-items:center;margin-top:10px">{token(40)}<div class="crt" style="padding:8px 10px">{battery(6)}</div><div style="margin-left:-6px">{mascot(70)}</div></div></div></div>'''
SC=[('nochnaya-smena-reader-day',reader(),'','Читалка · день'),('nochnaya-smena-reader-night',reader(True),'night','Читалка · ночь'),('nochnaya-smena-library',library(),'','Библиотека'),
    ('nochnaya-smena-rewards',rewards(),'','Награды'),('nochnaya-smena-session-summary',summary(),'','Итог сессии'),('nochnaya-smena-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#1a1410');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(glob.glob(gf+'Oswald/*.ttf')[0],44);fH.set_variation_by_axes([600]) if hasattr(fH,'set_variation_by_axes') else None
    fC=ImageFont.truetype(glob.glob(gf+'PT Sans/*Regular*.ttf')[0],22)
    d.text((G,18),'READQUEST — СКИН «НОЧНАЯ СМЕНА»',font=fH,fill='#e8b84a')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#d6c5a4',anchor='ma')
    ov.save(f'{OUT}/nochnaya-smena-overview.png')
