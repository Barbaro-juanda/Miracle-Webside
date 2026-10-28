// Convierte el video del portátil (Higgsfield) en la secuencia de cuadros del inicio.
// Uso (en local, necesita ffmpeg y ffprobe):
//   node scripts/hero-frames.mjs portatil.mp4 --screen 22.4,13,55.2,59.3 --laptop 0.6 [--count 90]
//   --screen  x,y,ancho,alto de la pantalla en el ÚLTIMO cuadro, en % del cuadro: ahí va la consulta en vivo.
//   --laptop  ancho del portátil sobre el ancho del cuadro (0.6 = 60 %): fija el tamaño en la página.
// Escribe assets/hero/d/*.webp (1280 px), assets/hero/m/*.webp (720 px) y assets/hero/frames.json.
// Después: node build.mjs. Sin frames.json el inicio sigue con el portátil en CSS.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';

const args = process.argv.slice(2);
const input = args.find(a => !a.startsWith('--') && !/^[\d.,]+$/.test(a));
const opt = k => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : undefined; };
if (!input) { console.error('Falta el video. Uso: node scripts/hero-frames.mjs portatil.mp4 --screen x,y,w,h --laptop 0.6'); process.exit(1); }
const count = +(opt('count') || 90);
const screen = (opt('screen') || '22,13,56,59').split(',').map(Number);
const laptop = +(opt('laptop') || 0.6);

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', input], {encoding: 'utf8'}));
const dur = +probe.format.duration, W = probe.streams[0].width, H = probe.streams[0].height;
const fps = (count / dur).toFixed(4);

rmSync('assets/hero', {recursive: true, force: true});
for (const [dir, w, q] of [['d', 1280, 74], ['m', 720, 70]]) {
  mkdirSync(`assets/hero/${dir}`, {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', `fps=${fps},scale=${w}:-2:flags=lanczos`,
    '-frames:v', String(count), '-c:v', 'libwebp', '-quality', String(q), '-compression_level', '6', `assets/hero/${dir}/%03d.webp`]);
}
const n = readdirSync('assets/hero/d').filter(f => f.endsWith('.webp')).length;
const kb = dir => Math.round(readdirSync(`assets/hero/${dir}`).reduce((s, f) => s + statSync(`assets/hero/${dir}/${f}`).size, 0) / 1024);
const manifest = {count: n, ratio: +(W / H).toFixed(4), screen: {x: screen[0], y: screen[1], w: screen[2], h: screen[3]}, laptop, source: input.split('/').pop()};
writeFileSync('assets/hero/frames.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Listo: ${n} cuadros · escritorio ${kb('d')} KB · móvil ${kb('m')} KB`);
