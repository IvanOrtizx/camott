/**
 * «Baraya» · Ranking del juego, patrocinadores e inscripciones al estreno
 * Pega este código en Extensiones › Apps Script de tu hoja de Google.
 *
 * Pestañas (se crean solas la primera vez):
 *  - Ranking:        Nombre | Puntos | Contacto | Fecha | Duración (s) | Banderas | Metros
 *  - Patrocinadores: Nombre | Nivel (Diamante/Oro/Plata/Aliado) | Logo (URL) | Activo (Sí/No)
 *  - Inscritos:      Código | Nombre | Celular | Correo | Municipio | Personas | Acepta datos | Acepta mensajes | Fecha | Asistió
 *
 * Después de cambiar este código: Implementar › Gestionar implementaciones ›
 * editar (lápiz) › Versión: «Nueva versión» › Implementar. La URL no cambia.
 */
const CIERRE = '';                 // Cierre del ranking del juego, ej.: '2027-02-12T18:00:00-05:00'. Vacío = abierto.
const MAX_POR_SEGUNDO = 60;        // Puntos máximos posibles por segundo de juego (anti-trampas).
const CUPO_INSCRIPCIONES = 3000;   // Personas que se pueden inscribir al estreno (incluye acompañantes).
const CIERRE_INSCRIPCIONES = '';   // Fecha de cierre de inscripciones. Vacío = abierto.
const ENVIAR_CORREO = true;        // Envía confirmación por correo a quien lo escriba (Gmail permite ~100 al día).

const ENC_RANK = ['Nombre','Puntos','Contacto','Fecha','Duración (s)','Banderas','Metros'];
const ENC_PAT  = ['Nombre','Nivel','Logo (URL)','Activo (Sí/No)'];
const ENC_INS  = ['Código','Nombre','Celular','Correo','Municipio','Personas','Acepta datos','Acepta mensajes','Fecha','Asistió'];

function hoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.appendRow(encabezados); sh.setFrozenRows(1); }
  return sh;
}
function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function limpio_(v, max) { return String(v || '').replace(/[<>"=]/g, '').trim().slice(0, max); }

/* ---------- Ranking ---------- */
function ranking_() {
  const sh = hoja_('Ranking', ENC_RANK);
  if (sh.getLastRow() < 2) return [];
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  const mejor = {};
  filas.forEach(function (f) {
    const nombre = String(f[0]).trim(), puntos = Number(f[1]), clave = (nombre + '|' + String(f[2]).trim()).toLowerCase();
    if (!nombre || !(puntos > 0)) return;
    if (!mejor[clave] || puntos > mejor[clave].puntos) mejor[clave] = { nombre: nombre, puntos: puntos };
  });
  return Object.keys(mejor).map(function (k) { return mejor[k]; })
    .sort(function (a, b) { return b.puntos - a.puntos; }).slice(0, 10);
}
function guardarPuntaje_(d) {
  if (CIERRE && new Date() > new Date(CIERRE)) return { ok: false, error: 'El ranking ya cerró.' };
  const nombre = limpio_(d.nombre, 14), contacto = limpio_(d.contacto, 40);
  const puntos = Math.floor(Number(d.puntos)), duracion = Math.floor(Number(d.duracion));
  const banderas = Math.floor(Number(d.banderas) || 0), metros = Math.floor(Number(d.metros) || 0);
  if (nombre.length < 2 || contacto.length < 5 || d.consentimiento !== true) return { ok: false, error: 'Faltan datos.' };
  if (!(puntos > 0) || !(duracion > 0) || puntos > duracion * MAX_POR_SEGUNDO + 100 || puntos !== metros + banderas * 50)
    return { ok: false, error: 'Puntaje no válido.' };
  hoja_('Ranking', ENC_RANK).appendRow([nombre, puntos, contacto, new Date(), duracion, banderas, metros]);
  return { ok: true, ranking: ranking_() };
}

/* ---------- Patrocinadores ---------- */
function patrocinadores_() {
  const sh = hoja_('Patrocinadores', ENC_PAT);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(function (f) { return String(f[0]).trim() && String(f[3]).trim().toLowerCase() !== 'no'; })
    .map(function (f) { return { nombre: String(f[0]).trim(), nivel: String(f[1]).trim(), logo: String(f[2]).trim() }; });
}

/* ---------- Inscripciones ---------- */
function inscritos_() {
  const sh = hoja_('Inscritos', ENC_INS);
  if (sh.getLastRow() < 2) return { filas: [], total: 0 };
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const total = filas.reduce(function (s, f) { return s + (Number(f[5]) || 0); }, 0);
  return { filas: filas, total: total };
}
function cupos_() {
  const ins = inscritos_();
  const cerrado = !!(CIERRE_INSCRIPCIONES && new Date() > new Date(CIERRE_INSCRIPCIONES));
  return { cupo: CUPO_INSCRIPCIONES, inscritos: ins.total, restantes: Math.max(0, CUPO_INSCRIPCIONES - ins.total), cerrado: cerrado };
}
function inscribir_(d) {
  const nombre = limpio_(d.nombre, 60), correo = limpio_(d.correo, 80), municipio = limpio_(d.municipio, 40);
  const celular = String(d.celular || '').replace(/\D/g, '').slice(-10);
  const personas = Math.floor(Number(d.personas));
  if (nombre.length < 3) return { ok: false, error: 'Escribe tu nombre completo.' };
  if (celular.length !== 10) return { ok: false, error: 'Escribe un celular válido de 10 dígitos.' };
  if (!(personas >= 1 && personas <= 4)) return { ok: false, error: 'Elige entre 1 y 4 personas.' };
  if (d.aceptaDatos !== true) return { ok: false, error: 'Debes autorizar el tratamiento de tus datos.' };
  const c = cupos_();
  if (c.cerrado) return { ok: false, error: 'Las inscripciones ya cerraron.' };
  const ins = inscritos_();
  for (var i = 0; i < ins.filas.length; i++) {
    if (String(ins.filas[i][2]).replace(/\D/g, '').slice(-10) === celular)
      return { ok: true, repetido: true, codigo: ins.filas[i][0], personas: ins.filas[i][5], restantes: c.restantes };
  }
  if (personas > c.restantes) return { ok: false, lleno: true, error: c.restantes > 0 ? 'Solo quedan ' + c.restantes + ' cupos.' : 'Los cupos se agotaron.', restantes: c.restantes };
  const sh = hoja_('Inscritos', ENC_INS);
  const codigo = 'BAR-' + String(sh.getLastRow()).padStart(4, '0');
  sh.appendRow([codigo, nombre, "'" + celular, correo, municipio, personas, 'Sí', d.aceptaMensajes === true ? 'Sí' : 'No', new Date(), '']);
  if (ENVIAR_CORREO && correo && /.+@.+\..+/.test(correo) && MailApp.getRemainingDailyQuota() > 0) {
    try {
      MailApp.sendEmail({
        to: correo,
        subject: 'Tu inscripción al estreno de «Baraya: El Prócer Independentista» · ' + codigo,
        htmlBody: '<div style="font-family:Georgia,serif;color:#2A1C10;background:#EEE1C2;padding:24px">' +
          '<h2 style="margin:0 0 8px">¡Estás inscrito, ' + nombre.split(' ')[0] + '!</h2>' +
          '<p>Tu código de inscripción es <b style="color:#8E1B14;font-size:20px">' + codigo + '</b> para <b>' + personas + '</b> persona(s).</p>' +
          '<p>Estreno del cortometraje «Baraya: El Prócer Independentista» · Febrero de 2027 · Plaza Botero, Olave Tower, Neiva. ' +
          'Te avisaremos la fecha exacta.</p><p>Muestra este código al ingresar para recibir tu manilla.</p>' +
          '<p style="font-size:13px;color:#5E4930">camott.com/baraya</p></div>'
      });
    } catch (err) {}
  }
  return { ok: true, codigo: codigo, personas: personas, restantes: cupos_().restantes };
}

/* ---------- Puntos de entrada ---------- */
function doGet() {
  return salida_({ ranking: ranking_(), patrocinadores: patrocinadores_(), cupos: cupos_() });
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    lock.waitLock(8000);
    const r = d.tipo === 'inscripcion' ? inscribir_(d) : guardarPuntaje_(d);
    return salida_(r);
  } catch (err) {
    return salida_({ ok: false, error: 'No se pudo guardar. Intenta de nuevo.' });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}
