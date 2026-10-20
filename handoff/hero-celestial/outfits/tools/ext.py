import cv2,numpy as np,json
from scipy import ndimage as nd
for n in ['girl','boy']:
  b=cv2.imread(f'base-{n}.orig.png')[...,:3]; r=cv2.imread(f'red-{n}.jpg'); H,W=b.shape[:2]
  M=np.float32(json.load(open(f'M-{n}.json')))
  # upsample red 4x first for smoother mask
  k=4; ru=cv2.resize(r,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
  hsv=cv2.cvtColor(ru,cv2.COLOR_BGR2HSV); h,s,v=[hsv[...,i].astype(int) for i in range(3)]
  red=((h<10)|(h>160))&(s>110)&(v>40)
  dark=(v<90)  # seam/outline lines
  red=nd.binary_opening(red,iterations=2)
  lab,nl=nd.label(red); sz=nd.sum(red,lab,range(1,nl+1)); red=np.isin(lab,1+np.where(sz>2000)[0])
  near=nd.binary_dilation(red,iterations=12)
  m=red|(dark&near)
  m=nd.binary_closing(m,iterations=6); m=nd.binary_fill_holes(m)
  # remove skin/hair that got in: skin hue 5-25 low-mid sat, high v
  skin=(h>=5)&(h<=25)&(s<150)&(v>150)&~red
  m&=~nd.binary_opening(skin,iterations=3)
  m=nd.binary_opening(m,iterations=2)
  lab,nl=nd.label(m); sz=nd.sum(m,lab,range(1,nl+1)); m=np.isin(lab,1+np.where(sz>20000)[0])
  a=cv2.GaussianBlur(m.astype(np.float32),(0,0),1.2)
  Mu=M.copy(); Mu[:,:2]/=k
  rgb=cv2.warpAffine(ru,Mu,(W,H),flags=cv2.INTER_CUBIC,borderValue=(255,255,255))
  al=cv2.warpAffine(a,Mu,(W,H),flags=cv2.INTER_LINEAR)
  # decontaminate: erode color edges toward inside by pulling from blurred-inside color
  al8=np.clip(al*255,0,255).astype(np.uint8)
  inner=(al>0.98).astype(np.uint8)
  # replace edge pixel colors with nearest inner color to avoid white fringe
  _,idx=nd.distance_transform_edt(1-inner,return_indices=True)
  edge=(al>0)&(al<0.98)
  rgb[edge]=rgb[idx[0][edge],idx[1][edge]]
  out=np.dstack([rgb,al8]); cv2.imwrite(f'hoodie-{n}.png',out)
  ys,xs=np.where(al8>0); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  cv2.imwrite(f'hoodie-{n}.trim.png',out[y0:y1,x0:x1])
  json.dump({'canvas':[W,H],'x':int(x0),'y':int(y0),'w':int(x1-x0),'h':int(y1-y0)},open(f'hoodie-{n}.trim.json','w'))
  # composite
  A=al8[...,None]/255.; comp=(b*(1-A)+rgb*A).astype(np.uint8); cv2.imwrite(f'preview-{n}.png',comp)
  # gray base poking out
  bh=cv2.cvtColor(b,cv2.COLOR_BGR2HSV)
  gray=(bh[...,1]<40)&(bh[...,2]>60)&(bh[...,2]<215)
  poke=gray&(al<0.5); poke=nd.binary_opening(poke,iterations=4)
  print(n,'trim',x0,y0,x1-x0,y1-y0,'poke px',poke.sum())
  dbg=comp.copy(); dbg[poke]=(255,0,255); cv2.imwrite(f'poke-{n}.jpg',cv2.resize(dbg,(683,1024)))

# --- доводка слоя (раньше делалась вручную, теперь часть сборки) ---
def finish(n):
  b=cv2.imread(f'base-{n}.orig.png')[...,:3]; L=cv2.imread(f'hoodie-{n}.png',cv2.IMREAD_UNCHANGED)
  # 1) волосы базы лежат поверх капюшона: вырезаем их и остатки «нарисованных» волос
  hb=cv2.cvtColor(b,cv2.COLOR_BGR2HSV).astype(int)
  hair=(hb[...,0]<=25)&(hb[...,1]>70)&(hb[...,2]<180); hair[2400:]=False
  hair=nd.binary_dilation(nd.binary_opening(hair,iterations=2),iterations=2)
  hl=cv2.cvtColor(L[...,:3],cv2.COLOR_BGR2HSV).astype(int)
  brown=(hl[...,0]>=8)&(hl[...,0]<=30)&(hl[...,2]<170); brown[2400:]=False
  kill=nd.binary_opening(hair|brown,iterations=2)
  L[...,3]=(L[...,3]*cv2.GaussianBlur((~kill).astype(np.float32),(0,0),1.5)).astype(np.uint8)
  # 2) вверху оставляем только красное, затем самый крупный кусок
  hl=cv2.cvtColor(L[...,:3],cv2.COLOR_BGR2HSV).astype(int)
  redish=((hl[...,0]<=8)|(hl[...,0]>=165))&(hl[...,1]>120); keep=L[...,3]>0
  bad=keep&~redish; bad[1900:]=False
  bad=nd.binary_dilation(nd.binary_opening(bad,iterations=1),iterations=3)
  k2=keep&~bad; lab,_=nd.label(k2); sz=nd.sum(k2,lab,range(1,lab.max()+1))
  k2=np.isin(lab,1+np.argmax(sz))|np.isin(lab,1+np.where(sz>50000)[0])
  L[...,3]=(L[...,3]*cv2.GaussianBlur(k2.astype(np.float32),(0,0),1.2)).astype(np.uint8)
  # 3) заливка щелей внутри толстовки (иначе база просвечивает полосой)
  a=L[...,3]; f=nd.binary_fill_holes(nd.binary_closing(a>128,iterations=4)); hole=f&(a<250)
  _,idx=nd.distance_transform_edt(~(a>240),return_indices=True)
  for c in range(3): ch=L[...,c]; ch[hole]=ch[idx[0][hole],idx[1][hole]]
  L[...,3]=np.maximum(a,(cv2.GaussianBlur(f.astype(np.float32),(0,0),1.0)*255).astype(np.uint8))
  cv2.imwrite(f'hoodie-{n}.png',L)
  ys,xs=np.where(L[...,3]>0); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  cv2.imwrite(f'hoodie-{n}.trim.png',L[y0:y1,x0:x1])
  json.dump({'canvas':[4096,6144],'x':int(x0),'y':int(y0),'w':int(x1-x0),'h':int(y1-y0)},open(f'hoodie-{n}.trim.json','w'))
  A=L[...,3:]/255.; cv2.imwrite(f'preview-{n}.png',(b*(1-A)+L[...,:3]*A).astype(np.uint8))
for n in ['girl','boy']: finish(n)
