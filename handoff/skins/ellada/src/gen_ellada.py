# ReadQuest · скин «Эллада» (вазопись: краснофигурный и чернофигурный стиль, мрамор, Эгейское море, созвездия) — генератор макетов. Запуск: python3 gen_ellada.py
# Все рисунки наши: монеты-«драхмы» с лирой (не копия реальных монет), лавровые листья цели дня, колонны недели, сова-маскот Глаукс.
import os,subprocess,math,random
from PIL import Image,ImageDraw,ImageFont
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; P='ellada'
W,H=390,844
INK='#1a1410'; T2='#5a4a3e'; AEG='#1f5a8c'; AEG2='#17466e'; TERRA='#c8642c'; TERRA_L='#e08a4e'; GLAZE='#15110e'
MARB='#f4f0e8'; SURF='#fffdf9'; OLIVE='#4d6326'; COIN_T='#7a3a12'; SEA='#3f7fb5'
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'amphora':'<path d="M9 3h6M10 3v3c-4 2-5 6-4 10 1 3 3 5 6 5s5-2 6-5c1-4 0-8-4-10V3M8 7C5 7 5 11 7 12M16 7c3 0 3 4 1 5"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','plus':'<path d="M12 5v14M5 12h14"/>'}
def ic(n,sz=22,w=1.7): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_u=[0]
def uid(p): _u[0]+=1; return f'{p}{_u[0]}'
def meander(w,h,c,bg='none',cls='tc'):
    """Меандр (греческий ключ): повторяющийся ключ в квадрате h×h, линия по центру полосы."""
    s=h; i=uid('mq'); k=s/10
    unit=f'M0 {9*k}H{8*k}V{2*k}H{2*k}V{6*k}H{5*k}V{4*k}' # ключ-спираль
    return (f'<svg class="abs {cls}" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><pattern id="{i}" width="{s}" height="{s}" patternUnits="userSpaceOnUse">'
            f'<path d="{unit}M{8*k} {9*k}H{s}" fill="none" stroke="{c}" stroke-width="{1.3*k:.2f}" stroke-linecap="square"/></pattern></defs>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/><rect width="{w}" height="{h}" fill="url(#{i})"/></svg>')
def wave(w,h,c,bg):
    """«Бегущая волна» — эгейский орнамент (синий/белый, не красный)."""
    i=uid('wv'); s=h*1.6
    return (f'<svg class="abs" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><pattern id="{i}" width="{s}" height="{h}" patternUnits="userSpaceOnUse">'
            f'<path d="M0 {h*.85}C{s*.3} {h*.85} {s*.35} {h*.15} {s*.6} {h*.2}C{s*.85} {h*.25} {s*.8} {h*.6} {s*.62} {h*.58}C{s*.5} {h*.55} {s*.55} {h*.4} {s*.65} {h*.42}" fill="none" stroke="{c}" stroke-width="1.6"/><path d="M{s*.62} {h*.58}C{s*.8} {h*.85} {s} {h*.85} {s} {h*.85}" fill="none" stroke="{c}" stroke-width="1.6"/></pattern></defs>'
            f'<rect width="{w}" height="{h}" fill="{bg}"/><rect width="{w}" height="{h}" fill="url(#{i})"/></svg>')
def coin(sz=22):
    """Драхма — наш рисунок: чеканная, чуть неровная серебряно-бронзовая монета, в центре вдавленный квадрат с лирой, по краю точечный ободок. Не копия реальных монет."""
    g=uid('cg'); r=random.Random(7)
    pts=' '.join(f'{20+18.6*(1+r.uniform(-.035,.035))*math.cos(a):.1f},{20+18.6*(1+r.uniform(-.035,.035))*math.sin(a):.1f}' for a in [i*math.pi/9 for i in range(18)])
    dots=''.join(f'<circle cx="{20+15*math.cos(a):.1f}" cy="{20+15*math.sin(a):.1f}" r=".7" fill="#6b5a40"/>' for a in [i*math.pi/10 for i in range(20)])
    return f'''<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fbf4e2"/><stop offset=".55" stop-color="#d8c9a6"/><stop offset="1" stop-color="#9b8659"/></radialGradient></defs>
<polygon points="{pts}" fill="url(#{g})" stroke="#5e4c30" stroke-width="1.2" stroke-linejoin="round"/>{dots}<rect x="11.5" y="11.5" width="17" height="17" rx="2" fill="#c4b084" stroke="#6b5a40" stroke-width=".9"/>
<path d="M15.5 26V18Q15.5 13 13.5 13.5M24.5 26V18Q24.5 13 26.5 13.5M15.5 17.5H24.5M14.5 26H25.5" fill="none" stroke="{GLAZE}" stroke-width="1.5" stroke-linecap="round"/><path d="M18 18v7.5M20 18v7.5M22 18v7.5" stroke="{GLAZE}" stroke-width=".7"/></svg>'''
def leaf(x,y,ang,on,night=False,s=1):
    c_on='#7f9a3a' if not night else '#b8cf8a'; c_off='#b9ad97' if not night else '#5e5246'
    d='M0 0C3 -3 9 -3 12 0C9 3 3 3 0 0z'
    return (f'<path transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f}) scale({s})" d="{d}" fill="{c_on if on else "none"}" stroke="{"#3d4f1c" if on else c_off}" stroke-width="{1 if on else 1.1}"/>'
            +(f'<path transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f}) scale({s})" d="M1 0H11" stroke="#e7efc9" stroke-width=".7"/>' if on else ''))
