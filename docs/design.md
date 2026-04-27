# Diseño y arquitectura — Voice to Visual Synth

Este documento describe **cómo está pensada la aplicación a nivel técnico**: qué componentes hay y cuáles son reutilizables, cómo se gestiona el estado, qué expone la API, qué datos se guardan y dónde, y cómo fluye la información entre las piezas.

> Para el qué/por qué del producto ver [idea.md](idea.md). Para la organización del trabajo ver [project-management.md](project-management.md).

## 1. Visión general

La app es una **SPA en React** que se comunica con una **API REST en Express** mediante JSON sobre HTTP. Todo el procesamiento de audio sucede en el cliente (Web Audio API). El servidor solo persiste **metadatos de sesión** (no audio crudo) en una tienda en memoria, suficiente para el MVP del curso.

```
┌──────────────────────────────────────────────────────────────────────┐
│                              NAVEGADOR                                │
│                                                                       │
│   ┌──────────────┐   captura   ┌────────────────┐   parámetros        │
│   │ Microphone   │ ──────────► │ AudioAnalyser  │ ──────┐             │
│   │ (getUser-    │             │ (Web Audio)    │       │             │
│   │  Media)      │             └────────────────┘       ▼             │
│   └──────────────┘                              ┌────────────────┐    │
│                                                 │  Visualizer    │    │
│                                                 │  (canvas)      │    │
│                                                 └────────────────┘    │
│                                                          ▲            │
│   ┌──────────────────────────────────────────┐           │            │
│   │  Componentes React  (UI + estado local)  │ ──────────┘            │
│   └──────────────────────────────────────────┘                        │
│                       │                                               │
│                       │ fetch /api/sessions (JSON)                    │
└───────────────────────┼───────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                            SERVIDOR Express                          │
│                                                                       │
│   routes/  ──►  controllers/  ──►  services/  ──►  data/             │
│   (HTTP)        (validación)       (negocio)        (Map en memoria) │
│                                                                       │
│   Endpoints: /api/health, /api/sessions, /api/sessions/:id           │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Estructura de componentes (frontend)

Carpetas en [client/src/](../client/src/), organizadas por responsabilidad:

```
src/
├── pages/        # una por ruta de React Router
├── components/   # piezas de UI reutilizables
├── hooks/        # custom hooks reutilizables
├── context/      # providers de estado global
├── api/          # cliente HTTP tipado
├── types/        # tipos compartidos con el backend
└── utils/        # helpers puros (mapeos, formato, math)
```

### 2.1 Páginas (`pages/`)

| Página           | Ruta        | Responsabilidad                                                                  |
|------------------|-------------|----------------------------------------------------------------------------------|
| `HomePage`       | `/`         | Pantalla principal: micrófono, visualización en vivo, controles de grabación.     |
| `SessionPage`    | `/s/:id`    | Carga una sesión guardada por su ID y la reproduce sincronizada.                  |
| `NotFoundPage`   | `*`         | 404 con enlace al inicio.                                                         |

### 2.2 Componentes (`components/`)

| Componente         | Reutilizable | Props clave                                       | Para qué sirve                                                       |
|--------------------|--------------|---------------------------------------------------|----------------------------------------------------------------------|
| `MicButton`        | sí           | `state`, `onClick`                                | Botón con tres estados visuales (idle / listening / error).          |
| `StatusIndicator`  | sí           | `state`, `message`                                | Muestra estado actual con icono y texto legible.                     |
| `Visualizer`       | sí           | `features`, `style`, `palette`                    | `<canvas>` reactivo a los parámetros de voz.                         |
| `Recorder`         | no           | `onSave`                                          | Controla grabación, parada y reproducción de la sesión actual.       |
| `StylePicker`      | sí           | `value`, `onChange`, `options`                    | Selector visual de estilo y paleta con miniaturas.                   |
| `Async<T>`         | sí           | `state`, `children`, `onRetry`                    | Renderiza `loading` / `error` / `success` para datos remotos.        |
| `Layout`           | sí           | `children`                                        | Shell con cabecera y contenedor; usado por todas las páginas.        |

**Criterio de "reutilizable":** un componente es reutilizable si **no conoce** la lógica de negocio (no llama a la API, no contiene reglas del producto). Recibe datos por props y emite eventos por callbacks. Ej.: `Visualizer` recibe `features`; no sabe de dónde vienen.

### 2.3 Hooks (`hooks/`)

| Hook                  | Devuelve                                              | Encapsula                                                              |
|-----------------------|-------------------------------------------------------|------------------------------------------------------------------------|
| `useMicrophone()`     | `{ state, stream, request, stop }`                    | Permiso del micro, máquina de estados, limpieza del `MediaStream`.     |
| `useVoiceFeatures()`  | `{ volume, pitch, onsets }`                           | `AnalyserNode`, RMS, autocorrelación, detección de onsets.             |
| `useRemoteData<T>(fn)`| `{ kind: 'idle'\|'loading'\|'success'\|'error', ... }` | Patrón estándar para cualquier llamada a la API.                       |
| `useAnimationFrame(cb)` | `void`                                              | Loop de `requestAnimationFrame` con `cleanup` correcto.                |

## 3. Gestión del estado

Tres niveles, elegidos según el alcance:

### 3.1 Estado local del componente — `useState` / `useReducer`
Para datos efímeros que no necesita nadie más: input de un campo, si un dropdown está abierto, si la animación está pausada.

### 3.2 Estado de hooks personalizados
Para lógica reutilizable con su propio ciclo de vida: el `MediaStream` del micrófono y los `AnalyserNode` viven dentro de `useMicrophone` y `useVoiceFeatures`. Otros componentes solo consumen el resultado.

### 3.3 Estado global — Context API
Solo para lo que **realmente cruza páginas o componentes lejanos**:

| Context                | Qué expone                                             | Por qué global                                                  |
|------------------------|--------------------------------------------------------|-----------------------------------------------------------------|
| `VisualPrefsContext`   | `style`, `palette`, `setStyle`, `setPalette`           | Lo lee el `Visualizer`, lo edita el `StylePicker`, persiste al guardar la sesión. |
| `CurrentSessionContext`| `session`, `recording`, `start`, `stop`, `save`        | Coordina `Recorder`, `Visualizer` y la página al cargar `/s/:id`. |

**Decisión clave:** **no se usa Redux ni Zustand**. La app es pequeña y la combinación `useState` + custom hooks + Context API es suficiente y reduce el peso del bundle.

## 4. API REST

Convenciones aplicadas a todos los endpoints:

- **Prefijo:** `/api/...` (no se versiona aún; cuando haya cambios incompatibles se introducirá `/api/v1/`).
- **Verbos:** `GET` consulta, `POST` crea, `PUT/PATCH` actualiza, `DELETE` elimina.
- **Códigos HTTP:** `200` ok, `201` creado, `400` validación, `404` no existe, `500` error interno.
- **Respuesta de éxito:** `{ "data": <recurso> }`.
- **Respuesta de error:** `{ "error": { "message": "<humano>" } }`.
- **Content-Type:** `application/json` en request y response.

### 4.1 Endpoints

| Método | Ruta                  | Body / params                                | Respuesta éxito                                       | Respuesta error                       |
|--------|-----------------------|----------------------------------------------|-------------------------------------------------------|---------------------------------------|
| GET    | `/api/health`         | —                                            | `200 { status: "ok", uptime: <segundos> }`            | —                                     |
| POST   | `/api/sessions`       | `SessionInput` (JSON)                        | `201 { data: Session }`                               | `400 { error: { message } }`          |
| GET    | `/api/sessions/:id`   | `id` en URL                                  | `200 { data: Session }`                               | `404 { error: { message } }`          |
| GET    | `/api/sessions`       | `?limit=&cursor=` *(futuro)*                 | `200 { data: Session[] }`                             | —                                     |
| DELETE | `/api/sessions/:id`   | `id` en URL *(futuro)*                       | `204` sin body                                        | `404 { error: { message } }`          |

### 4.2 Contratos de datos

Definidos en [server/src/types/session.ts](../server/src/types/session.ts) y replicados en [client/src/types/session.ts](../client/src/types/session.ts):

```ts
type SessionInput = {
  title: string;        // texto libre, 1..80
  durationMs: number;   // entero >= 0
  style: string;        // id de estilo: "particles" | "waves" | ...
  palette: string;      // id de paleta:  "dark" | "neon" | "pastel" | ...
};

