/* Núcleo: se carga en todas las páginas (menú, cabecera, anclas y aparición al entrar en pantalla). */
(() => {
  const WA = '573004564592';
  const MAIL = 'dev@itsmiracleai.com';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.documentElement.classList.add('js');
  window.MZ = {$, $$, reduce, WA, MAIL};

  /* ---------- Header: tema según la sección que tiene debajo ---------- */
  const hdr = $('.hdr');
  const darkSecs = $$('[data-theme="dark"]');
  function headerTheme() {
    const y = 36;
    const onDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    hdr.classList.toggle('on-dark', onDark);
    hdr.classList.toggle('scrolled', scrollY > 8 && !onDark);
  }
  addEventListener('scroll', headerTheme, {passive:true}); headerTheme();

  // Las capas decorativas de fondo se detienen cuando su sección no está a la vista.
  const fxs = $$('.fx');
  if (fxs.length && 'IntersectionObserver' in window) { const iox = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('fx-off', !e.isIntersecting)), {rootMargin: '200px 0px'}); fxs.forEach(f => iox.observe(f)); }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '') || !u.hash || u.hash === '#') return;
    const el = document.getElementById(decodeURIComponent(u.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
    history.pushState(null, '', u.hash);
  });

  const menuBtn = $('.menu-btn'), mnav = $('#mnav');
  const setMenu = open => { mnav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); };
  menuBtn.addEventListener('click', () => setMenu(!mnav.classList.contains('open')));
  mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Aparición al entrar en pantalla (páginas sin GSAP) */
  const reveals = $$('[data-reveal]');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) reveals.forEach(r => r.classList.add('in'));
    else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -8% 0px'}); reveals.forEach(r => io.observe(r)); }
  }

  /* ---------- Imágenes 3D bajo el pliegue: se piden al acercarse (no compiten con la primera carga) ---------- */
  const lazy3d = $$('img[data-src]');
  const show = im => { im.src = im.dataset.src; im.removeAttribute('data-src'); };
  if (!('IntersectionObserver' in window)) lazy3d.forEach(show);
  else { const iol = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); iol.unobserve(e.target); } }), {rootMargin: '600px 0px'}); lazy3d.forEach(im => iol.observe(im)); }

  /* ---------- Íconos 3D: entrada, bucle y salida ----------
     Al entrar en pantalla: .in3d (sube con un rebote y arranca su bucle). Al salir: .out3d (se eleva y se
     desvanece). Al volver, entra de nuevo. Los que entran juntos se escalonan 90 ms. La caja del brillo
     recibe .on solo mientras se ve, para no pedir la máscara antes de tiempo. */
  const icons3d = $$('img[data-loop]');
    let io3;
  if (icons3d.length && !reduce && 'IntersectionObserver' in window) {
    icons3d.forEach(im => im.style.setProperty('--loop-d', (-Math.random() * 6).toFixed(2) + 's'));
    io3 = new IntersectionObserver(es => {
      let k = 0;
      es.forEach(e => {
        const im = e.target, box = im.closest('.i3d-box');
        if (e.isIntersecting) {
          im.style.setProperty('--in-d', (k++ * .09).toFixed(2) + 's');
          im._vis = true;
          // La entrada espera a que la imagen esté descargada y decodificada: si no, la animación corre con el
          // ícono todavía invisible y al cargar aparece de golpe, ya en su sitio.
          const go = () => {
            if (!im._vis) return;
            im.classList.remove('out3d'); im.classList.add('in3d'); im._t0 = performance.now(); if (box) box.classList.add('on');
            if (im.tagName === 'VIDEO') im.play().catch(() => {});
          };
          if (im.tagName === 'IMG') {
            const loaded = im.naturalWidth ? Promise.resolve() : new Promise(r => { im.addEventListener('load', r, {once: true}); im.addEventListener('error', r, {once: true}); setTimeout(r, 3000); });
            loaded.then(() => (im.decode ? im.decode().catch(() => {}) : 0)).then(() => requestAnimationFrame(go));
          } else go();
        } else if (im.classList.contains('in3d')) {
          im._vis = false;
          im.classList.remove('in3d'); im.classList.add('out3d'); if (box) box.classList.remove('on');
          if (im.tagName === 'VIDEO') im.pause();
        } else im._vis = false;
      });
    }, {threshold: .2});
    icons3d.forEach(im => io3.observe(im));

    /* Video en bucle: al acercarse, la imagen se cambia por su video con transparencia
       (HEVC para Safari, VP9 para el resto). Se pausa fuera de pantalla. */
    // Safari e iOS no muestran bien el video con transparencia: ahí se queda la imagen fija con el
    // movimiento CSS (flotar, balancearse, latir). Chrome, Edge y Firefox usan el video VP9 con alfa.
    const apple = navigator.vendor === 'Apple Computer, Inc.';
    const saveData = navigator.connection && navigator.connection.saveData;
    if (apple) document.documentElement.classList.add('no-vid3d');
    const upgrade = im => {
      if (apple || saveData || !im.dataset.v || im.dataset.vdone) return;
      im.dataset.vdone = '1';
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.className = im.className;
      ['data-loop', 'style', 'width', 'height'].forEach(a => { if (im.hasAttribute(a)) v.setAttribute(a, im.getAttribute(a)); });
      v.poster = im.dataset.src || im.currentSrc || im.src;
      v.src = `/assets/vid3d/${im.dataset.v}.webm`;
      // Solo se cambia la imagen por el video si el navegador deja reproducirlo (Safari en bajo consumo no
      // deja): si no, se queda la imagen fija en vez de un recuadro negro.
      v.addEventListener('loadeddata', () => {
        v.play().then(() => {
          // El cambio imagen → video espera a que termine la entrada (≈1,3 s): si no, la corta y el ícono salta a su sitio.
          const swap = () => {
            const box = im.closest('.i3d-box'); if (box) box.classList.add('has-video');
            io3.unobserve(im); im.replaceWith(v); io3.observe(v);
            if (!v.classList.contains('in3d')) v.pause();
          };
          const left = im.classList.contains('in3d') && im._t0 ? im._t0 + 1300 - performance.now() : 0;
          if (left > 0) setTimeout(swap, left); else swap();
        }).catch(() => {});
      }, {once: true});
      v.load();
    };
    const iov = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { upgrade(e.target); iov.unobserve(e.target); } }), {rootMargin: '300px 0px'});
    // Los videos esperan a que la página termine de cargar: no compiten con el primer pantallazo.
    const startVideos = () => setTimeout(() => icons3d.forEach(im => iov.observe(im)), 400);
    if (document.readyState === 'complete') startVideos(); else addEventListener('load', startVideos, {once: true});
  } else icons3d.forEach(im => im.classList.add('in3d'));

  /* ---------- Ilustraciones animadas: se detienen fuera de pantalla y con movimiento reducido ---------- */
  $$('svg.illus').forEach(svg => {
    if (!svg.pauseAnimations) return;
    if (reduce) { svg.pauseAnimations(); return; }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()), {threshold: .05}).observe(svg);
  });

  /* ---------- Cifras que suben al aparecer (sin librerías) ---------- */
  $$('[data-count]').filter(el => !el.closest('.prod-row')).forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '';
    const draw = v => el.textContent = Math.round(v).toLocaleString('es-CO') + suf;
    if (reduce || !('IntersectionObserver' in window)) { draw(end); return; }
    draw(0);
    const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1300, step = t => { const p = Math.min((t - t0) / dur, 1); draw(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); }, {threshold: .6});
    io.observe(el);
  });

  /* ---------- Barra de lectura en los artículos ---------- */
  const art = $('.article .prose');
  if (art && !reduce) {
    const bar = document.createElement('div'); bar.className = 'readbar'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    const upd = () => { const r = art.getBoundingClientRect(), total = r.height - innerHeight * .5; bar.style.transform = `scaleX(${Math.max(0, Math.min(1, (-r.top + innerHeight * .2) / total))})`; };
    addEventListener('scroll', upd, {passive: true}); upd();
  }
})();

