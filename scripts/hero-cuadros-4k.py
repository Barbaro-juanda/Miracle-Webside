import cv2, numpy as np, json, os, shutil
import importlib.util, sys
spec = importlib.util.spec_from_file_location("hero_matte", "scripts/hero-matte.py"); hm = importlib.util.module_from_spec(spec); spec.loader.exec_module(hm)
matte, RECT = hm.matte, hm.RECT
from scipy import ndimage as ndi
CROP = (840, 380, 3000, 1760)          # x0,y0,x1,y1 en 4K
cw, ch = CROP[2]-CROP[0], CROP[3]-CROP[1]
cap = cv2.VideoCapture('up.mp4'); frames=[]
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
print('cuadros', len(frames))
N = 90
pick = [round(i*(len(frames)-1)/(N-1)) for i in range(N)]
shutil.rmtree('out', ignore_errors=True)
for d in ('d','m'): os.makedirs(f'out/{d}')
from PIL import Image
def save(rgba, path, w, q):
    h = round(w*ch/cw)
    # reducción con filtro de área sobre color premultiplicado (sin franjas en el borde)
    a = rgba[...,3:4].astype(np.float32)/255
    pm = np.dstack([rgba[...,:3].astype(np.float32)*a, a*255])
    pm = cv2.resize(pm, (w,h), interpolation=cv2.INTER_AREA)
    aa = np.clip(pm[...,3:4]/255, 1e-4, 1)
    col = np.clip(pm[...,:3]/aa, 0, 255)
    out = np.dstack([col, pm[...,3]]).astype(np.uint8)
    Image.fromarray(out,'RGBA').save(path,'WEBP',quality=q,alpha_quality=92,method=6)
last=None
for k,i in enumerate(pick):
    rgba,_ = matte(frames[i])
    x0,y0,x1,y1 = RECT
    full = np.zeros((2160,3840,4),np.uint8); full[y0:y1,x0:x1]=rgba
    crop = full[CROP[1]:CROP[3], CROP[0]:CROP[2]]
    n = f'{k+1:03d}.webp'
    wd = 2160 if k==N-1 else 1400
    save(crop, f'out/d/{n}', wd, 80 if k==N-1 else 72)
    save(crop, f'out/m/{n}', 800, 70)
    if k==N-1: last=(crop, frames[i])
    if k%15==0: print('ok',k+1)
# pantalla: región azul marino dentro de la tapa (último cuadro, 4K)
crop,fr = last
rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB).astype(np.int32)
lum = (rgb[...,0]*.3+rgb[...,1]*.59+rgb[...,2]*.11)
scr = (lum<60)&(rgb[...,2]>rgb[...,0]+6)
scr[:600]=False; scr[1500:]=False
lab,n = ndi.label(scr); c = lab[950,1920]
ys,xs = np.where(lab==c)
x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
print('pantalla 4K', x0,y0,x1,y1)
sx,sy,sw,sh = (x0-CROP[0])/cw*100, (y0-CROP[1])/ch*100, (x1-x0)/cw*100, (y1-y0)/ch*100
laptop = (2952-888)/cw
info = {"count":N,"ratio":round(cw/ch,4),"screen":{"x":round(sx,2),"y":round(sy,2),"w":round(sw,2),"h":round(sh,2)},"laptop":round(laptop,3),"source":"portatil.mp4 (4K, Topaz)"}
json.dump(info, open('out/frames.json','w'), indent=2); print(info)

# Los primeros cuadros del video traen otro brillo de fondo y el recorte genera una mancha: se usa el primer cuadro limpio.
import PIL.Image as _I
for i in range(2, 12):
    a = np.asarray(_I.open(f'out/d/{i:03d}.webp').convert('RGBA'))[..., 3]
    if ((a > 10) & (a < 200)).mean() > 0.02 or (a > 10).mean() > 0.3:
        for d in ('d', 'm'): shutil.copy(f'out/{d}/001.webp', f'out/{d}/{i:03d}.webp')