type Session = SessionInput & {
  id: string;           // uuid v4 generado por el servidor
  createdAt: string;    // ISO 8601
};

type ApiSuccess<T> = { data: T };
type ApiError      = { error: { message: string } };
```

**Por qué tipos compartidos:** evita la deriva entre lo que envía el cliente y lo que valida el servidor. Cuando se cambie un campo, TS marca errores en ambos lados.

### 4.3 Validación

La validación vive **en la frontera de red** (controller), no en el service. Hoy es manual con type guards (`isSessionInput`); cuando los contratos crezcan se introducirá `zod` para esquemas declarativos. La capa de servicios asume que recibe datos válidos.

## 5. Modelo de persistencia

### 5.1 Qué guarda el servidor

| Dato                                  | Dónde                  | Justificación                                                           |
|---------------------------------------|------------------------|-------------------------------------------------------------------------|
| `Session` (metadatos + estilo/paleta) | `Map<string, Session>` | Necesario para compartir por URL.                                        |
| Series temporales `{ t, volume, pitch, onsets }` *(futuro)* | misma tienda          | Permite reproducir la visualización idéntica al guardar la sesión.       |

**No se guarda en el servidor:**
- El audio crudo (PCM o MP3): demasiado peso, fuera del alcance del MVP. Se queda en memoria del cliente; si se exporta es decisión del usuario.
- Las preferencias visuales globales (modo oscuro, etc.): son del cliente.

### 5.2 Qué guarda el cliente

| Dato                              | Dónde                              | Vida útil                                       |
|-----------------------------------|------------------------------------|-------------------------------------------------|
| Permiso del micrófono             | API del navegador                  | Hasta que el usuario lo revoque.                |
| `MediaStream` y `AnalyserNode`    | Memoria del componente             | Mientras la página esté abierta.                |
| Parámetros de voz por frame       | `useState` / ref                   | Solo durante la sesión activa.                  |
| Audio de la sesión actual (`Blob`)| Variable en memoria                | Se descarta al recargar la página.              |
| `style` / `palette` seleccionados | `VisualPrefsContext` + `localStorage` (futuro) | Se persisten para que se recuerden entre visitas. |

**Decisión clave:** se evita meter datos de larga duración en `localStorage` cuando esos datos viven en el backend. La regla del paso 12 del rubric es "**la API es la única fuente de verdad para los datos persistentes**".

## 6. Capa de red en el frontend

Implementada en [client/src/api/client.ts](../client/src/api/client.ts):

- Una función genérica `apiFetch<T>(path, init): Promise<T>`.
- Lee la respuesta como `ApiSuccess<T>` o `ApiError` y devuelve `data` o lanza `ApiClientError` con `status` y `message`.
- Centraliza headers (`Content-Type: application/json`).
- Cualquier llamada de la app pasa por aquí; no se llama a `fetch` directamente desde los componentes.

Sobre `apiFetch` se construyen funciones por recurso (futuro):

```ts
// client/src/api/sessions.ts
export const sessionsApi = {
  create: (input: SessionInput) =>
    apiFetch<Session>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  getById: (id: string) =>
    apiFetch<Session>(`/api/sessions/${id}`),
};
```

Y los componentes consumen estas funciones a través de `useRemoteData(() => sessionsApi.getById(id))`, que devuelve los tres estados (loading / success / error) listos para `Async`.

## 7. Flujo de datos extremo a extremo

### 7.1 Caso "guardar sesión" (HU-05 + HU-07)

```
[Usuario pulsa "Guardar"]
      │
      ▼
