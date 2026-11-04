"""Quita el fondo azul de los cuadros del portátil (assets/hero/d y m) y deja el portátil con transparencia.
Uso: python3 -m venv kv && kv/bin/pip install pillow numpy scipy && kv/bin/python scripts/hero-quitar-fondo.py (ver bloque final)
Después de scripts/hero-frames.mjs hay que volver a correrlo: ese script escribe cuadros con fondo."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
def key(path_in, path_out=None, thr=(28,20,100), check=None):
    im = Image.open(path_in).convert('RGB'); a = np.asarray(im).astype(np.float32)
    r,g,b = a[...,0],a[...,1],a[...,2]
    lum = .3*r+.59*g+.11*b
    navy = ((b-r) > thr[0]) & ((b-g) > thr[1]) & (lum < thr[2])
    # sólo el fondo conectado con los bordes (el interior de la pantalla del portátil se conserva)
    lab, n = ndi.label(navy)
    edge = set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # borde suave de ~1.2 px, sin halo oscuro: se achica un poco el fondo antes de suavizar
    m = ndi.gaussian_filter(ndi.binary_dilation(bg, iterations=1).astype(np.float32), 0.9)
    alpha = np.clip(1 - m, 0, 1)
    out = np.dstack([a, alpha*255]).astype(np.uint8)
    res = Image.fromarray(out, 'RGBA')
    if path_out: res.save(path_out, 'WEBP', quality=82, alpha_quality=90, method=5)
    if check:
        mag = Image.new('RGBA', res.size, (255,0,200,255)); mag.alpha_composite(res); mag.convert('RGB').save(check)
    return bg.mean()
if __name__=='__main__':
    import glob
    for d in ['d','m']:
        for f in sorted(glob.glob(f'assets/hero/{d}/*.webp')):
            key(f, f)
    print('Listo: cuadros con transparencia')
