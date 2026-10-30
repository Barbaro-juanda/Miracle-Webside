/* Demo de Notes: una consulta simulada, de la conversación a la nota firmada, dentro de la misma tarjeta.
   Todo es un ejemplo ilustrativo con datos ficticios: no usa el micrófono ni envía nada. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DATA = {
    psiquiatria: {
      secciones: ['Motivo de consulta', 'Enfermedad actual', 'Examen mental', 'Impresión y plan'],
      dialogo: [
        ['m', 'Cuéntame, ¿qué te trae hoy?'],
        ['p', 'Llevo un mes durmiendo muy mal y me siento sin ganas de nada.'],
        ['m', '¿Has tenido pensamientos de hacerte daño?'],
        ['p', 'No, nada de eso. Solo cansancio y mucha preocupación por el trabajo.'],
        ['m', '¿Tomas algún medicamento o consumes alcohol?'],
        ['p', 'Ningún medicamento. Alcohol solo de vez en cuando.'],
      ],
      nota: [
        'Insomnio y desgano de un mes de evolución.',
        'Refiere un mes de sueño fragmentado, desgano y preocupación laboral. Niega ideas de muerte o de hacerse daño. No toma medicamentos; consumo de alcohol ocasional.',
        'Alerta, colaboradora, afecto ansioso, pensamiento lógico y coherente, sin ideas de muerte ni de autoagresión.',
        'Cuadro ansioso-depresivo en estudio. Higiene del sueño, control en cuatro semanas y signos de alarma explicados.',
      ],
      codigos: [['F41.2', 'Trastorno mixto ansioso-depresivo']],
      auditoria: 'Riesgo suicida: negado y registrado.',
      paciente: 'Paciente',
    },
    urgencias: {
      secciones: ['Motivo de consulta', 'Enfermedad actual', 'Examen físico', 'Impresión y conducta'],
      dialogo: [
        ['m', '¿Qué le pasó y desde cuándo?'],
        ['p', 'Me duele la barriga desde anoche, más abajo a la derecha.'],
        ['m', '¿Ha tenido fiebre o vómito?'],
        ['p', 'Un poco de fiebre y vomité dos veces.'],
        ['m', '¿Alergias o medicamentos?'],
        ['p', 'Alérgico a la dipirona. No tomo nada más.'],
        ['m', 'Al examinarlo, duele al presionar abajo a la derecha y el abdomen no está rígido.'],
      ],
      nota: [
        'Dolor abdominal desde la noche anterior.',
        'Dolor en el abdomen inferior derecho de inicio nocturno, con fiebre y dos episodios de vómito. Alergia a la dipirona. Sin otros medicamentos.',
        'Dolor a la palpación en el abdomen inferior derecho, sin rigidez abdominal.',
        'Dolor abdominal en estudio. Laboratorios e imagen, analgesia sin dipirona y valoración por cirugía.',
      ],
      codigos: [['R10.3', 'Dolor localizado en otras partes inferiores del abdomen']],
      auditoria: 'Alergia a la dipirona registrada.',
      paciente: 'Paciente',
    },
    pediatria: {
      secciones: ['Motivo de consulta', 'Seguimiento', 'Examen físico', 'Plan y recomendaciones'],
      dialogo: [
        ['m', '¿Cómo ha estado la niña desde la última vez?'],
        ['p', 'Muy bien, come bien y duerme toda la noche.'],
        ['m', '¿Ya le pusieron las vacunas que tocaban?'],
        ['p', 'Sí, las del último control.'],
        ['m', 'Veo que camina sola y dice varias palabras. El peso y la talla están en su curva.'],
        ['p', 'Sí, ya dice mamá y papá.'],
      ],
      nota: [
        'Control de crecimiento y desarrollo.',
        'La madre refiere buena alimentación y sueño continuo. Esquema de vacunación al día según lo referido.',
        'Camina sola y dice varias palabras. Peso y talla dentro de su curva.',
        'Continuar alimentación y estimulación. Próximo control según la edad; signos de alarma explicados.',
      ],
      codigos: [['Z00.1', 'Control de salud de rutina del niño']],
      auditoria: 'Esquema de vacunación referido por la madre.',
      paciente: 'Madre',
    },
  };

  const esc = t => t.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
  const pad = n => String(n).padStart(2, '0');

  document.querySelectorAll('[data-demo]').forEach(root => {
    const $ = s => root.querySelector(s);
    const stage = $('.ld-stage'), views = {};
    root.querySelectorAll('[data-view]').forEach(v => { views[v.dataset.view] = v; });
    const tabs = [...root.querySelectorAll('[data-spec]')];
    const main = $('[data-act="main"]'), again = $('[data-act="again"]'), cta = $('[data-act="cta"]');
    const tr = $('.ld-tr'), rec = $('.ld-rec'), clock = $('.ld-rec time'), doc = $('.ld-doc'),
      codes = $('.ld-codes'), audit = $('.ld-audit'), sign = $('.ld-sign'), steps = [...root.querySelectorAll('.ld-steps li')];
    let spec = 'psiquiatria', state = 'idle', timers = [], tick = null, token = 0;

    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const stopAll = () => { timers.forEach(clearTimeout); timers = []; clearInterval(tick); tick = null; token++; };

    /* El alto de la tarjeta cambia con suavidad entre una vista y otra. */
    const show = name => {
      const from = stage.offsetHeight;
      Object.entries(views).forEach(([k, v]) => { v.hidden = k !== name; });
      if (!reduce) {
        const to = stage.scrollHeight;
        stage.style.height = from + 'px';
        void stage.offsetHeight;
        stage.style.height = to + 'px';
        later(() => { stage.style.height = ''; }, 480);
      }
      root.dataset.state = state;
    };

    const skeleton = () => {
      const d = DATA[spec];
      views.idle.querySelector('.ld-skel').innerHTML = d.secciones.map((s, i) => `<div><span>${s}</span><i></i>${i % 3 ? '<i></i>' : ''}</div>`).join('');
    };

    const setButtons = () => {
      main.hidden = false; again.hidden = true; cta.hidden = true; main.disabled = false;
      if (state === 'idle') main.textContent = 'Iniciar consulta';
      else if (state === 'rec') main.textContent = 'Finalizar consulta';
      else if (state === 'gen') { main.textContent = 'Redactando la nota…'; main.disabled = true; }
      else if (state === 'note') { main.textContent = 'Aprobar y firmar'; again.hidden = false; }
      else if (state === 'signed') { main.hidden = true; again.hidden = false; cta.hidden = false; }
    };

    const reset = () => {
      stopAll();
      state = 'idle'; tr.innerHTML = ''; doc.innerHTML = ''; codes.innerHTML = ''; audit.innerHTML = ''; sign.hidden = true; sign.innerHTML = '';
      skeleton(); setButtons(); show('idle');
    };

    /* ---------- Grabando: la conversación se escribe sola ---------- */
    const startRec = () => {
      stopAll();
      const d = DATA[spec], my = token;
      state = 'rec'; tr.innerHTML = ''; setButtons(); show('rec');
      let t0 = Date.now();
      clock.textContent = '00:00';
      tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); clock.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); }, 500);
      if (reduce) { d.dialogo.forEach(([w, txt]) => addLine(w, txt, d)); clock.textContent = '04:12'; later(finish, 200); return; }
      let i = 0;
      const next = () => {
        if (my !== token) return;
        if (i >= d.dialogo.length) { later(finish, 1300); return; }
        const [w, txt] = d.dialogo[i++];
        const el = addLine(w, '', d);
        let n = 0;
        const typer = setInterval(() => {
          if (my !== token) { clearInterval(typer); return; }
          n += 2; el.textContent = txt.slice(0, n);
          if (n >= txt.length) { clearInterval(typer); later(next, 420); }
        }, 24);
        timers.push(typer);
      };
      next();
    };
    const addLine = (w, txt, d) => {
      const row = document.createElement('div');
      row.className = 'ld-u ' + w;
      row.innerHTML = `<b>${w === 'm' ? 'Médico' : d.paciente}</b><span></span>`;
      row.lastChild.textContent = txt;
      tr.appendChild(row);
      tr.scrollTop = tr.scrollHeight;
      return row.lastChild;
    };

    /* ---------- Generando la nota ---------- */
    const finish = () => {
      if (state !== 'rec') return;
      stopAll();
      const my = token;
      state = 'gen'; setButtons(); show('gen');
      steps.forEach(s => s.className = '');
      if (reduce) { buildNote(); return; }
      steps.forEach((s, i) => later(() => { if (my !== token) return; steps.forEach((x, k) => x.className = k < i ? 'done' : k === i ? 'now' : ''); }, i * 700));
      later(() => { steps.forEach(x => x.className = 'done'); }, steps.length * 700);
      later(buildNote, steps.length * 700 + 450);
    };

    /* ---------- La nota aparece sección por sección ---------- */
    const buildNote = () => {
      const d = DATA[spec], my = token;
      state = 'note';
      doc.innerHTML = d.secciones.map((s, i) => `<div class="h5">${s}</div><p data-i="${i}"></p>`).join('');
      codes.innerHTML = ''; audit.innerHTML = ''; sign.hidden = true;
      setButtons(); show('note');
      const ps = [...doc.querySelectorAll('p')];
      let delay = 0;
      ps.forEach((p, i) => {
        const words = d.nota[i].split(' ');
        p.innerHTML = words.map(w => `<span class="w">${esc(w)} </span>`).join('');
        if (reduce) { p.querySelectorAll('.w').forEach(w => w.classList.add('on')); return; }
        p.querySelectorAll('.w').forEach(w => { later(() => { if (my === token) w.classList.add('on'); }, delay); delay += 38; });
        delay += 140;
      });
      const showRest = () => {
        if (my !== token) return;
        codes.innerHTML = d.codigos.map(([c, t]) => `<span class="code"><strong>${c}</strong>${esc(t)}<em>Sugerido</em></span>`).join('');
        audit.innerHTML = `<span class="pill ok">Auditoría</span><span><b>Sin hallazgos críticos.</b> ${esc(d.auditoria)}</span>`;
        codes.classList.add('in'); audit.classList.add('in');
      };
      if (reduce) showRest(); else later(showRest, delay + 150);
    };

    /* ---------- Firma: la huella es un SHA-256 real del texto de la nota ---------- */
    const doSign = async () => {
      if (state !== 'note') return;
      const d = DATA[spec];
      state = 'signed'; setButtons();
      let hex = '';
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d.nota.join('\n')));
        hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { hex = ''; }
      const short = hex ? hex.slice(0, 4) + '…' + hex.slice(-4) : 'calculada al firmar';
      const hora = new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'});
      sign.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><div>Nota firmada<small>Huella SHA-256 ${short} · ${hora}</small></div>`;
      sign.hidden = false;
      const h = stage.scrollHeight; if (!reduce) { stage.style.height = h + 'px'; later(() => { stage.style.height = ''; }, 300); }
    };

    main.addEventListener('click', () => {
      if (state === 'idle') startRec();
      else if (state === 'rec') finish();
      else if (state === 'note') doSign();
    });
    again.addEventListener('click', reset);
    tabs.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.spec === spec && state === 'idle') return;
      spec = b.dataset.spec;
      tabs.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      reset();
    }));
    reset();
  });
})();
