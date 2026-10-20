#!/usr/bin/env python3
"""ReadQuest «Небесный»: выравнивание примерок и вырезание слоёв.
Использование:
  python3 pipe.py <body_dir> [--config cfg.json]
<body_dir> содержит maneken.png и src/<slot>.(png|jpg) — результаты генерации «манекен + 1 вещь».
Пишет dressed/<slot>.jpg, layers/layer-<slot>.png (RGBA 864x1152), full-outfit.png,
full-outfit-dark.png (тест на #1a2236), overview.png, anchors.json, stats.json.
Зависимости: pillow numpy scipy opencv-python-headless
"""
import sys, os, glob, json, argparse
import numpy as np, cv2
from PIL import Image, ImageDraw
from scipy import ndimage as nd

W, H = 864, 1152
SLOTS = ['headwear','cape','top','bottom','gloves','boots','main-hand','accessory']
DRAW_ORDER = ['cape-back','body','bottom','top','boots','gloves','cape-front','accessory','headwear','main-hand']
# область слота по высоте фигуры (доля от макушки до стоп) и порог разницы
ROI = {'headwear':(-0.05,0.20,28),'accessory':(0.14,0.30,14),'gloves':(0.30,0.66,28),'top':(0.14,0.58,28),
       'bottom':(0.40,0.74,28),'boots':(0.60,1.03,28),'cape':(0.10,0.90,28),'main-hand':(0.45,0.92,28)}
GREY_OK = {'headwear','main-hand','accessory'}   # вещи, которые сами могут быть серыми/серебряными
NO_SKIN = {'cape','top','accessory','bottom'}

def grey(a):
    mx=a.max(2); mn=a.min(2); l=a.mean(2)
    return ((mx-mn)<18)&(l>110)&(l<228)
