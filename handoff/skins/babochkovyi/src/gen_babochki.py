# ReadQuest · скин «Бабочковый» (воздушный луг: крылья, чешуйки, перламутр; ночью — мотыльки и луна) — генератор макетов. Запуск: python3 gen_babochki.py
# Все рисунки наши: бабочки и мотыльки из простых кривых (не реальные виды и не чужие персонажи), монета с крылышком, маскот «Пыльца».
import os,math,random,types
from rqkit import build,uid,W,H
D=os.path.dirname(os.path.abspath(__file__))
INK='#1d2140'; T2='#4f5470'; ACC='#13646c'; ACC2='#0d4c53'; COIN_T='#84480c'; SUCC='#3d6a2c'
IRI=('#8fd3d8','#b9a7ec','#f3b4cf')   # перламутр: бирюза → сирень → розовый, только декор
LUNA='#b5e3c4'
def wing_grad(i,cols):
    return f'<linearGradient id="{i}" x1="0" y1="0" x2="1" y2="1">'+''.join(f'<stop offset="{k/(len(cols)-1):.2f}" stop-color="{c}"/>' for k,c in enumerate(cols))+'</linearGradient>'
def bfly_g(cols=IRI,edge='#3a3f6a',spot='#ffffff',body='#2b2f4f',ant=True):
    """Бабочка в боксе 40×40, центр 20,20: верхние и нижние крылья, глазки, тельце."""
    g=uid('wg')
    up='M20 19C23 8 33 3 37 8C40 14 33 20 21 21z'; lo='M21 22C29 22 35 27 32 33C29 37 23 32 21 24z'
    half=f'<path d="{up}" fill="url(#{g})" stroke="{edge}" stroke-width=".9"/><path d="{lo}" fill="url(#{g})" stroke="{edge}" stroke-width=".9"/><circle cx="31" cy="11" r="2.2" fill="{spot}" opacity=".85"/><circle cx="28" cy="29" r="1.6" fill="{spot}" opacity=".7"/><path d="M22 20Q29 15 35 10M22 23Q27 26 30 31" stroke="{edge}" stroke-width=".5" opacity=".6" fill="none"/>'
    a=f'<path d="M20 15Q18 9 15 7M20 15Q22 9 25 7" fill="none" stroke="{body}" stroke-width=".9"/><circle cx="15" cy="7" r=".9" fill="{body}"/><circle cx="25" cy="7" r=".9" fill="{body}"/>' if ant else ''
    return f'<defs>{wing_grad(g,cols)}</defs>{half}<g transform="translate(40 0) scale(-1 1)">{half}</g>{a}<ellipse cx="20" cy="22" rx="1.6" ry="7" fill="{body}"/>'
def bfly(x,y,s,rot=0,cols=IRI,op=1,**k):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-20 -20)" opacity="{op}">{bfly_g(cols,**k)}</g>'
def moth_g(c='#dfeee4',edge='#8fb7a0'):
    """Мотылёк-«лунник»: бледно-зелёные крылья с длинными хвостиками, без ярких красок."""
    up='M20 19C24 10 34 8 37 12C38 17 31 21 21 21z'; lo='M21 22C27 23 31 28 30 33L33 39 28 34C25 31 22 27 21 24z'
    half=f'<path d="{up}" fill="{c}" stroke="{edge}" stroke-width=".9"/><path d="{lo}" fill="{c}" stroke="{edge}" stroke-width=".9"/><circle cx="30" cy="15" r="1.8" fill="none" stroke="{edge}" stroke-width=".8"/>'
    return f'{half}<g transform="translate(40 0) scale(-1 1)">{half}</g><path d="M20 15Q17 10 14 9M20 15Q23 10 26 9" stroke="#f3f6ee" stroke-width=".9" fill="none"/><ellipse cx="20" cy="22" rx="2" ry="6.5" fill="#f3f6ee"/>'
def moth(x,y,s,rot=0,op=1,**k): return f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-20 -20)" opacity="{op}">{moth_g(**k)}</g>'
def scales_pat(i,c='#ffffff',op=.45,s=10):
    return f'<pattern id="{i}" width="{s}" height="{s*.6}" patternUnits="userSpaceOnUse"><path d="M0 {s*.6}A{s/2} {s/2} 0 0 1 {s} {s*.6}M{-s/2} {s*.3}A{s/2} {s/2} 0 0 1 {s/2} {s*.3}M{s/2} {s*.3}A{s/2} {s/2} 0 0 1 {s*1.5} {s*.3}" fill="none" stroke="{c}" stroke-opacity="{op}" stroke-width=".9"/></pattern>'
