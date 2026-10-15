# ReadQuest · скин «Бамбуковый» (тихая роща: рисовая бумага, мазки туши, зелёные стебли; ночью — луна над рощей и фонарик) — генератор макетов. Запуск: python3 gen_bambuk.py
# Все рисунки наши: стебли и листья из кривых, монета с листом бамбука (без иероглифов), маскот — лягушонок «Росинка». Красных печатей нет.
import os,math,random,types
from rqkit import build,uid,W,H
D=os.path.dirname(os.path.abspath(__file__))
INK='#1b1d18'; T2='#4c5245'; ACC='#2f5d3a'; ACC2='#22462b'; COIN_T='#7a4e12'; SUCC='#2d4a6b'
STALK=('#7fa86a','#5f8a4e','#a9c58f'); LANT='#e7b964'
def stalk(x,y0,y1,w=9,c='#7fa86a',dark='#4e7440',op=1,nodes=None):
    """Стебель бамбука: колено к колену, тёмные узлы-перетяжки."""
    out=f'<g opacity="{op}"><rect x="{x-w/2:.1f}" y="{y0}" width="{w}" height="{y1-y0}" fill="{c}"/><rect x="{x-w/2+1.5:.1f}" y="{y0}" width="{w*.22:.1f}" height="{y1-y0}" fill="#ffffff" opacity=".25"/>'
    yy=y0+(nodes or 70)/2
    while yy<y1:
        out+=f'<path d="M{x-w/2-1:.1f} {yy:.0f}h{w+2}" stroke="{dark}" stroke-width="2.2"/><path d="M{x-w/2:.1f} {yy+3:.0f}h{w}" stroke="{dark}" stroke-width=".7" opacity=".6"/>'; yy+=nodes or 70
    return out+'</g>'
def leaf(x,y,ang,l=26,c='#5f8a4e',op=1):
    return f'<path transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f})" d="M0 0C{l*.3:.1f} -{l*.14:.1f} {l*.7:.1f} -{l*.12:.1f} {l} 0C{l*.7:.1f} {l*.1:.1f} {l*.3:.1f} {l*.12:.1f} 0 0z" fill="{c}" opacity="{op}"/>'
def brush(x,y,w,h=6,c=INK,op=.85,seed=1):
    """Мазок туши: утолщение в начале, сухая кисть к концу."""
    r=random.Random(seed); out=f'<path d="M{x} {y}C{x+w*.2:.0f} {y-h*.7:.1f} {x+w*.7:.0f} {y-h*.5:.1f} {x+w} {y-h*.1:.1f}C{x+w*.7:.0f} {y+h*.15:.1f} {x+w*.3:.0f} {y+h*.4:.1f} {x} {y}z" fill="{c}" opacity="{op}"/>'
    for k in range(5): out+=f'<path d="M{x+w*.55:.0f} {y-h*.3+k*h*.12:.1f}L{x+w*(.85+r.uniform(0,.12)):.0f} {y-h*.3+k*h*.1:.1f}" stroke="{c}" stroke-width=".6" opacity="{op*.6:.2f}"/>'
    return out
def fibres(seed=4,n=70,c='#d9d0b6'):
    r=random.Random(seed); return ''.join(f'<path d="M{(x:=r.uniform(0,W)):.0f} {(y:=r.uniform(0,H)):.0f}q{r.uniform(-8,8):.0f} {r.uniform(-4,4):.0f} {r.uniform(-20,20):.0f} {r.uniform(-6,6):.0f}" stroke="{c}" stroke-width=".6" fill="none" opacity="{r.uniform(.4,.9):.2f}"/>' for _ in range(n))