HomePage  ──►  useCurrentSession.save()  ──►  sessionsApi.create(input)
                                                      │
                                                      │ POST /api/sessions
                                                      ▼
                                         routes/sessions.ts
                                                      │
                                                      ▼
                                         controllers (valida input)
                                                      │
                                                      ▼
                                         services (genera id, fecha)
                                                      │
                                                      ▼
                                         data/sessions.repo (guarda en Map)
                                                      │
                                                      │ 201 { data: Session }
                                                      ▼
                                         apiFetch resuelve con Session
                                                      │
                                                      ▼
                                         HomePage muestra URL `/s/:id`
```

### 7.2 Caso "abrir sesión compartida" (HU-07)

```
URL `/s/abc123`
      │
      ▼
React Router  ──►  SessionPage(id="abc123")
                          │
                          ▼
                   useRemoteData(() => sessionsApi.getById("abc123"))
                          │  estado: loading
                          ▼
                   apiFetch("/api/sessions/abc123")
                          │
                          ▼
                   server: 200 { data: Session }  ó  404 { error }
                          │
                          ▼
                   estado: success (renderiza Visualizer + Recorder)
                          ó  error (renderiza mensaje + botón reintento)
```

## 8. Arquitectura del backend (recordatorio)

Capas en [server/src/](../server/src/), de fuera hacia dentro:

| Capa            | Carpeta                | Responsabilidad                                                              | Conoce…                          |
|-----------------|------------------------|------------------------------------------------------------------------------|----------------------------------|
| Configuración   | `config/`              | Lee variables de entorno con valores por defecto.                            | `process.env`                    |
| Rutas           | `routes/`              | Define endpoints y los enchufa al controller correspondiente.                | Express, controllers              |
| Controladores   | `controllers/`         | Valida input, traduce HTTP ↔ servicio, formatea respuesta.                   | `req`/`res`, services             |
| Servicios       | `services/`            | Lógica de negocio pura; no toca HTTP.                                        | repos, types                      |
| Datos           | `data/`                | Persistencia (hoy `Map`, mañana DB).                                         | tipos                             |
| Tipos           | `types/`               | DTOs y entidades compartibles con el cliente.                                | nada                              |

**Regla:** las dependencias siempre apuntan hacia adentro (rutas → controllers → services → data). Un service nunca importa nada de Express; eso permite cambiar el transporte (REST → GraphQL → CLI) sin tocar la lógica.

## 9. Decisiones de arquitectura clave

1. **Procesamiento de audio en el cliente, no en el servidor.** Latencia mínima, no necesita streaming, escala gratis.
2. **Persistencia en memoria (`Map`) para el MVP.** Es suficiente para demostrar la integración frontend-API; migrar a una DB real es una historia futura cuando aplique.
3. **Tipos replicados a mano en cliente y servidor**, no compartidos vía monorepo workspace. Es más simple para un proyecto de curso; el coste es recordar mantenerlos alineados (TS marca el desfase rápido).
4. **Sobre validación: type guards manuales hoy, `zod` cuando el contrato crezca.** No vale la pena introducir una dependencia para 4 campos.
5. **Sin Redux/Zustand.** Context + hooks bastan; reducir bundle y conceptos.
6. **Tailwind v4 con plugin de Vite, no PostCSS.** Es la forma recomendada en v4; menos archivos de config.
7. **React Router v6, no v7.** v6 es estable y la documentación del curso lo asume; pasar a v7 quedaría como mejora futura.

## 10. Cosas que cambiarán cuando crezca el proyecto

- **DB real** (PostgreSQL o SQLite) sustituyendo el `Map`.
- **Auth** (JWT o sesiones) cuando haya cuentas de usuario.
- **Workspaces de npm** para compartir tipos entre `client/` y `server/` automáticamente.
- **Versionado de la API** (`/api/v1/...`).
- **Testing automatizado** (Vitest en el cliente, Vitest o Jest en el servidor) — hoy las pruebas son manuales (ver [project-management.md §5](project-management.md)).

## 11. Diagrama de dependencias entre módulos

```
                  ┌────────────────┐
                  │   pages/       │
                  └───┬────────┬───┘
                      │        │
                      ▼        ▼
            ┌──────────────┐  ┌──────────────┐
            │ components/  │  │   hooks/     │
            └──────┬───────┘  └──────┬───────┘
                   │                  │
                   └────────┬─────────┘
                            ▼
                      ┌──────────┐
                      │   api/   │
                      └─────┬────┘
                            ▼
                      ┌──────────┐
                      │  types/  │  ◄── compartido con server/src/types/
                      └──────────┘
```

Las flechas representan "importa". Nada en `components/` o `hooks/` importa nada de `pages/`. Nada en `api/` importa nada de la UI. Esa direccionalidad mantiene los componentes reutilizables.
