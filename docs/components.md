# Componentes

Documentación de los componentes React de la aplicación. Cada entrada describe **qué hace**, **qué props recibe** y **dónde se usa**. Se actualiza a medida que se cierran nuevas historias de usuario.

## `MicButton` — [client/src/components/MicButton.tsx](../client/src/components/MicButton.tsx)

Botón circular que activa o detiene el micrófono. Cambia de color, etiqueta e icono según el estado actual del micrófono.

### Props

```ts
type Props = {
  state: "idle" | "requesting" | "listening" | "denied" | "error";
  onRequest: () => void; // pedir permiso al navegador
  onStop: () => void;    // detener el stream activo
};
```

### Comportamiento

- En `idle`, `denied` o `error` el botón llama a `onRequest`. La etiqueta es **"Activar micrófono"** o **"Reintentar"**.
- En `listening` el botón llama a `onStop`. La etiqueta es **"Detener micrófono"** y aparece un anillo pulsante alrededor del icono.
- En `requesting` el botón se deshabilita y muestra **"Solicitando permiso…"**.
- Atributo `aria-pressed={isListening}` para accesibilidad.

### Reutilizable

Sí. No conoce ninguna lógica de negocio: recibe `state` y dos callbacks, no llama a la API ni accede al `MediaStream`.

### Usado en

- [HomePage](../client/src/pages/HomePage.tsx)

---

## `BackgroundVisualizer` — [client/src/components/BackgroundVisualizer.tsx](../client/src/components/BackgroundVisualizer.tsx)

Visualizador inmersivo a pantalla completa, inspirado en los visualizadores de los reproductores de música de los 2000 (Windows Media Player, Winamp, iTunes). Se monta como `<canvas>` fijo detrás de la UI cuando el micrófono está activo y reacciona a **graves, medios y agudos** por separado.

### Props

```ts
type Props = {
  stream: MediaStream;
};
```

### Bandas de frecuencia

El audio se divide en tres bandas calculadas con la frecuencia real de los bins del FFT (`sampleRate / 2 / bins`):

| Banda      | Rango aprox.       | Lo que controla en la visualización                                |
|------------|--------------------|---------------------------------------------------------------------|
| Graves     | 0 – 250 Hz         | Tamaño y grosor del anillo central, ráfaga de partículas radiales.  |
| Medios     | 250 – 2000 Hz      | Desplazamiento del tono base de color (hue).                        |
| Agudos     | 2 – 8 kHz          | Chispas dispersas por toda la pantalla con tonos cálidos.           |

### Capas del render (en orden)

1. **Velo oscuro semitransparente** sobre el frame anterior (`fillStyle rgba(2,6,23,0.18)`) → estela de movimiento.
2. **Modo de composición aditivo** (`globalCompositeOperation = "lighter"`) → al solaparse colores, brillan más, efecto neón.
3. **Anillo central** que pulsa con los graves.
4. **Espectro circular** (líneas radiales que crecen desde un anillo interior, una por cada bin de FFT) → la "rosa" reactiva.
5. **Partículas radiales** disparadas en cada *pico* de graves (detectado como `bass > 0.35` y mayor que el frame anterior + umbral).
6. **Chispas dispersas** cuando los agudos superan un umbral.

### Cómo funciona técnicamente

- Crea su propio `AudioContext` y `AnalyserNode` con `fftSize = 1024` y `smoothingTimeConstant = 0.82`.
- Loop con `requestAnimationFrame`. Sin `setState` por frame: los datos viven en variables locales del effect.
- Cap de **400 partículas vivas** simultáneas para mantener fps estables.
- Limpieza correcta al desmontar: `cancelAnimationFrame`, `source.disconnect()`, `audioContext.close()`, `removeEventListener("resize")`.

### Posicionamiento

```html
<canvas class="fixed inset-0 z-0 pointer-events-none" />
```

- `fixed inset-0` → cubre todo el viewport pase lo que pase con el scroll.
- `z-0` → crea su propio stacking context en la base, debajo de la UI (`z-10`) pero por encima del fondo del `body`. **Importante**: `-z-10` lo escondía detrás del fondo del `body` (gotcha clásico de CSS con z-index negativos).
- `pointer-events-none` → no intercepta clics.
- `aria-hidden="true"` → invisible para lectores de pantalla (es decorativo).

### Reutilizable

Sí: solo necesita un `MediaStream`. Podría reutilizarse para visualizar la reproducción de una sesión guardada (HU-06) sin cambios.

### Usado en

- [HomePage](../client/src/pages/HomePage.tsx) — montado solo cuando `microphone.state.kind === "listening"`.

