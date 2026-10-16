# ReadQuest · скин «Деревенский» (уютная изба: тёплое дерево, лён, вышивка крестиком, резной наличник; ночью — печь и окно с луной) — генератор макетов. Запуск: python3 gen_derevnya.py
# Все рисунки наши: доски, наличник, вышивка, печь, кот «Уголёк», монета с колосом. Красная вышивка — только в самой верхней полосе шапки (y ≤ 18), далеко от текста.
import os,math,random,types
from rqkit import build,uid,W,H
D=os.path.dirname(os.path.abspath(__file__))
INK='#23180f'; T2='#5a4634'; ACC='#2c4a8a'; ACC2='#1f3768'; COIN_T='#7a3f12'; SUCC='#45622a'
LINEN='#fbf5e9'; OCHRE='#c98a2e'; THREAD_R='#b23a2a'; MILK='#f2d2a9'
def xst(x,y,s,c,w=1.3): return f'<path d="M{x} {y}l{s} {s}M{x+s} {y}l{-s} {s}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def stitch_row(w,y,s,cols,pat):
    """Вышивка крестиком: pat — строка из символов, каждый символ = клетка (0 — пусто, 1.. — цвет)."""
    out=''; n=int(w//s)
    for k in range(n):
        ch=pat[k%len(pat)]
        if ch!='0': out+=xst(k*s+.5,y,s-1,cols[int(ch)-1])
    return out
def planks(night=False,seed=2):
    """Доски: горизонтальные, с волокнами и сучками."""
    r=random.Random(seed); out=''; y=0
    base=['#e7d1ad','#e2c9a2','#ead7b6','#dfc59c'] if not night else ['#2a1e14','#261b12','#2d2016','#231910']
    gc='#c7a77a' if not night else '#3a2a1c'
    while y<H:
        h=r.choice([58,64,70]); out+=f'<rect x="0" y="{y}" width="{W}" height="{h}" fill="{r.choice(base)}"/><path d="M0 {y+h-.5}H{W}" stroke="{"#b8946a" if not night else "#1a120b"}" stroke-width="1.4"/>'
        for _ in range(4):
            yy=y+r.uniform(6,h-6); out+=f'<path d="M0 {yy:.0f}C{W*.3:.0f} {yy+r.uniform(-4,4):.0f} {W*.6:.0f} {yy+r.uniform(-4,4):.0f} {W} {yy+r.uniform(-3,3):.0f}" stroke="{gc}" stroke-width=".7" fill="none" opacity=".7"/>'
        if r.random()<.5:
            kx=r.uniform(20,W-20); ky=y+h/2; out+=f'<ellipse cx="{kx:.0f}" cy="{ky:.0f}" rx="7" ry="3.5" fill="none" stroke="{gc}" stroke-width="1"/><ellipse cx="{kx:.0f}" cy="{ky:.0f}" rx="2.5" ry="1.4" fill="{gc}"/>'
        y+=h
    return out
def header_band(h=112):
    """Шапка — крашеная синяя доска наличника: сверху полоса красно-охристой вышивки (y 4–16), снизу резное кружево (полукруги с дырочками). Заголовок — светлый лён."""
    sc=f'M0 0H{W}V{h-10}'+''.join(f'Q{x-9} {h+4} {x-18} {h-10}' for x in range(W,-18,-18))+'z'
    holes=''.join(f'<circle cx="{x-9}" cy="{h-3}" r="1.8" fill="#e7d1ad"/>' for x in range(W,0,-18))
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{h+8}"><path d="{sc}" fill="{ACC}"/>{holes}'
            f'<rect x="0" y="0" width="{W}" height="22" fill="{LINEN}"/>{stitch_row(W,5,6,(THREAD_R,OCHRE,ACC),"1102011020")}{stitch_row(W,11,6,(THREAD_R,OCHRE),"0110001100")}'
            f'<path d="M0 22H{W}" stroke="#1f3768" stroke-width="2"/><path d="M0 {h-16}H{W}" stroke="#ffffff" stroke-opacity=".35" stroke-dasharray="2 4"/></svg>')
def scene():
    """День: тёплые доски стены; внизу лавка с вязаным половиком — под навигацией."""
    rug=''.join(f'<rect x="0" y="{780+k*8}" width="{W}" height="8" fill="{c}"/>' for k,c in enumerate(['#c9b18a','#7d98c9','#e9dcc3','#c98a2e','#e9dcc3','#7d98c9','#c9b18a','#e9dcc3']))
    return f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}">{planks()}{rug}</svg>'+header_band()
