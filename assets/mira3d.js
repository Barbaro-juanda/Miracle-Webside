/* MIRA en 3D de verdad: el colgante gira con el arrastre (izquierda, derecha, arriba, abajo y hasta boca abajo) con inercia,
   y el collar es una cuerda con física (Verlet) que se mece, reacciona al arrastre y no atraviesa el colgante.
   three.js se carga solo cuando la sección está cerca. Sin WebGL, queda la imagen fija. */
(() => {
  const stage = document.querySelector('.mira-stage'); if (!stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!hasGL) return;
  let started = false;
  const start = async () => {
    if (started) return; started = true;
    const base = 'https://cdn.jsdelivr.net/npm/three@0.152.2';
    try {
      const m = document.createElement('script'); m.type = 'importmap';
      m.textContent = JSON.stringify({imports: {three: base + '/build/three.module.js', 'three/addons/': base + '/examples/jsm/'}}); document.head.appendChild(m);
      const [T, G] = await Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]);
      init(T, G.GLTFLoader);
    } catch (e) { // navegador sin import maps: three clásico y colgante procedural
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js';
      s.onload = () => init(window.THREE, null); document.head.appendChild(s);
    }
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting) start(); }, {rootMargin: '900px 0px'}).observe(stage); else start();

  function init(T, GLTFLoader) {
    if (!T) return;
    const cv = document.createElement('canvas'); cv.className = 'mira-3d'; stage.appendChild(cv);
    const renderer = new T.WebGLRenderer({canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance'});
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(26, 1, .1, 100); camera.position.set(0, -.1, 13.3); camera.lookAt(0, -.1, 0);

    /* ---------- Entorno de estudio (reflejos del vidrio y del metal) ---------- */
    {
      const env = new T.Scene(); env.background = new T.Color(0x0a1426);
      const panel = (w, h, col, k, pos) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide}));
        m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
      };
      panel(7, 7, 0xffffff, 3.2, [-6, 5, 7]); panel(3, 9, 0x7fbaff, 3.0, [7, 0, 3]); panel(10, 3, 0xffffff, 1.6, [0, 7, -2]);
      panel(8, 8, 0x2a4a78, .8, [0, -7, 3]); panel(5, 5, 0xbfe0ff, 1.4, [-7, -2, -3]);
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .03).texture; pm.dispose();
    }
    const dl = new T.DirectionalLight(0x8fc4ff, 1.1); dl.position.set(4, 3, 6); scene.add(dl);

    /* ---------- Colgante ---------- */
    const pg = new T.Group(); scene.add(pg); const proc = new T.Group(); pg.add(proc);
    const arc = (cx, cy, r, a0, a1, n) => Array.from({length: n + 1}, (_, k) => { const a = a0 + (a1 - a0) * k / n; return new T.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)); });
    const RI = .8, RO = 1.0, ZH = .19, CO = .11, CI = .05;
    const prof = [new T.Vector2(RI + CI, -ZH),
      ...arc(RO - CO, -ZH + CO, CO, -Math.PI / 2, 0, 8), ...arc(RO - CO, ZH - CO, CO, 0, Math.PI / 2, 8),
      ...arc(RI + CI, ZH - CI, CI, Math.PI / 2, Math.PI, 5), ...arc(RI + CI, -ZH + CI, CI, Math.PI, 1.5 * Math.PI, 5)];
    const glassMat = new T.MeshPhysicalMaterial({color: 0xdde7f6, metalness: 0, roughness: .05, transmission: 1, thickness: .5, ior: 1.45, attenuationColor: new T.Color(0xaec4e0), attenuationDistance: 1.6, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: .05, side: T.DoubleSide});
    const ring = new T.Mesh(new T.LatheGeometry(prof, 120), glassMat); ring.rotation.x = Math.PI / 2; proc.add(ring);
    const dark = new T.MeshStandardMaterial({color: 0x14171e, metalness: .9, roughness: .5, envMapIntensity: .8});
    const cup = new T.Mesh(new T.CylinderGeometry(.83, .83, .34, 80), dark); cup.rotation.x = Math.PI / 2; proc.add(cup);
    // cara de metal cepillado, con una ligera cúpula
    const brushed = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) { const a = Math.random() * Math.PI * 2, r0 = Math.random() * 250, l = 20 + Math.random() * 90; g.strokeStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},.05)`; g.lineWidth = .7;
        g.beginPath(); g.arc(256, 256, r0, a, a + l / Math.max(r0, 30)); g.stroke(); }
      const t = new T.CanvasTexture(c); return t;
    })();
    const fp = Array.from({length: 18}, (_, k) => { const r = .82 * k / 17; return new T.Vector2(r, .07 * (1 - (r / .82) ** 2)); });
    const faceMat = new T.MeshStandardMaterial({color: 0x62666e, metalness: .7, roughness: .46, bumpMap: brushed, bumpScale: .12, envMapIntensity: 1.1});
    const face = new T.Mesh(new T.LatheGeometry(fp, 96), faceMat); face.rotation.x = Math.PI / 2; face.position.z = .06; proc.add(face);
    const back = new T.Mesh(new T.CircleGeometry(.9, 64), dark); back.rotation.y = Math.PI; back.position.z = -.185; proc.add(back);
    // LED con halo
    const led = new T.Mesh(new T.SphereGeometry(.04, 20, 20), new T.MeshBasicMaterial({color: 0xa8ccff})); led.position.z = .145; proc.add(led);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(120,175,255,1)'); gr.addColorStop(.25, 'rgba(60,120,255,.55)'); gr.addColorStop(1, 'rgba(40,90,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    const glow = new T.Sprite(new T.SpriteMaterial({map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true})); glow.scale.set(.6, .6, 1); glow.position.z = .135; pg.add(glow);
    // argolla de vidrio
    const bail = new T.Mesh(new T.TorusGeometry(.13, .05, 20, 48), glassMat); bail.rotation.y = Math.PI / 2; bail.position.y = 1.12; proc.add(bail);
    const ATT = new T.Vector3(0, 1.1, 0);
    if (GLTFLoader) new GLTFLoader().load('/assets/img/mira/mira.glb', g => {
      const model = g.scene, ledMat = new T.MeshBasicMaterial({color: 0xb4d4ff});
      model.traverse(o => {
        if (!o.isMesh) return; const n = o.name;
        if (/metal/.test(n)) { // UV plano para el cepillado
          const pa = o.geometry.attributes.position, uv = new Float32Array(pa.count * 2);
          for (let i = 0; i < pa.count; i++) { uv[i * 2] = pa.getX(i) * .64 + .5; uv[i * 2 + 1] = pa.getY(i) * .64 + .5; }
          o.geometry.setAttribute('uv', new T.BufferAttribute(uv, 2)); o.material = faceMat;
        } else o.material = /led/.test(n) ? ledMat : glassMat;
      });
      pg.remove(proc); pg.add(model);
    }, undefined, () => {});

    /* ---------- Collar: cuerda cerrada con física ---------- */
    const N = 48, YB = -.63, H = 3.0, W = 3.0;
    const raw = t => { const th = t * Math.PI * 2, k = (1 - Math.cos(th)) / 2, sn = Math.sin(th); return [(W / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 1 - .4 * k * k) * (.5 + .5 * k), YB + H * k]; };
    // reparte los nudos a igual distancia a lo largo de la curva (si no, la cuerda se arruga donde se juntan)
    const M = 2000, cum = [0], dp = [raw(0)];
    for (let j = 1; j <= M; j++) { const q2 = raw(j / M); dp.push(q2); cum.push(cum[j - 1] + Math.hypot(q2[0] - dp[j - 1][0], q2[1] - dp[j - 1][1])); }
    const total = cum[M], SEG = total / N, RS = [];
    for (let i = 0, j = 0; i < N; i++) { const d = i * SEG; while (cum[j + 1] < d) j++; const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1); RS.push([dp[j][0] + (dp[j + 1][0] - dp[j][0]) * f, dp[j][1] + (dp[j + 1][1] - dp[j][1]) * f]); }
    const tgt = i => RS[i];
    const X = new Float32Array(N), Y = new Float32Array(N), PX = new Float32Array(N), PY = new Float32Array(N), TX = new Float32Array(N), TY = new Float32Array(N), IM = new Float32Array(N).fill(1);
    for (let i = 0; i < N; i++) { const [x, y] = tgt(i); X[i] = PX[i] = TX[i] = x; Y[i] = PY[i] = TY[i] = y; }
    IM[0] = 0; const PCY = YB - 1.1;
    const weave = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = '#ffffff'; g.lineWidth = 6; for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); }
      g.strokeStyle = '#4a4a4a'; g.lineWidth = 3; for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k + 8, 0); g.lineTo(k + 72, 64); g.stroke(); }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(70, 1); t.anisotropy = 8; return t; })();
    const cordMat = new T.MeshStandardMaterial({color: 0x050608, emissive: 0x000000, roughness: .38, metalness: .25, envMapIntensity: 1.7});
    const cord = new T.Mesh(new T.BufferGeometry(), cordMat); scene.add(cord);
    const cordGroup = cord; // se mece con el giro del colgante
    const rebuildCord = () => {
      const pts = Array.from({length: N}, (_, i) => new T.Vector3(X[i], Y[i], 0));
      const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts, true, 'catmullrom', .5), 220, .042, 8, true);
      cord.geometry.dispose(); cord.geometry = g;
    };

    /* ---------- Estado del colgante e interacción ---------- */
    const q = new T.Quaternion(), qRest = new T.Quaternion(), tmpQ = new T.Quaternion(), tmpE = new T.Euler(), omega = new T.Vector3();
    let drag = false, lx = 0, ly = 0, lt = 0, idle = 99, clock = 0, kickX = 0;
    stage.addEventListener('dragstart', e => e.preventDefault()); stage.addEventListener('selectstart', e => e.preventDefault());
    stage.style.touchAction = 'pan-y'; // en móvil, el gesto vertical sigue desplazando la página
    stage.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); drag = true; idle = 0; lx = e.clientX; ly = e.clientY; lt = performance.now(); omega.set(0, 0, 0); stage.classList.add('grab'); try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
    const up = () => { drag = false; stage.classList.remove('grab'); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('lostpointercapture', up);
    stage.addEventListener('pointermove', e => {
      if (!drag) return;
      const now = performance.now(), dt = Math.max(8, now - lt) / 1000; lt = now;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; idle = 0;
      const ang = Math.hypot(dx, dy) * .0115; if (ang < 1e-5) return;
      const axis = new T.Vector3(dy, dx, 0).normalize();
      q.premultiply(tmpQ.setFromAxisAngle(axis, ang));
      omega.lerp(axis.multiplyScalar(ang / dt), .45);
      kickX = Math.max(-2, Math.min(2, kickX + dx * .0016));
    });

    /* ---------- Bucle ---------- */
    const size = () => { const w = stage.clientWidth || 400, h = stage.clientHeight || w; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); new ResizeObserver(size).observe(stage);
    const G = 7.5, K = 24, DAMP = .988;
    const step = dt => {
      clock += dt;
      // collar: integración de Verlet con resorte suave hacia su forma de reposo
      for (let i = 0; i < N; i++) {
        if (IM[i] === 0) continue;
        const vx = (X[i] - PX[i]) * DAMP, vy = (Y[i] - PY[i]) * DAMP; PX[i] = X[i]; PY[i] = Y[i];
        const wind = Math.sin(clock * 1.25 + Y[i] * 1.9) * .55 + Math.sin(clock * .53 + i) * .18;
        const kk = K;
        X[i] += vx + ((TX[i] - X[i]) * kk + wind + (i === 0 ? kickX * 60 : kickX * 25 * (Y[i] - YB) / H)) * dt * dt;
        Y[i] += vy + ((TY[i] - Y[i]) * kk - G * .3) * dt * dt;
      }
      kickX *= .82;
      for (let i = 0; i < N; i++) { // seguro: sin saltos ni valores rotos
        const ox = X[i] - TX[i], oy = Y[i] - TY[i], d = Math.hypot(ox, oy);
        if (!(d < 3)) { const k = d > 0 && isFinite(d) ? 3 / d : 0; X[i] = TX[i] + ox * k; Y[i] = TY[i] + oy * k; PX[i] = X[i]; PY[i] = Y[i]; }
      }
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < N; i++) {
          const j = (i + 1) % N, dx = X[j] - X[i], dy = Y[j] - Y[i], d = Math.hypot(dx, dy) || 1e-6, w = IM[i] + IM[j]; if (!w) continue;
          const diff = (d - SEG) / d / w; X[i] += dx * diff * IM[i]; Y[i] += dy * diff * IM[i]; X[j] -= dx * diff * IM[j]; Y[j] -= dy * diff * IM[j];
        }
        // el colgante pesa: el collar no lo atraviesa
        const cx = pg.position.x, cy = pg.position.y;
        for (let i = 5; i < N - 4; i++) { if (IM[i] === 0) continue; const dx = X[i] - cx, dy = Y[i] - cy, d = Math.hypot(dx, dy), r = 1.06;
          if (d < r) { const k = (r - d) / (d || 1e-6); X[i] += dx * k; Y[i] += dy * k; } }
      }
      // orientación del colgante: inercia tras soltar, y vuelve despacio a su postura natural
      if (!drag) {
        const w = omega.length();
        if (w > .02) { tmpQ.setFromAxisAngle(omega.clone().normalize(), w * dt); q.premultiply(tmpQ); omega.multiplyScalar(Math.exp(-1.7 * dt)); }
        idle += dt;
        const amp = reduce ? 0 : 1;
        tmpE.set(.05 * Math.sin(clock * .9) * amp, .42 * Math.sin(clock * .55) * amp, 0, 'YXZ'); qRest.setFromEuler(tmpE);
        if (idle > 3) q.slerp(qRest, 1 - Math.exp(-dt * 1.1));
      }
      q.normalize();
      // el colgante gira sobre su propio centro, justo como lo arrastra el dedo; la argolla lleva consigo el collar
      pg.quaternion.copy(q);
      pg.position.set(Math.sin(clock * .8) * .03 * (reduce ? 0 : 1), PCY + Math.sin(clock * 1.3) * .025 * (reduce ? 0 : 1), 0);
      const bw = ATT.clone().applyQuaternion(q).add(pg.position);
      X[0] = PX[0] = bw.x; Y[0] = PY[0] = bw.y;
      glow.material.opacity = .85 + .15 * Math.sin(clock * 2.6);
    };

    let raf = 0, last = 0, visible = true;
    const frame = t => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.033, (t - last) / 1000 || .016); last = t;
      step(dt * .5); step(dt * .5);
      rebuildCord(); renderer.render(scene, camera);
    };
    stage.classList.add('gl-on');
    frame(performance.now());
    if ('IntersectionObserver' in window) new IntersectionObserver(es => {
      const v = es[0].isIntersecting;
      if (v && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!v && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, {rootMargin: '120px'}).observe(stage);
    document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  }
})();