def header_band(h=112):
    """Шапка — перламутровое крыло: бирюза → сирень → розовый, тонкие чешуйки, низ — волнистый край крыла. Текст тёмный."""
    g=uid('hg'); p=uid('sp'); sc=''.join(f'{"L" if k else "M"}{x} {h-6}Q{x+11} {h+4} {x+22} {h-6}' for k,x in enumerate(range(0,W+22,22)))
    sc='M0 0'+sc.replace('M0','L0',1)+f'L{W} 0z'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{h+6}"><defs><linearGradient id="{g}" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#cdeef0"/><stop offset=".5" stop-color="#e2dbf7"/><stop offset="1" stop-color="#f8dde9"/></linearGradient>{scales_pat(p)}</defs>'
            f'<path d="{sc}" fill="url(#{g})"/><path d="{sc}" fill="url(#{p})"/><path d="{sc[sc.index("L0"):-1].replace("L0","M0",1) if False else ""}" />'
            f'{bfly(206,30,.55,-14,("#7fc8cf","#a996e6","#f0a6c6"),.9,edge="#5b5f8a")}{bfly(232,20,.38,18,("#f0a6c6","#a996e6"),.75,edge="#5b5f8a")}</svg>')
def meadow(y0=690,night=False):
    r=random.Random(3); gr=''
    for _ in range(150):
        x=r.uniform(-5,W+5); hh=r.uniform(20,70); b=r.uniform(-12,12)
        gr+=f'<path d="M{x:.0f} {H}Q{x+b/2:.0f} {H-hh/2:.0f} {x+b:.0f} {H-hh:.0f}" stroke="{"#9cc48a" if not night else "#1f2d2a"}" stroke-width="{r.uniform(1,2.4):.1f}" fill="none" opacity="{r.uniform(.5,.95):.2f}"/>'
    fl=''
    if not night:
        for _ in range(16):
            x=r.uniform(8,W-8); y=r.uniform(H-60,H-18); c=r.choice(['#ffffff','#e7d9fb','#fbe1ec','#fff2b8'])
            fl+=''.join(f'<circle cx="{x+3.2*math.cos(a):.1f}" cy="{y+3.2*math.sin(a):.1f}" r="2.4" fill="{c}"/>' for a in [k*1.2566 for k in range(5)])+f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="#f2c24f"/>'
    return gr+fl
def scene():
    """День: светлое небо над лугом, внизу трава и цветы клевера, порхающие бабочки — только у краёв и под навигацией."""
    g=uid('sk')
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0fb"/><stop offset=".6" stop-color="#f6f1f7"/><stop offset="1" stop-color="#e3f0dc"/></linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#{g})"/>{meadow()}{bfly(30,742,.7,-20,("#8fd3d8","#b9a7ec"))}{bfly(360,720,.5,25,("#f3b4cf","#b9a7ec"))}</svg>'+header_band())
def nightscene():
    """Ночь: тёмно-синий луг, большая луна, вокруг неё кружат бледно-зелёные мотыльки, светлячки в траве."""
    r=random.Random(9); g=uid('ng')
    st=''.join(f'<circle cx="{r.uniform(0,W):.0f}" cy="{r.uniform(0,600):.0f}" r="{r.uniform(.4,1.2):.1f}" fill="#eef0ff" opacity="{r.uniform(.3,.8):.2f}"/>' for _ in range(80))
    ff=''.join(f'<circle cx="{r.uniform(0,W):.0f}" cy="{r.uniform(720,830):.0f}" r="{r.uniform(1,2):.1f}" fill="#e9f7b0" opacity="{r.uniform(.5,.9):.2f}"/>' for _ in range(22))
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><radialGradient id="{g}" cx=".75" cy=".08" r="1"><stop offset="0" stop-color="#2a3156"/><stop offset=".5" stop-color="#141831"/><stop offset="1" stop-color="#0b0d1a"/></radialGradient>'
            f'<radialGradient id="{g}m"><stop offset="0" stop-color="#fffbe9"/><stop offset=".7" stop-color="#f1ecd2"/><stop offset="1" stop-color="#f1ecd2" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#{g})"/>{st}<circle cx="300" cy="78" r="70" fill="#fffbe9" opacity=".08"/><circle cx="300" cy="78" r="40" fill="url(#{g}m)"/>'
            f'{moth(236,70,.9,-25,.9)}{moth(350,120,.7,30,.8)}{moth(60,96,.8,-10,.7)}{moth(120,40,.5,15,.6)}{meadow(700,True)}{ff}</svg>')