def header_band(h=112):
    """Шапка — светлая нефритовая заливка тушью (вверху), снизу один широкий мазок. Стебли — только у правого края (x ≥ 376) и листья выше y=40."""
    g=uid('hb')
    st=stalk(384,0,h-10,8,'#7fa86a','#4e7440',1,48)+leaf(380,26,200,30)+leaf(380,30,160,24,'#7fa86a')+leaf(384,12,215,22,'#4e7440')
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{h+6}"><defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7e3c8"/><stop offset="1" stop-color="#d7e3c8" stop-opacity="0"/></linearGradient></defs>'
            f'<rect width="{W}" height="{h}" fill="url(#{g})"/>{st}{brush(20,h-4,230,7,ACC,.55,3)}</svg>')
def grove(night=False):
    """Роща внизу фона (под навигацией и у краёв): несколько стеблей разной глубины, дымка туши."""
    r=random.Random(7); out=''
    cols=[('#c9d8b8','#9fb58c',.9),('#a9c58f','#6f9658',1),('#7fa86a','#4e7440',1)] if not night else [('#1d2a1f','#141d16',1),('#26372a','#18241b',1),('#2f4433','#1c2b20',1)]
    for depth,(c,d,op) in enumerate(cols):
        for x in ([6,30,352,372] if depth<2 else [16,364]):
            x+=r.uniform(-6,6); top=r.uniform(600,700)-depth*20
            out+=stalk(x,top,H,6+depth*2.5,c,d,op,60+depth*8)
            for k in range(3): out+=leaf(x,top+10+k*24,r.choice([200,160,215,-20,20]),20+depth*4,d,op)
    return out
def scene():
    """День: рисовая бумага с волокнами, внизу дальние горы размывом туши и роща по краям."""
    mt=f'<path d="M0 760Q60 700 120 735T250 715T390 745V844H0z" fill="#c8ccbd" opacity=".55"/><path d="M0 790Q90 745 170 775T390 770V844H0z" fill="#aeb6a2" opacity=".5"/>'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#f2eee2"/>{fibres()}{mt}{grove()}</svg>'+header_band())
def nightscene():
    """Ночь: тушь, бледная луна за рощей, бумажный фонарик слева, светлячки."""
    r=random.Random(9)
    ff=''.join(f'<circle cx="{r.uniform(0,W):.0f}" cy="{r.uniform(620,830):.0f}" r="{r.uniform(1,2):.1f}" fill="#f1e3a0" opacity="{r.uniform(.4,.9):.2f}"/>' for _ in range(18))
    g=uid('nm')
    lan=f'<g transform="translate(46 70)"><path d="M0 -40V-14" stroke="#4e5a46" stroke-width="1.2"/><ellipse cx="0" cy="8" rx="18" ry="24" fill="#3b2f18"/><ellipse cx="0" cy="8" rx="15" ry="21" fill="{LANT}" opacity=".9"/>{"".join(f"<path d=\"M-15 {y}Q0 {y+3} 15 {y}\" stroke=\"#8a6a2c\" stroke-width=\".7\" fill=\"none\"/>" for y in (-4,4,12,20))}<rect x="-7" y="-17" width="14" height="4" fill="#2a2a20"/><rect x="-7" y="29" width="14" height="4" fill="#2a2a20"/></g>'
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><radialGradient id="{g}" cx=".7" cy=".1" r="1"><stop offset="0" stop-color="#25301f"/><stop offset=".55" stop-color="#121710"/><stop offset="1" stop-color="#0b0d0a"/></radialGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#{g})"/><circle cx="292" cy="82" r="44" fill="#ece6cf" opacity=".9"/><circle cx="292" cy="82" r="62" fill="#ece6cf" opacity=".07"/>'
            f'{stalk(340,0,H,7,"#24331f","#18231a",1,64)}{leaf(338,120,200,30,"#24331f")}{leaf(342,150,-20,26,"#24331f")}{lan}{grove(True)}{ff}</svg>')
