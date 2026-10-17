# ReadQuest · скин «Бархатная ночь» (элегантная вампирская готика) — генератор макетов. Запуск: python3 gen_barkhat.py
# Все рисунки наши: монеты-«лунары», фазы луны, витражные окна недели, маскот-летучая мышка Шёпот. Без крови, ужасов и чужих ассетов.
import os,subprocess,glob,math,random
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; P='barkhatnaya-noch'
W,H=390,844
INK='#1c1420'; T2='#574a5c'; WINE='#6e1630'; WINE2='#520f23'; SILT='#454d5c'; AME='#4f3a86'
SILV='#b8bcc6'; MOON='#9fb6d8'; ROSE='#b4455e'; GLASS='#8e6cc8'; LIN='#fbf9fc'; EBON='#2a1f2b'
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','plus':'<path d="M12 5v14M5 12h14"/>'}
def ic(n,sz=22,w=1.7): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_u=[0]
def uid(p): _u[0]+=1; return f'{p}{_u[0]}'
def flame(cx,cy,s):
    return f'<path d="M{cx} {cy-s} C{cx+s*.5} {cy-s*.3} {cx+s*.5} {cy+s*.3} {cx} {cy+s*.45} C{cx-s*.5} {cy+s*.3} {cx-s*.5} {cy-s*.3} {cx} {cy-s}z" fill="#f3e6c8"/><path d="M{cx} {cy-s*.3} C{cx+s*.22} {cy} {cx+s*.22} {cy+s*.25} {cx} {cy+s*.35} C{cx-s*.22} {cy+s*.25} {cx-s*.22} {cy} {cx} {cy-s*.3}z" fill="#c9d6ee"/>'
def batpath(cx,cy,s,fill):
    return f'<path transform="translate({cx} {cy}) scale({s})" d="M0 -2 C1 -4 2 -4 2.5 -2 C4 -4 7 -5 10 -3 C8 -2 8 0 8.5 1.5 C7 0 5 0.5 4 2 C3 1 1.5 1.5 0 3 C-1.5 1.5 -3 1 -4 2 C-5 0.5 -7 0 -8.5 1.5 C-8 0 -8 -2 -10 -3 C-7 -5 -4 -4 -2.5 -2 C-2 -4 -1 -4 0 -2z" fill="{fill}"/>'
