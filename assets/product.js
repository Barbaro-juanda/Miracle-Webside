/* Solo las páginas de producto (Notes, Auditorías, Analytics): entrada del encabezado,
   recorrido paso a paso con una imagen que cambia mientras se lee, y movimiento suave. */
(() => {
  const {$, $$, reduce} = window.MZ;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;

  /* ---------- Recorrido paso a paso ----------
     Escritorio: la imagen queda fija y cambia de estado según el paso que se está leyendo.
     Celular: la imagen pasa sola por los tres estados mientras está a la vista.
     Movimiento reducido: se muestra el estado final, quieto. */
  const walk = $('.walk');
  if (walk) {
    const vz = $('.vz', walk), steps = $$('.walk-step', walk);
    const set = n => { vz.dataset.step = n; steps.forEach((s, i) => s.classList.toggle('on', i === n - 1)); };
    set(reduce ? 3 : 1);
    if (!reduce && 'IntersectionObserver' in window) {
      const wide = matchMedia('(min-width: 1025px)');
      let timer = null, n = 1;
      const stop = () => { clearInterval(timer); timer = null; };
      const mode = () => {
        stop();
        if (wide.matches) return;
        timer = setInterval(() => { n = n % 3 + 1; set(n); }, 3600);
      };
      // Escritorio: el paso que cruza la franja central de la pantalla es el activo.
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && wide.matches) { n = steps.indexOf(e.target) + 1; set(n); } }),
        {rootMargin: '-42% 0px -42% 0px'});
      steps.forEach(s => io.observe(s));
      // Celular: solo corre mientras la imagen se ve.
      const vis = new IntersectionObserver(es => { if (es[0].isIntersecting) mode(); else stop(); }, {threshold: .35});
      vis.observe(vz);
      wide.addEventListener('change', () => { n = 1; set(1); mode(); });
    }
  }

  /* ---------- Conteo de cifras ---------- */
  function countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const end = +el.dataset.count, suf = el.dataset.suffix || '';
      if (!animate) { el.textContent = end.toLocaleString('es-CO') + suf; return; }
      const o = {v:0};
      gsap.to(o, {v:end, duration:1.1, ease:'power3.out', onUpdate:() => el.textContent = Math.round(o.v).toLocaleString('es-CO') + suf});
    });
  }
  if (!animate) { countUp(document); return; }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});

  /* Encabezado: el texto sube y la tarjeta entra; después se mueve un poco más despacio que la página. */
  $$('.prod-row').forEach(row => {
    const st = {trigger:row, start:'top 85%'};
    gsap.from($$('.prod-copy > *', row), {y:26, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.08, scrollTrigger:st});
    gsap.from($('.mock', row), {y:60, rotateX:8, transformPerspective:1200, autoAlpha:0, duration:1, ease:'power3.out', scrollTrigger:st});
    const lis = $$('.finds li', row); if (lis.length) gsap.from(lis, {x:24, autoAlpha:0, duration:.5, stagger:.15, delay:.4, ease:'power2.out', scrollTrigger:st});
    const bars = $$('.bar b', row); if (bars.length) gsap.from(bars, {scaleY:0, transformOrigin:'bottom', duration:.9, stagger:.04, delay:.3, ease:'power3.out', scrollTrigger:st});
    if ($('[data-count]', row)) ScrollTrigger.create({...st, once:true, onEnter:() => countUp(row)});
    if (matchMedia('(min-width: 1025px)').matches)
      gsap.to($('.mock', row), {yPercent:-5, ease:'none', scrollTrigger:{trigger:'.sub-hero.prod', start:'top top', end:'bottom top', scrub:true}});
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
