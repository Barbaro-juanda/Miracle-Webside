"""Recorte limpio del portátil sobre el degradado azul del video (ya en 4K).
1) El fondo se ajusta con un polinomio a partir de un anillo alrededor del portátil (el degradado es suave).
2) La transparencia sale de la diferencia con ese fondo, a alta resolución, con una rampa estrecha (bordes lisos).
3) En los bordes se quita el tinte del fondo (C = (P - (1-a)B)/a) y se usa el color del interior cercano: sin halo.
4) Se reduce después, con filtro de área."""
import numpy as np, cv2
from scipy import ndimage as ndi

RECT = (800, 330, 3040, 1830)   # x0, y0, x1, y1 en el cuadro 4K: encierra el portátil (abierto o cerrado) y su sombra

def feats(x, y, deg=5):
    cols = []
    for i in range(deg + 1):
        for j in range(deg + 1 - i):
            cols.append((x ** i) * (y ** j))
    return np.stack(cols, -1)

def fit_bg(img):
    h, w = img.shape[:2]
    x0, y0, x1, y1 = RECT
    ring = 170
    yy, xx = np.mgrid[0:h:6, 0:w:6]
    inside = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    near = (xx >= x0 - ring) & (xx < x1 + ring) & (yy >= y0 - ring) & (yy < y1 + ring)
    sel = near & ~inside
    xn = (xx[sel] / w) * 2 - 1; yn = (yy[sel] / h) * 2 - 1
    A = feats(xn, yn)
    gy, gx = np.mgrid[y0:y1, x0:x1]
    B = feats((gx / w) * 2 - 1, (gy / h) * 2 - 1).reshape(-1, A.shape[1])
    bg = np.zeros((y1 - y0, x1 - x0, 3), np.float32)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, img[yy[sel], xx[sel], c], rcond=None)
        bg[..., c] = (B @ coef).reshape(y1 - y0, x1 - x0)
    return bg

def matte(img_bgr):
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    x0, y0, x1, y1 = RECT
    patch = img[y0:y1, x0:x1]
    bg = fit_bg(img)
    d = np.linalg.norm(patch - bg, axis=2)
    d = cv2.GaussianBlur(d, (0, 0), .8)
    a_raw = np.clip((d - 12.0) / (30.0 - 12.0), 0, 1)
    a_raw = a_raw * a_raw * (3 - 2 * a_raw)
    solid = ndi.binary_fill_holes(a_raw > .5)
    solid = ndi.binary_opening(solid, iterations=3)
    lab, n = ndi.label(solid)
    if n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1)); solid = lab == (1 + int(np.argmax(sizes)))
    inner = ndi.binary_erosion(solid, iterations=6)
    alpha = np.where(inner, 1.0, a_raw)
    alpha = np.where(ndi.binary_dilation(solid, iterations=60), alpha, 0)   # deja la sombra de contacto, nada más lejos
    a3 = np.clip(alpha, 1e-3, 1)[..., None]
    col = np.where(alpha[..., None] < .995, (patch - (1 - a3) * bg) / a3, patch)
    col = np.clip(col, 0, 255)
    ext = ndi.binary_erosion(alpha > .98, iterations=2)
    idx = ndi.distance_transform_edt(~ext, return_distances=False, return_indices=True)
    nearc = col[idx[0], idx[1]]
    fix = (alpha < .98) & (alpha > .02)
    t = np.clip((alpha - .02) / .5, 0, 1)[..., None]
    col = np.where(fix[..., None] & (~solid[..., None] | (alpha[..., None] < .98)), col * t + nearc * (1 - t), col)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    return rgba, solid
