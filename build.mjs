// Arma el sitio: lee src/pages/*.html y src/posts.json y escribe las páginas en la raíz.
// Uso: node build.mjs   (no necesita dependencias)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = { url: 'https://itsmiracleai.com.co', name: 'Miracle', today: '2026-10-26' }; // PENDIENTE (jefe): dominio final
const posts = JSON.parse(readFileSync('src/posts.json', 'utf8'));
const NAV = [['Soluciones', '/soluciones'], ['Cómo funciona', '/#como-funciona'], ['Planes', '/planes'], ['Blog', '/blog'], ['Seguridad', '/seguridad']];

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const abs = p => SITE.url + (p === '/' ? '/' : p);

const pages = [
  { path: '/', src: 'index', out: 'index.html', gsap: true, js: 'home',
    title: 'Historia clínica con IA para médicos e IPS | Miracle',
    desc: 'Miracle escucha la consulta, escribe la nota clínica, sugiere CIE-10 y CUPS y audita cada historia antes de firmar. Agende una demo para su consultorio o IPS.' },
  { path: '/soluciones', src: 'soluciones', out: 'soluciones.html', crumbs: [['Soluciones']], faq: true,
    title: 'Notes, Analytics y Auditorías para médicos e IPS | Miracle',
    desc: 'Tres productos para una misma consulta: Notes escribe la historia clínica, Auditorías la revisa antes de firmar y Analytics muestra el servicio a la gerencia.' },
  { path: '/notes', src: 'notes', out: 'notes.html', gsap: true, js: 'product', navPath: '/soluciones', faq: true, crumbs: [['Soluciones', '/soluciones'], ['Notes']],
    app: { name: 'Miracle Notes', description: 'Escribe la nota clínica a partir de la consulta, sugiere códigos CIE-10 y CUPS, permite firma electrónica y exporta a PDF y RIPS.' },
    title: 'Notes: la nota clínica escrita por la IA | Miracle',
    desc: 'Notes escucha la consulta, arma la nota por secciones con la plantilla de su especialidad, sugiere CIE-10 y CUPS y queda lista para que usted la firme.' },
  { path: '/auditorias', src: 'auditorias', out: 'auditorias.html', gsap: true, js: 'product', navPath: '/soluciones', faq: true, crumbs: [['Soluciones', '/soluciones'], ['Auditorías']],
    app: { name: 'Miracle Auditorías', description: 'Revisa cada nota clínica antes de firmar y señala lo que falta, con la frase de la consulta que lo respalda.' },
    title: 'Auditorías: cada nota revisada antes de firmar | Miracle',
    desc: 'Auditorías compara la nota con lo que se habló en la consulta y le dice qué falta, con la frase exacta, antes de firmar y antes de que la nota llegue a RIPS.' },
  { path: '/analytics', src: 'analytics', out: 'analytics.html', gsap: true, js: 'product', navPath: '/soluciones', faq: true, crumbs: [['Soluciones', '/soluciones'], ['Analytics']],
    app: { name: 'Miracle Analytics', description: 'Reportes de gerencia con la adopción por médico y servicio, las notas firmadas y los lotes RIPS de la institución.' },
    title: 'Analytics: el servicio de su IPS, en números | Miracle',
    desc: 'Analytics convierte lo que ya pasa en cada consulta en reportes para la dirección médica: adopción, notas firmadas el mismo día y lotes RIPS listos.' },
  { path: '/planes', src: 'planes', out: 'planes.html', crumbs: [['Planes']], faq: true,
    title: 'Planes para médicos independientes e IPS | Miracle',
    desc: 'Notes con 14 días de prueba para el médico independiente y licencias a la medida para IPS, clínicas y hospitales. Compare los dos planes y resuelva sus dudas.' },
  { path: '/blog', src: 'blog', out: 'blog.html', crumbs: [['Blog']],
    title: 'Blog de Miracle: práctica clínica, auditoría y codificación',
    desc: 'Artículos sobre cómo recuperar tiempo de consulta, qué revisar antes de firmar una nota y cómo codificar CIE-10 y CUPS sin buscar en tablas, con ejemplos.' },
  { path: '/seguridad', src: 'seguridad', out: 'seguridad.html', crumbs: [['Seguridad']], faq: true,
    title: 'Seguridad clínica: roles, trazabilidad y firma | Miracle',
    desc: 'Revisión humana, datos aislados por institución, roles y permisos, trazabilidad y firma con huella digital. Lo que Miracle hace hoy para cuidar cada nota.' },
  { path: '/agendar', src: 'agendar', out: 'agendar.html', js: 'agendar', crumbs: [['Agendar']],
    title: 'Agende una demo de Miracle en 30 minutos | Miracle',
    desc: 'Elija día y hora y vea Miracle funcionando con una consulta de su especialidad. Le confirmamos por WhatsApp o correo, con el enlace de la videollamada.' },
];
for (const p of posts) pages.push({ path: `/blog/${p.slug}`, post: p, out: `blog/${p.slug}.html`, navPath: '/blog',
  crumbs: [['Blog', '/blog'], [p.title]], title: p.title.length < 45 ? `${p.title} | Blog de Miracle` : p.title, desc: p.desc || p.excerpt });

