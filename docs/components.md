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
├── header (título + descripción)
├── MicButton    ◄── controla el ciclo del micrófono
├── StatusIndicator
└── caja "Backend: ok" (health check)
```

### Reutilizable

No. Es una *page* — conoce la estructura concreta de la home y orquesta hooks específicos.

---

## `NotFoundPage` — [client/src/pages/NotFoundPage.tsx](../client/src/pages/NotFoundPage.tsx)

Página 404. Mensaje y enlace al inicio. Se monta en la ruta `*` desde [App.tsx](../client/src/App.tsx).

### Reutilizable

No.
