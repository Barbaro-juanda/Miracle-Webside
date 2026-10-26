# Miracle · sitio web

Sitio estático de varias páginas (sin framework). Se sirve tal cual en Vercel.

## Páginas

| Ruta | Fuente |
|---|---|
| `/` | `src/pages/index.html` (portátil animado, párrafo, circuito, cifra, resúmenes de planes y blog) |
| `/soluciones` | `src/pages/soluciones.html` |
| `/planes` | `src/pages/planes.html` |
| `/blog` y `/blog/<slug>` | `src/pages/blog.html` y `src/posts.json` |
| `/seguridad` | `src/pages/seguridad.html` |
| `/agendar` | `src/pages/agendar.html` |

## Cómo se edita

1. Cambie el texto en `src/pages/*.html` o en `src/posts.json`. El menú, el pie y los datos para buscadores están en `build.mjs`.
2. Corra `node build.mjs`. Escribe las páginas finales en la raíz (`index.html`, `soluciones.html`, `blog/*.html`…), `sitemap.xml`, `robots.txt` y `vercel.json`.
3. Suba **las páginas generadas** junto con el código: Vercel no corre ningún build, solo sirve los archivos.

`assets/styles.css` y `assets/site.js` son compartidos por todas las páginas. El JavaScript revisa si cada elemento existe antes de animarlo, así que una página sin portátil no carga esa lógica.

## Pendientes del jefe (marcados `PENDIENTE` en el código)

- Dominio final (hoy `https://itsmiracleai.com.co` en `build.mjs`).
- Herramienta de agenda (hoy la solicitud sale por WhatsApp o correo).
- Precio del plan Notes.
- Posts de LinkedIn para reemplazar los tres artículos de ejemplo, y el enlace real de LinkedIn.
- Políticas de tratamiento de datos y certificaciones para la página de Seguridad.
- Testimonios y logos de clientes.

## Respaldo

La versión de una sola página está en la etiqueta `v2-landing`.
