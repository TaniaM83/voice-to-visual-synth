# Voice to Visual Synth — Idea del proyecto

## 1. Resumen

Aplicación fullstack que convierte la voz en visuales abstractos en tiempo real. La app interpreta **tono, ritmo y volumen** para generar una firma visual única que el usuario puede **grabar, reproducir y compartir**.

## 2. Problema que resuelve

La mayoría de herramientas de grabación de voz son puramente auditivas. Falta una forma **visual, expresiva y personal** de representar la voz que sirva tanto para uso artístico como para fijar la memoria de un momento sonoro (una canción, una idea dicha en voz alta, una nota de audio). Voice to Visual Synth busca llenar ese espacio creando una "firma visual" reproducible a partir de cualquier entrada de voz.

## 3. Usuarios objetivo

- **Creadores musicales y vocalistas** que quieren una representación visual única de su voz.
- **Artistas visuales y performers** que buscan material generativo reactivo al sonido.
- **Educadores** que enseñan conceptos de tono, ritmo o fonética y necesitan feedback visual inmediato.
- **Usuarios casuales** interesados en compartir una visualización curiosa de su voz en redes sociales.

## 4. Features (MVP y extendido)

### MVP
- Captura de voz desde el micrófono del navegador (Web Audio API).
- Extracción en tiempo real de **tono (frecuencia fundamental)**, **volumen (RMS)** y **ritmo (onsets / tempo aproximado)**.
- Render visual en canvas reactivo a esos tres parámetros (formas, color, movimiento).
- Indicador de estado: "esperando micrófono", "grabando", "error".

### Extendido
- Grabación de sesión (audio + stream de parámetros) y reproducción sincronizada.
- Selección de **estilos visuales** (p. ej. "partículas", "ondas", "malla") y **paletas de color** personalizables.
- Exportar la firma visual como imagen o video corto.
- Compartir sesión mediante URL (persistencia en backend).
- Galería pública opcional con las sesiones compartidas.

## 5. Stack técnico

- **Frontend:** React 18+ con TypeScript, Vite como bundler, Tailwind CSS v4 para estilos.
- **Audio:** Web Audio API (nativa del navegador), opcionalmente Tone.js para análisis más expresivo.
- **Visualización:** Canvas 2D para MVP; p5.js o Three.js/WebGL para los estilos extendidos.
- **Backend:** Node.js + Express con TypeScript, arquitectura por capas (routes → controllers → services → data).
- **Tipos compartidos:** carpeta `shared/` o similar con los tipos de los DTOs para que frontend y backend compartan contratos.
- **Herramientas:** Cursor IDE, Trello para el tablero Kanban, Git para control de versiones.

## 6. Arquitectura a alto nivel

```
┌──────────────────────┐       HTTP/JSON        ┌──────────────────────┐
│   client/ (React)    │  ───────────────────►  │   server/ (Express)  │
│   Vite + TS + Tw     │  ◄───────────────────  │   TS + capas         │
│   Web Audio + canvas │                         │   persistencia       │
└──────────────────────┘                         └──────────────────────┘
          │
          └─ captura micro, analiza audio, renderiza,
             envía sesión al backend para guardar/compartir
```

Capas en `server/`:

- **routes/** — define endpoints y valida input.
- **controllers/** — orquesta la request/response.
- **services/** — lógica de negocio (p. ej. generar ID de sesión, validar sesión).
- **data/** — persistencia (al inicio, en memoria o JSON; luego, DB real).

## 7. API REST inicial

| Método | Ruta                 | Descripción                                     |
|--------|----------------------|-------------------------------------------------|
| POST   | `/api/sessions`      | Guarda una sesión (metadata + parámetros).      |
| GET    | `/api/sessions/:id`  | Recupera una sesión por ID.                     |
| GET    | `/api/sessions`      | Lista las sesiones públicas (paginado).         |
| DELETE | `/api/sessions/:id`  | Elimina una sesión propia.                      |

Todas las respuestas en JSON con forma `{ data, error }` y códigos HTTP consistentes.

## 8. Estados que el frontend debe manejar

- **idle** — micrófono no solicitado.
- **requesting-permission** — esperando permiso del navegador.
- **permission-denied** — usuario rechazó el permiso.
- **listening** — capturando y visualizando en tiempo real.
- **recording** — listening + almacenando en memoria.
- **saving** — enviando al backend.
- **error** — con mensaje legible para el usuario.

## 9. Criterios de aceptación del MVP

1. El usuario entra a la app y ve un botón claro para activar el micrófono.
2. Al dar permiso, empieza a verse una visualización que reacciona a su voz dentro de los primeros **500 ms**.
3. El usuario puede **grabar** una sesión de al menos 30 segundos y **reproducirla** tal como se vio originalmente.
4. El usuario puede **guardar** la sesión en el backend y **abrirla desde otra pestaña** por URL.
5. Si el navegador no soporta Web Audio o se deniega el permiso, se muestra un mensaje claro de error en vez de una pantalla en blanco.

## 10. Fuera de alcance (por ahora)

- Autenticación real de usuarios (se añadirá en fase posterior si el tiempo lo permite).
- App móvil nativa (el brief menciona React Native como posible extensión futura).
- Procesamiento de voz en servidor (todo el análisis sucede en el cliente).
- Colaboración en tiempo real entre múltiples usuarios.

## 11. Mejoras futuras

Ideas que **sí entrarían** en una segunda iteración del producto, una vez cubierto el MVP y los entregables del curso:

- **Cuentas de usuario y galería privada:** login con email o proveedor OAuth para que cada persona tenga sus sesiones guardadas, marcadas como públicas o privadas.
- **Exportación enriquecida:** descargar la firma visual como video MP4/WebM (audio + visual sincronizados) o como imagen vectorial estilo "póster".
- **Versión móvil con React Native:** reaprovechar la lógica de análisis de audio en una app nativa, con renderizado optimizado.
- **Procesamiento avanzado:** detección de fonemas, identificación de género/timbre, separación de voz/ruido para visuales más expresivos.
- **Modos colaborativos:** dos o más voces conectadas en tiempo real influyendo sobre el mismo lienzo (vía WebSockets).
- **Integraciones musicales:** conectar con Spotify/SoundCloud para visualizar canciones además de voz directa.
- **Editor de estilos personalizado:** que el usuario defina sus propios mapeos de parámetros → forma/color, no solo seleccionar de presets.
- **Persistencia real con base de datos:** migrar el almacenamiento en memoria a PostgreSQL u otra DB para no perder sesiones al reiniciar el servidor.
- **Accesibilidad:** descripciones textuales de la firma visual generadas automáticamente, modo de alto contraste, controles por teclado.
- **Internacionalización:** soporte multilenguaje en la UI (al menos español e inglés).