def coin(sz=22):
    """Монета — бронза с патиной, квадратное окошко, на поле лист бамбука. Без надписей и иероглифов."""
    g=uid('cg')
    return (f'<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f3dfa6"/><stop offset=".6" stop-color="#cfa654"/><stop offset="1" stop-color="#8f6a26"/></radialGradient></defs>'
            f'<circle cx="20" cy="20" r="18.5" fill="url(#{g})" stroke="#5e4413" stroke-width="1.2"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#7a5a1c" stroke-width=".8"/><rect x="16" y="16" width="8" height="8" fill="#f2eee2" stroke="#5e4413" stroke-width="1"/>'
            f'{leaf(9,31,-50,12,"#4e6b38")}{leaf(31,9,130,12,"#4e6b38")}</svg>')
def goal(filled,tot=10,w=180,night=False,label=True):
    """Цель дня — растущий стебель: 10 колен, 1 минута = 1 колено. Не прочитано — пустое колено (контур)."""
    seg=(w-14)/tot; out=''
    for k in range(tot):
        x=4+k*seg
        if k<filled: out+=f'<rect x="{x:.1f}" y="9" width="{seg-2:.1f}" height="9" rx="1.5" fill="{"#6f9658" if not night else "#7fae6c"}"/><rect x="{x+1:.1f}" y="10" width="{seg-4:.1f}" height="2" fill="#fff" opacity=".3"/><path d="M{x+seg-2:.1f} 7.5v12" stroke="{"#2f5d3a" if not night else "#cfe3b8"}" stroke-width="2"/>'
        else: out+=f'<rect x="{x+.5:.1f}" y="9.5" width="{seg-3:.1f}" height="8" rx="1.5" fill="none" stroke="{"#a8a18a" if not night else "#4a5444"}" stroke-width="1" stroke-dasharray="2 1.5"/>'
    if filled: out+=leaf(4+filled*seg,9,-35,14,"#4e7440" if not night else "#8fbf7a")
    t=f'<text x="{w/2}" y="38" text-anchor="middle" font-family="Golos Text" font-weight="700" font-size="11" fill="{"#eef0e6" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{42 if label else 26}" viewBox="0 0 {w} {42 if label else 26}" style="flex:none">{out}{t}</svg>'