def nightscene():
    """Ночь в избе: тёмные доски, слева внизу печь с тёплым устьем, вверху окно с луной и инеем, рядом спит кот."""
    r=random.Random(5); g=uid('gl')
    win=(f'<g transform="translate(250 20)"><rect x="0" y="0" width="120" height="110" fill="#0e1428"/><circle cx="82" cy="34" r="16" fill="#efe6c8"/>'
         +''.join(f'<circle cx="{r.uniform(4,116):.0f}" cy="{r.uniform(4,106):.0f}" r=".9" fill="#dfe6ff" opacity=".7"/>' for _ in range(14))
         +f'<path d="M60 0V110M0 55H120" stroke="#5a4029" stroke-width="5"/><rect x="0" y="0" width="120" height="110" fill="none" stroke="#5a4029" stroke-width="7"/>'
         +f'<path d="M-10 -6H130L120 4H0z" fill="#3a5a9a"/><path d="M-10 118H130L122 126H-2z" fill="#3a5a9a"/></g>')
    stove=(f'<g transform="translate(-10 640)"><rect x="0" y="0" width="170" height="210" fill="#e8e0d0"/><rect x="0" y="0" width="170" height="210" fill="#000" opacity=".55"/>'
           +''.join(f'<path d="M0 {y}H170" stroke="#000" stroke-opacity=".25"/>' for y in range(20,210,22))
           +f'<path d="M40 120Q85 70 130 120V180H40z" fill="#1a0f08"/><path d="M48 180Q85 120 122 180z" fill="url(#{g})"/></g>')
    return (f'<svg class="abs" style="left:0;top:0" width="{W}" height="{H}"><defs><radialGradient id="{g}" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#f6c76a"/><stop offset=".5" stop-color="#d9772e"/><stop offset="1" stop-color="#5a2a10"/></radialGradient>'
            f'<radialGradient id="{g}b" cx=".2" cy=".95" r=".7"><stop offset="0" stop-color="#e08a3a" stop-opacity=".35"/><stop offset="1" stop-color="#e08a3a" stop-opacity="0"/></radialGradient></defs>'
            f'{planks(True)}<rect width="{W}" height="{H}" fill="url(#{g}b)"/>{win}{stove}<g transform="translate(300 790) scale(.5)">{cat_body(True)}</g></svg>')
def coin(sz=22):
    """Медная монета с колосом — наш рисунок."""
    g=uid('cg'); grains=''.join(f'<ellipse cx="{20+(2.4 if k%2 else -2.4)}" cy="{11+k*2.4:.1f}" rx="2" ry="1.2" transform="rotate({35 if k%2 else -35} {20+(2.4 if k%2 else -2.4)} {11+k*2.4:.1f})" fill="#7a3f12"/>' for k in range(7))
    return (f'<svg width="{sz}" height="{sz}" viewBox="0 0 40 40" style="flex:none"><defs><radialGradient id="{g}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f6d3a3"/><stop offset=".6" stop-color="#d48c4a"/><stop offset="1" stop-color="#9a5524"/></radialGradient></defs>'
            f'<circle cx="20" cy="20" r="18.5" fill="url(#{g})" stroke="#5e2f0e" stroke-width="1.2"/><circle cx="20" cy="20" r="15" fill="none" stroke="#7a3f12" stroke-width=".7" stroke-dasharray="1.5 1.5"/><path d="M20 12V32" stroke="#5e2f0e" stroke-width="1.2"/>{grains}</svg>')
def goal(filled,tot=10,w=180,night=False,label=True):
    """Цель дня — «вышиваем ряд»: 10 крестиков, 1 минута = 1 крестик. Не прочитано — пустая клетка канвы."""
    s=(w-8)/tot; out=''
    c1,c2=('#2c4a8a','#c98a2e') if not night else ('#9fb4f2','#e8c27a')
    for k in range(tot):
        x=4+k*s; e=min(s-5,12)
        if k<filled: out+=xst(x+(s-e)/2,14-e/2,e,c1 if k%2==0 else c2,2)
        else: out+=f'<rect x="{x+(s-e)/2:.1f}" y="{14-e/2:.1f}" width="{e:.1f}" height="{e:.1f}" fill="none" stroke="{"#b8a183" if not night else "#5a4634"}" stroke-width="1" stroke-dasharray="1.5 1.5"/>'
    t=f'<text x="{w/2}" y="40" text-anchor="middle" font-family="Arsenal" font-weight="700" font-size="11.5" fill="{"#f6ecdd" if night else INK}">{filled}/{tot} мин</text>' if label else ''
    return f'<svg width="{w}" height="{44 if label else 28}" viewBox="0 0 {w} {44 if label else 28}" style="flex:none">{out}{t}</svg>'