/* ---------- Fondo único de la página ----------
   Una sola capa continua detrás de todas las secciones: las franjas de color de cada sección (oscuras y claras),
   la aurora azul y lila, códigos clínicos y un hilo de datos que baja por el costado y une las secciones, con un
   nodo en cada una. Las secciones pasan a ser transparentes y la luz cruza de una a otra sin cortes. */
(() => {
  const main = document.getElementById('main');
  const secs = main ? [...main.querySelectorAll(':scope > section, :scope > .pin-spacer > section')] : [];  // las fijadas con GSAP quedan dentro de un .pin-spacer
  if (!main || !secs.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPost = document.body.classList.contains('page-post');
  document.documentElement.classList.add('pgbg');
  const bg = document.createElement('div'); bg.className = 'pg-bg'; bg.setAttribute('aria-hidden', 'true');
  main.prepend(bg);
  const CODES = ['J03.9', '890201', 'CIE-10', 'CUPS', 'SHA-256', 'F41.2', 'RIPS', 'Z00.1', 'FIRMA'];
  let spineTop = 0, spineH = 1, nodes = [], onEl = null, lastP = -1, link = null;
  const home = document.body.classList.contains('page-index');

  const theme = s => {
    if (s.classList.contains('stage')) return 'dark'; // el hero también es parte de la franja oscura continua
    if (s.classList.contains('dark') || s.classList.contains('tone-dark')) return 'dark';
    if (s.classList.contains('tone-pearl') || s.classList.contains('walk-sec')) return 'pearl';
    if (s.classList.contains('tone-ice')) return 'ice';
    if (s.classList.contains('sub-hero')) return 'hero';
    return null;
  };

  const build = () => {
    const mt = main.getBoundingClientRect().top + scrollY, H = main.offsetHeight;
    let html = '';
    secs.forEach(s => {
      const t = theme(s); if (!t) return;
      const host = s.parentElement && s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;  // la sección fijada se mide por su contenedor, que conserva el alto real
      const r = host.getBoundingClientRect(), top = r.top + scrollY - mt;
      const last = s === [...secs].reverse().find(x => theme(x));
      html += `<div class="pb pb-${t}${last ? ' pb-last' : ''}" style="top:${Math.round(top)}px;height:${Math.round(r.height)}px"></div>`;
    });
    // Aurora: masas de luz repartidas por toda la página, alternando lado y color
    const stepY = innerWidth < 900 ? 720 : 620;
    for (let i = 0, n = Math.ceil(H / stepY); i < n; i++) {
      const left = i % 2 === 0, size = 560 + (i * 97) % 260;
      html += `<i class="po ${i % 3 === 1 ? 'po-l' : 'po-b'}" style="top:${Math.round(i * stepY + 40 + (i * 53) % 120)}px;${left ? 'left' : 'right'}:-${Math.round(size * .28)}px;width:${size}px;height:${size}px;animation-delay:-${(i * 7) % 30}s"></i>`;
    }
    if (!isPost && innerWidth >= 900) {
      for (let i = 0, n = Math.floor(H / 520); i < n; i++) {
        const x = 8 + (i * 37) % 80;
        html += `<span class="pc" style="top:${Math.round(i * 520 + 150 + (i * 71) % 160)}px;left:${x}%;animation-delay:-${(i * 3) % 12}s">${CODES[(i * 5) % CODES.length]}</span>`;
      }
    }
    // Elementos gráficos de salud, discretos: latidos flotantes entre secciones y figuras en los márgenes laterales
    {
      const wave = (n) => {                       // hélice de ADN: dos hebras y peldaños
        let a = '', b = '', r = '';
        for (let y = 0; y <= 300; y += 6) { const x = 45 + 26 * Math.sin(y / 300 * Math.PI * 4 + n); a += (y ? 'L' : 'M') + x.toFixed(1) + ' ' + y + ' '; b += (y ? 'L' : 'M') + (90 - x).toFixed(1) + ' ' + y + ' '; }
        for (let y = 12; y <= 292; y += 24) { const x = 45 + 26 * Math.sin(y / 300 * Math.PI * 4 + n); r += `M${x.toFixed(1)} ${y}L${(90 - x).toFixed(1)} ${y}`; }
        return `<svg class="hg" viewBox="0 0 90 300" width="76" fill="none"><path d="${a}"/><path d="${b}"/><path class="r" d="${r}"/></svg>`;
      };
      const GL = [
        wave(0),
        '<svg class="hg" viewBox="0 0 100 100" width="84" fill="none"><path d="M36 8h28v28h28v28H64v28H36V64H8V36h28z"/><circle cx="50" cy="50" r="6" class="d"/></svg>',
        '<svg class="hg" viewBox="0 0 120 120" width="100" fill="none"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="38" class="r"/><path d="M12 62h26l8-18 12 40 10-28 6 6h46"/></svg>',
        '<svg class="hg" viewBox="0 0 120 110" width="96" fill="none"><path d="M60 6l46 26v46L60 104 14 78V32z"/><circle cx="60" cy="6" r="4" class="d"/><circle cx="106" cy="32" r="4" class="d"/><circle cx="106" cy="78" r="4" class="d"/><circle cx="60" cy="104" r="4" class="d"/><circle cx="14" cy="78" r="4" class="d"/><circle cx="14" cy="32" r="4" class="d"/><path class="r" d="M60 6v98M14 32l92 46M106 32L14 78"/></svg>',
      ];
      const beat = '<svg class="pg-ecg" viewBox="0 0 600 60" preserveAspectRatio="none" fill="none"><path d="M0 34H210l10 0 8-14 12 38 10-30 6 6H600" pathLength="1000"/></svg>';
      let n = 0;
      secs.forEach((s, k) => {
        if (s.classList.contains('stage') || s.classList.contains('statement')) return;
        const r = s.getBoundingClientRect(), top = r.top + scrollY - mt;
        if (top < 200) return;
        // latido flotante en el aire de arriba de la sección (entre secciones, lejos de los títulos)
        html += `<div class="pg-beat" style="top:${Math.round(top + r.height - 70)}px;left:${6 + (n * 29) % 44}%">${beat}</div>`;
        // figura de salud en el margen lateral (solo si cabe fuera del contenido)
        if (false && innerWidth >= 1280 && r.height > 420) {
          const side = home ? 'right' : (n % 2 ? 'left' : 'right');
          const margin = Math.max(8, (innerWidth - 1180) / 2 - 110);
          html += `<div class="pg-glyph" style="top:${Math.round(top + r.height * .38)}px;${side}:${Math.round(margin)}px">${GL[n % GL.length]}</div>`;
        }
        n++;
      });
    }
    // Figuras 3D pequeñas que giran, solo en las subpáginas: cubo, giroscopio y prisma, en los bordes de cada sección
    if (false) {  // retiradas: los íconos van dentro del contenido (tarjetas), no sueltos en los márgenes
      const cube = '<div class="g3 g3-cube"><div class="g3-in">' + ['f','b','r','l','t','u'].map(k => `<i class="${k}"></i>`).join('') + '</div></div>';
      const gyro = '<div class="g3 g3-gyro"><div class="g3-in"><i class="a"></i><i class="b"></i><i class="c"></i><b></b></div></div>';
      const prism = '<div class="g3 g3-prism"><div class="g3-in">' + ['p1','p2','p3'].map(k => `<i class="${k}"></i>`).join('') + '</div></div>';
      const OBJ = [gyro, cube, prism];
      let m = 0;
      secs.forEach(s => {
        if (s.classList.contains('stage')) return;
        const r = s.getBoundingClientRect(), top = r.top + scrollY - mt;
        if (r.height < 260) return;
        const right = m % 2 === 0, edge = Math.max(14, Math.min(70, (innerWidth - 1180) / 2 - 36));
        html += `<div class="g3w" style="top:${Math.round(top + 70 + r.height * (m % 3) * .06)}px;${right ? 'right' : 'left'}:${Math.round(edge)}px;animation-delay:-${(m * 2.3) % 9}s">${OBJ[m % 3]}</div>`;
        m++;
      });
    }
    // Hilo de datos (solo en la home): sale del hero, baja por el costado, une las secciones y entra al orbe del circuito
    nodes = []; link = null;
    if (home && innerWidth >= 1100) {
      const stage = secs.find(s => s.classList.contains('stage'));
      const sr = stage ? stage.getBoundingClientRect() : null;
      spineTop = sr ? sr.bottom + scrollY - mt : 0;
      spineH = Math.max(1, H - spineTop - 140);
      const sx = Math.max(20, (innerWidth - 1180) / 2 - 76);
      html += `<div class="spine" style="top:${Math.round(spineTop)}px;height:${Math.round(spineH)}px"><i class="sp-base"></i><i class="sp-on"></i>`;
      html += `<b class="sp-node" style="top:0"><em>CIE-10</em></b>`; nodes.push(mt + spineTop);
      secs.forEach((s, k) => {
        if (s.classList.contains('stage')) return;
        const y = s.getBoundingClientRect().top + scrollY - mt + 60 - spineTop;
        if (y < 40 || y > spineH) return;
        html += `<b class="sp-node" style="top:${Math.round(y)}px"><em>${CODES[(k * 3 + 1) % CODES.length]}</em></b>`;
        nodes.push(mt + spineTop + y);
      });
      html += '</div>';
      const orb = document.querySelector('.cx-orb');
      if (orb) {
        const o = orb.getBoundingClientRect(), cy = o.top + scrollY - mt + o.height / 2, ox = o.left + o.width / 2 - 62;
        const L = Math.round(ox - sx);
        html += `<svg class="pg-link" style="top:${Math.round(cy) - 6}px;left:${Math.round(sx)}px;width:${L}px;height:12px" viewBox="0 0 ${L} 12"><path d="M0 6 H${L}" stroke-dasharray="${L}" stroke-dashoffset="${L}"/></svg>`;
        link = {y: mt + cy, L};
      }
    }
    bg.innerHTML = html;
    onEl = bg.querySelector('.sp-on'); lastP = -1;
    progress();
  };

  const progress = () => {
    if (!onEl) return;
    const sy = scrollY + innerHeight * .6;
    const p = reduce ? 1 : Math.min(1, Math.max(0, (sy - (main.getBoundingClientRect().top + scrollY + spineTop)) / spineH));
    if (Math.abs(p - lastP) < .001) return; lastP = p;
    onEl.style.transform = `scaleY(${p.toFixed(4)})`;
    bg.querySelectorAll('.sp-node').forEach((n, i) => n.classList.toggle('lit', reduce || sy > nodes[i]));
    const lk = bg.querySelector('.pg-link path'); if (lk && link) lk.style.strokeDashoffset = (reduce || sy > link.y) ? 0 : link.L;
  };

  let t = null; const later = () => { clearTimeout(t); t = setTimeout(build, 180); };
  build();
  addEventListener('load', later); addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  if ('ResizeObserver' in window) new ResizeObserver(later).observe(main);
  // GSAP crea y recalcula los contenedores de las secciones fijadas después de cargar: se vuelve a medir
  const hookST = () => { if (window.ScrollTrigger && ScrollTrigger.addEventListener) { ScrollTrigger.addEventListener('refresh', later); later(); } };
  if (window.ScrollTrigger) hookST(); else addEventListener('load', hookST, {once: true});
  setTimeout(later, 1200);
  let ticking = 0; addEventListener('scroll', () => { const n = performance.now(); if (n - ticking > 24) { ticking = n; progress(); } }, {passive: true});
})();
