import cv2,numpy as np,json
P=json.load(open('palette.json')); MID=P['mid']
def hx(h): return np.array([int(h[i:i+2],16) for i in (1,3,5)],np.float32)/255
def recolor(g,dm,c):
  C=hx(c['hex']); k=c['contrast']; d=(g/MID-1)[...,None]
  o=np.where(d<0,C*(1+d*k),C+(1-C)*d*k*0.8)
  D=C*c['detail']; od=np.where(d<0,D*(1+d*k),D+(1-D)*d*k*0.5)
  o=o*(1-dm[...,None])+od*dm[...,None]
  l=c.get('lift',0); o=l+o*(1-l)
  return np.clip(o,0,1)
for n in ['girl','boy']:
  t=json.load(open(f'hoodie-{n}.trim.json')); x,y,w,h=t['x'],t['y'],t['w'],t['h']
  # crop region: head to hips
  y0=max(0,y-700); y1=y+h+150; x0=max(0,x-80); x1=x+w+80
  B=cv2.imread(f'base-{n}.png',cv2.IMREAD_UNCHANGED)[y0:y1,x0:x1].astype(np.float32)/255; b=B[...,2::-1]; ba=B[...,3:]
  G=cv2.imread(f'hoodie-{n}.gray.png',cv2.IMREAD_UNCHANGED)[y0:y1,x0:x1]
  g=G[...,0].astype(np.float32)/255; a=G[...,3].astype(np.float32)/255
  dm=cv2.imread(f'hoodie-{n}.details.png',0)[y0:y1,x0:x1].astype(np.float32)/255
  sc=360/(x1-x0); tiles=[]
  for bgc in ['#faf8f4','#121212']:
    row=[]
    for c in P['colors']:
      o=recolor(g,dm,c); A=a[...,None]; BG=hx(bgc)
      comp=BG*(1-ba)+b*ba; comp=comp*(1-A)+o*A
      im=cv2.resize((comp*255).astype(np.uint8),None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
      im=cv2.copyMakeBorder(im,0,40,0,0,cv2.BORDER_CONSTANT,value=(hx(bgc)*255).tolist())
      cv2.putText(im,c['id'],(10,im.shape[0]-12),cv2.FONT_HERSHEY_SIMPLEX,0.8,(120,120,120),2)
      row.append(im)
    tiles.append(np.hstack(row[:5])); tiles.append(np.hstack(row[5:]))
  cv2.imwrite(f'swatches-{n}.png',cv2.cvtColor(np.vstack(tiles),cv2.COLOR_RGB2BGR))
