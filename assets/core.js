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
})();
