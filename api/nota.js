/* Redacta la historia clínica de la práctica de la web (/prueba). Motor liviano, sin base de datos y sin guardar nada.
   Sigue las reglas de redacción de Miracle (estilo y voz de la nota); el motor completo vive en el portal.
   Necesita GEMINI_API_KEY (o GROQ_API_KEY) en las variables de entorno de Vercel. Sin clave responde 503 y la página
   muestra la nota ordenada por secciones, como antes. */
const PLANTILLAS = {
  psiquiatria: {
    voz: 'impersonal',
    secciones: ['Identificación del paciente', 'Motivo de consulta', 'Historia del problema actual', 'Antecedentes de atención y salud', 'Valoración del riesgo', 'Formulación clínica del caso', 'Plan y próxima sesión'],
    entradas: ['Motivo de consulta', 'Historia del problema actual', 'Valoración del riesgo', 'Antecedentes de atención y salud']
  },
  urgencias: {
    voz: 'primera',
    secciones: ['Identificación del paciente', 'Motivo de consulta', 'Enfermedad actual', 'Revisión por sistemas', 'Antecedentes y alergias', 'Examen físico', 'Análisis', 'Plan'],
    entradas: ['Motivo de consulta', 'Enfermedad actual', 'Revisión por sistemas', 'Antecedentes y alergias']
  },
  pediatria: {
    voz: 'primera',
    secciones: ['Identificación del paciente', 'Motivo de consulta', 'Seguimiento y evolución', 'Alimentación y sueño', 'Vacunación', 'Desarrollo', 'Examen físico', 'Plan'],
    entradas: ['Seguimiento y evolución', 'Alimentación y sueño', 'Vacunación', 'Desarrollo']
  }
};
const NO = 'No mencionado en la consulta.';
const hits = new Map(); // límite por IP, en memoria de la instancia (suficiente para una demostración)
const LIMITE = +process.env.NOTA_LIMITE_HORA || 12;

const reglas = voz => [
  'Eres el motor de redacción de Miracle. Conviertes lo que dijo una persona en una historia clínica de práctica, en español de Colombia, con registro técnico y sin adornos.',
  'Reglas que no se rompen:',
  '1. Usa SOLO lo que se dijo. No inventes síntomas, cifras, fechas, medicamentos, dosis, diagnósticos, antecedentes ni hallazgos de examen. Si una sección no tiene datos en lo dicho, su texto es exactamente: ' + NO,
  '2. MOTIVO DE CONSULTA: va textual, entre comillas y atribuido ("El paciente consulta por: "…""), sin traducir a lenguaje técnico y sin resumir; solo se quitan saludos y muletillas ("eh", "pues") de los extremos.',
  '3. Lo que dice el paciente va en tercera persona y atribuido, con verbos variados ("Refiere…", "Relata…", "Niega…", "Manifiesta…"); lo cotidiano se pasa a categoría clínica sin agregar datos. No repitas un dato en dos secciones.',
  voz === 'impersonal'
    ? '4. VOZ: lo que el profesional observa o decide va en impersonal técnico ("se observa…", "se acuerda…"); nunca "el médico" ni "el psiquiatra" como sujeto. En esta práctica el profesional no dictó examen ni plan: esas secciones llevan ' + NO
    : '4. VOZ: lo que el médico examina, concluye y decide va en primera persona ("Considero…", "Solicito…"); nunca "el médico" como sujeto. En esta práctica el médico no dictó examen, análisis ni plan: esas secciones llevan ' + NO,
  '5. Identificación del paciente: solo lo que la persona dijo de sí (nombre, edad); el documento y lo no dicho van como ' + NO,
  '6. No precises ni cambies la localización, la causa ni la gravedad de lo dicho (si dijo "la mitad del pecho", no escribas "precordial"); solo pasa sus palabras a registro clínico.',
  '7. Escribe una a tres frases por sección, sin viñetas y sin títulos dentro del texto.',
  'Recibirás un JSON con las secciones de la plantilla y lo dicho en cada pregunta. Responde solo un JSON {"secciones":[{"titulo":"…","texto":"…"}]} con exactamente las secciones de la plantilla, en el mismo orden.'
].join('\n');

const llamar = async (system, usuario) => {
  if (process.env.GEMINI_API_KEY) {
    const modelo = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', {
      method: 'POST', headers: {'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY},
      body: JSON.stringify({systemInstruction: {parts: [{text: system}]}, contents: [{role: 'user', parts: [{text: usuario}]}], generationConfig: {temperature: .2, responseMimeType: 'application/json', maxOutputTokens: 1800}})
    });
    if (!r.ok) throw new Error('gemini ' + r.status);
    const j = await r.json();
    return j.candidates && j.candidates[0] && j.candidates[0].content.parts.map(p => p.text || '').join('');
  }
  if (process.env.GROQ_API_KEY) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + process.env.GROQ_API_KEY},
      body: JSON.stringify({model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: .2, response_format: {type: 'json_object'}, max_tokens: 1800, messages: [{role: 'system', content: system}, {role: 'user', content: usuario}]})
    });
    if (!r.ok) throw new Error('groq ' + r.status);
    const j = await r.json();
    return j.choices && j.choices[0].message.content;
  }
  return null;
};

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error: 'metodo'})); }
  res.setHeader('content-type', 'application/json; charset=utf-8');
  const fin = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) return fin(503, {error: 'sin_motor'});
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || 'x').trim(), ahora = Date.now();
    const lista = (hits.get(ip) || []).filter(t => ahora - t < 3600e3);
    if (lista.length >= LIMITE) return fin(429, {error: 'limite'});
    lista.push(ahora); hits.set(ip, lista); if (hits.size > 2000) hits.clear();
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const plantilla = PLANTILLAS[cuerpo.spec]; if (!plantilla) return fin(400, {error: 'especialidad'});
    const dichas = Array.isArray(cuerpo.respuestas) ? cuerpo.respuestas.slice(0, 4).map(t => String(t || '').slice(0, 600)) : [];
    if (!dichas.some(t => t.trim().length > 3)) return fin(400, {error: 'vacio'});
    const entrada = {plantilla: plantilla.secciones, dicho: plantilla.entradas.map((t, i) => ({pregunta_sobre: t, dicho: dichas[i] || ''}))};
    const bruto = await llamar(reglas(plantilla.voz), JSON.stringify(entrada));
    const sal = JSON.parse(String(bruto || '').replace(/^```json|```$/g, '').trim()).secciones;
    if (!Array.isArray(sal) || sal.length !== plantilla.secciones.length) throw new Error('forma');
    const fuente = dichas.join(' ').toLowerCase(), nums = new Set(fuente.match(/\d+/g) || []);
    const PAL = {un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, cien: 100};
    (fuente.match(/[a-záéíóúñ]+/g) || []).forEach(w => { if (PAL[w]) nums.add(String(PAL[w])); });
    const secciones = plantilla.secciones.map((titulo, i) => {
      let texto = String(sal[i] && sal[i].texto || '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/\s+"(?=[.,;:]?$)/, '"').replace(/:"/g, ': "').trim() || NO;
      if (texto !== NO && (texto.match(/\d+/g) || []).some(n => !nums.has(n))) { // una cifra que nadie dijo no pasa: se quita la frase que la trae
        const frases = texto.match(/[^.!?]+[.!?]?/g) || [texto];
        texto = frases.map(f => f.trim()).filter(f => f && (f.match(/\d+/g) || []).every(n => nums.has(n))).join(' ') || NO;
      }
      return {titulo, texto};
    });
    return fin(200, {secciones});
  } catch (e) {
    return fin(502, {error: 'motor'});
  }
};
