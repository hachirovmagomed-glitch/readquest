from gen import *
LU={'lib':'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>','user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
'list':'<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>','moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>','type':'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
'focus':'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="1"/><path d="M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0"/>',
'set':'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'}
LU['moon']='<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M8 13q2-3 5-1t1 4" stroke-width="1.4"/>'
LU['user']='<path d="M8 21q-1-6 1-9q-3-3-2-7q1-3 5-3q4 0 5 3q1 4-2 7q2 3 1 9"/><circle cx="10.5" cy="6" r=".6"/><circle cx="13.5" cy="6" r=".6"/><ellipse cx="12" cy="9" rx="1" ry="1.6"/><path d="M8 4q-2 3 0 6M16 4q2 3 0 6" stroke-width="1.4"/>'
NAMES={'list':'toc','moon':'night','type':'font','focus':'focus','set':'settings','lib':'library','user':'profile'}
def icsvg(k):
    n=NAMES[k]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><defs><filter id="cr-{n}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 1.5"/><feComposite in="SourceGraphic" operator="in" result="g"/><feTurbulence baseFrequency=".18" numOctaves="1" seed="{len(n)}" result="w"/><feDisplacementMap in="g" in2="w" scale="1.6"/></filter></defs><g filter="url(#cr-{n})">{LU[k]}</g></svg>'
