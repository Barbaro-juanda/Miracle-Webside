/* Soluciones: la consulta de Laura vista por el médico, calidad y gerencia.
   Sin JavaScript las tres vistas se ven una debajo de otra; aquí se vuelven pestañas (flechas, Inicio y Fin). */
(() => {
  const sx = document.querySelector('[data-sx]');
  if (!sx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = sx.querySelector('.sx-tabs');
  const tabs = [...list.querySelectorAll('button')];
  const views = tabs.map(t => document.getElementById(t.dataset.for));

  list.setAttribute('role', 'tablist');
  tabs.forEach((t, i) => {
    t.id = 'tab-' + t.dataset.for;
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', views[i].id);
    views[i].setAttribute('role', 'tabpanel');
    views[i].setAttribute('aria-labelledby', t.id);
    views[i].tabIndex = 0;
  });

  let cur = -1;
  const show = (i, focus) => {
    if (i !== cur) {
      cur = i;
      tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; views[k].hidden = !on; });
      list.style.setProperty('--i', i);
      // reinicia la entrada de la vista (solo transform y opacity)
      views[i].classList.remove('sx-in'); void views[i].offsetWidth; views[i].classList.add('sx-in');
    }
    if (focus) tabs[i].focus();
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', e => {
      const n = tabs.length;
      const to = {ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1}[e.key];
      if (to === undefined) return;
      e.preventDefault(); show(to, true);
    });
  });

  // "¿Qué te duele hoy?": la respuesta elige la vista y baja al escenario. El enlace (#medico…) queda para compartir.
  const go = (id, scroll) => {
    const i = views.findIndex(v => v.id === id);
    if (i < 0) return false;
    show(i);
    if (scroll) { sx.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); tabs[i].focus({preventScroll: true}); }
    return true;
  };
  document.querySelectorAll('.sx-ask a[data-view]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    go(a.dataset.view, true);
    history.replaceState(null, '', '#' + a.dataset.view);
  }));

  sx.classList.add('sx-on');
  const fromHash = () => go(decodeURIComponent(location.hash.slice(1)), true);
  if (!fromHash()) show(0);
  addEventListener('hashchange', fromHash);
})();
