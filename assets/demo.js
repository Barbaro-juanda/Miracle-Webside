/* Práctica de Notes: tú eres el paciente. Miracle hace cuatro preguntas como lo haría el médico, tú respondes
   en voz alta lo que quieras (inventado o real) y al final recibes la nota ordenada por secciones, con una
   revisión de lo que falta y una firma con huella SHA-256 real.
   - Todo es por voz: el cuadro de texto solo muestra lo que se transcribe.
   - El micrófono solo se activa al pulsar "Empezar con micrófono" y se apaga al terminar o al salir.
   - La voz la transcribe el reconocimiento de voz del navegador (Chrome y Edge); Miracle no recibe ni guarda
     audio ni respuestas. No hay IA: las respuestas se ordenan por secciones. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ua = navigator.userAgent;
  const IS_SAFARI = /safari/i.test(ua) && !/chrome|crios|android|edg/i.test(ua);
  const DATA = {
    psiquiatria: [
      ['Cuéntame, ¿qué te trae hoy?', 'Motivo de consulta'],
      ['¿Desde cuándo te pasa y cómo ha sido este tiempo?', 'Enfermedad actual'],
      ['¿Has tenido pensamientos de hacerte daño o de que sería mejor no estar?', 'Riesgo y examen mental'],
      ['¿Tomas algún medicamento o consumes alcohol u otras sustancias?', 'Antecedentes y consumo'],
    ],
    urgencias: [
      ['¿Qué le pasó y desde cuándo?', 'Motivo de consulta'],
      ['¿Cómo son sus síntomas y qué los mejora o los empeora?', 'Enfermedad actual'],
      ['¿Ha tenido fiebre, vómito u otros síntomas?', 'Síntomas asociados'],
      ['¿Tiene alergias o toma algún medicamento?', 'Antecedentes y alergias'],
    ],
    pediatria: [
      ['¿Cómo ha estado el niño o la niña desde el último control?', 'Seguimiento'],
      ['¿Cómo está comiendo y durmiendo?', 'Alimentación y sueño'],
      ['¿Le han puesto las vacunas que tocaban?', 'Vacunación'],
      ['¿Qué cosas nuevas hace o qué palabras dice?', 'Desarrollo'],
    ],
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
      redoBtn = $('[data-act="redo"]'), micBtn = $('[data-act="mic"]');
    const hint = $('.ld-hint'), ta = $('textarea'), listenBox = $('.ld-listen'), statusEl = $('[data-status]'), ttsBox = $('[data-tts]'),
      qEl = $('[data-q]'), nEl = $('[data-n]'), totalEl = $('[data-total]'), bar = $('.ld-prog u'), bars = [...root.querySelectorAll('.ld-wave b')],
      doc = $('.ld-doc'), audit = $('.ld-audit'), sign = $('.ld-sign'), steps = [...root.querySelectorAll('.ld-steps li')];
    let spec = 'psiquiatria', state = 'intro', cur = 0, answers = [], timers = [], rec = null, listening = false, base = '', token = 0, problem = '';
    let stream = null, ac = null, raf = 0, startedAt = 0, quickEnds = 0, lastErr = '';

    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const stopTimers = () => { timers.forEach(clearTimeout); timers = []; token++; };

    /* ---------- Medidor del micrófono: muestra en vivo que el micrófono sí te está oyendo ---------- */
    const stopMeter = () => {
      cancelAnimationFrame(raf); raf = 0;
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (ac) { try { ac.close(); } catch (e) {} ac = null; }
      root.classList.remove('metered'); bars.forEach(b => { b.style.height = ''; });
    };
    const startMeter = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return {ok: true, meter: false};
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio: true});
      } catch (e) {
        return {ok: false, name: e.name};
      }
      // En Safari el medidor y el dictado compiten por el micrófono: ahí solo se pide el permiso.
      if (IS_SAFARI) { stream.getTracks().forEach(t => t.stop()); stream = null; return {ok: true, meter: false}; }
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const an = ac.createAnalyser(); an.fftSize = 256;
        ac.createMediaStreamSource(stream).connect(an);
        const data = new Uint8Array(an.fftSize);
        root.classList.add('metered');
        const loop = () => {
          an.getByteTimeDomainData(data);
          let sum = 0; for (let i = 0; i < data.length; i++) { const x = (data[i] - 128) / 128; sum += x * x; }
          const lvl = Math.min(1, Math.sqrt(sum / data.length) * 5), t = Date.now() / 110;
          bars.forEach((b, i) => { b.style.height = (14 + lvl * 86 * (.55 + .45 * Math.sin(t + i * 1.3) ** 2)) + '%'; });
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) { stopMeter(); }
      return {ok: true, meter: true};
    };

    /* ---------- Dictado ---------- */
    const setStatus = (txt, bad) => { statusEl.textContent = txt; listenBox.classList.toggle('bad', !!bad); listenBox.hidden = false; };
    const setListenUI = on => {
      micBtn.textContent = on ? 'Pausar micrófono' : (problem ? 'Reintentar micrófono' : 'Hablar');
      root.classList.toggle('is-listening', on);
      if (on) { listenBox.classList.remove('bad'); statusEl.textContent = 'Escuchando… responde en voz alta'; listenBox.hidden = false; }
      else if (!problem) listenBox.hidden = true;
    };
    const stopListen = () => {
      listening = false;
      if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.onstart = null; try { rec.abort(); } catch (e) {} rec = null; }
      stopMeter(); setListenUI(false);
    };
    const fail = txt => { problem = txt; listening = false; if (rec) { rec.onend = null; try { rec.abort(); } catch (e) {} rec = null; } stopMeter(); setListenUI(false); setStatus(txt, true); };

    const startRec = () => {
      const r = new SR();
      rec = r; r.lang = 'es-CO'; r.interimResults = true; r.continuous = true;
      base = ta.value.trim() ? ta.value.trim() + ' ' : '';
      r.onstart = () => { startedAt = Date.now(); };
      r.onresult = e => {
        quickEnds = 0; problem = '';
        let txt = '';
        for (let k = 0; k < e.results.length; k++) txt += e.results[k][0].transcript;
        ta.value = base + txt.trim();
        listenBox.classList.remove('bad'); statusEl.textContent = 'Te escucho…';
      };
      r.onerror = e => {
        lastErr = e.error;
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') fail('El navegador bloqueó el micrófono. Pulsa el candado de la barra de direcciones, permite el micrófono y toca "Reintentar micrófono".');
        else if (e.error === 'audio-capture') fail('No encontramos un micrófono disponible. Revisa que esté conectado y que no lo use otra aplicación, y toca "Reintentar micrófono".');
        else if (e.error === 'network' || e.error === 'language-not-supported') fail('El servicio de voz de este navegador no responde (' + e.error + '). Abre la página en Google Chrome o Microsoft Edge y toca "Reintentar micrófono".');
        else fail('El dictado se interrumpió (' + e.error + '). Toca "Reintentar micrófono".');
      };
      // El navegador corta el dictado tras un rato de silencio: se reanuda mientras siga en la pregunta.
      // Si corta una y otra vez sin oír nada, se avisa en vez de seguir en silencio.
      r.onend = () => {
        if (!(listening && rec === r)) return;
        if (Date.now() - startedAt < 1200) quickEnds++; else quickEnds = 0;
        if (quickEnds >= 3) { fail('El dictado se corta apenas empieza' + (lastErr ? ' (' + lastErr + ')' : '') + '. Abre la página en Google Chrome o Microsoft Edge y toca "Reintentar micrófono".'); return; }
        base = ta.value.trim() ? ta.value.trim() + ' ' : '';
        later(() => { if (listening && rec === r) { startedAt = Date.now(); try { r.start(); } catch (e) {} } }, 250);
      };
      startedAt = Date.now();
      try { r.start(); listening = true; problem = ''; setListenUI(true); } catch (e) { fail('No pudimos activar el dictado. Toca "Reintentar micrófono".'); }
    };
    const startListen = async () => {
      if (!SR || state !== 'ask') return;
      stopListen(); problem = ''; quickEnds = 0; lastErr = '';
      setStatus('Pidiendo acceso al micrófono…');
      const my = token, k = cur;
      const res = await startMeter();
      if (my !== token || state !== 'ask' || cur !== k) { stopMeter(); return; }
      if (!res.ok) {
        fail(res.name === 'NotFoundError' ? 'No encontramos un micrófono. Revisa que esté conectado y toca "Reintentar micrófono".'
          : 'El navegador bloqueó el micrófono. Pulsa el candado de la barra de direcciones, permite el micrófono y toca "Reintentar micrófono".');
        return;
      }
      startRec();
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
        intro: SR ? 'Usa el dictado de voz de tu navegador (Chrome o Edge). Miracle no recibe ni guarda tu audio ni tus respuestas.' : 'Esta práctica necesita el dictado de voz, que tu navegador no ofrece. Ábrela en Google Chrome o Microsoft Edge.',
        ask: 'Habla con calma y toca "Siguiente pregunta" cuando termines.',
        gen: '',
        note: 'Nada de esto se envía ni se guarda: vive solo en esta página.',
        signed: 'Nada de esto se envía ni se guarda: vive solo en esta página.',
      };
      hint.textContent = m[state];
    };
    const setButtons = () => {
      main.hidden = false; main.disabled = false; again.hidden = true; cta.hidden = true; redoBtn.hidden = true; micBtn.hidden = true;
      if (state === 'intro') {
        main.textContent = 'Empezar con micrófono';
        if (!SR) { main.hidden = true; cta.hidden = false; }
      } else if (state === 'ask') {
        main.textContent = cur === DATA[spec].length - 1 ? 'Generar la nota' : 'Siguiente pregunta';
        micBtn.hidden = false; redoBtn.hidden = false;
        again.hidden = false; again.textContent = 'Salir';
      } else if (state === 'gen') { main.textContent = 'Redactando la nota…'; main.disabled = true; }
      else if (state === 'note') { main.textContent = 'Aprobar y firmar'; again.hidden = false; again.textContent = 'Repetir'; }
      else if (state === 'signed') { main.hidden = true; again.hidden = false; again.textContent = 'Repetir'; cta.hidden = false; }
      setHint();
    };

    const reset = () => {
      stopTimers(); hardStop();
      state = 'intro'; cur = 0; answers = []; problem = '';
      ta.value = ''; doc.textContent = ''; audit.textContent = ''; sign.hidden = true; sign.textContent = ''; listenBox.hidden = true;
      setButtons(); show('intro');
    };

    /* ---------- Preguntas ---------- */
    const ask = k => {
      const d = DATA[spec], my = token;
      cur = k; state = 'ask'; problem = '';
      qEl.textContent = d[k][0];
      nEl.textContent = k + 1; totalEl.textContent = d.length;
      bar.style.width = ((k + 1) / d.length * 100) + '%';
      ta.value = answers[k] || '';
      listenBox.hidden = true;
      setButtons(); show('ask');
      say(d[k][0], () => { if (my === token && state === 'ask' && cur === k) startListen(); });
    };
    const next = () => {
      stopListen(); stopSpeech();
      answers[cur] = clean(ta.value);
      if (cur + 1 < DATA[spec].length) ask(cur + 1); else generate();
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
      d.forEach(([, titulo], i) => {
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
        const msg = document.createElement('span'), b = document.createElement('b');
        if (faltan.length) { b.textContent = 'Falta información: '; msg.append(b, faltan.join(', ') + '. Se detecta antes de firmar, cuando todavía se puede completar.'); }
        else { b.textContent = 'Sin hallazgos. '; msg.append(b, 'Todas las secciones de la plantilla tienen información.'); }
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
      if (state === 'intro') { stopTimers(); answers = []; ask(0); }
      else if (state === 'ask') next();
      else if (state === 'note') doSign();
    });
    redoBtn.addEventListener('click', () => { if (state !== 'ask') return; ta.value = ''; answers[cur] = ''; startListen(); });
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
