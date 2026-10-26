/* Solo Soluciones: bloques "Solo en Miracle", mosaico y cifras de Analytics. */
(() => {
  const {$, $$, reduce} = window.MZ;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;

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
    // La barra de direcciones del celular cambia la altura y no debe recalcular (ni mover) el scroll.
    ScrollTrigger.config({ignoreMobileResize:true});

    if ($('.solo-row')) {
    /* Solo en Miracle */
    $$('.solo-row').forEach(row => {
      const st = {trigger:row, start:'top 75%'};
      gsap.from($$('.solo-copy > *', row), {y:28, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.08, scrollTrigger:st});
      gsap.from($('.mock', row), {y:70, rotateX:10, transformPerspective:1200, autoAlpha:0, duration:1, ease:'power3.out', scrollTrigger:st});
      const lis = $$('.finds li', row); if (lis.length) gsap.from(lis, {x:24, autoAlpha:0, duration:.5, stagger:.15, delay:.4, ease:'power2.out', scrollTrigger:st});
      const bars = $$('.bar b', row); if (bars.length) gsap.from(bars, {scaleY:0, transformOrigin:'bottom', duration:.9, stagger:.04, delay:.3, ease:'power3.out', scrollTrigger:st});
      if ($('[data-count]', row)) ScrollTrigger.create({...st, once:true, onEnter:() => countUp(row)});
    });

    }

    if ($('.bento')) gsap.from('.bx', {y:40, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.08, scrollTrigger:{trigger:'.bento', start:'top 80%'}});
    if ($('.hood')) gsap.from('.hood > div', {y:30, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.1, scrollTrigger:{trigger:'.hood', start:'top 82%'}});

    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
