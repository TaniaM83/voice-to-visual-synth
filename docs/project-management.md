# Gestión del proyecto — Voice to Visual Synth

Este documento describe **cómo se organiza el trabajo** del proyecto: metodología, tablero, columnas, historias de usuario y subtareas técnicas. Es el plan vivo que se actualiza a medida que avanza el desarrollo.

> Para los fundamentos teóricos de Agile/Scrum/Kanban ver [agile.md](agile.md).

## 1. Metodología elegida

**Kanban puro (flujo continuo)** con *checkpoints* semanales de revisión equivalentes a un *sprint review* ligero.

**Por qué Kanban y no Scrum:**
- Equipo de una sola persona — los roles formales de Scrum (Product Owner, Scrum Master) no aplican.
- Las prioridades pueden cambiar al descubrir bloqueos técnicos (especialmente en la parte de audio en tiempo real).
- El flujo continuo permite mover tareas en cuanto se desbloquean, sin esperar al final de un sprint.

## 2. Tablero en Trello

Tablero: *(pendiente de crear; el enlace se pegará aquí y en el [README.md](../README.md) en cuanto exista)*.

### Columnas y WIP limits

| Columna        | Significado                                                                 | WIP limit |
|----------------|-----------------------------------------------------------------------------|-----------|
| Backlog        | Historias priorizadas pero aún no planificadas.                             | —         |
| Todo           | Seleccionadas para el ciclo actual.                                         | —         |
| In Progress    | En desarrollo activo.                                                       | 2         |
| Review         | PR abierto o pendiente de pruebas manuales.                                 | 2         |
| Done           | Completado y aceptado según los criterios de la historia.                   | —         |

El WIP limit en "In Progress" y "Review" evita saltar entre demasiadas tareas al mismo tiempo (ver [agile.md](agile.md)).

### Etiquetas

- `frontend` — React / TS / Tailwind / canvas.
- `backend` — Express / API / persistencia.
- `audio` — Web Audio / análisis de tono, ritmo, volumen.
- `docs` — documentación y entregables.
- `infra` — setup, scripts, tooling, despliegue.
- `bug` — corrección de defecto.

## 3. Historias de usuario y subtareas técnicas

Cada historia se representa como una tarjeta en Trello. Las **subtareas técnicas** se añaden como *checklist* dentro de cada tarjeta y se marcan a medida que se completan.

Formato: **Como [rol], quiero [acción], para [beneficio]** + criterios de aceptación (CA) verificables + subtareas técnicas (ST).

---

### HU-01 — Scaffold del monorepo `infra` ✅
**Como** desarrolladora, **quiero** un monorepo con `client/` y `server/` y scripts para correr ambos, **para** empezar a trabajar sin fricción.

**CA:**
- CA1: `npm run dev` en `client/` levanta Vite en `localhost:5173`.
- CA2: `npm run dev` en `server/` levanta Express en `localhost:3000` con endpoint de salud `/api/health`.
- CA3: El repo ya no contiene ningún archivo del scaffold de Java.

