# Прозрачный фон для баз: заливка белого от края холста + анмикс краёв против белого.
import cv2,numpy as np,json
from scipy import ndimage as nd
for n in ['girl','boy']:
  b=cv2.imread(f'base-{n}.orig.png')[...,:3].astype(np.float32)
  mn=b.min(2); mx=b.max(2)
  w=(mn>=246)&(mx-mn<8)
  lab,_=nd.label(w); ids=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
  bg=np.isin(lab,list(ids))
  # enclosed pure-white regions large enough and outside face are bg too (none found now, kept for robustness)
  sz=nd.sum(w,lab,range(1,lab.max()+1))
  hsv=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int)
  hair=(hsv[...,2]<190)&(hsv[...,1]>40)
  skin=(hsv[...,2]>=200)&(hsv[...,1]>12)&~w
  obj=nd.find_objects(lab); enc=[]
  for i in range(len(sz)):
    if (i+1) in ids or sz[i]<100: continue
    sl=tuple(slice(max(0,q.start-6),q.stop+6) for q in obj[i])
    m=lab[sl]==i+1; ring=nd.binary_dilation(m,iterations=5)&~nd.binary_dilation(m,iterations=1)
    hf=hair[sl][ring].mean(); sf=skin[sl][ring].mean()
    iris=(hsv[sl][...,2]<80)[ring].mean()
    if iris<0.2: continue
    if hf>0.6 and sf<0.08: enc.append(i+1); print("  enc",n,int(sz[i]),obj[i][0].start,obj[i][1].start,round(hf,2),round(sf,2))
  bg|=np.isin(lab,enc)
  R=4
  inner=~nd.binary_dilation(bg,iterations=R)
  band=~bg&~inner
  _,idx=nd.distance_transform_edt(~inner,return_indices=True)
  F=b[idx[0],idx[1]]
  dC=255-b; dF=np.maximum(255-F,1)
  wgt=dF  # weight channels by contrast with white
  a=(dC*wgt).sum(2)/np.maximum((dF*wgt).sum(2),1)
  a=np.clip(a,0,1); a[inner]=1; a[bg]=0
  # pixels in band that are fully opaque by estimate keep their own color
  a8=(a*255+.5).astype(np.uint8)
  A=np.maximum(a,1e-3)[...,None]
  col=np.clip((b-255*(1-A))/A,0,255)
  col=np.where((a>0.98)[...,None]|inner[...,None],b,np.where(band[...,None],col,b))
  out=np.dstack([col.astype(np.uint8),a8])
  cv2.imwrite(f'base-{n}.png',out)
  ys,xs=np.where(a8>0);x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  cv2.imwrite(f'base-{n}.trim.png',out[y0:y1,x0:x1])
  json.dump({'canvas':[4096,6144],'x':int(x0),'y':int(y0),'w':int(x1-x0),'h':int(y1-y0)},open(f'base-{n}.trim.json','w'))
  print(n,x0,y0,x1-x0,y1-y0,'enclosed',len(enc))
