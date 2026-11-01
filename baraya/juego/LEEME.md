# Baraya: La Campaña — cómo activar el ranking y los patrocinadores

El juego ya funciona sin configurar nada: cada jugador ve su mejor marca en su dispositivo
y el pie muestra «Tu marca aquí». Para el **ranking compartido**, el **concurso** y los
**patrocinadores** que se actualizan solos, conecta una hoja de Google (unos 10 minutos).

## 1. Crear la hoja y el script
1. Crea una hoja de cálculo nueva en Google Sheets, por ejemplo «Baraya – Juego».
2. Menú **Extensiones › Apps Script**. Borra lo que aparezca y pega todo el contenido de
   `ranking-apps-script.gs`. Guarda.
3. Botón **Implementar › Nueva implementación** → tipo **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. Autoriza los permisos y copia la **URL de la aplicación web** (termina en `/exec`).

## 2. Conectar el juego
Abre `config.js` y pega la URL en `rankingUrl`. Sube el cambio a GitHub. Listo.

## 3. Agregar patrocinadores (sin tocar código)
En la pestaña **Patrocinadores** de la hoja escribe una fila por marca:

| Nombre | Nivel | Logo (URL) | Activo (Sí/No) |
|---|---|---|---|
| Nombre de la marca | Juego / Diamante / Oro / Plata / Premio / Aliado | enlace a su logo (PNG) | Sí |

- El juego los muestra en los letreros del camino (el Diamante sale más veces) y en
  «Con el apoyo de». Los cambios aparecen al recargar la página.
- Logo: súbelo a `baraya/juego/logos/` en tu repositorio y usa
  `https://camott.com/baraya/juego/logos/archivo.png`. Mejor PNG con fondo transparente.
- Para quitar uno sin borrarlo, pon «No» en Activo.
- Nivel **Juego** = Patrocinador del juego: aparece como «Presentado por» en la pantalla de
  inicio y en la final, y tiene los letreros más frecuentes. Nivel **Premio** = marcas que
  ponen los premios del 2.º y 3.er puesto.

## 4. El concurso
- En `config.js` cambia `premio`, `patrocinador`, `cierre` y `premios` cuando los tengas.
  `premios` es una lista, por ejemplo:
  `["1.er puesto: bono de $500.000 de Café La Plaza", "2.º puesto: …", "3.er puesto: …"]`.
- Pon la misma fecha en `CIERRE` dentro del Apps Script y vuelve a implementar
  (**Implementar › Gestionar implementaciones › editar › Nueva versión**).
- La pestaña **Ranking** guarda todos los intentos con su contacto (privado; en la web solo
  se ve el nombre). El servidor rechaza puntajes imposibles para el tiempo jugado.
- **Final en vivo:** abre `camott.com/baraya/juego/?final` en el portátil conectado a la pantalla.
  Escribe los 3 finalistas en el orden en que juegan (3.º, 2.º, 1.º), pulsa «Pantalla completa»
  y «Comenzar la final». Cada turno tiene cuenta regresiva 3, 2, 1, el nombre del jugador en
  pantalla y el **mismo recorrido para todos**. Si falla algo técnico, «Repetir turno». Al final
  muestra el ganador; si hay empate, ofrece «Jugar desempate». Los puntajes de la final no van
  al ranking en línea y se guardan en el portátil aunque recargues la página.
  Para ensayar con un recorrido distinto usa `?final&ruta=2027` (el de la noche es el normal).

## 5. Inscripciones al estreno
La sección «Inscríbete y asegura tu cupo» de la página principal usa la misma hoja.
- Cada inscripción queda en la pestaña **Inscritos** con un código (BAR-0001…), celular,
  correo, municipio y si acepta recibir mensajes. Cada persona se inscribe por separado.
- El cupo total está en `CUPO_INSCRIPCIONES` (3000) dentro del Apps Script; la página
  muestra cuántos quedan y bloquea el formulario al llenarse (cada inscripción = 1 persona).
- Un mismo celular puede inscribir a varias personas (por ejemplo, un papá con sus hijos), pero
  la misma persona (mismo nombre y celular) no se inscribe dos veces: recibe su código anterior.
- Cada inscrito recibe una **entrada con QR personal**: la ve al inscribirse, la puede abrir en
  `camott.com/baraya/entrada/?c=…&t=…` y le llega por correo (obligatorio) con el QR.
  Gmail gratuito permite unos 100 correos al día: si se agota, la columna **Correo enviado**
  queda en «Pendiente». Crea un activador diario para la función `enviarPendientes`
  (Apps Script › Activadores › Añadir activador › enviarPendientes › Basado en tiempo › Diario). El enlace de cada uno queda en la columna
  **Enlace entrada**, listo para enviarlo por WhatsApp.
- El QR contiene `BARAYA|código|firma`. La firma se genera con una clave secreta guardada
  en las propiedades del script (no está en GitHub), así nadie puede inventar entradas.
- La columna **Asistió** sirve para marcar el ingreso la noche del evento.
- Para mensajes masivos, filtra «Acepta mensajes = Sí» y exporta la lista.

**Importante:** cada vez que cambies el código del Apps Script, ve a
Implementar › Gestionar implementaciones › editar (lápiz) › Versión: «Nueva versión» › Implementar.
La URL no cambia.
