import cv2,numpy as np,json
for n in ['girl','boy']:
  b=cv2.imread(f'base-{n}.orig.png')[...,:3]; r=cv2.imread(f'red-{n}.jpg')
  def bb(im):
    ys,xs=np.where(im.min(2)<235); return xs.min(),xs.max(),ys.min(),ys.max()
  B=bb(b);R=bb(r)
  s=(B[3]-B[2])/(R[3]-R[2]); cx=(B[0]+B[1])/2-s*(R[0]+R[1])/2; ty=B[2]-s*R[2]
  # ECC at 1/4 scale, using non-red pixels (mask out red)
  k=4; bs=cv2.resize(b,(1024,1536),interpolation=cv2.INTER_AREA)
  M0=np.float32([[s/k,0,cx/k],[0,s/k,ty/k]])
  hsv=cv2.cvtColor(r,cv2.COLOR_BGR2HSV)
  red=((hsv[...,0]<12)|(hsv[...,0]>165))&(hsv[...,1]>90)
  rw=cv2.warpAffine(r,M0,(1024,1536),borderValue=(255,255,255))
  g1=cv2.cvtColor(bs,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
  g2=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
  # ECC: template base, input red -> find warp mapping base coords to red coords
  Minv=cv2.invertAffineTransform(M0).astype(np.float32)
  msk=cv2.warpAffine((~red).astype(np.uint8)*255,M0,(1024,1536))
  msk=cv2.erode(msk,np.ones((9,9)))
  msk2=cv2.erode((~red).astype(np.uint8)*255,np.ones((5,5)))
  try:
    _,W=cv2.findTransformECC(g1,g2,Minv,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),msk2,5)
    print(n,'ecc ok',W)
  except Exception as e: print('ecc fail',e); W=Minv
  M=cv2.invertAffineTransform(W); M[:,:2]*=k; M[:,2]*=k  # red->base full res
  print(n,'s0',s,'M',M.tolist())
  json.dump(M.tolist(),open(f'M-{n}.json','w'))
