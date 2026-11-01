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
| Nombre de la marca | Diamante / Oro / Plata / Aliado | enlace a su logo (PNG) | Sí |

- El juego los muestra en los letreros del camino (el Diamante sale más veces) y en
  «Con el apoyo de». Los cambios aparecen al recargar la página.
- Logo: súbelo a `baraya/juego/logos/` en tu repositorio y usa
  `https://camott.com/baraya/juego/logos/archivo.png`. Mejor PNG con fondo transparente.
- Para quitar uno sin borrarlo, pon «No» en Activo.

## 4. El concurso
- En `config.js` cambia `premio`, `patrocinador` y `cierre` cuando los tengas.
- Pon la misma fecha en `CIERRE` dentro del Apps Script y vuelve a implementar
  (**Implementar › Gestionar implementaciones › editar › Nueva versión**).
- La pestaña **Ranking** guarda todos los intentos con su contacto (privado; en la web solo
  se ve el nombre). El servidor rechaza puntajes imposibles para el tiempo jugado.
- Recomendado: final en vivo con los 3 mejores en la pantalla gigante.

## 5. Inscripciones al estreno
La sección «Inscríbete y asegura tu cupo» de la página principal usa la misma hoja.
- Cada inscripción queda en la pestaña **Inscritos** con un código (BAR-0001…), celular,
  correo, municipio, número de personas y si acepta recibir mensajes.
- El cupo total está en `CUPO_INSCRIPCIONES` (3000) dentro del Apps Script; la página
  muestra cuántos quedan y bloquea el formulario al llenarse.
- Un mismo celular no puede inscribirse dos veces: recibe su código anterior.
- Si la persona deja correo, le llega la confirmación (Gmail permite unos 100 al día).
- La columna **Asistió** sirve para marcar el ingreso la noche del evento.
- Para mensajes masivos, filtra «Acepta mensajes = Sí» y exporta la lista.

**Importante:** cada vez que cambies el código del Apps Script, ve a
Implementar › Gestionar implementaciones › editar (lápiz) › Versión: «Nueva versión» › Implementar.
La URL no cambia.