/* ---------- Piezas compartidas ---------- */
const svgDefs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <radialGradient id="orb-core" cx="43%" cy="41%" r="64%"><stop offset="0%" stop-color="#57d2fd"/><stop offset="30%" stop-color="#37c9fd"/><stop offset="62%" stop-color="#12aef2"/><stop offset="100%" stop-color="#0a9aea"/></radialGradient>
    <radialGradient id="orb-rim" cx="50%" cy="50%" r="50%"><stop offset="68%" stop-color="#fff" stop-opacity="0"/><stop offset="88%" stop-color="#c8ecff" stop-opacity=".45"/><stop offset="97%" stop-color="#fff" stop-opacity=".92"/><stop offset="100%" stop-color="#fff"/></radialGradient>
    <radialGradient id="orb-halo" cx="50%" cy="50%" r="50%"><stop offset="52%" stop-color="#7fd8ff" stop-opacity=".42"/><stop offset="72%" stop-color="#7fd8ff" stop-opacity=".18"/><stop offset="100%" stop-color="#7fd8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="orb-spec" cx="32%" cy="30%" r="42%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <symbol id="orb" viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="240" fill="url(#orb-halo)"/><circle cx="256" cy="256" r="168" fill="url(#orb-core)"/><circle cx="256" cy="256" r="168" fill="url(#orb-spec)"/><circle cx="256" cy="256" r="168" fill="url(#orb-rim)"/>
      <circle cx="256" cy="256" r="166" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="4"/><path d="M152 194A166 166 0 0 1 322 93" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>
    </symbol>
  </defs>
</svg>`;

const header = cur => `<header class="hdr" id="top">
  <div class="wrap">
    <a href="/" class="logo" aria-label="Miracle, inicio"><svg width="34" height="34" aria-hidden="true"><use href="#orb"/></svg><span>Miracle</span></a>
    <nav class="nav" aria-label="Principal">
      ${NAV.map(([l, h]) => `<a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${l}</a>`).join('\n      ')}
    </nav>
    <div class="hdr-cta">
      <a class="login" href="https://itsmiracleai.com.co/login">Ingresar</a>
      <a class="btn btn-primary" href="/agendar">Agendar demo</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="mnav" aria-label="Abrir menú"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>
<nav class="mnav" id="mnav" aria-label="Menú móvil">
  ${NAV.map(([l, h]) => `<a href="${h}">${l}</a>`).join('\n  ')}
  <a href="/agendar">Agendar demo</a>
  <a href="https://itsmiracleai.com.co/login">Ingresar</a>
