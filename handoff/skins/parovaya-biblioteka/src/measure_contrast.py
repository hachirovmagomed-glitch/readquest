# Замер контраста: каждая надпись на финальных PNG @2x (типичный и худший 5-й перцентиль фона) + номинальные пары токенов.
# Порог: текст книги (Merriweather) ≥7, остальной текст ≥4.5; декоративные цвета — только проверка, что текстом не используются.
import json,subprocess,os,re
import numpy as np
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/..'; P='parovaya-biblioteka'
def lum(c):
    c=np.asarray(c,dtype=float)/255; c=np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4); return c[...,0]*.2126+c[...,1]*.7152+c[...,2]*.0722
def cr(a,b): a,b=max(a,b),min(a,b); return (a+.05)/(b+.05)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
JS='''<script>addEventListener('load',()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('svg,style,script'))continue;const r=document.createRange();r.selectNodeContents(n);
for(const b of r.getClientRects()){if(b.width<2)continue;const cs=getComputedStyle(el);o.push({t:n.textContent.trim().slice(0,40),x:b.left,y:b.top,w:b.width,h:b.height,c:cs.color,fs:parseFloat(cs.fontSize),ff:cs.fontFamily.split(',')[0]})}}
const p=document.createElement('pre');p.id='OUT';p.textContent=JSON.stringify(o);document.body.appendChild(p)})</script>'''
rows=[]
for s in ('reader-day','reader-night','library','rewards','session-summary','palette'):
    n=f'{P}-{s}'; h=open(f'{D}/{n}.html').read().replace('</body>',JS+'</body>'); tp=f'/tmp/m_{n}.html'; open(tp,'w').write(h)
    dom=subprocess.run(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--window-size=390,844','--virtual-time-budget=3000','--dump-dom','file://'+tp],capture_output=True,text=True).stdout
    js=json.loads(re.search(r'<pre id="OUT">(.*?)</pre>',dom,re.S).group(1).replace('&quot;','"').replace('&lt;','<').replace('&gt;','>').replace('&amp;','&'))
    L=lum(np.asarray(Image.open(f'{OUT}/{n}@2x.png').convert('RGB')))
    for e in js:
        x0,y0,x1,y1=[int(round(v*2)) for v in (e['x']-3,e['y']-2,e['x']+e['w']+3,e['y']+e['h']+2)]
        x0,y0=max(x0,0),max(y0,0); x1,y1=min(x1,780),min(y1,1688)
        if s.startswith('reader') and e['ff'].strip('"')=='Merriweather': y0,y1=max(y0,96*2),min(y1,(844-150)*2)  # клип по видимой области .page (overflow:hidden)
        if x1-x0<8 or y1-y0<8: continue
        m=re.match(r'rgba?\(([\d.]+), ([\d.]+), ([\d.]+)',e['c']); Lt=float(lum(np.array([float(v) for v in m.groups()])))
        R=L[y0:y1,x0:x1]; med=float(np.median(R)); tm=np.abs(R-Lt)<.8*abs(med-Lt); dm=tm.copy()
        for dy in range(-3,4):
            for dx in range(-3,4): dm|=np.roll(np.roll(tm,dy,0),dx,1)
        bg=R[~dm]
        if len(bg)<30: continue
        worst=float(np.percentile(bg,5 if med>Lt else 95)); typ=float(np.median(bg))
        book=e['ff'].strip('"')=='Merriweather' and s.startswith('reader'); thr=7 if book else 4.5
        kind='book' if book else ('ui-small' if e['fs']<14 else 'ui')
        rows.append((s,e['t'],e['ff'].strip('"'),e['fs'],e['c'],kind,thr,round(cr(Lt,typ),2),round(cr(Lt,worst),2)))
seen=set(); out=[]
for r in sorted(rows,key=lambda r:r[8]):
    k=(r[0],r[1],r[4])
    if k not in seen: seen.add(k); out.append(r)
NOM=[('книга день','#231a12','#f5efe2','book',7),('книга ночь','#e6dcc8','#12100d','book',7),('--rq-text/--rq-bg','#231a12','#e9e1d0','ui',4.5),
('--rq-text-2/--rq-bg','#54443a','#e9e1d0','ui',4.5),('--rq-text-2/--rq-surface','#54443a','#f6f0e2','ui',4.5),('--rq-on-accent/--rq-accent','#ffffff','#8a3b12','ui',4.5),
('--rq-coin/--rq-surface','#6a4a10','#f6f0e2','ui',4.5),('патина (nav on)/белый','#ffffff','#1f5a52','ui',4.5),('вкладки на коже','#f1e4c8','#5a3420','ui',4.5),
('медь как текст/--rq-surface','#8a3b12','#f6f0e2','ui',4.5),('латунь (декор)/--rq-surface','#b5893a','#f6f0e2','decor',0),('сталь (декор)/--rq-surface','#7d7a72','#f6f0e2','decor',0),
('ночь --rq-text/--rq-bg','#efe3cc','#0f0d0b','ui',4.5),('ночь --rq-text-2/--rq-surface','#c4b196','#1d1914','ui',4.5),('ночь газовый свет/--rq-surface','#f2b84b','#1d1914','ui',4.5),
('ночь медь/--rq-surface','#f0956a','#1d1914','ui',4.5),('ночь патина/--rq-surface','#7fc9b8','#1d1914','ui',4.5),('ночь латунь (декор)/--rq-surface','#6e5426','#1d1914','decor',0)]
fails=0
with open(f'{OUT}/contrast.tsv','w') as f:
    f.write('screen\ttext\tfont\tsize_px\tcolor\tkind\tthreshold\tcontrast_typical\tcontrast_worst_bg\tverdict\n')
    for r in out:
        v='ok' if r[8]>=r[6] else 'FAIL'; fails+=v=='FAIL'; f.write('\t'.join(map(str,r))+f'\t{v}\n')
    for n,a,b,k,t in NOM:
        c=round(cr(float(lum(np.array(hx(a)))),float(lum(np.array(hx(b))))),2); v='ok' if k=='decor' or c>=t else 'FAIL'; fails+=v=='FAIL'
        f.write(f'tokens\t{n}\t—\t—\t{a} / {b}\t{k}\t{t if t else "не для текста"}\t{c}\t{c}\t{v}\n')
print('pixel rows',len(out),'nominal',len(NOM),'FAIL',fails)
for r in out[:8]: print(r)
for n,a,b,k,t in NOM: print(n,round(cr(float(lum(np.array(hx(a)))),float(lum(np.array(hx(b))))),2))
