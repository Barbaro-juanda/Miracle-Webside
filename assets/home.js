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
        const q = qrcode(0, 'M'); q.addData(`https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero agendar una demo de Miracle.')}`); q.make();
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

  /* ---------- Utilidades de texto ---------- */
  function splitChars(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const ws = document.createElement('span'); ws.className = 'word';
      [...w].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); });
      el.appendChild(ws); if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.setAttribute('aria-label', words.join(' '));
    return $$('.ch', el);
  }
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
    const chars = $$('.hero-copy .split').flatMap(splitChars);
    gsap.from(chars, {yPercent:110, autoAlpha:0, rotate:6, duration:.9, ease:'power4.out', stagger:.018, delay:.15});
    gsap.from('.hero-copy p, .hero-copy .ctas, .hero-copy .hero-links', {y:20, autoAlpha:0, duration:.8, ease:'power3.out', delay:.75, stagger:.1});

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
    const S = [0, 2.4, 4.2, 6.0, 7.6], MAX = S.length - 1;
    let idx = 0, busy = false, tl = null;

    gsap.set(dw, {xPercent:-50, yPercent:-50});
    const mm = gsap.matchMedia();
    mm.add({desk:'(min-width: 900px)', mob:'(max-width: 899px)'}, ctx => {
      const desk = ctx.conditions.desk;
      gsap.set(dev, {rotateX:-58, scale:desk ? .6 : .8});
      gsap.set(dw, {y:() => innerHeight * (desk ? .16 : .2), x:0, scale:1});
      gsap.set(lid, {rotateX:-89});
      gsap.set(panel, {autoAlpha:0, y:20});
      gsap.set(items, {autoAlpha:0, y:16});
      gsap.set(utts, {autoAlpha:0, y:10});
      wsets.flat().forEach(w => w.style.opacity = .1);
      gsap.set(codes, {autoAlpha:0, scale:.85});
      gsap.set([audit, sign], {autoAlpha:0, y:12});

      tl = gsap.timeline({paused:true, defaults:{ease:'none'}, onUpdate:paint});
      tl
        // 0 → 1 · el portátil se abre y empieza la consulta
        .to(copy, {y:-140, autoAlpha:0, duration:.8, ease:'power1.in'}, 0)
        .to('.scroll-hint', {autoAlpha:0, duration:.3}, 0)
        .to(lid, {rotateX:0, duration:1.4, ease:'power2.inOut'}, .1)
        .to(dev, {rotateX:-7, scale:1, duration:1.4, ease:'power2.inOut'}, .1)
        .to(dw, {y:() => desk ? -innerHeight * .1 : -innerHeight * .07, duration:1.4, ease:'power2.inOut'}, .1)
        .to(dw, {x:() => desk ? Math.max(0, Math.min(290, innerWidth * .2, innerWidth / 2 - 14 - dw.offsetWidth * 1.34 * .86 / 2)) : 0, scale:desk ? .86 : 1, duration:.7, ease:'power2.inOut'}, 1.3)
        .to(panel, {autoAlpha:1, y:0, duration:.4}, 1.6)
        .to(items[0], {autoAlpha:1, y:0, duration:.3}, 1.9)
        .to(utts.slice(0, 3), {autoAlpha:1, y:0, duration:.25, stagger:.12}, 1.85)
        // 1 → 2 · Miracle escribe
        .to(items[0], {autoAlpha:0, y:-16, duration:.25}, S[1])
        .to(items[1], {autoAlpha:1, y:0, duration:.3}, S[1] + .15)
        .to(utts.slice(3), {autoAlpha:1, y:0, duration:.3, stagger:.25}, S[1])
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
        .to({}, {duration:.001}, S[4]);
      tl.time(S[idx]);
      paint();
      return () => { wsets.flat().forEach(w => w.style.opacity = ''); };
    });

    // El estado inicial (portátil cerrado, panel oculto) ya está puesto: ahora sí se muestra la escena.
    requestAnimationFrame(() => stage.classList.add('ready'));

    /* Marcador, reloj y estado de la nota, según el punto de la línea de tiempo */
    function paint() {
      if (!tl) return;
      const t = tl.time();
      const k = t >= 6.8 ? 3 : t >= 5.1 ? 2 : t >= 3.3 ? 1 : 0;
      spNum.textContent = '0' + (k + 1);
      // La barra avanza continua con la línea de tiempo (no a saltos por paso): 25 % al terminar el paso 01 y 100 % en el 04.
      const bp = t <= S[1] ? .25 * Math.max(0, t) / S[1] : .25 + .75 * Math.min(1, (t - S[1]) / (S[MAX] - S[1]));
      spBar.style.transform = `scaleX(${bp.toFixed(4)})`;
      if (t < 1.6) { rec.className = 'app-rec'; recLabel.textContent = 'Lista para grabar'; clock.textContent = '00:00'; }
      else if (t < 6.8) { rec.className = 'app-rec live'; recLabel.textContent = 'Grabando consulta';
        const s = Math.round((t - 1.6) / (6.8 - 1.6) * 252); clock.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
      else { rec.className = 'app-rec done'; recLabel.textContent = 'Consulta terminada'; clock.textContent = '04:12'; }
      saved.textContent = t >= 7.0 ? 'Firmada' : t >= 3.3 ? 'Autoguardado' : 'Borrador';
      if (spCue) spCue.textContent = k === 3 ? 'Siga bajando' : 'Desplácese para el siguiente paso';
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
    gsap.set(sw, {color:'#2a3850'});
    const stTl = gsap.timeline({defaults:{ease:'none'},
      scrollTrigger:{trigger:stEl, start:'top top', end:() => '+=' + Math.round(innerHeight * 1.6), pin:true, scrub:.35, anticipatePin:1, invalidateOnRefresh:true}});
    stTl.from('.statement p', {y:40, duration:.15, ease:'power2.out'}, 0)
        .to(sw, {color:'#eef3fa', duration:.06, stagger:{each:.74 / sw.length}}, .1)
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
