# «Бабочковый» v2 decor: prints the --bb-* data-URI vars pasted into skins/skins.css (drawings from handoff/skins/babochkovyi/src/gen_babochki.py). Run: python3 tools/gen-bb-decor.py
import sys,math,random,urllib.parse
import os; sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','handoff','skins','babochkovyi','src'))
import gen_babochki as G
def uri(svg):
    s=svg.replace('"',"'")
    return 'url("data:image/svg+xml,'+urllib.parse.quote(s,safe=" /=:;,.-()'")+'")'
NS="xmlns='http://www.w3.org/2000/svg'"
out={}
# header decor in the strips above (0–24) and below (76–100) the title row; frame 390×108 anchored right top
r=random.Random(9)
st=''
for _ in range(36):
    y=r.choice([r.uniform(4,22),r.uniform(78,98)]); x=r.uniform(0,330)
    st+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(.5,1.1):.1f}" fill="#eef0ff" opacity="{r.uniform(.35,.8):.2f}"/>'
moon=('<defs><radialGradient id="m"><stop offset="0" stop-color="#fffbe9"/><stop offset=".7" stop-color="#f1ecd2"/><stop offset="1" stop-color="#f1ecd2" stop-opacity="0"/></radialGradient></defs>'
      '<radialGradient id="h"><stop offset="0" stop-color="#fffbe9" stop-opacity=".22"/><stop offset=".45" stop-color="#fffbe9" stop-opacity=".07"/><stop offset="1" stop-color="#fffbe9" stop-opacity="0"/></radialGradient>'
      '<circle cx="352" cy="84" r="34" fill="url(#h)"/><circle cx="352" cy="84" r="10" fill="url(#m)"/>')
moths=G.moth(206,88,.34,-20,.9)+G.moth(296,13,.3,25,.75)+G.moth(118,90,.24,10,.6)
out['bb-sky-n']=uri(f'<svg {NS} width="390" height="108" viewBox="0 0 390 108">{moon}{st}{moths}</svg>')
fl=G.bfly(206,88,.42,-14,("#7fc8cf","#a996e6","#f0a6c6"),.95,edge="#5b5f8a")+G.bfly(234,82,.28,18,("#f0a6c6","#a996e6"),.8,edge="#5b5f8a")+G.bfly(300,13,.3,22,("#8fd3d8","#b9a7ec"),.8,edge="#5b5f8a")
out['bb-head-fly']=uri(f'<svg {NS} width="390" height="108" viewBox="0 0 390 108">{fl}</svg>')
# coin «пыльца»
c=G.coin(40).replace(' style="flex:none"','').replace('<svg ',f'<svg {NS} ',1)
out['bb-coin']=uri(c)
# goal: butterfly (hatched) and cocoon outline, day and night
bd=G.bfly(20,20,1,0,G.IRI,edge='#5b5f8a',ant=False); bn=G.bfly(20,20,1,0,(G.LUNA,'#cfe9f5'),edge='#8fb7a0',body='#e9f2ea',ant=False)
out['bb-hatch-on']=uri(f'<svg {NS} viewBox="0 0 40 40">{bd}</svg>')
out['bb-hatch-on-n']=uri(f'<svg {NS} viewBox="0 0 40 40">{bn}</svg>')
coc=lambda c:f'<svg {NS} viewBox="0 0 40 40"><path d="M20 4v4" stroke="{c}" stroke-width="2" stroke-linecap="round"/><ellipse cx="20" cy="22" rx="7" ry="13" fill="none" stroke="{c}" stroke-width="2"/><path d="M14.5 18q5.5 3 11 0M14 25q6 3 12 0" fill="none" stroke="{c}" stroke-width="1.4" opacity=".7"/></svg>'
out['bb-hatch-off']=uri(coc('#9a97b4')); out['bb-hatch-off-n']=uri(coc('#4c5170'))
# meadow butterflies (day) for the grass strip
out['bb-flyers']=uri(f'<svg {NS} width="390" height="40" viewBox="0 0 390 40">{G.bfly(26,20,.6,-20,("#8fd3d8","#b9a7ec"))}{G.bfly(366,16,.45,25,("#f3b4cf","#b9a7ec"))}</svg>')
out['bb-flyers-n']=uri(f'<svg {NS} width="390" height="40" viewBox="0 0 390 40">{G.moth(30,18,.55,-15,.85)}{G.moth(362,14,.42,22,.7)}</svg>')
for k,v in out.items(): print(f'  --{k}:{v};')
# 17.10 v3 (Джессика: «больше похож на макет»): luga, mascot «Пыльца», hero, Цветник items, week flowers — printed as a second block for skins.css (between /*bb-v3*/ markers)
v3={}
def svg(w,h,body): return f'<svg {NS} width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
def strip(s): return s.replace(' class="tc"','').replace(' style="flex:none"','').replace('<svg ',f'<svg {NS} ',1)
def lug(night):
    r=random.Random(3); W,H=390,210; gr=''  # 17.10 Джессика: «более высокую траву» — blades to 170px, so the meadow rises well above the bottom nav
    for _ in range(150):
        x=r.uniform(-5,W+5); hh=r.uniform(60,170); b=r.uniform(-18,18)
        gr+=f'<path d="M{x:.0f} {H}Q{x+b/2:.0f} {H-hh/2:.0f} {x+b:.0f} {H-hh:.0f}" stroke="{"#9cc48a" if not night else "#1f2d2a"}" stroke-width="{r.uniform(1,2.4):.1f}" fill="none" opacity="{r.uniform(.5,.95):.2f}" stroke-linecap="round"/>'
    fl=''
    if not night:
        for _ in range(12):
            x=r.uniform(8,W-8); y=r.uniform(H-150,H-80); c=r.choice(['#ffffff','#e7d9fb','#fbe1ec','#fff2b8'])
            fl+=''.join(f'<circle cx="{x+3.2*math.cos(a):.1f}" cy="{y+3.2*math.sin(a):.1f}" r="2.4" fill="{c}" stroke="#c9bfe0" stroke-width=".4"/>' for a in [k*1.2566 for k in range(5)])+f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="#f2c24f"/>'
    else:
        fl=''.join(f'<circle cx="{r.uniform(0,W):.0f}" cy="{r.uniform(60,H-80):.0f}" r="{r.uniform(1,2):.1f}" fill="#e9f7b0" opacity="{r.uniform(.5,.9):.2f}"/>' for _ in range(18))
    return svg(W,H,gr+fl)
