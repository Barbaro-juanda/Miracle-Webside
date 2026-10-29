/* Solo Agendar: selector de día y hora, validación y envío por WhatsApp o correo. */
(() => {
  const {$, $$, WA, MAIL} = window.MZ;
  if ($('#bookForm')) {
  /* Agendar */
  const daysEl = document.getElementById('days'), slotsEl = document.getElementById('slots');
  const SLOTS = ['8:00 a. m.','9:30 a. m.','11:00 a. m.','2:00 p. m.','3:30 p. m.','5:00 p. m.'];
  let selDay = null, selSlot = null;
  const dFmt = new Intl.DateTimeFormat('es-CO',{weekday:'short'});
  const longFmt = new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long'});
  const days = []; const d = new Date(); d.setHours(12,0,0,0);
  while (days.length < 10) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) days.push(new Date(d)); }
  days.forEach((day, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'day'; b.setAttribute('aria-pressed','false');
    // El nombre accesible es el texto visible ("mié 28") más la fecha completa, oculta a la vista.
    b.innerHTML = `<small>${dFmt.format(day).replace('.','')}</small> <b>${day.getDate()}</b><span class="vh">, ${longFmt.format(day)}</span>`;
    b.addEventListener('click', () => { selDay = day; daysEl.querySelectorAll('.day').forEach(x => x.setAttribute('aria-pressed', x === b)); renderSlots(i); updSummary(); });
    daysEl.appendChild(b);
  });
  function renderSlots(seed) {
    slotsEl.innerHTML = ''; selSlot = null;
    SLOTS.forEach((s, j) => {
      if ((seed + j) % 5 === 3) return; // algunas horas ya ocupadas, para que se vea real
      const b = document.createElement('button'); b.type = 'button'; b.className = 'slot'; b.textContent = s; b.setAttribute('aria-pressed','false');
      b.addEventListener('click', () => { selSlot = s; slotsEl.querySelectorAll('.slot').forEach(x => x.setAttribute('aria-pressed', x === b)); document.getElementById('slotErr').classList.remove('show'); updSummary(); });
      slotsEl.appendChild(b);
    });
  }
  const summary = document.getElementById('summary');
  function updSummary() {
    if (selDay && selSlot) { summary.hidden = false; summary.textContent = `Demostración el ${longFmt.format(selDay)} a las ${selSlot}, hora de Colombia.`; }
    else summary.hidden = true;
  }
  daysEl.firstChild.click();

  const form = document.getElementById('bookForm');
  const typeSel = document.getElementById('f-type');
  typeSel.addEventListener('change', () => {
    const inst = /IPS|Hospital/.test(typeSel.value);
    form.querySelectorAll('.inst-only').forEach(f => f.hidden = !inst);
  });
  document.querySelectorAll('[data-plan="Institucional"]').forEach(a => a.addEventListener('click', () => { typeSel.value = 'IPS o clínica'; typeSel.dispatchEvent(new Event('change')); }));

  const rules = {
    'f-name': v => v.trim().length > 1,
    'f-mail': v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    'f-tel': v => v.replace(/\D/g,'').length >= 7,
    'f-type': v => !!v
  };
  const check = id => { const el = document.getElementById(id); const ok = rules[id](el.value); el.closest('.field').classList.toggle('invalid', !ok); el.setAttribute('aria-invalid', !ok); return ok; };
  Object.keys(rules).forEach(id => document.getElementById(id).addEventListener('blur', () => { if (document.getElementById(id).value) check(id); }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = Object.keys(rules).filter(id => !check(id));
    const slotOk = selDay && selSlot;
    document.getElementById('slotErr').classList.toggle('show', !slotOk);
    if (!slotOk) { daysEl.querySelector('[aria-pressed="true"]')?.focus(); return; }
    if (bad.length) { document.getElementById(bad[0]).focus(); return; }
    const v = id => document.getElementById(id).value.trim();
    const msg = [
      'Hola, quiero agendar una demostración de Miracle.',
      `Fecha: ${longFmt.format(selDay)}, ${selSlot} (hora de Colombia)`,
      `Nombre: ${v('f-name')}`, v('f-mail') && `Correo: ${v('f-mail')}`, `WhatsApp: ${v('f-tel')}`, `Tipo: ${v('f-type')}`,
      v('f-org') && `Institución: ${v('f-org')}`, v('f-size') && `Médicos: ${v('f-size')}`
    ].filter(Boolean).join('\n');
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Preparando tu solicitud…';
    document.getElementById('mailAlt').href = `mailto:${MAIL}?subject=${encodeURIComponent('Demostración de Miracle · ' + v('f-name'))}&body=${encodeURIComponent(msg)}`;
    setTimeout(() => {
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      form.hidden = true; document.getElementById('done').classList.add('show');
    }, 500);
  });
  }
})();