**ST:**
- [x] Eliminar `src/App.java`, `bin/`, `lib/` y `.vscode/settings.json` del scaffold Java.
- [x] Crear `client/` con `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.
- [x] Configurar Tailwind v4 vía `@tailwindcss/vite` y `@import "tailwindcss";`.
- [x] Crear `server/` con `package.json`, `tsconfig.json`, `src/index.ts`, `src/app.ts`.
- [x] Configurar capas: `routes/`, `controllers/`, `services/`, `data/`, `types/`, `config/`.
- [x] Configurar proxy `/api` en `vite.config.ts` para evitar CORS en dev.
- [x] `git init` + primer commit.
- [x] Documentar instalación y scripts en `README.md`.

---

### HU-02 — Permiso de micrófono y estado `listening` `frontend` `audio` ✅
**Como** usuario, **quiero** activar el micrófono con un botón claro, **para** empezar a ver la visualización.

**CA:**
- CA1: Pulsar "Activar micrófono" pide permiso al navegador.
- CA2: Si se concede, la UI pasa a estado `listening` y se muestra un indicador visible.
- CA3: Si se deniega, se muestra un mensaje de error legible (no pantalla en blanco).

**ST:**
- [x] Crear hook `useMicrophone` que envuelva `navigator.mediaDevices.getUserMedia`.
- [x] Modelar la máquina de estados: `idle | requesting | listening | denied | error`.
- [x] Componente `MicButton` con tres apariencias visuales (idle / listening / error).
- [x] Componente `StatusIndicator` que muestre el estado actual con texto e icono.
- [x] Asegurar que el `MediaStream` se libera correctamente al desmontar (cleanup en `useEffect`).
- [ ] Probar en Chrome y Firefox; capturar la pantalla de denegación de permiso.

---

### HU-03 — Extracción de parámetros de voz en tiempo real `frontend` `audio`
**Como** usuario, **quiero** que la app analice mi voz, **para** que los visuales respondan a tono, volumen y ritmo.

**CA:**
- CA1: Se calcula volumen (RMS) en cada frame.
- CA2: Se estima tono (frecuencia fundamental) cuando hay voz.
- CA3: Se detecta al menos un onset rítmico por segundo de voz hablada/cantada.

**ST:**
- [ ] Crear `AudioContext` y conectar el `MediaStream` a un `AnalyserNode`.
- [ ] Implementar cálculo de RMS sobre el buffer de tiempo.
- [ ] Implementar estimación de tono (autocorrelación o FFT + búsqueda de pico).
- [ ] Implementar detección de onsets (energía + umbral con histéresis).
- [ ] Empaquetar todo en un hook `useVoiceFeatures` que devuelva `{ volume, pitch, onsets }`.
- [ ] Suavizar la salida (low-pass) para evitar parpadeos en la visualización.

---

### HU-04 — Visualización reactiva básica `frontend`
**Como** usuario, **quiero** ver formas que se muevan con mi voz, **para** obtener una firma visual única.

**CA:**
- CA1: Un canvas ocupa la vista principal y renderiza a ≥ 30 fps.
- CA2: Color reacciona al tono, tamaño al volumen, cadencia al ritmo.
- CA3: Al dejar de hablar, la visualización decae suavemente (no corte abrupto).

**ST:**
- [x] Componente `AudioBars` con `<canvas>` y `AnalyserNode` propios (primera iteración: barras de frecuencia con altura por bin).
- [x] Loop de render con `requestAnimationFrame`.
- [ ] Mapear `volume` → tamaño/intensidad, `pitch` → tono de color (HSL), `onsets` → impulso/pulso.
- [x] Implementar decaimiento suave (vía `smoothingTimeConstant` del `AnalyserNode`).
- [ ] Medir fps con `performance.now()` en dev y mostrar overlay de debug (toggle).
- [ ] Cumplir CA2 completo (requiere HU-03 con extracción de pitch y onsets).

---

### HU-05 — API `POST /api/sessions` + tipos compartidos `backend`
**Como** frontend, **quiero** guardar una sesión vía API tipada, **para** poder recuperarla después.

**CA:**
- CA1: El backend expone `POST /api/sessions` y devuelve `{ data: { id } }` con código 201.
- CA2: El cliente usa un tipo `Session` compartido con el servidor.
- CA3: Errores de validación devuelven código 400 con `{ error: { message } }`.

**ST:**
- [ ] Definir tipos `Session` y `SessionInput` en `server/src/types/session.ts`.
- [ ] Replicar/copiar los tipos en `client/src/types/session.ts` (alineados).
- [ ] Implementar validación de input en el controller.
- [ ] Repositorio en memoria (`Map<string, Session>`).
- [ ] Cliente tipado en `client/src/api/sessions.ts` con `createSession()` y `getSession(id)`.
- [ ] Documentar el endpoint en `docs/api.md`.

---

### HU-06 — Grabación y reproducción de sesión `frontend` `audio`
**Como** usuario, **quiero** grabar mi voz y reproducir la sesión, **para** revivir la misma firma visual.

**CA:**
- CA1: Botón "Grabar" guarda audio + parámetros en memoria durante la sesión.
- CA2: Botón "Reproducir" reproduce audio y re-renderiza la visualización sincronizada.
- CA3: Grabar una sesión de 30 s no degrada la fluidez por debajo de 30 fps.

**ST:**
- [ ] Usar `MediaRecorder` para capturar el audio.
- [ ] Almacenar la serie temporal de `{ t, volume, pitch, onsets }` en un buffer.
- [ ] Componente `Recorder` con botones grabar/parar/reproducir y temporizador.
- [ ] Reproducción sincronizada: alinear `currentTime` del `<audio>` con el cursor del buffer.
- [ ] Probar con sesiones de 30 s, 60 s y 2 min.

---

### HU-07 — Compartir sesión por URL `frontend` `backend`
**Como** usuario, **quiero** guardar mi sesión y obtener una URL, **para** compartirla.

**CA:**
- CA1: Tras guardar, el cliente muestra una URL `…/s/:id`.
- CA2: Abrir la URL recupera la sesión vía `GET /api/sessions/:id` y la reproduce.
- CA3: Si el ID no existe, se muestra una pantalla de "no encontrada" sin romper la app.

**ST:**
- [ ] Configurar React Router con rutas `/`, `/s/:id`, `*` (404).
- [ ] Página `SessionPage` que carga la sesión por ID y maneja loading/error/success.
- [ ] Botón "Copiar enlace" tras guardar.
- [ ] Página `NotFoundPage` con mensaje y enlace al inicio.

---

### HU-08 — Estilos visuales y paletas personalizables `frontend`
**Como** usuario, **quiero** cambiar estilo y paleta, **para** personalizar mi firma visual.

**CA:**
- CA1: Al menos 2 estilos visuales seleccionables.
- CA2: Al menos 3 paletas de color seleccionables.
- CA3: La elección se mantiene al guardar la sesión.

**ST:**
- [ ] Definir interfaz `VisualStyle` con render function y nombre.
- [ ] Implementar 2 estilos: `particles`, `waves`.
- [ ] Definir 3 paletas (modo oscuro, neón, pastel) como arrays HSL.
- [ ] Componente `StylePicker` con preview en miniatura.
- [ ] Persistir `style` y `palette` en el `Session` enviado al backend.

---

### HU-09 — Manejo consistente de estados de carga/éxito/error `frontend`
**Como** usuario, **quiero** ver siempre qué está pasando, **para** no quedarme en pantallas ambiguas.

**CA:**
- CA1: Toda llamada al backend muestra estado `loading`, `success` o `error`.
- CA2: Los errores muestran mensaje humano y un botón de reintento cuando aplica.

**ST:**
- [ ] Tipo discriminado `RemoteData<T> = { kind: 'idle' | 'loading' | 'success' | 'error', ... }`.
- [ ] Custom hook `useRemoteData<T>(fetcher)` que maneje los 4 estados.
- [ ] Componente `<Async>` reusable que renderice según el estado.
- [ ] Aplicarlo en al menos 2 páginas que consumen la API.

---

### HU-10 — Documentación final del proyecto `docs`
**Como** evaluador/a, **quiero** leer qué hace la app, cómo se ejecuta y cómo se organizó, **para** valorar el trabajo.

**CA:**
- CA1: `README.md` con instalación, scripts y stack.
- CA2: `docs/idea.md`, `docs/agile.md`, `docs/project-management.md`, `docs/design.md`, `docs/api.md`, `docs/api-client.md`, `docs/components.md`, `docs/hooks.md`, `docs/context.md`, `docs/routing.md`, `docs/forms.md`, `docs/testing.md`, `docs/deployment.md`, `docs/retrospective.md` coherentes entre sí.
- CA3: Captura o GIF de la app funcionando.

**ST:**
- [ ] Llenar cada `docs/*.md` a medida que se implementa la HU correspondiente.
- [ ] Grabar GIF de la app reaccionando a la voz.
- [ ] Añadir enlace al despliegue en producción en el README.
- [ ] Reflexión final con aprendizajes y problemas encontrados en `docs/retrospective.md`.

## 4. Ciclos de trabajo sugeridos

Como el proyecto es de una sola persona, el enfoque es **Kanban con ciclos cortos** de revisión:

- **Ciclo 1 (setup + MVP visual):** HU-01, HU-02, HU-03, HU-04.
- **Ciclo 2 (API + persistencia + rutas):** HU-05, HU-07, HU-09.
- **Ciclo 3 (extras + entrega):** HU-06, HU-08, HU-10.

El orden puede cambiar si surge un bloqueo (p. ej. si la detección de tono toma más de lo esperado, HU-05 que no depende del audio se adelanta).

## 5. Definición de *Done*

Una historia pasa a **Done** cuando:

1. Cumple todos sus criterios de aceptación.
2. Está integrada en `main` (o la rama principal del repo).
3. Todas sus subtareas técnicas están marcadas en el checklist de Trello.
4. La documentación relevante en `docs/` se actualizó si el cambio lo ameritaba.
5. Se probó manualmente en al menos un navegador moderno (Chrome o Firefox).

## 6. Comunicación y herramientas

- **Repositorio:** GitHub *(URL por añadir tras crear el repo)*.
- **Tablero:** Trello *(URL por añadir tras crear el board)*.
- **IDE:** Cursor / VS Code.
- **Control de versiones:** Git con commits frecuentes y mensajes que referencien el ID de la HU (`HU-05: añade endpoint POST /api/sessions`).