def week(sz=24,on=True,night=False):
    """Неделя — круг кистью (энсо). День выполнен — круг замкнут и внутри лист; нет — пунктир."""
    c='#1b1d18' if not night else '#e9ecdf'; sz=round(sz*.8)
    if on: return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><path d="M18.5 6A9 9 0 1 0 20.5 13" fill="none" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>{leaf(7,15,-40,11,"#5f8a4e" if not night else "#8fbf7a")}</svg>'
    c2='#a8a18a' if not night else '#4a5444'
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" style="flex:none"><circle cx="12" cy="12" r="8.5" fill="none" stroke="{c2}" stroke-width="1.2" stroke-dasharray="2.5 2"/></svg>'
def mascot(sz=96):
    """Маскот «Росинка» — круглый лягушонок цвета молодого бамбука, сидит на листе; на голове капля росы."""
    return f'''<svg class="tc" width="{sz}" height="{sz}" viewBox="0 0 100 100">{leaf(4,86,-6,92,"#4e7440")}<path d="M10 85Q50 80 92 76" stroke="#2f5d3a" stroke-width="1" fill="none"/>
<ellipse cx="50" cy="62" rx="30" ry="22" fill="#9cc47e" stroke="#2f5d3a" stroke-width="1.6"/><ellipse cx="50" cy="68" rx="18" ry="12" fill="#eaf0cf"/>
<circle cx="36" cy="40" r="11" fill="#9cc47e" stroke="#2f5d3a" stroke-width="1.6"/><circle cx="64" cy="40" r="11" fill="#9cc47e" stroke="#2f5d3a" stroke-width="1.6"/>
<circle cx="36" cy="40" r="6.5" fill="#fff"/><circle cx="64" cy="40" r="6.5" fill="#fff"/><circle cx="37" cy="41" r="3.8" fill="{INK}"/><circle cx="63" cy="41" r="3.8" fill="{INK}"/><circle cx="38.4" cy="39.4" r="1.3" fill="#fff"/><circle cx="64.4" cy="39.4" r="1.3" fill="#fff"/>
<path d="M42 60Q50 66 58 60" fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="32" cy="58" rx="4" ry="2.2" fill="#e9b7a0" opacity=".7"/><ellipse cx="68" cy="58" rx="4" ry="2.2" fill="#e9b7a0" opacity=".7"/>
<path d="M26 80Q20 84 24 86M74 80Q80 84 76 86" stroke="#2f5d3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M50 18C46 24 46 28 50 29C54 28 54 24 50 18z" fill="#cfe7ef" stroke="#5f8aa0" stroke-width="1"/></svg>'''
def items():
    bowl=f'''<svg class="tc" width="62" height="58" viewBox="0 0 62 58"><path d="M24 22Q20 14 26 8M32 22Q28 13 34 6M40 22Q36 15 41 9" fill="none" stroke="#a8a18a" stroke-width="1.3" stroke-linecap="round"/><path d="M8 28H54Q52 50 31 52Q10 50 8 28z" fill="#e4ead6" stroke="{INK}" stroke-width="1.4"/><path d="M10 34Q31 40 52 34" stroke="#5f8a4e" stroke-width="3" fill="none"/><path d="M22 52H40L38 56H24z" fill="#cfc8b3" stroke="{INK}" stroke-width="1"/></svg>'''
    lan=f'''<svg class="tc" width="44" height="66" viewBox="0 0 44 66"><path d="M22 0V10" stroke="#4e5a46" stroke-width="1.3"/><rect x="13" y="8" width="18" height="5" fill="#2a2a20"/><ellipse cx="22" cy="34" rx="19" ry="22" fill="#f6edd2" stroke="#8a7a50" stroke-width="1.3"/>{"".join(f"<path d=\"M4 {y}Q22 {y+4} 40 {y}\" stroke=\"#c9b98a\" stroke-width=\".8\" fill=\"none\"/>" for y in (24,32,40,48))}{leaf(12,36,-30,16,"#5f8a4e")}<rect x="13" y="55" width="18" height="5" fill="#2a2a20"/></svg>'''
    scr=f'''<svg class="tc" width="66" height="56" viewBox="0 0 66 56"><rect x="8" y="10" width="50" height="36" fill="#faf6ea" stroke="#8a8470" stroke-width="1.1"/><rect x="4" y="6" width="58" height="5" rx="2.5" fill="#5f8a4e"/><rect x="4" y="45" width="58" height="5" rx="2.5" fill="#5f8a4e"/>
<path d="M14 40Q24 22 34 32T54 20" fill="none" stroke="#b5b8a8" stroke-width="2"/>{stalk(20,16,40,3,"#7fa86a","#4e7440",1,9)}{leaf(21,20,-30,12)}{brush(30,38,22,3,INK,.7,2)}</svg>'''
    return [bowl,lan,scr]
def card_deco(w,night=False):
    """Кромка карточки — тонкий мазок туши слева и лист бамбука (вверху, вне текста)."""
    c=INK if not night else '#cfd6c2'
    return f'<svg class="abs tc" width="{w}" height="9" viewBox="0 0 {w} 9">{brush(0,5,96,5,c,.75,5)}{leaf(102,5,-10,16,"#5f8a4e" if not night else "#8fbf7a")}</svg>'
