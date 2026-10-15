# ReadQuest · общий каркас макетов скина (раскладка stage1-final как у «Эллады»/«Бархатной ночи»).
# Скин даёт словарь S (цвета, шрифты, тексты) и функции рисунков; каркас собирает 6 экранов 390×844, @1x/@2x и сводку.
import os,subprocess
from PIL import Image,ImageDraw,ImageFont
W,H=390,844
ICONS={
'arrow-left':'<path d="M19 12H5M12 19l-7-7 7-7"/>','bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/>',
'bookmark-plus':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 7v6M9 10h6"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
'list':'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>','type':'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
'moon':'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
'gift':'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
'user':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>','plus':'<path d="M12 5v14M5 12h14"/>'}
def ic(n,sz=22,w=1.7): return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICONS[n]}</svg>'
_u=[0]
def uid(p): _u[0]+=1; return f'{p}{_u[0]}'

def build(S,A,D):
    """S — словарь скина, A — объект с функциями рисунков, D — папка src."""
    OUT=D+'/..'; P=S['P']; F=S['F']
    css=S['FONTFACE']+f'''
*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:{F['ui']};font-weight:600;color:{S['INK']};background:{S['BG']}}}
.abs{{position:absolute;pointer-events:none}}.H{{font-family:{F['disp']};font-weight:{F.get('dispw',400)}}}.num{{font-family:{F['num']};font-weight:{F.get('numw',700)}}}
.card{{position:relative;background:{S['SURF']};border-radius:{S['R']}px;box-shadow:{S['CARD_SH']}}}
.card>.tc{{left:{S.get('TCX',10)}px;top:{S.get('TCY',7)}px}}
.hdr{{position:absolute;top:0;left:0;right:0;padding:52px 20px 0;display:flex;align-items:center;justify-content:space-between;z-index:2}}
.hdr h1{{font-family:{F['disp']};font-weight:{F.get('dispw',400)};font-size:{F.get('h1',30)}px;color:{S['HDR_FG']};letter-spacing:{F.get('h1ls',0.5)}px;line-height:1}}
.bal{{display:flex;align-items:center;gap:6px;padding:3px 14px 3px 3px;font-weight:700;font-size:14px;color:{S['INK']};background:{S['SURF']};border-radius:20px;box-shadow:0 0 0 1.5px {S['LINE']}}}
.nav{{position:absolute;left:14px;right:14px;bottom:14px;height:66px;display:flex;align-items:center;padding:0 8px;isolation:isolate}}
.nav .t{{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:13px;font-weight:700;color:{S['T2']};position:relative;padding:6px 0}}
.nav .on{{color:{S['ON']}}}.nav .on:before{{content:"";position:absolute;inset:2px 8px;z-index:-1;background:{S['ACC']};border-radius:{S['RS']}px}}
.btn{{display:flex;align-items:center;justify-content:center;height:52px;font-family:{F['btn']};font-weight:{F.get('btnw',800)};font-size:{F.get('btns',20)}px;color:{S['ON']};background:{S['ACC']};border-radius:{S['RS']}px;box-shadow:0 0 0 1.5px {S['ACC2']}}}
.bar{{height:8px;background:{S['BAR_BG']};border-radius:4px;box-shadow:inset 0 0 0 1px {S['LINE']}}}.bar i{{display:block;height:100%;border-radius:4px;background:{S['ACC']}}}
.cap{{font-size:12.5px;color:{S['T2']}}}
/* читалка: страница чистая — без декора и маскота */
.rd{{position:absolute;inset:0;background:{S['RD_BG']};color:{S['INK']}}}
.page{{position:absolute;top:96px;bottom:150px;left:0;right:0;overflow:hidden;padding:20px 26px 0;font-family:{F['read']};font-size:16px;line-height:1.7}}
.page h3{{font-family:{F['disp']};font-weight:{F.get('dispw',400)};font-size:24px;margin-bottom:12px}}.page p{{text-indent:1.4em;margin-bottom:6px}}
.rtop{{position:absolute;top:0;left:0;right:0;height:96px;padding:44px 8px 0;display:flex;align-items:center;background:{S['RD_PANEL']};box-shadow:0 1px 0 {S['RD_LINE']}}}
.rtop .t{{flex:1;text-align:center;font-family:{F['disp']};font-weight:{F.get('dispw',400)};font-size:21px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ib{{width:42px;height:42px;display:flex;align-items:center;justify-content:center;color:{S['ACC']}}}
.rbot{{position:absolute;left:0;right:0;bottom:0;height:150px;background:{S['RD_PANEL']};box-shadow:0 -1px 0 {S['RD_LINE']};padding:16px 22px 0}}
.pg{{display:flex;justify-content:center;font-size:15px;margin-bottom:10px;font-weight:700}}
.sl{{position:relative;height:24px}}.sl .tr{{position:absolute;top:10px;left:0;right:0;height:4px;border-radius:2px;background:{S['RD_LINE']}}}.sl .fi{{position:absolute;top:10px;left:0;height:4px;border-radius:2px;background:{S['ACC']}}}
.sl .th{{position:absolute;top:2px;margin-left:-10px;width:20px;height:20px;border-radius:50%;background:{S['RD_BG']};border:2px solid {S['ACC']}}}
.tools{{display:flex;justify-content:space-around;margin-top:14px;font-size:13px;font-weight:700}}.tools div{{display:flex;flex-direction:column;align-items:center;gap:3px}}.tools svg{{color:{S['ACC']}}}
.night .rd{{background:{S['N_RD_BG']};color:{S['N_BOOK']}}}.night .rtop,.night .rbot{{background:{S['N_PANEL']}}}.night .rtop{{box-shadow:0 1px 0 {S['N_LINE']}}}.night .rbot{{box-shadow:0 -1px 0 {S['N_LINE']}}}
.night .rtop .t,.night .pg,.night .tools{{color:{S['N_TEXT']}}}.night .ib,.night .tools svg{{color:{S['N_ACC']}}}
.night .sl .tr{{background:{S['N_LINE']}}}.night .sl .fi{{background:{S['N_ACC']}}}.night .sl .th{{background:{S['N_RD_BG']};border-color:{S['N_ACC']}}}
@media (prefers-reduced-motion:reduce){{*,*:before,*:after{{animation:none!important;transition:none!important}}}}
'''+S.get('CSS','')
    def html(body,cls=''): return f'<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>{css}</style></head><body class="{cls}">{body}</body></html>'
    def reader(night=False):
        pct=97/184*100
        return f'''<div class="rd"><div class="page"><h3>{S['CHAP']}</h3><p>{S['TXT']*2}</p><p>{S['TXT']}</p></div>
<div class="rtop"><div class="ib">{ic("arrow-left")}</div><div class="t">{S['BOOK']}</div><div class="ib">{ic("bookmark")}</div><div class="ib">{ic("settings")}</div></div>
<div class="rbot"><div class="pg"><span>98 из 185</span></div>
<div class="sl"><div class="tr"></div><div class="fi" style="width:{pct}%"></div><div class="th" style="left:{pct}%"></div></div>
<div class="tools"><div>{ic("list")}Оглавление</div><div>{ic("type")}Текст</div><div>{ic("sun" if night else "moon")}{"День" if night else "Ночь"}</div><div>{ic("bookmark-plus")}Закладка</div></div></div></div>'''
    def nav(on):
        it=[('book-open','Библиотека'),('gift','Награды'),('user','Профиль')]
        return '<div class="card nav">'+''.join(f'<div class="t {"on" if l==on else ""}">{ic(i,22)}{l}</div>' for i,l in it)+'</div>'
    def bal(): return f'<div class="bal">{A.coin(26)}<span class="num" style="font-size:19px">390</span> {S["CURR"]}</div>'
    def library():
        c=f'''<style>.chips{{position:absolute;top:126px;left:20px;right:20px;display:flex;gap:8px}}.chip{{padding:5px 13px;font-size:15px;font-weight:700;color:{S['T2']};border-radius:{S['RS']}px;background:{S['SURF']};box-shadow:0 0 0 1px {S['LINE']}}}.chip.on{{color:{S['ON']};background:{S['ACC']};box-shadow:0 0 0 1px {S['ACC2']}}}
.grid{{position:absolute;top:174px;left:18px;right:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px}}.bk{{min-width:0;background:{S['SURF']};padding:6px 6px 7px;border-radius:{S['R']}px;box-shadow:{S['BK_SH']}}}
.cv{{position:relative;height:146px;overflow:hidden;padding:24px 7px 0;text-align:center;border-radius:{S['CV_R']}}}
.fmt{{position:absolute;top:8px;left:0;right:0;font-size:10px;font-weight:800;letter-spacing:1.5px}}
.ct{{font-size:{F.get('cts',15)}px;line-height:1.08;position:relative}}.ca{{font-size:10.5px;white-space:nowrap;margin-top:4px;position:relative;font-weight:700}}
.bt{{font-size:13px;font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ba{{font-size:12px;color:{S['T2']};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}</style>'''
        cards=''
        for i,(t,a,f,p) in enumerate(S['COV']):
            bg,fg,art=A.cover(i)
            prog=f'<div class="bar" style="height:5px;margin-top:5px"><i style="width:{p}"></i></div>' if p.endswith('%') else ''
            cards+=f'<div class="bk"><div class="cv" style="background:{bg};color:{fg}"><div class="fmt">{f}</div><div class="ct H">{t}</div><div class="ca">{a}</div>{art}</div><div class="bt">{t}</div><div class="ba">{a} · {p}</div>{prog}</div>'
        pk=f'<div class="abs" style="{S.get("PK_LIB","right:10px;bottom:96px")}">{A.mascot(84)}</div>'
        return c+A.scene()+f'<div class="hdr"><h1>Библиотека</h1>{bal()}</div><div class="chips"><div class="chip on">Все</div><div class="chip">Читаю</div><div class="chip">Хочу</div><div class="chip">Прочитано</div></div><div class="grid">{cards}</div>{pk}{nav("Библиотека")}'
    def rewards():
        c=f'''<style>.sec{{position:absolute;left:20px;right:20px}}.sh{{display:flex;align-items:baseline;gap:10px;font-family:{F['disp']};font-weight:{F.get('dispw',400)};font-size:{F.get('shs',24)}px;margin-bottom:14px;color:{S['SEC_FG']}}}.sh .sm{{font-family:{F['ui']};font-weight:700;font-size:13px;color:{S['SEC_FG2']}}}
.q{{display:flex;align-items:center;gap:12px;padding:28px 16px 14px;margin-bottom:14px}}.q .tx{{flex:1;min-width:0}}.q .tt{{font-weight:800;font-size:16px}}.q .ds{{font-size:13px;color:{S['T2']};margin:1px 0 4px}}
.amt{{display:flex;align-items:center;gap:3px;font-weight:800;font-size:16px;color:{S['COIN_T']}}}
.ter{{padding:28px 10px 0;overflow:hidden}}.shelf{{height:10px;margin:0 -8px;background:{S['SHELF']}}}
.rc{{display:flex;gap:6px;align-items:flex-end}}.it{{flex:1 1 0;text-align:center}}.it .art{{height:70px;display:flex;align-items:flex-end;justify-content:center}}
.tags{{display:flex;gap:6px;padding:6px 0 12px}}.tag{{flex:1 1 0;text-align:center}}.tag .nm{{font-size:14px;font-weight:700;line-height:1.15;height:34px;display:flex;align-items:center;justify-content:center}}
.tag .pr{{display:inline-flex;align-items:center;gap:3px;font-size:13px;font-weight:800;color:{S['COIN_T']}}}
.add{{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-top:18px;border:1.5px dashed {S['LINE2']};border-radius:{S['R']}px;background:{S['SURF']}}}.add .tt{{font-weight:800;font-size:15px;color:{S['ACC_T']}}}.add .ds{{font-size:13px;color:{S['T2']}}}</style>'''
        q1=f'<div class="card q">{A.card_deco(330)}<div class="tx"><div class="tt">Задание дня</div><div class="ds">Читать 10 мин · 6 из 10 мин</div>{A.goal(6,10,190,False,False)}</div><div class="amt">{A.coin(20)}+30</div></div>'
        ws=''.join(A.week(24,i<3) for i in range(4))
        q2=f'<div class="card q">{A.card_deco(330)}<div style="display:flex;gap:3px;flex:none">{ws}</div><div class="tx"><div class="tt">Задание недели</div><div class="ds">4 дня по 10 мин · 3 из 4</div><div class="bar"><i style="width:75%;background:{S["SUCC"]}"></i></div></div><div class="amt">{A.coin(20)}+120</div></div>'
        its=''.join(f'<div class="it"><div class="art">{a}</div></div>' for a in A.items())
        tags=''.join(f'<div class="tag"><div class="nm">{n}</div><div class="pr">{A.coin(16)}XXX</div></div>' for n in ('Серия сериала','Кофе в кофейне','Новая книга'))
        pk=f'<div class="abs" style="{S.get("PK_REW","right:22px;top:118px")}">{A.mascot(46)}</div>'
        return c+A.scene()+f'''<div class="hdr"><h1>Награды</h1>{bal()}</div>
<div class="sec" style="top:126px"><div class="sh">Задания</div>{q1}{q2}<div class="sh" style="margin-top:8px">{S['TREAS']}<span class="sm">награды за чтение</span></div><div class="card ter">{A.card_deco(330)}<div class="rc">{its}</div><div class="shelf"></div><div class="tags">{tags}</div></div>
<div class="add"><div style="color:{S['ACC_T']}">{ic("plus",24)}</div><div><div class="tt">Добавить {S['TREAS_TO']}</div><div class="ds">Придумайте, чем себя порадовать, и назначьте цену в монетах.</div></div></div></div>{pk}{nav("Награды")}'''
    def summary():
        N=S['SM']
        c=f'''<style>.sm{{position:absolute;left:20px;right:20px;top:150px;padding:30px 20px 22px;text-align:center;background:{N['bg']}!important;color:{N['fg']};box-shadow:0 0 0 1.5px {N['edge']},0 14px 40px rgba(0,0,0,.6)!important}}
.sm h2{{font-size:30px;color:{N['fg']}}}.sub{{font-size:14px;color:{N['t2']};margin:4px 0 10px}}
.stats{{display:flex;margin:10px 0 14px;gap:8px}}.st{{flex:1;padding:8px 4px;border-radius:{S['RS']}px;background:{N['st']};box-shadow:inset 0 0 0 1px {N['line']}}}
.st b{{display:block;font-family:{F['num']};font-weight:{F.get('numw',700)};font-size:24px;line-height:1.25}}.st span{{font-size:13px;color:{N['t2']}}}
.xpl{{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;font-weight:700;margin-bottom:6px}}.sm .cap{{color:{N['t2']}}}
.sm .bar{{background:{N['st']};box-shadow:inset 0 0 0 1px {N['line']}}}.sm .bar i{{background:{N['acc']}}}
.rw{{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 0 8px;margin:4px 0 8px;border-top:1px solid {N['line']}}}.rw .tt{{font-weight:800;font-size:15px;white-space:nowrap;color:{N['coin']}}}.rw .ds{{font-size:13px;color:{N['t2']}}}
.wk{{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:700;margin:4px 0 18px}}.dots{{display:flex;gap:4px}}
.sm .btn{{background:{N['acc']};color:{N['on']};box-shadow:0 0 0 1.5px {N['edge']}}}</style>'''
        dots=''.join(A.week(26,i<3,True) for i in range(4))
        inner=f'''<div style="line-height:0;display:flex;justify-content:center">{A.hero()}</div><h2 class="H" style="margin-top:14px">Сессия завершена</h2><div class="sub">{S['BOOK']} · стр. 85–98</div>
<div class="stats"><div class="st"><b>18 мин</b><span>Чтение</span></div><div class="st"><b>14</b><span>Страницы</span></div><div class="st"><b style="color:{N['acc']}">+180</b><span>XP</span></div></div>
<div class="xpl"><span>Уровень 4</span><span class="cap">320 / 500 до уровня 5</span></div><div class="bar"><i style="width:64%"></i></div>
<div class="rw">{A.goal(10,10,140,True,False)}<div style="flex:1"><div class="tt" style="display:flex;align-items:center;gap:6px">{A.coin(22)}+30 {S['CURR']} за день</div><div class="ds">{S['GOAL_DONE']} · 18 из 10 мин</div></div></div>
<div class="wk"><span>Неделя: 3 из 4 дней</span><div class="dots">{dots}</div></div><div class="btn">Продолжить</div>'''
        return c+A.nightscene()+f'<div class="card sm">{A.card_deco(330,True)}{inner}</div>'
    def palette():
        sw=''.join(f'<div class="s"><div class="c" style="background:{h}"></div><b>{n}</b><span>{h}</span><em>{u}</em></div>' for n,h,u in S['SW'])
        c=f'<style>.wrap{{position:absolute;left:0;right:0;top:126px;padding:0 18px}}.pp{{padding:10px 8px}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px}}.s{{text-align:center;font-size:11px}}.c{{height:32px;border-radius:{S["RS"]}px;box-shadow:0 0 0 1px {S["LINE2"]};margin-bottom:5px}}.s b{{display:block;font-weight:800;line-height:1.1}}.s span{{display:block;font-family:monospace;color:{S["T2"]};font-size:10.5px}}.s em{{font-style:normal;color:{S["T2"]};font-size:10.5px}}.f{{margin-top:14px;font-size:15px;line-height:1.45}}</style>'
        return c+A.scene()+f'''<div class="hdr"><h1>Палитра</h1></div><div class="wrap"><div class="card pp"><div class="g">{sw}</div></div>
<div class="card f" style="padding:12px 14px">{S['FONTLINES']}
<div style="display:flex;gap:6px;align-items:flex-end;margin-top:14px">{A.coin(36)}{A.week(30)}{A.week(30,False)}{A.items()[0]}{A.mascot(70)}</div><div style="margin-top:2px">{A.goal(6,10,220,False,True)}</div></div></div>'''
    SC=[(P+'-reader-day',reader(),'','Читалка · день'),(P+'-reader-night',reader(True),'night','Читалка · ночь'),(P+'-library',library(),'','Библиотека'),
        (P+'-rewards',rewards(),'','Награды'),(P+'-session-summary',summary(),'','Итог сессии · ночь'),(P+'-palette',palette(),'','Палитра')]
    for n,b,cl,_ in SC:
        p=f'{D}/{n}.html'; open(p,'w').write(html(b,cl)); big=f'/tmp/{n}@4x.png'
        subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=4',f'--window-size={W},{H}','--virtual-time-budget=2000',f'--screenshot={big}','file://'+p],capture_output=True)
        im=Image.open(big).convert('RGB'); im.resize((W,H),Image.LANCZOS).save(f'{OUT}/{n}.png'); im.resize((2*W,2*H),Image.LANCZOS).save(f'{OUT}/{n}@2x.png')
    # сводка — в самом конце, из финальных PNG
    G=28;ov=Image.new('RGB',(G+6*(W+G),H+130),S['OV_BG']);d=ImageDraw.Draw(ov)
    fH=ImageFont.truetype(D+'/fonts/'+S['OV_FONT'],52);fC=ImageFont.truetype(D+'/fonts/'+S['OV_FONT2'],22)
    d.text((G,12),f'ReadQuest — скин «{S["NAME"]}»',font=fH,fill=S['OV_FG'])
    for i,(n,_,_,cap) in enumerate(SC):
        x=G+i*(W+G);ov.paste(Image.open(f'{OUT}/{n}.png'),(x,80));d.text((x+W/2,80+H+12),cap,font=fC,fill=S['OV_FG2'],anchor='ma')
    ov.save(f'{OUT}/{P}-overview.png')
    w=1200; ov.resize((w,round(ov.height*w/ov.width)),Image.LANCZOS).save(f'{OUT}/{P}-overview.jpg',quality=90)
