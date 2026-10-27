/* Soluciones: escenas que solo corren en pantalla y selector de punto de partida */
(() => {
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scenes = $$('.px-scene');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('play', e.isIntersecting)), {threshold: .2});
    scenes.forEach(s => io.observe(s));
  } else scenes.forEach(s => s.classList.add('play'));

  const pick = document.querySelector('.pick');
  if (!pick) return;
  const tabs = $$('.pick-opt', pick), panels = $$('.pick-panel', pick);
  let idx = 0, timer = null, auto = !reduce;

  const show = (i, focus) => {
    idx = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => { const on = k === idx; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach((p, k) => p.classList.toggle('on', k === idx));
    if (focus) tabs[idx].focus();
    const sc = tabs[idx].parentElement;
    if (sc.scrollWidth > sc.clientWidth) sc.scrollTo({left: tabs[idx].offsetLeft - sc.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth'});
    // reinicia la barra de progreso
    const bar = tabs[idx].querySelector('.po-prog'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    clearTimeout(timer);
    if (auto && visible) timer = setTimeout(() => show(idx + 1), 7000);
  };
  const stopAuto = () => { auto = false; pick.classList.remove('auto'); clearTimeout(timer); };

  tabs.forEach((t, k) => {
    t.addEventListener('click', () => { stopAuto(); show(k); });
    t.addEventListener('keydown', e => {
      const d = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[e.key];
      if (d) { e.preventDefault(); stopAuto(); show(idx + d, true); }
    });
  });
  pick.addEventListener('mouseenter', () => { clearTimeout(timer); pick.classList.remove('auto'); });
  pick.addEventListener('mouseleave', () => { if (auto) { pick.classList.add('auto'); show(idx); } });

  let visible = false;
  if (auto) pick.classList.add('auto');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) show(idx); else clearTimeout(timer); }, {threshold: .35}).observe(pick);
  } else { visible = true; }
  show(0);
})();
