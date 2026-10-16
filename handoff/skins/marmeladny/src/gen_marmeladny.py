# ReadQuest · скин «Мармеладный» — генератор макетов. Запуск: python3 gen_marmeladny.py
import os,random,subprocess
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
W,H=360,780
P=dict(  # палитра
 rasp='#d81b60',rasp_d='#a3134a',orange='#ff8a1f',orange_d='#b84d00',lime='#7cc61e',lime_d='#3f7a0c',
 grape='#8e44c9',grape_d='#6a2c9e',lemon='#ffd23f',cream='#fff4ec',cream2='#ffe7dd',ink='#4a1f36',ink2='#7a4560')
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>',
'bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
'type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="5" rx="1.5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
'plus':'<path d="M12 5v14M5 12h14"/>',
'coffee':'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
'tv':'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M8 2l4 4 4-4"/>',
}
def ic(n,sz=22,w=2.1): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_gid=[0]
def drop(sz=22,c1='#ffb35c',c2='#e86a00',edge='#b84d00'):
    """Монета = мармеладная капля: полупрозрачная, с бликом и сахарными крупинками."""
    _gid[0]+=1; g=f'd{_gid[0]}'
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".38" cy=".38" r=".75"><stop offset="0" stop-color="#fff1d6"/><stop offset=".35" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient></defs>
<path d="M20 3C27 12 34 18 34 25a14 14 0 0 1-28 0C6 18 13 12 20 3z" fill="url(#{g})" stroke="{edge}" stroke-width="1.6"/>
<ellipse cx="14.5" cy="22" rx="3.2" ry="5.5" fill="#fff" opacity=".75" transform="rotate(20 14.5 22)"/>
<circle cx="24" cy="30" r="1" fill="#fff" opacity=".8"/><circle cx="27" cy="24" r=".8" fill="#fff" opacity=".7"/><circle cx="20" cy="33" r=".7" fill="#fff" opacity=".7"/></svg>'''
def bean(c1,c2,w=14,h=10):
    return f'<i class="bean" style="width:{w}px;height:{h}px;background:radial-gradient(circle at 35% 30%,#fff8 0 18%,transparent 30%),linear-gradient(160deg,{c1},{c2})"></i>'
def sugar(n,seed,w=W,h=H,col='255,255,255',op=(.35,.9)):
    r=random.Random(seed); s=''
    for _ in range(n):
        x=r.uniform(0,w);y=r.uniform(0,h);a=r.uniform(.6,1.6);o=r.uniform(*op)
        s+=f'<rect x="{x:.1f}" y="{y:.1f}" width="{a:.1f}" height="{a:.1f}" rx=".3" transform="rotate({r.randint(0,90)} {x:.1f} {y:.1f})" fill="rgba({col},{o:.2f})"/>'
    return f'<svg class="sugar" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{s}</svg>'
def blobs(night=False):
    """Фоновые мармеладки-пятна (только вне текста книги)."""
    cs=[('#ff7aa8',40,120,90),('#ffb35c',300,60,70),('#a6e36a',320,520,80),('#c79bff',30,640,90),('#ffe066',200,760,60)]
    o=.18 if night else .32
    return ''.join(f'<div class="blob" style="left:{x-r}px;top:{y-r}px;width:{2*r}px;height:{2*r}px;background:radial-gradient(circle at 35% 35%,{c} 0,{c}00 70%);opacity:{o}"></div>' for c,x,y,r in cs)
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Nunito",sans-serif;color:{P['ink']};background:{P['cream']}}}
.H{{font-family:"Rubik",sans-serif;font-weight:600;letter-spacing:.2px}}
.bg{{position:absolute;inset:0;background:radial-gradient(120% 60% at 50% 0%,#ffe3ea 0,{P['cream']} 55%),{P['cream']}}}
.blob{{position:absolute;border-radius:50%;filter:blur(2px)}}
.sugar{{position:absolute;left:0;top:0;pointer-events:none}}
.bean{{display:inline-block;border-radius:50%/60%;box-shadow:inset 0 -1px 0 rgba(0,0,0,.15)}}
.gum{{position:relative;background:linear-gradient(180deg,#fffdfb,#fff3ee);border-radius:24px;border:2px solid #ffd3dc;
 box-shadow:inset 0 3px 0 #fff,inset 0 -4px 0 rgba(216,27,96,.07),0 8px 18px rgba(216,27,96,.16)}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:44px 18px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr h1{{font-size:30px;color:{P['ink']}}}
.bal{{display:flex;align-items:center;gap:6px;border-radius:999px;padding:5px 13px 5px 7px;font-weight:800;font-size:14px;color:#8a3b00;
 background:linear-gradient(180deg,#fff2df,#ffe0bd);border:2px solid #ffc58a;box-shadow:inset 0 2px 0 #fff,0 4px 10px rgba(255,138,31,.28)}}
.nav{{isolation:isolate;position:absolute;left:12px;right:12px;bottom:14px;height:68px;display:flex;align-items:center;padding:0 6px;border-radius:34px}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11.5px;font-weight:800;color:{P['ink2']};position:relative;padding:7px 0}}
.nav .on{{color:#fff}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;border-radius:26px;z-index:-1;
 background:radial-gradient(60% 40% at 35% 22%,#ffffff70,transparent),linear-gradient(180deg,#ef3f7f,{P['rasp_d']});box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 5px 12px rgba(216,27,96,.4)}}
.btn{{display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:27px;font-family:"Rubik",sans-serif;font-weight:600;font-size:18px;color:#fff;position:relative;overflow:hidden;
 background:linear-gradient(180deg,#ef3f7f,{P['rasp_d']});box-shadow:inset 0 -5px 0 rgba(90,0,30,.25),0 8px 18px rgba(216,27,96,.4)}}
.btn:before{{content:"";position:absolute;left:16px;right:40%;top:6px;height:12px;border-radius:8px;background:linear-gradient(180deg,#ffffffaa,#ffffff00)}}
.bar{{height:12px;border-radius:6px;background:#ffe3e8;box-shadow:inset 0 2px 3px rgba(122,69,96,.18)}}
.bar i{{display:block;height:100%;border-radius:6px;position:relative;background:linear-gradient(90deg,#ff5c93,#ff8a1f 50%,#ffd23f);box-shadow:inset 0 -2px 0 rgba(0,0,0,.12)}}
.bar i:after{{content:"";position:absolute;left:5px;right:5px;top:2px;height:3px;border-radius:2px;background:#ffffffa0}}
.cap{{font-size:12px;color:{P['ink2']};font-weight:700}}
/* читалка */
.rd{{position:absolute;inset:0;background:#fff9f3;color:#2e1c24}}
.page{{position:absolute;top:92px;bottom:142px;left:0;right:0;overflow:hidden;padding:18px 24px 0;font-family:"Literata",serif;font-size:16px;line-height:1.62;text-align:left}}
.page h3{{font-family:"Literata",serif;font-size:19px;font-weight:600;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:92px;padding:42px 6px 0;display:flex;align-items:center;background:linear-gradient(180deg,#ffe1ea,#fff3ee);border-radius:0 0 26px 26px;
 box-shadow:inset 0 -3px 0 rgba(216,27,96,.08),0 6px 14px rgba(216,27,96,.12);overflow:hidden}}
.rtop .t{{flex:1;text-align:center;font-family:"Rubik",sans-serif;font-weight:600;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:{P['ink']}}}
.ib{{width:40px;height:40px;margin:0 1px;display:flex;align-items:center;justify-content:center;color:{P['rasp_d']};border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 25%,#ffe6ee 60%);box-shadow:inset 0 -2px 0 rgba(216,27,96,.12)}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:142px;background:linear-gradient(0deg,#ffe6dc,#fff3ee);border-radius:26px 26px 0 0;box-shadow:0 -6px 14px rgba(216,27,96,.12);padding:12px 20px 0;overflow:hidden}}
.pg{{display:flex;justify-content:center;align-items:center;gap:8px;font-weight:800;font-size:14px;color:{P['ink']};margin-bottom:8px}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:8px;left:0;right:0;height:8px;border-radius:4px;background:#ffd6df;box-shadow:inset 0 1px 2px rgba(0,0,0,.12)}}
.sl .fi{{position:absolute;top:8px;left:0;height:8px;border-radius:4px;background:linear-gradient(90deg,#ff5c93,#ff8a1f)}}
.sl .th{{position:absolute;top:0;margin-left:-12px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 18%,#ff5c93 45%,{P['rasp_d']});box-shadow:0 3px 8px rgba(216,27,96,.45)}}
.tools{{display:flex;justify-content:space-around;margin-top:12px;color:{P['rasp_d']};font-size:11.5px;font-weight:800}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:2px}}
.tools div span{{color:{P['ink']}}}
.night{{background:#1d0e1e;color:#f6e3ec}}
.night .rd{{background:#1a0d1b;color:#ead7df}}
.night .rtop{{background:linear-gradient(180deg,#2e1533,#25112a);box-shadow:inset 0 -2px 0 rgba(255,122,168,.18),0 6px 16px rgba(0,0,0,.5)}}
.night .rtop .t{{color:#f6e3ec}}.night .ib{{color:#ff8fb6;background:radial-gradient(circle at 35% 30%,#ff8fb633 0 25%,#3a1d40 70%);box-shadow:inset 0 0 0 1px rgba(255,143,182,.25),0 0 10px rgba(255,122,168,.15)}}
.night .rbot{{background:linear-gradient(0deg,#2e1533,#25112a);box-shadow:0 -6px 16px rgba(0,0,0,.5)}}
.night .pg,.night .tools div span{{color:#f6e3ec}}.night .tools{{color:#ff8fb6}}
.night .sl .tr{{background:#3f2245}}.night .sl .th{{box-shadow:0 0 12px rgba(255,122,168,.6)}}
'''
def html(body,cls=''):
    return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Утро выдалось тихим. Над рекой ещё висел туман, и лодки у причала казались вырезанными из бумаги. "
 "Анна шла вдоль набережной, не торопясь, и думала о письме, которое так и не решилась отправить. "
 "В кармане шуршал конверт, уголок его давно размягчился от прикосновений. Где-то за домами зазвонил колокол, "
 "и она вдруг поняла, что больше не хочет ждать. ")