def laurel(filled,tot=10,w=180,night=False,label=True):
    """Цель дня — лавровая ветвь: 10 листьев, 1 минута = 1 лист. Не прочитано — пустой контур."""
    out=f'<path d="M6 16Q{w/2} 22 {w-6} 12" fill="none" stroke="{"#8a7a5c" if not night else "#7a6a58"}" stroke-width="1.3"/>'
    for k in range(tot):
        t=k/(tot-1); x=10+t*(w-26); y=16+4*math.sin(t*math.pi)-t*4
        up=k%2==0; out+=leaf(x,y-1 if up else y+1,-38 if up else 34,k<filled,night)
    t=f'<text x="{w/2}" y="38" text-anchor="middle" font-family="Alegreya Sans" font-weight="800" font-size="11" fill="{"#f3e9dc" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{42 if label else 28}" viewBox="0 0 {w} {42 if label else 28}" style="flex:none">{out}{t}</svg>'
def column(sz=24,on=True,night=False):
    """Неделя — ионическая колонна. Возведена — белый мрамор с эгейской капителью; не возведена — контур фундамента и пунктир."""
    if on:
        fl=''.join(f'<path d="M{x} 9V25" stroke="#a9a094" stroke-width=".7"/>' for x in (8.5,11,13.5,16))
        return f'<svg width="{sz*.8:.0f}" height="{sz*1.17:.0f}" viewBox="0 0 24 28" style="flex:none"><path d="M3 5h18v3H3z" fill="#f7f3ea" stroke="{INK}" stroke-width="1"/><circle cx="5" cy="7" r="2.2" fill="{SEA}" stroke="{INK}" stroke-width=".8"/><circle cx="19" cy="7" r="2.2" fill="{SEA}" stroke="{INK}" stroke-width=".8"/><path d="M2 3h20v2H2z" fill="{INK}"/><path d="M7 8h10v17H7z" fill="#fbf8f1" stroke="{INK}" stroke-width="1"/>{fl}<path d="M4 25h16v2.5H4z" fill="#f7f3ea" stroke="{INK}" stroke-width="1"/></svg>'
    c='#6a5c4e' if night else '#a89c88'
    return f'<svg width="{sz*.8:.0f}" height="{sz*1.17:.0f}" viewBox="0 0 24 28" style="flex:none"><path d="M7 9V25M17 9V25" stroke="{c}" stroke-width="1.1" stroke-dasharray="2 2"/><path d="M4 25h16v2.5H4z" fill="none" stroke="{c}" stroke-width="1.1"/></svg>'
