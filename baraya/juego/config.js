// Configuración del juego «Baraya: La Campaña»
// ─────────────────────────────────────────────────────────────
// rankingUrl: pega aquí la URL de tu Apps Script (termina en /exec)
//   para activar el ranking compartido y los patrocinadores desde
//   Google Sheets. Si la dejas vacía, el juego funciona igual: guarda
//   el mejor puntaje en el dispositivo y lee patrocinadores.json.
// concurso: textos del premio. Cámbialos cuando tengas patrocinador.
//   cierre: fecha y hora en que se congela el ranking (formato ISO).
window.BARAYA_JUEGO = {
  rankingUrl: "https://script.google.com/macros/s/AKfycbw91Mr0xuRPfsxIkJ6n6btxf3kj5Do-4MB04VIxMdpMr-rS9Zzl0rfqGaq7ZOGxwJq_/exec",
  paginaPrincipal: "../",
  concurso: {
    activo: true,
    premio: "Premio sorpresa al mejor puntaje",
    patrocinador: "",              // ej.: "Café La Plaza"
    cierre: "",                    // ej.: "2027-02-12T18:00:00-05:00" (vacío = por confirmar)
    textoFinal: "Los 3 mejores puntajes jugarán la final en vivo en la pantalla gigante de la Plaza Botero la noche del estreno."
  }
};