def reader(night=False):
    pct=97/184*100
    sug=sugar(40,7,W,92,'255,180,210' if night else '255,255,255',(.2,.6) if night else (.5,1))
    sug2=sugar(40,9,W,142,'255,180,210' if night else '255,255,255',(.2,.6) if night else (.5,1))
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Письмо</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop">{sug}<div class="ib">{ic("arrow-left")}</div><div class="t">Тихая гавань</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot">{sug2}<div class="pg">{bean("#ff8fb6","#d81b60",10,8)}<span>98 из 185</span>{bean("#ffc078","#ff8a1f",10,8)}</div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}<span>Оглавление</span></div><div>{ic("type")}<span>Текст</span></div><div>{ic("sun" if night else "moon")}<span>{"День" if night else "Ночь"}</span></div><div>{ic("bookmark-plus")}<span>Закладка</span></div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="gum nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{drop(22)}390 монет</div>'
FR=[('#ec3f80','#a3134a'),('#ffb866','#ff8a1f'),('#b5e86a','#7cc61e'),('#b47ae6','#5c2390'),('#ffe680','#ffc61a'),('#e8505a','#a3182a')]
FG=['#fff','#3a1424','#1f3a06','#fff','#3a2a00','#fff']
COVERS=[('Тихая гавань','А. Морозова','EPUB','53%'),('Северный ветер','И. Лебедев','FB2','12%'),('Сад у моря','Е. Соколова','TXT','прочитано'),
 ('Город огней','П. Волков','PDF','не начата'),('Дом с часами','М. Орлова','EPUB','4%'),('Звёздная карта','Д. Карпов','PDF','67%')]
