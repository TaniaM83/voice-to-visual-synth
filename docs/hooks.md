# Hooks personalizados

Documentación de los custom hooks de la aplicación. Cada entrada describe **qué encapsula**, **qué API expone** y **qué hooks de React internos usa**.

## `useMicrophone` — [client/src/hooks/useMicrophone.ts](../client/src/hooks/useMicrophone.ts)

Encapsula todo lo relacionado con el acceso al micrófono del navegador: solicitar permiso, mantener el `MediaStream` activo, liberarlo cuando ya no se necesita.

### API

```ts
type MicrophoneState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "listening"; stream: MediaStream }
  | { kind: "denied" }
  | { kind: "error"; message: string };

function useMicrophone(): {
  state: MicrophoneState;
  request: () => Promise<void>;
  stop: () => void;
};
```

### Máquina de estados

```
       request()                request()
idle ─────────────► requesting ──────► listening
  ▲                     │                  │
  │                     ├─ NotAllowed ─► denied ───► (request) ►
  │                     │
  │                     └─ otro error ─► error  ───► (request) ►
  │                                                              │
  └──────────────────── stop() / unmount ◄──────────────────────┘
```

### Hooks de React que utiliza

- `useState` para el estado de la máquina.
- `useRef` para guardar el `MediaStream` actual sin provocar re-renders al asignarlo.
- `useCallback` para que `request`, `stop` y `releaseStream` mantengan la misma referencia entre renders (importante si se pasan como dependencias).
- `useEffect` con función de limpieza para detener todos los tracks del `MediaStream` cuando el componente que usa el hook se desmonta.

### Manejo de errores

- Si `navigator.mediaDevices.getUserMedia` no existe (navegador muy viejo o contexto inseguro sin HTTPS), pasa a `error` con un mensaje específico.
- Si el usuario rechaza el permiso (`DOMException` con `NotAllowedError` o `PermissionDeniedError`), pasa a `denied`.
- Cualquier otro error pasa a `error` con el mensaje original.

### Importante: liberación del stream

Mientras un `MediaStream` está activo, el navegador muestra el indicador de "grabando" en la pestaña. Si el componente se desmonta sin detener los tracks, el indicador se queda colgado hasta cerrar la pestaña. Por eso el cleanup del `useEffect` llama a `releaseStream()` siempre, aunque el botón no se haya pulsado.

### Usado en

- [HomePage](../client/src/pages/HomePage.tsx) — como `microphone` que se pasa a `MicButton` y `StatusIndicator`.

### Pendiente para HU-03

El `MediaStream` que devuelve `useMicrophone` será la entrada del próximo hook `useVoiceFeatures`, que conectará un `AnalyserNode` y calculará volumen, tono y ritmo en tiempo real.