def coin(sz=22):
    """Лунар: старое серебро, гурт с насечкой, в центре серп луны и силуэт летучей мышки (наш рисунок)."""
    g=uid('cg')
    ticks=''.join(f'<path d="M{20+17*math.cos(a):.1f} {20+17*math.sin(a):.1f}L{20+18.6*math.cos(a):.1f} {20+18.6*math.sin(a):.1f}" stroke="#6b7280" stroke-width=".8"/>' for a in [i*math.pi/12 for i in range(24)])
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#d3d7df"/><stop offset="1" stop-color="#8d94a2"/></radialGradient></defs>
<circle cx="20" cy="20" r="19" fill="url(#{g})" stroke="#4a5262" stroke-width="1.2"/>{ticks}<circle cx="20" cy="20" r="14.5" fill="none" stroke="#5c6474" stroke-width=".9"/>
<path d="M25 8.5a11.5 11.5 0 1 0 0 23a9.5 9.5 0 1 1 0-23z" fill="#f4f6fa" stroke="#5c6474" stroke-width=".9"/>{batpath(21,20,.85,'#454d5c')}</svg>'''
def moons(filled,tot=10,w=170,night=False,label=True):
    """Цель дня — «фазы луны»: 10 лун в ряд от серпа к полнолунию, 1 минута = 1 фаза. Не прочитано — пустой серебряный контур."""
    out=''; r=6.2
    for k in range(tot):
        x=9+k*(w-18)/(tot-1); y=12
        if k<filled:
            f=(k+1)/tot  # доля освещённости
            m=uid('mm'); dx=2*r*f
            out+=f'<defs><clipPath id="{m}"><circle cx="{x:.1f}" cy="{y}" r="{r}"/></clipPath></defs><circle cx="{x:.1f}" cy="{y}" r="{r}" fill="{"#2c3550" if night else "#3a2f48"}"/><circle cx="{x-2*r+dx:.1f}" cy="{y}" r="{r}" fill="#dfe7f5" clip-path="url(#{m})"/><circle cx="{x:.1f}" cy="{y}" r="{r}" fill="none" stroke="#7d8698" stroke-width=".8"/>'
        else: out+=f'<circle cx="{x:.1f}" cy="{y}" r="{r-1}" fill="none" stroke="{"#5d5468" if night else "#a49aae"}" stroke-width="1.1"/>'
    t=f'<text x="{w/2}" y="36" text-anchor="middle" font-family="Manrope" font-weight="700" font-size="10.5" fill="{"#efeaf2" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{40 if label else 24}" viewBox="0 0 {w} {40 if label else 24}" style="flex:none">{out}{t}</svg>'
def window(sz=24,on=True,night=False):
    """Неделя: стрельчатое витражное окно. Зажжено — аметист и лунный голубой, не зажжено — тёмный контур."""
    if on:
        return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 28" style="flex:none"><path d="M4 27V12C4 6 8 2 12 1c4 1 8 5 8 11v15z" fill="#e9eef8" stroke="#3a3346" stroke-width="1.3"/><path d="M6.5 25V12.5C6.5 8 9 5 12 3.6 15 5 17.5 8 17.5 12.5V25z" fill="{GLASS}"/><path d="M12 3.6V25M6.5 15h11M6.5 20h11" stroke="#3a3346" stroke-width=".9"/><path d="M6.5 12.5C6.5 8 9 5 12 3.6V15H6.5z" fill="{MOON}"/><circle cx="15" cy="9" r="1.6" fill="#f5f0ff"/></svg>'
    c='#5d5468' if night else '#a49aae'
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 28" style="flex:none"><path d="M4 27V12C4 6 8 2 12 1c4 1 8 5 8 11v15z" fill="none" stroke="{c}" stroke-width="1.3"/><path d="M12 3.6V25M6.5 15h11" stroke="{c}" stroke-width=".8"/></svg>'
def bat(sz=96):
    """Маскот «Шёпот» — маленькая пушистая летучая мышка: круглое тельце цвета эбена, бархатные крылья с винной подкладкой, огромные серебристо-голубые глаза, серебряная брошь-роза."""
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="42" ry="36" fill="{MOON}" opacity=".16"/>
<path d="M38 52C28 40 14 38 4 44c6 2 8 8 7 14 4-3 9-3 12 1 2-4 7-5 11-2z" fill="{EBON}" stroke="#120c14" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M62 52C72 40 86 38 96 44c-6 2-8 8-7 14-4-3-9-3-12 1-2-4-7-5-11-2z" fill="{EBON}" stroke="#120c14" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M34 50C26 44 18 43 11 46M66 50C74 44 82 43 89 46" fill="none" stroke="#7a2a42" stroke-width="2"/>
<path d="M34 38l-4-14 11 9zM66 38l4-14-11 9z" fill="{EBON}" stroke="#120c14" stroke-width="1.3" stroke-linejoin="round"/><path d="M33 33l-1.5-5 4 3zM67 33l1.5-5-4 3z" fill="#9a4a62"/>
<ellipse cx="50" cy="55" rx="20" ry="21" fill="#3a2b3c" stroke="#120c14" stroke-width="1.4"/><ellipse cx="50" cy="62" rx="11" ry="10" fill="#4a3a4c"/>
<circle cx="42" cy="50" r="6.2" fill="#eef3fb"/><circle cx="58" cy="50" r="6.2" fill="#eef3fb"/><circle cx="42.8" cy="51" r="4" fill="#2c3a5c"/><circle cx="57.2" cy="51" r="4" fill="#2c3a5c"/><circle cx="44" cy="49.4" r="1.5" fill="#fff"/><circle cx="58.4" cy="49.4" r="1.5" fill="#fff"/>
<path d="M46 58q4 3 8 0" fill="none" stroke="#efe8f0" stroke-width="1.4" stroke-linecap="round"/><path d="M48 58.6l.8 1.8.8-1.6M52 58.6l-.8 1.8-.8-1.6" fill="#fff"/>
<circle cx="36" cy="57" r="2.2" fill="#b4455e" opacity=".55"/><circle cx="64" cy="57" r="2.2" fill="#b4455e" opacity=".55"/>
<circle cx="50" cy="70" r="3.6" fill="{SILV}" stroke="#4a5262" stroke-width=".9"/><path d="M50 67.6c1.6 0 2 1.4 1 2.4-.6.6-1.6.4-1-.4M48.6 71.6l-2.6 2M51.4 71.6l2.6 2" fill="none" stroke="#6e1630" stroke-width=".8"/></svg>'''
def bats(seed=3,n=5,area=(0,0,W,H),c='#2a1f2b',o=.55):
    r=random.Random(seed); return ''.join(f'<g opacity="{o}">{batpath(r.uniform(area[0],area[2]),r.uniform(area[1],area[3]),r.uniform(.7,1.3),c)}</g>' for _ in range(n))
def lancet(x,y,w,h,glass=True):
    a=f'M{x} {y+h}V{y+w*.6}C{x} {y+w*.15} {x+w*.35} {y} {x+w/2} {y-w*.15}C{x+w*.65} {y} {x+w} {y+w*.15} {x+w} {y+w*.6}V{y+h}z'
    pan=''
    if glass:
        cols=['#8e6cc8','#9fb6d8','#b7a6dc','#6f8fc4','#c9b8e8','#7a5aa8','#b9c9e6']; i=0
        for yy in range(int(y+w*.5),int(y+h),12):
            for xx in (x+3,x+w/2):
                pan+=f'<rect x="{xx:.0f}" y="{yy}" width="{w/2-3:.0f}" height="11" fill="{cols[(i*3)%7]}" opacity=".7"/>'; i+=1
    cid=uid('lw')
    return f'<defs><clipPath id="{cid}"><path d="{a}"/></clipPath></defs><path d="{a}" fill="#e6e9f2"/><g clip-path="url(#{cid})">{pan}<circle cx="{x+w/2}" cy="{y+w*.3}" r="{w*.22}" fill="#f4f1fa"/><circle cx="{x+w/2}" cy="{y+w*.3}" r="{w*.14}" fill="none" stroke="#7d6aa6" stroke-width="1.2"/></g><path d="{a}" fill="none" stroke="#3a2f3e" stroke-width="3"/><path d="M{x+w/2} {y+w*.5}V{y+h}" stroke="#3a2f3e" stroke-width="2"/>'