def week(sz=24,on=True,night=False):
    """Неделя — окошко избы: день выполнен — тёплый свет в окне; нет — тёмное окно-контур."""
    fr='#5a4029' if not night else '#cdb9a0'
    if on: return f'<svg width="{sz*.8:.0f}" height="{sz:.0f}" viewBox="0 0 20 24" style="flex:none"><path d="M1 5L10 0 19 5z" fill="{ACC if not night else "#9fb4f2"}"/><rect x="2" y="5" width="16" height="16" fill="#f3c766" stroke="{fr}" stroke-width="1.6"/><path d="M10 5V21M2 13H18" stroke="{fr}" stroke-width="1.2"/><path d="M0 22H20" stroke="{fr}" stroke-width="2"/></svg>'
    c='#b8a183' if not night else '#5a4634'
    return f'<svg width="{sz*.8:.0f}" height="{sz:.0f}" viewBox="0 0 20 24" style="flex:none"><rect x="2.5" y="5.5" width="15" height="15" fill="none" stroke="{c}" stroke-width="1.1" stroke-dasharray="2 1.5"/><path d="M10 6V20M3 13H17" stroke="{c}" stroke-width=".8" stroke-dasharray="2 1.5"/></svg>'
def cat_body(night=False):
    """Кот «Уголёк»: дымчато-серый, полосатый, белая грудка, сидит, обернув хвост."""
    return f'''<path d="M78 84Q96 82 92 66Q90 58 82 60" fill="none" stroke="#4a4540" stroke-width="7" stroke-linecap="round"/>
<path d="M28 88Q24 56 36 44H64Q76 56 72 88z" fill="#6d6862"/><path d="M42 88Q40 64 50 56Q60 64 58 88z" fill="#f4efe6"/>
{''.join(f'<path d="M{x} {y}q4 3 8 0" stroke="#4a4540" stroke-width="2" fill="none"/>' for x,y in ((30,66),(30,74),(62,66),(62,74)))}
<path d="M30 30L28 8 44 20Q50 18 56 20L72 8 70 30Q74 46 50 50Q26 46 30 30z" fill="#6d6862"/><path d="M32 13L35 22 40 18zM68 13L65 22 60 18z" fill="#e8b7a0"/>
<path d="M44 22l2 6M50 20v7M56 22l-2 6" stroke="#4a4540" stroke-width="1.6"/>
{('<path d="M38 34q4 3 8 0M54 34q4 3 8 0" stroke="#23180f" stroke-width="1.8" fill="none" stroke-linecap="round"/>' if night else '<ellipse cx="41" cy="34" rx="4" ry="4.6" fill="#d7e8a0"/><ellipse cx="59" cy="34" rx="4" ry="4.6" fill="#d7e8a0"/><ellipse cx="41" cy="34.5" rx="1.6" ry="3.6" fill="#23180f"/><ellipse cx="59" cy="34.5" rx="1.6" ry="3.6" fill="#23180f"/><circle cx="42.2" cy="32.6" r=".9" fill="#fff"/><circle cx="60.2" cy="32.6" r=".9" fill="#fff"/>')}
<path d="M48 40L52 40 50 42.5z" fill="#d98c8c"/><path d="M50 42.5Q47 45 45 44M50 42.5Q53 45 55 44" stroke="#23180f" stroke-width="1.1" fill="none"/>
<path d="M36 41L24 39M36 43L25 45M64 41L76 39M64 43L75 45" stroke="#f4efe6" stroke-width=".9"/><path d="M32 88H70" stroke="#4a4540" stroke-width="2"/>'''
def mascot(sz=96):
    """Маскот «Уголёк» с вышитым шарфиком (синий с охрой)."""
    return f'<svg class="tc" width="{sz}" height="{sz}" viewBox="0 0 100 100">{cat_body()}<path d="M34 48Q50 56 66 48L68 54Q50 62 32 54z" fill="{ACC}"/>{xst(44,51,3,OCHRE,1)}{xst(53,51,3,OCHRE,1)}</svg>'