for k,n in NAMES.items(): open(f'icons/{n}.svg','w').write(icsvg(k))
def ic(k):return icsvg(k).replace('<svg ','<svg class=i ',1)
def paper(x,y,w,h,fill="#f6ead0",stroke="#1b4fa8"):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="2.5" filter="url(#wob)"/><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" filter="url(#paper)"/>'
CSS='''<style>@font-face{font-family:C;src:url(file:///workspace/rq-ui/handoff/stage1-final/src/fonts/Caveat.ttf)}
.l{position:absolute;color:#1d2a52}svg.i{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
nav,.bar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around}
nav div,.bar div{display:flex;flex-direction:column;align-items:center;gap:4px;font:600 12px S}</style>'''
# ---------- LIB
bg=f'<rect width="390" height="844" fill="#e8c48a"/><rect width="390" height="250" fill="#f2b088"/><path d="M-10 215 Q100 200 200 230 Q300 260 400 220 V350 H-10z" fill="#1d4fae"/><path d="M-10 300 L420 470 V844 H-10z" fill="#c98f52"/><g filter="url(#cr)">{sky(-10,250)}{fjord(215,340)}'
bg+=f'<path d="M-10 250 Q120 230 200 260 Q300 290 400 250 V360 H-10z" fill="#1b4fa8" opacity=".35"/>'
bg+=bridge(-20,300,420,560,n=60,spread=200)+bridge(-20,500,420,844,n=40,spread=150)
bg+='</g>'+figures(300,368,.72)
# bridge rail lines
bg+='<g filter="url(#cr)" stroke="#6b3b17" stroke-width="5" fill="none"><path d="M-10 296 L420 470"/><path d="M-10 316 L420 500"/></g>'
el=f'<rect width="390" height="844" filter="url(#paper)"/>'
el+=paper(16,196,358,150)+paper(16,472,358,82)+paper(16,562,358,82)+paper(16,652,358,82)+paper(0,762,390,90,"#f6ead0","#6b3b17")
# goal ring around scream face
import math
r=46;cx,cy=74,271;c=2*math.pi*r
el+=f'<g filter="url(#wob)"><circle cx="{cx}" cy="{cy}" r="{r}" stroke="#e8c78a" stroke-width="10" fill="none"/><circle cx="{cx}" cy="{cy}" r="{r}" stroke="#f39a5e" stroke-width="10" fill="none" stroke-dasharray="{c*.6:.0f} {c}" transform="rotate(-90 {cx} {cy})" stroke-linecap="round"/></g>'
el+=f'<clipPath id="rc"><circle cx="{cx}" cy="{cy}" r="40"/></clipPath><g clip-path="url(#rc)"><circle cx="{cx}" cy="{cy}" r="40" fill="#f2b088"/>{"".join(wavy(cy-40+k*7,3,k,["#f39a5e","#f7c548","#9cc8e0"][k%3],5,.9,x0=cx-44,x1=cx+44,freq=.15) for k in range(12))}'+scream(cx,cy-2,.75)+'</g>'
# chip backs
chips=[("Все",22,52,True),("Читаю",82,72,False),("Хочу",162,58,False),("Прочитано",228,104,False)]
for t,x,w,on in chips: el+=paper(x,140,w,36,"#1b4fa8" if on else "#f6ead0")
books=[("Хамелеон","А. П. Чехов",22,"#1b4fa8"),("Последний фонарщик","ReadQuest Originals",48,"#c0562e"),("Наука чтения","ReadQuest Guide",5,"#3a7a4a")]
for i,(t,a,p,col) in enumerate(books):
    y=482+i*90
    el+=f'<rect x="30" y="{y}" width="44" height="62" rx="3" fill="{col}" filter="url(#wob)"/>'+"".join(wavy(y+8+k*9,2,k,"#f7c548",2,.7,x0=32,x1=72,freq=.3) for k in range(6))
    el+=f'<path d="M92 {y+50} H332" stroke="#d9c39a" stroke-width="6" stroke-linecap="round" filter="url(#wob)"/><path d="M92 {y+50} H{92+240*p/100:.0f}" stroke="#c0562e" stroke-width="6" stroke-linecap="round" filter="url(#wob)"/>'
html=f'''<!doctype html><html lang=ru><meta charset=utf-8><link rel=stylesheet href=common.css>{CSS}<body>
<svg class=l style="left:0;top:0" width=390 height=844 viewBox="0 0 390 844"><defs>{FILT}</defs>{bg}{el}</svg>
<div class=l style="left:22px;top:56px;font:700 54px C;color:#1d2a52;text-shadow:0 0 12px #f6ead0,0 0 4px #f6ead0">Библиотека</div>
'''
for t,x,w,on in chips: html+=f'<div class=l style="left:{x}px;top:149px;width:{w}px;text-align:center;font:600 14px S;color:{"#fff8e6" if on else "#1d2a52"}">{t}</div>'
html+='''<div class=l style="left:138px;top:216px"><div style="font:700 13px S;letter-spacing:1.5px;color:#9a3f1c">ЦЕЛЬ ДНЯ</div><div style="font:700 34px C;line-height:1.1;margin-top:4px">12 из 20 минут</div><div style="font:14px S;color:#3b3550;margin-top:6px;width:210px">Не кричи — просто читай.<br>Ещё 8 минут.</div></div>
<div class=l style="left:24px;top:416px;font:700 30px C;color:#1d2a52;background:#f6ead0e0;padding:0 12px;border-radius:12px">Моя полка</div>'''
for i,(t,a,p,col) in enumerate(books):
    y=482+i*90
    html+=f'<div class=l style="left:92px;top:{y-2}px"><div style="font:700 17px P">{t}</div><div style="font:13px S;color:#3b3550;margin-top:3px">{a} · {p}%</div></div>'
html+=f'<nav style="height:82px;padding-top:14px"><div style="color:#1b4fa8">{ic("lib")}Библиотека</div><div style="color:#5d5468">{ic("user")}Профиль</div></nav>'
LIB=html
# ---------- READ (dusk)
random.seed(11)
bg=f'<rect width="390" height="844" fill="#f1e4c6"/><rect width="390" height="110" fill="#f2b088"/><rect y="104" width="390" height="40" fill="#1d4fae"/><g filter="url(#cr)">{sky(-10,120,40)}{fjord(100,150,16)}</g>'+figures(330,92,.6)
bg+='<g filter="url(#cr)">'+bridge(-20,770,420,800,n=24,spread=40)+"".join(wavy(160+k*8,6,k,"#1b4fa8",4,.5,x0=-20,x1=410) for k in range(0))+'</g>'
# left/right edge swirls
for k in range(10):
    bg+=f'<g filter="url(#cr)">'+f'<path d="M{2+k*1.5} 160 q{8+k} 120 0 240 q-{8+k} 120 0 240" stroke="{random.choice(["#2a63c2","#f39a5e","#f7c548"])}" stroke-width="2.5" fill="none" opacity=".5"/></g>'
    bg+=f'<g filter="url(#cr)"><path d="M{388-k*1.5} 160 q-{8+k} 120 0 240 q{8+k} 120 0 240" stroke="{random.choice(["#2a63c2","#f39a5e","#f7c548"])}" stroke-width="2.5" fill="none" opacity=".5"/></g>'
el='<rect width="390" height="844" filter="url(#paper)"/>'
el+='<g filter="url(#cr)">'+"".join(wavy(686+random.uniform(-1.5,1.5),3,0.5,c,3,.85,x0=24,x1=366,freq=.09) for c in ["#1b4fa8","#2a63c2","#1b4fa8"])+wavy(686,3,.5,"#f39a5e",4,.95,x0=24,x1=100,freq=.09)+'</g>'
el+=f'<circle cx="100" cy="{686+3*math.sin(100*.09+.5):.1f}" r="9" fill="#f7c548" stroke="#9a3f1c" stroke-width="2" filter="url(#wob)"/>'
el+=paper(0,736,390,120,"#1b3f8f","#0f2f78")
html=f'''<!doctype html><html lang=ru><meta charset=utf-8><link rel=stylesheet href=common.css>{CSS}<body>
<svg class=l style="left:0;top:0" width=390 height=844 viewBox="0 0 390 844"><defs>{FILT}</defs>{bg}{el}</svg>
<div class=l style="left:18px;top:44px;right:18px;display:flex;align-items:center;gap:14px;color:#1d2a52"><svg class=i viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg><span style="font:700 30px C;text-shadow:0 0 8px #f6ead0,0 0 3px #f6ead0">Хамелеон</span><span style="margin-left:auto;font:600 13px S;background:#f6ead0cc;padding:2px 8px;border-radius:8px">А. П. Чехов</span></div>
<div class=l style="left:30px;right:30px;top:168px;font:16px/1.5 P;color:#1a2550;text-align:justify;hyphens:auto">
<div style="font:700 13px S;letter-spacing:2px;color:#9a3f1c;margin-bottom:8px">ГЛАВА I</div>
<p style="text-indent:1.4em">Через базарную площадь идёт полицейский надзиратель Очумелов в новой шинели и с узелком в руке. За ним шагает рыжий городовой с решетом, доверху наполненным конфискованным крыжовником. Кругом тишина… На площади ни души… Открытые двери лавок и кабаков глядят на свет божий уныло, как голодные пасти; около них нет даже нищих.</p>
<p style="text-indent:1.4em">— Так ты кусаться, окаянная? — слышит вдруг Очумелов. — Ребята, не пущай её! Нынче не велено кусаться! Держи! А… а!</p>
<p style="text-indent:1.4em">Слышен собачий визг. Очумелов глядит в сторону и видит: из дровяного склада купца Пичугина, прыгая на трёх ногах и оглядываясь, бежит собака.</p></div>
<div class=l style="left:24px;right:24px;top:654px;display:flex;justify-content:space-between;font:600 13px S"><span>23 / 105</span><span>22%</span></div>
<div class=bar style="height:96px;padding-top:18px;color:#f6ead0"><div>{ic("list")}Оглавление</div><div style="color:#f7c548">{ic("moon")}Ночь</div><div>{ic("type")}Шрифт</div><div>{ic("focus")}Фокус</div><div>{ic("set")}Настройки</div></div>'''
READ=html
import re,sys
NM={"#f2b088":"#1a1f52","#f0a08a":"#2b2f7a","#f4b39a":"#3a2f6e","#f7c548":"#c8783a","#f2d06b":"#a8562e","#9cc8e0":"#3e5aa8","#e8957d":"#7a2a2a","#f5d78a":"#8a3a2a","#f39a5e":"#b8452c",
"#1b4fa8":"#16307a","#2a63c2":"#22408f","#163a8a":"#0e1f55","#3b7bd0":"#2e4f9a","#0f2f78":"#0a1840","#4a8ad8":"#3a5aa8","#1d4fae":"#122a6a",
"#e8c48a":"#2a2238","#c98f52":"#3a2a2a","#c98b4a":"#5a3a26","#a8692f":"#4a2c1a","#e0b070":"#6a4a2a","#8a5226":"#3a2214","#d9a05a":"#5a3a22","#f2c97a":"#7a5a30","#5a7fc0":"#2a3f80","#6b3b17":"#8a5a30",
"#f6ead0":"#1e2448","#f1e4c6":"#141a36","#f6ead0e0":"#1e2448e6","#f6ead0cc":"#1e2448cc","#1d2a52":"#f1e4c6","#1a2550":"#efe3c4","#3b3550":"#c9c0d8","#5d5468":"#b0a8c0","#9a3f1c":"#f0a070","#e8c78a":"#3a3458","#d9c39a":"#3a3458","#fff8e6":"#f6ead0","#14306e":"#05081c","#0a1840":"#000","#d9c7a0":"#c9b890","#3b1f0f":"#000","#1b3f8f":"#0c1230"}
def night(h):
    h=h.replace('<span>23','<span>23').replace('stop-color="#000"','')
    h= re.sub(r"#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?",lambda m:NM.get(m.group(0).lower(),m.group(0)),h)
    return h.replace('padding-top:18px;color:#1e2448','padding-top:18px;color:#efe3c4').replace('<div style="color:#16307a">','<div style="color:#f0a070">')
open('lib.html','w').write(LIB);open('read.html','w').write(READ)
open('lib-night.html','w').write(night(LIB));open('read-night.html','w').write(night(READ))