def rose(cx,cy,s=1,c=ROSE):
    return f'<g transform="translate({cx} {cy}) scale({s})"><path d="M0 4C-4 10-3 16 0 22" fill="none" stroke="#3d4a3c" stroke-width="1.4"/><path d="M-1 14c-5-1-7-4-7-6 4 0 6 2 7 6z" fill="#4b5d4a"/><circle r="6.5" fill="{c}"/><path d="M-4 0c1-4 7-4 8 0-2-2-6-2-8 0zM-3 2c2 3 5 3 6 0" fill="none" stroke="#5a1424" stroke-width="1"/></g>'
# ---- готические детали (v2): кованые уголки и разделители, герб-скважина, воск, крышка шкатулки, бархат, канделябры, шапка-арка ----
from urllib.parse import quote
IRON='#3a3044'
def durl(svg): return 'url("data:image/svg+xml;utf8,'+quote(svg)+'")'
def filicorner(c='#6b7280',t=''):
    """Кованый уголок-завиток 16×16 (серебро/чугун, не красный)."""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g transform="{t}"><path d="M1.5 15V5Q1.5 1.5 5 1.5H15M1.5 9Q5 9 5 5M5 5Q9 5 9 1.5" fill="none" stroke="{c}" stroke-width="1.2" stroke-linecap="round"/><circle cx="9" cy="5" r="1.1" fill="{c}"/></g></svg>'
CORN=','.join(durl(filicorner(t=t)) for t in ('','translate(16 0) scale(-1 1)','translate(0 16) scale(1 -1)','translate(16 16) scale(-1 -1)'))
def divider(w=220,c='#6b7280'):
    """Кованый разделитель: линия, завитки и ромб-герб по центру."""
    m=w/2
    return f'<svg width="{w}" height="14" viewBox="0 0 {w} 14" style="display:block;flex:none"><path d="M4 7H{m-22}M{m+22} 7H{w-4}" stroke="{c}" stroke-width="1"/><path d="M{m-22} 7q6-6 12 0q-6 6-12 0zM{m+22} 7q-6-6-12 0q6 6 12 0z" fill="none" stroke="{c}" stroke-width="1.1"/><path d="M{m} 1l5 6-5 6-5-6z" fill="#d3d7df" stroke="{c}" stroke-width="1"/><circle cx="{m}" cy="7" r="1.4" fill="{c}"/><circle cx="4" cy="7" r="1.5" fill="{c}"/><circle cx="{w-4}" cy="7" r="1.5" fill="{c}"/></svg>'
def keyhole(sz=18,c='#d3d7df',st='#4a5262'):
    """Серебряный герб: щит с узором и замочной скважиной."""
    return f'<svg width="{sz}" height="{sz*1.2:.0f}" viewBox="0 0 20 24" style="flex:none;display:block"><path d="M10 1L18 4V11C18 17 14 21 10 23 6 21 2 17 2 11V4z" fill="{c}" stroke="{st}" stroke-width="1.1"/><path d="M10 4.5L15 6.5V11C15 15 13 17.5 10 19 7 17.5 5 15 5 11V6.5z" fill="none" stroke="{st}" stroke-width=".7"/><circle cx="10" cy="10" r="2.1" fill="#1c1420"/><path d="M9 11.5h2l.8 4.5H8.2z" fill="#1c1420"/></svg>'
def wax(w,seed=1):
    """Подтёки воска (слоновая кость) под крышкой — максимум 9 px вниз, только в верхнем поле карточки."""
    r=random.Random(seed); p=f'M{w} 0V3'; x=w
    while x>1:
        d=r.uniform(16,34); x2=max(0,x-d); mid=(x+x2)/2; h=r.choice([4,5,7,9])
        p+=f'L{mid+3:.1f} 3Q{mid+1.5:.1f} 3 {mid+1.5:.1f} {h-1}Q{mid:.1f} {h+1.5} {mid-1.5:.1f} {h-1}Q{mid-1.5:.1f} 3 {mid-3:.1f} 3L{x2:.1f} 3'; x=x2
    return f'<svg width="{w}" height="12" viewBox="0 0 {w} 12" class="abs" style="left:0;top:6px">  <path d="{p}V0z" fill="#f4efe6" stroke="#cfc6b8" stroke-width=".6"/></svg>'