def cover(i):
    """Обложки — тушь на рисовой бумаге (наши сюжеты): горы, роща, луна и лодка, ветка сосны, волны, журавль-силуэт."""
    paper='linear-gradient(180deg,#faf6ea,#efe8d4)'
    arts=[f'<path d="M0 48L14 26 22 36 34 14 50 40 60 30V60H0z" fill="#8f9585" opacity=".7"/><path d="M0 56L20 40 36 50 60 38V60H0z" fill="#4c5245" opacity=".8"/>',
          stalk(18,8,60,5,'#5f8a4e','#2f5d3a',1,16)+stalk(32,0,60,6,'#7fa86a','#2f5d3a',1,18)+stalk(44,14,60,4,'#a9c58f','#4e7440',1,14)+leaf(32,18,200,16)+leaf(44,24,-20,14),
          f'<circle cx="40" cy="16" r="10" fill="#e9dfbf" stroke="#8a8470" stroke-width=".8"/><path d="M10 44Q30 40 50 44" stroke="#4c5245" stroke-width="1.2" fill="none"/><path d="M20 40H40L36 44H24z" fill="{INK}"/><path d="M30 40V28L38 38z" fill="#4c5245"/>',
          f'<path d="M4 20Q30 26 58 14" stroke="#3b3a2e" stroke-width="2.4" fill="none"/>'+''.join(f'<path d="M{cx} {cy}l{9*math.cos(a):.1f} {9*math.sin(a):.1f}" stroke="#2f5d3a" stroke-width="1.1" stroke-linecap="round"/>' for cx,cy in ((16,22),(30,22),(44,18),(54,15)) for a in [math.radians(d) for d in (-150,-120,-90,-60,-30,200,230,250)]),
          ''.join(f'<path d="M0 {y}Q10 {y-8} 20 {y}T40 {y}T60 {y}" fill="none" stroke="#2d4a6b" stroke-width="1.6" opacity="{o}"/>' for y,o in ((30,.5),(40,.75),(50,1))),
          f'<path d="M8 40Q24 24 36 30Q46 20 58 22Q46 26 42 34Q34 44 20 42z" fill="{INK}"/><path d="M36 30L40 52M40 32L44 52" stroke="{INK}" stroke-width="1"/><circle cx="54" cy="23" r="1.6" fill="#f2eee2"/>']
    bgs=[paper,'linear-gradient(180deg,#eef3e4,#dfe9d0)',ACC,paper,'linear-gradient(180deg,#eef1f2,#dfe6e8)',paper]
    fg='#ffffff' if i==2 else INK
    art=f'<svg class="abs" style="left:50%;margin-left:-30px;bottom:6px" width="60" height="60" viewBox="0 0 60 60">{arts[i]}</svg>'
    return bgs[i],fg,art
def hero():
    return f'<svg class="tc" width="88" height="74" viewBox="0 0 88 74"><circle cx="44" cy="38" r="30" fill="#ece6cf" opacity=".9"/>{stalk(22,0,74,7,"#2f4433","#1c2b20",1,24)}{stalk(66,6,74,6,"#2f4433","#1c2b20",1,22)}{leaf(22,22,-25,22,"#2f4433")}{leaf(66,30,200,20,"#2f4433")}{brush(28,60,34,4,"#1c2b20",.9,4)}</svg>'
