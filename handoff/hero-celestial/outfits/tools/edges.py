import cv2,numpy as np,sys
import sys
crops={'girl':[(1250,700),(700,2950),(2900,2950),(1500,5550),(1850,4300)],'boy':[(1250,250),(900,2700),(2750,2700),(1500,5600),(1850,3800)]}
rows=[]
for n in ['girl','boy']:
  L=cv2.imread(f'base-{n}.png',cv2.IMREAD_UNCHANGED).astype(np.float32); A=L[...,3:]/255
  bg=np.array([18,18,18],np.float32); c=(L[...,:3]*A+bg*(1-A)).astype(np.uint8)
  rows.append(np.hstack([c[y:y+500,x:x+500] for x,y in crops[n]]))
cv2.imwrite(sys.argv[1],np.vstack(rows))