def lid(w,seed=1,kh=True):
    """Крышка шкатулки: эбеновая полоса 7 px с серебряным кантом, по центру — герб-скважина, под ней воск. Всё в верхнем поле."""
    return f'<div class="abs" style="left:0;right:0;top:0;height:7px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#3a2b3c,#1c1420);box-shadow:0 1px 0 #b8bcc6"></div>{wax(w,seed)}'+(f'<div class="abs" style="left:50%;top:-9px;margin-left:-7px">{keyhole(14)}</div>' if kh else '')
def velvet(i,base,hi,o=.5):
    """Бархат: основа + мелкий шум feTurbulence + мягкий блик. Только фон без текста."""
    return f'<filter id="{i}f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 {o*.22:.3f} 0"/></filter><radialGradient id="{i}g" cx=".5" cy=".25" r=".9"><stop offset="0" stop-color="{hi}"/><stop offset="1" stop-color="{base}"/></radialGradient>'
def candel_big(x,y,s=1):
    """Канделябр в нижнем углу, вне контента: чугун, три свечи с подтёками воска."""
    c=''.join(f'<rect x="{cx-2.5}" y="{cy}" width="5" height="16" fill="#f4efe6" stroke="#8d8576" stroke-width=".6"/><path d="M{cx-2.5} {cy+2}q1.2 4 2.4 0" fill="#e2d8c6"/>{flame(cx,cy-5,6)}' for cx,cy in ((8,14),(24,6),(40,14)))
    return f'<g transform="translate({x} {y}) scale({s})"><ellipse cx="24" cy="8" rx="26" ry="20" fill="#dfe7f5" opacity=".2"/>{c}<g fill="none" stroke="{IRON}" stroke-width="2" stroke-linecap="round"><path d="M8 30q0 8 16 8t16-8M24 22v44M14 68h20"/><path d="M24 46q-8 2-6 8M24 46q8 2 6 8"/></g><circle cx="24" cy="42" r="2.4" fill="#b8bcc6" stroke="{IRON}"/></g>'
def header_band(h=104):
    """Шапка экрана: эбеновый бархат, сверху винный ламбрекен (до y=30, далеко от текста), серебряная стрельчатая арка с кованой трасировкой вокруг заголовка."""
    sc=''.join(f' Q{i*48.75+24.375} 30 {i*48.75+48.75} 18' for i in range(8))
    tr=''.join(f'<path d="M{x} {h-2}V{h-16}q0-9 7-13q7 4 7 13V{h-2}" fill="none" stroke="#5c5466" stroke-width="1"/>' for x in range(18,226,23))
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{h+8}"><defs>{velvet("hb","#120c14","#2e2230",.8)}<linearGradient id="curH" x1="0" x2="1"><stop offset="0" stop-color="#4a0c1e"/><stop offset=".5" stop-color="#7a1a36"/><stop offset="1" stop-color="#4a0c1e"/></linearGradient></defs>'
     f'<rect width="{W}" height="{h}" fill="url(#hbg)"/><rect width="{W}" height="{h}" filter="url(#hbf)"/>'
     f'<path d="M0 0H390V18{sc}V0z" fill="url(#curH)"/><path d="M0 18{sc}" fill="none" stroke="#b8bcc6" stroke-width="1"/>'
     f'{tr}<path d="M10 {h-2}V64C10 46 60 40 122 37C184 40 234 46 234 64V{h-2}" fill="none" stroke="#b8bcc6" stroke-width="1.4"/><path d="M116 36l6-5 6 5" fill="none" stroke="#b8bcc6" stroke-width="1.2"/>'
     f'<path d="M0 {h-1}H390" stroke="#b8bcc6" stroke-width="2"/></svg>')
def coffin_cover(fg):
    """Обложка-шкатулка в форме гроба: серебряный двойной контур, гвоздики-заклёпки, серебряный герб-скважина внизу."""
    pts='22,1 78,1 99,24 86,145 14,145 1,24'
    rivets=''.join(f'<circle cx="{x}" cy="{y}" r="1.3" fill="#d3d7df" stroke="#4a5262" stroke-width=".5"/>' for x,y in ((26,5),(74,5),(95,25),(5,25),(84,141),(16,141)))
    return f'<svg class="abs" style="left:0;top:0" width="100%" height="146" viewBox="0 0 100 146" preserveAspectRatio="none"><polygon points="{pts}" fill="none" stroke="#d3d7df" stroke-width="1.6"/><polygon points="24,5 76,5 95,25 83,141 17,141 5,25" fill="none" stroke="#6b7280" stroke-width=".7"/>{rivets}</svg>'

