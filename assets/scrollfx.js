/* Subpáginas: las ilustraciones responden al scroll (--p de 0 a 1), el riel de neón marca el avance de la página,
   y las tarjetas y figuras reaccionan al puntero (foco de luz e inclinación suave). Sin dependencias y sin forzar el layout:
   una lectura por figura y por cuadro de animación. Con movimiento reducido no hace nada y todo se ve completo. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const root = document.documentElement;
  const figs = [...document.querySelectorAll('.fig')];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Riel de neón a la izquierda: se llena a medida que bajas por la página
  let rail = null;
  if (innerWidth >= 1200) {
    rail = document.createElement('div'); rail.className = 'sx-rail'; rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<i></i><b></b>'; document.body.appendChild(rail);
  }

  let ticking = false;
  const update = () => {
    ticking = false;
    const sy = scrollY, vh = innerHeight;
    root.style.setProperty('--sy', sy.toFixed(0));
    for (const f of figs) {
      const r = f.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top - r.height * .15) / (vh * .62)));
      f.style.setProperty('--p', p.toFixed(3));
      f.classList.toggle('act', p > .08 && p < .999 && r.top < vh && r.bottom > 0);
    }
    if (rail) {
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      rail.style.setProperty('--prog', Math.min(1, sy / max).toFixed(4));
    }
  };
  const tick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', tick, {passive: true});
  addEventListener('resize', tick);
  addEventListener('load', tick);
  update();

  // Puntero: foco de luz que sigue al cursor e inclinación 3D suave
  if (fine) {
    const SEL = '.sec-card,.also-card,.plan,.fig,.xtile';
    let cur = null;
    const reset = el => { if (el) { el.style.transform = ''; } };
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest(SEL);
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el) return;
      cur = el;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      const k = el.classList.contains('fig') ? 4 : 6;
      el.style.transform = `perspective(900px) rotateX(${((.5 - y) * k).toFixed(2)}deg) rotateY(${((x - .5) * k).toFixed(2)}deg) translateZ(0)`;
    }, {passive: true});
    document.addEventListener('pointerleave', () => { reset(cur); cur = null; }, true);
    // El encabezado reacciona al puntero: la aurora se desplaza un poco
    document.querySelectorAll('.sub-hero').forEach(h => {
      h.addEventListener('pointermove', e => {
        const r = h.getBoundingClientRect();
        h.style.setProperty('--hx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
        h.style.setProperty('--hy', ((e.clientY - r.top) / r.height - .5).toFixed(3));
      }, {passive: true});
    });
  }
})();

/* Recorridos interactivos: pasos que se eligen (.stp), camino que se llena al bajar (.zz) y selector de caso (.rmx).
   Funcionan también con movimiento reducido: solo se detienen los avances automáticos. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pruébalo: el panel queda fijo y el paso cambia según cuánto se haya bajado por la sección
  const stps = [...document.querySelectorAll('[data-stp]')];
  stps.forEach(root => {
    const tabs = [...root.querySelectorAll('.stp-n')], panels = [...root.querySelectorAll('.stp-p')];
    const pin = root.querySelector('.stp-pin');
    let cur = -1;
    const set = i => {
      if (i === cur) return; cur = i;
      tabs.forEach((t, k) => { t.classList.toggle('on', k === cur); t.classList.toggle('done', k < cur); });
      panels.forEach((p, k) => p.classList.toggle('on', k === cur));
      root.style.setProperty('--sp', (cur / (tabs.length - 1)).toFixed(3));
    };
    root.__upd = () => {
      if (reduce) { set(tabs.length - 1); return; }
      const r = root.getBoundingClientRect(), run = Math.max(1, r.height - pin.offsetHeight - 104);
      const p = Math.min(1, Math.max(0, (104 - r.top) / run));
      set(Math.min(tabs.length - 1, Math.floor(p * tabs.length * .999)));
    };
    root.__upd();
  });

  // Planes: cada paso de la hoja de ruta se enciende al llegar a él
  const flows = [...document.querySelectorAll('[data-flowscroll] .rmx-flow')];

  const zzs = [...document.querySelectorAll('[data-zz]')];
  if (zzs.length || stps.length || flows.length) {
    const upd = () => {
      const vh = innerHeight, mark = vh * .55;
      stps.forEach(r => r.__upd());
      flows.forEach(f => {
        const cs = [...f.querySelectorAll('.rmx-c')], as = [...f.querySelectorAll('.rmx-a')];
        cs.forEach((c, k) => { const on = c.getBoundingClientRect().top < vh * .8; c.classList.toggle('lit', on); if (as[k]) as[k].classList.toggle('lit', on); });
      });
      zzs.forEach(z => {
        const r = z.getBoundingClientRect();
        z.style.setProperty('--zp', Math.min(1, Math.max(0, (mark - r.top) / r.height)).toFixed(3));
        z.querySelectorAll('.zz-s').forEach(s => s.classList.toggle('lit', s.getBoundingClientRect().top + 44 < mark));
      });
    };
    let tk = false;
    const on = () => { if (!tk) { tk = true; requestAnimationFrame(() => { tk = false; upd(); }); } };
    addEventListener('scroll', on, {passive: true}); addEventListener('resize', on); upd();
  }
})();
