# Miracle · sitio web

Sitio estático de varias páginas (sin framework). Se sirve tal cual en Vercel.

## Páginas

| Ruta | Fuente |
|---|---|
| `/` | `src/pages/index.html` (portátil animado, párrafo, circuito, cifra, resúmenes de planes y blog) |
| `/soluciones` | `src/pages/soluciones.html` (una consulta de ejemplo vista por el médico, calidad y gerencia) |
| `/notes`, `/auditorias`, `/analytics` | `src/pages/notes.html`, `auditorias.html`, `analytics.html` (una página corta por producto) |
| `/planes` | `src/pages/planes.html` |
| `/blog` y `/blog/<slug>` | `src/pages/blog.html` y un archivo por artículo en `src/posts/` |
| `/blog/tipo/<tipo>` y `/blog/rol/<rol>` | los arma `build.mjs` (los filtros del blog como páginas propias) |
| `/seguridad` | `src/pages/seguridad.html` |
| `/agendar` | `src/pages/agendar.html` |

## Cómo se edita

1. Cambie el texto en `src/pages/*.html` o en `src/posts/*.html`. El menú, el pie, los tipos y roles del blog y los datos para buscadores están en `build.mjs`.
2. Corra `node build.mjs`. Escribe las páginas finales en la raíz (`index.html`, `soluciones.html`, `blog/*.html`…), `sitemap.xml`, `robots.txt` y `vercel.json`.

### Artículos del blog

Copie `src/posts/_plantilla.html` como `src/posts/<slug>.html`; ahí están comentados todos los campos. Cada artículo lleva título, subtítulo, autor (mientras no haya un autor con nombre firma "Equipo Miracle"), fecha de publicación y de actualización, la idea central en una línea, un objeto ilustrativo en el centro (`<figure class="ilustra">`, que sale con la etiqueta "Ejemplo ilustrativo") y la caja final. El tiempo de lectura se calcula solo.

Tipos: Práctica clínica, Nota anotada y Hallazgo de auditoría. "Medido en el portal" ya existe en `build.mjs` pero está oculto (`oculto: true`): mientras lo esté no se publica ningún artículo de ese tipo. Roles: Médico, Calidad y auditoría, Gerencia e IPS.
3. Suba **las páginas generadas** junto con el código: Vercel no corre ningún build, solo sirve los archivos.

## Criterio de contenido

- **Inicio:** muy poco texto, solo lo clave en pocas palabras, y mucha animación. Su trabajo es llamar la atención y generar interés.
- **Subpáginas:** aquí va la explicación larga (soluciones, planes, seguridad, blog).

## Qué carga cada página (solo lo suyo)

| Archivo | Lo carga |
|---|---|
| `assets/styles.css` | todas |
| `assets/core.js` (menú, cabecera, anclas, aparición al entrar) | todas |
| GSAP + ScrollTrigger (CDN) | inicio y las tres páginas de producto |
| `assets/home.js` (escena del portátil, párrafo, circuito, cifra) | solo inicio |
| `assets/product.js` (animación de la tarjeta y cifras de cada producto) | solo notes, auditorias y analytics |
| `assets/agendar.js` (calendario y formulario) | solo agendar |
| `assets/soluciones.js` (pestañas Médico / Calidad / Gerencia) | solo soluciones |
| `assets/blog.js` (filtros al instante) | solo `/blog` |
| librería del QR (CDN) | solo el inicio, y se pide cuando el cierre está cerca |

Planes, seguridad, artículos y páginas de filtro del blog solo cargan `core.js`.

## Pendientes del jefe (marcados `PENDIENTE` en el código)

- Dominio final (hoy `https://itsmiracleai.com.co` en `build.mjs`).
- Herramienta de agenda (hoy la solicitud sale por WhatsApp o correo).
- Precio del plan Notes.
- Autor con nombre (y médico revisor) para el blog; hoy firma "Equipo Miracle".
- Cifras reales del portal para activar el tipo "Medido en el portal". Hasta entonces, ningún texto del sitio cita datos medidos.
- Políticas de tratamiento de datos y certificaciones para la página de Seguridad.
- Testimonios y logos de clientes.

## Respaldo

La versión de una sola página está en la etiqueta `v2-landing`.

## Motion graphics (ligeros)

Todo es CSS y SVG en línea, sin imágenes ni librerías extra:

- Ilustraciones animadas en los encabezados (anillo de 14 días, escudo). Se pausan fuera de pantalla y con «reducir movimiento».
- Línea de tiempo que se dibuja (`.tl`), ✓/✗ que aparecen (`.ck`), bandas oscuras (`.band-dark`) y barra de lectura en los artículos.
- Recorrido paso a paso con imagen fija en las páginas de producto (`product.js`).
