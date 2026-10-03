"""Measure the canonical alpha silhouette and write SVG geometry, not edited images."""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image
from collections import deque

root=Path(__file__).resolve().parents[1]
image=Image.open(root/'studio/public/ip/cat-sit-neutral.png')
mask=np.array(image.getchannel('A'))[::4,::4]>128
seen=np.zeros(mask.shape,bool); largest=[]
dirs=[(-1,-1),(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1)]
for sy,sx in np.argwhere(mask):
    if seen[sy,sx]: continue
    component=[]; q=deque([(int(sy),int(sx))]); seen[sy,sx]=True
    while q:
        y,x=q.popleft(); component.append((y,x))
        for dy,dx in dirs:
            yy,xx=y+dy,x+dx
            if 0<=yy<mask.shape[0] and 0<=xx<mask.shape[1] and mask[yy,xx] and not seen[yy,xx]:
                seen[yy,xx]=True; q.append((yy,xx))
    if len(component)>len(largest): largest=component
clean=np.zeros_like(mask)
for y,x in largest: clean[y,x]=True
start=min(largest); p=start; back=(start[0],start[1]-1); points=[]; first=None
for count in range(mask.size*4):
    points.append([p[1]*4,p[0]*4])
    relative=(back[0]-p[0],back[1]-p[1]); k=dirs.index(relative) if relative in dirs else 7
    for j in range(1,9):
        n=(k+j)%8; dy,dx=dirs[n]; trial=(p[0]+dy,p[1]+dx)
        if 0<=trial[0]<clean.shape[0] and 0<=trial[1]<clean.shape[1] and clean[trial]:
            prev=dirs[(n-1)%8]; new_back=(p[0]+prev[0],p[1]+prev[1]); break
    if first is None: first=trial
    elif p==start and trial==first: break
    p,back=trial,new_back
else: raise RuntimeError('Contour did not close')

def simplify(points,eps=2.4):
    if len(points)<3:return points
    a=np.array(points[0]); b=np.array(points[-1]); v=b-a
    ds=[abs(v[0]*(p[1]-a[1])-v[1]*(p[0]-a[0]))/np.linalg.norm(v) if np.linalg.norm(v) else np.linalg.norm(np.array(p)-a) for p in points]
    idx=int(np.argmax(ds))
    if ds[idx]>eps:return simplify(points[:idx+1],eps)[:-1]+simplify(points[idx:],eps)
    return [points[0],points[-1]]

# Start at the low left paw, so the body forms before the hair outline.
idx=min(range(len(points)),key=lambda i:(points[i][0]-220)**2+(points[i][1]-1050)**2)
points=points[idx:]+points[:idx]+[points[idx]]
points=simplify(points)
path='M '+' L '.join(f'{x} {y}' for x,y in points)+' Z'
out={'viewBox':1254,'silhouette':path,'sampleStep':4,'source':'ip/cat-sit-neutral.png','description':'Measured outer contour. Used as a reveal mask for original bitmap ink, never a replacement character.'}
(root/'studio/src/cat-geometry.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'points':len(points),'bounds':image.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox(),'output':'src/cat-geometry.json'}))