FF='''@font-face{font-family:"Kurale";src:url("fonts/Kurale-Regular.ttf")}@font-face{font-family:"Golos Text";font-weight:400 900;src:url("fonts/GolosText-VariableFont_wght.ttf")}
@font-face{font-family:"Geologica";font-weight:100 900;src:url("fonts/Geologica-VariableFont.ttf")}@font-face{font-family:"Roboto Serif";font-weight:100 900;src:url("fonts/RobotoSerif-VariableFont.ttf")}'''
S=dict(P='bambukovyi',NAME='Бамбуковый',FONTFACE=FF,
 F=dict(disp='"Kurale",serif',dispw=400,h1=31,h1ls=.3,ui='"Golos Text",sans-serif',num='"Geologica",sans-serif',numw=600,read='"Roboto Serif",serif',btn='"Kurale",serif',btnw=400,btns=22,shs=23,cts=14.5),
 INK=INK,T2=T2,BG='#f2eee2',SURF='#fbf8ef',ACC=ACC,ACC2=ACC2,ON='#ffffff',ACC_T=ACC,COIN_T=COIN_T,SUCC=SUCC,LINE='#cfc8b3',LINE2='#8a8470',BAR_BG='#ebe6d6',HDR_FG=INK,
 SEC_FG=INK,SEC_FG2=T2,SHELF='#6f9658',R=4,RS=4,CV_R='2px',
 CARD_SH='0 0 0 1px #d6cfb9,0 3px 10px rgba(40,40,20,.10)',BK_SH='0 0 0 1px #d6cfb9,0 2px 6px rgba(40,40,20,.08)',TCX=14,TCY=6,
 RD_BG='#f8f5ec',RD_PANEL='#efeadc',RD_LINE='#d6cfb9',N_RD_BG='#0f120f',N_PANEL='#191d18',N_LINE='#2c322a',N_TEXT='#e9ecdf',N_BOOK='#e2e5d8',N_ACC=LANT,
 SM=dict(bg='#171b16',st='#20261f',line='#34402f',fg='#eef0e6',t2='#b8c0ad',acc=LANT,on='#0f120f',coin='#f1e3b0',edge='#4d5e47'),
 CURR='монет',TREAS='Чайный домик',TREAS_TO='в чайный домик',GOAL_DONE='Стебель вырос',
 BOOK='Тихая роща',CHAP='Глава 7. Голос ветра',
 TXT=('Мастер Ли растирал тушь так медленно, что успевал услышать, как в роще за домом переговариваются стебли. '
      'Он говорил ученикам: прежде чем провести линию, дождись, пока ветер закончит фразу. '
      'Мэй не понимала этого целый год, а потом однажды утром положила кисть и просто слушала, и бумага перед ней так и осталась чистой, но она впервые не огорчилась. '),
 COV=[('Тихая роща','М. Тушина','EPUB','53%'),('Сто колен','А. Стеблев','FB2','12%'),('Лодка и луна','Е. Ночная','TXT','прочитано'),
      ('Ветка сосны','В. Хвоев','PDF','не начата'),('Река без имени','Н. Волнова','EPUB','4%'),('Белый журавль','С. Перова','PDF','67%')],
 SW=[('Тушь','#1b1d18','текст'),('Рисовая бумага','#f2eee2','фон'),('Светлая бумага','#fbf8ef','карточки'),('Бумага панели','#efeadc','панели'),
     ('Серая тушь','#4c5245','вторичный текст'),('Бамбук','#2f5d3a','акцент'),('Бамбук тёмн.','#22462b','нажатие'),('Речная тушь','#2d4a6b','неделя, успех'),
     ('Молодой стебель','#7fa86a','только декор'),('Дальние горы','#aeb6a2','только декор'),('Бронза','#7a4e12','суммы монет'),('Страница','#f8f5ec','книга день'),
     ('Ночная тушь','#0f120f','фон ночи'),('Ночь: панель','#191d18','поверхность'),('Фонарик','#e7b964','акцент ночи'),('Ночь: текст','#e2e5d8','книга ночью')],
 FONTLINES='<div class="H" style="font-size:22px">Kurale — заголовки, кнопка</div><div class="num" style="font-size:19px">Geologica — 18 мин · +180</div><div>Golos Text — интерфейс</div><div style="font-family:\'Roboto Serif\';font-size:15px">Roboto Serif — текст книги</div>',
 CSS='.q .ds,.q .tt{white-space:nowrap!important}.q .tt{font-size:15px!important}.sec .sh{line-height:1.15}.cv .ct{font-size:14.5px}',PK_LIB='right:22px;bottom:90px',PK_REW='right:20px;top:118px',
 OV_BG='#1b1d18',OV_FG='#f2eee2',OV_FG2='#cfd6c2',OV_FONT='Kurale-Regular.ttf',OV_FONT2='Kurale-Regular.ttf')
A=types.SimpleNamespace(scene=scene,nightscene=nightscene,coin=coin,goal=goal,week=week,mascot=mascot,items=items,card_deco=card_deco,cover=cover,hero=hero)
if __name__=='__main__': build(S,A,D)
