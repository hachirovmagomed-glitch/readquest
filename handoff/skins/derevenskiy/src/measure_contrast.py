# Замер контраста: каждая надпись на финальных PNG @2x (типичный и худший 5-й перцентиль фона) + номинальные пары токенов из nominal.py.
# Порог: текст книги ≥7, остальной текст ≥4.5; декоративные цвета — только проверка, что текстом не используются. Плюс зазор декора (.tc) от текста ≥12 px.
import json,subprocess,os,re,sys
import numpy as np
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; sys.path.insert(0,D)
from nominal import P,BOOKFONT,NOM
def lum(c):
    c=np.asarray(c,dtype=float)/255; c=np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4); return c[...,0]*.2126+c[...,1]*.7152+c[...,2]*.0722
def cr(a,b): a,b=max(a,b),min(a,b); return (a+.05)/(b+.05)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
JS='''<script>addEventListener('load',()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('svg,style,script'))continue;const r=document.createRange();r.selectNodeContents(n);
for(const b of r.getClientRects()){if(b.width<2)continue;const cs=getComputedStyle(el);o.push({t:n.textContent.trim().slice(0,40),x:b.left,y:b.top,w:b.width,h:b.height,c:cs.color,fs:parseFloat(cs.fontSize),ff:cs.fontFamily.split(',')[0]})}}
const T=[...o];const ctl=[...document.querySelectorAll('.btn,.chip,.nav .t,.bal,.ib,.sl,.tools>div,.add')].map(e=>{const b=e.getBoundingClientRect();return{t:'[control] '+(e.textContent.trim().slice(0,24)),x:b.left,y:b.top,w:b.width,h:b.height}});
const dec=[...document.querySelectorAll('.tc')].map(e=>{const b=e.getBoundingClientRect();return{x:b.left,y:b.top,w:b.width,h:b.height,id:e.tagName+(e.getAttribute('width')||'')}});const clr=[];
for(const d of dec)for(const t of T.concat(ctl)){if(ctl.includes(t)&&t.x<=d.x&&t.y<=d.y&&t.x+t.w>=d.x+d.w&&t.y+t.h>=d.y+d.h)continue;const dx=Math.max(d.x-(t.x+t.w),t.x-(d.x+d.w),0),dy=Math.max(d.y-(t.y+t.h),t.y-(d.y+d.h),0);const g=Math.hypot(dx,dy);clr.push({t:t.t,d:d.id,g})}
o.push({CLR:clr});const p=document.createElement('pre');p.id='OUT';p.textContent=JSON.stringify(o);document.body.appendChild(p)})</script>'''
rows=[];CLR=[];cfail=0
for s in ('reader-day','reader-night','library','rewards','session-summary','palette'):
    n=f'{P}-{s}'; h=open(f'{D}/{n}.html').read().replace('</body>',JS+'</body>'); tp=f'/tmp/m_{n}.html'; open(tp,'w').write(h)
    dom=subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--window-size=390,844','--virtual-time-budget=3000','--dump-dom','file://'+tp],capture_output=True,text=True).stdout
    js=json.loads(re.search(r'<pre id="OUT">(.*?)</pre>',dom,re.S).group(1).replace('&quot;','"').replace('&lt;','<').replace('&gt;','>').replace('&amp;','&'))
    L=lum(np.asarray(Image.open(f'{OUT}/{n}@2x.png').convert('RGB')))
    cl=[e for e in js if 'CLR' in e][0]['CLR']; js=[e for e in js if 'CLR' not in e]
    mn=min(cl,key=lambda c:c['g']) if cl else None; CLR.append((s,len(cl),mn))
    for c in cl:
        if c['g']<12: print('CLEARANCE FAIL',s,c); cfail+=1
    for e in js:
        x0,y0,x1,y1=[int(round(v*2)) for v in (e['x']-3,e['y']-2,e['x']+e['w']+3,e['y']+e['h']+2)]
        x0,y0=max(x0,0),max(y0,0); x1,y1=min(x1,780),min(y1,1688)
        if s.startswith('reader') and e['ff'].strip('"')==BOOKFONT: y0,y1=max(y0,96*2),min(y1,(844-150)*2)
        if x1-x0<8 or y1-y0<8: continue
        m=re.match(r'rgba?\(([\d.]+), ([\d.]+), ([\d.]+)',e['c']); Lt=float(lum(np.array([float(v) for v in m.groups()])))
        R=L[y0:y1,x0:x1]; med=float(np.median(R)); tm=np.abs(R-Lt)<.8*abs(med-Lt); dm=tm.copy()
        for dy in range(-3,4):
            for dx in range(-3,4): dm|=np.roll(np.roll(tm,dy,0),dx,1)
        bg=R[~dm]
        if len(bg)<30: continue
        worst=float(np.percentile(bg,5 if med>Lt else 95)); typ=float(np.median(bg))
        book=e['ff'].strip('"')==BOOKFONT and s.startswith('reader'); thr=7 if book else 4.5
        kind='book' if book else ('ui-small' if e['fs']<14 else 'ui')
        rows.append((s,e['t'],e['ff'].strip('"'),e['fs'],e['c'],kind,thr,round(cr(Lt,typ),2),round(cr(Lt,worst),2)))
seen=set(); out=[]
for r in sorted(rows,key=lambda r:r[8]):
    k=(r[0],r[1],r[4])
    if k not in seen: seen.add(k); out.append(r)
fails=0
with open(f'{OUT}/contrast.tsv','w') as f:
    f.write('screen\ttext\tfont\tsize_px\tcolor\tkind\tthreshold\tcontrast_typical\tcontrast_worst_bg\tverdict\n')
    for r in out:
        v='ok' if r[8]>=r[6] else 'FAIL'; fails+=v=='FAIL'; f.write('\t'.join(map(str,r))+f'\t{v}\n')
    for n,a,b,k,t in NOM:
        c=round(cr(float(lum(np.array(hx(a)))),float(lum(np.array(hx(b))))),2); v='ok' if k=='decor' or c>=t else 'FAIL'; fails+=v=='FAIL'
        f.write(f'tokens\t{n}\t—\t—\t{a} / {b}\t{k}\t{t if t else "не для текста"}\t{c}\t{c}\t{v}\n')
print('pixel rows',len(out),'nominal',len(NOM),'FAIL',fails,'clearance fails',cfail)
for r in out[:6]: print(r)
bk=[r for r in out if r[5]=='book']; print('book min',min(r[8] for r in bk) if bk else None)
for n,a,b,k,t in NOM: print(n,round(cr(float(lum(np.array(hx(a)))),float(lum(np.array(hx(b))))),2))
for s,n,mn in CLR: print('clearance',s,'pairs',n,'min gap px',round(mn['g'],1) if mn else None, mn['t'] if mn else '')