def library():
    css=f'''<style>.chips{{position:absolute;top:100px;left:18px;right:18px;display:flex;gap:7px}}.chip{{padding:8px 13px;border-radius:999px;font-size:13px;font-weight:800;background:#fff;color:{P['ink2']};box-shadow:inset 0 -2px 0 rgba(216,27,96,.1),0 3px 8px rgba(216,27,96,.1)}}
.chip.on{{color:#fff;background:linear-gradient(180deg,#d81b60,{P['rasp_d']});box-shadow:inset 0 -3px 0 rgba(0,0,0,.2),0 4px 10px rgba(216,27,96,.35)}}
.grid{{position:absolute;top:150px;left:16px;right:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px 12px}}.bk{{min-width:0}}
.cv{{position:relative;height:140px;border-radius:20px;overflow:hidden;padding:30px 8px 0;color:#fff;text-align:center;box-shadow:inset 0 -6px 0 rgba(0,0,0,.14),inset 0 3px 0 rgba(255,255,255,.4),0 8px 14px rgba(122,40,70,.22)}}
.cv:before{{content:"";position:absolute;left:8px;top:6px;width:38%;height:22px;border-radius:12px;background:linear-gradient(180deg,#ffffffa0,#ffffff00)}}
.fmt{{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:9.5px;font-weight:900;letter-spacing:1px;background:rgba(255,255,255,.88);color:{P['ink']};border-radius:999px;padding:2px 7px}}
.ct{{font-size:16px;line-height:1.08;}}.ca{{font-size:10px;margin-top:6px;font-weight:700;}}
.bt{{font-size:12.5px;font-weight:800;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11px;color:{P['ink2']};font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for (t,a,f,p),(c1,c2),fg in zip(COVERS,FR,FG):
        prog=f'<div class="bar" style="height:7px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="color:{fg};background:linear-gradient(165deg,{c1},{c2})">{sugar(25,hash(t)%99,110,140,"255,255,255",(.4,.9))}<div class="ct H">{t}</div><div class="ca">{a}</div><div class="fmt">{f}</div></div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    return css+f'<div class="bg"></div>{blobs()}{sugar(80,3)}<div class="hdr"><h1 class="H">Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{nav("Библиотека")}'
def ring(pct,sz=46):
    """Желейное кольцо цели дня."""
    r=17;c=2*3.1416*r
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 46 46" style="flex:none"><defs><linearGradient id="jr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="1" stop-color="#e8336f"/></linearGradient></defs>
<circle cx="23" cy="23" r="{r}" fill="none" stroke="#ffe0e8" stroke-width="8"/><circle cx="23" cy="23" r="{r}" fill="none" stroke="url(#jr)" stroke-width="8" stroke-linecap="round" stroke-dasharray="{c*pct:.1f} {c}" transform="rotate(-90 23 23)"/>
<circle cx="23" cy="23" r="{r}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" stroke-dasharray="{c*pct*.6:.1f} {c}" transform="rotate(-80 23 23) translate(-1.5 -1.5) scale(1.0)"/>
<text x="23" y="27.5" text-anchor="middle" font-family="Rubik" font-weight="600" font-size="12" fill="{P['ink']}">{int(pct*10)}/10</text></svg>'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(74,31,54,.16)}}.sm{{position:absolute;left:18px;right:18px;top:120px;padding:24px 18px 20px;text-align:center;border-radius:32px}}
.sm h2{{font-size:28px;color:{P['ink']}}}.sub{{font-size:13px;color:{P['ink2']};font-weight:700;margin:2px 0 10px}}.beans{{display:flex;justify-content:center;gap:6px;margin-bottom:6px}}
.stats{{display:flex;gap:8px;margin:12px 0 14px}}.st{{flex:1;border-radius:20px;padding:10px 4px;box-shadow:inset 0 2px 0 #fff,inset 0 -3px 0 rgba(0,0,0,.06)}}
.st b{{display:block;font-family:"Rubik",sans-serif;font-weight:600;font-size:24px;line-height:1.15}}.st span{{font-size:11.5px;color:{P['ink2']};font-weight:800}}
.xp{{text-align:left;margin-bottom:14px}}.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:800;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;border-radius:22px;padding:10px 12px;background:linear-gradient(180deg,#fff2df,#ffe0bd);border:2px solid #ffc58a;box-shadow:inset 0 2px 0 #fff;margin-bottom:10px}}
.rw .tt{{font-weight:900;font-size:15px;color:#8a3b00}}.rw .ds{{font-size:12px;color:#8a4a1c;font-weight:700}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;margin:6px 2px 16px}}.dots{{display:flex;gap:5px}}
.dots i{{width:18px;height:14px;border-radius:50%/60%;background:#ffe0e8;box-shadow:inset 0 2px 2px rgba(0,0,0,.08)}}</style>'''
    dots=''.join(f'<i style="background:radial-gradient(circle at 35% 30%,#fff9 0 18%,transparent 32%),linear-gradient(160deg,{a},{b})"></i>' for a,b in FR[:3])+'<i></i>'
    inner=f'''<div class="beans">{bean(*FR[0],18,13)}{bean(*FR[1],18,13)}{bean(*FR[2],18,13)}</div><h2 class="H">Сессия завершена</h2><div class="sub">Тихая гавань · стр. 85–98</div>
<div class="stats"><div class="st" style="background:#ffe8ef"><b style="color:{P['rasp_d']}">18 мин</b><span>Чтение</span></div><div class="st" style="background:#eef8e0"><b style="color:{P['lime_d']}">14</b><span>Страницы</span></div><div class="st" style="background:#f3e8ff"><b style="color:{P['grape_d']}">+180 XP</b><span>Опыт</span></div></div>
<div class="xp"><div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div></div>
<div class="rw">{drop(40)}<div><div class="tt">+30 монет за день</div><div class="ds">Цель 10 мин · сегодня 18 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+f'<div class="bg"></div>{blobs()}{sugar(90,5)}<div class="veil"></div><div class="gum sm">{inner}</div>'
def rewards():
    css=f'''<style>.sec{{position:absolute;left:18px;right:18px}}.sh{{display:flex;align-items:center;gap:8px;font-family:"Rubik",sans-serif;font-weight:600;font-size:20px;color:{P['ink']};margin-bottom:8px}}