def coin(sz=22):
    """Монета «пыльца»: тёплый янтарь, по ободку точки-пыльца, в центре силуэт крыльев. Наш рисунок."""
    g=uid('cg'); dots=''.join(f'<circle cx="{20+15.5*math.cos(a):.1f}" cy="{20+15.5*math.sin(a):.1f}" r=".8" fill="#8a5a14"/>' for a in [i*math.pi/9 for i in range(18)])
    w='M20 20C22 13 28 11 30 14C31 18 26 20 20.5 20.5zM20.5 21.5C25 22 28 25 26 28C24 30 21.5 26 20.5 22z'
    return (f'<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3c9"/><stop offset=".6" stop-color="#f0c766"/><stop offset="1" stop-color="#c58d2a"/></radialGradient></defs>'
            f'<circle cx="20" cy="20" r="18.5" fill="url(#{g})" stroke="#7a4f12" stroke-width="1.2"/>{dots}<path d="{w}" fill="#9a6418"/><g transform="translate(40 0) scale(-1 1)"><path d="{w}" fill="#9a6418"/></g><path d="M20 15V27" stroke="#5e3c0c" stroke-width="1.4" stroke-linecap="round"/></svg>')
def goal(filled,tot=10,w=180,night=False,label=True):
    """Цель дня — «просыпаются бабочки»: 10 штук, 1 минута = 1 бабочка; не прочитано — пустой кокон (контур)."""
    out=''; step=(w-12)/tot
    for k in range(tot):
        x=6+step*(k+.5); y=14
        if k<filled: out+=bfly(x,y,step/34,(-8 if k%2 else 8),(LUNA,'#cfe9f5') if night else IRI,edge='#5b5f8a' if not night else '#8fb7a0',body='#2b2f4f' if not night else '#e9f2ea',ant=False)
        else: out+=f'<ellipse cx="{x:.1f}" cy="{y}" rx="{step*.18:.1f}" ry="{step*.34:.1f}" fill="none" stroke="{"#9a97b4" if not night else "#4c5170"}" stroke-width="1.1"/>'
    t=f'<text x="{w/2}" y="40" text-anchor="middle" font-family="Mulish" font-weight="800" font-size="11" fill="{"#eceef6" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{44 if label else 28}" viewBox="0 0 {w} {44 if label else 28}" style="flex:none">{out}{t}</svg>'
def week(sz=24,on=True,night=False):
    """Неделя — цветок клевера/колокольчика: распустился (день выполнен) или бутон-контур."""
    st='#4f8a3c' if not night else '#6fa36a'
    if on:
        pet=''.join(f'<ellipse cx="{12+5*math.cos(a):.1f}" cy="{10+5*math.sin(a):.1f}" rx="3.6" ry="2.4" transform="rotate({math.degrees(a):.0f} {12+5*math.cos(a):.1f} {10+5*math.sin(a):.1f})" fill="{"#c5b3f1" if not night else "#cbbef5"}" stroke="#5b4f9a" stroke-width=".7"/>' for a in [k*math.pi*2/5-math.pi/2 for k in range(5)])
        return f'<svg width="{sz*.8:.0f}" height="{sz*1.17:.0f}" viewBox="0 0 24 28" style="flex:none"><path d="M12 14V27M12 22Q7 20 6 17" stroke="{st}" stroke-width="1.4" fill="none"/>{pet}<circle cx="12" cy="10" r="2.4" fill="#f2c24f" stroke="#8a5a14" stroke-width=".6"/></svg>'
    c='#6a6f92' if night else '#a29fbd'
    return f'<svg width="{sz*.8:.0f}" height="{sz*1.17:.0f}" viewBox="0 0 24 28" style="flex:none"><path d="M12 15V27" stroke="{c}" stroke-width="1.2" stroke-dasharray="2 2"/><path d="M12 6C8 9 9 14 12 15C15 14 16 9 12 6z" fill="none" stroke="{c}" stroke-width="1.2"/></svg>'
