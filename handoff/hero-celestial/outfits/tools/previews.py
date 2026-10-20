# Превью баз (+ красная толстовка) на светлом и тёмном фоне.
import cv2,numpy as np
for n in ['girl','boy']:
  B=cv2.imread(f'base-{n}.png',-1).astype(np.float32)/255; L=cv2.imread(f'hoodie-{n}.png',-1).astype(np.float32)/255
  out=[]
  for bg in [(0xf4,0xf8,0xfa),(0x12,0x12,0x12)]:
    c=np.array(bg,np.float32)/255; c=c*(1-B[...,3:])+B[...,:3]*B[...,3:]
    out.append(c); out.append(c*(1-L[...,3:])+L[...,:3]*L[...,3:])
  im=np.hstack([cv2.resize(x,(1024,1536),interpolation=cv2.INTER_AREA) for x in out])
  cv2.imwrite(f'preview-{n}.png',(im*255).astype(np.uint8))