def items():
    sam=f'''<svg class="tc" width="56" height="70" viewBox="0 0 56 70"><path d="M24 2h8v6h-8z" fill="#9a5524"/><path d="M18 8H38L40 14H16z" fill="#c9773a" stroke="#5e2f0e" stroke-width="1"/><path d="M12 14H44Q50 30 44 46H12Q6 30 12 14z" fill="#d48c4a" stroke="#5e2f0e" stroke-width="1.2"/>
<path d="M14 22H42" stroke="#f6d3a3" stroke-width="2" opacity=".7"/><path d="M8 26Q2 26 4 34M48 26Q54 26 52 34" fill="none" stroke="#5e2f0e" stroke-width="2"/><path d="M44 38H52V41H46" fill="#9a5524"/><path d="M18 46H38L36 56H20z" fill="#c9773a" stroke="#5e2f0e" stroke-width="1"/><path d="M12 56H44V60H12z" fill="#9a5524"/></svg>'''
    jug=f'''<svg class="tc" width="48" height="64" viewBox="0 0 48 64"><path d="M16 6H32V14Q44 22 42 40Q40 60 24 62Q8 60 6 40Q4 22 16 14z" fill="#b5764a" stroke="#5e2f0e" stroke-width="1.2"/><path d="M8 32H40" stroke="{LINEN}" stroke-width="3"/>{"".join(xst(x,28,3,ACC,1) for x in (12,19,26,33))}<ellipse cx="24" cy="7" rx="8" ry="2.4" fill="#fbf5e9" stroke="#5e2f0e" stroke-width="1"/><path d="M8 4Q14 0 16 6" fill="none" stroke="#fff" stroke-opacity=".0"/></svg>'''
    pie=f'''<svg class="tc" width="68" height="50" viewBox="0 0 68 50"><ellipse cx="34" cy="40" rx="32" ry="8" fill="#fbf5e9" stroke="{ACC}" stroke-width="1.4"/><ellipse cx="34" cy="40" rx="24" ry="5" fill="none" stroke="{ACC}" stroke-width=".8" stroke-dasharray="2 2"/>
<path d="M10 36Q12 18 34 16Q56 18 58 36z" fill="#d9a35a" stroke="#7a3f12" stroke-width="1.2"/><path d="M18 30Q34 22 50 30M22 24Q34 18 46 24" stroke="#f3d39a" stroke-width="2" fill="none"/>{xst(31,26,5,"#7a3f12",1.2)}<path d="M28 12Q30 6 27 2M38 12Q40 6 37 2" stroke="#b8a183" stroke-width="1.2" fill="none"/></svg>'''
    return [sam,jug,pie]
def card_deco(w,night=False):
    """Кромка карточки — полоса вышивки крестиком: синие ромбики и охра (без красного)."""
    cols=(ACC,OCHRE) if not night else ('#9fb4f2','#e8c27a')
    return f'<svg class="abs tc" width="{w}" height="9" viewBox="0 0 {w} 9">{stitch_row(w,0,5,cols,"0102010")}{stitch_row(w,4.5,5,cols,"1020201")}</svg>'
