/* Transcribe un fragmento corto de voz (≤ ~45 s) para la práctica de /prueba cuando el navegador no trae dictado
   (por ejemplo Brave). No guarda nada. Usa la misma clave de Gemini que /api/nota. */
const hits = new Map();
const LIMITE = +process.env.TRANSCRIBIR_LIMITE_HORA || 60;
const MIMES = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)/;

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store'); res.setHeader('content-type', 'application/json; charset=utf-8');
  const fin = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return fin(405, {error: 'metodo'});
  try {
    if (!process.env.GEMINI_API_KEY) return fin(503, {error: 'sin_motor'});
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || 'x').trim(), ahora = Date.now();
    const lista = (hits.get(ip) || []).filter(t => ahora - t < 3600e3);
    if (lista.length >= LIMITE) return fin(429, {error: 'limite'});
    lista.push(ahora); hits.set(ip, lista); if (hits.size > 2000) hits.clear();
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const mime = String(cuerpo.mime || '').split(';')[0], audio = String(cuerpo.audio || '');
    if (!MIMES.test(mime) || audio.length < 200 || audio.length > 3.2e6) return fin(400, {error: 'audio'});
    const modelo = process.env.GEMINI_AUDIO_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', {
      method: 'POST', headers: {'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: 'Transcribes audio en español de Colombia. Devuelve únicamente lo que se dice, palabra por palabra, con puntuación normal, sin comentarios ni comillas. No inventes nada ni completes frases. Si no hay voz o no se entiende, devuelve una cadena vacía.'}]},
        contents: [{role: 'user', parts: [{inlineData: {mimeType: mime, data: audio}}, {text: 'Transcribe este audio.'}]}],
        generationConfig: {temperature: 0, maxOutputTokens: 600}
      })
    });
    if (!r.ok) return fin(502, {error: 'motor'});
    const j = await r.json();
    const texto = ((j.candidates && j.candidates[0] && j.candidates[0].content.parts || []).map(p => p.text || '').join('') || '').replace(/\s+/g, ' ').trim();
    return fin(200, {texto});
  } catch (e) {
    return fin(502, {error: 'motor'});
  }
};
