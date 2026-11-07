/* Práctica de Notes: tú eres el paciente. Miracle hace cuatro preguntas como lo haría el médico, tú respondes
   en voz alta lo que quieras (inventado o real) y al final recibes la nota ordenada por secciones, con una
   revisión de lo que falta y una firma con huella SHA-256 real.
   - Todo es por voz: el cuadro de texto solo muestra lo que se transcribe.
   - El micrófono solo se activa al pulsar "Empezar con micrófono" y se apaga al terminar o al salir.
   - La voz la transcribe el reconocimiento de voz del navegador (Chrome y Edge); Miracle no recibe ni guarda
     audio ni respuestas. Por defecto no hay IA: las respuestas se ordenan por secciones. Si la persona lo activa y su
     dispositivo tiene WebGPU, un modelo abierto pequeño (WebLLM) redacta la historia clínica en el propio dispositivo. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ua = navigator.userAgent;
  const IS_SAFARI = /safari/i.test(ua) && !/chrome|crios|android|edg/i.test(ua);
  const IS_ANDROID = /android/i.test(ua);
  const IS_BRAVE = !!navigator.brave; // Brave no trae el servicio de dictado de Google: allí se graba la voz y se transcribe en /api/transcribir
  const CAN_REC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let useRec = (IS_BRAVE || !SR) && CAN_REC;
  const CAN = !!SR || CAN_REC;
  // En Android el micrófono solo lo puede tener una captura a la vez: si el medidor lo retiene, el dictado de Chrome se queda sordo.
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
  /* ---------- Redacción: motor liviano de Miracle en /api/nota. Si no responde, la nota usa las palabras de la persona ---------- */
  const redactar = async (spec, answers) => {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 25000);
    try {
      const r = await fetch('/api/nota', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({spec, respuestas: answers}), signal: c.signal});
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j.secciones) || !j.secciones.length) throw new Error('forma');
      return j.secciones;
    } finally { clearTimeout(t); }
  };
  const NO_DICHO = 'No mencionado en la consulta.';
  const words = t => (t.match(/\S+/g) || []).length;

  document.querySelectorAll('[data-demo]').forEach(root => {
    const $ = s => root.querySelector(s);
    const stage = $('.ld-stage'), views = {};
    root.querySelectorAll('[data-view]').forEach(v => { views[v.dataset.view] = v; });
    const tabs = [...root.querySelectorAll('[data-spec]')];
    const main = $('[data-act="main"]'), again = $('[data-act="again"]'), cta = $('[data-act="cta"]'),
      redoBtn = $('[data-act="redo"]'), micBtn = $('[data-act="mic"]'), skipBtn = $('[data-act="skip"]');
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
      // En Safari y en Android el medidor y el dictado compiten por el micrófono: ahí solo se pide el permiso y se suelta.
      if ((IS_SAFARI || IS_ANDROID) && !useRec) { stream.getTracks().forEach(t => t.stop()); stream = null; await new Promise(r => setTimeout(r, 350)); return {ok: true, meter: false}; }
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
      micBtn.textContent = on ? (useRec ? 'Terminar y transcribir' : 'Pausar micrófono') : (problem ? 'Reintentar micrófono' : 'Hablar');
      root.classList.toggle('is-listening', on);
      if (on) { listenBox.classList.remove('bad'); statusEl.textContent = useRec ? 'Grabando… responde en voz alta y toca "Terminar y transcribir"' : 'Escuchando… responde en voz alta'; listenBox.hidden = false; }
      else if (!problem) listenBox.hidden = true;
    };
    const stopListen = () => {
      listening = false; discardRec();
      if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; rec.onstart = null; try { rec.abort(); } catch (e) {} rec = null; }
      stopMeter(); setListenUI(false);
    };
    const fail = txt => { problem = txt; listening = false; discardRec(); if (rec) { rec.onend = null; try { rec.abort(); } catch (e) {} rec = null; } stopMeter(); setListenUI(false); setStatus(txt, true); };

    /* ---------- Modo grabación (Brave y navegadores sin dictado): se graba y se transcribe al terminar ---------- */
    let mr = null, chunks = [], mrTimer = 0, transcribing = false;
    const discardRec = () => {
      clearTimeout(mrTimer); mrTimer = 0;
      if (mr) { mr.ondataavailable = null; mr.onstop = null; try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {} mr = null; }
      chunks = [];
    };
    const blobB64 = blob => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.onerror = no; f.readAsDataURL(blob); });
    const startRecorder = () => {
      let rec2;
      try {
        const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        rec2 = new MediaRecorder(stream, tipo ? {mimeType: tipo, audioBitsPerSecond: 32000} : {audioBitsPerSecond: 32000});
      } catch (e) { fail('No pudimos grabar el audio en este navegador. Toca "Reintentar micrófono".'); return; }
      mr = rec2; chunks = []; base = ta.value.trim() ? ta.value.trim() + ' ' : '';
      rec2.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec2.start(1000); listening = true; problem = ''; setListenUI(true);
      mrTimer = setTimeout(() => { if (mr === rec2) finishRec(); }, 45000); // clips cortos: una respuesta por pregunta
    };
    // Termina la grabación, la transcribe y deja el texto en la caja. Devuelve una promesa para poder esperarla.
    const finishRec = () => new Promise(done => {
      const r2 = mr; if (!r2) { done(); return; }
      clearTimeout(mrTimer); mrTimer = 0; listening = false; transcribing = true;
      const my = token, k = cur;
      r2.onstop = async () => {
        const mime = (r2.mimeType || 'audio/webm').split(';')[0], blob = new Blob(chunks, {type: r2.mimeType || mime});
        mr = null; chunks = []; stopMeter(); setListenUI(false);
        setStatus('Transcribiendo tu respuesta…');
        try {
          if (blob.size < 1500) throw new Error('vacio');
          const res = await fetch('/api/transcribir', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({mime: r2.mimeType || mime, audio: await blobB64(blob)})});
          if (!res.ok) throw new Error('http ' + res.status);
          const j = await res.json();
          if (my === token && state === 'ask' && cur === k) {
            const t = (j.texto || '').trim();
            if (t) { ta.value = base + t; listenBox.hidden = true; problem = ''; }
            else { problem = 'No se oyó nada en la grabación. Revisa tu micrófono y toca "Reintentar micrófono".'; setListenUI(false); setStatus(problem, true); }
          }
        } catch (e) {
          if (my === token && state === 'ask' && cur === k) { problem = 'No pudimos transcribir tu voz. Toca "Reintentar micrófono" o salta la pregunta.'; setListenUI(false); setStatus(problem, true); }
        }
        transcribing = false; done();
      };
      try { r2.stop(); } catch (e) { transcribing = false; mr = null; done(); }
    });

    const startRec = () => {
      const r = new SR();
      rec = r; r.lang = 'es-CO'; r.interimResults = true; r.continuous = !IS_ANDROID; // en Android, continuous repite el texto: se dicta por frases y se reanuda
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
        else if ((e.error === 'network' || e.error === 'language-not-supported') && CAN_REC) { useRec = true; setTimeout(() => { if (state === 'ask') startListen(); }, 50); }
        else if (e.error === 'network' || e.error === 'language-not-supported') fail('El servicio de voz de este navegador no responde (' + e.error + '). Abre la página en Google Chrome o Microsoft Edge y toca "Reintentar micrófono".');
        else fail('El dictado se interrumpió (' + e.error + '). Toca "Reintentar micrófono".');
      };
      // El navegador corta el dictado tras un rato de silencio: se reanuda mientras siga en la pregunta.
      // Si corta una y otra vez sin oír nada, se avisa en vez de seguir en silencio.
      r.onend = () => {
        if (!(listening && rec === r)) return;
        if (Date.now() - startedAt < 1200) quickEnds++; else quickEnds = 0;
        if (quickEnds >= 3 && CAN_REC) { useRec = true; stopListen(); setTimeout(() => { if (state === 'ask') startListen(); }, 50); return; }
        if (quickEnds >= 3) { fail('El dictado se corta apenas empieza' + (lastErr ? ' (' + lastErr + ')' : '') + '. Abre la página en Google Chrome o Microsoft Edge y toca "Reintentar micrófono".'); return; }
        base = ta.value.trim() ? ta.value.trim() + ' ' : '';
        later(() => { if (listening && rec === r) { startedAt = Date.now(); try { r.start(); } catch (e) {} } }, 250);
      };
      startedAt = Date.now();
      try { r.start(); listening = true; problem = ''; setListenUI(true); } catch (e) { fail('No pudimos activar el dictado. Toca "Reintentar micrófono".'); }
    };
    const startListen = async () => {
      if (!CAN || state !== 'ask' || transcribing) return;
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
      if (useRec) startRecorder(); else startRec();
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
        intro: CAN ? (useRec ? 'Tu navegador no trae dictado de voz (como Brave): se graba tu voz solo mientras respondes y se envía a un servicio de IA para transcribirla. No se guarda. El texto también se envía a la IA para redactar la nota.' : 'Usa el dictado de voz de tu navegador (Chrome o Edge) solo para esta práctica; Miracle no recibe tu audio. El texto de tus respuestas se envía a un servicio de IA para redactar la nota y no se guarda. En tus consultas, Miracle captura la conversación con MIRA.') : 'Esta práctica necesita el dictado de voz, que tu navegador no ofrece. Ábrela en Google Chrome o Microsoft Edge.',
        ask: 'Habla con calma y toca "Siguiente pregunta" cuando termines.',
        gen: '',
        note: 'Tus respuestas se enviaron a un servicio de IA solo para redactar la nota; no las guardamos.',
        signed: 'Tus respuestas se enviaron a un servicio de IA solo para redactar la nota; no las guardamos.',
      };
      hint.textContent = m[state];
    };
    const setButtons = () => {
      main.hidden = false; main.disabled = false; again.hidden = true; cta.hidden = true; redoBtn.hidden = true; micBtn.hidden = true; skipBtn.hidden = true;
      if (state === 'intro') {
        main.textContent = 'Empezar la práctica';
        if (!CAN) { main.hidden = true; cta.hidden = false; }
      } else if (state === 'ask') {
        main.textContent = cur === DATA[spec].length - 1 ? 'Generar la nota' : 'Siguiente pregunta';
        micBtn.hidden = false; redoBtn.hidden = false; skipBtn.hidden = cur === DATA[spec].length - 1;
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
    const next = async () => {
      stopSpeech();
      if (mr) { main.disabled = true; await finishRec(); main.disabled = false; if (state !== 'ask') return; }
      else if (transcribing) return;
      stopListen();
      answers[cur] = clean(ta.value);
      if (cur + 1 < DATA[spec].length) ask(cur + 1); else generate();
    };

    /* ---------- La nota ---------- */
    const genP = $('[data-genp]');
    const generateAI = async my => {
      steps.forEach((x, k) => x.className = k === 0 ? 'now' : '');
      later(() => { if (my === token && state === 'gen') steps.forEach((x, k) => x.className = k === 0 ? 'done' : k === 1 ? 'now' : ''); }, 900);
      genP.hidden = false; genP.textContent = 'Miracle está redactando la historia clínica…';
      try {
        const secs = await redactar(spec, answers);
        if (my !== token) return;
        steps.forEach(x => x.className = 'done'); genP.hidden = true; buildNote(secs);
      } catch (e) {
        if (my !== token) return;
        genP.hidden = true; iaFailed = true; steps.forEach(x => x.className = 'done'); buildNote();
      }
    };
    let iaFailed = false;
    const generate = () => {
      stopTimers(); const my = token;
      state = 'gen'; setButtons(); show('gen');
      steps.forEach(s => s.className = '');
      if (!iaFailed && answers.some(a => words(a) >= 2)) { generateAI(my); return; }
      if (reduce) { buildNote(); return; }
      steps.forEach((s, i) => later(() => { if (my !== token) return; steps.forEach((x, k) => x.className = k < i ? 'done' : k === i ? 'now' : ''); }, i * 650));
      later(() => { steps.forEach(x => x.className = 'done'); }, steps.length * 650);
      later(buildNote, steps.length * 650 + 400);
    };
    const buildNote = secs => {
      const my = token;
      state = 'note'; doc.textContent = ''; audit.textContent = ''; sign.hidden = true;
      const lista = secs || DATA[spec].map(([, titulo], i) => ({titulo, texto: words(answers[i]) < 2 ? NO_DICHO : answers[i]}));
      const faltan = [];
      let delay = 0;
      lista.forEach(({titulo, texto}) => {
        const sec = document.createElement('div'); sec.className = 'ld-sec';
        const head = document.createElement('div'); head.className = 'ld-sec-h';
        const h = document.createElement('div'); h.className = 'h5'; h.textContent = titulo;
        const cp = document.createElement('button'); cp.type = 'button'; cp.className = 'ld-copy'; cp.textContent = 'Copiar';
        cp.addEventListener('click', () => { try { navigator.clipboard.writeText(titulo + '\n' + texto); cp.textContent = 'Copiado'; setTimeout(() => { cp.textContent = 'Copiar'; }, 1400); } catch (e) {} });
        head.append(h, cp);
        const p = document.createElement('p');
        if (texto === NO_DICHO) { faltan.push(titulo); p.className = 'ld-missing'; p.textContent = NO_DICHO; }
        else (texto.match(/\S+/g) || []).forEach(w => {
          const s = document.createElement('span'); s.className = 'w' + (reduce ? ' on' : ''); s.textContent = w + ' '; p.appendChild(s);
          if (!reduce) { later(() => { if (my === token) s.classList.add('on'); }, delay); delay += 22; }
        });
        if (!reduce) delay += 90;
        sec.append(head, p); doc.appendChild(sec);
      });
      const nota = document.createElement('p'); nota.className = 'ld-doc-note';
      nota.textContent = secs ? 'La redactó una IA a partir de lo que dijiste, con las reglas de redacción de Miracle: solo usa lo dicho y marca lo que falta. Puede equivocarse, por eso el médico la revisa antes de firmar. En Ü Notes la nota sigue tu plantilla y sugiere los códigos CIE-10 y CUPS.' : 'Esta vez la nota usa tus palabras, ordenadas por las secciones de la plantilla. En Ü Notes, la IA las redacta en lenguaje clínico y sugiere los códigos CIE-10 y CUPS.';
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
    skipBtn.addEventListener('click', () => { if (state !== 'ask') return; ta.value = ''; answers[cur] = ''; next(); });
    redoBtn.addEventListener('click', () => { if (state !== 'ask') return; ta.value = ''; answers[cur] = ''; startListen(); });
    micBtn.addEventListener('click', () => { if (listening) { if (useRec) finishRec(); else stopListen(); } else startListen(); });
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