def cover(i):
    """Обложки — домотканый лён и крашеное дерево с простыми рисунками: изба, подсолнух, конь-качалка, берёзы, каравай, петушок охрой."""
    arts=[f'<path d="M14 34L30 20 46 34z" fill="#7a3f12"/><rect x="18" y="34" width="24" height="20" fill="#c98a2e"/><rect x="25" y="39" width="10" height="9" fill="#f3c766" stroke="#5a4029" stroke-width="1.4"/><path d="M30 39V48M25 43.5H35" stroke="#5a4029"/><path d="M8 54H52" stroke="#45622a" stroke-width="3"/>',
          ''.join(f'<ellipse cx="{30+9*math.cos(a):.1f}" cy="{26+9*math.sin(a):.1f}" rx="5" ry="2.4" transform="rotate({math.degrees(a):.0f} {30+9*math.cos(a):.1f} {26+9*math.sin(a):.1f})" fill="#e9b53a"/>' for a in [k*math.pi/6 for k in range(12)])+'<circle cx="30" cy="26" r="6" fill="#5a3a1c"/><path d="M30 34V58M30 46Q22 42 18 46Q24 50 30 48" stroke="#45622a" stroke-width="2" fill="#45622a"/>',
          f'<path d="M12 52Q30 60 50 52" stroke="#f3d39a" stroke-width="3" fill="none"/><path d="M18 50L22 36H40L44 50M22 36Q20 26 26 20L30 24H40Q46 28 42 36" fill="none" stroke="#f3d39a" stroke-width="2.4" stroke-linejoin="round"/><circle cx="29" cy="25" r="1.2" fill="#f3d39a"/>',
          ''.join(f'<rect x="{x}" y="{y}" width="4" height="{58-y}" fill="#f4efe6" stroke="#5a4634" stroke-width=".6"/>'+''.join(f'<path d="M{x} {yy}h2.5" stroke="#23180f" stroke-width="1.2"/>' for yy in range(y+6,58,8)) for x,y in ((18,14),(30,8),(42,18)))+'<ellipse cx="20" cy="16" rx="8" ry="6" fill="#7fa25a" opacity=".85"/><ellipse cx="32" cy="10" rx="9" ry="6" fill="#6b9148" opacity=".85"/><ellipse cx="44" cy="20" rx="8" ry="6" fill="#7fa25a" opacity=".85"/>',
          f'<ellipse cx="30" cy="40" rx="22" ry="12" fill="#d9a35a" stroke="#7a3f12" stroke-width="1.2"/><path d="M14 38Q30 30 46 38M18 44Q30 38 42 44" stroke="#f3d39a" stroke-width="2" fill="none"/><path d="M24 22Q30 16 36 22" stroke="#7a3f12" stroke-width="1" fill="none"/>',
          f'<path d="M20 50Q14 36 22 28Q20 20 28 18L32 12 34 18Q44 22 40 32L48 28Q50 42 38 50z" fill="#c98a2e" stroke="#5a4029" stroke-width="1.2"/><circle cx="31" cy="24" r="1.4" fill="#23180f"/><path d="M26 50V56M34 50V56" stroke="#5a4029" stroke-width="2"/>']
    bgs=['linear-gradient(180deg,#f6eedd,#e9dcc3)','linear-gradient(180deg,#f6eedd,#efe1c4)',ACC,'linear-gradient(180deg,#eef0e6,#e1e6d4)','linear-gradient(180deg,#f8efe0,#eddcc0)','linear-gradient(180deg,#f6eedd,#e9dcc3)']
    fg=LINEN if i==2 else INK
    art=f'<svg class="abs" style="left:50%;margin-left:-30px;bottom:4px" width="60" height="60" viewBox="0 0 60 60">{arts[i]}</svg>'
    return bgs[i],fg,art
def hero():
    return f'<svg class="tc" width="84" height="76" viewBox="0 0 84 76"><rect x="10" y="4" width="64" height="58" fill="#0e1428"/><circle cx="54" cy="22" r="9" fill="#efe6c8"/><path d="M42 4V62M10 33H74" stroke="#8a6a48" stroke-width="3"/><rect x="10" y="4" width="64" height="58" fill="none" stroke="#8a6a48" stroke-width="4"/><path d="M2 0H82L74 6H10z" fill="#3a5a9a"/><path d="M2 66H82L76 72H8z" fill="#3a5a9a"/>{"".join(xst(x,67,3,"#e8c27a",1) for x in range(14,72,8))}</svg>'
