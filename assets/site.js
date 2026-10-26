
(() => {
  const WA = '573134582806';
  const MAIL = 'dev@itsmiracleai.com';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const animate = hasGsap && !reduce;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.documentElement.classList.add('js');
  const onHome = !!$('.stage');

  if (!animate) document.body.classList.add('static');
  // El escenario fijo se arma desde arriba: al recargar no se restaura un scroll a medio camino.
  if (onHome && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (onHome && !location.hash) scrollTo(0, 0);

  /* ---------- Header: tema según la sección que tiene debajo ---------- */
  const hdr = $('.hdr');
  const darkSecs = $$('[data-theme="dark"]');
  function headerTheme() {
    const y = 36;
    const onDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    hdr.classList.toggle('on-dark', onDark);
    hdr.classList.toggle('scrolled', scrollY > 8 && !onDark);
  }
  addEventListener('scroll', headerTheme, {passive:true}); headerTheme();

  const menuBtn = $('.menu-btn'), mnav = $('#mnav');
  const setMenu = open => { mnav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); };
  menuBtn.addEventListener('click', () => setMenu(!mnav.classList.contains('open')));
  mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- La pantalla del portátil se diseña a 1000 px y se escala ---------- */
  const screen = $('.screen');
  if (screen) { const fit = () => screen.style.setProperty('--s', screen.clientWidth / 1000); new ResizeObserver(fit).observe(screen); fit(); }

  /* ---------- Cinta de especialidades (lista real del portal) ---------- */
  const specs = ['Medicina general','Medicina familiar','Medicina interna','Pediatría','Neonatología','Ginecología y obstetricia','Medicina de urgencias','Cardiología','Dermatología','Endocrinología','Gastroenterología','Geriatría','Hematología','Infectología','Nefrología','Neumología','Neurología','Oncología clínica','Psiquiatría','Psicología clínica','Neuropsicología','Reumatología','Alergología e inmunología','Dolor y cuidados paliativos','Medicina física y rehabilitación','Medicina laboral','Anestesiología','Cirugía general','Neurocirugía','Cirugía plástica','Ortopedia y traumatología','Oftalmología','Otorrinolaringología','Urología','Radiología','Patología','Genética médica'];
  const track = $('#marquee');
  if (track) [...specs, ...specs].forEach((s, i) => { const el = document.createElement('span'); el.textContent = s; if (i >= specs.length) el.setAttribute('aria-hidden','true'); track.appendChild(el); });

  /* ---------- QR a WhatsApp ---------- */
  if ($('#qr') && window.qrcode) try {
    const q = qrcode(0, 'M'); q.addData(`https://wa.me/${WA}?text=${encodeURIComponent('Hola, quiero agendar una demo de Miracle.')}`); q.make();
    $('#qr').innerHTML = q.createSvgTag({cellSize:4, margin:0, scalable:true});
    $('#qr svg').setAttribute('aria-label','Código QR para escribir a Miracle por WhatsApp'); $('#qr svg').setAttribute('role','img');
  } catch (e) { $('.qr') && ($('.qr').style.display = 'none'); }

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

  /* ---------- Conteo de cifras ---------- */
  function countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const end = +el.dataset.count, suf = el.dataset.suffix || '';
      if (!animate) { el.textContent = end.toLocaleString('es-CO') + suf; return; }
      const o = {v:0};
      gsap.to(o, {v:end, duration:1.1, ease:'power3.out', onUpdate:() => el.textContent = Math.round(o.v).toLocaleString('es-CO') + suf});
    });
  }

  if (!animate) { countUp(document); }
  else {
    gsap.registerPlugin(ScrollTrigger);

    if (onHome) {
    /* Hero: el titular entra letra por letra */
    const chars = $$('.hero-copy .split').flatMap(splitChars);
    gsap.from(chars, {yPercent:110, autoAlpha:0, rotate:6, duration:.9, ease:'power4.out', stagger:.018, delay:.15});
    gsap.from('.hero-copy p, .hero-copy .ctas', {y:20, autoAlpha:0, duration:.8, ease:'power3.out', delay:.75, stagger:.1});

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

    function go(to) {
      to = Math.max(0, Math.min(MAX, to));
      if (to === idx || !tl) return;
      const long = (idx === 0 && to === 1) || (idx === 1 && to === 0);
      idx = to; busy = true;
      tl.tweenTo(S[to], {duration:long ? 2.7 : 1.8, ease:'power2.inOut', onComplete:() => { busy = false; }});
    }
    if (location.hash === '#debug') window.__go = go;

    /* Al terminar el paso 04 el portátil se queda abierto y la página sigue hacia abajo con scroll normal.
       Si se baja y se vuelve a subir hasta el portátil, la consulta se rebobina sola, en un solo movimiento continuo:
       04 → 03 → 02 → 01 y el portátil se cierra. Al bajar de nuevo (un gesto por paso) se reabre. */
    function rewind() {
      if (idx !== MAX || busy || !tl) return;
      idx = 0; busy = true;
      tl.tweenTo(0, {duration:5, ease:'sine.inOut', onComplete:() => { busy = false; }});
    }
    ScrollTrigger.create({trigger:stage, start:'top top', end:() => '+=' + Math.round(innerHeight * .5), onEnterBack:rewind});

    /* Entradas: rueda, tacto y teclado. Solo cuentan arriba de todo: si la página ya bajó, el scroll es normal. */
    const atTop = () => scrollY < 2;
    const inField = e => /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    /* Un gesto = una serie de eventos de rueda separados por menos de 140 ms (incluye la inercia del trackpad).
       Al empezar un gesto se fija, para todo el gesto:
         - si empezó arriba de la página (si no, el scroll es normal),
         - si empezó con una animación en curso (entonces se ignora entero),
         - en qué paso estaba (solo un gesto que EMPIEZA en el paso 04 deja pasar el scroll hacia abajo;
           el gesto que acaba de llegar al 04 sigue bloqueado hasta que se suelte). */
    let lastWheel = 0, gOk = false, gBlocked = false, gIdx = 0, gUsed = false;
    addEventListener('wheel', e => {
      if (e.ctrlKey) return;
      const now = performance.now();
      if (now - lastWheel > 140) { gOk = atTop(); gBlocked = busy; gIdx = idx; gUsed = false; }
      lastWheel = now;
      if (!gOk || Math.abs(e.deltaY) < 1) return;
      const down = e.deltaY > 0;
      if (!gBlocked && (down ? gIdx === MAX : gIdx === 0)) return;   // empezó en el final (o en el inicio): scroll normal
      e.preventDefault();
      if (gBlocked || gUsed || busy) return;
      gUsed = true; go(idx + (down ? 1 : -1));
    }, {passive:false});

    let ty = null, tOk = false, tBlocked = false, tIdx = 0, tUsed = false;
    addEventListener('touchstart', e => { ty = e.touches[0].clientY; tOk = atTop(); tBlocked = busy; tIdx = idx; tUsed = false; }, {passive:true});
    addEventListener('touchmove', e => {
      if (ty === null || !tOk) return;
      const dy = ty - e.touches[0].clientY, down = dy > 0;
      if (!tBlocked && (down ? tIdx === MAX : tIdx === 0)) return;
      if (e.cancelable) e.preventDefault();
      if (!tBlocked && !tUsed && !busy && Math.abs(dy) > 28) { tUsed = true; go(idx + (down ? 1 : -1)); }
    }, {passive:false});
    addEventListener('touchend', () => { ty = null; });

    addEventListener('keydown', e => {
      if (!atTop() || inField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey;
      const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      if (busy) { e.preventDefault(); return; }                      // una tecla mantenida no se salta pasos ni se sale
      if (down ? idx === MAX : idx === 0) return;
      e.preventDefault(); go(idx + (down ? 1 : -1));
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

    if ($('.solo-row')) {
    /* Solo en Miracle */
    $$('.solo-row').forEach(row => {
      const st = {trigger:row, start:'top 75%'};
      gsap.from($$('.solo-copy > *', row), {y:28, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.08, scrollTrigger:st});
      gsap.from($('.mock', row), {y:70, rotateX:10, transformPerspective:1200, autoAlpha:0, duration:1, ease:'power3.out', scrollTrigger:st});
      const lis = $$('.finds li', row); if (lis.length) gsap.from(lis, {x:24, autoAlpha:0, duration:.5, stagger:.15, delay:.4, ease:'power2.out', scrollTrigger:st});
      const bars = $$('.bar b', row); if (bars.length) gsap.from(bars, {scaleY:0, transformOrigin:'bottom', duration:.9, stagger:.04, delay:.3, ease:'power3.out', scrollTrigger:st});
      if ($('[data-count]', row)) ScrollTrigger.create({...st, once:true, onEnter:() => countUp(row)});
    });

    }

    /* Mosaico, capó y cierre */
    if ($('.bento')) gsap.from('.bx', {y:40, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.08, scrollTrigger:{trigger:'.bento', start:'top 80%'}});
    if ($('.hood')) gsap.from('.hood > div', {y:30, autoAlpha:0, duration:.7, ease:'power3.out', stagger:.1, scrollTrigger:{trigger:'.hood', start:'top 82%'}});
    if ($('.closing')) gsap.from('.closing h2, .closing p, .closing .ctas, .qr', {y:30, autoAlpha:0, duration:.8, ease:'power3.out', stagger:.1, scrollTrigger:{trigger:'.closing', start:'top 70%'}});

    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* Aparición al entrar en pantalla (páginas sin GSAP) */
  const reveals = $$('[data-reveal]');
  if (reveals.length) {
    if (reduce || !('IntersectionObserver' in window)) reveals.forEach(r => r.classList.add('in'));
    else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -8% 0px'}); reveals.forEach(r => io.observe(r)); }
  }

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
    b.setAttribute('aria-label', longFmt.format(day));
    b.innerHTML = `<small>${dFmt.format(day).replace('.','')}</small><b>${day.getDate()}</b>`;
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
    if (selDay && selSlot) { summary.hidden = false; summary.textContent = `Demo el ${longFmt.format(selDay)} a las ${selSlot}, hora de Colombia.`; }
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
      'Hola, quiero agendar una demo de Miracle.',
      `Fecha: ${longFmt.format(selDay)}, ${selSlot} (hora de Colombia)`,
      `Nombre: ${v('f-name')}`, v('f-mail') && `Correo: ${v('f-mail')}`, `WhatsApp: ${v('f-tel')}`, `Tipo: ${v('f-type')}`,
      v('f-org') && `Institución: ${v('f-org')}`, v('f-size') && `Médicos: ${v('f-size')}`
    ].filter(Boolean).join('\n');
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Preparando su solicitud…';
    document.getElementById('mailAlt').href = `mailto:${MAIL}?subject=${encodeURIComponent('Demo de Miracle · ' + v('f-name'))}&body=${encodeURIComponent(msg)}`;
    setTimeout(() => {
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      form.hidden = true; document.getElementById('done').classList.add('show');
    }, 500);
  });
  }
})();