.q{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:900;font-size:15px}}.q .ds{{font-size:12px;color:{P['ink2']};font-weight:700;margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-family:"Rubik",sans-serif;font-weight:600;font-size:17px;color:#8a3b00}}
.wq{{background:linear-gradient(160deg,#a35ce0,{P['grape_d']})!important;border-color:#d4b0ff!important;color:#fff}}.wq .ds{{color:#fff}}.wq .amt{{color:#fff}}.wq .bar{{background:rgba(255,255,255,.25)}}
.rc{{display:flex;gap:8px}}.card{{flex:1 1 0;min-width:0;border-radius:24px;padding:12px 4px 10px;text-align:center;position:relative;overflow:hidden;color:#fff;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),inset 0 3px 0 rgba(255,255,255,.4),0 8px 16px rgba(122,40,70,.22)}}
.card:before{{content:"";position:absolute;left:10px;top:6px;width:45%;height:18px;border-radius:10px;background:linear-gradient(180deg,#ffffff90,#ffffff00)}}
.card .art{{height:52px;display:flex;align-items:center;justify-content:center}}.card .nm{{font-size:12px;font-weight:900;line-height:1.25;height:46px;display:flex;align-items:center;justify-content:center}}
.card .pr{{display:inline-flex;align-items:center;gap:3px;margin-top:4px;background:#fff;color:#8a3b00;border-radius:999px;padding:3px 9px 3px 4px;font-weight:900;font-size:12px}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:14px;border:2.5px dashed #ff9cbc;border-radius:24px;background:rgba(255,255,255,.7)}}.add .tt{{font-weight:900;font-size:14px;color:{P['rasp_d']}}}.add .ds{{font-size:12px;color:{P['ink2']};font-weight:700}}</style>'''
    q1=f'<div class="gum q">{ring(.6)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div><div class="bar" style="height:9px"><i style="width:60%"></i></div></div><div class="amt">{drop(18)}+30</div></div>'
    q2=f'<div class="gum q wq">{drop(40,"#e3c4ff","#8e44c9","#4a1a78")}<div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar" style="height:9px"><i style="width:75%;background:linear-gradient(90deg,#fff1c2,#ffd23f)"></i></div></div><div class="amt">{drop(18)}+120</div></div>'
    cards=''
    for (n,i),(c1,c2),fg in zip((('Серия сериала','tv'),('Кофе в кофейне','coffee'),('Новая книга','book-open')),(FR[0],FR[1],FR[3]),(FG[0],FG[1],FG[3])):
        cards+=f'<div class="card" style="color:{fg};background:linear-gradient(165deg,{c1},{c2})">{sugar(25,len(n),110,190,"255,255,255",(.4,.9))}<div class="art">{ic(i,34,2.2)}</div><div class="nm">{n}</div><div class="pr">{drop(16)}XXX</div></div>'
    return css+f'''<div class="bg"></div>{blobs()}{sugar(80,11)}<div class="hdr"><h1 class="H">Награды</h1>{bal()}</div>
<div class="sec" style="top:104px"><div class="sh">{bean(*FR[0])}Задания</div>{q1}{q2}</div>
<div class="sec" style="top:336px"><div class="sh">{bean(*FR[1])}Награды из жизни</div><div class="rc">{cards}</div>
<div class="add"><div style="color:{P['rasp_d']}">{ic("plus",26)}</div><div><div class="tt">Добавить награду</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в монетах.</div></div></div></div>{nav("Награды")}'''
SW=[('Малина','#d81b60','акцент, кнопки'),('Малина тёмн.','#a3134a','текст-акцент, нажатие'),('Апельсин','#ff8a1f','монеты-капли'),('Апельсин тёмн.','#8a3b00','текст монет'),
 ('Лайм','#7cc61e','успех, декор'),('Лайм тёмн.','#3f7a0c','текст успеха'),('Виноград','#8e44c9','недельное задание'),('Виноград тёмн.','#6a2c9e','XP'),
 ('Лимон','#ffd23f','блики, декор'),('Крем','#fff4ec','фон'),('Сливки','#fff9f3','страница книги'),('Ягодный чернил.','#4a1f36','текст UI'),
 ('Ночь: слива','#1d0e1e','фон ночи'),('Ночь: поверхн.','#2e1533','панели ночи'),('Ночь: малина','#ff8fb6','акцент ночи'),('Ночь: текст','#ead7df','текст книги ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:34px 16px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 8px;margin-top:10px}}.s{{text-align:center;font-size:10.5px}}.c{{height:50px;border-radius:18px;box-shadow:inset 0 3px 0 rgba(255,255,255,.45),inset 0 -5px 0 rgba(0,0,0,.14),0 5px 10px rgba(122,40,70,.2);margin-bottom:5px}}.s b{{display:block;font-weight:900}}.s span{{display:block;font-family:monospace;color:{P["ink2"]}}}.s em{{font-style:normal;color:{P["ink2"]};font-size:9.5px}}.f{{margin-top:14px;font-size:13px;line-height:1.5}}</style>'
    return css+f'''<div class="bg"></div>{sugar(60,2)}<div class="wrap"><h1 class="H" style="font-size:28px">Палитра «Мармеладный»</h1><div class="g">{sw}</div>
<div class="f"><div class="H" style="font-size:20px">Rubik — заголовки и кнопки</div><div style="font-weight:800">Nunito — интерфейс, подписи, цифры</div><div style="font-family:Literata;font-size:15px">Literata — текст книги, обычная книжная антиква</div>
<div style="display:flex;gap:10px;align-items:center;margin-top:12px">{drop(36)}{ring(.6,46)}<div class="btn" style="flex:1;height:46px;font-size:16px">Кнопка-мармеладка</div></div></div></div>'''
SC=[('marmeladny-reader-day',reader(),'','Читалка · день'),('marmeladny-reader-night',reader(True),'night','Читалка · ночь'),('marmeladny-library',library(),'','Библиотека'),
    ('marmeladny-rewards',rewards(),'','Награды'),('marmeladny-session-summary',summary(),'','Итог сессии'),('marmeladny-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#fff0e8');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    import glob
    fH=ImageFont.truetype([f for f in glob.glob(gf+'Rubik/*.ttf') if 'Italic' not in f][0],44);fC=ImageFont.truetype(gf+'Nunito/Nunito-VariableFont_wght.ttf',22)
    d.text((G,18),'ReadQuest — скин «Мармеладный»',font=fH,fill='#4a1f36')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#7a4560',anchor='ma')
    ov.save(f'{OUT}/marmeladny-overview.png')