### Pendientes para versiones futuras

- Mapeo a **pitch detectado** (HU-03): el color cambiaría con la nota, no solo con la energía media.
- **Estilos seleccionables** (HU-08): "partículas" / "ondas" / "malla" como variantes con la misma API.
- **Paletas** alternativas (oscuro / neón / pastel).
- Overlay opcional de FPS para depurar (DEV).

---

## `AudioBars` — [client/src/components/AudioBars.tsx](../client/src/components/AudioBars.tsx)

Visualizador de barras de frecuencia clásico: dibuja N barras verticales centradas en un canvas, cuya altura responde a la energía de cada banda de frecuencia. Componente conservado por si se quiere un modo "minimalista" alternativo al `BackgroundVisualizer`. Hoy no está montado en ninguna página.

### Props

```ts
type Props = {
  stream: MediaStream;     // requerido — la fuente de audio
  bars?: number;           // por defecto 48
  color?: string;          // por defecto "#34d399" (esmeralda)
};
```

### Cómo funciona

1. Crea un `AudioContext` propio y conecta el `MediaStream` a un `AnalyserNode`.
2. Configura `fftSize` como la siguiente potencia de 2 que cubra `bars * 2` (Web Audio lo exige).
3. Aplica `smoothingTimeConstant = 0.75` para que las barras no parpadeen.
4. En cada frame (`requestAnimationFrame`), pide `getByteFrequencyData()` y dibuja una barra por bin con `roundRect`.
5. Al desmontar: cancela el rAF, desconecta el source y cierra el `AudioContext`.

### Detalles de renderizado

- **DPR**: las dimensiones internas del canvas se multiplican por `window.devicePixelRatio` para que las barras se vean crujientes en pantallas retina.
- **Centrado vertical**: cada barra crece simétricamente desde la línea media.
- **Altura mínima**: `1.5 px` para que siempre se vea algo (no una pantalla en blanco al silencio).

### Reutilizable

Sí. No conoce ninguna lógica de negocio: recibe un `MediaStream` y dibuja. Se podrían instanciar varios con distintas `color`/`bars` para distintos efectos.

### Usado en

- Ningún lugar actualmente. Se mantiene como alternativa minimalista al `BackgroundVisualizer`.

---

## `StatusIndicator` — [client/src/components/StatusIndicator.tsx](../client/src/components/StatusIndicator.tsx)

Indicador textual con punto de color que comunica el estado del micrófono al usuario en lenguaje natural.

### Props

```ts
type Props = {
  state: MicrophoneState; // el objeto completo, no solo el kind
};
```

### Mensajes por estado

| Estado        | Texto                                                                                       | Color del punto |
|---------------|---------------------------------------------------------------------------------------------|------------------|
| `idle`        | "Micrófono inactivo. Pulsa el botón para empezar."                                           | gris             |
| `requesting`  | "Solicitando permiso del navegador…"                                                          | ámbar (pulsa)    |
| `listening`   | "Escuchando…"                                                                                 | esmeralda (pulsa)|
| `denied`      | "Permiso denegado. Habilita el micrófono en los ajustes del navegador y reintenta."          | rosa             |
| `error`       | `"Error: {message}"`                                                                         | rosa             |

### Accesibilidad

`role="status"` y `aria-live="polite"` — los lectores de pantalla anuncian los cambios sin interrumpir.

### Reutilizable

Parcialmente: depende del tipo `MicrophoneState`. Si en el futuro hay otros indicadores similares conviene extraer una versión genérica `<StateBadge>`.

### Usado en

- [HomePage](../client/src/pages/HomePage.tsx)

---

## `HomePage` — [client/src/pages/HomePage.tsx](../client/src/pages/HomePage.tsx)

Página principal de la app. Orquesta los componentes y consume el hook `useMicrophone`.

### Composición

```
HomePage
├── BackgroundVisualizer  ◄── solo cuando state.kind === "listening"
├── section (z-10, con backdrop-blur cuando escucha)
│   ├── header (título + descripción)
│   ├── MicButton    ◄── controla el ciclo del micrófono
│   ├── StatusIndicator
│   └── caja "Backend: ok" (health check)
```

### Reutilizable

No. Es una *page* — conoce la estructura concreta de la home y orquesta hooks específicos.

---

## `NotFoundPage` — [client/src/pages/NotFoundPage.tsx](../client/src/pages/NotFoundPage.tsx)

Página 404. Mensaje y enlace al inicio. Se monta en la ruta `*` desde [App.tsx](../client/src/App.tsx).

### Reutilizable

No.
