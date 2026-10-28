/* Blog: filtros por tipo y por rol al instante. Sin JavaScript, cada filtro es un enlace a su propia página
   (/blog/tipo/… y /blog/rol/…); aquí se combinan los dos y la dirección queda como /blog?tipo=…&rol=… */
(() => {
  const box = document.querySelector('[data-filtros]');
  if (!box) return;
  const items = [...document.querySelectorAll('.blist > .bcard')];
  const chips = [...box.querySelectorAll('a[data-f]')];
  const estado = document.querySelector('[data-estado]');
  const vacio = document.querySelector('.bempty');
  const valid = f => new Set(chips.filter(a => a.dataset.f === f).map(a => a.dataset.v));
  const q = new URLSearchParams(location.search);
  const sel = {tipo: '', rol: ''};
  for (const f of Object.keys(sel)) if (valid(f).has(q.get(f) || '')) sel[f] = q.get(f) || '';

  chips.forEach(a => { a.setAttribute('role', 'button'); a.removeAttribute('aria-current'); });

  const apply = announce => {
    chips.forEach(a => a.setAttribute('aria-pressed', sel[a.dataset.f] === a.dataset.v));
    let n = 0;
    items.forEach(li => {
      const ok = (!sel.tipo || li.dataset.tipo === sel.tipo) && (!sel.rol || li.dataset.roles.split(' ').includes(sel.rol));
      if (ok && li.hidden) { li.classList.remove('bc-in'); void li.offsetWidth; li.classList.add('bc-in'); }
      li.hidden = !ok;
      if (ok) n++;
    });
    vacio.hidden = n > 0;
    if (announce) estado.textContent = n === 1 ? '1 artículo' : `${n} artículos`;
    const u = new URLSearchParams();
    if (sel.tipo) u.set('tipo', sel.tipo);
    if (sel.rol) u.set('rol', sel.rol);
    history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : '') + location.hash);
  };

  box.addEventListener('click', e => {
    const a = e.target.closest('a[data-f]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    sel[a.dataset.f] = a.dataset.v;
    apply(true);
  });
  // Un botón también se activa con la barra espaciadora
  box.addEventListener('keydown', e => { if (e.key === ' ' && e.target.matches('a[data-f]')) { e.preventDefault(); e.target.click(); } });
  vacio.querySelector('[data-reset]').addEventListener('click', e => {
    e.preventDefault();
    sel.tipo = sel.rol = '';
    apply(true);
    box.querySelector('a[data-f]').focus();
  });
  apply(false);
})();