FF='''@font-face{font-family:"Yeseva One";src:url("fonts/YesevaOne-Regular.ttf")}@font-face{font-family:"Arsenal";font-weight:400;src:url("fonts/Arsenal-Regular.ttf")}@font-face{font-family:"Arsenal";font-weight:600 900;src:url("fonts/Arsenal-Bold.ttf")}
@font-face{font-family:"Podkova";font-weight:400 800;src:url("fonts/Podkova-VariableFont_wght.ttf")}@font-face{font-family:"Bitter";font-weight:100 900;src:url("fonts/Bitter-VariableFont_wght.ttf")}'''
S=dict(P='derevenskiy',NAME='Деревенский',FONTFACE=FF,
 F=dict(disp='"Yeseva One",serif',dispw=400,h1=29,h1ls=.3,ui='"Arsenal",sans-serif',num='"Podkova",serif',numw=700,read='"Bitter",serif',btn='"Yeseva One",serif',btnw=400,btns=21,shs=22,cts=13.5),
 INK=INK,T2=T2,BG='#e9d8bd',SURF=LINEN,ACC=ACC,ACC2=ACC2,ON='#ffffff',ACC_T=ACC,COIN_T=COIN_T,SUCC=SUCC,LINE='#d4c3a6',LINE2='#8c7356',BAR_BG='#efe4d0',HDR_FG=LINEN,
 SEC_FG=INK,SEC_FG2=T2,SHELF='repeating-linear-gradient(90deg,#8a5a34 0 40px,#7a4e2c 40px 42px)',R=6,RS=6,CV_R='4px',
 CARD_SH='0 0 0 1px #c9b28c,0 0 0 4px #fbf5e9,0 0 0 5px #b8946a,0 6px 16px rgba(60,35,10,.18)',BK_SH='0 0 0 1px #c9b28c,0 3px 8px rgba(60,35,10,.14)',TCX=12,TCY=6,
 RD_BG='#fbf6ec',RD_PANEL='#efe3cf',RD_LINE='#d4c3a6',N_RD_BG='#15100b',N_PANEL='#211910',N_LINE='#3a2c1e',N_TEXT='#f1e6d6',N_BOOK='#ebdfcc',N_ACC=MILK,
 SM=dict(bg='#1f1710',st='#2a2017',line='#45342a',fg='#f6ecdd',t2='#cdb9a0',acc=MILK,on='#15100b',coin='#e8c27a',edge='#6a5038'),
 CURR='монет',TREAS='Горница',TREAS_TO='в горницу',GOAL_DONE='Ряд вышит',
 BOOK='Изба у реки',CHAP='Глава 7. Первый снег',
 TXT=('Бабушка Анна затопила печь ещё затемно, и к рассвету по избе пошло ровное сухое тепло. '
      'Митя проснулся от запаха пирогов и долго лежал, глядя, как на стекле прорастают морозные листья, такие тонкие, что казалось, их можно перелистнуть. '
      'За окном лёг первый снег, и река внизу притихла, будто тоже решила дочитать что-то до конца, прежде чем уснуть до весны. '),
 COV=[('Изба у реки','А. Печкина','EPUB','53%'),('Подсолнухи','Г. Полева','FB2','12%'),('Конёк-качалка','И. Резной','TXT','прочитано'),
      ('Три берёзы','В. Белова','PDF','не начата'),('Каравай','Н. Житная','EPUB','4%'),('Петушок','С. Ранняя','PDF','67%')],
 SW=[('Сажа','#23180f','текст'),('Сосна','#e9d8bd','фон'),('Лён','#fbf5e9','карточки'),('Лён тёмн.','#efe3cf','панели'),
     ('Кора','#5a4634','вторичный текст'),('Наличник','#2c4a8a','акцент'),('Наличник тёмн.','#1f3768','нажатие'),('Огород','#45622a','неделя, успех'),
     ('Охра нити','#c98a2e','только декор'),('Красная нить','#b23a2a','только декор'),('Медь','#7a3f12','суммы монет'),('Страница','#fbf6ec','книга день'),
     ('Ночная изба','#15100b','фон ночи'),('Ночь: панель','#211910','поверхность'),('Топлёное молоко','#f2d2a9','акцент ночи'),('Ночь: текст','#ebdfcc','книга ночью')],
 FONTLINES='<div class="H" style="font-size:21px">Yeseva One — заголовки</div><div class="num" style="font-size:19px">Podkova — 18 мин · +180</div><div>Arsenal — интерфейс</div><div style="font-family:\'Bitter\';font-size:15px">Bitter — текст книги</div>',
 CSS='.q .ds,.q .tt{white-space:nowrap!important}.sec .sh{line-height:1.15;color:'+INK+'}.sec .sh .sm{color:'+T2+'}.sec>.sh{display:inline-flex!important;background:#fbf5e9;padding:4px 10px;border-radius:6px;box-shadow:0 0 0 1px #c9b28c}.cv .ct{font-size:13.5px}',
 PK_LIB='right:16px;bottom:90px',PK_REW='right:20px;top:116px',
 OV_BG='#2a1e14',OV_FG='#fbf5e9',OV_FG2='#e2cdb0',OV_FONT='YesevaOne-Regular.ttf',OV_FONT2='Arsenal-Bold.ttf')
A=types.SimpleNamespace(scene=scene,nightscene=nightscene,coin=coin,goal=goal,week=week,mascot=mascot,items=items,card_deco=card_deco,cover=cover,hero=hero)
if __name__=='__main__': build(S,A,D)