v3['bb-lug']=uri(lug(False)); v3['bb-lug-n']=uri(lug(True))
# night sky over the whole screen top: stars, moon right, moths around it (390×300, anchored right top)
r=random.Random(9)
st=''.join(f'<circle cx="{r.uniform(0,390):.0f}" cy="{r.uniform(0,300):.0f}" r="{r.uniform(.4,1.2):.1f}" fill="#eef0ff" opacity="{r.uniform(.3,.8):.2f}"/>' for _ in range(60))
mn=('<defs><radialGradient id="m"><stop offset="0" stop-color="#fffbe9"/><stop offset=".7" stop-color="#f1ecd2"/><stop offset="1" stop-color="#f1ecd2" stop-opacity="0"/></radialGradient></defs>'
    '<circle cx="300" cy="78" r="70" fill="#fffbe9" opacity=".08"/><circle cx="300" cy="78" r="40" fill="url(#m)"/>')
v3['bb-night']=uri(svg(390,300,st+mn+G.moth(236,70,.9,-25,.9)+G.moth(350,130,.7,30,.8)+G.moth(54,96,.8,-10,.7)+G.moth(120,40,.5,15,.6)))
v3['bb-day']=uri(svg(390,300,G.bfly(40,60,.6,-18,("#8fd3d8","#b9a7ec"),.8)+G.bfly(352,38,.5,22,("#f3b4cf","#b9a7ec"),.8)+G.bfly(330,250,.38,-12,("#8fd3d8","#f3b4cf"),.6)))
v3['bb-mascot']=uri(strip(G.mascot(96)))  # kept for reference; not used since 17.10 (Джессика: «обычных бабочек, а не бабочку с глазами»)
v3['bb-flock']=uri(svg(120,84,G.bfly(30,54,.95,-16,("#8fd3d8","#b9a7ec"))+G.bfly(78,30,.8,14,("#f3b4cf","#b9a7ec"))+G.bfly(102,66,.55,26,("#b9a7ec","#8fd3d8"),.9)))
v3['bb-flock-n']=uri(svg(120,84,G.moth(30,54,.95,-16,.9)+G.moth(78,30,.8,14,.8)+G.moth(102,66,.55,26,.7)))
v3['bb-hero']=uri(svg(96,78,'<circle cx="48" cy="38" r="34" fill="#e2dbf7" opacity=".55"/><circle cx="48" cy="38" r="24" fill="#cdeef0" opacity=".6"/>'+G.bfly(48,38,1.9,0)))
v3['bb-hero-n']=uri(strip(G.hero()))
for k,a in zip(('bb-vase','bb-hat','bb-can'),G.items()): v3[k]=uri(strip(a))
for k,on,n in (('bb-week-on',True,False),('bb-week-off',False,False),('bb-week-on-n',True,True),('bb-week-off-n',False,True)): v3[k]=uri(strip(G.week(24,on,n)))
v3['bb-edge-n']=uri("<svg "+NS+" width='9' height='6' viewBox='0 0 9 6'><path d='M0 6A4.5 4.5 0 0 1 9 6' fill='none' stroke='#8fb7a0' stroke-width='1.4'/></svg>")
if '--v3' in sys.argv:
    print('html[data-skin="babochkovyi"]{'); [print(f'  --{k}:{v};') for k,v in v3.items()]; print('}')