def owl(sz=96,bg=True):
    """Маскот «Глаукс» — совёнок в чернофигурной манере: чёрный силуэт с процарапанными терракотовыми линиями перьев, большие светлые глаза, веточка оливы в лапках. Фон — терракотовый медальон с меандром."""
    med=f'<circle cx="50" cy="52" r="46" fill="{TERRA}"/><circle cx="50" cy="52" r="42" fill="none" stroke="{GLAZE}" stroke-width="2"/><circle cx="50" cy="52" r="46" fill="none" stroke="{GLAZE}" stroke-width="2"/>' if bg else ''
    feathers=''.join(f'<path d="M{x-4} {y}q4 4 8 0" fill="none" stroke="{TERRA_L}" stroke-width="1.1"/>' for x,y in ((42,62),(50,62),(58,62),(46,69),(54,69),(50,76)))
    return f'''<svg class="tc" width="{sz}" height="{sz}" viewBox="0 0 100 100">{med}
<path d="M30 30L34 20 41 27Q50 24 59 27L66 20 70 30Q76 42 72 60Q68 82 50 84Q32 82 28 60Q24 42 30 30z" fill="{GLAZE}"/>
<path d="M30 44Q22 56 28 72Q32 64 34 56z" fill="{GLAZE}" stroke="{TERRA_L}" stroke-width="1"/><path d="M70 44Q78 56 72 72Q68 64 66 56z" fill="{GLAZE}" stroke="{TERRA_L}" stroke-width="1"/>
<circle cx="41" cy="40" r="9" fill="none" stroke="{TERRA_L}" stroke-width="1.2"/><circle cx="59" cy="40" r="9" fill="none" stroke="{TERRA_L}" stroke-width="1.2"/>
<circle cx="41" cy="40" r="6.5" fill="#f6ead2"/><circle cx="59" cy="40" r="6.5" fill="#f6ead2"/><circle cx="42" cy="41" r="3.6" fill="{GLAZE}"/><circle cx="58" cy="41" r="3.6" fill="{GLAZE}"/><circle cx="43.2" cy="39.6" r="1.3" fill="#fff"/><circle cx="59.2" cy="39.6" r="1.3" fill="#fff"/>
<path d="M47.5 47L50 52 52.5 47z" fill="#e9b07a"/>{feathers}
<path d="M34 83Q50 80 70 86" fill="none" stroke="#5f6e2c" stroke-width="2.2" stroke-linecap="round"/><path d="M60 83c2-4 6-4 8-3-2 3-5 4-8 3zM50 82c1-4 5-5 7-4-1 3-4 5-7 4z" fill="#8aa04a"/>
<path d="M42 82v4M46 82v4M54 82v4M58 82v4" stroke="#e9b07a" stroke-width="1.6" stroke-linecap="round"/></svg>'''
def amphora(sz=62,style='red',fill=None):
    """Амфора. red — краснофигурная (чёрный лак, терракотовый фриз с меандром), black — чернофигурная (терракота, чёрный фриз). fill — доля «наполнения» для итога."""
    body='M38 14H62V20Q62 24 68 28Q84 40 80 62Q76 82 58 90H42Q24 82 20 62Q16 40 32 28Q38 24 38 20z'
    a,b=(GLAZE,TERRA) if style=='red' else (TERRA,GLAZE); i=uid('am')
    fl=''
    if fill is not None:
        y=90-fill*72; fl=f'<clipPath id="{i}c"><path d="{body}"/></clipPath><rect clip-path="url(#{i}c)" x="0" y="{y:.0f}" width="100" height="100" fill="{SEA}" opacity=".85"/><path clip-path="url(#{i}c)" d="M15 {y:.0f}q8-3 16 0t16 0 16 0 16 0 16 0" fill="none" stroke="#cfe3f2" stroke-width="1.6"/>'
    return f'''<svg class="tc" width="{sz}" height="{sz*1.05:.0f}" viewBox="0 0 100 105"><path d="M38 22Q22 18 24 36M62 22Q78 18 76 36" fill="none" stroke="{a}" stroke-width="5" stroke-linecap="round"/>
<path d="{body}" fill="{a}" stroke="{GLAZE}" stroke-width="1.6"/><rect x="34" y="11" width="32" height="5" rx="1.5" fill="{a}" stroke="{GLAZE}" stroke-width="1.2"/>
<path d="M22 44H78V66H22z" fill="{b}" clip-path="none"/>{meander_inline(24,46,52,8,a)}<path d="M28 58q6-4 10 0t10 0 10 0 10 0 8 0" fill="none" stroke="{a}" stroke-width="1.6"/>
{fl}<path d="M42 90H58L60 98H40z" fill="{a}" stroke="{GLAZE}" stroke-width="1.2"/><path d="M30 34Q34 30 40 30" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/></svg>'''
def meander_inline(x,y,w,h,c):
    k=h/10; out=''
    for n in range(int(w//h)):
        ox=x+n*h; out+=f'<path d="M{ox} {y+9*k}H{ox+8*k}V{y+2*k}H{ox+2*k}V{y+6*k}H{ox+5*k}V{y+4*k}M{ox+8*k} {y+9*k}H{ox+h}" fill="none" stroke="{c}" stroke-width="{1.3*k:.2f}"/>'
    return out
def lyre(sz=62):
    return f'''<svg class="tc" width="{sz}" height="{sz}" viewBox="0 0 60 60"><path d="M18 52Q10 36 16 20Q18 12 13 8M42 52Q50 36 44 20Q42 12 47 8" fill="none" stroke="{GLAZE}" stroke-width="4" stroke-linecap="round"/><path d="M16 20H44" stroke="{TERRA}" stroke-width="3"/><path d="M17 50H43" stroke="{GLAZE}" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="50" rx="13" ry="4" fill="{TERRA}" stroke="{GLAZE}" stroke-width="1.2"/>
{''.join(f'<path d="M{x} 20V48" stroke="#8a7a5c" stroke-width=".9"/>' for x in (24,28,32,36))}</svg>'''
def wreath(sz=62):
    l=''.join(leaf(30+20*math.cos(a),32+20*math.sin(a),math.degrees(a)+(100 if i%2 else 80),True,s=.9) for i,a in enumerate([math.pi*(.75+j*.11) for j in range(14)]))
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 60 60"><path d="M30 52Q8 50 10 30Q12 14 30 12Q48 14 50 30Q52 50 30 52" fill="none" stroke="#5f6e2c" stroke-width="1.6"/>{l}<path d="M26 52l4 5 4-5" fill="none" stroke="{AEG}" stroke-width="2"/></svg>'
# ---- фигуры в профиль (наш рисунок, вазописная манера) для обложек ----
FIG={
'ship':'<path d="M6 34H54L48 42H14z"/><path d="M30 34V8M30 10L46 30H30zM30 12L16 30H30z" opacity=".9"/><path d="M54 34q4-6 2-10"/>',
'dolphin':'<path d="M8 32Q14 14 34 16Q48 17 54 26Q46 24 40 28Q46 34 44 40Q38 32 30 32Q20 34 14 40Q14 34 8 32z"/><path d="M30 17l4-8 3 9z"/>',
'runner':'<circle cx="34" cy="9" r="5"/><path d="M33 14L28 28 18 34 22 37 31 31 34 40 26 48 29 50 38 41 36 29 44 22 48 26 51 24 44 16z"/><path d="M14 22a10 10 0 1 0 0.1 0" fill="none" stroke-width="3"/>',
'horse':'<path d="M14 46Q18 30 26 22Q24 14 30 8L34 14Q44 14 50 24L46 28Q40 24 38 28Q42 38 40 46z"/><path d="M28 10Q22 18 22 30" fill="none" stroke-width="2"/>',
'owl':'<path d="M20 14L24 8 28 12Q30 11 32 12L36 8 40 14Q44 24 40 36Q36 46 30 46Q24 46 20 36Q16 24 20 14z"/><path d="M16 46H44" stroke-width="2.4"/>',
'vine':'<path d="M10 44Q20 20 30 30T50 14" fill="none" stroke-width="2.6"/><circle cx="20" cy="36" r="4"/><circle cx="26" cy="38" r="4"/><circle cx="23" cy="43" r="4"/><circle cx="42" cy="22" r="4"/><circle cx="47" cy="27" r="4"/>'}
def figure(n,fill,line,tc=False):
    return f'<svg width="42" height="36" viewBox="0 0 60 52" class="abs{" tc" if tc else ""}" style="left:50%;margin-left:-21px;bottom:8px"><g fill="{fill}" stroke="{line}" stroke-width="1">{FIG[n]}</g></svg>'
CSS=f'''@font-face{{font-family:"Cormorant Unicase";font-weight:700;src:url("fonts/CormorantUnicase-Bold.ttf")}}@font-face{{font-family:"Cormorant Unicase";font-weight:600;src:url("fonts/CormorantUnicase-SemiBold.ttf")}}
@font-face{{font-family:"Alegreya Sans SC";font-weight:800;src:url("fonts/AlegreyaSansSC-ExtraBold.ttf")}}@font-face{{font-family:"Lora";font-weight:400 700;src:url("fonts/Lora-VariableFont_wght.ttf")}}
@font-face{{font-family:"Alegreya Sans";font-weight:500;src:url("fonts/AlegreyaSans-Medium.ttf")}}@font-face{{font-family:"Alegreya Sans";font-weight:700;src:url("fonts/AlegreyaSans-Bold.ttf")}}@font-face{{font-family:"Alegreya Sans";font-weight:800;src:url("fonts/AlegreyaSans-ExtraBold.ttf")}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:"Alegreya Sans",sans-serif;font-weight:500;color:{INK};background:{MARB}}}
.abs{{position:absolute;pointer-events:none}}.H{{font-family:"Cormorant Unicase",serif;font-weight:700}}.num{{font-family:"Alegreya Sans SC",sans-serif;font-weight:800}}
.card{{position:relative;background:{SURF};border-radius:3px;box-shadow:0 0 0 1.5px {GLAZE},0 0 0 4px {SURF},0 0 0 5px #b9ad97,0 8px 20px rgba(26,20,16,.16)}}
.card>.tc{{left:10px;top:7px}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between;z-index:2}}
.hdr h1{{font-family:"Cormorant Unicase",serif;font-weight:700;font-size:30px;color:#f6ead6;letter-spacing:1px;line-height:1}}
.bal{{display:flex;align-items:center;gap:6px;padding:3px 14px 3px 3px;font-weight:700;font-size:14px;background:{SURF};border-radius:20px;box-shadow:0 0 0 1.5px #b9ad97}}
.nav{{position:absolute;left:14px;right:14px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 8px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:13px;font-weight:700;color:{T2};position:relative;padding:6px 0}}
.nav .on{{color:#fff}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;z-index:-1;background:{AEG};border-radius:3px;box-shadow:inset 0 0 0 1px {AEG2}}}
.btn{{display:flex;align-items:center;justify-content:center;height:52px;font-family:"Cormorant Unicase",serif;font-weight:700;font-size:24px;color:#fff;background:{AEG};border-radius:3px;box-shadow:0 0 0 1.5px {AEG2},0 0 0 4px #f6ead6,0 0 0 5px #8a7a5c}}
.bar{{height:8px;background:#ece5d8;border-radius:1px;box-shadow:inset 0 0 0 1px #c9bea9}}.bar i{{display:block;height:100%;border-radius:1px;background:{AEG}}}
.cap{{font-size:12.5px;color:{T2}}}
/* читалка: страница чистая — без меандров, ваз, созвездий и маскота */
.rd{{position:absolute;inset:0;background:#fcf9f3;color:{INK}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:"Lora",serif;font-size:16px;line-height:1.7}}
.page h3{{font-family:"Cormorant Unicase",serif;font-weight:700;font-size:24px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:#f2ede3;box-shadow:0 1px 0 #c9bea9}}
.rtop .t{{flex:1;text-align:center;font-family:"Cormorant Unicase",serif;font-weight:700;font-size:21px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{AEG}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:#f2ede3;box-shadow:0 -1px 0 #c9bea9;padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;font-size:15px;margin-bottom:10px;font-weight:700}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:4px;background:#d8cfbf}}.sl .fi{{position:absolute;top:10px;left:0;height:4px;background:{AEG}}}
.sl .th{{position:absolute;top:2px;margin-left:-10px;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid {AEG};box-shadow:0 0 0 2px #fff,0 0 0 3px #8a7a5c}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:13px;font-weight:700}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}.tools svg{{color:{AEG}}}
.night .rd{{background:#100d0b;color:#ebe0d2}}.night .rtop,.night .rbot{{background:#1c1714}}.night .rtop{{box-shadow:0 1px 0 #3a2f27}}.night .rbot{{box-shadow:0 -1px 0 #3a2f27}}
.night .rtop .t,.night .pg,.night .tools{{color:#f3e9dc}}.night .ib,.night .tools svg{{color:#f0a066}}
.night .sl .tr{{background:#3a2f27}}.night .sl .fi{{background:#f0a066}}.night .sl .th{{background:#100d0b;border-color:#f0a066;box-shadow:0 0 0 2px #100d0b,0 0 0 3px #6a5c4e}}
'''
def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}">{body}</body></html>'
TXT=("Дочь гончара Ксения просыпалась раньше всех в квартале и первой спускалась к печи, где за ночь остывали новые амфоры. "
 "Она проводила ладонью по чёрному лаку и угадывала на ощупь, где отец процарапал гриву коня, а где — волну, по которой плывёт корабль. "
 "В тот день на одной вазе оказалась сова, которую никто не рисовал, и Ксения долго не решалась позвать отца. ")
def reader(night=False):
    pct=97/184*100
    return f'''<div class="rd"><div class="page"><h3>Глава 7. Сова на амфоре</h3><p>{TXT*2}</p><p>{TXT}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">Гончар из нижнего города</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
def header_band(h=112):
    """Шапка — фриз чёрного лака: сверху терракотовый меандр (y 0–24, зона статус-бара), снизу «бегущая волна» цвета мрамора (y 100–112). Заголовок между ними, от красного ≥ 26 px."""
    return (f'<div class="abs" style="left:0;top:0;width:{W}px;height:{h}px;background:{GLAZE}"></div>'
            f'<div class="abs" style="left:0;top:0">{meander(W,24,GLAZE,TERRA)}</div>'
            f'<div class="abs" style="left:0;top:{h-12}px">{wave(W,12,"#f4f0e8",GLAZE)}</div>')
def marble(seed=2,night=False):
    r=random.Random(seed); v=''
    for _ in range(9):
        x=r.uniform(-40,W); y=r.uniform(120,H); p=f'M{x:.0f} {y:.0f}'
        for _ in range(5): x+=r.uniform(20,70); y+=r.uniform(-30,40); p+=f' Q{x-r.uniform(5,30):.0f} {y+r.uniform(-25,25):.0f} {x:.0f} {y:.0f}'
        v+=f'<path d="{p}" fill="none" stroke="#b7ad9f" stroke-width="{r.uniform(.5,1.4):.1f}" opacity="{r.uniform(.25,.5):.2f}"/>'
    return v
def scene():
    """День: белый мрамор с прожилками, внизу Эгейское море с белой волной (синее, не красное). Шапка — фриз."""
    sea=f'<rect x="0" y="650" width="{W}" height="194" fill="#2f6a9c"/><rect x="0" y="650" width="{W}" height="194" fill="url(#sg)"/>'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d9bd0"/><stop offset="1" stop-color="#1f4f7c"/></linearGradient>'
            f'<linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8f5ef"/><stop offset="1" stop-color="#e9e3d8"/></linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#mg)"/>{marble()}{sea}</svg>'
            f'<div class="abs" style="left:0;top:640px">{wave(W,14,"#f4f0e8","transparent")}</div>'+header_band())
CONST=[ # мифические фигуры тонкой линией + звёзды в узлах: наши рисунки, не реальные звёздные карты
 ('Лира',[(16,52),(10,36),(16,20),(13,8),None,(44,52),(50,36),(44,20),(47,8),None,(16,20),(44,20),None,(17,50),(43,50)],(30,26),1.5),
 ('Дельфин',[(8,32),(14,14),(34,16),(48,17),(54,26),(40,28),(44,40),(30,32),(14,40),(8,32),None,(30,17),(34,9),(37,18)],(258,22),1.8),
 ('Бегун',[(34,9),(33,14),(28,28),(18,34),None,(28,28),(31,31),(34,40),(26,48),None,(33,14),(44,16),(51,24),None,(36,29),(44,22)],(34,650),2.2),
 ('Конь',[(14,46),(18,30),(26,22),(24,14),(30,8),(34,14),(44,14),(50,24),(46,28),(38,28),(42,38),(40,46)],(256,650),2.2)]
def nightsky():
    r=random.Random(5)
    st=''.join(f'<circle cx="{r.uniform(0,W):.0f}" cy="{r.uniform(0,H):.0f}" r="{r.uniform(.5,1.3):.1f}" fill="#f3e9dc" opacity="{r.uniform(.3,.8):.2f}"/>' for _ in range(90))
    cs=''
    for n,pts,(ox,oy),s in CONST:
        segs=[[]]
        for p in pts:
            if p is None: segs.append([])
            else: segs[-1].append(p)
        for sg in segs:
            pp=' '.join(f'{ox+x*s:.0f},{oy+y*s:.0f}' for x,y in sg)
            cs+=f'<polyline points="{pp}" fill="none" stroke="#e9c89a" stroke-width="1.1" opacity=".6" stroke-linejoin="round" stroke-linecap="round"/>'
        cs+=''.join(f'<circle cx="{ox+x*s:.0f}" cy="{oy+y*s:.0f}" r="{1.6 if i%3 else 2.4}" fill="#fff4dc"/>' for i,(x,y) in enumerate({p for p in pts if p}))
        cs+=f'<text x="{ox+28*s:.0f}" y="{oy+62*s:.0f}" text-anchor="middle" font-family="Cormorant Unicase" font-weight="700" font-size="12" fill="#c9b6a2" letter-spacing="1">{n}</text>'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><radialGradient id="ng" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#2a201a"/><stop offset="1" stop-color="#0d0a08"/></radialGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#ng)"/>{st}{cs}</svg>'
            f'<div class="abs" style="left:0;top:820px">{meander(W,24,TERRA,"#0d0a08")}</div>')
def nav(on):
    it=[('book-open','Библиотека'),('amphora','Награды'),('user','Профиль')]
    return '<div class="card nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
def bal(): return f'<div class="bal">{coin(26)}<span class="num" style="font-size:19px">390</span> драхм</div>'
COV=[('Гончар из нижнего города','Д. Керамиди','EPUB','53%','red','horse'),('Остров тысячи амфор','М. Солонова','FB2','12%','black','ship'),('Песнь о медном корабле','А. Эгеева','TXT','прочитано','marble','dolphin'),
 ('Сова, что видела всё','Е. Оливина','PDF','не начата','black','owl'),('Бег до самого моря','В. Стадиев','EPUB','4%','red','runner'),('Виноградник у храма','Н. Лаврова','PDF','67%','aegean','vine')]
CST={'red':(GLAZE,'#f6ead6',TERRA,'#f6ead6'),'black':('linear-gradient(180deg,#f7efe0 0,#f7efe0 100px,#15110e 100px,#15110e 102px,#c8642c 102px)',GLAZE,GLAZE,GLAZE),'marble':('#f7f3ea',INK,GLAZE,INK),'aegean':(AEG,'#ffffff','#cfe3f2','#ffffff')}
def library():
    css=f'''<style>.chips{{position:absolute;top:126px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:5px 13px;font-size:15px;font-weight:700;color:{T2};border-radius:3px;background:{SURF};box-shadow:0 0 0 1px #b9ad97}}.chip.on{{color:#fff;background:{AEG};box-shadow:0 0 0 1px {AEG2}}}
.grid{{position:absolute;top:174px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0;background:{SURF};padding:6px 6px 7px;border-radius:3px;box-shadow:0 0 0 1px #b9ad97}}
.cv{{position:relative;height:146px;overflow:hidden;padding:24px 7px 0;text-align:center;border-radius:2px;box-shadow:0 0 0 1px {GLAZE}}}
.fmt{{position:absolute;top:8px;left:0;right:0;font-size:10px;font-weight:800;letter-spacing:1.5px}}
.ct{{font-size:15px;line-height:1.05;position:relative}}.ca{{font-size:10.5px;white-space:nowrap;margin-top:4px;position:relative;font-weight:700}}
.bt{{font-size:13px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:12px;color:{T2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
    cards=''
    for t,a,f,p,st,fg_ in COV:
        bg,fg,figc,line=CST[st]
        prog=f'<div class="bar" style="height:5px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
        cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg}"><div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div>{figure(fg_,figc,"none",figc==TERRA)}</div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
    pk=f'<div class="abs" style="right:10px;bottom:96px">{owl(84)}</div>'
    return css+scene()+f'<div class="hdr"><h1>Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
def rewards():
    css=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:center;gap:10px;font-family:"Cormorant Unicase";font-weight:700;font-size:24px;margin-bottom:14px;color:{INK}}}.sh .sm{{font-family:"Alegreya Sans";font-weight:700;font-size:13px;color:{T2}}}
.q{{display:flex;align-items:center;gap:12px;padding:28px 16px 14px;margin-bottom:14px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:800;font-size:16px}}.q .ds{{font-size:13px;color:{T2};margin:1px 0 4px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:800;font-size:16px;color:{COIN_T}}}
.ter{{padding:28px 10px 0;overflow:hidden}}.shelf{{height:10px;margin:0 -8px;background:{GLAZE}}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;text-align:center}}.it .art{{height:70px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:6px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:14px;font-weight:700;line-height:1.15;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:13px;font-weight:800;color:{COIN_T}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:18px;border:1.5px dashed #8a7a5c;border-radius:3px;background:{SURF}}}.add .tt{{font-weight:800;font-size:15px;color:{AEG}}}.add .ds{{font-size:13px;color:{T2}}}</style>'''
    q1=f'<div class="card q">{meander(330,8,TERRA)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div>{laurel(6,10,190,label=False)}</div><div class="amt">{coin(20)}+30</div></div>'
    ws=''.join(column(24,i<3) for i in range(4))
    q2=f'<div class="card q">{meander(330,8,TERRA)}<div style="display:flex;gap:3px;flex:none">{ws}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:{OLIVE}"></i></div></div><div class="amt">{coin(20)}+120</div></div>'
    its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in (amphora(58,'red'),lyre(62),wreath(62)))
    tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
    pk=f'<div class="abs" style="right:22px;top:118px">{owl(46)}</div>'
    return css+scene()+f'''<div class="hdr"><h1>Награды</h1>{bal()}</div>
<div class="sec" style="top:126px"><div class="sh">Задания</div>{q1}{q2}</div>
<div class="sec" style="top:384px"><div class="sh">Сокровищница<span class="sm">награды за чтение</span></div><div class="card ter">{meander(330,8,TERRA)}<div class="rc">{its}</div><div class="shelf"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{AEG}">{ic("plus",24)}</div><div><div class="tt">Добавить в сокровищницу</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в драхмах.</div></div></div></div>{pk}{nav("Награды")}'''
def summary():
    css=f'''<style>.sm{{position:absolute;left:20px;right:20px;top:150px;padding:30px 20px 22px;text-align:center;background:#1c1714!important;color:#f3e9dc;box-shadow:0 0 0 1.5px {TERRA_L},0 0 0 4px #1c1714,0 0 0 5px #6a5c4e,0 14px 40px rgba(0,0,0,.6)!important}}
.sm h2{{font-size:30px;color:#f6ead6}}.sub{{font-size:14px;color:#c9b6a2;margin:4px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;gap:8px}}.st{{flex:1;padding:8px 4px;border-radius:2px;background:#26201b;box-shadow:inset 0 0 0 1px #3a2f27}}
.st b{{display:block;font-family:"Alegreya Sans SC";font-weight:800;font-size:24px;line-height:1.25}}.st span{{font-size:13px;color:#c9b6a2}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;font-weight:700;margin-bottom:6px}}.cap{{color:#c9b6a2}}
.bar{{background:#2e2620;box-shadow:inset 0 0 0 1px #3a2f27}}.bar i{{background:#f0a066}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 0 8px;margin:4px 0 8px;border-top:1px solid #3a2f27}}.rw .tt{{font-weight:800;font-size:15px;white-space:nowrap;color:#f2c58f}}.rw .ds{{font-size:13px;color:#c9b6a2}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;margin:4px 0 18px}}.dots{{display:flex;gap:4px}}
.btn{{background:#f0a066;color:#100d0b;box-shadow:0 0 0 1.5px #a85a28,0 0 0 4px #1c1714,0 0 0 5px #6a5c4e}}</style>'''
    dots=''.join(column(26,i<3,True) for i in range(4))
    inner=f'''<div style="line-height:0;display:flex;justify-content:center">{amphora(64,'red')}</div><h2 class="H" style="margin-top:14px">Сессия завершена</h2><div class="sub">Гончар из нижнего города · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:#f0a066">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{laurel(10,10,124,True,label=False)}<div style="flex:1"><div class="tt" style="display:flex;align-items:center;gap:6px">{coin(22)}+30 драхм за день</div><div class="ds">Лавровый венок · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
    return css+nightsky()+f'<div class="card sm"><div class="abs" style="left:10px;top:8px">{meander(330,8,TERRA_L)}</div>{inner}</div>'
SW=[('Чёрный лак','#1a1410','текст'),('Мрамор','#f4f0e8','фон'),('Белый мрамор','#fffdf9','карточки'),('Мрамор тёпл.','#f2ede3','панели'),
 ('Глина тёмн.','#5a4a3e','вторичный текст'),('Эгейский','#1f5a8c','акцент'),('Эгейский тёмн.','#17466e','нажатие'),('Олива','#4d6326','неделя, успех'),
 ('Терракота','#c8642c','только декор'),('Море','#3f7fb5','только декор'),('Обожжённая','#7a3a12','суммы драхм'),('Страница','#fcf9f3','книга день'),
 ('Ночной лак','#0d0a08','фон ночи'),('Ночь: панель','#1c1714','поверхность'),('Светлая глина','#f0a066','акцент ночи'),('Ночь: текст','#ebe0d2','книга ночью')]
def palette():
    sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in SW)
    css=f'<style>.wrap{{position:absolute;left:0;right:0;top:126px;padding:0 18px}}.pp{{padding:10px 8px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px}}.s{{text-align:center;font-size:11px}}.c{{height:32px;border-radius:2px;box-shadow:0 0 0 1px #8a7a5c;margin-bottom:5px}}.s b{{display:block;font-weight:800;line-height:1.1}}.s span{{display:block;font-family:monospace;color:{T2};font-size:10.5px}}.s em{{font-style:normal;color:{T2};font-size:10.5px}}.f{{margin-top:14px;font-size:15px;line-height:1.45}}</style>'
    return css+scene()+f'''<div class="hdr"><h1>Палитра</h1></div><div class="wrap"><div class="card pp"><div class="g">{sw}</div></div>
<div class="card f" style="padding:12px 14px"><div class="H" style="font-size:21px">Cormorant Unicase — шапки</div><div class="num" style="font-size:19px">Alegreya Sans SC — 18 мин · +180</div><div>Alegreya Sans — интерфейс</div><div style="font-family:'Lora';font-size:15px">Lora — текст книги</div>
<div style="display:flex;gap:6px;align-items:flex-end;margin-top:6px">{coin(36)}{column(30)}{column(30,False)}{amphora(44,'black')}{owl(70)}</div><div style="margin-top:2px">{laurel(6,10,220)}</div></div></div>'''
SC=[(P+'-reader-day',reader(),'','Читалка · день'),(P+'-reader-night',reader(True),'night','Читалка · ночь'),(P+'-library',library(),'','Библиотека'),
    (P+'-rewards',rewards(),'','Награды'),(P+'-session-summary',summary(),'','Итог сессии'),(P+'-palette',palette(),'','Палитра')]
def shot(n,b,c):
    p=f'{D}/{n}.html'; open(p,'w').write(html(b,c)); big=f'/tmp/{n}@4x.png'
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
    im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
if __name__=='__main__':
    for n,b,c,_ in SC: shot(n,b,c)
    # сводка — в самом конце, из финальных PNG
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),GLAZE);d=ImageDraw.Draw(ov)
    fH=ImageFont.truetype(D+'/fonts/CormorantUnicase-Bold.ttf',52);fC=ImageFont.truetype(D+'/fonts/AlegreyaSans-Bold.ttf',22)
    d.text((G,12),'ReadQuest — скин «Эллада»',font=fH,fill='#f6ead6')
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill='#d9c7b0',anchor='ma')
    ov.save(f'{OUT}/{P}-overview.png')
