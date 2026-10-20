import cv2,numpy as np,json
from scipy import ndimage as nd
for n in ['girl','boy']:
  L=cv2.imread(f'hoodie-{n}.png',cv2.IMREAD_UNCHANGED).astype(np.float32)/255
  a=L[...,3]; rgb=L[...,2::-1]
  # red cloth: use max channel (R) as shading proxy - luminance of red is dark/noisy
  Y=0.5*rgb[...,0]+0.35*rgb[...,1]+0.15*rgb[...,2]
  med=np.median(Y[a>0.9]); g=np.clip(Y/med*0.82,0,1)
  out=np.dstack([g,g,g,a]); o8=(out*255+.5).astype(np.uint8)
  cv2.imwrite(f'hoodie-{n}.gray.png',cv2.cvtColor(o8,cv2.COLOR_RGBA2BGRA))
  t=json.load(open(f'hoodie-{n}.trim.json')); x,y,w,h=t['x'],t['y'],t['w'],t['h']
  cv2.imwrite(f'hoodie-{n}.gray.trim.png',cv2.cvtColor(o8[y:y+h,x:x+w],cv2.COLOR_RGBA2BGRA))
  # details: dark thin lines (blackhat) + drawstrings/ribbing via strong local texture
  gs=cv2.GaussianBlur(g,(0,0),1.5)
  bh=cv2.morphologyEx(gs,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
  d=np.clip((bh-0.06)/0.10,0,1)
  # outline: inner rim of alpha
  rim=np.clip(cv2.GaussianBlur((a>0.5).astype(np.float32),(0,0),6)*-2+2 ,0,1)*(a>0.5)
  d=np.maximum(d,rim*0.9)
  d=cv2.GaussianBlur(d,(0,0),1.0)*a
  m=(d*255+.5).astype(np.uint8)
  cv2.imwrite(f'hoodie-{n}.details.png',m); cv2.imwrite(f'hoodie-{n}.details.trim.png',m[y:y+h,x:x+w])
  print(n,'med',med,'detail cover',(d>0.5).sum()/(a>0.5).sum())