# 17.10 v4 (Джессика: «большее разнообразие бабочек»): species × palettes from tools/bb_species.py; printed with --v4 (block between /*bb-v4*/ markers in skins.css)
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import bb_species as B
v4={}
SP=[('morpho',0),('swallow',2),('round',3),('long',1),('scallop',6),('swallow',4),('round',5),('morpho',7),('long',3),('scallop',1)]
for i,(sh,pl) in enumerate(SP): v4[f'bb-sp-{i}']=uri(f'<svg {NS} viewBox="0 0 40 40">{B.bf(sh,pl,ant=False)}</svg>')
for i in range(4): v4[f'bb-mo-{i}']=uri(f'<svg {NS} viewBox="0 0 40 40">{B.moth(20,20,1,0,1,i)}</svg>')
v4['bb-head-fly']=uri(svg(390,108,B.place('swallow',2,206,88,.42,-14,.95)+B.place('round',3,236,82,.3,18,.85)+B.place('long',1,300,13,.32,22,.85)))
v4['bb-flock']=uri(svg(120,84,B.place('swallow',4,30,54,.95,-16)+B.place('morpho',1,78,30,.8,14)+B.place('scallop',6,102,66,.55,26,.9)))
v4['bb-flock-n']=uri(svg(120,84,B.moth(30,54,.95,-16,.9,0)+B.moth(78,30,.8,14,.8,1)+B.moth(102,66,.55,26,.7,3)))
v4['bb-hero']=uri(svg(96,78,'<circle cx="48" cy="38" r="34" fill="#e2dbf7" opacity=".55"/><circle cx="48" cy="38" r="24" fill="#cdeef0" opacity=".6"/>'+B.place('swallow',0,48,38,1.9,0)))
v4['bb-day']=uri(svg(390,300,B.place('round',3,40,60,.6,-18,.85)+B.place('swallow',2,352,38,.55,22,.85)+B.place('long',4,330,250,.42,-12,.7)))
v4['bb-lug-fly']=uri(svg(390,60,B.place('round',5,40,30,.5,-20,.9)+B.place('long',3,200,18,.4,12,.8)+B.place('scallop',1,350,36,.45,24,.85)))
if '--v4' in sys.argv:
    print('html[data-skin="babochkovyi"]{'); [print(f'  --{k}:{v};') for k,v in v4.items()]; print('}')
if '--js' in sys.argv:
    import json; print(json.dumps({k:{'up':v['up'],'lo':v['lo'],'spot':v['spot']} for k,v in B.SHAPES.items()},separators=(',',':'))); print(json.dumps(B.PAL,separators=(',',':')))
# 18.10 v5 (Джессика: «верхняя плашка слишком большая»): compact 390×72 header band; butterflies and moths in the strip under the row (54–64), stars above and below, a small moon top right. Printed with --v5
v5={}
r=random.Random(9); st5=''
for _ in range(30):
    y=r.choice([r.uniform(2,8),r.uniform(56,64)]); x=r.uniform(0,340)
    st5+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(.5,1):.1f}" fill="#eef0ff" opacity="{r.uniform(.35,.8):.2f}"/>'
moon5=('<defs><radialGradient id="m"><stop offset="0" stop-color="#fffbe9"/><stop offset=".7" stop-color="#f1ecd2"/><stop offset="1" stop-color="#f1ecd2" stop-opacity="0"/></radialGradient>'
       '<radialGradient id="h"><stop offset="0" stop-color="#fffbe9" stop-opacity=".2"/><stop offset="1" stop-color="#fffbe9" stop-opacity="0"/></radialGradient></defs>'
       '<circle cx="372" cy="60" r="18" fill="url(#h)"/><circle cx="372" cy="60" r="6" fill="url(#m)"/>')
v5['bb-sky-n']=uri(svg(390,72,moon5+st5+B.moth(150,59,.3,-20,.9,0)+B.moth(326,59,.24,25,.75,1)+B.moth(70,60,.2,10,.6,3)))
v5['bb-head-fly']=uri(svg(390,72,B.place('swallow',2,150,59,.32,-14,.95)+B.place('round',3,178,58,.24,18,.85)+B.place('long',1,326,59,.26,22,.85)))
if '--v5' in sys.argv:
    [print(f'--{k}:{v};') for k,v in v5.items()]