def ink(a): return (255-a.min(2))>25
def skin(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    return (r>g+6)&(r>b+12)&(g>b-4)&(r>150)&((r-b)<80)
def warp(a,s,dx,dy,border=255):
    M=np.float32([[s,0,(1-s)*W/2+dx],[0,s,(1-s)*H/2+dy]])
    bv=(border,)*3 if a.ndim==3 else border
    return cv2.warpAffine(a,M,(W,H),flags=cv2.INTER_LINEAR,borderValue=bv)
def iou(a,b): return float((a&b).sum()/max(1,(a|b).sum()))
def load(p): return np.asarray(Image.open(p).convert('RGB').resize((W,H),Image.LANCZOS)).astype(np.float32)

def align(a,MG):
    g=grey(a).astype(np.float32); best=None
    for s in np.arange(0.94,1.061,0.005):
        (dx,dy),_=cv2.phaseCorrelate(warp(g,s,0,0,0),MG)
        sc=iou(warp(g,s,dx,dy,0)>0.5,MG>0.5)
        if best is None or sc>best[0]: best=(sc,float(s),float(dx),float(dy))
    return best
def foreground(a):
    bgc=a.min(2)>246
    lab,_=nd.label(bgc); border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
    return ~np.isin(lab,list(border))
def defringe(rgb,m):
    """эрозия 1px + деконтаминация края: цвет краевых пикселей берётся из внутренней части слоя"""
    m=nd.binary_erosion(m,iterations=1)
    inner=nd.binary_erosion(m,iterations=2).astype(np.float32)
    k=(9,9)
    num=cv2.blur(rgb*inner[...,None],k); den=cv2.blur(inner,k)[...,None]
    fill=np.where(den>1e-3,num/np.maximum(den,1e-3),rgb)
    edge=m&(inner<0.5)
    out=rgb.copy(); out[edge]=fill[edge]
    alpha=cv2.GaussianBlur(m.astype(np.float32),(3,3),0.7)*255
    alpha[~nd.binary_dilation(m)]=0
    return out.clip(0,255).astype(np.uint8),alpha.astype(np.uint8),m

def checker(w,h,c=12):
    im=Image.new('RGBA',(w,h),(255,255,255,255)); d=ImageDraw.Draw(im)
    for y in range(0,h,c):
        for x in range(0,w,c):
            if (x//c+y//c)%2: d.rectangle([x,y,x+c-1,y+c-1],fill=(205,205,205,255))
    return im

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('body'); ap.add_argument('--config')
    ap.add_argument('--teen',action='store_true'); args=ap.parse_args()
    B=args.body; cfg=json.load(open(args.config)) if args.config else {}
    roi=dict(ROI); roi.update({k:tuple(v) for k,v in cfg.get('roi',{}).items()})
    grey_ok=GREY_OK|set(cfg.get('grey_ok',[]))
    for d in ('dressed','layers'): os.makedirs(f'{B}/{d}',exist_ok=True)
    man=load(f'{B}/maneken.png'); MI=ink(man); MG=grey(man).astype(np.float32)
    ys=np.where(MI.any(1))[0]; Y0,Y1=int(ys.min()),int(ys.max()); FH=Y1-Y0
    xs=np.where(MI.any(0))[0]; X0,X1=int(xs.min()),int(xs.max()); CX=(X0+X1)//2
    body=nd.binary_fill_holes(MI)
    stats={}; layers={}
    for slot in SLOTS:
        f=(glob.glob(f'{B}/src/{slot}.*') or [None])[0]
        if not f: continue
        a=load(f); b0=iou(grey(a),MG>0.5); sc,s,dx,dy=align(a,MG)
        A=warp(a,s,dx,dy).astype(np.float32)
        Image.fromarray(A.astype(np.uint8)).save(f'{B}/dressed/{slot}.jpg',quality=90)
        y0,y1,thr=roi[slot]
        R=np.zeros((H,W),bool); R[max(0,int(Y0+y0*FH)):min(H,int(Y0+y1*FH))]=True
        if slot=='accessory': R[:,:CX-int(0.06*FH)]=False; R[:,CX+int(0.06*FH):]=False
        if slot=='main-hand': R[:,CX:]=False          # правая рука персонажа = левая сторона кадра
        diff=np.abs(A-man).max(2)
        bright=(A.min(2)>236)&(A.min(2)>man.mean(2)+8)&MI   # белые вещи на светлом теле
        m=R&((diff>thr)|bright|(~MI&foreground(A)))   # на теле хватает разницы с манекеном; вне тела — всё, что не фон
        if slot in NO_SKIN: m&=~skin(A)
        if slot not in grey_ok: m&=~(grey(A)&(diff<32))   # убрать полоски тела (ноги под подолом и т.п.)
        if slot not in ('accessory','main-hand'): m=nd.binary_opening(m,iterations=1)
        lab,n=nd.label(m); szs=nd.sum(m,lab,range(1,n+1)); mn=20 if slot=='accessory' else (250 if slot=='main-hand' else 120)
        keep=[i+1 for i,v in enumerate(szs) if v>=mn]
        m=np.isin(lab,keep); m=nd.binary_closing(m,iterations=8 if slot in ('top','bottom') else 3); m=nd.binary_fill_holes(m)
        if slot in ('top','bottom'): m&=R&~(skin(A)&~skin(man)==False)&foreground(A) if False else m&R
        rgb,alpha,m=defringe(A,m)
        rgba=np.dstack([rgb,alpha]); Image.fromarray(rgba,'RGBA').save(f'{B}/layers/layer-{slot}.png')
        layers[slot]=rgba
        if slot=='cape':
            front=m&nd.binary_dilation(body,iterations=2)
            for name,mm in (('cape-front',front),('cape-back',m&~front)):
                al=alpha.copy(); al[~nd.binary_dilation(mm)]=0
                r2=np.dstack([rgb,al]); Image.fromarray(r2,'RGBA').save(f'{B}/layers/layer-{name}.png'); layers[name]=r2
        stats[slot]=dict(src=os.path.basename(f),overlap_before=round(b0,3),overlap_after=round(sc,3),
                         scale=round(s,3),dx=round(dx,1),dy=round(dy,1),layer_px=int(m.sum()))
        print(slot,stats[slot])
    def bbox(rgba):
        al=rgba[...,3]>8
        if not al.any(): return None
        yy,xx=np.where(al); return [int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())]
    # точка хвата правой руки: центр кисти (кожа) слева от центра в нижней половине рук
    sk=skin(man)&MI; sk[:, CX:]=False; sk[:Y0+int(0.45*FH)]=False; sk[Y0+int(0.75*FH):]=False
    gy,gx=np.where(sk); grip=[int(gx.mean()),int(gy.mean())] if len(gx) else None
    sk2=skin(man)&MI; sk2[:, :CX]=False; sk2[:Y0+int(0.45*FH)]=False; sk2[Y0+int(0.75*FH):]=False
    oy,ox=np.where(sk2); off=[int(ox.mean()),int(oy.mean())] if len(ox) else None
    anchors=dict(canvas=[W,H],body=os.path.basename(os.path.abspath(B)),teen=bool(args.teen),
        engine_scale=0.88 if args.teen else 1.0,figure_bbox=[X0,Y0,X1,Y1],
        draw_order=DRAW_ORDER,
        grips=dict(main_hand=grip,off_hand=off,note='main_hand = правая рука персонажа (левая сторона кадра)'),
        layers={k:dict(file=f'layers/layer-{k}.png',bbox=bbox(v)) for k,v in layers.items()},
        maneken='maneken.png')
    json.dump(anchors,open(f'{B}/anchors.json','w'),ensure_ascii=False,indent=1)
    json.dump(stats,open(f'{B}/stats.json','w'),ensure_ascii=False,indent=1)
    # сборка
    def compose(bg):
        c=Image.new('RGBA',(W,H),bg)
        for k in DRAW_ORDER:
            if k=='body':
                bodyrgba=np.dstack([man.astype(np.uint8),(nd.binary_fill_holes(MI)*255).astype(np.uint8)])
                c.alpha_composite(Image.fromarray(bodyrgba,'RGBA'))
            elif k in layers: c.alpha_composite(Image.fromarray(layers[k],'RGBA'))
            elif k=='cape-front' and 'cape' in layers and 'cape-back' not in layers:
                c.alpha_composite(Image.fromarray(layers['cape'],'RGBA'))
        return c.convert('RGB')
    compose((255,255,255,255)).save(f'{B}/full-outfit.png')
    compose((0x1a,0x22,0x36,255)).save(f'{B}/full-outfit-dark.png')
    # overview
    w,h,lab=288,384,26; o=Image.new('RGB',(w*10,(h+lab)*2),'white'); d=ImageDraw.Draw(o)
    o.paste(Image.open(f'{B}/maneken.png').convert('RGB').resize((w,h)),(0,lab)); d.text((6,6),'maneken',fill='black')
    for i,s in enumerate(SLOTS):
        if s not in layers: continue
        o.paste(Image.open(f'{B}/dressed/{s}.jpg').resize((w,h)),((i+1)*w,lab)); d.text(((i+1)*w+6,6),s,fill='black')
        cb=checker(w,h); cb.alpha_composite(Image.fromarray(layers[s],'RGBA').resize((w,h)))
        o.paste(cb.convert('RGB'),(i*w,h+2*lab)); d.text((i*w+6,h+lab+6),'layer-'+s,fill='black')
    o.paste(Image.open(f'{B}/full-outfit.png').resize((w,h)),(8*w,h+2*lab)); d.text((8*w+6,h+lab+6),'full-outfit',fill='black')
    o.paste(Image.open(f'{B}/full-outfit-dark.png').resize((w,h)),(9*w,h+2*lab)); d.text((9*w+6,h+lab+6),'on #1a2236',fill='black')
    o.save(f'{B}/overview.png')
if __name__=='__main__': main()
