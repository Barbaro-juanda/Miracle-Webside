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

  /* ---------- Íconos 3D: brillo y flotación solo mientras están en pantalla ---------- */
  const boxes = $$('.i3d-box');
  if (boxes.length && !reduce && 'IntersectionObserver' in window) {
    const io3 = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)), {rootMargin: '120px 0px'});
    boxes.forEach(b => io3.observe(b));
  }

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
