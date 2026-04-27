# Voice to Visual Synth

Aplicación fullstack que convierte la voz en visuales abstractos en tiempo real. Proyecto de la Fase final del curso: frontend con **React + TypeScript + Tailwind** y backend con **Node.js + Express**, trabajo organizado con **Kanban**.

## Documentación

- [docs/idea.md](docs/idea.md) — descripción del producto, features, criterios de aceptación, mejoras futuras.
- [docs/agile.md](docs/agile.md) — fundamentos de Agile, Scrum y Kanban.
- [docs/project-management.md](docs/project-management.md) — metodología, tablero, historias de usuario con subtareas técnicas y definición de *Done*.
- [docs/design.md](docs/design.md) — arquitectura, componentes, estado, API REST, flujo de datos.
- [docs/components.md](docs/components.md) — componentes React implementados.
- [docs/hooks.md](docs/hooks.md) — custom hooks y su API.

## Estructura del repo

```
voiceToVisualSynth/
├── client/          # React + TypeScript + Vite + Tailwind v4
│   └── src/
├── server/          # Express + TypeScript, arquitectura por capas
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── data/
│       └── types/
└── docs/            # documentación del proyecto
```

## Requisitos

- Node.js 20+
- npm 10+

## Cómo ejecutar el proyecto

El backend y el frontend corren en procesos separados durante el desarrollo.

### 1. Backend (`server/`)

```bash
cd server
npm install
npm run dev
```

Levanta Express en `http://localhost:3000` con:

- `GET  /api/health` — comprobación de estado.
- `POST /api/sessions` — guarda una sesión.
- `GET  /api/sessions/:id` — recupera una sesión.

### 2. Frontend (`client/`)

En otra terminal:

```bash
cd client
npm install
npm run dev
```

Levanta Vite en `http://localhost:5173`. El cliente proxyea `/api/*` al backend (ver [client/vite.config.ts](client/vite.config.ts)), por lo que no hay problemas de CORS en dev.

## Scripts disponibles

### `client/`
| Script        | Descripción                           |
|---------------|---------------------------------------|
| `dev`         | Arranca Vite en modo desarrollo.      |
| `build`       | Compila TS y construye el bundle.     |
| `preview`     | Sirve el build de producción.         |
| `typecheck`   | Verifica tipos sin emitir artefactos. |

### `server/`
| Script        | Descripción                           |
|---------------|---------------------------------------|
| `dev`         | Arranca Express con recarga (`tsx`).  |
| `build`       | Compila TS a `dist/`.                 |
| `start`       | Ejecuta el build de producción.       |
| `typecheck`   | Verifica tipos sin emitir artefactos. |

## Stack

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS 4.
- **Audio/Visual (previsto):** Web Audio API, Canvas 2D, opcional p5.js / Three.js.
- **Backend:** Node.js, Express 4, TypeScript, `tsx` para dev.
- **Organización:** Kanban (Trello) — ver [docs/kanban.md](docs/kanban.md).

## Tablero de gestión

Tablero Trello: *(pendiente — pegar enlace aquí tras crear el board)*.

Detalle de columnas, etiquetas, historias de usuario y subtareas técnicas en [docs/project-management.md](docs/project-management.md).

## Estado del proyecto

HU-01 (scaffold) y HU-02 (permiso de micrófono + estado `listening`) completas. La siguiente historia es **HU-03** (extracción de tono, ritmo y volumen en tiempo real) según el backlog en [docs/project-management.md](docs/project-management.md).
