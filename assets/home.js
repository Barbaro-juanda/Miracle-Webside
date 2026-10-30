/* Solo el inicio: titular, escena del portátil (un gesto = un paso), párrafo, circuito, cifra y cierre. */
(() => {
  const {$, $$, reduce, WA} = window.MZ;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;
  const stageEl = $('.stage');
  if (!animate) { document.body.classList.add('static'); if (stageEl) stageEl.classList.add('ready'); }
  // El escenario fijo se arma desde arriba: al recargar no se restaura un scroll a medio camino.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  /* ---------- Secuencia del portátil (video de Higgsfield en cuadros) ----------
     Si el HTML trae .seq, la pantalla viva (la consulta) se muda al hueco de la pantalla del video
     y el portátil en CSS queda oculto. Sin .seq, todo sigue como antes. */
  const seqEl = $('.seq'), seqScreen = $('.seq-screen');
  if (seqEl && seqScreen) seqScreen.appendChild($('.screen'));

  /* ---------- La pantalla del portátil se diseña a 1000 px y se escala ---------- */
  const screen = $('.screen');
  if (screen) { const fit = () => screen.style.setProperty('--s', screen.clientWidth / 1000); new ResizeObserver(fit).observe(screen); fit(); }

  /* ---------- Cinta de especialidades (lista real del portal) ---------- */
  const specs = ['Medicina general','Medicina familiar','Medicina interna','Pediatría','Neonatología','Ginecología y obstetricia','Medicina de urgencias','Cardiología','Dermatología','Endocrinología','Gastroenterología','Geriatría','Hematología','Infectología','Nefrología','Neumología','Neurología','Oncología clínica','Psiquiatría','Psicología clínica','Neuropsicología','Reumatología','Alergología e inmunología','Dolor y cuidados paliativos','Medicina física y rehabilitación','Medicina laboral','Anestesiología','Cirugía general','Neurocirugía','Cirugía plástica','Ortopedia y traumatología','Oftalmología','Otorrinolaringología','Urología','Radiología','Patología','Genética médica'];
  const track = $('#marquee');
  if (track) [...specs, ...specs].forEach((s, i) => { const el = document.createElement('span'); el.textContent = s; if (i >= specs.length) el.setAttribute('aria-hidden','true'); track.appendChild(el); });

  /* ---------- QR a WhatsApp: la librería se pide solo cuando el cierre está cerca ---------- */
  const qrBox = $('#qr');
  if (qrBox) {
    const hideQr = () => { const q = $('.qr'); if (q) q.style.display = 'none'; };
    const draw = () => {
      try {
        const q = qrcode(0, 'M'); q.addData(`https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero agendar una demostración de Miracle.')}`); q.make();
        qrBox.innerHTML = q.createSvgTag({cellSize:4, margin:0, scalable:true});
        const svg = $('svg', qrBox); svg.setAttribute('aria-label', 'Código QR para escribir a Miracle por WhatsApp'); svg.setAttribute('role', 'img');
      } catch (e) { hideQr(); }
    };
    const load = () => {
      if (window.qrcode) return draw();
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
      sc.onload = draw; sc.onerror = hideQr; document.head.appendChild(sc);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); load(); } }, {rootMargin:'900px 0px'});
      io.observe(qrBox);
    } else load();
  }

  /* ---------- Reproductor de la secuencia en canvas ----------
     Carga primero el cuadro 1, después uno de cada 8 (para poder mover el scroll de inmediato) y
     luego el resto. Si el cuadro pedido aún no llegó, dibuja el más cercano ya cargado. */
  function makeSeq(box) {
    const cv = $('.seq-cv', box), ctx = cv.getContext('2d');
    const n = +box.dataset.frames, dir = innerWidth < 900 ? 'm' : 'd';
    const imgs = new Array(n), state = {f: 0};
    const src = i => `/assets/hero/${dir}/${String(i + 1).padStart(3, '0')}.webp`;
    const load = i => { if (imgs[i]) return; const im = new Image(); im.decoding = 'async'; im.onload = () => { im.ok = true; if (Math.abs(i - state.f) < 1.5) draw(); }; im.src = src(i); imgs[i] = im; };
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d); draw(); };
    function draw() {
      const i = Math.round(state.f);
      let k = i;
      for (let r = 0; r < n; r++) { if (imgs[i - r]?.ok) { k = i - r; break; } if (imgs[i + r]?.ok) { k = i + r; break; } }
      const im = imgs[k]; if (!im?.ok || !cv.width) return;
      ctx.drawImage(im, 0, 0, cv.width, cv.height);
    }
    load(0);
    const rest = () => { for (let i = 0; i < n; i += 8) load(i); load(n - 1); setTimeout(() => { for (let i = 0; i < n; i++) load(i); }, 300); };
    if (document.readyState === 'complete') rest(); else addEventListener('load', rest, {once: true});
    new ResizeObserver(fit).observe(cv);
    return {state, draw, last: n - 1};
  }

  /* ---------- Utilidades de texto ---------- */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    return $$('.w', el);
  }

  if (animate) {
    gsap.registerPlugin(ScrollTrigger);
    // La barra de direcciones del celular cambia la altura y no debe recalcular (ni mover) el scroll.
    ScrollTrigger.config({ignoreMobileResize:true});

    {
    /* Hero: el titular entra letra por letra */
    // La entrada del titular, el párrafo y los botones es CSS (styles.css · "Entrada del inicio"): no espera a GSAP.

    /* ---------- El escenario: un gesto de scroll = un paso ----------
       La consulta es una línea de tiempo pausada con 5 posiciones (S): portátil cerrado y los
       pasos 01 a 04. Cada gesto en la parte de arriba de la página la lleva a la posición
       siguiente con una animación de tiempo fijo. No hay scroll "pegado" ni inercia que se acumule:
       al terminar el paso 04 el siguiente gesto deja pasar el scroll normal y la página sigue. */
    const stage = $('.stage'), copy = $('.hero-copy'), dw = $('.device-wrap'), dev = $('.device'), lid = $('.lid');
    const panel = $('.steps-panel'), items = $$('.sp-item'), utts = $$('#appTr .utt');
    const wsets = $$('.app-doc .ws').map(splitWords);
    const codes = $$('.app-codes .code'), audit = $('.app-audit'), sign = $('.app-sign');
    const rec = $('#appRec'), recLabel = $('#appRecLabel'), clock = $('#appClock'), saved = $('#appSaved');
    const spNum = $('#spNum'), spBar = $('#spBar'), spCue = $('#spCueText');
    const S = [0, 3.0, 4.8, 6.6, 8.2], MAX = S.length - 1;
    const home = $('.app-home'), cur = $('.ah-cursor'), pill = $('.ah-pill'), cap = $('#stCap'), railItems = $$('.ar-i');
    let capTxt = cap && cap.firstElementChild;
    let zbase = null;
    // Con animación, los pasos visibles son decorativos: el lector de pantalla y el teclado usan la lista .sr-steps.
    panel.setAttribute('aria-hidden', 'true'); $$('a', panel).forEach(l => l.tabIndex = -1);
    document.body.classList.add('has-sr-steps');
    let idx = 0, busy = false, tl = null;
    const seq = seqEl ? makeSeq(seqEl) : null;

    gsap.set(dw, {xPercent:-50, yPercent:-50, transformOrigin:'50% 44.6%'});
    /* Cámara: mide la pantalla en el plano general y calcula a dónde llevarla. Escritorio: a la derecha del
       texto, grande. Celular: el doble, centrada en la conversación (fx .3) o en la nota (fx .74). */
    const zMeasure = () => {
      const r = seqScreen.getBoundingClientRect();
      return zbase = {cx:r.left + r.width / 2, cy:r.top + r.height / 2, w:r.width, h:r.height, s:+gsap.getProperty(dw, 'scale'), x:+gsap.getProperty(dw, 'x'), y:+gsap.getProperty(dw, 'y')};
    };
    let zDesk = true;
    const zTarget = fx => {
      const b = zbase || zMeasure(), vw = innerWidth, vh = innerHeight, pr = panel.getBoundingClientRect();
      let k, tx, ty;
      if (zDesk) { const W = Math.max(b.w, Math.min(880, vw - pr.right - 56)); k = W / b.w; tx = pr.right + 28 + W / 2; ty = (96 + vh) / 2 - 34; }
      else { k = 2; tx = vw / 2 - (fx - .5) * b.w * k; ty = (116 + pr.top) / 2; }
      return {scale:b.s * k, x:b.x + tx - b.cx, y:b.y + ty - b.cy};
    };
    const mm = gsap.matchMedia();
    mm.add({desk:'(min-width: 900px)', mob:'(max-width: 899px)'}, ctx => {
      const desk = ctx.conditions.desk; zDesk = desk;
      gsap.set(dev, {rotateX:-58, scale:desk ? .6 : .8});
      gsap.set(dw, {y:() => innerHeight * (desk ? .16 : .2), x:0, scale:1});
      gsap.set(lid, {rotateX:-89});
      gsap.set(panel, {autoAlpha:0, y:20});
      gsap.set(home, {autoAlpha:0}); gsap.set(cur, {x:() => pill.offsetLeft - 190, y:() => pill.offsetTop - 120, autoAlpha:0});
      zbase = null;
      gsap.set(items, {autoAlpha:0, y:16});
      gsap.set(utts, {autoAlpha:0, y:10});
      wsets.flat().forEach(w => w.style.opacity = .1);
      gsap.set(codes, {autoAlpha:0, scale:.85});
      gsap.set([audit, sign], {autoAlpha:0, y:12});
      if (seq) { gsap.set(seqScreen, {autoAlpha:0}); seq.state.f = 0; }

      tl = gsap.timeline({paused:true, defaults:{ease:'none'}, onUpdate:paint});
      tl
        // 0 → 1 · el portátil se abre y empieza la consulta
        .to(copy, {y:-140, autoAlpha:0, duration:.8, ease:'power1.in'}, 0)
        .to('.scroll-hint', {autoAlpha:0, duration:.3}, 0)
        .to(seq ? seq.state : lid, seq ? {f:seq.last, duration:1.4, ease:'power2.inOut', onUpdate:seq.draw} : {rotateX:0, duration:1.4, ease:'power2.inOut'}, .1)
        .to(seq ? {} : dev, seq ? {duration:1.4} : {rotateX:-7, scale:1, duration:1.4, ease:'power2.inOut'}, .1)
        .to(dw, {y:() => desk ? -innerHeight * .1 : -innerHeight * .07, duration:1.4, ease:'power2.inOut'}, .1)
        .to(dw, {x:() => desk ? Math.max(0, Math.min(290, innerWidth * .2, innerWidth / 2 - 14 - dw.offsetWidth * 1.34 * .86 / 2)) : 0, scale:desk ? .86 : 1, duration:.7, ease:'power2.inOut'}, 1.3)
        .to(seq ? seqScreen : {}, seq ? {autoAlpha:1, duration:.35} : {duration:.35}, 1.3)
        // La pantalla de inicio de Notes: el cursor toca "Iniciar consulta" y arranca la grabación
        .to(home, {autoAlpha:1, duration:.01}, 1.3)
        .to(cur, {autoAlpha:1, duration:.2}, 1.7)
        .to(cur, {x:() => pill.offsetLeft + pill.offsetWidth * .6, y:() => pill.offsetTop + pill.offsetHeight * .55, duration:.45, ease:'power2.inOut'}, 1.8)
        .to(pill, {scale:.94, duration:.08}, 2.25).to(pill, {scale:1, duration:.12}, 2.33)
        .to(home, {autoAlpha:0, duration:.25}, 2.42)
        .to(panel, {autoAlpha:1, y:0, duration:.4}, 1.9)
        .to(items[0], {autoAlpha:1, y:0, duration:.3}, 2.2)
        .to(utts.slice(0, 3), {autoAlpha:1, y:0, duration:.25, stagger:.12}, 2.45)
        // Cámara: se acerca a la pantalla para que se lea (en el celular, a la conversación y luego a la nota)
        .to(dw, {scale:() => zTarget(.3).scale, x:() => zTarget(.3).x, y:() => zTarget(.3).y, duration:.65, ease:'power2.inOut'}, 2.35)
        // 1 → 2 · Miracle escribe
        .to(items[0], {autoAlpha:0, y:-16, duration:.25}, S[1])
        .to(items[1], {autoAlpha:1, y:0, duration:.3}, S[1] + .15)
        .to(utts.slice(3), {autoAlpha:1, y:0, duration:.3, stagger:.25}, S[1])
        .to(dw, desk ? {duration:.001} : {x:() => zTarget(.74).x, y:() => zTarget(.74).y, duration:.9, ease:'power2.inOut'}, S[1] + .3)
        .to(wsets[0], {opacity:1, duration:.05, stagger:.02}, S[1] + .2)
        .to(wsets[1], {opacity:1, duration:.05, stagger:.02}, S[1] + .45)
        .to(wsets[2], {opacity:1, duration:.05, stagger:.02}, S[1] + .9)
        // 2 → 3 · codifica y revisa
        .to(items[1], {autoAlpha:0, y:-16, duration:.25}, S[2])
        .to(items[2], {autoAlpha:1, y:0, duration:.3}, S[2] + .15)
        .to(wsets[3], {opacity:1, duration:.05, stagger:.02}, S[2])
        .to(codes, {autoAlpha:1, scale:1, duration:.25, stagger:.2, ease:'back.out(2)'}, S[2] + .5)
        .to(audit, {autoAlpha:1, y:0, duration:.3}, S[2] + 1.1)
        // 3 → 4 · usted firma
        .to(items[2], {autoAlpha:0, y:-16, duration:.25}, S[3])
        .to(items[3], {autoAlpha:1, y:0, duration:.3}, S[3] + .15)
        .to(sign, {autoAlpha:1, y:0, duration:.35, ease:'back.out(1.6)'}, S[3] + .3)
        // Plano general otra vez: el portátil vuelve a su sitio
        .to(dw, {scale:() => (zbase || zMeasure()).s, x:() => (zbase || zMeasure()).x, y:() => (zbase || zMeasure()).y, duration:1.1, ease:'power2.inOut'}, S[3] + .4)
        .to({}, {duration:.001}, S[4]);
      tl.time(S[idx]);
      paint();
      return () => { wsets.flat().forEach(w => w.style.opacity = ''); };
    });

    // Si cambia el tamaño de la ventana, la cámara se recalcula (se rehace la línea de tiempo desde el principio hasta donde estaba).
    let rzT = null;
    addEventListener('resize', () => {
      clearTimeout(rzT);
      rzT = setTimeout(() => { if (!tl || busy) return; const t = tl.time(); zbase = null; tl.time(0, true); tl.invalidate(); tl.time(t, true); paint(); }, 220);
    });

    // El estado inicial (portátil cerrado, panel oculto) ya está puesto: ahora sí se muestra la escena.
    requestAnimationFrame(() => stage.classList.add('ready'));

    /* Marcador, reloj y estado de la nota, según el punto de la línea de tiempo */
    function paint() {
      if (!tl) return;
      const t = tl.time();
      const k = t >= 7.4 ? 3 : t >= 5.7 ? 2 : t >= 3.9 ? 1 : 0;
      spNum.textContent = '0' + (k + 1);
      // La barra avanza continua con la línea de tiempo (no a saltos por paso): 25 % al terminar el paso 01 y 100 % en el 04.
      const bp = t <= S[1] ? .25 * Math.max(0, t) / S[1] : .25 + .75 * Math.min(1, (t - S[1]) / (S[MAX] - S[1]));
      spBar.style.transform = `scaleX(${bp.toFixed(4)})`;
      if (t < 2.3) { rec.className = 'app-rec'; recLabel.textContent = 'Lista para grabar'; clock.textContent = '00:00'; }
      else if (t < 7.4) { rec.className = 'app-rec live'; recLabel.textContent = 'Grabando consulta';
        const s = Math.round((t - 2.3) / (7.4 - 2.3) * 252); clock.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
      else { rec.className = 'app-rec done'; recLabel.textContent = 'Consulta terminada'; clock.textContent = '04:12'; }
      saved.textContent = t >= 7.6 ? 'Firmada' : t >= 3.9 ? 'Autoguardado' : 'Borrador';
      if (railItems.length > 1) { railItems[0].classList.toggle('on', t < 2.4); railItems[1].classList.toggle('on', t >= 2.4); }
      // Subtítulo guía: dice en grande qué está pasando en la pantalla
      if (capTxt) {
        const msg = t < 1.9 ? '' : t < 2.3 ? 'Abres Notes y tocas Iniciar consulta' : t < 3.9 ? 'Transcribiendo: el médico habla y Miracle escucha' : t < 5.7 ? 'Miracle redacta la nota por secciones' : t < 7.4 ? 'Sugiere los códigos y revisa que no falte nada' : 'Firmas, y la nota va a tu historia clínica';
        if (msg !== capTxt.dataset.m) {
          capTxt.dataset.m = msg; cap.classList.toggle('on', !!msg);
          if (msg) { const n = capTxt.cloneNode(false); n.textContent = msg; n.dataset.m = msg; capTxt.replaceWith(n); capTxt = n; }
        }
      }
      if (spCue) spCue.textContent = k === 3 ? 'Continúa hacia abajo' : 'Desliza para ver el siguiente paso';
    }

    /* ---------- Entrada: un gesto = un paso, sin descartar gestos y sin escaparse ----------
       Estados:
         busy    la línea de tiempo se está moviendo (paso o rebobinado)
         cooling pausa corta al terminar, para tragarse la cola de la inercia del trackpad
         queued  gestos distintos que llegaron mientras tanto (máximo 3): se ejecutan al terminar, en orden
       Reglas:
         - Solo cuenta arriba de todo; si la página ya bajó, el scroll es el normal.
         - Mientras hay animación, los eventos se bloquean (no mueven la página).
         - En el paso 04 (hacia abajo) o en el cerrado (hacia arriba), en cuanto termina la animación el
           scroll sigue normal en ese mismo gesto: "baja apenas termina el 04".
         - Una rueda girando sin parar avanza un paso por animación; un flick suelto, uno. */
    let cooling = false, queued = 0, qDir = 0;
    function finish() {
      busy = false; cooling = true;
      setTimeout(() => { cooling = false; flush(); }, 160);
    }
    function go(to) {
      to = Math.max(0, Math.min(MAX, to));
      if (to === idx || !tl) return false;
      const long = (idx === 0 && to === 1) || (idx === 1 && to === 0);
      idx = to; busy = true;
      tl.tweenTo(S[to], {duration:long ? 2.7 : 1.8, ease:'power2.inOut', onComplete:finish});
      return true;
    }
    function flush() {
      if (!queued || busy || cooling) return;
      const to = idx + qDir; queued--;
      if (to < 0 || to > MAX) { queued = 0; return; }
      go(to);
    }
    function enqueue(dir) {
      if (dir !== qDir) { queued = 0; qDir = dir; }
      const to = idx + dir * (queued + 1);
      if (to >= 0 && to <= MAX && queued < 3) queued++;
    }
    if (location.hash === '#debug') window.__go = go;

    /* Al volver a subir hasta el portátil con la consulta terminada, se rebobina sola de corrido:
       04 → 03 → 02 → 01 y el portátil se cierra. Al bajar de nuevo (un gesto por paso) se reabre. */
    function rewind() {
      if (idx !== MAX || busy || !tl) return;
      idx = 0; busy = true; queued = 0;
      tl.tweenTo(0, {duration:5, ease:'sine.inOut', onComplete:finish});
    }
    // Se rebobina en cuanto se vuelve a subir hasta el portátil (la mitad de la pantalla), aunque se haya bajado poco.
    let lastY = scrollY, wentDown = false;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (idx !== MAX) wentDown = false;
      else if (y > 120) wentDown = true;
      if (wentDown && y < lastY && y < innerHeight * .5) { wentDown = false; rewind(); }
      lastY = y;
    }, {passive:true});

    const atTop = () => scrollY < 2;
    const inField = e => /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    const atEnd = down => down ? idx === MAX : idx === 0;

    let lastEvt = 0, acc = 0;
    addEventListener('wheel', e => {
      if (e.ctrlKey) return;
      const now = performance.now(), gap = now - lastEvt;
      lastEvt = now;
      if (!atTop()) { acc = 0; return; }
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= innerHeight;
      if (Math.abs(dy) < 1) return;
      const down = dy > 0, locked = busy || cooling;
      if (atEnd(down) && !locked) return;              // sin más pasos en esa dirección: scroll normal
      e.preventDefault();
      if (gap > 200) acc = 0;
      if (locked) {
        if (!atEnd(down) && gap > 140) enqueue(down ? 1 : -1);   // otro gesto: queda en fila
        return;
      }
      acc += Math.abs(dy);
      if (acc >= 30) { acc = 0; go(idx + (down ? 1 : -1)); }
    }, {passive:false});

    let ty = null, tOk = false, tUsed = false;
    addEventListener('touchstart', e => { ty = e.touches[0].clientY; tOk = atTop(); tUsed = false; }, {passive:true});
    addEventListener('touchmove', e => {
      if (ty === null || !tOk) return;
      const dy = ty - e.touches[0].clientY, down = dy > 0, locked = busy || cooling;
      if (atEnd(down) && !locked) return;
      if (e.cancelable) e.preventDefault();
      if (tUsed || Math.abs(dy) < 28) return;
      tUsed = true;
      if (locked) { if (!atEnd(down)) enqueue(down ? 1 : -1); } else go(idx + (down ? 1 : -1));
    }, {passive:false});
    addEventListener('touchend', () => { ty = null; });

    addEventListener('keydown', e => {
      if (!atTop() || inField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey;
      const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      const locked = busy || cooling;
      if (atEnd(down) && !locked) return;
      e.preventDefault();
      if (locked) { if (!e.repeat && !atEnd(down)) enqueue(down ? 1 : -1); return; }
      go(idx + (down ? 1 : -1));
    });

    /* Ritmo de la página: la escena del párrafo es la más lenta (se fija 1,6 pantallas y las palabras se
       encienden con calma); de ahí en adelante cada escena pide menos scroll que la anterior
       (circuito ~0,5 pantallas, luego bloques, cifra y mosaico con menos aire), sin saltos bruscos. */
    document.body.classList.add('anim');
    const stEl = $('.statement');
    const sw = splitWords($('.split-words'));
    const rootCss = getComputedStyle(document.documentElement);
    const stDim = rootCss.getPropertyValue('--on-dark-dim').trim() || '#5b6d8f', stLit = rootCss.getPropertyValue('--on-dark').trim() || '#e6edf7';
    gsap.set(sw, {color:stDim});
    const stTl = gsap.timeline({defaults:{ease:'none'},
      scrollTrigger:{trigger:stEl, start:'top top', end:() => '+=' + Math.round(innerHeight * 1.6), pin:true, scrub:.35, anticipatePin:1, invalidateOnRefresh:true}});
    stTl.from('.statement p', {y:40, duration:.15, ease:'power2.out'}, 0)
        .to(sw, {color:stLit, duration:.06, stagger:{each:.74 / sw.length}}, .1)
        .to({}, {duration:.15});

    /* Circuito: las líneas salen del orbe y encienden cada producto */
    const wires = $$('.wire'), cards = $$('.cx-card');
    wires.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.from('.cx-orb', {scale:.6, autoAlpha:0, duration:.8, ease:'back.out(1.7)', scrollTrigger:{trigger:'.cx', start:'top 80%'}});
    gsap.to(wires, {strokeDashoffset:0, ease:'none', scrollTrigger:{trigger:'.cx', start:'top 72%', end:'top 30%', scrub:.3,
      onUpdate:self => cards.forEach(c => c.classList.toggle('lit', self.progress > .92))}});
    gsap.from(cards, {y:40, autoAlpha:0, duration:.8, ease:'power3.out', stagger:.12, scrollTrigger:{trigger:'.cx-cards', start:'top 85%'}});
    if (matchMedia('(max-width: 1024px)').matches) cards.forEach(c => ScrollTrigger.create({trigger:c, start:'top 70%', onEnter:() => c.classList.add('lit')}));

    /* Odómetro: 49 */
    const odo = $('#odo');
    odo.innerHTML = '49'.split('').map(d => `<span class="digit"><span class="reel">${'0123456789'.split('').map(n => `<span>${n}</span>`).join('')}</span></span>`).join('');
    const reels = $$('.reel', odo);
    gsap.set(reels, {yPercent:0});
    ScrollTrigger.create({trigger:odo, start:'top 80%', once:true, onEnter:() => {
      reels.forEach((r, i) => gsap.to(r, {yPercent:-(+'49'[i]) * 10, duration:1.6 + i * .3, ease:'power4.out'}));
    }});
    gsap.from('.numbers h2, .numbers p', {y:24, autoAlpha:0, duration:.7, stagger:.1, scrollTrigger:{trigger:'.numbers h2', start:'top 85%'}});

    }

    if ($('.closing')) gsap.from('.closing h2, .closing p, .closing .ctas, .qr', {y:30, autoAlpha:0, duration:.8, ease:'power3.out', stagger:.1, scrollTrigger:{trigger:'.closing', start:'top 70%'}});

    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
