/**
 * Ranking y patrocinadores de «Baraya: La Campaña»
 * Pega este código en Extensiones › Apps Script de tu hoja de Google.
 *
 * La hoja necesita dos pestañas:
 *  - Ranking:        Nombre | Puntos | Contacto | Fecha | Duración (s) | Banderas | Metros
 *  - Patrocinadores: Nombre | Nivel (Diamante/Oro/Plata/Aliado) | Logo (URL) | Activo (Sí/No)
 * Las pestañas y los encabezados se crean solos la primera vez.
 */
const CIERRE = '';               // Fecha de cierre, ej.: '2027-02-12T18:00:00-05:00'. Vacío = abierto.
const MAX_POR_SEGUNDO = 60;      // Puntos máximos posibles por segundo de juego (anti-trampas).

function hoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.appendRow(encabezados); sh.setFrozenRows(1); }
  return sh;
}
function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ranking_() {
  const sh = hoja_('Ranking', ['Nombre','Puntos','Contacto','Fecha','Duración (s)','Banderas','Metros']);
  if (sh.getLastRow() < 2) return [];
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  // Mejor puntaje por persona (nombre + contacto)
  const mejor = {};
  filas.forEach(function (f) {
    const nombre = String(f[0]).trim(), puntos = Number(f[1]), clave = (nombre + '|' + String(f[2]).trim()).toLowerCase();
    if (!nombre || !(puntos > 0)) return;
    if (!mejor[clave] || puntos > mejor[clave].puntos) mejor[clave] = { nombre: nombre, puntos: puntos };
  });
  return Object.keys(mejor).map(function (k) { return mejor[k]; })
    .sort(function (a, b) { return b.puntos - a.puntos; }).slice(0, 10);
}
function patrocinadores_() {
  const sh = hoja_('Patrocinadores', ['Nombre','Nivel','Logo (URL)','Activo (Sí/No)']);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(function (f) { return String(f[0]).trim() && String(f[3]).trim().toLowerCase() !== 'no'; })
    .map(function (f) { return { nombre: String(f[0]).trim(), nivel: String(f[1]).trim(), logo: String(f[2]).trim() }; });
}
function doGet() {
  return salida_({ ranking: ranking_(), patrocinadores: patrocinadores_() });
}
function doPost(e) {
  try {
    if (CIERRE && new Date() > new Date(CIERRE)) return salida_({ ok: false, error: 'El ranking ya cerró.' });
    const d = JSON.parse(e.postData.contents);
    const nombre = String(d.nombre || '').replace(/[<>"]/g, '').trim().slice(0, 14);
    const contacto = String(d.contacto || '').replace(/[<>"]/g, '').trim().slice(0, 40);
    const puntos = Math.floor(Number(d.puntos)), duracion = Math.floor(Number(d.duracion));
    const banderas = Math.floor(Number(d.banderas) || 0), metros = Math.floor(Number(d.metros) || 0);
    if (nombre.length < 2 || contacto.length < 5 || d.consentimiento !== true) return salida_({ ok: false, error: 'Faltan datos.' });
    if (!(puntos > 0) || !(duracion > 0) || puntos > duracion * MAX_POR_SEGUNDO + 100 || puntos !== metros + banderas * 50)
      return salida_({ ok: false, error: 'Puntaje no válido.' });
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    hoja_('Ranking', ['Nombre','Puntos','Contacto','Fecha','Duración (s)','Banderas','Metros'])
      .appendRow([nombre, puntos, contacto, new Date(), duracion, banderas, metros]);
    lock.releaseLock();
    return salida_({ ok: true, ranking: ranking_() });
  } catch (err) {
    return salida_({ ok: false, error: 'No se pudo guardar.' });
  }
}
