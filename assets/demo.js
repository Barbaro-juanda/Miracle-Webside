/* Práctica de Notes: tú eres el paciente. Miracle hace cuatro preguntas, tú respondes en voz alta (o escribiendo)
   y al final recibes la nota ordenada por secciones y firmada con una huella SHA-256 real.
   - El micrófono solo se activa cuando pulsas "Empezar con micrófono" y se apaga al terminar o salir.
   - La voz la transcribe el reconocimiento de voz del navegador; Miracle no recibe ni guarda audio ni respuestas.
   - Sin dictado disponible (o sin permiso), se escribe. No hay IA: las respuestas se ordenan por secciones. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const DATA = {
    psiquiatria: {
      rol: 'Eres una persona adulta que consulta por insomnio y desgano desde hace un mes. Responde con tus palabras o improvisa lo que quieras.',
      preguntas: [
        ['Cuéntame, ¿qué te trae hoy?', 'Motivo de consulta'],
        ['¿Desde cuándo te pasa y cómo ha sido este tiempo?', 'Enfermedad actual'],
        ['¿Has tenido pensamientos de hacerte daño o de que sería mejor no estar?', 'Riesgo y examen mental'],
        ['¿Tomas algún medicamento o consumes alcohol u otras sustancias?', 'Antecedentes y consumo'],
      ],
    },
    urgencias: {
      rol: 'Eres una persona que llega a urgencias con dolor abdominal desde anoche. Improvisa los detalles que quieras.',
      preguntas: [
        ['¿Qué le pasó y desde cuándo?', 'Motivo de consulta'],
        ['¿Dónde le duele y cómo es el dolor?', 'Enfermedad actual'],
        ['¿Ha tenido fiebre, vómito u otros síntomas?', 'Síntomas asociados'],
        ['¿Tiene alergias o toma algún medicamento?', 'Antecedentes y alergias'],
      ],
    },
    pediatria: {
      rol: 'Eres el padre o la madre de un niño o una niña que viene a su control de crecimiento. Responde por el menor.',
      preguntas: [
        ['¿Cómo ha estado el niño o la niña desde el último control?', 'Seguimiento'],
        ['¿Cómo está comiendo y durmiendo?', 'Alimentación y sueño'],
        ['¿Le han puesto las vacunas que tocaban?', 'Vacunación'],
        ['¿Qué cosas nuevas hace o qué palabras dice?', 'Desarrollo'],
      ],
    },
  };

  /* Limpia lo dictado: quita muletillas, une espacios, mayúscula inicial y punto final. */
  const clean = t => {
    t = (t || '').replace(/\b(e+h+|e+m+|m+h*m+|a+h+)\b[,.]?/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?…]$/.test(t) ? t : t + '.';
  };
  const words = t => (t.match(/\S+/g) || []).length;

  document.querySelectorAll('[data-demo]').forEach(root => {
    const $ = s => root.querySelector(s);
    const stage = $('.ld-stage'), views = {};
    root.querySelectorAll('[data-view]').forEach(v => { views[v.dataset.view] = v; });
    const tabs = [...root.querySelectorAll('[data-spec]')];
    const main = $('[data-act="main"]'), again = $('[data-act="again"]'), cta = $('[data-act="cta"]'),
      typeBtn = $('[data-act="type"]'), micBtn = $('[data-act="mic"]');
    const hint = $('.ld-hint'), role = $('[data-role]'), ta = $('textarea'), listenBox = $('.ld-listen'), ttsBox = $('[data-tts]'),
      qEl = $('[data-q]'), nEl = $('[data-n]'), totalEl = $('[data-total]'), bar = $('.ld-prog u'),
      doc = $('.ld-doc'), audit = $('.ld-audit'), sign = $('.ld-sign'), steps = [...root.querySelectorAll('.ld-steps li')];
    let spec = 'psiquiatria', state = 'intro', mode = 'voz', cur = 0, answers = [], timers = [], rec = null, listening = false, base = '', token = 0, notice = '';

    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const stopTimers = () => { timers.forEach(clearTimeout); timers = []; token++; };

    /* ---------- Micrófono ---------- */
    const setListenUI = on => {
      listenBox.hidden = !on;
      micBtn.textContent = on ? 'Pausar micrófono' : 'Hablar';
      root.classList.toggle('is-listening', on);
    };
    const stopListen = () => {
      listening = false;
      if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; try { rec.abort(); } catch (e) {} rec = null; }
      setListenUI(false);
    };
    const toTyping = why => {
      stopListen(); mode = 'texto'; notice = why;
      micBtn.hidden = true; setHint(); ta.focus();
    };
    const startListen = () => {
      if (!SR || mode !== 'voz' || state !== 'ask') return;
      stopListen();
      const r = new SR();
      rec = r; r.lang = 'es-CO'; r.interimResults = true; r.continuous = true;
      base = ta.value.trim() ? ta.value.trim() + ' ' : '';
      r.onresult = e => {
        let txt = '';
        for (let k = 0; k < e.results.length; k++) txt += e.results[k][0].transcript;
        ta.value = base + txt.trim();
      };
      r.onerror = e => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        toTyping(e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'No tenemos permiso para usar el micrófono. Puedes escribir tu respuesta.'
          : 'No pudimos usar el dictado de voz en este navegador. Puedes escribir tu respuesta.');
      };
      // El navegador corta el dictado tras un rato de silencio: se reanuda mientras siga en la pregunta.
      r.onend = () => { if (listening && rec === r) { base = ta.value.trim() ? ta.value.trim() + ' ' : ''; later(() => { if (listening && rec === r) { try { r.start(); } catch (e) {} } }, 200); } };
      try { r.start(); listening = true; setListenUI(true); } catch (e) { toTyping('No pudimos activar el micrófono. Puedes escribir tu respuesta.'); }
    };
    const stopSpeech = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
    const say = (text, done) => {
      if (!ttsBox.checked || !('speechSynthesis' in window)) { done(); return; }
      stopSpeech();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-CO';
      u.onend = u.onerror = () => done();
      speechSynthesis.speak(u);
    };
    const hardStop = () => { stopListen(); stopSpeech(); };
    addEventListener('pagehide', hardStop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) hardStop(); });

    /* ---------- Vistas ---------- */
    const show = name => {
      const from = stage.offsetHeight;
      Object.entries(views).forEach(([k, v]) => { v.hidden = k !== name; });
      if (!reduce) {
        const to = stage.scrollHeight;
        stage.style.height = from + 'px'; void stage.offsetHeight; stage.style.height = to + 'px';
        later(() => { stage.style.height = ''; }, 480);
      }
      root.dataset.state = state;
    };
    const setHint = () => {
      const m = {
        intro: SR ? 'Usa el dictado de voz de tu navegador. Miracle no recibe ni guarda tu audio ni tus respuestas.' : 'Tu navegador no permite dictado de voz: escribirás tus respuestas. Nada se envía ni se guarda.',
        ask: mode === 'voz' ? 'Habla con calma. Puedes corregir el texto antes de seguir.' : 'Escribe tu respuesta como lo diría el paciente.',
        gen: '',
        note: 'Nada de esto se envía ni se guarda: vive solo en esta página.',
        signed: 'Nada de esto se envía ni se guarda: vive solo en esta página.',
      };
      hint.textContent = notice && state === 'ask' ? notice : m[state];
    };
    const setButtons = () => {
      main.hidden = false; main.disabled = false; again.hidden = true; cta.hidden = true; typeBtn.hidden = true; micBtn.hidden = true;
      if (state === 'intro') {
        main.textContent = SR ? 'Empezar con micrófono' : 'Empezar';
        typeBtn.hidden = !SR;
      } else if (state === 'ask') {
        main.textContent = cur === DATA[spec].preguntas.length - 1 ? 'Generar la nota' : 'Siguiente pregunta';
        micBtn.hidden = !(SR && mode === 'voz');
        again.hidden = false; again.textContent = 'Salir';
      } else if (state === 'gen') { main.textContent = 'Redactando la nota…'; main.disabled = true; }
      else if (state === 'note') { main.textContent = 'Aprobar y firmar'; again.hidden = false; again.textContent = 'Repetir'; }
      else if (state === 'signed') { main.hidden = true; again.hidden = false; again.textContent = 'Repetir'; cta.hidden = false; }
      setHint();
    };

    const reset = () => {
      stopTimers(); hardStop();
      state = 'intro'; cur = 0; answers = []; notice = ''; mode = 'voz';
      ta.value = ''; doc.textContent = ''; audit.textContent = ''; sign.hidden = true; sign.textContent = '';
      role.textContent = DATA[spec].rol;
      setButtons(); show('intro');
    };

    /* ---------- Preguntas ---------- */
    const ask = k => {
      const d = DATA[spec], my = token;
      cur = k; state = 'ask';
      qEl.textContent = d.preguntas[k][0];
      nEl.textContent = k + 1; totalEl.textContent = d.preguntas.length;
      bar.style.width = ((k + 1) / d.preguntas.length * 100) + '%';
      ta.value = answers[k] || '';
      setButtons(); show('ask');
      if (mode === 'voz') say(d.preguntas[k][0], () => { if (my === token && state === 'ask' && cur === k) startListen(); });
      else ta.focus();
    };
    const begin = m => {
      mode = SR ? m : 'texto'; notice = ''; answers = []; stopTimers();
      ask(0);
    };
    const next = () => {
      stopListen(); stopSpeech();
      answers[cur] = clean(ta.value);
      if (cur + 1 < DATA[spec].preguntas.length) ask(cur + 1); else generate();
    };

    /* ---------- La nota ---------- */
    const generate = () => {
      stopTimers(); const my = token;
      state = 'gen'; setButtons(); show('gen');
      steps.forEach(s => s.className = '');
      if (reduce) { buildNote(); return; }
      steps.forEach((s, i) => later(() => { if (my !== token) return; steps.forEach((x, k) => x.className = k < i ? 'done' : k === i ? 'now' : ''); }, i * 650));
      later(() => { steps.forEach(x => x.className = 'done'); }, steps.length * 650);
      later(buildNote, steps.length * 650 + 400);
    };
    const buildNote = () => {
      const d = DATA[spec], my = token;
      state = 'note'; doc.textContent = ''; audit.textContent = ''; sign.hidden = true;
      const faltan = [];
      let delay = 0;
      d.preguntas.forEach(([, titulo], i) => {
        const h = document.createElement('div'); h.className = 'h5'; h.textContent = titulo;
        const p = document.createElement('p');
        const txt = answers[i];
        if (words(txt) < 2) { faltan.push(titulo); p.className = 'ld-missing'; p.textContent = 'No mencionado en la consulta.'; }
        else (txt.match(/\S+/g)).forEach(w => {
          const s = document.createElement('span'); s.className = 'w' + (reduce ? ' on' : ''); s.textContent = w + ' '; p.appendChild(s);
          if (!reduce) { later(() => { if (my === token) s.classList.add('on'); }, delay); delay += 34; }
        });
        if (!reduce) delay += 120;
        doc.append(h, p);
      });
      const nota = document.createElement('p'); nota.className = 'ld-doc-note';
      nota.textContent = 'Aquí la nota usa tus palabras, ordenadas por las secciones de la plantilla. En Notes, la IA las redacta en lenguaje clínico y sugiere los códigos CIE-10.';
      doc.appendChild(nota);
      setButtons(); show('note');
      const showAudit = () => {
        if (my !== token) return;
        const pill = document.createElement('span'); pill.className = 'pill ' + (faltan.length ? 'warn' : 'ok'); pill.textContent = 'Auditoría';
        const msg = document.createElement('span');
        if (faltan.length) { const b = document.createElement('b'); b.textContent = 'Falta información: '; msg.append(b, faltan.join(', ') + '. Se detecta antes de firmar, cuando todavía se puede completar.'); }
        else { const b = document.createElement('b'); b.textContent = 'Sin hallazgos. '; msg.append(b, 'Todas las secciones de la plantilla tienen información.'); }
        audit.append(pill, msg); audit.classList.add('in');
      };
      if (reduce) showAudit(); else later(showAudit, delay + 150);
    };

    /* ---------- Firma: SHA-256 real del texto de la nota ---------- */
    const doSign = async () => {
      if (state !== 'note') return;
      state = 'signed'; setButtons();
      let hex = '';
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(answers.join('\n')));
        hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { hex = ''; }
      const short = hex ? hex.slice(0, 4) + '…' + hex.slice(-4) : 'calculada al firmar';
      const hora = new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'});
      sign.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><div>Nota firmada<small></small></div>';
      sign.querySelector('small').textContent = 'Huella SHA-256 ' + short + ' · ' + hora;
      sign.hidden = false;
      if (!reduce) { stage.style.height = stage.scrollHeight + 'px'; later(() => { stage.style.height = ''; }, 300); }
    };

    main.addEventListener('click', () => {
      if (state === 'intro') begin('voz');
      else if (state === 'ask') next();
      else if (state === 'note') doSign();
    });
    typeBtn.addEventListener('click', () => { if (state === 'intro') begin('texto'); });
    micBtn.addEventListener('click', () => { if (listening) stopListen(); else startListen(); });
    again.addEventListener('click', reset);
    tabs.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.spec === spec && state === 'intro') return;
      spec = b.dataset.spec;
      tabs.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      reset();
    }));
    reset();
  });
})();