</nav>`;

const footer = `<footer>
  <div class="wrap foot">
    <div><a href="/" class="logo" aria-label="Miracle, inicio"><svg width="30" height="30" aria-hidden="true"><use href="#orb"/></svg><span>Miracle</span></a>
      <p>Para que el médico mire al paciente, no la pantalla.</p></div>
    <div><p class="fh">Productos</p><ul><li><a href="/notes">Notes</a></li><li><a href="/analytics">Analytics</a></li><li><a href="/auditorias">Auditorías</a></li><li><a href="/planes">Planes</a></li></ul></div>
    <div><p class="fh">Miracle</p><ul><li><a href="/#como-funciona">Cómo funciona</a></li><li><a href="/seguridad">Seguridad</a></li><li><a href="/blog">Blog</a></li><li><a href="https://itsmiracleai.com.co/login">Ingresar</a></li></ul></div>
    <div><p class="fh">Contacto</p><ul><li><a href="/agendar">Agendar demo</a></li><li><a href="https://wa.me/573134582806" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="mailto:dev@itsmiracleai.com">dev@itsmiracleai.com</a></li></ul></div>
  </div>
  <div class="wrap legal"><span>© 2026 Miracle. Colombia.</span><span>Miracle apoya la documentación clínica. Las decisiones clínicas son del médico.</span></div>
</footer>
<a class="wa" href="https://wa.me/573134582806?text=Hola%2C%20quiero%20conocer%20Miracle." target="_blank" rel="noopener" aria-label="Escribir a Miracle por WhatsApp">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
</a>`;

const ctaBand = `<section class="cta-band" aria-labelledby="h-cta"><div class="wrap"><div class="box" data-reveal>
  <div><h2 id="h-cta">¿Lo vemos funcionando en su consulta?</h2><p>Son 30 minutos, con una consulta de su especialidad.</p></div>
  <div class="ctas"><a class="btn btn-light" href="/agendar">Agendar una demo</a><a class="btn btn-dark-ghost" href="https://itsmiracleai.com.co/registro">Probar Notes gratis</a></div>
</div></div></section>`;

const crumbsHtml = pg => !pg.crumbs ? '' : `<nav class="crumbs" aria-label="Ruta"><ol><li><a href="/">Inicio</a></li>${pg.crumbs.map(([l, h], i) =>
  `<li>${h && i < pg.crumbs.length - 1 ? `<a href="${h}">${l}</a>` : `<span aria-current="page">${l}</span>`}</li>`).join('')}</ol></nav>`;

const postCard = p => `<a class="post" href="/blog/${p.slug}" data-reveal>
        <div class="art" aria-hidden="true">${p.art}</div>
        <div class="txt"><span class="cat">${p.cat}</span><h3>${p.title}</h3><p>${p.excerpt}</p><span class="meta">${p.dateLabel} · ${p.minutes} min de lectura</span></div>
      </a>`;

/* ---------- Datos estructurados ---------- */
const orgGraph = [
  { '@type': 'Organization', '@id': SITE.url + '/#org', name: 'Miracle', url: SITE.url + '/',
    description: 'Software clínico con IA para Colombia: notas clínicas, analítica para la gerencia y auditoría de historias clínicas.',
    logo: SITE.url + '/icon-512.png', email: 'dev@itsmiracleai.com', areaServed: 'CO',
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: '+57-313-458-2806', availableLanguage: 'es' } },
  { '@type': 'WebSite', '@id': SITE.url + '/#web', url: SITE.url + '/', name: 'Miracle', inLanguage: 'es-CO', publisher: { '@id': SITE.url + '/#org' } },
];
function schemaFor(pg, body) {
  const g = [...orgGraph];
  if (pg.crumbs) g.push({ '@type': 'BreadcrumbList', itemListElement: [['Inicio', '/'], ...pg.crumbs.map(([l, h], i) => [l, i === pg.crumbs.length - 1 ? pg.path : h])]
    .map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(item) })) });
  if (pg.app) g.push({ '@type': 'SoftwareApplication', name: pg.app.name, applicationCategory: 'HealthApplication', operatingSystem: 'Web', inLanguage: 'es-CO',
    description: pg.app.description, publisher: { '@id': SITE.url + '/#org' } });
  if (pg.faq) {
    const qa = [...body.matchAll(/<summary>(.*?)<span class="pm"[^>]*><\/span><\/summary><p>(.*?)<\/p>/gs)];
    g.push({ '@type': 'FAQPage', mainEntity: qa.map(m => ({ '@type': 'Question', name: m[1], acceptedAnswer: { '@type': 'Answer', text: m[2] } })) });
  }
  if (pg.post) g.push({ '@type': 'BlogPosting', headline: pg.post.title, description: pg.post.excerpt, datePublished: pg.post.date, dateModified: pg.post.date, inLanguage: 'es-CO',
    mainEntityOfPage: abs(pg.path), author: { '@id': SITE.url + '/#org' }, publisher: { '@id': SITE.url + '/#org' } });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': g }, null, 1);
}

/* ---------- Páginas ---------- */
function render(pg) {
  let body;
  if (pg.post) {
    const p = pg.post, rel = posts.filter(x => x.slug !== p.slug);
    body = `<article class="article"><div class="wrap">
  ${crumbsHtml(pg)}
  <h1>${p.title}</h1>
  <p class="byline"><b>${p.cat}</b> · ${p.dateLabel} · ${p.minutes} min de lectura</p>
  <div class="prose">
