/* Núcleo: se carga en todas las páginas (menú, cabecera, anclas y aparición al entrar en pantalla). */
(() => {
  const WA = '573134582806';
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
          im.classList.remove('out3d'); im.classList.add('in3d'); if (box) box.classList.add('on');
          if (im.tagName === 'VIDEO') im.play().catch(() => {});
        } else if (im.classList.contains('in3d')) {
          im.classList.remove('in3d'); im.classList.add('out3d'); if (box) box.classList.remove('on');
          if (im.tagName === 'VIDEO') im.pause();
        }
      });
    }, {threshold: .2});
    icons3d.forEach(im => io3.observe(im));

    /* Video en bucle: al acercarse, la imagen se cambia por su video con transparencia
       (HEVC para Safari, VP9 para el resto). Se pausa fuera de pantalla. */
    const safari = navigator.vendor === 'Apple Computer, Inc.';
    const saveData = navigator.connection && navigator.connection.saveData;
    const upgrade = im => {
      if (saveData || !im.dataset.v || im.dataset.vdone) return;
      im.dataset.vdone = '1';
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.className = im.className;
      ['data-loop', 'style', 'width', 'height'].forEach(a => { if (im.hasAttribute(a)) v.setAttribute(a, im.getAttribute(a)); });
      v.poster = im.dataset.src || im.currentSrc || im.src;
      v.src = `/assets/vid3d/${im.dataset.v}.${safari ? 'mov' : 'webm'}`;
      // Solo se cambia la imagen por el video si el navegador deja reproducirlo (Safari en bajo consumo no
      // deja): si no, se queda la imagen fija en vez de un recuadro negro.
      v.addEventListener('loadeddata', () => {
        v.play().then(() => {
          const box = im.closest('.i3d-box'); if (box) box.classList.add('has-video');
          io3.unobserve(im); im.replaceWith(v); io3.observe(v);
          if (!v.classList.contains('in3d')) v.pause();
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