def mascot(sz=96):
    """Маскот «Пыльца» — пушистая круглая бабочка-шелкопряд: кремовое тельце, огромные глаза, перистые усики, перламутровые крылья."""
    g=uid('mw'); fz=''.join(f'<circle cx="{50+22*math.cos(a):.1f}" cy="{58+24*math.sin(a):.1f}" r="5" fill="#fff8ec"/>' for a in [k*math.pi/8 for k in range(16)])
    return f'''<svg class="tc" width="{sz}" height="{sz}" viewBox="0 0 100 100"><defs>{wing_grad(g,("#9fdde1","#c3b4f0","#f6c3d8"))}</defs>
<path d="M44 46C30 18 6 16 6 34C6 50 24 56 40 56z" fill="url(#{g})" stroke="#5b5f8a" stroke-width="1.4"/><path d="M56 46C70 18 94 16 94 34C94 50 76 56 60 56z" fill="url(#{g})" stroke="#5b5f8a" stroke-width="1.4"/>
<path d="M40 62C24 64 16 78 24 86C32 92 40 78 44 68zM60 62C76 64 84 78 76 86C68 92 60 78 56 68z" fill="url(#{g})" stroke="#5b5f8a" stroke-width="1.4"/>
<circle cx="20" cy="32" r="5" fill="#fff" opacity=".8"/><circle cx="80" cy="32" r="5" fill="#fff" opacity=".8"/>
{fz}<ellipse cx="50" cy="58" rx="21" ry="23" fill="#fff8ec" stroke="#cdbfa6" stroke-width="1"/>
<path d="M42 38Q36 22 26 18M58 38Q64 22 74 18" fill="none" stroke="#6b5a3e" stroke-width="1.6"/>{''.join(f'<path d="M{26+i*3} {18+i*3.6}l-4 2M{74-i*3} {18+i*3.6}l4 2" stroke="#6b5a3e" stroke-width="1"/>' for i in range(5))}
<ellipse cx="42" cy="56" rx="6" ry="7" fill="#1d2140"/><ellipse cx="58" cy="56" rx="6" ry="7" fill="#1d2140"/><circle cx="44" cy="53" r="2.2" fill="#fff"/><circle cx="60" cy="53" r="2.2" fill="#fff"/>
<ellipse cx="36" cy="66" rx="4" ry="2.4" fill="#f6b9cf" opacity=".8"/><ellipse cx="64" cy="66" rx="4" ry="2.4" fill="#f6b9cf" opacity=".8"/><path d="M47 68Q50 71 53 68" fill="none" stroke="#1d2140" stroke-width="1.4" stroke-linecap="round"/></svg>'''
def items():
    vase=f'''<svg class="tc" width="56" height="64" viewBox="0 0 56 64"><path d="M20 40H36L38 60Q28 64 18 60z" fill="#d7eef0" stroke="{ACC2}" stroke-width="1.3"/><path d="M28 40V20M24 40Q20 28 14 24M32 40Q36 30 42 26" stroke="#4f8a3c" stroke-width="1.4" fill="none"/>
{''.join(f'<circle cx="{x+3*math.cos(a):.1f}" cy="{y+3*math.sin(a):.1f}" r="2.6" fill="{c}"/>' for x,y,c in ((28,16,"#c5b3f1"),(14,22,"#f3b4cf"),(42,24,"#fff2b8")) for a in [k*1.2566 for k in range(5)])}{bfly(44,8,.35,20)}</svg>'''
    hat=f'''<svg class="tc" width="66" height="56" viewBox="0 0 66 56"><ellipse cx="33" cy="42" rx="30" ry="9" fill="#f3e3b8" stroke="#8a6a2c" stroke-width="1.2"/><path d="M17 41Q17 22 33 22Q49 22 49 41z" fill="#f6e9c6" stroke="#8a6a2c" stroke-width="1.2"/><path d="M17 37Q33 42 49 37" stroke="#9fdde1" stroke-width="4" fill="none"/>{''.join(f'<path d="M{x} 30l3 3M{x+3} 30l-3 3" stroke="#c7a866" stroke-width=".6"/>' for x in range(22,46,6))}{bfly(52,30,.35,-20,("#f3b4cf","#b9a7ec"))}</svg>'''
    can=f'''<svg class="tc" width="62" height="56" viewBox="0 0 62 56"><path d="M14 22H40V52H14z" fill="#c5b3f1" stroke="#4f4590" stroke-width="1.3"/><path d="M40 30L56 18L58 21L42 36" fill="#c5b3f1" stroke="#4f4590" stroke-width="1.2"/><path d="M18 22Q27 6 36 22" fill="none" stroke="#4f4590" stroke-width="2"/><path d="M14 44H40" stroke="#f6c3d8" stroke-width="3"/>{''.join(f'<circle cx="{59+k*1.5}" cy="{24+k*4}" r="1" fill="#8fd3d8"/>' for k in range(4))}</svg>'''
    return [vase,hat,can]
