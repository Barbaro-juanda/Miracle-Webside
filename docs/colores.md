# Sistema de color (paleta B, marca actual)

Todos los colores viven en `:root` de `assets/styles.css`. Fuera de ahí no hay hex ni rgba sueltos:
las transparencias se escriben con `color-mix(in srgb, var(--token) N%, transparent)`.

## Antes y después

| | Antes | Después |
|---|---|---|
| Colores distintos en `styles.css` | 79 hex + 57 rgba, la mayoría fuera de `:root` | 33 tokens en `:root`, 0 fuera |
| Marca | `--deep`, `--accent`, `--mint` + cian del orbe repartido en 6 tonos sueltos | `--deep`, `--accent`, `--mint`; el cian queda como `--glow` (solo sobre oscuro) |
| Grises sobre oscuro | 14 tonos sueltos (#b9c5d8, #c7cfdb, #aab5c5…) | `--on-dark`, `--on-dark-soft`, `--on-dark-muted`, `--on-dark-dim` |
| Semánticos | éxito, alerta y error + 5 variantes sueltas | `--success`, `--warning`, `--danger` (+ `-soft` y `-bright`) |
| Imagen OG | no existía (`/og.png` daba 404) | `og.png` 1200×630 con la paleta |
| Ícono de logo en JSON-LD | no existía (`/icon-512.png` daba 404) | `icon-512.png` + `apple-touch-icon.png` |
| `theme-color` | `#0c1424` | `#0c1424` (sin cambio, coincide con `--deep`) |

## Tokens finales

| Token | Valor | Uso |
|---|---|---|
| `--deep` | #0c1424 | Fondo de capítulos oscuros, títulos |
| `--accent` | #2f6fe0 | Botón principal, enlaces, foco |
| `--accent-ink` | #1a4fa0 | Texto de acento sobre claro |
| `--mint` | #b7f0d8 | Acento secundario |
| `--glow` | #9fe3ff | Acento sobre fondo oscuro |
| `--ink` / `--ink-soft` / `--muted` | #0e1726 / #44546b / #5d6b80 | Texto sobre claro |
| `--on-dark` / `-soft` / `-muted` / `-dim` | #e6edf7 / #b9c5d8 / #8fa3c0 / #5b6d8f | Texto sobre oscuro |
| `--success` / `--warning` / `--danger` | #13795b / #a34a06 / #b33224 | Estados |

## Pares corregidos (WCAG AA)

| Dónde | Antes | Después |
|---|---|---|
| Pasos inactivos del recorrido (Notes, Auditorías, Analytics) | opacidad .45 → 2,1:1 | color `--muted` sin opacidad → 5,1:1 |
| Palabras aún no iluminadas de la frase de la escena 2 | #2a3850 sobre #0c1424 → 1,6:1 | `--on-dark-dim` → 3,5:1 (texto grande) |
| Leyenda "firmadas el mismo día" (Soluciones) | #cfe0ff sobre #2f6fe0 → 3,5:1 | blanco → 4,7:1 |
| Etiqueta "Usa" del panel Analytics (Soluciones) | #9fe3ff sobre #3a7ff0 → 2,7:1 | blanco → 4,7:1 |

Pares que ya cumplían y se mantienen: blanco sobre `--accent` 4,7:1 · `--muted` sobre `--canvas` 5,3:1 ·
`--on-dark-muted` sobre `--deep` 7,2:1 · `--glow` sobre `--deep` 13:1 · `--success` sobre `--success-soft` 4,6:1.
Verificado con axe-core en 9 páginas a 390 y 1280 px: 0 errores de contraste.