${p.body}
  </div>
  <div class="article-cta"><div><b>¿Quiere verlo funcionando en su consulta?</b><br>Son 30 minutos y lo vemos con su especialidad.</div><a class="btn btn-primary" href="/agendar">Agendar una demo</a></div>
</div></article>
<section class="related" aria-labelledby="h-rel"><div class="wrap"><h2 id="h-rel">Más para leer</h2><div class="posts">${rel.map(postCard).join('')}</div></div></section>`;
  } else {
    body = readFileSync(`src/pages/${pg.src}.html`, 'utf8');
  }
  const cards = posts.map(postCard).join('\n      ');
  body = body.replaceAll('@@CRUMBS@@', crumbsHtml(pg)).replaceAll('@@CTABAND@@', ctaBand).replaceAll('@@POSTCARDS@@', cards);

  const depth = pg.out.includes('/') ? '/' : '';
  const url = abs(pg.path);
  // Cada página carga solo lo suyo: el núcleo siempre; GSAP y el JS propio solo donde hay animación o formulario.
  const GSAP = '<script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n<script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>';
  const scripts = [
    pg.gsap ? GSAP : '',
    '<script defer src="/assets/core.js"></script>',
    pg.js ? `<script defer src="/assets/${pg.js}.js"></script>` : '',
  ].filter(Boolean).join('\n');
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0c1424">
<meta property="og:type" content="${pg.post ? 'article' : 'website'}">
<meta property="og:locale" content="es_CO">
<meta property="og:site_name" content="Miracle">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&family=Schibsted+Grotesk:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="/assets/styles.css">
<script type="application/ld+json">
${schemaFor(pg, body)}
</script>
</head>
<body class="page-${pg.src || 'post'}">
<a class="skip" href="#main">Saltar al contenido</a>
${svgDefs}
${header(pg.navPath || pg.path)}
<main id="main">
${body}
</main>
${footer}
${scripts}
</body>
</html>
`;
}

mkdirSync('blog', { recursive: true });
for (const pg of pages) writeFileSync(pg.out, render(pg));
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p =>
  `  <url><loc>${abs(p.path)}</loc><lastmod>${p.post ? p.post.date : SITE.today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync('vercel.json', JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2) + '\n');
console.log(`Listo: ${pages.length} páginas`);