def castle(o=1):
    """Декор фона: три стрельчатых витражных окна, лунный свет из них, бархатный ламбрекен сверху (до y=34, вне контента), на нём серебряные мышки и роза. На странице книги не бывает."""
    return f'''<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe7f7" stop-opacity=".55"/><stop offset="1" stop-color="#dfe7f7" stop-opacity="0"/></linearGradient>
<linearGradient id="cur" x1="0" x2="1"><stop offset="0" stop-color="#4a0c1e"/><stop offset=".5" stop-color="#7a1a36"/><stop offset="1" stop-color="#4a0c1e"/></linearGradient></defs><g opacity="{o}">
<path d="M150 0 L60 844 H330 L240 0z" fill="url(#ray)" opacity=".7"/>{''.join(f'<path d="M34 {y}H356" stroke="#bdb5c6" stroke-width="1"/>' for y in range(40,800,44))}
{lancet(70,430,64,320)}{lancet(163,400,64,350)}{lancet(256,430,64,320)}

</g></svg>'''
CSS=f'''*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Manrope",sans-serif;font-weight:500;color:{INK};background:#ece8ef}}
.abs{{position:absolute;pointer-events:none}}
@font-face{{font-family:"Ruslan Display";src:url("fonts/RuslanDisplay-Regular.ttf")}}.H{{font-family:"Oranienbaum",serif;font-weight:400}}.gth{{font-family:"Ruslan Display",serif;font-weight:400}}.num{{font-family:"Cormorant SC",serif;font-weight:700}}
.bg{{position:absolute;inset:0;background:linear-gradient(180deg,#e4dfe9 0,#d8d1de 55%,#cbc3d2 100%)}}
.card{{background-image:{CORN}!important;background-position:3px 3px,calc(100% - 3px) 3px,3px calc(100% - 3px),calc(100% - 3px) calc(100% - 3px)!important;background-repeat:no-repeat!important;background-color:rgba(251,249,252,.96)!important;position:relative;border-radius:8px;box-shadow:0 0 0 1px #a7abb6,0 0 0 4px rgba(251,249,252,.95),0 0 0 5px #c6c9d1,0 8px 22px rgba(28,20,32,.18)}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:50px 22px 0;display:flex;align-items:center;justify-content:space-between}}
.hdr{{z-index:2}}.hdr h1{{font-family:'Ruslan Display',serif;font-size:23px;color:#efeaf2;letter-spacing:.3px;padding:12px 0 0 6px}}
.bal{{display:flex;align-items:center;gap:6px;padding:4px 14px 4px 4px;font-weight:700;font-size:13px;background:{LIN};border-radius:20px;box-shadow:0 0 0 1px #8d94a2,0 2px 8px rgba(28,20,32,.15)}}
.nav{{background-image:none!important;position:absolute;left:14px;right:14px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 8px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:12px;font-weight:700;color:{T2};position:relative;padding:6px 0}}
.nav .on{{color:#fff}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;z-index:-1;background:linear-gradient(180deg,#86203e,{WINE});border-radius:6px;box-shadow:inset 0 0 0 1px #c6c9d1}}
.btn{{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;font-family:"Oranienbaum",serif;font-size:22px;color:#fff;background:linear-gradient(180deg,#86203e,{WINE});border-radius:8px;box-shadow:0 0 0 1px #4a0c1e,0 0 0 3px #d3d7df,0 0 0 4px #6b7280,0 6px 14px rgba(110,22,48,.3)}}
.bar{{height:8px;background:#e3dee7;border-radius:4px;box-shadow:inset 0 0 0 1px #c6c9d1}}.bar i{{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#8a2a44,{WINE})}}
.cap{{font-size:12px;color:{T2}}}
/* читалка: страница чистая — без окон, мышек, роз и маскота */
.rd{{position:absolute;inset:0;background:#faf8f5;color:{INK}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"Ledger",serif;font-size:16px;line-height:1.7}}
.page h3{{font-family:"Oranienbaum",serif;font-weight:400;font-size:23px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:#efebf1;box-shadow:0 1px 0 #b8bcc6}}
.rtop .t{{flex:1;text-align:center;font-family:"Oranienbaum",serif;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{WINE}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:#efebf1;box-shadow:0 -1px 0 #b8bcc6;padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;font-size:14px;margin-bottom:10px;font-weight:700}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:4px;border-radius:2px;background:#cfcad6}}.sl .fi{{position:absolute;top:10px;left:0;height:4px;border-radius:2px;background:{WINE}}}
.sl .th{{position:absolute;top:2px;margin-left:-10px;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid {WINE};box-shadow:0 0 0 2px #fff,0 0 0 3px #8d94a2}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:12px;font-weight:700}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}.tools svg{{color:{WINE}}}
.night{{background:#0c0a12}}.night .rd{{background:#0e0c12;color:#e6e1ea}}
.night .rtop,.night .rbot{{background:#18131e}}.night .rtop{{box-shadow:0 1px 0 #3a3044}}.night .rbot{{box-shadow:0 -1px 0 #3a3044}}
.night .rtop .t,.night .pg,.night .tools{{color:#efeaf2}}.night .ib,.night .tools svg{{color:#a9c4ec}}
.night .sl .tr{{background:#3a3044}}.night .sl .fi{{background:#a9c4ec}}.night .sl .th{{background:#0e0c12;border-color:#a9c4ec;box-shadow:0 0 0 2px #0e0c12,0 0 10px rgba(169,196,236,.55)}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Графиня Аделаида не любила полдень. Она открывала библиотеку только после заката, когда луна поднималась над южной башней и проходила сквозь витраж с синими лилиями. "
 "В такие часы старое серебро на столе начинало светиться само, а книги на полках шептались, будто вспоминали своих прежних хозяев. "
 "Мартин принёс ей новый подсвечник и остался у двери, не решаясь спросить, что она ищет уже третью ночь подряд. ")
def reader(night=False):
    pct=97/184*100
    # ночью в шапке — единственный декор читалки: тонкий лунный луч из стрельчатого окна, только в шапке
    st=f'<svg class="abs" style="left:0;top:0" width="{W}" height="44"><defs><linearGradient id="mr" x1="0" x2="1"><stop offset="0" stop-color="#a9c4ec" stop-opacity="0"/><stop offset=".5" stop-color="#a9c4ec" stop-opacity=".22"/><stop offset="1" stop-color="#a9c4ec" stop-opacity="0"/></linearGradient></defs><path d="M150 0h90l-30 44h-30z" fill="url(#mr)"/><circle cx="195" cy="14" r="5" fill="#dfe7f5" opacity=".7"/></svg>' if night else ''
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Синие лилии</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop">{st}<div class="ib">{ic("arrow-left")}</div><div class="t">Библиотека графини</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def nav(on):
    it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
    return '<div class="card nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{coin(26)}<span class="num" style="font-size:19px">390</span> лунаров</div>'
def scene(night=False):
    """Фон экранов (не читалки). День — лунный камень с витражами; ночь — глубокий бархат, луна в окнах, лунный туман, канделябры в нижних углах."""
    if not night: return f'<div class="bg"></div>{castle()}{header_band()}'
    fog=''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#c9d6ee" opacity="{o}"/>' for x,y,rx,ry,o in ((60,800,170,44,.22),(320,810,180,46,.2),(190,760,230,30,.14),(110,640,150,24,.08),(300,600,130,22,.07)))
    win=''.join(lancet(x,y,w,h) for x,y,w,h in ((70,430,64,320),(163,400,64,350),(256,430,64,320)))
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs>{velvet("nv","#0c0a12","#2a1c2e",.9)}'
      '<linearGradient id="nray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d6ee" stop-opacity=".3"/><stop offset="1" stop-color="#c9d6ee" stop-opacity="0"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs>'
      f'<rect width="{W}" height="{H}" fill="url(#nvg)"/><rect width="{W}" height="{H}" filter="url(#nvf)"/><g opacity=".45">{win}</g><path d="M150 400 L40 844 H350 L240 400z" fill="url(#nray)"/>'
      f'{bats(8,5,(40,700,350,740),"#5d5468",.9)}<g filter="url(#blur)">{fog}</g>{candel_big(6,752)}{candel_big(336,752)}</svg>'+header_band())
COV=[('Библиотека графини','Л. Вороновская','EPUB','53%','linear-gradient(180deg,#6e1630,#3a0a1a)','#fff'),('Серебряный ключ','М. Корвин','FB2','12%','linear-gradient(180deg,#e9ecf2,#b8bcc6)',INK),('Сад полуночных роз','А. Розанова','TXT','прочитано','linear-gradient(180deg,#2a1f2b,#120c14)','#efeaf2'),
 ('Письма при свечах','Е. Тихомирова','PDF','не начата','linear-gradient(180deg,#fbf9fc,#ddd6e6)',INK),('Лунный вальс','В. Сумрачный','EPUB','4%','linear-gradient(180deg,#4f3a86,#2a1f4a)','#fff'),('Хроники Чёрной башни','Н. Ольховский','PDF','67%','linear-gradient(180deg,#9fb6d8,#6d86ad)',INK)]
def library():
    css=f'''<style>.chips{{position:absolute;top:112px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:6px 13px;font-size:14px;font-weight:700;color:{T2};border-radius:6px;background:rgba(251,249,252,.92);box-shadow:0 0 0 1px #a7abb6}}.chip.on{{color:#fff;background:{WINE};box-shadow:0 0 0 1px #4a0c1e,0 0 0 3px #d3d7df}}
.grid{{position:absolute;top:162px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0;background:rgba(251,249,252,.96);padding:6px 6px 7px;border-radius:6px;box-shadow:0 0 0 1px #c6c9d1}}
.cv{{position:relative;height:146px;overflow:hidden;padding:40px 8px 0;text-align:center;clip-path:polygon(22% 0,78% 0,100% 16%,86% 100%,14% 100%,0 16%);box-shadow:0 0 0 1px #6b7280,inset 0 0 0 3px rgba(255,255,255,.25)}}
.fmt{{position:absolute;top:14px;left:0;right:0;font-size:9.5px;font-weight:700;letter-spacing:1.5px}}
.ct{{font-size:15px;line-height:1.15;position:relative}}.ca{{font-size:9.5px;white-space:nowrap;margin-top:6px;position:relative;font-weight:600}}
.bt{{font-size:12.5px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:11.5px;color:{T2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,bg,fg in COV:
        prog=f'<div class="bar" style="height:5px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg}"><div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div>{coffin_cover(fg)}</div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:4px;bottom:98px">{bat(84)}</div><svg class="abs" style="left:0;bottom:92px" width="60" height="80">{candel_big(6,6)}</svg>'
    return css+scene()+f'<div class="hdr"><h1>Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def candelabra(sz=62):
    c=''.join(f'<rect x="{x-2}" y="{y}" width="4" height="12" fill="#f4efe6" stroke="{INK}" stroke-width=".8"/>{flame(x,y-4,5)}' for x,y in ((16,18),(30,12),(44,18)))
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><circle cx="30" cy="16" r="18" fill="{MOON}" opacity=".22"/>{c}<g fill="none" stroke="#5c6474" stroke-width="2.2" stroke-linecap="round"><path d="M16 30c0 8 28 8 28 0M30 24v26"/></g><path d="M22 56h16l-3-6h-10z" fill="{SILV}" stroke="#4a5262" stroke-width="1"/><circle cx="30" cy="40" r="2.4" fill="{SILV}" stroke="#4a5262"/></svg>'''
def musicbox(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><path d="M10 34h40v18H10z" fill="#3a2b3c" stroke="{INK}" stroke-width="1.3"/><path d="M8 26h44l-2 8H10z" fill="{WINE}" stroke="{INK}" stroke-width="1.3"/><path d="M14 40h32M14 46h32" stroke="{SILV}" stroke-width="1"/><circle cx="30" cy="43" r="3" fill="{SILV}"/>
<path d="M30 26v-6" stroke="#5c6474" stroke-width="1.4"/><path d="M26 14l4-6 4 6-4 6z" fill="{GLASS}" stroke="{INK}" stroke-width="1"/><path d="M42 12q4-2 6 2M44 18q4 0 5 3" fill="none" stroke="#5c6474" stroke-width="1.2" stroke-linecap="round"/></svg>'''
def vase(sz=62):
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 60 60">{rose(24,12,1)}{rose(36,10,1,"#8f2a44")}{rose(30,6,.9)}<path d="M20 30h20c0 6-4 8-4 14 0 4 4 6 4 10H20c0-4 4-6 4-10 0-6-4-8-4-14z" fill="#dfe3ea" stroke="#4a5262" stroke-width="1.3"/><path d="M22 34h16" stroke="#8d94a2" stroke-width="1"/></svg>'''
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:center;gap:12px;font-family:Oranienbaum;font-size:23px;margin-bottom:14px;flex-wrap:wrap;color:{INK}}}.sh .sm{{font-family:Manrope;font-weight:700;font-size:12.5px;color:{AME}}}
.shb{{display:inline-block;padding:0 10px;background:rgba(251,249,252,.92);border-radius:6px}}
.q{{display:flex;align-items:center;gap:12px;padding:22px 16px 14px;margin-bottom:14px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:700;font-size:15px}}.q .ds{{font-size:12.5px;color:{T2};margin:2px 0 7px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:800;font-size:15px;color:{SILT}}}
.ter{{padding:22px 10px 0;overflow:hidden}}.shelf{{height:10px;margin:0 -8px;background:linear-gradient(180deg,#3a2b3c,#1c1420);border-top:2px solid #8d94a2}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;text-align:center}}.it .art{{height:66px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:6px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:13px;font-weight:700;line-height:1.2;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:800;color:{SILT}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:18px;border:1.5px dashed #8d94a2;border-radius:8px;background:rgba(251,249,252,.95)}}.add .tt{{font-weight:700;font-size:14px;color:{WINE}}}.add .ds{{font-size:12.5px;color:{T2}}}</style>'''
    q1=f'<div class="card q">{lid(350,2)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div>{moons(6,10,180,label=False)}</div><div class="amt">{coin(20)}+30</div></div>'
    ws=''.join(window(22,i<3) for i in range(4))
    q2=f'<div class="card q">{lid(350,5)}<div style="display:flex;gap:2px;flex:none">{ws}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:linear-gradient(90deg,#6a54a8,{AME})"></i></div></div><div class="amt">{coin(20)}+120</div></div>'
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in (candelabra(),musicbox(),vase()))
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
    pk=f'<div class="abs" style="right:16px;top:382px">{bat(56)}</div>'
    return css+scene()+f'''<div class="hdr"><h1>Награды</h1>{bal()}</div>
<div class="sec" style="top:112px"><div class="sh"><span class="shb">Задания</span>{divider(200)}</div>{q1}{q2}</div>
<div class="sec" style="top:384px"><div class="sh"><span class="shb">Серебряная галерея</span><span class="shb sm" style="padding:2px 8px">награды за прочитанное</span></div><div class="card ter">{lid(350,7,False)}<div class="rc">{its}</div><div class="shelf"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{WINE}">{ic("plus",24)}</div><div><div class="tt">Добавить в галерею</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в лунарах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.veil{{position:absolute;inset:0;background:rgba(28,20,32,.42)}}.sm{{position:absolute;left:20px;right:20px;top:130px;padding:28px 20px 22px;text-align:center}}
.sm h2{{font-size:30px}}.sub{{font-size:13px;color:{T2};margin:6px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;gap:8px}}.st{{flex:1;padding:8px 4px;border-radius:6px;background:#efe9f1;box-shadow:inset 0 0 0 1px #d3d0da}}
.st b{{display:block;font-family:"Cormorant SC";font-weight:700;font-size:25px;line-height:1.25}}.st span{{font-size:12px;color:{T2}}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:700;margin-bottom:6px}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 0 8px;margin:4px 0 8px}}.rw .tt{{font-weight:800;font-size:14px;white-space:nowrap;color:{SILT}}}.rw .ds{{font-size:12.5px;color:{T2}}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;margin:4px 0 18px}}.dots{{display:flex;gap:4px}}</style>'''
    dots=''.join(window(26,i<3) for i in range(4))
    top=f'<svg width="160" height="50" viewBox="0 0 160 50"><circle cx="80" cy="25" r="20" fill="#dfe7f5"/><circle cx="80" cy="25" r="20" fill="none" stroke="#8d94a2" stroke-width="1.2"/><circle cx="74" cy="20" r="3" fill="#c9d3e6"/><circle cx="86" cy="31" r="2.2" fill="#c9d3e6"/>{batpath(80,26,1.4,EBON)}{rose(40,22,.9)}{rose(120,22,.9)}<path d="M30 40q50 14 100 0" fill="none" stroke="#8d94a2" stroke-width="1"/></svg>'
    inner=f'''<div style="line-height:0">{top}</div><h2 class="gth" style="margin-top:6px;font-size:26px">Сессия завершена</h2><div class="sub">Библиотека графини · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{WINE}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div style="display:flex;justify-content:center;margin-top:14px">{divider(260)}</div><div class="rw">{moons(10,10,134,label=False)}<div style="flex:1"><div class="tt" style="display:flex;align-items:center;gap:6px">{coin(22)}+30 лунаров за день</div><div class="ds">Полнолуние · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+scene(True)+f'<div class="card sm">{lid(350,9)}{inner}</div>'
SW=[('Эбен','#1c1420','текст'),('Лунный камень','#ece8ef','фон'),('Лён','#fbf9fc','карточки'),('Камень светл.','#efe9f1','вторичный'),
 ('Пепел','#574a5c','вторичный текст'),('Бархат','#6e1630','акцент'),('Бархат тёмн.','#520f23','нажатие'),('Аметист','#4f3a86','неделя, успех'),
 ('Старое серебро','#b8bcc6','только декор'),('Лунный голубой','#9fb6d8','только декор'),('Серебро текст','#454d5c','суммы'),('Страница','#faf8f5','книга день'),
 ('Полночь','#0c0a12','фон ночи'),('Ночь: панель','#1a1520','поверхность'),('Лунный свет','#a9c4ec','акцент ночи'),('Ночь: текст','#e6e1ea','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;inset:0;padding:50px 18px}}.pp{{background:rgba(251,249,252,.96);padding:10px 8px;border-radius:8px;box-shadow:0 0 0 1px #a7abb6}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px}}.s{{text-align:center;font-size:10.5px}}.c{{height:34px;border-radius:6px;box-shadow:0 0 0 1px #8d94a2;margin-bottom:6px}}.s b{{display:block;font-weight:700;line-height:1.15}}.s span{{display:block;font-family:monospace;color:{T2}}}.s em{{font-style:normal;color:{T2};font-size:10px}}.f{{margin-top:12px;font-size:14px;line-height:1.55}}</style>'
    return css+scene()+f'''<div class="wrap"><h1 class="gth" style="font-size:28px;color:#efeaf2;margin:12px 0 30px 10px;position:relative">Палитра</h1><div class="pp"><div class="g">{sw}</div></div>
<div class="card f" style="padding:12px 14px"><div class="gth" style="font-size:18px">Ruslan Display — экраны</div><div class="H" style="font-size:20px">Oranienbaum — обложки, кнопка</div><div class="num" style="font-size:19px">Cormorant SC — 18 мин · +180</div><div>Manrope — интерфейс</div><div style="font-family:'Ledger';font-size:15px">Ledger — текст книги</div>
<div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px">{coin(38)}{window(30)}{window(30,False)}{candelabra(48)}{bat(76)}</div><div style="margin-top:4px">{moons(6,10,220)}</div></div></div>'''
SC=[(P+'-reader-day',reader(),'','Читалка · день'),(P+'-reader-night',reader(True),'night','Читалка · ночь'),(P+'-library',library(),'','Библиотека'),
    (P+'-rewards',rewards(),'','Награды'),(P+'-session-summary',summary(),'','Итог сессии'),(P+'-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    # сводка — в самом конце, из финальных PNG
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),'#1c1420');d=ImageDraw.Draw(ov)
    gf='/usr/share/fonts/truetype/sand-box/google/'
    fH=ImageFont.truetype(gf+'Oranienbaum/Oranienbaum-Regular.ttf',50);fC=ImageFont.truetype(glob.glob(gf+'Manrope/Manrope-VariableFont*.ttf')[0],22)
    d.text((G,14),'ReadQuest — скин «Бархатная ночь»',font=fH,fill='#efeaf2')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#c6bfcc',anchor='ma')
    ov.save(f'{OUT}/{P}-overview.png')
