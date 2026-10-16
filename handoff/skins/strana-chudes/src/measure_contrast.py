# Замер контраста текста: номинальные пары из палитры + реальный фон по пикселям @2x (худший 5-й перцентиль фона под каждой надписью).
import json,subprocess,os,re,sys
import numpy as np
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'
def lum(c):
    c=np.asarray(c,dtype=float)/255; c=np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4); return c[...,0]*.2126+c[...,1]*.7152+c[...,2]*.0722
def cr(a,b): a,b=max(a,b),min(a,b); return (a+.05)/(b+.05)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
JS='''<script>addEventListener('load',()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('svg,style,script'))continue;const r=document.createRange();r.selectNodeContents(n);
for(const b of r.getClientRects()){if(b.width<2)continue;const cs=getComputedStyle(el);o.push({t:n.textContent.trim().slice(0,40),x:b.left,y:b.top,w:b.width,h:b.height,c:cs.color,fs:parseFloat(cs.fontSize),fw:cs.fontWeight,ff:cs.fontFamily.split(',')[0]})}}
const p=document.createElement('pre');p.id='OUT';p.textContent=JSON.stringify(o);document.body.appendChild(p)})</script>'''
rows=[]
for n in ['strana-chudes-'+s for s in ('reader-day','reader-night','library','session-summary','rewards','palette')]:
    h=open(f'{D}/{n}.html').read().replace('</body>',JS+'</body>'); tp=f'/tmp/m_{n}.html'; open(tp,'w').write(h)
    dom=subprocess.run(['/usr/bin/google-chrome','--headless=new','--no-sandbox','--disable-gpu','--window-size=390,844','--virtual-time-budget=3000','--dump-dom','file://'+tp],capture_output=True,text=True).stdout
    js=json.loads(re.search(r'<pre id="OUT">(.*?)</pre>',dom,re.S).group(1).replace('&quot;','"').replace('&amp;','&').replace('&lt;','<').replace('&gt;','>'))
    im=np.asarray(Image.open(f'{OUT}/{n}@2x.png').convert('RGB')); L=lum(im)
    for e in js:
        x0,y0,x1,y1=[int(round(v*2)) for v in (e['x']-3,e['y']-2,e['x']+e['w']+3,e['y']+e['h']+2)]
        x0,y0=max(x0,0),max(y0,0); x1,y1=min(x1,780),min(y1,1688)
        if x1-x0<8 or y1-y0<8 or y0>=1688: continue
        m=re.match(r'rgba?\(([\d.]+), ([\d.]+), ([\d.]+)',e['c']); tc=tuple(float(v) for v in m.groups()); Lt=float(lum(np.array(tc)))
        R=L[y0:y1,x0:x1]; med=float(np.median(R))
        tm=np.abs(R-Lt)<.8*abs(med-Lt)          # пиксели текста и сглаживания
        dm=tm.copy()
        for dy in range(-3,4):
            for dx in range(-3,4): dm|=np.roll(np.roll(tm,dy,0),dx,1)
        bg=R[~dm]
        if len(bg)<30: continue
        worst=float(np.percentile(bg,5 if med>Lt else 95)); typ=float(np.median(bg))
        rows.append((n.replace('strana-chudes-',''),e['t'],e['ff'].strip('"'),e['fs'],e['c'],round(cr(Lt,typ),2),round(cr(Lt,worst),2)))
# дедуп
seen=set(); out=[]
for r in rows:
    k=(r[0],r[1],r[4]); 
    if k in seen: continue
    seen.add(k); out.append(r)
out.sort(key=lambda r:r[6])
with open(f'{OUT}/contrast-pixels.tsv','w') as f:
    f.write('screen\ttext\tfont\tsize_px\tcolor\tcontrast_typical\tcontrast_worst_bg\n')
    for r in out: f.write('\t'.join(map(str,r))+'\n')
for r in out[:40]: print(r)
print('total',len(out),'below 4.5 (worst):',sum(1 for r in out if r[6]<4.5),'below 4.5 (typical):',sum(1 for r in out if r[5]<4.5))
