/**
 * «Baraya» · Ranking del juego, patrocinadores e inscripciones al estreno (con QR)
 * Pega este código en Extensiones › Apps Script de tu hoja de Google.
 *
 * Pestañas (se crean solas):
 *  - Ranking:        Nombre | Puntos | Contacto | Fecha | Duración (s) | Banderas | Metros
 *  - Patrocinadores: Nombre | Nivel (Diamante/Oro/Plata/Aliado) | Logo (URL) | Activo (Sí/No)
 *  - Inscritos:      Código | Nombre | Celular | Correo | Municipio | Personas | Acepta datos |
 *                    Acepta mensajes | Fecha | Asistió | Token | Enlace entrada
 *
 * Después de cambiar este código: Implementar › Gestionar implementaciones ›
 * editar (lápiz) › Versión: «Nueva versión» › Implementar. La URL no cambia.
 */
const CIERRE = '';                 // Cierre del ranking del juego. Vacío = abierto.
const MAX_POR_SEGUNDO = 60;        // Puntos máximos por segundo de juego (anti-trampas).
const CUPO_INSCRIPCIONES = 3000;   // Personas que se pueden inscribir (una inscripción = una persona).
const CIERRE_INSCRIPCIONES = '';   // Cierre de inscripciones. Vacío = abierto.
const ENVIAR_CORREO = true;        // Confirmación con QR por correo (Gmail permite ~100 al día).
const URL_ENTRADA = 'https://camott.com/baraya/entrada/';
const FECHA_EVENTO = 'Febrero de 2027 (te confirmaremos el día exacto)';

const ENC_RANK = ['Nombre','Puntos','Contacto','Fecha','Duración (s)','Banderas','Metros'];
const ENC_PAT  = ['Nombre','Nivel','Logo (URL)','Activo (Sí/No)'];
const ENC_INS  = ['Código','Nombre','Celular','Correo','Municipio','Personas','Acepta datos','Acepta mensajes','Fecha','Asistió','Token','Enlace entrada'];

function hoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.appendRow(encabezados); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < encabezados.length) {           // completa encabezados nuevos
    sh.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  }
  return sh;
}
function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function limpio_(v, max) { return String(v || '').replace(/[<>"=]/g, '').trim().slice(0, max); }

/* ---------- Seguridad del QR ---------- */
function secreto_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SECRETO_QR');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRETO_QR', s); }
  return s;
}
function token_(codigo) {
  const firma = Utilities.computeHmacSha256Signature(codigo, secreto_());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 12);
}
function enlace_(codigo, token) { return URL_ENTRADA + '?c=' + encodeURIComponent(codigo) + '&t=' + token; }

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
  if (sh.getLastRow() < 2) return { sh: sh, filas: [], total: 0 };
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, ENC_INS.length).getValues();
  const total = filas.reduce(function (s, f) { return s + (Number(f[5]) || 0); }, 0);
  return { sh: sh, filas: filas, total: total };
}
function cupos_() {
  const ins = inscritos_();
  const cerrado = !!(CIERRE_INSCRIPCIONES && new Date() > new Date(CIERRE_INSCRIPCIONES));
  return { cupo: CUPO_INSCRIPCIONES, inscritos: ins.total, restantes: Math.max(0, CUPO_INSCRIPCIONES - ins.total), cerrado: cerrado };
}
function asegurarToken_(sh, fila, codigo) {   // completa token y enlace en filas antiguas
  const t = token_(codigo);
  sh.getRange(fila, 11, 1, 2).setValues([[t, enlace_(codigo, t)]]);
  return t;
}
function correoConfirmacion_(correo, nombre, codigo, personas, token) {
  if (!ENVIAR_CORREO || !correo || !/.+@.+\..+/.test(correo) || MailApp.getRemainingDailyQuota() < 1) return;
  try {
    const contenido = 'BARAYA|' + codigo + '|' + token;
    const qr = UrlFetchApp.fetch('https://quickchart.io/qr?size=360&margin=2&ecLevel=M&text=' + encodeURIComponent(contenido)).getBlob().setName('entrada-' + codigo + '.png');
    const link = enlace_(codigo, token);
    MailApp.sendEmail({
      to: correo,
      name: 'Baraya · El Prócer Independentista',
      subject: 'Tu entrada al estreno de «Baraya: El Prócer Independentista» · ' + codigo,
      htmlBody:
        '<div style="font-family:Georgia,serif;color:#2A1C10;background:#EEE1C2;padding:28px;max-width:560px;margin:auto;text-align:center">' +
        '<p style="letter-spacing:3px;font-size:12px;color:#5E4930;margin:0">PRESENTACIÓN DEL CORTOMETRAJE</p>' +
        '<h1 style="font-size:34px;letter-spacing:4px;margin:6px 0">BARAYA</h1>' +
        '<p style="letter-spacing:3px;font-size:12px;margin:0 0 18px">EL PRÓCER INDEPENDENTISTA</p>' +
        '<h2 style="font-size:22px;margin:0 0 10px">¡Bienvenido, ' + nombre.split(' ')[0] + '!</h2>' +
        '<p style="font-size:16px;line-height:1.5">Tu inscripción está confirmada. Presenta este código QR en la entrada de la Plaza Botero para recibir tu <b>manilla</b>. Es personal: vale para una sola persona.</p>' +
        '<img src="cid:qr" alt="Código QR de tu entrada" width="240" height="240" style="background:#fff;padding:10px;border:2px solid #8E1B14">' +
        '<p style="font-size:22px;color:#8E1B14;letter-spacing:3px;margin:12px 0 4px"><b>' + codigo + '</b></p>' +
        '<p style="font-size:15px;margin:0 0 16px">Entrada personal · Entrada libre</p>' +
        '<p style="font-size:15px;line-height:1.5"><b>Cuándo:</b> ' + FECHA_EVENTO + '<br><b>Dónde:</b> Plaza Botero, Olave Tower, Neiva<br><b>Apertura de puertas:</b> 5:45 p. m.</p>' +
        '<p style="margin:18px 0"><a href="' + link + '" style="background:#8E1B14;color:#F6EAD0;padding:12px 20px;text-decoration:none;font-weight:bold">Ver mi entrada</a></p>' +
        '<p style="font-size:13px;color:#5E4930">Guarda este correo o toma un pantallazo del QR. camott.com/baraya</p></div>',
      inlineImages: { qr: qr }
    });
  } catch (err) {}
}
function inscribir_(d) {
  const nombre = limpio_(d.nombre, 60), correo = limpio_(d.correo, 80), municipio = limpio_(d.municipio, 40);
  const celular = String(d.celular || '').replace(/\D/g, '').slice(-10);
  const personas = 1;                                   // inscripción personal
  if (nombre.length < 3) return { ok: false, error: 'Escribe tu nombre completo.' };
  if (celular.length !== 10) return { ok: false, error: 'Escribe un celular válido de 10 dígitos.' };
  if (d.aceptaDatos !== true) return { ok: false, error: 'Debes autorizar el tratamiento de tus datos.' };
  const c = cupos_();
  if (c.cerrado) return { ok: false, error: 'Las inscripciones ya cerraron.' };
  const ins = inscritos_();
  for (var i = 0; i < ins.filas.length; i++) {
    const f = ins.filas[i];
    if (String(f[2]).replace(/\D/g, '').slice(-10) === celular) {
      const t = f[10] || asegurarToken_(ins.sh, i + 2, f[0]);
      return { ok: true, repetido: true, codigo: f[0], token: t, nombre: f[1], personas: f[5], restantes: c.restantes };
    }
  }
  if (personas > c.restantes) return { ok: false, lleno: true, error: c.restantes > 0 ? 'Solo quedan ' + c.restantes + ' cupos.' : 'Los cupos se agotaron.', restantes: c.restantes };
  const codigo = 'BAR-' + String(ins.sh.getLastRow()).padStart(4, '0');
  const token = token_(codigo);
  ins.sh.appendRow([codigo, nombre, "'" + celular, correo, municipio, personas, 'Sí', d.aceptaMensajes === true ? 'Sí' : 'No', new Date(), '', token, enlace_(codigo, token)]);
  correoConfirmacion_(correo, nombre, codigo, personas, token);
  return { ok: true, codigo: codigo, token: token, nombre: nombre, personas: personas, restantes: cupos_().restantes };
}
function entrada_(codigo, token) {                       // datos para la página de entrada
  if (!codigo || !token || token_(codigo) !== token) return { ok: false, error: 'Entrada no válida.' };
  const ins = inscritos_();
  for (var i = 0; i < ins.filas.length; i++) {
    if (ins.filas[i][0] === codigo) return { ok: true, codigo: codigo, nombre: ins.filas[i][1], personas: ins.filas[i][5], asistio: !!ins.filas[i][9] };
  }
  return { ok: false, error: 'No encontramos esta inscripción.' };
}

/* ---------- Puntos de entrada ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.accion === 'entrada') return salida_(entrada_(p.c, p.t));
  return salida_({ ranking: ranking_(), patrocinadores: patrocinadores_(), cupos: cupos_() });
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    lock.waitLock(8000);
    return salida_(d.tipo === 'inscripcion' ? inscribir_(d) : guardarPuntaje_(d));
  } catch (err) {
    return salida_({ ok: false, error: 'No se pudo guardar. Intenta de nuevo.' });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}