def card_deco(w,night=False):
    """Кромка карточки — ряд перламутровых чешуек крыла (вверху, вне текста)."""
    g=uid('cd'); n=int(w//9)
    sc=''.join(f'<path d="M{k*9} 8A4.5 4.5 0 0 1 {k*9+9} 8" fill="none" stroke="url(#{g})" stroke-width="1.6"/>' for k in range(n))
    cols=("#7fc8cf","#a996e6","#f0a6c6") if not night else ("#8fb7a0",LUNA,"#9fa6d8")
    return f'<svg class="abs tc" width="{w}" height="9" viewBox="0 0 {w} 9"><defs><linearGradient id="{g}">{"".join(f"<stop offset=\"{k/2}\" stop-color=\"{c}\"/>" for k,c in enumerate(cols))}</linearGradient></defs>{sc}</svg>'
COVC=[('linear-gradient(160deg,#dff3f4,#e9e2fb)',INK,IRI),('linear-gradient(160deg,#fbe4ee,#f1e9fb)',INK,('#f3b4cf','#c5b3f1')),('#1b2140','#f4f2ff',None),
      ('linear-gradient(160deg,#f4f0e6,#e7f1df)',INK,('#c9dcb8','#e7d9a6')),('linear-gradient(160deg,#e8f6ec,#dff3f4)',INK,('#8fd3d8','#b5e3c4')),('linear-gradient(160deg,#ece6fb,#fbe4ee)',INK,('#a996e6','#f3b4cf','#8fd3d8'))]
def cover(i):
    bg,fg,cols=COVC[i]
    if cols is None: art=f'<svg class="abs" style="left:50%;margin-left:-30px;bottom:6px" width="60" height="52" viewBox="0 0 60 52"><circle cx="44" cy="12" r="8" fill="#f1ecd2"/>{moth(26,30,.95,-8)}</svg>'
    elif i==3: art=f'<svg class="abs" style="left:50%;margin-left:-14px;bottom:8px" width="28" height="44" viewBox="0 0 28 44"><path d="M14 0V8" stroke="#6b5a3e"/><path d="M14 8C4 14 5 34 14 42C23 34 24 14 14 8z" fill="#e7d9a6" stroke="#8a6a2c" stroke-width="1.2"/>{"".join(f"<path d=\"M7 {y}Q14 {y+3} 21 {y}\" stroke=\"#b39a5a\" fill=\"none\" stroke-width=\".8\"/>" for y in (16,22,28,34))}</svg>'
    else: art=f'<svg class="abs" style="left:50%;margin-left:-28px;bottom:4px" width="56" height="56" viewBox="0 0 56 56">{bfly(28,28,1.3,(-10,8,0,0,12,-6)[i],cols)}</svg>'
    return bg,fg,art
def hero():
    return f'<svg class="tc" width="96" height="78" viewBox="0 0 96 78"><circle cx="48" cy="38" r="34" fill="#fffbe9" opacity=".12"/><circle cx="48" cy="38" r="24" fill="#f1ecd2" opacity=".25"/>{moth(48,38,1.9,0)}</svg>'
FF='''<style>@font-face{font-family:"Poiret One";src:url("fonts/PoiretOne-Regular.ttf")}@font-face{font-family:"Mulish";font-weight:200 1000;src:url("fonts/Mulish-VariableFont_wght.ttf")}
@font-face{font-family:"Bellota Text";font-weight:700;src:url("fonts/BellotaText-Bold.ttf")}@font-face{font-family:"IBM Plex Serif";font-weight:400;src:url("fonts/IBMPlexSerif-Regular.ttf")}@font-face{font-family:"IBM Plex Serif";font-weight:600;src:url("fonts/IBMPlexSerif-SemiBold.ttf")}</style>'''
S=dict(P='babochkovyi',NAME='Бабочковый',FONTFACE=FF.replace('<style>','').replace('</style>',''),
 F=dict(disp='"Poiret One",sans-serif',dispw=400,h1=34,h1ls=1,ui='"Mulish",sans-serif',num='"Bellota Text",sans-serif',numw=700,read='"IBM Plex Serif",serif',btn='"Mulish",sans-serif',btnw=800,btns=19,shs=27),
 INK=INK,T2=T2,BG='#f4f2f8',SURF='#ffffff',ACC=ACC,ACC2=ACC2,ON='#ffffff',ACC_T=ACC,COIN_T=COIN_T,SUCC=SUCC,LINE='#d3cfe6',LINE2='#8e8aa8',BAR_BG='#eeedf5',HDR_FG=INK,
 SEC_FG=INK,SEC_FG2=T2,SHELF='linear-gradient(90deg,#cdeef0,#e2dbf7,#f8dde9)',R=18,RS=14,CV_R='12px',
 CARD_SH='0 0 0 1px #ddd7ef,0 6px 18px rgba(60,50,110,.10)',BK_SH='0 0 0 1px #ddd7ef,0 4px 12px rgba(60,50,110,.08)',TCX=14,TCY=6,
 RD_BG='#fcfbf8',RD_PANEL='#f3f1f8',RD_LINE='#d9d5e6',N_RD_BG='#0e1019',N_PANEL='#181b28',N_LINE='#2e3247',N_TEXT='#eceef6',N_BOOK='#e4e6ef',N_ACC=LUNA,
 SM=dict(bg='#171a2a',st='#20243a',line='#33385a',fg='#eceef6',t2='#b9bdd4',acc=LUNA,on='#0e1019',coin='#f2d38a',edge='#5d6390'),
 CURR='монет',TREAS='Цветник',TREAS_TO='в цветник',GOAL_DONE='Все бабочки проснулись',
 BOOK='Сад на краю луга',CHAP='Глава 7. Первый полёт',
 TXT=('Утром Вера вышла к лугу раньше, чем высохла роса, и села на тёплый камень у старой изгороди. '
      'Над клевером поднимались лёгкие крылья, и каждое казалось ей маленьким окном в другой цвет: то в бирюзу, то в сирень, то в розовый, которого нет ни в одной краске. '
      'Одна бабочка опустилась на страницу её книги и долго не улетала, будто тоже хотела узнать, чем кончится глава. '),
 COV=[('Сад на краю луга','Л. Мотылькова','EPUB','53%'),('Крылья из пыльцы','А. Шелкова','FB2','12%'),('Лунный мотылёк','Е. Ночная','TXT','прочитано'),
      ('Куколка','В. Перова','PDF','не начата'),('Ветер над клевером','Н. Луговая','EPUB','4%'),('Тысяча чешуек','М. Радужная','PDF','67%')],
 SW=[('Чернила','#1d2140','текст'),('Утро','#f4f2f8','фон'),('Белый','#ffffff','карточки'),('Перламутр','#f3f1f8','панели'),
     ('Сумерки','#4f5470','вторичный текст'),('Морфо','#13646c','акцент'),('Морфо тёмн.','#0d4c53','нажатие'),('Клевер','#3d6a2c','неделя, успех'),
     ('Бирюза крыла','#8fd3d8','только декор'),('Сирень крыла','#b9a7ec','только декор'),('Пыльца','#84480c','суммы монет'),('Страница','#fcfbf8','книга день'),
     ('Ночной луг','#0e1019','фон ночи'),('Ночь: панель','#181b28','поверхность'),('Лунник','#b5e3c4','акцент ночи'),('Ночь: текст','#e4e6ef','книга ночью')],
 FONTLINES='<div class="H" style="font-size:24px">Poiret One — заголовки</div><div class="num" style="font-size:19px">Bellota Text — 18 мин · +180</div><div>Mulish — интерфейс</div><div style="font-family:\'IBM Plex Serif\';font-size:15px">IBM Plex Serif — текст книги</div>',
 CSS='.q .ds{white-space:nowrap!important;font-size:12.5px!important}.sec .sh{line-height:1.1}.cv .ct{font-family:"Mulish";font-weight:800;font-size:13.5px}',PK_LIB='right:8px;bottom:92px',PK_REW='right:20px;top:120px',
 OV_BG='#1b2140',OV_FG='#f4f2ff',OV_FG2='#c9cbe6',OV_FONT='PoiretOne-Regular.ttf',OV_FONT2='BellotaText-Bold.ttf')
A=types.SimpleNamespace(scene=scene,nightscene=nightscene,coin=coin,goal=goal,week=week,mascot=mascot,items=items,card_deco=card_deco,cover=cover,hero=hero)
if __name__=='__main__': build(S,A,D)
