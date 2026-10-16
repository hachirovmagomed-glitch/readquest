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
